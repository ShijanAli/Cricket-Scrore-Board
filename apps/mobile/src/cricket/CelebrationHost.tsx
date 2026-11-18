import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { CelebrationView } from '@cricket/client-core';
import { Text } from '@/ui';
import { useCelebrationStore } from '@/state/celebrations';

const TONES: Record<CelebrationView['tone'], { bg: string; fg: string }> = {
  gold: { bg: '#F59E0B', fg: '#3B2300' },
  red: { bg: '#DC2626', fg: '#FFFFFF' },
  green: { bg: '#10B981', fg: '#032E1F' },
  blue: { bg: '#2563EB', fg: '#FFFFFF' },
};
const CONFETTI = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#a855f7', '#eab308'];

function Piece({ index, height, width }: { index: number; height: number; width: number }) {
  const cfg = useMemo(
    () => ({
      left: Math.random() * width,
      drift: (Math.random() - 0.5) * 120,
      delay: Math.random() * 700,
      dur: 1800 + Math.random() * 1400,
      size: 7 + Math.random() * 6,
      color: CONFETTI[index % CONFETTI.length],
    }),
    [index, width],
  );
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(p, { toValue: 1, duration: cfg.dur, delay: cfg.delay, easing: Easing.linear, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [p, cfg]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: cfg.left,
        width: cfg.size,
        height: cfg.size * 1.6,
        backgroundColor: cfg.color,
        borderRadius: 2,
        opacity: p.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 0.9] }),
        transform: [
          { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [-20, height + 20] }) },
          { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, cfg.drift] }) },
          { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] }) },
        ],
      }}
    />
  );
}

/** Mounted once in the app layout. Never intercepts touches, so scoring continues underneath. */
export function CelebrationHost() {
  const current = useCelebrationStore((s) => s.queue[0]);
  const next = useCelebrationStore((s) => s.next);
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  const scale = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (!current) return;
    scale.setValue(reduceMotion ? 1 : 0.4);
    if (!reduceMotion) Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
    const t = setTimeout(next, current.view.durationMs);
    return () => clearTimeout(t);
  }, [current, next, scale, reduceMotion]);

  if (!current) return null;
  const { view } = current;
  const tone = TONES[view.tone];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityLiveRegion="polite" accessible accessibilityLabel={`${view.title} ${view.subtitle}`}>
      {view.confetti && !reduceMotion
        ? Array.from({ length: 32 }, (_, i) => <Piece key={`${current.key}:${i}`} index={i} height={height} width={width} />)
        : null}
      <View style={styles.center}>
        <Animated.View style={[styles.card, { backgroundColor: tone.bg, transform: [{ scale }] }]}>
          <Text style={{ fontSize: 44 }}>{view.emoji}</Text>
          <Text style={{ fontSize: 38, fontWeight: '900', color: tone.fg, letterSpacing: 1 }}>{view.title}</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: tone.fg, opacity: 0.9 }}>{view.subtitle}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  card: { alignItems: 'center', paddingHorizontal: 36, paddingVertical: 22, borderRadius: 28, borderWidth: 4, borderColor: 'rgba(255,255,255,0.75)', elevation: 12 },
});
