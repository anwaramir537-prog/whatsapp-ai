import Chat from '../models/Chat.js';

export async function getHistory(req, res) {
  const { userId } = req.params;
  if (userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const chats = await Chat.find({ userId }).sort({ updatedAt: -1 }).limit(100);
  res.json({ chats });
}

export async function getAnalytics(req, res) {
  const { userId } = req.params;
  if (userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const chats = await Chat.find({ userId }).select('messages');
  let total = 0, faq = 0, ai = 0, manual = 0;
  chats.forEach(c => c.messages.forEach(m => {
    if (m.role === 'assistant') {
      total++;
      if (m.responseType === 'faq') faq++; else if (m.responseType === 'ai') ai++; else if (m.responseType === 'manual') manual++;
    }
  }));
  res.json({ total, faq, ai, manual });
}
