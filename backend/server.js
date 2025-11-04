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

// === Middlewares globaux ===
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Sessions (pour stocker l’état utilisateur côté serveur)
app.use(session({
  secret: 'karaoke_secret',
  resave: false,
  saveUninitialized: true
}));

app.use(express.json());

// === Fichiers statiques ===
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// === Routes principales ===
app.use('/api/auth', loginRoutes);
app.use('/api/reservations', resaRoutes);
app.use('/api/ranking', rankingRoute
)