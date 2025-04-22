// Constants
const OFFLINE_THRESHOLD = 21610; // 21610 seconds = ~6 hours
const STATUS_CHECK_INTERVAL = 5000; // Check status every 5 seconds

// Store the last update time for each sensor
let sensorLastUpdate = {
    'Makhmor Road': null,
    'Namaz Area': null
};

// Function to update sensor status
function updateSensorStatus(location) {
    const lastUpdate = sensorLastUpdate[location];
    const statusElement = document.getElementById(`${location.toLowerCase().replace(' ', '-')}-sensor-status`);
    
    if (!statusElement) return;
    
    const now = new Date();
    const timeDiff = lastUpdate ? Math.floor((now - lastUpdate) / 1000) : Infinity;
    const isOnline = timeDiff < OFFLINE_THRESHOLD;
    
    // Update status text and color
    statusElement.textContent = isOnline ? 'Online' : 'Offline';
    statusElement.style.color = isOnline ? '#22c55e' : '#ef4444'; // green-500 for online, red-500 for offline
}

// Function to update last update time for a sensor
function updateSensorLastUpdate(location, timestamp) {
    sensorLastUpdate[location] = new Date(timestamp);
    updateSensorStatus(location);
}

// Initialize status checking
function initSensorStatus() {
    // Initial status update
    updateSensorStatus('Makhmor Road');
    updateSensorStatus('Namaz Area');
    
    // Set up periodic status checking
    setInterval(() => {
        updateSensorStatus('Makhmor Road');
        updateSensorStatus('Namaz Area');
    }, STATUS_CHECK_INTERVAL);
}

// Export functions for use in main app
window.sensorStatus = {
    updateLastUpdate: updateSensorLastUpdate,
    init: initSensorStatus
}; 