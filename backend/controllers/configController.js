const { getGlobalLogLevel, setGlobalLogLevel } = require('../services/whatsappBaileys');

exports.getLogLevel = (req, res) => {
  res.json({ level: getGlobalLogLevel() });
};

exports.setLogLevel = (req, res) => {
  const level = String(req.body?.level || '').toLowerCase();
  if (!['info', 'debug'].includes(level)) return res.status(400).json({ error: 'level must be info or debug' });
  const newLevel = setGlobalLogLevel(level);
  res.json({ level: newLevel });
};
