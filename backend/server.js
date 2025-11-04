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
const index = require('./index')
const app = express();
const PORT = process.env.PORT || 3001;

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

// GET /api/test
app.get('/api/test', (req, res) => {
  res.json({
    message: '🎤 API La Noche - Auth + Stripe Complète',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

// POST /api/auth/register
app.post('/api/auth/register', authLimiter, validateRegister, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, nom, prenom } = req.body;

    // Vérifier si l'utilisateur existe
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Email déjà utilisé' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insérer l'utilisateur
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, nom, prenom, role, created_at)
       VALUES ($1, $2, $3, $4, 'client', NOW())
       RETURNING id, email, nom, prenom, role`,
      [email.toLowerCase(), hashedPassword, nom, prenom]
    );

    const user = result.rows[0];

    // Générer JWT
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

// POST /api/auth/login
app.post('/api/auth/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Récupérer l'utilisateur
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    const user = result.rows[0];

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    // Mettre à jour last_login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Générer JWT
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

// GET /api/auth/me (protégé)
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

// POST /api/auth/logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ success: true, message: 'Déconnexion réussie' });
});

// ============ ROUTES PAIEMENT ============

// POST /api/payment/calculate
app.post('/api/payment/calculate', [
  body('nombre_personnes').isInt({ min: 10, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { nombre_personnes } = req.body;
    const prixBase = parseFloat(process.env.PRIVATISATION_BASE_PRICE || 500);
    const prixParPersonne = parseFloat(process.env.PRIVATISATION_PRICE_PER_PERSON || 20);
    const montantTotal = prixBase + (nombre_personnes * prixParPersonne);

    console.log('💰 Calcul tarif:', { nombre_personnes, montant: montantTotal });

    res.json({
      success: true,
      data: {
        montantBase: prixBase,
        montantParPersonne: prixParPersonne,
        nombrePersonnes: nombre_personnes,
        montantTotal: montantTotal,
        devise: 'eur'
      }
    });

  } catch (error) {
    console.error('Erreur calcul:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payment/create-reservation
app.post('/api/payment/create-reservation', [
  body('nom').trim().isLength({ min: 2 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('telephone').matches(/^(?:(?:\+|00)33|0)[1-9](?:[\s.-]*\d{2}){4}$/),
  body('date_reservation').isDate(),
  body('heure_reservation').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('nombre_personnes').isInt({ min: 10, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { nom, email, telephone, date_reservation, heure_reservation, nombre_personnes, commentaires } = req.body;

    // Calculer le montant
    const prixBase = parseFloat(process.env.PRIVATISATION_BASE_PRICE || 500);
    const prixParPersonne = parseFloat(process.env.PRIVATISATION_PRICE_PER_PERSON || 20);
    const montantTotal = prixBase + (nombre_personnes * prixParPersonne);

    // Créer la réservation
    const resResult = await pool.query(
      `INSERT INTO reservations (nom, email, telephone, date_reservation, heure_reservation, 
        nombre_personnes, commentaires, type_reservation, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'privatisation', 'paiement_en_cours')
       RETURNING id`,
      [nom, email, telephone, date_reservation, heure_reservation, nombre_personnes, commentaires]
    );

    const reservationId = resResult.rows[0].id;

    // Créer session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Privatisation La Noche',
            description: `${nombre_personnes} personnes - ${date_reservation} à ${heure_reservation}`
          },
          unit_amount: Math.round(montantTotal * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.STRIPE_CANCEL_URL}?reservation_id=${reservationId}`,
      metadata: { reservation_id: reservationId.toString() }
    });

    // Enregistrer le paiement
    await pool.query(
      `INSERT INTO paiements (reservation_id, stripe_session_id, montant_total, email_client, statut_paiement)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [reservationId, session.id, montantTotal, email]
    );

    console.log('💳 Réservation créée:', reservationId);

    res.status(201).json({
      success: true,
      data: {
        reservation_id: reservationId,
        stripe_checkout_url: session.url,
        stripe_session_id: session.id,
        montant_total: montantTotal
      }
    });

  } catch (error) {
    console.error('Erreur création réservation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/payment/session/:sessionId
app.get('/api/payment/session/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);

    res.json({
      success: true,
      data: {
        session_id: session.id,
        payment_status: session.payment_status
      }
    });

  } catch (error) {
    console.error('Erreur récupération session:', error);
    res.status(500).json({ success: false, error: 'Session non trouvée' });
  }
});

// POST /api/webhooks/stripe
app.post('/api/webhooks/stripe', async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const reservationId = parseInt(session.metadata.reservation_id);

      // Mettre à jour la réservation
      await pool.query(
        'UPDATE reservations SET statut = $1 WHERE id = $2',
        ['payee', reservationId]
      );

      // Mettre à jour le paiement
      await pool.query(
        'UPDATE paiements SET statut_paiement = $1, date_paiement = NOW() WHERE stripe_session_id = $2',
        ['succeeded', session.id]
      );

      console.log('✅ Paiement confirmé:', reservationId);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Erreur webhook:', error);
    res.status(400).send('Webhook error');
  }
});

// ============ ADMIN ROUTES ============

// GET /api/admin/reservations (protégé)
app.get('/api/admin/reservations', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    const result = await pool.query(
      `SELECT r.*, p.montant_total, p.statut_paiement 
       FROM reservations r
       LEFT JOIN paiements p ON r.id = p.reservation_id
       ORDER BY r.date_creation DESC`
    );

    res.json({ success: true, data: result.rows, count: result.rows.length });

  } catch (error) {
    console.error('Erreur récupération réservations:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/admin/stats (protégé)
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM reservations) as total_reservations,
        (SELECT COUNT(*) FROM paiements WHERE statut_paiement = 'succeeded') as paiements_reussis,
        (SELECT COALESCE(SUM(montant_total), 0) FROM paiements WHERE statut_paiement = 'succeeded') as chiffre_affaires
    `);

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============ ERROR HANDLING ============
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route non trouvée' });
});

// ============ SERVER START ============
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
