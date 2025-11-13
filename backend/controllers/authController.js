const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../db');
const User = require('../models/User');

function sign(user) {
  const payload = { id: user._id.toString(), email: user.email };
  return jwt.sign(payload, process.env.JWT_SECRET || 'change_me', { expiresIn: '7d' });
}

exports.register = async (req, res) => {
  try {
    await connectDB();
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'email exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, name });
    const token = sign(user);
    res.json({ token, user: { id: user._id.toString(), email, name } });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'register failed' });
  }
};

exports.login = async (req, res) => {
  try {
    await connectDB();
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = sign(user);
    res.json({ token, user: { id: user._id.toString(), email, name: user.name } });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'login failed' });
  }
};