const db = require('../database/db'); // Adaptation selon ta gestion de la DB

// Récupérer la liste de tous les utilisateurs
exports.getAllUsers = (req, res) => {
  const query = `SELECT id, username, email FROM users ORDER BY username ASC`;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// Récupérer les détails d’un utilisateur par son ID
exports.getUserById = (req, res) => {
  const userId = req.params.id;
  const query = `SELECT id, username, email FROM users WHERE id = ?`;
  db.get(query, [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(row);
  });
};
