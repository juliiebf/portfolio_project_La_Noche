const express = require('express');
const app = express();

// Middleware pour parser le JSON des requêtes (important pour req.body)
app.use(express.json());

// Middleware pour logger la requête (méthode, url)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next(); // passer au middleware suivant ou à la route
});

// Ici tu définis tes routes (exemple pour createUser)
const userRoutes = require('./routes/users'); // si séparé
app.use('/users', userRoutes);

// Middleware de gestion d'erreur global (optionnel mais conseillé)
app.use((err, req, res, next) => {
  console.error('Erreur globale:', err);
  res.status(500).json({ message: 'Erreur serveur', error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
