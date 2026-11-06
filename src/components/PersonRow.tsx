import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Person, Relationship } from '@/lib/api';
import { colors, radius } from '@/lib/theme';

import { Avatar } from './Avatar';
import { FriendActions } from './FriendActions';

export function PersonRow({ person, state }: { person: Person; state: Relationship }) {
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.person}
        onPress={() => router.push({ pathname: '/people/[id]', params: { id: String(person.id) } })}
        accessibilityRole="link"
        accessibilityLabel={`View ${person.username}'s profile`}>
        <Avatar name={person.username} url={person.profilePictureUrl} />
        <Text style={styles.name} numberOfLines={1}>{person.username}</Text>
      </Pressable>
      <FriendActions personId={person.id} name={person.username} state={state} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
    padding: 12, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
  },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1, minWidth: 140 },
  name: { fontSize: 16, fontWeight: '600', color: colors.navy, flexShrink: 1 },
});
