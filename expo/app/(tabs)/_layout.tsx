import { Tabs } from "expo-router";
import { Home, Route, Utensils, Dumbbell, Trophy } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import {
  Platform,
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const ACCENT = "#00E5FF";
const BAR_BG = "#1A1D23";
const INACTIVE_COLOR = "#6B7280";

const TAB_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  home: Home,
  run: Route,
  nutrition: Utensils,
  gym: Dumbbell,
  leaderboard: Trophy,
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabCount = state.routes.length;
  const screenWidth = Dimensions.get("window").width;
  const tabWidth = (screenWidth - 24) / tabCount;
  const pillAnim = useRef(new Animated.Value(state.index * tabWidth)).current;

  useEffect(() => {
    Animated.spring(pillAnim, {
      toValue: state.index * tabWidth,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [state.index, tabWidth, pillAnim]);

  return (
    <View
      style={[
        styles.barOuter,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View style={styles.barContainer}>
        <Animated.View
          style={[
            styles.pill,
            {
              width: tabWidth - 8,
              transform: [{ translateX: Animated.add(pillAnim, 4) }],
            },
          ]}
        />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const isFocused = state.index === index;
          const IconComponent = TAB_ICONS[route.name];

          const onPress = () => {
            if (Platform.OS !== "web") {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={`tab-${route.name}`}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabButton}
            >
              <AnimatedIcon focused={isFocused}>
                {IconComponent && (
                  <IconComponent
                    size={21}
                    color={isFocused ? ACCENT : INACTIVE_COLOR}
                  />
                )}
              </AnimatedIcon>
              <Text
                style={[
                  styles.label,
                  { color: isFocused ? ACCENT : INACTIVE_COLOR },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function AnimatedIcon({
  children,
  focused,
}: {
  children: React.ReactNode;
  focused: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.12 : 1,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      {children}
    </Animated.View>
  );
}

export default function TabLayout() {
  const { t } = useLanguage();
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" options={{ title: t("tab_home") }} />
      <Tabs.Screen name="run" options={{ title: t("tab_run") }} />
      <Tabs.Screen name="nutrition" options={{ title: t("tab_fuel") }} />
      <Tabs.Screen name="gym" options={{ title: t("tab_gym") }} />
      <Tabs.Screen name="leaderboard" options={{ title: t("tab_stats") }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barOuter: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0A0C10",
    paddingTop: 6,
    paddingHorizontal: 12,
  },
  barContainer: {
    flexDirection: "row" as const,
    backgroundColor: BAR_BG,
    borderRadius: 28,
    height: 56,
    alignItems: "center" as const,
    overflow: "hidden" as const,
  },
  pill: {
    position: "absolute" as const,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 229, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.2)",
    top: 6,
    left: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    height: 56,
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "600" as const,
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
