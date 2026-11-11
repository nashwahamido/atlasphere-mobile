import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { crowdMapUrl, type CrowdMapData } from './crowdMapUrl';

// Web build: same map page in an iframe.
export function CrowdMap({ data, height = 300 }: { data: CrowdMapData; height?: number }) {
  return (
    <View style={[styles.wrap, { height }]}>
      {createElement('iframe', {
        src: crowdMapUrl(data),
        title: 'Map of estimated crowds and closed places',
        style: { border: 0, width: '100%', height: '100%' },
      })}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#e5e7eb' } });
