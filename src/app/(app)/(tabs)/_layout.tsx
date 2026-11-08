import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { useFriends } from '@/lib/friends';
import { colors } from '@/lib/theme';

export default function TabsLayout() {
  const { data } = useFriends();
  const pending = data.incoming.length;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Trips', tabBarIcon: ({ color, size }) => <Ionicons name="airplane-outline" size={size} color={String(color)} /> }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarBadge: pending > 0 ? pending : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.orange, color: colors.white },
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={String(color)} /> }}
      />
    </Tabs>
  );
}
