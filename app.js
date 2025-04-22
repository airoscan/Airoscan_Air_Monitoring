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
let location1Chart;
let location2Chart;
let humidityChart;

// Constants
const timeRanges = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
};

let currentTimeRange = '24h';
let allReadings = [];
let location1Data = [];
let location2Data = [];
let currentPage = 1;
const itemsPerPage = 10;

// Global variables for both Firebase and Supabase implementation
let averages = {
    location1: {
        '24h': { pm25: 0, humidity: 0 },
        '7d': { pm25: 0, humidity: 0 },
        '30d': { pm25: 0, humidity: 0 }
    },
    location2: {
        '24h': { pm25: 0, humidity: 0 },
        '7d': { pm25: 0, humidity: 0 },
        '30d': { pm25: 0, humidity: 0 }
    }
};

let predictions = {
    location1: { pm25: null, confidence: null },
    location2: { pm25: null, confidence: null }
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

// Function to calculate averages for a location
function calculateAverages(locationData) {
    const now = new Date();
    const result = {
        '24h': { pm25: 0, humidity: 0 },
        '7d': { pm25: 0, humidity: 0 },
        '30d': { pm25: 0, humidity: 0 }
    };

    Object.keys(timeRanges).forEach(range => {
        const timeLimit = timeRanges[range];
        const relevantData = locationData.filter(reading => 
            (now - new Date(reading.timestamp)) <= timeLimit
        );

        if (relevantData.length > 0) {
            result[range].pm25 = relevantData.reduce((sum, reading) => 
                sum + reading.pm25, 0) / relevantData.length;
            result[range].humidity = relevantData.reduce((sum, reading) => 
                sum + (reading.humidity || 0), 0) / relevantData.length;
        }
    });

    return result;
}

// Function to predict PM2.5 levels (simple linear regression)
function predictPM25Levels(locationData) {
    if (locationData.length < 24) return { pm25: null, confidence: null };

    const recent24h = locationData
        .filter(reading => new Date(reading.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000))
        .map(reading => reading.pm25);

    if (recent24h.length < 12) return { pm25: null, confidence: null };

    // Simple trend-based prediction
    const trend = recent24h[recent24h.length - 1] - recent24h[0];
    const prediction = recent24h[recent24h.length - 1] + (trend / recent24h.length);
    
    // Calculate confidence based on data variance
    const mean = recent24h.reduce((a, b) => a + b) / recent24h.length;
    const variance = recent24h.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recent24h.length;
    const confidence = Math.max(0, Math.min(100, 100 - (variance / mean) * 10));

    return {
        pm25: Math.max(0, prediction),
        confidence: confidence
    };
}

// DOM Elements
const currentPM25Element = document.getElementById('current-pm25');
const airQualityStatusElement = document.getElementById('air-quality-status');
const averagePM25Element = document.getElementById('average-pm25');
const lastUpdatedElement = document.getElementById('last-updated');
const timeAgoElement = document.getElementById('time-ago');
const location1NameElement = document.getElementById('location1-name');
const location1PM25Element = document.getElementById('location1-pm25');
const location1TimestampElement = document.getElementById('location1-timestamp');
const location2NameElement = document.getElementById('location2-name');
const location2PM25Element = document.getElementById('location2-pm25');
const location2TimestampElement = document.getElementById('location2-timestamp');
const readingsTableBody = document.getElementById('readings-table-body');
const pageInfoElement = document.getElementById('page-info');
const prevPageButton = document.getElementById('prev-page');
const nextPageButton = document.getElementById('next-page');
const locationFilterElement = document.getElementById('location-filter');
const btn24h = document.getElementById('btn-24h');
const btn7d = document.getElementById('btn-7d');
const btn30d = document.getElementById('btn-30d');
const currentTimeElement = document.getElementById('current-time');
// Use the correct chart element ID that exists in the HTML
// const pm25TrendChart = document.getElementById('pm25-trend-chart');

// Add the following functions to your app.js file, after the initializeSupabase function
// These updates will resolve the initialization errors and data display issues

// Function to refresh dashboard data
async function refreshData() {
    try {
        console.log('Refreshing dashboard data...');
        
        // Fetch the latest readings from Supabase
        const readings = await fetchLatestReadings();
        
        if (!readings || readings.length === 0) {
            console.warn('No readings found in the database');
            showError('No data available. Please check database connection.');
            return [];
        }
        
        // Process the readings
        console.log(`Processing ${readings.length} readings`);
        
        // Update globals
        allReadings = readings;
        
        // Split data by location
        location1Data = readings.filter(reading => reading.location === 'Makhmor Road');
        location2Data = readings.filter(reading => reading.location === 'Namaz Area');
        
        // Calculate averages and predictions
        if (location1Data.length > 0) {
            averages.location1 = calculateAverages(location1Data);
            predictions.location1 = predictPM25Levels(location1Data);
            
            // Update location 1 UI elements
            updateLocationDisplay('Makhmor Road', location1Data[0]);
        }
        
        if (location2Data.length > 0) {
            averages.location2 = calculateAverages(location2Data);
            predictions.location2 = predictPM25Levels(location2Data);
            
            // Update location 2 UI elements
            updateLocationDisplay('Namaz Area', location2Data[0]);
        }
        
        // Update UI components
        updateCharts();
        updateDataTable();
        
        // Update map if available
        if (typeof window.updateMapMarkers === 'function') {
            const locations = [
                { lat: 35.7749, lng: 43.5883, name: 'Makhmor Road', reading: location1Data[0] },
                { lat: 36.1901, lng: 44.0091, name: 'Namaz Area', reading: location2Data[0] }
            ];
            window.updateMapMarkers(locations);
        }
        
        // Display success message in console
        console.log('Dashboard data refreshed successfully');
        
        return readings;
    } catch (error) {
        console.error('Error refreshing data:', error);
        showError(`Failed to refresh data: ${error.message}`);
        return [];
    }
}

// Function to update a location's display elements
function updateLocationDisplay(locationName, reading) {
    if (!reading) return;
    
    try {
        const locationId = locationName.toLowerCase().replace(/\s+/g, '-');
        
        // Update PM2.5 value and status
        const pm25Element = document.getElementById(`${locationId}-current-pm25`);
        if (pm25Element) {
            pm25Element.textContent = reading.pm25.toFixed(1);
        }
        
        // Update air quality status based on PM2.5 value
        updateAirQualityStatus(reading.pm25, locationId);
        
        // Update last updated timestamp
        const statusTimeElement = document.getElementById(`${locationId}-status-time`);
        if (statusTimeElement) {
            const formattedTime = formatDateTime(reading.timestamp);
            statusTimeElement.textContent = `Last updated: ${formattedTime}`;
        }
        
        // Update main location data elements
        const nameElement = document.getElementById(`${locationId.replace('-', '')}-name`);
        if (nameElement) {
            nameElement.textContent = locationName;
        }
        
        const pm25ValueElement = document.getElementById(`${locationId.replace('-', '')}-pm25`);
        if (pm25ValueElement) {
            pm25ValueElement.textContent = `${reading.pm25.toFixed(1)} μg/m³`;
        }
        
        const humidityElement = document.getElementById(`${locationId.replace('-', '')}-humidity`);
        if (humidityElement && reading.humidity !== undefined) {
            humidityElement.textContent = `${reading.humidity.toFixed(1)}%`;
        }
        
        const timestampElement = document.getElementById(`${locationId.replace('-', '')}-timestamp`);
        if (timestampElement) {
            timestampElement.textContent = formatDateTime(reading.timestamp);
        }
        
        // Update averages display
        Object.keys(timeRanges).forEach(range => {
            const avgElement = document.getElementById(`${locationId.replace('-', '')}-${range}-avg`);
            if (avgElement && averages[locationId.replace('-', '')] && averages[locationId.replace('-', '')][range]) {
                const avgData = averages[locationId.replace('-', '')][range];
                avgElement.textContent = `PM2.5: ${avgData.pm25.toFixed(1)} μg/m³ | Humidity: ${avgData.humidity.toFixed(1)}%`;
            }
        });
        
        // Update predictions if available
        const predictionElement = document.getElementById(`${locationId.replace('-', '')}-prediction`);
        if (predictionElement && predictions[locationId.replace('-', '')] && predictions[locationId.replace('-', '')].pm25 !== null) {
            const prediction = predictions[locationId.replace('-', '')];
            predictionElement.innerHTML = `
                <div class="prediction-value">
                    Predicted PM2.5: ${prediction.pm25.toFixed(1)} μg/m³
                    <div class="confidence-indicator">
                        Confidence: ${prediction.confidence.toFixed(1)}%
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error(`Error updating ${locationName} display:`, error);
    }
}

// Function to set default values when no data is available
function updateDefaultValues(locationId) {
    try {
        // Convert dash-style ID to no-dash style if needed
        const dashStyle = locationId.includes('-') ? locationId : locationId.replace(/([A-Z])/g, '-$1').toLowerCase();
        const noDashStyle = locationId.includes('-') ? locationId.replace(/-/g, '') : locationId;
        
        // Set PM2.5 to '--'
        const pm25Element = document.getElementById(`${dashStyle}-current-pm25`);
        if (pm25Element) {
            pm25Element.textContent = '--';
        }
        
        // Set status to 'Unknown'
        const statusElement = document.getElementById(`${dashStyle}-air-quality-status`);
        if (statusElement) {
            statusElement.textContent = 'Unknown';
            statusElement.className = 'inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800';
        }
        
        // Set last updated to '--'
        const statusTimeElement = document.getElementById(`${dashStyle}-status-time`);
        if (statusTimeElement) {
            statusTimeElement.textContent = 'No data available';
        }
        
        // Update main elements
        const pm25ValueElement = document.getElementById(`${noDashStyle}-pm25`);
        if (pm25ValueElement) {
            pm25ValueElement.textContent = '-- μg/m³';
        }
        
        const humidityElement = document.getElementById(`${noDashStyle}-humidity`);
        if (humidityElement) {
            humidityElement.textContent = '--%';
        }
        
        const timestampElement = document.getElementById(`${noDashStyle}-timestamp`);
        if (timestampElement) {
            timestampElement.textContent = '--:--';
        }
        
        // Clear averages
        Object.keys(timeRanges).forEach(range => {
            const avgElement = document.getElementById(`${noDashStyle}-${range}-avg`);
            if (avgElement) {
                avgElement.textContent = '--';
            }
        });
        
        // Clear prediction
        const predictionElement = document.getElementById(`${noDashStyle}-prediction`);
        if (predictionElement) {
            predictionElement.textContent = 'Not enough data for prediction';
        }
    } catch (error) {
        console.error(`Error setting default values for ${locationId}:`, error);
    }
}

// Initialize Supabase client
async function initializeSupabase() {
    try {
        if (!window.dbConfig) {
            throw new Error('Database configuration not found. Make sure db-config.js is loaded.');
        }

        // Check if we have an API key
        if (!window.dbConfig.supabaseKey) {
            throw new Error('Supabase API key not found. Please set your API key first.');
        }

        // Initialize the client
        if (!window.dbConfig.client) {
            const initialized = window.dbConfig.initClient();
            if (!initialized) {
                throw new Error('Failed to initialize Supabase client');
            }
        }

        // Test the connection
        const { data, error } = await window.dbConfig.client
            .from(window.dbConfig.airQualityTable)
            .select('id')
            .limit(1);

        if (error) {
            throw new Error(`Database connection test failed: ${error.message}`);
        }

        console.log('Database connection test successful');
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        showError(`Database initialization failed: ${error.message}`);
        return false;
    }
}

async function fetchLatestReadings() {
    try {
        if (!window.dbConfig.client) {
            throw new Error('Supabase client not initialized');
        }

        console.log('Fetching latest readings...');
        const { data, error } = await window.dbConfig.client
            .from(window.dbConfig.airQualityTable)
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(100);

        if (error) {
            throw new Error(`Failed to fetch readings: ${error.message}`);
        }

        if (!data || data.length === 0) {
            console.warn('No readings found in the database');
            showError('No sensor readings available in the database');
            return [];
        }

        console.log(`Fetched ${data.length} readings successfully`);
        
        // Update sensor status for each location
        const locations = [...new Set(data.map(reading => reading.location))];
        locations.forEach(location => {
            const latestReading = data.find(reading => reading.location === location);
            if (latestReading) {
                window.sensorStatus.updateLastUpdate(location, latestReading.timestamp);
            }
        });

        return data;
    } catch (error) {
        console.error('Error fetching readings:', error);
        showError(`Failed to fetch sensor readings: ${error.message}`);
        return [];
    }
}

// Initialize the dashboard
async function initDashboard() {
    try {
        console.log('Initializing dashboard...');
        
        // Initialize Supabase first
        const supabaseInitialized = await initializeSupabase();
        if (!supabaseInitialized) {
            throw new Error('Failed to initialize database connection');
        }

        // Initialize sensor status tracking
        if (window.sensorStatus && typeof window.sensorStatus.init === 'function') {
            window.sensorStatus.init();
        } else {
            console.warn('Sensor status tracking not available');
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize charts
        initCharts();
        
        // Initialize the map
        initMap();
        
        // Fetch initial data
        await fetchInitialData();
        
        // Start periodic updates
        setInterval(refreshData, 60000); // Update every minute
        
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError('Failed to initialize dashboard: ' + error.message);
    }
}

// Initialize charts
function initCharts() {
    const chartElement = document.getElementById('air-quality-chart');
    if (!chartElement) {
        console.error('Chart element not found');
        return;
    }

    const ctx = chartElement.getContext('2d');
    if (!ctx) {
        console.error('Failed to get chart context');
        return;
    }

    // Set Chart.js defaults
    Chart.defaults.font.family = "'Manrope', sans-serif";
    Chart.defaults.color = '#94A3B8';
    Chart.defaults.elements.line.tension = 0.4;
    Chart.defaults.elements.line.borderWidth = 2;
    Chart.defaults.elements.point.radius = 0;
    Chart.defaults.elements.point.hoverRadius = 5;

    // Create gradient for background
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(255, 122, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 122, 0, 0)');

    // Initialize main chart
    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Makhmor Road',
                    borderColor: '#F97316',
                    backgroundColor: gradient,
                    data: [],
                    yAxisID: 'pm25',
                    borderWidth: 3
                },
                {
                    label: 'Namaz Area',
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    data: [],
                    yAxisID: 'pm25',
                    borderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#E2E8F0',
                    bodyColor: '#94A3B8',
                    titleFont: {
                        weight: 'bold',
                    },
                    bodyFont: {
                        size: 12,
                    },
                    padding: 12,
                    boxPadding: 6,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y} μg/m³`;
                        }
                    }
                },
                legend: {
                    position: 'top',
                    align: 'start',
                    labels: {
                        boxWidth: 12,
                        boxHeight: 12,
                        padding: 20,
                        color: '#1F2937',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'HH:mm',
                            day: 'MMM D'
                        }
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#94A3B8'
                    }
                },
                pm25: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'PM2.5 (μg/m³)',
                        color: '#94A3B8'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#94A3B8'
                    }
                }
            }
        }
    });
}

// Update the dashboard with the latest data
async function updateDashboard() {
    try {
        // Fetch the latest readings from Supabase
        const { data: readings, error } = await supabase
            .from('sensor_data')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(48); // Get last 48 readings (24 hours assuming 30-minute intervals)

        if (error) {
            showError('Failed to fetch readings from database: ' + error.message);
            console.error('Error fetching readings:', error);
            return;
        }

        if (!readings || readings.length === 0) {
            showError('No readings available from the sensors. Please check sensor connectivity.');
            console.log('No readings available');
            // Set default values for both locations
            updateDefaultValues('location1');
            updateDefaultValues('location2');
            return;
        }

        // Process readings for both locations
        const location1Readings = readings.filter(reading => reading.location === 'Makhmor Road');
        const location2Readings = readings.filter(reading => reading.location === 'Namaz Area');

        try {
            // Update Location 1 (Makhmor Road)
            if (location1Readings.length > 0) {
                updateLocationData('location1', location1Readings);
            } else {
                showError('No readings available for Makhmor Road sensor');
                updateDefaultValues('location1');
            }
        } catch (err) {
            showError('Error updating Makhmor Road dashboard: ' + err.message);
            console.error('Error updating location 1:', err);
            updateDefaultValues('location1');
        }

        try {
            // Update Location 2 (Namaz Area)
            if (location2Readings.length > 0) {
                updateLocationData('location2', location2Readings);
            } else {
                showError('No readings available for Namaz Area sensor');
                updateDefaultValues('location2');
            }
        } catch (err) {
            showError('Error updating Namaz Area dashboard: ' + err.message);
            console.error('Error updating location 2:', err);
            updateDefaultValues('location2');
        }

    } catch (err) {
        showError('Failed to update dashboard: ' + err.message);
        console.error('Error in updateDashboard:', err);
        // Set default values for both locations
        updateDefaultValues('location1');
        updateDefaultValues('location2');
    }
}

// Update air quality status with location-specific elements
function updateAirQualityStatus(pm25, location) {
    let status, bgColor, textColor;
    
    if (pm25 <= 12) {
        status = 'Good';
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
    } else if (pm25 <= 35.4) {
        status = 'Moderate';
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
    } else if (pm25 <= 55.4) {
        status = 'Unhealthy for Sensitive Groups';
        bgColor = 'bg-orange-100';
        textColor = 'text-orange-800';
    } else if (pm25 <= 150.4) {
        status = 'Unhealthy';
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
    } else if (pm25 <= 250.4) {
        status = 'Very Unhealthy';
        bgColor = 'bg-purple-100';
        textColor = 'text-purple-800';
    } else {
        status = 'Hazardous';
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
    }
    
    const statusElement = document.getElementById(`${location}-air-quality-status`);
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = `inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${bgColor} ${textColor}`;
    }
}

// Helper function to format timestamp
function formatTimestamp(date) {
    return date.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        month: 'short',
        day: 'numeric'
    });
}

// Helper function to get time ago
function getTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// Update location specific data
function updateLocationData(data) {
    // Sort data by location
    const location1Data = data.filter(reading => reading.location === 'Makhmor Road');
    const location2Data = data.filter(reading => reading.location === 'Namaz Area');
    
    // Update Location 1 (Makhmor Road)
    if (location1Data.length > 0) {
        const latestL1 = location1Data[0];
        document.getElementById('location1-name').textContent = 'Makhmor Road';
        document.getElementById('location1-pm25').textContent = `${latestL1.pm25.toFixed(1)} μg/m³`;
        document.getElementById('location1-timestamp').textContent = formatTimestamp(latestL1.timestamp);
    }
    
    // Update Location 2 (Namaz Area)
    if (location2Data.length > 0) {
        const latestL2 = location2Data[0];
        document.getElementById('location2-name').textContent = 'Namaz Area';
        document.getElementById('location2-pm25').textContent = `${latestL2.pm25.toFixed(1)} μg/m³`;
        document.getElementById('location2-timestamp').textContent = formatTimestamp(latestL2.timestamp);
    }

    // Update map markers if the map is initialized
    if (typeof window.updateMapMarkers === 'function') {
        const locations = [
            { lat: 35.7749, lng: 43.5883, name: 'Makhmor Road', reading: location1Data[0] },
            { lat: 36.1901, lng: 44.0091, name: 'Namaz Area', reading: location2Data[0] }
        ];
        window.updateMapMarkers(locations);
    }
}

// Format date and time
function formatDateTime(date) {
    if (!(date instanceof Date)) {
        // Try to convert to date if it's not already a Date object
        try {
            date = new Date(date);
        } catch (e) {
            console.error('Failed to parse date:', date);
            return 'Invalid Date';
        }
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
        console.error('Invalid date:', date);
        return 'Invalid Date';
    }
    
    try {
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error('Error formatting date:', e);
        return date.toString();
    }
}

// Update time ago text
function updateTimeAgo(timestamp) {
    if (!(timestamp instanceof Date)) {
        try {
            timestamp = new Date(timestamp);
        } catch (e) {
            console.error('Failed to parse timestamp:', timestamp);
            timeAgoElement.textContent = 'Unknown';
            return;
        }
    }
    
    if (isNaN(timestamp.getTime())) {
        console.error('Invalid timestamp:', timestamp);
        timeAgoElement.textContent = 'Unknown';
        return;
    }
    
    const now = new Date();
    const diff = now - timestamp;
    
    let timeAgo = '';
    if (diff < 60 * 1000) {
        timeAgo = 'Just now';
    } else if (diff < 60 * 60 * 1000) {
        const minutes = Math.floor(diff / (60 * 1000));
        timeAgo = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
    }
    
    timeAgoElement.textContent = timeAgo;
}

// Update data table
function updateDataTable() {
    console.log('Updating data table');
    
    let filteredData = [...allReadings];
    
    // Apply location filter
    const locationFilter = locationFilterElement.value;
    if (locationFilter === 'location1') {
        filteredData = location1Data;
    } else if (locationFilter === 'location2') {
        filteredData = location2Data;
    }
    
    // Ensure data is properly formatted
    filteredData = filteredData.map(reading => {
        const timestamp = reading.timestamp instanceof Date ? 
            reading.timestamp : new Date(reading.timestamp);
        
        const pm25 = parseFloat(reading.pm25);
        
        return {
            ...reading,
            timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
            pm25: isNaN(pm25) ? 0 : pm25
        };
    });
    
    console.log('Filtered data for table:', filteredData.length);
    
    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    // Update page info
    pageInfoElement.textContent = `Showing ${startIndex + 1}-${endIndex} of ${filteredData.length}`;
    
    // Enable/disable pagination buttons
    prevPageButton.disabled = currentPage === 1;
    prevPageButton.classList.toggle('opacity-50', currentPage === 1);
    nextPageButton.disabled = endIndex >= filteredData.length;
    nextPageButton.classList.toggle('opacity-50', endIndex >= filteredData.length);
    
    // Clear existing content
    if (readingsTableBody) {
        readingsTableBody.innerHTML = '';
    } else {
        console.warn('readingsTableBody element not found');
    }
    
    // Update cards for mobile
    const readingsCards = document.getElementById('readings-cards');
    if (readingsCards) {
        readingsCards.innerHTML = '';
    } else {
        console.warn('readingsCards element not found');
    }
    
    if (paginatedData.length === 0) {
        if (readingsTableBody) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="5" class="px-6 py-4 text-sm text-center text-gray-500">No data available</td>
            `;
            readingsTableBody.appendChild(emptyRow);
        }
        
        if (readingsCards) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-center text-gray-500 py-4';
            emptyMessage.textContent = 'No data available';
            readingsCards.appendChild(emptyMessage);
        }
        
        return;
    }
    
    paginatedData.forEach((reading) => {
        // Get status information
        const statusInfo = getStatusInfo(reading.pm25);
        
        // Create table row for desktop
        if (readingsTableBody) {
            const row = document.createElement('tr');
            row.classList.add('hover:bg-slate-750');
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">${reading.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">${reading.pm25.toFixed(1)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">${formatDateTime(reading.timestamp)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${reading.location}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${statusInfo.bgColor} ${statusInfo.textColor}">
                        ${statusInfo.status}
                    </span>
                </td>
            `;
            
            readingsTableBody.appendChild(row);
        }
        
        // Create card for mobile
        if (readingsCards) {
            const card = document.createElement('div');
            card.className = 'neo-card p-4 hover-lift';
            
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <span class="text-xs text-gray-400">ID: ${reading.id}</span>
                        <div class="mt-1 flex items-center">
                            <span class="text-xl font-bold text-gray-800">${reading.pm25.toFixed(1)}</span>
                            <span class="ml-1 text-sm text-gray-500">μg/m³</span>
                        </div>
                    </div>
                    <span class="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${statusInfo.bgColor} ${statusInfo.textColor}">
                        ${statusInfo.status}
                    </span>
                </div>
                <div class="flex justify-between text-xs">
                    <span class="text-gray-500">${formatDateTime(reading.timestamp)}</span>
                    <span class="text-gray-600">${simplifyLocation(reading.location)}</span>
                </div>
            `;
            
            readingsCards.appendChild(card);
        }
    });
}

// Helper function to get status info based on PM2.5 value
function getStatusInfo(pm25) {
    let status = '';
    let bgColor = '';
    let textColor = '';
    
    if (pm25 <= 12) {
        status = 'Good';
        bgColor = 'bg-green-500/30';
        textColor = 'text-green-700';
    } else if (pm25 <= 35.4) {
        status = 'Moderate';
        bgColor = 'bg-yellow-500/30';
        textColor = 'text-yellow-700';
    } else if (pm25 <= 55.4) {
        status = 'USG';
        bgColor = 'bg-orange-500/30';
        textColor = 'text-orange-700';
    } else if (pm25 <= 150.4) {
        status = 'Unhealthy';
        bgColor = 'bg-red-500/30';
        textColor = 'text-red-700';
    } else if (pm25 <= 250.4) {
        status = 'Very Unhealthy';
        bgColor = 'bg-purple-500/30';
        textColor = 'text-purple-700';
    } else {
        status = 'Hazardous';
        bgColor = 'bg-red-600/30';
        textColor = 'text-red-800';
    }
    
    return {
        status,
        bgColor,
        textColor
    };
}

// Helper function to simplify location names for mobile view
function simplifyLocation(location) {
    if (location.includes('Makhmor')) {
        return 'Makhmor Rd';
    } else if (location.includes('namaz')) {
        return 'Namaz Area';
    }
    return location;
}

// Update charts with the latest data
function updateCharts() {
    console.log('Updating charts with time range:', currentTimeRange);
    const now = new Date();
    const timeLimit = timeRanges[currentTimeRange];
    
    // Filter data based on time range
    const filteredLocation1Data = location1Data.filter(reading => {
        const readingTime = new Date(reading.timestamp);
        return (now - readingTime) <= timeLimit;
    }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const filteredLocation2Data = location2Data.filter(reading => {
        const readingTime = new Date(reading.timestamp);
        return (now - readingTime) <= timeLimit;
    }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    console.log(`Filtered data - Location 1: ${filteredLocation1Data.length}, Location 2: ${filteredLocation2Data.length}`);
    
    if (mainChart) {
        // Update datasets
        mainChart.data.datasets[0].data = filteredLocation1Data.map(reading => ({
            x: new Date(reading.timestamp),
            y: reading.pm25
        }));
        
        mainChart.data.datasets[1].data = filteredLocation2Data.map(reading => ({
            x: new Date(reading.timestamp),
            y: reading.pm25
        }));
        
        // Update chart
        mainChart.update();
    } else {
        console.error('Main chart not initialized');
    }
}

// Function to set time range
function setTimeRange(range) {
    console.log('Setting time range to:', range);
    
    // Update button states
    const timeRangeButtons = document.querySelectorAll('.time-range-btn');
    timeRangeButtons.forEach(btn => {
        btn.classList.remove('bg-orange-500', 'text-white');
        btn.classList.add('bg-gray-100', 'text-gray-600');
    });
    
    // Set active button
    const activeButton = document.querySelector(`[data-range="${range}"]`);
    if (activeButton) {
        activeButton.classList.remove('bg-gray-100', 'text-gray-600');
        activeButton.classList.add('bg-orange-500', 'text-white');
    }
    
    // Update current time range
    currentTimeRange = range;
    
    // Update chart configuration based on time range
    if (mainChart) {
        const timeUnit = range === '24h' ? 'hour' : 'day';
        mainChart.options.scales.x.time.unit = timeUnit;
        
        // Set display formats based on range
        switch (range) {
            case '24h':
                mainChart.options.scales.x.time.displayFormats = {
                    hour: 'HH:mm'
                };
                break;
            case '7d':
            case '30d':
                mainChart.options.scales.x.time.displayFormats = {
                    day: 'MMM D'
                };
                break;
        }
        
        // Update chart data for the new time range
        refreshData().catch(error => {
            console.error('Error refreshing data after time range change:', error);
            showError('Failed to update chart with new time range: ' + error.message);
        });
    }
}

// Setup event listeners
function setupEventListeners() {
    // Time range buttons
    document.querySelectorAll('.time-range-btn').forEach(button => {
        button.addEventListener('click', () => {
            const range = button.getAttribute('data-range');
            console.log(`${range} button clicked`);
            setTimeRange(range);
        });
    });

    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const refreshIcon = refreshBtn.querySelector('svg');
            if (refreshIcon) refreshIcon.classList.add('animate-spin');
            
            try {
                await refreshData();
                console.log('Data refreshed successfully');
            } catch (error) {
                console.error('Error refreshing data:', error);
                showError('Failed to refresh data: ' + error.message);
            } finally {
                if (refreshIcon) {
                    setTimeout(() => {
                        refreshIcon.classList.remove('animate-spin');
                    }, 500);
                }
            }
        });
    }
    
    // Location filter
    if (locationFilterElement) {
        locationFilterElement.addEventListener('change', () => {
            currentPage = 1;
            updateDataTable();
        });
    }
    
    // Pagination buttons
    if (prevPageButton && nextPageButton) {
        prevPageButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updateDataTable();
            }
        });
        
        nextPageButton.addEventListener('click', () => {
            const totalPages = Math.ceil(allReadings.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                updateDataTable();
            }
        });
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', initDashboard);

// Air Quality Dashboard - Database Connection

// We'll use the Supabase JavaScript client to connect to the PostgreSQL database
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize Supabase client
        if (!window.dbConfig || !window.dbConfig.supabaseKey) {
            throw new Error('Supabase configuration not found');
        }
        
        const supabase = window.supabase = createClient(
            window.dbConfig.supabaseUrl,
            window.dbConfig.supabaseKey
        );
        
        console.log('Supabase client initialized');
        
        // Initialize the dashboard components
        initDashboard();
        
        // Fetch initial data
        await fetchInitialData();
        
        // Set up real-time subscription
        setupRealtimeSubscription(supabase);
        
        // Update time display
        setInterval(() => {
            const now = new Date();
            if (currentTimeElement) {
                currentTimeElement.textContent = formatDateTime(now);
            }
        }, 1000);
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        // Display error to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative';
        errorDiv.role = 'alert';
        errorDiv.innerHTML = `
            <strong class="font-bold">Error!</strong>
            <span class="block sm:inline"> Failed to initialize dashboard. Please check your configuration.</span>
        `;
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
});

// PM2.5 Chart Initialization
let pm25Chart;

function initChart() {
    // Use the correct chart element ID that exists in the HTML
    const ctx = document.getElementById('air-quality-chart').getContext('2d');
    
    // Create gradient for chart
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(255, 122, 0, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 122, 0, 0.0)');
    
    pm25Chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Makhmor Road',
                    data: [],
                    borderColor: '#FF7A00',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#FF7A00'
                },
                {
                    label: 'Namaz Area',
                    data: [],
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#3B82F6'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 6,
                        color: '#94A3B8'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.8)',
                    titleColor: '#F3F4F6',
                    bodyColor: '#E5E7EB',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `PM2.5: ${context.parsed.y} μg/m³`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#94A3B8'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    },
                    ticks: {
                        color: '#94A3B8',
                        callback: function(value) {
                            return value + ' μg/m³';
                        }
                    }
                }
            }
        }
    });
}

// Initialize chart
initChart();

// Function to get PM2.5 quality status
function getPM25Status(value) {
    if (value <= 12) return { text: 'Good', color: '#10B981' };
    if (value <= 35.4) return { text: 'Moderate', color: '#FBBF24' };
    if (value <= 55.4) return { text: 'Unhealthy for Sensitive Groups', color: '#F59E0B' };
    if (value <= 150.4) return { text: 'Unhealthy', color: '#EF4444' };
    if (value <= 250.4) return { text: 'Very Unhealthy', color: '#8B5CF6' };
    return { text: 'Hazardous', color: '#7F1D1D' };
}

// Format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Update chart with new data
function updateChart(data) {
    // Process data for chart
    const timeLabels = [];
    const location1Data = [];
    const location2Data = [];
    
    // Filter and sort data for the last 24 hours
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentData = data.filter(reading => new Date(reading.timestamp) > yesterday);
    
    // Group by location and sort by timestamp
    const location1Readings = recentData
        .filter(reading => reading.location === 'Makhmor Road')
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const location2Readings = recentData
        .filter(reading => reading.location === 'Namaz Area')
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Get unique timestamps from both locations
    const timestamps = [...new Set([
        ...location1Readings.map(r => r.timestamp),
        ...location2Readings.map(r => r.timestamp)
    ])].sort();
    
    // Create time labels for chart (using only some points to avoid overcrowding)
    const step = Math.max(1, Math.floor(timestamps.length / 12)); // Aim for ~12 points on the chart
    
    for (let i = 0; i < timestamps.length; i += step) {
        const date = new Date(timestamps[i]);
        timeLabels.push(date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }));
        
        // Find readings closest to this timestamp for each location
        const l1Reading = location1Readings.find(r => r.timestamp === timestamps[i]);
        const l2Reading = location2Readings.find(r => r.timestamp === timestamps[i]);
        
        location1Data.push(l1Reading ? l1Reading.pm25 : null);
        location2Data.push(l2Reading ? l2Reading.pm25 : null);
    }
    
    // Update chart data
    pm25Chart.data.labels = timeLabels;
    pm25Chart.data.datasets[0].data = location1Data;
    pm25Chart.data.datasets[1].data = location2Data;
    pm25Chart.update();
}

// Function to initialize map
function initMap() {
    const map = L.map('map').setView([36.0, 43.8], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Store map instance globally
    window.airQualityMap = map;
    window.mapMarkers = [];
    
    // Initialize markers with no data
    const initialLocations = [
        { lat: 35.7749, lng: 43.5883, name: 'Makhmor Road', reading: null },
        { lat: 36.1901, lng: 44.0091, name: 'Namaz Area', reading: null }
    ];
    updateMapMarkers(initialLocations);
}

// Function to update map markers
window.updateMapMarkers = function(locations) {
    const map = window.airQualityMap;
    if (!map) {
        console.warn('Map not initialized');
        return;
    }
    
    // Clear existing markers
    if (window.mapMarkers) {
        window.mapMarkers.forEach(marker => marker.remove());
    }
    window.mapMarkers = [];
    
    // Add new markers
    locations.forEach(location => {
        const marker = createMarker(location, location.reading);
        marker.addTo(map);
        window.mapMarkers.push(marker);
    });
};

// Keep track of recent readings for each location
window.recentReadings = {
    location1: [],
    location2: []
};

// Function to update recent readings display
function updateRecentReadings(location, readings) {
    const locationId = location.toLowerCase().replace(/\s+/g, '');
    const container = document.getElementById(`${locationId}-updates`);
    if (!container) return;

    // Store the 5 most recent readings
    window.recentReadings[locationId] = readings
        .filter(reading => reading.location === location)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);

    // Update the display
    container.innerHTML = window.recentReadings[locationId]
        .map(reading => `
            <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                    <span class="font-medium">${reading.pm25.toFixed(1)} μg/m³</span>
                    <span class="text-xs text-gray-500 ml-2">${getPM25Status(reading.pm25).text}</span>
                </div>
                <div class="text-xs text-gray-500">${formatTimestamp(reading.timestamp)}</div>
            </div>
        `)
        .join('');

    // Update the map marker with the most recent reading
    if (window.recentReadings[locationId].length > 0) {
        const mostRecent = window.recentReadings[locationId][0];
        document.getElementById(`${locationId}-pm25`).textContent = `${mostRecent.pm25.toFixed(1)} PM2.5`;
        document.getElementById(`${locationId}-timestamp`).textContent = formatTimestamp(mostRecent.timestamp);
        if (window.updateMapData) {
            window.updateMapData();
        }
    }
}

// Modify the fetchInitialData function to include recent readings update
async function fetchInitialData() {
    console.log('Starting fetchInitialData...');
    try {
        console.log('Checking Supabase client:', window.dbConfig.supabase);
        
        if (!window.dbConfig || !window.dbConfig.supabase) {
            throw new Error('Supabase client not initialized');
        }

        console.log('Fetching data from sensor_data table...');
        const { data, error } = await window.dbConfig.supabase
            .from('sensor_data')
            .select('*')
            .order('timestamp', { ascending: false });

        console.log('Supabase response:', { data, error });

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            console.log('No data returned from Supabase');
            showError('No sensor data available');
            return;
        }

        console.log('Processing data for locations...');
        // Update recent readings for each location
        updateRecentReadings('Makhmor Road', data);
        updateRecentReadings('Namaz Area', data);

        // Update chart and other displays
        console.log('Updating chart...');
        updateChart(data);
        
        console.log('Updating dashboard...');
        updateDashboard(data);
        
        // Process data for locations
        const location1Data = data.filter(reading => reading.location === 'Makhmor Road');
        const location2Data = data.filter(reading => reading.location === 'Namaz Area');
        
        console.log('Filtered location data:', {
            'Makhmor Road': location1Data.length,
            'Namaz Area': location2Data.length
        });

        // Update map markers
        if (location1Data.length > 0 || location2Data.length > 0) {
            const locations = [
                { lat: 35.7749, lng: 43.5883, name: 'Makhmor Road', reading: location1Data[0] },
                { lat: 36.1901, lng: 44.0091, name: 'Namaz Area', reading: location2Data[0] }
            ];
            console.log('Updating map markers with locations:', locations);
            window.updateMapMarkers(locations);
        } else {
            console.log('No location data available for map markers');
        }
        
    } catch (error) {
        console.error('Error in fetchInitialData:', error);
        console.error('Error stack:', error.stack);
        showError('Failed to fetch air quality data: ' + error.message);
    }
}

// Helper function to show errors to the user
function showError(message) {
    console.error(message);
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

// Modify the subscription callback to update recent readings
function subscribeToUpdates() {
    const subscription = window.dbConfig.supabase
        .channel('air_quality_updates')
        .on('postgres_changes', 
            {
                event: '*',
                schema: 'public',
                table: 'sensor_data'
            },
            async (payload) => {
                // Fetch latest data to ensure we have complete dataset
                const { data, error } = await window.dbConfig.supabase
                    .from('sensor_data')
                    .select('*')
                    .order('timestamp', { ascending: false });

                if (!error) {
                    // Update recent readings for both locations
                    updateRecentReadings('Makhmor Road', data);
                    updateRecentReadings('Namaz Area', data);
                    
                    // Update chart
                    updateChart(data);
                    
                    // Update dashboard
                    updateDashboard(data);
                    
                    // Process data for locations
                    const location1Data = data.filter(reading => reading.location === 'Makhmor Road');
                    const location2Data = data.filter(reading => reading.location === 'Namaz Area');
                    
                    // Update map markers
                    if (location1Data.length > 0 || location2Data.length > 0) {
                        const locations = [
                            { lat: 35.7749, lng: 43.5883, name: 'Makhmor Road', reading: location1Data[0] },
                            { lat: 36.1901, lng: 44.0091, name: 'Namaz Area', reading: location2Data[0] }
                        ];
                        window.updateMapMarkers(locations);
                    }
                }
            }
        )
        .subscribe();

    return subscription;
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Initialize map if the element exists
        if (document.getElementById('map')) {
            initMap();
        }
        
        // Initialize sensor status monitoring if available
        if (window.sensorStatus && typeof window.sensorStatus.init === 'function') {
            window.sensorStatus.init();
        }
        
        // Initialize Supabase and dashboard
        initializeSupabase();
        
    } catch (error) {
        console.error('Error during initialization:', error);
        showError('Failed to initialize application: ' + error.message);
    }
});

function createMarker(location, reading) {
    const pm25Value = reading ? parseFloat(reading.pm25) : null;
    const status = getPM25Status(pm25Value);
    
    const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="marker-pin" style="background-color: ${status.color};">
                <span class="marker-text">${pm25Value ? pm25Value.toFixed(1) : '--'}</span>
              </div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -35]
    });
    
    const marker = L.marker([location.lat, location.lng], { icon: customIcon });
    const popupContent = createPopupContent(location, reading);
    marker.bindPopup(popupContent);
    return marker;
}

function createPopupContent(location, reading) {
    if (!reading) {
        return '<div class="popup-content"><p>No data available</p></div>';
    }
    
    const pm25Value = parseFloat(reading.pm25);
    const timestamp = new Date(reading.timestamp).toLocaleString();
    const status = getPM25Status(pm25Value);
    
    return `
        <div class="popup-content">
            <h3 class="font-bold mb-2">${reading.location}</h3>
            <div class="pm25-value" style="color: ${status.color}">
                <span class="text-lg font-bold">${pm25Value.toFixed(1)}</span> μg/m³
            </div>
            <div class="text-sm text-gray-600 mt-2">Status: ${status.text}</div>
            <div class="text-xs text-gray-500 mt-1">Last updated: ${timestamp}</div>
        </div>
    `;
}

// Function to update averages display
function updateAveragesDisplay() {
    ['location1', 'location2'].forEach(location => {
        Object.keys(timeRanges).forEach(range => {
            const avgData = averages[location][range];
            const elementId = `${location}-${range}-avg`;
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = `PM2.5: ${avgData.pm25.toFixed(1)} μg/m³ | Humidity: ${avgData.humidity.toFixed(1)}%`;
            }
        });
    });
}

window.supabaseInitDashboard = async function() {
    // Initialize Supabase client if not already initialized
    const initialized = await initializeSupabase();
    if (!initialized) {
        showError('Failed to initialize Supabase client');
        return false;
    }
    
    // Refresh the dashboard data
    const data = await refreshData();
    return data && data.length > 0;
};

// Function to update predictions display
function updatePredictionsDisplay() {
    ['location1', 'location2'].forEach(location => {
        const prediction = predictions[location];
        const elementId = `${location}-prediction`;
        const element = document.getElementById(elementId);
        if (element && prediction.pm25 !== null) {
            element.innerHTML = `
                <div class="prediction-value">
                    Predicted PM2.5: ${prediction.pm25.toFixed(1)} μg/m³
                    <div class="confidence-indicator">
                        Confidence: ${prediction.confidence.toFixed(1)}%
                    </div>
                </div>
            `;
        }
    });
}