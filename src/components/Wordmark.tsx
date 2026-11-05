import { Image, useWindowDimensions } from 'react-native';

const RATIO = 176 / 1420; // height / width of the wordmark artwork

// The white Atlasphere wordmark at an exact size (an image left to size itself
// keeps its natural 176px height and leaves big gaps around it).
export function Wordmark({ maxWidth, sidePadding = 48, color }: { maxWidth: number; sidePadding?: number; color?: string }) {
  const { width } = useWindowDimensions();
  const w = Math.min(maxWidth, width - sidePadding);
  return (
    <Image
      source={require('../../assets/logo-white.png')}
      style={{ width: w, height: Math.round(w * RATIO), tintColor: color }}
      resizeMode="contain"
      accessibilityLabel="Atlasphere"
    />
  );
}
