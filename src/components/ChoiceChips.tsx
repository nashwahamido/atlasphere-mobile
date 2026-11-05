import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

type Option = { label: string; value: string };

export function ChoiceChips({ label, options, value, onChange }: { label: string; options: Option[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row} accessibilityRole="radiogroup">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(selected ? '' : o.value)}
              style={[styles.chip, selected ? styles.chipOn : null]}>
              <Text style={[styles.text, selected ? styles.textOn : null]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.field },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  text: { fontSize: 15, color: colors.navy, fontWeight: '500' },
  textOn: { color: colors.white },
});
