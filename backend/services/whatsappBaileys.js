const path = require('path');
const fs = require('fs');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { smartReply } = require('./smartReply');
const { connectDB } = require('../db');
const Settings = require('../models/Settings');
const { synthesizeTTSAudio } = require('./tts');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

let CURRENT_LOG_LEVEL = process.env.LOG_LEVEL || process.env.BAILEYS_LOG_LEVEL || 'info';

function getGlobalLogLevel() { return CURRENT_LOG_LEVEL; }
function setGlobalLogLevel(level) { CURRENT_LOG_LEVEL = (level === 'debug' ? 'debug' : 'info'); try { updateAllLoggerLevels(CURRENT_LOG_LEVEL); } catch {} return CURRENT_LOG_LEVEL; }

function summarizeError(err) {
  if (!err) return { message: 'unknown', statusCode: undefined };
  const any = err;
  const statusCode = any?.output?.statusCode || any?.data?.statusCode || any?.status || undefined;
  const message = any?.message || any?.output?.payload?.message || String(any);
  const details = {
    isBoom: !!any?.isBoom,
    data: any?.data,
    name: any?.name,
    code: any?.code,
  };
  return { statusCode, message, details };
}

const sessions = new Map(); // userId -> { sock, status, authPath, logger }
// Track message retry counters to help Baileys decrypt older/stale messages
const msgRetryCounterMap = {};

function sessionPath(userId) {
  const base = process.env.SESSION_PATH || path.resolve(process.cwd(), 'sessions');
  const dir = path.join(base, 'baileys', String(userId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function emitUser(io, userId, event, payload) {
  try { io?.to(userId).emit(event, payload); } catch {}
  try {
    const nsps = io?._nsps || io?.server?._nsps || io?.of?.() || new Map();
    if (nsps instanceof Map) {
      nsps.forEach((nsp, name) => {
        if (String(name || '').startsWith('/tenant')) {
          try { nsp.to(userId).emit(event, payload); } catch {}
        }
      });
    }
  } catch {}
}

function clearAuthDir(dir) {
  try {
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.warn('🧹 Cleared Baileys auth dir', dir);
    }
  } catch (e) {
    console.warn('Auth dir clear failed:', e?.message || e);
  }
}

function updateAllLoggerLevels(level) {
  try {
    for (const [id, entry] of sessions.entries()) {
      try { if (entry?.logger?.level) entry.logger.level = level; } catch {}
    }
  } catch {}
}

async function initBaileys(userId, io, opts = {}) {
  const id = String(userId);
  if (sessions.get(id)?.sock) return sessions.get(id);

  const authPath = sessionPath(id);
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  const logger = pino({ level: getGlobalLogLevel() });
  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    browser: Browsers.appropriate('Chrome'),
    syncFullHistory: false,
    // enable retries for undecryptable messages
    msgRetryCounterMap,
    retryRequestDelayMs: 2500,
  });

  const entry = { sock, status: 'initializing', authPath, logger };
  sessions.set(id, entry);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.info('📷 QR received (not printed). Emitting to UI...', { userId: id });
      emitUser(io, id, 'wa:qr', { userId: id, qr });
    }
    if (connection === 'open') {
      entry.status = 'connected';
      emitUser(io, id, 'wa:status', { status: 'connected', userId: id });
      console.log('✅ WhatsApp Connected (Baileys) userId=', id);
    } else if (connection === 'close') {
      const info = summarizeError(lastDisconnect?.error);
      const statusCode = info.statusCode;
      console.warn('⚠️ Baileys connection closed', { userId: id, statusCode, message: info.message, details: info.details });
      entry.status = 'disconnected';
      emitUser(io, id, 'wa:status', { status: 'disconnected', userId: id, reason: { statusCode, message: info.message } });

      // Auto-clean on 401 (auth rejection) then reinit to re-emit a fresh QR automatically
      if (Number(statusCode) === 401) {
        clearAuthDir(entry.authPath);
        sessions.delete(id);
        console.log('🔁 401 auth rejected — cleared session and reinitializing in 1s...');
        setTimeout(() => initBaileys(id, io).catch(() => {}), 1000);
        return;
      }

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        sessions.delete(id);
        console.log('🔄 Reconnecting WhatsApp client (Baileys) in 5s...');
        setTimeout(() => initBaileys(id, io).catch(() => {}), 5000);
      } else {
        console.log('❌ Logged out manually. Please re-scan.');
      }
    } else if (connection) {
      console.info('ℹ️ Connection state update:', { userId: id, connection });
    }
  });

  sock.ev.on('messages.update', (updates) => {
    for (const u of updates) {
      if (u.status === 409 || u.status === 410) {
        // message retry requested/failed
        console.warn('🧩 Message update', { key: u.key, status: u.status });
      }
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      const up = m?.messages?.[0];
      if (!up) return;
      if (up?.key?.fromMe) return; // ignore our own messages
      const from = up.key.remoteJid;
      const isGroup = from?.endsWith('@g.us');
      if (isGroup) return;
      const text = up.message?.conversation 
        || up.message?.extendedTextMessage?.text 
        || up.message?.imageMessage?.caption 
        || up.message?.videoMessage?.caption 
        || '';
      if (!text) return;
      console.log(`📩 Incoming message from userId ${id}`);
      emitUser(io, id, 'wa:incoming', { userId: id, from, text });

      // Persist inbound
      try {
        await connectDB();
        await Message.create({ userId: id, contactId: from, role: 'user', text, source: null });
        await Chat.updateOne(
          { userId: id, contactId: from },
          { $setOnInsert: { counters: { total: 0, faq: 0, ai: 0, manual: 0 } }, $set: { lastMessageAt: new Date() }, $inc: { 'counters.total': 1 } },
          { upsert: true }
        );
      } catch {}

      // Load settings
      let aiEnabled = true, threshold = 0.42;
      try {
        const s = await Settings.findOne({ userId: id }).lean();
        if (s) { aiEnabled = !!s.aiEnabled; if (typeof s.faqThreshold === 'number') threshold = s.faqThreshold; }
      } catch {}

      // Smart-reply pipeline: FAQ -> AI
      console.log('🔹 Using user FAQ for smart reply');
      emitUser(io, id, 'wa:typing', { userId: id, to: from, typing: true });
      try { await sock.sendPresenceUpdate('composing', from); } catch {}
      const reply = await smartReply({ userId: id, text, aiEnabled, threshold });
      if (reply.provider) console.log('🧠 AI provider:', reply.provider);
      const appendLabel = String(process.env.WA_APPEND_PROVIDER_LABEL || 'true').toLowerCase() === 'true';
      const label = reply.provider ? `ai (${reply.provider})` : (reply.source === 'ai' ? 'ai' : reply.source || '');
      const outText = appendLabel && reply.source === 'ai' ? `${reply.text}\n\n${label}` : reply.text;
      await sendTypingAndReply(id, from, outText);
      console.log(`📤 AI Reply sent (${label}): "${reply.text}"`);
      // Try to send TTS voice note (PTT)
      try {
        if (reply.text && reply.text.length > 0) {
          const audio = await synthesizeTTSAudio(reply.text);
          await sock.sendMessage(from, { audio, ptt: true, mimetype: 'audio/mpeg' });
          console.log('🔊 Voice note sent');
        }
      } catch (e) {
        console.warn('TTS send failed:', e?.message || e);
      }
      emitUser(io, id, 'wa:reply', { userId: id, to: from, text: reply.text, source: reply.source, provider: reply.provider });

      // Persist outbound
      try {
        await Message.create({ userId: id, contactId: from, role: 'assistant', text: reply.text, source: reply.source || null });
        const inc = { 'counters.total': 1 };
        if (reply.source === 'faq') inc['counters.faq'] = 1;
        else if (reply.source === 'ai') inc['counters.ai'] = 1;
        else if (reply.source === 'manual') inc['counters.manual'] = 1;
        await Chat.updateOne(
          { userId: id, contactId: from },
          { $set: { lastMessageAt: new Date() }, $inc: inc },
          { upsert: true }
        );
      } catch {}
    } catch (e) {
      console.error('messages.upsert error:', e?.message || e);
    } finally {
      try { await sock.sendPresenceUpdate('paused', m?.messages?.[0]?.key?.remoteJid); } catch {}
      emitUser(io, id, 'wa:typing', { userId: id, to: m?.messages?.[0]?.key?.remoteJid, typing: false });
    }
  });

  return entry;
}

async function sendTypingAndReply(userId, jid, text) {
  const id = String(userId);
  const sock = sessions.get(id)?.sock;
  if (!sock) throw new Error('No socket');
  try { await sock.sendPresenceUpdate('composing', jid); } catch {}
  await new Promise((r) => setTimeout(r, 2500));
  await sock.sendMessage(jid, { text });
  try { await sock.sendPresenceUpdate('paused', jid); } catch {}
}

function getStatus(userId) {
  const s = sessions.get(String(userId));
  return s?.status || 'not_initialized';
}

module.exports = { initBaileys, getStatus, sendTypingAndReply, setGlobalLogLevel, getGlobalLogLevel };
