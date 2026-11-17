const readPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const MAX_UPLOAD_SIZE_MB = readPositiveInt(process.env.MAX_UPLOAD_SIZE_MB, 20);
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
export const MAX_MERGE_FILES = readPositiveInt(process.env.MAX_MERGE_FILES, 10);
export const MAX_CONVERSION_FILES = 1;
