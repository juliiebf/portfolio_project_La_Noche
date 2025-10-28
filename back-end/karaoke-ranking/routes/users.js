const express = require('express');
const db = require('../db');
const router = express.Router();

// Middleware
function isLoggedIn(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Utilisateur non connecté, veuillez d'abord vous connecter." });
  }
req.user = req.session.user;
next();
}

// Add a user
router.post('/login', async (req, res) => {
  const { username } = req.body;
  if (!username || username.trim() === '') {
    return res.status(400).json({ error: "Le pseudo est requis." });
  }
  // check if user exist
  try {
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1',
      [username.trim()]
    );
    let user;
    if (result.rows.length === 0) {
      // Ajoute l'utilisateur
      const insert = await db.query(
        'INSERT INTO users (username) VALUES ($1) RETURNING *',
        [username.trim()]
      );
      user = insert.rows[0];
    } else {
      user = result.rows[0];
    }
    // Simulate connexion
    req.session.user = { id: user.id, username: user.username };
    res.json({ message: "Connecté avec succès.", user });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur lors de la connexion." });
  }
});

// disconnect
router.post('/logout', (req, res) => {
  req.session.user = null;
  res.json({ message: "Déconnecté." });
});

// Exemple : route protégée (GET user info)
router.get('/me', isLoggedIn, (req, res) => {
  res.json({ user: req.user });
});

// À brancher dans index.js : pour sécuriser les routes vidéos/likes
module.exports = router;
