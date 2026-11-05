import { Stack } from 'expo-router';

import { colors } from '@/lib/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitle: '',
        headerShadowVisible: false,
        headerTintColor: colors.navy,
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: { backgroundColor: colors.bg },
        contentStyle: { backgroundColor: colors.bg },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
