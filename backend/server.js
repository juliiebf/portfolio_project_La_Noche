const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// === Import des routes ===
const authRoutes = require('./routes/auth');     
const resaRoutes = require('./routes/resa');
const videoRoutes = require('./routes/videos');

const app = express();
const PORT = process.env.PORT || 3000;

// === Middlewares globaux ===
app.use(cors({
  origin: '*', // idéalement, remplace '*' par l'URL front pour sécurité
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true // pas utile côté JWT sauf usage cookies
}));

// Middleware global pour capturer et logger les erreurs non gérées
app.use((err, req, res, next) => {
  console.error('Erreur attrapée globalement:', err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Pour parser les requêtes JSON
app.use(express.json());

// === Fichiers statiques ===
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// === Routes principales ===
app.use('/api/auth', authRoutes);
app.use('/api/reservations', resaRoutes);
app.use('/api/videos', videoRoutes);

// Si tu avais routes utilisateurs séparées, à supprimer ou fusionner avec auth

// === Démarrage du serveur ===
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
