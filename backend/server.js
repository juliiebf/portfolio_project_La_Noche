require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const compression = require('compression');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_key');

const app = express();
const PORT = process.env.PORT || 3000;

const karaokeRankingRoutes = require('./karaoke-ranking/index');

app.use('/karaoke', karaokeRankingRoutes);
console.log('Montage du router karaoke sur /karaoke');

// ============ DATABASE ============
const pool = new Pool({
  host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || process.env.DB_PORT || 5432,
  user: process.env.POSTGRES_USER || process.env.DB_USER || 'lanocheuser',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.POSTGRES_DATABASE || process.env.DB_NAME || 'lanoche'
});

console.log('✅ Pool PostgreSQL configuré');

// ============ MIDDLEWARE ============
app.use(compression());
app.use(helmet({ contentSecurityPolicy: false }));

const corsOptions = {
  origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true
};
app.use(cors(corsOptions));

// Raw body pour webhooks Stripe AVANT le JSON parser
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// JSON parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Trop de requêtes' }
});
app.use(generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Trop de tentatives de connexion' }
});

// ============ AUTHENTIFICATION ============
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Token manquant' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// ============ VALIDATION UTILISATEUR ============
const validateRegister = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('nom').trim().isLength({ min: 2 }),
  body('prenom').trim().isLength({ min: 2 })
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
];

// ============ ROUTES AUTHENTIFICATION ============

app.get('/api/test', (req, res) => {
  res.json({
    message: '🎤 API La Noche - Auth + Stripe Complète',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

app.post('/api/auth/register', authLimiter, validateRegister, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, nom, prenom } = req.body;

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Email déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, nom, prenom, role, created_at)
       VALUES ($1, $2, $3, $4, 'client', NOW())
       RETURNING id, email, nom, prenom, role`,
      [email.toLowerCase(), hashedPassword, nom, prenom]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    console.log('✅ Utilisateur créé:', user.email);

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom },
      token
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

app.post('/api/auth/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    console.log('✅ Connexion réussie:', user.email);

    res.json({
      success: true,
      message: 'Connexion réussie',
      user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role },
      token
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, nom, prenom, role, created_at, last_login FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Erreur récupération user:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ success: true, message: 'Déconnexion réussie' });
});

// Ajoute les autres routes ici comme payment etc.

// Error Handling
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route non trouvée' });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`\n🎤 ============================================`);
  console.log(`🎤 Serveur La Noche COMPLET démarré !`);
  console.log(`🎤 ============================================`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔐 Auth: POST /api/auth/login`);
  console.log(`💳 Payment: POST /api/payment/create-reservation`);
  console.log(`🎤 ============================================\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});
