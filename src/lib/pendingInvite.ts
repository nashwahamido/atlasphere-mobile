import { useSyncExternalStore } from 'react';

// An invite link opened while signed out: remembered until the person signs
// in or creates an account, then they're taken straight into the trip.
let pending: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function inviteCodeFromPath(path: string): string | null {
  const m = String(path || '').match(/(?:^|\/)(?:groups\/)?join\/([A-Za-z0-9]{6,32})(?:[/?#]|$)/);
  return m ? m[1] : null;
}

export function setPendingInvite(code: string | null) {
  pending = code;
  emit();
}

export function takePendingInvite(): string | null {
  const code = pending;
  if (code) setPendingInvite(null);
  return code;
}

export function usePendingInvite() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => pending,
    () => pending,
  );
}
