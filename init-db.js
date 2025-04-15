// Database Initialization Script
// This script will create the necessary tables and populate them with sample data
// Run this script once to set up your database

document.addEventListener('DOMContentLoaded', async function() {
    // Load configuration
    if (typeof window.dbConfig === 'undefined') {
        console.error('Database configuration not found! Make sure db-config.js is loaded first.');
        return;
    }
    
    const { supabaseUrl, supabaseKey, airQualityTableName } = window.dbConfig;
    
    try {
        // Initialize Supabase client
        const supabase = supabase.createClient(supabaseUrl, supabaseKey);
        console.log('Supabase client initialized for DB setup');
        
        // 1. Check if the table exists by trying to get a single row
        const { data: testData, error: testError } = await supabase
            .from(airQualityTableName)
            .select('*')
            .limit(1);
            
        if (testError && testError.code === '42P01') { // 42P01 is PostgreSQL's error code for "relation does not exist"
            console.log(`Table ${airQualityTableName} does not exist. Creating it...`);
            
            // Create the table using SQL directly
            const { error: createError } = await supabase.rpc('create_air_quality_table', {
                table_name: airQualityTableName
            });
            
            if (createError) {
                console.error('Error creating table:', createError);
                return;
            }
            
            console.log(`Table ${airQualityTableName} created successfully`);
        } else {
            console.log(`Table ${airQualityTableName} already exists`);
        }
        
        // 2. Check if we already have sample data
        const { data: countData, error: countError } = await supabase
            .from(airQualityTableName)
            .select('*', { count: 'exact', head: true });
            
        if (countError) {
            console.error('Error checking data count:', countError);
            return;
        }
        
        const count = countData?.length || 0;
        
        if (count > 0) {
            console.log(`Table already has ${count} rows of data. Skipping sample data insertion.`);
            return;
        }
        
        // 3. Insert sample data
        console.log('Inserting sample data...');
        
        // Create sample data - 48 hours of readings at 1-hour intervals for two locations
        const sampleData = [];
        const locations = ['Makhmor Road', 'Namaz Area'];
        
        // Start from 48 hours ago
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - 48);
        
        for (let hour = 0; hour < 48; hour++) {
            const timestamp = new Date(startDate);
            timestamp.setHours(startDate.getHours() + hour);
            
            // Create readings for each location
            locations.forEach(location => {
                // Create realistic but random values that follow a pattern:
                // - Higher in morning and evening (commute times)
                // - Lower at night
                // - Some random variation
                
                const hourOfDay = timestamp.getHours();
                let basePm25 = 10; // Base level
                
                // Morning commute (7-9 AM)
                if (hourOfDay >= 7 && hourOfDay <= 9) {
                    basePm25 += 20;
                }
                // Evening commute (4-7 PM)
                else if (hourOfDay >= 16 && hourOfDay <= 19) {
                    basePm25 += 25;
                }
                // Night time (11 PM - 5 AM)
                else if (hourOfDay >= 23 || hourOfDay <= 5) {
                    basePm25 -= 5;
                }
                
                // Make second location generally have higher readings
                if (location === 'Namaz Area') {
                    basePm25 += 8;
                }
                
                // Add random variation (±30%)
                const randomFactor = 0.7 + (Math.random() * 0.6); // Between 0.7 and 1.3
                const pm25 = Math.max(1, Math.round(basePm25 * randomFactor * 10) / 10); // Ensure at least 1, round to 1 decimal
                
                sampleData.push({
                    pm25,
                    Location: location,
                    timestamp: timestamp.toISOString(),
                    notes: 'Sample data'
                });
            });
        }
        
        // Insert the sample data in batches of 50
        const batchSize = 50;
        for (let i = 0; i < sampleData.length; i += batchSize) {
            const batch = sampleData.slice(i, i + batchSize);
            const { error: insertError } = await supabase
                .from(airQualityTableName)
                .insert(batch);
                
            if (insertError) {
                console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
            } else {
                console.log(`Batch ${i / batchSize + 1} inserted successfully`);
            }
        }
        
        console.log(`Sample data insertion complete. Added ${sampleData.length} readings.`);
        
    } catch (error) {
        console.error('Database initialization failed:', error);
    }
});

// Helper to create the SQL function for table creation (only needs to be run once)
async function createSqlFunction(supabase) {
    const { error } = await supabase.rpc('exec_sql', {
        sql_statement: `
            CREATE OR REPLACE FUNCTION create_air_quality_table(table_name text) RETURNS void AS $$
            BEGIN
                EXECUTE format('
                    CREATE TABLE IF NOT EXISTS %I (
                        id SERIAL PRIMARY KEY,
                        pm25 NUMERIC NOT NULL,
                        "Location" VARCHAR(255) NOT NULL,
                        timestamp TIMESTAMPTZ DEFAULT NOW(),
                        notes TEXT
                    )', table_name);
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
    });
    
    if (error) {
        console.error('Error creating SQL function:', error);
    } else {
        console.log('SQL function created successfully');
    }
} 