// ============================================================
// Admin Console — API Client
// Base fetch wrapper for all admin API calls.
// Inject JWT tokens and handles global errors.
// ============================================================

import useAuthStore from '../store/authStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TIMEOUT_MS = 25_000; // Operations might take slightly longer (e.g. ETL)

export class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function getToken() {
  return useAuthStore.getState().token;
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const token = getToken();
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
  const res = await fetch(`${API_BASE}${path}`, {
    headers: headers(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return handle(res);
}

export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return handle(res);
}

export async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return handle(res);
}

export async function apiPatch(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return handle(res);
}
