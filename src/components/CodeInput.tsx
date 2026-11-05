import { useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/lib/theme';

// Six boxes backed by one hidden input, so paste and iOS/Android one-time-code
// autofill fill all six at once.
export function CodeInput({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: boolean }) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const digits = value.split('');
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="Verification code" style={styles.row}>
      {Array.from({ length: 6 }).map((_, i) => {
        const active = i === Math.min(value.length, 5);
        return (
          <View key={i} style={[styles.box, active ? styles.active : null, error ? styles.error : null]}>
            <Text style={styles.digit}>{digits[i] || ''}</Text>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        style={styles.hidden}
        accessibilityLabel="Verification code"
        testID="code-input"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 20 },
  box: {
    flex: 1, maxWidth: 56, aspectRatio: 0.85, borderRadius: 12, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.field, alignItems: 'center', justifyContent: 'center',
  },
  active: { borderColor: colors.orange },
  error: { borderColor: colors.error },
  digit: { fontSize: 24, fontWeight: '700', color: colors.navy },
  hidden: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },
});
