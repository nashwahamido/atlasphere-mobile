import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { ChoiceChips } from '@/components/ChoiceChips';
import { api, type MyProfile } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { HELP_URL, openPage, PRIVACY_URL, TERMS_URL } from '@/lib/links';
import { pickPhotoForm } from '@/lib/photo';
import { disablePush, enablePush, openPhoneSettings, pushStatus, type PushStatus } from '@/lib/push';
import { useSession } from '@/lib/session';
import { useTrips } from '@/lib/trips';
import { makeStyles, radius, type ThemePreference, useColors, useTheme } from '@/lib/theme';

export default function ProfileTab() {
  const styles = useStyles();
  const colors = useColors();
  const { token, user, signOut, updateUser } = useSession();
  const { preference, setPreference } = useTheme();
  const { call } = useTrips();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [push, setPush] = useState<PushStatus | null>(null);

  // Re-checked on focus: it may have been changed in the phone's settings.
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    pushStatus().then((s) => { if (!cancelled) setPush(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, []));

  async function togglePush(on: boolean) {
    if (!token) return;
    setBusy('push');
    try {
      if (on) {
        const s = await enablePush(token, { ask: true });
        setPush(s);
        if (s === 'on') setNotice('Push notifications are on.');
      } else {
        await disablePush(token, { remember: true });
        setPush('off');
      }
    } catch (e) {
      setError('Couldn’t change push notifications' + (e instanceof Error && e.message ? `: ${e.message}` : '. Please try again.'));
    } finally {
      setBusy(null);
    }
  }

  // Refresh whenever the tab is shown (e.g. after editing places).
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    call((t) => api.myProfile(t)).then((p) => { if (!cancelled) setProfile(p); }).catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Couldn’t load your profile.'); });
    return () => { cancelled = true; };
  }, [call]));

  async function changePhoto() {
    const form = await pickPhotoForm([1, 1]);
    if (!form) return;
    setBusy('photo');
    setError(null);
    try {
      const res = await call((t) => api.uploadMyPhoto(t, form));
      await updateUser(res.user);
      setProfile((p) => (p ? { ...p, user: res.user } : p));
      setNotice('Photo updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t update your photo.');
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    if (!(await confirmAction('Delete your account?', 'Your profile and friendships are deleted. Messages you sent stay in trip chats. This can’t be undone.', 'Delete account'))) return;
    if (!(await confirmAction('Are you sure?', 'Last chance: your Atlasphere account will be deleted for good.', 'Yes, delete it'))) return;
    setBusy('delete');
    try {
      await call((t) => api.deleteAccount(t));
      await signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t delete your account.');
      setBusy(null);
    }
  }

  const me = profile?.user || user;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={changePhoto} disabled={busy === 'photo'}>
            <Avatar name={me?.username || '?'} url={me?.profilePictureUrl} size={104} />
            <View style={styles.camera}>{busy === 'photo' ? <ActivityIndicator color={colors.white} size="small" /> : <Ionicons name="camera" size={16} color={colors.white} />}</View>
          </Pressable>
          <Text style={styles.name} accessibilityRole="header">{me?.username}</Text>
          <Text style={styles.email}>{me?.email}</Text>
        </View>
        {notice ? <Banner kind="success" message={notice} /> : null}
        {error ? <Banner kind="error" message={error} /> : null}

        <View style={styles.stats}>
          <Pressable style={styles.stat} accessibilityRole="button" onPress={() => router.push('/')}><Text style={styles.statNum}>{profile ? profile.tripCount : '–'}</Text><Text style={styles.statLabel}>Trips</Text></Pressable>
          <Pressable style={styles.stat} accessibilityRole="button" onPress={() => router.push('/friends')}><Text style={styles.statNum}>{profile ? profile.friendCount : '–'}</Text><Text style={styles.statLabel}>Friends</Text></Pressable>
          <Pressable style={styles.stat} accessibilityRole="button" onPress={() => router.push('/profile/visited')}><Text style={styles.statNum}>{profile ? profile.visitedCountries.length : '–'}</Text><Text style={styles.statLabel}>Countries</Text></Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Places you’ve been</Text>
            <Button title="Edit" variant="link" onPress={() => router.push('/profile/visited')} />
          </View>
          {profile?.visitedCountries.length ? (
            <Text style={styles.flags}>{profile.visitedCountries.map((c) => c.flag).join(' ')}</Text>
          ) : <Text style={styles.muted}>Add the countries and cities you’ve visited. Your friends can see them.</Text>}
          {profile?.visitedCities.length ? <Text style={styles.muted}>{profile.visitedCities.join(' · ')}</Text> : null}
        </View>

        <View style={styles.card}>
          <ChoiceChips
            label="Appearance"
            options={[{ label: 'Same as phone', value: 'system' }, { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]}
            value={preference}
            onChange={(v) => setPreference((v || 'system') as ThemePreference)}
          />
        </View>

        {push && push !== 'unsupported' ? (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Push notifications</Text>
              {push === 'not-configured' ? null : (
                <Switch value={push === 'on'} onValueChange={togglePush} disabled={busy === 'push'}
                  trackColor={{ true: colors.orange, false: colors.border }} accessibilityLabel="Push notifications" />
              )}
            </View>
            <Text style={styles.muted}>
              {push === 'on' ? 'You’ll hear about new messages, votes, people joining your trips and friend requests.'
                : push === 'denied' ? 'Notifications are turned off for Atlasphere in your phone’s settings.'
                : push === 'not-configured' ? 'Push notifications aren’t set up in this version of the app yet.'
                : 'Get told about new messages, votes, people joining your trips and friend requests.'}
            </Text>
            {push === 'denied' ? <Button title="Open settings" variant="link" onPress={openPhoneSettings} /> : null}
          </View>
        ) : null}

        <View style={styles.list}>
          <Row icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
          <Row icon="help-circle-outline" label="Help" onPress={() => openPage(HELP_URL)} />
          <Row icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => openPage(PRIVACY_URL)} />
          <Row icon="document-text-outline" label="Terms of Service" onPress={() => openPage(TERMS_URL)} last />
        </View>

        <Button title="Log out" variant="secondary" onPress={signOut} />
        <Button title="Delete account" variant="danger" onPress={deleteAccount} loading={busy === 'delete'} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, onPress, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; last?: boolean }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, last ? null : styles.rowBorder, pressed ? { opacity: 0.6 } : null]}>
      <Ionicons name={icon} size={22} color={colors.navy} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40, gap: 14, width: '100%', maxWidth: 520, alignSelf: 'center' },
  top: { alignItems: 'center', gap: 4, marginTop: 8 },
  camera: { position: 'absolute', right: 0, bottom: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  name: { fontSize: 26, fontWeight: '800', color: colors.navy, marginTop: 8 },
  email: { fontSize: 15, color: colors.textMuted },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.card, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border },
  statNum: { fontSize: 22, fontWeight: '800', color: colors.navy },
  statLabel: { fontSize: 13, color: colors.textMuted },
  card: { backgroundColor: colors.field, borderRadius: radius.card, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.navy },
  flags: { fontSize: 28, lineHeight: 36 },
  muted: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  list: { borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.bg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { flex: 1, fontSize: 16, color: colors.navy, fontWeight: '600' },
}));
