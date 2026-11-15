import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import { signInWithGoogle, useGoogleAvailable } from '@/lib/googleSignIn';
import { useSession } from '@/lib/session';
import { makeStyles } from '@/lib/theme';

// "Continue with Google", in Google's style (white, coloured G). Hidden until
// the server has Google sign-in set up. `divider` adds an "or" line below.
export function GoogleButton({ onError, divider = true, light }: { onError?: (message: string | null) => void; divider?: boolean; light?: boolean }) {
  const styles = useStyles();
  const available = useGoogleAvailable();
  const { signIn } = useSession();
  const [busy, setBusy] = useState(false);
  if (!available) return null;

  const press = async () => {
    setBusy(true);
    onError?.(null);
    try {
      const res = await signInWithGoogle();
      if (res) await signIn(res.token, res.user);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Google sign-in didn’t work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" onPress={press} disabled={busy}
        style={({ pressed }) => [styles.button, pressed ? { opacity: 0.85 } : null]}>
        {busy ? <ActivityIndicator color="#1F1F1F" /> : (
          <>
            <Image source={require('../../assets/google-g.png')} style={styles.logo} />
            <Text style={styles.text}>Continue with Google</Text>
          </>
        )}
      </Pressable>
      {divider ? (
        <View style={styles.or}>
          <View style={[styles.line, light ? styles.lineLight : null]} />
          <Text style={[styles.orText, light ? styles.orTextLight : null]}>or</Text>
          <View style={[styles.line, light ? styles.lineLight : null]} />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  button: {
    minHeight: 52, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DADCE0',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18,
  },
  logo: { width: 20, height: 20 },
  text: { fontSize: 16, fontWeight: '600', color: '#1F1F1F' },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  lineLight: { backgroundColor: 'rgba(255,255,255,0.35)' },
  orText: { fontSize: 13, color: colors.textMuted },
  orTextLight: { color: 'rgba(255,255,255,0.8)' },
}));
