const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Liste tous les utilisateurs
router.get('/', userController.getAllUsers);

// Détail d’un utilisateur par son ID
router.get('/:id', userController.getUserById);

module.exports = router;
