import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { api } from '@/lib/api';
import { useTrips } from '@/lib/trips';
import { colors } from '@/lib/theme';

// Paste an invite link (or just its code) that someone shared.
export default function JoinTrip() {
  const { call, upsert } = useTrips();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    if (!value.trim()) { setError('Paste the invite link first.'); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await call((t) => api.joinTrip(t, value));
      upsert(res.trip);
      router.replace({ pathname: '/trips/[id]', params: { id: res.trip.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t join the trip.');
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title} accessibilityRole="header">Join a trip</Text>
      <Text style={styles.text}>Paste the invite link a friend sent you. It looks like …/groups/join/abc123.</Text>
      {error ? <Banner kind="error" message={error} /> : null}
      <TextField label="Invite link" value={value} onChangeText={setValue} placeholder="https://atlasphere…/groups/join/…"
        autoCapitalize="none" autoCorrect={false} keyboardType="url" onSubmitEditing={join} returnKeyType="go" />
      <Button title="Join trip" onPress={join} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.navy, marginBottom: 6 },
  text: { fontSize: 16, color: colors.textMuted, lineHeight: 22, marginBottom: 20 },
});
