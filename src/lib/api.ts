/**
 * Returns the API base URL for all backend fetch calls.
 * - In development (Vite dev server proxy): empty string '' → uses relative /api/...
 * - In Capacitor/production: use VITE_API_URL env var pointing to deployed backend
 */
export const API_BASE = (import.meta as any).env?.VITE_API_URL ?? '';
