import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '..', 'manual-output');
await fs.promises.mkdir(outputDir, { recursive: true });

const createDocxBuffer = async () => {
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: [
                    new Paragraph({ children: [new TextRun('Convertify manual test - Word to PDF')] }),
                    new Paragraph({ children: [new TextRun('This file is generated for local verification.')] }),
                ],
            },
        ],
    });
    return await Packer.toBuffer(doc);
};

const createPdfBuffer = async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Convertify manual test - PDF to Word', { x: 50, y: 720, size: 18 });
    page.drawText('This PDF has a text layer.', { x: 50, y: 690, size: 12 });
    return Buffer.from(await pdf.save());
};

const run = async () => {
    console.log('Manual conversion test helpers');
    console.log('================================');

    const docx = await createDocxBuffer();
    const docxPath = path.join(outputDir, `manual-sample.docx`);
    await fs.promises.writeFile(docxPath, docx);
    console.log(`Created ${docxPath} (${docx.length} bytes)`);

    const pdf = await createPdfBuffer();
    const pdfPath = path.join(outputDir, `manual-sample.pdf`);
    await fs.promises.writeFile(pdfPath, pdf);
    console.log(`Created ${pdfPath} (${pdf.length} bytes)`);

    console.log('\nTo test against a running server (auth required):');
    console.log('curl -b cookies.txt -X POST http://localhost:3000/api/word-to-pdf -F "file=@manual-output/manual-sample.docx" -o out.pdf');
    console.log('curl -b cookies.txt -X POST http://localhost:3000/api/pdf-to-word -F "file=@manual-output/manual-sample.pdf" -o out.docx');
    console.log('curl -b cookies.txt -X POST http://localhost:3000/api/merge -F "files=@manual-output/manual-sample.pdf" -F "files=@manual-output/manual-sample.pdf" -o merged.pdf');
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
