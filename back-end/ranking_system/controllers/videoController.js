exports.uploadVideo = (req, res) => {
  const db = req.db;

  if (!req.file) {
    return res.status(400).json({ message: 'Aucun fichier vidéo reçu' });
  }
  const { title, userId } = req.body;

  const userIdInt = parseInt(userId, 10);
  if (isNaN(userIdInt)) {
    return res.status(400).json({ message: 'userId invalide' });
  }

  const query = 'INSERT INTO videos(title, url, userId) VALUES (?, ?, ?)';

  db.run(query, [title || req.file.originalname, req.file.path, userIdInt], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de la sauvegarde vidéo', error: err.message });
    }
    res.status(201).json({ message: 'Vidéo uploadée', id: this.lastID });
  });
};
