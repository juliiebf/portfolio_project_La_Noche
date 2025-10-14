const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const morgan = require('morgan');

const app = express();

// Middleware pour parser le JSON dans le corps des requêtes
app.use(express.json());

// Middleware de logging simple (affiche méthode et URL)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Utilisation de morgan pour un logging plus complet en mode 'dev'
app.use(morgan('dev'));

// Connexion à la base SQLite
const db = new sqlite3.Database(path.join(__dirname, 'database', 'karaoke.db'), (err) => {
  if (err) {
    console.error('Erreur connexion à la base SQLite:', err.message);
  } else {
    console.log('Connecté à la base SQLite karaoke.db');
  }
});

// Rendre la DB accessible dans req
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Middleware d'authentification basique (à adapter)
function isAuthenticated(req, res, next) {
  const userId = req.header('x-user-id');
  if (userId) {
    req.user = { id: userId };
    next();
  } else {
    res.status(401).json({ error: 'Utilisateur non authentifié' });
  }
}

// Import des routes
const videoRoutes = require('./routes/videos');
const userRoutes = require('./routes/users');

// Utilisation des routes
app.use('/videos', videoRoutes);
app.use('/users', userRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur Express démarré sur le port ${PORT}`);
});
