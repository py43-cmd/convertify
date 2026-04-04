import multer from 'multer';
import os from 'os';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(os.tmpdir(), 'uploads');
const outputDir = path.join(os.tmpdir(), 'outputs');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Set up Multer for file uploads with a 1000MB limit
const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 1000 * 1024 * 1024 } // 1000MB limit
});

// Helper to safely delete files
export const safeUnlink = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
        console.error("Cleanup error:", e.message);
    }
};

export { upload, outputDir };
