import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import aiService from '../src/services/aiService.js';

// Load backend/.env regardless of CWD
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const faqItems = [
    { question: 'What are your store timings?', answer: 'We are open Mon–Sat, 10am–8pm.' },
    { question: 'Do you deliver outside city?', answer: 'Yes, we deliver nationwide via courier.' },
    { question: 'Refund policy?', answer: 'You can return items within 7 days with receipt.' },
    { question: 'Company name', answer: 'Noorvia Enterprises' }
  ];

  const tests = [
    { label: 'Roman Urdu', msg: 'bhai delivery charges kya hain? aur kab tak mil jayega' },
    { label: 'English', msg: 'What are your store hours and do you offer returns?' }
  ];

  for (const t of tests) {
    const reply = await aiService.generateReply({
      message: t.msg,
      history: [],
      faqItems,
      language: 'auto',
      personality: 'helpful',
      temperature: 0.7
    });
    console.log(`\n=== ${t.label} Test ===`);
    console.log('Q:', t.msg);
    console.log('A:', reply);
  }
}

run().catch(e => { console.error('Test failed:', e); process.exit(1); });
