require('dotenv').config();
const { Pool } = require('pg');

// Configuration du pool de connexions PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'lanocheuser',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE || 'lanoche',
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT_MS) || 30000,
  connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT_MS) || 2000,
});

// Gestion des erreurs de connexion
pool.on('error', (err, client) => {
  console.error('❌ Erreur inattendue sur le client PostgreSQL:', err);
  process.exit(-1);
});

// Vérifier la connexion au démarrage
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erreur de connexion PostgreSQL:', err.stack);
    return;
  }
  console.log('✅ Pool PostgreSQL connecté');
  release();
});

// Helper pour les requêtes avec logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error', { text, error: error.message });
    throw error;
  }
};

// Helper pour les transactions
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  transaction
};
