const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./db');

const authRoutes = require('./routes/auth');
const reservationRoutes = require('./routes/reservation');
const rankingRoutes = require('./routes/ranking');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  console.log(`➡ Requête ${req.method} ${req.url} reçue`);

  // Ecoute la fin de la réponse
  res.on('finish', () => {
    const status = res.statusCode;
    const type = status >= 200 && status < 400 ? '✔ Succès' : '✖ Erreur';
    console.log(`⬅ Réponse ${status} (${type}) envoyée pour ${req.method} ${req.url}`);
  });

  next();
});


app.use('/api/auth', authRoutes);
app.use('/api/reservation', reservationRoutes);
app.use('/api/ranking', rankingRoutes);

initDatabase()
  .then(() => {
    console.log('Base initialisée, démarrage serveur...');
    app.listen(PORT, () => {
      console.log(`Serveur lancé sur http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Erreur initialisation base:', err);
    process.exit(1);
  });
