import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/lib/theme';

const TILES = [
  { key: 'chat', label: 'Chat', icon: 'chatbubbles-outline', hint: 'Talk it through' },
  { key: 'discover', label: 'Recommendations', icon: 'heart-circle-outline', hint: 'Vote on things to do' },
  { key: 'itinerary', label: 'Itinerary', icon: 'calendar-outline', hint: 'Plan each day' },
  { key: 'destination', label: 'Destination', icon: 'partly-sunny-outline', hint: 'Weather, holidays, crowds' },
] as const;

// The four parts of a trip, as big buttons on the trip screen.
export function TripTiles({ tripId }: { tripId: string }) {
  return (
    <View style={styles.grid}>
      {TILES.map((t) => (
        <Pressable
          key={t.key}
          accessibilityRole="button"
          accessibilityLabel={t.label + '. ' + t.hint}
          onPress={() => router.push({ pathname: `/trips/[id]/${t.key}`, params: { id: tripId } })}
          style={({ pressed }) => [styles.tile, pressed ? { opacity: 0.8 } : null]}>
          <Ionicons name={t.icon} size={26} color={colors.orange} />
          <Text style={styles.label}>{t.label}</Text>
          <Text style={styles.hint}>{t.hint}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexGrow: 1, flexBasis: '45%', minWidth: 150, backgroundColor: colors.navy, borderRadius: radius.card, padding: 14, gap: 4, minHeight: 104 },
  label: { color: colors.white, fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  hint: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
});
