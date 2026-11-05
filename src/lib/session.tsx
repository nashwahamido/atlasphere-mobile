import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { api, ApiError, type User } from './api';
import { getItem, setItem } from './storage';

const TOKEN_KEY = 'atlasphere.token';
const USER_KEY = 'atlasphere.user';

type SessionValue = {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On launch: restore the saved login, then confirm it with the server.
  // A rejected token signs out; a network failure keeps the cached profile so
  // the app still opens offline.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await getItem(TOKEN_KEY);
      const cachedUser = await getItem(USER_KEY);
      if (!saved) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      if (!cancelled) {
        setToken(saved);
        if (cachedUser) {
          try { setUser(JSON.parse(cachedUser)); } catch { /* ignore bad cache */ }
        }
      }
      try {
        const { user: fresh } = await api.me(saved);
        if (cancelled) return;
        setUser(fresh);
        await setItem(USER_KEY, JSON.stringify(fresh));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          await setItem(TOKEN_KEY, null);
          await setItem(USER_KEY, null);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async (newToken: string, newUser: User) => {
    await setItem(TOKEN_KEY, newToken);
    await setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const signOut = useCallback(async () => {
    await setItem(TOKEN_KEY, null);
    await setItem(USER_KEY, null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ token, user, isLoading, signIn, signOut }), [token, user, isLoading, signIn, signOut]);
  return <SessionContext value={value}>{children}</SessionContext>;
}
