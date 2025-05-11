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

// MODIFIED: Predictions structure for an array of 7 daily predictions
let predictions = {
    'makhmor-road': [], // Array of 7 objects: { dayName: "Sat", pm25: null, confidence: null }
    'naznaz-area': []   // Array of 7 objects
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
        } else {
            result[range].pm25 = 0; // Default to 0 if no data
            result[range].humidity = 0; // Default to 0 if no data
        }
    });

    return result;
}

// NEW (Replaces previous calculate7DayDailyPrediction):
// Function to calculate 7-day daily PM2.5 predictions using a blend of
// day-of-week averages and recent overall daily averages.
function calculate7DayDailyPrediction(locationData) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today
    const predictionsArray = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const HISTORICAL_DAYS_TO_CONSIDER = 21; // Use up to 3 weeks of daily averages
    const RECENT_DAYS_FOR_OVERALL_AVG = 5;  // How many recent days for the general trend
    const MIN_TOTAL_DAILY_DATAPOINTS = 5; // Min distinct past daily averages needed for a decent prediction

    const WEIGHT_DOW = 0.6; // Weight for the day-of-week specific average
    const WEIGHT_RECENT = 0.4; // Weight for the recent N-day average

    // 1. Prepare historical daily averages map
    const dailyAveragesMap = {}; // Stores {'YYYY-MM-DD': {sum, count, date, dayOfWeek, avgPm25}}
    const historyStartDate = new Date(today.getTime() - HISTORICAL_DAYS_TO_CONSIDER * 24 * 60 * 60 * 1000);

    locationData.forEach(r => {
        if (r.timestamp instanceof Date && r.timestamp >= historyStartDate && r.timestamp < today && r.pm25 !== null && r.pm25 !== undefined) {
            const recordDate = new Date(r.timestamp);
            recordDate.setHours(0,0,0,0);
            const dayKey = recordDate.toISOString().split('T')[0];

            if (!dailyAveragesMap[dayKey]) {
                dailyAveragesMap[dayKey] = {
                    sum: 0,
                    count: 0,
                    date: recordDate,
                    dayOfWeek: recordDate.getDay() // 0 for Sunday, 1 for Monday, etc.
                };
            }
            dailyAveragesMap[dayKey].sum += parseFloat(r.pm25);
            dailyAveragesMap[dayKey].count += 1;
        }
    });

    // Calculate averages and convert to a sorted array
    const sortedPastDailyAverages = Object.keys(dailyAveragesMap)
        .map(key => {
            const entry = dailyAveragesMap[key];
            return {
                date: entry.date,
                avgPm25: entry.sum / entry.count,
                dayOfWeek: entry.dayOfWeek
            };
        })
        .sort((a, b) => a.date - b.date); // Sort chronologically (oldest to newest)

    // Fallback if not enough distinct historical daily data points
    if (sortedPastDailyAverages.length < MIN_TOTAL_DAILY_DATAPOINTS) {
        let fallbackPm25 = null;
        if (sortedPastDailyAverages.length > 0) {
            fallbackPm25 = sortedPastDailyAverages[sortedPastDailyAverages.length - 1].avgPm25; // Use the last known daily average
        } else if (locationData.length > 0 && locationData[0].pm25 !== null) { // locationData is sorted descending
            fallbackPm25 = parseFloat(locationData[0].pm25); // Use the absolute latest raw reading
        }

        for (let i = 0; i < 7; i++) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + i + 1);
            predictionsArray.push({
                dayName: dayNames[targetDate.getDay()],
                date: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric'}),
                pm25: fallbackPm25 !== null ? Math.max(0, fallbackPm25) : null,
                confidence: 10 // Low confidence for basic fallback
            });
        }
        return predictionsArray;
    }

    // 2. Calculate Recent Overall Average
    const recentOverallSlice = sortedPastDailyAverages.slice(-RECENT_DAYS_FOR_OVERALL_AVG);
    let pm25RecentOverallAvg = null;
    let actualRecentDaysCount = 0;
    if (recentOverallSlice.length > 0) {
        pm25RecentOverallAvg = recentOverallSlice.reduce((sum, day) => sum + day.avgPm25, 0) / recentOverallSlice.length;
        actualRecentDaysCount = recentOverallSlice.length;
    }

    // 3. Predict for the next 7 days
    for (let i = 0; i < 7; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i + 1);
        const targetDayOfWeek = targetDate.getDay();

        // a. Day-of-Week (DoW) Component
        const dowSpecificAverages = sortedPastDailyAverages.filter(d => d.dayOfWeek === targetDayOfWeek);
        let pm25DowSpecificAvg = null;
        let dowInstanceCount = dowSpecificAverages.length;
        if (dowInstanceCount > 0) {
            pm25DowSpecificAvg = dowSpecificAverages.reduce((sum, day) => sum + day.avgPm25, 0) / dowInstanceCount;
        }

        // b. Blending Logic
        let predictedPm25 = null;
        if (pm25DowSpecificAvg !== null && pm25RecentOverallAvg !== null) {
            predictedPm25 = (WEIGHT_DOW * pm25DowSpecificAvg) + (WEIGHT_RECENT * pm25RecentOverallAvg);
        } else if (pm25DowSpecificAvg !== null) { // Only DoW available
            predictedPm25 = pm25DowSpecificAvg;
        } else if (pm25RecentOverallAvg !== null) { // Only recent overall available
            predictedPm25 = pm25RecentOverallAvg;
        } else { // Should not happen if MIN_TOTAL_DAILY_DATAPOINTS is met, but as a safeguard
            predictedPm25 = sortedPastDailyAverages[sortedPastDailyAverages.length - 1].avgPm25;
        }

        // c. Confidence Calculation
        let currentConfidence = 20; // Base
        if (dowInstanceCount >= 2 && actualRecentDaysCount >= Math.min(3, RECENT_DAYS_FOR_OVERALL_AVG)) {
            currentConfidence = 70; // Good DoW data and good recent trend data
        } else if (dowInstanceCount >= 1 && actualRecentDaysCount >= Math.min(3, RECENT_DAYS_FOR_OVERALL_AVG)) {
            currentConfidence = 60; // Decent DoW and good recent
        } else if (dowInstanceCount >= 2) {
            currentConfidence = 50; // Good DoW, but recent trend might be less reliable
        } else if (actualRecentDaysCount >= Math.min(3, RECENT_DAYS_FOR_OVERALL_AVG)) {
            currentConfidence = 40; // No strong DoW pattern, but recent trend is somewhat okay
        } else if (dowInstanceCount === 1) {
            currentConfidence = 30; // Only one DoW instance
        }
        
        currentConfidence -= i * 5; // Decrease confidence for days further out (i is 0-6 for day offset 1-7)
        const finalConfidence = Math.max(10, Math.min(currentConfidence, 85)); // Clamp confidence

        predictionsArray.push({
            dayName: dayNames[targetDate.getDay()],
            date: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric'}),
            pm25: predictedPm25 !== null ? Math.max(0, predictedPm25) : null,
            confidence: finalConfidence
        });
    }
    return predictionsArray;
}


// DOM Elements (Grouped for clarity)
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

// Dark Mode Elements
const darkModeToggle = document.getElementById('dark-mode-toggle');
const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');


// Function to refresh dashboard data
async function refreshData() {
    try {
        if (!window.dbConfig) {
            throw new Error('Database configuration not found. Please reload the page.');
        }
        if (!window.dbConfig.client) {
            console.error("dbConfig.client not found in refreshData. Initialization likely failed earlier.");
            throw new Error('Database client is not available. Check console for initialization errors.');
        }
        console.log('Starting data refresh...');

        const { data: readings, error } = await window.dbConfig.client
            .from(window.dbConfig.airQualityTable)
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(1000); // Fetch more if needed for robust weekly patterns

        if (error) {
            throw new Error(`Database query failed: ${error.message}`);
        }

        if (!readings || readings.length === 0) {
            console.warn('No readings found in database');
            updateDefaultValues();
            allReadings = [];
            updateDataTable();
            updateCharts({ 'makhmor-road': [], 'naznaz-area': [] });
            return;
        }

        console.log(`Workspaceed ${readings.length} readings`); // Corrected log message
        allReadings = readings.map(r => ({ ...r, timestamp: new Date(r.timestamp), Location: r.Location || "Unknown" }));

        const readingsByLocation = {
             'makhmor-road': [],
             'naznaz-area': []
        };

        allReadings.forEach(reading => {
            const locationString = reading.Location;
            const locationId = Object.keys(locationMapping).find(key => locationString === key) ? locationMapping[locationString] :
                               (locationString === "Makhmor Road" ? 'makhmor-road' : (locationString === "Naznaz Area" ? 'naznaz-area' : null));

            if (locationId && readingsByLocation[locationId]) {
                 readingsByLocation[locationId].push(reading);
            }
        });

        makhmorRoadData = readingsByLocation['makhmor-road'].sort((a, b) => b.timestamp - a.timestamp);
        naznazAreaData = readingsByLocation['naznaz-area'].sort((a, b) => b.timestamp - a.timestamp);

        window.makhmorRoadData = makhmorRoadData;
        window.naznazAreaData = naznazAreaData;

        console.log(`Processed Makhmor Road: ${makhmorRoadData.length}, Naznaz Area: ${naznazAreaData.length}`);

        if (makhmorRoadData.length > 0) {
            averages['makhmor-road'] = calculateAverages(makhmorRoadData);
            predictions['makhmor-road'] = calculate7DayDailyPrediction(makhmorRoadData); // MODIFIED
            updateLocationDisplay('makhmor-road', makhmorRoadData[0]);
        } else {
            updateLocationDisplay('makhmor-road', null);
            predictions['makhmor-road'] = Array(7).fill({ dayName: "", date: "", pm25: null, confidence: null }); // Reset
        }

        if (naznazAreaData.length > 0) {
            averages['naznaz-area'] = calculateAverages(naznazAreaData);
            predictions['naznaz-area'] = calculate7DayDailyPrediction(naznazAreaData); // MODIFIED
            updateLocationDisplay('naznaz-area', naznazAreaData[0]);
        } else {
            updateLocationDisplay('naznaz-area', null);
            predictions['naznaz-area'] = Array(7).fill({ dayName: "", date: "", pm25: null, confidence: null }); // Reset
        }

        updateAveragesDisplay();
        updatePredictionsDisplay();
        updateDataTable();
        updateCharts(readingsByLocation);

         if (typeof window.updateMapData === 'function') {
             window.updateMapData();
         }
        console.log('Data refresh completed successfully');

    } catch (error) {
        console.error('Error in refreshData:', error);
        if (error.type === 'CONFIG_ERROR') {
            showError(error.message);
            if (typeof showConfigModal === 'function') {
                showConfigModal();
            }
        } else {
            showError('Failed to refresh data. Please check the console for details.');
        }
        updateDefaultValues();
        allReadings = [];
        window.makhmorRoadData = [];
        window.naznazAreaData = [];
        updateDataTable();
        updateCharts({ 'makhmor-road': [], 'naznaz-area': [] });
         if (typeof window.updateMapData === 'function') {
             window.updateMapData();
         }
    }
}

// MODIFIED: Helper function to update UI with default values
function updateDefaultValues() {
    const locations = ['makhmor-road', 'naznaz-area'];
    locations.forEach(locationId => {
        updateLocationDisplay(locationId, null);
    });
    Object.keys(averages).forEach(locId => {
        Object.keys(averages[locId]).forEach(range => {
            averages[locId][range] = { pm25: 0, humidity: 0 };
        });
    });
     Object.keys(predictions).forEach(locId => {
         // Initialize with an array of 7 empty prediction objects
         predictions[locId] = Array(7).fill(null).map((_, i) => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + i + 1);
            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            return {
                dayName: dayNames[futureDate.getDay()],
                date: futureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric'}),
                pm25: null,
                confidence: null
            };
         });
     });
    updateAveragesDisplay();
    updatePredictionsDisplay();
}

// Function to update a specific location's display elements
function updateLocationDisplay(locationId, reading) {
    const prefix = locationId === 'makhmor-road' ? 'makhmor' : 'naznaz';
    const isMakhmor = locationId === 'makhmor-road';
    const detailPrefix = isMakhmor ? 'location1' : 'naznaz';
    const locationName = isMakhmor ? 'Makhmor Road' : 'Naznaz Area';

    const elements = {
        currentPM25: document.getElementById(`${prefix}-current-pm25`),
        airQualityStatus: document.getElementById(`${prefix}-air-quality-status`),
        statusTime: document.getElementById(`${prefix}-status-time`),
        lastUpdated: document.getElementById(`${prefix}-last-updated`),
        timeAgo: document.getElementById(`${prefix}-time-ago`),
        averagePM25: document.getElementById(`${prefix}-average-pm25`),
        sensorStatus: document.getElementById(`${prefix}-sensor-status`),
        detailName: document.getElementById(`${detailPrefix}-name`),
        detailPM25: document.getElementById(`${detailPrefix}-pm25`),
        detailHumidity: document.getElementById(`${detailPrefix}-humidity`),
        detailTimestamp: document.getElementById(`${detailPrefix}-timestamp`),
    };

    if (!reading) {
        if (elements.currentPM25) elements.currentPM25.textContent = '--';
        if (elements.airQualityStatus) {
            elements.airQualityStatus.textContent = 'No Data';
            elements.airQualityStatus.className = 'status-badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
        }
        if (elements.statusTime) elements.statusTime.textContent = 'Updating...';
        if (elements.lastUpdated) elements.lastUpdated.textContent = 'Unknown';
        if (elements.timeAgo) elements.timeAgo.textContent = 'Loading...';
        if (elements.averagePM25) elements.averagePM25.textContent = '--';

        if (elements.detailName) elements.detailName.textContent = locationName;
        if (elements.detailPM25) elements.detailPM25.innerHTML = `--<span class="ml-1 text-sm text-gray-500 dark:text-gray-400">μg/m³ PM2.5</span>`;
        if (elements.detailHumidity) elements.detailHumidity.innerHTML = `--<span class="ml-1 text-sm text-gray-500 dark:text-gray-400">% Humidity</span>`;
        if (elements.detailTimestamp) elements.detailTimestamp.textContent = '--:--';

        if (window.sensorStatus && typeof window.sensorStatus.updateLastUpdate === 'function') {
            window.sensorStatus.updateLastUpdate(locationName, null);
        }
        return;
    }

    try {
        const pm25Value = reading.pm25 !== null && reading.pm25 !== undefined ? parseFloat(reading.pm25) : null;
        const humidityValue = reading.humidity !== null && reading.humidity !== undefined ? parseFloat(reading.humidity) : null;
        const timestamp = reading.timestamp;

        if (elements.currentPM25) {
            elements.currentPM25.textContent = pm25Value !== null ? pm25Value.toFixed(1) : '--';
        }

        if (elements.airQualityStatus && pm25Value !== null) {
            const { status, className } = getAirQualityStatus(pm25Value);
            elements.airQualityStatus.textContent = status;
            elements.airQualityStatus.className = `status-badge ${className} shadow-sm`;
        } else if (elements.airQualityStatus) {
             elements.airQualityStatus.textContent = 'No Data';
             elements.airQualityStatus.className = 'status-badge nodata-status shadow-sm';
        }

        if (timestamp instanceof Date && !isNaN(timestamp)) {
             if (elements.statusTime) elements.statusTime.textContent = `As of ${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
             if (elements.lastUpdated) elements.lastUpdated.textContent = timestamp.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
             if (elements.timeAgo) elements.timeAgo.textContent = getTimeAgo(timestamp);

             if (window.sensorStatus && typeof window.sensorStatus.updateLastUpdate === 'function') {
                 window.sensorStatus.updateLastUpdate(locationName, timestamp);
             }
        } else {
             if (elements.statusTime) elements.statusTime.textContent = 'Invalid Time';
             if (elements.lastUpdated) elements.lastUpdated.textContent = 'Invalid Time';
             if (elements.timeAgo) elements.timeAgo.textContent = 'Error';
        }

        const avg24h = averages[locationId] ? averages[locationId]['24h'].pm25 : 0;
        if (elements.averagePM25) {
            elements.averagePM25.textContent = avg24h.toFixed(1);
        }

        if (elements.detailName) elements.detailName.textContent = locationName;
        if (elements.detailPM25) elements.detailPM25.innerHTML = `${pm25Value !== null ? pm25Value.toFixed(1) : '--'}<span class="ml-1 text-sm text-gray-500 dark:text-gray-400">μg/m³ PM2.5</span>`;
        if (elements.detailHumidity) elements.detailHumidity.innerHTML = `${humidityValue !== null ? humidityValue.toFixed(1) : '--'}<span class="ml-1 text-sm text-gray-500 dark:text-gray-400">% Humidity</span>`;
        if (elements.detailTimestamp && timestamp instanceof Date && !isNaN(timestamp)) {
             elements.detailTimestamp.textContent = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (elements.detailTimestamp) {
             elements.detailTimestamp.textContent = '--:--';
        }

    } catch (error) {
        console.error(`Error updating display for ${locationId}:`, error);
    }
}


function getAirQualityStatus(pm25) {
    const isDark = document.documentElement.classList.contains('dark');
    if (pm25 === undefined || pm25 === null || isNaN(pm25)) {
        return { status: 'No Data', className: isDark ? 'dark:bg-gray-700 dark:text-gray-300' : 'bg-gray-100 text-gray-600', color: '#6B7280' };
    }
    if (pm25 <= 12) return { status: 'Good', className: isDark ? 'dark:bg-green-800 dark:text-green-200' : 'bg-green-100 text-green-700', color: '#10B981' };
    if (pm25 <= 35.4) return { status: 'Moderate', className: isDark ? 'dark:bg-yellow-800 dark:text-yellow-200' : 'bg-yellow-100 text-yellow-700', color: '#F59E0B' };
    if (pm25 <= 55.4) return { status: 'Unhealthy for Sensitive', className: isDark ? 'dark:bg-orange-800 dark:text-orange-200' : 'bg-orange-100 text-orange-700', color: '#F97316' };
    if (pm25 <= 150.4) return { status: 'Unhealthy', className: isDark ? 'dark:bg-red-800 dark:text-red-200' : 'bg-red-100 text-red-700', color: '#EF4444' };
    if (pm25 <= 250.4) return { status: 'Very Unhealthy', className: isDark ? 'dark:bg-purple-800 dark:text-purple-200' :'bg-purple-100 text-purple-700', color: '#8B5CF6' };
    return { status: 'Hazardous', className: isDark ? 'dark:bg-red-900 dark:text-red-200' : 'bg-red-200 text-red-800', color: '#B91C1C' };
}


async function initializeSupabase() {
    console.log("Verifying Supabase client status...");
    try {
        if (!window.dbConfig || !window.dbConfig.client) {
             console.error("Supabase client not found. Was it initialized correctly in db-config.js?");
            throw new Error('Database client initialization failed. Check configuration (API Key in db-config.js) and previous errors.');
        }
        console.log("Testing existing Supabase client connection...");
        const { error } = await window.dbConfig.client
            .from(window.dbConfig.airQualityTable)
            .select('id', { count: 'exact', head: true });

        if (error) {
            console.error("Supabase client connection test failed:", error);
             if (error.message.includes('security barrier') || error.message.includes('violates row-level security policy')) {
                 throw new Error(`Database Read Error: Check Row Level Security (RLS) policies on the '${window.dbConfig.airQualityTable}' table in your Supabase project. Allow read access for the 'anon' role.`);
             } else if (error.message.includes('NetworkError')) {
                 throw new Error('Database Connection Error: Network issue. Please check your internet connection.');
             }
            throw new Error(`Database connection test failed: ${error.message}`);
        }
        console.log('Existing Supabase client connection test successful.');
        return true;

    } catch (error) {
        console.error('Failed during Supabase client verification:', error);
        showError(`Database Connection Failed: ${error.message}`);
        return false;
    }
}

function updateThemeIcons(isDarkMode) {
    if (isDarkMode) {
        themeToggleDarkIcon.classList.remove('hidden');
        themeToggleLightIcon.classList.add('hidden');
        document.documentElement.classList.add('dark');
    } else {
        themeToggleDarkIcon.classList.add('hidden');
        themeToggleLightIcon.classList.remove('hidden');
        document.documentElement.classList.remove('dark');
    }
}

function toggleDarkMode() {
    const isDarkMode = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
    updateThemeIcons(isDarkMode);

    // The mainChart theme update is handled by refreshData -> updateCharts
    // if (mainChart) {
    // }

    if (typeof window.updateMapTheme === 'function') {
        window.updateMapTheme();
    }
    refreshData(); // Refresh data which will trigger chart and other UI updates
}

function applyInitialTheme() {
    const storedTheme = localStorage.getItem('darkMode');
    let isDarkMode = false;
    if (storedTheme === 'enabled') {
        isDarkMode = true;
    } else if (storedTheme === 'disabled') {
        isDarkMode = false;
    } else {
        isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    updateThemeIcons(isDarkMode);
}


async function initDashboard() {
    console.log('Initializing dashboard...');
    applyInitialTheme();

    try {
        const supabaseInitialized = await initializeSupabase();
        if (!supabaseInitialized) {
            console.error('Dashboard initialization halted due to Supabase connection failure.');
            return;
        }
        console.log('Database connection initialized');

        try {
            if (window.sensorStatus && typeof window.sensorStatus.init === 'function') {
                window.sensorStatus.init();
                console.log('Sensor status tracking initialized');
            } else {
                console.warn('Sensor status tracking module not available or init function missing.');
            }
        } catch (sensorError) {
            console.error('Error initializing sensor status:', sensorError);
            showError('Failed to initialize sensor status display.');
        }

        setupEventListeners();
        console.log('Event listeners initialized');

        const chartsInitialized = initCharts();
        if (!chartsInitialized) {
            showError('Failed to initialize charts. Chart display might be unavailable.');
        } else {
            console.log('Charts initialized');
        }

        await refreshData();
        console.log('Initial data fetched');

        setInterval(refreshData, 30000);

        console.log('Dashboard initialized successfully');

    } catch (error) {
        console.error('Error during dashboard initialization:', error);
        showError('Failed to initialize dashboard: ' + error.message);
    }
}

function initCharts() {
    try {
        const mainChartElement = document.getElementById('air-quality-chart');
        if (!mainChartElement) {
            console.error('Main chart element (air-quality-chart) not found.'); return false;
        }
        const ctxMain = mainChartElement.getContext('2d');
        if (!ctxMain) {
            console.error('Failed to get main chart context.'); return false;
        }

        const isDarkMode = document.documentElement.classList.contains('dark');
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0';
        const textColor = isDarkMode ? '#9CA3AF' : '#64748B';
        const titleColor = isDarkMode ? '#F3F4F6' : '#475569';

        Chart.defaults.font.family = "'Manrope', sans-serif";

        const gradientMakhmor = ctxMain.createLinearGradient(0, 0, 0, 320);
        gradientMakhmor.addColorStop(0, 'rgba(255, 122, 0, 0.3)');
        gradientMakhmor.addColorStop(1, 'rgba(255, 122, 0, 0)');

        const gradientNaznaz = ctxMain.createLinearGradient(0, 0, 0, 320);
        gradientNaznaz.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        gradientNaznaz.addColorStop(1, 'rgba(59, 130, 246, 0)');

        mainChart = new Chart(ctxMain, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Makhmor Road',
                        borderColor: '#F97316',
                        backgroundColor: gradientMakhmor,
                        pointBackgroundColor: '#F97316',
                        pointBorderColor: isDarkMode ? '#1F2937' : '#ffffff',
                        pointHoverBackgroundColor: isDarkMode ? '#1F2937' : '#ffffff',
                        pointHoverBorderColor: '#F97316',
                        data: [],
                        yAxisID: 'yPm25',
                        fill: true,
                        borderWidth: 2.5,
                        tension: 0.4,
                        pointRadius: 2,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Naznaz Area',
                        borderColor: '#3B82F6',
                        backgroundColor: gradientNaznaz,
                        pointBackgroundColor: '#3B82F6',
                        pointBorderColor: isDarkMode ? '#1F2937' : '#ffffff',
                        pointHoverBackgroundColor: isDarkMode ? '#1F2937' : '#ffffff',
                        pointHoverBorderColor: '#3B82F6',
                        data: [],
                        yAxisID: 'yPm25',
                        fill: true,
                        borderWidth: 2.5,
                        tension: 0.4,
                        pointRadius: 2,
                        pointHoverRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                    axis: 'x'
                },
                plugins: {
                    tooltip: {
                        enabled: true,
                        backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.9)' : 'rgba(15, 23, 42, 0.9)',
                        titleColor: isDarkMode ? '#E5E7EB' : '#E2E8F0',
                        bodyColor: isDarkMode ? '#D1D5DB' : '#94A3B8',
                        titleFont: { weight: 'bold', size: 14 },
                        bodyFont: { size: 12 },
                        padding: 12, boxPadding: 6, cornerRadius: 6,
                        displayColors: true, usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    const unit = ' μg/m³';
                                    label += `${context.parsed.y.toFixed(1)}${unit}`;
                                }
                                return label;
                            },
                             title: function(tooltipItems) {
                                 const date = new Date(tooltipItems[0].parsed.x);
                                 return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short'});
                             }
                        }
                    },
                    legend: {
                        position: 'bottom', align: 'center',
                        labels: {
                            boxWidth: 12, boxHeight: 12, padding: 20,
                            color: titleColor,
                            font: { size: 13, weight: '500' },
                            usePointStyle: true, pointStyle: 'circle'
                        }
                    },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'xy',
                            threshold: 5,
                        },
                        zoom: {
                            wheel: {
                                enabled: true,
                            },
                            pinch: {
                                enabled: true,
                            },
                            mode: 'xy',
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'hour',
                            tooltipFormat: 'MMM d, HH:mm',
                            displayFormats: { hour: 'HH:mm', day: 'MMM d' }
                        },
                        grid: { display: false },
                        ticks: {
                            color: textColor,
                            major: { enabled: true },
                            font: { size: 11 },
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 10
                        }
                    },
                    yPm25: {
                        type: 'linear', position: 'left', beginAtZero: true,
                        title: { display: true, text: 'PM2.5 (μg/m³)', color: titleColor, font: { size: 12, weight: '600' }},
                        grid: { color: gridColor, drawBorder: false },
                        ticks: { color: textColor, font: { size: 11 }, padding: 5 }
                    }
                }
            }
        });
        console.log("Main trend chart initialized with zoom plugin.");
        return true;
    } catch (error) {
        console.error('Error initializing charts:', error);
        showError('Could not initialize charts: ' + error.message);
        return false;
    }
}

// This is the CORRECTED and CONSOLIDATED updateCharts function
function updateCharts(processedData) {
    console.log('Updating charts with time range:', currentTimeRange);
    if (!mainChart) {
        console.error('Main chart is not initialized. Cannot update.'); return;
    }

    const now = new Date();
    const timeLimit = timeRanges[currentTimeRange];
    const isDarkMode = document.documentElement.classList.contains('dark');

    const filterAndMapData = (dataArray) => {
        return (dataArray || [])
            .filter(reading => reading.timestamp instanceof Date && !isNaN(reading.timestamp) && (now - reading.timestamp) <= timeLimit && reading.pm25 !== null)
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(reading => ({ x: reading.timestamp, y: parseFloat(reading.pm25) }));
    };

    const chartDataMakhmor = filterAndMapData(processedData['makhmor-road']);
    const chartDataNaznaz = filterAndMapData(processedData['naznaz-area']);

    console.log(`Chart points - Makhmor Road: ${chartDataMakhmor.length}, Naznaz Area: ${chartDataNaznaz.length}`);

    mainChart.data.datasets[0].data = chartDataMakhmor;
    mainChart.data.datasets[1].data = chartDataNaznaz;
    // Ensure label for Naznaz is correctly set if it was modified elsewhere (it was in the removed duplicate)
    mainChart.data.datasets[1].label = 'Naznaz Area';


    let pointRadiusValue = 2;
    let pointHoverRadiusValue = 5;

    if (currentTimeRange === '7d') {
        pointRadiusValue = 2;
        pointHoverRadiusValue = 4;
    } else if (currentTimeRange === '30d') {
        pointRadiusValue = 1.5;
        pointHoverRadiusValue = 4;
    }

    mainChart.data.datasets.forEach(dataset => {
        dataset.pointBorderColor = isDarkMode ? '#1F2937' : '#ffffff';
        dataset.pointHoverBackgroundColor = isDarkMode ? '#1F2937' : '#ffffff';
        dataset.pointRadius = pointRadiusValue;
        dataset.pointHoverRadius = pointHoverRadiusValue;
    });

    let timeUnit = 'hour';
    let maxTicksLimit = 10;
    if (currentTimeRange === '7d') {
        timeUnit = 'day';
        maxTicksLimit = 7;
    } else if (currentTimeRange === '30d') {
        timeUnit = 'day';
        maxTicksLimit = 10;
    }
    mainChart.options.scales.x.time.unit = timeUnit;
    mainChart.options.scales.x.ticks.maxTicksLimit = maxTicksLimit;


    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0';
    const tickColor = isDarkMode ? '#9CA3AF' : '#64748B';
    const titleColor = isDarkMode ? '#F3F4F6' : '#475569';

    mainChart.options.scales.x.ticks.color = tickColor;
    mainChart.options.scales.yPm25.ticks.color = tickColor;
    mainChart.options.scales.yPm25.grid.color = gridColor;
    mainChart.options.scales.yPm25.title.color = titleColor;
    mainChart.options.plugins.legend.labels.color = titleColor;
    mainChart.options.plugins.tooltip.backgroundColor = isDarkMode ? 'rgba(17, 24, 39, 0.9)' : 'rgba(15, 23, 42, 0.9)';
    mainChart.options.plugins.tooltip.titleColor = isDarkMode ? '#E5E7EB' : '#E2E8F0';
    mainChart.options.plugins.tooltip.bodyColor = isDarkMode ? '#D1D5DB' : '#94A3B8';

    // Reset zoom/pan when data or time range changes to show the full new range
    // This call is important as a fallback if updateCharts is called by something other than setTimeRange
    if (mainChart.resetZoom) {
        mainChart.resetZoom('none');
        console.log('Chart zoom reset during updateCharts.');
    }

    mainChart.update();
}

// This is the CORRECTED and CONSOLIDATED setTimeRange function
function setTimeRange(range) {
    console.log('Setting time range to:', range);
    document.querySelectorAll('.time-range-btn').forEach(btn => {
        const btnRange = btn.getAttribute('data-range');
        if (btnRange === range) {
            btn.classList.remove('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200', 'dark:bg-gray-700', 'dark:text-gray-300', 'dark:hover:bg-gray-600');
            btn.classList.add('bg-orange-500', 'text-white', 'shadow-md');
        } else {
            btn.classList.remove('bg-orange-500', 'text-white', 'shadow-md');
            if (document.documentElement.classList.contains('dark')) {
                btn.classList.add('dark:bg-gray-700', 'dark:text-gray-300', 'dark:hover:bg-gray-600');
            } else {
                btn.classList.add('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');
            }
        }
    });
    currentTimeRange = range;

    // Reset zoom when the time range button is clicked BEFORE fetching new data
    if (mainChart && typeof mainChart.resetZoom === 'function') {
        mainChart.resetZoom('none');
        console.log('Chart zoom reset due to time range change.');
    } else {
        console.warn('mainChart or mainChart.resetZoom is not available for reset in setTimeRange.');
    }

    refreshData().catch(error => {
        console.error('Error refreshing data after time range change:', error);
        showError('Failed to update data for new time range: ' + error.message);
    });
}


function setupEventListeners() {
    document.querySelectorAll('.time-range-btn').forEach(button => {
        button.addEventListener('click', () => {
            const range = button.getAttribute('data-range');
            if (range) setTimeRange(range);
        });
    });

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    } else {
        console.warn("Dark mode toggle button not found.");
    }

    if (locationFilterElement) {
        locationFilterElement.addEventListener('change', () => {
            currentPage = 1;
            updateDataTable();
        });
    }

    if (prevPageButton) {
        prevPageButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updateDataTable();
            }
        });
    }

    if (nextPageButton) {
        nextPageButton.addEventListener('click', () => {
             let filteredDataLength = allReadings.length;
             const locationFilter = locationFilterElement ? locationFilterElement.value : 'all';
             if (locationFilter === 'makhmor-road') filteredDataLength = makhmorRoadData.length;
             else if (locationFilter === 'naznaz-area') filteredDataLength = naznazAreaData.length;
             const totalPages = Math.ceil(filteredDataLength / itemsPerPage);
             if (currentPage < totalPages) {
                currentPage++;
                updateDataTable();
            }
        });
    }
}

function updateDataTable() {
    console.log('Updating data table/cards for page:', currentPage);

    let dataToDisplay = [];
    const locationFilter = locationFilterElement ? locationFilterElement.value : 'all';

    if (locationFilter === 'makhmor-road') dataToDisplay = makhmorRoadData;
    else if (locationFilter === 'naznaz-area') dataToDisplay = naznazAreaData;
    else dataToDisplay = allReadings;

    const totalItems = dataToDisplay.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    currentPage = Math.max(1, Math.min(currentPage, totalPages || 1));

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedData = dataToDisplay.slice(startIndex, endIndex);

    if (pageInfoElement) {
        pageInfoElement.textContent = totalItems > 0 ? `Showing ${startIndex + 1}-${endIndex} of ${totalItems}` : 'Showing 0-0 of 0';
    }

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

    if (readingsTableBody) readingsTableBody.innerHTML = '';
    if (readingsCards) readingsCards.innerHTML = '';

    if (paginatedData.length === 0) {
        const emptyMessage = 'No data available for this filter.';
        if (readingsTableBody) {
            readingsTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-sm text-center text-gray-500 dark:text-gray-400">${emptyMessage}</td></tr>`;
        }
        if (readingsCards) {
            readingsCards.innerHTML = `<div class="text-center text-gray-500 dark:text-gray-400 py-4">${emptyMessage}</div>`;
        }
        return;
    }

    paginatedData.forEach((reading) => {
        const pm25 = reading.pm25 !== null ? parseFloat(reading.pm25) : null;
        const timestamp = reading.timestamp;
        const locationId = Object.keys(locationMapping).find(key => reading.Location === key) ? locationMapping[reading.Location] :
                           (reading.Location === "Makhmor Road" ? 'makhmor-road' : (reading.Location === "Naznaz Area" ? 'naznaz-area' : 'Unknown'));
        const displayName = locationId === 'makhmor-road' ? 'Makhmor Road' : (locationId === 'naznaz-area' ? 'Naznaz Area' : reading.Location);
        const shortDisplayName = locationId === 'makhmor-road' ? 'Makhmor Rd' : (locationId === 'naznaz-area' ? 'Naznaz Area' : reading.Location);
        const statusInfo = getAirQualityStatus(pm25);

        if (readingsTableBody) {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${reading.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${pm25 !== null && pm25 > 55.4 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}">${pm25 !== null ? pm25.toFixed(1) : '--'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${timestamp instanceof Date && !isNaN(timestamp) ? formatDateTime(timestamp) : 'Invalid Date'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${displayName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusInfo.className}">
                        ${statusInfo.status}
                    </span>
                </td>
            `;
            readingsTableBody.appendChild(row);
        }

        if (readingsCards) {
            const card = document.createElement('div');
            card.className = 'neo-card p-4 mb-3';
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <span class="text-xs text-gray-400 dark:text-gray-500">ID: ${reading.id}</span>
                        <div class="mt-1 flex items-center">
                            <span class="text-xl font-bold ${pm25 !== null && pm25 > 55.4 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}">${pm25 !== null ? pm25.toFixed(1) : '--'}</span>
                            <span class="ml-1 text-sm text-gray-500 dark:text-gray-400">μg/m³</span>
                        </div>
                    </div>
                    <span class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusInfo.className}">
                        ${statusInfo.status}
                    </span>
                </div>
                <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>${timestamp instanceof Date && !isNaN(timestamp) ? formatDateTime(timestamp) : 'Invalid Date'}</span>
                    <span class="font-medium">${shortDisplayName}</span>
                </div>
            `;
            readingsCards.appendChild(card);
        }
    });
}

function formatDateTime(date) {
    if (!(date instanceof Date) || isNaN(date)) return 'Invalid Date';
    try {
        return date.toLocaleString([], {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        });
    } catch (e) {
        console.error('Error formatting date:', e);
        return date.toString();
    }
}

function getTimeAgo(date) {
    if (!(date instanceof Date) || isNaN(date)) return 'Invalid date';
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function updateAveragesDisplay() {
    ['makhmor-road', 'naznaz-area'].forEach(locationId => {
        const detailPrefix = locationId === 'makhmor-road' ? 'location1' : 'naznaz';
        Object.keys(timeRanges).forEach(range => {
            const avgData = averages[locationId] ? averages[locationId][range] : { pm25: 0, humidity: 0 };
            const elementId = `${detailPrefix}-${range}-avg`;
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = `${avgData.pm25.toFixed(1)} <span class="text-xs text-gray-400 dark:text-gray-500">μg/m³</span>`;
            }
        });
    });
}

// MODIFIED: Function to display 7-day daily predictions
function updatePredictionsDisplay() {
     ['makhmor-road', 'naznaz-area'].forEach(locationId => {
         const detailPrefix = locationId === 'makhmor-road' ? 'location1' : 'naznaz';
         const dailyPredictionsArray = predictions[locationId]; // This is now an array
         const elementId = `${detailPrefix}-prediction`;
         const element = document.getElementById(elementId);

         if (element) {
             if (dailyPredictionsArray && Array.isArray(dailyPredictionsArray) && dailyPredictionsArray.length === 7) {
                 let htmlContent = `<div class="text-xs uppercase text-gray-500 mb-1">7-Day PM2.5 Forecast (Daily Avg):</div>`;
                 htmlContent += '<ul class="space-y-0.5 text-sm">';

                 dailyPredictionsArray.forEach(dailyPred => {
                     htmlContent += `
                        <li class="flex justify-between items-center py-0.5">
                            <span class="text-gray-700 dark:text-gray-300">${dailyPred.dayName}, ${dailyPred.date}:</span>
                            <span class="font-semibold ${dailyPred.pm25 === null ? 'text-gray-400 dark:text-gray-500' : 'text-blue-600 dark:text-blue-400'}">
                                ${dailyPred.pm25 !== null ? dailyPred.pm25.toFixed(1) + ' μg/m³' : 'N/A'}
                            </span>
                        </li>`;
                 });
                 htmlContent += '</ul>';
                 element.innerHTML = htmlContent;
             } else {
                 element.innerHTML = '<div class="text-xs uppercase text-gray-500 mb-1">7-Day PM2.5 Forecast (Daily Avg):</div><div class="text-sm text-gray-500 dark:text-gray-400">Prediction data unavailable.</div>';
             }
         }
     });
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM fully loaded and parsed.');
    try {
        console.log('Starting dashboard initialization process...');
        await initDashboard();
    } catch (error) {
        console.error('Critical error during initialization sequence:', error);
        const bodyElement = document.querySelector('body');
        if (bodyElement) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background-color:#ef4444;color:white;padding:10px;text-align:center;z-index:10000;';
            errorDiv.textContent = `FATAL ERROR: Dashboard could not initialize. ${error.message}. Please check console and refresh.`;
            bodyElement.prepend(errorDiv);
        }
        showError('FATAL ERROR: Dashboard could not initialize. Check console.');
    }
});