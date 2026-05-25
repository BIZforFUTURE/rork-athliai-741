import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from "react-native-svg";
import { SkipForward } from "lucide-react-native";

interface RestTimerProps {
  totalSeconds: number;
  remainingSeconds: number;
  onSkip: () => void;
  onComplete?: () => void;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RestTimer: React.FC<RestTimerProps> = ({
  totalSeconds,
  remainingSeconds,
  onSkip,
  onComplete,
}) => {
  const progressAnim = useRef(new Animated.Value(remainingSeconds)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [hasBuzzed, setHasBuzzed] = useState(false);

  const size = 200;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animate the progress circle
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: remainingSeconds,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [remainingSeconds, progressAnim]);

  // Pulse animation when under 5 seconds
  useEffect(() => {
    if (remainingSeconds <= 5 && remainingSeconds > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [remainingSeconds, pulseAnim]);

  // Haptic buzz when rest ends
  useEffect(() => {
    if (remainingSeconds === 0 && !hasBuzzed) {
      setHasBuzzed(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Secondary buzz after a short delay for emphasis
      setTimeout(() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }, 150);
      onComplete?.();
    }
    if (remainingSeconds > 0) {
      setHasBuzzed(false);
    }
  }, [remainingSeconds, hasBuzzed, onComplete]);

  const fraction = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const strokeDashoffset = circumference * (1 - fraction);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isLow = remainingSeconds <= 5;

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.container,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <View style={styles.ringContainer}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(245, 158, 11, 0.12)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress circle */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={isLow ? "#EF4444" : "#F59E0B"}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={strokeDashoffset}
            />
          </Svg>
          {/* Center content */}
          <View style={styles.centerContent}>
            <Text style={[styles.timeText, isLow && styles.timeTextLow]}>
              {formatTime(remainingSeconds)}
            </Text>
            <Text style={styles.labelText}>
              {isLow ? "Get ready!" : "Rest"}
            </Text>
          </View>
        </View>

        {/* Exercise name hint for next set */}
        <Text style={styles.hintText}>
          Next set starting soon
        </Text>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
          activeOpacity={0.7}
        >
          <SkipForward size={18} color="#FFFFFF" />
          <Text style={styles.skipButtonText}>Skip Rest</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  container: {
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    borderRadius: 28,
    paddingHorizontal: 40,
    paddingTop: 36,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
    minWidth: 280,
  },
  ringContainer: {
    position: "relative",
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    fontSize: 48,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -1,
  },
  timeTextLow: {
    color: "#EF4444",
  },
  labelText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "600" as const,
    marginTop: 2,
    textTransform: "uppercase" as const,
    letterSpacing: 2,
  },
  hintText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 16,
    marginBottom: 16,
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  skipButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600" as const,
  },
});

export default RestTimer;
