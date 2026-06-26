import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import mammoth from 'mammoth';
import puppeteer from 'puppeteer';
import libre from 'libreoffice-convert';
import ConvertApi from 'convertapi';
import { promisify } from 'util';
import { createRequire } from 'module';
import { Document, Packer, Paragraph, TextRun } from "docx";
import { safeUnlink, outputDir } from '../middlewares/upload.js';
import Conversion from '../models/Conversion.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const libreConvert = promisify(libre.convertWithOptions);
const convertapi = new ConvertApi(process.env.CONVERTAPI_SECRET || '1V00t73eXfW88MPr'); // Evaluation key

// Helper function to track document conversion requests
const logConversion = (originalName, type, status, size = null, userId = null) => {
    Conversion.create({
        originalName: originalName,
        conversionType: type,
        status: status,
        fileSize: size,
        userId: userId
    })
        .then((savedData) => {
            console.log(`\n💾 DATABASE SAVED: Successfully recorded "${savedData.originalName}" (${savedData.conversionType})!`);
        })
        .catch((err) => console.log(`❌ DB error for ${originalName}: ${err.message}`));
};

// Singleton Puppeteer Browser Instance Management
let browserInstance = null;

const getBrowser = async () => {
    if (!browserInstance || !browserInstance.isConnected()) {
        console.log('🚀 Initializing singleton Puppeteer browser instance...');
        browserInstance = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
        });
        browserInstance.on('disconnected', () => {
            console.warn('⚠️ Puppeteer browser disconnected. Setting instance to null.');
            browserInstance = null;
        });
    }
    return browserInstance;
};

// Graceful cleanup on server shutdown
process.on('exit', () => {
    if (browserInstance) {
        browserInstance.close().catch((err) => console.error('Error closing browser instance on exit:', err));
    }
});

export const mergePdfs = async (req, res) => {
    try {
        if (!req.files || req.files.length < 2) {
            return res.status(400).json({ error: 'Please upload at least 2 PDF files to merge.' });
        }

        const mergedPdf = await PDFDocument.create();

        for (const file of req.files) {
            const pdfBytes = await fs.promises.readFile(file.path);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));

            // Clean up uploaded file
            safeUnlink(file.path);
        }

        const mergedPdfBytes = await mergedPdf.save();
        const outputPath = path.join(outputDir, `merged_${Date.now()}.pdf`);
        await fs.promises.writeFile(outputPath, mergedPdfBytes);

        const fileStats = await fs.promises.stat(outputPath);
        logConversion(req.files.map(f => f.originalname).join(', '), 'merge', 'success', fileStats.size, req.user?._id);

        res.download(outputPath, 'merged.pdf', (err) => {
            if (err) console.error('Error downloading file:', err);
            // Clean up output file after download
            safeUnlink(outputPath);
        });

    } catch (error) {
        console.error('Merge error:', error);
        logConversion(req.files ? req.files.map(f => f.originalname).join(', ') : 'unknown', 'merge', 'failed', null, req.user?._id);
        if (req.files) req.files.forEach(f => safeUnlink(f.path));
        res.status(500).json({ error: 'Failed to merge PDFs. Please ensure all uploaded files are valid PDFs.' });
    }
};

export const wordToPdf = async (req, res) => {
    let outputPath = "";
    let tempFilePathWithExt = "";
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a Word file.' });
        }

        // Rename the uploaded file to include the correct extension on disk.
        // This is critical because ConvertAPI and other engines identify the file format using the filename extension.
        const ext = path.extname(req.file.originalname) || '.docx';
        tempFilePathWithExt = `${req.file.path}${ext}`;
        await fs.promises.rename(req.file.path, tempFilePathWithExt);

        outputPath = path.join(outputDir, `final_${Date.now()}.pdf`);

        // TIER 1: HIGH-PRECISION CLOUD ENGINE (ConvertAPI)
        try {
            console.log('Tier 1: Starting High-Precision Cloud Engine (ConvertAPI)...');
            const extFormat = ext.replace('.', '');
            const result = await convertapi.convert('pdf', { File: tempFilePathWithExt }, extFormat);
            await result.saveFiles(outputPath);

            const fileStats = await fs.promises.stat(outputPath);
            logConversion(req.file.originalname, 'word-to-pdf', 'success', fileStats.size, req.user?._id);

            return res.download(outputPath, `${path.parse(req.file.originalname).name}.pdf`, () => {
                safeUnlink(tempFilePathWithExt);
                safeUnlink(outputPath);
            });
        } catch (cloudError) {
            console.warn('Tier 1 Failed. Falling back to Tier 2 (LibreOffice)...');
            console.error(cloudError.message || cloudError);

            // TIER 2: SYSTEM LOCAL (LibreOffice)
            try {
                console.log('Tier 2: Starting Local Office Engine (LibreOffice)...');
                const docxBuffer = await fs.promises.readFile(tempFilePathWithExt);
                const pdfBuffer = await libreConvert(docxBuffer, '.pdf', undefined, { fileName: `document${ext}` });
                await fs.promises.writeFile(outputPath, pdfBuffer);

                const fileStats = await fs.promises.stat(outputPath);
                logConversion(req.file.originalname, 'word-to-pdf', 'success', fileStats.size, req.user?._id);

                return res.download(outputPath, `${path.parse(req.file.originalname).name}.pdf`, () => {
                    safeUnlink(tempFilePathWithExt);
                    safeUnlink(outputPath);
                });
            } catch (libreError) {
                console.warn('Tier 2 Failed. Falling back to Tier 3 (Mammoth + Puppeteer)...');
                console.error(libreError.message || libreError);

                // TIER 3: LOCAL HTML EMULATION (Puppeteer + Mammoth)
                try {
                    console.log('Tier 3: Starting Local HTML Emulation Engine...');
                    const docBuffer = await fs.promises.readFile(tempFilePathWithExt);

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

                    // Get the running singleton browser
                    const browser = await getBrowser();
                    const page = await browser.newPage();

                    const highPrecisionTemplate = `
                        <!DOCTYPE html>
                        <html>
                            <head>
                                <meta charset="UTF-8">
                                <style>
                                    @page { size: A4; margin: 1in; }
                                    body { margin: 0; padding: 0.75in; background: white; font-family: 'Calibri', 'Segoe UI', 'Arial', sans-serif; font-size: 11pt; line-height: 1.15; color: #333; text-rendering: optimizeLegibility; width: 6.27in; }
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

                    try {
                        await page.setContent(highPrecisionTemplate, { waitUntil: 'networkidle0' });

                        const fallbackPdfBuffer = await page.pdf({
                            format: 'A4',
                            printBackground: true,
                            preferCSSPageSize: true,
                            scale: 0.75
                        });
                        await fs.promises.writeFile(outputPath, fallbackPdfBuffer);
                    } finally {
                        // Ensure page is always closed even on errors
                        await page.close();
                    }

                    console.log('Tier 3 Success: High-Precision PDF generated.');
                    const fileStats = await fs.promises.stat(outputPath);
                    logConversion(req.file.originalname, 'word-to-pdf', 'success', fileStats.size, req.user?._id);

                    return res.download(outputPath, `${path.parse(req.file.originalname).name}.pdf`, () => {
                        safeUnlink(tempFilePathWithExt);
                        safeUnlink(outputPath);
                    });
                } catch (localError) {
                    console.error("Tier 3 Failed:", localError.message || localError);
                    safeUnlink(tempFilePathWithExt);
                    res.status(500).json({ error: 'All conversion engines failed to convert this document.' });
                }
            }
        }
    } catch (err) {
        console.error('Fatal Error:', err);
        logConversion(req.file ? req.file.originalname : 'unknown', 'word-to-pdf', 'failed', null, req.user?._id);
        if (tempFilePathWithExt) safeUnlink(tempFilePathWithExt);
        else if (req.file) safeUnlink(req.file.path);
        res.status(500).json({ error: 'System error during conversion.' });
    }
};

export const pdfToWord = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a PDF file.' });
        }

        const pdfBuffer = await fs.promises.readFile(req.file.path);

        let parsedData;
        try {
            parsedData = await pdfParse(pdfBuffer);
        } catch (parseError) {
            console.error("PDF Parsing failed:", parseError);
            return res.status(422).json({ error: 'Could not extract text from this PDF. It may be a scanned image or corrupted.' });
        }

        const extractedText = parsedData.text || "No text could be extracted.";

        const paragraphs = extractedText.split('\n').map(line => {
            return new Paragraph({
                spacing: { after: 160 },
                children: [
                    new TextRun({
                        text: line,
                        font: "Calibri",
                        size: 22,
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
                                size: 28,
                                color: "2F5496"
                            }),
                        ],
                    }),
                    ...paragraphs
                ],
            }],
        });

        const wordBuffer = await Packer.toBuffer(doc);
        const outputPath = path.join(outputDir, `converted_${Date.now()}.docx`);

        await fs.promises.writeFile(outputPath, wordBuffer);

        const fileStats = await fs.promises.stat(outputPath);
        logConversion(req.file.originalname, 'pdf-to-word', 'success', fileStats.size, req.user?._id);

        safeUnlink(req.file.path);

        res.download(outputPath, `${req.file.originalname.split('.')[0]}_converted.docx`, (err) => {
            if (err) console.error(err);
            safeUnlink(outputPath);
        });

    } catch (error) {
        console.error('PDF to Word error:', error);
        logConversion(req.file ? req.file.originalname : 'unknown', 'pdf-to-word', 'failed', null, req.user?._id);
        if (req.file) safeUnlink(req.file.path);
        res.status(500).json({ error: 'Failed to convert PDF to Word.' });
    }
};
