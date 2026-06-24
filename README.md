# Convertify — Modern Document Processing Suite

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-Session_Store-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Passport-OAuth_2.0-34E27A?style=for-the-badge&logo=passport&logoColor=black" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
</p>

**Convertify** is a premium, full-stack document processing web application. Users can merge, convert, and extract data from PDF and Word documents — all processed server-side with zero data persistence. Backed by a secure authentication system supporting both local credentials and Google OAuth 2.0.

---

## ✨ Features

### 📄 Document Processing
- **Word → PDF**: Uses `mammoth.js` to parse `.docx` structure and `Puppeteer` (headless Chromium) to render pixel-perfect PDFs.
- **PDF Merging**: Combine multiple PDF files into a single document using `pdf-lib` for zero-loss binary merging.
- **PDF → Word Extraction**: Parses raw text from PDFs via `pdf-parse` and reconstructs valid `.docx` files using the `docx` library.
- **Real-time Processing**: Files are processed instantly and streamed back to the client — no waiting, no polling.

### 🔐 Authentication
- **Local Auth**: Email/password registration and login with bcrypt password hashing (12 salt rounds).
- **Google OAuth 2.0**: One-click sign-in via Passport.js `passport-google-oauth20` strategy.
- **Session Management**: Persistent, secure sessions via `express-session`, backed by Redis (with automatic in-memory fallback for development).
- **Protected Routes**: `requireAuth` middleware guards all document processing endpoints.

### 🛡️ Privacy & Security
- **Stateless by Design**: All uploaded files are deleted immediately after processing — nothing persists on the server.
- **CORS Protection**: Strict origin allowlist with credentials support for cookie-based sessions.
- **HTTPOnly Cookies**: Session cookies are `httpOnly` and `sameSite: lax` to mitigate XSS and CSRF risks.
- **Global Error Handling**: Centralized `errorHandler` middleware catches and sanitizes all unhandled errors.
- **Automatic Garbage Collection**: `safeUnlink` utility cleans up temporary files from `uploads/` and `outputs/` after every request.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 8** | Build tool & dev server |
| **Tailwind CSS v4** | Utility-first styling |
| **Radix UI** | Accessible, headless UI primitives |
| **Shadcn** | Pre-built component layer over Radix |
| **Lucide React** | Icon library |
| **Sonner** | Animated toast notifications |
| **React Router DOM v7** | Client-side routing |
| **next-themes** | Dark/light theme management |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express** | HTTP server & API routing |
| **MongoDB + Mongoose** | User data persistence |
| **Redis + connect-redis** | Scalable session store |
| **Passport.js** | Authentication middleware |
| **passport-local** | Email/password strategy |
| **passport-google-oauth20** | Google OAuth 2.0 strategy |
| **bcryptjs** | Password hashing |
| **express-session** | Session middleware |
| **Multer** | Multipart file upload handling (20MB limit) |
| **Puppeteer** | Headless Chromium for PDF rendering |
| **pdf-lib** | Binary PDF stream manipulation |
| **pdf-parse / pdf2json** | PDF text extraction |
| **mammoth** | `.docx` → HTML parsing |
| **docx** | Programmatic `.docx` generation |

---

## 🗂️ Project Structure

```
Convertify/
├── backend/
│   ├── config/
│   │   ├── db.js               # MongoDB connection
│   │   └── passport.js         # Passport strategy configuration
│   ├── controllers/
│   │   └── documentController.js  # All document processing logic
│   ├── middlewares/
│   │   ├── auth.js             # requireAuth middleware
│   │   └── errorHandler.js     # Global error handler
│   ├── models/
│   │   └── User.js             # Mongoose user schema
│   ├── routes/
│   │   ├── authRoutes.js       # /api/auth/* endpoints
│   │   └── documentRoutes.js   # /api/* document endpoints
│   ├── uploads/                # Temporary file storage (auto-cleaned)
│   └── server.js               # App entry point
│
└── react/
    └── src/
        ├── components/         # Shared UI components (Shadcn/Radix)
        ├── pdf/                # PDF-related page components
        ├── App.jsx             # Root component & routes
        └── main.jsx            # React entry point
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **Redis** (optional — falls back to in-memory sessions if unavailable)
- A **Google Cloud** project with OAuth 2.0 credentials (optional for Google login)

---

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd Convertify
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
# Server
PORT=3000

# MongoDB
MONGO_URI=mongodb://localhost:27017/convertify

# Session
SESSION_SECRET=your_super_secret_session_key_change_me

# Redis (optional)
REDIS_URL=redis://127.0.0.1:6379

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Frontend URL (for OAuth redirect)
FRONTEND_URL=http://localhost:5173
```

Start the backend server:
```bash
# Development (with hot-reload)
npm run dev

# Production
npm start
```
> Backend runs on `http://localhost:3000`

---

### 3. Frontend Setup

```bash
cd react
npm install
npm run dev
```
> Frontend runs on `http://localhost:5173`

---

## 🔌 API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register with email & password |
| `POST` | `/api/auth/login` | Login with email & password |
| `POST` | `/api/auth/logout` | Destroy session & clear cookie |
| `GET` | `/api/auth/user` | Get the currently authenticated user |
| `GET` | `/api/auth/google` | Initiate Google OAuth flow |
| `GET` | `/api/auth/google/callback` | Google OAuth redirect handler |

### Documents (`/api`) — *Auth required*
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/word-to-pdf` | Convert `.docx` → `.pdf` |
| `POST` | `/api/merge-pdfs` | Merge multiple `.pdf` files |
| `POST` | `/api/pdf-to-word` | Extract PDF text → `.docx` |

---

## ⚙️ Environment Notes

| Variable | Required | Default | Notes |
|---|---|---|---|
| `PORT` | No | `3000` | Express server port |
| `MONGO_URI` | **Yes** | — | MongoDB connection string |
| `SESSION_SECRET` | **Yes** | fallback string | Change before deploying |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | Falls back to memory store |
| `GOOGLE_CLIENT_ID` | No | — | Required for Google OAuth |
| `GOOGLE_CLIENT_SECRET` | No | — | Required for Google OAuth |
| `FRONTEND_URL` | No | `/` | Used for OAuth redirects |

---

## 🧪 Running Tests

```bash
# Test Word → PDF conversion
cd backend
node test_word_to_pdf.js

# Test database connection
node testdb.js
```

---

## 📦 Deployment

The backend serves the built React app as static files from `react/dist/`. For a single-server deployment:

```bash
# Build the frontend
cd react && npm run build

# Start the backend (it will serve the React app too)
cd ../backend && npm start
```

For production, ensure:
- `SESSION_SECRET` is a strong, unique random string
- `cookie.secure` is set to `true` (requires HTTPS)
- `REDIS_URL` points to a persistent Redis instance
- `MONGO_URI` points to your production MongoDB cluster

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
