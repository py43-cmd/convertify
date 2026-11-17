import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { PDFDocument } from 'pdf-lib';
import Conversion from '../models/Conversion.js';
import { AppError } from '../utils/errors.js';
import {
    CONVERSION_DIRECTIONS,
    documentConversionService,
    loadPdf,
    buildDownloadName,
} from '../services/documentConversionService.js';

const MAX_LOGGED_NAME_LENGTH = 500;

const logConversion = async ({ originalName, type, status, size = null, userId = null, ipAddress = null }) => {
    // Conversion history is best-effort: never fail a request because the
    // database is unavailable or disconnected.
    if (mongoose.connection.readyState !== 1) return;
    try {
        await Conversion.create({
            originalName: String(originalName || 'unknown').slice(0, MAX_LOGGED_NAME_LENGTH),
            conversionType: type,
            status,
            fileSize: size,
            userId: userId || undefined,
            ipAddress: ipAddress || undefined,
        });
    } catch (error) {
        console.warn(`Could not record conversion history: ${error.message}`);
    }
};

const sendAttachment = (res, next, { outputPath, downloadName, mimeType }) => {
    res.setHeader('Cache-Control', 'no-store');
    res.type(mimeType);
    res.download(outputPath, downloadName, (error) => {
        if (error && !res.headersSent) return next(error);
    });
};

const describeFiles = (files) =>
    files.map((file) => file.originalname).join(', ');

export const mergePdfs = async (req, res, next) => {
    const files = Array.isArray(req.files) ? req.files : [];
    const userId = req.user?._id;
    const ipAddress = req.ip;
    let originalName = describeFiles(files);

    try {
        if (files.length < 2) {
            throw new AppError(400, 'Please upload at least 2 PDF files to merge.', { code: 'NOT_ENOUGH_FILES' });
        }

        const merged = await PDFDocument.create();
        let pageCount = 0;

        for (const file of files) {
            const label = `"${file.originalname}"`;
            const { document } = await loadPdf(file.path, { label });
            const pages = await merged.copyPages(document, document.getPageIndices());
            pages.forEach((page) => merged.addPage(page));
            pageCount += pages.length;
        }

        if (pageCount === 0) {
            throw new AppError(422, 'The uploaded PDFs do not contain any pages.', { code: 'PDF_NO_PAGES' });
        }

        merged.setTitle('Merged document');
        merged.setCreator('Convertify');

        const bytes = await merged.save();
        if (!req.tempDir) {
            throw new AppError(500, 'Temporary storage is not available. Please try again.', {
                code: 'TEMP_STORAGE_MISSING',
            });
        }

        const outputPath = path.join(req.tempDir, `merged-${crypto.randomUUID()}.pdf`);
        await fs.promises.writeFile(outputPath, bytes);

        void logConversion({
            originalName: `${originalName} (${pageCount} pages)`,
            type: 'merge',
            status: 'success',
            size: bytes.length,
            userId,
            ipAddress,
        });

        return sendAttachment(res, next, {
            outputPath,
            downloadName: 'merged.pdf',
            mimeType: 'application/pdf',
        });
    } catch (error) {
        void logConversion({
            originalName,
            type: 'merge',
            status: 'failed',
            userId,
            ipAddress,
        });
        return next(error);
    }
};

const handleConversion = (directionId) => async (req, res, next) => {
    const direction = CONVERSION_DIRECTIONS[directionId];
    const userId = req.user?._id;
    const ipAddress = req.ip;
    const originalName = req.file?.originalname || 'unknown';

    try {
        if (!req.file) {
            throw new AppError(
                400,
                direction.inputKind === 'pdf'
                    ? 'Please upload a PDF file.'
                    : 'Please upload a Word (.docx) file.',
                { code: 'FILE_REQUIRED' }
            );
        }

        const result = await documentConversionService.convert({
            inputPath: req.file.path,
            originalName,
            direction: directionId,
            requestId: req.id,
            outputDir: req.tempDir,
        });

        void logConversion({
            originalName,
            type: directionId,
            status: 'success',
            size: result.size,
            userId,
            ipAddress,
        });

        return sendAttachment(res, next, {
            outputPath: result.outputPath,
            downloadName: result.downloadName,
            mimeType: result.mimeType,
        });
    } catch (error) {
        void logConversion({
            originalName,
            type: directionId,
            status: 'failed',
            userId,
            ipAddress,
        });
        return next(error);
    }
};

export const wordToPdf = handleConversion('word-to-pdf');
export const pdfToWord = handleConversion('pdf-to-word');

export const getConversionFilename = (originalName, directionId) =>
    buildDownloadName(originalName, CONVERSION_DIRECTIONS[directionId]);
