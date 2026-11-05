import { API_URL } from './config';

export type User = { id: number; username: string; email: string; profilePictureUrl: string };
export type AuthResult = { token: string; user: User; isNewUser?: boolean };

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown> | null;
  constructor(message: string, status: number, data: Record<string, unknown> | null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const TIMEOUT_MS = 20000;

async function request<T>(path: string, options: { method?: string; body?: unknown; token?: string | null } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(API_URL + '/api/mobile' + path, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: 'Bearer ' + options.token } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('Can’t reach Atlasphere. Check your connection and try again.', 0, null);
  } finally {
    clearTimeout(timer);
  }
  let data: Record<string, unknown> | null = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Something went wrong. Please try again.';
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResult>('/auth/login', { method: 'POST', body: { email: email.trim(), password } }),
  register: (input: { username: string; email: string; phone: string; gender?: string; password: string }) =>
    request<{ pendingToken: string; email: string }>('/auth/register', {
      method: 'POST',
      body: { ...input, username: input.username.trim(), email: input.email.trim() },
    }),
  verify: (pendingToken: string, code: string) =>
    request<AuthResult>('/auth/verify', { method: 'POST', body: { pendingToken, code } }),
  resend: (pendingToken: string) =>
    request<{ pendingToken: string; message: string }>('/auth/resend', { method: 'POST', body: { pendingToken } }),
  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email: email.trim() } }),
  me: (token: string) => request<{ user: User }>('/me', { token }),
};

// Profile pictures are stored as site-relative paths (/uploads/...).
export function absoluteUrl(path: string | undefined | null): string | null {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : API_URL + (path.startsWith('/') ? '' : '/') + path;
}
