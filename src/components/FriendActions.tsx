import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { FriendAction, Relationship } from '@/lib/api';
import { useFriends } from '@/lib/friends';
import { colors } from '@/lib/theme';

type Props = {
  personId: number;
  name: string;
  state: Relationship;
  size?: 'sm' | 'lg';
  onChange?: (state: Relationship) => void;
};

// The buttons for one relationship state (same as the website):
// none → Add friend · outgoing → Request sent + Cancel · incoming → Accept / Decline · friends → Unfriend
export function FriendActions({ personId, name, state, size = 'sm', onChange }: Props) {
  const { act } = useFriends();
  const [busy, setBusy] = useState<FriendAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: FriendAction) {
    setBusy(action);
    setError(null);
    try {
      // Run the action first: with `onChange?.(await act(...))` the whole call,
      // including act(), would be skipped whenever no onChange is passed.
      const next = await act(personId, action);
      onChange?.(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  }

  function confirmUnfriend() {
    const message = `Remove ${name} from your friends?`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) run('remove');
      return;
    }
    Alert.alert('Unfriend', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unfriend', style: 'destructive', onPress: () => run('remove') },
    ]);
  }

  const lg = size === 'lg';
  const btn = (label: string, action: FriendAction, kind: 'primary' | 'ghost', onPress?: () => void) => (
    <Pressable
      key={action}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${name}`}
      disabled={!!busy}
      onPress={onPress || (() => run(action))}
      style={({ pressed }) => [styles.btn, lg && styles.btnLg, kind === 'primary' ? styles.primary : styles.ghost, (pressed || busy) && { opacity: 0.7 }]}>
      {busy === action ? (
        <ActivityIndicator color={kind === 'primary' ? colors.white : colors.navy} size="small" />
      ) : (
        <Text style={[styles.btnText, lg && styles.btnTextLg, kind === 'primary' ? styles.primaryText : styles.ghostText]}>{label}</Text>
      )}
    </Pressable>
  );

  return (
    <View style={[styles.wrap, lg && styles.wrapLg]}>
      <View style={styles.row}>
        {state === 'none' && btn('Add friend', 'request', 'primary')}
        {state === 'outgoing' && (<><Text style={styles.status}>Request sent</Text>{btn('Cancel', 'cancel', 'ghost')}</>)}
        {state === 'incoming' && (<>{btn('Accept', 'accept', 'primary')}{btn('Decline', 'decline', 'ghost')}</>)}
        {state === 'friends' && (<><Text style={[styles.status, styles.friends]}>✓ Friends</Text>{btn('Unfriend', 'remove', 'ghost', confirmUnfriend)}</>)}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-end' },
  wrapLg: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  btn: { minHeight: 36, minWidth: 64, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  btnLg: { minHeight: 48, paddingHorizontal: 26 },
  primary: { backgroundColor: colors.orange },
  ghost: { backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border },
  btnText: { fontSize: 14, fontWeight: '700' },
  btnTextLg: { fontSize: 16 },
  primaryText: { color: colors.white },
  ghostText: { color: colors.navy },
  status: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  friends: { color: colors.success },
  error: { color: colors.error, fontSize: 13, marginTop: 6 },
});
