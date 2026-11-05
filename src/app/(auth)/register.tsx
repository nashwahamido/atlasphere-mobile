import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { ChoiceChips } from '@/components/ChoiceChips';
import { PhoneField } from '@/components/PhoneField';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { api } from '@/lib/api';
import { fullPhone, validateRegister, type FieldErrors } from '@/lib/validation';

import { authStyles as styles } from '@/components/authStyles';

const GENDERS = [
  { label: 'Male', value: '1' },
  { label: 'Female', value: '2' },
  { label: 'Diverse', value: '3' },
];

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+353');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const edit = (key: keyof FieldErrors, set: (v: string) => void) => (v: string) => {
    set(v);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function submit() {
    const fullNumber = fullPhone(countryCode, phone);
    const found = validateRegister({ username, email, phone: fullNumber, password });
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const res = await api.register({ username, email, phone: fullNumber, gender: gender || undefined, password });
      router.push({ pathname: '/verify', params: { pendingToken: res.pendingToken, email: res.email } });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Plan trips together: chat, vote on things to do and build the itinerary.</Text>
      <Banner kind="error" message={message} />
      <TextField label="Name" value={username} onChangeText={edit('username', setUsername)} error={errors.username}
        placeholder="Your name" autoComplete="name" textContentType="name" maxLength={20} />
      <TextField label="Email" value={email} onChangeText={edit('email', setEmail)} error={errors.email}
        placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none"
        autoComplete="email" textContentType="emailAddress" />
      <PhoneField countryCode={countryCode} onCountryCode={setCountryCode} value={phone} onChange={edit('phone', setPhone)} error={errors.phone} />
      <ChoiceChips label="Gender (optional)" options={GENDERS} value={gender} onChange={setGender} />
      <TextField label="Password" value={password} onChangeText={edit('password', setPassword)} error={errors.password}
        placeholder="6–12 characters" secureToggle maxLength={12}
        autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submit} />
      <Button title="Create account" onPress={submit} loading={busy} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Link href="/login" replace style={styles.link}>Log in</Link>
      </View>
    </Screen>
  );
}
