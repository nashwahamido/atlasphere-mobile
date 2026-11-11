import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { crowdMapUrl, type CrowdMapData } from './crowdMapUrl';

// The crowd heat map is the website's own map page, shown in a web view.
export function CrowdMap({ data, height = 300 }: { data: CrowdMapData; height?: number }) {
  return (
    <View style={[styles.wrap, { height }]} accessibilityLabel="Map of estimated crowds and closed places">
      <WebView source={{ uri: crowdMapUrl(data) }} style={styles.web} scrollEnabled={false} originWhitelist={['*']} setSupportMultipleWindows={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#e5e7eb' },
  web: { flex: 1, backgroundColor: 'transparent' },
});
