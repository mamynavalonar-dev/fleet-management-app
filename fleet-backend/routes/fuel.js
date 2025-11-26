const router = require('express').Router();
const pool = require('../db');
const multer = require('multer');
const xlsx = require('xlsx');

// Configuration Multer pour l'upload de fichiers
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ==================================================================
// 🧠 LOGIQUE MÉTIER (Votre "Cerveau" de gestion)
// ==================================================================
const optimizeFuelData = (litres, montant, km_depart, km_arrivee_brut) => {
  let km_arrivee = km_arrivee_brut;
  let distance = km_arrivee - km_depart;
  let consumption = 0;
  let isReplein = true;
  let warnings = [];
  let adjusted = false;

  // Règle 1 : Si Montant < 200 000 Ar => C'est un appoint (Non Replein)
  if (montant < 200000) {
    isReplein = false;
    consumption = 0; // Pas de calcul de conso sur un appoint
  } else {
    // Calcul initial
    if (distance > 0) {
      consumption = (litres / distance) * 100;
    }

    // Règle 2 : Norme Conso entre 13 et 16 L/100
    // Si hors norme, on ajuste le KM Arrivée pour tomber sur 14.5 (Moyenne idéale)
    if (consumption > 0 && (consumption < 13 || consumption > 16)) {
      const targetConso = 14.5;
      // Formule inverse : Distance = (Litres * 100) / ConsoCible
      const idealDistance = Math.round((litres * 100) / targetConso);
      
      // On met à jour le KM Arrivée
      km_arrivee = km_depart + idealDistance;
      distance = idealDistance;
      consumption = targetConso; // La conso est maintenant parfaite
      adjusted = true;
    }
  }

  // Règle 3 : KM Journalier ne doit pas dépasser 120
  if (distance > 120) {
    warnings.push("⚠️ KM > 120");
  }

  return {
    km_arrivee,      // Le nouveau KM (potentiellement corrigé)
    consumption,     // La conso (lissée ou 0)
    isReplein,
    adjusted,        // Booléen pour savoir si on a touché aux chiffres
    warnings
  };
};

// ==================================================================
// 1. ANALYTICS (Dashboard)
// ==================================================================
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const graphQuery = `
      SELECT TO_CHAR(date, 'YYYY-MM') as mois, 
             CAST(SUM(montant) AS INTEGER) as total_cout, 
             ROUND(AVG(NULLIF(consumption_rate, 0)), 1) as avg_conso
      FROM fuel_logs 
      WHERE date > NOW() - INTERVAL '6 months' 
      GROUP BY mois 
      ORDER BY mois ASC
    `;
    const kpiQuery = `
      SELECT 
        COALESCE(SUM(montant), 0) as total_depense, 
        COALESCE(AVG(NULLIF(consumption_rate, 0)), 0) as conso_globale, 
        COALESCE(SUM(km_arrivee - km_depart), 0) as km_total 
      FROM fuel_logs
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

// ==================================================================
// 2. LECTURE (Tableau avec Filtres Avancés Style Excel)
// ==================================================================
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    const offset = (page - 1) * limit;

    // --- Récupération des filtres spécifiques ---
    // Le frontend peut envoyer ?search=... (global) OU des champs précis
    const searchGlobal = req.query.search || '';
    
    // On prépare les conditions SQL dynamiques
    let whereClauses = ["1=1"]; // Toujours vrai par défaut
    let values = [];
    let paramCounter = 1;

    // Fonction utilitaire pour ajouter un filtre
    const addFilter = (field, value, operator = 'ILIKE') => {
      if (value) {
        whereClauses.push(`${field} ${operator} $${paramCounter}`);
        values.push(operator === 'ILIKE' ? `%${value}%` : value);
        paramCounter++;
      }
    };

    // 1. Recherche Globale (Barre du haut)
    // Si on a une recherche globale, elle cherche partout (OR)
    if (searchGlobal) {
      whereClauses.push(`(v.immatriculation ILIKE $${paramCounter} OR d.nom ILIKE $${paramCounter})`);
      values.push(`%${searchGlobal}%`);
      paramCounter++;
    }

    // 2. Filtres par Colonne (Menus déroulants)
    // Note: Le frontend envoie parfois tout dans 'search', 
    // mais pour être précis, il faudrait modifier le frontend pour envoyer ?immatriculation=...
    // Ici, on supporte les deux approches si vous évoluez le frontend.
    
    addFilter('v.immatriculation', req.query.immatriculation);
    addFilter('d.nom', req.query.chauffeur_nom);
    
    // Pour les chiffres/dates, on peut faire des égalités strictes ou range
    if (req.query.date) {
      // Recherche par date exacte (ou partiel sur le string converti)
      whereClauses.push(`TO_CHAR(f.date, 'YYYY-MM-DD') ILIKE $${paramCounter}`);
      values.push(`%${req.query.date}%`);
      paramCounter++;
    }
    
    if (req.query.litres) {
      // Recherche exacte pour les chiffres (ou ajuster selon besoin > <)
      whereClauses.push(`CAST(f.litres AS TEXT) ILIKE $${paramCounter}`);
      values.push(`%${req.query.litres}%`);
      paramCounter++;
    }

    if (req.query.montant) {
      whereClauses.push(`CAST(f.montant AS TEXT) ILIKE $${paramCounter}`);
      values.push(`%${req.query.montant}%`);
      paramCounter++;
    }

    const whereString = whereClauses.join(' AND ');

    // Sécurisation du tri
    const allowedSorts = ['date', 'litres', 'montant', 'consumption_rate', 'immatriculation', 'chauffeur_nom'];
    // Mapping pour les champs qui sont dans des tables jointes
    let safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'date';
    if (safeSortBy === 'immatriculation') safeSortBy = 'v.immatriculation';
    if (safeSortBy === 'chauffeur_nom') safeSortBy = 'd.nom';
    if (!safeSortBy.includes('.')) safeSortBy = `f.${safeSortBy}`; // Par défaut table fuel_logs (f)

    // --- Requête Principale ---
    const dataQuery = `
      SELECT f.*, v.immatriculation, d.nom as chauffeur_nom 
      FROM fuel_logs f
      JOIN vehicles v ON f.vehicle_id = v.id
      LEFT JOIN drivers d ON f.driver_id = d.id
      WHERE ${whereString}
      ORDER BY ${safeSortBy} ${sortOrder}
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    // --- Requête de Comptage (pour la pagination) ---
    const countQuery = `
      SELECT COUNT(*) 
      FROM fuel_logs f 
      JOIN vehicles v ON f.vehicle_id = v.id 
      LEFT JOIN drivers d ON f.driver_id = d.id 
      WHERE ${whereString}
    `;

    // Exécution
    const finalParams = [...values, limit, offset]; // Paramètres pour data
    const countParams = [...values]; // Paramètres pour count

    const [logs, countResult] = await Promise.all([
      pool.query(dataQuery, finalParams), 
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

// ==================================================================
// 3. DÉTAILS D'UN PLEIN
// ==================================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT f.*, v.immatriculation, d.nom as chauffeur_nom 
      FROM fuel_logs f
      JOIN vehicles v ON f.vehicle_id = v.id
      LEFT JOIN drivers d ON f.driver_id = d.id
      WHERE f.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Plein introuvable" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur Serveur" });
  }
});

// ==================================================================
// 4. EXPORT EXCEL
// ==================================================================
router.get('/data/export', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.date, v.immatriculation, d.nom as chauffeur, 
             f.km_depart, f.km_arrivee, f.litres, f.montant, f.consumption_rate
      FROM fuel_logs f
      JOIN vehicles v ON f.vehicle_id = v.id
      LEFT JOIN drivers d ON f.driver_id = d.id
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

// ==================================================================
// 5. IMPORT EXCEL (MULTI-FEUILLES & INTELLIGENT)
// ==================================================================
router.post('/data/import', upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  try {
    if (!req.file) return res.status(400).send("Aucun fichier reçu");

    console.log(`[IMPORT] Fichier reçu: ${req.file.originalname}`);
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    
    let totalSuccessCount = 0;
    let sheetsProcessed = 0;

    await client.query('BEGIN');

    // --- BOUCLE SUR TOUTES LES FEUILLES ---
    for (const sheetName of workbook.SheetNames) {
      console.log(`[IMPORT] Traitement de la feuille : "${sheetName}"`);
      const sheet = workbook.Sheets[sheetName];
      const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      if (!rawRows || rawRows.length === 0) continue;

      let sheetVehicleId = null;
      let headerRowIndex = -1;
      let colMap = {}; 
      let sheetSuccessCount = 0;

      // 1. Scanner l'entête
      const scanLimit = Math.min(rawRows.length, 20);
      for (let i = 0; i < scanLimit; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;
        
        // Détection Véhicule
        if (!sheetVehicleId) {
          for (let cell of row) {
            if (cell && typeof cell === 'string' && cell.length >= 4) {
              const cleanCell = cell.replace(/\s/g, '').toUpperCase();
              const vCheck = await client.query(
                "SELECT id FROM vehicles WHERE REPLACE(UPPER(immatriculation), ' ', '') = $1", 
                [cleanCell]
              );
              if (vCheck.rows.length > 0) {
                sheetVehicleId = vCheck.rows[0].id;
                console.log(`   -> Véhicule trouvé: ${cleanCell}`);
              }
            }
          }
        }

        // Détection Colonnes
        const rowStr = row.map(c => c ? c.toString().toUpperCase() : '').join(' ');
        if (headerRowIndex === -1 && rowStr.includes('DATE') && (rowStr.includes('KM') || rowStr.includes('KILOM'))) {
          const nextRow = rawRows[i+1];
          headerRowIndex = i;
          console.log(`   -> Entêtes détectés ligne ${i+1}`);

          // Helper pour chercher les colonnes
          const findCol = (k1, k2) => {
            let idx = row.findIndex(c => c && c.toString().toUpperCase().includes(k1));
            if (idx === -1 && nextRow) idx = nextRow.findIndex(c => c && c.toString().toUpperCase().includes(k1));
            if (idx === -1 && k2) {
                idx = row.findIndex(c => c && c.toString().toUpperCase().includes(k2));
                if (idx === -1 && nextRow) idx = nextRow.findIndex(c => c && c.toString().toUpperCase().includes(k2));
            }
            return idx;
          };

          colMap.date = row.findIndex(c => c && c.toString().toUpperCase().trim() === 'DATE');
          colMap.chauffeur = row.findIndex(c => c && c.toString().toUpperCase().includes('CHAUFFEUR'));
          colMap.litres = findCol('LITRE', 'QTÉ');
          colMap.montant = findCol('MONTANT', 'PRIX');
          colMap.km_depart = findCol('DÉPART', 'DEPART');
          colMap.km_arrivee = findCol('ARRIVÉE', 'ARRIVEE');
          
          // Fallbacks
          if (colMap.km_depart === -1) colMap.km_depart = findCol('DÉBUT', 'DEBUT');
          if (colMap.km_arrivee === -1) colMap.km_arrivee = findCol('FIN', 'INDEX');
        }
      }

      if (!sheetVehicleId || headerRowIndex === -1) {
        console.log(`[IMPORT] ⚠️ Feuille "${sheetName}" ignorée.`);
        continue;
      }

      // 2. Traitement des lignes
      for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row) continue;

        try {
          const rawDate = row[colMap.date];
          if (!rawDate) continue;

          let dateFinal;
          if (typeof rawDate === 'number') dateFinal = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
          else dateFinal = new Date(rawDate);
          
          if (isNaN(dateFinal.getTime()) || dateFinal.getFullYear() < 2000) continue;

          const parseNum = (val) => {
            if (!val) return 0;
            if (typeof val === 'number') return val;
            return parseFloat(val.toString().replace(/\s/g, '').replace(',', '.')) || 0;
          };

          const litres = parseNum(row[colMap.litres]);
          const montant = parseNum(row[colMap.montant]);
          const km_depart = parseNum(row[colMap.km_depart]);
          const raw_km_arrivee = parseNum(row[colMap.km_arrivee]);

          if (litres <= 0 && montant <= 0) continue;

          // --- APPLICATION LOGIQUE MÉTIER ---
          // On calcule les "vraies" valeurs lissées
          const smartData = optimizeFuelData(litres, montant, km_depart, raw_km_arrivee);

          // Chauffeur
          let driver_id = null;
          if (colMap.chauffeur !== -1 && row[colMap.chauffeur]) {
            const dRes = await client.query("SELECT id FROM drivers WHERE nom ILIKE $1", [`%${row[colMap.chauffeur]}%`]);
            if (dRes.rows.length > 0) driver_id = dRes.rows[0].id;
          }

          await client.query(
            `INSERT INTO fuel_logs (vehicle_id, driver_id, date, km_depart, km_arrivee, litres, montant, consumption_rate)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              sheetVehicleId, 
              driver_id, 
              dateFinal, 
              km_depart, 
              smartData.km_arrivee, // On insère la valeur corrigée
              litres, 
              montant, 
              smartData.consumption // On insère la conso lissée (ou 0 si < 200k)
            ]
          );
          
          sheetSuccessCount++;
          totalSuccessCount++;

          if(smartData.warnings.length > 0) {
             console.log(`   ⚠️ Alerte ligne ${i}: ${smartData.warnings.join(', ')}`);
          }

        } catch (e) {}
      }
      sheetsProcessed++;
    }

    await client.query('COMMIT');
    
    if (totalSuccessCount === 0 && sheetsProcessed === 0) {
        return res.status(400).json({ message: "Aucune donnée importée." });
    }

    res.json({ message: `${totalSuccessCount} pleins importés et lissés sur ${sheetsProcessed} feuilles.` });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Erreur Import:", err);
    res.status(500).send("Erreur: " + err.message);
  } finally {
    client.release();
  }
});

// ==================================================================
// 6. CREATE (Créer un plein manuellement avec lissage)
// ==================================================================
router.post('/', async (req, res) => {
  try {
    const { vehicle_id, driver_id, date, km_depart, km_arrivee, litres, montant } = req.body;
    
    // --- APPLICATION LOGIQUE MÉTIER ---
    const smartData = optimizeFuelData(
      parseFloat(litres), 
      parseFloat(montant), 
      parseFloat(km_depart), 
      parseFloat(km_arrivee)
    );

    const newLog = await pool.query(
      `INSERT INTO fuel_logs (vehicle_id, driver_id, date, km_depart, km_arrivee, litres, montant, consumption_rate) 
       VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        vehicle_id, 
        driver_id, 
        date, 
        km_depart, 
        smartData.km_arrivee, // Valeur corrigée
        litres, 
        montant, 
        smartData.consumption
      ]
    );
    res.json(newLog.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur Serveur" });
  }
});

// ==================================================================
// 7. UPDATE (Modifier un plein avec lissage)
// ==================================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, driver_id, date, km_depart, km_arrivee, litres, montant } = req.body;
    
    // --- APPLICATION LOGIQUE MÉTIER ---
    const smartData = optimizeFuelData(
        parseFloat(litres), 
        parseFloat(montant), 
        parseFloat(km_depart), 
        parseFloat(km_arrivee)
    );

    const updatedLog = await pool.query(
      `UPDATE fuel_logs 
       SET vehicle_id = $1, driver_id = $2, date = $3, 
           km_depart = $4, km_arrivee = $5, litres = $6, 
           montant = $7, consumption_rate = $8
       WHERE id = $9 RETURNING *`,
      [
        vehicle_id, 
        driver_id, 
        date, 
        km_depart, 
        smartData.km_arrivee, // Valeur corrigée
        litres, 
        montant, 
        smartData.consumption, 
        id
      ]
    );
    
    res.json(updatedLog.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur Serveur" });
  }
});

// ==================================================================
// 8. DELETE
// ==================================================================
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM fuel_logs WHERE id = $1', [req.params.id]);
    res.json({ message: "Supprimé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur Serveur" });
  }
});

module.exports = router;