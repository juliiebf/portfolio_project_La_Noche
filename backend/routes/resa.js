const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { date_reservation, heure_debut, heure_fin, nombre_personnes, salle_id } = req.body;
    const user_id = req.user.id;

    if (!date_reservation || !heure_debut || !heure_fin || !nombre_personnes) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    const conflict = await pool.query(
      `SELECT * FROM reservations 
       WHERE salle_id = $1 
       AND date_reservation = $2 
       AND status != 'annulee'
       AND (
         (heure_debut <= $3 AND heure_fin > $3) OR
         (heure_debut < $4 AND heure_fin >= $4) OR
         (heure_debut >= $3 AND heure_fin <= $4)
       )`,
      [salle_id || 1, date_reservation, heure_debut, heure_fin]
    );

    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: 'Créneau horaire déjà réservé' });
    }

    const result = await pool.query(
      `INSERT INTO reservations 
       (user_id, date_reservation, heure_debut, heure_fin, nombre_personnes, salle_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmee', NOW())
       RETURNING *`,
      [user_id, date_reservation, heure_debut, heure_fin, nombre_personnes, salle_id || 1]
    );

    res.status(201).json({
      message: 'Réservation créée avec succès',
      reservation: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de la création de la réservation:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création de la réservation' });
  }
});

router.get('/mes-reservations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, s.nom as salle_nom 
       FROM reservations r
       LEFT JOIN salles s ON r.salle_id = s.id
       WHERE r.user_id = $1
       ORDER BY r.date_reservation DESC, r.heure_debut DESC`,
      [req.user.id]
    );

    res.json({ reservations: result.rows });

  } catch (error) {
    console.error('Erreur lors de la récupération des réservations:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.nom, u.prenom, u.email, s.nom as salle_nom
       FROM reservations r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN salles s ON r.salle_id = s.id
       ORDER BY r.date_reservation DESC, r.heure_debut DESC`
    );

    res.json({ reservations: result.rows });

  } catch (error) {
    console.error('Erreur lors de la récupération des réservations:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { date_reservation, heure_debut, heure_fin, nombre_personnes, status } = req.body;

    const result = await pool.query(
      `UPDATE reservations 
       SET date_reservation = COALESCE($1, date_reservation),
           heure_debut = COALESCE($2, heure_debut),
           heure_fin = COALESCE($3, heure_fin),
           nombre_personnes = COALESCE($4, nombre_personnes),
           status = COALESCE($5, status)
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [date_reservation, heure_debut, heure_fin, nombre_personnes, status, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }

    res.json({
      message: 'Réservation mise à jour avec succès',
      reservation: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la réservation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE reservations 
       SET status = 'annulee'
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }

    res.json({
      message: 'Réservation annulée avec succès',
      reservation: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de l\'annulation de la réservation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
