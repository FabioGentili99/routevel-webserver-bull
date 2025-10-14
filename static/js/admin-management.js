let active_map = undefined;
let socket = null;
let taskUpdateInterval = null;

function initAdminPage(){
    emptyElement('task-list');
    emptyElement('map-list');
    fetchActiveMap();
    fetchAllTasks();
    setMessage("", 'task-update-div');
    
    // Initialize WebSocket connection for real-time updates
    initAdminSocket();
    
    // Set up periodic refresh
    taskUpdateInterval = setInterval(fetchAllTasks, 5000);
}

function initAdminSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Admin connected to socket');
        socket.emit('get_queue_stats');
    });
    
    socket.on('new_task', (data) => {
        console.log('New task received:', data);
        showNotification(`New task from ${data.username}`, 'info');
        fetchAllTasks();
    });
    
    socket.on('admin_task_update', (data) => {
        console.log('Task update:', data);
        updateTaskStatus(data.taskId, data.status);
        fetchQueueStats();
    });
    
    socket.on('queue_stats', (stats) => {
        updateQueueStatsDisplay(stats);
    });
    
    socket.on('all_tasks', (tasks) => {
        displayAllTasks(tasks);
    });
}

function fetchAllTasks(){
    fetch('/admin/api/admin/tasks')
    .then(response => response.json())
    .then(data => {
        console.log("All tasks:", data);
        if(data.success) {
            displayAllTasks(data.tasks);
        } else {
            setMessage("Error loading tasks", 'task-update-div');
        }
    })
    .catch(error => {
        console.error('Error fetching tasks:', error);
        setMessage("Error loading tasks", 'task-update-div');
    });
}

function displayAllTasks(tasks) {
    emptyElement('task-list');
    
    if(tasks.length === 0) {
        setMessage("No tasks in the system", 'task-update-div');
        return;
    }
    
    // Add queue stats display
    const statsDiv = document.createElement('div');
    statsDiv.id = 'queue-stats';
    statsDiv.classList.add('row', 'mb-3', 'p-3', 'bg-light', 'rounded');
    statsDiv.innerHTML = `
        <div class="col-3">
            <div class="text-center">
                <h5 class="text-warning">Waiting</h5>
                <h3 id="stats-waiting">-</h3>
            </div>
        </div>
        <div class="col-3">
            <div class="text-center">
                <h5 class="text-primary">Executing</h5>
                <h3 id="stats-executing">-</h3>
            </div>
        </div>
        <div class="col-3">
            <div class="text-center">
                <h5 class="text-success">Completed</h5>
                <h3 id="stats-completed">-</h3>
            </div>
        </div>
        <div class="col-3">
            <div class="text-center">
                <h5 class="text-danger">Failed</h5>
                <h3 id="stats-failed">-</h3>
            </div>
        </div>
    `;
    document.getElementById('task-list').appendChild(statsDiv);
    
    // Request queue stats
    if(socket) {
        socket.emit('get_queue_stats');
    }
    
    // Create task table
    const table = document.createElement('table');
    table.classList.add('table', 'table-striped', 'table-hover');
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>ID</th>
            <th>User</th>
            <th>Type</th>
            <th>Status</th>
            <th>Created</th>
            <th>Started</th>
            <th>Completed</th>
            <th>Actions</th>
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    
    tasks.forEach(task => {
        const row = document.createElement('tr');
        row.id = `task-row-${task.id}`;
        
        const statusBadge = getStatusBadge(task.status);
        const createdAt = new Date(task.created_at).toLocaleString();
        const startedAt = task.started_at ? new Date(task.started_at).toLocaleString() : '-';
        const completedAt = task.completed_at ? new Date(task.completed_at).toLocaleString() : '-';
        
        row.innerHTML = `
            <td>${task.id}</td>
            <td>${task.username}</td>
            <td><span class="badge bg-info">${task.task_type}</span></td>
            <td>${statusBadge}</td>
            <td>${createdAt}</td>
            <td>${startedAt}</td>
            <td>${completedAt}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewTaskDetails(${task.id})">
                    <i class="bi bi-eye"></i>
                </button>
                ${task.status === 'waiting' || task.status === 'executing' ? 
                    `<button class="btn btn-sm btn-danger" onclick="cancelTask(${task.id})">
                        <i class="bi bi-x-circle"></i>
                    </button>` : 
                    `<button class="btn btn-sm btn-danger" onclick="deleteTask(${task.id})">
                        <i class="bi bi-trash3-fill"></i>
                    </button>`
                }
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    document.getElementById('task-list').appendChild(table);
}

function getStatusBadge(status) {
    const badges = {
        'waiting': '<span class="badge bg-warning">Waiting</span>',
        'executing': '<span class="badge bg-primary">Executing</span>',
        'success': '<span class="badge bg-success">Success</span>',
        'error': '<span class="badge bg-danger">Error</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

function updateTaskStatus(taskId, status) {
    const row = document.getElementById(`task-row-${taskId}`);
    if (row) {
        const statusCell = row.cells[3];
        statusCell.innerHTML = getStatusBadge(status);
        
        // Update timestamps if needed
        if (status === 'executing') {
            row.cells[5].textContent = new Date().toLocaleString();
        } else if (status === 'success' || status === 'error') {
            row.cells[6].textContent = new Date().toLocaleString();
        }
    }
}

function updateQueueStatsDisplay(stats) {
    document.getElementById('stats-waiting').textContent = stats.waiting || 0;
    document.getElementById('stats-executing').textContent = stats.active || 0;
    document.getElementById('stats-completed').textContent = stats.completed || 0;
    document.getElementById('stats-failed').textContent = stats.failed || 0;
}

function fetchQueueStats() {
    if (socket) {
        socket.emit('get_queue_stats');
    }
}

function viewTaskDetails(taskId) {
    fetch(`/api/tasks/${taskId}`)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showTaskDetailsModal(data.task);
        } else {
            showNotification(data.error || 'Failed to load task details', 'danger');
        }
    })
    .catch(error => {
        console.error('Error fetching task details:', error);
        showNotification('Error loading task details: ' + error.message, 'danger');
    });
}

function showTaskDetailsModal(task) {
    // Create a Bootstrap modal
    const modalHtml = `
        <div class="modal fade" id="taskDetailModal" tabindex="-1" aria-labelledby="taskDetailModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="taskDetailModalLabel">Task ${task.id} Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <table class="table table-bordered">
                            <tbody>
                                <tr>
                                    <th style="width: 30%">Task ID</th>
                                    <td>${task.id}</td>
                                </tr>
                                <tr>
                                    <th>User</th>
                                    <td>${task.username}</td>
                                </tr>
                                <tr>
                                    <th>Task Type</th>
                                    <td><span class="badge bg-info">${task.task_type}</span></td>
                                </tr>
                                <tr>
                                    <th>Status</th>
                                    <td>${getStatusBadge(task.status)}</td>
                                </tr>
                                <tr>
                                    <th>Created At</th>
                                    <td>${new Date(task.created_at).toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <th>Started At</th>
                                    <td>${task.started_at ? new Date(task.started_at).toLocaleString() : 'Not started'}</td>
                                </tr>
                                <tr>
                                    <th>Completed At</th>
                                    <td>${task.completed_at ? new Date(task.completed_at).toLocaleString() : 'Not completed'}</td>
                                </tr>
                                ${task.error_message ? `
                                <tr>
                                    <th>Error Message</th>
                                    <td class="text-danger">${task.error_message}</td>
                                </tr>
                                ` : ''}
                                <tr>
                                    <th>Request Data</th>
                                    <td><pre class="bg-light p-2 rounded">${JSON.stringify(task.request_data, null, 2)}</pre></td>
                                </tr>
                                ${task.result_data ? `
                                <tr>
                                    <th>Result Data</th>
                                    <td><pre class="bg-light p-2 rounded" style="max-height: 200px; overflow-y: auto;">${JSON.stringify(task.result_data, null, 2)}</pre></td>
                                </tr>
                                ` : ''}
                                ${task.output_dir ? `
                                <tr>
                                    <th>Output Directory</th>
                                    <td><code>${task.output_dir}</code></td>
                                </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('taskDetailModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('taskDetailModal'));
    modal.show();
    
    document.getElementById('taskDetailModal').addEventListener('hidden.bs.modal', function () {
        this.remove();
    });
}


function cancelTask(taskId) {
    if (!confirm('Are you sure you want to cancel this task?')) {
        return;
    }
    
    fetch(`/admin/api/admin/tasks/${taskId}/cancel`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Task cancelled successfully', 'success');
            fetchAllTasks();
        } else {
            showNotification('Failed to cancel task', 'danger');
        }
    })
    .catch(error => {
        console.error('Error cancelling task:', error);
        showNotification('Error cancelling task', 'danger');
    });
}

function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    console.log("Deleting task", taskId);
    fetch('/admin/task/' + taskId, {
        method: 'DELETE'
    })
    .then(response => {
        console.log("Task deleted");
        setMessage("Task " + taskId + " deleted successfully", 'task-update-div');
        fetchAllTasks();
    })
    .catch(error => {
        console.error('Error deleting task:', error);
        setMessage("Error deleting task", 'task-update-div');
    });
}

function deleteAllTasks(){
    if (!confirm('Are you sure you want to delete ALL tasks? This action cannot be undone!')) {
        return;
    }
    
    fetch('/admin/task', {
        method: 'DELETE'
    })
    .then(response => {
        console.log("All tasks deleted");
        setMessage("All tasks have been deleted successfully", 'task-update-div');
        emptyElement('task-list');
        fetchQueueStats();
    });
}

function showNotification(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.classList.add('alert', `alert-${type}`, 'alert-dismissible', 'fade', 'show', 'position-fixed', 'top-0', 'end-0', 'm-3');
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function emptyElement(element_id){
    const element = document.getElementById(element_id);
    if (element) {
        element.innerHTML = '';
    }
}

function setMessage(message, element_id) {
    const updateDiv = document.getElementById(element_id);
    if (updateDiv) {
        updateDiv.textContent = message;
    }
}

// Keep existing map functions
function fetchMaps(){
    fetch('/admin/maps/')
    .then(response => response.json())
    .then(data => {
        console.log("maps", data);
        data.forEach(map => {
            addMapElement(map);
        });
    });
}

function addMapElement(map){
    const formatted_name = map.split('_')[1];
    const col = document.createElement('div');
    col.classList.add('col-3');

    const card = document.createElement('div');
    card.classList.add('card', 'm-2', 'rounded');

    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body');

    const cardTitle = document.createElement('h5');
    cardTitle.classList.add('card-title');
    cardTitle.textContent = formatted_name.toUpperCase();
    cardBody.appendChild(cardTitle);

    const cardText = document.createElement('p');
    cardText.classList.add('card-text');
    cardText.textContent = "";
    cardBody.appendChild(cardText);

    if(map === active_map){
        const button = document.createElement('button');
        button.classList.add('btn', 'btn-success');
        button.textContent = 'IN USO';
        button.disabled = true;
        cardBody.appendChild(button);
    
        cardBody.appendChild(document.createTextNode(' '));
    
        const iconButton = document.createElement('button');
        iconButton.classList.add('btn', 'btn-success');
        const icon = document.createElement('i');
        icon.classList.add('bi', 'bi-check');
        iconButton.appendChild(icon);
        cardBody.appendChild(iconButton);
        card.classList.add('border', 'border-success', 'border-3');
    }else{
        const button = document.createElement('button');
        button.classList.add('btn', 'btn-primary');
        button.textContent = 'DISPONIBILE';
        button.disabled = true;
        cardBody.appendChild(button);
    
        cardBody.appendChild(document.createTextNode(' '));
    
        const iconButton = document.createElement('button');
        iconButton.classList.add('btn', 'btn-primary');
        const icon = document.createElement('i');
        icon.classList.add('bi', 'bi-cloud-arrow-up-fill');
        iconButton.addEventListener('click', () => {
            switchMap(map);
        });
        iconButton.appendChild(icon);
        cardBody.appendChild(iconButton);
    }
    
    const cardImage = document.createElement('img');
    cardImage.classList.add('card-img-top');
    cardImage.setAttribute('src', 'https://picsum.photos/300/100');
    cardImage.setAttribute('alt', 'Card Image');
    cardImage.style.width = '100%';
    cardImage.style.height = '100%';
    cardImage.style.objectFit = 'cover';
    card.appendChild(cardImage);

    card.appendChild(cardBody);
    col.appendChild(card);

    document.getElementById('map-list').appendChild(col);
}

function switchMap(map){
    console.log("Switching map", map)
    fetch('/admin/switch-map/' + map, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    })
    .then(response => response.json())
    .then(data => {
        active_map = data.map;
        console.log("Active map", active_map);
        emptyElement('map-list');
        fetchMaps();
    });
}

function fetchActiveMap(){
    fetch('/admin/active-map', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    })
    .then(response => response.json())
    .then(data => {
        const map = data.split('/').pop();
        console.log("fetch active map", map);
        active_map = map;
        fetchMaps();
    });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (taskUpdateInterval) {
        clearInterval(taskUpdateInterval);
    }
    if (socket) {
        socket.disconnect();
    }
});