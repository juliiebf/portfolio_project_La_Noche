const express = require('express');
const session = require('express-session');
const path = require('path');
const userRoutes = require('./routes/users');
const videoRoutes = require('./routes/videos');
const app = express();
const PORT = 3000;

app.use(session({
  secret: 'karaoke_secret',
  resave: false,
  saveUninitialized: true
}));

app.use(express.json());

app.use('/uploads', express.static('uploads'));

// Sert les fichiers statiques dans le dossier public
app.use(express.static('public'));
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);

// Modifie la route racine pour servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});