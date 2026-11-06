import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '@/components/Banner';
import { PersonRow } from '@/components/PersonRow';
import { api, type Person } from '@/lib/api';
import { useFriends } from '@/lib/friends';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function Friends() {
  const { token } = useSession();
  const { data, loading, error, refresh } = useFriends();
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<{ q: string; people: Person[] } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const trimmed = query.trim();
  // Results only for the current query; a spinner while it's being looked up.
  const results = trimmed.length >= 2 && found ? found.people : null;
  const searching = trimmed.length >= 2 && (!found || found.q !== trimmed);
  const [pulling, setPulling] = useState(false);
  const latest = useRef(0);

  // Refresh whenever the tab is opened.
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Search as you type (after a short pause); ignore answers to older queries.
  useEffect(() => {
    if (trimmed.length < 2 || !token) return;
    const id = ++latest.current;
    const timer = setTimeout(async () => {
      try {
        const res = await api.searchPeople(token, trimmed);
        if (id === latest.current) { setFound({ q: trimmed, people: res.results }); setSearchError(null); }
      } catch (err) {
        if (id === latest.current) {
          setFound({ q: trimmed, people: [] });
          setSearchError(err instanceof Error ? err.message : 'Search failed.');
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [trimmed, token]);

  // After an action, keep search results in step with the shared lists.
  const stateOf = (p: Person) => {
    if (data.friends.some((f) => f.id === p.id)) return 'friends' as const;
    if (data.incoming.some((f) => f.id === p.id)) return 'incoming' as const;
    if (data.outgoing.some((f) => f.id === p.id)) return 'outgoing' as const;
    return loading && p.relationship ? p.relationship : ('none' as const);
  };

  async function onPull() {
    setPulling(true);
    await refresh();
    setPulling(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onPull} tintColor={colors.orange} />}>
        <Text style={styles.title}>Friends</Text>

        <View style={styles.search}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Find people by name or email"
            placeholderTextColor="#8A99A8"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Find people"
            style={styles.searchInput}
          />
          {searching ? <ActivityIndicator color={colors.orange} /> : null}
        </View>

        {trimmed.length >= 2 ? (
          <Section title={`Results for “${trimmed}”`}>
            <Banner kind="error" message={searchError} />
            {searching ? null : (results || []).length === 0 ? (
              <Text style={styles.empty}>No one found. Try their full name, or the exact email they signed up with.</Text>
            ) : (results || []).map((p) => <PersonRow key={p.id} person={p} state={stateOf(p)} />)}
          </Section>
        ) : null}

        <Banner kind="error" message={error} />

        {data.incoming.length > 0 ? (
          <Section title="Friend requests" count={data.incoming.length}>
            {data.incoming.map((p) => <PersonRow key={p.id} person={p} state="incoming" />)}
          </Section>
        ) : null}

        <Section title="Your friends" count={data.friends.length}>
          {loading ? (
            <ActivityIndicator color={colors.orange} style={{ marginTop: 12 }} />
          ) : data.friends.length === 0 ? (
            <Text style={styles.empty}>No friends yet. Search for the people you travel with above.</Text>
          ) : data.friends.map((p) => <PersonRow key={p.id} person={p} state="friends" />)}
        </Section>

        {data.outgoing.length > 0 ? (
          <Section title="Sent requests" count={data.outgoing.length}>
            {data.outgoing.map((p) => <PersonRow key={p.id} person={p} state="outgoing" />)}
          </Section>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {typeof count === 'number' ? <Text style={styles.count}>{count}</Text> : null}
      </View>
      <View style={styles.list}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40, width: '100%', maxWidth: 560, alignSelf: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: colors.navy, marginBottom: 16 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.field, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, marginBottom: 22,
  },
  // (web only: drop the browser's own focus ring; the pill already shows focus)
  searchInput: { flex: 1, minHeight: 48, fontSize: 16, color: colors.text, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}) },
  section: { marginBottom: 24 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.navy },
  count: { fontSize: 12, fontWeight: '700', color: colors.textMuted, backgroundColor: colors.field, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, overflow: 'hidden' },
  list: { gap: 8 },
  empty: { fontSize: 15, lineHeight: 22, color: colors.textMuted },
});
