import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider, useApp } from "@/providers/AppProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { RevenueCatProvider } from "@/providers/RevenueCatProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import LevelUpModal from "@/components/LevelUpModal";

import { StyleSheet, View, ActivityIndicator, Platform } from "react-native";

if (Platform.OS === "web" && typeof window !== "undefined") {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const shouldSuppress = (args: unknown[]) => {
    const message = typeof args[0] === "string" ? args[0] : "";
    return message.includes("non-boolean attribute") || message.includes("collapsable");
  };
  console.error = (...args: unknown[]) => {
    if (shouldSuppress(args)) return;
    originalConsoleError(...args);
  };
  console.warn = (...args: unknown[]) => {
    if (shouldSuppress(args)) return;
    originalConsoleWarn(...args);
  };
}


void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function LevelUpOverlay() {
  const { pendingLevelUp, dismissLevelUp } = useApp();
  if (!pendingLevelUp) return null;
  return (
    <LevelUpModal
      visible={!!pendingLevelUp}
      level={pendingLevelUp.level}
      previousLevel={pendingLevelUp.previousLevel}
      onDismiss={dismissLevelUp}
    />
  );
}

function RootLayoutNav() {
  return (
    <>
      <Stack screenOptions={{ headerBackTitle: "Back", contentStyle: { backgroundColor: "#0A0E1A" } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="workout-builder" options={{ headerShown: false }} />
        <Stack.Screen name="workout/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="run-details/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
        <Stack.Screen name="workout-complete" options={{ headerShown: false }} />
        <Stack.Screen name="saved-routes" options={{ headerShown: false }} />
        <Stack.Screen name="gym-calendar" options={{ headerShown: false }} />
        <Stack.Screen name="daily-challenge" options={{ headerShown: false }} />
      </Stack>
      <LevelUpOverlay />
    </>
  );
}

function LoadingScreen() {
  return (
    <View style={[styles.container, styles.loadingContainer]}>
      <ActivityIndicator size="large" color="#4F46E5" />
    </View>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    // Give the app a moment to initialize
    const timer = setTimeout(() => {
      setIsReady(true);
      void SplashScreen.hideAsync();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <NotificationProvider>
          <AppProvider>
            <RevenueCatProvider>
              <GestureHandlerRootView style={styles.container}>
                <RootLayoutNav />
              </GestureHandlerRootView>
            </RevenueCatProvider>
          </AppProvider>
        </NotificationProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0E1A",
  },
});