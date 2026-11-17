import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { AppError } from '../utils/errors.js';
import { MAX_UPLOAD_BYTES, MAX_MERGE_FILES } from '../config/limits.js';
import { createRequestTempDir, removeDirectory } from '../services/documentConversionService.js';

const PDF_EXTENSIONS = new Set(['.pdf']);
const DOCX_EXTENSIONS = new Set(['.docx']);

const COMMON_MIMES = new Set(['', 'application/octet-stream', 'binary/octet-stream']);
const PDF_MIMES = new Set(['application/pdf', 'application/x-pdf']);
const DOCX_MIMES = new Set([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-zip-compressed',
]);

const KIND_RULES = {
    pdf: {
        extensions: PDF_EXTENSIONS,
        mimes: PDF_MIMES,
        message: 'Only PDF files are accepted.',
    },
    docx: {
        extensions: DOCX_EXTENSIONS,
        mimes: DOCX_MIMES,
        message: 'Only .docx Word files are accepted. Legacy .doc files must be saved as .docx first.',
    },
};

/**
 * Creates a multer instance that stores uploads in a per-request temp folder.
 * The folder is created lazily on the first file so requests without files
 * never touch the disk.
 */
const createUploader = ({ kind, maxCount }) => {
    const rules = KIND_RULES[kind];

    return multer({
        storage: multer.diskStorage({
            destination: (req, file, callback) => {
                if (req.tempDir) return callback(null, req.tempDir);
                createRequestTempDir('upload').then(
                    (dir) => {
                        req.tempDir = dir;
                        callback(null, dir);
                    },
                    (error) => callback(error)
                );
            },
            filename: (req, file, callback) => {
                const extension = path.extname(file.originalname || '').toLowerCase();
                callback(null, `${crypto.randomUUID()}${extension}`);
            },
        }),
        limits: {
            fileSize: MAX_UPLOAD_BYTES,
            files: maxCount,
            fields: 8,
        },
        fileFilter: (req, file, callback) => {
            const extension = path.extname(file.originalname || '').toLowerCase();
            const mimetype = String(file.mimetype || '').toLowerCase();

            if (!rules.extensions.has(extension)) {
                return callback(new AppError(400, rules.message, { code: 'UNSUPPORTED_FILE_TYPE' }));
            }
            if (!COMMON_MIMES.has(mimetype) && !rules.mimes.has(mimetype)) {
                return callback(
                    new AppError(
                        400,
                        'The uploaded file type does not match its extension.',
                        { code: 'UNSUPPORTED_FILE_TYPE' }
                    )
                );
            }
            return callback(null, true);
        },
    });
};

export const pdfMergeUpload = createUploader({ kind: 'pdf', maxCount: MAX_MERGE_FILES })
    .array('files', MAX_MERGE_FILES);
export const pdfSingleUpload = createUploader({ kind: 'pdf', maxCount: 1 }).single('file');
export const docxSingleUpload = createUploader({ kind: 'docx', maxCount: 1 }).single('file');

/**
 * Removes the per-request temp folder once the response has been flushed.
 * Mounted before multer so even rejected uploads are cleaned up.
 * Delay cleanup to allow file downloads to complete streaming.
 */
export const cleanupTempDir = (req, res, next) => {
    let cleaned = false;
    const run = () => {
        if (cleaned) return;
        cleaned = true;
        const dir = req.tempDir;
        req.tempDir = null;
        // Delay to ensure downloads complete streaming
        setTimeout(() => removeDirectory(dir), 2000);
    };
    res.on('finish', run);
    res.on('close', run);
    next();
};
