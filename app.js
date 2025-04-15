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

// SUPABASE INITIALIZATION - We'll use these later to store data pulled from Supabase
let supabaseUrl = 'https://gyrcemnqauyoxkjwprjg.supabase.co';
let supabaseKey = ''; // Will be loaded from localStorage
let tableName = 'sensor_data';

// Try to load API key from localStorage first
try {
    const storedApiKey = localStorage.getItem('supabase_api_key');
    if (storedApiKey) {
        console.log('Found stored API key in localStorage');
        supabaseKey = storedApiKey;
    }
} catch (e) {
    console.warn('Unable to access localStorage', e);
}

// Load configuration from db-config.js if available
if (typeof window.dbConfig !== 'undefined') {
    console.log('Loading configuration from db-config.js');
    supabaseUrl = window.dbConfig.supabaseUrl;
    supabaseKey = window.dbConfig.supabaseKey || supabaseKey; // Use stored key if not in dbConfig
    tableName = window.dbConfig.airQualityTableName;
}

// Global variables for both Firebase and Supabase implementation
let allReadings = [];
let location1Data = [];
let location2Data = [];
let currentPage = 1;
const itemsPerPage = 10;
let mainChart;
let location1Chart;
let location2Chart;
const timeRanges = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
};
let currentTimeRange = '24h';

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

// Initialize the dashboard
function initDashboard() {
    // Using Supabase instead of Firebase
    // We'll just set up event listeners and charts here
    // The actual data fetching will be handled by the Supabase section below
    setupEventListeners();
    initCharts();
}

// Update the dashboard with the latest data
function updateDashboard() {
    console.log('Updating dashboard with data:', {
        allReadings: allReadings.length,
        location1: location1Data.length,
        location2: location2Data.length
    });
    
    if (allReadings.length > 0) {
        // Update current PM2.5 readings
        const latestReading = allReadings[0];
        console.log('Latest reading:', latestReading);
        
        currentPM25Element.textContent = typeof latestReading.pm25 === 'number' ? 
            latestReading.pm25.toFixed(1) : latestReading.pm25.toString();
        
        updateAirQualityStatus(parseFloat(latestReading.pm25));
        
        // Update status time
        const statusTimeElement = document.getElementById('status-time');
        const timestamp = new Date(latestReading.timestamp);
        const minutesAgo = Math.floor((new Date() - timestamp) / 60000);
        statusTimeElement.textContent = minutesAgo <= 1 ? 'Just now' : `${minutesAgo} min ago`;
        
        // Update last updated time
        const lastUpdateTime = timestamp;
        lastUpdatedElement.textContent = formatDateTime(lastUpdateTime);
        updateTimeAgo(lastUpdateTime);
        
        // Update average PM2.5
        const last24hReadings = allReadings.filter(r => {
            const readingTime = new Date(r.timestamp);
            return (new Date() - readingTime) <= 24 * 60 * 60 * 1000;
        });
        
        if (last24hReadings.length > 0) {
            const sum = last24hReadings.reduce((total, r) => total + parseFloat(r.pm25), 0);
            const averagePM25 = sum / last24hReadings.length;
            averagePM25Element.textContent = averagePM25.toFixed(1);
            
            // Update average change indicator
            updateAverageChangeIndicator(averagePM25);
        }
        
        // Update location specific data
        updateLocationData();
        
        // Update data table
        updateDataTable();
        
        // Update charts
        updateCharts();
    } else {
        console.warn('No readings available to update dashboard');
    }
}

// Update air quality status based on PM2.5 value
function updateAirQualityStatus(pm25) {
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
    
    airQualityStatusElement.textContent = status;
    airQualityStatusElement.className = `inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${bgColor} ${textColor}`;
}

// Update average change indicator
function updateAverageChangeIndicator(currentAvg) {
    const avgChangeElement = document.getElementById('avg-change');
    
    // Get yesterday's average (for demo purposes, just adding some random variation)
    // In a real implementation, you would compare with actual historical data
    const yesterdayAvg = currentAvg * (1 + (Math.random() * 0.4 - 0.2)); // +/- 20% variation
    
    const percentChange = ((currentAvg - yesterdayAvg) / yesterdayAvg) * 100;
    const isPositive = percentChange >= 0;
    
    // Update text and styling
    avgChangeElement.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${isPositive ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}" />
        </svg>
        ${Math.abs(percentChange).toFixed(1)}%
    `;
    
    // For air quality, decreasing is good (green), increasing is bad (red)
    if (isPositive) {
        avgChangeElement.classList.remove('text-green-400');
        avgChangeElement.classList.add('text-red-400');
    } else {
        avgChangeElement.classList.remove('text-red-400');
        avgChangeElement.classList.add('text-green-400');
    }
}

// Update location specific data
function updateLocationData() {
    console.log('Updating location data', {
        location1: location1Data.length,
        location2: location2Data.length
    });
    
    if (location1Data.length > 0) {
        const latestLocation1 = location1Data[0];
        location1NameElement.textContent = 'Makhmor Road Station';
        location1PM25Element.textContent = `${parseFloat(latestLocation1.pm25).toFixed(1)} μg/m³`;
        
        const timestamp1 = latestLocation1.timestamp instanceof Date ? 
            latestLocation1.timestamp : new Date(latestLocation1.timestamp);
            
        location1TimestampElement.textContent = formatDateTime(timestamp1);
    }
    
    if (location2Data.length > 0) {
        const latestLocation2 = location2Data[0];
        location2NameElement.textContent = 'Namaz Area Station';
        location2PM25Element.textContent = `${parseFloat(latestLocation2.pm25).toFixed(1)} μg/m³`;
        
        const timestamp2 = latestLocation2.timestamp instanceof Date ? 
            latestLocation2.timestamp : new Date(latestLocation2.timestamp);
            
        location2TimestampElement.textContent = formatDateTime(timestamp2);
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
    
    // Update table content for desktop
    readingsTableBody.innerHTML = '';
    
    // Update cards for mobile
    const readingsCards = document.getElementById('readings-cards');
    readingsCards.innerHTML = '';
    
    paginatedData.forEach((reading) => {
        // Get status information
        const statusInfo = getStatusInfo(reading.pm25);
        
        // Create table row for desktop
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
        
        // Create card for mobile
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

// Initialize charts
function initCharts() {
    // Set Chart.js defaults for consistent styling
    Chart.defaults.font.family = "'Manrope', sans-serif";
    Chart.defaults.color = '#94A3B8';
    Chart.defaults.elements.line.tension = 0.4;
    Chart.defaults.elements.line.borderWidth = 2;
    Chart.defaults.elements.point.radius = 0;
    Chart.defaults.elements.point.hoverRadius = 5;
    
    // Main chart
    const mainChartCtx = document.getElementById('air-quality-chart').getContext('2d');
    mainChart = new Chart(mainChartCtx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Makhmor Road',
                    borderColor: '#F97316', // Orange-500
                    backgroundColor: 'rgba(249, 115, 22, 0.15)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    data: []
                },
                {
                    label: 'Namaz Area',
                    borderColor: '#3B82F6', // Blue-500
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    data: []
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
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    boxWidth: 10,
                    boxHeight: 10,
                    usePointStyle: true,
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        color: '#E2E8F0'
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
                            day: 'MMM d',
                            week: 'MMM d'
                        }
                    },
                    title: {
                        display: false
                    },
                    grid: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        padding: 10,
                        color: '#94A3B8'
                    }
                },
                y: {
                    title: {
                        display: false
                    },
                    grid: {
                        display: true,
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        padding: 10,
                        color: '#94A3B8'
                    },
                    beginAtZero: true
                }
            }
        }
    });
    
    // Location 1 chart
    const location1ChartCtx = document.getElementById('location1-chart').getContext('2d');
    location1Chart = new Chart(location1ChartCtx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'PM2.5',
                    borderColor: '#F97316', // Orange-500
                    backgroundColor: 'rgba(249, 115, 22, 0.15)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    data: []
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#E2E8F0',
                    bodyColor: '#94A3B8',
                    padding: 10,
                    cornerRadius: 6,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'HH:mm'
                        }
                    },
                    display: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        display: false
                    }
                },
                y: {
                    display: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        display: false
                    },
                    beginAtZero: true
                }
            },
            elements: {
                point: {
                    radius: 0
                }
            }
        }
    });
    
    // Location 2 chart
    const location2ChartCtx = document.getElementById('location2-chart').getContext('2d');
    location2Chart = new Chart(location2ChartCtx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'PM2.5',
                    borderColor: '#3B82F6', // Blue-500
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    data: []
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#E2E8F0',
                    bodyColor: '#94A3B8',
                    padding: 10,
                    cornerRadius: 6,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'HH:mm'
                        }
                    },
                    display: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        display: false
                    }
                },
                y: {
                    display: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        display: false
                    },
                    beginAtZero: true
                }
            },
            elements: {
                point: {
                    radius: 0
                }
            }
        }
    });
}

// Update charts with the latest data
function updateCharts() {
    console.log('Updating charts');
    const now = new Date();
    const timeLimit = timeRanges[currentTimeRange];
    
    // Function to normalize readings
    function normalizeReading(reading) {
        // Make sure timestamp is a Date object
        const timestamp = reading.timestamp instanceof Date ? 
            reading.timestamp : new Date(reading.timestamp);
            
        // Make sure pm25 is a number
        const pm25 = parseFloat(reading.pm25);
        
        if (isNaN(pm25)) {
            console.warn('Invalid PM2.5 value:', reading.pm25);
            return null;
        }
        
        if (isNaN(timestamp.getTime())) {
            console.warn('Invalid timestamp:', reading.timestamp);
            return null;
        }
        
        return {
            ...reading,
            timestamp,
            pm25
        };
    }
    
    // Filter and normalize data
    const normalizedLocation1Data = location1Data
        .map(normalizeReading)
        .filter(r => r !== null && (now - r.timestamp) <= timeLimit)
        .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp (ascending)
        
    const normalizedLocation2Data = location2Data
        .map(normalizeReading)
        .filter(r => r !== null && (now - r.timestamp) <= timeLimit)
        .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp (ascending)
    
    console.log('Filtered data for charts:', {
        location1: normalizedLocation1Data.length,
        location2: normalizedLocation2Data.length
    });
    
    // Prepare data for main chart
    const location1ChartData = normalizedLocation1Data.map(r => ({
        x: r.timestamp,
        y: r.pm25
    }));
    
    const location2ChartData = normalizedLocation2Data.map(r => ({
        x: r.timestamp,
        y: r.pm25
    }));
    
    // Update main chart data
    mainChart.data.datasets[0].data = location1ChartData;
    mainChart.data.datasets[1].data = location2ChartData;
    
    // Update time unit based on selected range
    if (currentTimeRange === '24h') {
        mainChart.options.scales.x.time.unit = 'hour';
    } else if (currentTimeRange === '7d') {
        mainChart.options.scales.x.time.unit = 'day';
    } else {
        mainChart.options.scales.x.time.unit = 'week';
    }
    
    mainChart.update();
    
    // Update individual location charts (last 24 hours only)
    const location1Last24h = location1Data
        .map(normalizeReading)
        .filter(r => r !== null && (now - r.timestamp) <= 24 * 60 * 60 * 1000)
        .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp (ascending)
        
    const location2Last24h = location2Data
        .map(normalizeReading)
        .filter(r => r !== null && (now - r.timestamp) <= 24 * 60 * 60 * 1000)
        .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp (ascending)
    
    location1Chart.data.datasets[0].data = location1Last24h.map(r => ({
        x: r.timestamp,
        y: r.pm25
    }));
    
    location2Chart.data.datasets[0].data = location2Last24h.map(r => ({
        x: r.timestamp,
        y: r.pm25
    }));
    
    location1Chart.update();
    location2Chart.update();
}

// Set the time range for the main chart
function setTimeRange(range) {
    // Update active button
    btn24h.classList.toggle('gradient-bg', range === '24h');
    btn24h.classList.toggle('text-white', range === '24h');
    btn24h.classList.toggle('glow', range === '24h');
    btn24h.classList.toggle('bg-white', range !== '24h');
    btn24h.classList.toggle('text-gray-700', range !== '24h');
    
    btn7d.classList.toggle('gradient-bg', range === '7d');
    btn7d.classList.toggle('text-white', range === '7d');
    btn7d.classList.toggle('glow', range === '7d');
    btn7d.classList.toggle('bg-white', range !== '7d');
    btn7d.classList.toggle('text-gray-700', range !== '7d');
    
    btn30d.classList.toggle('gradient-bg', range === '30d');
    btn30d.classList.toggle('text-white', range === '30d');
    btn30d.classList.toggle('glow', range === '30d');
    btn30d.classList.toggle('bg-white', range !== '30d');
    btn30d.classList.toggle('text-gray-700', range !== '30d');
    
    currentTimeRange = range;
    updateCharts();
}

// Setup event listeners
function setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    refreshBtn.addEventListener('click', () => {
        // Add rotate animation
        refreshBtn.querySelector('svg').classList.add('animate-spin');
        
        // Call the Supabase initialization function instead
        if (typeof window.supabaseInitDashboard === 'function') {
            window.supabaseInitDashboard().then(() => {
                setTimeout(() => {
                    refreshBtn.querySelector('svg').classList.remove('animate-spin');
                }, 500);
            });
        } else {
            console.error('Supabase initialization function not found');
            setTimeout(() => {
                refreshBtn.querySelector('svg').classList.remove('animate-spin');
            }, 500);
        }
    });
    
    // Pagination buttons
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
    
    // Location filter
    locationFilterElement.addEventListener('change', () => {
        currentPage = 1;
        updateDataTable();
    });
    
    // Time range buttons
    btn24h.addEventListener('click', () => {
        setTimeRange('24h');
    });
    
    btn7d.addEventListener('click', () => {
        setTimeRange('7d');
    });
    
    btn30d.addEventListener('click', () => {
        setTimeRange('30d');
    });
    
    // Set up real-time updates - this will be handled by Supabase now
    /*
    setInterval(() => {
        fetchSensorData();
    }, 60000); // Refresh every minute
    */
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', initDashboard);

// Air Quality Dashboard - Database Connection

// We'll use the Supabase JavaScript client to connect to the PostgreSQL database
document.addEventListener('DOMContentLoaded', function() {
    console.log('Document fully loaded, initializing dashboard...');
    
    // Define the Supabase initialization function
    window.supabaseInitDashboard = async function() {
        console.log('Starting Supabase dashboard initialization...');
        
        try {
            // Check if we have an API key
            if (!supabaseKey) {
                console.error('No API key found. Please initialize the database first.');
                // Show a user-friendly error message
                const errorContainer = document.createElement('div');
                errorContainer.className = 'fixed top-0 left-0 w-full bg-red-600 text-white p-4 text-center z-50 flex justify-between items-center';
                errorContainer.innerHTML = `
                    <p>No API key found. Please <a href="init-db.html" class="underline font-bold">initialize the database</a> first.</p>
                    <button id="close-error" class="text-white hover:text-gray-200 focus:outline-none">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                `;
                document.body.prepend(errorContainer);
                
                // Add event listener to close button
                document.getElementById('close-error').addEventListener('click', function() {
                    errorContainer.remove();
                });
                
                return false;
            }
            
            // Load the Supabase client dynamically if not already loaded
            if (typeof supabase === 'undefined') {
                console.log('Loading Supabase client...');
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
            
            // Create Supabase client
            console.log('Creating Supabase client with URL:', supabaseUrl);
            console.log('API Key status:', supabaseKey ? 'Key is present' : 'Key is missing');
            
            let client;
            // Check if we already have a client from dbConfig
            if (window.dbConfig && window.dbConfig.client) {
                console.log('Using existing Supabase client from dbConfig');
                client = window.dbConfig.client;
            } else {
                console.log('Creating new Supabase client');
                client = supabase.createClient(supabaseUrl, supabaseKey);
                window.supabase = supabase; // Store for later use
            }
            
            console.log('Supabase client ready');
            
            // Fetch the most recent air quality data
            console.log('Fetching data from table:', tableName);
            
            // Debugging to see what's going on
            console.log('Using Supabase client:', {
                url: client.url,
                headers: client.headers ? 'Headers present' : 'No headers',
                functions: Object.keys(client).join(', '),
                tableName: tableName
            });
            
            try {
                // First try to check if the table exists
                console.log(`Attempting to access table: ${tableName}`);
                
                const { data: latestReadings, error } = await client
                    .from(tableName)
                    .select('*')
                    .order('timestamp', { ascending: false })
                    .limit(100);
                
                if (error) {
                    console.error('Error fetching data:', error);
                    
                    // Check if we need to create the table
                    if (error.code === '42P01') { // Table doesn't exist
                        console.log('Table does not exist, trying to create it...');
                        // We would need more permissions to create tables
                        // This would go here if allowed
                    }
                    
                    return false;
                }
                
                console.log('Data retrieved successfully:', latestReadings);
                
                if (latestReadings && latestReadings.length > 0) {
                    // Standardize data format
                    allReadings = latestReadings.map(reading => ({
                        id: reading.id || Math.random().toString(36).substr(2, 9),
                        pm25: parseFloat(reading.pm25) || 0,
                        timestamp: new Date(reading.timestamp), // Convert to Date object
                        location: reading.Location || 'Unknown Location'
                    }));
                    
                    // Sort data by timestamp (newest first)
                    allReadings.sort((a, b) => b.timestamp - a.timestamp);
                    
                    // Separate by location
                    location1Data = allReadings.filter(reading => 
                        reading.location.includes('Makhmor') || 
                        reading.location.includes('Erbil,Makhmor') ||
                        reading.location === 'Makhmor Road'
                    );
                    
                    location2Data = allReadings.filter(reading => 
                        reading.location.includes('namaz') || 
                        reading.location.includes('Namaz') ||
                        reading.location.includes('Erbil,Kurdistan,namaz') ||
                        reading.location === 'Namaz Area'
                    );
                    
                    // Sort data by timestamp (newest first)
                    location1Data.sort((a, b) => b.timestamp - a.timestamp);
                    location2Data.sort((a, b) => b.timestamp - a.timestamp);
                    
                    console.log('Processed readings:');
                    console.log('- All readings:', allReadings.length);
                    console.log('- Location 1 (Makhmor):', location1Data.length);
                    console.log('- Location 2 (Namaz):', location2Data.length);
                    
                    // Update dashboard with the fetched data
                    updateDashboard();
                    
                    // Set up real-time subscription for future updates
                    setupRealtimeSubscription(client);
                    
                    return true;
                } else {
                    console.warn('No readings found in the database');
                    return false;
                }
            } catch (err) {
                console.error('Failed to initialize dashboard:', err);
                return false;
            }
        } catch (err) {
            console.error('Failed to initialize dashboard:', err);
            return false;
        }
    };
    
    // Function to set up real-time subscription
    function setupRealtimeSubscription(client) {
        console.log('Setting up real-time subscription for table:', tableName);
        
        try {
            const channel = client
                .channel('air-quality-changes')
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: tableName
                }, payload => {
                    console.log('New reading received:', payload);
                    
                    // Process the new reading
                    const newReading = {
                        id: payload.new.id || Math.random().toString(36).substr(2, 9),
                        pm25: parseFloat(payload.new.pm25) || 0,
                        timestamp: new Date(payload.new.timestamp),
                        location: payload.new.Location || 'Unknown Location'
                    };
                    
                    // Add to appropriate arrays
                    allReadings.unshift(newReading);
                    
                    if (newReading.location.includes('Makhmor') || 
                        newReading.location.includes('Erbil,Makhmor') ||
                        newReading.location === 'Makhmor Road') {
                        location1Data.unshift(newReading);
                    } else if (newReading.location.includes('namaz') || 
                              newReading.location.includes('Namaz') ||
                              newReading.location.includes('Erbil,Kurdistan,namaz') ||
                              newReading.location === 'Namaz Area') {
                        location2Data.unshift(newReading);
                    }
                    
                    // Update the dashboard
                    updateDashboard();
                })
                .subscribe(status => {
                    console.log('Subscription status:', status);
                });
                
            console.log('Real-time subscription set up successfully');
        } catch (error) {
            console.error('Error setting up real-time subscription:', error);
        }
    }
    
    // Force dashboard initialization after a small delay to ensure everything is loaded
    setTimeout(() => {
        console.log('Starting dashboard initialization...');
        
        // Try the Supabase initialization first
        if (typeof window.supabaseInitDashboard === 'function') {
            console.log('Using Supabase initialization');
            window.supabaseInitDashboard();
        } 
        // If Supabase fails or isn't available, fall back to the original initialization
        else if (typeof initDashboard === 'function') {
            console.log('Using original dashboard initialization');
            initDashboard();
        }
        else {
            console.error('No dashboard initialization function found!');
        }
    }, 1000);
});