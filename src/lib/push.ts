import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { api } from './api';
import { getItem, setItem } from './storage';

// Push notifications through Expo. The server pushes chat messages, votes,
// invites, people joining and friend requests to the phones registered here.
//
// Needs an EAS project id in app.json (run `eas init` once). Without it, or
// on the web / a simulator, everything here quietly does nothing.

const TOKEN_KEY = 'atlasphere.pushToken';
const OFF_KEY = 'atlasphere.pushOff';

export type PushStatus =
  | 'unsupported'    // web, or a simulator
  | 'not-configured' // no EAS project id yet
  | 'off'            // turned off in the app
  | 'denied'         // turned off in the phone's settings
  | 'undetermined'   // not asked yet
  | 'on';

if (Platform.OS !== 'web') {
  // Show notifications even while the app is open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId || Constants.easConfig?.projectId || null;
}

export async function pushStatus(): Promise<PushStatus> {
  if (Platform.OS === 'web' || !Device.isDevice) return 'unsupported';
  if (!projectId()) return 'not-configured';
  if ((await getItem(OFF_KEY)) === '1') return 'off';
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'on';
  return status === 'denied' ? 'denied' : 'undetermined';
}

// Ask (if allowed to) and register this phone. Returns the new status.
export async function enablePush(authToken: string, opts: { ask: boolean }): Promise<PushStatus> {
  if (Platform.OS === 'web' || !Device.isDevice) return 'unsupported';
  const id = projectId();
  if (!id) return 'not-configured';
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Trips and messages', importance: AndroidImportance.HIGH });
  }
  let perm = await Notifications.getPermissionsAsync();
  if (perm.status !== 'granted' && opts.ask && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
  if (perm.status !== 'granted') return perm.status === 'denied' ? 'denied' : 'undetermined';
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  await api.savePushToken(authToken, token, Platform.OS);
  await setItem(TOKEN_KEY, token);
  await setItem(OFF_KEY, null);
  return 'on';
}

// Stop pushes to this phone. `remember` keeps them off until turned back on
// (the switch in Profile); signing out doesn't.
export async function disablePush(authToken: string | null, opts: { remember: boolean }) {
  const token = await getItem(TOKEN_KEY);
  if (opts.remember) await setItem(OFF_KEY, '1');
  if (token && authToken) await api.deletePushToken(authToken, token).catch(() => {});
  await setItem(TOKEN_KEY, null);
}

export const openPhoneSettings = () => Linking.openSettings();

// Where tapping a notification should go.
export type PushTarget =
  | { pathname: '/trips/[id]/chat' | '/trips/[id]'; params: { id: string } }
  | { pathname: '/people/[id]'; params: { id: string } }
  | '/friends'
  | null;

export function targetFor(data: Record<string, unknown> | undefined): PushTarget {
  if (!data) return null;
  const groupId = data.groupId ? String(data.groupId) : null;
  if (data.type === 'chat' && groupId) return { pathname: '/trips/[id]/chat', params: { id: groupId } };
  if (groupId) return { pathname: '/trips/[id]', params: { id: groupId } };
  if (data.type === 'friend-request') return '/friends';
  if (data.personId) return { pathname: '/people/[id]', params: { id: String(data.personId) } };
  return null;
}
