const router = require('express').Router();
const pool = require('../db'); // Assurez-vous que le chemin vers db.js est correct

// ==================================================================
// 1. GET (Récupérer les trajets et pleins d'un véhicule)
// ==================================================================
router.get('/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate, deleted } = req.query; 

    const isDeleted = deleted === 'true'; 

    // Info véhicule
    const vehicleInfo = await pool.query('SELECT * FROM vehicles WHERE id = $1', [vehicleId]);

    // Trajets (filtrés par deleted)
    let tripQuery = `
        SELECT * FROM trip_logs 
        WHERE vehicle_id = $1 AND is_deleted = $2
    `;
    const params = [vehicleId, isDeleted];

    if (startDate && endDate) {
        tripQuery += ` AND date BETWEEN $3 AND $4`;
        params.push(startDate, endDate);
    }
    tripQuery += ` ORDER BY date DESC, heure_depart DESC`;
    const trips = await pool.query(tripQuery, params);

    // Carburant (on ne prend que les actifs pour les calculs de la page)
    let fuelQuery = `
        SELECT * FROM fuel_logs 
        WHERE vehicle_id = $1 AND is_deleted = false
    `;
    const fuelParams = [vehicleId];
    if (startDate && endDate) {
        fuelQuery += ` AND date BETWEEN $2 AND $3`;
        fuelParams.push(startDate, endDate);
    }
    const fuels = await pool.query(fuelQuery, fuelParams);

    res.json({
        vehicle: vehicleInfo.rows[0],
        trips: trips.rows,
        fuels: fuels.rows
    });

  } catch (err) {
    console.error("Erreur GET /api/trips/:vehicleId", err.message);
    res.status(500).send("Erreur Serveur lors du chargement des données.");
  }
});


// ==================================================================
// 2. CREATE (Créer un trajet)
// ==================================================================
router.post('/', async (req, res) => {
    try {
        const { vehicle_id, date, heure_depart, km_depart, lieu_depart, lieu_arrivee, heure_arrivee, km_arrivee, motif } = req.body;
        const newTrip = await pool.query(
            `INSERT INTO trip_logs (vehicle_id, date, heure_depart, km_depart, lieu_depart, lieu_arrivee, heure_arrivee, km_arrivee, motif)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [vehicle_id, date, heure_depart, parseFloat(km_depart), lieu_depart, lieu_arrivee, heure_arrivee, parseFloat(km_arrivee), motif]
        );
        res.json(newTrip.rows[0]);
    } catch (err) { console.error("Erreur POST /api/trips", err); res.status(500).send("Erreur Serveur: Impossible d'enregistrer le trajet"); }
});


// ==================================================================
// 3. UPDATE (Modifier un trajet - Édition en ligne)
// ==================================================================
// C'EST CETTE ROUTE QUI EST CIBLÉE LORS DE LA SAUVEGARDE EN LIGNE
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { field, value } = req.body; 
        
        const allowedFields = ['date', 'heure_depart', 'km_depart', 'lieu_depart', 'lieu_arrivee', 'heure_arrivee', 'km_arrivee', 'motif'];
        if (!allowedFields.includes(field)) return res.status(400).send("Champ non autorisé");

        let processedValue = value;
        // On s'assure que les KM sont des nombres pour la DB
        if (field.startsWith('km_') && processedValue !== '') {
            processedValue = parseFloat(value) || null;
        }

        const query = `UPDATE trip_logs SET ${field} = $1 WHERE id = $2 RETURNING *`;
        const update = await pool.query(query, [processedValue, id]);
        
        if (update.rows.length === 0) {
             return res.status(404).send("Trajet non trouvé");
        }

        res.json(update.rows[0]);
    } catch (err) {
        console.error("Erreur PUT /api/trips/:id:", err);
        res.status(500).send("Erreur Serveur: Impossible de modifier le trajet.");
    }
});


// ==================================================================
// 4. SOFT DELETE / RESTORE
// ==================================================================
router.put('/trash/:id', async (req, res) => {
    try {
        await pool.query('UPDATE trip_logs SET is_deleted = true WHERE id = $1', [req.params.id]);
        res.json({ message: "Mis à la corbeille" });
    } catch (err) { res.status(500).send("Erreur"); }
});

router.put('/restore/:id', async (req, res) => {
    try {
        await pool.query('UPDATE trip_logs SET is_deleted = false WHERE id = $1', [req.params.id]);
        res.json({ message: "Restauré" });
    } catch (err) { res.status(500).send("Erreur"); }
});

// ==================================================================
// 5. HARD DELETE
// ==================================================================
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM trip_logs WHERE id = $1', [req.params.id]);
        res.json({ message: "Supprimé définitivement" });
    } catch (err) { res.status(500).send("Erreur"); }
});


module.exports = router;