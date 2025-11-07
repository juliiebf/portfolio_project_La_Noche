const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/authenticateToken');

const router = express.Router();

// Inscription utilisateur
router.post('/register', async (req, res) => {
  try {
    const { email, password, nom, prenom } = req.body;

    if (!email || !password || !nom || !prenom) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Format email invalide' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mot de passe trop court' });
    }

    const exists = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Email déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, nom, prenom, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING id, email, nom, prenom`,
      [email.toLowerCase(), hashedPassword, nom, prenom]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ message: 'Utilisateur créé', user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
  }
});

// Connexion utilisateur
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe nécessaires' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Identifiants invalides' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Connexion réussie',
      user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
  }
});

// Profil utilisateur connecté
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, nom, prenom, created_at, last_login FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Déconnexion (côté client, supprimer le token suffit)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Déconnexion réussie' });
});

module.exports = router;
