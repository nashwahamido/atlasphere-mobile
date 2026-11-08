import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { api, ApiError, type Trip, type TripSummary } from './api';
import { useSession } from './session';

type TripsValue = {
  trips: TripSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  // Keep the list in step after something changes on a trip screen.
  upsert: (trip: Trip | TripSummary) => void;
  drop: (id: string) => void;
  // Runs an API call with the login token; signs out if the login expired.
  call: <T>(fn: (token: string) => Promise<T>) => Promise<T>;
};

const TripsContext = createContext<TripsValue | null>(null);

export function useTrips(): TripsValue {
  const value = use(TripsContext);
  if (!value) throw new Error('useTrips must be used inside <TripsProvider>');
  return value;
}

function toSummary(t: Trip | TripSummary): TripSummary {
  const { id, name, destination, cities, flag, color, photo, days, memberCount, isOwner, interests } = t;
  return { id, name, destination, cities, flag, color, photo, days, memberCount, isOwner, interests };
}

// One shared list of your trips for the Trips tab and the trip screens.
export function TripsProvider({ children }: PropsWithChildren) {
  const { token, signOut } = useSession();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
    if (!token) throw new Error('Please sign in again.');
    try {
      return await fn(token);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) await signOut(); // login expired or revoked
      throw err;
    }
  }, [token, signOut]);

  const refresh = useCallback(async () => {
    try {
      const res = await call((t) => api.trips(t));
      setTrips(res.trips);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t load your trips.');
    } finally {
      setLoading(false);
    }
  }, [call]);

  // Initial load; state is only set once the request finishes.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api.trips(token)
      .then((res) => { if (!cancelled) { setTrips(res.trips); setError(null); } })
      .catch(async (err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) { await signOut(); return; }
        setError(err instanceof Error ? err.message : 'Couldn’t load your trips.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, signOut]);

  const upsert = useCallback((t: Trip | TripSummary) => {
    setTrips((list) => {
      const s = toSummary(t);
      const i = list.findIndex((x) => x.id === s.id);
      if (i === -1) return [s, ...list];
      const next = list.slice();
      next[i] = s;
      return next;
    });
  }, []);
  const drop = useCallback((id: string) => setTrips((list) => list.filter((t) => t.id !== id)), []);

  const value = useMemo(() => ({ trips, loading, error, refresh, upsert, drop, call }), [trips, loading, error, refresh, upsert, drop, call]);
  return <TripsContext value={value}>{children}</TripsContext>;
}
