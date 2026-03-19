import React, { useMemo, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Animated,
  Pressable,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Dumbbell,
  Flame,
  Zap,
  TrendingUp,
  Footprints,
  UtensilsCrossed,
  Award,
} from "lucide-react-native";
import { useApp } from "@/providers/AppProvider";
import { useRouter } from "expo-router";
import { RANKS } from "@/constants/xp";



function HeroSection() {
  const { xpInfo } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideUp]);

  const xpRemaining = xpInfo.neededXP - xpInfo.currentXP;
  const currentIdx = RANKS.findIndex(r => r.title === xpInfo.rank.title);
  const nextRank = currentIdx < RANKS.length - 1 ? RANKS[currentIdx + 1] : null;

  const ringSize = 130;
  const ringStroke = 8;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(Math.max(xpInfo.progress, 0), 1));

  return (
    <Animated.View style={[heroStyles.container, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <View style={heroStyles.topRow}>
        <View style={heroStyles.totalXpBadge}>
          <Zap size={11} color={xpInfo.rank.color} />
          <Text style={[heroStyles.totalXpText, { color: xpInfo.rank.color }]}>{xpInfo.totalXP.toLocaleString()} XP</Text>
        </View>
      </View>

      <View style={heroStyles.centerBlock}>
        <View style={heroStyles.ringArea}>
          <Svg width={ringSize} height={ringSize}>
            <Defs>
              <SvgGradient id="heroRing" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={xpInfo.rank.color} stopOpacity="1" />
                <Stop offset="1" stopColor={xpInfo.rank.color} stopOpacity="0.4" />
              </SvgGradient>
            </Defs>
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringRadius}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={ringStroke}
              fill="none"
            />
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringRadius}
              stroke="url(#heroRing)"
              strokeWidth={ringStroke}
              fill="none"
              strokeDasharray={`${ringCircumference}`}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            />
          </Svg>
          <View style={heroStyles.ringInner}>
            <Text style={[heroStyles.levelNum, { color: xpInfo.rank.color }]}>{xpInfo.level}</Text>
            <Text style={heroStyles.levelLabel}>LEVEL</Text>
          </View>
        </View>

        <View style={heroStyles.infoBlock}>
          <View style={heroStyles.rankRow}>
            <Text style={heroStyles.rankEmoji}>{xpInfo.rank.emoji}</Text>
            <Text style={[heroStyles.rankTitle, { color: xpInfo.rank.color }]}>{xpInfo.rank.title}</Text>
          </View>

          <View style={heroStyles.xpBarOuter}>
            <View style={[heroStyles.xpBarFill, { width: `${xpInfo.progress * 100}%`, backgroundColor: xpInfo.rank.color }]} />
          </View>
          <Text style={heroStyles.xpText}>
            <Text style={{ color: "#D1D5DB", fontWeight: "700" as const }}>{xpInfo.currentXP}</Text>
            <Text style={{ color: "#4B5563" }}> / {xpInfo.neededXP} XP</Text>
          </Text>
          <Text style={[heroStyles.xpRemaining, { color: xpInfo.rank.color + "CC" }]}>{xpRemaining} XP to level {xpInfo.level + 1}</Text>

          {nextRank && (
            <View style={heroStyles.nextRankRow}>
              <Text style={heroStyles.nextRankLabel}>Next rank</Text>
              <Text style={heroStyles.nextRankEmoji}>{nextRank.emoji}</Text>
              <Text style={[heroStyles.nextRankName, { color: nextRank.color }]}>{nextRank.title}</Text>
              <Text style={heroStyles.nextRankLevel}>Lv {nextRank.minLevel}</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

function StreakStrip() {
  const { stats } = useApp();
  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enterAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }).start();
  }, [enterAnim]);

  const streaks = [
    { label: "Run", value: stats.runStreak, color: "#00E5FF", active: stats.runStreak > 0 },
    { label: "Food", value: stats.foodStreak, color: "#BFFF00", active: stats.foodStreak > 0 },
    { label: "Gym", value: stats.workoutStreak, color: "#FF6B35", active: stats.workoutStreak > 0 },
  ];

  const anyActive = streaks.some(s => s.active);

  return (
    <Animated.View style={[streakStyles.strip, { opacity: enterAnim }]}>
      <Flame size={16} color={anyActive ? "#F59E0B" : "#2A2E35"} fill={anyActive ? "#F59E0B" : "none"} strokeWidth={2.5} />
      <View style={streakStyles.items}>
        {streaks.map((s) => (
          <View key={s.label} style={streakStyles.item}>
            <View style={[streakStyles.dot, { backgroundColor: s.active ? s.color : "#1E2128" }]} />
            <Text style={[streakStyles.val, s.active && { color: "#F3F4F6" }]}>{s.value}</Text>
            <Text style={streakStyles.lbl}>{s.label}</Text>
          </View>
        ))}
      </View>
      {anyActive && (
        <View style={streakStyles.bonusTag}>
          <Text style={streakStyles.bonusText}>Streak active</Text>
        </View>
      )}
    </Animated.View>
  );
}

function TodayNutrition() {
  const { nutrition } = useApp();
  const router = useRouter();

  const calPct = nutrition.calorieGoal > 0 ? Math.min(nutrition.calories / nutrition.calorieGoal, 1) : 0;

  const dialSize = 80;
  const stroke = 5;
  const r = (dialSize - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - calPct);

  const macros = [
    { label: "P", value: nutrition.protein, goal: nutrition.proteinGoal, color: "#00E5FF" },
    { label: "C", value: nutrition.carbs, goal: nutrition.carbsGoal, color: "#BFFF00" },
    { label: "F", value: nutrition.fat, goal: nutrition.fatGoal, color: "#F59E0B" },
  ];

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/nutrition")}
      style={({ pressed }) => [nutStyles.card, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
    >
      <View style={nutStyles.left}>
        <Svg width={dialSize} height={dialSize}>
          <Circle cx={dialSize / 2} cy={dialSize / 2} r={r} stroke="rgba(255,107,53,0.1)" strokeWidth={stroke} fill="none" />
          <Circle
            cx={dialSize / 2} cy={dialSize / 2} r={r}
            stroke="#FF6B35" strokeWidth={stroke} fill="none"
            strokeDasharray={`${circ}`} strokeDashoffset={offset}
            strokeLinecap="round" transform={`rotate(-90 ${dialSize / 2} ${dialSize / 2})`}
          />
        </Svg>
        <View style={nutStyles.dialInner}>
          <Text style={nutStyles.calNum}>{nutrition.calories}</Text>
          <Text style={nutStyles.calUnit}>cal</Text>
        </View>
      </View>

      <View style={nutStyles.right}>
        <Text style={nutStyles.heading}>Today's Fuel</Text>
        <View style={nutStyles.macroRow}>
          {macros.map((m) => {
            const pct = m.goal > 0 ? Math.min(m.value / m.goal, 1) : 0;
            return (
              <View key={m.label} style={nutStyles.macroItem}>
                <View style={nutStyles.macroHeader}>
                  <View style={[nutStyles.macroDot, { backgroundColor: m.color }]} />
                  <Text style={nutStyles.macroLabel}>{m.label}</Text>
                </View>
                <Text style={nutStyles.macroVal}>{m.value}<Text style={nutStyles.macroGoal}>/{m.goal}</Text></Text>
                <View style={nutStyles.macroTrack}>
                  <View style={[nutStyles.macroFill, { width: `${pct * 100}%`, backgroundColor: m.color }]} />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}

function WeeklyStats() {
  const { stats } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 350, useNativeDriver: true }).start();
  }, [fadeIn]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const items = [
    { value: stats.weeklyMiles.toFixed(1), unit: "mi", label: "Distance", color: "#00E5FF" },
    { value: `${stats.weeklyRuns}`, unit: "", label: "Runs", color: "#BFFF00" },
    { value: formatTime(stats.weeklyTime), unit: "", label: "Active", color: "#FF6B35" },
    { value: `${stats.weeklyWorkouts}`, unit: "", label: "Lifts", color: "#00ADB5" },
  ];

  return (
    <Animated.View style={[weekStyles.container, { opacity: fadeIn }]}>
      <Text style={weekStyles.heading}>This week</Text>
      <View style={weekStyles.grid}>
        {items.map((item) => (
          <View key={item.label} style={weekStyles.cell}>
            <Text style={weekStyles.cellValue}>
              {item.value}
              {item.unit ? <Text style={[weekStyles.cellUnit, { color: item.color }]}> {item.unit}</Text> : null}
            </Text>
            <Text style={weekStyles.cellLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

function RankProgress() {
  const { xpInfo } = useApp();

  const currentIdx = RANKS.findIndex(r => r.title === xpInfo.rank.title);
  const nextRank = currentIdx < RANKS.length - 1 ? RANKS[currentIdx + 1] : null;

  if (!nextRank) return null;

  const totalForCurrent = currentIdx > 0 ? RANKS[currentIdx].minLevel : 1;
  const totalForNext = nextRank.minLevel;
  const progress = Math.min((xpInfo.level - totalForCurrent) / (totalForNext - totalForCurrent), 1);

  return (
    <View style={rankStyles.card}>
      <View style={rankStyles.row}>
        <View style={rankStyles.current}>
          <Text style={rankStyles.emoji}>{xpInfo.rank.emoji}</Text>
          <Text style={[rankStyles.name, { color: xpInfo.rank.color }]}>{xpInfo.rank.title}</Text>
        </View>
        <View style={rankStyles.trackWrap}>
          <View style={rankStyles.track}>
            <View style={[rankStyles.fill, { width: `${progress * 100}%`, backgroundColor: nextRank.color }]} />
          </View>
        </View>
        <View style={rankStyles.next}>
          <Text style={rankStyles.emoji}>{nextRank.emoji}</Text>
          <Text style={[rankStyles.name, { color: nextRank.color }]}>{nextRank.title}</Text>
        </View>
      </View>
      <Text style={rankStyles.hint}>Level {nextRank.minLevel} to rank up</Text>
    </View>
  );
}

function XPFeed() {
  const { xpInfo } = useApp();

  const recentEvents = useMemo(() => {
    return xpInfo.xpEvents.slice(-4).reverse();
  }, [xpInfo.xpEvents]);

  if (recentEvents.length === 0) return null;

  const getIcon = (source: string) => {
    switch (source) {
      case "run": return <Footprints size={13} color="#00E5FF" />;
      case "workout": return <Dumbbell size={13} color="#FF6B35" />;
      case "food": return <UtensilsCrossed size={13} color="#BFFF00" />;
      case "nutrition_goal": return <Award size={13} color="#F59E0B" />;
      case "streak": return <Flame size={13} color="#F59E0B" />;
      default: return <Zap size={13} color="#9CA3AF" />;
    }
  };

  const getColor = (source: string) => {
    switch (source) {
      case "run": return "#00E5FF";
      case "workout": return "#FF6B35";
      case "food": return "#BFFF00";
      case "nutrition_goal": return "#F59E0B";
      case "streak": return "#F59E0B";
      default: return "#9CA3AF";
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <View style={feedStyles.container}>
      <View style={feedStyles.header}>
        <TrendingUp size={14} color="#6B7280" />
        <Text style={feedStyles.heading}>Recent XP</Text>
        <Text style={feedStyles.total}>{xpInfo.totalXP.toLocaleString()} total</Text>
      </View>
      {recentEvents.map((event, index) => (
        <View key={event.id} style={[feedStyles.row, index === recentEvents.length - 1 && { borderBottomWidth: 0 }]}>
          <View style={[feedStyles.iconDot, { backgroundColor: getColor(event.source) + "15" }]}>
            {getIcon(event.source)}
          </View>
          <Text style={feedStyles.desc} numberOfLines={1}>{event.description}</Text>
          <Text style={feedStyles.time}>{timeAgo(event.date)}</Text>
          <Text style={[feedStyles.amount, { color: getColor(event.source) }]}>+{event.amount}</Text>
        </View>
      ))}
    </View>
  );
}

function useGreeting() {
  return useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return "Night owl mode 🦉";
    if (hour < 12) return "Good morning 🌅";
    if (hour < 17) return "Good afternoon ☀️";
    if (hour < 21) return "Good evening 🌙";
    return "Night owl mode 🦉";
  }, []);
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const greeting = useGreeting();
  const { xpInfo } = useApp();

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.greetingText}>{greeting}</Text>
        <View style={styles.topBarRight}>
          <View style={[styles.levelPill, { borderColor: xpInfo.rank.color + '40' }]}>
            <Text style={[styles.levelPillText, { color: xpInfo.rank.color }]}>Lv {xpInfo.level}</Text>
          </View>
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <HeroSection />
        <StreakStrip />
        <RankProgress />
        <TodayNutrition />
        <WeeklyStats />
        <XPFeed />
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0C10",
  },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "#0A0C10",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -0.6,
  },
  topBarRight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  levelPill: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  levelPillText: {
    fontSize: 13,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 12,
  },
});

const heroStyles = StyleSheet.create({
  container: {
    backgroundColor: "#111318",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  topRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    marginBottom: 16,
  },
  totalXpBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  totalXpText: {
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  centerBlock: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 20,
  },
  ringArea: {
    width: 130,
    height: 130,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ringInner: {
    position: "absolute" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  levelNum: {
    fontSize: 44,
    fontWeight: "900" as const,
    letterSpacing: -2,
  },
  levelLabel: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: "#4B5563",
    letterSpacing: 2,
    marginTop: -2,
  },
  infoBlock: {
    flex: 1,
    gap: 8,
  },
  rankRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
  },
  rankEmoji: {
    fontSize: 22,
  },
  rankTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    letterSpacing: -0.8,
  },
  xpBarOuter: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden" as const,
  },
  xpBarFill: {
    height: "100%" as const,
    borderRadius: 3,
  },
  xpText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#4B5563",
  },
  xpRemaining: {
    fontSize: 13,
    fontWeight: "700" as const,
    marginTop: -2,
  },
  nextRankRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nextRankLabel: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#374151",
  },
  nextRankEmoji: {
    fontSize: 13,
  },
  nextRankName: {
    fontSize: 11,
    fontWeight: "700" as const,
    flex: 1,
  },
  nextRankLevel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#374151",
  },
});

const streakStyles = StyleSheet.create({
  strip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#111318",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  items: {
    flex: 1,
    flexDirection: "row" as const,
    gap: 16,
  },
  item: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  val: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#374151",
    letterSpacing: -0.5,
  },
  lbl: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#4B5563",
  },
  bonusTag: {
    backgroundColor: "rgba(245,158,11,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bonusText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#F59E0B",
  },
});

const nutStyles = StyleSheet.create({
  card: {
    backgroundColor: "#111318",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  left: {
    width: 80,
    height: 80,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dialInner: {
    position: "absolute" as const,
    alignItems: "center" as const,
  },
  calNum: {
    fontSize: 19,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  calUnit: {
    fontSize: 9,
    fontWeight: "500" as const,
    color: "#6B7280",
    marginTop: -2,
  },
  right: {
    flex: 1,
    gap: 10,
  },
  heading: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#9CA3AF",
  },
  macroRow: {
    flexDirection: "row" as const,
    gap: 12,
  },
  macroItem: {
    flex: 1,
    gap: 4,
  },
  macroHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  macroDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  macroVal: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#E5E7EB",
  },
  macroGoal: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#374151",
  },
  macroTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
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
    backgroundColor: "#111318",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  heading: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "space-between" as const,
  },
  cell: {
    width: "25%" as const,
    alignItems: "center" as const,
    gap: 3,
    paddingVertical: 4,
  },
  cellValue: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -0.5,
  },
  cellUnit: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  cellLabel: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#4B5563",
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
});

const rankStyles = StyleSheet.create({
  card: {
    backgroundColor: "#0F1114",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  current: {
    alignItems: "center" as const,
    gap: 2,
  },
  next: {
    alignItems: "center" as const,
    gap: 2,
  },
  emoji: {
    fontSize: 20,
  },
  name: {
    fontSize: 9,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  trackWrap: {
    flex: 1,
  },
  track: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  fill: {
    height: "100%" as const,
    borderRadius: 2,
  },
  hint: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#374151",
    textAlign: "center" as const,
    marginTop: 8,
  },
});

const feedStyles = StyleSheet.create({
  container: {
    backgroundColor: "#111318",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 12,
  },
  heading: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
    flex: 1,
  },
  total: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#374151",
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  iconDot: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  desc: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#9CA3AF",
  },
  time: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#2A2E35",
    marginRight: 4,
  },
  amount: {
    fontSize: 14,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
});
