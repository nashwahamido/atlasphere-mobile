import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

// Where Google sign-in returns to (atlasphere://auth). The sign-in sheet
// handles the result itself; if the phone also opens this link, step back to
// where the person was.
export default function AuthReturn() {
  useEffect(() => {
    const t = setTimeout(() => { if (router.canGoBack()) router.back(); else router.replace('/'); }, 0);
    return () => clearTimeout(t);
  }, []);
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>;
}
