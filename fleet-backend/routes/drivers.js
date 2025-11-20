const router = require('express').Router();
const pool = require('../db');

// Récupérer tous les chauffeurs avec leur performance (Requête Avancée)
router.get('/', async (req, res) => {
  try {
    // On calcule le score basé sur la conso moyenne de leurs trajets
    // C'est une requête SQL complexe (Requête Différenciante)
    const query = `
      SELECT 
        d.*,
        COUNT(m.id) as total_missions,
        COALESCE(AVG(f.consumption_rate), 0) as avg_conso_score
      FROM drivers d
      LEFT JOIN missions m ON d.id = m.driver_id
      LEFT JOIN fuel_logs f ON d.id = f.driver_id
      GROUP BY d.id
      ORDER BY d.nom ASC
    `;
    const drivers = await pool.query(query);
    res.json(drivers.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Ajouter un chauffeur
router.post('/', async (req, res) => {
  try {
    const { nom, telephone, status } = req.body;
    const newDriver = await pool.query(
      "INSERT INTO drivers (nom, telephone, status) VALUES($1, $2, $3) RETURNING *",
      [nom, telephone, status || 'Disponible']
    );
    res.json(newDriver.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;