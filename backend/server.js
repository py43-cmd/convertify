import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Set up Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Ensure uploads and output directories exist
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('outputs')) fs.mkdirSync('outputs');

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
            fs.unlinkSync(file.path);
        }

        const mergedPdfBytes = await mergedPdf.save();
        const outputPath = path.join(__dirname, 'outputs', `merged_${Date.now()}.pdf`);
        fs.writeFileSync(outputPath, mergedPdfBytes);

        res.download(outputPath, 'merged.pdf', (err) => {
            if (err) console.error('Error downloading file:', err);
            // Clean up output file after download
            fs.unlinkSync(outputPath);
        });

    } catch (error) {
        console.error('Merge error:', error);
        res.status(500).json({ error: 'Failed to merge PDFs. Please ensure all uploaded files are valid PDFs.' });
    }
});

// 2. Word to PDF endpoint
app.post('/api/word-to-pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a Word file.' });
        }

        // NOTE: True Word to PDF conversion purely in Node.js requires LibreOffice installed or external APIs.
        // We are generating a dynamically created PDF as a placeholder to represent the success of the endpoint processing.
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();

        page.drawText(`Converted from Document:`, { x: 50, y: 750, size: 24 });
        page.drawText(`${req.file.originalname}`, { x: 50, y: 700, size: 16 });
        page.drawText(`(Note: Pure JS Word-to-PDF requires Libby/LibreOffice installed.)`, { x: 50, y: 650, size: 12 });

        const pdfBytes = await pdfDoc.save();
        const outputPath = path.join(__dirname, 'outputs', `converted_${Date.now()}.pdf`);
        fs.writeFileSync(outputPath, pdfBytes);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.download(outputPath, `${req.file.originalname.split('.')[0]}_converted.pdf`, (err) => {
            if (err) console.error(err);
            fs.unlinkSync(outputPath);
        });

    } catch (error) {
        console.error('Word to PDF error:', error);
        res.status(500).json({ error: 'Failed to convert Word to PDF.' });
    }
});

import pdfParse from 'pdf-parse';
import { Document, Packer, Paragraph, TextRun } from "docx";

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

        // 3. Create a brand new real .docx (Word) file using the extracted text
        // Split text by newlines so Word doesn't put everything on a single massive line
        const paragraphs = extractedText.split('\n').map(line => {
            return new Paragraph({
                children: [new TextRun(line)]
            });
        });

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Extracted from: ${req.file.originalname}`,
                                bold: true,
                                size: 28, // 14pt
                            }),
                        ],
                    }),
                    new Paragraph({ text: "" }), // Blank line spacer
                    ...paragraphs
                ],
            }],
        });

        // 4. Build the Word document into a buffer
        const wordBuffer = await Packer.toBuffer(doc);
        const outputPath = path.join(__dirname, 'outputs', `converted_${Date.now()}.docx`);

        // 5. Save the real Word document to disk
        fs.writeFileSync(outputPath, wordBuffer);

        // 6. Clean up uploaded original PDF
        fs.unlinkSync(req.file.path);

        // 7. Send the real Word document to the user
        res.download(outputPath, `${req.file.originalname.split('.')[0]}_converted.docx`, (err) => {
            if (err) console.error(err);
            fs.unlinkSync(outputPath); // Clean up output
        });

    } catch (error) {
        console.error('PDF to Word error:', error);
        res.status(500).json({ error: 'Failed to convert PDF to Word.' });
    }
});

app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});
