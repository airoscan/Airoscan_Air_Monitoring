// Supabase configuration
const SUPABASE_URL = 'https://gyrcemnqauyoxkjwprjg.supabase.co';

// Get the API key from localStorage if available
// This allows the key to be set once during initialization and not be hardcoded
let SUPABASE_KEY = '';
try {
    SUPABASE_KEY = localStorage.getItem('supabase_api_key') || '';
} catch (e) {
    console.warn('Unable to access localStorage', e);
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

// Export configuration
const dbConfig = {
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_KEY,
    airQualityTableName: 'sensor_data',
    
    // Method to securely set the API key
    setApiKey: function(apiKey) {
        try {
            localStorage.setItem('supabase_api_key', apiKey);
            this.supabaseKey = apiKey;
            console.log('API key saved to local storage');
            return true;
        } catch (e) {
            console.error('Failed to save API key', e);
            return false;
        }
    }
};

// Initialize Supabase client if available
try {
    if (typeof supabase !== 'undefined' && dbConfig.supabaseKey) {
        console.log('Initializing Supabase client from config file');
        const client = supabase.createClient(dbConfig.supabaseUrl, dbConfig.supabaseKey);
        dbConfig.client = client;
    }
} catch (error) {
    console.error('Error initializing Supabase client:', error);
}

// Make accessible globally if in a browser environment
if (typeof window !== 'undefined') {
    window.dbConfig = dbConfig;
} 