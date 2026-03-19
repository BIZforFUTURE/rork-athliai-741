import React, { useMemo, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Animated,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Activity, MapPin, Target, Calendar, Dumbbell, Flame, Zap, Shield } from "lucide-react-native";
import { useApp } from "@/providers/AppProvider";

function ProgressRing({ 
  progress, 
  size, 
  strokeWidth, 
  color, 
  bgColor 
}: { 
  progress: number; 
  size: number; 
  strokeWidth: number; 
  color: string; 
  bgColor: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={bgColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

function XPCard() {
  const { xpInfo } = useApp();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: xpInfo.progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [xpInfo.progress, progressAnim]);

  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.8, duration: 1500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1500, useNativeDriver: false }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, [glowAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const glowOpacity = glowAnim;

  return (
    <View style={[xpStyles.card, { borderColor: xpInfo.rank.color + '30' }]}>
      <View style={xpStyles.topRow}>
        <View style={xpStyles.levelBadge}>
          <Text style={xpStyles.levelEmoji}>{xpInfo.rank.emoji}</Text>
          <View>
            <Text style={[xpStyles.levelNumber, { color: xpInfo.rank.color }]}>Lv {xpInfo.level}</Text>
            <Text style={[xpStyles.rankTitle, { color: xpInfo.rank.color }]}>{xpInfo.rank.title}</Text>
          </View>
        </View>
        <View style={xpStyles.xpTotal}>
          <Shield size={14} color="#6B7280" />
          <Text style={xpStyles.totalXPText}>{xpInfo.totalXP.toLocaleString()} XP</Text>
        </View>
      </View>

      <View style={xpStyles.barContainer}>
        <View style={xpStyles.barBackground}>
          <Animated.View
            style={[
              xpStyles.barFill,
              {
                width: progressWidth,
                backgroundColor: xpInfo.rank.color,
              },
            ]}
          />
          <Animated.View
            style={[
              xpStyles.barGlow,
              {
                width: progressWidth,
                backgroundColor: xpInfo.rank.color,
                opacity: glowOpacity,
              },
            ]}
          />
        </View>
      </View>

      <View style={xpStyles.bottomRow}>
        <Text style={xpStyles.xpProgressText}>
          {xpInfo.currentXP} / {xpInfo.neededXP} XP
        </Text>
        <Text style={xpStyles.xpToNext}>
          {xpInfo.neededXP - xpInfo.currentXP} XP to next level
        </Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { stats, nutrition } = useApp();
  const insets = useSafeAreaInsets();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return "Late night grind";
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Late night grind";
  }, []);

  const motivationalLine = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return "Rest well, recover strong";
    if (hour < 12) return "Time to move and make progress";
    if (hour < 17) return "Keep the momentum going";
    if (hour < 21) return "Finish the day strong";
    return "Rest well, recover strong";
  }, []);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const calProgress = nutrition.calorieGoal > 0 ? nutrition.calories / nutrition.calorieGoal : 0;
  const proteinProgress = nutrition.proteinGoal > 0 ? nutrition.protein / nutrition.proteinGoal : 0;
  const carbsProgress = nutrition.carbsGoal > 0 ? nutrition.carbs / nutrition.carbsGoal : 0;

  const maxStreak = Math.max(stats.runStreak, stats.foodStreak, stats.workoutStreak);
  const streakEmoji = maxStreak >= 7 ? "🔥" : maxStreak >= 3 ? "⚡" : "💪";

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0D0F13', '#131820', '#0D0F13']}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.headerSubtitle}>{motivationalLine}</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>

          <XPCard />

          <View style={styles.streakContainer}>
            <View style={[styles.streakCard, { borderColor: stats.runStreak > 0 ? 'rgba(0, 229, 255, 0.2)' : '#1F2937' }]}>
              <View style={[styles.iconContainer, { backgroundColor: stats.runStreak > 0 ? 'rgba(0, 229, 255, 0.1)' : '#1F2937' }]}>
                <Activity size={22} color="#00E5FF" strokeWidth={2.5} />
              </View>
              <Text style={styles.streakNumber}>{stats.runStreak}</Text>
              <Text style={styles.streakLabel}>Run</Text>
              {stats.runStreak >= 3 && <Text style={styles.streakBadge}>{streakEmoji}</Text>}
            </View>
            <View style={[styles.streakCard, { borderColor: stats.foodStreak > 0 ? 'rgba(191, 255, 0, 0.2)' : '#1F2937' }]}>
              <View style={[styles.iconContainer, { backgroundColor: stats.foodStreak > 0 ? 'rgba(191, 255, 0, 0.1)' : '#1F2937' }]}>
                <Flame size={22} color="#BFFF00" strokeWidth={2.5} />
              </View>
              <Text style={styles.streakNumber}>{stats.foodStreak}</Text>
              <Text style={styles.streakLabel}>Food</Text>
              {stats.foodStreak >= 3 && <Text style={styles.streakBadge}>{streakEmoji}</Text>}
            </View>
            <View style={[styles.streakCard, { borderColor: stats.workoutStreak > 0 ? 'rgba(0, 173, 181, 0.2)' : '#1F2937' }]}>
              <View style={[styles.iconContainer, { backgroundColor: stats.workoutStreak > 0 ? 'rgba(0, 173, 181, 0.1)' : '#1F2937' }]}>
                <Dumbbell size={22} color="#00ADB5" strokeWidth={2.5} />
              </View>
              <Text style={styles.streakNumber}>{stats.workoutStreak}</Text>
              <Text style={styles.streakLabel}>Gym</Text>
              {stats.workoutStreak >= 3 && <Text style={styles.streakBadge}>{streakEmoji}</Text>}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today&apos;s Nutrition</Text>
            <View style={styles.nutritionCard}>
              <View style={styles.nutritionMainRing}>
                <View style={styles.ringWrapper}>
                  <ProgressRing
                    progress={calProgress}
                    size={120}
                    strokeWidth={10}
                    color="#FF6B35"
                    bgColor="#2A1F1A"
                  />
                  <View style={styles.ringCenter}>
                    <Text style={styles.ringValue}>{nutrition.calories}</Text>
                    <Text style={styles.ringUnit}>cal</Text>
                  </View>
                </View>
                <View style={styles.nutritionGoalText}>
                  <Text style={styles.nutritionGoalLabel}>of {nutrition.calorieGoal} cal goal</Text>
                  <Text style={styles.nutritionGoalPercent}>
                    {Math.round(calProgress * 100)}%
                  </Text>
                </View>
              </View>

              <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                  <View style={styles.macroRingWrapper}>
                    <ProgressRing
                      progress={proteinProgress}
                      size={52}
                      strokeWidth={5}
                      color="#00E5FF"
                      bgColor="#1A2A2D"
                    />
                    <View style={styles.macroRingCenter}>
                      <Zap size={14} color="#00E5FF" />
                    </View>
                  </View>
                  <Text style={styles.macroValue}>{nutrition.protein}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroGoal}>/ {nutrition.proteinGoal}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={styles.macroRingWrapper}>
                    <ProgressRing
                      progress={carbsProgress}
                      size={52}
                      strokeWidth={5}
                      color="#BFFF00"
                      bgColor="#1F2A1A"
                    />
                    <View style={styles.macroRingCenter}>
                      <Flame size={14} color="#BFFF00" />
                    </View>
                  </View>
                  <Text style={styles.macroValue}>{nutrition.carbs}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={styles.macroGoal}>/ {nutrition.carbsGoal}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={styles.macroRingWrapper}>
                    <ProgressRing
                      progress={nutrition.fatGoal > 0 ? nutrition.fat / nutrition.fatGoal : 0}
                      size={52}
                      strokeWidth={5}
                      color="#F59E0B"
                      bgColor="#2A2518"
                    />
                    <View style={styles.macroRingCenter}>
                      <Target size={14} color="#F59E0B" />
                    </View>
                  </View>
                  <Text style={styles.macroValue}>{nutrition.fat}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                  <Text style={styles.macroGoal}>/ {nutrition.fatGoal}g</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Summary</Text>
            <View style={styles.weeklyGrid}>
              <View style={styles.weeklyStatCard}>
                <View style={styles.weeklyStatHeader}>
                  <MapPin size={18} color="#00E5FF" strokeWidth={2.5} />
                  <Text style={styles.weeklyStatLabel}>Miles</Text>
                </View>
                <Text style={styles.weeklyStatValue}>{stats.weeklyMiles.toFixed(1)}</Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${Math.min((stats.weeklyMiles / 20) * 100, 100)}%` }]} />
                </View>
              </View>
              <View style={styles.weeklyStatCard}>
                <View style={styles.weeklyStatHeader}>
                  <Target size={18} color="#BFFF00" strokeWidth={2.5} />
                  <Text style={styles.weeklyStatLabel}>Runs</Text>
                </View>
                <Text style={styles.weeklyStatValue}>{stats.weeklyRuns}</Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${Math.min((stats.weeklyRuns / 5) * 100, 100)}%`, backgroundColor: '#BFFF00' }]} />
                </View>
              </View>
              <View style={styles.weeklyStatCard}>
                <View style={styles.weeklyStatHeader}>
                  <Calendar size={18} color="#00ADB5" strokeWidth={2.5} />
                  <Text style={styles.weeklyStatLabel}>Time</Text>
                </View>
                <Text style={styles.weeklyStatValue}>{formatTime(stats.weeklyTime)}</Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${Math.min((stats.weeklyTime / 3600) * 100, 100)}%`, backgroundColor: '#00ADB5' }]} />
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
    paddingBottom: 28,
  },
  headerContent: {
    marginTop: 8,
  },
  greetingText: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: "#00E5FF",
    letterSpacing: 0.3,
    opacity: 0.9,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  streakContainer: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 20,
  },
  streakCard: {
    flex: 1,
    backgroundColor: "#141820",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center" as const,
    gap: 6,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  streakBadge: {
    fontSize: 14,
    marginTop: -2,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  nutritionCard: {
    backgroundColor: "#141820",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  nutritionMainRing: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 20,
    marginBottom: 24,
  },
  ringWrapper: {
    position: "relative" as const,
    width: 120,
    height: 120,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ringCenter: {
    position: "absolute" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ringValue: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  ringUnit: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#9CA3AF",
    marginTop: -2,
  },
  nutritionGoalText: {
    flex: 1,
  },
  nutritionGoalLabel: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  nutritionGoalPercent: {
    fontSize: 36,
    fontWeight: "800" as const,
    color: "#FF6B35",
    letterSpacing: -1,
  },
  macroRow: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
  },
  macroItem: {
    alignItems: "center" as const,
    gap: 4,
  },
  macroRingWrapper: {
    position: "relative" as const,
    width: 52,
    height: 52,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 4,
  },
  macroRingCenter: {
    position: "absolute" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  macroGoal: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#4B5563",
  },
  weeklyGrid: {
    flexDirection: "row" as const,
    gap: 12,
  },
  weeklyStatCard: {
    flex: 1,
    backgroundColor: "#141820",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  weeklyStatHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 10,
  },
  weeklyStatLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  weeklyStatValue: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    marginBottom: 10,
    letterSpacing: -1,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: "#1F2937",
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  progressBar: {
    height: "100%" as const,
    backgroundColor: "#00E5FF",
    borderRadius: 2,
  },
});

const xpStyles = StyleSheet.create({
  card: {
    backgroundColor: '#141820',
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  levelEmoji: {
    fontSize: 32,
  },
  levelNumber: {
    fontSize: 22,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
  },
  rankTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    marginTop: -2,
  },
  xpTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  totalXPText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#9CA3AF',
  },
  barContainer: {
    marginBottom: 10,
  },
  barBackground: {
    height: 8,
    backgroundColor: '#1F2937',
    borderRadius: 4,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  barFill: {
    height: '100%' as const,
    borderRadius: 4,
    position: 'absolute' as const,
    left: 0,
    top: 0,
  },
  barGlow: {
    height: '100%' as const,
    borderRadius: 4,
    position: 'absolute' as const,
    left: 0,
    top: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpProgressText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  xpToNext: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#4B5563',
  },
});
