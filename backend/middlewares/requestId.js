import crypto from 'node:crypto';

/**
 * Attaches a request id used in logs and in the X-Request-Id response header.
 * Incoming ids are length-limited so they cannot flood log lines.
 */
export const requestId = (req, res, next) => {
    const incoming = String(req.get('x-request-id') || '').trim();
    req.id = /^[A-Za-z0-9._-]{1,64}$/.test(incoming) ? incoming : crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
};
