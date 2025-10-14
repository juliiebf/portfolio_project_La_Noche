const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'karaoke.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur connexion à la base SQLite:', err.message);
  } else {
    console.log('Connecté à la base SQLite:', dbPath);
  }
});

module.exports = db;
