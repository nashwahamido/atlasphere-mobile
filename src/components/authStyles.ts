import { StyleSheet } from 'react-native';

import { colors } from '@/lib/theme';

// Shared typography and layout for the sign-in / sign-up screens.
export const authStyles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', color: colors.navy, marginBottom: 6 },
  subtitle: { fontSize: 16, color: colors.textMuted, lineHeight: 22, marginBottom: 24 },
  forgot: { alignItems: 'flex-end', marginTop: -6, marginBottom: 20 },
  link: { color: colors.blue, fontWeight: '600', fontSize: 15 },
  footer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 },
  footerText: { color: colors.textMuted, fontSize: 15 },
  legal: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 14 },
  legalLink: { color: colors.blue, fontWeight: '600' },
});
