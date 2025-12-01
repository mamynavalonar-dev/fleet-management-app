const router = require('express').Router();
const pool = require('../db');
const multer = require('multer');
const xlsx = require('xlsx');

// Configuration Multer pour l'upload de fichiers
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ==================================================================
// 🧠 LOGIQUE MÉTIER (Détection de Fraude & Calculs)
// ==================================================================
const optimizeFuelData = (litres, montant, km_depart, km_arrivee_brut) => {
  let km_arrivee = km_arrivee_brut;
  let distance = km_arrivee - km_depart;
  let consumption = 0;
  let isReplein = true;
  let warnings = [];
  let adjusted = false;
  let fraud_flag = false;

  // Règle 1 : Si Montant < 200 000 Ar => C'est un appoint (Non Replein)
  if (montant < 200000) {
    isReplein = false;
    consumption = 0; 
  } else {
    // Calcul initial
    if (distance > 0) {
      consumption = (litres / distance) * 100;
    }

    // Règle 2 : Détection d'anomalie (Norme 13L - 16L)
    if (consumption > 0 && (consumption < 13 || consumption > 16)) {
      fraud_flag = true;
      warnings.push(`⚠️ ANOMALIE DÉTECTÉE: Consommation ${consumption.toFixed(1)} L/100 km (Norme: 13-16)`);
      
      const targetConso = 14.5;
      const idealDistance = Math.round((litres * 100) / targetConso);
      const expectedKm = km_depart + idealDistance;
      
      warnings.push(`📊 KM Attendu: ${expectedKm.toLocaleString()} km (vs ${km_arrivee.toLocaleString()} déclaré)`);
      
      const ecartPourcent = Math.abs((km_arrivee - expectedKm) / expectedKm) * 100;
      if (ecartPourcent > 30) {
        warnings.push(`🚨 FRAUDE PROBABLE: Écart de ${ecartPourcent.toFixed(0)}% par rapport à la normale`);
      }
    }
  }

  // Règle 3 : KM Journalier aberrant
  if (distance > 120) {
    warnings.push("⚠️ KM > 120 (Distance journalière inhabituelle)");
  }

  const raw_consumption = consumption;
  
  // Si fraude suspectée, on met la conso affichée à 0 pour ne pas fausser les moyennes
  if (fraud_flag) {
    consumption = 0; 
  }

  return {
    km_arrivee, consumption, raw_consumption, isReplein, adjusted, fraud_flag, warnings
  };
};

// ==================================================================
// 🚨 ROUTES SPÉCIFIQUES (DOIVENT ÊTRE EN PREMIER !!!)
// ==================================================================

// 1. Analytics Dashboard
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const graphQuery = `
      SELECT TO_CHAR(date, 'YYYY-MM') as mois, 
             CAST(SUM(montant) AS INTEGER) as total_cout, 
             ROUND(AVG(NULLIF(consumption_rate, 0)), 1) as avg_conso
      FROM fuel_logs 
      WHERE date > NOW() - INTERVAL '6 months' AND is_deleted = false
      GROUP BY mois ORDER BY mois ASC
    `;
    const kpiQuery = `
      SELECT 
        COALESCE(SUM(montant), 0) as total_depense, 
        COALESCE(AVG(NULLIF(consumption_rate, 0)), 0) as conso_globale, 
        COALESCE(SUM(km_arrivee - km_depart), 0) as km_total,
        (SELECT COUNT(*) FROM fuel_logs WHERE fraud_flag = true AND is_deleted = false) as total_anomalies
      FROM fuel_logs
      WHERE is_deleted = false
    `;
    const [graphData, kpiData] = await Promise.all([
      pool.query(graphQuery), 
      pool.query(kpiQuery)
    ]);
    res.json({ charts: graphData.rows, kpis: kpiData.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur Serveur" });
  }
});

// 2. Export Excel
router.get('/data/export', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.date, v.immatriculation, d.nom as chauffeur, 
             f.km_depart, f.km_arrivee, f.litres, f.montant, f.consumption_rate
      FROM fuel_logs f
      JOIN vehicles v ON f.vehicle_id = v.id
      LEFT JOIN drivers d ON f.driver_id = d.id
      WHERE f.is_deleted = false
      ORDER BY f.date DESC
    `);
    
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(result.rows), "Export");
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur Export");
  }
});

// 3. Récupération des Fraudes (CORRECTION ICI : PLACÉ AVANT /:id)
router.get('/frauds', async (req, res) => {
  try {
    const query = `
      SELECT f.*, v.immatriculation, d.nom as chauffeur_nom 
      FROM fuel_logs f
      JOIN vehicles v ON f.vehicle_id = v.id
      LEFT JOIN drivers d ON f.driver_id = d.id
      WHERE f.fraud_flag = true AND f.is_deleted = false
      ORDER BY f.date DESC
    `;
    const frauds = await pool.query(query);
    res.json(frauds.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur Serveur" });
  }
});

// 4. Import Excel
router.post('/data/import', upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  try {
    if (!req.file) return res.status(400).send("Aucun fichier reçu");
    console.log(`[IMPORT] Fichier reçu: ${req.file.originalname}`);
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    
    let totalSuccessCount = 0;
    let sheetsProcessed = 0;

    await client.query('BEGIN');

    for (const sheetName of workbook.SheetNames) {
      console.log(`[IMPORT] Traitement feuille : "${sheetName}"`);
      const sheet = workbook.Sheets[sheetName];
      const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      if (!rawRows || rawRows.length === 0) continue;

      let sheetVehicleId = null;
      let headerRowIndex = -1;
      let colMap = {}; 

      // Scan des entêtes (Simplifié pour la réponse, garder votre logique complète si besoin)
      const scanLimit = Math.min(rawRows.length, 20);
      for (let i = 0; i < scanLimit; i++) {
        const row = rawRows[i];
        if (!row) continue;
        if (!sheetVehicleId) {
          for (let cell of row) {
            if (cell && typeof cell === 'string' && cell.length >= 4) {
              const cleanCell = cell.replace(/\s/g, '').toUpperCase();
              const vCheck = await client.query("SELECT id FROM vehicles WHERE REPLACE(UPPER(immatriculation), ' ', '') = $1", [cleanCell]);
              if (vCheck.rows.length > 0) sheetVehicleId = vCheck.rows[0].id;
            }
          }
        }
        const rowStr = row.map(c => c ? c.toString().toUpperCase() : '').join(' ');
        if (headerRowIndex === -1 && rowStr.includes('DATE') && (rowStr.includes('KM') || rowStr.includes('KILOM'))) {
            headerRowIndex = i;
            // Mapping basique (adapter selon votre logique existante)
            colMap.date = row.findIndex(c => c && c.toString().toUpperCase().trim() === 'DATE');
            colMap.litres = row.findIndex(c => c && (c.toString().toUpperCase().includes('LITRE') || c.toString().toUpperCase().includes('QTÉ')));
            colMap.montant = row.findIndex(c => c && (c.toString().toUpperCase().includes('MONTANT') || c.toString().toUpperCase().includes('PRIX')));
            colMap.km_depart = row.findIndex(c => c && (c.toString().toUpperCase().includes('DÉPART') || c.toString().toUpperCase().includes('DEPART')));
            colMap.km_arrivee = row.findIndex(c => c && (c.toString().toUpperCase().includes('ARRIVÉE') || c.toString().toUpperCase().includes('ARRIVEE')));
        }
      }

      if (!sheetVehicleId || headerRowIndex === -1) continue;

      for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row) continue;
        try {
            const rawDate = row[colMap.date];
            if (!rawDate) continue;
            let dateFinal = typeof rawDate === 'number' ? new Date(Math.round((rawDate - 25569) * 86400 * 1000)) : new Date(rawDate);
            if (isNaN(dateFinal.getTime()) || dateFinal.getFullYear() < 2000) continue;

            const parseNum = (val) => val ? (typeof val === 'number' ? val : parseFloat(val.toString().replace(/\s/g, '').replace(',', '.')) || 0) : 0;
            const litres = parseNum(row[colMap.litres]);
            const montant = parseNum(row[colMap.montant]);
            const km_depart = parseNum(row[colMap.km_depart]);
            const raw_km_arrivee = parseNum(row[colMap.km_arrivee]);

            if (litres <= 0 && montant <= 0) continue;

            const smartData = optimizeFuelData(litres, montant, km_depart, raw_km_arrivee);

            await client.query(
                `INSERT INTO fuel_logs (vehicle_id, date, km_depart, km_arrivee, litres, montant, consumption_rate, raw_consumption, fraud_flag, warnings)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [sheetVehicleId, dateFinal, km_depart, smartData.km_arrivee, litres, montant, smartData.consumption, smartData.raw_consumption, smartData.fraud_flag, JSON.stringify(smartData.warnings)]
            );
            totalSuccessCount++;
        } catch (e) {}
      }
      sheetsProcessed++;
    }

    await client.query('COMMIT');
    res.json({ message: `${totalSuccessCount} lignes importées sur ${sheetsProcessed} feuilles.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Erreur Import:", err);
    res.status(500).send("Erreur Import: " + err.message);
  } finally {
    client.release();
  }
});

// 5. Validation Alertes Fraude
router.put('/frauds/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; 
    if (action === 'approve') {
      await pool.query(`UPDATE fuel_logs SET fraud_flag = false WHERE id = $1`, [id]);
    } else if (action === 'reject') {
      await pool.query(`UPDATE fuel_logs SET is_deleted = true, warnings = $1 WHERE id = $2`, [JSON.stringify(['🚨 FRAUDE CONFIRMÉE - Ligne supprimée']), id]);
    }
    res.json({ message: "Action effectuée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur Serveur" });
  }
});

// 6. Gestion Corbeille
router.put('/trash/:id', async (req, res) => {
    try {
        await pool.query('UPDATE fuel_logs SET is_deleted = true WHERE id = $1', [req.params.id]);
        res.json({ message: "Plein mis à la corbeille" });
    } catch (err) { res.status(500).send("Erreur"); }
});

router.put('/restore/:id', async (req, res) => {
    try {
        await pool.query('UPDATE fuel_logs SET is_deleted = false WHERE id = $1', [req.params.id]);
        res.json({ message: "Plein restauré" });
    } catch (err) { res.status(500).send("Erreur"); }
});

// ==================================================================
// 🏁 ROUTES GÉNÉRIQUES (EN DERNIER)
// ==================================================================

// GET Global (avec filtres & pagination)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const isDeleted = req.query.deleted === 'true';

    // Clauses de recherche dynamiques
    let whereClause = `WHERE f.is_deleted = $1`;
    let queryParams = [isDeleted];
    let countParams = [isDeleted];
    
    if (search) {
        whereClause += ` AND (v.immatriculation ILIKE $2 OR d.nom ILIKE $2)`;
        queryParams.push(`%${search}%`);
        countParams.push(`%${search}%`);
    }

    const dataQuery = `
      SELECT f.*, v.immatriculation, d.nom as chauffeur_nom 
      FROM fuel_logs f
      JOIN vehicles v ON f.vehicle_id = v.id
      LEFT JOIN drivers d ON f.driver_id = d.id
      ${whereClause}
      ORDER BY f.date DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    // Ajout limit et offset
    queryParams.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) FROM fuel_logs f 
      JOIN vehicles v ON f.vehicle_id = v.id 
      LEFT JOIN drivers d ON f.driver_id = d.id 
      ${whereClause}
    `;

    const [logs, countResult] = await Promise.all([
      pool.query(dataQuery, queryParams), 
      pool.query(countQuery, countParams)
    ]);

    res.json({ 
      data: logs.rows, 
      meta: { 
        totalRows: parseInt(countResult.rows[0].count), 
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit), 
        currentPage: page 
      } 
    });
  } catch (err) {
    console.error("Erreur route /fuel:", err);
    res.status(500).json({ error: "Erreur Serveur", details: err.message });
  }
});

// GET By ID (Maintenant placé APRES les routes spécifiques comme /frauds)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Sécurité supplémentaire
    if (isNaN(id)) return res.status(400).json({ error: "ID invalide" });

    const result = await pool.query(`
      SELECT f.*, v.immatriculation, d.nom as chauffeur_nom 
      FROM fuel_logs f
      JOIN vehicles v ON f.vehicle_id = v.id
      LEFT JOIN drivers d ON f.driver_id = d.id
      WHERE f.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: "Plein introuvable" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur Serveur" });
  }
});

// CREATE
router.post('/', async (req, res) => {
    try {
        const { vehicle_id, driver_id, date, km_depart, km_arrivee, litres, montant } = req.body;
        const safeDriverId = (driver_id === '' || driver_id === 'undefined') ? null : parseInt(driver_id);
        
        const smartData = optimizeFuelData(parseFloat(litres), parseFloat(montant), parseFloat(km_depart), parseFloat(km_arrivee));

        const newLog = await pool.query(
            `INSERT INTO fuel_logs (vehicle_id, driver_id, date, km_depart, km_arrivee, litres, montant, consumption_rate, raw_consumption, fraud_flag, warnings) 
             VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [parseInt(vehicle_id), safeDriverId, date, parseFloat(km_depart), smartData.km_arrivee, parseFloat(litres), parseFloat(montant), smartData.consumption, smartData.raw_consumption, smartData.fraud_flag, JSON.stringify(smartData.warnings)]
        );
        res.json(newLog.rows[0]);
    } catch (err) {
        console.error("Erreur CREATE:", err);
        res.status(500).json({ error: "Erreur Serveur: " + err.message });
    }
});

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, driver_id, date, km_depart, km_arrivee, litres, montant } = req.body;
    const safeDriverId = (driver_id === '' || driver_id === 'undefined') ? null : parseInt(driver_id);

    const smartData = optimizeFuelData(parseFloat(litres), parseFloat(montant), parseFloat(km_depart), parseFloat(km_arrivee));

    const updatedLog = await pool.query(
      `UPDATE fuel_logs 
       SET vehicle_id = $1, driver_id = $2, date = $3, 
           km_depart = $4, km_arrivee = $5, litres = $6, 
           montant = $7, consumption_rate = $8,
           raw_consumption = $9, fraud_flag = $10, warnings = $11
       WHERE id = $12 RETURNING *`,
      [vehicle_id, safeDriverId, date, km_depart, smartData.km_arrivee, litres, montant, smartData.consumption, smartData.raw_consumption, smartData.fraud_flag, JSON.stringify(smartData.warnings), id]
    );
    res.json(updatedLog.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur Serveur" });
  }
});

// DELETE (Hard)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM fuel_logs WHERE id = $1', [req.params.id]);
    res.json({ message: "Supprimé définitivement" });
  } catch (err) { res.status(500).json({ error: "Erreur Serveur" }); }
});

module.exports = router;