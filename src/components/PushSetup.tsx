import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { enablePush, pushStatus, targetFor } from '@/lib/push';
import { useSession } from '@/lib/session';
import { useTrips } from '@/lib/trips';

// Registers this phone for push notifications (asking once the person is in
// a trip, when a notification is actually useful) and opens the right screen
// when a notification is tapped.
export function PushSetup() {
  const { token } = useSession();
  const { trips } = useTrips();
  const hasTrip = trips.length > 0;
  const done = useRef(false);

  useEffect(() => {
    if (!token || done.current || Platform.OS === 'web') return;
    let cancelled = false;
    pushStatus().then((status) => {
      if (cancelled) return;
      if (status === 'on') { done.current = true; return enablePush(token, { ask: false }); } // refresh the token
      if (status === 'undetermined' && hasTrip) { done.current = true; return enablePush(token, { ask: true }); }
    }).catch((e) => console.warn('Push setup failed:', e));
    return () => { cancelled = true; };
  }, [token, hasTrip]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const target = targetFor(response?.notification.request.content.data as Record<string, unknown> | undefined);
      if (target) router.push(target);
    };
    // Opened the app by tapping a notification.
    const last = Notifications.getLastNotificationResponse();
    if (last) { Notifications.clearLastNotificationResponse(); setTimeout(() => open(last), 0); }
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);

  return null;
}
