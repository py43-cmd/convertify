import multer from 'multer';

// Global error handler for Multer limits or general API errors
export const errorHandler = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File is too large. Max limit is 1000MB.' });
        }
    }
    
    console.error('Unhandled Error:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred.' });
};
