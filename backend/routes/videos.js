const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/authenticateToken');
const router = express.Router();

// Configuration multer : stockage des fichiers uploadés dans ./uploads avec nom unique
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// POST /api/videos/upload : upload d'une vidéo, fichier 'video'
// Protection JWT
router.post('/upload', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier vidéo uploadé.' });
    // Insère la vidéo en base associée à l'utilisateur
    const result = await db.query(
      'INSERT INTO videos (user_id, filename, likes) VALUES ($1, $2, 0) RETURNING *',
      [req.user.id, req.file.filename]
    );
    res.status(201).json({ message: 'Vidéo uploadée.', video: result.rows[0] });
  } catch (err) {
    console.error('Erreur lors de l\'upload de la vidéo :', err);
    res.status(500).json({ error: "Erreur serveur lors de l'upload de la vidéo." });
  }
});

// POST /api/videos/:id/like : like une vidéo par utilisateur (un seul like)
// Protection JWT
router.post('/:id/like', authenticateToken, async (req, res) => {
  const videoId = parseInt(req.params.id);
  if (isNaN(videoId)) return res.status(400).json({ error: 'ID vidéo invalide' });

  try {
    // Vérifie si l'utilisateur a déjà liké cette vidéo
    const check = await db.query('SELECT * FROM likes WHERE user_id = $1 AND video_id = $2', [req.user.id, videoId]);
    if (check.rows.length > 0) return res.status(400).json({ error: 'Vous avez déjà liké cette vidéo.' });

    // Ajoute le like en base
    await db.query('INSERT INTO likes (user_id, video_id) VALUES ($1, $2)', [req.user.id, videoId]);

    // Incrémente le nombre de likes dans la table videos
    await db.query('UPDATE videos SET likes = likes + 1 WHERE id = $1', [videoId]);

    res.json({ message: 'Vidéo likée.' });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur lors du like." });
  }
});

// GET /api/videos : liste toutes les vidéos avec likes et utilisateur
// (Pas besoin d'être connecté pour voir la liste)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT v.id, v.filename, v.likes, u.username
      FROM videos v
      JOIN users u ON v.user_id = u.id
      ORDER BY v.likes DESC, v.created_at DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur dans /api/videos :', err);
    res.status(500).json({ error: "Erreur serveur lors de la récupération des vidéos." });
  }
});

module.exports = router;
