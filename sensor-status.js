// Constants
const OFFLINE_THRESHOLD = 21610; // 21610 seconds = ~6 hours
const STATUS_CHECK_INTERVAL = 5000; // Check status every 5 seconds

// Store the last update time for each sensor
// *** Updated location name ***
let sensorLastUpdate = {
    'Makhmor Road': null,
    'Naznaz Area': null // <-- Changed from 'Namaz Area'
};

// Function to update sensor status display in the OVERVIEW cards
function updateSensorStatus(locationName) { // Parameter is the display name
    const lastUpdate = sensorLastUpdate[locationName];

    // Determine the correct element ID prefix based on the display name
    let elementPrefix;
    if (locationName === 'Makhmor Road') {
        elementPrefix = 'makhmor';
    } else if (locationName === 'Naznaz Area') {
        elementPrefix = 'naznaz'; // Use 'naznaz' prefix
    } else {
        console.warn(`updateSensorStatus called with unknown location name: ${locationName}`);
        return;
    }

    // Find the corresponding sensor status element in the overview cards
    const statusElement = document.getElementById(`${elementPrefix}-sensor-status`); // e.g., naznaz-sensor-status

    if (!statusElement) {
      // Don't log warning every 5s, maybe just once? Or check if element exists before calling.
      // console.warn(`Sensor status element not found for ID: ${elementPrefix}-sensor-status`);
      return; // Exit if element not found
    }

    const now = new Date();
    // Ensure lastUpdate is a valid Date object before calculation
    const timeDiff = (lastUpdate instanceof Date && !isNaN(lastUpdate))
                     ? Math.floor((now - lastUpdate) / 1000)
                     : Infinity; // Treat null/invalid date as infinite difference (Offline)

    const isOnline = timeDiff < OFFLINE_THRESHOLD;

    // Update status text and color
    statusElement.textContent = isOnline ? 'Online' : 'Offline';
    // Use Tailwind classes for styling consistency if possible, otherwise inline styles
    if (isOnline) {
        statusElement.className = 'text-xl font-bold text-green-600'; // Example Online style
    } else {
         statusElement.className = 'text-xl font-bold text-red-600'; // Example Offline style
    }
     // Or using inline styles:
     // statusElement.style.color = isOnline ? '#22c55e' : '#ef4444';
}

// Function called by app.js to update the last known timestamp for a location
function updateSensorLastUpdate(locationName, timestamp) { // Parameter is the display name
    // *** Ensure location name matches the keys in sensorLastUpdate ***
    if (locationName === 'Naznaz Area' || locationName === 'Makhmor Road') { // Check against valid keys
        if (timestamp instanceof Date && !isNaN(timestamp)) {
             sensorLastUpdate[locationName] = timestamp;
        } else {
             // If timestamp is invalid or null, set lastUpdate to null to force offline status
             sensorLastUpdate[locationName] = null;
             console.warn(`Received invalid timestamp for ${locationName}. Setting status to Offline.`);
        }
        // Immediately update the status display based on the new timestamp (or lack thereof)
        updateSensorStatus(locationName);
    } else {
        console.warn(`Attempted to update last update for unknown location name: ${locationName}`);
    }
}

// Initialize status checking
function initSensorStatus() {
    // Initial status update based on potentially null timestamps
    updateSensorStatus('Makhmor Road');
    updateSensorStatus('Naznaz Area'); // <-- Use correct name

    // Set up periodic status checking (every 5 seconds)
    // This re-evaluates Online/Offline based on the last known timestamp
    setInterval(() => {
        updateSensorStatus('Makhmor Road');
        updateSensorStatus('Naznaz Area'); // <-- Use correct name
    }, STATUS_CHECK_INTERVAL);
     console.log("Sensor status checker initialized.");
}

// Export functions for use in main app (app.js)
window.sensorStatus = {
    updateLastUpdate: updateSensorLastUpdate,
    init: initSensorStatus
};