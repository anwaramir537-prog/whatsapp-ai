import pdfParse from 'pdf-parse';
import fs from 'fs';

function parseTextToQA(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items = [];
  let i = 0;
  while (i < lines.length) {
    let q = lines[i];
    if (/\?$/.test(q) || /^Q[:\-]/i.test(q)) {
      if (/^Q[:\-]/i.test(q)) q = q.replace(/^Q[:\-]\s*/i, '');
      i++;
      const answerLines = [];
      while (i < lines.length && !(/[\?]$/.test(lines[i]) || /^Q[:\-]/i.test(lines[i]))) {
        const l = lines[i];
        if (!/^A[:\-]/i.test(l)) answerLines.push(l);
        else answerLines.push(l.replace(/^A[:\-]\s*/i, ''));
        i++;
      }
      items.push({ question: q, answer: answerLines.join(' ') });
    } else {
      i++;
    }
  }
  return items;
}

async function parseFAQ(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const { text } = await pdfParse(dataBuffer);
  const items = parseTextToQA(text);
  return { items };
}

export default { parseFAQ };
