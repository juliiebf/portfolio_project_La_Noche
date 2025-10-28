const express = require('express');
const db = require('../db');
const router = express.Router();

// Middleware pour vérifier si l'utilisateur est connecté
function isLoggedIn(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Utilisateur non connecté, veuillez d'abord vous connecter." });
  }
  req.user = req.session.user; // ajoute user à la requête
  next();
}

// Route pour connexion / création d'utilisateur
router.post('/login', async (req, res) => {
  const { username } = req.body;
  if (!username || username.trim() === '') {
    return res.status(400).json({ error: "Le pseudo est requis." });
  }
  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
    let user;
    if (result.rows.length === 0) {
      // Ajout d'un nouvel utilisateur
      const insert = await db.query('INSERT INTO users (username) VALUES ($1) RETURNING *', [username.trim()]);
      user = insert.rows[0];
    } else {
      user = result.rows[0];
    }
    req.session.user = { id: user.id, username: user.username }; // stockage session
    res.json({ message: "Connecté avec succès.", user });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur lors de la connexion." });
  }
});

// Route pour déconnexion
router.post('/logout', (req, res) => {
  req.session.user = null; // supprime la session
  res.json({ message: "Déconnecté." });
});

// Route protégée pour récupérer les infos du user connecté
router.get('/me', isLoggedIn, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
