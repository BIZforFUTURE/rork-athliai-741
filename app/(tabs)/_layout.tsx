import { Tabs } from "expo-router";
import { Home, Route, Utensils, Dumbbell, Trophy } from "lucide-react-native";
import React from "react";
import * as Haptics from "expo-haptics";
import { Platform, View, StyleSheet } from "react-native";

function TabIcon({ children, focused, color }: { children: React.ReactNode; focused: boolean; color: string }) {
  return (
    <View style={styles.iconWrap}>
      {children}
      {focused && <View style={[styles.activeIndicator, { backgroundColor: color }]} />}
    </View>
  );
}

export default function TabLayout() {
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
          title: "Base",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color}>
              <Home size={22} color={color} />
            </TabIcon>
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
          title: "Run",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color}>
              <Route size={22} color={color} />
            </TabIcon>
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
          title: "Fuel",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color}>
              <Utensils size={22} color={color} />
            </TabIcon>
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
          title: "Gym",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color}>
              <Dumbbell size={22} color={color} />
            </TabIcon>
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
          title: "Stats",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color}>
              <Trophy size={22} color={color} />
            </TabIcon>
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
  iconWrap: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: 36,
    height: 28,
  },
  activeIndicator: {
    position: "absolute" as const,
    bottom: -4,
    width: 16,
    height: 3,
    borderRadius: 2,
  },
});
