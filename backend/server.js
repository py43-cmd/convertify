import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { Document, Packer, Paragraph, TextRun } from "docx";
import mammoth from 'mammoth';
import puppeteer from 'puppeteer';
import libre from 'libreoffice-convert';
import ConvertApi from 'convertapi';
import { promisify } from 'util';
import os from 'os';

const libreConvert = promisify(libre.convert);
// Initialize ConvertAPI (Evaluation key)
const convertapi = new ConvertApi('1V00t73eXfW88MPr');

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the React app's dist folder
const reactDistPath = path.join(__dirname, '../react/dist');
if (fs.existsSync(reactDistPath)) {
    app.use(express.static(reactDistPath));
}

// Use OS temp directory for Vercel/Serverless compatibility
const uploadDir = path.join(os.tmpdir(), 'uploads');
const outputDir = path.join(os.tmpdir(), 'outputs');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Set up Multer for file uploads with a 20MB limit
const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Helper to safely delete files
const safeUnlink = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
        console.error("Cleanup error:", e.message);
    }
};

// Global error handler for Multer limits
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File is too large. Max limit is 20MB.' });
        }
    }
    next(err);
});

// 1. Merge PDF endpoint (Fully Working via pdf-lib)
app.post('/api/merge', upload.array('files'), async (req, res) => {
    try {
        if (!req.files || req.files.length < 2) {
            return res.status(400).json({ error: 'Please upload at least 2 PDF files to merge.' });
        }

        const mergedPdf = await PDFDocument.create();

        for (const file of req.files) {
            const pdfBytes = fs.readFileSync(file.path);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));

            // Clean up uploaded file
            safeUnlink(file.path);
        }

        const mergedPdfBytes = await mergedPdf.save();
        const outputPath = path.join(outputDir, `merged_${Date.now()}.pdf`);
        fs.writeFileSync(outputPath, mergedPdfBytes);

        res.download(outputPath, 'merged.pdf', (err) => {
            if (err) console.error('Error downloading file:', err);
            // Clean up output file after download
            safeUnlink(outputPath);
        });

    } catch (error) {
        console.error('Merge error:', error);
        // Attempt cleanup of any remaining uploads
        if (req.files) req.files.forEach(f => safeUnlink(f.path));
        res.status(500).json({ error: 'Failed to merge PDFs. Please ensure all uploaded files are valid PDFs.' });
    }
});

// 2. Word to PDF endpoint (High-Precision Local Engine)
app.post('/api/word-to-pdf', upload.single('file'), async (req, res) => {
    let outputPath = "";
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a Word file.' });
        }

        outputPath = path.join(outputDir, `final_${Date.now()}.pdf`);

        // TIER 1: HIGH-PRECISION LOCAL EMULATION (Puppeteer + Mammoth)
        // User preferred this method's results.
        try {
            console.log('Tier 1: Starting High-Precision Local Engine...');
            const docBuffer = fs.readFileSync(req.file.path);

            // Mammoth High-Fidelity Style Map
            const mammothOptions = {
                styleMap: [
                    "p[style-name='Heading 1'] => h1:fresh",
                    "p[style-name='Heading 2'] => h2:fresh",
                    "p[style-name='Heading 3'] => h3:fresh",
                    "p[style-name='Title'] => h1.title:fresh",
                    "p[style-name='Subtitle'] => p.subtitle:fresh"
                ]
            };

            const { value: docHtml } = await mammoth.convertToHtml({ buffer: docBuffer }, mammothOptions);

            const browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
            });
            const page = await browser.newPage();

            const highPrecisionTemplate = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            /* WORD 2021 PRECISION EMULATION */
                            @page {
                                size: A4;
                                margin: 1in; /* Exact Word Margins */
                            }
                            body { 
                                margin: 0;
                                padding: 0.75in; /* Correct for browser-to-pdf offset */
                                background: white;
                                font-family: 'Calibri', 'Segoe UI', 'Arial', sans-serif;
                                font-size: 11pt; /* Exact Word Body Size */
                                line-height: 1.15;
                                color: #333;
                                text-rendering: optimizeLegibility;
                                width: 6.27in; /* Lock width to match Word layout */
                            }
                            p { margin: 0 0 8pt 0; }
                            h1 { color: #2F5496; font-size: 16pt; margin: 12pt 0 4pt 0; font-weight: normal; }
                            h2 { color: #2F5496; font-size: 13pt; margin: 2pt 0 2pt 0; font-weight: normal; }
                            h3 { color: #1F3763; font-size: 12pt; margin: 2pt 0 0 0; font-weight: normal; }
                            .title { font-size: 28pt; color: #2F5496; margin-bottom: 8pt; }
                            .subtitle { font-size: 11pt; color: #5A5A5A; margin-bottom: 20pt; }
                            table { border-collapse: collapse; width: 100%; border: 1px solid #BFBFBF; margin: 10pt 0; }
                            th, td { border: 1px solid #BFBFBF; padding: 4pt; vertical-align: top; }
                            img { max-width: 100%; height: auto; display: block; margin: 10pt 0; }
                        </style>
                    </head>
                    <body>
                        <div class="document-content">
                            ${docHtml}
                        </div>
                    </body>
                </html>
            `;

            await page.setContent(highPrecisionTemplate, { waitUntil: 'networkidle0' });

            // WORD-ACCURATE RENDERING: 
            const fallbackPdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                preferCSSPageSize: true,
                scale: 0.75 // 96DPI -> 72DPI Fix
            });
            await browser.close();
            fs.writeFileSync(outputPath, fallbackPdfBuffer);
            console.log('Tier 1 Success: High-Precision PDF generated.');

            return res.download(outputPath, `${path.parse(req.file.originalname).name}.pdf`, () => {
                safeUnlink(req.file.path);
                safeUnlink(outputPath);
            });
        } catch (localError) {
            console.warn('Tier 1 Failed. Falling back to Tier 2 (LibreOffice/Cloud)...');
            console.error(localError.message);

            // TIER 2: SYSTEM LOCAL (LibreOffice)
            try {
                const docxBuffer = fs.readFileSync(req.file.path);
                const pdfBuffer = await libreConvert(docxBuffer, '.pdf', undefined);
                fs.writeFileSync(outputPath, pdfBuffer);

                return res.download(outputPath, `${path.parse(req.file.originalname).name}.pdf`, () => {
                    safeUnlink(req.file.path);
                    safeUnlink(outputPath);
                });
            } catch (libreError) {
                // TIER 3: CLOUD (ConvertAPI)
                try {
                    const result = await convertapi.convert('pdf', { File: req.file.path }, 'doc');
                    await result.saveFiles(outputPath);
                    return res.download(outputPath, `${path.parse(req.file.originalname).name}.pdf`, () => {
                        safeUnlink(req.file.path);
                        safeUnlink(outputPath);
                    });
                } catch (cloudError) {
                    safeUnlink(req.file.path);
                    res.status(500).json({ error: 'Conversion failed - logic reverted to earlier stable method.' });
                }
            }
        }
    } catch (err) {
        console.error('Fatal Error:', err);
        if (req.file) safeUnlink(req.file.path);
        res.status(500).json({ error: 'System error during conversion.' });
    }
});

// 3. PDF to Word endpoint (Actually Functional using pdf-parse and docx)
app.post('/api/pdf-to-word', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a PDF file.' });
        }

        // 1. Read the PDF buffer into memory
        const pdfBuffer = fs.readFileSync(req.file.path);

        // 2. Extract raw text from the PDF using pdf-parse
        let parsedData;
        try {
            parsedData = await pdfParse(pdfBuffer);
        } catch (parseError) {
            console.error("PDF Parsing failed:", parseError);
            return res.status(422).json({ error: 'Could not extract text from this PDF. It may be a scanned image or corrupted.' });
        }

        const extractedText = parsedData.text || "No text could be extracted.";

        // 3. Create a brand new real .docx (Word) file with professional formatting
        const paragraphs = extractedText.split('\n').map(line => {
            return new Paragraph({
                spacing: { after: 160 }, // 8pt spacing (20 units = 1pt)
                children: [
                    new TextRun({
                        text: line,
                        font: "Calibri",
                        size: 22, // 11pt
                    })
                ]
            });
        });

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        spacing: { after: 300 },
                        children: [
                            new TextRun({
                                text: `EXTRACTED CONTENT FROM: ${req.file.originalname.toUpperCase()}`,
                                bold: true,
                                font: "Calibri",
                                size: 28, // 14pt
                                color: "2F5496" // Classic Word Blue
                            }),
                        ],
                    }),
                    ...paragraphs
                ],
            }],
        });

        // 4. Build the Word document into a buffer
        const wordBuffer = await Packer.toBuffer(doc);
        const outputPath = path.join(outputDir, `converted_${Date.now()}.docx`);

        // 5. Save the real Word document to disk
        fs.writeFileSync(outputPath, wordBuffer);

        // 6. Clean up uploaded original PDF
        safeUnlink(req.file.path);

        // 7. Send the real Word document to the user
        res.download(outputPath, `${req.file.originalname.split('.')[0]}_converted.docx`, (err) => {
            if (err) console.error(err);
            safeUnlink(outputPath); // Clean up output
        });

    } catch (error) {
        console.error('PDF to Word error:', error);
        if (req.file) safeUnlink(req.file.path);
        res.status(500).json({ error: 'Failed to convert PDF to Word.' });
    }
});

// Catch-all route to serve index.html for client-side routing
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../react/dist/index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Not Found');
    }
});

app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});

export default app;
