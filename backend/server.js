import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Config, routes and middlewares
import connectDB from './config/db.js';
import documentRoutes from './routes/documentRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Connect to Database (Scaffolded)
connectDB();

app.use(cors());
app.use(express.json());

// Serve static files from the React app's dist folder
const reactDistPath = path.join(__dirname, '../react/dist');
if (fs.existsSync(reactDistPath)) {
    app.use(express.static(reactDistPath));
}

// API Routes
app.use('/api', documentRoutes);

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

app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});

export default app;
