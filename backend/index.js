require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const { Server } = require('socket.io');
const { connectWhatsApp, getStatus, resetWhatsApp, sendMessage } = require('./controllers/whatsappBaileysController');
const { uploadMiddleware, uploadFAQ, listFAQ, importFAQCSV, createFAQ, updateFAQ, deleteFAQ } = require('./controllers/faqController');
const { register, login } = require('./controllers/authController');
const { socketAuth } = require('./middleware/auth');
const authMiddleware = require('./middleware/authMiddleware');
const { history, analytics } = require('./controllers/chatController');
const { getSettings, updateSettings } = require('./controllers/settingsController');
const { getLogLevel, setLogLevel } = require('./controllers/configController');
const { ask } = require('./controllers/aiController');
const { connectDB } = require('./db');

const app = express();

// Disable ETag to prevent 304 noise on GET endpoints
app.set('etag', false);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// Health
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/', (_req, res) => res.send('🚀 WhatsApp Backend (Baileys) running'));

// Auth
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);

// Protected routes
// Note: connect endpoint is intentionally UNPROTECTED unless your UI always passes a token

// WhatsApp routes (Baileys)
app.post('/api/whatsapp/connect/:userId', connectWhatsApp);
app.get('/api/whatsapp/status/:userId', authMiddleware, getStatus);
app.post('/api/whatsapp/reset/:userId', authMiddleware, resetWhatsApp);
app.post('/api/whatsapp/send/:userId', authMiddleware, sendMessage);

// FAQ routes
app.post('/api/faq/upload/:userId', authMiddleware, uploadMiddleware, uploadFAQ);
app.post('/api/faq/import/csv/:userId', authMiddleware, uploadMiddleware, importFAQCSV);
app.get('/api/faq/:userId', authMiddleware, listFAQ);
app.post('/api/faq/:userId', authMiddleware, createFAQ);
app.put('/api/faq/:userId/:id', authMiddleware, updateFAQ);
app.delete('/api/faq/:userId/:id', authMiddleware, deleteFAQ);

// Chat routes
app.get('/api/chat/history/:userId', authMiddleware, history);
app.get('/api/chat/analytics/:userId', authMiddleware, analytics);

// Settings routes
app.get('/api/settings/:userId', authMiddleware, getSettings);
app.put('/api/settings/:userId', authMiddleware, updateSettings);

// AI routes
app.post('/api/ai/ask/:userId', authMiddleware, ask);

// Config routes (protected)
app.use('/api/config', authMiddleware);
app.get('/api/config/log-level', getLogLevel);
app.post('/api/config/log-level', setLogLevel);
const PORT = Number(process.env.PORT || 8100);
const HOST = process.env.HOST || '::';
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || '*', credentials: true }
});
app.set('io', io);

// Root namespace with JWT auth
io.use(socketAuth);
io.on('connection', (socket) => {
  const userId = socket.data.user?.id;
  if (userId) socket.join(userId);
  socket.emit('connected', { ok: true, userId });
});

// Multi-tenant namespaces: /tenant/<any>
const tenant = io.of(/^\/tenant\/\w+$/);
tenant.use(socketAuth);
tenant.on('connection', (socket) => {
  const userId = socket.data.user?.id;
  if (userId) socket.join(userId);
  socket.emit('connected', { ok: true, userId, ns: socket.nsp.name });
});

// Global guard
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

server.listen(PORT, HOST, async () => {
  await connectDB();
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log('Use /api/whatsapp/connect/:userId then listen for io events: wa:qr, wa:status, wa:incoming');
});
