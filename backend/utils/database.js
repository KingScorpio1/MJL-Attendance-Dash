// File: backend/utils/database.js

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // --- THIS IS THE FIX ---
  // If we are in production (Render), enable SSL
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // This allows Render's self-signed certificates
  } : false,
});

// Error handling for the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

module.exports = pool;