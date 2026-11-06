import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Banner } from '@/components/Banner';
import { FriendActions } from '@/components/FriendActions';
import { api, ApiError, type Country, type Profile } from '@/lib/api';
import { flagEmoji } from '@/lib/flags';
import { useSession } from '@/lib/session';
import { colors, radius } from '@/lib/theme';

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, signOut } = useSession();
  const [person, setPerson] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const res = await api.person(token, id);
      setPerson(res.person);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { await signOut(); return; }
      setError(err instanceof Error ? err.message : 'Couldn’t load this profile.');
    }
  }, [token, id, signOut]);

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    api.person(token, id)
      .then((res) => { if (!cancelled) { setPerson(res.person); setError(null); } })
      .catch(async (err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) { await signOut(); return; }
        setError(err instanceof Error ? err.message : 'Couldn’t load this profile.');
      });
    return () => { cancelled = true; };
  }, [token, id, signOut]);

  if (!person) {
    return (
      <View style={styles.center}>
        {error ? <Banner kind="error" message={error} /> : <ActivityIndicator color={colors.orange} />}
      </View>
    );
  }

  const isSelf = person.relationship === 'self';
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: person.username }} />
      <View style={styles.head}>
        <Avatar name={person.username} url={person.profilePictureUrl} size={112} />
        <Text style={styles.name}>{person.username}</Text>
        <Text style={styles.sub}>{person.friendCount} {person.friendCount === 1 ? 'friend' : 'friends'}</Text>
        {person.relationship === 'incoming' ? <Text style={styles.note}>{person.username} sent you a friend request.</Text> : null}
        {!isSelf ? (
          <FriendActions personId={person.id} name={person.username} state={person.relationship} size="lg" onChange={() => load()} />
        ) : null}
      </View>

      {person.canSeeDetails ? (
        <>
          <View style={styles.stats}>
            <Stat n={person.visitedCountries?.length || 0} label={(person.visitedCountries?.length || 0) === 1 ? 'Country visited' : 'Countries visited'} />
            <Stat n={person.planningCountries?.length || 0} label="Planning to visit" />
            <Stat n={person.tripCount || 0} label={(person.tripCount || 0) === 1 ? 'Group' : 'Groups'} />
          </View>
          <Card title="Visited">
            <Countries list={person.visitedCountries} empty={`${person.username} hasn’t added any countries yet.`} />
            {person.visitedCities && person.visitedCities.length ? (
              <>
                <Text style={styles.sub2}>CITIES</Text>
                <View style={styles.chips}>
                  {person.visitedCities.map((c) => <Text key={c} style={styles.city}>{c}</Text>)}
                </View>
              </>
            ) : null}
          </Card>
          <Card title="Planning to visit">
            <Countries list={person.planningCountries} empty="No trips planned yet." />
          </Card>
        </>
      ) : (
        <View style={[styles.card, styles.locked]}>
          <Text style={styles.lockedText}>
            Be friends with <Text style={{ fontWeight: '700', color: colors.navy }}>{person.username}</Text> to see where they’ve travelled and where they’re going next.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statNum}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Countries({ list, empty }: { list?: Country[]; empty: string }) {
  if (!list || list.length === 0) return <Text style={styles.empty}>{empty}</Text>;
  return (
    <View style={styles.chips}>
      {list.map((c) => (
        <View key={c.code} style={styles.country}>
          <Text style={styles.flag}>{flagEmoji(c.code)}</Text>
          <Text style={styles.countryName}>{c.name}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40, width: '100%', maxWidth: 560, alignSelf: 'center' },
  head: { alignItems: 'center', marginBottom: 24, gap: 6 },
  name: { fontSize: 26, fontWeight: '800', color: colors.navy, marginTop: 8 },
  sub: { fontSize: 15, color: colors.textMuted, marginBottom: 10 },
  note: { fontSize: 15, color: colors.text, marginBottom: 6 },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: colors.field, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: colors.navy },
  statLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 16, marginBottom: 14, backgroundColor: colors.bg },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.navy, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  country: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.field, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  flag: { fontSize: 16 },
  countryName: { fontSize: 14, fontWeight: '500', color: colors.navy },
  sub2: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  city: { fontSize: 13, color: colors.navy, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, overflow: 'hidden' },
  empty: { fontSize: 14, color: colors.textMuted },
  locked: { alignItems: 'center' },
  lockedText: { fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },
});
