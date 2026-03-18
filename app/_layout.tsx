import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider } from "@/providers/AppProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { RevenueCatProvider } from "@/providers/RevenueCatProvider";

import { StyleSheet, View, ActivityIndicator } from "react-native";


void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="workout-builder" options={{ headerShown: false }} />
      <Stack.Screen name="workout/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="paywall" options={{ headerShown: false, presentation: "modal" }} />
    </Stack>
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
      <NotificationProvider>
        <AppProvider>
          <RevenueCatProvider>
            <GestureHandlerRootView style={styles.container}>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </RevenueCatProvider>
        </AppProvider>
      </NotificationProvider>
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
    backgroundColor: "#FFFFFF",
  },
});