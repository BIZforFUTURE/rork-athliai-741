import { Tabs } from "expo-router";
import { Home, Route, Utensils, Dumbbell, Trophy } from "lucide-react-native";
import React from "react";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#00ADB5",
        tabBarInactiveTintColor: "#6B7280",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "rgba(14, 17, 23, 0.95)",
          borderTopWidth: 1,
          borderTopColor: "rgba(0, 173, 181, 0.2)",
          position: "absolute" as const,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontWeight: "600" as const,
          fontSize: 11,
          letterSpacing: 0.5,
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
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
          tabBarIcon: ({ color }) => <Route size={24} color={color} />,
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
          title: "Nutrition",
          tabBarIcon: ({ color }) => <Utensils size={24} color={color} />,
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
          tabBarIcon: ({ color }) => <Dumbbell size={24} color={color} />,
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
          tabBarIcon: ({ color }) => <Trophy size={24} color={color} />,
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