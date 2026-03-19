import React, { useMemo, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Animated,
  Pressable,
  Platform,
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
  Target,
  Timer,
  Route,
  Crown,
} from "lucide-react-native";
import { useApp } from "@/providers/AppProvider";
import { useRouter } from "expo-router";
import { RANKS } from "@/constants/xp";



function HeroSection() {
  const { xpInfo } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideUp, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }),
      ]),
      Animated.spring(ringAnim, { toValue: 1, tension: 40, friction: 10, useNativeDriver: false }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [fadeIn, slideUp, ringAnim, glowPulse]);

  const xpRemaining = xpInfo.neededXP - xpInfo.currentXP;
  const currentIdx = RANKS.findIndex(r => r.title === xpInfo.rank.title);
  const nextRank = currentIdx < RANKS.length - 1 ? RANKS[currentIdx + 1] : null;

  const ringSize = 160;
  const ringStroke = 10;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(Math.max(xpInfo.progress, 0), 1));

  const bgRingStroke = 3;

  return (
    <Animated.View style={[heroStyles.container, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <View style={heroStyles.centerBlock}>
        <Animated.View style={[heroStyles.ringGlow, { opacity: glowPulse, shadowColor: xpInfo.rank.color }]}>
          <View style={heroStyles.ringArea}>
            <Svg width={ringSize} height={ringSize}>
              <Defs>
                <SvgGradient id="heroRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={xpInfo.rank.color} stopOpacity="1" />
                  <Stop offset="0.5" stopColor={xpInfo.rank.color} stopOpacity="0.7" />
                  <Stop offset="1" stopColor={xpInfo.rank.color} stopOpacity="0.3" />
                </SvgGradient>
              </Defs>
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={bgRingStroke}
                fill="none"
              />
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                stroke="url(#heroRingGrad)"
                strokeWidth={ringStroke}
                fill="none"
                strokeDasharray={`${ringCircumference}`}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              />
            </Svg>
            <View style={heroStyles.ringInner}>
              <Text style={heroStyles.rankEmojiCenter}>{xpInfo.rank.emoji}</Text>
              <Text style={[heroStyles.levelNum, { color: xpInfo.rank.color }]}>{xpInfo.level}</Text>
              <Text style={heroStyles.levelLabel}>LEVEL</Text>
            </View>
          </View>
        </Animated.View>

        <View style={heroStyles.rankBadge}>
          <View style={[heroStyles.rankBadgeInner, { backgroundColor: xpInfo.rank.color + "18" }]}>
            <Text style={[heroStyles.rankTitle, { color: xpInfo.rank.color }]}>{xpInfo.rank.title}</Text>
          </View>
        </View>

        <View style={heroStyles.xpSection}>
          <View style={heroStyles.xpBarOuter}>
            <View style={heroStyles.xpBarTrack}>
              <View style={[heroStyles.xpBarFill, { width: `${xpInfo.progress * 100}%`, backgroundColor: xpInfo.rank.color }]} />
              <View style={[heroStyles.xpBarShine, { width: `${xpInfo.progress * 100}%` }]} />
            </View>
          </View>
          <View style={heroStyles.xpNumbers}>
            <View style={heroStyles.xpCurrent}>
              <Zap size={11} color={xpInfo.rank.color} />
              <Text style={heroStyles.xpCurrentText}>
                <Text style={{ color: "#E5E7EB", fontWeight: "800" as const }}>{xpInfo.currentXP}</Text>
                <Text style={{ color: "#4B5563" }}> / {xpInfo.neededXP}</Text>
              </Text>
            </View>
            <Text style={[heroStyles.xpRemaining, { color: xpInfo.rank.color + "BB" }]}>
              {xpRemaining} to go
            </Text>
          </View>
        </View>

        <View style={heroStyles.totalXpRow}>
          <View style={[heroStyles.totalXpPill, { borderColor: xpInfo.rank.color + "25" }]}>
            <Zap size={10} color={xpInfo.rank.color} fill={xpInfo.rank.color} />
            <Text style={[heroStyles.totalXpText, { color: xpInfo.rank.color }]}>{xpInfo.totalXP.toLocaleString()} Total XP</Text>
          </View>
          {nextRank && (
            <View style={[heroStyles.nextRankPill, { borderColor: nextRank.color + "20" }]}>
              <Text style={heroStyles.nextRankEmoji}>{nextRank.emoji}</Text>
              <Text style={[heroStyles.nextRankName, { color: nextRank.color + "CC" }]}>{nextRank.title}</Text>
              <Text style={heroStyles.nextRankAt}>Lv {nextRank.minLevel}</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

function DailyQuests() {
  const { stats, nutrition } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }).start();
  }, [fadeIn]);

  const calProgress = nutrition.calorieGoal > 0 ? Math.min(nutrition.calories / nutrition.calorieGoal, 1) : 0;
  const proteinProgress = nutrition.proteinGoal > 0 ? Math.min(nutrition.protein / nutrition.proteinGoal, 1) : 0;

  const quests = useMemo(() => [
    {
      id: "run",
      label: "Complete a run",
      xp: "+50 XP",
      icon: <Footprints size={16} color="#00E5FF" />,
      color: "#00E5FF",
      done: stats.weeklyRuns > 0,
      progress: stats.weeklyRuns > 0 ? 1 : 0,
    },
    {
      id: "lift",
      label: "Finish a workout",
      xp: "+75 XP",
      icon: <Dumbbell size={16} color="#FF6B35" />,
      color: "#FF6B35",
      done: stats.weeklyWorkouts > 0,
      progress: stats.weeklyWorkouts > 0 ? 1 : 0,
    },
    {
      id: "cal",
      label: "Hit calorie goal",
      xp: "+50 XP",
      icon: <Target size={16} color="#BFFF00" />,
      color: "#BFFF00",
      done: calProgress >= 0.95,
      progress: calProgress,
    },
    {
      id: "protein",
      label: "Hit protein goal",
      xp: "+30 XP",
      icon: <Award size={16} color="#F59E0B" />,
      color: "#F59E0B",
      done: proteinProgress >= 0.95,
      progress: proteinProgress,
    },
  ], [stats.weeklyRuns, stats.weeklyWorkouts, calProgress, proteinProgress]);

  const completedCount = quests.filter(q => q.done).length;

  return (
    <Animated.View style={[questStyles.container, { opacity: fadeIn }]}>
      <View style={questStyles.header}>
        <View style={questStyles.headerLeft}>
          <Crown size={14} color="#F59E0B" />
          <Text style={questStyles.heading}>Daily Quests</Text>
        </View>
        <View style={questStyles.completedBadge}>
          <Text style={questStyles.completedText}>{completedCount}/{quests.length}</Text>
        </View>
      </View>
      {quests.map((quest) => (
        <View key={quest.id} style={questStyles.row}>
          <View style={[questStyles.iconWrap, { backgroundColor: quest.color + "12" }]}>
            {quest.icon}
          </View>
          <View style={questStyles.info}>
            <Text style={[questStyles.questLabel, quest.done && questStyles.questDone]}>{quest.label}</Text>
            <View style={questStyles.questTrack}>
              <View style={[questStyles.questFill, { width: `${quest.progress * 100}%`, backgroundColor: quest.done ? quest.color : quest.color + "80" }]} />
            </View>
          </View>
          <Text style={[questStyles.xpTag, { color: quest.done ? quest.color : "#374151" }]}>{quest.xp}</Text>
          {quest.done && (
            <View style={[questStyles.checkMark, { backgroundColor: quest.color + "20" }]}>
              <Text style={{ fontSize: 10 }}>✓</Text>
            </View>
          )}
        </View>
      ))}
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
    { label: "Run", value: stats.runStreak, color: "#00E5FF", icon: <Footprints size={14} color={stats.runStreak > 0 ? "#00E5FF" : "#2A2E35"} /> },
    { label: "Food", value: stats.foodStreak, color: "#BFFF00", icon: <UtensilsCrossed size={14} color={stats.foodStreak > 0 ? "#BFFF00" : "#2A2E35"} /> },
    { label: "Gym", value: stats.workoutStreak, color: "#FF6B35", icon: <Dumbbell size={14} color={stats.workoutStreak > 0 ? "#FF6B35" : "#2A2E35"} /> },
  ];

  const totalStreak = streaks.reduce((a, s) => a + s.value, 0);

  return (
    <Animated.View style={[streakStyles.strip, { opacity: enterAnim }]}>
      <View style={streakStyles.flameWrap}>
        <Flame size={18} color={totalStreak > 0 ? "#F59E0B" : "#2A2E35"} fill={totalStreak > 0 ? "#F59E0B" : "none"} />
        {totalStreak > 0 && <View style={streakStyles.flameGlow} />}
      </View>
      <View style={streakStyles.items}>
        {streaks.map((s) => (
          <View key={s.label} style={[streakStyles.item, s.value > 0 && { backgroundColor: s.color + "08" }]}>
            {s.icon}
            <Text style={[streakStyles.val, s.value > 0 && { color: "#F3F4F6" }]}>{s.value}</Text>
            <Text style={[streakStyles.lbl, s.value > 0 && { color: s.color + "99" }]}>{s.label}</Text>
          </View>
        ))}
      </View>
      {totalStreak >= 3 && (
        <View style={streakStyles.bonusTag}>
          <Zap size={9} color="#F59E0B" fill="#F59E0B" />
          <Text style={streakStyles.bonusText}>+XP</Text>
        </View>
      )}
    </Animated.View>
  );
}

function TodayNutrition() {
  const { nutrition } = useApp();
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const calPct = nutrition.calorieGoal > 0 ? Math.min(nutrition.calories / nutrition.calorieGoal, 1) : 0;

  const dialSize = 72;
  const stroke = 5;
  const r = (dialSize - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - calPct);

  const macros = [
    { label: "Protein", value: nutrition.protein, goal: nutrition.proteinGoal, color: "#00E5FF", short: "P" },
    { label: "Carbs", value: nutrition.carbs, goal: nutrition.carbsGoal, color: "#BFFF00", short: "C" },
    { label: "Fat", value: nutrition.fat, goal: nutrition.fatGoal, color: "#F59E0B", short: "F" },
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
          <UtensilsCrossed size={13} color="#6B7280" />
          <Text style={nutStyles.heading}>Today's Fuel</Text>
          <ChevronRight size={14} color="#374151" />
        </View>
        <View style={nutStyles.body}>
          <View style={nutStyles.left}>
            <Svg width={dialSize} height={dialSize}>
              <Circle cx={dialSize / 2} cy={dialSize / 2} r={r} stroke="rgba(255,107,53,0.08)" strokeWidth={stroke} fill="none" />
              <Circle
                cx={dialSize / 2} cy={dialSize / 2} r={r}
                stroke={calPct >= 0.95 ? "#10B981" : "#FF6B35"} strokeWidth={stroke} fill="none"
                strokeDasharray={`${circ}`} strokeDashoffset={offset}
                strokeLinecap="round" transform={`rotate(-90 ${dialSize / 2} ${dialSize / 2})`}
              />
            </Svg>
            <View style={nutStyles.dialInner}>
              <Text style={nutStyles.calNum}>{nutrition.calories}</Text>
              <Text style={nutStyles.calUnit}>kcal</Text>
            </View>
          </View>

          <View style={nutStyles.right}>
            {macros.map((m) => {
              const pct = m.goal > 0 ? Math.min(m.value / m.goal, 1) : 0;
              return (
                <View key={m.short} style={nutStyles.macroRow}>
                  <View style={[nutStyles.macroDot, { backgroundColor: m.color }]} />
                  <Text style={nutStyles.macroLabel}>{m.short}</Text>
                  <View style={nutStyles.macroTrack}>
                    <View style={[nutStyles.macroFill, { width: `${pct * 100}%`, backgroundColor: m.color }]} />
                  </View>
                  <Text style={nutStyles.macroVal}>{m.value}<Text style={nutStyles.macroGoal}>g</Text></Text>
                </View>
              );
            })}
          </View>
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
    { value: stats.weeklyMiles.toFixed(1), unit: "mi", label: "Distance", color: "#00E5FF", icon: <Route size={14} color="#00E5FF" /> },
    { value: `${stats.weeklyRuns}`, unit: "", label: "Runs", color: "#BFFF00", icon: <Footprints size={14} color="#BFFF00" /> },
    { value: formatTime(stats.weeklyTime), unit: "", label: "Active", color: "#FF6B35", icon: <Timer size={14} color="#FF6B35" /> },
    { value: `${stats.weeklyWorkouts}`, unit: "", label: "Lifts", color: "#00ADB5", icon: <Dumbbell size={14} color="#00ADB5" /> },
  ];

  return (
    <Animated.View style={[weekStyles.container, { opacity: fadeIn }]}>
      <View style={weekStyles.headerRow}>
        <TrendingUp size={13} color="#6B7280" />
        <Text style={weekStyles.heading}>This Week</Text>
      </View>
      <View style={weekStyles.grid}>
        {items.map((item, idx) => (
          <View key={item.label} style={[weekStyles.cell, idx < 2 && weekStyles.cellBorder]}>
            <View style={[weekStyles.cellIcon, { backgroundColor: item.color + "10" }]}>
              {item.icon}
            </View>
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

function XPFeed() {
  const { xpInfo } = useApp();

  const recentEvents = useMemo(() => {
    return xpInfo.xpEvents.slice(-5).reverse();
  }, [xpInfo.xpEvents]);

  if (recentEvents.length === 0) return null;

  const getIcon = (source: string) => {
    switch (source) {
      case "run": return <Footprints size={12} color="#00E5FF" />;
      case "workout": return <Dumbbell size={12} color="#FF6B35" />;
      case "food": return <UtensilsCrossed size={12} color="#BFFF00" />;
      case "nutrition_goal": return <Award size={12} color="#F59E0B" />;
      case "streak": return <Flame size={12} color="#F59E0B" />;
      default: return <Zap size={12} color="#9CA3AF" />;
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
        <Zap size={13} color="#6B7280" />
        <Text style={feedStyles.heading}>XP Activity</Text>
        <Text style={feedStyles.total}>{xpInfo.totalXP.toLocaleString()} total</Text>
      </View>
      <View style={feedStyles.timeline}>
        {recentEvents.map((event, index) => (
          <View key={event.id} style={feedStyles.row}>
            <View style={feedStyles.timelineLeft}>
              <View style={[feedStyles.timelineDot, { backgroundColor: getColor(event.source) + "30", borderColor: getColor(event.source) + "60" }]}>
                {getIcon(event.source)}
              </View>
              {index < recentEvents.length - 1 && <View style={feedStyles.timelineLine} />}
            </View>
            <View style={feedStyles.rowContent}>
              <View style={feedStyles.rowTop}>
                <Text style={feedStyles.desc} numberOfLines={1}>{event.description}</Text>
                <Text style={[feedStyles.amount, { color: getColor(event.source) }]}>+{event.amount}</Text>
              </View>
              <Text style={feedStyles.time}>{timeAgo(event.date)} ago</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function useGreeting() {
  return useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return "Night owl mode 🦉";
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Night owl mode 🦉";
  }, []);
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
          <Text style={styles.subGreeting}>Keep leveling up</Text>
        </View>
        <View style={[styles.levelChip, { backgroundColor: xpInfo.rank.color + "15", borderColor: xpInfo.rank.color + "30" }]}>
          <Text style={styles.levelChipEmoji}>{xpInfo.rank.emoji}</Text>
          <Text style={[styles.levelChipText, { color: xpInfo.rank.color }]}>Lv {xpInfo.level}</Text>
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <HeroSection />
        <StreakStrip />
        <DailyQuests />
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
    backgroundColor: "#08090C",
  },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "#08090C",
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    justifyContent: "space-between" as const,
  },
  greetingText: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -0.8,
  },
  subGreeting: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#4B5563",
    marginTop: 1,
  },
  levelChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 2,
  },
  levelChipEmoji: {
    fontSize: 14,
  },
  levelChipText: {
    fontSize: 14,
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
    backgroundColor: "#0E1015",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    alignItems: "center" as const,
  },
  centerBlock: {
    alignItems: "center" as const,
    width: "100%" as const,
  },
  ringGlow: {
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 30,
      },
      android: {
        elevation: 0,
      },
      default: {},
    }),
  },
  ringArea: {
    width: 160,
    height: 160,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ringInner: {
    position: "absolute" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  rankEmojiCenter: {
    fontSize: 24,
    marginBottom: -2,
  },
  levelNum: {
    fontSize: 48,
    fontWeight: "900" as const,
    letterSpacing: -3,
    lineHeight: 52,
  },
  levelLabel: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: "#4B5563",
    letterSpacing: 3,
    marginTop: -2,
  },
  rankBadge: {
    marginTop: 12,
    marginBottom: 16,
  },
  rankBadgeInner: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
  },
  rankTitle: {
    fontSize: 15,
    fontWeight: "800" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  xpSection: {
    width: "100%" as const,
    gap: 8,
  },
  xpBarOuter: {
    width: "100%" as const,
    height: 8,
    borderRadius: 4,
    overflow: "hidden" as const,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  xpBarTrack: {
    flex: 1,
    position: "relative" as const,
  },
  xpBarFill: {
    height: "100%" as const,
    borderRadius: 4,
  },
  xpBarShine: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  xpNumbers: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  xpCurrent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  xpCurrentText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  xpRemaining: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  totalXpRow: {
    flexDirection: "row" as const,
    gap: 8,
    marginTop: 14,
  },
  totalXpPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  totalXpText: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: -0.2,
  },
  nextRankPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  nextRankEmoji: {
    fontSize: 12,
  },
  nextRankName: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
  nextRankAt: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#374151",
  },
});

const questStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0E1015",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  heading: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#9CA3AF",
  },
  completedBadge: {
    backgroundColor: "rgba(245,158,11,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  completedText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: "#F59E0B",
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  info: {
    flex: 1,
    gap: 5,
  },
  questLabel: {
    fontSize: 13,
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
    fontSize: 12,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
  checkMark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
});

const streakStyles = StyleSheet.create({
  strip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#0E1015",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  flameWrap: {
    position: "relative" as const,
  },
  flameGlow: {
    position: "absolute" as const,
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderRadius: 20,
  },
  items: {
    flex: 1,
    flexDirection: "row" as const,
    gap: 6,
  },
  item: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  val: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: "#2A2E35",
    letterSpacing: -0.5,
  },
  lbl: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#374151",
  },
  bonusTag: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    backgroundColor: "rgba(245,158,11,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bonusText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: "#F59E0B",
  },
});

const nutStyles = StyleSheet.create({
  card: {
    backgroundColor: "#0E1015",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 14,
  },
  heading: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#9CA3AF",
    flex: 1,
  },
  body: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 18,
  },
  left: {
    width: 72,
    height: 72,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dialInner: {
    position: "absolute" as const,
    alignItems: "center" as const,
  },
  calNum: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  calUnit: {
    fontSize: 8,
    fontWeight: "600" as const,
    color: "#6B7280",
    marginTop: -1,
  },
  right: {
    flex: 1,
    gap: 10,
  },
  macroRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  macroDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#6B7280",
    width: 14,
  },
  macroTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  macroFill: {
    height: "100%" as const,
    borderRadius: 2,
  },
  macroVal: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#D1D5DB",
    width: 40,
    textAlign: "right" as const,
  },
  macroGoal: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#4B5563",
  },
});

const weekStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0E1015",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 16,
  },
  heading: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#9CA3AF",
  },
  grid: {
    flexDirection: "row" as const,
  },
  cell: {
    flex: 1,
    alignItems: "center" as const,
    gap: 6,
    paddingVertical: 6,
  },
  cellBorder: {
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.04)",
  },
  cellIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
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
    fontWeight: "600" as const,
    color: "#4B5563",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
});


const feedStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0E1015",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 14,
  },
  heading: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#9CA3AF",
    flex: 1,
  },
  total: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#2A2E35",
  },
  timeline: {
    gap: 0,
  },
  row: {
    flexDirection: "row" as const,
    gap: 12,
  },
  timelineLeft: {
    alignItems: "center" as const,
    width: 28,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1.5,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginVertical: 2,
  },
  rowContent: {
    flex: 1,
    paddingBottom: 14,
    gap: 2,
  },
  rowTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  desc: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#D1D5DB",
    marginRight: 8,
  },
  time: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#374151",
  },
  amount: {
    fontSize: 14,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
});
