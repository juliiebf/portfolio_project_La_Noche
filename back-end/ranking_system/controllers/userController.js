// Récupérer tous les utilisateurs
exports.getAllUsers = (req, res) => {
  const db = req.db;
  
  const query = 'SELECT id, username, email FROM users';
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs', error: err.message });
    }
    res.status(200).json(rows);
  });
};

// Récupérer un utilisateur par son ID
exports.getUserById = (req, res) => {
  const db = req.db;
  const { id } = req.params;

  const query = 'SELECT id, username, email FROM users WHERE id = ?';
  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de la récupération de l\'utilisateur', error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.status(200).json(row);
  });
};

// Créer un nouvel utilisateur
exports.createUser = (req, res) => {
  const db = req.db;
  const { username, email } = req.body;

  // Vérifier si username ou email existe déjà
  const checkQuery = `SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1`;
  db.get(checkQuery, [username, email], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de la vérification des utilisateurs', error: err.message });
    }
    if (row) {
      return res.status(400).json({ message: 'Username ou email déjà utilisé' });
    } else {
      const insertQuery = 'INSERT INTO users(username, email) VALUES (?, ?)';
      db.run(insertQuery, [username, email], function(err) {
        if (err) {
          return res.status(400).json({ message: 'Erreur lors de la création de l\'utilisateur', error: err.message });
        }
        res.status(201).json({ message: 'Utilisateur ajouté', id: this.lastID });
      });
    }
  });
};

// Mettre à jour un utilisateur
exports.updateUser = (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const { username, email } = req.body;

  // Vérifier si l'utilisateur existe
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de la recherche de l\'utilisateur', error: err.message });
    }
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier si le nouveau username ou email existe déjà pour un autre utilisateur
    const checkQuery = 'SELECT * FROM users WHERE (username = ? OR email = ?) AND id != ?';
    db.get(checkQuery, [username, email, id], (err, existingUser) => {
      if (err) {
        return res.status(500).json({ message: 'Erreur lors de la vérification des doublons', error: err.message });
      }
      if (existingUser) {
        return res.status(400).json({ message: 'Username ou email déjà utilisé par un autre utilisateur' });
      }

      // Mettre à jour l'utilisateur
      const updateQuery = 'UPDATE users SET username = ?, email = ? WHERE id = ?';
      db.run(updateQuery, [username, email, id], function(err) {
        if (err) {
          return res.status(400).json({ message: 'Erreur lors de la mise à jour de l\'utilisateur', error: err.message });
        }
        res.status(200).json({ message: 'Utilisateur mis à jour avec succès' });
      });
    });
  });
};

// Supprimer un utilisateur
exports.deleteUser = (req, res) => {
  const db = req.db;
  const { id } = req.params;

  // Vérifier si l'utilisateur existe
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de la recherche de l\'utilisateur', error: err.message });
    }
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Supprimer l'utilisateur
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(400).json({ message: 'Erreur lors de la suppression de l\'utilisateur', error: err.message });
      }
      res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
    });
  });
};
