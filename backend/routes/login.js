const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// === Couleurs pour les logs ===
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// === Route d'inscription ===
router.post('/register', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`\n${colors.blue}[${timestamp}] 📝 INSCRIPTION - Nouvelle tentative${colors.reset}`);
  
  try {
    const { email, password, nom, prenom } = req.body;
    console.log(`${colors.cyan}📧 Email:${colors.reset} ${email}`);
    console.log(`${colors.cyan}👤 Nom:${colors.reset} ${nom} ${prenom}`);

    // Validation des champs
    if (!email || !password || !nom || !prenom) {
      console.log(`${colors.red}❌ Échec - Champs manquants${colors.reset}`);
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log(`${colors.red}❌ Échec - Format email invalide: ${email}${colors.reset}`);
      return res.status(400).json({ error: 'Format email invalide' });
    }

    // Validation mot de passe
    if (password.length < 6) {
      console.log(`${colors.red}❌ Échec - Mot de passe trop court (${password.length} caractères)${colors.reset}`);
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    console.log(`${colors.yellow}🔍 Vérification si l'email existe déjà...${colors.reset}`);
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);

    if (userExists.rows.length > 0) {
      console.log(`${colors.red}❌ Échec - Email déjà utilisé: ${email}${colors.reset}`);
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    console.log(`${colors.yellow}🔐 Hashage du mot de passe...${colors.reset}`);
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log(`${colors.yellow}💾 Insertion dans la base de données...${colors.reset}`);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, nom, prenom, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING id, email, nom, prenom, created_at`,
      [email.toLowerCase(), hashedPassword, nom, prenom]
    );

    const newUser = result.rows[0];
    console.log(`${colors.green}✓ Utilisateur créé - ID: ${newUser.id}${colors.reset}`);

    console.log(`${colors.yellow}🎫 Génération du token JWT...${colors.reset}`);
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`${colors.green}✅ INSCRIPTION RÉUSSIE${colors.reset}`);
    console.log(`${colors.green}   └─ User: ${newUser.nom} ${newUser.prenom} (${newUser.email})${colors.reset}`);
    console.log(`${colors.green}   └─ ID: ${newUser.id}${colors.reset}`);
    console.log(`${colors.green}   └─ Token généré: ${token.substring(0, 20)}...${colors.reset}`);

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: {
        id: newUser.id,
        email: newUser.email,
        nom: newUser.nom,
        prenom: newUser.prenom,
      },
      token,
    });

  } catch (error) {
    console.error(`${colors.red}💥 ERREUR INSCRIPTION:${colors.reset}`, error.message);
    console.error(`${colors.red}Stack:${colors.reset}`, error.stack);
    res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
  }
});

// === Route de connexion ===
router.post('/login', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`\n${colors.blue}[${timestamp}] 🔐 CONNEXION - Nouvelle tentative${colors.reset}`);
  
  try {
    const { email, password } = req.body;
    console.log(`${colors.cyan}📧 Email:${colors.reset} ${email}`);

    // Validation
    if (!email || !password) {
      console.log(`${colors.red}❌ Échec - Champs manquants${colors.reset}`);
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    console.log(`${colors.yellow}🔍 Recherche de l'utilisateur...${colors.reset}`);
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);

    if (result.rows.length === 0) {
      console.log(`${colors.red}❌ Échec - Utilisateur non trouvé: ${email}${colors.reset}`);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = result.rows[0];
    console.log(`${colors.green}✓ Utilisateur trouvé - ID: ${user.id}${colors.reset}`);

    console.log(`${colors.yellow}🔐 Vérification du mot de passe...${colors.reset}`);
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      console.log(`${colors.red}❌ Échec - Mot de passe incorrect pour: ${email}${colors.reset}`);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    console.log(`${colors.green}✓ Mot de passe valide${colors.reset}`);
    console.log(`${colors.yellow}📅 Mise à jour de la dernière connexion...${colors.reset}`);
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    console.log(`${colors.yellow}🎫 Génération du token JWT...${colors.reset}`);
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`${colors.green}✅ CONNEXION RÉUSSIE${colors.reset}`);
    console.log(`${colors.green}   └─ User: ${user.nom} ${user.prenom} (${user.email})${colors.reset}`);
    console.log(`${colors.green}   └─ ID: ${user.id}${colors.reset}`);
    console.log(`${colors.green}   └─ Token généré: ${token.substring(0, 20)}...${colors.reset}`);

    res.json({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
      },
      token,
    });

  } catch (error) {
    console.error(`${colors.red}💥 ERREUR CONNEXION:${colors.reset}`, error.message);
    console.error(`${colors.red}Stack:${colors.reset}`, error.stack);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
  }
});

// === Route pour récupérer l'utilisateur connecté ===
router.get('/me', authenticateToken, async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`\n${colors.blue}[${timestamp}] 👤 PROFIL - Récupération du profil${colors.reset}`);
  console.log(`${colors.cyan}User ID:${colors.reset} ${req.user.id}`);
  
  try {
    console.log(`${colors.yellow}🔍 Requête à la base de données...${colors.reset}`);
    const result = await pool.query(
      'SELECT id, email, nom, prenom, created_at, last_login FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      console.log(`${colors.red}❌ Utilisateur non trouvé - ID: ${req.user.id}${colors.reset}`);
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = result.rows[0];
    console.log(`${colors.green}✅ PROFIL RÉCUPÉRÉ${colors.reset}`);
    console.log(`${colors.green}   └─ User: ${user.nom} ${user.prenom}${colors.reset}`);
    console.log(`${colors.green}   └─ Email: ${user.email}${colors.reset}`);
    console.log(`${colors.green}   └─ Créé le: ${user.created_at}${colors.reset}`);

    res.json({ user: result.rows[0] });

  } catch (error) {
    console.error(`${colors.red}💥 ERREUR RÉCUPÉRATION PROFIL:${colors.reset}`, error.message);
    console.error(`${colors.red}Stack:${colors.reset}`, error.stack);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === Route de déconnexion ===
router.post('/logout', authenticateToken, (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`\n${colors.blue}[${timestamp}] 🚪 DÉCONNEXION${colors.reset}`);
  console.log(`${colors.cyan}User ID:${colors.reset} ${req.user.id}`);
  console.log(`${colors.cyan}Email:${colors.reset} ${req.user.email}`);
  console.log(`${colors.green}✅ Déconnexion effectuée${colors.reset}`);
  
  res.json({ message: 'Déconnexion réussie' });
});

console.log(`${colors.magenta}📋 Routes d'authentification chargées${colors.reset}`);
console.log(`${colors.magenta}   └─ POST /api/auth/register${colors.reset}`);
console.log(`${colors.magenta}   └─ POST /api/auth/login${colors.reset}`);
console.log(`${colors.magenta}   └─ GET  /api/auth/me${colors.reset}`);
console.log(`${colors.magenta}   └─ POST /api/auth/logout${colors.reset}`);

module.exports = router;