import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';
import { validateLogin, type FieldErrors } from '@/lib/validation';
import { authStyles as styles } from '@/components/authStyles';

export default function Login() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const edit = (key: keyof FieldErrors, set: (v: string) => void) => (v: string) => {
    set(v);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function submit() {
    const found = validateLogin(email, password);
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const res = await api.login(email, password);
      await signIn(res.token, res.user);
    } catch (err) {
      if (err instanceof ApiError && err.data?.needsVerification) {
        router.push({
          pathname: '/verify',
          params: { pendingToken: String(err.data.pendingToken), email: String(err.data.email || email), note: err.message },
        });
      } else {
        setMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Log in to plan your next trip with your group.</Text>
      <Banner kind="error" message={message} />
      <TextField
        label="Email"
        value={email}
        onChangeText={edit('email', setEmail)}
        error={errors.email}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={edit('password', setPassword)}
        error={errors.password}
        placeholder="Your password"
        secureToggle
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <View style={styles.forgot}>
        <Link href="/forgot-password" style={styles.link}>Forgot password?</Link>
      </View>
      <Button title="Log in" onPress={submit} loading={busy} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>New to Atlasphere? </Text>
        <Link href="/register" replace style={styles.link}>Create an account</Link>
      </View>
    </Screen>
  );
}
