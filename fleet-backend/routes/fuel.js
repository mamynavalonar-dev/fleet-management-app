const router = require('express').Router();
const pool = require('../db');

// --- ROUTE ANALYTICS (Pour le Dashboard) ---
router.get('/analytics/dashboard', async (req, res) => {
  try {
    // 1. Stats par mois (pour les graphiques)
    const graphQuery = `
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as mois,
        SUM(montant) as total_cout,
        AVG(consumption_rate) as avg_conso
      FROM fuel_logs
      WHERE date > NOW() - INTERVAL '6 months' -- Derniers 6 mois
      GROUP BY mois
      ORDER BY mois ASC
    `;

    // 2. Stats Globales (pour les cartes KPI en haut)
    const kpiQuery = `
      SELECT 
        SUM(montant) as total_depense,
        AVG(consumption_rate) as conso_globale,
        SUM(distance_daily) as km_total
      FROM fuel_logs
    `;

    const [graphData, kpiData] = await Promise.all([
      pool.query(graphQuery),
      pool.query(kpiQuery)
    ]);

    res.json({
      charts: graphData.rows,
      kpis: kpiData.rows[0]
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});


// 1. Récupérer l'historique complet
router.get('/', async (req, res) => {
  try {
    // Jointure pour avoir le nom du véhicule et du chauffeur au lieu des IDs
    const query = `
      SELECT f.*, v.immatriculation, d.nom as chauffeur_nom 
      FROM fuel_logs f
      JOIN vehicles v ON f.vehicle_id = v.id
      LEFT JOIN drivers d ON f.driver_id = d.id
      ORDER BY f.date DESC
    `;
    const logs = await pool.query(query);
    res.json(logs.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur Serveur");
  }
});

// 2. REQUÊTE AVANCÉE : KPI Consommation & Coûts (Pour le Dashboard)
router.get('/stats/monthly', async (req, res) => {
  try {
    const query = `
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as mois,
        SUM(montant) as total_cout,
        SUM(litres) as total_litres,
        ROUND(AVG(consumption_rate), 2) as consommation_moyenne
      FROM fuel_logs
      GROUP BY mois
      ORDER BY mois DESC
      LIMIT 12
    `;
    const stats = await pool.query(query);
    res.json(stats.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur Serveur");
  }
});

// Supprimer une ligne carburant
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM fuel_logs WHERE id = $1', [id]);
    res.json({ message: "Supprimé avec succès" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur Serveur");
  }
});

// 3. Créer une entrée carburant (Logique métier : calcul auto de la conso)
router.post('/', async (req, res) => {
  try {
    const { vehicle_id, driver_id, date, km_depart, km_arrivee, litres, montant } = req.body;
    
    // Calcul automatique de la consommation aux 100km
    let consumption_rate = 0;
    const distance = km_arrivee - km_depart;
    if (distance > 0 && litres > 0) {
      consumption_rate = (litres / distance) * 100;
    }

    const newLog = await pool.query(
      `INSERT INTO fuel_logs (vehicle_id, driver_id, date, km_depart, km_arrivee, litres, montant, consumption_rate) 
       VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [vehicle_id, driver_id, date, km_depart, km_arrivee, litres, montant, consumption_rate]
    );
    
    res.json(newLog.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur Serveur");
  }
});

module.exports = router;