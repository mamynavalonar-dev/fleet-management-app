const router = require('express').Router();
const pool = require('../db');

// Get all vehicles
router.get('/', async (req, res) => {
  try {
    const allVehicles = await pool.query('SELECT * FROM vehicles ORDER BY id ASC');
    res.json(allVehicles.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur Serveur");
  }
});

// Récupérer un seul véhicule par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);
    
    // On récupère aussi ses 5 derniers pleins pour l'historique
    const history = await pool.query(
      'SELECT * FROM fuel_logs WHERE vehicle_id = $1 ORDER BY date DESC LIMIT 5', 
      [id]
    );

    res.json({ info: vehicle.rows[0], history: history.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur Serveur");
  }
});


// Ajouter un véhicule
router.post('/', async (req, res) => {
  try {
    const { immatriculation, marque, type } = req.body;
    const newVehicle = await pool.query(
      'INSERT INTO vehicles (immatriculation, marque, type) VALUES($1, $2, $3) RETURNING *',
      [immatriculation, marque, type]
    );
    res.json(newVehicle.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur Serveur");
  }
});

module.exports = router;