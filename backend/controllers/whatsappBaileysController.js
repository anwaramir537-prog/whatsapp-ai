const fs = require('fs');
const path = require('path');
const { initBaileys, getStatus, sendTypingAndReply } = require('../services/whatsappBaileys');

function authDir(userId) {
  const base = process.env.SESSION_PATH || path.resolve(process.cwd(), 'sessions');
  return path.join(base, 'baileys', String(userId));
}

exports.connectWhatsApp = async (req, res) => {
  try {
    const userId = String(req.params.userId);
    // Connect endpoint can be called without auth; if auth is present, enforce match
    if (req.user && req.user.id !== userId) return res.status(403).json({ error: 'forbidden' });
    const io = req.app.get('io');
    await initBaileys(userId, io);
    const status = getStatus(userId);
    res.json({ status });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'connect failed' });
  }
};

exports.getStatus = (req, res) => {
  try {
    const userId = String(req.params.userId);
    if (req.user?.id !== userId) return res.status(403).json({ error: 'forbidden' });
    const status = getStatus(userId);
    res.set('Cache-Control', 'no-store');
    res.json({ status });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'status failed' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const userId = String(req.params.userId);
    if (req.user?.id !== userId) return res.status(403).json({ error: 'forbidden' });
    const { to, text } = req.body || {};
    if (!to || !text) return res.status(400).json({ error: 'to and text required' });
    await sendTypingAndReply(userId, to, text);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'send failed' });
  }
};

exports.resetWhatsApp = async (req, res) => {
  try {
    const userId = String(req.params.userId);
    if (req.user?.id !== userId) return res.status(403).json({ error: 'forbidden' });
    const dir = authDir(userId);
    if (fs.existsSync(dir)) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'reset failed' });
  }
};
