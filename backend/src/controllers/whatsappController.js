import { startSession, getClientStatus, resetSession } from "../services/whatsappService.js";

export const connectWhatsApp = async (req, res) => {
  const { userId } = req.params;
  try {
    const fresh = String(req.query?.fresh || '').toLowerCase() === 'true' || req.query?.fresh === '1';
    const clientKey = fresh ? `${String(userId)}-${Date.now().toString(36)}` : undefined;
    const qr = await startSession(userId, clientKey);
    res.json({ qr, clientId: clientKey || String(userId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getStatus = async (req, res) => {
  const { userId } = req.params;
  try {
    const status = await getClientStatus(userId);
    res.json({ status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const resetWhatsApp = async (req, res) => {
  const { userId } = req.params;
  try {
    await resetSession(userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Reset failed' });
  }
};

export async function sendMessage(req, res) {
  const { userId } = req.params;
  if (userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const { to, text } = req.body;
  if (!to || !text) return res.status(400).json({ error: 'Missing to/text' });
  try {
    const result = await whatsappService.sendMessage(userId, to, text);
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ error: 'Send failed' });
  }
}
