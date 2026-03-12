# Convertify — Modern Document Processing Suite

Convertify is a premium, high-performance full-stack web application designed for seamless document manipulation. Built with a focus on speed, security, and exceptional user experience, it allows users to merge, convert, and extract data from documents entirely through a custom Node.js backend.

## ✨ Key Features

- **🚀 Infinite Scaling Hero**: A dynamic, interactive word-cycler that demonstrates the app's versatility.
- **📄 High-Fidelity Word to PDF**: Uses `mammoth.js` to parse `.docx` structure and `Puppeteer` (headless Chromium) to render pixel-perfect PDFs.
- **🧩 Native PDF Merging**: Combines multiple PDF files directly into a single stream using `pdf-lib` for zero-loss quality.
- **✍️ PDF to Word Extraction**: Sophisticated backend logic that parses raw text from PDFs and programmatically constructs valid `.docx` files.
- **⛓️ Real-time Processing**: Files are processed on the server and immediately streamed back to the user, ensuring data privacy.

## 🛠️ Technical Architecture

### Frontend (React Ecosystem)
- **Framework**: Vite + React
- **Styling**: Tailwind CSS with custom Glassmorphism and Backdrop Blur effects.
- **UI Components**: Radix UI (via Shadcn) for accessible, accessible tabs, cards, and buttons.
- **State Management**: React Hooks (`useState`, `useEffect`) for the dynamic word rotator and file queue management.
- **Feedback**: `Sonner` for beautiful, animated toast notifications.

### Backend (Node.js/Express)
- **Engine**: Node.js with Express.js
- **File Handling**: `Multer` with custom disk storage and 20MB file size limits for server safety.
- **Security**: Built-in global error handlers and automatic "Garbage Collection" of temporary files (`safeUnlink`) to prevent disk bloat.
- **Core Processing Engines**:
  - `Puppeteer`: Headless browser-based rendering for document-to-PDF formatting.
  - `pdf-lib`: Direct binary manipulation of PDF streams.
  - `pdf-parse` & `docx`: Text extraction and document reconstruction logic.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- NPM

### 2. Backend Setup
```bash
cd backend
npm install
node server.js
```
The backend will start on `http://localhost:3000`.

### 3. Frontend Setup
```bash
cd react
npm install
npm run dev
```
The frontend will start on `http://localhost:5173`.

## 🛡️ Privacy First
Convertify is designed as a stateless application. All files uploaded to the `uploads/` directory are processed into the `outputs/` folder and **immediately deleted** after the download begins, ensuring that user data never persists on our infrastructure.
