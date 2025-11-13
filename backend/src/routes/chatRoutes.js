import { Router } from 'express';
import auth from '../middleware/auth.js';
import { getHistory, getAnalytics } from '../controllers/chatController.js';

const router = Router();

router.get('/history/:userId', auth, getHistory);
router.get('/analytics/:userId', auth, getAnalytics);

export default router;
