const router = require('express').Router();
const pool = require('../db');

// ==================================================================
// 1. GET (Récupérer les trajets et pleins d'un véhicule)
// FIX ULTIME: Utilisation de trip_logs + Suppression de la jointure driver
// ==================================================================
router.get('/:vehicle_id', async (req, res) => {
    try {
        const { vehicle_id } = req.params;
        const { startDate, endDate, deleted } = req.query;

        // 1. Validation ID
        if (isNaN(vehicle_id)) {
            return res.status(400).json({ error: "ID de véhicule invalide." });
        }

        // --- Préparation des requêtes ---
        const isDeleted = (deleted === 'true');

        // 1a. Requête Détails Véhicule
        const vehicleQuery = `SELECT * FROM vehicles WHERE id = $1`;
        
        // 1b. Requête Trajets (Trips)
        // NOTE: Jointure sur les drivers retirée pour corriger l'erreur 42703 (colonne driver_id inexistante)
        let tripsQuery = `
            SELECT t.*
            FROM trip_logs t
            WHERE t.vehicle_id = $1 AND t.is_deleted = $2
        `;
        const tripsParams = [parseInt(vehicle_id), isDeleted];
        let tripsParamIndex = 3;

        if (startDate && endDate) {
            tripsQuery += ` AND t.date BETWEEN $${tripsParamIndex} AND $${tripsParamIndex + 1}`;
            tripsParams.push(startDate, endDate);
        }
        tripsQuery += ` ORDER BY t.date DESC`;
        
        // 1c. Requête Pleins (Fuels) - Aucun changement nécessaire
        let fuelsQuery = `
            SELECT f.* FROM fuel_logs f
            WHERE f.vehicle_id = $1 AND f.is_deleted = false
        `;
        const fuelsParams = [parseInt(vehicle_id)];
        let fuelsParamIndex = 2;

        if (startDate && endDate) {
            fuelsQuery += ` AND f.date BETWEEN $${fuelsParamIndex} AND $${fuelsParamIndex + 1}`;
            fuelsParams.push(startDate, endDate);
        }
        fuelsQuery += ` ORDER BY f.date DESC`;

        // --- Exécution des requêtes en parallèle ---
        const [tripsResult, fuelsResult, vehicleResult] = await Promise.all([
            pool.query(tripsQuery, tripsParams),
            pool.query(fuelsQuery, fuelsParams),
            pool.query(vehicleQuery, [vehicle_id])
        ]);

        if (vehicleResult.rows.length === 0) {
            return res.status(404).json({ error: "Véhicule introuvable." });
        }

        // 4. Renvoi de l'objet structuré attendu par le frontend
        res.json({
            vehicle: vehicleResult.rows[0],
            trips: tripsResult.rows,
            fuels: fuelsResult.rows
        });

    } catch (err) {
        console.error("Erreur backend /api/trips/:vehicle_id:", err);
        // Si une erreur de colonne persiste, l'erreur 500 est renvoyée au frontend
        res.status(500).json({ error: "Erreur serveur lors de la récupération des données du journal." });
    }
});


// ==================================================================
// 2. CREATE (Créer un trajet)
// FIX: Utilisation de trip_logs
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
    } catch (err) { 
        console.error("Erreur POST /api/trips", err); 
        res.status(500).send("Erreur Serveur: Impossible d'enregistrer le trajet"); 
    }
});


// ==================================================================
// 3. UPDATE (Modifier un trajet - Édition en ligne)
// FIX: Utilisation de trip_logs
// ==================================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { field, value } = req.body; 
        
        const allowedFields = ['date', 'heure_depart', 'km_depart', 'lieu_depart', 'lieu_arrivee', 'heure_arrivee', 'km_arrivee', 'motif'];
        if (!allowedFields.includes(field)) return res.status(400).send("Champ non autorisé");

        let processedValue = value;
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
// FIX: Utilisation de trip_logs
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
// FIX: Utilisation de trip_logs
// ==================================================================
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM trip_logs WHERE id = $1', [req.params.id]);
        res.json({ message: "Supprimé définitivement" });
    } catch (err) { res.status(500).send("Erreur"); }
});


module.exports = router;