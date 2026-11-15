import { Stack } from 'expo-router';

import { NotificationBell } from '@/components/NotificationBell';
import { PushSetup } from '@/components/PushSetup';
import { FriendsProvider } from '@/lib/friends';
import { TripsProvider } from '@/lib/trips';
import { useColors } from '@/lib/theme';

export default function AppLayout() {
  const colors = useColors();
  return (
    <FriendsProvider>
      <TripsProvider>
      <PushSetup />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.navy,
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="people/[id]" options={{ title: '' }} />
        <Stack.Screen name="trips/new" options={{ title: 'New trip' }} />
        <Stack.Screen name="trips/join" options={{ title: 'Join a trip' }} />
        <Stack.Screen name="trips/[id]" options={{ title: '', headerRight: () => <NotificationBell size={24} /> }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="profile/visited" options={{ title: 'Places you’ve been' }} />
        <Stack.Screen name="join/[code]" options={{ title: 'Joining…' }} />
      </Stack>
      </TripsProvider>
    </FriendsProvider>
  );
}
