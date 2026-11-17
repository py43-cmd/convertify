import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { PDFDocument } from 'pdf-lib';

export const createDocxBuffer = async (text = 'Hello from Convertify') => {
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: [new Paragraph({ children: [new TextRun(text)] })],
            },
        ],
    });
    return Packer.toBuffer(doc);
};

export const createPdfBuffer = async (text = null) => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([600, 400]);
    if (text) {
        page.drawText(text, { x: 50, y: 350, size: 20 });
    }
    return Buffer.from(await pdf.save());
};

export const makeTempDir = async (prefix = 'convertify-test-') =>
    fs.promises.mkdtemp(path.join(os.tmpdir(), prefix));

export const removeDir = async (dir) => {
    if (!dir) return;
    await fs.promises.rm(dir, { recursive: true, force: true });
};

export const writeTempFile = async (dir, name, buffer) => {
    const filePath = path.join(dir, name);
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
};

export const fakeProvider = (saveImplementation) => ({
    convert: async (...args) => {
        const [toFormat, params, fromFormat] = args;
        return {
            files: [
                {
                    save: async (filePath) =>
                        saveImplementation({ filePath, toFormat, params, fromFormat }),
                },
            ],
        };
    },
});

export const writePdfOutput = async (filePath) => {
    await fs.promises.writeFile(filePath, await createPdfBuffer());
};

export const writeDocxOutput = async (filePath) => {
    await fs.promises.writeFile(filePath, await createDocxBuffer());
};

export const providerError = (Code, status = 500) => {
    const error = new Error(`Provider error ${Code}`);
    error.data = { Code };
    error.response = { status };
    return error;
};
