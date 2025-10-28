const express = require('express');
const session = require('express-session');
const userRoutes = require('./routes/users');
const videoRoutes = require('./routes/videos');
const app = express();
const PORT = 3000;

// Middleware pour gérer la session utilisateur
app.use(session({
  secret: 'karaoke_secret',    // clé secrète pour la session
  resave: false,               // ne pas sauvegarder si pas modifié
  saveUninitialized: true     // sauvegarder les sessions non initialisées
}));

// Middleware pour parser les requêtes JSON
app.use(express.json());

// Dossier pour servir les fichiers uploadés
app.use('/uploads', express.static('uploads'));

// Routes pour la gestion des utilisateurs
app.use('/api/users', userRoutes);

// Routes pour la gestion des vidéos
app.use('/api/videos', videoRoutes);

// Démarrage du serveur sur le port défini
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
