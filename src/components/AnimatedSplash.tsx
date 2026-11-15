import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, View } from 'react-native';

const NAVY = '#0B3856';
const ORANGE = '#E8933A';
const LOGO = 160;   // the "A" mark
const ORBIT = 230;  // the circle the dot flies around

// The opening screen: the Atlasphere mark on navy, a little plane-like dot
// circling it like a globe, the name sliding in, then a gentle zoom into the
// app. Stays until the app is `ready` (signed-in state known) and the
// animation has played; then calls onDone. Shorter with Reduce Motion on.
export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [anim] = useState(() => ({
    logo: new Animated.Value(0),    // 0 → 1: pop in
    orbit: new Animated.Value(0),   // 0 → 1: one loop
    ring: new Animated.Value(0),    // orbit ring fades in
    words: new Animated.Value(0),   // name and tagline slide up
    exit: new Animated.Value(0),    // 0 → 1: zoom and fade out
  }));
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((reduce) => {
      if (cancelled) return;
      const ease = Easing.out(Easing.cubic);
      const sequence = reduce
        ? Animated.parallel([
            Animated.timing(anim.logo, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.timing(anim.words, { toValue: 1, duration: 250, useNativeDriver: true }),
          ])
        : Animated.parallel([
            Animated.spring(anim.logo, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
            Animated.timing(anim.ring, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
            Animated.timing(anim.orbit, { toValue: 1, duration: 1300, delay: 150, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
            Animated.timing(anim.words, { toValue: 1, duration: 600, delay: 450, easing: ease, useNativeDriver: true }),
          ]);
      sequence.start(() => { if (!cancelled) setPlayed(true); });
    });
    return () => { cancelled = true; };
  }, [anim]);

  // Leave once the animation has played and the app is ready underneath.
  useEffect(() => {
    if (!played || !ready) return;
    Animated.timing(anim.exit, { toValue: 1, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => onDone());
  }, [played, ready, anim, onDone]);

  const logoScale = anim.logo.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const spin = anim.orbit.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '270deg'] });
  const dotScale = anim.orbit.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0.6] });
  const wordsY = anim.words.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const exitScale = anim.exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const exitOpacity = anim.exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Animated.View style={[styles.wrap, { opacity: exitOpacity }]} accessibilityLabel="Atlasphere" accessibilityRole="image">
      <Animated.View style={[styles.center, { transform: [{ scale: exitScale }] }]}>
        <View style={styles.stage}>
          <Animated.View style={[styles.ring, { opacity: anim.ring.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }) }]} />
          <Animated.View style={[styles.orbit, { transform: [{ rotate: spin }] }]}>
            <Animated.View style={[styles.dot, { transform: [{ scale: dotScale }] }]} />
          </Animated.View>
          <Animated.Image
            source={require('../../assets/splash-icon.png')}
            style={[styles.logo, { opacity: anim.logo, transform: [{ scale: logoScale }] }]}
            resizeMode="contain"
          />
        </View>
        <Animated.View style={[styles.words, { opacity: anim.words, transform: [{ translateY: wordsY }] }]}>
          <Image source={require('../../assets/logo-white.png')} style={styles.wordmark} resizeMode="contain" />
          <Animated.Text style={styles.tagline}>Stop planning. Start going.</Animated.Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, backgroundColor: NAVY, zIndex: 1000, elevation: 1000 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stage: { width: ORBIT, height: ORBIT, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: ORBIT, height: ORBIT, borderRadius: ORBIT / 2, borderWidth: 2, borderColor: '#FFFFFF' },
  orbit: { position: 'absolute', width: ORBIT, height: ORBIT },
  dot: {
    position: 'absolute', top: -7, left: ORBIT / 2 - 7, width: 14, height: 14, borderRadius: 7, backgroundColor: ORANGE,
    shadowColor: ORANGE, shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  logo: { width: LOGO, height: LOGO },
  words: { marginTop: 28, alignItems: 'center', gap: 10 },
  wordmark: { width: 190, height: Math.round((190 * 176) / 1420) },
  tagline: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
});
