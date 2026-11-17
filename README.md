# Convertify

Convertify is a secure web app for converting between DOCX and PDF and merging PDFs. All conversions run through [ConvertAPI](https://www.convertapi.com/) and PDFs are merged with [pdf-lib](https://github.com/Hopding/pdf-lib).

## Features
- **Word → PDF** (`.docx` → `.pdf`) via ConvertAPI with OCR-aware handling for PDF→Word and structural validation.
- **PDF → Word** (`.pdf` → `.docx`) via ConvertAPI; the backend inspects the PDF text layer and forces OCR when necessary.
- **Merge PDFs** (combine multiple `.pdf` files) in-browser-safe server processing with page copying.
- Session-based auth (Google OAuth or local login), rate-aware errors, and per-request temporary storage with automatic cleanup.

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js (ESM) + Express + Passport.js
- **Database:** MongoDB (Mongoose)
- **Sessions:** express-session (Redis-backed when `REDIS_URL` is set)
- **Conversions:** ConvertAPI (`convertapi`), `pdf-lib`, `pdf-parse`
- **Uploads:** Multer with size/type/signature validation

## Getting Started

### Prerequisites
- Node.js 22+
- MongoDB instance
- [ConvertAPI](https://www.convertapi.com/) secret key (required for DOCX↔PDF conversions)
- (Optional) Redis, Google OAuth credentials

### Backend setup
```bash
cd backend
cp .env.example .env
# Fill in MONGO_URI, SESSION_SECRET, CONVERTAPI_SECRET, etc.
npm install
npm run dev
```

The API listens on `http://localhost:3000` by default.

### Frontend setup
```bash
cd react
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:3000` in development.

### Production build
```bash
cd react
npm run build
```

The backend serves `react/dist` if present.

## Configuration
See `backend/.env.example` for all variables:
- `CONVERTAPI_SECRET` (required)
- `MONGO_URI` (required)
- `SESSION_SECRET` (required in production)
- `REDIS_URL` (optional)
- `MAX_UPLOAD_SIZE_MB` / `MAX_MERGE_FILES` / `CONVERTAPI_TIMEOUT_SECONDS` (optional)
- `CONVERTIFY_TEMP_DIR` (optional, defaults to OS temp dir)

## Security Notes
- Credentials are never hardcoded; use environment variables. If you previously used committed keys, rotate them.
- Uploads are validated by extension, MIME, and structure (ZIP/OOXML for DOCX, `%PDF-` + `pdf-lib` for PDFs). Password-protected/encrypted PDFs return `422`.
- All conversion routes require authentication (`req.isAuthenticated()`).
- Temp files and per-request folders are deleted on response completion.
- Error responses are client-safe (`{ success: false, message: "..." }`); stack traces are logged server-side only.
- Frontend sends requests with `credentials: "include"` for session cookies.

## Testing

### Backend (node:test)
```bash
cd backend
npm test
```

Tests run with Node's built-in test runner and inject a fake ConvertAPI provider, so no real API credits are needed. The app factory (`backend/app.js`) is used for HTTP-level tests.

### Manual smoke test
```bash
cd backend
node scripts/manual-conversion-test.js
```

This script is unauthenticated and intended for local manual verification only; the production routes remain auth-protected.

## API Contracts
Routes (unchanged):
- `POST /api/merge` — multipart `files` (>=2 PDFs), auth required
- `POST /api/word-to-pdf` — multipart `file` (.docx), auth required
- `POST /api/pdf-to-word` — multipart `file` (.pdf), auth required

Failures return JSON `{ success: false, message: "<client-safe text>" }` with appropriate status codes.

## Troubleshooting
- **"Document conversion is not configured"** — set `CONVERTAPI_SECRET` in `backend/.env`.
- **PDF won't convert to Word** — scanned PDFs require OCR; the backend requests OCR automatically when no text layer is detected.
- **Large files fail** — check `MAX_UPLOAD_SIZE_MB` and your proxy limits.
- **Sessions lost on restart** — configure `REDIS_URL` for persistent sessions.
- **CORS/cookie issues** — set `FRONTEND_URL` and use `credentials: "include"` on the client (already configured).

## License
This project is for educational/use as configured.
