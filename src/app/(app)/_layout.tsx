import { Stack } from 'expo-router';

import { FriendsProvider } from '@/lib/friends';
import { colors } from '@/lib/theme';

export default function AppLayout() {
  return (
    <FriendsProvider>
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
      </Stack>
    </FriendsProvider>
  );
}
