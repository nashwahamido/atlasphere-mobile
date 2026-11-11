import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { CrowdMap } from '@/components/CrowdMap';
import { api, type DestinationDay, type DestinationInfo, type PlacesInfo } from '@/lib/api';
import { useTrips } from '@/lib/trips';
import { colors, radius } from '@/lib/theme';
import { busyText, dayLabel, localTime, shortDate, temp, weatherIcon, weatherLabel } from '@/lib/weather';

// Weather, local time, holidays, closures and estimated crowds, per city.
export default function DestinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { call, trips } = useTrips();
  const tripCities = trips.find((t) => t.id === id)?.cities || [];
  const flag = trips.find((t) => t.id === id)?.flag || '';
  const [city, setCity] = useState<string | undefined>(tripCities[0]);
  const [info, setInfo] = useState<DestinationInfo | null>(null);
  const [places, setPlaces] = useState<PlacesInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    call((t) => api.destination(t, id, city))
      .then((d) => { if (!cancelled) { setInfo(d); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Couldn’t load destination info.'); });
    call((t) => api.places(t, id, city))
      .then((p) => { if (!cancelled) setPlaces(p); })
      .catch(() => { if (!cancelled) setPlaces({ cities: [], city: city || '', location: null, dates: [], tripDates: false, days: [], places: [] }); });
    return () => { cancelled = true; };
  }, [call, id, city, reload]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(t);
  }, []);

  const cities = info?.cities?.length ? info.cities : tripCities;
  const days: DestinationDay[] = useMemo(() => info?.days || [], [info]);
  const day = days.find((d) => d.date === selected) || days.find((d) => !d.past) || days[0] || null;

  const closedCount = useMemo(() => {
    const m: Record<string, number> = {};
    (places?.places || []).forEach((p) => p.closedOn.forEach((d) => { m[d] = (m[d] || 0) + 1; }));
    return m;
  }, [places]);

  const mapData = useMemo(() => {
    if (!places?.location) return null;
    const date = day?.date;
    const factor = day?.busy?.factor || 1;
    return {
      lat: places.location.lat,
      lon: places.location.lon,
      points: places.places.filter((p) => !(date && p.closedOn.includes(date))).map((p) => [p.lat, p.lon, p.popularity * factor] as [number, number, number]),
      closed: places.places.filter((p) => date && p.closedOn.includes(date)).map((p) => [p.lat, p.lon, p.name] as [number, number, string]),
    };
  }, [places, day]);

  const switchCity = (c: string) => {
    if (c === city) return;
    setCity(c);
    setInfo(null);
    setPlaces(null);
  };

  const chips = cities.length > 1 ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {cities.map((c) => {
        const on = c === (info?.city || city);
        return (
          <Pressable key={c} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => switchCity(c)} style={[styles.chip, on ? styles.chipOn : null]}>
            <Text style={[styles.chipText, on ? styles.onText : null]}>📍 {c}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  ) : null;

  if (!info) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.content}>{chips}</View>
        <View style={styles.center}>{error ? <Banner kind="error" message={error} /> : <ActivityIndicator color={colors.navy} />}</View>
      </SafeAreaView>
    );
  }
  if (!info.location) {
    return <View style={styles.center}><Text style={styles.muted}>We couldn’t find {info.city} on the map.</Text></View>;
  }

  const clock = localTime(info.location.timezone, now);
  const cur = info.current;
  const isDay = cur?.isDay ?? clock?.isDay ?? null;
  const date = day?.date;
  const closed = (places?.places || []).filter((p) => date && p.closedOn.includes(date));
  const busiest = (places?.places || []).filter((p) => !(date && p.closedOn.includes(date))).sort((a, b) => b.popularity - a.popularity).slice(0, 5);
  const withHours = (places?.places || []).filter((p) => p.hoursKnown).length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setReload((n) => n + 1); setTimeout(() => setRefreshing(false), 800); }} tintColor={colors.navy} />}>
        {chips}

        <View style={[styles.card, styles.head]}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.place} accessibilityRole="header">{flag} {info.location.city}{info.location.country ? ', ' + info.location.country : ''}</Text>
            {clock ? <Text style={styles.clock}>{clock.time}</Text> : null}
            {clock ? <Text style={styles.muted}>{clock.day} · {clock.diff}</Text> : null}
          </View>
          {cur ? (
            <View style={styles.now}>
              <Text style={styles.nowIcon}>{weatherIcon(cur.kind, isDay)}</Text>
              <Text style={styles.nowTemp}>{temp(cur.temp)}</Text>
              <Text style={styles.small}>{weatherLabel(cur.kind, isDay)} now</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.h2}>{info.trip ? `Your trip · ${shortDate(info.trip.start, false)} – ${shortDate(info.trip.end, false)}` : 'The next 7 days'}</Text>
            {!info.trip ? <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/trips/[id]/itinerary', params: { id } })}><Text style={styles.link}>Pick dates</Text></Pressable> : null}
          </View>
          {days.some((d) => d.weather?.source === 'typical') ? <Text style={styles.small}>“Typical” days are more than two weeks away: the average for those dates over recent years.</Text> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
            {days.map((d) => {
              const on = d.date === day?.date;
              return (
                <Pressable key={d.date} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setSelected(d.date)} style={[styles.dayCard, on ? styles.dayCardOn : null]}>
                  <Text style={styles.dayDate}>{shortDate(d.date)}</Text>
                  {d.weather ? (
                    <>
                      <Text style={styles.dayIcon}>{weatherIcon(d.weather.kind)}</Text>
                      <Text style={styles.dayTemps}><Text style={styles.bold}>{temp(d.weather.max)}</Text> {temp(d.weather.min)}</Text>
                      <Text style={styles.daySrc}>{d.weather.source === 'forecast' ? 'Forecast' : 'Typical · ' + dayLabel(d.weather)}</Text>
                    </>
                  ) : <Text style={styles.daySrc}>No weather yet</Text>}
                  {d.holidays.length ? <Text style={[styles.badge, styles.badgeHoliday]}>🎉 Holiday</Text> : null}
                  {d.busy.level !== 'normal' ? <Text style={[styles.badge, d.busy.level === 'very busy' ? styles.badgeHot : styles.badgeBusy]}>{d.busy.level === 'very busy' ? 'Very busy' : 'Busier'}</Text> : null}
                  {closedCount[d.date] ? <Text style={[styles.badge, styles.badgeClosed]}>{closedCount[d.date]} closed</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          {day && day.holidays.length ? <Text style={styles.alert}>🎉 {shortDate(day.date)} is {day.holidays.map((h) => h.name).join(' and ')}{day.holidays.every((h) => h.regional) ? ' in some regions' : ''}. Expect closures and crowds.</Text> : null}
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.h2}>Crowds & closures{day ? ' · ' + shortDate(day.date) : ''}</Text>
            <Text style={styles.estimate}>Estimate</Text>
          </View>
          <Text style={styles.small}>
            {day && busyText(day.busy) ? busyText(day.busy) + ', so expect bigger crowds than usual. ' : 'An ordinary day. '}
            Busier areas are where the best-known sights cluster. This is an estimate from place popularity, weekends, holidays and the season, not live data.
          </Text>
          {places === null ? <ActivityIndicator color={colors.navy} /> : mapData && places.places.length ? (
            <CrowdMap key={info.city} data={mapData} height={300} />
          ) : <Text style={styles.muted}>We couldn’t load places for this city right now.</Text>}
          <View style={styles.legend}>
            <Text style={styles.small}>Quieter</Text>
            <View style={styles.legendBar}>{['#3b82f6', '#22c55e', '#facc15', '#ef4444'].map((c) => <View key={c} style={{ flex: 1, backgroundColor: c }} />)}</View>
            <Text style={styles.small}>Busier</Text>
            <View style={styles.closedDot} />
            <Text style={styles.small}>Closed</Text>
          </View>
          <Text style={styles.h3}>Busiest spots: go early</Text>
          {busiest.length ? busiest.map((p) => <Text key={p.id} style={styles.item}>{p.name}{p.kind ? <Text style={styles.muted}> · {p.kind}</Text> : null}</Text>) : <Text style={styles.muted}>Nothing to show.</Text>}
          <Text style={styles.h3}>Closed {day ? 'on ' + shortDate(day.date) : 'this day'}</Text>
          {closed.length ? closed.map((p) => (
            <View key={p.id} style={styles.item}>
              <Text style={styles.itemText}>{p.name}{p.seasonal ? <Text style={styles.muted}> · closed for the season</Text> : null}</Text>
              {p.hours ? <Text style={styles.hours}>{p.hours}</Text> : null}
            </View>
          )) : <Text style={styles.muted}>None of the places we know the hours for are closed.</Text>}
          {places ? <Text style={styles.small}>Opening hours are known for {withHours} of {places.places.length} places (from OpenStreetMap). Always check before you go.</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Public holidays{info.trip ? ' during your trip' : ' coming up'}</Text>
          {!info.holidaysCovered ? <Text style={styles.muted}>We don’t have holiday data for this country.</Text>
            : info.holidays.length === 0 ? <Text style={styles.muted}>No public holidays during your trip.</Text>
            : info.holidays.map((h, i) => (
              <View key={h.date + i} style={styles.holidayRow}>
                <Text style={styles.holidayDate}>{shortDate(h.date)}</Text>
                <Text style={styles.itemText}>{h.name}{h.localName ? <Text style={styles.muted}> · {h.localName}</Text> : null}{h.regional ? <Text style={styles.muted}> (some regions)</Text> : null}</Text>
              </View>
            ))}
          {info.holidays.length ? <Text style={styles.small}>On public holidays many shops, banks and some sights close or open shorter hours, and popular places get busier.</Text> : null}
        </View>

        <Text style={styles.credits}>Weather: Open-Meteo and MET Norway · Holidays: Nager.Date · Places and hours: OpenStreetMap via Geoapify</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 16, paddingBottom: 40, gap: 12, width: '100%', maxWidth: 600, alignSelf: 'center' },
  chips: { gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  chipOn: { backgroundColor: colors.orange, borderColor: colors.orange },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.navy },
  onText: { color: colors.white },
  card: { backgroundColor: colors.field, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  place: { fontSize: 20, fontWeight: '800', color: colors.navy },
  clock: { fontSize: 28, fontWeight: '800', color: colors.navy },
  now: { alignItems: 'center' },
  nowIcon: { fontSize: 36 },
  nowTemp: { fontSize: 24, fontWeight: '800', color: colors.navy },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  h2: { fontSize: 16, fontWeight: '800', color: colors.navy, flexShrink: 1 },
  h3: { fontSize: 13, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 },
  link: { color: colors.orange, fontWeight: '700' },
  muted: { fontSize: 14, color: colors.textMuted },
  small: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  bold: { fontWeight: '800', color: colors.navy },
  estimate: { fontSize: 11, fontWeight: '700', color: colors.textMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  days: { gap: 8 },
  dayCard: { width: 104, alignItems: 'center', gap: 3, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  dayCardOn: { borderColor: colors.orange, backgroundColor: '#FDF1E4' },
  dayDate: { fontSize: 12, fontWeight: '700', color: colors.navy },
  dayIcon: { fontSize: 24 },
  dayTemps: { fontSize: 13, color: colors.textMuted },
  daySrc: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  badgeHoliday: { backgroundColor: '#F3E8FF', color: '#7e22ce' },
  badgeBusy: { backgroundColor: '#FEF3C7', color: '#a16207' },
  badgeHot: { backgroundColor: '#FEE2E2', color: '#b91c1c' },
  badgeClosed: { backgroundColor: '#E5E7EB', color: '#4b5563' },
  alert: { fontSize: 13, backgroundColor: '#F3E8FF', color: '#581c87', padding: 10, borderRadius: 10, lineHeight: 18 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBar: { flexDirection: 'row', width: 80, height: 8, borderRadius: 4, overflow: 'hidden' },
  closedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4b5563', marginLeft: 10 },
  item: { backgroundColor: colors.bg, borderRadius: 10, padding: 10, fontSize: 15, color: colors.text },
  itemText: { fontSize: 15, color: colors.text },
  hours: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  holidayRow: { flexDirection: 'row', gap: 12, backgroundColor: colors.bg, borderRadius: 10, padding: 10, alignItems: 'center' },
  holidayDate: { fontSize: 14, fontWeight: '800', color: '#7e22ce', width: 90 },
  credits: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
});
