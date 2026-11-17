export const MAX_UPLOAD_SIZE_MB = 20;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
export const MAX_MERGE_FILES = 10;

export const TOOL_ACCEPT = Object.freeze({
    merge: '.pdf',
    'pdf-to-word': '.pdf',
    'word-to-pdf': '.docx',
});

export const TOOL_LABEL = Object.freeze({
    merge: 'Merge PDFs',
    'pdf-to-word': 'PDF to Word',
    'word-to-pdf': 'Word to PDF',
});

// eslint-disable-next-line no-control-regex
const INVALID_FILENAME_CHARS = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;

export class ApiError extends Error {
    constructor(message, status = 0, code = 'REQUEST_FAILED') {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}

export const formatFileSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes < 0) return '0 MB';
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

/**
 * Validates a browser file selection before it is uploaded. The server repeats
 * these checks; this exists to give instant feedback and avoid wasted uploads.
 */
export const validateSelection = (incoming, activeTool, options = {}) => {
    const {
        maxBytes = MAX_UPLOAD_BYTES,
        maxMergeFiles = MAX_MERGE_FILES,
        existingCount = 0,
    } = options;

    const files = Array.from(incoming || []);
    const accept = TOOL_ACCEPT[activeTool];

    if (!accept) {
        return { files: [], error: 'Please choose a conversion tool first.' };
    }
    if (files.length === 0) {
        return { files: [], error: null };
    }
    if (activeTool === 'merge' && existingCount + files.length > maxMergeFiles) {
        return {
            files: [],
            error: `You can merge up to ${maxMergeFiles} PDF files at once.`,
        };
    }

    const label = TOOL_LABEL[activeTool];

    for (const file of files) {
        if (!String(file?.name || '').toLowerCase().endsWith(accept)) {
            return {
                files: [],
                error: `${label} accepts only ${accept.toUpperCase()} files.`,
            };
        }
        if (!Number.isFinite(file.size) || file.size === 0) {
            return { files: [], error: `"${file.name}" is empty. Please choose another file.` };
        }
        if (file.size > maxBytes) {
            return {
                files: [],
                error: `"${file.name}" is ${formatFileSize(file.size)}. The maximum size is ${MAX_UPLOAD_SIZE_MB} MB.`,
            };
        }
    }

    return { files, error: null };
};

export const sanitizeFileName = (name, fallback = 'download') => {
    const raw = String(name || '');
    const base = raw.split(/[\\/]/).pop() || '';
    const cleaned = base
        .replace(INVALID_FILENAME_CHARS, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^\.+/, '');
    return (cleaned || fallback).slice(0, 120);
};

const stripExtension = (name) => String(name || '').replace(/\.[^.]+$/, '');

export const buildDownloadName = (activeTool, originalName) => {
    if (activeTool === 'merge') return 'merged.pdf';
    const extension = activeTool === 'pdf-to-word' ? '.docx' : '.pdf';
    const base = sanitizeFileName(stripExtension(originalName), 'document');
    return `${base}${extension}`;
};

/**
 * Parses `Content-Disposition`, including the RFC 5987 `filename*` form that
 * Express uses for non-ASCII names.
 */
export const parseContentDispositionFilename = (header) => {
    if (!header) return null;

    const encoded = /filename\*\s*=\s*([^;]+)/i.exec(header);
    if (encoded) {
        const value = encoded[1].trim().replace(/^["']|["']$/g, '');
        const parts = value.split("''");
        if (parts.length === 2) {
            try {
                const decoded = decodeURIComponent(parts[1]);
                if (decoded) return sanitizeFileName(decoded, null);
            } catch {
                // Fall through to the plain filename parameter.
            }
        }
    }

    const plain = /filename\s*=\s*("((?:\\.|[^"\\])*)"|([^;]+))/i.exec(header);
    if (plain) {
        const value = (plain[2] ?? plain[3] ?? '').trim();
        if (value) return sanitizeFileName(value, null);
    }

    return null;
};

export const getResponseFilename = (response, fallback) => {
    const header = response?.headers?.get?.('content-disposition');
    return parseContentDispositionFilename(header) || sanitizeFileName(fallback, 'download');
};

const STATUS_MESSAGES = {
    400: 'The request could not be processed. Please check the selected files.',
    401: 'Your session has expired. Please log in again.',
    403: 'You are not allowed to perform this conversion.',
    413: `File is too large. The maximum size is ${MAX_UPLOAD_SIZE_MB} MB.`,
    429: 'Too many requests. Please wait a moment and try again.',
    502: 'The conversion service is temporarily unavailable. Please try again.',
    503: 'The conversion service is temporarily unavailable. Please try again.',
    504: 'The conversion took too long. Please try again.',
};

export const parseErrorBody = (body, status = 0) => {
    if (body && typeof body === 'object') {
        if (typeof body.message === 'string' && body.message.trim()) return body.message.trim();
        if (typeof body.error === 'string' && body.error.trim()) return body.error.trim();
        if (body.error && typeof body.error === 'object' && typeof body.error.message === 'string') {
            return body.error.message.trim();
        }
    }
    if (typeof body === 'string') {
        const text = body.trim();
        if (text && !text.startsWith('<') && text.length <= 300) return text;
    }
    return STATUS_MESSAGES[status] || 'Something went wrong while processing your files. Please try again.';
};

const readBody = async (response) => {
    const contentType = response?.headers?.get?.('content-type') || '';
    try {
        if (contentType.includes('application/json')) {
            return await response.json();
        }
        const text = await response.text();
        return text || null;
    } catch {
        return null;
    }
};

/**
 * Posts a multipart form to the API and returns the downloaded blob + filename.
 * `credentials: 'include'` is required because the API is session-cookie based.
 */
export const submitConversion = async ({
    endpoint,
    formData,
    fallbackName,
    fetchImpl = globalThis.fetch,
}) => {
    let response;
    try {
        response = await fetchImpl(endpoint, {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });
    } catch {
        throw new ApiError(
            'Could not reach the server. Check your connection and try again.',
            0,
            'NETWORK_ERROR'
        );
    }

    if (!response.ok) {
        const body = await readBody(response);
        throw new ApiError(
            parseErrorBody(body, response.status),
            response.status,
            body?.code || 'REQUEST_FAILED'
        );
    }

    const blob = await response.blob();
    const filename = getResponseFilename(response, fallbackName);
    return { blob, filename };
};

/**
 * Saves a blob using a temporary object URL. The URL is revoked on a later
 * tick because some browsers cancel downloads revoked synchronously.
 */
export const saveBlob = ({
    blob,
    filename,
    urlApi = globalThis.URL,
    documentRef = globalThis.document,
    schedule = (callback) => setTimeout(callback, 4000),
}) => {
    const url = urlApi.createObjectURL(blob);
    const anchor = documentRef.createElement('a');
    anchor.href = url;
    anchor.download = sanitizeFileName(filename, 'download');
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    documentRef.body.appendChild(anchor);
    anchor.click();
    documentRef.body.removeChild(anchor);
    schedule(() => urlApi.revokeObjectURL(url));
    return url;
};
