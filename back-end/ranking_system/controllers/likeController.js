exports.likeVideo = (req, res) => {
  const db = req.db;
  const { userId, videoId } = req.body;

  const userIdInt = parseInt(userId, 10);
  const videoIdInt = parseInt(videoId, 10);

  if (isNaN(userIdInt) || isNaN(videoIdInt)) {
    return res.status(400).json({ message: 'userId ou videoId invalide' });
  }

  // Exemple simple : juste vérifier que user et vidéo existent
  db.get('SELECT * FROM users WHERE id = ?', [userIdInt], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    db.get('SELECT * FROM videos WHERE id = ?', [videoIdInt], (err2, video) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (!video) return res.status(404).json({ message: 'Vidéo non trouvée' });

      // Logique like à implémenter ici, ex ajout dans une table likes
      res.status(201).json({ message: `Like enregistré pour utilisateur ${userIdInt} sur vidéo ${videoIdInt}` });
    });
  });
};
