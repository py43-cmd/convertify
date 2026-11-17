import multer from 'multer';
import { AppError } from '../utils/errors.js';
import { MAX_UPLOAD_SIZE_MB, MAX_MERGE_FILES } from '../config/limits.js';

const send = (res, status, message, code) =>
    res.status(status).json({ success: false, message, code });

export const errorHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    const requestId = req.id ? `[${req.id}]` : '';

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return send(res, 413, `File is too large. The maximum size is ${MAX_UPLOAD_SIZE_MB} MB.`, 'FILE_TOO_LARGE');
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return send(res, 400, `Too many files. Merge accepts up to ${MAX_MERGE_FILES} PDF files at once.`, 'TOO_MANY_FILES');
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return send(res, 400, 'Unexpected file field. Use "files" for merging and "file" for conversions.', 'UNEXPECTED_FILE');
        }
        return send(res, 400, 'The upload could not be processed.', 'UPLOAD_ERROR');
    }

    if (err?.type === 'entity.too.large') {
        return send(res, 413, 'Request body is too large.', 'REQUEST_TOO_LARGE');
    }

    if (err instanceof AppError) {
        if (err.statusCode >= 500) {
            console.error(`${requestId} ${req.method} ${req.originalUrl} -> ${err.statusCode} ${err.code}: ${err.message}`);
            if (err.cause) console.error(err.cause);
        }
        return send(res, err.statusCode, err.message, err.code);
    }

    console.error(`${requestId} Unhandled error on ${req.method} ${req.originalUrl}:`, err);
    return send(res, 500, 'An unexpected error occurred. Please try again.', 'INTERNAL_ERROR');
};
