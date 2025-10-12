import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Activity, MapPin, Target, Calendar, Dumbbell, Flame } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useApp } from "@/providers/AppProvider";

export default function DashboardScreen() {
  const { stats, nutrition } = useApp();

  const insets = useSafeAreaInsets();

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };





  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0D0F13', '#1A1F2E', '#0D0F13']}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.headerSubtitle}>Let&apos;s crush your goals today</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.content}>
        
        <View style={styles.streakContainer}>
          <View style={[styles.streakCard, styles.glowCard]}>
            <View style={styles.iconContainer}>
              <Activity size={24} color="#00E5FF" strokeWidth={2.5} />
            </View>
            <Text style={styles.streakNumber}>{stats.runStreak}</Text>
            <Text style={styles.streakLabel}>Run Streak</Text>
          </View>
          <View style={[styles.streakCard, styles.glowCard]}>
            <View style={styles.iconContainer}>
              <Flame size={24} color="#BFFF00" strokeWidth={2.5} />
            </View>
            <Text style={styles.streakNumber}>{stats.foodStreak}</Text>
            <Text style={styles.streakLabel}>Food Streak</Text>
          </View>
          <View style={[styles.streakCard, styles.glowCard]}>
            <View style={styles.iconContainer}>
              <Dumbbell size={24} color="#00E5FF" strokeWidth={2.5} />
            </View>
            <Text style={styles.streakNumber}>{stats.workoutStreak}</Text>
            <Text style={styles.streakLabel}>Gym Streak</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Summary</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.weeklyScrollView}
            contentContainerStyle={styles.weeklyScrollContent}
          >
            <View style={styles.weeklyStatCard}>
              <View style={styles.weeklyStatHeader}>
                <MapPin size={20} color="#00E5FF" strokeWidth={2.5} />
                <Text style={styles.weeklyStatLabel}>Miles</Text>
              </View>
              <Text style={styles.weeklyStatValue}>{stats.weeklyMiles.toFixed(1)}</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${Math.min((stats.weeklyMiles / 20) * 100, 100)}%` }]} />
              </View>
            </View>
            <View style={styles.weeklyStatCard}>
              <View style={styles.weeklyStatHeader}>
                <Target size={20} color="#BFFF00" strokeWidth={2.5} />
                <Text style={styles.weeklyStatLabel}>Runs</Text>
              </View>
              <Text style={styles.weeklyStatValue}>{stats.weeklyRuns}</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${Math.min((stats.weeklyRuns / 5) * 100, 100)}%`, backgroundColor: '#BFFF00' }]} />
              </View>
            </View>
            <View style={styles.weeklyStatCard}>
              <View style={styles.weeklyStatHeader}>
                <Calendar size={20} color="#00E5FF" strokeWidth={2.5} />
                <Text style={styles.weeklyStatLabel}>Time</Text>
              </View>
              <Text style={styles.weeklyStatValue}>{formatTime(stats.weeklyTime)}</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${Math.min((stats.weeklyTime / 3600) * 100, 100)}%` }]} />
              </View>
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today&apos;s Nutrition</Text>
          <View style={styles.nutritionContainer}>
            <View style={styles.nutritionRow}>
              <View style={styles.nutritionItem}>
                <View style={styles.nutritionIconWrapper}>
                  <Flame size={20} color="#FF6B35" strokeWidth={2.5} />
                </View>
                <View style={styles.nutritionTextContainer}>
                  <Text style={styles.nutritionValue}>{nutrition.calories}</Text>
                  <Text style={styles.nutritionLabel}>/ {nutrition.calorieGoal} cal</Text>
                </View>
                <View style={styles.nutritionRing}>
                  <Text style={styles.nutritionPercentage}>{Math.round((nutrition.calories / nutrition.calorieGoal) * 100)}%</Text>
                </View>
              </View>
            </View>
            <View style={styles.nutritionRow}>
              <View style={styles.nutritionItem}>
                <View style={styles.nutritionIconWrapper}>
                  <Dumbbell size={20} color="#00E5FF" strokeWidth={2.5} />
                </View>
                <View style={styles.nutritionTextContainer}>
                  <Text style={styles.nutritionValue}>{nutrition.protein}g</Text>
                  <Text style={styles.nutritionLabel}>/ {nutrition.proteinGoal}g protein</Text>
                </View>
                <View style={styles.nutritionRing}>
                  <Text style={styles.nutritionPercentage}>{Math.round((nutrition.protein / nutrition.proteinGoal) * 100)}%</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0F13",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  headerContent: {
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 36,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -1,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: "500" as const,
    color: "#00E5FF",
    letterSpacing: 0.5,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  userName: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: "#F9FAFB",
    letterSpacing: -0.5,
  },
  editIcon: {
    marginLeft: 10,
    opacity: 0.8,
  },
  nameEditContainer: {
    marginTop: 5,
  },
  nameInput: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: "#F9FAFB",
    borderBottomWidth: 2,
    borderBottomColor: "#00ADB5",
    paddingBottom: 5,
    minWidth: 200,
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 100,
    marginTop: -10,
  },
  streakContainer: {
    flexDirection: "row",
    gap: 14,
    marginTop: 24,
  },
  streakCard: {
    flex: 1,
    backgroundColor: "#171B22",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  glowCard: {
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#9CA3AF",
    textAlign: "center" as const,
    letterSpacing: 0.5,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 16,
    letterSpacing: -0.3,
    paddingLeft: 4,
  },
  weeklyScrollView: {
    marginHorizontal: -24,
  },
  weeklyScrollContent: {
    paddingHorizontal: 24,
    gap: 14,
  },
  weeklyStatCard: {
    backgroundColor: "#171B22",
    borderRadius: 18,
    padding: 14,
    width: 105,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  weeklyStatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  weeklyStatLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#9CA3AF",
    letterSpacing: 0.3,
  },
  weeklyStatValue: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    marginBottom: 10,
    letterSpacing: -1,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#1F2937",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#00E5FF",
    borderRadius: 3,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#F9FAFB",
    marginTop: 12,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "400" as const,
    color: "#9CA3AF",
    marginTop: 6,
  },
  nutritionContainer: {
    backgroundColor: "#171B22",
    borderRadius: 18,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  nutritionRow: {
    width: "100%",
  },
  nutritionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  nutritionIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
  },
  nutritionTextContainer: {
    flex: 1,
  },
  nutritionIcon: {
    fontSize: 24,
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  nutritionLabel: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#9CA3AF",
  },
  nutritionRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#00E5FF",
  },
  nutritionPercentage: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#00E5FF",
    letterSpacing: -0.3,
  },
  todoCard: {
    backgroundColor: "#161B22",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#7C3AED",
    borderWidth: 1,
    borderColor: "#1C2128",
  },
  todoCardCompleted: {
    borderLeftColor: "#10B981",
    backgroundColor: "#0F1F1A",
  },
  todoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  todoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1C2128",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  todoTitleCompleted: {
    color: "#10B981",
  },
  todoSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  todoStatus: {
    marginLeft: 10,
  },
  todoExercises: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1C2128",
  },
  todoExercisesText: {
    fontSize: 14,
    color: "#9CA3AF",
    lineHeight: 20,
  },
});
