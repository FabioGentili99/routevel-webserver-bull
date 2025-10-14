const express = require("express");
const path = require('path');
const http = require("http");
const { Server } = require("socket.io");
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cookieParser = require('cookie-parser');
const { pool } = require('./db/database');
const db = require('./db/database');
require('dotenv').config();

const route2vel_module = require("./routes/route2vel_route.js");
const admin_module = require("./routes/admin_route.js");
const auth_module = require("./routes/auth_route.js");

const { isAuthenticated, isAdmin, attachUserToSocket } = require('./middleware/auth');

const { processTask, addTask, getQueuePosition, getUserTasks } = require('./queue/taskQueue');

const app = express();
const port = process.env.PORT || 3000;

const server = http.createServer(app);

// Session configuration
const sessionMiddleware = session({
    store: new pgSession({
        pool: pool,
        tableName: 'sessions'
    }),
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));-+
app.use(cookieParser());
app.use(sessionMiddleware);

// Static files
app.use(express.static('../static'));
app.use('/static', express.static('../static'));
app.use(express.static(path.join(__dirname, '..', 'node_modules', 'bootstrap', 'dist')));
app.use(express.static(path.join(__dirname, '..', 'node_modules', 'bootstrap-icons', 'font')));

// Socket.io with session
const io = new Server(server, {
    maxHttpBufferSize: 1e8,
    cors: {
        origin: process.env.ALLOWED_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

io.on('connection', (socket) => {
    const { userId, username, isAdmin } = socket;
    console.log(`Socket connected: ${socket.id} (User: ${username || 'unknown'}, ID: ${userId || 'n/a'})`);

    // For authenticated browsers (session-based)
    if (userId) socket.join(`user_${userId}`);
    if (isAdmin) socket.join('admin_room');

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id} (User: ${username || 'unknown'})`);
    });
});


// Share session with Socket.io
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// Authenticate socket connections
io.use((socket, next) => {
    attachUserToSocket(socket, next);
});

// Routes
app.use("/auth", auth_module);
app.use("/route", isAuthenticated, route2vel_module.router);
app.use("/admin", isAuthenticated, isAdmin, admin_module.router);

// API Routes for queue status
app.get("/api/user", isAuthenticated, (req, res) => {
    if (req.session.user) {
        res.json({ 
            success: true, 
            user: {
                id: req.session.user.id,
                username: req.session.user.username,
                email: req.session.user.email,
                is_admin: req.session.user.is_admin
            }
        });
    } else {
        res.status(401).json({ success: false, error: 'Not authenticated' });
    }
});

// API Routes for queue status
app.get("/api/tasks", isAuthenticated, async (req, res) => {
    try {
        const tasks = await getUserTasks(req.session.user.id);
        res.json({ success: true, tasks });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

app.get("/api/queue/position/:taskId", isAuthenticated, async (req, res) => {
    try {
        const position = await getQueuePosition(parseInt(req.params.taskId));
        res.json({ success: true, position });
    } catch (error) {
        console.error('Error getting queue position:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});


// Root redirects
app.get("/", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login");
    }
    if (req.session.user.is_admin) {
        return res.redirect("/admin");
    }
    res.redirect("/route");
});

app.get("/ping", (req, res) => {
    const ping_response = {
        message: "pong",
        authenticated: !!req.session.user
    }
    res.json(ping_response);
});

// Websocket handlers
io.on("connection", (socket) => {
    const client_id = socket.id;
    const user_id = socket.userId;
    const username = socket.username;
    const isAdmin = socket.isAdmin;
    
    
    console.log(`User ${username} (ID: ${user_id}) connected with socket ID: ${client_id}`);
    
    // Join user to their personal room
    socket.join(`user_${user_id}`);
    
    // If admin, join admin room
    if (isAdmin) {
        socket.join('admin_room');
    }

    socket.on("disconnect", () => {
        console.log(`User ${username} disconnected (socket: ${client_id})`);
    });
    
    socket.on("connect_error", (err) => {
        console.log("Error in socket", client_id, err);
    });
    
    socket.on("connect_timeout", (err) => {
        console.log("Connection timeout in socket", client_id, err);
    });
    
    // Modified route request handlers to use queue
    socket.on("get_route", async (msg) => {
        console.log(`Received get_route request from user ${username} (${user_id})`);
        console.log('Request data:', msg);
        try {
            const { taskId, jobId } = await addTask(user_id, 'coordinates', msg, client_id);
            socket.emit("task_queued", {
                taskId,
                jobId,
                message: "Your request has been queued"
            });
            
            // Notify admin
            io.to('admin_room').emit('new_task', {
                taskId,
                userId: user_id,
                username,
                type: 'coordinates'
            });
        } catch (error) {
            console.error('Error queuing task:', error);
            socket.emit("route_error", {
                message: "Failed to queue your request. Please try again."
            });
        }
    });
    
    socket.on("get_route_by_addr", async (msg) => {
        console.log(`Received get_route_by_addr request from user ${username} (${user_id})`);
        console.log('Request data:', msg);
        try {
            const { taskId, jobId } = await addTask(user_id, 'address', msg, client_id);
            socket.emit("task_queued", {
                taskId,
                jobId,
                message: "Your request has been queued"
            });
            
            // Notify admin
            io.to('admin_room').emit('new_task', {
                taskId,
                userId: user_id,
                username,
                type: 'address'
            });
        } catch (error) {
            console.error('Error queuing task:', error);
            socket.emit("route_error_by_addr", {
                message: "Failed to queue your request. Please try again."
            });
        }
    });
    
    // existing update handlers
    socket.on("update", (msg) => {
        route2vel_module.handlers.handle_updates(client_id, socket, msg);
    });
    
    socket.on("update_by_addr", (msg) => {
        route2vel_module.handlers.handle_updates_by_addr(client_id, socket, msg);
    });
    
    socket.on("route_data", (msg) => {
        route2vel_module.handlers.handle_route_data(client_id, socket, msg);
    });
    
    socket.on("route_data_by_addr", (msg) => {
        route2vel_module.handlers.handle_route_data_by_addr(client_id, socket, msg);
    });
    
    socket.on("route_wc_data_by_addr", (msg) => {
        route2vel_module.handlers.handle_route_wc_data_by_addr(client_id, socket, msg);
    });
    
    socket.on("route_error", (msg) => {
        route2vel_module.handlers.handle_route_error(client_id, socket, msg);
    });
    
    socket.on("route_error_by_addr", (msg) => {
        route2vel_module.handlers.handle_route_error_by_addr(client_id, socket, msg);
    });
    
    socket.on("join", (msg) => {
        console.log(socket.id, "joining room", msg["room"]);
        socket.join(msg["room"]);
    });
    
    // Admin-specific events
    if (isAdmin) {
        socket.on("get_queue_stats", async () => {
            const { getQueueStats } = require('./queue/taskQueue');
            const stats = await getQueueStats();
            socket.emit("queue_stats", stats);
        });
        
        socket.on("get_all_tasks", async () => {
            const tasks = await getAllTasks();
            socket.emit("all_tasks", tasks);
        });
    }
});

io.on("connect_error", (err) => {
    console.log("Error in socket", err);
});

io.on("connect_timeout", (err) => {
    console.log("Connection timeout in socket", err);
});

// Initialize task processor
processTask(io);

server.listen(port, () => {
    console.log(`Web server listening at http://localhost:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('Task queue processor initialized');
    
    // Test Redis connection
    const { taskQueue } = require('./queue/taskQueue');
    taskQueue.isReady().then(() => {
        console.log('Redis connection established - Queue is ready');
    }).catch((err) => {
        console.error('Redis connection failed:', err);
        console.error('Make sure Redis is running on localhost:6379');
    });
});