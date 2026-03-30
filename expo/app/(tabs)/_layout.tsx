import { Tabs } from "expo-router";
import { Home, Route, Utensils, Dumbbell, Trophy } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import { Platform, View, StyleSheet, Animated } from "react-native";
import { useLanguage } from "@/providers/LanguageProvider";
import { BlurView } from "expo-blur";
import { DS } from "@/constants/theme";

function AnimatedTabIcon({
  children,
  focused,
}: {
  children: React.ReactNode;
  focused: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const indicatorOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.1,
          friction: 6,
          tension: 300,
          useNativeDriver: true,
        }),
        Animated.timing(indicatorOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 300,
          useNativeDriver: true,
        }),
        Animated.timing(indicatorOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused, scale, indicatorOpacity]);

  return (
    <View style={styles.iconOuter}>
      <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
      <Animated.View style={[styles.indicator, { opacity: indicatorOpacity }]} />
    </View>
  );
}

function TabBarBackground() {
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(8,8,8,0.92)',
            borderTopWidth: 1,
            borderTopColor: DS.border.default,
            // @ts-ignore
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          },
        ]}
      />
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={50}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(8,8,8,0.75)',
            borderTopWidth: 1,
            borderTopColor: DS.border.default,
          },
        ]}
      />
    </View>
  );
}

export default function TabLayout() {
  const { t } = useLanguage();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: DS.accent.lime,
        tabBarInactiveTintColor: DS.slate.light,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          position: "absolute" as const,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontWeight: "600" as const,
          fontSize: 9,
          letterSpacing: 1.5,
          textTransform: "uppercase" as const,
          marginTop: 2,
        },
        tabBarBackground: () => <TabBarBackground />,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tab_home'),
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Home size={20} color={color} strokeWidth={DS.stroke.icon} />
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
              <Route size={20} color={color} strokeWidth={DS.stroke.icon} />
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
              <Utensils size={20} color={color} strokeWidth={DS.stroke.icon} />
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
              <Dumbbell size={20} color={color} strokeWidth={DS.stroke.icon} />
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
              <Trophy size={20} color={color} strokeWidth={DS.stroke.icon} />
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
  indicator: {
    position: "absolute" as const,
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: DS.accent.lime,
  },
});
