const { connectDB } = require('../db');
const Settings = require('../models/Settings');

exports.getSettings = async (req, res) => {
  try {
    await connectDB();
    const userId = String(req.params.userId);
    if (req.user?.id !== userId) return res.status(403).json({ error: 'forbidden' });
    let s = await Settings.findOne({ userId }).lean();
    if (!s) s = await Settings.create({ userId });
    res.json({ settings: { aiEnabled: s.aiEnabled, faqThreshold: s.faqThreshold } });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'get settings failed' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    await connectDB();
    const userId = String(req.params.userId);
    if (req.user?.id !== userId) return res.status(403).json({ error: 'forbidden' });
    const { aiEnabled, faqThreshold } = req.body || {};
    const s = await Settings.findOneAndUpdate(
      { userId },
      { $set: { ...(aiEnabled !== undefined ? { aiEnabled: !!aiEnabled } : {}), ...(faqThreshold !== undefined ? { faqThreshold: Number(faqThreshold) } : {}) } },
      { upsert: true, new: true }
    ).lean();
    res.json({ settings: { aiEnabled: s.aiEnabled, faqThreshold: s.faqThreshold } });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'update settings failed' });
  }
};
