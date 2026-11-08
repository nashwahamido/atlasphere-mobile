import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { api, type CountryOption } from '@/lib/api';
import { useTrips } from '@/lib/trips';
import { colors, radius } from '@/lib/theme';

type Step = 'country' | 'cities' | 'details';

// New trip in three steps, like the website: country → cities → length and
// interests. The first city picked is the trip's main destination.
export default function NewTrip() {
  const { call, upsert } = useTrips();
  const [countries, setCountries] = useState<CountryOption[] | null>(null);
  const [interestOptions, setInterestOptions] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('country');
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState<CountryOption | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [days, setDays] = useState(7);
  const [interests, setInterests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    call((t) => api.countries(t))
      .then((res) => { if (!cancelled) { setCountries(res.countries); setInterestOptions(res.interests); } })
      .catch((e) => { if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Couldn’t load countries.'); });
    return () => { cancelled = true; };
  }, [call]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = countries || [];
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q) || c.cities.some((k) => k.toLowerCase().includes(q)));
  }, [countries, query]);

  const toggleCity = (c: string) => setCities((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]));
  const toggleInterest = (t: string) => setInterests((list) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]));

  async function create() {
    if (!country) return;
    setBusy(true);
    setError(null);
    try {
      const res = await call((t) => api.createTrip(t, { country: country.name, cities, days, interests }));
      upsert(res.trip);
      router.replace({ pathname: '/trips/[id]', params: { id: res.trip.id, created: '1' } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t create the trip.');
      setBusy(false);
    }
  }

  const title = step === 'country' ? 'Where to?' : step === 'cities' ? 'Which cities?' : 'Trip details';

  if (!countries) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Stack.Screen options={{ title }} />
        <View style={styles.center}>
          {loadError ? <Banner kind="error" message={loadError} /> : <ActivityIndicator color={colors.navy} />}
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'country') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Stack.Screen options={{ title }} />
        <View style={styles.pad}>
          <Text style={styles.stepNote}>Step 1 of 3</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search countries or cities"
            placeholderTextColor={colors.textMuted}
            style={styles.search}
            autoCorrect={false}
            accessibilityLabel="Search countries or cities"
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.code}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listPad}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => { setCountry(item); setCities(item.cities.length === 1 ? [item.cities[0]] : []); setStep('cities'); }}
              style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}>
              <Text style={styles.rowFlag}>{item.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>{item.cities.join(', ')}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No country matches “{query}”.</Text>}
        />
      </SafeAreaView>
    );
  }

  if (step === 'cities' && country) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Stack.Screen options={{ title }} />
        <FlatList
          data={country.cities}
          keyExtractor={(c) => c}
          contentContainerStyle={styles.listPad}
          ListHeaderComponent={
            <View style={styles.headBlock}>
              <Text style={styles.stepNote}>Step 2 of 3</Text>
              <Text style={styles.h1}>{country.flag} {country.name}</Text>
              <Text style={styles.note}>Pick one or more. The first one you pick is where the trip starts.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const n = cities.indexOf(item);
            const on = n !== -1;
            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => toggleCity(item)}
                style={({ pressed }) => [styles.row, on ? styles.rowOn : null, pressed ? styles.rowPressed : null]}>
                <View style={[styles.check, on ? styles.checkOn : null]}>
                  <Text style={styles.checkText}>{on ? n + 1 : ''}</Text>
                </View>
                <Text style={[styles.rowName, { flex: 1 }]}>{item}</Text>
              </Pressable>
            );
          }}
          ListFooterComponent={
            <View style={styles.footer}>
              <Button title={cities.length ? `Next (${cities.length} ${cities.length === 1 ? 'city' : 'cities'})` : 'Pick at least one city'} disabled={!cities.length} onPress={() => setStep('details')} />
              <Button title="Change country" variant="link" onPress={() => setStep('country')} />
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.listPad} keyboardShouldPersistTaps="handled">
          <View style={styles.headBlock}>
            <Text style={styles.stepNote}>Step 3 of 3</Text>
            <Text style={styles.h1}>{country?.flag} {cities.join(' → ')}</Text>

            <Text style={styles.label}>How many days?</Text>
            <View style={styles.stepper}>
              <Pressable accessibilityRole="button" accessibilityLabel="One day less" onPress={() => setDays((d) => Math.max(1, d - 1))} style={styles.stepBtn}><Text style={styles.stepBtnText}>−</Text></Pressable>
              <Text style={styles.days} accessibilityLiveRegion="polite">{days} {days === 1 ? 'day' : 'days'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="One day more" onPress={() => setDays((d) => Math.min(60, d + 1))} style={styles.stepBtn}><Text style={styles.stepBtnText}>+</Text></Pressable>
            </View>

            <Text style={styles.label}>What are you into? <Text style={styles.optional}>(optional)</Text></Text>
            <Text style={styles.note}>Recommendations that match come first.</Text>
            <View style={styles.chips}>
              {interestOptions.map((t) => {
                const on = interests.includes(t);
                return (
                  <Pressable key={t} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggleInterest(t)} style={[styles.chip, on ? styles.chipOn : null]}>
                    <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>

            {error ? <Banner kind="error" message={error} /> : null}
            <Button title="Create trip" onPress={create} loading={busy} style={styles.create} />
            <Button title="Back" variant="link" onPress={() => setStep('cities')} />
          </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  pad: { paddingHorizontal: 20, paddingTop: 4, width: '100%', maxWidth: 560, alignSelf: 'center' },
  listPad: { paddingHorizontal: 20, paddingBottom: 40, width: '100%', maxWidth: 560, alignSelf: 'center' },
  headBlock: { gap: 6, marginBottom: 12 },
  stepNote: { fontSize: 13, fontWeight: '700', color: colors.orange, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  h1: { fontSize: 24, fontWeight: '800', color: colors.navy },
  note: { fontSize: 15, color: colors.textMuted, lineHeight: 21 },
  search: { backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border, borderRadius: radius.field, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 6, borderWidth: 1, borderColor: 'transparent' },
  rowOn: { backgroundColor: colors.field, borderColor: colors.border },
  rowPressed: { backgroundColor: colors.field },
  rowFlag: { fontSize: 28 },
  rowName: { fontSize: 17, fontWeight: '600', color: colors.navy },
  rowSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 30 },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.orange, borderColor: colors.orange },
  checkText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  footer: { marginTop: 14, gap: 6 },
  label: { fontSize: 16, fontWeight: '700', color: colors.navy, marginTop: 18 },
  optional: { fontWeight: '400', color: colors.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 6 },
  stepBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 24, color: colors.navy, fontWeight: '600' },
  days: { fontSize: 22, fontWeight: '800', color: colors.navy, minWidth: 90, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 18 },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.field },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: 15, color: colors.navy, fontWeight: '500' },
  chipTextOn: { color: colors.white },
  create: { marginTop: 4 },
});
