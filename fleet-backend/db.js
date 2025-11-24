const Pool = require('pg').Pool;
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('ERREUR CRITIQUE: Impossible de se connecter à la base de données', err.stack);
  }
  console.log('✅ Connecté à la base de données PostgreSQL');
  release();
});

module.exports = pool;