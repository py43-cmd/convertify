import express from 'express';
import { docxSingleUpload, pdfMergeUpload, pdfSingleUpload, cleanupTempDir } from '../middlewares/upload.js';
import { requireAuth } from '../middlewares/auth.js';
import { mergePdfs, wordToPdf, pdfToWord } from '../controllers/documentController.js';

const router = express.Router();

router.post(
    '/merge',
    cleanupTempDir,
    requireAuth,
    pdfMergeUpload,
    mergePdfs
);
router.post(
    '/word-to-pdf',
    cleanupTempDir,
    requireAuth,
    docxSingleUpload,
    wordToPdf
);
router.post(
    '/pdf-to-word',
    cleanupTempDir,
    requireAuth,
    pdfSingleUpload,
    pdfToWord
);

export default router;
