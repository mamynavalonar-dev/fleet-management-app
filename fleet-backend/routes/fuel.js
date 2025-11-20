const router = require('express').Router();
const pool = require('../db');

// ==================================================================
// 1. ROUTES SPÉCIFIQUES (Doivent être PLACÉES AVANT les routes /:id)
// ==================================================================

// Route pour les Statistiques du Dashboard (Graphiques + KPI)
router.get('/analytics/dashboard', async (req, res) => {
  try {
    // 1. Stats par mois (pour les graphiques - 6 derniers mois)
    const graphQuery = `
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as mois,
        CAST(SUM(montant) AS INTEGER) as total_cout,
        ROUND(AVG(consumption_rate), 1) as avg_conso
      FROM fuel_logs
      WHERE date > NOW() - INTERVAL '6 months'
      GROUP BY mois
      ORDER BY mois ASC
    `;

    // 2. Stats Globales (pour les cartes KPI en haut)
    const kpiQuery = `
      SELECT 
        COALESCE(SUM(montant), 0) as total_depense,
        COALESCE(AVG(consumption_rate), 0) as conso_globale,
        COALESCE(SUM(distance_daily), 0) as km_total
      FROM fuel_logs
    `;

    // Exécution parallèle
    const [graphData, kpiData] = await Promise.all([
      pool.query(graphQuery),
      pool.query(kpiQuery)
    ]);

    res.json({
      charts: graphData.rows,
      kpis: kpiData.rows[0]
    });

  } catch (err) {
    console.error("Erreur Analytics:", err.message);
    res.status(500).send("Erreur Serveur");
  }
});

// ==================================================================
// 2. ROUTE PRINCIPALE (Liste avec Pagination, Tri, Recherche)
// ==================================================================

router.get('/', async (req, res) => {
  try {
    // Paramètres avec valeurs par défaut
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    
    const offset = (page - 1) * limit;

    // Clause de recherche
    const searchClause = search 
      ? `AND (v.immatriculation ILIKE $3 OR d.nom ILIKE $3)` 
      : '';
    
    const queryParams = [limit, offset];
    if (search) queryParams.push(`%${search}%`);

    // Sécurisation du tri
    const allowedSorts = ['date', 'litres', 'montant', 'km_parcours', 'consumption_rate'];
    const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'date';

    // Requête Données
    const dataQuery = `
      SELECT f.*, v.immatriculation, d.nom as chauffeur_nom 
      FROM fuel_logs f
      JOIN vehicles v ON f.vehicle_id = v.id
      LEFT JOIN drivers d ON f.driver_id = d.id
      WHERE 1=1 ${searchClause}
      ORDER BY f.${safeSortBy} ${sortOrder}
      LIMIT $1 OFFSET $2
    `;

    // Requête Compte Total
    const countQuery = `
      SELECT COUNT(*) 
      FROM fuel_logs f
      JOIN vehicles v ON f.vehicle_id = v.id
      LEFT JOIN drivers d ON f.driver_id = d.id
      WHERE 1=1 ${searchClause}
    `;

    const [logs, countResult] = await Promise.all([
      pool.query(dataQuery, queryParams),
      pool.query(countQuery, search ? [`%${search}%`] : [])
    ]);

    const totalRows = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRows / limit);

    res.json({
      data: logs.rows,
      meta: {
        totalRows,
        totalPages,
        currentPage: page,
        pageSize: limit
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Erreur Serveur");
  }
});

// ==================================================================
// 3. ACTIONS (Création, Suppression)
// ==================================================================

// Ajouter un plein
router.post('/', async (req, res) => {
  try {
    const { vehicle_id, driver_id, date, km_depart, km_arrivee, litres, montant } = req.body;
    
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

// Supprimer un plein (Doit être à la fin car /:id est dynamique)
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

module.exports = router;