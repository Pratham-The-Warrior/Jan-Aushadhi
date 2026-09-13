import useAuthStore from '../store/authStore';
import { auth } from '../firebase';

function getSanitizedApiBase() {
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

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Structured API error.
 * Parses the backend's `{ error: { code, message, statusCode } }` response.
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Get the current Firebase auth token with automatic background refresh.
 */
async function getAuthToken() {
  try {
    if (auth?.currentUser) {
      const token = await auth.currentUser.getIdToken(false);
      if (token) {
        useAuthStore.getState().setToken(token);
        return token;
      }
    }
  } catch (err) {
    console.warn('⚠️ Token refresh notice:', err);
  }
  return useAuthStore.getState().token;
}

/**
 * Build headers with optional auth token.
 * @param {boolean} [requiresAuth=false] - Include Authorization header
 */
async function buildHeaders(requiresAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (requiresAuth) {
    const token = await getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Parse the response and throw ApiError on non-2xx status.
 * @param {Response} res - Fetch response
 * @returns {Promise<any>} Parsed JSON body
 * @throws {ApiError} On non-2xx response
 */
async function handleResponse(res) {
  if (res.ok) return res.json();

  // Try to parse structured error from backend
  try {
    const body = await res.json();
    if (body?.error) {
      throw new ApiError(
        body.error.message || 'Request failed',
        body.error.statusCode || res.status,
        body.error.code || 'UNKNOWN_ERROR',
      );
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
  }

  // Fallback for non-JSON error responses
  throw new ApiError(`Request failed with status ${res.status}`, res.status);
}

/**
 * Execute a GET request.
 * @param {string}  path  - API path (e.g. '/api/v1/health')
 * @param {boolean} [auth=false] - Include auth token
 */
export async function apiGet(path, auth = false) {
  const headers = await buildHeaders(auth);
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return handleResponse(res);
}

/**
 * Execute a POST request.
 * @param {string}  path  - API path
 * @param {object}  body  - JSON body
 * @param {boolean} [auth=false] - Include auth token
 */
export async function apiPost(path, body, auth = false) {
  const headers = await buildHeaders(auth);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return handleResponse(res);
}

/**
 * Execute a PUT request.
 * @param {string}  path  - API path
 * @param {object}  body  - JSON body
 * @param {boolean} [auth=false] - Include auth token
 */
export async function apiPut(path, body, auth = false) {
  const headers = await buildHeaders(auth);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return handleResponse(res);
}

/**
 * Execute a PATCH request.
 * @param {string}  path  - API path
 * @param {object}  body  - JSON body
 * @param {boolean} [auth=false] - Include auth token
 */
export async function apiPatch(path, body, auth = false) {
  const headers = await buildHeaders(auth);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return handleResponse(res);
}

