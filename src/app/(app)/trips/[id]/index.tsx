import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { TripTiles } from '@/components/TripTiles';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { absoluteUrl, api, type Trip } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { pickPhotoForm } from '@/lib/photo';
import { useFriends } from '@/lib/friends';
import { useSession } from '@/lib/session';
import { useTrips } from '@/lib/trips';
import { colors, radius } from '@/lib/theme';

const INTERESTS = ['Relax', 'Nightlife', 'Active', 'Culture', 'Nature', 'Food', 'Shopping', 'Entertainment', 'Family', 'Fun', 'Sightseeing'];

function niceDate(iso: string) {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export default function TripScreen() {
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const { user } = useSession();
  const { call, upsert, drop } = useTrips();
  const { data: friendsData } = useFriends();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(created ? 'Trip created! Add a photo and invite your friends.' : null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [showFriends, setShowFriends] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');

  const apply = useCallback((t: Trip) => { setTrip(t); upsert(t); }, [upsert]);

  const load = useCallback(async () => {
    try {
      const res = await call((t) => api.trip(t, id));
      apply(res.trip);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t load this trip.');
    }
  }, [call, id, apply]);

  useEffect(() => {
    let cancelled = false;
    call((t) => api.trip(t, id))
      .then((res) => { if (!cancelled) { apply(res.trip); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Couldn’t load this trip.'); });
    return () => { cancelled = true; };
  }, [call, id, apply]);

  const addable = useMemo(() => {
    if (!trip) return [];
    const inTrip = new Set(trip.members.map((m) => m.id));
    return friendsData.friends.filter((f) => !inTrip.has(f.id));
  }, [trip, friendsData.friends]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setBusy(null); }
  }

  async function pickPhoto() {
    const form = await pickPhotoForm([4, 3]);
    if (!form) return;
    await run('photo', async () => {
      const res = await call((t) => api.uploadTripPhoto(t, id, form));
      apply(res.trip);
      setNotice('Photo updated.');
    });
  }

  async function shareLink() {
    if (!trip) return;
    const message = `Join my trip to ${trip.name} on Atlasphere: ${trip.inviteLink}`;
    try {
      if (Platform.OS === 'web' && !(typeof navigator !== 'undefined' && 'share' in navigator)) {
        await Clipboard.setStringAsync(trip.inviteLink);
        setNotice('Invite link copied.');
        return;
      }
      await Share.share({ message, url: trip.inviteLink });
    } catch {
      /* closed the share sheet */
    }
  }

  async function copyLink() {
    if (!trip) return;
    await Clipboard.setStringAsync(trip.inviteLink);
    setNotice('Invite link copied.');
  }

  async function toggleInterest(tag: string) {
    if (!trip) return;
    const next = trip.interests.includes(tag) ? trip.interests.filter((t) => t !== tag) : [...trip.interests, tag];
    setTrip({ ...trip, interests: next });
    await run('interests', async () => apply((await call((t) => api.setTripInterests(t, id, next))).trip));
  }

  async function saveName() {
    const name = newName.trim();
    if (!name) return;
    await run('rename', async () => {
      apply((await call((t) => api.renameTrip(t, id, name))).trip);
      setRenaming(false);
    });
  }

  async function leave() {
    if (!trip) return;
    if (!(await confirmAction('Leave this trip?', `You won't see ${trip.name} any more unless someone invites you again.`, 'Leave'))) return;
    await run('leave', async () => {
      await call((t) => api.leaveTrip(t, id));
      drop(id);
      router.back();
    });
  }

  async function remove() {
    if (!trip) return;
    if (!(await confirmAction('Delete this trip?', `${trip.name} will be deleted for everyone, with its chat, votes and itinerary. This can't be undone.`, 'Delete'))) return;
    await run('delete', async () => {
      await call((t) => api.deleteTrip(t, id));
      drop(id);
      router.back();
    });
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.center}>{error ? <Banner kind="error" message={error} /> : <ActivityIndicator color={colors.navy} />}</View>
      </SafeAreaView>
    );
  }

  const photo = absoluteUrl(trip.photo);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: trip.name }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.navy} />}>
        <View style={[styles.cover, { backgroundColor: trip.color || colors.blue }]}>
          {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
          <View style={styles.shade} />
          <View style={styles.coverText}>
            <Text style={styles.coverFlag}>{trip.flag}</Text>
            <Text style={styles.coverName} accessibilityRole="header">{trip.name}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={pickPhoto} style={styles.photoBtn} disabled={busy === 'photo'}>
            {busy === 'photo' ? <ActivityIndicator color={colors.white} /> : <Text style={styles.photoBtnText}>{photo ? 'Change photo' : 'Add photo'}</Text>}
          </Pressable>
        </View>

        <TripTiles tripId={trip.id} />

        {notice ? <Banner kind="success" message={notice} /> : null}
        {error ? <Banner kind="error" message={error} /> : null}

        <View style={styles.facts}>
          <Text style={styles.fact}>📍 {trip.cities.join(' → ')}</Text>
          <Text style={styles.fact}>🗓 {trip.dates ? `${niceDate(trip.dates.start)} – ${niceDate(trip.dates.end)}` : `${trip.days} ${trip.days === 1 ? 'day' : 'days'} · dates not picked yet`}</Text>
        </View>

        {/* Invite */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invite people</Text>
          <Text style={styles.cardText}>Anyone with this link can join the trip.</Text>
          <Text selectable style={styles.link} numberOfLines={1}>{trip.inviteLink}</Text>
          <View style={styles.row}>
            <Button title="Share link" onPress={shareLink} style={styles.flex} />
            <Button title="Copy" variant="secondary" onPress={copyLink} style={styles.copy} />
          </View>
        </View>

        {/* Members */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>{trip.members.length} {trip.members.length === 1 ? 'person' : 'people'}</Text>
            {addable.length > 0 ? (
              <Button title={showFriends ? 'Done' : 'Add friends'} variant="link" onPress={() => setShowFriends((v) => !v)} />
            ) : null}
          </View>
          {trip.members.map((m) => (
            <Pressable key={m.id} accessibilityRole="button" style={styles.member}
              onPress={() => (m.id === user?.id ? router.push('/profile') : router.push({ pathname: '/people/[id]', params: { id: String(m.id) } }))}>
              <Avatar name={m.username} url={m.profilePictureUrl} size={40} />
              <Text style={styles.memberName}>{m.username}{m.id === user?.id ? ' (you)' : ''}</Text>
              {m.isOwner ? <Text style={styles.badge}>Organiser</Text> : null}
            </Pressable>
          ))}
          {showFriends ? (
            <View style={styles.addList}>
              <Text style={styles.addTitle}>Your friends</Text>
              {addable.map((f) => (
                <View key={f.id} style={styles.member}>
                  <Avatar name={f.username} url={f.profilePictureUrl} size={40} />
                  <Text style={styles.memberName}>{f.username}</Text>
                  <Button title="Add" variant="secondary" loading={busy === 'add-' + f.id} style={styles.addBtn}
                    onPress={() => run('add-' + f.id, async () => {
                      const res = await call((t) => api.addTripMember(t, id, f.id));
                      apply(res.trip);
                      setNotice(`${f.username} was added to the trip.`);
                    })} />
                </View>
              ))}
            </View>
          ) : null}
          {friendsData.friends.length === 0 ? (
            <Text style={styles.cardText}>Add friends in the Friends tab to add them to trips here, or share the invite link.</Text>
          ) : null}
        </View>

        {/* Interests */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Interests</Text>
          <Text style={styles.cardText}>Recommendations that match come first.</Text>
          <View style={styles.chips}>
            {INTERESTS.map((t) => {
              const on = trip.interests.includes(t);
              return (
                <Pressable key={t} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggleInterest(t)} style={[styles.chip, on ? styles.chipOn : null]}>
                  <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{t}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Manage */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip settings</Text>
          {renaming ? (
            <View style={styles.renameBox}>
              <TextInput value={newName} onChangeText={setNewName} style={styles.input} maxLength={100} autoFocus
                accessibilityLabel="Trip name" onSubmitEditing={saveName} returnKeyType="done" />
              <View style={styles.row}>
                <Button title="Save" onPress={saveName} loading={busy === 'rename'} style={styles.flex} />
                <Button title="Cancel" variant="secondary" onPress={() => setRenaming(false)} style={styles.flex} />
              </View>
            </View>
          ) : (
            <Button title="Rename trip" variant="secondary" onPress={() => { setNewName(trip.name); setRenaming(true); }} />
          )}
          <Button title="Leave trip" variant="secondary" onPress={leave} loading={busy === 'leave'} />
          {trip.isOwner ? <Button title="Delete trip" variant="danger" onPress={remove} loading={busy === 'delete'} /> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  content: { padding: 20, paddingBottom: 48, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  cover: { height: 190, borderRadius: radius.card, overflow: 'hidden', justifyContent: 'flex-end' },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.28)' },
  coverText: { padding: 16 },
  coverFlag: { fontSize: 32 },
  coverName: { fontSize: 28, fontWeight: '800', color: colors.white },
  photoBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, minWidth: 90, alignItems: 'center' },
  photoBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  facts: { gap: 4 },
  fact: { fontSize: 16, color: colors.navy, fontWeight: '600' },
  card: { backgroundColor: colors.field, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.navy },
  cardText: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  link: { fontSize: 14, color: colors.blue, backgroundColor: colors.bg, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  copy: { paddingHorizontal: 20 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  memberName: { flex: 1, fontSize: 16, color: colors.navy, fontWeight: '600' },
  badge: { fontSize: 12, fontWeight: '700', color: colors.orange },
  addList: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 6 },
  addTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  addBtn: { minHeight: 40, paddingHorizontal: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: 14, color: colors.navy, fontWeight: '500' },
  chipTextOn: { color: colors.white },
  renameBox: { gap: 10 },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.field, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text },
});
