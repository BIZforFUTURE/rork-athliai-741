import React, { useMemo, useEffect, useRef, useCallback } from "react";
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
  ChevronRight,
  Timer,
  Target,
} from "lucide-react-native";
import { useApp } from "@/providers/AppProvider";
import { useRouter } from "expo-router";
import { RANKS } from "@/constants/xp";

function useGreeting() {
  return useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return "Night owl mode";
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Night owl mode";
  }, []);
}

function HeroSection() {
  const { xpInfo } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
      Animated.timing(ringAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
    ]).start();
  }, [fadeIn, slideUp, ringAnim]);

  const xpRemaining = xpInfo.neededXP - xpInfo.currentXP;
  const currentIdx = RANKS.findIndex(r => r.title === xpInfo.rank.title);
  const nextRank = currentIdx < RANKS.length - 1 ? RANKS[currentIdx + 1] : null;

  const ringSize = 140;
  const ringStroke = 10;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(Math.max(xpInfo.progress, 0), 1));

  return (
    <Animated.View style={[heroStyles.container, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <View style={heroStyles.centerBlock}>
        <View style={heroStyles.ringArea}>
          <Svg width={ringSize} height={ringSize}>
            <Defs>
              <SvgGradient id="heroRing" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={xpInfo.rank.color} stopOpacity="1" />
                <Stop offset="1" stopColor={xpInfo.rank.color} stopOpacity="0.35" />
              </SvgGradient>
            </Defs>
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringRadius}
              stroke="rgba(255,255,255,0.04)"
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
            <View>
              <Text style={[heroStyles.rankTitle, { color: xpInfo.rank.color }]}>{xpInfo.rank.title}</Text>
              <View style={heroStyles.totalXpBadge}>
                <Zap size={10} color={xpInfo.rank.color} />
                <Text style={[heroStyles.totalXpText, { color: xpInfo.rank.color + 'CC' }]}>{xpInfo.totalXP.toLocaleString()} XP total</Text>
              </View>
            </View>
          </View>

          <View style={heroStyles.xpSection}>
            <View style={heroStyles.xpBarOuter}>
              <Animated.View style={[heroStyles.xpBarFill, { width: `${xpInfo.progress * 100}%`, backgroundColor: xpInfo.rank.color }]} />
            </View>
            <View style={heroStyles.xpRow}>
              <Text style={heroStyles.xpCurrent}>{xpInfo.currentXP}<Text style={heroStyles.xpOf}> / {xpInfo.neededXP}</Text></Text>
              <Text style={[heroStyles.xpRemaining, { color: xpInfo.rank.color }]}>{xpRemaining} to go</Text>
            </View>
          </View>

          {nextRank && (
            <View style={[heroStyles.nextRankRow, { backgroundColor: nextRank.color + '0A', borderColor: nextRank.color + '15' }]}>
              <Text style={heroStyles.nextRankLabel}>Next</Text>
              <Text style={heroStyles.nextRankEmoji}>{nextRank.emoji}</Text>
              <Text style={[heroStyles.nextRankName, { color: nextRank.color }]}>{nextRank.title}</Text>
              <Text style={[heroStyles.nextRankLevel, { color: nextRank.color + '80' }]}>Lv {nextRank.minLevel}</Text>
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
    Animated.timing(enterAnim, { toValue: 1, duration: 500, delay: 180, useNativeDriver: true }).start();
  }, [enterAnim]);

  const streaks = [
    { label: "Run", value: stats.runStreak, color: "#00E5FF", icon: <Footprints size={14} color="#00E5FF" /> },
    { label: "Eat", value: stats.foodStreak, color: "#BFFF00", icon: <UtensilsCrossed size={14} color="#BFFF00" /> },
    { label: "Lift", value: stats.workoutStreak, color: "#FF6B35", icon: <Dumbbell size={14} color="#FF6B35" /> },
  ];

  const totalStreak = stats.runStreak + stats.foodStreak + stats.workoutStreak;

  return (
    <Animated.View style={[streakStyles.strip, { opacity: enterAnim }]}>
      <View style={streakStyles.fireWrap}>
        <Flame size={18} color={totalStreak > 0 ? "#F59E0B" : "#2A2E35"} fill={totalStreak > 0 ? "#F59E0B" : "none"} strokeWidth={2.5} />
        {totalStreak > 0 && <Text style={streakStyles.fireCount}>{totalStreak}</Text>}
      </View>
      <View style={streakStyles.divider} />
      {streaks.map((s) => (
        <View key={s.label} style={streakStyles.item}>
          <View style={[streakStyles.iconCircle, { backgroundColor: s.value > 0 ? s.color + '15' : '#14161A' }]}>
            {s.icon}
          </View>
          <View>
            <Text style={[streakStyles.val, s.value > 0 && { color: "#F3F4F6" }]}>{s.value}<Text style={streakStyles.dayText}>d</Text></Text>
            <Text style={streakStyles.lbl}>{s.label}</Text>
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

function MacroRing({ value, goal, color, label }: { value: number; goal: number; color: string; label: string }) {
  const size = 44;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  const offset = circ * (1 - pct);

  return (
    <View style={nutStyles.macroCol}>
      <View style={{ width: size, height: size, alignItems: 'center' as const, justifyContent: 'center' as const }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color + '18'} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={color} strokeWidth={stroke} fill="none"
            strokeDasharray={`${circ}`} strokeDashoffset={offset}
            strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={nutStyles.macroIconWrap}>
          <Text style={[nutStyles.macroPct, { color }]}>{Math.round(pct * 100)}</Text>
        </View>
      </View>
      <Text style={nutStyles.macroValue}>{value}<Text style={{ color: color + '80', fontSize: 11, fontWeight: '500' as const }}>g</Text></Text>
      <Text style={nutStyles.macroLabel}>{label}</Text>
    </View>
  );
}

function TodayNutrition() {
  const { nutrition } = useApp();
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const calPct = nutrition.calorieGoal > 0 ? Math.min(nutrition.calories / nutrition.calorieGoal, 1) : 0;
  const calRemaining = Math.max(nutrition.calorieGoal - nutrition.calories, 0);

  const ringSize = 110;
  const ringStroke = 9;
  const ringR = (ringSize - ringStroke) / 2;
  const ringCirc = 2 * Math.PI * ringR;
  const ringOffset = ringCirc * (1 - calPct);

  const onPressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const onPressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/nutrition")}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[nutStyles.card, { transform: [{ scale: scaleAnim }] }]}>
        <View style={nutStyles.cardHeader}>
          <View style={nutStyles.sectionLabelRow}>
            <View style={nutStyles.sectionDot} />
            <Text style={nutStyles.sectionLabel}>Today's Fuel</Text>
          </View>
          <ChevronRight size={16} color="#2A2E35" />
        </View>

        <View style={nutStyles.topSection}>
          <View style={{ width: ringSize, height: ringSize, alignItems: 'center' as const, justifyContent: 'center' as const }}>
            <Svg width={ringSize} height={ringSize}>
              <Defs>
                <SvgGradient id="calRing" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#FF6B35" stopOpacity="1" />
                  <Stop offset="1" stopColor="#FF6B35" stopOpacity="0.3" />
                </SvgGradient>
              </Defs>
              <Circle cx={ringSize / 2} cy={ringSize / 2} r={ringR} stroke="rgba(255,107,53,0.08)" strokeWidth={ringStroke} fill="none" />
              <Circle
                cx={ringSize / 2} cy={ringSize / 2} r={ringR}
                stroke="url(#calRing)" strokeWidth={ringStroke} fill="none"
                strokeDasharray={`${ringCirc}`} strokeDashoffset={ringOffset}
                strokeLinecap="round" transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              />
            </Svg>
            <View style={nutStyles.ringCenter}>
              <Text style={nutStyles.calNum}>{nutrition.calories}</Text>
              <Text style={nutStyles.calUnit}>kcal</Text>
            </View>
          </View>

          <View style={nutStyles.goalInfo}>
            <Text style={nutStyles.remainingNum}>{calRemaining}</Text>
            <Text style={nutStyles.remainingLabel}>calories remaining</Text>
            <View style={nutStyles.goalPill}>
              <Target size={11} color="#FF6B35" />
              <Text style={nutStyles.goalPillText}>{nutrition.calorieGoal} goal</Text>
            </View>
          </View>
        </View>

        <View style={nutStyles.divider} />

        <View style={nutStyles.macroRow}>
          <MacroRing value={nutrition.protein} goal={nutrition.proteinGoal} color="#00B4D8" label="Protein" />
          <MacroRing value={nutrition.carbs} goal={nutrition.carbsGoal} color="#A3B826" label="Carbs" />
          <MacroRing value={nutrition.fat} goal={nutrition.fatGoal} color="#D4820A" label="Fat" />
        </View>
      </Animated.View>
    </Pressable>
  );
}

function WeeklyStats() {
  const { stats } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }).start();
  }, [fadeIn]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const items = [
    { value: stats.weeklyMiles.toFixed(1), unit: "mi", label: "Distance", color: "#00E5FF", icon: <Footprints size={15} color="#00E5FF" /> },
    { value: `${stats.weeklyRuns}`, unit: "", label: "Runs", color: "#BFFF00", icon: <TrendingUp size={15} color="#BFFF00" /> },
    { value: formatTime(stats.weeklyTime), unit: "", label: "Active", color: "#FF6B35", icon: <Timer size={15} color="#FF6B35" /> },
    { value: `${stats.weeklyWorkouts}`, unit: "", label: "Lifts", color: "#00ADB5", icon: <Dumbbell size={15} color="#00ADB5" /> },
  ];

  return (
    <Animated.View style={[weekStyles.container, { opacity: fadeIn }]}>
      <View style={weekStyles.headerRow}>
        <View style={nutStyles.sectionLabelRow}>
          <View style={[nutStyles.sectionDot, { backgroundColor: '#00E5FF' }]} />
          <Text style={weekStyles.heading}>This Week</Text>
        </View>
      </View>
      <View style={weekStyles.grid}>
        {items.map((item) => (
          <View key={item.label} style={weekStyles.cell}>
            <View style={[weekStyles.cellIcon, { backgroundColor: item.color + '10' }]}>
              {item.icon}
            </View>
            <View style={weekStyles.cellTextBlock}>
              <Text style={weekStyles.cellValue}>
                {item.value}
                {item.unit ? <Text style={[weekStyles.cellUnit, { color: item.color }]}> {item.unit}</Text> : null}
              </Text>
              <Text style={weekStyles.cellLabel}>{item.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

function XPFeed() {
  const { xpInfo } = useApp();

  const recentEvents = useMemo(() => {
    return xpInfo.xpEvents.slice(-5).reverse();
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
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <View style={feedStyles.container}>
      <View style={feedStyles.header}>
        <View style={nutStyles.sectionLabelRow}>
          <View style={[nutStyles.sectionDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={feedStyles.heading}>Recent XP</Text>
        </View>
        <View style={feedStyles.totalBadge}>
          <Zap size={10} color="#F59E0B" />
          <Text style={feedStyles.total}>{xpInfo.totalXP.toLocaleString()}</Text>
        </View>
      </View>
      {recentEvents.map((event, index) => (
        <View key={event.id} style={[feedStyles.row, index === recentEvents.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}>
          <View style={[feedStyles.iconDot, { backgroundColor: getColor(event.source) + '12' }]}>
            {getIcon(event.source)}
          </View>
          <View style={feedStyles.rowContent}>
            <Text style={feedStyles.desc} numberOfLines={1}>{event.description}</Text>
            <Text style={feedStyles.time}>{timeAgo(event.date)}</Text>
          </View>
          <Text style={[feedStyles.amount, { color: getColor(event.source) }]}>+{event.amount}</Text>
        </View>
      ))}
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const greeting = useGreeting();
  const { xpInfo } = useApp();

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.greetingText}>{greeting}</Text>
        </View>
        <View style={[styles.levelPill, { backgroundColor: xpInfo.rank.color + '12', borderColor: xpInfo.rank.color + '25' }]}>
          <Text style={[styles.levelPillEmoji]}>{xpInfo.rank.emoji}</Text>
          <Text style={[styles.levelPillText, { color: xpInfo.rank.color }]}>Lv {xpInfo.level}</Text>
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <HeroSection />
        <StreakStrip />
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
    paddingBottom: 10,
    backgroundColor: "#0A0C10",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  greetingText: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -0.8,
  },
  levelPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  levelPillEmoji: {
    fontSize: 14,
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
    gap: 10,
  },
});

const heroStyles = StyleSheet.create({
  container: {
    backgroundColor: "#111318",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  centerBlock: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 18,
  },
  ringArea: {
    width: 140,
    height: 140,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ringInner: {
    position: "absolute" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  levelNum: {
    fontSize: 48,
    fontWeight: "900" as const,
    letterSpacing: -3,
  },
  levelLabel: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: "#3B3F47",
    letterSpacing: 2.5,
    marginTop: -4,
  },
  infoBlock: {
    flex: 1,
    gap: 10,
  },
  rankRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  rankEmoji: {
    fontSize: 28,
  },
  rankTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    letterSpacing: -0.8,
  },
  totalXpBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    marginTop: 1,
  },
  totalXpText: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },
  xpSection: {
    gap: 5,
  },
  xpBarOuter: {
    height: 7,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 4,
    overflow: "hidden" as const,
  },
  xpBarFill: {
    height: "100%" as const,
    borderRadius: 4,
  },
  xpRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  xpCurrent: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#9CA3AF",
    letterSpacing: -0.2,
  },
  xpOf: {
    color: "#3B3F47",
    fontWeight: "500" as const,
  },
  xpRemaining: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
  nextRankRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  nextRankLabel: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#4B5563",
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
  },
});

const streakStyles = StyleSheet.create({
  strip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#111318",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  fireWrap: {
    alignItems: "center" as const,
    gap: 2,
  },
  fireCount: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: "#F59E0B",
    letterSpacing: -0.3,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  item: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  val: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: "#2A2E35",
    letterSpacing: -0.5,
  },
  dayText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#4B5563",
  },
  lbl: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#4B5563",
    marginTop: -1,
  },
});

const nutStyles = StyleSheet.create({
  card: {
    backgroundColor: "#111318",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 16,
  },
  sectionLabelRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  sectionDot: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: "#FF6B35",
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#E5E7EB",
    letterSpacing: -0.3,
  },
  topSection: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 18,
    paddingBottom: 18,
  },
  ringCenter: {
    position: "absolute" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  calNum: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  calUnit: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#4B5563",
    marginTop: -1,
  },
  goalInfo: {
    flex: 1,
    gap: 3,
  },
  remainingNum: {
    fontSize: 32,
    fontWeight: "900" as const,
    color: "#F3F4F6",
    letterSpacing: -1.5,
  },
  remainingLabel: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#4B5563",
    marginTop: -2,
  },
  goalPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(255,107,53,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start" as const,
    marginTop: 6,
  },
  goalPillText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#FF6B35",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  macroRow: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
    paddingTop: 16,
  },
  macroCol: {
    alignItems: "center" as const,
    gap: 3,
  },
  macroIconWrap: {
    position: "absolute" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  macroPct: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
  macroValue: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: "#E5E7EB",
    letterSpacing: -0.3,
    marginTop: 3,
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#6B7280",
    letterSpacing: 0.3,
  },
});

const weekStyles = StyleSheet.create({
  container: {
    backgroundColor: "#111318",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  headerRow: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#E5E7EB",
    letterSpacing: -0.3,
  },
  grid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
  },
  cell: {
    width: "47%" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cellIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cellTextBlock: {
    flex: 1,
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
    letterSpacing: 0.5,
    marginTop: 1,
  },
});

const feedStyles = StyleSheet.create({
  container: {
    backgroundColor: "#111318",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 14,
  },
  heading: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#E5E7EB",
    letterSpacing: -0.3,
  },
  totalBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    backgroundColor: "rgba(245,158,11,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  total: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#F59E0B",
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  iconDot: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  rowContent: {
    flex: 1,
  },
  desc: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#9CA3AF",
  },
  time: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#2A2E35",
    marginTop: 2,
  },
  amount: {
    fontSize: 14,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
});
