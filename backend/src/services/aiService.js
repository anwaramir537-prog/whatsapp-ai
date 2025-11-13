function detectLanguage(text) {
  // 1) If Arabic/Urdu script present -> Urdu
  if (/[\u0600-\u06FF]/.test(text)) return 'ur';
  // 2) Simple roman-Urdu/Hinglish heuristic based on common tokens
  const t = (text || '').toLowerCase();
  const romanUrduHints = [
    'kya', 'kyun', 'kyu', 'kr', 'kar', 'ker', 'hai', 'hun', 'hain', 'ap', 'aap', 'hum',
    'nahi', 'nai', 'nahin', 'krdo', 'krden', 'bhai', 'plz', 'please', 'sir', 'jani', 'janab'
  ];
  const hintHit = romanUrduHints.some(w => t.includes(w));
  if (hintHit) return 'ur';
  return 'en';
}

function tokenize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function jaccardSim(a, b) {
  const A = new Set(a), B = new Set(b);
  const inter = new Set([...A].filter(x => B.has(x))).size;
  const uni = new Set([...A, ...B]).size || 1;
  return inter / uni;
}

function selectRelevantFAQs(message, faqItems, k = 20) {
  if (!Array.isArray(faqItems) || faqItems.length === 0) return [];
  const mtoks = tokenize(message);
  const scored = faqItems.map((it, idx) => {
    const qt = tokenize(it.question);
    const at = tokenize(it.answer);
    const score = Math.max(jaccardSim(mtoks, qt), jaccardSim(mtoks, at));
    return { it, idx, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s, i) => ({ rank: i + 1, ...s }));
}

function buildPrompt({ message, history = [], faqItems = [], language = 'auto', personality = 'helpful', temperature }) {
  const lang = language === 'auto' ? detectLanguage(message) : language;

  const top = selectRelevantFAQs(message, faqItems, Number(process.env.FAQ_TOP_K || 20));
  const faqContext = (top.length ? top : faqItems.slice(0, 50))
    .map((entry, idx) => {
      const it = entry.it || entry; // support both structures
      return `${idx + 1}. Q: ${it.question}\nA: ${it.answer}`;
    })
    .join('\n\n');

  const historyText = history.slice(-10).map(m => `${m.role === 'user' ? 'User' : 'Bot'}: ${m.text}`).join('\n');
  
  // Try to extract company name from FAQ
  let companyName = 'our company';
  if (faqItems.length > 0) {
    const faqText = faqItems.map(f => f.question + ' ' + f.answer).join(' ');
    const match = faqText.match(/(?:company|business|organization|firm)\s+(?:is|called|named)?\s*([A-Z][a-zA-Z\s&]+(?:Enterprise|Enterprises|Ltd|Inc|LLC|Corporation|Corp|Company|Co|Industries)?)/i);
    if (match) companyName = match[1].trim();
    // Also check for direct mentions
    const directMatch = faqText.match(/\b(Noorvia|Norvia)\s*Enterprise[s]?\b/i);
    if (directMatch) companyName = directMatch[0];
  }
  
  const userHasUrduScript = /[\u0600-\u06FF]/.test(message || '');
  const replyDialect = (lang === 'ur') ? (userHasUrduScript ? 'Urdu (Arabic script)' : 'Roman Urdu') : 'English';

  let sys = `You are a ${personality} customer support AI assistant for ${companyName}. Speak like a real human: friendly, natural, and concise. Answer in ${replyDialect}.`;
  sys += `\nStyle guidelines:`
    + `\n- Keep sentences short and simple; use everyday words and contractions (I'm, don't).`
    + `\n- Answer directly first, then (only if helpful) add one short follow-up question.`
    + `\n- If unsure, ask a brief clarifying question instead of guessing.`
    + `\n- Avoid being overly formal or repetitive; avoid policy/system talk.`
    + `\n- If Urdu is needed but the user typed in Latin script, reply in Roman Urdu (Latin letters).`
    + `\n- Do not use emojis unless the user uses them first.`;
  
  let user;
  if (faqContext && faqContext.trim()) {
    sys += ` You have access to the company's FAQ knowledge base. Use this information to provide accurate, helpful answers. When asked about the company or yourself, mention that you represent ${companyName}. If the answer is not present, ask a brief clarifying question instead of guessing.`;
    user = `=== KNOWLEDGE BASE (FAQ) ===\n${faqContext}\n\n=== CONVERSATION HISTORY ===\n${historyText || 'No previous messages'}\n\n=== CURRENT QUESTION ===\n${message}\n\nAnswer based on the knowledge base above. Be specific and helpful.`;
  } else {
    user = `Conversation history:\n${historyText || 'No previous messages'}\n\nUser: ${message}`;
  }
  
  // Debug log
  if (faqItems.length > 0) {
    console.log(`🧠 Building prompt with ${faqItems.length} FAQ items (selected: ${top.length})`);
  } else {
    console.log('⚠️ Building prompt WITHOUT FAQ context');
  }
  
  return { sys, user, lang, temperature: Number(process.env.AI_TEMPERATURE || temperature || 0.7) };
}

async function callGemini({ sys, user, model }) {
  const hasFetch = typeof fetch === 'function';
  if (!hasFetch) throw new Error('fetch is not available in this Node version');
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY missing');
  // Use v1beta for latest models, v1 for stable models like gemini-pro
  const apiVersion = model.includes('1.5') ? 'v1beta' : 'v1';
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${key}`;
  const body = {
    contents: [
      { role: 'user', parts: [{ text: `${sys}\n\n${user}` }] }
    ],
    generationConfig: { temperature: Number(process.env.AI_TEMPERATURE || 0.6) }
  };
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!resp.ok) {
    const errorData = await resp.text();
    console.error('Gemini API error:', resp.status, errorData);
    throw new Error(`Gemini API error: ${resp.status}`);
  }
  const data = await resp.json();
  console.log('Gemini response:', JSON.stringify(data).substring(0, 200));
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callDeepSeek({ sys, user, model }) {
  const hasFetch = typeof fetch === 'function';
  if (!hasFetch) throw new Error('fetch is not available in this Node version');
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY missing');
  const url = 'https://api.deepseek.com/chat/completions';
  const body = { model, messages: [ { role: 'system', content: sys }, { role: 'user', content: user } ], temperature: Number(process.env.AI_TEMPERATURE || 0.6) };
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify(body) });
  if (!resp.ok) throw new Error('DeepSeek API error');
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callOpenRouter({ sys, user, model }) {
  const hasFetch = typeof fetch === 'function';
  if (!hasFetch) throw new Error('fetch is not available in this Node version');
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY missing');
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const body = { model, messages: [ { role: 'system', content: sys }, { role: 'user', content: user } ], temperature: Number(process.env.AI_TEMPERATURE || 0.6) };
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`
  };
  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!resp.ok) throw new Error('OpenRouter API error');
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callMeituan({ sys, user, model }) {
  const hasFetch = typeof fetch === 'function';
  if (!hasFetch) throw new Error('fetch is not available in this Node version');
  const key = process.env.MEITUAN_API_KEY;
  if (!key) throw new Error('MEITUAN_API_KEY missing');
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const body = { model, messages: [ { role: 'system', content: sys }, { role: 'user', content: user } ], temperature: Number(process.env.AI_TEMPERATURE || 0.6) };
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`
  };
  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!resp.ok) {
    const errorData = await resp.text();
    console.error('Meituan API error:', resp.status, errorData);
    throw new Error(`Meituan API error: ${resp.status}`);
  }
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callGroq({ sys, user, model }) {
  const hasFetch = typeof fetch === 'function';
  if (!hasFetch) throw new Error('fetch is not available in this Node version');
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY missing');
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const body = { model, messages: [ { role: 'system', content: sys }, { role: 'user', content: user } ], temperature: Number(process.env.AI_TEMPERATURE || 0.7) };
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`
  };
  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!resp.ok) {
    const errorData = await resp.text();
    console.error('Groq API error:', resp.status, errorData);
    throw new Error(`Groq API error: ${resp.status}`);
  }
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || '';
}

function fallbackFromFAQ(message, faqItems, lang = 'en') {
  const top = selectRelevantFAQs(message, faqItems, 1);
  if (top.length && top[0].score > 0) {
    return (lang === 'ur')
      ? `آپ کے سوال کے مطابق: ${top[0].it.answer}`
      : `Based on your question: ${top[0].it.answer}`;
  }
  return (lang === 'ur')
    ? 'معذرت، مجھے یقینی جواب نہیں ملا۔ براہِ کرم مزید وضاحت کریں۔'
    : "Sorry, I couldn't find an exact answer. Could you clarify your question?";
}

async function generateReply({ message, history, faqItems, language, personality, temperature }) {
  const { sys, user, lang } = buildPrompt({ message, history, faqItems, language, personality, temperature });
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

  const tryOrder = (() => {
    switch (provider) {
      case 'deepseek': return ['deepseek', 'gemini', 'groq', 'openrouter', 'meituan'];
      case 'groq': return ['groq', 'gemini', 'deepseek', 'openrouter', 'meituan'];
      case 'openrouter': return ['openrouter', 'gemini', 'deepseek', 'groq', 'meituan'];
      case 'meituan': return ['meituan', 'gemini', 'deepseek', 'groq', 'openrouter'];
      default: return ['gemini', 'groq', 'deepseek', 'openrouter', 'meituan'];
    }
  })();

  for (const p of tryOrder) {
    try {
      let out = '';
      if (p === 'gemini') out = await callGemini({ sys, user, model: process.env.AI_MODEL_GEMINI || 'gemini-1.5-flash-8b' });
      if (p === 'deepseek') out = await callDeepSeek({ sys, user, model: process.env.AI_MODEL_DEEPSEEK || 'deepseek-chat' });
      if (p === 'openrouter') out = await callOpenRouter({ sys, user, model: process.env.AI_MODEL_OPENROUTER || 'deepseek/deepseek-chat' });
      if (p === 'meituan') out = await callMeituan({ sys, user, model: process.env.AI_MODEL_MEITUAN || 'deepseek/deepseek-chat' });
      if (p === 'groq') out = await callGroq({ sys, user, model: process.env.AI_MODEL_GROQ || 'llama-3.3-70b-versatile' });
      if (typeof out === 'string' && out.trim()) return out.trim();
    } catch (e) {
      console.error(`Provider ${p} failed:`, e.message);
      continue;
    }
  }

  // Final fallback: best-effort answer from FAQs
  return fallbackFromFAQ(message, faqItems, lang);
}

export default { generateReply, detectLanguage };
