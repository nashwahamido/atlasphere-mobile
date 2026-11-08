import { Stack } from 'expo-router';

import { FriendsProvider } from '@/lib/friends';
import { TripsProvider } from '@/lib/trips';
import { colors } from '@/lib/theme';

export default function AppLayout() {
  return (
    <FriendsProvider>
      <TripsProvider>
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
        <Stack.Screen name="trips/[id]" options={{ title: '' }} />
        <Stack.Screen name="join/[code]" options={{ title: 'Joining…' }} />
      </Stack>
      </TripsProvider>
    </FriendsProvider>
  );
}
