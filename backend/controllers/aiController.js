const { smartReply } = require('../services/smartReply');

exports.ask = async (req, res) => {
  try {
    const userId = String(req.params.userId);
    if (req.user?.id !== userId) return res.status(403).json({ error: 'forbidden' });
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text required' });
    const reply = await smartReply({ userId, text });
    res.json({ ok: true, ...reply });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'ask failed' });
  }
};
