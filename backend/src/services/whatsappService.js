import qrcodeTerm from "qrcode-terminal";
import QRCode from 'qrcode';
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer';
import aiService from './aiService.js';
import prisma from '../db.js';

const sessions = {};

// Small helper to wait
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Typing indicator controls (safe defaults OFF)
const TYPING_ENABLED = String(process.env.WA_TYPING_ENABLED || 'false').toLowerCase() === 'true';
const TYPING_KEEPALIVE_MS = Number(process.env.WA_TYPING_KEEPALIVE_MS || 0); // 0 = no keepalive

// Auto-load existing sessions on server start
export const loadExistingSessions = async () => {
  try {
    const dataPath = process.env.SESSION_PATH || path.resolve(process.cwd(), 'sessions');
    if (!fs.existsSync(dataPath)) return;
    
    const sessionDirs = fs.readdirSync(dataPath).filter(f => f.startsWith('session-') && fs.statSync(path.join(dataPath, f)).isDirectory());
    console.log(`Found ${sessionDirs.length} existing WhatsApp sessions`);
    
    for (const dir of sessionDirs) {
      const clientKey = dir.replace('session-', ''); // could be '1' or '1-abcdef'
      const base = clientKey.match(/^(\d+)/)?.[1];
      if (!base) {
        console.log(`Skipping invalid session folder (no numeric prefix): ${dir}`);
        continue;
      }
      const userId = base;
      if (!sessions[userId]) {
        console.log(`Auto-loading WhatsApp session for user ${userId} (clientId=${clientKey})`);
        try {
          await startSession(userId, clientKey);
        } catch (e) {
          console.error(`Failed to load session for user ${userId}:`, e.message);
        }
      }
    }
  } catch (e) {
    console.error('Error loading existing sessions:', e.message);
  }
};

function resolveChromePath() {
  const envPath = process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;
  const pf = process.env.PROGRAMFILES;
  const pfx86 = process.env['PROGRAMFILES(X86)'];
  const local = process.env.LOCALAPPDATA;
  const candidates = [
    ...(pf ? [
      `${pf}\\Google\\Chrome\\Application\\chrome.exe`,
      `${pf}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${pf}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    ] : []),
    ...(pfx86 ? [
      `${pfx86}\\Google\\Chrome\\Application\\chrome.exe`,
      `${pfx86}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ] : []),
    ...(local ? [
      `${local}\\Google\\Chrome\\Application\\chrome.exe`,
      `${local}\\Microsoft\\Edge\\Edge\\Application\\msedge.exe`,
      `${local}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ] : []),
    // Hardcoded fallbacks
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const p of candidates) { try { if (fs.existsSync(p)) return p; } catch {} }
  // Fall back to Puppeteer's managed browser (downloaded via puppeteer browsers install)
  try { return puppeteer.executablePath(); } catch { return undefined; }
}

export const startSession = async (userId, clientKey) => {
  return new Promise((resolve, reject) => {
    // Idempotent: if a client already exists and is ready, return null
    const existing = sessions[userId];
    if (existing) {
      if (existing.info) {
        return resolve(null); // Already connected
      }
      // If exists but not ready, let it continue initializing
      return resolve(null);
    }

    const dataPath = process.env.SESSION_PATH || path.resolve(process.cwd(), 'sessions');
    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });

    const headless = process.env.HEADLESS === 'false' ? false : 'new';
    const exe = resolveChromePath();

    // Configure WA Web version/cache:
    // - If WA_WEB_REMOTE_PATH is provided, use remote cache (requires valid remote HTML path)
    // - Otherwise, use local cache under sessions/.wwebjs_cache (avoids remote errors)
    const cacheDir = path.join(dataPath, '.wwebjs_cache');
    try { if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true }); } catch {}
    const webCache = process.env.WA_WEB_REMOTE_PATH
      ? { type: 'remote', remotePath: process.env.WA_WEB_REMOTE_PATH }
      : { type: 'local', path: cacheDir };

    const cid = String(clientKey || userId);
    console.log('Launching WhatsApp client', { userId, clientId: cid, headless, executablePath: exe });
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: cid, dataPath }),
      takeoverOnConflict: true,
      takeoverTimeoutMs: 0,
      webVersion: process.env.WA_WEB_VERSION || undefined,
      webVersionCache: webCache,
      puppeteer: {
        headless,
        executablePath: exe,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--window-size=1920,1080',
          '--disable-features=FirstPartySets,IsolateOrigins,site-per-process,OptimizationHints,OptimizationTargetPrediction',
          '--disable-component-update'
        ]
      },
      qrMaxRetries: 24,
      authTimeoutMs: 180000
    });
    // Attach clientId for cleanup on logout
    client.__clientKey = cid;

    sessions[userId] = client;

    const timeout = setTimeout(() => {
      // Do NOT destroy session on QR timeout; keep it alive so user can scan later
      console.warn('⏳ QR not scanned within timeout; session kept alive. Scan from console or call /api/whatsapp/connect/:userId');
      try { if (sessions[userId]) { /* keep client running */ } } catch {}
      resolve(null);
    }, Number(process.env.WA_QR_TIMEOUT_MS || 600000));

    client.on("qr", async (qr) => {
      try {
        console.log("📱 Scan this QR to connect WhatsApp");
        qrcodeTerm.generate(qr, { small: true });
        const dataUrl = await QRCode.toDataURL(qr);
        clearTimeout(timeout);
        resolve(dataUrl);
      } catch (e) {
        clearTimeout(timeout);
        resolve(qr); // fallback raw string
      }
    });

    client.on("ready", () => { console.log("✅ WhatsApp Connected"); clearTimeout(timeout); });
    client.on("loading_screen", (percent, msg) => { console.log(`⏳ Loading: ${percent}% ${msg || ''}`); });
    client.on("change_state", (state) => { console.log('ℹ️ State changed:', state); });
    client.on("auth_failure", async (msg) => {
      clearTimeout(timeout);
      console.error('❌ Auth failure:', msg);
      // Force reset this session on auth failure so user can re-scan cleanly
      try {
        await client.destroy();
      } catch {}
      delete sessions[userId];
      return reject(new Error(msg));
    });
    client.on("disconnected", async (reason) => {
      console.log('⚠️ WA disconnected:', reason);
      const isLogout = String(reason || '').toLowerCase().includes('logout');
      if (isLogout) {
        try {
          await delay(500);
          try { await client.destroy(); } catch {}
          delete sessions[userId];
          const dataPath = process.env.SESSION_PATH || path.resolve(process.cwd(), 'sessions');
          const currentCid = client.__clientKey || String(userId);
          const sessionDir = path.join(dataPath, `session-${currentCid}`);
          try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (e) {
            console.warn('rm session failed:', e.message);
          }
          // Rotate to a fresh clientId to bypass locked folders
          const newCid = `${String(userId)}-${Date.now().toString(36)}`;
          console.warn(`🔄 Rotating to fresh session clientId=${newCid} after LOGOUT`);
          startSession(userId, newCid).catch(e => console.error('Recreate after logout failed:', e.message));
          return;
        } catch (e) {
          console.error('Logout rotation failed:', e.message);
          return;
        }
      }
      // Non-logout: try graceful re-init using existing session data after a short delay
      try { await delay(2000); await client.initialize(); } catch (e) { console.error('Re-init failed:', e.message); }
    });
    client.on("error", (err) => { console.error('WA error:', err); });
    
    // Auto-reply to customer messages with AI + FAQ
    client.on("message", async (message) => {
      let typingInterval; let keepTyping = false; let chat;
      try {
        // Skip groups, self, newsletters, status broadcast
        if (message.from.includes('@g.us')) { console.log('↩️ Skip group message'); return; }
        if (message.fromMe) { console.log('↩️ Skip own message'); return; }
        if (message.from.endsWith('@newsletter') || message.from === 'status@broadcast') { console.log('↩️ Skip newsletter/status'); return; }
        
        const customerMessage = message.body;
        if (!customerMessage || !customerMessage.trim()) { console.log('↩️ Skip empty message'); return; }
        
        console.log(`📩 Customer message from ${message.from}: ${customerMessage}`);
        
        // Get chat and (optionally) show typing
        try {
          chat = await message.getChat();
          console.log('💬 Chat info:', { isGroup: chat?.isGroup, id: chat?.id?._serialized });
          if (TYPING_ENABLED) {
            keepTyping = true;
            try { await chat.sendStateTyping(); console.log('⌨️ typing: ping'); } catch {}
            if (TYPING_KEEPALIVE_MS > 0) {
              typingInterval = setInterval(async () => {
                try { if (keepTyping) { await chat.sendStateTyping(); console.log('⌨️ typing: ping'); } } catch {}
              }, TYPING_KEEPALIVE_MS);
            }
          }
        } catch (e) { console.warn('⚠️ Could not get chat for typing state:', e?.message); }
        
        // Fetch user's FAQs
        let faqItems = [];
        try {
          const userIdNum = Number(userId);
          if (!isNaN(userIdNum)) {
            const faq = await prisma.fAQ.findFirst({ where: { userId: userIdNum } });
            faqItems = faq?.items || [];
            console.log(`📚 Loaded ${faqItems.length} FAQ items for WhatsApp auto-reply`);
            if (faqItems.length > 0) {
              console.log(`📄 Using FAQ context for AI response`);
            }
          }
        } catch (e) {
          console.error('❌ Error loading FAQs:', e.message);
        }
        
        // Generate AI response using FAQ (typing continues while we think)
        const reply = await aiService.generateReply({
          message: customerMessage,
          history: [],
          faqItems,
          language: 'auto',
          personality: 'helpful',
          temperature: 0.7
        });
        console.log('📝 Reply prepared, length:', reply?.length || 0);
        
        // Human-like delay (only if typing enabled). Safer, short cap to avoid long holds
        if (TYPING_ENABLED) {
          const typingMs = Math.max(500, Math.min(1500, (reply?.length || 60) * 10));
          await delay(typingMs);
        }
        
        // Stop typing indicator before sending
        keepTyping = false;
        if (typingInterval) clearInterval(typingInterval);
        if (TYPING_ENABLED) {
          try { if (chat) await chat.sendStatePaused(); } catch { try { if (chat) await chat.clearState?.(); } catch {} }
        }
        
        // Send reply back to customer (use chat to avoid context issues)
        try {
          if (!chat) chat = await message.getChat();
          if (chat?.sendSeen) { try { await chat.sendSeen(); } catch {} }
          await chat.sendMessage(reply);
          console.log(`✅ Auto-replied via chat.sendMessage to ${message.from}`);
        } catch (e1) {
          console.warn('⚠️ chat.sendMessage failed, falling back to message.reply:', e1?.message);
          try {
            await message.reply(reply);
            console.log(`✅ Auto-replied via message.reply to ${message.from}`);
          } catch (e2) {
            console.error('❌ Failed to send reply via both methods:', e2?.message);
          }
        }
        
      } catch (err) {
        console.error('❌ Error handling message:', err.message);
      } finally {
        keepTyping = false;
        if (typingInterval) clearInterval(typingInterval);
        try { if (chat) await chat.sendStatePaused(); } catch {}
      }
    });

    client.initialize().catch((e)=>{ clearTimeout(timeout); reject(e); });
  });
};

export const getClientStatus = async (userId) => {
  const client = sessions[userId];
  if (!client) return "not_connected";
  return client.info ? "connected" : "loading";
};

export const resetSession = async (userId) => {
  try {
    const client = sessions[userId];
    if (client) {
      try { await client.destroy(); } catch {}
      delete sessions[userId];
    }
    const dataPath = process.env.SESSION_PATH || path.resolve(process.cwd(), 'sessions');
    const sessionDir = path.join(dataPath, `session-${String(userId)}`);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
    return true;
  } catch (e) {
    throw new Error('Reset failed');
  }
};
