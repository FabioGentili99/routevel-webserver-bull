const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

console.log('Database Configuration Check:');
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('DB_PORT:', process.env.DB_PORT || 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');

const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars.join(', '));
    console.error('Please check your .env file and ensure all database variables are set.');
    console.error('Current working directory:', process.cwd());
    console.error('.env file path should be:', path.join(process.cwd(), '.env'));
    
    // Fornisci configurazione di default per sviluppo locale
    if (process.env.NODE_ENV !== 'production') {
        console.warn('Using default development database configuration...');
        process.env.DB_HOST = process.env.DB_HOST || 'localhost';
        process.env.DB_PORT = process.env.DB_PORT || '5432';
        process.env.DB_NAME = process.env.DB_NAME || 'route2vel_db';
        process.env.DB_USER = process.env.DB_USER || 'postgres';
        process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
    } else {
        throw new Error('Database configuration is incomplete. Please set all required environment variables.');
    }
}

const poolConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: String(process.env.DB_PASSWORD), // Forza conversione a stringa
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

let pool;

try {
    pool = new Pool(poolConfig);
    console.log('PostgreSQL pool created successfully');
} catch (error) {
    console.error('Failed to create PostgreSQL pool:', error);
    throw error;
}

// Test della connessione al database
const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('Database connection successful at:', result.rows[0].now);
        client.release();
        return true;
    } catch (error) {
        console.error('Database connection failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('Make sure PostgreSQL is running on', `${process.env.DB_HOST}:${process.env.DB_PORT}`);
            console.error('You can start PostgreSQL with: pg_ctl start or sudo service postgresql start');
        } else if (error.code === '28P01') {
            console.error('Authentication failed. Check your database username and password in .env file');
        } else if (error.code === '3D000') {
            console.error('Database does not exist. Create it with:');
            console.error(`createdb ${process.env.DB_NAME} or psql -c "CREATE DATABASE ${process.env.DB_NAME}"`);
        }
        
        return false;
    }
};

pool.on('connect', () => {
    console.log('New client connected to database pool');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle database client:', err);
});

pool.on('remove', () => {
    console.log('Client removed from database pool');
});

const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        
        // Log query in sviluppo
        if (process.env.NODE_ENV === 'development' && process.env.LOG_QUERIES === 'true') {
            console.log('Query executed:', {
                text: text.substring(0, 100),
                duration: duration + 'ms',
                rows: result.rowCount
            });
        }
        
        return result;
    } catch (error) {
        console.error('Query error:', error.message);
        console.error('Query text:', text);
        console.error('Query params:', params);
        throw error;
    }
};

testConnection().then(success => {
    if (!success && process.env.NODE_ENV === 'production') {
        console.error('Failed to connect to database in production environment');
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    console.log('Closing database connections...');
    await pool.end();
    console.log('Database pool closed');
});

module.exports = {
    query,
    pool,
    testConnection
};