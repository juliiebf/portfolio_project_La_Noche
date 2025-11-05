const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

// === Import des routes ===
const loginRoutes = require('./routes/login');
const resaRoutes = require('./routes/resa');
const rankingRoutes = require('./routes/ranking');
const userRoutes = require('./routes/users');
const videoRoutes = require('./routes/videos');

const app = express();
const PORT = process.env.PORT || 3000;

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

// === Middleware de logging des requêtes ===
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.yellow}${req.method}${colors.reset} ${req.url}`);
  next();
});

// === Middlewares globaux ===
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Sessions (pour stocker l'état utilisateur côté serveur)
app.use(session({
  secret: process.env.SESSION_SECRET || 'karaoke_secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  }
}));

app.use(express.json());

// === Fichiers statiques ===
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

console.log(`${colors.blue}📁 Dossier uploads:${colors.reset} ${path.join(__dirname, 'uploads')}`);
console.log(`${colors.blue}📁 Dossier public:${colors.reset} ${path.join(__dirname, 'public')}`);

// === Routes principales ===
console.log(`${colors.magenta}\n🔗 Configuration des routes...${colors.reset}`);

app.use('/api/auth', loginRoutes);
console.log(`${colors.green}✓${colors.reset} Route /api/auth chargée`);

app.use('/api/reservations', resaRoutes);
console.log(`${colors.green}✓${colors.reset} Route /api/reservations chargée`);

app.use('/api/ranking', rankingRoutes);
console.log(`${colors.green}✓${colors.reset} Route /api/ranking chargée`);

app.use('/api/users', userRoutes);
console.log(`${colors.green}✓${colors.reset} Route /api/users chargée`);

app.use('/api/videos', videoRoutes);
console.log(`${colors.green}✓${colors.reset} Route /api/videos chargée`);

// === Route de base ===
app.get('/', (req, res) => {
  res.json({
    message: 'API Karaoké La Noche',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      reservations: '/api/reservations',
      ranking: '/api/ranking',
      users: '/api/users',
      videos: '/api/videos'
    }
  });
});

// === Gestion des routes non trouvées (404) ===
app.use((req, res) => {
  console.log(`${colors.red}❌ Route non trouvée:${colors.reset} ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.url,
    method: req.method
  });
});

// === Gestion des erreurs globales ===
app.use((err, req, res, next) => {
  console.error(`${colors.red}💥 Erreur serveur:${colors.reset}`, err.message);
  console.error(err.stack);
  res.status(500).json({
    error: 'Erreur serveur interne',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

// === Démarrage du serveur ===
const server = app.listen(PORT, () => {
  console.log(`\n${colors.green}========================================${colors.reset}`);
  console.log(`${colors.green}🎤 Serveur Karaoké La Noche démarré !${colors.reset}`);
  console.log(`${colors.green}========================================${colors.reset}`);
  console.log(`${colors.blue}📍 URL:${colors.reset} http://localhost:${PORT}`);
  console.log(`${colors.blue}🌍 Environnement:${colors.reset} ${process.env.NODE_ENV || 'development'}`);
  console.log(`${colors.blue}📅 Date:${colors.reset} ${new Date().toLocaleString('fr-FR')}`);
  console.log(`${colors.green}========================================${colors.reset}\n`);
  console.log(`${colors.cyan}💡 Appuyez sur Ctrl+C pour arrêter le serveur${colors.reset}\n`);
});

// === Gestion propre de l'arrêt du serveur ===
const gracefulShutdown = async (signal) => {
  console.log(`\n${colors.yellow}========================================${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Signal ${signal} reçu${colors.reset}`);
  console.log(`${colors.yellow}🛑 Arrêt du serveur en cours...${colors.reset}`);
  console.log(`${colors.yellow}========================================${colors.reset}`);
  
  // Fermer le serveur HTTP
  server.close(async () => {
    console.log(`${colors.blue}✓ Serveur HTTP fermé${colors.reset}`);
    
    // Fermer la connexion à la base de données
    try {
      const pool = require('./config/database');
      await pool.end();
      console.log(`${colors.blue}✓ Connexion à la base de données fermée${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}❌ Erreur lors de la fermeture de la base de données:${colors.reset}`, error.message);
    }
    
    console.log(`${colors.green}\n✅ Serveur arrêté proprement${colors.reset}`);
    console.log(`${colors.green}👋 À bientôt !${colors.reset}\n`);
    process.exit(0);
  });
  
  // Forcer l'arrêt après 10 secondes
  setTimeout(() => {
    console.error(`${colors.red}⚠️  Arrêt forcé après timeout${colors.reset}`);
    process.exit(1);
  }, 10000);
};

// Écouter les signaux d'arrêt
process.on('SIGINT', () => gracefulShutdown('SIGINT'));  // Ctrl+C
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Kill command

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error(`${colors.red}💥 Exception non capturée:${colors.reset}`, error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`${colors.red}💥 Promesse rejetée non gérée:${colors.reset}`, reason);
  gracefulShutdown('unhandledRejection');
});
