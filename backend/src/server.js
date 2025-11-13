import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import faqRoutes from "./routes/faqRoutes.js";
import prisma from "./db.js";

dotenv.config();

// Prevent crash on Windows file-lock during WA logout
process.on('uncaughtException', (err) => {
  const msg = String(err?.message || err || '');
  if (msg.includes('EBUSY') && msg.includes('first_party_sets.db')) {
    console.warn('Ignoring EBUSY during WA logout:', msg);
    return;
  }
  if (msg.includes('Execution context was destroyed') || msg.includes('Protocol error (Runtime.callFunctionOn): Session closed')) {
    console.warn('Ignoring transient Puppeteer context error:', msg);
    return;
  }
  console.error('Uncaught exception:', err);
});

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/faq", faqRoutes);
app.get("/", (req, res) => res.send("🚀 WhatsApp AI Backend Running"));

const PORT = process.env.PORT || 5000;

// Start server first, then try database connection
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Auto-load of WhatsApp sessions disabled by request. Use /api/whatsapp/connect/:userId to start a session manually.
});

prisma
  .$connect()
  .then(() => {
    console.log("✅ Connected to Neon PostgreSQL");
  })
  .catch((err) => {
    console.error("❌ Database connection error:", err.message);
    console.log("⚠️ Server running without database. Some features may not work.");
  });
