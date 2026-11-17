import 'dotenv/config';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';
import connectDB from './config/db.js';
import { createApp } from './app.js';

const port = Number.parseInt(process.env.PORT, 10) || 3000;

const createSessionStore = async () => {
    if (!process.env.REDIS_URL) {
        console.warn('⚠️  REDIS_URL is not set — sessions will use the in-memory store (development only).');
        return undefined;
    }

    try {
        const redisClient = createClient({
            url: process.env.REDIS_URL,
            socket: {
                reconnectStrategy: () => false,
            },
        });

        redisClient.on('error', () => { /* Connection failures are reported below. */ });

        await redisClient.connect();
        console.log('✅ Redis connected — sessions stored in Redis.');
        return new RedisStore({ client: redisClient });
    } catch (error) {
        console.warn(`⚠️  Redis unavailable (${error.message}) — sessions will use the in-memory store.`);
        return undefined;
    }
};

const start = async () => {
    await connectDB();

    const sessionStore = await createSessionStore();
    const app = createApp({ sessionStore });

    const server = app.listen(port, () => {
        console.log(`🚀 Backend server running on http://localhost:${port}`);
    });

    const shutdown = (signal) => {
        console.log(`\n${signal} received — shutting down gracefully.`);
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start().catch((error) => {
    console.error('❌ Failed to start the server:', error);
    process.exit(1);
});
