import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    buildDownloadName,
    CONVERSION_DIRECTIONS,
    createConversionService,
    loadDocx,
    loadPdf,
    pdfHasTextLayer,
} from '../services/documentConversionService.js';
import {
    createDocxBuffer,
    createPdfBuffer,
    fakeProvider,
    makeTempDir,
    providerError,
    removeDir,
    writeDocxOutput,
    writePdfOutput,
    writeTempFile,
} from './helpers.js';

const silenceLogger = { info() { }, warn() { }, error() { } };

const withWorkDir = async (fn) => {
    const dir = await makeTempDir();
    try {
        return await fn(dir);
    } finally {
        await removeDir(dir);
    }
};

describe('upload validation', () => {
    it('rejects non-PDF content', async () => {
        await withWorkDir(async (dir) => {
            const filePath = await writeTempFile(dir, 'fake.pdf', Buffer.from('not a pdf'));
            await assert.rejects(loadPdf(filePath), (error) => {
                assert.equal(error.statusCode, 400);
                return true;
            });
        });
    });

    it('rejects corrupted PDF content with a 422', async () => {
        await withWorkDir(async (dir) => {
            // A truncated real PDF keeps the header but loses its cross-reference table.
            const truncated = (await createPdfBuffer('Hello')).subarray(0, 80);
            const filePath = await writeTempFile(dir, 'broken.pdf', truncated);
            await assert.rejects(loadPdf(filePath), (error) => {
                assert.equal(error.statusCode, 422);
                assert.equal(error.code, 'PDF_CORRUPTED');
                return true;
            });
        });
    });

    it('rejects files that only pretend to be docx', async () => {
        await withWorkDir(async (dir) => {
            const filePath = await writeTempFile(dir, 'fake.docx', Buffer.from('just some text'));
            await assert.rejects(loadDocx(filePath), (error) => {
                assert.equal(error.statusCode, 400);
                assert.equal(error.code, 'DOCX_INVALID');
                return true;
            });
        });
    });

    it('accepts real docx and pdf files', async () => {
        await withWorkDir(async (dir) => {
            const docxPath = await writeTempFile(dir, 'real.docx', await createDocxBuffer());
            const pdfPath = await writeTempFile(dir, 'real.pdf', await createPdfBuffer('Hello'));
            await loadDocx(docxPath);
            const { document } = await loadPdf(pdfPath);
            assert.equal(document.getPageCount(), 1);
        });
    });
});

describe('text layer detection', () => {
    it('detects text in a PDF with a text layer', async () => {
        await withWorkDir(async (dir) => {
            const filePath = await writeTempFile(dir, 'text.pdf', await createPdfBuffer('Readable text'));
            assert.equal(await pdfHasTextLayer(filePath), true);
        });
    });

    it('detects the absence of text in a blank PDF', async () => {
        await withWorkDir(async (dir) => {
            const filePath = await writeTempFile(dir, 'blank.pdf', await createPdfBuffer());
            assert.equal(await pdfHasTextLayer(filePath), false);
        });
    });
});

describe('conversion service', () => {
    it('converts docx to pdf and validates the output', async () => {
        const service = createConversionService({
            providerFactory: () => fakeProvider(({ filePath }) => writePdfOutput(filePath)),
            logger: silenceLogger,
        });

        await withWorkDir(async (dir) => {
            const inputPath = await writeTempFile(dir, 'input.docx', await createDocxBuffer());

            const result = await service.convert({
                inputPath,
                originalName: 'My Report.docx',
                direction: 'word-to-pdf',
                outputDir: dir,
            });

            assert.equal(path.extname(result.outputPath), '.pdf');
            assert.equal(result.downloadName, 'My Report.pdf');
            assert.equal(result.mimeType, 'application/pdf');
            const output = await fs.promises.readFile(result.outputPath);
            assert.ok(output.subarray(0, 5).equals(Buffer.from('%PDF-')));
        });
    });

    it('passes the provider the correct formats', async () => {
        let captured;
        const service = createConversionService({
            providerFactory: () => fakeProvider(async ({ filePath, toFormat, params, fromFormat }) => {
                captured = { toFormat, fromFormat, params };
                await writeDocxOutput(filePath);
            }),
            logger: silenceLogger,
        });

        await withWorkDir(async (dir) => {
            const inputPath = await writeTempFile(dir, 'input.pdf', await createPdfBuffer('Hello'));
            await service.convert({
                inputPath,
                originalName: 'input.pdf',
                direction: 'pdf-to-word',
                outputDir: dir,
            });

            assert.equal(captured.toFormat, 'docx');
            assert.equal(captured.fromFormat, 'pdf');
            assert.equal(captured.params.OcrMode, 'auto');
            assert.equal(captured.params.OcrEngine, 'native');
        });
    });

    it('forces OCR for scanned PDFs', async () => {
        let capturedParams;
        const service = createConversionService({
            providerFactory: () => fakeProvider(async ({ filePath, params }) => {
                capturedParams = params;
                await writeDocxOutput(filePath);
            }),
            logger: silenceLogger,
        });

        await withWorkDir(async (dir) => {
            const inputPath = await writeTempFile(dir, 'scanned.pdf', await createPdfBuffer());
            await service.convert({
                inputPath,
                originalName: 'scanned.pdf',
                direction: 'pdf-to-word',
                outputDir: dir,
            });
            assert.equal(capturedParams.OcrMode, 'force');
        });
    });

    it('maps a quota error to a 503', async () => {
        const service = createConversionService({
            providerFactory: () => ({ convert: async () => { throw providerError(4014, 400); } }),
            logger: silenceLogger,
        });

        await withWorkDir(async (dir) => {
            const inputPath = await writeTempFile(dir, 'input.docx', await createDocxBuffer());
            await assert.rejects(
                service.convert({ inputPath, originalName: 'input.docx', direction: 'word-to-pdf', outputDir: dir }),
                (error) => {
                    assert.equal(error.statusCode, 503);
                    assert.match(error.message, /quota/i);
                    return true;
                }
            );
        });
    });

    it('maps an invalid key error without leaking provider details', async () => {
        const service = createConversionService({
            providerFactory: () => ({ convert: async () => { throw providerError(4010, 401); } }),
            logger: silenceLogger,
        });

        await withWorkDir(async (dir) => {
            const inputPath = await writeTempFile(dir, 'input.docx', await createDocxBuffer());
            await assert.rejects(
                service.convert({ inputPath, originalName: 'input.docx', direction: 'word-to-pdf', outputDir: dir }),
                (error) => {
                    assert.equal(error.statusCode, 502);
                    assert.doesNotMatch(error.message, /4010|secret|ConvertAPI/i);
                    return true;
                }
            );
        });
    });

    it('maps password-protected documents to a 422', async () => {
        const service = createConversionService({
            providerFactory: () => ({ convert: async () => { throw providerError(5003, 400); } }),
            logger: silenceLogger,
        });

        await withWorkDir(async (dir) => {
            const inputPath = await writeTempFile(dir, 'input.docx', await createDocxBuffer());
            await assert.rejects(
                service.convert({ inputPath, originalName: 'input.docx', direction: 'word-to-pdf', outputDir: dir }),
                (error) => {
                    assert.equal(error.statusCode, 422);
                    assert.match(error.message, /password/i);
                    return true;
                }
            );
        });
    });

    it('maps timeouts to a 504', async () => {
        const service = createConversionService({
            providerFactory: () => ({ convert: () => new Promise(() => { }) }),
            timeoutMs: 50,
            logger: silenceLogger,
        });

        await withWorkDir(async (dir) => {
            const inputPath = await writeTempFile(dir, 'input.docx', await createDocxBuffer());
            await assert.rejects(
                service.convert({ inputPath, originalName: 'input.docx', direction: 'word-to-pdf', outputDir: dir }),
                (error) => {
                    assert.equal(error.statusCode, 504);
                    return true;
                }
            );
        });
    });

    it('rejects an empty provider response', async () => {
        const service = createConversionService({
            providerFactory: () => ({ convert: async () => ({ files: [] }) }),
            logger: silenceLogger,
        });

        await withWorkDir(async (dir) => {
            const inputPath = await writeTempFile(dir, 'input.docx', await createDocxBuffer());
            await assert.rejects(
                service.convert({ inputPath, originalName: 'input.docx', direction: 'word-to-pdf', outputDir: dir }),
                (error) => {
                    assert.equal(error.statusCode, 502);
                    return true;
                }
            );
        });
    });

    it('rejects a provider response that is not a real PDF', async () => {
        const service = createConversionService({
            providerFactory: () => fakeProvider(async ({ filePath }) => {
                await fs.promises.writeFile(filePath, Buffer.from('definitely not a pdf '.repeat(10)));
            }),
            logger: silenceLogger,
        });

        await withWorkDir(async (dir) => {
            const inputPath = await writeTempFile(dir, 'input.docx', await createDocxBuffer());
            await assert.rejects(
                service.convert({ inputPath, originalName: 'input.docx', direction: 'word-to-pdf', outputDir: dir }),
                (error) => {
                    assert.equal(error.statusCode, 502);
                    assert.equal(error.code, 'PROVIDER_INVALID_OUTPUT');
                    return true;
                }
            );

            const leftovers = await fs.promises.readdir(dir);
            assert.deepEqual(leftovers, ['input.docx']);
        });
    });

    it('fails clearly when ConvertAPI is not configured', async () => {
        const previous = process.env.CONVERTAPI_SECRET;
        delete process.env.CONVERTAPI_SECRET;

        try {
            const service = createConversionService({ logger: silenceLogger });

            await withWorkDir(async (dir) => {
                const inputPath = await writeTempFile(dir, 'input.docx', await createDocxBuffer());
                await assert.rejects(
                    service.convert({ inputPath, originalName: 'input.docx', direction: 'word-to-pdf', outputDir: dir }),
                    (error) => {
                        assert.equal(error.statusCode, 500);
                        assert.equal(error.code, 'CONVERSION_NOT_CONFIGURED');
                        assert.match(error.message, /not configured/i);
                        return true;
                    }
                );
            });
        } finally {
            if (previous === undefined) delete process.env.CONVERTAPI_SECRET;
            else process.env.CONVERTAPI_SECRET = previous;
        }
    });

    it('cleans up the temp folder it owns on failure', async () => {
        const root = await makeTempDir('convertify-owned-');
        const previous = process.env.CONVERTIFY_TEMP_DIR;
        process.env.CONVERTIFY_TEMP_DIR = root;

        try {
            const service = createConversionService({
                providerFactory: () => ({ convert: async () => { throw providerError(5001, 400); } }),
                logger: silenceLogger,
            });

            await withWorkDir(async (dir) => {
                const inputPath = await writeTempFile(dir, 'input.docx', await createDocxBuffer());
                await assert.rejects(
                    service.convert({ inputPath, originalName: 'input.docx', direction: 'word-to-pdf' })
                );
            });

            const remaining = await fs.promises.readdir(root);
            assert.deepEqual(remaining, []);
        } finally {
            if (previous === undefined) delete process.env.CONVERTIFY_TEMP_DIR;
            else process.env.CONVERTIFY_TEMP_DIR = previous;
            await removeDir(root);
        }
    });
});

describe('download naming', () => {
    it('builds safe download names', () => {
        assert.equal(buildDownloadName('Q1 report.docx', CONVERSION_DIRECTIONS['word-to-pdf']), 'Q1 report.pdf');
        assert.equal(buildDownloadName('../../evil.pdf', CONVERSION_DIRECTIONS['pdf-to-word']), 'evil.docx');
        assert.equal(buildDownloadName('', CONVERSION_DIRECTIONS['word-to-pdf']), 'word-to-pdf.pdf');
        assert.equal(buildDownloadName('a<b>c?.docx', CONVERSION_DIRECTIONS['word-to-pdf']), 'a b c.pdf');
    });
});

