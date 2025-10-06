const fs = require('fs');
const path = require('path');
const express = require('express');
const { spawn } = require('node:child_process');
const http = require('http');
const os = require('os');
const router = express.Router();
const db = require('../db/database');
const { cancelTask } = require('../queue/taskQueue');


router.use(express.static('static'));
router.use(express.static(path.join(__dirname, '..', '..', 'node_modules', 'bootstrap', 'dist')));
router.use(express.static(path.join(__dirname, '..', '..', 'node_modules', 'bootstrap-icons', 'font')));
router.use(express.static(path.join(__dirname, '..', '..', 'node_modules', 'socket.io', 'client-dist')));

var tasks = []

router.get("/", (req, res) => {
    // User is already authenticated and is admin (checked by middleware)
    res.sendFile(path.join(__dirname, '..', '..', 'static', 'admin_page.html'));
});

router.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/auth/login');
    });
});

// Get task details for a specific task
router.get("/api/tasks/:id", async (req, res) => {
    try {
        const taskId = req.params.id;
        const result = await db.query(
            `SELECT t.*, u.username 
             FROM tasks t 
             JOIN users u ON t.user_id = u.id 
             WHERE t.id = $1`,
            [taskId]
        );
        
        if (result.rows.length > 0) {
            res.json({ success: true, task: result.rows[0] });
        } else {
            res.status(404).json({ success: false, error: 'Task not found' });
        }
    } catch (error) {
        console.error('Error fetching task details:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

router.post("/api/tasks/:id/cancel", async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        
        const result = await cancelTask(taskId);
        
        const io = req.app.get('io');
        if (io) {
            // Notifica all'utente che possiede il task
            const taskInfo = await db.query(
                'SELECT user_id FROM tasks WHERE id = $1',
                [taskId]
            );
            
            if (taskInfo.rows.length > 0) {
                const userId = taskInfo.rows[0].user_id;
                io.to(`user_${userId}`).emit('task_cancelled', {
                    taskId,
                    message: 'Your task has been cancelled by an administrator'
                });
            }
            
            // Notifica a tutti gli admin
            io.to('admin_room').emit('admin_task_update', {
                taskId,
                status: 'cancelled'
            });
        }
        
        res.json({ 
            success: true, 
            message: result.message 
        });
        
    } catch (error) {
        console.error('Error cancelling task:', error);
        
        if (error.message === 'Task not found') {
            return res.status(404).json({ 
                success: false, 
                error: error.message 
            });
        }
        
        if (error.message === 'Cannot cancel completed task') {
            return res.status(400).json({ 
                success: false, 
                error: error.message 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Failed to cancel task' 
        });
    }
});


// Old file-based task management (kept for backward compatibility)
router.get("/task", (req, res) => {
    tasks = []
    if (process.env.TASK_FOLDER && fs.existsSync(process.env.TASK_FOLDER)) {
        fs.readdirSync(process.env.TASK_FOLDER).forEach(file => {
            tasks.push(file);
        });
    }
    console.log("Tasks: ", tasks)
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(tasks));
});

router.delete("/task", (req, res) => {
    if (process.env.TASK_FOLDER && fs.existsSync(process.env.TASK_FOLDER)) {
        fs.readdirSync(process.env.TASK_FOLDER).forEach(file => {
            const taskPath = path.join(process.env.TASK_FOLDER, file);
            fs.rmSync(taskPath, { recursive: true, force: true });
        });
    }
    res.sendStatus(200);
});

router.delete("/task/:id", async (req, res) => {
    const taskId = req.params.id;
    
    // Try to delete from database first
    try {
        await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    } catch (error) {
        console.error('Error deleting task from database:', error);
    }
    
    // Also try to delete from filesystem if it exists
    if (process.env.TASK_FOLDER) {
        const task_path = path.join(process.env.TASK_FOLDER, taskId);
        if (fs.existsSync(task_path)) {
            fs.rmSync(task_path, { recursive: true, force: true });
        }
    }
    
    res.sendStatus(200);
});

// MAPS functionality (unchanged)
router.get("/maps", (req, res) => {
    fs.readdir(process.env.INDEX_FOLDER, (err, files) => {
        if (err) {
            console.error(err);
            res.sendStatus(500);
            return;
        }

        const tokens = files.filter(file => {
            const filePath = path.join(process.env.INDEX_FOLDER, file);
            return fs.lstatSync(filePath).isDirectory();
        }).map(file => {
            return file;
        });

        res.setHeader("Content-Type", "application/json");
        res.send(JSON.stringify(tokens));
    });
});

router.get("/switch-map/:map", (req, res) => {
    const mapName = req.params.map;
    const scriptPath = path.join(process.env.INDEX_FOLDER, 'reload_map.sh');
    
    console.log(`Executing bash script ${scriptPath} with map ${mapName}`)
    const scriptProcess = spawn('bash', [scriptPath, mapName]);

    scriptProcess.on('error', (error) => {
        console.error(`Error executing bash script: ${error}`);
        res.sendStatus(500);
    });

    scriptProcess.on('exit', (code) => {
        if (code === 0) {
            console.log(`Bash script executed successfully`);
            res.setHeader("Content-Type", "application/json");
            res.send(JSON.stringify({ map: mapName }));
        } else {
            console.error(`Bash script exited with code ${code}`);
            res.sendStatus(500);
        }
    });
});

router.get("/active-map", (requ, resu) => {
    const linux_options = {
        socketPath: '/run/docker.sock',
        path: '/containers/osrm_backend-routed/json',
        method: 'GET'
    };

    const win_options = {
        hostname: 'localhost', 
        port: 2375,
        path: '/containers/osrm_backend-routed/json',
        method: 'GET'
    };

    let options;

    if (os.platform() === 'win32') {
        console.log("Using win options")
        options = win_options;
    } else if (os.platform() === 'linux') {
        console.log("Using linux options")
        options = linux_options;
    } else {
        console.error('Unsupported OS');
        resu.status(500).json({ error: 'Unsupported OS' });
        return;
    }

    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const jsonData = JSON.parse(data);
                resu.setHeader("Content-Type", "application/json");
                resu.send(JSON.stringify((jsonData.Mounts[0]).Source));
            } catch (error) {
                console.error('Error parsing Docker response:', error);
                resu.status(500).json({ error: 'Failed to get active map' });
            }
        });
    });

    req.on('error', (error) => {
        console.error(`Error making request to docker socket: ${error}`);
        if (error instanceof AggregateError) {
            console.error('Aggregate error detected:', error.errors);
        }
        resu.sendStatus(500);
    });

    req.end();
});

module.exports.router = router;