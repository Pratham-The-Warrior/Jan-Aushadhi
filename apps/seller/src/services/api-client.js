// ============================================================
// Seller Central — API Client
// Base fetch wrapper for all seller API calls.
// Mirrors the client app's api-client.js pattern.
// ============================================================

import useAuthStore from '../store/authStore';
import { auth } from '../firebase';

function getSanitizedApiBase() {
  if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
    // Without it every request goes to localhost and fails; make that obvious.
    console.error('VITE_API_URL is not set for this build: API calls will fail. Set it in the hosting settings and redeploy.');
  }
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim();
  if (url.includes('http://') || url.includes('https://')) {
    const match = url.match(/(https?:\/\/[^/\s]+)/g);
    if (match && match.length > 0) {
      url = match[match.length - 1];
    }
  } else {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
}
const API_BASE = getSanitizedApiBase();
const TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function getToken() {
  try {
    if (auth?.currentUser) {
      const token = await auth.currentUser.getIdToken(false);
      if (token) {
        useAuthStore.getState().setToken(token);
        return token;
      }
    }
  } catch (err) {
    console.warn('⚠️ Seller token refresh notice:', err);
  }
  return useAuthStore.getState().token;
}

async function headers() {
  const h = { 'Content-Type': 'application/json' };
  const token = await getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function handle(res) {
  if (res.ok) return res.json();
  try {
    const body = await res.json();
    if (body?.error) {
      throw new ApiError(body.error.message || 'Request failed', body.error.statusCode || res.status, body.error.code);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
  }
  throw new ApiError(`Request failed with status ${res.status}`, res.status);
}

export async function apiGet(path) {
  const h = await headers();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: h,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return handle(res);
}

export async function apiPost(path, body) {
  const h = await headers();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return handle(res);
}

export async function apiPut(path, body) {
  const h = await headers();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: h,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return handle(res);
}

export async function apiPatch(path, body) {
  const h = await headers();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return handle(res);
}

