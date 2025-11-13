const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  try {
    const header = req.headers?.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token = header.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change_me');
    if (!decoded || !decoded.id) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = { id: decoded.id };
    return next();
  } catch (e) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};
