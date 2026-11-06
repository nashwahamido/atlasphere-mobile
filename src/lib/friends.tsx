import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { api, ApiError, type FriendAction, type FriendsData, type Relationship } from './api';
import { useSession } from './session';

type FriendsValue = {
  data: FriendsData;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  // Runs an action (add, accept, …) and refreshes the lists; returns the new state.
  act: (personId: number, action: FriendAction) => Promise<Relationship>;
};

const EMPTY: FriendsData = { friends: [], incoming: [], outgoing: [] };
const FriendsContext = createContext<FriendsValue | null>(null);

export function useFriends(): FriendsValue {
  const value = use(FriendsContext);
  if (!value) throw new Error('useFriends must be used inside <FriendsProvider>');
  return value;
}

// One shared copy of your friends and requests, used by the Friends tab, the
// profile screen and the tab badge, so an action in one place shows everywhere.
export function FriendsProvider({ children }: PropsWithChildren) {
  const { token, signOut } = useSession();
  const [data, setData] = useState<FriendsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(async (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      await signOut(); // login expired or revoked
      return;
    }
    throw err;
  }, [signOut]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setData(await api.friends(token));
      setError(null);
    } catch (err) {
      try { await handleError(err); } catch (e) { setError(e instanceof Error ? e.message : 'Couldn’t load your friends.'); }
    } finally {
      setLoading(false);
    }
  }, [token, handleError]);

  // Initial load (and reload when the login changes). State is only set once
  // the request finishes, and ignored if the provider has gone away.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api.friends(token)
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch(async (err) => {
        if (cancelled) return;
        try { await handleError(err); } catch (e) { setError(e instanceof Error ? e.message : 'Couldn’t load your friends.'); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, handleError]);

  const act = useCallback(async (personId: number, action: FriendAction) => {
    if (!token) throw new Error('Please sign in again.');
    try {
      const res = await api.friendAction(token, personId, action);
      refresh();
      return res.relationship;
    } catch (err) {
      await handleError(err);
      throw err;
    }
  }, [token, refresh, handleError]);

  const value = useMemo(() => ({ data, loading, error, refresh, act }), [data, loading, error, refresh, act]);
  return <FriendsContext value={value}>{children}</FriendsContext>;
}
