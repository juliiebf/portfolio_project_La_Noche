// backend/server.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Middleware de logging avec code de statut
app.use((req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(data) {
    console.log(`${req.method} ${req.originalUrl} - Status: ${res.statusCode}`);
    originalSend.call(this, data);
  };
  
  res.json = function(data) {
    console.log(`${req.method} ${req.originalUrl} - Status: ${res.statusCode}`);
    originalJson.call(this, data);
  };
  
  next();
});

let reservations = [];
let nextId = 1;

// Créer une réservation
app.post('/api/reservations', (req, res) => {
  const {
    nom,
    email,
    telephone,
    date,
    heure,
    type,
    nombre_personnes,
    commentaires,
    accept_cgu
  } = req.body;

  if (!nom || !email || !date || !heure || !accept_cgu) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  const newReservation = {
    id: nextId++,
    nom,
    email,
    telephone: telephone || '',
    date,
    heure,
    type: type || 'standard',
    nombre_personnes: nombre_personnes || 1,
    commentaires: commentaires || '',
    accept_cgu,
    date_creation: new Date()
  };

  reservations.push(newReservation);
  res.status(201).json(newReservation);
});

// Lister toutes les réservations
app.get('/api/reservations', (req, res) => {
  res.json(reservations);
});

// Détail réservation
app.get('/api/reservations/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const reservation = reservations.find(r => r.id === id);
  if (!reservation) return res.status(404).json({ error: 'Réservation non trouvée' });
  res.json(reservation);
});

// Mise à jour
app.put('/api/reservations/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const reservationIndex = reservations.findIndex(r => r.id === id);
  if (reservationIndex === -1) return res.status(404).json({ error: 'Réservation non trouvée' });

  const updated = { ...reservations[reservationIndex], ...req.body };
  reservations[reservationIndex] = updated;
  res.json(updated);
});

// Suppression
app.delete('/api/reservations/:id', (req, res) => {
  const id = parseInt(req.params.id);
  reservations = reservations.filter(r => r.id !== id);
  res.json({ message: 'Réservation supprimée' });
});

// Serveur écoute
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Backend La Noche réservations écoute sur http://localhost:${port}`);
});

app.get('/', (req, res) => {
  res.send('Bienvenue sur le backend La Noche');
});