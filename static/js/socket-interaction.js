var socket = undefined;
var currentTaskId = null;
var queueCheckInterval = null;

function initSocket(){
    if(socket === undefined)
        connectSocket()
}

function connectSocket(){
    console.log("Connecting to websocket...")
    socket = io();

    socket.on("connect", () => {
        console.log("Connected to server");
        // Request user's task history
        fetchUserTasks();
    });

    socket.on("disconnect", () => {
        console.log("Disconnected from server");
    });

    // Task queue events
    socket.on("task_queued", (msg) => {
        console.log("[TASK QUEUED]:", msg);
        currentTaskId = msg.taskId;
        showQueueNotification(msg);
        startQueuePositionCheck(msg.taskId);
    });

    socket.on("task_status", (msg) => {
        console.log("[TASK STATUS]:", msg);
        updateTaskStatusDisplay(msg);
    });

    socket.on("task_complete", (msg) => {
        console.log("[TASK COMPLETE]:", msg);
        stopQueuePositionCheck();
        __progress_completed();
    });

    socket.on("task_error", (msg) => {
        console.log("[TASK ERROR]:", msg);
        stopQueuePositionCheck();
        handle_route_error(msg);
    });

    // Existing route handlers
    socket.on("request_stdout", (msg) => {
        console.log("[STDOUT]:", msg)
        handle_std_data(msg)
    });

    socket.on("request_stderr", (msg) => {
        console.log("[STDERR]:", msg)
        handle_std_data(msg)
    });   

    socket.on("route_error", (msg) => {
        console.log("[ROUTE ERROR]:", msg)
        handle_route_error(msg)
    });

    socket.on("route_error_by_addr", (msg) => {
        console.log("[ROUTE BY ADDR ERROR]:", msg)
        handle_route_error_by_addr(msg)
    });    

    socket.on("update", (msg) => {
        console.log("[UPDATE]:", msg);
        handle_update_data(msg)
    });
    
    socket.on("update_by_addr", (msg) => {
        console.log("[UPDATE BY ADDR]:", msg);
        handle_update_data_by_addr(msg)
    });

    socket.on("route_data", (msg) => {
        console.log("[ROUTE DATA]:", msg)
        if(msg["type"] === "route")
            handle_route_data(msg)
        else if(msg["type"] === "sampling")
            handle_sampling_data(msg)
        else if(msg["type"] === "image")
            handle_route_img(msg)
    });

    socket.on("route_data_by_addr", (msg) => {
        console.log("[ROUTE DATA BY ADDR]:", msg)
        if(msg["type"] === "route")
            handle_route_data_by_addr(msg)
        else if(msg["type"] === "sampling")
            handle_sampling_data_by_addr(msg)
        else if(msg["type"] === "image")
            handle_route_img_by_addr(msg)
    });

    socket.on("route_wc_data_by_addr", (msg) => {
        console.log("[ROUTE CSV DATA BY ADDR]:", msg)
        handle_route_wc_data_by_addr(msg)
    });
    
    return socket;
}

// Queue management functions
function showQueueNotification(data) {
    const notification = document.createElement('div');
    notification.classList.add('alert', 'alert-info', 'alert-dismissible', 'fade', 'show');
    notification.innerHTML = `
        <strong>Task Queued!</strong> Your request has been added to the queue. 
        <span id="queue-position-display">Checking position...</span>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to both forms if they exist
    const progressDiv = document.getElementById('progress-div');
    const progressDivAddr = document.getElementById('progress-div-addr');
    
    if (progressDiv) {
        progressDiv.parentNode.insertBefore(notification, progressDiv);
    } else if (progressDivAddr) {
        progressDivAddr.parentNode.insertBefore(notification, progressDivAddr);
    }
}

function startQueuePositionCheck(taskId) {
    // Check queue position every 2 seconds
    checkQueuePosition(taskId);
    queueCheckInterval = setInterval(() => {
        checkQueuePosition(taskId);
    }, 2000);
}

function stopQueuePositionCheck() {
    if (queueCheckInterval) {
        clearInterval(queueCheckInterval);
        queueCheckInterval = null;
    }
}

function checkQueuePosition(taskId) {
    fetch(`/api/queue/position/${taskId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.position) {
                const display = document.getElementById('queue-position-display');
                if (display) {
                    display.textContent = `Position in queue: ${data.position}`;
                }
            }
        })
        .catch(error => {
            console.error('Error checking queue position:', error);
        });
}

function updateTaskStatusDisplay(data) {
    const message = data.message || `Task ${data.taskId} is ${data.status}`;
    
    if (data.status === 'executing') {
        __set_update_message('Your task is being processed...');
        __set_update_message_addr('Your task is being processed...');
        stopQueuePositionCheck();
    }
}

function fetchUserTasks() {
    fetch('/api/tasks')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayUserTaskHistory(data.tasks);
            }
        })
        .catch(error => {
            console.error('Error fetching user tasks:', error);
        });
}

function displayUserTaskHistory(tasks) {
    // Check if we have a task history section, if not create it
    const container = document.querySelector('.container');
    let historySection = document.getElementById('task-history-section');
    
    if (!historySection && tasks.length > 0) {
        historySection = document.createElement('div');
        historySection.id = 'task-history-section';
        historySection.classList.add('row', 'mt-4');
        historySection.innerHTML = `
            <h4>Your Recent Tasks</h4>
            <div id="task-history-list"></div>
        `;
        container.appendChild(historySection);
    }
    
    if (historySection && tasks.length > 0) {
        const historyList = document.getElementById('task-history-list');
        historyList.innerHTML = '';
        
        const table = document.createElement('table');
        table.classList.add('table', 'table-sm', 'table-striped');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="task-history-tbody"></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        tasks.slice(0, 5).forEach(task => {
            const row = document.createElement('tr');
            const statusBadge = getTaskStatusBadge(task.status);
            const createdAt = new Date(task.created_at).toLocaleString();
            
            row.innerHTML = `
                <td>${task.id}</td>
                <td>${task.task_type}</td>
                <td>${statusBadge}</td>
                <td>${createdAt}</td>
                <td>
                    ${task.status === 'success' ? 
                        `<button class="btn btn-sm btn-primary" onclick="reloadTask(${task.id})">
                            <i class="bi bi-arrow-clockwise"></i> Reload
                        </button>` : 
                        ''
                    }
                </td>
            `;
            tbody.appendChild(row);
        });
        
        historyList.appendChild(table);
    }
}

function getTaskStatusBadge(status) {
    const badges = {
        'waiting': '<span class="badge bg-warning">Waiting</span>',
        'executing': '<span class="badge bg-primary">Processing</span>',
        'success': '<span class="badge bg-success">Completed</span>',
        'error': '<span class="badge bg-danger">Failed</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

function reloadTask(taskId) {
    console.log('Reloading task', taskId);
}

function handle_std_data(stdout_data){
    __log_to_console(stdout_data)
}

function handle_route_error(error_message){
    __progress_error()
    __set_update_message(error_message["message"] || error_message.message)
}

function handle_route_error_by_addr(error_message){
    __progress_error_by_addr()
    __set_update_message_addr(error_message["message"] || error_message.message)
}

function handle_update_data(update_data){
    const old_progress_value = document.getElementsByClassName("progress-bar")[0].style.width.split("%")[0];
    const new_progress_value = Number(old_progress_value) + (100-10) / 5
    __update_progress(new_progress_value);
    __set_update_message(update_data["message"]);
}

function handle_update_data_by_addr(update_data){
    const old_progress_value = document.getElementsByClassName("progress-bar")[1].style.width.split("%")[0];
    const new_progress_value = Number(old_progress_value) + (100-10) / 5
    __update_progress_addr(new_progress_value);
    __set_update_message_addr(update_data["message"]);
}

function handle_route_img(route_img){
    console.log("Route image received...", route_img)
    var parser = new DOMParser();
    var svg_el = (parser.parseFromString(route_img["data"], "image/svg+xml")).childNodes[1];
    image_id = route_img["name"].split(".")[0]
    svg_el.id = image_id

    isactive = (document.querySelectorAll("#results_tablist li > .active ")).length == 0
    // isactive = true

    // Create new tablist element
    const li_element = document.createElement("li")
    li_element.classList.add("nav-item")
    li_element.role = "presentation"
    const button_element = document.createElement("button")
    button_element.classList.add("nav-link")
    if (isactive)
        button_element.classList.add("active")
    button_element.id = image_id + "-tab"
    button_element.dataset.bsToggle = "tab"
    button_element.dataset.bsTarget = "#" + image_id + "-tab-pane"
    button_element.type = "button"
    button_element.role = "tab"
    button_element.ariaControls = image_id + "-tab-pane"
    button_element.ariaSelected = "true"
    button_element.innerHTML = image_id.replace(/_/g, " ")
    li_element.appendChild(button_element)
    document.getElementById("results_tablist").appendChild(li_element)

    // Create new tabcontent element
    // <div class="tab-pane fade show active" id="home-tab-pane" role="tabpanel" aria-labelledby="home-tab" tabindex="0">...</div>
    const tab_content = document.createElement("div")
    tab_content.classList.add("tab-pane")
    tab_content.classList.add("fade")
    tab_content.classList.add("show")
    if (isactive)
        tab_content.classList.add("active")
    tab_content.id = image_id + "-tab-pane"
    tab_content.role = "tabpanel"
    tab_content.ariaLabelledby = image_id + "-tab"
    tab_content.tabIndex = "0"
    tab_content.appendChild(svg_el)
    document.getElementById("results_tabcontent").appendChild(tab_content)

    button_element.addEventListener('shown.bs.tab', event => {
        event.target // newly activated tab
        event.relatedTarget // previous active tab
        // console.log(event)
        svg_id = document.getElementById(event.target.id.replace("-tab", "-tab-pane")).children[0]
        initSVGPan(svg_id.id)
    })

    if (isactive)
        initSVGPan(svg_el.id)

}

function handle_route_img_by_addr(route_img){
    console.log("Route image received...", route_img)
    var parser = new DOMParser();
    var svg_el = (parser.parseFromString(route_img["data"], "image/svg+xml")).childNodes[1];
    image_id = route_img["name"].split(".")[0]
    svg_el.id = image_id

    isactive = (document.querySelectorAll("#results_tablist-by-addr li > .active ")).length == 0
    // isactive = true

    // Create new tablist element
    const li_element = document.createElement("li")
    li_element.classList.add("nav-item")
    li_element.role = "presentation"
    const button_element = document.createElement("button")
    button_element.classList.add("nav-link")
    if (isactive)
        button_element.classList.add("active")
    button_element.id = image_id + "-tab"
    button_element.dataset.bsToggle = "tab"
    button_element.dataset.bsTarget = "#" + image_id + "-tab-pane"
    button_element.type = "button"
    button_element.role = "tab"
    button_element.ariaControls = image_id + "-tab-pane"
    button_element.ariaSelected = "true"
    button_element.innerHTML = image_id.replace(/_/g, " ")
    li_element.appendChild(button_element)
    document.getElementById("results_tablist-by-addr").appendChild(li_element)

    // Create new tabcontent element
    // <div class="tab-pane fade show active" id="home-tab-pane" role="tabpanel" aria-labelledby="home-tab" tabindex="0">...</div>
    const tab_content = document.createElement("div")
    tab_content.classList.add("tab-pane")
    tab_content.classList.add("fade")
    tab_content.classList.add("show")
    if (isactive)
        tab_content.classList.add("active")
    tab_content.id = image_id + "-tab-pane"
    tab_content.role = "tabpanel"
    tab_content.ariaLabelledby = image_id + "-tab"
    tab_content.tabIndex = "0"
    tab_content.appendChild(svg_el)
    document.getElementById("results_tabcontent-by-addr").appendChild(tab_content)

    button_element.addEventListener('shown.bs.tab', event => {
        event.target // newly activated tab
        event.relatedTarget // previous active tab
        // console.log(event)
        svg_id = document.getElementById(event.target.id.replace("-tab", "-tab-pane")).children[0]
        initSVGPan(svg_id.id)
    })

    if (isactive)
        initSVGPan(svg_el.id)

}

function handle_sampling_data(sampling_data){
    console.log("Sampling data received...", sampling_data)

    sampling_circles = []
    sampling_data["coords"].forEach(element => {
        const lat = element[1]
        const lng = element[0]
        const ele = element[2]
        sampling_circles.push(L.circle([lat, lng], {radius: 2, color: 'red', fillOpacity: 0.3}).addTo(map))
    })

    console.log(sampling_circles)
    // map.fitBounds(sampling_circles[0].getBounds())
}

function handle_sampling_data_by_addr(sampling_data){
    console.log("Sampling data received...", sampling_data)

    sampling_circles_addr = []
    sampling_data["coords"].forEach(element => {
        const lat = element[1]
        const lng = element[0]
        const ele = element[2]
        sampling_circles_addr.push(L.circle([lat, lng], {radius: 2, color: 'red', fillOpacity: 0.3}).addTo(mapAddr))
    })

    console.log(sampling_circles_addr)
    // map.fitBounds(sampling_circles[0].getBounds())
}

function handle_route_data(route_data){
    console.log("Route data received...", route_data)

    // Clear previous route
    route_circles = []
    if (active_path != undefined)
        map.removeLayer(active_path)

            
    route_data["coords"].forEach(element => {
        const lat = element[1]
        const lng = element[0]
        const ele = element[2]
        route_circles.push(L.circle([lat, lng], {radius: 4, color: 'blue', fillOpacity: 0.3}).addTo(map))
    })

    // Draw new route
    // const route = route_data["coords"].map(e => [e[1], e[0]])
    // active_path = L.polyline(route, {color: 'blue'}).addTo(map);
    active_path = L.geoJSON(JSON.parse(route_data["geojson"])).addTo(map);
    map.fitBounds(active_path.getBounds());

    // Enable form button and hide progress bar
    __progress_completed()
}

function handle_route_data_by_addr(route_data){
    console.log("Addr Route data received...", route_data)

    // Clear previous route
    route_circles_addr = []
    if (active_path_addr != undefined)
        mapAddr.removeLayer(active_path_addr)

            
    route_data["coords"].forEach(element => {
        const lat = element[1]
        const lng = element[0]
        const ele = element[2]
        route_circles_addr.push(L.circle([lat, lng], {radius: 4, color: 'blue', fillOpacity: 0.3}).addTo(mapAddr))
    })


    active_path_addr = L.geoJSON(JSON.parse(route_data["geojson"])).addTo(mapAddr);
    mapAddr.fitBounds(active_path_addr.getBounds());

    // Enable form button and hide progress bar
    __progress_completed_by_addr()
}

//XXX: complete it!
function handle_route_wc_data_by_addr(route_data){
    console.log("WC dataset received but not handling it yet...", route_data)
 
}


// Keep all other existing functions
function submitForm(event){
    event.preventDefault()
    console.log("Submitting form...", event)

    // Disable form button and make progress bar appear
    document.getElementById("submit-button").disabled = true
    __activate_progress()
    __clear_console()
    if (active_path != undefined)
        map.removeLayer(active_path)
    if (sampling_circles != [])
        sampling_circles.forEach(element => map.removeLayer(element))
    if (route_circles != [])
        route_circles.forEach(element => map.removeLayer(element))

    // Get input fields
    const start_latitude = document.getElementById("start-latitude").value
    const start_longitude = document.getElementById("start-longitude").value
    const end_latitude = document.getElementById("end-latitude").value
    const end_longitude = document.getElementById("end-longitude").value
    const sampling_rate = document.getElementById("sampling-distance").value
    const intermediate_points = []
    
    intermediate_points_order.forEach(element => {
        const latitude = document.getElementById(element + "-latitude").value
        const longitude = document.getElementById(element + "-longitude").value
        
        if (latitude != "" && longitude != "")
            intermediate_points.push([latitude, longitude])
    })
    
    const request = {
        start_point: [start_latitude, start_longitude],
        end_point: [end_latitude, end_longitude],
        sampling_rate: sampling_rate,
        intermediate_points: intermediate_points
    }
    console.log("Sending request to server...")
    console.log(request)
    socket.emit("get_route", request)

    return false
}

function submitFormByAddress(event){
    event.preventDefault()
    console.log("Submitting form by address...", event)

    // Disable form button and make progress bar appear
    document.getElementById("submit-button-addr").disabled = true
    __activate_progress_addr()
    __clear_console()

    if (active_path_addr != undefined)
        mapAddr.removeLayer(active_path_addr)
    if (sampling_circles_addr != [])
        sampling_circles_addr.forEach(element => mapAddr.removeLayer(element))
    if (route_circles_addr != [])
        route_circles_addr.forEach(element => mapAddr.removeLayer(element))

    // Get input fields
    const start_addr = document.getElementById("start-ind").value
    const end_addr = document.getElementById("end-ind").value
    const sampling_rate = document.getElementById("sampling-distance2").value    
    const intermediate_addr = []
    
    intermediate_addr_order.forEach(element => {
        const indirizzo = document.getElementById(element + "-ind").value
        
        if (indirizzo != "")
            intermediate_addr.push([indirizzo])
    })
    
    const request = {
        start_addr: start_addr,
        end_addr: end_addr,
        sampling_rate: sampling_rate,
        intermediate_points: intermediate_addr
    }
    console.log("Sending request by address to server...")
    console.log(request)
    socket.emit("get_route_by_addr", request)

    return false
}