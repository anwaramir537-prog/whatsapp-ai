const fetch = global.fetch || require('node-fetch');

async function synthesizeTTSAudio(text, opts = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY missing');
  const model = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
  const voice = process.env.OPENAI_TTS_VOICE || 'alloy';
  const format = 'mp3';
  const url = 'https://api.openai.com/v1/audio/speech';

  const body = {
    model,
    voice,
    input: text,
    format,
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let err;
    try { err = await r.json(); } catch {}
    throw new Error(err?.error?.message || r.statusText || 'tts request failed');
  }
  const arrayBuf = await r.arrayBuffer();
  return Buffer.from(arrayBuf);
}

module.exports = { synthesizeTTSAudio };