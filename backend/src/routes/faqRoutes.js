import express from 'express';
import auth from '../middleware/authMiddleware.js';
import multer from 'multer';
import { uploadFAQ, getFAQs } from '../controllers/faqController.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post('/upload/:userId', auth, upload.single('file'), uploadFAQ);
router.get('/:userId', auth, getFAQs);

export default router;
