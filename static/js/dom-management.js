/*
function initDom(){
    intermediate_points['pi1'] = document.getElementById("pi1")
    intermediate_points_order.push("pi1")
    active_intermediate_point = "pi1"

    //address
    intermediate_addr['pii1'] = document.getElementById("pii1")
    intermediate_addr_order.push("pii1")
    active_intermediate_addr = "pii1"

    initMap()
    // initMockInput()

    if (start_marker != undefined && end_marker != undefined){
        input_feature_group = new L.FeatureGroup();
        input_feature_group.addLayer(start_marker)
        input_feature_group.addLayer(end_marker)
        for (const [key, value] of Object.entries(intermediate_markers)) {
            input_feature_group.addLayer(value)
        }
        map.fitBounds(input_feature_group.getBounds())
    }
}

// function initMockInput(){
//     start_latitude = document.getElementById("start-latitude")
//     start_longitude = document.getElementById("start-longitude")
//     end_latitude = document.getElementById("end-latitude")
//     end_longitude = document.getElementById("end-longitude")

//     start_latitude.value = "44.48088237098375"
//     start_longitude.value = "11.282100677490234"

//     end_latitude.value = "44.48479526325984"
//     end_longitude.value = "11.279909312725069"

//     start_marker = __addMarker(start_latitude.value, start_longitude.value, green_marker_opt)
//     end_marker = __addMarker( end_latitude.value, end_longitude.value ,red_marker_opt)

//     p1_lat = document.getElementById("pi1-latitude")
//     p2_lon = document.getElementById("pi1-longitude")

//     p1_lat.value = "44.482895741979675"
//     p2_lon.value = "11.276103258132936"

//     intermediate_markers["pi1"] = __addMarker(p1_lat.value, p2_lon.value, orange_marker_opt)

//     addIntermediatePoints("pi1")
//     p2_lat = document.getElementById("pi2-latitude")
//     p2_lon = document.getElementById("pi2-longitude")

//     p2_lat.value = "44.48567152962956"
//     p2_lon.value = "11.277261972427368"

//     intermediate_markers["pi2"] = __addMarker(p2_lat.value, p2_lon.value, orange_marker_opt)

//     addIntermediatePoints("pi2")
// }

function initMockInput(){

    start_latitude = document.getElementById("start-latitude")
    start_longitude = document.getElementById("start-longitude")
    end_latitude = document.getElementById("end-latitude")
    end_longitude = document.getElementById("end-longitude")

    start_latitude.value = "44.485847"
    start_longitude.value = "11.280292"

    end_latitude.value = "44.485847"
    end_longitude.value = "11.280292"

    start_marker = __addMarker(start_latitude.value, start_longitude.value, green_marker_opt)
    end_marker = __addMarker( end_latitude.value, end_longitude.value ,red_marker_opt)

    p1_lat = document.getElementById("pi1-latitude")
    p2_lon = document.getElementById("pi1-longitude")

    p1_lat.value = "44.484903"
    p2_lon.value = "11.279395"

    intermediate_markers["pi1"] = __addMarker(p1_lat.value, p2_lon.value, orange_marker_opt)

    addIntermediatePoints("pi1")
    p2_lat = document.getElementById("pi2-latitude")
    p2_lon = document.getElementById("pi2-longitude")

    p2_lat.value = "44.482321"
    p2_lon.value = "11.275608"

    intermediate_markers["pi2"] = __addMarker(p2_lat.value, p2_lon.value, orange_marker_opt)

    addIntermediatePoints("pi2")
    // p3_lat = document.getElementById("pi3-latitude")
    // p3_lon = document.getElementById("pi3-longitude")

    // p3_lat.value = "44.482321"
    // p3_lon.value = "11.275608"

    // intermediate_markers["pi3"] = __addMarker(p3_lat.value, p3_lon.value, orange_marker_opt)

    // addIntermediatePoints("pi3")
    // p4_lat = document.getElementById("pi4-latitude")
    // p4_lon = document.getElementById("pi4-longitude")

    // p4_lat.value = "44.484903"
    // p4_lon.value = "11.279395"

    // intermediate_markers["pi4"] = __addMarker(p4_lat.value, p4_lon.value, orange_marker_opt)

}

// HANDLE INTERMEDIATE POINTS
var intermediate_points_count = 1
var intermediate_address_count = 1
var intermediate_points = {}
var intermediate_points_order = []
var intermediate_addr = {}
var intermediate_addr_order = []
var active_intermediate_point = undefined
var active_intermediate_addr = undefined

function addIntermediatePoints(id){
    latitude_div = document.getElementById(id + "-latitude")
    longitude_div = document.getElementById(id + "-longitude")
    
    if (latitude_div.value == "" || longitude_div.value == "") {
        console.log("Empty input")
        return
    }

    console.log("Adding new row...", id)
    intermediate_points_count += 1
    new_point_id = "pi" + intermediate_points_count

    // Modify button of the previous one
    previous_row = document.getElementById(id + "-button-success")
    parent_div = previous_row.parentElement
    previous_row.remove()

    // Disable input of the previous one
    latitude_div.disabled = true
    longitude_div.disabled = true

    __create_danger_button(parent_div, id)

    created_row = __create_new_row( new_point_id )
    intermediate_points[new_point_id] = created_row
    intermediate_points_order.push(new_point_id)
    active_intermediate_point = new_point_id

    console.log(intermediate_points)
    console.log(intermediate_points_order)
}

function removeIntermediatePoint(idx){
    console.log("Removing row...")

    // Remove the row
    document.getElementById(idx).remove()
    delete intermediate_points[idx]
    intermediate_points_order = intermediate_points_order.filter(e => e !== idx)
    if (intermediate_markers[active_intermediate_point] != undefined)
        map.removeLayer(intermediate_markers[idx])
    delete intermediate_markers[idx]

    console.log(intermediate_points)
    console.log(intermediate_points_order)
}

function addIntermediateAddress(id){
    indirizzo_div = document.getElementById(id + "-ind")

    
    if (indirizzo_div.value == "") {
        console.log("Empty input")
        return
    }

    console.log("Adding new row...", id)
    intermediate_address_count += 1
    new_point_id = "pii" + intermediate_address_count

    // Modify button of the previous one
    previous_row = document.getElementById(id + "-button-success")
    parent_div = previous_row.parentElement
    previous_row.remove()

    // Disable input of the previous one
    indirizzo_div.disabled = true

    __create_danger_button_addr(parent_div, id)

    created_row = __create_new_row_address( new_point_id )
    intermediate_addr[new_point_id] = created_row
    intermediate_addr_order.push(new_point_id)
    active_intermediate_addr = new_point_id

    console.log(intermediate_addr)
    console.log(intermediate_addr_order)
}

function removeIntermediateAddress(idx){
    console.log("Removing row...")

    // Remove the row
    document.getElementById(idx).remove()
    delete intermediate_addr[idx]
    intermediate_addr_order = intermediate_addr_order.filter(e => e !== idx)
    if (intermediate_markers[active_intermediate_addr] != undefined)
        map.removeLayer(intermediate_markers[idx])
    delete intermediate_markers[idx]

    console.log(intermediate_points)
    console.log(intermediate_points_order)
}

function __create_danger_button(parent_div, idx){
    const button = document.createElement("button");
    button.className = "btn btn-danger";
    button.type = "button";
    button.onclick = function(){removeIntermediateAddress(idx)};
    button.innerHTML = '<i class="bi bi-dash-lg"></i>';
    button.id = idx + "button-danger";

    // Insert the button dynamically
    parent_div.appendChild(button);
}

function __create_danger_button_addr(parent_div, idx){
    const button = document.createElement("button");
    button.className = "btn btn-danger";
    button.type = "button";
    button.onclick = function(){removeIntermediatePoint(idx)};
    button.innerHTML = '<i class="bi bi-dash-lg"></i>';
    button.id = idx + "button-danger";

    // Insert the button dynamically
    parent_div.appendChild(button);
}

function __create_new_row(idx){
    const parentElement = document.getElementById("intermediate-points-input")
    const intermediate_point_id = idx

    // Create a new row
    const newRow = document.createElement('div');
    newRow.classList.add('row', 'align-items-start');
    newRow.id = intermediate_point_id;

    // Create the latitude input
    const latitudeInput = document.createElement('div');
    latitudeInput.classList.add('col-5', 'pb-2');
    const latitudeFormGroup = document.createElement('div');
    latitudeFormGroup.classList.add('form-group');
    const latitudeInputField = document.createElement('input');
    latitudeInputField.type = 'text';
    latitudeInputField.classList.add('form-control', 'w-100');
    latitudeInputField.id = intermediate_point_id + '-latitude';
    latitudeInputField.setAttribute('aria-describedby', intermediate_point_id + '-latitude-tip');
    latitudeInputField.placeholder = 'Latitudine';
    latitudeFormGroup.appendChild(latitudeInputField);
    latitudeInput.appendChild(latitudeFormGroup);

    // Create the longitude input
    const longitudeInput = document.createElement('div');
    longitudeInput.classList.add('col-5', 'pb-2');
    const longitudeFormGroup = document.createElement('div');
    longitudeFormGroup.classList.add('form-group');
    const longitudeInputField = document.createElement('input');
    longitudeInputField.type = 'text';
    longitudeInputField.classList.add('form-control', 'w-100');
    longitudeInputField.id = intermediate_point_id + '-longitude';
    longitudeInputField.setAttribute('aria-describedby', intermediate_point_id + '-longitude-tip');
    longitudeInputField.placeholder = 'Longitudine';
    longitudeFormGroup.appendChild(longitudeInputField);
    longitudeInput.appendChild(longitudeFormGroup);

    // Create the button
    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('col-2', 'pb-2');
    const addButton = document.createElement('button');
    addButton.classList.add('btn', 'btn-success');
    addButton.type = 'button';
    addButton.onclick = function(){addIntermediatePoints(intermediate_point_id)};
    addButton.id = intermediate_point_id + "-button-success"
    addButton.innerHTML = '<i class="bi bi-plus-lg"></i>';
    buttonDiv.appendChild(addButton);

    // Append the elements to the row
    newRow.appendChild(latitudeInput);
    newRow.appendChild(longitudeInput);
    newRow.appendChild(buttonDiv);

    // Append the row to the parent element
    parentElement.appendChild(newRow);

    return newRow
}

function __create_new_row_address(idx){
    const parentElement = document.getElementById("intermediate-ind-input")
    const intermediate_point_id = idx

    // Create a new row
    const newRow = document.createElement('div');
    newRow.classList.add('row', 'align-items-start');
    newRow.id = intermediate_point_id;

    // Create the latitude input
    const indirizzoInput = document.createElement('div');
    indirizzoInput.classList.add('col-5', 'pb-2');
    const indirizzoFormGroup = document.createElement('div');
    indirizzoFormGroup.classList.add('form-group');
    const indirizzoInputField = document.createElement('input');
    indirizzoInputField.type = 'indirizzo';
    indirizzoInputField.classList.add('form-control', 'w-100');
    indirizzoInputField.id = intermediate_point_id + '-ind';
    indirizzoInputField.setAttribute('aria-describedby', intermediate_point_id + '-ind-tip');
    indirizzoInputField.placeholder = 'Indirizzo';
    indirizzoFormGroup.appendChild(indirizzoInputField);
    indirizzoInput.appendChild(indirizzoFormGroup);


    // Create the button
    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('col-2', 'pb-2');
    const addButton = document.createElement('button');
    addButton.classList.add('btn', 'btn-success');
    addButton.type = 'button';
    addButton.onclick = function(){addIntermediateAddress(intermediate_point_id)};
    addButton.id = intermediate_point_id + "-button-success"
    addButton.innerHTML = '<i class="bi bi-plus-lg"></i>';
    buttonDiv.appendChild(addButton);

    // Append the elements to the row
    newRow.appendChild(indirizzoInput);
    newRow.appendChild(buttonDiv);

    // Append the row to the parent element
    parentElement.appendChild(newRow);

    return newRow
}

// MAP
var map = undefined
var mapAddr = undefined
var active_mode = "start"
var start_marker = undefined
var end_marker = undefined
var intermediate_markers = {}
var active_path = undefined
var active_path_addr = undefined
var sampling_circles = []
var route_circles = []

var sampling_circles_addr = []
var route_circles_addr = []

green_marker_opt = __createMarkerOption("geo-loc-green.png")
red_marker_opt = __createMarkerOption("geo-loc-red.png")
orange_marker_opt = __createMarkerOption("geo-loc-orange.png")

console.log(green_marker_opt)
console.log(red_marker_opt)
console.log(orange_marker_opt)

function initMap(){
    console.log("Initializing map...")
    map = L.map('map').setView([44.494806, 11.343021], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);
    map.on("click", handleMapClick);

    document.addEventListener("shown.bs.tab", handleTabFocusChange);
}

var geo_map_init = true
var address_map_init = false

function handleTabFocusChange(event) {
    const old_tab = event.relatedTarget.id;
    const new_tab = event.target.id;
    const tabInFocus = new_tab;
    console.log("Tab in focus:", tabInFocus);
    console.log("old tab:", old_tab, "new tab:", new_tab);

    if(!tabInFocus.startsWith("geo") && !tabInFocus.startsWith("addr")){
        return
    }

    if (tabInFocus.startsWith("geo") && geo_map_init || tabInFocus.startsWith("addr") && address_map_init){
        return
    }

    const map_id = tabInFocus.startsWith("geo") ? "map" : "map2"
    if (tabInFocus.startsWith("geo")){
        geo_map_init = true
    }
    if (tabInFocus.startsWith("addr")){
        address_map_init = true
    }
    mapAddr = L.map(map_id).setView([44.494806, 11.343021], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(mapAddr);
  }

function handleMapClick(click){
    console.log("Click detected at ", click.latlng)

    if (active_mode == "start"){
        if (start_marker != undefined)
            map.removeLayer(start_marker)
        start_marker = __addMarker(click.latlng["lat"], click.latlng["lng"], green_marker_opt)
        __updateGeoInput("start", click.latlng["lat"], click.latlng["lng"])

    } else if (active_mode == "end"){
        if (end_marker != undefined)
            map.removeLayer(end_marker)
        end_marker = __addMarker(click.latlng["lat"], click.latlng["lng"], red_marker_opt)
        __updateGeoInput("end", click.latlng["lat"], click.latlng["lng"])

    } else if (active_mode == "intermediate"){

        if (intermediate_markers[active_intermediate_point] != undefined)
            map.removeLayer(intermediate_markers[active_intermediate_point])

        intermediate_markers[active_intermediate_point] = __addMarker(click.latlng["lat"], click.latlng["lng"], orange_marker_opt);
        __updateGeoInput(active_intermediate_point, click.latlng["lat"], click.latlng["lng"])
    }

}

function setMapMode(mode){
    console.log("Setting map mode...", mode)
    active_mode = mode
}

function __updateGeoInput(mode, lat, lng){
    console.log("Updating geo input...", mode, lat, lng)
    document.getElementById(mode + "-latitude").value = lat
    document.getElementById(mode + "-longitude").value = lng
}

function __createMarkerOption(url){
    const size = 35
    var iconOptions = L.icon({
        iconUrl: url,
        
        iconSize: [size, size],
        iconAnchor: [size/2, size],
    });

    return iconOptions
}

function __addMarker(lat, lng, marker){
    return L.marker([lat, lng], { icon: marker }).addTo(map);
}


// PROGRESS BAR MANAGEMENT
function __update_progress(progress){
    document.getElementById("progress-bar").setAttribute("aria-valuenow", progress);
    document.getElementsByClassName("progress-bar")[0].style.width = progress + "%";
}

function __update_progress_addr(progress){
    document.getElementById("progress-bar-addr").setAttribute("aria-valuenow", progress);
    //XXX
    document.getElementsByClassName("progress-bar")[1].style.width = progress + "%";
}


function __set_update_message(message){
    document.getElementById("update-div").innerHTML = message;
}

function __set_update_message_addr(message){
    document.getElementById("update-div-addr").innerHTML = message;
}

function __activate_progress(){
    __set_update_message("Avvio ricerca percorso...")
    hideResults()
    document.getElementById("progress-div").hidden = false
    document.getElementsByClassName("progress-bar")[0].style.width = 10 + "%";
    document.getElementsByClassName("progress-bar")[0].classList.add("progress-bar-animated")
    document.getElementsByClassName("progress-bar")[0].classList.remove("bg-success")
    document.getElementsByClassName("progress-bar")[0].classList.remove("bg-danger")
}

//XXX: problem (commented for ease of read)
function __activate_progress_addr(){
    __set_update_message_addr("Avvio ricerca percorso con indirizzo...")
    hideResultsAddr()
    document.getElementById("progress-div-addr").hidden = false
    document.getElementsByClassName("progress-bar")[1].style.width = 10 + "%";
    document.getElementsByClassName("progress-bar")[1].classList.add("progress-bar-animated")
    document.getElementsByClassName("progress-bar")[1].classList.remove("bg-success")
    document.getElementsByClassName("progress-bar")[1].classList.remove("bg-danger")
}

function __progress_completed(){
    __update_progress(100)
    __set_update_message("Percorso trovato!")
    showResults()
    document.getElementsByClassName("progress-bar")[0].classList.remove("progress-bar-animated")
    document.getElementsByClassName("progress-bar")[0].classList.add("bg-success")
    document.getElementById("submit-button").disabled = false
}

function __progress_completed_by_addr(){
    __update_progress_addr(100)
    __set_update_message_addr("Percorso trovato!")
    showResultsByAddr()
    document.getElementsByClassName("progress-bar")[1].classList.remove("progress-bar-animated")
    document.getElementsByClassName("progress-bar")[1].classList.add("bg-success")
    document.getElementById("submit-button-addr").disabled = false
}

function __progress_error(){
    __update_progress(100)
    document.getElementsByClassName("progress-bar")[0].classList.remove("progress-bar-animated")
    document.getElementsByClassName("progress-bar")[0].classList.add("bg-danger")
    document.getElementById("submit-button").disabled = false
}

function __progress_error_by_addr(){
    __update_progress(100)
    document.getElementsByClassName("progress-bar")[1].classList.remove("progress-bar-animated")
    document.getElementsByClassName("progress-bar")[1].classList.add("bg-danger")
    document.getElementById("submit-button-addr").disabled = false
}

function __disable_progress(){
    document.getElementById("progress-div").hidden= true
}

// OUTPUT CONSOLE MANAGEMENT
function __clear_console(){
    document.getElementById("output-console").innerHTML = ""
}

function __log_to_console(message){
    document.getElementById("output-console").innerHTML += message + "<br>"
    document.getElementById("output-console-by-addr").innerHTML += message + "<br>"
}

// SVG PAN
function initSVGPan(svg_id){
    console.log("Initializing SVG pan...", svg_id)
    var svgElement = document.getElementById(svg_id)
    var svg_test = svgPanZoom(svgElement,
        {
            preventMouseEventsDefault: true,
            controlIconsEnabled: true, 
        })
}

function cleanResultsTabByAddr(){
    document.getElementById("results_tablist-by-addr").innerHTML = ""
    document.getElementById("results_tabcontent-by-addr").innerHTML = ""
}

function cleanResultsTab(){
    document.getElementById("results_tablist").innerHTML = ""
    document.getElementById("results_tabcontent").innerHTML = ""
}

function showResults(){
    document.getElementById("results_div").hidden = false
}

function showResultsByAddr(){
    document.getElementById("results_div_addr").hidden = false
}

function hideResults(){
    document.getElementById("results_div").hidden = true
    cleanResultsTab()
}

function hideResultsAddr(){
    document.getElementById("results_div_addr").hidden = true
    cleanResultsTabByAddr()
}

*/


// Global variables
var map = undefined;
var mapAddr = undefined;
var active_mode = "start";
var start_marker = undefined;
var end_marker = undefined;
var intermediate_markers = {};
var active_path = undefined;
var active_path_addr = undefined;
var sampling_circles = [];
var route_circles = [];
var sampling_circles_addr = [];
var route_circles_addr = [];

// Marker options
var green_marker_opt;
var red_marker_opt;
var orange_marker_opt;

// Intermediate points
var intermediate_points_count = 1;
var intermediate_address_count = 1;
var intermediate_points = {};
var intermediate_points_order = [];
var intermediate_addr = {};
var intermediate_addr_order = [];
var active_intermediate_point = undefined;
var active_intermediate_addr = undefined;

function initDom(){
    // Initialize marker options first
    green_marker_opt = __createMarkerOption("geo-loc-green.png");
    red_marker_opt = __createMarkerOption("geo-loc-red.png");
    orange_marker_opt = __createMarkerOption("geo-loc-orange.png");
    
    // Initialize intermediate points
    intermediate_points['pi1'] = document.getElementById("pi1");
    intermediate_points_order.push("pi1");
    active_intermediate_point = "pi1";

    // Initialize intermediate addresses
    intermediate_addr['pii1'] = document.getElementById("pii1");
    intermediate_addr_order.push("pii1");
    active_intermediate_addr = "pii1";

    // Initialize the main map immediately
    initMap();
    
    // Add event listener for tab changes
    setupTabListeners();
    
    // Optional: Initialize with mock data
    // initMockInput();
}

function initMap(){
    console.log("Initializing map...");
    
    // Check if map container exists
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error("Map container not found!");
        return;
    }
    
    // Initialize the map
    map = L.map('map').setView([44.494806, 11.343021], 14);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add click handler
    map.on("click", handleMapClick);
    
    console.log("Map initialized successfully");
    
    // Force a resize to ensure proper rendering
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

function setupTabListeners() {
    // Listen for Bootstrap tab events
    const tabElements = document.querySelectorAll('button[data-bs-toggle="tab"]');
    
    tabElements.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function (event) {
            handleTabChange(event);
        });
    });
}

function handleTabChange(event) {
    const newTabId = event.target.id;
    const oldTabId = event.relatedTarget ? event.relatedTarget.id : null;
    
    console.log("Tab changed from", oldTabId, "to", newTabId);
    
    // Handle geographic coordinate tab
    if (newTabId === 'geo-input-tab') {
        // Refresh the main map
        setTimeout(() => {
            if (map) {
                map.invalidateSize();
                
                // Re-fit bounds if markers exist
                if (start_marker || end_marker) {
                    fitMapBounds();
                }
            }
        }, 200);
    }
    
    // Handle address input tab
    if (newTabId === 'address-input-tab') {
        // Initialize address map if not already done
        if (!mapAddr) {
            initMapAddr();
        } else {
            // Refresh the address map
            setTimeout(() => {
                mapAddr.invalidateSize();
            }, 200);
        }
    }
}

function initMapAddr() {
    console.log("Initializing address map...");
    
    const mapContainer = document.getElementById('map2');
    if (!mapContainer) {
        console.error("Map2 container not found!");
        return;
    }
    
    // Initialize the address map
    mapAddr = L.map('map2').setView([44.494806, 11.343021], 14);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(mapAddr);
    
    console.log("Address map initialized successfully");
    
    // Force a resize
    setTimeout(() => {
        mapAddr.invalidateSize();
    }, 100);
}

function fitMapBounds() {
    if (!map) return;
    
    const bounds = L.latLngBounds([]);
    let hasMarkers = false;
    
    if (start_marker) {
        bounds.extend(start_marker.getLatLng());
        hasMarkers = true;
    }
    
    if (end_marker) {
        bounds.extend(end_marker.getLatLng());
        hasMarkers = true;
    }
    
    for (const key in intermediate_markers) {
        if (intermediate_markers[key]) {
            bounds.extend(intermediate_markers[key].getLatLng());
            hasMarkers = true;
        }
    }
    
    if (hasMarkers) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

function handleMapClick(click){
    console.log("Click detected at", click.latlng);

    if (active_mode == "start"){
        if (start_marker != undefined)
            map.removeLayer(start_marker);
        start_marker = __addMarker(click.latlng["lat"], click.latlng["lng"], green_marker_opt);
        __updateGeoInput("start", click.latlng["lat"], click.latlng["lng"]);

    } else if (active_mode == "end"){
        if (end_marker != undefined)
            map.removeLayer(end_marker);
        end_marker = __addMarker(click.latlng["lat"], click.latlng["lng"], red_marker_opt);
        __updateGeoInput("end", click.latlng["lat"], click.latlng["lng"]);

    } else if (active_mode == "intermediate"){
        if (intermediate_markers[active_intermediate_point] != undefined)
            map.removeLayer(intermediate_markers[active_intermediate_point]);

        intermediate_markers[active_intermediate_point] = __addMarker(click.latlng["lat"], click.latlng["lng"], orange_marker_opt);
        __updateGeoInput(active_intermediate_point, click.latlng["lat"], click.latlng["lng"]);
    }
}

function setMapMode(mode){
    console.log("Setting map mode...", mode);
    active_mode = mode;
}

function __updateGeoInput(mode, lat, lng){
    console.log("Updating geo input...", mode, lat, lng);
    const latInput = document.getElementById(mode + "-latitude");
    const lngInput = document.getElementById(mode + "-longitude");
    
    if (latInput) latInput.value = lat;
    if (lngInput) lngInput.value = lng;
}

function __createMarkerOption(url){
    const size = 35;
    var iconOptions = L.icon({
        iconUrl: url,
        iconSize: [size, size],
        iconAnchor: [size/2, size],
    });

    return iconOptions;
}

function __addMarker(lat, lng, markerIcon){
    if (!map) {
        console.error("Map not initialized!");
        return null;
    }
    return L.marker([lat, lng], { icon: markerIcon }).addTo(map);
}

// INTERMEDIATE POINTS HANDLING
function addIntermediatePoints(id){
    latitude_div = document.getElementById(id + "-latitude");
    longitude_div = document.getElementById(id + "-longitude");
    
    if (latitude_div.value == "" || longitude_div.value == "") {
        console.log("Empty input");
        return;
    }

    console.log("Adding new row...", id);
    intermediate_points_count += 1;
    new_point_id = "pi" + intermediate_points_count;

    // Modify button of the previous one
    previous_row = document.getElementById(id + "-button-success");
    parent_div = previous_row.parentElement;
    previous_row.remove();

    // Disable input of the previous one
    latitude_div.disabled = true;
    longitude_div.disabled = true;

    __create_danger_button(parent_div, id);

    created_row = __create_new_row(new_point_id);
    intermediate_points[new_point_id] = created_row;
    intermediate_points_order.push(new_point_id);
    active_intermediate_point = new_point_id;

    console.log(intermediate_points);
    console.log(intermediate_points_order);
}

function removeIntermediatePoint(idx){
    console.log("Removing row...");

    // Remove the row
    document.getElementById(idx).remove();
    delete intermediate_points[idx];
    intermediate_points_order = intermediate_points_order.filter(e => e !== idx);
    
    if (intermediate_markers[idx] && map) {
        map.removeLayer(intermediate_markers[idx]);
    }
    delete intermediate_markers[idx];

    console.log(intermediate_points);
    console.log(intermediate_points_order);
}

function addIntermediateAddress(id){
    indirizzo_div = document.getElementById(id + "-ind");
    
    if (indirizzo_div.value == "") {
        console.log("Empty input");
        return;
    }

    console.log("Adding new row...", id);
    intermediate_address_count += 1;
    new_point_id = "pii" + intermediate_address_count;

    // Modify button of the previous one
    previous_row = document.getElementById(id + "-button-success");
    parent_div = previous_row.parentElement;
    previous_row.remove();

    // Disable input of the previous one
    indirizzo_div.disabled = true;

    __create_danger_button_addr(parent_div, id);

    created_row = __create_new_row_address(new_point_id);
    intermediate_addr[new_point_id] = created_row;
    intermediate_addr_order.push(new_point_id);
    active_intermediate_addr = new_point_id;

    console.log(intermediate_addr);
    console.log(intermediate_addr_order);
}

function removeIntermediateAddress(idx){
    console.log("Removing row...");

    // Remove the row
    document.getElementById(idx).remove();
    delete intermediate_addr[idx];
    intermediate_addr_order = intermediate_addr_order.filter(e => e !== idx);
    
    if (intermediate_markers[idx] && mapAddr) {
        mapAddr.removeLayer(intermediate_markers[idx]);
    }
    delete intermediate_markers[idx];

    console.log(intermediate_addr);
    console.log(intermediate_addr_order);
}

// Helper functions for creating buttons and rows
function __create_danger_button(parent_div, idx){
    const button = document.createElement("button");
    button.className = "btn btn-danger";
    button.type = "button";
    button.onclick = function(){removeIntermediatePoint(idx)};
    button.innerHTML = '<i class="bi bi-dash-lg"></i>';
    button.id = idx + "-button-danger";
    parent_div.appendChild(button);
}

function __create_danger_button_addr(parent_div, idx){
    const button = document.createElement("button");
    button.className = "btn btn-danger";
    button.type = "button";
    button.onclick = function(){removeIntermediateAddress(idx)};
    button.innerHTML = '<i class="bi bi-dash-lg"></i>';
    button.id = idx + "-button-danger";
    parent_div.appendChild(button);
}

function __create_new_row(idx){
    const parentElement = document.getElementById("intermediate-points-input");
    const intermediate_point_id = idx;

    // Create a new row
    const newRow = document.createElement('div');
    newRow.classList.add('row', 'align-items-start');
    newRow.id = intermediate_point_id;

    // Create the latitude input
    const latitudeInput = document.createElement('div');
    latitudeInput.classList.add('col-5', 'pb-2');
    const latitudeFormGroup = document.createElement('div');
    latitudeFormGroup.classList.add('form-group');
    const latitudeInputField = document.createElement('input');
    latitudeInputField.type = 'text';
    latitudeInputField.classList.add('form-control', 'w-100');
    latitudeInputField.id = intermediate_point_id + '-latitude';
    latitudeInputField.setAttribute('aria-describedby', intermediate_point_id + '-latitude-tip');
    latitudeInputField.placeholder = 'Latitudine';
    latitudeFormGroup.appendChild(latitudeInputField);
    latitudeInput.appendChild(latitudeFormGroup);

    // Create the longitude input
    const longitudeInput = document.createElement('div');
    longitudeInput.classList.add('col-5', 'pb-2');
    const longitudeFormGroup = document.createElement('div');
    longitudeFormGroup.classList.add('form-group');
    const longitudeInputField = document.createElement('input');
    longitudeInputField.type = 'text';
    longitudeInputField.classList.add('form-control', 'w-100');
    longitudeInputField.id = intermediate_point_id + '-longitude';
    longitudeInputField.setAttribute('aria-describedby', intermediate_point_id + '-longitude-tip');
    longitudeInputField.placeholder = 'Longitudine';
    longitudeFormGroup.appendChild(longitudeInputField);
    longitudeInput.appendChild(longitudeFormGroup);

    // Create the button
    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('col-2', 'pb-2');
    const addButton = document.createElement('button');
    addButton.classList.add('btn', 'btn-success');
    addButton.type = 'button';
    addButton.onclick = function(){addIntermediatePoints(intermediate_point_id)};
    addButton.id = intermediate_point_id + "-button-success";
    addButton.innerHTML = '<i class="bi bi-plus-lg"></i>';
    buttonDiv.appendChild(addButton);

    // Append the elements to the row
    newRow.appendChild(latitudeInput);
    newRow.appendChild(longitudeInput);
    newRow.appendChild(buttonDiv);

    // Append the row to the parent element
    parentElement.appendChild(newRow);

    return newRow;
}

function __create_new_row_address(idx){
    const parentElement = document.getElementById("intermediate-ind-input");
    const intermediate_point_id = idx;

    // Create a new row
    const newRow = document.createElement('div');
    newRow.classList.add('row', 'align-items-start');
    newRow.id = intermediate_point_id;

    // Create the address input
    const indirizzoInput = document.createElement('div');
    indirizzoInput.classList.add('col-5', 'pb-2');
    const indirizzoFormGroup = document.createElement('div');
    indirizzoFormGroup.classList.add('form-group');
    const indirizzoInputField = document.createElement('input');
    indirizzoInputField.type = 'text';
    indirizzoInputField.classList.add('form-control', 'w-100');
    indirizzoInputField.id = intermediate_point_id + '-ind';
    indirizzoInputField.setAttribute('aria-describedby', intermediate_point_id + '-ind-tip');
    indirizzoInputField.placeholder = 'Indirizzo';
    indirizzoFormGroup.appendChild(indirizzoInputField);
    indirizzoInput.appendChild(indirizzoFormGroup);

    // Create the button
    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('col-2', 'pb-2');
    const addButton = document.createElement('button');
    addButton.classList.add('btn', 'btn-success');
    addButton.type = 'button';
    addButton.onclick = function(){addIntermediateAddress(intermediate_point_id)};
    addButton.id = intermediate_point_id + "-button-success";
    addButton.innerHTML = '<i class="bi bi-plus-lg"></i>';
    buttonDiv.appendChild(addButton);

    // Append the elements to the row
    newRow.appendChild(indirizzoInput);
    newRow.appendChild(buttonDiv);

    // Append the row to the parent element
    parentElement.appendChild(newRow);

    return newRow;
}

// PROGRESS BAR MANAGEMENT
function __update_progress(progress){
    const progressBar = document.getElementById("progress-bar");
    const progressBarElement = document.getElementsByClassName("progress-bar")[0];
    
    if (progressBar) progressBar.setAttribute("aria-valuenow", progress);
    if (progressBarElement) progressBarElement.style.width = progress + "%";
}

function __update_progress_addr(progress){
    const progressBar = document.getElementById("progress-bar-addr");
    const progressBarElement = document.getElementsByClassName("progress-bar")[1];
    
    if (progressBar) progressBar.setAttribute("aria-valuenow", progress);
    if (progressBarElement) progressBarElement.style.width = progress + "%";
}

function __set_update_message(message){
    const updateDiv = document.getElementById("update-div");
    if (updateDiv) updateDiv.innerHTML = message;
}

function __set_update_message_addr(message){
    const updateDiv = document.getElementById("update-div-addr");
    if (updateDiv) updateDiv.innerHTML = message;
}

function __activate_progress(){
    __set_update_message("Avvio ricerca percorso...");
    hideResults();
    
    const progressDiv = document.getElementById("progress-div");
    const progressBar = document.getElementsByClassName("progress-bar")[0];
    
    if (progressDiv) progressDiv.hidden = false;
    if (progressBar) {
        progressBar.style.width = "10%";
        progressBar.classList.add("progress-bar-animated");
        progressBar.classList.remove("bg-success");
        progressBar.classList.remove("bg-danger");
    }
}

function __activate_progress_addr(){
    __set_update_message_addr("Avvio ricerca percorso con indirizzo...");
    hideResultsAddr();
    
    const progressDiv = document.getElementById("progress-div-addr");
    const progressBar = document.getElementsByClassName("progress-bar")[1];
    
    if (progressDiv) progressDiv.hidden = false;
    if (progressBar) {
        progressBar.style.width = "10%";
        progressBar.classList.add("progress-bar-animated");
        progressBar.classList.remove("bg-success");
        progressBar.classList.remove("bg-danger");
    }
}

function __progress_completed(){
    __update_progress(100);
    __set_update_message("Percorso trovato!");
    showResults();
    
    const progressBar = document.getElementsByClassName("progress-bar")[0];
    if (progressBar) {
        progressBar.classList.remove("progress-bar-animated");
        progressBar.classList.add("bg-success");
    }
    
    const submitButton = document.getElementById("submit-button");
    if (submitButton) submitButton.disabled = false;
}

function __progress_completed_by_addr(){
    __update_progress_addr(100);
    __set_update_message_addr("Percorso trovato!");
    showResultsByAddr();
    
    const progressBar = document.getElementsByClassName("progress-bar")[1];
    if (progressBar) {
        progressBar.classList.remove("progress-bar-animated");
        progressBar.classList.add("bg-success");
    }
    
    const submitButton = document.getElementById("submit-button-addr");
    if (submitButton) submitButton.disabled = false;
}

function __progress_error(){
    __update_progress(100);
    
    const progressBar = document.getElementsByClassName("progress-bar")[0];
    if (progressBar) {
        progressBar.classList.remove("progress-bar-animated");
        progressBar.classList.add("bg-danger");
    }
    
    const submitButton = document.getElementById("submit-button");
    if (submitButton) submitButton.disabled = false;
}

function __progress_error_by_addr(){
    __update_progress_addr(100);
    
    const progressBar = document.getElementsByClassName("progress-bar")[1];
    if (progressBar) {
        progressBar.classList.remove("progress-bar-animated");
        progressBar.classList.add("bg-danger");
    }
    
    const submitButton = document.getElementById("submit-button-addr");
    if (submitButton) submitButton.disabled = false;
}

function __disable_progress(){
    const progressDiv = document.getElementById("progress-div");
    if (progressDiv) progressDiv.hidden = true;
}

// OUTPUT CONSOLE MANAGEMENT
function __clear_console(){
    const outputConsole = document.getElementById("output-console");
    if (outputConsole) outputConsole.innerHTML = "";
}

function __log_to_console(message){
    const outputConsole = document.getElementById("output-console");
    const outputConsoleAddr = document.getElementById("output-console-by-addr");
    
    if (outputConsole) outputConsole.innerHTML += message + "<br>";
    if (outputConsoleAddr) outputConsoleAddr.innerHTML += message + "<br>";
}

// SVG PAN
function initSVGPan(svg_id){
    console.log("Initializing SVG pan...", svg_id);
    var svgElement = document.getElementById(svg_id);
    
    if (svgElement && typeof svgPanZoom !== 'undefined') {
        var svg_test = svgPanZoom(svgElement, {
            preventMouseEventsDefault: true,
            controlIconsEnabled: true
        });
    }
}

// Results management
function cleanResultsTab(){
    const tabList = document.getElementById("results_tablist");
    const tabContent = document.getElementById("results_tabcontent");
    
    if (tabList) tabList.innerHTML = "";
    if (tabContent) tabContent.innerHTML = "";
}

function cleanResultsTabByAddr(){
    const tabList = document.getElementById("results_tablist-by-addr");
    const tabContent = document.getElementById("results_tabcontent-by-addr");
    
    if (tabList) tabList.innerHTML = "";
    if (tabContent) tabContent.innerHTML = "";
}

function showResults(){
    const resultsDiv = document.getElementById("results_div");
    if (resultsDiv) resultsDiv.hidden = false;
}

function showResultsByAddr(){
    const resultsDiv = document.getElementById("results_div_addr");
    if (resultsDiv) resultsDiv.hidden = false;
}

function hideResults(){
    const resultsDiv = document.getElementById("results_div");
    if (resultsDiv) resultsDiv.hidden = true;
    cleanResultsTab();
}

function hideResultsAddr(){
    const resultsDiv = document.getElementById("results_div_addr");
    if (resultsDiv) resultsDiv.hidden = true;
    cleanResultsTabByAddr();
}

// Mock input for testing
function initMockInput(){
    const start_latitude = document.getElementById("start-latitude");
    const start_longitude = document.getElementById("start-longitude");
    const end_latitude = document.getElementById("end-latitude");
    const end_longitude = document.getElementById("end-longitude");

    if (start_latitude) start_latitude.value = "44.485847";
    if (start_longitude) start_longitude.value = "11.280292";
    if (end_latitude) end_latitude.value = "44.485847";
    if (end_longitude) end_longitude.value = "11.280292";

    if (map) {
        start_marker = __addMarker(44.485847, 11.280292, green_marker_opt);
        end_marker = __addMarker(44.485847, 11.280292, red_marker_opt);
    }

    const p1_lat = document.getElementById("pi1-latitude");
    const p1_lon = document.getElementById("pi1-longitude");

    if (p1_lat) p1_lat.value = "44.484903";
    if (p1_lon) p1_lon.value = "11.279395";

    if (map) {
        intermediate_markers["pi1"] = __addMarker(44.484903, 11.279395, orange_marker_opt);
    }

    addIntermediatePoints("pi1");
    
    const p2_lat = document.getElementById("pi2-latitude");
    const p2_lon = document.getElementById("pi2-longitude");

    if (p2_lat) p2_lat.value = "44.482321";
    if (p2_lon) p2_lon.value = "11.275608";

    if (map) {
        intermediate_markers["pi2"] = __addMarker(44.482321, 11.275608, orange_marker_opt);
    }

    addIntermediatePoints("pi2");
}