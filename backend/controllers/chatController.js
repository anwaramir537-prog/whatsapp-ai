const { connectDB } = require('../db');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

exports.history = async (req, res) => {
  try {
    await connectDB();
    const userId = String(req.params.userId);
    if (req.user?.id !== userId) return res.status(403).json({ error: 'forbidden' });

    // Get last 20 chats by lastMessageAt
    const chats = await Chat.find({ userId }).sort({ lastMessageAt: -1 }).limit(20).lean();
    const contactIds = chats.map(c => c.contactId);
    const perContact = {};
    if (contactIds.length) {
      const msgs = await Message.aggregate([
        { $match: { userId, contactId: { $in: contactIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$contactId', messages: { $push: { role: '$role', text: '$text', source: '$source', createdAt: '$createdAt' } } } },
        { $project: { contactId: '$_id', messages: { $slice: ['$messages', 30] }, _id: 0 } }
      ]);
      msgs.forEach(m => { perContact[m.contactId] = m.messages.reverse(); });
    }

    const result = chats.map(c => ({
      contactId: c.contactId,
      messages: perContact[c.contactId] || [],
      counters: c.counters,
      lastMessageAt: c.lastMessageAt,
    }));
    res.json({ chats: result });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'history failed' });
  }
};

exports.analytics = async (req, res) => {
  try {
    await connectDB();
    const userId = String(req.params.userId);
    if (req.user?.id !== userId) return res.status(403).json({ error: 'forbidden' });

    const days = Math.min(Math.max(parseInt(req.query.days || '7', 10), 1), 30);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '100', 10), 10), 1000);

    const since = new Date(Date.now() - days * 86400000);

    // Limit counting to recent assistant messages sample for speed
    const recent = await Message.find({ userId, createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select({ role: 1, source: 1, createdAt: 1 })
      .lean();

    const totals = { total: 0, faq: 0, ai: 0, manual: 0 };
    for (const m of recent) {
      totals.total++;
      if (m.role === 'assistant') {
        if (m.source === 'faq') totals.faq++;
        else if (m.source === 'ai') totals.ai++;
        else if (m.source === 'manual') totals.manual++;
      }
    }

    const series = await Message.aggregate([
      { $match: { userId, createdAt: { $gte: since } } },
      { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, role: '$role', source: '$source' }, count: { $sum: 1 } } },
      { $project: { day: '$_id.day', role: '$_id.role', source: '$_id.source', count: 1, _id: 0 } },
      { $sort: { day: 1 } },
      { $limit: 1000 }
    ]);

    res.json({ totals, series, window: { days, limit } });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'analytics failed' });
  }
};
