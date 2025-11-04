require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const compression = require('compression');
const winston = require('winston');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const stripeModule = require('./stripe');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-super-secret-session-key';

// ============ LOGGING ============
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// ============ DATABASE ============
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE || 'lanoche',
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// ============ MIDDLEWARE ============
app.use(compression());
app.use(helmet({ contentSecurityPolicy: false }));

const corsOptions = {
  origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true
};
app.use(cors(corsOptions));

app.use(session({
  store: new pgSession({ pool }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// IMPORTANT: Pour les webhooks Stripe, on a besoin du raw body
app.use('/api/webhooks/stripe', bodyParser.raw({ type: 'application/json' }));

// Body parser pour le reste
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// ============ AUTHENTIFICATION ============
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Token requis' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, error: 'Token invalide' });
    req.user = user;
    next();
  });
};

/**
 * POST /api/auth/login
 * Authentification admin
 */
app.post('/api/auth/login', [
  body('username').trim().notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { username, password } = req.body;

    // Vérifier le nom d'utilisateur
    if (username !== process.env.ADMIN_USERNAME) {
      return res.status(401).json({ 
        success: false, 
        error: 'Identifiants incorrects' 
      });
    }

    // Vérifier le mot de passe (supporte hash bcrypt ou plain text)
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;
    const plainPassword = process.env.ADMIN_PASSWORD;
    
    let isPasswordValid = false;
    
    if (passwordHash) {
      // Utiliser bcrypt si un hash est fourni
      isPasswordValid = await bcrypt.compare(password, passwordHash);
    } else if (plainPassword) {
      // Fallback sur comparaison plain text (non recommandé en production)
      isPasswordValid = password === plainPassword;
    } else {
      logger.error('Aucun mot de passe admin configuré');
      return res.status(500).json({ 
        success: false, 
        error: 'Configuration serveur incorrecte' 
      });
    }

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Identifiants incorrects' 
      });
    }

    // Générer un token JWT
    const token = jwt.sign(
      { username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info('Login admin réussi', { username });

    res.json({
      success: true,
      token,
      expiresIn: '24h'
    });

  } catch (error) {
    logger.error('Erreur login:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============ ROUTES PAIEMENT STRIPE ============

/**
 * POST /api/payment/calculate
 * Calculer le montant d'une privatisation
 */
app.post('/api/payment/calculate', [
  body('nombre_personnes').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { nombre_personnes } = req.body;

    // Récupérer le tarif depuis la DB
    const tarifResult = await pool.query(
      'SELECT * FROM tarifs_privatisation WHERE actif = true ORDER BY id DESC LIMIT 1'
    );

    if (tarifResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aucun tarif configuré'
      });
    }

    const tarif = tarifResult.rows[0];
    const calcul = stripeModule.calculatePrivatisationAmount(nombre_personnes, tarif);

    logger.info('Calcul tarif privatisation', { nombre_personnes, montant: calcul.montantTotal });

    res.json({
      success: true,
      data: calcul,
      tarif: {
        nom: tarif.nom,
        description: tarif.description,
        duree_heures: tarif.duree_heures,
        inclus: tarif.inclus
      }
    });

  } catch (error) {
    logger.error('Erreur calcul tarif:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/payment/create-reservation
 * Créer une réservation privatisation avec paiement
 */
app.post('/api/payment/create-reservation', [
  body('nom').trim().isLength({ min: 2 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('telephone').matches(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/),
  body('date_reservation').isDate(),
  body('heure_reservation').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('nombre_personnes').isInt({ min: 10 }),
  body('commentaires').optional().trim().isLength({ max: 500 }).escape()
], async (req, res) => {
  const client = await pool.connect();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      nom, email, telephone, date_reservation,
      heure_reservation, nombre_personnes, commentaires
    } = req.body;

    await client.query('BEGIN');

    // Vérifier disponibilité
    const existingReservation = await client.query(
      `SELECT id FROM reservations 
       WHERE date_reservation = $1 
       AND type_reservation = 'privatisation'
       AND statut NOT IN ('annulee')`,
      [date_reservation]
    );

    if (existingReservation.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: 'Cette date est déjà réservée pour une privatisation'
      });
    }

    // Calculer le montant
    const tarifResult = await client.query(
      'SELECT * FROM tarifs_privatisation WHERE actif = true LIMIT 1'
    );
    const tarif = tarifResult.rows[0];
    const calcul = stripeModule.calculatePrivatisationAmount(nombre_personnes, tarif);

    // Créer la réservation
    const reservationResult = await client.query(
      `INSERT INTO reservations 
        (nom, email, telephone, date_reservation, heure_reservation, 
         nombre_personnes, commentaires, type_reservation, statut, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'privatisation', 'paiement_en_cours', $8)
       RETURNING *`,
      [nom, email, telephone, date_reservation, heure_reservation,
       nombre_personnes, commentaires, req.ip]
    );

    const reservation = reservationResult.rows[0];

    // Créer la session Stripe
    const stripeSession = await stripeModule.createCheckoutSession({
      reservationId: reservation.id,
      email: email,
      nom: nom,
      nombrePersonnes: nombre_personnes,
      dateReservation: date_reservation,
      heureReservation: heure_reservation,
      montantTotal: calcul.montantTotal
    });

    // Enregistrer le paiement en attente
    await client.query(
      `INSERT INTO paiements 
        (reservation_id, stripe_session_id, montant_total, currency, 
         statut_paiement, email_client, metadata)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
      [
        reservation.id,
        stripeSession.sessionId,
        calcul.montantTotal,
        calcul.devise,
        email,
        JSON.stringify(calcul)
      ]
    );

    await client.query('COMMIT');

    logger.info('Réservation privatisation créée avec paiement', {
      reservation_id: reservation.id,
      stripe_session_id: stripeSession.sessionId,
      montant: calcul.montantTotal
    });

    res.status(201).json({
      success: true,
      message: 'Réservation créée. Redirection vers le paiement...',
      data: {
        reservation_id: reservation.id,
        stripe_checkout_url: stripeSession.url,
        stripe_session_id: stripeSession.sessionId,
        montant_total: calcul.montantTotal,
        expires_at: stripeSession.expiresAt
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Erreur création réservation paiement:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur création réservation'
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/payment/session/:sessionId
 * Récupérer le statut d'une session de paiement
 */
app.get('/api/payment/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Récupérer depuis Stripe
    const stripeSession = await stripeModule.getCheckoutSession(sessionId);

    // Récupérer depuis la DB
    const paiementResult = await pool.query(
      `SELECT p.*, r.nom, r.email, r.date_reservation, r.heure_reservation
       FROM paiements p
       JOIN reservations r ON p.reservation_id = r.id
       WHERE p.stripe_session_id = $1`,
      [sessionId]
    );

    if (paiementResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session non trouvée'
      });
    }

    const paiement = paiementResult.rows[0];

    res.json({
      success: true,
      data: {
        session_id: sessionId,
        payment_status: stripeSession.payment_status,
        reservation_id: paiement.reservation_id,
        montant_total: parseFloat(paiement.montant_total),
        email: paiement.email,
        nom: paiement.nom,
        date_reservation: paiement.date_reservation
      }
    });

  } catch (error) {
    logger.error('Erreur récupération session:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur récupération session'
    });
  }
});

/**
 * POST /api/webhooks/stripe
 * Webhook Stripe pour confirmer les paiements
 */
app.post('/api/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const client = await pool.connect();

  try {
    // Vérifier la signature
    const event = stripeModule.verifyWebhookSignature(req.body, sig);

    logger.info('Webhook Stripe reçu', { type: event.type, id: event.id });

    await client.query('BEGIN');

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // Mettre à jour le paiement
        await client.query(
          `UPDATE paiements 
           SET statut_paiement = 'succeeded',
               stripe_payment_intent_id = $1,
               mode_paiement = $2,
               date_paiement = CURRENT_TIMESTAMP,
               stripe_webhook_received = true
           WHERE stripe_session_id = $3`,
          [session.payment_intent, session.payment_method_types[0], session.id]
        );

        // Mettre à jour la réservation
        const reservationId = parseInt(session.metadata.reservation_id);
        await client.query(
          `UPDATE reservations 
           SET statut = 'payee'
           WHERE id = $1`,
          [reservationId]
        );

        logger.info('Paiement confirmé', {
          session_id: session.id,
          reservation_id: reservationId
        });

        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;

        await client.query(
          `UPDATE paiements 
           SET statut_paiement = 'canceled'
           WHERE stripe_session_id = $1`,
          [session.id]
        );

        const reservationId = parseInt(session.metadata.reservation_id);
        await client.query(
          `UPDATE reservations 
           SET statut = 'annulee'
           WHERE id = $1`,
          [reservationId]
        );

        logger.info('Session paiement expirée', { session_id: session.id });
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;

        await client.query(
          `UPDATE paiements 
           SET statut_paiement = 'failed'
           WHERE stripe_payment_intent_id = $1`,
          [paymentIntent.id]
        );

        logger.warn('Paiement échoué', { payment_intent_id: paymentIntent.id });
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;

        await client.query(
          `UPDATE paiements 
           SET statut_paiement = 'refunded'
           WHERE stripe_payment_intent_id = $1`,
          [charge.payment_intent]
        );

        logger.info('Remboursement effectué', { charge_id: charge.id });
        break;
      }
    }

    await client.query('COMMIT');
    res.json({ received: true });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Erreur webhook Stripe:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  } finally {
    client.release();
  }
});

/**
 * POST /api/payment/refund/:reservationId (admin)
 * Créer un remboursement
 */
app.post('/api/payment/refund/:reservationId', authenticateToken, async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { amount, reason } = req.body;

    // Récupérer le paiement
    const paiementResult = await pool.query(
      `SELECT * FROM paiements 
       WHERE reservation_id = $1 
       AND statut_paiement = 'succeeded'
       ORDER BY id DESC LIMIT 1`,
      [reservationId]
    );

    if (paiementResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Paiement non trouvé ou non éligible au remboursement'
      });
    }

    const paiement = paiementResult.rows[0];

    // Créer le remboursement Stripe
    const refund = await stripeModule.createRefund(
      paiement.stripe_payment_intent_id,
      amount,
      reason
    );

    // Mettre à jour la DB
    await pool.query(
      `UPDATE paiements 
       SET statut_paiement = 'refunded'
       WHERE id = $1`,
      [paiement.id]
    );

    await pool.query(
      `UPDATE reservations 
       SET statut = 'annulee'
       WHERE id = $1`,
      [reservationId]
    );

    logger.info('Remboursement créé', {
      reservation_id: reservationId,
      refund_id: refund.refundId,
      amount: refund.amount
    });

    res.json({
      success: true,
      message: 'Remboursement effectué',
      data: refund
    });

  } catch (error) {
    logger.error('Erreur remboursement:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============ ROUTES ADMIN ============

/**
 * GET /api/admin/reservations (admin)
 * Liste toutes les réservations avec paiements
 */
app.get('/api/admin/reservations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        p.montant_total,
        p.statut_paiement,
        p.stripe_session_id,
        p.date_paiement
      FROM reservations r
      LEFT JOIN paiements p ON r.id = p.reservation_id
      ORDER BY r.date_creation DESC
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    logger.error('Erreur récupération réservations:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/admin/stats (admin)
 * Statistiques avec chiffre d'affaires
 */
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM reservations) as total_reservations,
        (SELECT COUNT(*) FROM reservations WHERE statut = 'payee') as reservations_payees,
        (SELECT COUNT(*) FROM paiements WHERE statut_paiement = 'succeeded') as paiements_reussis,
        (SELECT COALESCE(SUM(montant_total), 0) FROM paiements WHERE statut_paiement = 'succeeded') as chiffre_affaires,
        (SELECT COUNT(*) FROM reservations WHERE type_reservation = 'privatisation') as total_privatisations
    `);

    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        total_reservations: parseInt(stats.total_reservations),
        reservations_payees: parseInt(stats.reservations_payees),
        paiements_reussis: parseInt(stats.paiements_reussis),
        chiffre_affaires: parseFloat(stats.chiffre_affaires),
        total_privatisations: parseInt(stats.total_privatisations)
      }
    });

  } catch (error) {
    logger.error('Erreur stats:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============ ROUTES DE BASE ============

app.get('/api/test', (req, res) => {
  res.json({
    message: '💳 API La Noche avec Stripe fonctionnelle !',
    timestamp: new Date().toISOString(),
    stripe_configured: !!process.env.STRIPE_SECRET_KEY
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route non trouvée' });
});

// Erreurs
app.use((err, req, res, next) => {
  logger.error('Erreur:', err);
  res.status(500).json({ success: false, error: 'Erreur serveur' });
});

// ============ DÉMARRAGE ============
const server = app.listen(PORT, () => {
  logger.info(`💳 Serveur La Noche + Stripe démarré !`);
  logger.info(`📍 URL: http://localhost:${PORT}`);
  logger.info(`🔐 Stripe configuré: ${!!process.env.STRIPE_SECRET_KEY}`);
});

process.on('SIGINT', async () => {
  logger.info('🛑 Arrêt du serveur...');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});