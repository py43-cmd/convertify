/**
 * Single source of truth for API URLs.
 *
 * - Local dev: empty base, so Vite's `/api` proxy targets localhost:3000.
 * - Production: defaults to the deployed Render backend. Override with
 *   VITE_API_URL if the backend moves.
 */
const configured = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

export const API_BASE =
  configured || (import.meta.env.PROD ? "https://convertify-1.onrender.com" : "");

export const apiUrl = (path) => `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
