import React, { useMemo, useEffect, useRef, useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Animated,
  Pressable,
  RefreshControl,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Dumbbell,
  Flame,
  TrendingUp,
  Footprints,
  UtensilsCrossed,
  Award,
  Target,
  Timer,
  Crown,
  Globe,
  CheckCircle,
} from "lucide-react-native";
import { useApp } from "@/providers/AppProvider";
import { useRouter } from "expo-router";
import { useLanguage } from "@/providers/LanguageProvider";

function TopBar() {
  const { stats, todaysRuns, todaysWorkouts } = useApp();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const totalStreak = stats.runStreak + stats.foodStreak + stats.workoutStreak;

  return (
    <View style={[topBarStyles.container, { paddingTop: insets.top + 12 }]}>
      <View style={topBarStyles.left}>
        <Flame size={20} color={totalStreak > 0 ? "#F59E0B" : "#4B5563"} fill={totalStreak > 0 ? "#F59E0B" : "none"} />
        <Text style={topBarStyles.title}>{t('tab_home') === 'Inicio' ? 'Hoy' : 'Today'}</Text>
      </View>
      <View style={topBarStyles.badges}>
        <View style={topBarStyles.badge}>
          <View style={[topBarStyles.badgeIcon, { backgroundColor: "rgba(0,229,255,0.12)" }]}>
            <Footprints size={13} color="#00E5FF" />
          </View>
          <Text style={topBarStyles.badgeCount}>{todaysRuns.length}</Text>
        </View>
        <View style={topBarStyles.badge}>
          <View style={[topBarStyles.badgeIcon, { backgroundColor: "rgba(255,107,53,0.12)" }]}>
            <UtensilsCrossed size={13} color="#FF6B35" />
          </View>
          <Text style={topBarStyles.badgeCount}>{stats.foodStreak}</Text>
        </View>
        <View style={topBarStyles.badge}>
          <View style={[topBarStyles.badgeIcon, { backgroundColor: "rgba(139,92,246,0.12)" }]}>
            <Dumbbell size={13} color="#8B5CF6" />
          </View>
          <Text style={topBarStyles.badgeCount}>{todaysWorkouts.length}</Text>
        </View>
      </View>
    </View>
  );
}

function DailyQuests() {
  const { nutrition, todaysRuns, todaysWorkouts } = useApp();
  const { t } = useLanguage();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }).start();
  }, [fadeIn]);

  const calProgress = nutrition.calorieGoal > 0 ? Math.min(nutrition.calories / nutrition.calorieGoal, 1) : 0;
  const proteinProgress = nutrition.proteinGoal > 0 ? Math.min(nutrition.protein / nutrition.proteinGoal, 1) : 0;

  const quests = useMemo(() => [
    {
      id: "run",
      label: t('home_complete_run'),
      xp: "+25 XP",
      icon: <Footprints size={18} color="#00E5FF" />,
      bgColor: "rgba(0,229,255,0.15)",
      color: "#00E5FF",
      done: todaysRuns.length > 0,
      progress: todaysRuns.length > 0 ? 1 : 0,
    },
    {
      id: "lift",
      label: t('home_finish_workout'),
      xp: "+75 XP",
      icon: <Dumbbell size={18} color="#8B5CF6" />,
      bgColor: "rgba(139,92,246,0.15)",
      color: "#8B5CF6",
      done: todaysWorkouts.length > 0,
      progress: todaysWorkouts.length > 0 ? 1 : 0,
    },
    {
      id: "cal",
      label: t('home_hit_calorie'),
      xp: "+50 XP",
      icon: <Target size={18} color="#F59E0B" />,
      bgColor: "rgba(245,158,11,0.15)",
      color: "#F59E0B",
      done: calProgress >= 0.95,
      progress: calProgress,
    },
    {
      id: "protein",
      label: t('home_hit_protein'),
      xp: "+30 XP",
      icon: <Award size={18} color="#EF4444" />,
      bgColor: "rgba(239,68,68,0.15)",
      color: "#EF4444",
      done: proteinProgress >= 0.95,
      progress: proteinProgress,
    },
  ], [todaysRuns.length, todaysWorkouts.length, calProgress, proteinProgress, t]);

  const completedCount = quests.filter(q => q.done).length;

  return (
    <Animated.View style={[questStyles.container, { opacity: fadeIn }]}>
      <View style={questStyles.header}>
        <View style={questStyles.headerLeft}>
          <Crown size={16} color="#F59E0B" />
          <Text style={questStyles.heading}>{t('home_daily_quests')}</Text>
        </View>
        <View style={questStyles.completedBadge}>
          <Text style={questStyles.completedText}>{completedCount}/{quests.length}</Text>
        </View>
      </View>
      {quests.map((quest) => (
        <View key={quest.id} style={questStyles.row}>
          {quest.done ? (
            <View style={[questStyles.checkWrap, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
              <CheckCircle size={20} color="#10B981" />
            </View>
          ) : (
            <View style={[questStyles.iconWrap, { backgroundColor: quest.bgColor }]}>
              {quest.icon}
            </View>
          )}
          <View style={questStyles.info}>
            <Text style={[questStyles.questLabel, quest.done && questStyles.questDone]}>{quest.label}</Text>
            <View style={questStyles.questTrack}>
              <View style={[questStyles.questFill, { width: `${quest.progress * 100}%`, backgroundColor: quest.done ? "#10B981" : quest.color }]} />
            </View>
          </View>
          <Text style={[questStyles.xpTag, { color: quest.done ? "#10B981" : "#4B5563" }]}>{quest.xp}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

function TodayNutrition() {
  const { nutrition } = useApp();
  const router = useRouter();
  const { t } = useLanguage();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const calPct = nutrition.calorieGoal > 0 ? Math.min(nutrition.calories / nutrition.calorieGoal, 1) : 0;
  const calRemaining = Math.max(nutrition.calorieGoal - nutrition.calories, 0);
  const isGoalHit = calPct >= 0.95;

  const dialSize = 150;
  const stroke = 8;
  const r = (dialSize - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - calPct);

  const macros = [
    { label: t('home_protein'), value: nutrition.protein, goal: nutrition.proteinGoal, color: "#00E5FF", short: "P" },
    { label: t('home_carbs'), value: nutrition.carbs, goal: nutrition.carbsGoal, color: "#BFFF00", short: "C" },
    { label: t('home_fat'), value: nutrition.fat, goal: nutrition.fatGoal, color: "#F59E0B", short: "F" },
  ];

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 10 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start();
  }, [scaleAnim]);

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/nutrition")}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[nutStyles.card, { transform: [{ scale: scaleAnim }] }]}>
        <View style={nutStyles.cardHeader}>
          <View style={nutStyles.headerLeft}>
            <UtensilsCrossed size={16} color="#FF6B35" />
            <Text style={nutStyles.heading}>{t('home_todays_fuel')}</Text>
          </View>
          <Text style={[nutStyles.headerKcal, { color: isGoalHit ? "#10B981" : "#10B981" }]}>
            {isGoalHit ? t('home_goal_reached') : `${calRemaining.toLocaleString()} kcal left`}
          </Text>
        </View>

        <View style={nutStyles.body}>
          <View style={nutStyles.dialArea}>
            <Svg width={dialSize} height={dialSize}>
              <Defs>
                <SvgGradient id="fuelRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={isGoalHit ? "#10B981" : "#6B7280"} stopOpacity="1" />
                  <Stop offset="1" stopColor={isGoalHit ? "#34D399" : "#4B5563"} stopOpacity="0.6" />
                </SvgGradient>
              </Defs>
              <Circle cx={dialSize / 2} cy={dialSize / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
              <Circle
                cx={dialSize / 2} cy={dialSize / 2} r={r}
                stroke="url(#fuelRingGrad)" strokeWidth={stroke} fill="none"
                strokeDasharray={`${circ}`} strokeDashoffset={offset}
                strokeLinecap="round" transform={`rotate(-90 ${dialSize / 2} ${dialSize / 2})`}
              />
            </Svg>
            <View style={nutStyles.dialInner}>
              <Text style={nutStyles.calNum}>{nutrition.calories}</Text>
              <Text style={nutStyles.calDivider}>of {nutrition.calorieGoal.toLocaleString()}</Text>
              <Text style={nutStyles.calUnit}>kcal</Text>
            </View>
          </View>
        </View>

        <View style={nutStyles.macroSection}>
          {macros.map((m) => {
            const pct = m.goal > 0 ? Math.min(m.value / m.goal, 1) : 0;
            return (
              <View key={m.short} style={nutStyles.macroCard}>
                <View style={nutStyles.macroTop}>
                  <View style={[nutStyles.macroDot, { backgroundColor: m.color }]} />
                  <Text style={nutStyles.macroLabel}>{m.label}</Text>
                </View>
                <View style={nutStyles.macroValues}>
                  <Text style={nutStyles.macroVal}>{m.value}</Text>
                  <Text style={nutStyles.macroGoalText}>/ {m.goal}g</Text>
                </View>
                <View style={nutStyles.macroTrack}>
                  <View style={[nutStyles.macroFill, { width: `${pct * 100}%`, backgroundColor: m.color + "80" }]} />
                </View>
              </View>
            );
          })}
        </View>
      </Animated.View>
    </Pressable>
  );
}

function WeeklyStats() {
  const { stats } = useApp();
  const { t } = useLanguage();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }).start();
  }, [fadeIn]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const items = [
    { value: stats.weeklyMiles.toFixed(1), unit: "mi", label: t('home_distance'), color: "#00E5FF", icon: <Footprints size={20} color="#00E5FF" /> },
    { value: `${stats.weeklyRuns}`, unit: "", label: t('home_runs'), color: "#BFFF00", icon: <Flame size={20} color="#FF6B35" /> },
    { value: formatTime(stats.weeklyTime), unit: "", label: t('home_active_time'), color: "#FF6B35", icon: <Timer size={20} color="#F59E0B" /> },
    { value: `${stats.weeklyWorkouts}`, unit: "", label: t('home_workouts'), color: "#8B5CF6", icon: <Dumbbell size={20} color="#8B5CF6" /> },
  ];

  return (
    <Animated.View style={[weekStyles.container, { opacity: fadeIn }]}>
      <View style={weekStyles.headerRow}>
        <TrendingUp size={16} color="#9CA3AF" />
        <Text style={weekStyles.heading}>{t('home_this_week')}</Text>
      </View>
      <View style={weekStyles.grid}>
        {items.map((item) => (
          <View key={item.label} style={weekStyles.cell}>
            <View style={[weekStyles.cellIcon, { backgroundColor: item.color + "14" }]}>
              {item.icon}
            </View>
            <Text style={[weekStyles.cellLabel, { color: item.color }]}>{item.label.toUpperCase()}</Text>
            <Text style={weekStyles.cellValue}>
              {item.value}
              {item.unit ? <Text style={weekStyles.cellUnit}> {item.unit}</Text> : null}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const { setLanguage, isSpanish } = useLanguage();
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  return (
    <View style={styles.container}>
      <TopBar />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00E5FF"
            colors={["#00E5FF"]}
            progressBackgroundColor="#1A1D24"
          />
        }
      >
        <DailyQuests />
        <TodayNutrition />
        <WeeklyStats />
        <Pressable
          onPress={() => setLanguage(isSpanish ? 'en' : 'es')}
          style={styles.langToggle}
        >
          <Globe size={13} color="#374151" />
          <Text style={styles.langToggleText}>{isSpanish ? 'English' : 'Español'}</Text>
        </Pressable>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08090C",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 12,
  },
  langToggle: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignSelf: "center" as const,
    marginTop: 4,
  },
  langToggleText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#374151",
    letterSpacing: 0.2,
  },
});

const topBarStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "#08090C",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  left: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -0.5,
  },
  badges: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  badge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  badgeCount: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: "#D1D5DB",
    letterSpacing: -0.3,
  },
});

const questStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0E1015",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  heading: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#E5E7EB",
    letterSpacing: -0.3,
  },
  completedBadge: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completedText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: "#9CA3AF",
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingVertical: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  checkWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  info: {
    flex: 1,
    gap: 6,
  },
  questLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#D1D5DB",
  },
  questDone: {
    color: "#6B7280",
    textDecorationLine: "line-through" as const,
  },
  questTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  questFill: {
    height: "100%" as const,
    borderRadius: 2,
  },
  xpTag: {
    fontSize: 13,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
});

const nutStyles = StyleSheet.create({
  card: {
    backgroundColor: "#0E1015",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  heading: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -0.3,
  },
  headerKcal: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
  body: {
    alignItems: "center" as const,
    marginBottom: 20,
  },
  dialArea: {
    width: 150,
    height: 150,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dialInner: {
    position: "absolute" as const,
    alignItems: "center" as const,
  },
  calNum: {
    fontSize: 32,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: -1,
    lineHeight: 36,
  },
  calDivider: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#4B5563",
    marginTop: 2,
  },
  calUnit: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#6B7280",
    marginTop: -1,
  },
  macroSection: {
    flexDirection: "row" as const,
    gap: 8,
  },
  macroCard: {
    flex: 1,
    gap: 8,
  },
  macroTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  macroValues: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    gap: 3,
  },
  macroVal: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: "#E5E7EB",
    letterSpacing: -0.5,
  },
  macroGoalText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#4B5563",
  },
  macroTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  macroFill: {
    height: "100%" as const,
    borderRadius: 2,
  },
});

const weekStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0E1015",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 16,
  },
  heading: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#E5E7EB",
    letterSpacing: -0.3,
  },
  grid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
  },
  cell: {
    width: "47%" as unknown as number,
    flexGrow: 1,
    flexBasis: "44%" as unknown as number,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 16,
    overflow: "hidden" as const,
    minHeight: 110,
    gap: 6,
  },
  cellIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 4,
  },
  cellValue: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -1,
  },
  cellUnit: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
});
