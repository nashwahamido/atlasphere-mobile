import { DarkTheme, DefaultTheme, router, SplashScreen, Stack, ThemeProvider as NavigationTheme } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplash } from '@/components/AnimatedSplash';
import { takePendingInvite } from '@/lib/pendingInvite';
import { SessionProvider, useSession } from '@/lib/session';
import { ThemeProvider, useTheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          <AppShell />
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// The app under the animated opening screen. The phone's own splash (same
// navy) is swapped for the animated one as soon as the app starts.
function AppShell() {
  const { isLoading } = useSession();
  const [splash, setSplash] = useState(true);
  useEffect(() => { SplashScreen.hide(); }, []);
  const done = useCallback(() => setSplash(false), []);
  return (
    <View style={{ flex: 1, backgroundColor: '#0B3856' }}>
      <Themed>
        <RootNavigator />
      </Themed>
      {splash ? <AnimatedSplash ready={!isLoading} onDone={done} /> : null}
    </View>
  );
}

// Light or dark for the navigation (screen backgrounds, headers) and the
// status bar, matching the app's colours.
function Themed({ children }: { children: React.ReactNode }) {
  const { colors, scheme } = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, primary: colors.orange, background: colors.bg, card: colors.bg, text: colors.navy, border: colors.border },
  };
  return (
    <NavigationTheme value={navTheme}>
      {children}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </NavigationTheme>
  );
}

function RootNavigator() {
  const { token, isLoading } = useSession();
  // Keep the splash screen up until we know whether someone is signed in.
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
