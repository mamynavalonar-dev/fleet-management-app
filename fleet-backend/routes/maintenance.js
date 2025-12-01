const router = require('express').Router();
const pool = require('../db');

// ===================================================================
// RÉCUPÉRER TOUTES LES ALERTES DE MAINTENANCE
// ===================================================================
router.get('/alerts', async (req, res) => {
  try {
    const query = `
      SELECT 
        v.id as vehicle_id,
        v.immatriculation,
        v.marque,
        mr.id as rule_id,
        mr.type_maintenance,
        mr.frequence_km,
        mr.description,
        COALESCE(MAX(f.km_arrivee), 0) as dernier_km,
        (COALESCE(MAX(f.km_arrivee), 0) + mr.frequence_km) as prochain_km,
        CASE 
          WHEN (COALESCE(MAX(f.km_arrivee), 0) + mr.frequence_km - COALESCE(MAX(f.km_arrivee), 0)) <= mr.alerte_avant_km 
          THEN true 
          ELSE false 
        END as alerte_active
      FROM vehicles v
      CROSS JOIN maintenance_rules mr
      LEFT JOIN fuel_logs f ON v.id = f.vehicle_id
      WHERE v.status = 'Actif'
      GROUP BY v.id, v.immatriculation, v.marque, mr.id, mr.type_maintenance, mr.frequence_km, mr.description, mr.alerte_avant_km
      HAVING (COALESCE(MAX(f.km_arrivee), 0) + mr.frequence_km - COALESCE(MAX(f.km_arrivee), 0)) <= mr.alerte_avant_km
      ORDER BY alerte_active DESC, dernier_km DESC
    `;
    
    const alerts = await pool.query(query);
    res.json(alerts.rows);
  } catch (err) {
    console.error("Erreur récupération alertes:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ===================================================================
// RÉCUPÉRER LES RÈGLES DE MAINTENANCE
// ===================================================================
router.get('/rules', async (req, res) => {
  try {
    const rules = await pool.query('SELECT * FROM maintenance_rules ORDER BY id ASC');
    res.json(rules.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===================================================================
// AJOUTER UNE RÈGLE DE MAINTENANCE
// ===================================================================
router.post('/rules', async (req, res) => {
  try {
    const { type_maintenance, frequence_km, alerte_avant_km, description } = req.body;
    
    const newRule = await pool.query(
      `INSERT INTO maintenance_rules (type_maintenance, frequence_km, alerte_avant_km, description) 
       VALUES($1, $2, $3, $4) RETURNING *`,
      [type_maintenance, frequence_km, alerte_avant_km, description]
    );
    
    res.json(newRule.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===================================================================
// ENREGISTRER UNE MAINTENANCE EFFECTUÉE
// ===================================================================
router.post('/log', async (req, res) => {
  try {
    const { vehicle_id, rule_id, km_effectue, date_maintenance, notes, cout } = req.body;
    
    const newLog = await pool.query(
      `INSERT INTO maintenance_logs (vehicle_id, rule_id, km_effectue, date_maintenance, notes, cout) 
       VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
      [vehicle_id, rule_id, km_effectue, date_maintenance, notes, cout || 0]
    );
    
    res.json(newLog.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===================================================================
// RÉCUPÉRER L'HISTORIQUE DE MAINTENANCE D'UN VÉHICULE
// ===================================================================
router.get('/history/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    
    const history = await pool.query(
      `SELECT ml.*, mr.type_maintenance, mr.description 
       FROM maintenance_logs ml
       JOIN maintenance_rules mr ON ml.rule_id = mr.id
       WHERE ml.vehicle_id = $1
       ORDER BY ml.date_maintenance DESC`,
      [vehicleId]
    );
    
    res.json(history.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;