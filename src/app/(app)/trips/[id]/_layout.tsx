import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, Tabs, useLocalSearchParams, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';

import { useSession } from '@/lib/session';
import { TripIdContext } from '@/lib/tripId';
import { getSocket } from '@/lib/socket';
import { useColors } from '@/lib/theme';
import { useTrips } from '@/lib/trips';

type Incoming = { groupId?: string | number; userId?: string | number; system?: boolean };

// A trip's sections as tabs along the bottom, so you can jump between the
// chat and everything else in one tap (like the website's trip page).
export default function TripLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { trips } = useTrips();
  const name = trips.find((t) => t.id === id)?.name || '';
  const unread = useUnreadChat(id);

  const icon = (outline: keyof typeof Ionicons.glyphMap, filled: keyof typeof Ionicons.glyphMap) =>
    function TabIcon({ color, size, focused }: { color: unknown; size: number; focused: boolean }) {
      return <Ionicons name={focused ? filled : outline} size={size} color={String(color)} />;
    };

  return (
    <TripIdContext value={id}>
      <Stack.Screen options={{ title: name }} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.orange,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.bg },
          tabBarHideOnKeyboard: true,
          sceneStyle: { backgroundColor: colors.bg },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: icon('home-outline', 'home') }} />
        <Tabs.Screen
          name="chat"
         
          options={{
            title: 'Chat',
            tabBarIcon: icon('chatbubbles-outline', 'chatbubbles'),
            tabBarBadge: unread > 0 ? (unread > 9 ? '9+' : unread) : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.orange, color: colors.white },
          }}
        />
        <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarIcon: icon('heart-circle-outline', 'heart-circle') }} />
        <Tabs.Screen name="itinerary" options={{ title: 'Itinerary', tabBarIcon: icon('calendar-outline', 'calendar') }} />
        <Tabs.Screen name="destination" options={{ title: 'Destination', tabBarIcon: icon('partly-sunny-outline', 'partly-sunny') }} />
      </Tabs>
    </TripIdContext>
  );
}

// New messages from others since the chat tab was last open.
function useUnreadChat(tripId: string) {
  const { token, user } = useSession();
  const onChat = usePathname().endsWith('/chat');
  const [count, setCount] = useState({ trip: tripId, n: 0 });

  useEffect(() => {
    if (!token || onChat) return;
    const socket = getSocket(token);
    const join = () => socket.emit('join-group', { groupId: tripId });
    const onMessage = (m: Incoming) => {
      if (String(m.groupId) !== String(tripId) || m.system || String(m.userId) === String(user?.id)) return;
      setCount((c) => ({ trip: tripId, n: (c.trip === tripId ? c.n : 0) + 1 }));
    };
    socket.on('connect', join);
    socket.on('new-message', onMessage);
    if (socket.connected) join();
    return () => {
      socket.off('connect', join);
      socket.off('new-message', onMessage);
    };
  }, [token, tripId, user?.id, onChat]);

  // Opening the chat clears it.
  if (onChat && count.n !== 0) setCount({ trip: tripId, n: 0 });
  return count.trip === tripId ? count.n : 0;
}
