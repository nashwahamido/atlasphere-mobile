import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Image, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { absoluteUrl, api, type Recommendation, type SavedActivity, type Vote } from '@/lib/api';
import { useSession } from '@/lib/session';
import { getSocket } from '@/lib/socket';
import { useTrips } from '@/lib/trips';
import { colors, radius } from '@/lib/theme';

const SWIPE = 110;

// Swipe right to upvote, left to dismiss, up to save for later.
export default function Discover() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useSession();
  const { call } = useTrips();
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<'vote' | 'picks'>('vote');
  const [items, setItems] = useState<Recommendation[] | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [city, setCity] = useState('all');
  const [picks, setPicks] = useState<SavedActivity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pan] = useState(() => new Animated.ValueXY());

  const load = useCallback(async () => {
    try {
      const res = await call((t) => api.recommendations(t, id));
      setItems(res.items);
      setCities(res.cities);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t load recommendations.');
      setItems([]);
    }
  }, [call, id]);

  const loadPicks = useCallback(async () => {
    try { setPicks((await call((t) => api.saved(t, id))).items); }
    catch (e) { setError(e instanceof Error ? e.message : 'Couldn’t load the group’s picks.'); setPicks([]); }
  }, [call, id]);

  useEffect(() => {
    let cancelled = false;
    call((t) => api.recommendations(t, id))
      .then((res) => { if (!cancelled) { setItems(res.items); setCities(res.cities); } })
      .catch((e) => { if (!cancelled) { setError(e instanceof Error ? e.message : 'Couldn’t load recommendations.'); setItems([]); } });
    return () => { cancelled = true; };
  }, [call, id]);

  useEffect(() => {
    if (mode !== 'picks') return;
    let cancelled = false;
    call((t) => api.saved(t, id))
      .then((res) => { if (!cancelled) setPicks(res.items); })
      .catch(() => { if (!cancelled) setPicks([]); });
    return () => { cancelled = true; };
  }, [mode, call, id]);

  const visible = useMemo(() => (items || []).filter((a) => city === 'all' || a.city === city), [items, city]);
  const current = visible[0];
  const next = visible[1];

  const vote = useCallback(async (activity: Recommendation, v: Vote) => {
    setItems((list) => (list || []).filter((a) => a.id !== activity.id));
    pan.setValue({ x: 0, y: 0 });
    setNotice(v === 'upvote' ? `👍 Upvoted ${activity.name}` : v === 'bookmark' ? `🔖 Saved ${activity.name} for later` : null);
    try {
      await call((t) => api.vote(t, id, activity, v));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your vote wasn’t saved.');
      setItems((list) => [activity, ...(list || [])]);
    }
  }, [call, id, pan]);

  const fling = useCallback((v: Vote) => {
    if (!current) return;
    const to = v === 'upvote' ? { x: width * 1.5, y: 0 } : v === 'downvote' ? { x: -width * 1.5, y: 0 } : { x: 0, y: -900 };
    Animated.timing(pan, { toValue: to, duration: 220, useNativeDriver: false }).start(() => vote(current, v));
  }, [current, pan, vote, width]);

  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8,
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE) fling('upvote');
      else if (g.dx < -SWIPE) fling('downvote');
      else if (g.dy < -SWIPE) fling('bookmark');
      else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6 }).start();
    },
  }), [pan, fling]);

  const share = (a: Recommendation) => {
    if (!token) return;
    const socket = getSocket(token);
    const desc = (a.description || '').replace(/\|/g, '/').slice(0, 140);
    const send = () => {
      socket.emit('join-group', { groupId: id });
      socket.emit('send-message', { groupId: id, text: '[[SHARE:' + (a.image || '') + '|' + a.name.replace(/\|/g, '/') + '|' + desc + ']]' });
      setNotice('Shared to the trip chat: ' + a.name);
    };
    if (socket.connected) send(); else socket.once('connect', send);
  };

  const rotate = pan.x.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-12deg', '0deg', '12deg'] });
  const likeOpacity = pan.x.interpolate({ inputRange: [20, SWIPE], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = pan.x.interpolate({ inputRange: [-SWIPE, -20], outputRange: [1, 0], extrapolate: 'clamp' });
  const saveOpacity = pan.y.interpolate({ inputRange: [-SWIPE, -20], outputRange: [1, 0], extrapolate: 'clamp' });
  const cardWidth = Math.min(width - 40, 420);

  const Segments = (
    <View style={styles.segments} accessibilityRole="tablist">
      {(['vote', 'picks'] as const).map((m) => (
        <Pressable key={m} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} onPress={() => setMode(m)} style={[styles.segment, mode === m ? styles.segmentOn : null]}>
          <Text style={[styles.segmentText, mode === m ? styles.segmentTextOn : null]}>{m === 'vote' ? 'Vote' : 'Group’s picks'}</Text>
        </Pressable>
      ))}
    </View>
  );

  if (mode === 'picks') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.top}>{Segments}</View>
        {picks === null ? <View style={styles.center}><ActivityIndicator color={colors.navy} /></View> : (
          <FlatList
            data={picks}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.pickList}
            onRefresh={loadPicks}
            refreshing={false}
            ListEmptyComponent={<Text style={styles.emptyText}>Nothing upvoted or saved yet. Vote on a few places and they’ll show up here, ready for the itinerary.</Text>}
            renderItem={({ item }) => (
              <View style={styles.pick}>
                {item.image ? <Image source={{ uri: absoluteUrl(item.image) || undefined }} style={styles.pickImg} /> : <View style={[styles.pickImg, { backgroundColor: colors.field }]} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickName}>{item.name}</Text>
                  <Text style={styles.pickMeta}>👍 {item.upvotes}  ·  🔖 {item.saves}{item.mine ? `  ·  you ${item.mine === 'upvote' ? 'upvoted' : 'saved'}` : ''}</Text>
                </View>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.top}>
        {Segments}
        {cities.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {['all', ...cities].map((c) => {
              const n = (items || []).filter((a) => c === 'all' || a.city === c).length;
              return (
                <Pressable key={c} accessibilityRole="button" accessibilityState={{ selected: city === c }} onPress={() => { setCity(c); pan.setValue({ x: 0, y: 0 }); }} style={[styles.chip, city === c ? styles.chipOn : null]}>
                  <Text style={[styles.chipText, city === c ? styles.chipTextOn : null]}>{c === 'all' ? 'All cities' : c} {n}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        {error ? <Banner kind="error" message={error} /> : null}
        {notice ? <Text style={styles.notice} accessibilityLiveRegion="polite">{notice}</Text> : null}
      </View>

      {items === null ? (
        <View style={styles.center}><ActivityIndicator color={colors.navy} /><Text style={styles.loading}>Finding things to do…</Text></View>
      ) : !current ? (
        <View style={styles.center}>
          <Text style={styles.doneTitle}>{(items || []).length ? `All done in ${city}` : 'All done!'}</Text>
          <Text style={styles.emptyText}>{(items || []).length ? 'Pick another city above.' : 'You’ve voted on everything. See what the group liked in “Group’s picks”, then add them to the itinerary.'}</Text>
          <Pressable accessibilityRole="button" onPress={load} style={styles.reload}><Text style={styles.reloadText}>Check for more</Text></Pressable>
        </View>
      ) : (
        <View style={styles.deck}>
          {next ? (
            <View style={[styles.card, styles.cardBehind, { width: cardWidth }]}>
              <Card a={next} />
            </View>
          ) : null}
          <Animated.View
            key={current.id}
            {...responder.panHandlers}
            style={[styles.card, { width: cardWidth, transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}>
            <Card a={current} onShare={() => share(current)} />
            <Animated.Text style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>UPVOTE</Animated.Text>
            <Animated.Text style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}>NOPE</Animated.Text>
            <Animated.Text style={[styles.stamp, styles.stampSave, { opacity: saveOpacity }]}>SAVE</Animated.Text>
          </Animated.View>
        </View>
      )}

      {current ? (
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel={'Dismiss ' + current.name} onPress={() => fling('downvote')} style={[styles.action, styles.actionNo]}>
            <Ionicons name="thumbs-down" size={26} color={colors.error} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={'Save ' + current.name + ' for later'} onPress={() => fling('bookmark')} style={[styles.action, styles.actionSmall]}>
            <Ionicons name="bookmark" size={22} color={colors.blue} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={'Upvote ' + current.name} onPress={() => fling('upvote')} style={[styles.action, styles.actionYes]}>
            <Ionicons name="thumbs-up" size={26} color={colors.white} />
          </Pressable>
        </View>
      ) : null}
      {current && Platform.OS !== 'web' ? <Text style={styles.hint}>Swipe right to upvote, left to dismiss, up to save</Text> : null}
    </SafeAreaView>
  );
}

function Card({ a, onShare }: { a: Recommendation; onShare?: () => void }) {
  const img = absoluteUrl(a.image);
  return (
    <View style={StyleSheet.absoluteFill}>
      {img ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.blue }]} />}
      <View style={styles.cardShade} />
      {onShare ? (
        <Pressable accessibilityRole="button" accessibilityLabel={'Share ' + a.name + ' to the trip chat'} onPress={onShare} style={styles.shareBtn}>
          <Ionicons name="paper-plane" size={18} color={colors.white} />
        </Pressable>
      ) : null}
      <View style={styles.cardTags}>
        {a.tags.slice(0, 3).map((t) => <Text key={t} style={styles.tag}>{t}</Text>)}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardCity}>📍 {a.city}</Text>
        <Text style={styles.cardName} numberOfLines={3}>{a.name}</Text>
        {a.description ? <Text style={styles.cardDesc}>{a.description}</Text> : null}
        {a.closure ? <Text style={styles.closure}>{a.closure}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: 20, paddingTop: 8, gap: 10, width: '100%', maxWidth: 560, alignSelf: 'center' },
  segments: { flexDirection: 'row', backgroundColor: colors.field, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: colors.border },
  segment: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: 'center' },
  segmentOn: { backgroundColor: colors.navy },
  segmentText: { fontSize: 15, fontWeight: '700', color: colors.navy },
  segmentTextOn: { color: colors.white },
  chips: { gap: 8, paddingRight: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  chipOn: { backgroundColor: colors.orange, borderColor: colors.orange },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.navy },
  chipTextOn: { color: colors.white },
  notice: { fontSize: 14, color: colors.success, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  loading: { color: colors.textMuted },
  doneTitle: { fontSize: 22, fontWeight: '800', color: colors.navy },
  emptyText: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 21, padding: 10 },
  reload: { marginTop: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border },
  reloadText: { color: colors.navy, fontWeight: '700' },
  deck: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  card: { position: 'absolute', top: 12, bottom: 12, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.navy, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  cardBehind: { transform: [{ scale: 0.94 }], top: 22, opacity: 0.9 },
  cardShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
  shareBtn: { position: 'absolute', top: 16, right: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  cardTags: { position: 'absolute', top: 16, left: 16, right: 70, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: 'rgba(255,255,255,0.9)', color: colors.navy, fontWeight: '700', fontSize: 13, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, overflow: 'hidden' },
  cardBody: { position: 'absolute', left: 20, right: 20, bottom: 22, gap: 4 },
  cardCity: { color: colors.white, fontWeight: '700', fontSize: 14 },
  cardName: { color: colors.white, fontWeight: '800', fontSize: 28, lineHeight: 33 },
  cardDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 16 },
  closure: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: 'rgba(17,24,39,0.75)', color: '#fde68a', fontWeight: '700', fontSize: 13, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, overflow: 'hidden' },
  stamp: { position: 'absolute', top: 70, fontSize: 30, fontWeight: '900', paddingHorizontal: 12, paddingVertical: 4, borderWidth: 4, borderRadius: 10, overflow: 'hidden' },
  stampLike: { left: 22, color: '#22c55e', borderColor: '#22c55e', transform: [{ rotate: '-14deg' }] },
  stampNope: { right: 22, color: colors.error, borderColor: colors.error, transform: [{ rotate: '14deg' }] },
  stampSave: { alignSelf: 'center', left: '35%', color: '#60a5fa', borderColor: '#60a5fa' },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 22, paddingVertical: 10 },
  action: { alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  actionNo: { width: 64, height: 64 },
  actionSmall: { width: 50, height: 50 },
  actionYes: { width: 64, height: 64, backgroundColor: colors.orange, borderColor: colors.orange },
  hint: { textAlign: 'center', color: colors.textMuted, fontSize: 12, paddingBottom: 8 },
  pickList: { padding: 20, gap: 10, width: '100%', maxWidth: 560, alignSelf: 'center' },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.card, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border },
  pickImg: { width: 64, height: 64, borderRadius: 12 },
  pickName: { fontSize: 16, fontWeight: '700', color: colors.navy },
  pickMeta: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
});
