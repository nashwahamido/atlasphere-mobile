import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { TripCard } from '@/components/TripCard';
import { useTrips } from '@/lib/trips';
import { colors } from '@/lib/theme';

export default function TripsTab() {
  const { trips, loading, error, refresh } = useTrips();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const header = (
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header">Your trips</Text>
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
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, paddingHorizontal: 12 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.navy },
  emptyText: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
});
