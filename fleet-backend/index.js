// fleet-backend/index.js
const express = require('express');
const cors = require('cors');
const { authenticateToken, authorizeRoles } = require('./middleware/auth'); 
const pool = require('./db').pool; // Assurez-vous d'importer le pool

const tripsRouter = require('./routes/trips');

const app = express();
const PORT = process.env.PORT || 5000;

// --- 1. Middlewares de base ---
app.use(cors());
app.use(express.json());

// --- 2. Routes Publiques (ACCÈS SANS TOKEN) ---
// La route d'authentification (login, register) DOIT être ici
app.use('/api/auth', require('./routes/auth')); 

// --- 3. Middleware Global d'Authentification ---
// TOUTES les routes déclarées APRÈS cette ligne nécessiteront un token JWT valide.
// Si le token est manquant ou invalide, l'utilisateur recevra un 401 ou 403.
app.use(authenticateToken); 

// --- 4. Routes Protégées (NÉCESSITENT UN TOKEN) ---
// Routes de lecture/écriture (CRUD) de base
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/missions', require('./routes/missions'));
app.use('/api/maintenance', require('./routes/maintenance'));

// Routes Fuel (Carburant)
// Note: Le middleware authorizeRoles est appliqué DANS la route pour affiner les permissions si nécessaire
app.use('/api/fuel', require('./routes/fuel'));
app.use('/api/trips', tripsRouter);

// --- Démarrage du Serveur ---
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});