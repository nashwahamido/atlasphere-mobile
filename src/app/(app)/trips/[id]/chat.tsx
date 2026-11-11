import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Banner } from '@/components/Banner';
import { absoluteUrl, api, type ChatMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import { getSocket, useSocketConnected } from '@/lib/socket';
import { useTrips } from '@/lib/trips';
import { colors } from '@/lib/theme';

// Recommendations shared from the website arrive as [[SHARE:image|name|description]].
const SHARE = /^\[\[SHARE:([^|]*)\|([^|]+)\|([\s\S]*)\]\]$/;

function timeLabel(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TripChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useSession();
  const { call, trips } = useTrips();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const online = useSocketConnected(token);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const tripName = trips.find((t) => t.id === id)?.name || 'Chat';


  // History over HTTP, new messages live over the socket. On reconnect we
  // rejoin the room and reload, so nothing sent meanwhile is missed.
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    let cancelled = false;
    const fetchHistory = () => call((t) => api.messages(t, id))
      .then((res) => { if (!cancelled) { setMessages(res.messages); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Couldn’t load the chat.'); });
    const join = () => {
      socket.emit('join-group', { groupId: id });
      fetchHistory();
    };
    const onMessage = (m: ChatMessage & { groupId?: string | number }) => {
      if (String(m.groupId) !== String(id)) return;
      setMessages((list) => (list && list.some((x) => x.id === m.id) ? list : [...(list || []), m]));
    };
    const onError = (e: { error?: string }) => setError(e?.error || 'You’re not a member of this trip.');
    socket.on('connect', join);
    socket.on('new-message', onMessage);
    socket.on('chat-error', onError);
    if (socket.connected) join();
    else fetchHistory();
    return () => {
      cancelled = true;
      socket.off('connect', join);
      socket.off('new-message', onMessage);
      socket.off('chat-error', onError);
    };
  }, [token, id, call]);

  const send = () => {
    const body = text.trim();
    if (!body || !token) return;
    const socket = getSocket(token);
    if (!socket.connected) { setError('You’re offline. Your message wasn’t sent.'); return; }
    socket.emit('send-message', { groupId: id, text: body });
    setText('');
    setError(null);
  };

  // Newest at the bottom: the list is inverted, so feed it newest-first.
  const data = useMemo(() => (messages ? [...messages].reverse() : []), [messages]);

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    if (item.system) return <Text style={styles.system}>{item.text}</Text>;
    const mine = String(item.userId) === String(user?.id);
    const older = data[index + 1]; // the message shown just above this one
    const showName = !mine && (!older || String(older.userId) !== String(item.userId));
    const share = item.text.match(SHARE);
    const image = share ? absoluteUrl(share[1]) : null;
    return (
      <View style={[styles.row, mine ? styles.rowMine : null]}>
        {!mine ? <View style={styles.avatarSlot}>{showName ? <Avatar name={item.userName} url={item.userAvatar} size={32} /> : null}</View> : null}
        <View style={[styles.bubbleWrap, mine ? { alignItems: 'flex-end' } : null]}>
          {showName ? <Text style={styles.name}>{item.userName}</Text> : null}
          {share ? (
            <View style={[styles.share, mine ? styles.shareMine : null]}>
              {image ? <Image source={{ uri: image }} style={styles.shareImg} accessibilityIgnoresInvertColors /> : null}
              <View style={styles.shareBody}>
                <Text style={styles.shareLabel}>Shared a place</Text>
                <Text style={styles.shareName}>{share[2]}</Text>
                {share[3] ? <Text style={styles.shareDesc} numberOfLines={2}>{share[3]}</Text> : null}
              </View>
            </View>
          ) : (
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={[styles.text, mine ? styles.textMine : null]} selectable>{item.text}</Text>
            </View>
          )}
          <Text style={styles.time}>{timeLabel(item.time)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: tripName }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}>
        {error ? <View style={styles.bannerWrap}><Banner kind="error" message={error} /></View> : null}
        {messages === null ? (
          <View style={styles.center}><ActivityIndicator color={colors.navy} /></View>
        ) : (
          <FlatList
            ref={listRef}
            inverted
            data={data}
            keyExtractor={(m) => String(m.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Say hello 👋</Text>
                <Text style={styles.emptyText}>Messages here are shared with everyone on the trip, on the app and the website.</Text>
              </View>
            }
          />
        )}
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={online ? 'Message the group' : 'Connecting…'}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={2000}
            accessibilityLabel="Message"
            onSubmitEditing={send}
            submitBehavior="submit"
            returnKeyType="send"
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={send} disabled={!text.trim()}
            style={[styles.send, !text.trim() ? { opacity: 0.4 } : null]}>
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bannerWrap: { paddingHorizontal: 14, paddingTop: 8 },
  list: { padding: 14, paddingTop: 8, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 6, transform: [{ scaleY: -1 }] },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.navy },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  system: { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 3, gap: 8 },
  rowMine: { justifyContent: 'flex-end' },
  avatarSlot: { width: 32 },
  bubbleWrap: { maxWidth: '78%' },
  name: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 2, marginLeft: 4 },
  bubble: { borderRadius: 18, paddingVertical: 9, paddingHorizontal: 13 },
  bubbleMine: { backgroundColor: colors.orange, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: colors.field, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colors.border },
  text: { fontSize: 16, lineHeight: 21, color: colors.navy },
  textMine: { color: colors.white },
  time: { fontSize: 11, color: colors.textMuted, marginTop: 2, marginHorizontal: 4 },
  share: { width: 240, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border },
  shareMine: { borderColor: colors.orange },
  shareImg: { width: '100%', height: 120 },
  shareBody: { padding: 10, gap: 2 },
  shareLabel: { fontSize: 11, fontWeight: '700', color: colors.orange, textTransform: 'uppercase', letterSpacing: 0.5 },
  shareName: { fontSize: 15, fontWeight: '700', color: colors.navy },
  shareDesc: { fontSize: 13, color: colors.textMuted },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  input: { flex: 1, minHeight: 42, maxHeight: 120, backgroundColor: colors.field, borderRadius: 21, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
});
