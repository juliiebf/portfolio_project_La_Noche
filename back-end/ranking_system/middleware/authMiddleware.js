// middleware/authMiddleware.js

function isAuthenticated(req, res, next) {
  // Exemple basique : on attend un header "x-user-id" simulant un utilisateur connecté
  const userId = req.header('x-user-id');
  if (userId) {
    req.user = { id: userId };
    next();
  } else {
    res.status(401).json({ error: 'Utilisateur non authentifié' });
  }
}

module.exports = isAuthenticated;
