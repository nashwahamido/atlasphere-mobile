import { inviteCodeFromPath, setPendingInvite } from '@/lib/pendingInvite';

// Incoming links. An invite (atlasphere://join/<code>, or the website's
// /groups/join/<code>) is remembered in case the person still has to sign in.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  const code = inviteCodeFromPath(path);
  if (code) {
    setPendingInvite(code);
    return `/join/${code}`;
  }
  return path;
}
