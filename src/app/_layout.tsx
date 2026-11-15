import { router, SplashScreen, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { takePendingInvite } from '@/lib/pendingInvite';
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
  // Just signed in (not already signed in at launch): if they opened an
  // invite link first, take them into that trip.
  const wasSignedIn = useRef<boolean | null>(null);
  useEffect(() => {
    if (isLoading) return;
    const before = wasSignedIn.current;
    wasSignedIn.current = !!token;
    if (before === false && token) {
      const code = takePendingInvite();
      if (code) setTimeout(() => router.push({ pathname: '/join/[code]', params: { code } }), 0);
    }
  }, [token, isLoading]);
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
