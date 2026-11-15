import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/lib/session';
import { getSocket } from '@/lib/socket';
import { colors } from '@/lib/theme';

type Incoming = { groupId?: string | number; userId?: string | number; userName?: string; text?: string; system?: boolean };

// The trip chat from any trip screen (like the chat panel next to every tab
// on the website): a round button in the corner that counts new messages
// and shows the latest one for a moment.
export function ChatButton({ tripId }: { tripId: string }) {
  const { token, user } = useSession();
  const insets = useSafeAreaInsets();
  const [unread, setUnread] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (!token) return;
    const socket = getSocket(token);
    let hide: ReturnType<typeof setTimeout> | null = null;
    const join = () => socket.emit('join-group', { groupId: tripId });
    const onMessage = (m: Incoming) => {
      if (String(m.groupId) !== String(tripId) || m.system || String(m.userId) === String(user?.id)) return;
      setUnread((n) => n + 1);
      setPreview(`${m.userName || 'Someone'}: ${m.text || ''}`);
      if (hide) clearTimeout(hide);
      hide = setTimeout(() => setPreview(null), 5000);
    };
    socket.on('connect', join);
    socket.on('new-message', onMessage);
    if (socket.connected) join();
    return () => {
      socket.off('connect', join);
      socket.off('new-message', onMessage);
      if (hide) clearTimeout(hide);
    };
  }, [token, tripId, user?.id]));

  const open = () => {
    setUnread(0);
    setPreview(null);
    router.push({ pathname: '/trips/[id]/chat', params: { id: tripId } });
  };

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 18 }]} pointerEvents="box-none">
      {preview ? (
        <Pressable onPress={open} style={styles.preview} accessibilityRole="button" accessibilityLabel={`New message. ${preview}. Open chat`}>
          <Text style={styles.previewText} numberOfLines={2}>{preview}</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={open} style={styles.fab} accessibilityRole="button"
        accessibilityLabel={unread ? `Chat, ${unread} new ${unread === 1 ? 'message' : 'messages'}` : 'Open the trip chat'}>
        <Ionicons name="chatbubbles" size={26} color={colors.white} />
        {unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text></View> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 18, alignItems: 'flex-end', gap: 8, maxWidth: '80%' },
  fab: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.navy,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: colors.white },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  preview: { backgroundColor: colors.navy, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  previewText: { color: colors.white, fontSize: 14 },
});
