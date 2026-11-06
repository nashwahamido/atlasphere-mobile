import { Image, StyleSheet, Text, View } from 'react-native';

import { absoluteUrl } from '@/lib/api';
import { colors } from '@/lib/theme';

export function Avatar({ name, url, size = 44 }: { name: string; url?: string | null; size?: number }) {
  const src = absoluteUrl(url);
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (src) return <Image source={{ uri: src }} style={style} accessibilityIgnoresInvertColors />;
  return (
    <View style={[style, styles.fallback]} accessibilityElementsHidden importantForAccessibility="no">
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{(name || '?').trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.white, fontWeight: '800' },
});
