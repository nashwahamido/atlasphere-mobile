import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { CodeInput } from '@/components/CodeInput';
import { Screen } from '@/components/Screen';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';
import { validateCode } from '@/lib/validation';

import { authStyles as styles } from '@/components/authStyles';

export default function Verify() {
  const params = useLocalSearchParams<{ pendingToken: string; email: string; note?: string }>();
  const { signIn } = useSession();
  const [pendingToken, setPendingToken] = useState(params.pendingToken || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(params.note || null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  async function submit(value = code) {
    const invalid = validateCode(value);
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await api.verify(pendingToken, value);
      await signIn(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
      if (err instanceof ApiError && err.data?.expired) setInfo(null);
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  // Submit automatically once all six digits are in (typed, pasted or autofilled).
  function onCodeChange(value: string) {
    setCode(value);
    if (value.length === 6 && !busy) submit(value);
  }

  async function resend() {
    setResending(true);
    setError(null);
    try {
      const res = await api.resend(pendingToken);
      setPendingToken(res.pendingToken);
      setInfo(res.message);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t send a new code.');
    } finally {
      setResending(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code we sent to <Text style={{ color: colors.orange, fontWeight: '700' }}>{params.email}</Text>.
        {'\n'}Can’t find it? Check your spam folder. The code is valid for 30 minutes.
      </Text>
      <Banner kind="success" message={info} />
      <Banner kind="error" message={error} />
      <CodeInput value={code} onChange={onCodeChange} error={!!error} />
      <Button title="Verify" onPress={() => submit()} loading={busy} />
      <Button title="Send code again" variant="link" onPress={resend} loading={resending} style={{ marginTop: 12 }} />
    </Screen>
  );
}
