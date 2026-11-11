import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { RangeCalendar } from '@/components/RangeCalendar';
import { api, type Block, type DestinationDay, type Itinerary, type Note, type PlacesInfo, type SavedActivity } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { useSession } from '@/lib/session';
import { getSocket } from '@/lib/socket';
import { useTrips } from '@/lib/trips';
import { colors, radius } from '@/lib/theme';
import { addDays, busyText, dayLabel, daysBetween, shortDate, temp, weatherIcon } from '@/lib/weather';

const ROW = 56;
const PALETTE = ['#E8933A', '#3B5F8A', '#2D8B6F', '#8B5A2B', '#6A5ACD'];
const hourLabel = (slot: string) => slot.replace('.', ':');

type Editing = { mode: 'new' | 'edit'; dayIndex: number; timeSlot: string; name: string; color: string; duration: number; from?: { dayIndex: number; timeSlot: string } };

export default function ItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useSession();
  const { call } = useTrips();
  const [it, setIt] = useState<Itinerary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState(0);
  const [picking, setPicking] = useState(false);
  const [range, setRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [savingDates, setSavingDates] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [picks, setPicks] = useState<SavedActivity[]>([]);
  const [info, setInfo] = useState<Record<string, DestinationDay[]>>({});
  const [places, setPlaces] = useState<Record<string, PlacesInfo>>({});
  const [refreshing, setRefreshing] = useState(false);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await call((t) => api.itinerary(t, id));
      setIt(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t load the itinerary.');
    }
  }, [call, id]);

  useEffect(() => {
    let cancelled = false;
    call((t) => api.itinerary(t, id))
      .then((res) => { if (!cancelled) setIt(res); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Couldn’t load the itinerary.'); });
    call((t) => api.saved(t, id)).then((res) => { if (!cancelled) setPicks(res.items); }).catch(() => {});
    return () => { cancelled = true; };
  }, [call, id]);

  // Live: someone changed the plan (here or on the website) → reload it.
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    const watch = () => socket.emit('watch-group', { groupId: id });
    const onUpdate = (d: { groupId?: string | number }) => {
      if (String(d.groupId) !== String(id)) return;
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(load, 250);
    };
    socket.on('connect', watch);
    socket.on('itinerary-update', onUpdate);
    if (socket.connected) watch();
    return () => {
      socket.off('connect', watch);
      socket.off('itinerary-update', onUpdate);
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, [token, id, load]);

  const dayCount = it?.dates ? daysBetween(it.dates.start, it.dates.end) + 1 : 0;
  const dateOf = useCallback((i: number) => (it?.dates ? addDays(it.dates.start, i) : ''), [it]);
  const cityFor = useCallback((i: number) => {
    if (!it) return '';
    if (it.cities.length < 2) return it.cities[0] || '';
    for (let j = i; j >= 0; j--) {
      const set = it.dayCities.find((d) => d.dayIndex === j);
      if (set && it.cities.includes(set.city)) return set.city;
    }
    return it.cities[0];
  }, [it]);
  const usedCities = useMemo(() => {
    const set: string[] = [];
    for (let i = 0; i < dayCount; i++) { const c = cityFor(i); if (c && !set.includes(c)) set.push(c); }
    return set;
  }, [dayCount, cityFor]);

  // Weather, holidays and closures for each city the trip uses.
  const usedKey = usedCities.join('|') + '@' + (it?.dates?.start || '') + (it?.dates?.end || '');
  useEffect(() => {
    if (!it?.dates || !usedCities.length) return;
    let cancelled = false;
    usedCities.forEach((c) => {
      call((t) => api.destination(t, id, c)).then((d) => { if (!cancelled) setInfo((m) => ({ ...m, [c]: d.days })); }).catch(() => {});
      call((t) => api.places(t, id, c)).then((p) => { if (!cancelled) setPlaces((m) => ({ ...m, [c]: p })); }).catch(() => {});
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usedKey, call, id]);

  const dayInfo = (i: number) => (info[cityFor(i)] || []).find((d) => d.date === dateOf(i)) || null;
  const closedPlace = (name: string, i: number) => {
    const p = (places[cityFor(i)]?.places || []).find((x) => x.name.trim().toLowerCase() === name.trim().toLowerCase());
    return p && p.closedOn.includes(dateOf(i)) ? p : null;
  };

  const blocksOf = (i: number) => (it?.blocks || []).filter((b) => b.dayIndex === i);
  const noteCount = (i: number, slot: string) => it?.comments.find((c) => c.dayIndex === i && c.timeSlot === slot)?.count || 0;

  async function saveDates() {
    if (!range.start || !range.end) return;
    setSavingDates(true);
    try {
      await call((t) => api.setDates(t, id, range.start!, range.end!));
      setPicking(false);
      setDay(0);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save the dates.');
    } finally {
      setSavingDates(false);
    }
  }

  async function setCity(i: number, city: string) {
    setIt((cur) => cur ? { ...cur, dayCities: [...cur.dayCities.filter((d) => d.dayIndex !== i), { dayIndex: i, city }] } : cur);
    try { await call((t) => api.setDayCity(t, id, i, city)); } catch (e) { setError(e instanceof Error ? e.message : 'Couldn’t save the city.'); load(); }
  }

  if (!it) {
    return <View style={styles.center}>{error ? <Banner kind="error" message={error} /> : <ActivityIndicator color={colors.navy} />}</View>;
  }

  // ── No dates yet (or changing them) ──
  if (!it.dates || picking) {
    const len = range.start && range.end ? daysBetween(range.start, range.end) + 1 : 0;
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.h1} accessibilityRole="header">When are you going?</Text>
          <Text style={styles.muted}>Tap the first day, then the last day of the trip. Everyone on the trip sees the same dates.</Text>
          {error ? <Banner kind="error" message={error} /> : null}
          <View style={styles.card}>
            <RangeCalendar start={range.start} end={range.end} onChange={(s, e) => setRange({ start: s, end: e })} />
          </View>
          <Text style={styles.rangeText}>
            {range.start && range.end ? `${shortDate(range.start)} – ${shortDate(range.end)} · ${len} ${len === 1 ? 'day' : 'days'}` : range.start ? `Starts ${shortDate(range.start)}, now pick the last day` : `Planned length: ${it.days} days`}
          </Text>
          <Button title="Save dates" onPress={saveDates} disabled={!range.start || !range.end} loading={savingDates} />
          {it.dates ? <Button title="Cancel" variant="link" onPress={() => setPicking(false)} /> : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const activeDay = Math.min(day, dayCount - 1);
  const dInfo = dayInfo(activeDay);
  const blocks = blocksOf(activeDay);
  const closedCount = blocks.filter((b) => closedPlace(b.name, activeDay)).length;
  const covered = new Set<string>(); // slots taken by multi-hour blocks
  blocks.forEach((b) => { const s = it.hours.indexOf(b.timeSlot); for (let k = 1; k < b.duration; k++) if (it.hours[s + k]) covered.add(it.hours[s + k]); });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.navy} />}>
        <View style={styles.datesRow}>
          <Text style={styles.datesText}>🗓 {shortDate(it.dates.start, false)} – {shortDate(it.dates.end, false)} · {dayCount} days</Text>
          <Button title="Change" variant="link" onPress={() => { setRange({ start: it.dates!.start, end: it.dates!.end }); setPicking(true); }} />
        </View>
        {error ? <Banner kind="error" message={error} /> : null}

        {/* Day strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {Array.from({ length: dayCount }, (_, i) => {
            const date = dateOf(i);
            const d = dayInfo(i);
            const on = i === activeDay;
            const cityChange = it.cities.length > 1 && (i === 0 || cityFor(i) !== cityFor(i - 1));
            const planned = blocksOf(i).length;
            return (
              <Pressable key={date} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={shortDate(date) + (planned ? `, ${planned} planned` : '')}
                onPress={() => setDay(i)} style={[styles.dayChip, on ? styles.dayChipOn : null]}>
                <Text style={[styles.dayDow, on ? styles.onText : null]}>{shortDate(date).split(' ')[0]}</Text>
                <Text style={[styles.dayNum, on ? styles.onText : null]}>{date.slice(8).replace(/^0/, '')}</Text>
                <Text style={[styles.dayWx, on ? styles.onText : null]}>{d?.weather ? weatherIcon(d.weather.kind) + ' ' + temp(d.weather.max) : ' '}</Text>
                {cityChange ? <Text style={[styles.dayCity, on ? styles.onText : null]} numberOfLines={1}>{cityFor(i)}</Text> : null}
                <View style={styles.dots}>
                  {d?.holidays.length ? <View style={[styles.dot, { backgroundColor: '#c084fc' }]} /> : null}
                  {planned ? <View style={[styles.dot, { backgroundColor: on ? colors.white : colors.orange }]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Day summary */}
        <View style={styles.hint}>
          <Text style={styles.dayTitle}>Day {activeDay + 1} · {shortDate(dateOf(activeDay))}</Text>
          {it.cities.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityRow}>
              {it.cities.map((c) => {
                const on = c === cityFor(activeDay);
                return (
                  <Pressable key={c} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setCity(activeDay, c)} style={[styles.cityChip, on ? styles.cityChipOn : null]}>
                    <Text style={[styles.cityText, on ? styles.onText : null]}>📍 {c}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
          {dInfo?.weather ? <Text style={styles.hintText}>{weatherIcon(dInfo.weather.kind)} {dayLabel(dInfo.weather)} {temp(dInfo.weather.max)} / {temp(dInfo.weather.min)}{dInfo.weather.source === 'typical' ? ' (typical)' : ''}</Text> : null}
          {dInfo?.holidays.map((h) => <Text key={h.name} style={[styles.hintText, styles.holiday]}>🎉 {h.name}{h.regional ? ' (some regions)' : ''}</Text>)}
          {dInfo && dInfo.busy.level !== 'normal' ? <Text style={styles.hintText}>👥 {busyText(dInfo.busy)}: busier than usual</Text> : null}
          {closedCount ? <Text style={[styles.hintText, styles.warn]}>⚠️ {closedCount} planned {closedCount === 1 ? 'place is' : 'places are'} closed this day</Text> : null}
        </View>

        {/* Schedule */}
        <View style={styles.schedule}>
          {it.hours.map((slot) => {
            if (covered.has(slot)) return null;
            const b = blocks.find((x) => x.timeSlot === slot);
            const span = b ? Math.max(1, Math.min(b.duration, it.hours.length - it.hours.indexOf(slot))) : 1;
            const closed = b ? closedPlace(b.name, activeDay) : null;
            const notes = b ? noteCount(activeDay, slot) : 0;
            return (
              <View key={slot} style={[styles.slotRow, { minHeight: ROW * span }]}>
                <Text style={styles.slotTime}>{hourLabel(slot)}</Text>
                {b ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`${b.name}, ${hourLabel(slot)}, ${b.duration} hours. Edit`}
                    onPress={() => setEditing({ mode: 'edit', dayIndex: activeDay, timeSlot: slot, name: b.name, color: b.color, duration: b.duration, from: { dayIndex: activeDay, timeSlot: slot } })}
                    style={[styles.block, { backgroundColor: b.color, minHeight: ROW * span - 6 }]}>
                    <Text style={styles.blockName}>{b.name}</Text>
                    <View style={styles.blockMeta}>
                      <Text style={styles.blockSmall}>{b.duration} h</Text>
                      {notes ? <Text style={styles.blockSmall}>💬 {notes}</Text> : null}
                      {closed ? <Text style={styles.closedBadge}>Closed this day</Text> : null}
                    </View>
                  </Pressable>
                ) : (
                  <Pressable accessibilityRole="button" accessibilityLabel={'Add something at ' + hourLabel(slot)}
                    onPress={() => setEditing({ mode: 'new', dayIndex: activeDay, timeSlot: slot, name: '', color: PALETTE[0], duration: 1 })}
                    style={styles.emptySlot}>
                    <Ionicons name="add" size={18} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {editing ? (
        <BlockSheet
          tripId={id}
          editing={editing}
          hours={it.hours}
          dayBlocks={blocks}
          picks={picks}
          myId={user?.id}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      ) : null}
    </SafeAreaView>
  );
}

// Add / edit an activity: what, when, how long, colour, notes.
function BlockSheet({ tripId, editing, hours, dayBlocks, picks, myId, onClose, onSaved }: {
  tripId: string; editing: Editing; hours: string[]; dayBlocks: Block[]; picks: SavedActivity[]; myId?: number;
  onClose: () => void; onSaved: () => void;
}) {
  const { call } = useTrips();
  const [e, setE] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (editing.mode !== 'edit') return;
    let cancelled = false;
    call((t) => api.notes(t, tripId, editing.dayIndex, editing.timeSlot)).then((r) => { if (!cancelled) setNotes(r.comments); }).catch(() => { if (!cancelled) setNotes([]); });
    return () => { cancelled = true; };
  }, [call, tripId, editing]);

  // Would this overlap something else on the same day?
  const clash = () => {
    const s = hours.indexOf(e.timeSlot), end = s + e.duration;
    if (end > hours.length) return 'That runs past the end of the day.';
    for (const b of dayBlocks) {
      if (e.from && b.timeSlot === e.from.timeSlot && b.dayIndex === e.from.dayIndex) continue;
      const bs = hours.indexOf(b.timeSlot), be = bs + b.duration;
      if (s < be && bs < end) return `That overlaps with ${b.name} at ${hourLabel(b.timeSlot)}.`;
    }
    return null;
  };

  async function save() {
    if (!e.name.trim()) { setErr('Pick or type an activity.'); return; }
    const c = clash();
    if (c) { setErr(c); return; }
    setBusy(true);
    try {
      await call((t) => api.saveBlock(t, tripId, { dayIndex: e.dayIndex, timeSlot: e.timeSlot, name: e.name.trim(), color: e.color, duration: e.duration }, e.from));
      onSaved();
    } catch (x) { setErr(x instanceof Error ? x.message : 'Couldn’t save.'); setBusy(false); }
  }
  async function remove() {
    if (!e.from) return;
    if (!(await confirmAction('Remove this?', `${e.name} will be removed from the itinerary for everyone.`, 'Remove'))) return;
    setBusy(true);
    try { await call((t) => api.deleteBlock(t, tripId, e.from!.dayIndex, e.from!.timeSlot)); onSaved(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Couldn’t remove it.'); setBusy(false); }
  }
  async function addNote() {
    const text = note.trim();
    if (!text || !e.from) return;
    try {
      const r = await call((t) => api.addNote(t, tripId, e.from!.dayIndex, e.from!.timeSlot, text));
      setNotes((n) => [...(n || []), r.comment]);
      setNote('');
    } catch (x) { setErr(x instanceof Error ? x.message : 'Couldn’t add the note.'); }
  }
  async function deleteNote(n: Note) {
    try { await call((t) => api.deleteNote(t, tripId, n.id)); setNotes((list) => (list || []).filter((x) => x.id !== n.id)); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Couldn’t delete the note.'); }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.sheet} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheetHead}>
            <Button title="Cancel" variant="link" onPress={onClose} />
            <Text style={styles.sheetTitle}>{e.mode === 'new' ? 'Add to the day' : 'Edit'}</Text>
            <Button title="Save" variant="link" onPress={save} loading={busy} />
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            {err ? <Banner kind="error" message={err} /> : null}
            <Text style={styles.label}>What</Text>
            <TextInput value={e.name} onChangeText={(v) => setE({ ...e, name: v })} placeholder="e.g. Lunch at the market" placeholderTextColor={colors.textMuted}
              style={styles.input} maxLength={255} accessibilityLabel="Activity" />
            {picks.length ? (
              <>
                <Text style={styles.smallLabel}>From the group’s picks</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickRow} keyboardShouldPersistTaps="handled">
                  {picks.map((p) => (
                    <Pressable key={p.id} accessibilityRole="button" onPress={() => setE({ ...e, name: p.name })} style={[styles.pickChip, e.name === p.name ? styles.pickChipOn : null]}>
                      <Text style={[styles.pickText, e.name === p.name ? styles.onText : null]} numberOfLines={1}>{p.name} · 👍 {p.upvotes}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            <Text style={styles.label}>Starts at</Text>
            <View style={styles.hourGrid}>
              {hours.map((h) => (
                <Pressable key={h} accessibilityRole="radio" accessibilityState={{ selected: e.timeSlot === h }} onPress={() => setE({ ...e, timeSlot: h })} style={[styles.hourChip, e.timeSlot === h ? styles.hourChipOn : null]}>
                  <Text style={[styles.hourText, e.timeSlot === h ? styles.onText : null]}>{hourLabel(h)}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>How long</Text>
            <View style={styles.stepper}>
              <Pressable accessibilityRole="button" accessibilityLabel="Shorter" onPress={() => setE({ ...e, duration: Math.max(1, e.duration - 1) })} style={styles.stepBtn}><Text style={styles.stepText}>−</Text></Pressable>
              <Text style={styles.stepValue}>{e.duration} {e.duration === 1 ? 'hour' : 'hours'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Longer" onPress={() => setE({ ...e, duration: Math.min(6, e.duration + 1) })} style={styles.stepBtn}><Text style={styles.stepText}>+</Text></Pressable>
            </View>

            <Text style={styles.label}>Colour</Text>
            <View style={styles.colors}>
              {PALETTE.map((c) => (
                <Pressable key={c} accessibilityRole="radio" accessibilityLabel={'Colour ' + c} accessibilityState={{ selected: e.color === c }} onPress={() => setE({ ...e, color: c })}
                  style={[styles.swatch, { backgroundColor: c }, e.color === c ? styles.swatchOn : null]} />
              ))}
            </View>

            {e.mode === 'edit' ? (
              <>
                <Text style={styles.label}>Notes</Text>
                {notes === null ? <ActivityIndicator color={colors.navy} /> : notes.length === 0 ? <Text style={styles.muted}>No notes yet. Add tickets, addresses or reminders.</Text> : notes.map((n) => (
                  <View key={n.id} style={styles.note}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noteAuthor}>{n.userName}</Text>
                      <Text style={styles.noteText}>{n.comment}</Text>
                    </View>
                    {n.userId === myId ? <Pressable accessibilityRole="button" accessibilityLabel="Delete note" onPress={() => deleteNote(n)}><Ionicons name="trash-outline" size={18} color={colors.textMuted} /></Pressable> : null}
                  </View>
                ))}
                <View style={styles.noteRow}>
                  <TextInput value={note} onChangeText={setNote} placeholder="Add a note" placeholderTextColor={colors.textMuted} style={[styles.input, { flex: 1 }]} maxLength={1000} accessibilityLabel="New note" onSubmitEditing={addNote} returnKeyType="send" />
                  <Button title="Add" variant="secondary" onPress={addNote} style={{ minHeight: 46, paddingHorizontal: 16 }} />
                </View>
                <Button title="Remove from the itinerary" variant="danger" onPress={remove} />
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 18, paddingBottom: 40, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  h1: { fontSize: 24, fontWeight: '800', color: colors.navy },
  muted: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  card: { backgroundColor: colors.bg, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 12 },
  rangeText: { fontSize: 16, fontWeight: '700', color: colors.navy, textAlign: 'center' },
  datesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  datesText: { fontSize: 15, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  strip: { gap: 8, paddingVertical: 2 },
  dayChip: { width: 64, paddingVertical: 8, borderRadius: 14, alignItems: 'center', gap: 1, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border },
  dayChipOn: { backgroundColor: colors.orange, borderColor: colors.orange },
  dayDow: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  dayNum: { fontSize: 19, fontWeight: '800', color: colors.navy },
  dayWx: { fontSize: 11, color: colors.textMuted },
  dayCity: { fontSize: 10, fontWeight: '800', color: colors.orange, maxWidth: 58 },
  dots: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  onText: { color: colors.white },
  hint: { backgroundColor: colors.field, borderRadius: 14, padding: 12, gap: 6, borderWidth: 1, borderColor: colors.border },
  dayTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  cityRow: { gap: 6 },
  cityChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  cityChipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  cityText: { fontSize: 13, fontWeight: '700', color: colors.navy },
  hintText: { fontSize: 14, color: colors.text },
  holiday: { color: '#7e22ce', fontWeight: '700' },
  warn: { color: '#92400e', fontWeight: '700' },
  schedule: { borderTopWidth: 1, borderTopColor: colors.border },
  slotRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'stretch' },
  slotTime: { width: 54, paddingTop: 6, fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  emptySlot: { flex: 1, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 8 },
  block: { flex: 1, marginVertical: 3, borderRadius: 12, padding: 10, gap: 4 },
  blockName: { color: colors.white, fontWeight: '800', fontSize: 15 },
  blockMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  blockSmall: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  closedBadge: { backgroundColor: 'rgba(0,0,0,0.35)', color: colors.white, fontSize: 11, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  sheet: { flex: 1, backgroundColor: colors.bg },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.navy },
  sheetBody: { padding: 18, gap: 10, paddingBottom: 40, width: '100%', maxWidth: 560, alignSelf: 'center' },
  label: { fontSize: 15, fontWeight: '800', color: colors.navy, marginTop: 8 },
  smallLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border, borderRadius: radius.field, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text },
  pickRow: { gap: 8 },
  pickChip: { maxWidth: 240, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  pickChipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  pickText: { fontSize: 14, fontWeight: '600', color: colors.navy },
  hourGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hourChip: { width: 64, paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  hourChipOn: { backgroundColor: colors.orange, borderColor: colors.orange },
  hourText: { fontSize: 14, fontWeight: '700', color: colors.navy },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 22, color: colors.navy },
  stepValue: { fontSize: 17, fontWeight: '800', color: colors.navy, minWidth: 80, textAlign: 'center' },
  colors: { flexDirection: 'row', gap: 12 },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  swatchOn: { borderWidth: 3, borderColor: colors.navy },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.field, borderRadius: 12, padding: 10 },
  noteAuthor: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  noteText: { fontSize: 15, color: colors.text, marginTop: 2 },
  noteRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
});
