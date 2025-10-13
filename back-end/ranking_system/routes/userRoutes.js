const express = require('express');
const router = express.Router();
const { 
  createUser, 
  getUserById, 
  updateUser, 
  deleteUser,
  getAllUsers 
} = require('../controllers/userController');

// Récupérer tous les utilisateurs
router.get('/', getAllUsers);

// Créer un nouvel utilisateur
router.post('/', createUser);

// Récupérer un utilisateur par son ID
router.get('/:id', getUserById);

// Mettre à jour un utilisateur
router.put('/:id', updateUser);

// Supprimer un utilisateur
router.delete('/:id', deleteUser);

module.exports = router;
