const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mamynavalonarakotoniainadev0ps';

// Middleware pour vérifier le token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // {id, username, role}
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token invalide ou expiré' });
  }
};

// Middleware pour vérifier les rôles
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Accès refusé', 
        message: `Cette action nécessite le rôle: ${allowedRoles.join(' ou ')}` 
      });
    }

    next();
  };
};

module.exports = { authenticateToken, authorizeRoles, JWT_SECRET };