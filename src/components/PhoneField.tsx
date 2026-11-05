import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COUNTRY_CODES } from '@/lib/countryCodes';
import { colors, radius } from '@/lib/theme';

// Browsers draw their own focus ring around inputs; the field box already shows focus.
const noWebOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {};

type Props = { countryCode: string; onCountryCode: (c: string) => void; value: string; onChange: (v: string) => void; error?: string };

export function PhoneField({ countryCode, onCountryCode, value, onChange, error }: Props) {
  const [open, setOpen] = useState(false);
  const current = COUNTRY_CODES.find((c) => c.code === countryCode);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Phone</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => setOpen(true)}
          style={[styles.code, error ? styles.err : null]}
          accessibilityRole="button"
          accessibilityLabel={'Country code ' + countryCode + ', change'}>
          <Text style={styles.codeText}>{current?.flag} {countryCode} ▾</Text>
        </Pressable>
        <View style={[styles.box, error ? styles.err : null]}>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="Phone number"
            placeholderTextColor="#8A99A8"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            accessibilityLabel="Phone number"
            style={styles.input}
          />
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Country code</Text>
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button" hitSlop={10}>
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
          <FlatList
            data={COUNTRY_CODES}
            keyExtractor={(c) => c.code}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { onCountryCode(item.code); setOpen(false); }}
                style={[styles.item, item.code === countryCode ? styles.itemOn : null]}
                accessibilityRole="button">
                <Text style={styles.itemText}>{item.flag}  {item.code}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  code: {
    minHeight: 50, paddingHorizontal: 12, justifyContent: 'center', borderRadius: radius.field,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.field,
  },
  codeText: { fontSize: 16, color: colors.text },
  box: { flex: 1, borderRadius: radius.field, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.field, paddingHorizontal: 14 },
  input: { minHeight: 50, fontSize: 16, color: colors.text, ...noWebOutline },
  err: { borderColor: colors.error },
  error: { color: colors.error, fontSize: 13, marginTop: 6 },
  sheet: { flex: 1, backgroundColor: colors.bg },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.navy },
  done: { fontSize: 16, fontWeight: '700', color: colors.blue },
  item: { paddingVertical: 14, paddingHorizontal: 20 },
  itemOn: { backgroundColor: colors.field },
  itemText: { fontSize: 17, color: colors.text },
});
