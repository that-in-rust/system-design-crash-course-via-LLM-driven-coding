// ============================================================================
// Database Connection Pool Manager
// ============================================================================
// Following pattern: 4-word naming convention
// Pattern: noun + verb + object + qualifier
// ============================================================================

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// ============================================================================
// Connection Pool Configuration
// ============================================================================

const poolConfigurationSettings = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'marauders_map',
  user: process.env.DB_USER || 'marauders_app',
  password: process.env.DB_PASSWORD || 'change_this_password',

  // Pool settings
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if no connection available
};

// ============================================================================
// Create Pool Instance
// ============================================================================

export const pool = new Pool(poolConfigurationSettings);

// ============================================================================
// Event Handlers for Debugging
// ============================================================================

pool.on('connect', () => {
  console.log('📦 New client connected to Gringotts vault');
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client:', err);
  process.exit(-1);
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Execute a single query with parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
export async function executeQueryWithParameters(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection success status
 */
export async function testDatabaseConnectionStatus() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// ============================================================================
// Export Pool Instance
// ============================================================================

export default pool;
