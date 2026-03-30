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

  useEffect(() => {
    if (focused) {
      Animated.spring(scale, {
        toValue: 1.1,
        friction: 5,
        tension: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [focused, scale]);

  return (
    <View style={styles.iconOuter}>
      <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
      {focused && <View style={styles.activeIndicator} />}
    </View>
  );
}

export default function TabLayout() {
  const { t } = useLanguage();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#1A1A1A",
        tabBarInactiveTintColor: "#A1A1A6",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          position: "absolute" as const,
          elevation: 0,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.03,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontWeight: "600" as const,
          fontSize: 10,
          letterSpacing: 0.5,
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
              <Home size={22} color={color} fill={focused ? color : 'transparent'} strokeWidth={1.5} />
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
              <Route size={22} color={color} fill={focused ? color : 'transparent'} strokeWidth={1.5} />
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
              <Utensils size={22} color={color} fill={focused ? color : 'transparent'} strokeWidth={1.5} />
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
              <Dumbbell size={22} color={color} fill={focused ? color : 'transparent'} strokeWidth={1.5} />
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
              <Trophy size={22} color={color} fill={focused ? color : 'transparent'} strokeWidth={1.5} />
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
  activeIndicator: {
    position: "absolute" as const,
    bottom: -4,
    width: 6,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#4A7C59",
  },
});
