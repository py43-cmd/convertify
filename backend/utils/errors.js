/**
 * Application error with an HTTP status code and a client-safe message.
 * Anything that is not an AppError is treated as an unexpected server error
 * by the global error handler and is never exposed to the client.
 */
export class AppError extends Error {
    constructor(statusCode, message, options = {}) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = options.code || 'APP_ERROR';
        this.expose = options.expose !== false;
        this.details = options.details;
        if (options.cause) this.cause = options.cause;
    }
}

export const isAppError = (error) => error instanceof AppError;

export const badRequest = (message, options) => new AppError(400, message, options);
export const unprocessable = (message, options) => new AppError(422, message, options);
export const tooLarge = (message, options) => new AppError(413, message, options);
export const badGateway = (message, options) => new AppError(502, message, options);
export const serviceUnavailable = (message, options) => new AppError(503, message, options);
export const serverError = (message, options) => new AppError(500, message, options);
