import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import session from 'express-session';
import passport from './config/passport.js';
import documentRoutes from './routes/documentRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestId } from './middlewares/requestId.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildCorsOptions = () => {
    const allowedOrigins = [
        process.env.FRONTEND_URL,
        'https://convertify-vvl8.vercel.app',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
    ].filter(Boolean);

    return {
        origin: (origin, callback) => {
            if (
                !origin ||
                allowedOrigins.includes(origin) ||
                /^http:\/\/localhost:\d+$/.test(origin)
            ) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        exposedHeaders: ['Content-Disposition', 'X-Request-Id'],
    };
};

const resolveSessionSecret = () => {
    const secret = (process.env.SESSION_SECRET || '').trim();
    if (secret) return secret;

    if (process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET must be set when NODE_ENV=production.');
    }

    console.warn('⚠️  SESSION_SECRET is not set — using an ephemeral development secret.');
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Builds the Express application without opening sockets or connecting to the
 * database, so it can be reused by tests and by the server bootstrap.
 *
 * @param {object} [options]
 * @param {import('express-session').Store} [options.sessionStore] Shared session store (Redis in production).
 * @param {import('express').RequestHandler} [options.authStub] Test-only seam mounted before routes.
 */
export const createApp = ({ sessionStore, authStub } = {}) => {
    const app = express();

    app.disable('x-powered-by');
    app.set('trust proxy', 1);

    app.use(requestId);
    app.use(cors(buildCorsOptions()));
    app.use(express.json({ limit: '1mb' }));

    app.use(session({
        store: sessionStore,
        secret: resolveSessionSecret(),
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7,
            sameSite: 'lax',
        },
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    if (authStub) app.use(authStub);

    app.get('/api/health', (req, res) => {
        res.json({ success: true, status: 'ok', uptime: process.uptime() });
    });

    app.use('/api', documentRoutes);
    app.use('/api/auth', authRoutes);

    app.use('/api', (req, res) => {
        res.status(404).json({ success: false, message: 'API endpoint not found.', code: 'NOT_FOUND' });
    });

    const reactDistPath = path.join(__dirname, '../react/dist');
    if (fs.existsSync(reactDistPath)) {
        app.use(express.static(reactDistPath));
    }

    app.get('*', (req, res) => {
        const indexPath = path.join(reactDistPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            return res.sendFile(indexPath);
        }
        return res.status(404).send('Not Found');
    });

    app.use(errorHandler);

    return app;
};

export default createApp;
