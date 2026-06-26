import express from 'express';
import { upload } from '../middlewares/upload.js';
import { requireAuth } from '../middlewares/auth.js';
import { mergePdfs, wordToPdf, pdfToWord } from '../controllers/documentController.js';

const router = express.Router();

router.post('/merge', requireAuth, upload.array('files'), mergePdfs);
router.post('/word-to-pdf', requireAuth, upload.single('file'), wordToPdf);
router.post('/pdf-to-word', requireAuth, upload.single('file'), pdfToWord);

export default router;
