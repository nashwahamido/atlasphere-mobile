import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { api, type Notification } from '@/lib/api';
import { useTrips } from '@/lib/trips';
import { colors } from '@/lib/theme';

function ago(iso: string | null) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  return Math.floor(s / 86400) + ' d ago';
}

const ICON: Record<string, string> = { vote: '👍', invite: '🧳', 'friend-request': '👋', 'friend-accepted': '🤝' };

export default function Notifications() {
  const { call } = useTrips();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load, then mark everything as read (the list keeps showing what was new).
  useEffect(() => {
    let cancelled = false;
    call((t) => api.notifications(t))
      .then((r) => { if (!cancelled) { setItems(r.notifications); call((t) => api.markNotificationsRead(t)).catch(() => {}); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Couldn’t load notifications.'); });
    return () => { cancelled = true; };
  }, [call]);

  const open = (n: Notification) => {
    if (n.groupId) router.push({ pathname: '/trips/[id]', params: { id: n.groupId } });
    else if (n.type === 'friend-request') router.push('/friends');
    else if (n.personId) router.push({ pathname: '/people/[id]', params: { id: String(n.personId) } });
  };

  if (!items) return <View style={styles.center}>{error ? <Banner kind="error" message={error} /> : <ActivityIndicator color={colors.navy} />}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nothing yet. Votes, invites and friend requests show up here.</Text>}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => open(item)} style={({ pressed }) => [styles.row, !item.isRead ? styles.unread : null, pressed ? { opacity: 0.7 } : null]}>
            <Text style={styles.icon}>{ICON[item.type] || '🔔'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.msg}>{item.message}</Text>
              <Text style={styles.time}>{ago(item.createdAt)}</Text>
            </View>
            {!item.isRead ? <View style={styles.dot} accessibilityLabel="New" /> : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  list: { padding: 16, gap: 8, width: '100%', maxWidth: 560, alignSelf: 'center' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border },
  unread: { backgroundColor: '#FDF1E4', borderColor: '#F5CFA4' },
  icon: { fontSize: 22 },
  msg: { fontSize: 15, color: colors.navy, lineHeight: 20 },
  time: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.orange },
});
