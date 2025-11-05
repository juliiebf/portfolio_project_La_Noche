const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// POST /scores : Ajouter un score
router.post('/scores', authenticateToken, async (req, res) => {
  try {
    const { chanson, artiste, score, commentaire } = req.body;
    const user_id = req.user.id;

    console.log(`[POST /scores] Tentative d'ajout de score par user_id=${user_id}`);

    if (!chanson || !artiste || score === undefined) {
      console.warn(`[POST /scores] Erreur : champs manquants pour user_id=${user_id}`);
      return res.status(400).json({ error: 'Chanson, artiste et score sont requis' });
    }

    if (score < 0 || score > 100) {
      console.warn(`[POST /scores] Erreur : score invalide (${score}) pour user_id=${user_id}`);
      return res.status(400).json({ error: 'Le score doit être entre 0 et 100' });
    }

    const result = await pool.query(
      `INSERT INTO scores 
       (user_id, chanson, artiste, score, commentaire, date_score)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [user_id, chanson, artiste, score, commentaire]
    );

    console.log(`[POST /scores] Score ajouté avec succès pour user_id=${user_id}, score_id=${result.rows[0].id}`);
    res.status(201).json({
      message: 'Score ajouté avec succès',
      score: result.rows[0]
    });

  } catch (error) {
    console.error(`[POST /scores] Erreur serveur pour user_id=${req.user.id}:`, error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /leaderboard : Classement général
router.get('/leaderboard', async (req, res) => {
  try {
    console.log(`[GET /leaderboard] Récupération du classement général`);

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

    console.log(`[GET /leaderboard] Classement récupéré : ${result.rows.length} utilisateurs`);
    res.json({ leaderboard: result.rows });

  } catch (error) {
    console.error(`[GET /leaderboard] Erreur serveur :`, error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /mes-scores : Scores de l'utilisateur connecté
router.get('/mes-scores', authenticateToken, async (req, res) => {
  try {
    console.log(`[GET /mes-scores] Récupération des scores pour user_id=${req.user.id}`);

    const result = await pool.query(
      `SELECT * FROM scores 
       WHERE user_id = $1
       ORDER BY date_score DESC`,
      [req.user.id]
    );

    console.log(`[GET /mes-scores] ${result.rows.length} scores trouvés pour user_id=${req.user.id}`);
    res.json({ scores: result.rows });

  } catch (error) {
    console.error(`[GET /mes-scores] Erreur serveur pour user_id=${req.user.id}:`, error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /top-chansons : Top chansons par score moyen
router.get('/top-chansons', async (req, res) => {
  try {
    console.log(`[GET /top-chansons] Récupération des meilleures chansons`);

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

    console.log(`[GET /top-chansons] ${result.rows.length} chansons récupérées`);
    res.json({ topChansons: result.rows });

  } catch (error) {
    console.error(`[GET /top-chansons] Erreur serveur :`, error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
