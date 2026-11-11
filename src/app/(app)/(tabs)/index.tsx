import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { TripCard } from '@/components/TripCard';
import { api } from '@/lib/api';
import { useTrips } from '@/lib/trips';
import { colors } from '@/lib/theme';

export default function TripsTab() {
  const { trips, loading, error, refresh, call } = useTrips();
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);

  // Each time the tab is shown: unread notifications.
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    call((t) => api.notificationCount(t)).then((r) => { if (!cancelled) setUnread(r.count); }).catch(() => {});
    return () => { cancelled = true; };
  }, [call]));

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">Your trips</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={unread ? `Notifications, ${unread} new` : 'Notifications'} onPress={() => router.push('/notifications')} style={styles.bell}>
          <Ionicons name="notifications-outline" size={26} color={colors.navy} />
          {unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text></View> : null}
        </Pressable>
      </View>
      <View style={styles.actions}>
        <Button title="New trip" onPress={() => router.push('/trips/new')} style={styles.action} />
        <Button title="Join with a link" variant="secondary" onPress={() => router.push('/trips/join')} style={styles.action} />
      </View>
      {error ? <Banner kind="error" message={error} /> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.navy} /></View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => <TripCard trip={item} />}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No trips yet</Text>
              <Text style={styles.emptyText}>Start one and invite your friends, or paste an invite link someone sent you.</Text>
            </View>
          }
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, paddingBottom: 40, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { marginBottom: 16, gap: 14 },
  title: { fontSize: 30, fontWeight: '800', color: colors.navy },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bell: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, paddingHorizontal: 12 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.navy },
  emptyText: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
});
