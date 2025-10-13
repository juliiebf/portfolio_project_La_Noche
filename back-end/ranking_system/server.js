const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json());

// Création ou ouverture de la base SQLite
const dbFile = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    return console.error('Erreur ouverture DB:', err.message);
  }
  console.log('Connecté à SQLite');
});

// Création des tables si non existantes
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      userId INTEGER NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  // Ici, tu peux créer une table likes si besoin
  // db.run(`CREATE TABLE IF NOT EXISTS likes (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, videoId INTEGER, FOREIGN KEY(...) ...)`);
});

// Mise à disposition de la DB dans req via middleware
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Import des routes
const userRoutes = require('./routes/userRoutes');
const videoRoutes = require('./routes/videoRoutes');
const likeRoutes = require('./routes/likeRoutes');

app.use('/users', userRoutes);
app.use('/', videoRoutes);
app.use('/', likeRoutes);

// Route racine simple
app.get('/', (req, res) => {
  res.send('Hello World! Le serveur fonctionne avec SQLite.');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
