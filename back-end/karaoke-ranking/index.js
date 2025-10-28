const express = require('express');
const session = require('express-session');
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
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);


// Middleware session pour simuler login


// Middleware parse JSON


// Routes API


app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
