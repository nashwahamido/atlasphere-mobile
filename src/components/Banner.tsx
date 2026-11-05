import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

export function Banner({ kind, message }: { kind: 'error' | 'success'; message?: string | null }) {
  if (!message) return null;
  const error = kind === 'error';
  return (
    <View style={[styles.box, { backgroundColor: error ? colors.errorBg : colors.successBg }]} accessibilityRole="alert">
      <Text style={[styles.text, { color: error ? colors.error : colors.success }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 16 },
  text: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
});
