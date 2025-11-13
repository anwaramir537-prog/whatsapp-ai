function buildAIPrompt({ userMessage, faqItems = [], history = [] }) {
  const faqText = (faqItems || [])
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join('\n\n');

  const convo = (history || [])
    .slice(-6)
    .map((m) => `${m.role.toUpperCase()}: ${m.content || m.text}`)
    .join('\n');

  return [
    'You are Wrap AI, a helpful WhatsApp assistant.\n' +
      'Instructions:\n' +
      '1) Use the FAQ knowledge base to answer if possible.\n' +
      '2) If there is no matching FAQ, generate a concise and polite answer.\n' +
      '3) Respond in the same language as the user (English or Urdu).\n' +
      '4) Keep answers short and WhatsApp-friendly.\n',
    faqText ? `FAQ Knowledge Base:\n${faqText}` : '',
    convo ? `Conversation:\n${convo}` : '',
    `User Question: ${userMessage}`,
    'Answer:',
  ]
    .filter(Boolean)
    .join('\n\n');
}

module.exports = { buildAIPrompt };
