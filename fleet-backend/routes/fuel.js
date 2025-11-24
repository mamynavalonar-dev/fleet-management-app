const router = require('express').Router();
const pool = require('../db');
const multer = require('multer');
const xlsx = require('xlsx');

// Configuration Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ==================================================================
// 1. ANALYTICS (Dashboard)
// ==================================================================
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const graphQuery = `
      SELECT TO_CHAR(date, 'YYYY-MM') as mois, CAST(SUM(montant) AS INTEGER) as total_cout, ROUND(AVG(consumption_rate), 1) as avg_conso
      FROM fuel_logs WHERE date > NOW() - INTERVAL '6 months' GROUP BY mois ORDER BY mois ASC
    `;
    const kpiQuery = `SELECT COALESCE(SUM(montant), 0) as total_depense, COALESCE(AVG(consumption_rate), 0) as conso_globale, COALESCE(SUM(distance_daily), 0) as km_total FROM fuel_logs`;
    const [graphData, kpiData] = await Promise.all([pool.query(graphQuery), pool.query(kpiQuery)]);
    res.json({ charts: graphData.rows, kpis: kpiData.rows[0] });
  } catch (err) { res.status(500).send("Erreur Serveur"); }
});

// ==================================================================
// 2. LECTURE (Tableau)
// ==================================================================
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    const offset = (page - 1) * limit;

    const searchClause = search ? `AND (v.immatriculation ILIKE $3 OR d.nom ILIKE $3)` : '';
    const queryParams = [limit, offset];
    if (search) queryParams.push(`%${search}%`);

    const allowedSorts = ['date', 'litres', 'montant', 'km_parcours', 'consumption_rate'];
    const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'date';

    const dataQuery = `
      SELECT f.*, v.immatriculation, d.nom as chauffeur_nom 
      FROM fuel_logs f
      JOIN vehicles v ON f.vehicle_id = v.id
      LEFT JOIN drivers d ON f.driver_id = d.id
      WHERE 1=1 ${searchClause}
      ORDER BY f.${safeSortBy} ${sortOrder}
      LIMIT $1 OFFSET $2
    `;
    const countQuery = `SELECT COUNT(*) FROM fuel_logs f JOIN vehicles v ON f.vehicle_id = v.id LEFT JOIN drivers d ON f.driver_id = d.id WHERE 1=1 ${searchClause}`;

    const [logs, countResult] = await Promise.all([pool.query(dataQuery, queryParams), pool.query(countQuery, search ? [`%${search}%`] : [])]);
    res.json({ data: logs.rows, meta: { totalRows: parseInt(countResult.rows[0].count), totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit), currentPage: page } });
  } catch (err) { res.status(500).send("Erreur Serveur"); }
});

// ==================================================================
// 3. EXPORT EXCEL
// ==================================================================
router.get('/data/export', async (req, res) => {
  try {
    const result = await pool.query(`SELECT f.date, v.immatriculation, d.nom as chauffeur, f.km_depart, f.km_arrivee, f.litres, f.montant FROM fuel_logs f JOIN vehicles v ON f.vehicle_id = v.id LEFT JOIN drivers d ON f.driver_id = d.id ORDER BY f.date DESC`);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(result.rows), "Export");
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  } catch (err) { res.status(500).send("Erreur Export"); }
});

// ==================================================================
// 4. IMPORT INTELLIGENT (Spécial format "Double Entête")
// ==================================================================
router.post('/data/import', upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  try {
    if (!req.file) return res.status(400).send("Aucun fichier reçu");

    console.log(`[IMPORT] Fichier: ${req.file.originalname}`);
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    // header: 1 renvoie un tableau de tableaux (Row[])
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let globalVehicleId = null;
    let headerRowIndex = -1;
    let colMap = {}; 
    let successCount = 0;
    
    await client.query('BEGIN'); 

    // --- PHASE 1 : SCANNER L'ENTÊTE ---
    const scanLimit = Math.min(rawRows.length, 20);
    
    for (let i = 0; i < scanLimit; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;
        
        // A. Véhicule (ex: "39963 WWT")
        if (!globalVehicleId) {
            for (let cell of row) {
                if (cell && typeof cell === 'string' && cell.length >= 4) {
                    // On enlève les espaces pour comparer "39 963 WWT" avec "39963WWT"
                    const cleanCell = cell.replace(/\s/g, '').toUpperCase();
                    const vCheck = await client.query("SELECT id FROM vehicles WHERE REPLACE(UPPER(immatriculation), ' ', '') = $1", [cleanCell]);
                    if (vCheck.rows.length > 0) {
                        globalVehicleId = vCheck.rows[0].id;
                        console.log(`[IMPORT] Véhicule trouvé: ${cleanCell} (ID: ${globalVehicleId})`);
                    }
                }
            }
        }

        // B. Titres (Logique basée sur votre image)
        const rowStr = row.map(c => c ? c.toString().toUpperCase() : '').join(' ');
        
        // On cherche la ligne principale qui contient "DATE" et "KILOMÉTRAGE"
        if (headerRowIndex === -1 && rowStr.includes('DATE') && (rowStr.includes('KILOMÉTRAGE') || rowStr.includes('KILOMETRAGE'))) {
            
            // On vérifie si la ligne SUIVANTE contient les détails
            const nextRow = rawRows[i+1];
            if (nextRow) {
                headerRowIndex = i;
                console.log(`[IMPORT] Structure détectée ligne ${i+1} et ${i+2}`);

                // MAPPING DES COLONNES
                // 1. Date et Chauffeur sont sur la ligne principale (Row i)
                row.forEach((cell, idx) => {
                    if(!cell) return;
                    const c = cell.toString().toUpperCase().trim();
                    if(c === 'DATE') colMap.date = idx;
                    if(c.includes('CHAUFFEUR')) colMap.chauffeur = idx;
                });

                // 2. Départ, Arrivée, Litre, Montant sont sur la ligne suivante (Row i+1)
                nextRow.forEach((cell, idx) => {
                    if(!cell) return;
                    const c = cell.toString().toUpperCase().trim();
                    if(c === 'DÉPART' || c === 'DEPART') colMap.km_depart = idx;
                    if(c === 'ARRIVÉE' || c === 'ARRIVEE') colMap.km_arrivee = idx;
                    if(c.includes('LITRE')) colMap.litres = idx;
                    if(c.includes('MONTANT')) colMap.montant = idx;
                });

                console.log("[IMPORT] Mapping:", colMap);
            }
        }
    }

    if (!globalVehicleId) throw new Error("Véhicule non trouvé. Vérifiez que l'immatriculation est écrite en haut du fichier.");
    if (headerRowIndex === -1) throw new Error("Entêtes non trouvés. Le fichier doit contenir 'Date' et 'Kilométrage'.");

    // --- PHASE 2 : LECTURE DES DONNÉES ---
    // On commence 2 lignes après l'entête principal (après les sous-titres)
    for (let i = headerRowIndex + 2; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row) continue;

        try {
            const rawDate = row[colMap.date];
            if (!rawDate) continue; 

            // Date Excel
            let dateFinal;
            if (typeof rawDate === 'number') {
                dateFinal = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
            } else {
                dateFinal = new Date(rawDate);
            }
            if (isNaN(dateFinal.getTime()) || dateFinal.getFullYear() < 2000) continue;

            const parseNum = (val) => {
                if (!val) return 0;
                if (typeof val === 'number') return val;
                return parseFloat(val.toString().replace(/\s/g, '').replace(',', '.')) || 0;
            };

            const litres = parseNum(row[colMap.litres]);
            const montant = parseNum(row[colMap.montant]);
            const km_depart = parseNum(row[colMap.km_depart]);
            const km_arrivee = parseNum(row[colMap.km_arrivee]);

            // Chauffeur
            let driver_id = null;
            if (colMap.chauffeur !== undefined) {
                const driverName = row[colMap.chauffeur];
                if (driverName) {
                    const dRes = await client.query("SELECT id FROM drivers WHERE nom ILIKE $1", [`%${driverName}%`]);
                    if (dRes.rows.length > 0) driver_id = dRes.rows[0].id;
                }
            }

            // Conso
            let consumption = 0;
            const dist = km_arrivee - km_depart;
            if (dist > 0 && litres > 0) consumption = (litres / dist) * 100;

            // IMPORTANT : On ignore les lignes où Litres ET Montant sont vides (Jours sans plein)
            if (litres <= 0 && montant <= 0) continue;

            await client.query(
                `INSERT INTO fuel_logs (vehicle_id, driver_id, date, km_depart, km_arrivee, litres, montant, consumption_rate)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [globalVehicleId, driver_id, dateFinal, km_depart, km_arrivee, litres, montant, consumption]
            );
            successCount++;

        } catch (lineError) {
            // Ignorer erreurs silencieuses
        }
    }

    await client.query('COMMIT');
    console.log(`[IMPORT] FINI : ${successCount} importés.`);
    res.json({ message: `${successCount} lignes importées.` });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Erreur Import:", err.message);
    res.status(500).send("Erreur Import: " + err.message);
  } finally {
    client.release();
  }
});

// ==================================================================
// 5. CRUD STANDARD
// ==================================================================
router.post('/', async (req, res) => {
  try {
    const { vehicle_id, driver_id, date, km_depart, km_arrivee, litres, montant } = req.body;
    let consumption_rate = 0;
    const distance = km_arrivee - km_depart;
    if (distance > 0 && litres > 0) { consumption_rate = (litres / distance) * 100; }
    const newLog = await pool.query(
      `INSERT INTO fuel_logs (vehicle_id, driver_id, date, km_depart, km_arrivee, litres, montant, consumption_rate) 
       VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [vehicle_id, driver_id, date, km_depart, km_arrivee, litres, montant, consumption_rate]
    );
    res.json(newLog.rows[0]);
  } catch (err) { res.status(500).send("Erreur Serveur"); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM fuel_logs WHERE id = $1', [req.params.id]);
    res.json({ message: "Supprimé" });
  } catch (err) { res.status(500).send("Erreur Serveur"); }
});

module.exports = router;