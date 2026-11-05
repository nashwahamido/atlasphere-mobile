import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, Platform } from 'react-native';

import { colors, radius } from '@/lib/theme';

// Browsers draw their own focus ring around inputs; the field box already shows focus.
const noWebOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {};

type Props = TextInputProps & { label: string; error?: string; secureToggle?: boolean };

export function TextField({ label, error, secureToggle, style, ...input }: Props) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label} nativeID={label}>{label}</Text>
      <View style={[styles.box, error ? styles.boxError : null]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor="#8A99A8"
          style={[styles.input, style]}
          secureTextEntry={secureToggle ? hidden : input.secureTextEntry}
          {...input}
        />
        {secureToggle ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Text style={styles.toggle}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  box: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.field,
    borderRadius: radius.field, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14,
  },
  boxError: { borderColor: colors.error },
  input: { flex: 1, minHeight: 50, fontSize: 16, color: colors.text, ...noWebOutline },
  toggle: { color: colors.blue, fontWeight: '600', fontSize: 14, paddingLeft: 10 },
  error: { color: colors.error, fontSize: 13, marginTop: 6 },
});
