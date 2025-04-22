// Firebase Configuration - Currently using Supabase instead
/*
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const sensorDataRef = db.collection('sensorData');
*/

// NOTE: This file contains two separate implementations:
// 1. The original Firebase implementation (now commented out)
// 2. The new Supabase implementation at the bottom of the file
// We've kept both for reference but are using Supabase to connect to the database.
// For any changes, please update the Supabase implementation.

// SUPABASE INITIALIZATION
let supabase;
let mainChart;
let location1Chart; // Makhmor Road Chart (if used)
let naznazChart; // Naznaz Area Chart (formerly location2Chart)
let humidityChart;

// Constants
const timeRanges = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
};

let currentTimeRange = '24h';
let allReadings = [];
let makhmorRoadData = []; // Specific variable for Makhmor Road
let naznazAreaData = []; // Specific variable for Naznaz Area
let currentPage = 1;
const itemsPerPage = 10;

// Global variables for averages and predictions
let averages = {
    'makhmor-road': { // Use internal ID
        '24h': { pm25: 0, humidity: 0 },
        '7d': { pm25: 0, humidity: 0 },
        '30d': { pm25: 0, humidity: 0 }
    },
    'naznaz-area': { // Use internal ID
        '24h': { pm25: 0, humidity: 0 },
        '7d': { pm25: 0, humidity: 0 },
        '30d': { pm25: 0, humidity: 0 }
    }
};

let predictions = {
    'makhmor-road': { pm25: null, confidence: null }, // Use internal ID
    'naznaz-area': { pm25: null, confidence: null } // Use internal ID
};

// Location mapping - *** CRITICAL: Keys MUST exactly match database strings ***
const locationMapping = {
    // Makhmor Road
    "36.112146, 43.953925": 'makhmor-road',
    // Naznaz Area
    "36.213724, 43.988080": 'naznaz-area'
};


// Function to show error messages to the user
function showError(message, duration = 5000) {
    const errorContainer = document.getElementById('error-message');
    if (!errorContainer) {
        console.error('Error container not found:', message);
        return;
    }

    errorContainer.textContent = message;
    errorContainer.style.display = 'block';

    // Hide the message after the specified duration
    setTimeout(() => {
        errorContainer.style.display = 'none';
    }, duration);
}

// Function to calculate averages for a location (using internal ID)
function calculateAverages(locationData) {
    const now = new Date();
    const result = {
        '24h': { pm25: 0, humidity: 0 },
        '7d': { pm25: 0, humidity: 0 },
        '30d': { pm25: 0, humidity: 0 }
    };

    Object.keys(timeRanges).forEach(range => {
        const timeLimit = timeRanges[range];
        // Ensure reading.timestamp is a Date object before comparison
        const relevantData = locationData.filter(reading =>
             reading.timestamp instanceof Date && (now - reading.timestamp) <= timeLimit
        );

        if (relevantData.length > 0) {
            result[range].pm25 = relevantData.reduce((sum, reading) =>
                sum + (reading.pm25 || 0), 0) / relevantData.length; // Handle potential null pm25
            result[range].humidity = relevantData.reduce((sum, reading) =>
                sum + (reading.humidity || 0), 0) / relevantData.length; // Handle potential null humidity
        }
    });

    return result;
}


// Function to predict PM2.5 levels (simple linear regression)
function predictPM25Levels(locationData) {
     // Ensure reading.timestamp is a Date object before filtering
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentData = locationData.filter(reading =>
         reading.timestamp instanceof Date && reading.timestamp > twentyFourHoursAgo
    );

    if (recentData.length < 12) return { pm25: null, confidence: null }; // Need at least 12 readings in last 24h

    const recentPM25 = recentData.map(reading => reading.pm25 || 0); // Default null pm25 to 0 for calculation

    // Simple trend-based prediction
    const trend = recentPM25[recentPM25.length - 1] - recentPM25[0];
    const prediction = recentPM25[recentPM25.length - 1] + (trend / recentPM25.length);

    // Calculate confidence based on data variance
    const mean = recentPM25.reduce((a, b) => a + b) / recentPM25.length;
    const variance = recentPM25.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentPM25.length;
    // Avoid division by zero if mean is 0
    const confidence = mean === 0 ? 100 : Math.max(0, Math.min(100, 100 - (variance / mean) * 10));

    return {
        pm25: Math.max(0, prediction), // Ensure prediction is not negative
        confidence: confidence
    };
}


// DOM Elements (Grouped for clarity)
// Note: Assuming IDs in index.html are updated according to plan (e.g., 'namaz-' -> 'naznaz-')

// -- General --
const pageInfoElement = document.getElementById('page-info');
const prevPageButton = document.getElementById('prev-page');
const nextPageButton = document.getElementById('next-page');
const locationFilterElement = document.getElementById('location-filter');
const currentTimeElement = document.getElementById('current-time');
const readingsTableBody = document.getElementById('readings-table-body'); // For desktop table view
const readingsCards = document.getElementById('readings-cards'); // For mobile card view

// -- Time Range Buttons --
const btn24h = document.getElementById('btn-24h');
const btn7d = document.getElementById('btn-7d');
const btn30d = document.getElementById('btn-30d');

// -- Makhmor Road Elements --
const makhmorCurrentPM25Element = document.getElementById('makhmor-current-pm25');
const makhmorAirQualityStatusElement = document.getElementById('makhmor-air-quality-status');
const makhmorStatusTimeElement = document.getElementById('makhmor-status-time');
const makhmorAveragePM25Element = document.getElementById('makhmor-average-pm25');
const makhmorAvgChangeElement = document.getElementById('makhmor-avg-change');
const makhmorLastUpdatedElement = document.getElementById('makhmor-last-updated');
const makhmorTimeAgoElement = document.getElementById('makhmor-time-ago');
const makhmorSensorStatusElement = document.getElementById('makhmor-sensor-status');
// Detail Card Elements for Makhmor (assuming 'location1-' prefix corresponds to Makhmor)
const location1NameElement = document.getElementById('location1-name');
const location1PM25Element = document.getElementById('location1-pm25');
const location1HumidityElement = document.getElementById('location1-humidity');
const location1TimestampElement = document.getElementById('location1-timestamp');
const location1_24hAvgElement = document.getElementById('location1-24h-avg');
const location1_7dAvgElement = document.getElementById('location1-7d-avg');
const location1_30dAvgElement = document.getElementById('location1-30d-avg');
const location1PredictionElement = document.getElementById('location1-prediction');


// -- Naznaz Area Elements (formerly Namaz) --
const naznazCurrentPM25Element = document.getElementById('naznaz-current-pm25');
const naznazAirQualityStatusElement = document.getElementById('naznaz-air-quality-status');
const naznazStatusTimeElement = document.getElementById('naznaz-status-time');
const naznazAveragePM25Element = document.getElementById('naznaz-average-pm25');
const naznazAvgChangeElement = document.getElementById('naznaz-avg-change');
const naznazLastUpdatedElement = document.getElementById('naznaz-last-updated');
const naznazTimeAgoElement = document.getElementById('naznaz-time-ago');
const naznazSensorStatusElement = document.getElementById('naznaz-sensor-status');
// Detail Card Elements for Naznaz (assuming 'location2-'/'naznaz-' prefix corresponds to Naznaz)
const location2NameElement = document.getElementById('naznaz-name'); // Use new ID
const location2PM25Element = document.getElementById('naznaz-pm25'); // Use new ID
const location2HumidityElement = document.getElementById('naznaz-humidity'); // Use new ID
const location2TimestampElement = document.getElementById('naznaz-timestamp'); // Use new ID
const location2_24hAvgElement = document.getElementById('naznaz-24h-avg'); // Use new ID
const location2_7dAvgElement = document.getElementById('naznaz-7d-avg'); // Use new ID
const location2_30dAvgElement = document.getElementById('naznaz-30d-avg'); // Use new ID
const location2PredictionElement = document.getElementById('naznaz-prediction'); // Use new ID


// Function to refresh dashboard data
async function refreshData() {
    try {
        // Check if dbConfig exists and is properly initialized
        if (!window.dbConfig) {
            throw new Error('Database configuration not found. Please reload the page.');
        }

        // Check if we have an API key
        if (!window.dbConfig.supabaseKey) {
            const error = new Error('No API key found. Please set your Supabase API key in the configuration.');
            error.type = 'CONFIG_ERROR';
            throw error;
        }

        // Ensure client is initialized
        if (!window.dbConfig.client) {
            const success = window.dbConfig.initClient();
            if (!success) {
                throw new Error('Failed to initialize Supabase client. Please check your API key.');
            }
        }

        console.log('Starting data refresh...');

        // Fetch latest readings (increase limit to get more data for averages/charts)
        const { data: readings, error } = await window.dbConfig.client
            .from(window.dbConfig.airQualityTable)
            .select('*') // Select all columns
            .order('timestamp', { ascending: false })
            .limit(1000); // Fetch more data for better averages/charts

        if (error) {
            throw new Error(`Database query failed: ${error.message}`);
        }

        if (!readings || readings.length === 0) {
            console.warn('No readings found in database');
            updateDefaultValues(); // Update UI to show 'No Data'
            allReadings = []; // Clear global readings cache
            updateDataTable(); // Update table/cards to show 'No data available'
            updateCharts({ 'makhmor-road': [], 'naznaz-area': [] }); // Clear charts
            return;
        }

        console.log(`Fetched ${readings.length} readings`);
        allReadings = readings.map(r => ({ ...r, timestamp: new Date(r.timestamp) })); // Update global cache with Date objects

        // Process readings by location using the global mapping
        const readingsByLocation = {
             'makhmor-road': [],
             'naznaz-area': []
        };

        allReadings.forEach(reading => {
            const locationString = reading.Location;
            const locationId = locationMapping[locationString]; // Map DB string to internal ID
            if (locationId && readingsByLocation[locationId]) {
                 readingsByLocation[locationId].push(reading); // Add reading to the correct group
            } else if(locationString) {
                console.warn(`Unknown or unmapped location string from database: "${locationString}"`);
            }
        });

        // Update global data arrays (sorted by time, newest first)
        makhmorRoadData = readingsByLocation['makhmor-road'].sort((a, b) => b.timestamp - a.timestamp);
        naznazAreaData = readingsByLocation['naznaz-area'].sort((a, b) => b.timestamp - a.timestamp);

        console.log(`Processed Makhmor Road: ${makhmorRoadData.length}, Naznaz Area: ${naznazAreaData.length}`);

        // --- Update UI Elements ---

        // Calculate Averages and Predictions using the processed data
        if (makhmorRoadData.length > 0) {
            averages['makhmor-road'] = calculateAverages(makhmorRoadData);
            predictions['makhmor-road'] = predictPM25Levels(makhmorRoadData);
            updateLocationDisplay('makhmor-road', makhmorRoadData[0]); // Update with latest reading
        } else {
            updateLocationDisplay('makhmor-road', null); // No data for Makhmor
        }

        if (naznazAreaData.length > 0) {
            averages['naznaz-area'] = calculateAverages(naznazAreaData);
            predictions['naznaz-area'] = predictPM25Levels(naznazAreaData);
            updateLocationDisplay('naznaz-area', naznazAreaData[0]); // Update with latest reading
        } else {
            updateLocationDisplay('naznaz-area', null); // No data for Naznaz
        }

        // Update average and prediction display sections
        updateAveragesDisplay();
        updatePredictionsDisplay();

        // Update the data table/cards (uses allReadings)
        updateDataTable();

        // Update the main trend chart
        updateCharts(readingsByLocation); // Pass the grouped data

        // Update map data (if function exists)
         if (typeof window.updateMapData === 'function') {
             window.updateMapData(); // Call map update function
         }


        console.log('Data refresh completed successfully');

    } catch (error) {
        console.error('Error in refreshData:', error);

        // Handle configuration errors specially
        if (error.type === 'CONFIG_ERROR') {
            showError(error.message);
            // Redirect to configuration page if available
            if (typeof showConfigModal === 'function') {
                showConfigModal();
            }
        } else {
            showError('Failed to refresh data. Please check the console for details.');
        }

        // Set default values for UI elements if refresh fails
        updateDefaultValues();
        allReadings = [];
        updateDataTable();
        updateCharts({ 'makhmor-road': [], 'naznaz-area': [] });
    }
}


// Helper function to update UI with default values for all locations
function updateDefaultValues() {
    const locations = ['makhmor-road', 'naznaz-area'];
    locations.forEach(locationId => {
        updateLocationDisplay(locationId, null); // Call updateLocationDisplay with null reading
    });
    // Reset global averages and predictions
    Object.keys(averages).forEach(locId => {
        Object.keys(averages[locId]).forEach(range => {
            averages[locId][range] = { pm25: 0, humidity: 0 };
        });
    });
     Object.keys(predictions).forEach(locId => {
         predictions[locId] = { pm25: null, confidence: null };
     });
    updateAveragesDisplay();
    updatePredictionsDisplay();
}

// Function to update a specific location's display elements
function updateLocationDisplay(locationId, reading) {
    const prefix = locationId === 'makhmor-road' ? 'makhmor' : 'naznaz'; // Use 'naznaz' prefix for Naznaz Area
    const isMakhmor = locationId === 'makhmor-road';
    const detailPrefix = isMakhmor ? 'location1' : 'naznaz'; // Use 'naznaz' for detail card IDs too
    const locationName = isMakhmor ? 'Makhmor Road' : 'Naznaz Area';


    // Get elements using the determined prefixes
    const currentPM25Element = document.getElementById(`${prefix}-current-pm25`);
    const airQualityStatusElement = document.getElementById(`${prefix}-air-quality-status`);
    const statusTimeElement = document.getElementById(`${prefix}-status-time`); // Overview card time
    const lastUpdatedElement = document.getElementById(`${prefix}-last-updated`); // Overview card last updated
    const timeAgoElement = document.getElementById(`${prefix}-time-ago`); // Overview card time ago
    const averagePM25Element = document.getElementById(`${prefix}-average-pm25`); // Overview card 24h average
    const avgChangeElement = document.getElementById(`${prefix}-avg-change`); // Overview card % change (optional)
    const sensorStatusElement = document.getElementById(`${prefix}-sensor-status`); // Overview card sensor status

    // Detail card elements
    const detailNameElement = document.getElementById(`${detailPrefix}-name`);
    const detailPM25Element = document.getElementById(`${detailPrefix}-pm25`);
    const detailHumidityElement = document.getElementById(`${detailPrefix}-humidity`);
    const detailTimestampElement = document.getElementById(`${detailPrefix}-timestamp`);


    if (!reading) {
        console.warn(`No reading provided for ${locationId}`);
        // Set all elements to default/error state
        if (currentPM25Element) currentPM25Element.textContent = '--';
        if (airQualityStatusElement) {
            airQualityStatusElement.textContent = 'No Data';
            airQualityStatusElement.className = 'inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600';
        }
        if (statusTimeElement) statusTimeElement.textContent = 'Updating...';
        if (lastUpdatedElement) lastUpdatedElement.textContent = 'Unknown';
        if (timeAgoElement) timeAgoElement.textContent = 'Loading...';
        if (averagePM25Element) averagePM25Element.textContent = '--';
         if (avgChangeElement) {
             avgChangeElement.textContent = '--';
             avgChangeElement.className = 'flex items-center text-xs font-medium text-gray-500'; // Reset style
         }
        if (sensorStatusElement) {
            sensorStatusElement.textContent = 'Unknown';
            sensorStatusElement.className = 'text-xl font-bold text-gray-500'; // Reset style
        }
         // Detail card defaults
         if (detailNameElement) detailNameElement.textContent = locationName; // Show name even if no data
         if (detailPM25Element) detailPM25Element.textContent = '-- μg/m³';
         if (detailHumidityElement) detailHumidityElement.textContent = '--%';
         if (detailTimestampElement) detailTimestampElement.textContent = '--:--';

        // Update sensor status via sensor-status.js if needed (it checks time difference)
         if (window.sensorStatus && typeof window.sensorStatus.updateLastUpdate === 'function') {
             // We don't have a timestamp, but calling update might trigger the 'Offline' state correctly
             window.sensorStatus.updateLastUpdate(locationName, null);
         }
        return;
    }

    // --- Update elements with reading data ---
    try {
        const pm25Value = reading.pm25 !== null && reading.pm25 !== undefined ? parseFloat(reading.pm25) : null;
        const humidityValue = reading.humidity !== null && reading.humidity !== undefined ? parseFloat(reading.humidity) : null; // Assuming 'humidity' column exists
        const timestamp = reading.timestamp; // Already a Date object


        // Update PM2.5 value (Overview)
        if (currentPM25Element) {
            currentPM25Element.textContent = pm25Value !== null ? pm25Value.toFixed(1) : '--';
        }

        // Update air quality status (Overview)
        if (airQualityStatusElement && pm25Value !== null) {
            const { status, bgColor, textColor } = getAirQualityStatus(pm25Value);
            airQualityStatusElement.textContent = status;
            // Ensure Tailwind classes are applied correctly
            airQualityStatusElement.className = `inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${bgColor} ${textColor} shadow-sm`;
        } else if (airQualityStatusElement) {
             airQualityStatusElement.textContent = 'No Data';
             airQualityStatusElement.className = 'inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 shadow-sm';
        }

        // Update timestamp elements (Overview)
        if (timestamp instanceof Date && !isNaN(timestamp)) {
             if (statusTimeElement) statusTimeElement.textContent = `As of ${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
             if (lastUpdatedElement) lastUpdatedElement.textContent = timestamp.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
             if (timeAgoElement) timeAgoElement.textContent = getTimeAgo(timestamp); // Update time ago

             // Update sensor status using sensor-status.js
             if (window.sensorStatus && typeof window.sensorStatus.updateLastUpdate === 'function') {
                 window.sensorStatus.updateLastUpdate(locationName, timestamp); // Pass name and timestamp
             }
        } else {
             if (statusTimeElement) statusTimeElement.textContent = 'Invalid Time';
             if (lastUpdatedElement) lastUpdatedElement.textContent = 'Invalid Time';
             if (timeAgoElement) timeAgoElement.textContent = 'Error';
        }


        // Update 24-hour average (Overview) - uses calculated average
        const avg24h = averages[locationId] ? averages[locationId]['24h'].pm25 : 0;
        if (averagePM25Element) {
            averagePM25Element.textContent = avg24h.toFixed(1);
        }
        // Optional: Update average change indicator (requires previous average)
        // if (avgChangeElement) { ... logic to calculate and display change ... }


        // Update Detail Card Elements
        if (detailNameElement) detailNameElement.textContent = locationName;
        if (detailPM25Element) detailPM25Element.textContent = pm25Value !== null ? `${pm25Value.toFixed(1)} μg/m³` : '-- μg/m³';
        if (detailHumidityElement) detailHumidityElement.textContent = humidityValue !== null ? `${humidityValue.toFixed(1)}%` : '--%';
        if (detailTimestampElement && timestamp instanceof Date && !isNaN(timestamp)) {
             detailTimestampElement.textContent = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (detailTimestampElement) {
             detailTimestampElement.textContent = '--:--';
        }


    } catch (error) {
        console.error(`Error updating display for ${locationId}:`, error);
        // Optionally call updateDefaultValuesForPrefix(prefix) or similar here
    }
}


// Get Air Quality Status based on PM2.5 value
function getAirQualityStatus(pm25) {
    if (pm25 === undefined || pm25 === null || isNaN(pm25)) {
        return { status: 'No Data', bgColor: 'bg-gray-100', textColor: 'text-gray-600' };
    }
    if (pm25 <= 12) return { status: 'Good', bgColor: 'bg-green-100', textColor: 'text-green-800' };
    if (pm25 <= 35.4) return { status: 'Moderate', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' };
    if (pm25 <= 55.4) return { status: 'Unhealthy for Sensitive Groups', bgColor: 'bg-orange-100', textColor: 'text-orange-800' };
    if (pm25 <= 150.4) return { status: 'Unhealthy', bgColor: 'bg-red-100', textColor: 'text-red-800' };
    if (pm25 <= 250.4) return { status: 'Very Unhealthy', bgColor: 'bg-purple-100', textColor: 'text-purple-800' };
    return { status: 'Hazardous', bgColor: 'bg-red-900', textColor: 'text-white' }; // Use darker red for Hazardous
}

// Initialize Supabase client (Simplified Check)
// This function now just verifies the client created by db-config.js is ready.
// Initialize Supabase client (Simplified Check)
// This function now just verifies the client created by db-config.js is ready.
async function initializeSupabase() {
    console.log("Verifying Supabase client status..."); // Log start
    try {
        // Check if dbConfig and the client object exist
        if (!window.dbConfig || !window.dbConfig.client) {
            // This error likely means db-config.js failed to initialize the client.
            // Check db-config.js for the correct ANON_KEY and check browser console for earlier errors.
             console.error("Supabase client not found. Was it initialized correctly in db-config.js?");
            throw new Error('Database client initialization failed. Check configuration (API Key in db-config.js) and previous errors.');
        }

        // Test the existing client connection to ensure it's working (e.g., RLS allows reads)
        console.log("Testing existing Supabase client connection...");
        const { error } = await window.dbConfig.client
            .from(window.dbConfig.airQualityTable)
            .select('id', { count: 'exact', head: true }); // More efficient test query

        if (error) {
            console.error("Supabase client connection test failed:", error);
             // Check for common errors like RLS issues
             if (error.message.includes('security barrier') || error.message.includes('violates row-level security policy')) {
                 throw new Error(`Database Read Error: Check Row Level Security (RLS) policies on the '${window.dbConfig.airQualityTable}' table in your Supabase project. Allow read access for the 'anon' role.`);
             } else if (error.message.includes('NetworkError')) {
                 throw new Error('Database Connection Error: Network issue. Please check your internet connection.');
             }
            throw new Error(`Database connection test failed: ${error.message}`);
        }

        console.log('Existing Supabase client connection test successful.');
        // No need to return anything, success means no error was thrown
        return true; // Indicate success

    } catch (error) {
        console.error('Failed during Supabase client verification:', error);
        // Display the error using the showError function defined elsewhere in app.js
        showError(`Database Connection Failed: ${error.message}`);
        return false; // Indicate failure
    }
}


// Initialize the dashboard
async function initDashboard() {
    // Use less obtrusive loading indication if possible
    console.log('Initializing dashboard...');

    try {
        // Initialize Supabase first
        const supabaseInitialized = await initializeSupabase();
        if (!supabaseInitialized) {
            // Error is already shown by initializeSupabase()
            console.error('Dashboard initialization halted due to Supabase connection failure.');
            return; // Stop initialization if DB connection fails
        }
        console.log('Database connection initialized');

        // Initialize sensor status tracking
        try {
            if (window.sensorStatus && typeof window.sensorStatus.init === 'function') {
                window.sensorStatus.init(); // Use await if init returns a promise
                console.log('Sensor status tracking initialized');
            } else {
                console.warn('Sensor status tracking module not available or init function missing.');
            }
        } catch (sensorError) {
            console.error('Error initializing sensor status:', sensorError);
            showError('Failed to initialize sensor status display.'); // Inform user
        }

        // Set up event listeners
        setupEventListeners();
        console.log('Event listeners initialized');

        // Initialize charts
        const chartsInitialized = initCharts();
        if (!chartsInitialized) {
            // Error handled within initCharts
            showError('Failed to initialize charts. Chart display might be unavailable.');
        } else {
            console.log('Charts initialized');
        }


        // Initialize the map (assuming map initialization code is in index.html <script> block)
        try {
            if (typeof L !== 'undefined' && typeof initMap === 'function') {
                 // initMap(); // If you have a separate initMap function
                 console.log('Map initialization logic should run from index.html.');
            } else {
                 console.warn('Leaflet library (L) or initMap function not found. Map might not display.');
            }
        } catch (mapError) {
            console.error('Error initializing map:', mapError);
            showError('Map initialization failed.');
        }

        // Fetch initial data
        await refreshData();
        console.log('Initial data fetched');

        // Start periodic updates
        setInterval(refreshData, 30000); // Update every 30 seconds

        console.log('Dashboard initialized successfully');

    } catch (error) {
        console.error('Error during dashboard initialization:', error);
        showError('Failed to initialize dashboard: ' + error.message);
    }
}

// Initialize charts
function initCharts() {
    try {
        // --- Initialize Main Trend Chart ---
        const mainChartElement = document.getElementById('air-quality-chart');
        if (!mainChartElement) {
            console.error('Main chart element (air-quality-chart) not found.');
            // Don't stop everything, just main chart won't work
        } else {
            const ctxMain = mainChartElement.getContext('2d');
            if (!ctxMain) {
                console.error('Failed to get main chart context.');
            } else {
                 // Set Chart.js defaults
                Chart.defaults.font.family = "'Manrope', sans-serif";
                Chart.defaults.color = '#64748B'; // Default text color (slate-500)
                Chart.defaults.elements.line.tension = 0.4;
                Chart.defaults.elements.line.borderWidth = 2;
                Chart.defaults.elements.point.radius = 0; // No points by default
                Chart.defaults.elements.point.hoverRadius = 6; // Larger hover points
                Chart.defaults.elements.point.hitRadius = 10; // Easier to hit points

                // Create gradient for Makhmor Road
                const gradientMakhmor = ctxMain.createLinearGradient(0, 0, 0, 320); // Height approx 320px
                gradientMakhmor.addColorStop(0, 'rgba(255, 122, 0, 0.3)'); // Orange start, more opaque
                gradientMakhmor.addColorStop(1, 'rgba(255, 122, 0, 0)'); // Orange end, transparent

                 // Create gradient for Naznaz Area
                const gradientNaznaz = ctxMain.createLinearGradient(0, 0, 0, 320);
                gradientNaznaz.addColorStop(0, 'rgba(59, 130, 246, 0.3)'); // Blue start, more opaque
                gradientNaznaz.addColorStop(1, 'rgba(59, 130, 246, 0)'); // Blue end, transparent

                mainChart = new Chart(ctxMain, {
                    type: 'line',
                    data: {
                        datasets: [
                            {
                                label: 'Makhmor Road',
                                borderColor: '#F97316', // Orange-600
                                backgroundColor: gradientMakhmor,
                                pointBackgroundColor: '#F97316',
                                pointBorderColor: '#ffffff',
                                pointHoverBackgroundColor: '#ffffff',
                                pointHoverBorderColor: '#F97316',
                                data: [],
                                yAxisID: 'yPm25', // Assign to PM2.5 axis
                                fill: true, // Fill area under line
                                borderWidth: 2.5
                            },
                            {
                                label: 'Naznaz Area', // Corrected Label
                                borderColor: '#3B82F6', // Blue-500
                                backgroundColor: gradientNaznaz,
                                pointBackgroundColor: '#3B82F6',
                                pointBorderColor: '#ffffff',
                                pointHoverBackgroundColor: '#ffffff',
                                pointHoverBorderColor: '#3B82F6',
                                data: [],
                                yAxisID: 'yPm25', // Assign to PM2.5 axis
                                fill: true, // Fill area under line
                                borderWidth: 2.5
                            }
                            // Add Humidity datasets here if needed, assign to yHumidity axis
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                            mode: 'index', // Show tooltips for all datasets at that index
                            intersect: false, // Tooltip activates even if not directly hovering point
                            axis: 'x' // Interaction along the x-axis
                        },
                        plugins: {
                            tooltip: {
                                enabled: true,
                                backgroundColor: 'rgba(15, 23, 42, 0.9)', // Dark background (slate-900)
                                titleColor: '#E2E8F0', // Light title (slate-200)
                                bodyColor: '#94A3B8', // Medium body (slate-400)
                                titleFont: { weight: 'bold', size: 14 },
                                bodyFont: { size: 12 },
                                padding: 12,
                                boxPadding: 6,
                                cornerRadius: 6,
                                displayColors: true, // Show color boxes
                                usePointStyle: true, // Use point style in tooltip color box
                                callbacks: {
                                    label: function(context) {
                                        let label = context.dataset.label || '';
                                        if (label) {
                                            label += ': ';
                                        }
                                        if (context.parsed.y !== null) {
                                            // Check axis ID to determine unit
                                            const axisId = context.dataset.yAxisID;
                                            const unit = axisId === 'yHumidity' ? '%' : ' μg/m³';
                                            label += `${context.parsed.y.toFixed(1)}${unit}`;
                                        }
                                        return label;
                                    },
                                     title: function(tooltipItems) {
                                         // Format the title (timestamp) nicely
                                         const date = new Date(tooltipItems[0].parsed.x);
                                         return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short'});
                                     }
                                }
                            },
                            legend: {
                                position: 'bottom', // Position legend at the bottom
                                align: 'center',
                                labels: {
                                    boxWidth: 12,
                                    boxHeight: 12,
                                    padding: 20,
                                    color: '#1F2937', // Darker legend text (slate-800)
                                    font: { size: 13, weight: '500' },
                                    usePointStyle: true,
                                    pointStyle: 'circle'
                                }
                            },
                            // Optional: Add chartjs-plugin-annotation for thresholds if needed
                        },
                        scales: {
                            x: {
                                type: 'time',
                                time: {
                                    unit: 'hour', // Default unit, will be adjusted by setTimeRange
                                    tooltipFormat: 'MMM d, yyyy, h:mm a', // Format for tooltip title
                                    displayFormats: { // How labels appear on the axis
                                        hour: 'HH:mm', // e.g., 14:00
                                        day: 'MMM d', // e.g., Apr 22
                                        // month: 'MMM yyyy' // If zooming out further
                                    }
                                },
                                grid: {
                                    display: false // Hide vertical grid lines
                                },
                                ticks: {
                                    color: '#64748B', // Axis ticks color (slate-500)
                                    major: {
                                        enabled: true // Enable major ticks for better readability on time axis
                                    },
                                    font: { size: 11 },
                                     maxRotation: 0, // Prevent labels from rotating
                                     autoSkip: true, // Automatically skip labels to prevent overlap
                                     maxTicksLimit: 10 // Limit number of ticks shown
                                }
                            },
                            yPm25: { // Axis for PM2.5
                                type: 'linear',
                                position: 'left',
                                beginAtZero: true, // Start axis at 0
                                title: {
                                    display: true,
                                    text: 'PM2.5 (μg/m³)',
                                    color: '#475569', // Axis title color (slate-600)
                                    font: { size: 12, weight: '600' }
                                },
                                grid: {
                                    color: '#E2E8F0', // Lighter grid lines (slate-200)
                                    drawBorder: false
                                },
                                ticks: {
                                    color: '#64748B', // Axis ticks color (slate-500)
                                    font: { size: 11 },
                                     padding: 5
                                }
                            }
                            // Add yHumidity axis definition here if tracking humidity
                            /*
                            yHumidity: { // Axis for Humidity
                                type: 'linear',
                                position: 'right', // Position on the right
                                beginAtZero: true,
                                suggestedMax: 100, // Max humidity is 100%
                                title: {
                                    display: true,
                                    text: 'Humidity (%)',
                                    color: '#475569',
                                    font: { size: 12, weight: '600' }
                                },
                                grid: {
                                    drawOnChartArea: false, // Don't draw grid lines for the right axis
                                },
                                ticks: {
                                    color: '#64748B',
                                    font: { size: 11 },
                                     padding: 5
                                }
                            }
                            */
                        }
                    }
                });
                console.log("Main trend chart initialized.");
            }
        }

        // --- Initialize Individual Location Charts (Optional - if using location1-chart, naznaz-chart) ---
        // Example for Makhmor (location1)
        const loc1ChartElement = document.getElementById('location1-chart');
        if (loc1ChartElement) {
            const ctxLoc1 = loc1ChartElement.getContext('2d');
            if (ctxLoc1) {
                 // location1Chart = new Chart(ctxLoc1, { /* ... config ... */ });
                 console.log("Placeholder: Initialize Makhmor Road detail chart.");
            }
        }
        // Example for Naznaz (using new ID)
        const nazChartElement = document.getElementById('naznaz-chart');
        if (nazChartElement) {
             const ctxNaz = nazChartElement.getContext('2d');
             if (ctxNaz) {
                 // naznazChart = new Chart(ctxNaz, { /* ... config ... */ });
                 console.log("Placeholder: Initialize Naznaz Area detail chart.");
             }
        }


        return true; // Indicate charts initialized (at least tried)
    } catch (error) {
        console.error('Error initializing charts:', error);
        showError('Could not initialize charts: ' + error.message);
        return false;
    }
}

// Update charts with the latest data
function updateCharts(processedData) {
    console.log('Updating charts with time range:', currentTimeRange);

    if (!mainChart) {
        console.error('Main chart is not initialized. Cannot update.');
        return;
    }

    const now = new Date();
    const timeLimit = timeRanges[currentTimeRange];

    // Filter data for the current time range AND ensure timestamp is valid
    const filterAndMapData = (dataArray) => {
        return (dataArray || []) // Handle null or undefined array
            .filter(reading => reading.timestamp instanceof Date && !isNaN(reading.timestamp) && (now - reading.timestamp) <= timeLimit)
            .sort((a, b) => a.timestamp - b.timestamp) // Sort chronologically
            .map(reading => ({
                x: reading.timestamp,
                y: reading.pm25 !== null ? parseFloat(reading.pm25) : null // Handle null PM2.5
            }));
    };

    // Prepare chart data using the processed data passed as argument
    const chartDataMakhmor = filterAndMapData(processedData['makhmor-road']);
    const chartDataNaznaz = filterAndMapData(processedData['naznaz-area']); // Use correct ID

    console.log(`Chart points - Makhmor Road: ${chartDataMakhmor.length}, Naznaz Area: ${chartDataNaznaz.length}`);

    // Update main chart datasets
    mainChart.data.datasets[0].data = chartDataMakhmor; // Makhmor Road (index 0)
    mainChart.data.datasets[1].data = chartDataNaznaz; // Naznaz Area (index 1)
    mainChart.data.datasets[1].label = 'Naznaz Area'; // Ensure label is correct

    // Dynamically adjust time unit based on range
    let timeUnit = 'hour';
    let stepSize = 2; // Default step for hours
    if (currentTimeRange === '7d') {
        timeUnit = 'day';
        stepSize = 1;
    } else if (currentTimeRange === '30d') {
        timeUnit = 'day';
        stepSize = 3; // Show roughly every 3 days
    }
    mainChart.options.scales.x.time.unit = timeUnit;
    mainChart.options.scales.x.time.stepSize = stepSize;


    // Update the chart
    mainChart.update(); // Efficiently updates the chart

    // Update individual location charts if they exist
    // if (location1Chart) { /* update location1Chart */ }
    // if (naznazChart) { /* update naznazChart */ }
}


// Function to set time range
function setTimeRange(range) {
    console.log('Setting time range to:', range);

    // Update button states visually
    document.querySelectorAll('.time-range-btn').forEach(btn => {
        const btnRange = btn.getAttribute('data-range');
        if (btnRange === range) {
            btn.classList.remove('bg-gray-100', 'text-gray-600');
            btn.classList.add('bg-orange-500', 'text-white', 'shadow-md'); // Active style
        } else {
            btn.classList.remove('bg-orange-500', 'text-white', 'shadow-md');
            btn.classList.add('bg-gray-100', 'text-gray-600'); // Inactive style
        }
    });

    // Update current time range state
    currentTimeRange = range;

    // Trigger data refresh and chart update for the new range
    // No need to manually update chart options here, refreshData->updateCharts handles it
    refreshData().catch(error => {
        console.error('Error refreshing data after time range change:', error);
        showError('Failed to update data for new time range: ' + error.message);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Time range buttons
    document.querySelectorAll('.time-range-btn').forEach(button => {
        button.addEventListener('click', () => {
            const range = button.getAttribute('data-range');
            if (range) { // Ensure data-range attribute exists
                 console.log(`${range} button clicked`);
                 setTimeRange(range);
            }
        });
    });

    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const refreshIcon = refreshBtn.querySelector('svg');
            if (refreshIcon) {
                 refreshIcon.classList.add('animate-spin');
                 refreshBtn.disabled = true; // Disable button while refreshing
            }
            console.log("Refresh button clicked");
            try {
                await refreshData();
                console.log('Data refreshed successfully via button');
            } catch (error) {
                console.error('Error refreshing data via button:', error);
                showError('Failed to refresh data: ' + error.message);
            } finally {
                if (refreshIcon) {
                    // Ensure animation stops and button is re-enabled
                    setTimeout(() => {
                        refreshIcon.classList.remove('animate-spin');
                        refreshBtn.disabled = false;
                    }, 500); // Small delay to ensure animation shows
                } else {
                    refreshBtn.disabled = false;
                }
            }
        });
    } else {
        console.warn("Refresh button not found.");
    }

    // Location filter dropdown
    if (locationFilterElement) {
        locationFilterElement.addEventListener('change', () => {
            currentPage = 1; // Reset to first page on filter change
            updateDataTable();
        });
    } else {
         console.warn("Location filter dropdown not found.");
    }

    // Pagination buttons
    if (prevPageButton) {
        prevPageButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updateDataTable();
            }
        });
    } else {
         console.warn("Previous page button not found.");
    }

    if (nextPageButton) {
        nextPageButton.addEventListener('click', () => {
             // Calculate total pages based on the currently filtered data length
             let filteredDataLength = allReadings.length;
             const locationFilter = locationFilterElement ? locationFilterElement.value : 'all';
             if (locationFilter === 'makhmor-road') {
                 filteredDataLength = makhmorRoadData.length;
             } else if (locationFilter === 'naznaz-area') {
                 filteredDataLength = naznazAreaData.length;
             }
            const totalPages = Math.ceil(filteredDataLength / itemsPerPage);

            if (currentPage < totalPages) {
                currentPage++;
                updateDataTable();
            }
        });
    } else {
         console.warn("Next page button not found.");
    }
}

// Update data table/cards view
function updateDataTable() {
    console.log('Updating data table/cards for page:', currentPage);

    let dataToDisplay = [];
    const locationFilter = locationFilterElement ? locationFilterElement.value : 'all';

    // Select the correct data source based on the filter
    if (locationFilter === 'makhmor-road') {
        dataToDisplay = makhmorRoadData; // Use pre-filtered Makhmor data
    } else if (locationFilter === 'naznaz-area') {
        dataToDisplay = naznazAreaData; // Use pre-filtered Naznaz data
    } else {
        dataToDisplay = allReadings; // Use all readings (already sorted newest first)
    }

    const totalItems = dataToDisplay.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    currentPage = Math.max(1, Math.min(currentPage, totalPages)); // Ensure currentPage is valid

    // Pagination calculation
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedData = dataToDisplay.slice(startIndex, endIndex);

    // Update page info display
    if (pageInfoElement) {
        pageInfoElement.textContent = totalItems > 0 ? `Showing ${startIndex + 1}-${endIndex} of ${totalItems}` : 'Showing 0-0 of 0';
    }

    // Enable/disable pagination buttons
    if (prevPageButton) {
        prevPageButton.disabled = currentPage === 1;
        prevPageButton.classList.toggle('opacity-50', currentPage === 1);
        prevPageButton.classList.toggle('cursor-not-allowed', currentPage === 1);
    }
    if (nextPageButton) {
        nextPageButton.disabled = currentPage >= totalPages;
        nextPageButton.classList.toggle('opacity-50', currentPage >= totalPages);
        nextPageButton.classList.toggle('cursor-not-allowed', currentPage >= totalPages);
    }

    // Clear existing content
    if (readingsTableBody) readingsTableBody.innerHTML = '';
    if (readingsCards) readingsCards.innerHTML = '';

    // Handle case where there's no data to display for the current filter/page
    if (paginatedData.length === 0) {
        const emptyMessage = 'No data available for this filter.';
        if (readingsTableBody) {
            readingsTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-sm text-center text-gray-500">${emptyMessage}</td></tr>`;
        }
        if (readingsCards) {
            readingsCards.innerHTML = `<div class="text-center text-gray-500 py-4">${emptyMessage}</div>`;
        }
        return; // Stop here if no data
    }

    // Populate table (desktop) and cards (mobile)
    paginatedData.forEach((reading) => {
        const pm25 = reading.pm25 !== null ? parseFloat(reading.pm25) : null;
        const timestamp = reading.timestamp; // Should be a Date object
        const locationId = locationMapping[reading.Location]; // Get internal ID
        const displayName = locationId === 'makhmor-road' ? 'Makhmor Road' : 'Naznaz Area';
        const shortDisplayName = locationId === 'makhmor-road' ? 'Makhmor Rd' : 'Naznaz Area';
        const statusInfo = getAirQualityStatus(pm25); // Use the helper

        // Create table row (Desktop)
        if (readingsTableBody) {
            const row = document.createElement('tr');
            row.classList.add('hover:bg-gray-50'); // Lighter hover for white background
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${reading.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${pm25 !== null && pm25 > 55.4 ? 'text-red-600' : 'text-gray-900'}">${pm25 !== null ? pm25.toFixed(1) : '--'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${timestamp instanceof Date && !isNaN(timestamp) ? formatDateTime(timestamp) : 'Invalid Date'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${displayName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusInfo.bgColor} ${statusInfo.textColor}">
                        ${statusInfo.status}
                    </span>
                </td>
            `;
            readingsTableBody.appendChild(row);
        }

        // Create card (Mobile) - Using neo-card style from index.html
        if (readingsCards) {
            const card = document.createElement('div');
            // Apply similar classes as used in index.html for consistency
            card.className = 'neo-card bg-white rounded-lg shadow p-4 mb-3'; // Simplified classes
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <span class="text-xs text-gray-400">ID: ${reading.id}</span>
                        <div class="mt-1 flex items-center">
                            <span class="text-xl font-bold ${pm25 !== null && pm25 > 55.4 ? 'text-red-600' : 'text-gray-800'}">${pm25 !== null ? pm25.toFixed(1) : '--'}</span>
                            <span class="ml-1 text-sm text-gray-500">μg/m³</span>
                        </div>
                    </div>
                    <span class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusInfo.bgColor} ${statusInfo.textColor}">
                        ${statusInfo.status}
                    </span>
                </div>
                <div class="flex justify-between text-xs text-gray-500">
                    <span>${timestamp instanceof Date && !isNaN(timestamp) ? formatDateTime(timestamp) : 'Invalid Date'}</span>
                    <span class="font-medium">${shortDisplayName}</span>
                </div>
            `;
            readingsCards.appendChild(card);
        }
    });
}


// Helper function to format timestamp for display in table/cards
function formatDateTime(date) {
    if (!(date instanceof Date) || isNaN(date)) return 'Invalid Date';
    try {
        // Example format: Apr 22, 2025, 7:30 PM
        return date.toLocaleString([], {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        });
    } catch (e) {
        console.error('Error formatting date:', e);
        return date.toString(); // Fallback
    }
}

// Helper function to get time ago string
function getTimeAgo(date) {
    if (!(date instanceof Date) || isNaN(date)) return 'Invalid date';
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 5) return 'Just now'; // More immediate feedback
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}


// Function to update averages display section (uses global `averages`)
function updateAveragesDisplay() {
    ['makhmor-road', 'naznaz-area'].forEach(locationId => {
        const detailPrefix = locationId === 'makhmor-road' ? 'location1' : 'naznaz'; // Use consistent prefix
        Object.keys(timeRanges).forEach(range => {
            const avgData = averages[locationId] ? averages[locationId][range] : { pm25: 0, humidity: 0 };
            const elementId = `${detailPrefix}-${range}-avg`; // e.g., location1-24h-avg, naznaz-7d-avg
            const element = document.getElementById(elementId);
            if (element) {
                // Display PM2.5 average. Add humidity if needed.
                element.textContent = `${avgData.pm25.toFixed(1)} μg/m³`;
                // Optional: Add humidity: element.textContent += ` | ${avgData.humidity.toFixed(1)}%`;
            } else {
                 console.warn(`Average display element not found: ${elementId}`);
            }
        });
    });
}

// Function to update predictions display section (uses global `predictions`)
function updatePredictionsDisplay() {
     ['makhmor-road', 'naznaz-area'].forEach(locationId => {
         const detailPrefix = locationId === 'makhmor-road' ? 'location1' : 'naznaz'; // Use consistent prefix
         const prediction = predictions[locationId];
         const elementId = `${detailPrefix}-prediction`; // e.g., location1-prediction, naznaz-prediction
         const element = document.getElementById(elementId);
         if (element) {
             if (prediction && prediction.pm25 !== null) {
                 element.innerHTML = `
                    Predicted PM2.5: <span class="font-semibold">${prediction.pm25.toFixed(1)} μg/m³</span>
                    <div class="text-xs text-blue-500 mt-1">Confidence: ${prediction.confidence ? prediction.confidence.toFixed(0) : '--'}%</div>
                 `;
             } else {
                 element.textContent = 'Prediction unavailable';
             }
         } else {
             console.warn(`Prediction display element not found: ${elementId}`);
         }
     });
}


// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM fully loaded and parsed.');
    // Use a try-catch block for the entire initialization sequence
    try {
        console.log('Starting dashboard initialization process...');
        await initDashboard(); // Call the main initialization function
    } catch (error) {
        console.error('Critical error during initialization sequence:', error);
        // Display a user-friendly error message in the UI if possible
        const bodyElement = document.querySelector('body');
        if (bodyElement) {
            const errorDiv = document.createElement('div');
            errorDiv.style.position = 'fixed';
            errorDiv.style.top = '0';
            errorDiv.style.left = '0';
            errorDiv.style.right = '0';
            errorDiv.style.backgroundColor = '#ef4444'; // Red background
            errorDiv.style.color = 'white';
            errorDiv.style.padding = '10px';
            errorDiv.style.textAlign = 'center';
            errorDiv.style.zIndex = '1000';
            errorDiv.textContent = `FATAL ERROR: Dashboard could not initialize. ${error.message}. Please check console and refresh.`;
            bodyElement.prepend(errorDiv);
        }
        // Fallback error display
        showError('FATAL ERROR: Dashboard could not initialize. Check console.');
    }
});