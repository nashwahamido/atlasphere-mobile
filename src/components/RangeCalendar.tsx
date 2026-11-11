import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const HEAD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);

// Tap the first day, then the last day of the trip (up to 60 days).
export function RangeCalendar({ start, end, onChange }: { start: string | null; end: string | null; onChange: (start: string | null, end: string | null) => void }) {
  const first = start ? new Date(start + 'T12:00:00Z') : new Date();
  const [year, setYear] = useState(first.getUTCFullYear());
  const [month, setMonth] = useState(first.getUTCMonth());
  const today = new Date().toISOString().slice(0, 10);

  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7; // Monday first
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const move = (n: number) => {
    const d = new Date(Date.UTC(year, month + n, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
  };
  const tap = (day: string) => {
    if (!start || (start && end) || day < start) return onChange(day, null);
    const length = Math.round((Date.parse(day) - Date.parse(start)) / 86400000) + 1;
    if (length > 60) return onChange(day, null);
    onChange(start, day);
  };

  return (
    <View>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => move(-1)} style={styles.arrow}><Text style={styles.arrowText}>‹</Text></Pressable>
        <Text style={styles.title} accessibilityRole="header">{MONTHS[month]} {year}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => move(1)} style={styles.arrow}><Text style={styles.arrowText}>›</Text></Pressable>
      </View>
      <View style={styles.grid}>
        {HEAD.map((h) => <Text key={h} style={styles.dow}>{h}</Text>)}
        {cells.map((d, i) => {
          if (!d) return <View key={'e' + i} style={styles.cell} />;
          const day = iso(year, month, d);
          const isStart = day === start, isEnd = day === end;
          const inRange = !!(start && end && day > start && day < end);
          const past = day < today;
          return (
            <Pressable key={day} accessibilityRole="button" accessibilityState={{ selected: isStart || isEnd }} accessibilityLabel={day}
              disabled={past} onPress={() => tap(day)} style={styles.cell}>
              <View style={[styles.dayBox, inRange ? styles.inRange : null, isStart ? styles.start : null, isEnd ? styles.end : null]}>
                <Text style={[styles.dayText, past ? styles.past : null, isStart || isEnd ? styles.selText : null]}>{d}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  arrow: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.field },
  arrowText: { fontSize: 24, color: colors.navy, marginTop: -2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dow: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, fontWeight: '700', color: colors.textMuted, paddingVertical: 6 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  dayBox: { flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  inRange: { backgroundColor: '#E3ECF6', borderRadius: 8 },
  start: { backgroundColor: colors.blue },
  end: { backgroundColor: colors.orange },
  dayText: { fontSize: 15, color: colors.navy, fontWeight: '500' },
  past: { color: '#B8C3CF' },
  selText: { color: colors.white, fontWeight: '800' },
});
