import { useState } from 'react';
import { Text } from 'react-native';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { api } from '@/lib/api';
import { isEmail } from '@/lib/validation';

import { authStyles as styles } from '@/components/authStyles';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setFailure(null);
    if (!isEmail(email)) { setError('Please enter the email you signed up with.'); return; }
    setError(undefined);
    setBusy(true);
    try {
      const res = await api.forgotPassword(email);
      setMessage(res.message);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Reset your password</Text>
      <Text style={styles.subtitle}>We’ll email you a link to choose a new password.</Text>
      <Banner kind="success" message={message} />
      <Banner kind="error" message={failure} />
      <TextField label="Email" value={email} onChangeText={(v) => { setEmail(v); setError(undefined); }} error={error}
        placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none"
        autoComplete="email" textContentType="emailAddress" onSubmitEditing={submit} />
      <Button title={message ? 'Send again' : 'Send reset link'} onPress={submit} loading={busy} />
    </Screen>
  );
}
