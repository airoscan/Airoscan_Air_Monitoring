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
        
        // Fetch latest readings
        const { data: readings, error } = await window.dbConfig.client
            .from(window.dbConfig.airQualityTable)
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(100);

        if (error) {
            throw new Error(`Database query failed: ${error.message}`);
        }

        if (!readings || readings.length === 0) {
            console.warn('No readings found in database');
            updateDefaultValues();
            return;
        }

        console.log(`Fetched ${readings.length} readings`);

        // Location mapping
        const locationMapping = {
            '36.213724, 43.988080': 'makhmor-road',
            '36.112146, 43.953925': 'namaz-area'
        };

        // Process readings by location
        const readingsByLocation = {};
        readings.forEach(reading => {
            // Get location from the Location column
            const location = reading.Location;
            if (!location) {
                console.warn('Reading found without location:', reading);
                return;
            }

            // Map the coordinate to the correct location ID
            const locationId = locationMapping[location];
            if (!locationId) {
                console.warn(`Unknown location coordinates: ${location}`);
                return;
            }
            
            if (!readingsByLocation[locationId]) {
                readingsByLocation[locationId] = [];
            }
            readingsByLocation[locationId].push(reading);
        });

        console.log('Processed readings by location:', Object.keys(readingsByLocation));

        // Update displays for each location
        for (const [locationId, locationReadings] of Object.entries(readingsByLocation)) {
            if (locationReadings.length > 0) {
                const latestReading = locationReadings[0];
                updateLocationDisplay(locationId, latestReading);
                
                // Calculate and update averages
                if (locationReadings.length >= 24) {
                    const averages = calculateAverages(locationReadings);
                    updateAverageDisplay(locationId, averages);
                }
            }
        }

        // Ensure both locations are updated even if no data
        const allLocations = ['makhmor-road', 'namaz-area'];
        allLocations.forEach(locationId => {
            if (!readingsByLocation[locationId]) {
                updateLocationDisplay(locationId, null);
            }
        });

        // Update charts if available
        if (typeof updateCharts === 'function') {
            updateCharts(readings);
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
        
        // Set default values for UI elements
        updateDefaultValues();
    }
}

// Helper function to update UI with default values
function updateDefaultValues() {
    const locations = ['makhmor-road', 'namaz-area'];
    locations.forEach(locationId => {
        updateLocationDisplay(locationId, null);
    });
}

// Function to update a location's display elements
function updateLocationDisplay(location, reading) {
    const prefix = location.toLowerCase().includes('makhmor') ? 'makhmor' : 'namaz';
    
    if (!reading) {
        console.warn(`No reading provided for ${location}`);
        updateDefaultValues(prefix);
        return;
    }

    try {
        // Update PM2.5 value
        const pm25Element = document.getElementById(`${prefix}-current-pm25`);
        if (pm25Element) {
            pm25Element.textContent = reading.pm25 ? reading.pm25.toFixed(1) : '--';
            console.log(`Updated PM2.5 value for ${location} to ${reading.pm25 ? reading.pm25.toFixed(1) : '--'}`);
        }

        // Update air quality status
        const qualityStatusElement = document.getElementById(`${prefix}-air-quality-status`);
        if (qualityStatusElement) {
            const { status, bgColor, textColor } = getAirQualityStatus(reading.pm25);
            qualityStatusElement.textContent = status;
            qualityStatusElement.className = `px-3 py-1 rounded-full ${bgColor} ${textColor}`;
            console.log(`Updated air quality status for ${location} to ${status}`);
        }

        // Update timestamp
        const timeElement = document.getElementById(`${prefix}-status-time`);
        const lastUpdatedElement = document.getElementById(`${prefix}-last-updated`);
        const timeAgoElement = document.getElementById(`${prefix}-time-ago`);
        
        if (reading.timestamp) {
            const timestamp = new Date(reading.timestamp);
            if (timeElement) {
                timeElement.textContent = timestamp.toLocaleTimeString();
            }
            if (lastUpdatedElement) {
                lastUpdatedElement.textContent = `Last updated: ${timestamp.toLocaleString()}`;
            }
            if (timeAgoElement) {
                const timeAgo = Math.floor((Date.now() - timestamp) / 1000 / 60);
                timeAgoElement.textContent = `${timeAgo} minutes ago`;
            }
            console.log(`Updated timestamp elements for ${location}`);
        }

        // Update 24-hour average
        const avgElement = document.getElementById(`${prefix}-average-pm25`);
        const avgChangeElement = document.getElementById(`${prefix}-avg-change`);
        
        if (avgElement && reading.average24h) {
            avgElement.textContent = reading.average24h.toFixed(1);
        }
        
        if (avgChangeElement && reading.averageChange) {
            const changePercent = (reading.averageChange * 100).toFixed(1);
            const arrow = reading.averageChange > 0 ? '↑' : '↓';
            avgChangeElement.textContent = `${arrow} ${Math.abs(changePercent)}%`;
            avgChangeElement.className = reading.averageChange > 0 
                ? 'text-red-600' 
                : 'text-green-600';
        }

        // Update sensor status
        const sensorStatusElement = document.getElementById(`${prefix}-sensor-status`);
        if (sensorStatusElement) {
            const timestamp = new Date(reading.timestamp);
            const isOffline = Date.now() - timestamp > 6 * 60 * 60 * 1000; // 6 hours
            sensorStatusElement.textContent = isOffline ? 'Offline' : 'Online';
            sensorStatusElement.className = isOffline 
                ? 'px-3 py-1 rounded-full bg-red-100 text-red-800'
                : 'px-3 py-1 rounded-full bg-green-100 text-green-800';
            console.log(`Updated sensor status for ${location} to ${isOffline ? 'Offline' : 'Online'}`);
        }
    } catch (error) {
        console.error(`Error updating display for ${location}:`, error);
        updateDefaultValues(prefix);
    }
}

function updateDefaultValues(prefix) {
    const elements = {
        [`${prefix}-current-pm25`]: '--',
        [`${prefix}-air-quality-status`]: 'No Data',
        [`${prefix}-status-time`]: '--:--',
        [`${prefix}-last-updated`]: 'Last updated: Unknown',
        [`${prefix}-time-ago`]: '--',
        [`${prefix}-average-pm25`]: '--',
        [`${prefix}-avg-change`]: '--',
        [`${prefix}-sensor-status`]: 'Unknown'
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            // Reset classes for status elements
            if (id.includes('air-quality-status')) {
                element.className = 'px-3 py-1 rounded-full bg-gray-100 text-gray-600';
            } else if (id.includes('sensor-status')) {
                element.className = 'px-3 py-1 rounded-full bg-gray-100 text-gray-600';
            }
        }
    });
}

function getAirQualityStatus(pm25) {
    if (pm25 === undefined || pm25 === null) {
        return {
            status: 'No Data',
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-600'
        };
    }

    if (pm25 <= 12) {
        return {
            status: 'Good',
            bgColor: 'bg-green-100',
            textColor: 'text-green-800'
        };
    } else if (pm25 <= 35.4) {
        return {
            status: 'Moderate',
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-800'
        };
    } else if (pm25 <= 55.4) {
        return {
            status: 'Unhealthy for Sensitive Groups',
            bgColor: 'bg-orange-100',
            textColor: 'text-orange-800'
        };
    } else if (pm25 <= 150.4) {
        return {
            status: 'Unhealthy',
            bgColor: 'bg-red-100',
            textColor: 'text-red-800'
        };
    } else if (pm25 <= 250.4) {
        return {
            status: 'Very Unhealthy',
            bgColor: 'bg-purple-100',
            textColor: 'text-purple-800'
        };
    } else {
        return {
            status: 'Hazardous',
            bgColor: 'bg-red-900',
            textColor: 'text-white'
        };
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

        // Initialize the client if not already initialized
        if (!window.dbConfig.supabase) {
            const supabase = window.supabase.createClient(
                window.dbConfig.supabaseUrl,
                window.dbConfig.supabaseKey
            );
            window.dbConfig.supabase = supabase;
        }

        // Test the connection
        const { data, error } = await window.dbConfig.supabase
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
        if (!window.dbConfig || !window.dbConfig.supabase) {
            throw new Error('Supabase client not initialized');
        }

        console.log('Fetching latest readings...');
        const { data, error } = await window.dbConfig.supabase
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
    const loadingElement = document.getElementById('loading-indicator');
    const mainContent = document.getElementById('main-content');
    
    try {
        console.log('Initializing dashboard...');
        
        if (loadingElement) loadingElement.style.display = 'block';
        if (mainContent) mainContent.style.opacity = '0.5';
        
        // Initialize Supabase first
        const supabaseInitialized = await initializeSupabase();
        if (!supabaseInitialized) {
            throw new Error('Failed to initialize database connection. Please check your configuration.');
        }
        console.log('Database connection initialized');

        // Initialize sensor status tracking
        try {
            if (window.sensorStatus && typeof window.sensorStatus.init === 'function') {
                await window.sensorStatus.init();
                console.log('Sensor status tracking initialized');
            } else {
                console.warn('Sensor status tracking not available');
            }
        } catch (sensorError) {
            console.error('Error initializing sensor status:', sensorError);
            // Non-critical error, continue initialization
        }
        
        // Set up event listeners
    setupEventListeners();
        console.log('Event listeners initialized');
        
        // Initialize charts
        const chartsInitialized = initCharts();
        if (!chartsInitialized) {
            throw new Error('Failed to initialize charts. Please check if the chart container exists.');
        }
        console.log('Charts initialized');
        
        // Initialize the map
        try {
            initMap();
            console.log('Map initialized');
        } catch (mapError) {
            console.error('Error initializing map:', mapError);
            showError('Map initialization failed, but dashboard will continue to function');
        }
        
        // Fetch initial data
        await refreshData();
        console.log('Initial data fetched');
        
        // Start periodic updates
        setInterval(refreshData, 60000); // Update every minute
        
        console.log('Dashboard initialized successfully');
        
        // Show success message
        const successMsg = document.getElementById('success-message');
        if (successMsg) {
            successMsg.textContent = 'Dashboard initialized successfully';
            successMsg.style.display = 'block';
            setTimeout(() => successMsg.style.display = 'none', 3000);
        }
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError('Failed to initialize dashboard: ' + error.message);
    } finally {
        if (loadingElement) loadingElement.style.display = 'none';
        if (mainContent) mainContent.style.opacity = '1';
    }
}

// Initialize charts
function initCharts() {
    try {
        const chartElement = document.getElementById('air-quality-chart');
        if (!chartElement) {
            console.error('Chart element not found');
            return false;
        }

        const ctx = chartElement.getContext('2d');
        if (!ctx) {
            console.error('Failed to get chart context');
            return false;
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
                            },
                            usePointStyle: true,
                            pointStyle: 'circle'
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

        return true;
    } catch (error) {
        console.error('Error initializing charts:', error);
        return false;
    }
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
function updateCharts(data) {
    console.log('Updating charts with time range:', currentTimeRange);
    const now = new Date();
    const timeLimit = timeRanges[currentTimeRange];
    
    // Filter data based on time range
    const filteredLocation1Data = data.filter(reading => {
        const readingTime = new Date(reading.timestamp);
        return (now - readingTime) <= timeLimit;
    }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const filteredLocation2Data = data.filter(reading => {
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

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('Starting dashboard initialization...');
        
        // Initialize dashboard (this will handle Supabase initialization)
        await initDashboard();
        
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