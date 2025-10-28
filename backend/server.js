require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const compression = require('compression');
const winston = require('winston');
const expressWinston = require('express-winston');
const { pool, query, transaction } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-super-secret-session-key';

// ============ CONFIGURATION LOGGING ============
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'la-noche-api-postgres' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// ============ MIDDLEWARE ============

// Compression
app.use(compression());

// Sécurité headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Accès refusé par CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Sessions avec PostgreSQL
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_TIMEOUT_HOURS || 24) * 60 * 60 * 1000
  },
  name: 'lanoche.sid'
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  message: { success: false, error: 'Trop de requêtes. Limite atteinte.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, error: 'Limite API atteinte.' }
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 10,
  delayMs: 500
});

app.use('/api/', apiLimiter);
app.use(generalLimiter);

// Body parser
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Logging des requêtes
app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}}",
  expressFormat: true,
  colorize: false,
}));

// ============ MIDDLEWARE D'AUTHENTIFICATION ============
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token d\'accès requis' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Token invalide', { ip: req.ip });
      return res.status(403).json({ 
        success: false, 
        error: 'Token invalide' 
      });
    }
    req.user = user;
    next();
  });
};

// ============ VALIDATION ============
const validateReservation = [
  body('nom')
    .trim()
    .isLength({ min: 2, max: 100 })
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Nom invalide')
    .escape(),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('telephone')
    .matches(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/)
    .withMessage('Numéro français requis'),
  body('date_reservation')
    .isDate()
    .custom((value) => {
      const reservationDate = new Date(value);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (reservationDate < now) {
        throw new Error('Date dans le futur requise');
      }
      return true;
    }),
  body('heure_reservation')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure valide requise'),
  body('nombre_personnes')
    .isInt({ min: 1, max: 20 })
    .withMessage('Entre 1 et 20 personnes'),
  body('commentaires')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .escape()
];

// ============ ROUTES AUTHENTIFICATION ============

// POST - Login admin
app.post('/api/auth/login', [
  body('username').trim().escape(),
  body('password').isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides'
      });
    }

    const { username, password } = req.body;

    // Vérifier si le compte est verrouillé
    const userResult = await query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      logger.warn('Tentative connexion username invalide', { ip: req.ip, username });

      // Log de la tentative
      await query(
        'INSERT INTO login_attempts (ip_address, username, success) VALUES ($1, $2, $3)',
        [req.ip, username, false]
      );

      return res.status(401).json({
        success: false,
        error: 'Identifiants invalides'
      });
    }

    const user = userResult.rows[0];

    // Vérifier si le compte est verrouillé
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({
        success: false,
        error: 'Compte temporairement verrouillé. Réessayez plus tard.'
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      // Incrémenter les tentatives échouées
      const newFailedAttempts = user.failed_attempts + 1;
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || 5);

      if (newFailedAttempts >= maxAttempts) {
        const lockoutMinutes = parseInt(process.env.LOCKOUT_DURATION_MINUTES || 30);
        const lockoutUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);

        await query(
          'UPDATE users SET failed_attempts = $1, locked_until = $2 WHERE id = $3',
          [newFailedAttempts, lockoutUntil, user.id]
        );

        logger.warn('Compte verrouillé après tentatives échouées', { 
          ip: req.ip, 
          username,
          lockoutUntil 
        });
      } else {
        await query(
          'UPDATE users SET failed_attempts = $1 WHERE id = $2',
          [newFailedAttempts, user.id]
        );
      }

      await query(
        'INSERT INTO login_attempts (ip_address, username, success) VALUES ($1, $2, $3)',
        [req.ip, username, false]
      );

      return res.status(401).json({
        success: false,
        error: 'Identifiants invalides'
      });
    }

    // Connexion réussie - Réinitialiser les tentatives
    await query(
      'UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    await query(
      'INSERT INTO login_attempts (ip_address, username, success) VALUES ($1, $2, $3)',
      [req.ip, username, true]
    );

    // Générer JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    req.session.user = { id: user.id, username: user.username, role: user.role };

    logger.info('Connexion admin réussie', { ip: req.ip, username });

    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: { username: user.username, role: user.role }
    });

  } catch (error) {
    logger.error('Erreur login:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// POST - Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Erreur logout:', err);
      return res.status(500).json({
        success: false,
        error: 'Erreur déconnexion'
      });
    }

    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  });
});

// GET - Vérifier statut auth
app.get('/api/auth/status', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// ============ ROUTES RÉSERVATIONS ============

// GET - Test
app.get('/api/test', (req, res) => {
  logger.info('Test API appelé', { ip: req.ip });
  res.json({ 
    message: '🐘 API La Noche PostgreSQL fonctionnelle !',
    timestamp: new Date().toISOString(),
    status: 'OK',
    database: 'PostgreSQL'
  });
});

// GET - Toutes les réservations (admin)
app.get('/api/reservations', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM reservations ORDER BY date_reservation DESC, heure_reservation DESC'
    );

    logger.info('Réservations récupérées', { 
      count: result.rows.length, 
      ip: req.ip,
      user: req.user.username 
    });

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Erreur récupération réservations:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur' 
    });
  }
});

// POST - Créer réservation (public)
app.post('/api/reservations', speedLimiter, validateReservation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Données réservation invalides', { ip: req.ip, errors: errors.array() });
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const {
      nom, email, telephone, date_reservation,
      heure_reservation, nombre_personnes, commentaires
    } = req.body;

    // Vérifier date future
    const reservationDate = new Date(date_reservation + 'T' + heure_reservation);
    if (reservationDate < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Date de réservation dans le passé'
      });
    }

    // Anti-spam: limiter réservations par IP
    const maxPerHour = parseInt(process.env.MAX_RESERVATIONS_PER_IP_HOUR || 3);
    const spamCheck = await query(
      `SELECT COUNT(*) as count 
       FROM reservations 
       WHERE ip_address = $1 
       AND date_creation > NOW() - INTERVAL '1 hour'`,
      [req.ip]
    );

    if (spamCheck.rows[0].count >= maxPerHour) {
      logger.warn('Tentative spam détectée', { ip: req.ip });
      return res.status(429).json({
        success: false,
        error: 'Trop de réservations récentes'
      });
    }

    // Vérifier créneaux disponibles
    const slotCheck = await query(
      `SELECT COUNT(*) as count 
       FROM reservations 
       WHERE date_reservation = $1 
       AND heure_reservation = $2 
       AND statut != 'annulee'`,
      [date_reservation, heure_reservation]
    );

    if (slotCheck.rows[0].count >= 3) {
      return res.status(409).json({
        success: false,
        error: 'Créneau complet'
      });
    }

    // Insérer la réservation
    const result = await query(
      `INSERT INTO reservations 
        (nom, email, telephone, date_reservation, heure_reservation, 
         nombre_personnes, commentaires, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [nom, email, telephone, date_reservation, heure_reservation, 
       nombre_personnes, commentaires, req.ip]
    );

    const newReservation = result.rows[0];

    logger.info('Nouvelle réservation créée', {
      id: newReservation.id,
      nom, email,
      date_reservation,
      heure_reservation,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: '🎉 Réservation confirmée !',
      data: {
        id: newReservation.id,
        nom, email,
        date_reservation,
        heure_reservation,
        nombre_personnes
      }
    });

  } catch (error) {
    logger.error('Erreur création réservation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur création réservation'
    });
  }
});

// GET - Réservation par ID
app.get('/api/reservations/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID invalide'
      });
    }

    const result = await query(
      'SELECT * FROM reservations WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Réservation non trouvée'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Erreur récupération réservation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// PUT - Modifier réservation (admin)
app.put('/api/reservations/:id', authenticateToken, validateReservation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const id = parseInt(req.params.id);
    const {
      nom, email, telephone, date_reservation,
      heure_reservation, nombre_personnes, commentaires, statut
    } = req.body;

    const result = await query(
      `UPDATE reservations SET 
        nom = $1, email = $2, telephone = $3, date_reservation = $4,
        heure_reservation = $5, nombre_personnes = $6, commentaires = $7,
        statut = $8
       WHERE id = $9
       RETURNING *`,
      [nom, email, telephone, date_reservation, heure_reservation,
       nombre_personnes, commentaires, statut || 'en_attente', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Réservation non trouvée'
      });
    }

    logger.info('Réservation modifiée', { 
      id, 
      user: req.user.username 
    });

    res.json({
      success: true,
      message: 'Réservation modifiée',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Erreur modification réservation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur modification'
    });
  }
});

// DELETE - Supprimer réservation (admin)
app.delete('/api/reservations/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID invalide'
      });
    }

    const result = await query(
      'DELETE FROM reservations WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Réservation non trouvée'
      });
    }

    logger.info('Réservation supprimée', { 
      id, 
      user: req.user.username,
      ip: req.ip 
    });

    res.json({
      success: true,
      message: 'Réservation supprimée'
    });
  } catch (error) {
    logger.error('Erreur suppression:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur suppression'
    });
  }
});

// GET - Statistiques (admin)
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        (SELECT COUNT(*) FROM reservations) as total,
        (SELECT COUNT(*) FROM reservations WHERE statut = 'en_attente') as en_attente,
        (SELECT COUNT(*) FROM reservations WHERE statut = 'confirmee') as confirmees,
        (SELECT COUNT(*) FROM reservations WHERE date_reservation = CURRENT_DATE) as aujourdhui
    `);

    const stats = result.rows[0];

    logger.info('Stats consultées', { 
      user: req.user.username,
      ip: req.ip,
      stats 
    });

    res.json({
      success: true,
      data: {
        total: parseInt(stats.total),
        enAttente: parseInt(stats.en_attente),
        confirmees: parseInt(stats.confirmees),
        aujourdhui: parseInt(stats.aujourdhui)
      }
    });
  } catch (error) {
    logger.error('Erreur stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// ============ GESTION D'ERREURS ============
app.use(expressWinston.errorLogger({
  winstonInstance: logger
}));

app.use((err, req, res, next) => {
  logger.error('Erreur non gérée:', err);
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur'
  });
});

// 404 Handler
app.use((req, res) => {
  logger.warn('Route non trouvée', { url: req.url, ip: req.ip });
  res.status(404).json({
    success: false,
    error: 'Route non trouvée'
  });
});

// ============ DÉMARRAGE ============
const server = app.listen(PORT, () => {
  logger.info(`🐘 Serveur La Noche PostgreSQL démarré !`);
  logger.info(`📍 URL: http://localhost:${PORT}`);
  logger.info(`🗄️ Database: PostgreSQL`);
  logger.info(`🚀 API: http://localhost:${PORT}/api/`);
  logger.info(`🔐 Login: POST /api/auth/login`);
});

// Fermeture propre
process.on('SIGINT', () => {
  logger.info('🛑 Arrêt du serveur...');
  server.close(async () => {
    await pool.end();
    logger.info('✅ Pool PostgreSQL fermé');
    process.exit(0);
  });
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  logger.error('Exception non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promise rejetée:', { reason, promise });
  process.exit(1);
});
