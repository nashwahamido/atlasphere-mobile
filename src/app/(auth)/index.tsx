import { router } from 'expo-router';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Wordmark } from '@/components/Wordmark';

export default function Welcome() {
  return (
    <ImageBackground source={require('../../../assets/hero.jpg')} style={styles.bg} resizeMode="cover">
      <View style={styles.shade} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <Text style={styles.kicker}>Welcome to</Text>
          <Wordmark maxWidth={360} />
          <Text style={styles.tagline}>Stop planning. Start going. Atlasphere turns group chats into group trips.</Text>
        </View>
        <View style={styles.actions}>
          <Button title="Create an account" onPress={() => router.push('/register')} />
          <Button title="Log in" variant="outlineLight" onPress={() => router.push('/login')} />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0B3856' },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(6,24,38,0.45)' },
  safe: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 24 },
  top: { marginTop: 48, maxWidth: 480 },
  kicker: { color: '#fff', fontSize: 34, fontWeight: '800', marginBottom: 8 },
  tagline: { color: 'rgba(255,255,255,0.9)', fontSize: 17, lineHeight: 24, marginTop: 18 },
  actions: { gap: 12, width: '100%', maxWidth: 480, alignSelf: 'center' },
});
