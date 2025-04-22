// Supabase configuration
const SUPABASE_URL = 'https://gyrcemnqauyoxkjwprjg.supabase.co';

// Get the API key from localStorage if available
let SUPABASE_KEY = '';
try {
    SUPABASE_KEY = localStorage.getItem('supabase_api_key');
    if (!SUPABASE_KEY) {
        console.warn('No Supabase API key found in localStorage');
    }
} catch (e) {
    console.error('Unable to access localStorage:', e);
}

// Database connection string for reference:
// DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.gyrcemnqauyoxkjwprjg.supabase.co:5432/postgres

// This is the table structure expected for air quality readings
// If your actual table structure is different, you'll need to modify the app.js file accordingly
/*
  CREATE TABLE sensor_data (
    id SERIAL PRIMARY KEY,
    pm25 NUMERIC NOT NULL,
    "Location" VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
  );
*/

// Database configuration object
const dbConfig = {
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_KEY,
    airQualityTable: 'sensor_data',
    client: null,
    
    // Method to securely set the API key and initialize client
    setApiKey: function(apiKey) {
        if (!apiKey) {
            console.error('Invalid API key provided');
            return false;
        }
        
        try {
            // Save to localStorage
            localStorage.setItem('supabase_api_key', apiKey);
            this.supabaseKey = apiKey;
            console.log('API key saved successfully');
            
            // Initialize client if Supabase is available
            if (typeof supabase !== 'undefined') {
                this.client = supabase.createClient(this.supabaseUrl, apiKey);
                console.log('Supabase client initialized with new API key');
                return true;
            } else {
                console.error('Supabase library not loaded');
                return false;
            }
        } catch (e) {
            console.error('Failed to save API key:', e);
            return false;
        }
    },
    
    // Method to initialize the client
    initClient: function() {
        if (!this.supabaseKey) {
            console.error('No API key available. Please set the API key first.');
            return false;
        }
        
        try {
            if (typeof supabase === 'undefined') {
                throw new Error('Supabase library not loaded');
            }
            
            this.client = supabase.createClient(this.supabaseUrl, this.supabaseKey);
            console.log('Supabase client initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            return false;
        }
    }
};

// Make accessible globally if in a browser environment
if (typeof window !== 'undefined') {
    window.dbConfig = dbConfig;
    
    // Try to initialize client if API key is available
    if (dbConfig.supabaseKey) {
        dbConfig.initClient();
    } else {
        console.warn('Please set your Supabase API key using dbConfig.setApiKey()');
    }
} 