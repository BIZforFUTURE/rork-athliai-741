import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import {
  ArrowLeft,
  MapPin,
  Trash2,
  Route,
  Clock,
  ChevronRight,
  Navigation,
  Play,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useApp } from "@/providers/AppProvider";
import RunMap from "@/components/RunMap";
import colors from "@/constants/colors";

export default function SavedRoutesScreen() {
  const insets = useSafeAreaInsets();
  const { savedRoutes, deleteSavedRoute } = useApp();
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);

  const handleStartRunOnRoute = useCallback((routeId: string) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.replace({ pathname: "/(tabs)/run", params: { guideRouteId: routeId } });
  }, []);

  const handleDeleteRoute = useCallback((routeId: string, routeName: string) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      "Delete Route",
      `Are you sure you want to delete "${routeName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteSavedRoute(routeId);
            if (expandedRoute === routeId) setExpandedRoute(null);
          },
        },
      ]
    );
  }, [deleteSavedRoute, expandedRoute]);

  const toggleExpand = useCallback((routeId: string) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setExpandedRoute(prev => (prev === routeId ? null : routeId));
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          testID="back-button"
        >
          <ArrowLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Routes</Text>
        <View style={styles.headerRight}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{savedRoutes.length}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {savedRoutes.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Navigation size={48} color="#374151" />
            </View>
            <Text style={styles.emptyTitle}>No Saved Routes</Text>
            <Text style={styles.emptySubtext}>
              After completing a run, tap "Save Route" on the run details screen to bookmark your favorite paths.
            </Text>
          </View>
        ) : (
          savedRoutes.map((route) => {
            const isExpanded = expandedRoute === route.id;
            return (
              <View key={route.id} style={styles.routeCard}>
                <TouchableOpacity
                  style={styles.routeCardHeader}
                  onPress={() => toggleExpand(route.id)}
                  activeOpacity={0.7}
                  testID={`route-card-${route.id}`}
                >
                  <View style={styles.routeIconWrap}>
                    <Route size={20} color="#00E5FF" />
                  </View>
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeName} numberOfLines={1}>
                      {route.name}
                    </Text>
                    <View style={styles.routeMeta}>
                      <MapPin size={12} color={colors.text.tertiary} />
                      <Text style={styles.routeMetaText}>
                        {route.distance.toFixed(2)} mi
                      </Text>
                      <View style={styles.routeMetaDot} />
                      <Clock size={12} color={colors.text.tertiary} />
                      <Text style={styles.routeMetaText}>
                        {formatDate(route.savedAt)}
                      </Text>
                    </View>
                    {route.notes ? (
                      <Text style={styles.routeNotes} numberOfLines={1}>
                        {route.notes}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.routeActions}>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteRoute(route.id, route.name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      testID={`delete-route-${route.id}`}
                    >
                      <Trash2 size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <ChevronRight
                      size={18}
                      color="#4B5563"
                      style={{
                        transform: [{ rotate: isExpanded ? "90deg" : "0deg" }],
                      }}
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && route.routeCoordinates.length > 0 && (
                  <View style={styles.routeMapWrap}>
                    <RunMap
                      currentLocation={null}
                      routeCoordinates={route.routeCoordinates}
                      showMap={true}
                      isRunning={false}
                      isHistorical={true}
                      title={route.name}
                    />
                    <TouchableOpacity
                      style={styles.runRouteBtn}
                      onPress={() => handleStartRunOnRoute(route.id)}
                      activeOpacity={0.7}
                      testID={`run-route-${route.id}`}
                    >
                      <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                      <Text style={styles.runRouteBtnText}>Run This Route</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {isExpanded && route.routeCoordinates.length === 0 && (
                  <View style={styles.noMapWrap}>
                    <Navigation size={24} color="#374151" />
                    <Text style={styles.noMapText}>
                      No GPS data for this route
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: colors.text.primary,
  },
  headerRight: {
    width: 40,
    alignItems: "flex-end" as const,
  },
  countBadge: {
    backgroundColor: "rgba(0,229,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#00E5FF",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center" as const,
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(55,65,81,0.15)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: colors.text.primary,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 15,
    color: colors.text.tertiary,
    textAlign: "center" as const,
    lineHeight: 22,
  },
  routeCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden" as const,
  },
  routeCardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 16,
    gap: 12,
  },
  routeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(0,229,255,0.08)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  routeInfo: {
    flex: 1,
    gap: 4,
  },
  routeName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.text.primary,
  },
  routeMeta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  routeMetaText: {
    fontSize: 13,
    color: colors.text.tertiary,
    fontWeight: "500" as const,
  },
  routeMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#374151",
  },
  routeNotes: {
    fontSize: 13,
    color: colors.text.secondary,
    fontStyle: "italic" as const,
  },
  routeActions: {
    alignItems: "center" as const,
    gap: 8,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(107,114,128,0.1)",
  },
  routeMapWrap: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  noMapWrap: {
    alignItems: "center" as const,
    paddingVertical: 24,
    gap: 8,
  },
  noMapText: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  runRouteBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: "#00ADB5",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
  },
  runRouteBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
});
