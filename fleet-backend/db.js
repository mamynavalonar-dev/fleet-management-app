// Installation requise : npm install pg dotenv
const { Pool } = require('pg');
require('dotenv').config(); // Charge les variables du fichier .env

// Configuration du pool de connexions
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  // Optionnel : nombre max de clients à connecter
  max: 20, 
  idleTimeoutMillis: 30000, 
  connectionTimeoutMillis: 2000, 
});

// Test de connexion (Optionnel mais fortement recommandé)
pool.on('connect', () => {
  console.log('✅ Connexion à PostgreSQL établie avec succès.');
});

pool.on('error', (err, client) => {
  console.error('❌ Erreur inattendue sur un client PostgreSQL (non fatal):', err.message);
  // Processus de redémarrage ou de logging
  process.exit(1); 
});

module.exports = {
  // Pour les requêtes simples (pool.query('SELECT * ...'))
  query: (text, params) => pool.query(text, params),
  // Pour les transactions complexes (pool.connect().then(client => ...))
  pool, 
};