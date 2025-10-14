const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const videoController = require('../controllers/videoController');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/videos/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500 MB max

// Ajouter vidéo avec upload du fichier vidéo (champ 'videoFile')
router.post('/add', upload.single('videoFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier vidéo requis' });
  }

  // Construire l'URL ou chemin du fichier vidéo
  const videoUrl = `/uploads/videos/${req.file.filename}`;

  // Ajouter la vidéo en base (avec user_id passé dans body)
  req.body.url = videoUrl;

  videoController.addVideo(req, res);
});

module.exports = router;
