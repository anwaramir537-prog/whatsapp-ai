const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'missing token' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change_me');
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('missing token'));
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change_me');
    socket.data.user = { id: payload.id, email: payload.email };
    next();
  } catch (e) {
    next(new Error('invalid token'));
  }
}

module.exports = { authRequired, socketAuth };