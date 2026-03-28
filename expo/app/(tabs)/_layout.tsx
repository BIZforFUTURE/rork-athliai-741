import { Tabs } from "expo-router";
import { Home, Route, Utensils, Dumbbell, Trophy } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import { Platform, View, StyleSheet, Animated } from "react-native";
import { useLanguage } from "@/providers/LanguageProvider";

function AnimatedTabIcon({
  children,
  focused,
}: {
  children: React.ReactNode;
  focused: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.15,
          friction: 5,
          tension: 300,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 300,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused, scale, glowOpacity]);

  return (
    <View style={styles.iconOuter}>
      <Animated.View style={[styles.glowDot, { opacity: glowOpacity }]} />
      <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useLanguage();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#00E5FF",
        tabBarInactiveTintColor: "#374151",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0A0C10",
          borderTopWidth: 1,
          borderTopColor: "rgba(0,229,255,0.08)",
          position: "absolute" as const,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontWeight: "700" as const,
          fontSize: 10,
          letterSpacing: 0.8,
          textTransform: "uppercase" as const,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tab_home'),
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Home size={22} color={color} />
            </AnimatedTabIcon>
          ),
        }}
        listeners={{
          tabPress: () => {
            if (Platform.OS !== "web") {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          },
        }}
      />
      <Tabs.Screen
        name="run"
        options={{
          title: t('tab_run'),
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Route size={22} color={color} />
            </AnimatedTabIcon>
          ),
        }}
        listeners={{
          tabPress: () => {
            if (Platform.OS !== "web") {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          },
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: t('tab_fuel'),
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Utensils size={22} color={color} />
            </AnimatedTabIcon>
          ),
        }}
        listeners={{
          tabPress: () => {
            if (Platform.OS !== "web") {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          },
        }}
      />
      <Tabs.Screen
        name="gym"
        options={{
          title: t('tab_gym'),
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Dumbbell size={22} color={color} />
            </AnimatedTabIcon>
          ),
        }}
        listeners={{
          tabPress: () => {
            if (Platform.OS !== "web") {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          },
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: t('tab_stats'),
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Trophy size={22} color={color} />
            </AnimatedTabIcon>
          ),
        }}
        listeners={{
          tabPress: () => {
            if (Platform.OS !== "web") {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconOuter: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: 36,
    height: 28,
  },
  iconWrap: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  glowDot: {
    position: "absolute" as const,
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#00E5FF",
  },
});
