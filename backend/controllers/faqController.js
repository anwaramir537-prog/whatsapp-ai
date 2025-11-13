const multer = require('multer');
const pdf = require('pdf-parse');
const { upsertFAQs } = require('../services/faq');
const { connectDB } = require('../db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function extractQA(text) {
  const clean = (s) => String(s || '')
    .replace(/[\u00A0\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const lines = text.split(/\r?\n/).map((l) => clean(l));

  // Build paragraphs separated by blank lines
  const paras = [];
  let buf = [];
  for (const l of lines) {
    if (!l) {
      if (buf.length) { paras.push(clean(buf.join(' '))); buf = []; }
    } else {
      buf.push(l);
    }
  }
  if (buf.length) paras.push(clean(buf.join(' ')));

  const res = [];
  const pushPair = (q, a) => {
    const Q = clean(q); const A = clean(a);
    if (Q && A && Q.length > 2 && A.length > 1) res.push({ question: Q, answer: A });
  };

  // Heuristic 1: Explicit Q:/A:
  let q = null; let a = [];
  for (const p of paras) {
    if (/^q(uestion)?\s*[:\-\.]/i.test(p)) {
      if (q && a.length) pushPair(q, a.join(' '));
      q = p.replace(/^q(uestion)?\s*[:\-\.]\s*/i, ''); a = [];
    } else if (/^a(nswer)?\s*[:\-\.]/i.test(p)) {
      a.push(p.replace(/^a(nswer)?\s*[:\-\.]\s*/i, ''));
    } else if (q) {
      a.push(p);
    }
  }
  if (q && a.length) pushPair(q, a.join(' '));

  // Heuristic 2: Paragraph ending with ? followed by next paragraph as answer
  for (let i = 0; i < paras.length - 1; i++) {
    const cur = paras[i];
    const nxt = paras[i + 1];
    if (/[\?\u061F]\s*$/.test(cur)) { // supports Arabic question mark too
      pushPair(cur, nxt);
    }
  }

  // Heuristic 3: Line-based bullets ending with ?
  for (let i = 0; i < lines.length - 1; i++) {
    const cur = lines[i];
    const nxt = lines[i + 1];
    if (/^(?:[-•\u2022]\s*)?.+\?$/.test(cur) && nxt) {
      pushPair(cur.replace(/^[-•\u2022]\s*/, ''), nxt);
    }
  }

  // Deduplicate by normalized question
  const seen = new Set();
  const out = [];
  for (const it of res) {
    const key = it.question.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(it); }
  }
  return out.slice(0, 1000);
}

exports.uploadMiddleware = upload.single('file');

exports.uploadFAQ = async (req, res) => {
  try {
    await connectDB();
    const userId = String(req.params.userId);
    if (req.user?.id !== userId) return res.status(403).json({ error: 'forbidden' });
    if (!req.file) return res.status(400).json({ error: 'file required' });

    const name = (req.file.originalname || '').toLowerCase();
    let items = [];

    if (name.endsWith('.pdf')) {
      const data = await pdf(req.file.buffer);
      items = extractQA(data.text).slice(0, 1000);
    } else if (name.endsWith('.txt')) {
      const text = req.file.buffer.toString('utf8');
      items = extractQA(text).slice(0, 1000);
    } else if (name.endsWith('.json')) {
      try {
        const parsed = JSON.parse(req.file.buffer.toString('utf8'));
        if (Array.isArray(parsed)) {
          items = parsed
            .filter(x => x && typeof x.question === 'string' && typeof x.answer === 'string')
            .map(x => ({ question: x.question.trim(), answer: x.answer.trim() }))
            .slice(0, 1000);
        } else if (parsed && typeof parsed === 'object') {
          items = Object.entries(parsed)
            .filter(([q, a]) => typeof q === 'string' && typeof a === 'string')
            .map(([q, a]) => ({ question: q.trim(), answer: a.trim() }))
            .slice(0, 1000);
        }
      } catch {}
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload .pdf, .txt, or .json' });
    }

    // Default behavior: replace existing FAQs on PDF upload unless ?merge=1 is passed
    const merge = (req.query?.merge === '1') || (req.query?.merge === 'true');
    if (!merge) {
      const FAQ = require('../models/FAQ');
      await FAQ.deleteMany({ userId });
    }

    const count = await upsertFAQs(userId, items);
    res.json({ ok: true, mode: merge ? 'merge' : 'replace', inserted: count });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'upload failed' });
  }
};

exports.listFAQ = async (req, res) => {
  try {
    await connectDB();
    const FAQ = require('../models/FAQ');
    const userId = String(req.params.userId);
    if (req.user?.id !== userId) return res.status(403).json({ error: 'forbidden' });
    const items = await FAQ.find({ userId }).limit(500).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'list failed' });
  }
};

function parseCSV(buf) {
  try {
    const text = buf.toString('utf8');
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const qi = header.findIndex(h => h === 'question' || h === 'q');
    const ai = header.findIndex(h => h === 'answer' || h === 'a');
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const q = (cols[qi] || '').trim();
      const a = (cols[ai] || '').trim();
      if (q && a) rows.push({ question: q, answer: a });
    }
    return rows;
  } catch {
    return [];
  }
}

exports.importFAQCSV = async (req, res) => {
  try {
    await connectDB();
    const userId = String(req.params.userId);
    if (req.user?.id !== userId) return res.status(403).json({ error: 'forbidden' });
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const name = (req.file.originalname || '').toLowerCase();
    if (!name.endsWith('.csv')) return res.status(400).json({ error: 'please upload a .csv file with Question,Answer columns' });
    const items = parseCSV(req.file.buffer).slice(0, 2000);

    // Default behavior: replace existing FAQs on CSV import unless ?merge=1 is passed
    const merge = (req.query?.merge === '1') || (req.query?.merge === 'true');
    if (!merge) {
      const FAQ = require('../models/FAQ');
      await FAQ.deleteMany({ userId });
    }

    const count = await upsertFAQs(userId, items);
    res.json({ ok: true, mode: merge ? 'merge' : 'replace', inserted: count });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'csv import failed' });
  }
};

exports.createFAQ = async (req, res) => {
  try {
    await connectDB();
    const userId = String(req.params.userId);
    if (req.user?.id !== userId) return res.status(403).json({ error: 'forbidden' });
    const { question, answer } = req.body || {};
    if (!question || !answer) return res.status(400).json({ error: 'question and answer required' });
    const FAQ = require('../models/FAQ');
    const doc = await FAQ.create({ userId, question, answer });
    res.json({ ok: true, item: { id: doc._id.toString(), question: doc.question, answer: doc.answer } });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'create failed' });
  }
};

exports.updateFAQ = async (req, res) => {
  try {
    await connectDB();
    const userId = String(req.params.userId);
    if (req.user?.id !== userId) return res.status(403).json({ error: 'forbidden' });
    const id = String(req.params.id);
    const { question, answer } = req.body || {};
    const FAQ = require('../models/FAQ');
    const doc = await FAQ.findOneAndUpdate({ _id: id, userId }, { $set: { question, answer } }, { new: true });
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true, item: { id: doc._id.toString(), question: doc.question, answer: doc.answer } });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'update failed' });
  }
};

exports.deleteFAQ = async (req, res) => {
  try {
    await connectDB();
    const userId = String(req.params.userId);
    if (req.user?.id !== userId) return res.status(403).json({ error: 'forbidden' });
    const id = String(req.params.id);
    const FAQ = require('../models/FAQ');
    await FAQ.deleteOne({ _id: id, userId });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'delete failed' });
  }
};
