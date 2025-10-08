const Bull = require('bull');
const { spawn } = require('child_process');
const path = require('path');
const db = require('../db/database');
require('dotenv').config();

// Import route handlers for WebSocket communication
const route2vel_handlers = require('../routes/route2vel_route').handlers;

// Create Bull queue with Redis connection
const taskQueue = new Bull('route-tasks', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        //password: process.env.REDIS_PASSWORD || undefined
    }
});

// Queue configuration
taskQueue.concurrency = 1; // Process one task at a time

// Map to track taskId -> jobId
const taskToJobMap = new Map();

// Map to track active Python processes
const activeProcesses = new Map();

// Add task to queue
const addTask = async (userId, taskType, requestData, socketId) => {
    try {
        // Insert task into database
        const result = await db.query(
            `INSERT INTO tasks (user_id, task_type, status, request_data) 
             VALUES ($1, $2, 'waiting', $3) 
             RETURNING id`,
            [userId, taskType, JSON.stringify(requestData)]
        );
        
        const taskId = result.rows[0].id;
        
        // Add to Bull queue
        const job = await taskQueue.add('process-route', {
            taskId,
            userId,
            taskType,
            requestData,
            socketId
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            },
            jobId: `task_${taskId}_${Date.now()}`
        });
        
        // Save mapping
        taskToJobMap.set(taskId, job.id);
        
        // Save job ID in database
        await db.query(
            `UPDATE tasks SET job_id = $1 WHERE id = $2`,
            [job.id, taskId]
        );
        
        console.log(`Task ${taskId} added to queue with job ID ${job.id}`);
        return { taskId, jobId: job.id };
    } catch (error) {
        console.error('Error adding task to queue:', error);
        throw error;
    }
};

// Process tasks from queue
const processTask = (io) => {
    taskQueue.process('process-route', async (job) => {

        // for debugging purposes only
        await new Promise(resolve => setTimeout(resolve, 10000));
        const { taskId, userId, taskType, requestData, socketId } = job.data;
        
        console.log(`Processing task ${taskId} for user ${userId}`);
        
        try {
            // Check if task was cancelled
            const checkResult = await db.query(
                'SELECT status FROM tasks WHERE id = $1',
                [taskId]
            );
            
            if (checkResult.rows[0]?.status === 'cancelled') {
                console.log(`Task ${taskId} was cancelled, skipping execution`);
                return { skipped: true, reason: 'cancelled' };
            }
            
            // Update task status to executing
            await db.query(
                `UPDATE tasks SET status = 'executing', started_at = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [taskId]
            );
            
            // Get the socket for this connection
            const socket = io.sockets.sockets.get(socketId);
            
            // Notify user via socket
            if (socket) {
                socket.emit('task_status', {
                    taskId,
                    status: 'executing',
                    message: 'Your task is being processed'
                });
            }
            
            // Notify all users in the user's room
            io.to(`user_${userId}`).emit('task_status', {
                taskId,
                status: 'executing',
                message: 'Task is being processed'
            });
            
            // Broadcast to admin
            io.to('admin_room').emit('admin_task_update', {
                taskId,
                userId,
                status: 'executing'
            });
            
            // Execute Python script based on task type
            const result = await executePythonScript(taskId, taskType, requestData, socketId, io);
            
            // Update task status to success
            await db.query(
                `UPDATE tasks SET status = 'success', completed_at = CURRENT_TIMESTAMP, 
                 result_data = $1, output_dir = $2, job_id = NULL
                 WHERE id = $3`,
                [JSON.stringify(result.data), result.outputDir, taskId]
            );
            
            // Cleanup
            activeProcesses.delete(taskId);
            taskToJobMap.delete(taskId);
            
            // Send final route data to user
            if (socket) {
                // Send completion notification
                socket.emit('task_complete', {
                    taskId,
                    status: 'success',
                    data: result.data
                });
                
                // If we have route data, send it
                if (result.routeData) {
                    socket.emit('route_data', result.routeData);
                }
            }
            
            // Broadcast to admin
            io.to('admin_room').emit('admin_task_update', {
                taskId,
                userId,
                status: 'success'
            });
            
            console.log(`Task ${taskId} completed successfully`);
            return result;
            
        } catch (error) {
            console.error(`Task ${taskId} failed:`, error);
            
            // Cleanup
            activeProcesses.delete(taskId);
            taskToJobMap.delete(taskId);
            
            // Update task status to error
            await db.query(
                `UPDATE tasks SET status = 'error', completed_at = CURRENT_TIMESTAMP, 
                 error_message = $1, job_id = NULL
                 WHERE id = $2`,
                [error.message, taskId]
            );
            
            // Notify user
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                const errorEvent = taskType === 'address' ? 'route_error_by_addr' : 'route_error';
                socket.emit(errorEvent, {
                    taskId,
                    status: 'error',
                    message: error.message
                });
            }
            
            // Broadcast to admin
            io.to('admin_room').emit('admin_task_update', {
                taskId,
                userId,
                status: 'error',
                error: error.message
            });
            
            throw error;
        }
    });
    
    // Queue event handlers
    taskQueue.on('completed', (job, result) => {
        console.log(`Job ${job.id} completed successfully`);
    });
    
    taskQueue.on('failed', (job, err) => {
        console.error(`Job ${job.id} failed:`, err);
    });
    
    taskQueue.on('stalled', (job) => {
        console.warn(`Job ${job.id} stalled`);
    });
};

// Execute Python script with WebSocket integration
const executePythonScript = (taskId, taskType, requestData, socketId, io) => {
    return new Promise((resolve, reject) => {
        let script_args = [];
        let script_name = taskType === 'coordinates' ? 'route2vel_main.py' : 'route2vel_main_by_addr.py';
        
        // Prepare arguments based on task type
        if (taskType === 'coordinates') {
            script_args.push("--start", requestData.start_point[0], requestData.start_point[1]);
            script_args.push("--end", requestData.end_point[0], requestData.end_point[1]);
            script_args.push("--sampling", requestData.sampling_rate);
            requestData.intermediate_points.forEach(element => {
                script_args.push("--intermediate", element[0], element[1]);
            });
        } else {
            script_args.push("--start", requestData.start_addr);
            script_args.push("--end", requestData.end_addr);
            script_args.push("--sampling", requestData.sampling_rate);
            requestData.intermediate_points.forEach(element => {
                script_args.push("--intermediate", element[0]);
            });
        }
        
        // Add WebSocket room for Python script to send updates
        script_args.push("--websocket", "http://localhost:" + (process.env.PORT));
        script_args.push("--websocket-room", socketId);
        
        // Set output directory if configured
        let output_subdir = null;
        if (process.env.OUTPUT_DIR) {
            output_subdir = path.join(process.env.OUTPUT_DIR, `task_${taskId}_${Date.now()}`);
            script_args.push("--output-dir", output_subdir);
            console.log("Using output directory:", output_subdir);
        }
        
        const python_folder = process.env.PYTHON_FOLDER || "";
        const python_dist = process.env.PYTHON_DIST || "python3";
        const python_script = path.join(python_folder, script_name);
        
        console.log(`Executing: ${python_dist} ${python_script} ${script_args.join(' ')}`);
        
        const child_process = spawn(python_dist, [python_script].concat(script_args));
        
        // Save process reference for potential cancellation
        activeProcesses.set(taskId, child_process);
        
        
        let resultData = {
            routeData: null,
            samplingData: null,
            images: []
        };

        let errorOutput = '';
        let stdOutput = '';
        
        /*
        
        // Handle stdout
        child_process.stdout.on('data', (data) => {
            const output = data.toString();
            stdOutput += output;
            console.log(`[Task ${taskId}] stdout:`, output);
            
            // Send stdout to client
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                socket.emit('request_stdout', output);
            }
            
            // Try to parse JSON data from Python
            try {
                const lines = output.split('\n');
                for (const line of lines) {
                    if (line.startsWith('{') || line.startsWith('[')) {
                        const parsed = JSON.parse(line);
                        
                        // Handle different types of data from Python
                        if (parsed.type === 'update') {
                            if (socket) {
                                const updateEvent = taskType === 'address' ? 'update_by_addr' : 'update';
                                socket.emit(updateEvent, {
                                    message: parsed.message,
                                    progress: parsed.progress
                                });
                            }
                        } else if (parsed.type === 'route') {
                            resultData.routeData = parsed;
                            if (socket) {
                                const routeEvent = taskType === 'address' ? 'route_data_by_addr' : 'route_data';
                                socket.emit(routeEvent, parsed);
                            }
                        } else if (parsed.type === 'sampling') {
                            resultData.samplingData = parsed;
                            if (socket) {
                                const samplingEvent = taskType === 'address' ? 'route_data_by_addr' : 'route_data';
                                socket.emit(samplingEvent, parsed);
                            }
                        } else if (parsed.type === 'image') {
                            resultData.images.push(parsed);
                            if (socket) {
                                const imageEvent = taskType === 'address' ? 'route_data_by_addr' : 'route_data';
                                socket.emit(imageEvent, parsed);
                            }
                        } else if (parsed.type === 'wc_data') {
                            if (socket && taskType === 'address') {
                                socket.emit('route_wc_data_by_addr', parsed);
                            }
                        }
                    }
                }
            } catch (e) {
                // Not JSON, just regular output
            }

        
        });*/
        
        child_process.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
            // socket.emit("request_stdout", data.toString());
        });

        // Handle stderr
        child_process.stderr.on('data', (data) => {
            const error = data.toString();
            errorOutput += error;
            console.error(`[Task ${taskId}] stderr:`, error);
            
            // Send stderr to client
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                socket.emit('request_stderr', error);
            }
        });
        
        // Handle process exit
        child_process.on('close', (code) => {
            activeProcesses.delete(taskId);
            
            if (code === 0) {
                console.log(`[Task ${taskId}] Python script completed successfully`);
                resolve({ 
                    data: resultData, 
                    outputDir: output_subdir,
                    stdout: stdOutput,
                    routeData: resultData.routeData 
                });
            } else if (code === -15 || code === 143) { // SIGTERM
                reject(new Error('Process terminated by admin'));
            } else {
                console.error(`[Task ${taskId}] Python script failed with code ${code}`);
                reject(new Error(`Python script exited with code ${code}: ${errorOutput}`));
            }
        });
        
        // Handle process errors
        child_process.on('error', (error) => {
            activeProcesses.delete(taskId);
            console.error(`[Task ${taskId}] Process error:`, error);
            reject(error);
        });
    });
};

// Cancel task
const cancelTask = async (taskId) => {
    try {
        // Get task info
        const result = await db.query(
            'SELECT job_id, status FROM tasks WHERE id = $1',
            [taskId]
        );
        
        if (result.rows.length === 0) {
            throw new Error('Task not found');
        }
        
        const { job_id, status } = result.rows[0];
        
        if (status === 'completed' || status === 'success') {
            throw new Error('Cannot cancel completed task');
        }
        
        // Remove from Bull queue if exists
        if (job_id) {
            try {
                const job = await taskQueue.getJob(job_id);
                if (job) {
                    await job.remove();
                    console.log(`Removed job ${job_id} from queue`);
                }
            } catch (error) {
                console.error('Error removing job from queue:', error);
            }
        }
        
        // Terminate Python process if running
        const process = activeProcesses.get(taskId);
        if (process) {
            console.log(`Terminating Python process for task ${taskId}`);
            process.kill('SIGTERM');
            activeProcesses.delete(taskId);
        }
        
        // Update database
        await db.query(
            `UPDATE tasks 
             SET status = 'cancelled', 
                 error_message = 'Cancelled by admin',
                 completed_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [taskId]
        );
        
        taskToJobMap.delete(taskId);
        
        return { 
            success: true, 
            message: `Task ${taskId} cancelled successfully` 
        };
        
    } catch (error) {
        console.error('Error cancelling task:', error);
        throw error;
    }
};

// Get queue statistics
const getQueueStats = async () => {
    const waiting = await taskQueue.getWaitingCount();
    const active = await taskQueue.getActiveCount();
    const completed = await taskQueue.getCompletedCount();
    const failed = await taskQueue.getFailedCount();
    
    return { waiting, active, completed, failed };
};

// Get user tasks
const getUserTasks = async (userId, limit = 10) => {
    const result = await db.query(
        `SELECT id, task_type, status, created_at, completed_at, error_message 
         FROM tasks 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
    );
    return result.rows;
};

// Get all tasks (admin)
const getAllTasks = async (limit = 100) => {
    const result = await db.query(
        `SELECT t.*, u.username 
         FROM tasks t 
         JOIN users u ON t.user_id = u.id 
         ORDER BY t.created_at DESC 
         LIMIT $1`,
        [limit]
    );
    return result.rows;
};

// Get queue position
const getQueuePosition = async (taskId) => {
    const jobs = await taskQueue.getJobs(['waiting']);
    const position = jobs.findIndex(job => job.data.taskId === taskId);
    return position >= 0 ? position + 1 : null;
};

// Cleanup on shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing queue gracefully...');
    
    // Terminate all active processes
    for (const [taskId, proc] of activeProcesses.entries()) {
        console.log(`Terminating Python process for task ${taskId}`);
        proc.kill('SIGTERM');
    }
    
    await taskQueue.close();
    process.exit(0);
});

module.exports = {
    taskQueue,
    addTask,
    cancelTask,
    processTask,
    getQueueStats,
    getUserTasks,
    getAllTasks,
    getQueuePosition
};