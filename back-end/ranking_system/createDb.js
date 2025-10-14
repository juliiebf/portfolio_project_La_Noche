const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('karaoke.db');

const creationTables = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  userId INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  videoId INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, videoId),
  FOREIGN KEY(userId) REFERENCES users(id),
  FOREIGN KEY(videoId) REFERENCES videos(id)
);
`;

db.exec(creationTables, (err) => {
  if (err) {
    return console.error('Erreur création base:', err.message);
  }
  console.log('Base SQLite créée avec succès !');
  db.close();
});
