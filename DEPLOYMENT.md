# Convertify deployment fix

The Vercel URL was serving a stale frontend and calling `/api/*` on Vercel,
where no backend exists. The backend is already running at
`https://convertify-1.onrender.com`.

## What changed in this repo

- `react/src/lib/api.js` — one API base helper. Production defaults to the
  Render backend; local dev still uses Vite's `/api` proxy. Override with
  `VITE_API_URL` in Vercel if the backend URL changes.
- `react/src/{App.jsx,components/AuthModal.jsx,pdf/PdfConverter.jsx}` — all
  API calls now use that helper, including Google sign-in (previously hardcoded
  to `http://localhost:3000`).
- `backend/app.js` — production Vercel origin added to the CORS allowlist.
- `react/index.html`, `react/public/robots.txt`, `react/public/sitemap.xml` —
  SEO metadata and crawl files.
- `react/src/pdf/ToolTabs.jsx`, `App.jsx`, `PdfConverter.jsx` — accessibility
  fixes (tab `aria-controls` targets, contrast, heading order).
- `vercel.json` / `react/vercel.json` — SPA rewrite + basic security headers.
  Only the file in your Vercel **Root Directory** is used.

## Steps

1. **Backend (Render):** push these changes and redeploy the Render service.
   Keep `MONGO_URI`, `SESSION_SECRET`, `CONVERTAPI_SECRET` set. Set
   `FRONTEND_URL=https://convertify-vvl8.vercel.app`.
2. **Frontend (Vercel):** redeploy from the current commit so the new title,
   meta description and API URLs are built. No environment variable is
   required; if you prefer explicit config, set `VITE_API_URL=https://convertify-1.onrender.com`.
3. Wait for Render's cold start (free tier can take ~30–60 s on first request).
4. Verify: `https://convertify-vvl8.vercel.app/api/auth/user` is no longer
   served by Vercel — the browser calls Render directly, so watch the Network
   tab for `https://convertify-1.onrender.com/api/auth/user` returning **401**
   when logged out (that is correct).
5. Log in, upload two PDFs, and confirm `/api/merge` returns a PDF.

## Note on "guest access"

The UI and API both require authentication. The old modal text claiming guest
access works was removed. If you want guest conversions instead, remove
`requireAuth` from `backend/routes/documentRoutes.js` (and add rate limiting).
