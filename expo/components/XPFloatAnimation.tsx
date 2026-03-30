import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";

interface XPFloatAnimationProps {
  amount: number;
  visible: boolean;
  onComplete?: () => void;
}

const XPFloatAnimation = React.memo(({ amount, visible, onComplete }: XPFloatAnimationProps) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      opacity.setValue(1);
      scale.setValue(0.8);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: -60,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 900,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete?.();
      });
    }
  }, [visible, translateY, opacity, scale, onComplete]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>+{amount} XP</Text>
    </Animated.View>
  );
});

XPFloatAnimation.displayName = "XPFloatAnimation";

const styles = StyleSheet.create({
  container: {
    position: "absolute" as const,
    alignSelf: "center" as const,
    backgroundColor: "rgba(74,124,89,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(74,124,89,0.2)",
    zIndex: 999,
  },
  text: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#4A7C59",
  },
});

export default XPFloatAnimation;
