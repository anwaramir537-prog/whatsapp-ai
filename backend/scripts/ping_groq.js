import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load backend/.env regardless of CWD
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ key: MISSING');
      process.exit(1);
    }
    const resp = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }
    });
    console.log('HTTP status:', resp.status);
    const data = await resp.json().catch(() => ({}));
    const count = Array.isArray(data.data) ? data.data.length : 0;
    const first = count ? data.data[0].id : 'n/a';
    console.log('Models:', count, 'First:', first);
  } catch (e) {
    console.error('Ping failed:', e.message);
    process.exit(2);
  }
}
main();
