import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Wordmark } from '@/components/Wordmark';
import { absoluteUrl } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { useSession } from '@/lib/session';
import { colors, radius } from '@/lib/theme';

export default function Home() {
  const { user, signOut } = useSession();
  const avatar = absoluteUrl(user?.profilePictureUrl);
  const initial = (user?.username || '?').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Wordmark maxWidth={190} sidePadding={84} />
        </View>

        <View style={styles.profile}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} accessibilityIgnoresInvertColors />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarText}>{initial}</Text></View>
          )}
          <Text style={styles.hello}>Hi, {user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your trips are on their way</Text>
          <Text style={styles.cardText}>
            Group chat, recommendations and the itinerary are coming to the app next. Until then, they’re all on the website with the same account.
          </Text>
          <Button title="Open my trips on the web" onPress={() => Linking.openURL(API_URL + '/groups')} />
        </View>

        <View style={[styles.card, styles.friendsCard]}>
          <Text style={styles.cardTitle}>Travel with friends</Text>
          <Text style={styles.cardText}>Add the people you travel with and see where they’ve been.</Text>
          <Button title="Find friends" variant="secondary" onPress={() => router.push('/friends')} />
        </View>

        <Button title="Log out" variant="secondary" onPress={signOut} style={styles.logout} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 22, paddingBottom: 40, width: '100%', maxWidth: 520, alignSelf: 'center' },
  header: { backgroundColor: colors.navy, borderRadius: radius.card, paddingVertical: 18, paddingHorizontal: 20, alignItems: 'center' },
  profile: { alignItems: 'center', marginTop: 28, marginBottom: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  avatarFallback: { backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 38, fontWeight: '800' },
  hello: { fontSize: 26, fontWeight: '800', color: colors.navy },
  email: { fontSize: 15, color: colors.textMuted, marginTop: 4 },
  card: { backgroundColor: colors.field, borderRadius: radius.card, padding: 20, gap: 12, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.navy },
  cardText: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
  friendsCard: { marginTop: 14 },
  logout: { marginTop: 24 },
});
