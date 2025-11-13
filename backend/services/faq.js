const FAQ = require('../models/FAQ');

// Simple in-memory cache per user to reduce DB trips
const _faqCache = new Map(); // userId -> { items, loadedAt }
const DEFAULT_TTL_MS = 60_000; // 60s

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jaccard(a, b) {
  const A = new Set(normalize(a).split(' '));
  const B = new Set(normalize(b).split(' '));
  const inter = new Set([...A].filter((x) => B.has(x))).size;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

async function getFAQsFromDB(userId, limit = 500) {
  const items = await FAQ.find({ userId }).limit(limit).lean();
  return Array.isArray(items) ? items : [];
}

async function getFAQsCached(userId, { ttlMs = DEFAULT_TTL_MS, limit = 500 } = {}) {
  const id = String(userId);
  const now = Date.now();
  const cached = _faqCache.get(id);
  if (cached && now - cached.loadedAt < ttlMs) return cached.items;
  const items = await getFAQsFromDB(id, limit);
  _faqCache.set(id, { items, loadedAt: now });
  return items;
}

function invalidateFAQCache(userId) {
  _faqCache.delete(String(userId));
}

async function bestFAQMatch(userId, query, { threshold = 0.42, limit = 1, useCache = true } = {}) {
  try {
    const items = useCache ? await getFAQsCached(userId, { limit: 500 }) : await getFAQsFromDB(userId, 500);
    let best = null;
    let score = 0;
    for (const it of items) {
      const s = jaccard(query, it.question);
      if (s > score) { score = s; best = it; }
    }
    if (best && score >= threshold) return { item: best, score };
    return null;
  } catch (e) {
    return null;
  }
}

async function upsertFAQs(userId, list) {
  if (!Array.isArray(list)) return 0;
  const ops = list
    .filter((x) => x.question && x.answer)
    .slice(0, 1000)
    .map((it) => ({ updateOne: {
      filter: { userId, question: it.question },
      update: { $set: { answer: it.answer } },
      upsert: true,
    }}));
  if (!ops.length) return 0;
  const res = await FAQ.bulkWrite(ops, { ordered: false });
  invalidateFAQCache(userId);
  return (res?.upsertedCount || 0) + (res?.modifiedCount || 0);
}

async function getFAQs(userId, limit = 50) {
  try {
    const FAQ = require('../models/FAQ');
    const items = await FAQ.find({ userId }).limit(limit).lean();
    return items;
  } catch {
    return [];
  }
}

module.exports = { bestFAQMatch, upsertFAQs, normalize, jaccard, getFAQs, getFAQsCached, invalidateFAQCache };
