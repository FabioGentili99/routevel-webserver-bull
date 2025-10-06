const path = require('path');
const express = require('express');
const router = express.Router();

const { spawn } = require('node:child_process');

router.use(express.static('static'));
router.use(express.static(path.join(__dirname, '..', '..', 'node_modules', 'bootstrap', 'dist')));
router.use(express.static(path.join(__dirname, '..', '..', 'node_modules', 'bootstrap-icons', 'font')));
router.use(express.static(path.join(__dirname, '..', '..', 'node_modules', 'leaflet', 'dist')));
router.use(express.static(path.join(__dirname, '..', '..', 'node_modules', 'socket.io', 'client-dist')));
router.use(express.static(path.join(__dirname, '..', '..', 'node_modules', 'svg-pan-zoom', 'dist')));
router.use(express.static(path.join(__dirname, '..', '..', 'resources', 'icons')));
router.use(express.static(path.join(__dirname, '..', '..', 'resources', 'svg')));


// Map that associate each client to its route requests
const client_routes = new Map();

router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'static', 'routevel.html'));
});

router.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/auth/login');
    });
});

router.get('/ping', (req, res) => {
    const ping_response = {
        message: 'pong'
    }

    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(ping_response));
});

// Route2vel websocket handlers
function submit_route_request(client_id, socket, data){
    console.log("Client", client_id, "requested a route with data:", data);
    script_args = []
    script_args.push("--start", data.start_point[0], data.start_point[1]);
    script_args.push("--end", data.end_point[0], data.end_point[1]);
    script_args.push("--sampling", data.sampling_rate);
    data.intermediate_points.forEach(element => {
        script_args.push("--intermediate", element[0], element[1]);
    });
    script_args.push("--websocket-room", socket.id);
    if (process.env.OUTPUT_DIR){
        output_subdir = path.join(process.env.OUTPUT_DIR, String(Date.now()))
        script_args.push("--output-dir", output_subdir);
        console.log("Using subdir", output_subdir)
    }

    python_folder = process.env.PYTHON_FOLDER || "";
    python_dist = process.env.PYTHON_DIST || "python";
    console.log("Spawning ", python_dist, [path.join(python_folder, "route2vel_main.py")].concat(script_args))
    const child_process = spawn(python_dist, [path.join(python_folder, "route2vel_main.py")].concat(script_args));

    child_process.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });

    child_process.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
        // socket.emit("request_stdout", data.toString());
    });

    child_process.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
        // socket.emit("request_stderr", data.toString());
    });

    if (!client_routes.has(client_id)){
        client_routes.set(client_id, new Set());
    }
    client_routes.get(client_id).add(socket.id);

    console.log("Request spawned...")
}

// Route2vel websocket handlers addr
function submit_route_request_by_addr(client_id, socket, data){
    console.log("Client", client_id, "requested a route with address data:", data);
    script_args = []
    script_args.push("--start", data.start_addr);
    script_args.push("--end", data.end_addr);
    script_args.push("--sampling", data.sampling_rate);
    data.intermediate_points.forEach(element => {
        script_args.push("--intermediate", element);
    });
    script_args.push("--websocket-room", socket.id);
    if (process.env.OUTPUT_DIR){
        output_subdir = path.join(process.env.OUTPUT_DIR, String(Date.now()))
        script_args.push("--output-dir", output_subdir);
        console.log("Using subdir", output_subdir)
    }

    python_folder = process.env.PYTHON_FOLDER || "";
    python_dist = process.env.PYTHON_DIST || "python";
    console.log("Spawning ", python_dist, [path.join(python_folder, "route2vel_main_by_addr.py")].concat(script_args))
    const child_process = spawn(python_dist, [path.join(python_folder, "route2vel_main_by_addr.py")].concat(script_args));

    child_process.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });

    child_process.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
        // socket.emit("request_stdout", data.toString());
    });

    child_process.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
        // socket.emit("request_stderr", data.toString());
    });

    if (!client_routes.has(client_id)){
        client_routes.set(client_id, new Set());
    }
    client_routes.get(client_id).add(socket.id);

    console.log("Request by addr spawned...")
}

function handle_updates(client_id, socket, data){
    console.log("Client", client_id, "sent an update with data:", data);

    const room = data["room"];
    delete data["room"];
    socket.to(room).emit("update", data);
}

function handle_updates_by_addr(client_id, socket, data){
    console.log("Client", client_id, "sent an update with data:", data);

    const room = data["room"];
    delete data["room"];
    socket.to(room).emit("update_by_addr", data);
}

function handle_route_data(client_id, socket, data){
    console.log("Client", client_id, "sent route data with data:", data);

    const room = data["room"];
    delete data["room"];
    socket.to(room).emit("route_data", data);
}

function handle_route_data_by_addr(client_id, socket, data){
    console.log("Client", client_id, "sent route data with data:", data);

    const room = data["room"];
    delete data["room"];
    socket.to(room).emit("route_data_by_addr", data);
}

function handle_route_wc_data_by_addr(client_id, socket, data){
    console.log("Client", client_id, "sent route wc data with data:", data);

    const room = data["room"];
    delete data["room"];
    socket.to(room).emit("route_wc_data_by_addr", data);
}

function handle_route_error(client_id, socket, data){
    console.log("Client", client_id, "sent route error with data:", data);

    const room = data["room"];
    delete data["room"];
    socket.to(room).emit("route_error", data);
}

function handle_route_error_by_addr(client_id, socket, data){
    console.log("Client", client_id, "sent route error with data:", data);

    const room = data["room"];
    delete data["room"];
    socket.to(room).emit("route_error_by_addr", data);
}

module.exports.router = router;
module.exports.handlers =  {
    submit_route_request: submit_route_request,
    submit_route_request_by_addr: submit_route_request_by_addr,
    handle_updates: handle_updates,
    handle_updates_by_addr: handle_updates_by_addr,    
    handle_route_data: handle_route_data,
    handle_route_data_by_addr: handle_route_data_by_addr,    
    handle_route_wc_data_by_addr: handle_route_wc_data_by_addr,        
    handle_route_error: handle_route_error,
    handle_route_error_by_addr: handle_route_error_by_addr    
}