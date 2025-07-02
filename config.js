// Air Quality Dashboard Configuration
const CONFIG = {
    // Your Supabase API key
    SUPABASE_KEY: '', // Add your key here
    
    // Sensor locations
    LOCATIONS: {
        MAKHMOR_ROAD: {
            name: 'Makhmor Road',
            lat: 35.7749,
            lng: 43.5883
        },
        NAMAZ_AREA: {
            name: 'Namaz Area',
            lat: 36.1901,
            lng: 44.0091
        }
    },
    
    // Update intervals (in milliseconds)
    REFRESH_INTERVAL: 30000, // 30 seconds
    STATUS_CHECK_INTERVAL: 5000, // 5 seconds
    
    // Offline threshold (in seconds)
    OFFLINE_THRESHOLD: 21610 // ~6 hours
};

// Initialize configuration when the page loads
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Set the Supabase API key
        if (CONFIG.SUPABASE_KEY) {
            window.dbConfig.setApiKey(CONFIG.SUPABASE_KEY);
        } else {
            console.warn('Please set your Supabase API key in config.js');
        }
    } catch (error) {
        // Remove: console.error('Error initializing configuration:', error);
    }
}); 