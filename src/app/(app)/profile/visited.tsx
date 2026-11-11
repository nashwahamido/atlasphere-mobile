import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { api, type CountryOption } from '@/lib/api';
import { useTrips } from '@/lib/trips';
import { colors, radius } from '@/lib/theme';

// Countries you've been to, then cities in them. Friends see these.
export default function Visited() {
  const { call } = useTrips();
  const [all, setAll] = useState<CountryOption[] | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([call((t) => api.countries(t)), call((t) => api.myProfile(t))])
      .then(([c, p]) => {
        if (cancelled) return;
        setAll(c.countries);
        setCodes(p.visitedCountries.map((x) => x.code));
        setCities(p.visitedCities);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Couldn’t load your places.'); });
    return () => { cancelled = true; };
  }, [call]);

  const chosen = useMemo(() => (all || []).filter((c) => codes.includes(c.code)), [all, codes]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? (all || []).filter((c) => !codes.includes(c.code) && c.name.toLowerCase().includes(q)).slice(0, 8) : [];
  }, [all, codes, query]);

  const toggleCountry = (c: CountryOption) => {
    if (codes.includes(c.code)) {
      setCodes(codes.filter((x) => x !== c.code));
      setCities(cities.filter((k) => !c.cities.includes(k)));
    } else {
      setCodes([...codes, c.code]);
      setQuery('');
    }
  };
  const toggleCity = (k: string) => setCities(cities.includes(k) ? cities.filter((x) => x !== k) : [...cities, k]);

  async function save() {
    setBusy(true);
    try {
      await call((t) => api.setVisited(t, codes, cities));
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save.');
      setBusy(false);
    }
  }

  if (!all) return <View style={styles.center}>{error ? <Banner kind="error" message={error} /> : <ActivityIndicator color={colors.navy} />}</View>;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Banner kind="error" message={error} /> : null}
        <TextInput value={query} onChangeText={setQuery} placeholder="Add a country" placeholderTextColor={colors.textMuted} style={styles.search} accessibilityLabel="Add a country" autoCorrect={false} />
        {matches.map((c) => (
          <Pressable key={c.code} accessibilityRole="button" onPress={() => toggleCountry(c)} style={styles.match}>
            <Text style={styles.matchText}>{c.flag}  {c.name}</Text>
            <Text style={styles.add}>Add</Text>
          </Pressable>
        ))}
        {chosen.length === 0 ? <Text style={styles.muted}>No countries yet. Search above to add one.</Text> : null}
        {chosen.map((c) => (
          <View key={c.code} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.country}>{c.flag}  {c.name}</Text>
              <Button title="Remove" variant="link" onPress={() => toggleCountry(c)} />
            </View>
            <View style={styles.chips}>
              {c.cities.map((k) => {
                const on = cities.includes(k);
                return (
                  <Pressable key={k} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggleCity(k)} style={[styles.chip, on ? styles.chipOn : null]}>
                    <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{k}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <Button title="Save" onPress={save} loading={busy} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 20, paddingBottom: 40, gap: 10, width: '100%', maxWidth: 560, alignSelf: 'center' },
  search: { backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border, borderRadius: radius.field, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text },
  match: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.field },
  matchText: { fontSize: 16, color: colors.navy, fontWeight: '600' },
  add: { color: colors.orange, fontWeight: '800' },
  muted: { fontSize: 14, color: colors.textMuted },
  card: { borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  country: { fontSize: 17, fontWeight: '800', color: colors.navy },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.field },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: 14, color: colors.navy, fontWeight: '500' },
  chipTextOn: { color: colors.white },
});
