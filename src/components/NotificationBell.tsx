import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { api } from '@/lib/api';
import { useTrips } from '@/lib/trips';
import { makeStyles, useColors } from '@/lib/theme';

// The bell with the number of unread notifications (as in the website's
// top bar). Rechecked each time the screen comes into view.
export function NotificationBell({ size = 26 }: { size?: number }) {
  const styles = useStyles();
  const colors = useColors();
  const { call } = useTrips();
  const [unread, setUnread] = useState(0);
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    const load = () => call((t) => api.notificationCount(t)).then((r) => { if (!cancelled) setUnread(r.count); }).catch(() => {});
    load();
    const timer = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [call]));
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={unread ? `Notifications, ${unread} new` : 'Notifications'}
      onPress={() => router.push('/notifications')} style={styles.bell} hitSlop={6}>
      <Ionicons name="notifications-outline" size={size} color={colors.navy} />
      {unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text></View> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  bell: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
}));
