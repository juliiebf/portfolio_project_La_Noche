const db = require('../database/db');

// Récupérer toutes les vidéos avec nombre de likes
exports.getAllVideos = (req, res) => {
  const query = `
    SELECT videos.id, videos.url, videos.user_id, videos.created_at, COUNT(likes.id) AS likes_count
    FROM videos
    LEFT JOIN likes ON likes.video_id = videos.id
    GROUP BY videos.id
    ORDER BY likes_count DESC, videos.created_at DESC;
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// Ajouter une nouvelle vidéo (limite : 1 vidéo par utilisateur)
exports.addVideo = (req, res) => {
  const { user_id, url } = req.body;

  if (!user_id || !url) {
    return res.status(400).json({ error: 'User ID et URL sont requis' });
  }

  // Vérifier si l'utilisateur a déjà posté une vidéo
  const checkQuery = `SELECT COUNT(*) AS count FROM videos WHERE user_id = ?`;
  db.get(checkQuery, [user_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (row.count > 0) {
      return res.status(400).json({ error: 'Un utilisateur ne peut poster qu\'une seule vidéo' });
    }

    // Insérer la vidéo si aucune vidéo existante pour cet utilisateur
    const insertQuery = `INSERT INTO videos (user_id, url) VALUES (?, ?)`;
    db.run(insertQuery, [user_id, url], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, videoId: this.lastID });
    });
  });
};

// Ajouter un like à une vidéo (empêcher double like)
exports.addLike = (req, res) => {
  const userId = req.user?.id;
  const videoId = req.params.id;

  if (!userId || !videoId) {
    return res.status(400).json({ error: 'User ID et Video ID sont requis' });
  }

  const query = `INSERT INTO likes (user_id, video_id) VALUES (?, ?)`;

  db.run(query, [userId, videoId], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Vous avez déjà liké cette vidéo' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, likeId: this.lastID });
  });
};
