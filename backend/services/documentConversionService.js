import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import ConvertApi from 'convertapi';
import { PDFDocument } from 'pdf-lib';
import { PDFParse } from 'pdf-parse';
import { AppError } from '../utils/errors.js';

/**
 * The only conversion engine used by Convertify is ConvertAPI.
 * There is intentionally no local fallback: if the provider fails, the request
 * fails with a clear error instead of returning a low-fidelity document.
 */
export const CONVERSION_DIRECTIONS = Object.freeze({
    'word-to-pdf': Object.freeze({
        id: 'word-to-pdf',
        label: 'Word to PDF',
        fromFormat: 'docx',
        toFormat: 'pdf',
        inputKind: 'docx',
        outputExtension: '.pdf',
        mimeType: 'application/pdf',
    }),
    'pdf-to-word': Object.freeze({
        id: 'pdf-to-word',
        label: 'PDF to Word',
        fromFormat: 'pdf',
        toFormat: 'docx',
        inputKind: 'pdf',
        outputExtension: '.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
});

const PDF_SIGNATURE = Buffer.from('%PDF-');
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const MAX_SNIFF_BYTES = 1024;
const MIN_OUTPUT_BYTES = 32;

const readPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getTempRoot = () =>
    path.resolve(process.env.CONVERTIFY_TEMP_DIR || path.join(os.tmpdir(), 'convertify'));

export const createRequestTempDir = async (prefix = 'req') => {
    const dir = path.join(getTempRoot(), `${prefix}-${Date.now()}-${crypto.randomUUID()}`);
    await fs.promises.mkdir(dir, { recursive: true });
    return dir;
};

export const removeDirectory = async (dir) => {
    if (!dir) return;
    try {
        await fs.promises.rm(dir, { recursive: true, force: true, maxRetries: 3 });
    } catch (error) {
        console.error(`[cleanup] Could not remove temp directory ${dir}: ${error.message}`);
    }
};

export const safeUnlink = async (filePath) => {
    if (!filePath) return;
    try {
        await fs.promises.unlink(filePath);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`[cleanup] Could not remove temp file ${filePath}: ${error.message}`);
        }
    }
};

const readHead = async (filePath, length = MAX_SNIFF_BYTES) => {
    const handle = await fs.promises.open(filePath, 'r');
    try {
        const buffer = Buffer.alloc(length);
        const { bytesRead } = await handle.read(buffer, 0, length, 0);
        return buffer.subarray(0, bytesRead);
    } finally {
        await handle.close();
    }
};

const assertNonEmptyFile = async (filePath, label) => {
    const stat = await fs.promises.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) {
        throw new AppError(400, `${label} could not be read. Please upload it again.`);
    }
    if (stat.size === 0) {
        throw new AppError(400, `${label} is empty. Please upload a non-empty file.`);
    }
    return stat;
};

/**
 * Loads and structurally validates a PDF. Returning the loaded document lets
 * the merge controller reuse the parse instead of reading the file twice.
 */
export const loadPdf = async (filePath, { label = 'The PDF file' } = {}) => {
    const stat = await assertNonEmptyFile(filePath, label);
    const head = await readHead(filePath);
    if (head.indexOf(PDF_SIGNATURE) === -1) {
        throw new AppError(400, `${label} is not a valid PDF file.`);
    }

    const bytes = await fs.promises.readFile(filePath);
    try {
        const document = await PDFDocument.load(bytes, { updateMetadata: false });
        return { document, bytes, size: stat.size };
    } catch (error) {
        if (error?.name === 'EncryptedPDFError' || /encrypt|password/i.test(error?.message || '')) {
            throw new AppError(
                422,
                `${label} is password protected or encrypted and cannot be processed.`,
                { code: 'PDF_ENCRYPTED', cause: error }
            );
        }
        throw new AppError(
            422,
            `${label} appears to be corrupted and could not be read.`,
            { code: 'PDF_CORRUPTED', cause: error }
        );
    }
};

/**
 * Validates a DOCX upload by checking the ZIP container and the required
 * OOXML entries. This rejects renamed files even when the MIME type is spoofed.
 */
export const loadDocx = async (filePath, { label = 'The Word document' } = {}) => {
    const stat = await assertNonEmptyFile(filePath, label);
    const bytes = await fs.promises.readFile(filePath);

    if (bytes.length < 4 || !bytes.subarray(0, 4).equals(ZIP_SIGNATURE)) {
        throw new AppError(400, `${label} is not a valid .docx file.`, { code: 'DOCX_INVALID' });
    }

    // ZIP entry names are stored uncompressed in the central directory, so a
    // plain ASCII scan is enough to confirm this is a Word OOXML package.
    const entries = bytes.toString('latin1');
    if (!entries.includes('[Content_Types].xml') || !entries.includes('word/')) {
        throw new AppError(400, `${label} is not a valid .docx file.`, { code: 'DOCX_INVALID' });
    }

    return { bytes, size: stat.size };
};

/**
 * Returns true/false when the text layer could be inspected, or null when the
 * inspection was inconclusive. Used only to choose the OCR mode; it is never
 * used to rebuild a document.
 */
export const pdfHasTextLayer = async (filePath) => {
    let parser;
    try {
        parser = new PDFParse({ data: await fs.promises.readFile(filePath) });
        const result = await parser.getText({ first: 3 });
        const text = (result?.text || '')
            // pdf-parse v2 appends page markers such as "-- 1 of 3 --".
            .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '')
            .replace(/\s+/g, '');
        return text.length > 0;
    } catch {
        return null;
    } finally {
        if (parser) await parser.destroy().catch(() => { });
    }
};

const assertValidPdfOutput = async (filePath) => {
    const stat = await fs.promises.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile() || stat.size < MIN_OUTPUT_BYTES) {
        throw new AppError(
            502,
            'The conversion service returned an empty PDF. Please try again.',
            { code: 'PROVIDER_EMPTY_OUTPUT' }
        );
    }
    const head = await readHead(filePath, 5);
    if (!head.equals(PDF_SIGNATURE)) {
        throw new AppError(
            502,
            'The conversion service returned an invalid PDF. Please try again.',
            { code: 'PROVIDER_INVALID_OUTPUT' }
        );
    }
    try {
        await PDFDocument.load(await fs.promises.readFile(filePath), { updateMetadata: false });
    } catch (error) {
        throw new AppError(
            502,
            'The conversion service returned an unreadable PDF. Please try again.',
            { code: 'PROVIDER_INVALID_OUTPUT', cause: error }
        );
    }
    return stat;
};

const assertValidDocxOutput = async (filePath) => {
    const stat = await fs.promises.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile() || stat.size < MIN_OUTPUT_BYTES) {
        throw new AppError(
            502,
            'The conversion service returned an empty Word document. Please try again.',
            { code: 'PROVIDER_EMPTY_OUTPUT' }
        );
    }
    const bytes = await fs.promises.readFile(filePath);
    if (bytes.length < 4 || !bytes.subarray(0, 4).equals(ZIP_SIGNATURE)) {
        throw new AppError(
            502,
            'The conversion service returned an invalid Word document. Please try again.',
            { code: 'PROVIDER_INVALID_OUTPUT' }
        );
    }
    const entries = bytes.toString('latin1');
    if (!entries.includes('[Content_Types].xml') || !entries.includes('word/')) {
        throw new AppError(
            502,
            'The conversion service returned an invalid Word document. Please try again.',
            { code: 'PROVIDER_INVALID_OUTPUT' }
        );
    }
    return stat;
};

const PROVIDER_MESSAGES = {
    4000: { status: 400, message: 'The conversion service rejected the file parameters.' },
    4001: { status: 400, message: 'The conversion service could not read the uploaded file.' },
    4002: { status: 400, message: 'The conversion request was malformed.' },
    4005: { status: 400, message: 'The conversion service could not read the uploaded file.' },
    4010: { status: 502, message: 'The conversion service rejected the server credentials. Please contact support.' },
    4011: { status: 502, message: 'The conversion service rejected the server credentials. Please contact support.' },
    4012: { status: 502, message: 'The conversion service rejected the server credentials. Please contact support.' },
    4013: { status: 502, message: 'The conversion service credentials are not configured correctly.' },
    4014: { status: 503, message: 'The conversion service quota is exhausted. Please try again later.' },
    4015: { status: 503, message: 'The conversion service account is inactive. Please try again later.' },
    5000: { status: 504, message: 'The conversion service timed out. Please try again.' },
    5001: { status: 422, message: 'The document could not be converted. It may use an unsupported layout or be damaged.' },
    5002: { status: 422, message: 'The document is damaged and could not be converted.' },
    5003: { status: 422, message: 'The document is password protected and cannot be converted.' },
    5008: { status: 502, message: 'The conversion service could not access the uploaded file. Please try again.' },
    5009: { status: 502, message: 'The conversion service could not access the uploaded file. Please try again.' },
    50050: { status: 502, message: 'The conversion service failed unexpectedly. Please try again.' },
};

const toSafeProviderError = (error, direction, extra = {}) => {
    const code = Number(error?.data?.Code);
    const httpStatus = Number(error?.response?.status);
    const networkCode = error?.cause?.code || error?.code;

    if (PROVIDER_MESSAGES[code]) {
        const mapped = PROVIDER_MESSAGES[code];
        let message = mapped.message;
        if (direction.id === 'pdf-to-word' && (code === 5000 || code === 5001) && extra.scanned) {
            message = 'This looks like a scanned PDF and OCR could not extract readable text from it.';
        }
        return new AppError(mapped.status, message, { code: `PROVIDER_${code}`, cause: error });
    }

    if (httpStatus === 503) {
        return new AppError(
            503,
            'The conversion service is temporarily unavailable. Please try again in a few moments.',
            { code: 'PROVIDER_UNAVAILABLE', cause: error }
        );
    }
    if (httpStatus === 401 || httpStatus === 403) {
        return new AppError(
            502,
            'The conversion service rejected the server credentials. Please contact support.',
            { code: 'PROVIDER_AUTH', cause: error }
        );
    }
    if (httpStatus === 429) {
        return new AppError(
            429,
            'Too many conversions were requested. Please wait and try again.',
            { code: 'PROVIDER_RATE_LIMIT', cause: error }
        );
    }
    if (['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET'].includes(networkCode)) {
        return new AppError(
            504,
            'The conversion service timed out. Please try again.',
            { code: 'PROVIDER_TIMEOUT', cause: error }
        );
    }
    if (['ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN', 'ENETUNREACH'].includes(networkCode)) {
        return new AppError(
            502,
            'The conversion service is unreachable. Please try again later.',
            { code: 'PROVIDER_UNREACHABLE', cause: error }
        );
    }
    return new AppError(
        502,
        'The conversion service could not process this document. Please try again.',
        { code: 'PROVIDER_ERROR', cause: error }
    );
};

const withTimeout = async (promise, timeoutMs, message, code) => {
    let timer;
    // Prevent an unhandled rejection if the provider settles after the timeout.
    promise.catch(() => { });
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new AppError(504, message, { code })), timeoutMs);
            }),
        ]);
    } finally {
        clearTimeout(timer);
    }
};

const sanitizeBaseName = (originalName, fallback) => {
    const raw = String(originalName || '');
    const base = path.basename(raw, path.extname(raw));
    const cleaned = base
        .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^\.+/, '');
    return (cleaned || fallback).slice(0, 120);
};

export const buildDownloadName = (originalName, direction) =>
    `${sanitizeBaseName(originalName, direction.id)}${direction.outputExtension}`;

export const createConversionService = ({
    providerFactory,
    timeoutMs = readPositiveInt(process.env.CONVERTAPI_TIMEOUT_SECONDS, 120) * 1000,
    downloadTimeoutMs = 120 * 1000,
    logger = console,
} = {}) => {
    const factory = providerFactory || (() => {
        const secret = (process.env.CONVERTAPI_SECRET || '').trim();
        if (!secret) {
            throw new AppError(
                500,
                'Document conversion is not configured on the server.',
                { code: 'CONVERSION_NOT_CONFIGURED' }
            );
        }
        return new ConvertApi(secret, {
            conversionTimeout: Math.ceil(timeoutMs / 1000),
            uploadTimeout: 120,
            downloadTimeout: 120,
        });
    });

    let provider = null;
    let providerKey = null;

    const getProvider = () => {
        const key = (process.env.CONVERTAPI_SECRET || '').trim() || 'injected';
        if (!provider || providerKey !== key) {
            provider = factory();
            providerKey = key;
        }
        return provider;
    };

    const convert = async ({
        inputPath,
        originalName,
        direction: directionId,
        requestId = crypto.randomUUID(),
        outputDir,
    }) => {
        const direction = CONVERSION_DIRECTIONS[directionId];
        if (!direction) {
            throw new AppError(400, 'Unsupported conversion direction.');
        }

        let ownsWorkDir = false;
        let workDir = outputDir;
        let outputPath;

        try {
            if (direction.inputKind === 'pdf') {
                await loadPdf(inputPath, { label: 'The PDF file' });
            } else {
                await loadDocx(inputPath, { label: 'The Word document' });
            }

            let scanned = false;
            if (direction.id === 'pdf-to-word') {
                const hasText = await pdfHasTextLayer(inputPath);
                // If inconclusive, be conservative and force OCR for better results
                scanned = hasText === false || hasText === null;
            }

            const params = { File: inputPath };
            if (direction.id === 'pdf-to-word') {
                // ConvertAPI's documented OCR switch: force OCR when the PDF has
                // no text layer or when detection is inconclusive.
                params.OcrMode = scanned ? 'force' : 'auto';
                params.OcrEngine = 'native';
                params.Layout = 'flowing';
            }

            const client = getProvider();

            let result;
            try {
                result = await withTimeout(
                    Promise.resolve().then(() =>
                        client.convert(direction.toFormat, params, direction.fromFormat)
                    ),
                    timeoutMs,
                    'The conversion service timed out. Please try again.',
                    'PROVIDER_TIMEOUT'
                );
            } catch (error) {
                if (error instanceof AppError && error.code === 'PROVIDER_TIMEOUT') {
                    logger.error(`[${requestId}] ConvertAPI timeout while converting ${direction.id}`);
                    throw error;
                }
                logger.error(
                    `[${requestId}] ConvertAPI error for ${direction.id}: status=${error?.response?.status} code=${error?.data?.Code} message=${error?.message}`
                );
                throw toSafeProviderError(error, direction, { scanned });
            }

            const files = Array.isArray(result?.files) ? result.files : [];
            if (files.length === 0) {
                logger.error(`[${requestId}] ConvertAPI returned no output files for ${direction.id}`);
                throw new AppError(
                    502,
                    'The conversion service returned no document. Please try again.',
                    { code: 'PROVIDER_EMPTY_RESPONSE' }
                );
            }

            if (!workDir) {
                workDir = await createRequestTempDir(direction.id);
                ownsWorkDir = true;
            }

            outputPath = path.join(
                workDir,
                `output-${crypto.randomUUID()}${direction.outputExtension}`
            );

            try {
                await withTimeout(
                    Promise.resolve().then(() => files[0].save(outputPath)),
                    downloadTimeoutMs,
                    'Downloading the converted document timed out. Please try again.',
                    'PROVIDER_DOWNLOAD_TIMEOUT'
                );
            } catch (error) {
                logger.error(`[${requestId}] Could not download ConvertAPI output: ${error?.message}`);
                if (error instanceof AppError) throw error;
                throw new AppError(
                    502,
                    'The converted document could not be downloaded. Please try again.',
                    { code: 'PROVIDER_DOWNLOAD_FAILED', cause: error }
                );
            }

            const stat = direction.id === 'word-to-pdf'
                ? await assertValidPdfOutput(outputPath)
                : await assertValidDocxOutput(outputPath);

            logger.info(
                `[${requestId}] ConvertAPI ${direction.id} succeeded (${stat.size} bytes${scanned ? ', OCR forced' : ''})`
            );

            return {
                outputPath,
                workDir,
                ownsWorkDir,
                size: stat.size,
                mimeType: direction.mimeType,
                downloadName: buildDownloadName(originalName, direction),
                scanned,
            };
        } catch (error) {
            await safeUnlink(outputPath);
            if (ownsWorkDir) await removeDirectory(workDir);
            throw error;
        }
    };

    return {
        convert,
        resetProvider: () => { provider = null; providerKey = null; },
    };
};

let activeProviderFactory = null;

const sharedService = createConversionService({
    providerFactory: () => (activeProviderFactory
        ? activeProviderFactory()
        : createDefaultProviderFactory()()),
});

export const createDefaultProviderFactory = () => () => {
    const secret = (process.env.CONVERTAPI_SECRET || '').trim();
    if (!secret) {
        throw new AppError(
            500,
            'Document conversion is not configured on the server.',
            { code: 'CONVERSION_NOT_CONFIGURED' }
        );
    }
    return new ConvertApi(secret, {
        conversionTimeout: readPositiveInt(process.env.CONVERTAPI_TIMEOUT_SECONDS, 120),
        uploadTimeout: 120,
        downloadTimeout: 120,
    });
};

export const documentConversionService = sharedService;

/** Test-only seam: inject a fake provider without touching production code paths. */
export const setProviderFactoryForTests = (factory) => {
    activeProviderFactory = factory;
    sharedService.resetProvider();
};

export const resetProviderFactoryForTests = () => {
    activeProviderFactory = null;
    sharedService.resetProvider();
};
