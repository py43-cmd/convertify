import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { PDFDocument } from 'pdf-lib';
import { createApp } from '../app.js';
import { setProviderFactoryForTests, resetProviderFactoryForTests } from '../services/documentConversionService.js';

const createDocxBuffer = async (text = 'Hello from Convertify') => {
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: [new Paragraph({ children: [new TextRun(text)] })],
            },
        ],
    });
    return await Packer.toBuffer(doc);
};

const createPdfBuffer = async (text = 'Hello from PDF') => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([600, 400]);
    page.drawText(text, { x: 50, y: 350, size: 24 });
    return Buffer.from(await pdf.save());
};

const multipartFromFiles = (files) => {
    const boundary = '----ConvertifyTestBoundary';
    const chunks = [];
    for (const file of files) {
        const name = file.field || (files.length === 1 ? 'file' : 'files');
        chunks.push(Buffer.from(`--${boundary}\r\n`));
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="${name}"; filename="${file.name}"\r\n`));
        chunks.push(Buffer.from(`Content-Type: ${file.contentType || 'application/octet-stream'}\r\n\r\n`));
        chunks.push(file.buffer);
        chunks.push(Buffer.from('\r\n'));
    }
    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    return {
        body: Buffer.concat(chunks),
        headers: {
            'content-type': `multipart/form-data; boundary=${boundary}`,
        },
    };
};

const startServer = async (app) => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    return { server, baseUrl: `http://127.0.0.1:${port}` };
};

const authStub = (req, res, next) => {
    req.isAuthenticated = () => true;
    req.user = { _id: '000000000000000000000001' };
    next();
};

describe('Document conversion API', () => {
    it('requires authentication', async () => {
        const app = createApp({});
        const { server, baseUrl } = await startServer(app);
        try {
            const res = await fetch(`${baseUrl}/api/word-to-pdf`, { method: 'POST' });
            assert.equal(res.status, 401);
            const body = await res.json();
            assert.equal(body.success, false);
            assert.match(body.message, /Authentication required/i);
        } finally {
            await new Promise((resolve) => server.close(resolve));
        }
    });

    it('word-to-pdf converts via injected ConvertAPI provider', async () => {
        const app = createApp({ authStub });
        const { server, baseUrl } = await startServer(app);
        setProviderFactoryForTests(() => ({
            convert: async (toFormat, params, fromFormat) => {
                assert.equal(toFormat, 'pdf');
                assert.equal(fromFormat, 'docx');
                assert.ok(params.File);
                return {
                    files: [
                        {
                            save: async (filePath) => {
                                const pdf = await PDFDocument.create();
                                pdf.addPage([612, 792]);
                                await fs.promises.writeFile(filePath, await pdf.save());
                            },
                        },
                    ],
                };
            },
        }));
        try {
            const docx = await createDocxBuffer('Test');
            const { body, headers } = multipartFromFiles([
                { name: 'sample.docx', buffer: docx, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
            ]);
            const res = await fetch(`${baseUrl}/api/word-to-pdf`, { method: 'POST', headers, body });
            assert.equal(res.status, 200);
            assert.match(res.headers.get('content-type') || '', /pdf/i);
            assert.match(res.headers.get('content-disposition') || '', /attachment/i);
            const out = Buffer.from(await res.arrayBuffer());
            
            assert.ok(out.subarray(0, 5).equals(Buffer.from('%PDF-')));
        } finally {
            resetProviderFactoryForTests();
            await new Promise((resolve) => server.close(resolve));
        }
    });

    it('pdf-to-word forces OCR when text layer missing', async () => {
        const app = createApp({ authStub });
        const { server, baseUrl } = await startServer(app);
        let capturedParams = null;
        setProviderFactoryForTests(() => ({
            convert: async (toFormat, params, fromFormat) => {
                capturedParams = params;
                assert.equal(toFormat, 'docx');
                assert.equal(fromFormat, 'pdf');
                return {
                    files: [
                        {
                            save: async (filePath) => {
                                const header = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
                                const content = Buffer.concat([
                                    header,
                                    Buffer.from('x'.repeat(64)),
                                    Buffer.from('[Content_Types].xmlword/document.xml'),
                                ]);
                                await fs.promises.writeFile(filePath, content);
                            },
                        },
                    ],
                };
            },
        }));
        try {
            // Create a PDF with no readable text drawn (empty page) to simulate scanned
            const pdf = await PDFDocument.create();
            pdf.addPage([612, 792]);
            const pdfBytes = Buffer.from(await pdf.save());
            const { body, headers } = multipartFromFiles([
                { name: 'scanned.pdf', buffer: pdfBytes, contentType: 'application/pdf' },
            ]);
            const res = await fetch(`${baseUrl}/api/pdf-to-word`, { method: 'POST', headers, body });
            assert.equal(res.status, 200);
            assert.equal(capturedParams?.OcrMode, 'force');
            assert.match(res.headers.get('content-disposition') || '', /\.docx/i);
        } finally {
            resetProviderFactoryForTests();
            await new Promise((resolve) => server.close(resolve));
        }
    });

    it('merge combines PDFs and returns a PDF', async () => {
        const app = createApp({ authStub });
        const { server, baseUrl } = await startServer(app);
        try {
            const pdf1 = await createPdfBuffer('Page 1');
            const pdf2 = await createPdfBuffer('Page 2');
            const { body, headers } = multipartFromFiles([
                { name: 'a.pdf', buffer: pdf1, contentType: 'application/pdf', field: 'files' },
                { name: 'b.pdf', buffer: pdf2, contentType: 'application/pdf', field: 'files' },
            ]);
            const res = await fetch(`${baseUrl}/api/merge`, { method: 'POST', headers, body });
            assert.equal(res.status, 200);
            assert.match(res.headers.get('content-type') || '', /pdf/i);
            assert.match(res.headers.get('content-disposition') || '', /merged/i);
            const out = Buffer.from(await res.arrayBuffer());
            assert.ok(out.subarray(0, 5).equals(Buffer.from('%PDF-')));
            assert.ok(out.length > pdf1.length);
        } finally {
            await new Promise((resolve) => server.close(resolve));
        }
    });

    it('returns 413 for files over the limit', async () => {
        const app = createApp({ authStub });
        const { server, baseUrl } = await startServer(app);
        try {
            const big = Buffer.alloc(25 * 1024 * 1024, 0x00);
            big[0] = 0x50; big[1] = 0x4b; big[2] = 0x03; big[3] = 0x04;
            const { body, headers } = multipartFromFiles([
                { name: 'big.docx', buffer: big, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
            ]);
            const res = await fetch(`${baseUrl}/api/word-to-pdf`, { method: 'POST', headers, body });
            assert.equal(res.status, 413);
            const json = await res.json();
            assert.equal(json.success, false);
            assert.match(json.message, /too large/i);
        } finally {
            await new Promise((resolve) => server.close(resolve));
        }
    });
});


