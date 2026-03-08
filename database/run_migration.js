const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in ../server/.env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'migrations', 'push_notifications.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Supabase JS library doesn't easily run arbitrary DDL SQL via the standard .rpc or .from interfaces unless an RPC exists.
        // So we'll instruct the user to run it in Supabase SQL editor or create a postgres node client if they have pg installed.
        console.log("Since psql is not available natively and Supabase JS can't run DDL directly, we will use the postgres package.");

        const { Client } = require('pg');
        // Extract host, port, dbname from typical local setup or direct connection string if available.
        // For local supabase, it's typically postgresql://postgres:postgres@127.0.0.1:54322/postgres
        const client = new Client({
            connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
        });

        await client.connect();
        await client.query(sqlContent);
        await client.end();

        console.log("Migration applied successfully!");
    } catch (error) {
        console.error("Error applying migration:", error);
        process.exit(1);
    }
}

runMigration();
