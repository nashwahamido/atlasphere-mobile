import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { token, isLoading } = useSession();
  // Keep the splash screen up until we know whether someone is signed in.
  useEffect(() => {
    if (!isLoading) SplashScreen.hide();
  }, [isLoading]);
  if (isLoading) return null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!token}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!token}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
