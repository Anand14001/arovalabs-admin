/*
 * The API client. Every request in the admin goes through here.
 *
 * The access token lives in a module variable — in memory only, never in
 * localStorage. Anything that can read the DOM can read localStorage, so an XSS
 * in the admin would otherwise hand over a working credential that survives a
 * reload. The cost is that a refresh loses it, which is what the session
 * bootstrap in AuthContext is for: the httpOnly refresh cookie restores it.
 */

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4100').replace(/\/$/, '');
const PREFIX = '/api/v1';

let accessToken = null;
let onSessionLost = null;

export const setAccessToken = (token) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

/*
 * Called when the refresh token is gone or rejected — i.e. the session is over
 * and no retry will help. AuthContext uses it to clear state and bounce to the
 * login screen from wherever the failing request was made.
 */
export const setSessionLostHandler = (fn) => {
  onSessionLost = fn;
};

export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields ?? null;
  }

  /** Field errors keyed by input name, for form display. */
  get fieldErrors() {
    return this.fields ?? {};
  }
}

const parseBody = async (res) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // A proxy or the host returning an HTML error page instead of our JSON.
    return { error: { code: 'BAD_RESPONSE', message: text.slice(0, 200) } };
  }
};

const toError = (res, body) => {
  const e = body?.error ?? {};
  return new ApiError(
    res.status,
    e.code ?? 'UNKNOWN',
    e.message ?? `Request failed (${res.status}).`,
    e.fields,
  );
};

/*
 * One refresh at a time.
 *
 * A dashboard fires several requests at once, so an expired token means several
 * simultaneous 401s. Without this they would each start their own refresh, and
 * because refresh tokens rotate, the first to land invalidates the rest — the
 * server would see token reuse, revoke the whole family, and log the user out
 * for doing nothing wrong. So everyone awaits the same in-flight promise.
 */
let refreshing = null;

const doRefresh = async () => {
  const res = await fetch(`${BASE_URL}${PREFIX}/admin/auth/refresh`, {
    method: 'POST',
    credentials: 'include', // the refresh cookie is httpOnly
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) throw toError(res, await parseBody(res));

  const body = await parseBody(res);
  setAccessToken(body.accessToken);
  return body;
};

export const refreshSession = () => {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
};

const request = async (path, { method = 'GET', body, auth = true, retry = true, signal } = {}) => {
  const headers = { Accept: 'application/json' };
  const isFormData = body instanceof FormData;

  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${PREFIX}${path}`, {
      method,
      headers,
      credentials: 'include',
      signal,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    // Distinguish "the server said no" from "the server was unreachable" —
    // the second is usually the API being down or a CORS origin not allowlisted.
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection.');
  }

  if (res.status === 204) return null;

  const payload = await parseBody(res);
  if (res.ok) return payload;

  const error = toError(res, payload);

  // An expired access token is recoverable: refresh once, then replay.
  const recoverable =
    auth && retry && res.status === 401 && error.code !== 'ACCOUNT_LOCKED';

  if (recoverable) {
    try {
      await refreshSession();
      return await request(path, { method, body, auth, retry: false, signal });
    } catch {
      setAccessToken(null);
      onSessionLost?.();
      throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has ended. Please sign in again.');
    }
  }

  throw error;
};

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

export const auth = {
  login: (email, password) =>
    api.post('/admin/auth/login', { email, password }, { auth: false }),
  logout: () => api.post('/admin/auth/logout', undefined, { auth: false, retry: false }),
  me: () => api.get('/admin/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    api.post('/admin/auth/change-password', { currentPassword, newPassword }),
  forgotPassword: (email) =>
    api.post('/admin/auth/forgot-password', { email }, { auth: false }),
  resetPassword: (token, password) =>
    api.post('/admin/auth/reset-password', { token, password }, { auth: false }),
};

export const health = {
  ready: () => api.get('/ready', { auth: false, retry: false }),
};

export { BASE_URL };
