import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { DS } from "@/constants/theme";

interface CircularProgressProps {
  value: number;
  goal: number;
  color: string;
  label: string;
}

const CircularProgress = React.memo(({ value, goal, color, label }: CircularProgressProps) => {
  const percentage = Math.min((value / goal) * 100, 100);
  const exceeds = value > goal;
  const [animatedPercentage] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.spring(animatedPercentage, {
      toValue: percentage,
      useNativeDriver: false,
      tension: 40,
      friction: 8,
    }).start();

    if (percentage >= 95 && percentage <= 100) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [percentage, animatedPercentage, pulseAnim]);

  const size = 110;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const staticOffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.progressContainer}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Defs>
            <LinearGradient id={`circGrad-${label}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={exceeds ? DS.accent.red : DS.accent.lime} stopOpacity="1" />
              <Stop offset="1" stopColor={exceeds ? DS.accent.red : DS.accent.periwinkle} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#circGrad-${label})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={`${staticOffset}`}
            strokeLinecap="round"
          />
        </Svg>
        <View style={styles.progressRingCenter}>
          <Text style={[styles.progressPercentage, { color: exceeds ? DS.accent.red : color }]}>
            {Math.round(percentage)}%
          </Text>
        </View>
      </Animated.View>
      <Text style={styles.progressValue}>
        {value}{label === "Calories" ? "" : "g"} / {goal}{label === "Calories" ? "" : "g"}
      </Text>
    </View>
  );
});

CircularProgress.displayName = 'CircularProgress';

const styles = StyleSheet.create({
  progressContainer: {
    alignItems: "center" as const,
    marginTop: 8,
  },
  progressRingCenter: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
  },
  progressValue: {
    fontSize: 11,
    color: DS.text.tertiary,
    marginTop: 8,
    fontWeight: "600" as const,
    letterSpacing: 0.3,
  },
});

export default CircularProgress;
