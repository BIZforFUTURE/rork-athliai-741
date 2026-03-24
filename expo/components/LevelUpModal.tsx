import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { getRankForLevel, getRandomLevelUpMessage } from '@/constants/xp';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARTICLE_COUNT = 24;

interface LevelUpModalProps {
  visible: boolean;
  level: number;
  previousLevel: number;
  onDismiss: () => void;
}

function Particle({ delay, color }: { delay: number; color: string }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  const targetX = useMemo(() => (Math.random() - 0.5) * SCREEN_WIDTH * 0.8, []);
  const targetY = useMemo(() => -(Math.random() * SCREEN_HEIGHT * 0.4 + 100), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: targetX, duration: 1200, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(translateY, { toValue: targetY, duration: 800, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: targetY + 200, duration: 600, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(800),
          Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, opacity, scale, translateX, translateY, targetX, targetY]);

  const size = Math.random() * 8 + 4;

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
}

export default function LevelUpModal({ visible, level, previousLevel, onDismiss }: LevelUpModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const levelNumberScale = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.5)).current;

  const rank = getRankForLevel(level);
  const previousRank = getRankForLevel(previousLevel);
  const isNewRank = rank.title !== previousRank.title;
  const message = useMemo(() => getRandomLevelUpMessage(), []);

  const particleColors = useMemo(() => {
    const base = [rank.color, '#FFFFFF', '#FFD700', '#00E5FF'];
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => base[i % base.length]);
  }, [rank.color]);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.3);
      opacityAnim.setValue(0);
      levelNumberScale.setValue(0);
      titleOpacity.setValue(0);
      titleTranslateY.setValue(20);
      buttonOpacity.setValue(0);

      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 300);
      }

      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
        ]),
        Animated.spring(levelNumberScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(titleTranslateY, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
        ]),
        Animated.timing(buttonOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(glowPulse, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        ])
      );
      glowLoop.start();

      return () => glowLoop.stop();
    }
    return undefined;
  }, [visible, scaleAnim, opacityAnim, levelNumberScale, titleOpacity, titleTranslateY, buttonOpacity, glowPulse]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.particleContainer}>
          {particleColors.map((color, i) => (
            <Particle key={i} delay={i * 60} color={color} />
          ))}
        </View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View style={[styles.glowRing, { borderColor: rank.color, opacity: glowPulse }]} />

          <Text style={styles.levelUpLabel}>LEVEL UP</Text>

          <Animated.View style={{ transform: [{ scale: levelNumberScale }] }}>
            <Text style={styles.emoji}>{rank.emoji}</Text>
            <Text style={[styles.levelNumber, { color: rank.color }]}>{level}</Text>
          </Animated.View>

          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
              alignItems: 'center' as const,
            }}
          >
            <View style={[styles.rankBadge, { backgroundColor: rank.color + '20', borderColor: rank.color + '40' }]}>
              <Text style={[styles.rankTitle, { color: rank.color }]}>{rank.title}</Text>
            </View>

            {isNewRank && (
              <Text style={styles.newRankText}>New Rank Unlocked!</Text>
            )}

            <Text style={styles.message}>{message}</Text>
          </Animated.View>

          <Animated.View style={{ opacity: buttonOpacity, width: '100%' as const }}>
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: rank.color }]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                onDismiss();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  particleContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 1,
    height: 1,
  },
  particle: {
    position: 'absolute',
  },
  card: {
    width: SCREEN_WIDTH * 0.82,
    backgroundColor: '#141820',
    borderRadius: 28,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
    overflow: 'visible',
  },
  glowRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 32,
    borderWidth: 2,
  },
  levelUpLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 4,
    marginBottom: 16,
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 4,
  },
  levelNumber: {
    fontSize: 72,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -3,
    lineHeight: 80,
  },
  rankBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  rankTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  newRankText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD700',
    marginTop: 4,
    marginBottom: 4,
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  continueButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  continueText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
