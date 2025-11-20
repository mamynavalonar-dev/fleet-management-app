const router = require('express').Router();
const pool = require('../db');

// Récupérer les missions avec détails Véhicule et Chauffeur
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT m.*, v.immatriculation, d.nom as chauffeur_nom 
      FROM missions m
      JOIN vehicles v ON m.vehicle_id = v.id
      LEFT JOIN drivers d ON m.driver_id = d.id
      ORDER BY m.date_debut DESC
    `;
    const missions = await pool.query(query);
    res.json(missions.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Créer une mission
router.post('/', async (req, res) => {
  try {
    const { vehicle_id, driver_id, date_debut, date_fin, description, destination } = req.body;
    const newMission = await pool.query(
      `INSERT INTO missions (vehicle_id, driver_id, date_debut, date_fin, description, destination) 
       VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
      [vehicle_id, driver_id, date_debut, date_fin, description, destination]
    );
    res.json(newMission.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;