const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Pour parser le JSON

// Routes (Nous les créerons à l'étape suivante)
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/fuel', require('./routes/fuel'));

app.use('/api/drivers', require('./routes/drivers')); 
app.use('/api/missions', require('./routes/missions'));

app.use('/api/trips', require('./routes/trips'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});