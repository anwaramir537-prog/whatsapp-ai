import { Router } from 'express';
import auth from '../middleware/auth.js';
import aiService from '../services/aiService.js';
import prisma from '../db.js';

const router = Router();

router.post('/ask', auth, async (req, res) => {
  try {
    const { message, history, faqItems, language, personality, temperature } = req.body;
    
    // Fetch FAQs from database for the user
    let userFaqItems = faqItems || [];
    const userId = req.user?.id || 1; // Fallback to user 1 if auth fails
    console.log(`🔍 AI Chat Request - User: ${userId}, FAQ items passed: ${userFaqItems.length}`);
    
    if (!userFaqItems.length) {
      try {
        const userIdNum = Number(userId);
        console.log(`💾 Fetching FAQs from database for user ${userIdNum}`);
        const faq = await prisma.fAQ.findFirst({ where: { userId: userIdNum } });
        
        if (!faq) {
          console.log(`⚠️ No FAQ record found in database for user ${userIdNum}`);
        } else {
          userFaqItems = faq?.items || [];
          console.log(`✅ Loaded ${userFaqItems.length} FAQ items for user ${userIdNum}`);
          if (userFaqItems.length > 0) {
            console.log(`📚 Sample FAQ: ${userFaqItems[0].question}`);
          }
        }
      } catch (e) {
        console.error('❌ Error fetching FAQs:', e.message);
        console.error('Database connection issue - FAQ will not be available');
      }
    }
    
    const reply = await aiService.generateReply({
      message,
      history: history || [],
      faqItems: userFaqItems,
      language: language || 'auto',
      personality: personality || 'helpful',
      temperature: temperature || 0.6
    });
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
