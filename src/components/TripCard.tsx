import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { absoluteUrl, type TripSummary } from '@/lib/api';
import { colors, radius } from '@/lib/theme';

export function citiesLabel(cities: string[]) {
  if (cities.length <= 1) return cities[0] || '';
  if (cities.length === 2) return cities.join(' & ');
  return cities.slice(0, 2).join(', ') + ' +' + (cities.length - 2);
}

export function TripCard({ trip }: { trip: TripSummary }) {
  const photo = absoluteUrl(trip.photo);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trip.name}, ${trip.cities.join(', ')}, ${trip.days} days, ${trip.memberCount} people`}
      onPress={() => router.push({ pathname: '/trips/[id]', params: { id: trip.id } })}
      style={({ pressed }) => [styles.card, pressed ? { opacity: 0.85 } : null]}>
      <View style={[styles.cover, { backgroundColor: trip.color || colors.blue }]}>
        {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
        <View style={styles.shade} />
        {trip.flag ? <Text style={styles.flag}>{trip.flag}</Text> : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{trip.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>{citiesLabel(trip.cities)}</Text>
        <Text style={styles.small}>{trip.days} {trip.days === 1 ? 'day' : 'days'} · {trip.memberCount} {trip.memberCount === 1 ? 'person' : 'people'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 14 },
  cover: { height: 130, justifyContent: 'flex-end', padding: 12 },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.12)' },
  flag: { fontSize: 30 },
  body: { padding: 14, gap: 2 },
  name: { fontSize: 19, fontWeight: '800', color: colors.navy },
  meta: { fontSize: 15, color: colors.text },
  small: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
