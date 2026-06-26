import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';
import passport from './config/passport.js';

// Config, routes and middlewares
import connectDB from './config/db.js';
import documentRoutes from './routes/documentRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// ─── Redis Client Setup (Fixed to prevent startup hanging) ───────────────────
let sessionStore = undefined; // undefined = express-session default in-memory store

try {
    const redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
        socket: {
            reconnectStrategy: () => {
                // Return false immediately so it doesn't loop forever blocking execution
                return false;
            }
        }
    });

    // Handle and suppress connection errors silently so the console isn't flooded
    redisClient.on('error', (err) => { /* Quietly handle background errors */ });

    // Force connection but catch rejection inline to prevent async stalling
    await redisClient.connect().catch(() => {
        console.warn('⚠️  Redis connection rejected — falling back to memory store.');
    });

    // Only set up RedisStore if the connection actually succeeded
    if (redisClient.isOpen) {
        sessionStore = new RedisStore({ client: redisClient });
        console.log('✅ Redis connected — sessions stored in Redis.');
    }
} catch (error) {
    console.warn('⚠️  Redis unavailable — sessions will use in-memory store (OK for development).');
}

// ─── CORS (allow React frontend to send cookies) ──────────────────────────────
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like curl) or matching allowed list or any localhost port
        if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Required for cookies/sessions to work cross-origin
}));

app.use(express.json());

// ─── Session Middleware ────────────────────────────────────────────────────────
app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'convertify_super_secret_key_change_in_production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,            // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
    },
}));

// ─── Passport Middlewares ─────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from the React app's dist folder
const reactDistPath = path.join(__dirname, '../react/dist');
if (fs.existsSync(reactDistPath)) {
    app.use(express.static(reactDistPath));
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', documentRoutes);
app.use('/api/auth', authRoutes);

// Global Error Handler Middleware
app.use(errorHandler);

// Catch-all route to serve index.html for client-side routing
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../react/dist/index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Not Found');
    }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(port, () => {
    console.log(`🚀 Backend server running on http://localhost:${port}`);
});

export default app;