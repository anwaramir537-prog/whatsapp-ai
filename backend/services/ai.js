const fetch = global.fetch || require('node-fetch');

async function askAI({ provider = process.env.AI_PROVIDER || 'gemini', prompt, system }) {
  if (!prompt) throw new Error('prompt required');
  const order = buildProviderOrder(provider);
  let lastErr;
  for (const p of order) {
    try {
      if (p === 'groq') return await groq(prompt, system);
      if (p === 'gemini') return await gemini(prompt, system);
      if (p === 'deepseek') return await deepseek(prompt, system);
    } catch (e) { lastErr = e; }
  }
  if (lastErr) throw lastErr;
  throw new Error('no provider available');
}

function buildProviderOrder(preferred) {
  const have = {
    groq: !!process.env.GROQ_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
  };
  const base = ['groq','gemini','deepseek'];
  const ordered = [preferred, ...base.filter(p => p !== preferred)];
  return ordered.filter(p => have[p]);
}

async function gemini(prompt, system) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.AI_MODEL_GEMINI || 'gemini-1.5-flash';
  if (!key) throw new Error('GEMINI_API_KEY missing');
  const body = {
    contents: [{ parts: [{ text: [system, prompt].filter(Boolean).join('\n\n') }]}]
  };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || r.statusText || 'gemini request failed');
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text.trim()) throw new Error('gemini empty');
  return text.trim();
}

async function deepseek(prompt, system) {
  const key = process.env.DEEPSEEK_API_KEY;
  const model = process.env.AI_MODEL_DEEPSEEK || 'deepseek-chat';
  if (!key) throw new Error('DEEPSEEK_API_KEY missing');
  const body = {
    model,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: prompt }
    ],
    temperature: Number(process.env.AI_TEMPERATURE || 0.7),
  };
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || r.statusText || 'deepseek request failed');
  const text = j?.choices?.[0]?.message?.content || '';
  if (!text.trim()) throw new Error('deepseek empty');
  return text.trim();
}

async function groq(prompt, system) {
  const key = process.env.GROQ_API_KEY;
  const model = process.env.AI_MODEL_GROQ || 'llama-3.3-70b-versatile';
  if (!key) throw new Error('GROQ_API_KEY missing');
  const body = {
    model,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: prompt }
    ],
    temperature: Number(process.env.AI_TEMPERATURE || 0.7),
  };
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || r.statusText || 'groq request failed');
  const text = j?.choices?.[0]?.message?.content || '';
  if (!text.trim()) throw new Error('groq empty');
  return text.trim();
}

module.exports = { askAI };
