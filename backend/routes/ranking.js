const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.post('/scores', authenticateToken, async (req, res) => {
  try {
    const { chanson, artiste, score, commentaire } = req.body;
    const user_id = req.user.id;

    if (!chanson || !artiste || score === undefined) {
      return res.status(400).json({ error: 'Chanson, artiste et score sont requis' });
    }

    if (score < 0 || score > 100) {
      return res.status(400).json({ error: 'Le score doit être entre 0 et 100' });
    }

    const result = await pool.query(
      `INSERT INTO scores 
       (user_id, chanson, artiste, score, commentaire, date_score)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [user_id, chanson, artiste, score, commentaire]
    );

    res.status(201).json({
      message: 'Score ajouté avec succès',
      score: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de l\'ajout du score:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         u.id,
         u.nom,
         u.prenom,
         COUNT(s.id) as total_chansons,
         ROUND(AVG(s.score), 2) as score_moyen,
         MAX(s.score) as meilleur_score
       FROM users u
       LEFT JOIN scores s ON u.id = s.user_id
       GROUP BY u.id, u.nom, u.prenom
       HAVING COUNT(s.id) > 0
       ORDER BY score_moyen DESC, total_chansons DESC
       LIMIT 50`
    );

    res.json({ leaderboard: result.rows });

  } catch (error) {
    console.error('Erreur lors de la récupération du classement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/mes-scores', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM scores 
       WHERE user_id = $1
       ORDER BY date_score DESC`,
      [req.user.id]
    );

    res.json({ scores: result.rows });

  } catch (error) {
    console.error('Erreur lors de la récupération des scores:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/top-chansons', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         chanson,
         artiste,
         COUNT(*) as nombre_interpretations,
         ROUND(AVG(score), 2) as score_moyen,
         MAX(score) as meilleur_score
       FROM scores
       GROUP BY chanson, artiste
       HAVING COUNT(*) >= 3
       ORDER BY score_moyen DESC
       LIMIT 20`
    );

    res.json({ topChansons: result.rows });

  } catch (error) {
    console.error('Erreur lors de la récupération des meilleures chansons:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
