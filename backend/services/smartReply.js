const { bestFAQMatch, getFAQs } = require('./faq');
const { askAI } = require('./ai');
const { buildAIPrompt } = require('../utils/prompt');

async function smartReply({ userId, text, history = [], aiEnabled = true, threshold = 0.42 }) {
  // 1) FAQ lookup
  const match = await bestFAQMatch(userId, text, { threshold, useCache: true });
  if (match?.item?.answer) return { source: 'faq', text: match.item.answer, score: match.score };

  // 2) AI fallback (if enabled)
  if (!aiEnabled) {
    return { source: 'manual', text: 'Thanks for your message. Our team will get back to you shortly.' };
  }
  const system = undefined; // we inline instructions in the prompt builder
  const faqItems = await getFAQs(userId, 40);
  const prompt = buildAIPrompt({ userMessage: text, faqItems, history });
  try {
    const ai = await askAI({ prompt, system });
    const txt = typeof ai === 'string' ? ai : ai.text;
    const provider = typeof ai === 'string' ? undefined : ai.provider;
    return { source: 'ai', text: (txt || '').trim() || 'Sorry, I could not find an answer.', provider };
  } catch (e) {
    console.warn('AI provider error:', e?.message || e);
    // Graceful fallback if AI fails or key missing
    return { source: 'manual', text: 'Thanks for your message. Our team will get back to you shortly.' };
  }
}

module.exports = { smartReply };
