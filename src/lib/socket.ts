import { useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';

import { API_URL } from './config';

// One live connection per login, shared by chat and the itinerary. The
// server checks the token and trip membership for every room.
let current: { token: string; socket: Socket } | null = null;

export function getSocket(token: string): Socket {
  if (current && current.token === token) return current.socket;
  if (current) current.socket.disconnect();
  const socket = io(API_URL, { auth: { token }, transports: ['websocket'], reconnection: true });
  current = { token, socket };
  return socket;
}

export function closeSocket() {
  if (current) current.socket.disconnect();
  current = null;
}

// Whether the shared connection is up, kept in step with connect/disconnect.

export function useSocketConnected(token: string | null): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (!token) return () => {};
      const s = getSocket(token);
      s.on('connect', notify);
      s.on('disconnect', notify);
      return () => { s.off('connect', notify); s.off('disconnect', notify); };
    },
    () => (token ? getSocket(token).connected : false),
    () => false,
  );
}
