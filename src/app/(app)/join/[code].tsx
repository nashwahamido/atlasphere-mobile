import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { useTrips } from '@/lib/trips';
import { colors } from '@/lib/theme';

// Opened from an atlasphere://join/<code> link: join, then show the trip.
export default function JoinFromLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { call, upsert } = useTrips();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    call((t) => api.joinTrip(t, String(code || '')))
      .then((res) => {
        if (cancelled) return;
        upsert(res.trip);
        router.replace({ pathname: '/trips/[id]', params: { id: res.trip.id } });
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Couldn’t join the trip.'); });
    return () => { cancelled = true; };
  }, [call, code, upsert]);

  return (
    <View style={styles.wrap}>
      {error ? (
        <>
          <Banner kind="error" message={error} />
          <Button title="Go to my trips" variant="secondary" onPress={() => router.replace('/')} />
        </>
      ) : <ActivityIndicator color={colors.navy} />}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 } });
