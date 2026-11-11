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


// ── Inside a trip ──
export type ChatMessage = { id: string; userId: number | string; userName: string; userAvatar: string; text: string; system?: boolean; time: string | null };
export type Recommendation = { id: string; name: string; tags: string[]; description: string; image: string; city: string; closure: string | null };
export type Vote = 'upvote' | 'bookmark' | 'downvote';
export type SavedActivity = { id: string; name: string; image: string; upvotes: number; saves: number; mine: Vote | null };
export type Block = { dayIndex: number; timeSlot: string; name: string; color: string; duration: number };
export type Itinerary = {
  cities: string[]; days: number; dates: { start: string; end: string } | null; hours: string[];
  blocks: Block[]; dayCities: { dayIndex: number; city: string }[]; comments: { dayIndex: number; timeSlot: string; count: number }[];
};
export type Note = { id: number; userId: number; userName: string; comment: string; createdAt: string | null };
export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';
export type DayWeather = { kind: WeatherKind; max: number | null; min: number | null; rainChance: number | null; source: 'forecast' | 'typical' };
export type Holiday = { date: string; name: string; localName: string | null; regional: boolean };
export type Busy = { factor: number; level: 'normal' | 'busier' | 'very busy'; reasons: string[] };
export type DestinationDay = { date: string; weekend?: boolean; past?: boolean; weather: DayWeather | null; holidays: Holiday[]; busy: Busy };
export type DestinationInfo = {
  cities: string[]; city: string;
  location: { city: string; country: string | null; countryCode: string | null; lat: number; lon: number; timezone: string } | null;
  trip: { start: string; end: string } | null;
  current: { temp: number | null; kind: WeatherKind; isDay: boolean | null } | null;
  weatherAvailable: boolean; days: DestinationDay[]; holidays: Holiday[]; holidaysCovered: boolean;
};
export type Place = { id: string; name: string; lat: number; lon: number; kind: string | null; popularity: number; hours: string | null; hoursKnown: boolean; closedOn: string[]; seasonal: boolean };
export type PlacesInfo = { cities: string[]; city: string; location: { city: string; lat: number; lon: number; timezone: string } | null; dates: string[]; tripDates: boolean; days: { date: string; busy: Busy }[]; places: Place[] };
export type Notification = { id: string; groupId: string | null; personId?: number | null; message: string; type: string; isRead: boolean; createdAt: string | null };
export type MyProfile = { user: User; visitedCountries: { code: string; name: string; flag: string }[]; visitedCities: string[]; tripCount: number; friendCount: number };

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

  messages: (token: string, id: string) => request<{ messages: ChatMessage[] }>(t(id, '/messages'), { token }),
  recommendations: (token: string, id: string) => request<{ cities: string[]; items: Recommendation[] }>(t(id, '/recommendations'), { token }),
  vote: (token: string, id: string, activity: Recommendation, vote: Vote) => request<{ ok: boolean }>(t(id, '/votes'), { method: 'POST', body: { activity, vote }, token }),
  saved: (token: string, id: string) => request<{ items: SavedActivity[] }>(t(id, '/saved'), { token }),
  itinerary: (token: string, id: string) => request<Itinerary>(t(id, '/itinerary'), { token }),
  setDates: (token: string, id: string, start: string, end: string) =>
    request<{ dates: { start: string; end: string } }>(t(id, '/itinerary/dates'), { method: 'POST', body: { start, end }, token }),
  saveBlock: (token: string, id: string, block: Block, from?: { dayIndex: number; timeSlot: string }) =>
    request<{ block: Block }>(t(id, '/itinerary/block'), { method: 'PUT', body: { ...block, from }, token }),
  deleteBlock: (token: string, id: string, dayIndex: number, timeSlot: string) =>
    request<{ ok: boolean }>(t(id, '/itinerary/block'), { method: 'DELETE', body: { dayIndex, timeSlot }, token }),
  setDayCity: (token: string, id: string, dayIndex: number, city: string) =>
    request<{ dayIndex: number; city: string }>(t(id, '/itinerary/day-city'), { method: 'POST', body: { dayIndex, city }, token }),
  notes: (token: string, id: string, dayIndex: number, timeSlot: string) =>
    request<{ comments: Note[] }>(t(id, '/itinerary/comments?dayIndex=' + dayIndex + '&timeSlot=' + encodeURIComponent(timeSlot)), { token }),
  addNote: (token: string, id: string, dayIndex: number, timeSlot: string, comment: string) =>
    request<{ comment: Note }>(t(id, '/itinerary/comments'), { method: 'POST', body: { dayIndex, timeSlot, comment }, token }),
  deleteNote: (token: string, id: string, noteId: number) =>
    request<{ ok: boolean }>(t(id, '/itinerary/comments/' + noteId), { method: 'DELETE', token }),
  destination: (token: string, id: string, city?: string) =>
    request<DestinationInfo>(t(id, '/destination' + (city ? '?city=' + encodeURIComponent(city) : '')), { token }),
  places: (token: string, id: string, city?: string) =>
    request<PlacesInfo>(t(id, '/destination/places' + (city ? '?city=' + encodeURIComponent(city) : '')), { token }),

  notifications: (token: string) => request<{ notifications: Notification[] }>('/notifications', { token }),
  notificationCount: (token: string) => request<{ count: number }>('/notifications/count', { token }),
  markNotificationsRead: (token: string) => request<{ ok: boolean }>('/notifications/read', { method: 'POST', token }),
  myProfile: (token: string) => request<MyProfile>('/me/profile', { token }),
  setVisited: (token: string, countries: string[], cities: string[]) =>
    request<{ ok: boolean }>('/me/visited', { method: 'PUT', body: { countries, cities }, token }),
  uploadMyPhoto: (token: string, form: FormData) => request<{ user: User }>('/me/photo', { method: 'POST', form, token }),
  deleteAccount: (token: string) => request<{ ok: boolean }>('/me', { method: 'DELETE', body: { confirm: true }, token }),
};

function t(id: string, rest: string) {
  return '/trips/' + encodeURIComponent(id) + rest;
}

// Profile pictures are stored as site-relative paths (/uploads/...).
export function absoluteUrl(path: string | undefined | null): string | null {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : API_URL + (path.startsWith('/') ? '' : '/') + path;
}
