import { API_URL } from './config';

export type User = { id: number; username: string; email: string; profilePictureUrl: string };
export type AuthResult = { token: string; user: User; isNewUser?: boolean };

export type Relationship = 'none' | 'outgoing' | 'incoming' | 'friends' | 'self';
export type Person = { id: number; username: string; profilePictureUrl: string; relationship?: Relationship };
export type Country = { code: string; name: string };
export type Profile = Person & {
  relationship: Relationship;
  friendCount: number;
  canSeeDetails: boolean;
  visitedCountries?: Country[];
  visitedCities?: string[];
  planningCountries?: Country[];
  tripCount?: number;
};
export type TripSummary = {
  id: string;
  name: string;
  destination: string;
  cities: string[];
  flag: string;
  color: string;
  photo: string;
  days: number;
  memberCount: number;
  isOwner: boolean;
  interests: string[];
};
export type TripMember = { id: number; username: string; profilePictureUrl: string; isOwner: boolean };
export type Trip = TripSummary & { members: TripMember[]; inviteLink: string; dates: { start: string; end: string } | null };
export type CountryOption = { code: string; name: string; flag: string; continent: string; cities: string[] };
export type NewTrip = { country: string; cities: string[]; days: number; interests: string[] };

export type FriendsData = { friends: Person[]; incoming: Person[]; outgoing: Person[] };
export type FriendAction = 'request' | 'accept' | 'decline' | 'cancel' | 'remove';

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

async function request<T>(path: string, options: { method?: string; body?: unknown; form?: FormData; token?: string | null } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.form ? 60000 : TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(API_URL + '/api/mobile' + path, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        // For uploads, fetch sets the multipart boundary itself.
        ...(options.form ? {} : { 'Content-Type': 'application/json' }),
        ...(options.token ? { Authorization: 'Bearer ' + options.token } : {}),
      },
      body: options.form ? options.form : options.body ? JSON.stringify(options.body) : undefined,
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

  friends: (token: string) => request<FriendsData>('/friends', { token }),
  searchPeople: (token: string, q: string) =>
    request<{ results: Person[] }>('/people/search?q=' + encodeURIComponent(q.trim()), { token }),
  person: (token: string, id: number | string) => request<{ person: Profile }>('/people/' + encodeURIComponent(String(id)), { token }),
  friendAction: (token: string, id: number | string, action: FriendAction) =>
    request<{ relationship: Relationship }>('/people/' + encodeURIComponent(String(id)) + '/' + action, { method: 'POST', token }),

  countries: (token: string) => request<{ countries: CountryOption[]; interests: string[] }>('/countries', { token }),
  trips: (token: string) => request<{ trips: TripSummary[] }>('/trips', { token }),
  trip: (token: string, id: string) => request<{ trip: Trip }>('/trips/' + encodeURIComponent(id), { token }),
  createTrip: (token: string, input: NewTrip) => request<{ trip: Trip }>('/trips', { method: 'POST', body: input, token }),
  joinTrip: (token: string, code: string) => request<{ trip: Trip }>('/trips/join', { method: 'POST', body: { code }, token }),
  addTripMember: (token: string, id: string, userId: number) =>
    request<{ added: boolean; trip: Trip }>('/trips/' + encodeURIComponent(id) + '/members', { method: 'POST', body: { userId }, token }),
  renameTrip: (token: string, id: string, name: string) =>
    request<{ trip: Trip }>('/trips/' + encodeURIComponent(id) + '/rename', { method: 'POST', body: { name }, token }),
  setTripInterests: (token: string, id: string, interests: string[]) =>
    request<{ trip: Trip }>('/trips/' + encodeURIComponent(id) + '/interests', { method: 'POST', body: { interests }, token }),
  uploadTripPhoto: (token: string, id: string, form: FormData) =>
    request<{ trip: Trip }>('/trips/' + encodeURIComponent(id) + '/photo', { method: 'POST', form, token }),
  leaveTrip: (token: string, id: string) => request<{ ok: boolean }>('/trips/' + encodeURIComponent(id) + '/leave', { method: 'POST', token }),
  deleteTrip: (token: string, id: string) => request<{ ok: boolean }>('/trips/' + encodeURIComponent(id), { method: 'DELETE', token }),
};

// Profile pictures are stored as site-relative paths (/uploads/...).
export function absoluteUrl(path: string | undefined | null): string | null {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : API_URL + (path.startsWith('/') ? '' : '/') + path;
}
