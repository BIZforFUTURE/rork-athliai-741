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
  Globe,
} from "lucide-react-native";
import { useApp } from "@/providers/AppProvider";
import { useRouter } from "expo-router";
import { RANKS, RANK_TRANSLATION_KEYS } from "@/constants/xp";
import { useLanguage } from "@/providers/LanguageProvider";



function HeroSection() {
  const { xpInfo } = useApp();
  const { t } = useLanguage();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, [fadeIn, slideUp, shimmer]);

  const xpRemaining = xpInfo.neededXP - xpInfo.currentXP;
  const currentIdx = RANKS.findIndex(r => r.title === xpInfo.rank.title);
  const nextRank = currentIdx < RANKS.length - 1 ? RANKS[currentIdx + 1] : null;
  const progressPct = Math.min(Math.max(xpInfo.progress, 0), 1);

  const ringSize = 130;
  const ringStroke = 8;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progressPct);

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 0.8, 0.4],
  });

  return (
    <Animated.View style={[heroStyles.container, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <View style={heroStyles.topRow}>
        <View style={heroStyles.ringCol}>
          <View style={heroStyles.ringWrap}>
            <Svg width={ringSize} height={ringSize}>
              <Defs>
                <SvgGradient id="heroRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={xpInfo.rank.color} stopOpacity="1" />
                  <Stop offset="1" stopColor={xpInfo.rank.color} stopOpacity="0.4" />
                </SvgGradient>
              </Defs>
              <Circle
                cx={ringSize / 2} cy={ringSize / 2} r={ringRadius}
                stroke="rgba(255,255,255,0.05)" strokeWidth={4} fill="none"
              />
              <Circle
                cx={ringSize / 2} cy={ringSize / 2} r={ringRadius}
                stroke="url(#heroRingGrad)" strokeWidth={ringStroke} fill="none"
                strokeDasharray={`${ringCircumference}`} strokeDashoffset={ringOffset}
                strokeLinecap="round" transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              />
            </Svg>
            <View style={heroStyles.ringCenter}>
              <Text style={heroStyles.ringEmoji}>{xpInfo.rank.emoji}</Text>
              <Text style={[heroStyles.ringLevel, { color: xpInfo.rank.color }]}>{xpInfo.level}</Text>
            </View>
          </View>
        </View>

        <View style={heroStyles.infoCol}>
          <View style={[heroStyles.rankTag, { backgroundColor: xpInfo.rank.color + "15" }]}>
            <Text style={[heroStyles.rankTagText, { color: xpInfo.rank.color }]}>{RANK_TRANSLATION_KEYS[xpInfo.rank.title] ? t(RANK_TRANSLATION_KEYS[xpInfo.rank.title]) : xpInfo.rank.title}</Text>
          </View>
          <Text style={heroStyles.levelTitle}>{t('home_level', { level: String(xpInfo.level) })}</Text>
          <Text style={heroStyles.xpLabel}>
            <Text style={{ color: "#E5E7EB", fontWeight: "700" as const }}>{xpInfo.currentXP}</Text>
            <Text style={{ color: "#4B5563" }}> / {xpInfo.neededXP} XP</Text>
          </Text>
          <View style={heroStyles.progressBar}>
            <View style={heroStyles.progressTrack}>
              <View style={[heroStyles.progressFill, { width: `${progressPct * 100}%`, backgroundColor: xpInfo.rank.color }]} />
              <Animated.View style={[heroStyles.progressShimmer, { width: `${progressPct * 100}%`, opacity: shimmerOpacity }]} />
            </View>
          </View>
          <Text style={heroStyles.xpToGo}>
            {t('home_xp_to_next', { xp: String(xpRemaining) })}
          </Text>
        </View>
      </View>

      <View style={heroStyles.bottomStrip}>
        <View style={heroStyles.statChip}>
          <Zap size={12} color={xpInfo.rank.color} fill={xpInfo.rank.color} />
          <Text style={[heroStyles.statChipValue, { color: xpInfo.rank.color }]}>{xpInfo.totalXP.toLocaleString()}</Text>
          <Text style={heroStyles.statChipLabel}>{t('home_total_xp')}</Text>
        </View>
        <View style={heroStyles.statDivider} />
        <View style={heroStyles.statChip}>
          <Text style={heroStyles.statChipValue}>{Math.round(progressPct * 100)}%</Text>
          <Text style={heroStyles.statChipLabel}>{t('home_progress')}</Text>
        </View>
        {nextRank && (
          <>
            <View style={heroStyles.statDivider} />
            <View style={heroStyles.statChip}>
              <Text style={heroStyles.nextRankEmoji}>{nextRank.emoji}</Text>
              <Text style={[heroStyles.statChipValue, { color: nextRank.color + "CC" }]}>{RANK_TRANSLATION_KEYS[nextRank.title] ? t(RANK_TRANSLATION_KEYS[nextRank.title]) : nextRank.title}</Text>
              <Text style={heroStyles.statChipLabel}>Lv {nextRank.minLevel}</Text>
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
}

function DailyQuests() {
  const { nutrition, todaysRuns, todaysWorkouts } = useApp();
  const { t } = useLanguage();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }).start();
  }, [fadeIn]);

  const calProgress = nutrition.calorieGoal > 0 ? Math.min(nutrition.calories / nutrition.calorieGoal, 1) : 0;
  const proteinProgress = nutrition.proteinGoal > 0 ? Math.min(nutrition.protein / nutrition.proteinGoal, 1) : 0;

  const quests = useMemo(() => [
    {
      id: "run",
      label: t('home_complete_run'),
      xp: "+25 XP",
      icon: <Footprints size={16} color="#00E5FF" />,
      color: "#00E5FF",
      done: todaysRuns.length > 0,
      progress: todaysRuns.length > 0 ? 1 : 0,
    },
    {
      id: "lift",
      label: t('home_finish_workout'),
      xp: "+75 XP",
      icon: <Dumbbell size={16} color="#FF6B35" />,
      color: "#FF6B35",
      done: todaysWorkouts.length > 0,
      progress: todaysWorkouts.length > 0 ? 1 : 0,
    },
    {
      id: "cal",
      label: t('home_hit_calorie'),
      xp: "+50 XP",
      icon: <Target size={16} color="#BFFF00" />,
      color: "#BFFF00",
      done: calProgress >= 0.95,
      progress: calProgress,
    },
    {
      id: "protein",
      label: t('home_hit_protein'),
      xp: "+30 XP",
      icon: <Award size={16} color="#F59E0B" />,
      color: "#F59E0B",
      done: proteinProgress >= 0.95,
      progress: proteinProgress,
    },
  ], [todaysRuns.length, todaysWorkouts.length, calProgress, proteinProgress, t]);

  const completedCount = quests.filter(q => q.done).length;

  return (
    <Animated.View style={[questStyles.container, { opacity: fadeIn }]}>
      <View style={questStyles.header}>
        <View style={questStyles.headerLeft}>
          <Crown size={14} color="#F59E0B" />
          <Text style={questStyles.heading}>{t('home_daily_quests')}</Text>
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
  const { t } = useLanguage();
  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enterAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }).start();
  }, [enterAnim]);

  const streaks = [
    { label: t('home_run'), value: stats.runStreak, color: "#00E5FF", icon: <Footprints size={14} color={stats.runStreak > 0 ? "#00E5FF" : "#4B5563"} /> },
    { label: t('home_food'), value: stats.foodStreak, color: "#BFFF00", icon: <UtensilsCrossed size={14} color={stats.foodStreak > 0 ? "#BFFF00" : "#4B5563"} /> },
    { label: t('home_gym'), value: stats.workoutStreak, color: "#FF6B35", icon: <Dumbbell size={14} color={stats.workoutStreak > 0 ? "#FF6B35" : "#4B5563"} /> },
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
  const { t } = useLanguage();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const calPct = nutrition.calorieGoal > 0 ? Math.min(nutrition.calories / nutrition.calorieGoal, 1) : 0;
  const calRemaining = Math.max(nutrition.calorieGoal - nutrition.calories, 0);
  const isGoalHit = calPct >= 0.95;

  const dialSize = 110;
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
          <View style={nutStyles.headerIconWrap}>
            <UtensilsCrossed size={15} color="#FF6B35" />
          </View>
          <View style={nutStyles.headerTitleArea}>
            <Text style={nutStyles.heading}>{t('home_todays_fuel')}</Text>
            <Text style={nutStyles.headerSub}>
              {isGoalHit ? t('home_goal_reached') : t('home_kcal_remaining', { cal: String(calRemaining) })}
            </Text>
          </View>
          <View style={nutStyles.headerArrow}>
            <ChevronRight size={16} color="#4B5563" />
          </View>
        </View>

        <View style={nutStyles.body}>
          <View style={nutStyles.dialArea}>
            <Svg width={dialSize} height={dialSize}>
              <Defs>
                <SvgGradient id="fuelRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={isGoalHit ? "#10B981" : "#FF6B35"} stopOpacity="1" />
                  <Stop offset="1" stopColor={isGoalHit ? "#34D399" : "#FF8F65"} stopOpacity="0.6" />
                </SvgGradient>
              </Defs>
              <Circle cx={dialSize / 2} cy={dialSize / 2} r={r} stroke="rgba(255,107,53,0.06)" strokeWidth={stroke} fill="none" />
              <Circle
                cx={dialSize / 2} cy={dialSize / 2} r={r}
                stroke="url(#fuelRingGrad)" strokeWidth={stroke} fill="none"
                strokeDasharray={`${circ}`} strokeDashoffset={offset}
                strokeLinecap="round" transform={`rotate(-90 ${dialSize / 2} ${dialSize / 2})`}
              />
            </Svg>
            <View style={nutStyles.dialInner}>
              <Text style={nutStyles.calNum}>{nutrition.calories}</Text>
              <Text style={nutStyles.calDivider}>of {nutrition.calorieGoal}</Text>
              <Text style={nutStyles.calUnit}>kcal</Text>
            </View>
          </View>
        </View>

        <View style={nutStyles.macroSection}>
          {macros.map((m) => {
            const pct = m.goal > 0 ? Math.min(m.value / m.goal, 1) : 0;
            const macroHit = pct >= 0.95;
            return (
              <View key={m.short} style={nutStyles.macroCard}>
                <View style={nutStyles.macroTop}>
                  <View style={[nutStyles.macroDot, { backgroundColor: m.color }]} />
                  <Text style={nutStyles.macroLabel}>{m.label}</Text>
                </View>
                <View style={nutStyles.macroValues}>
                  <Text style={[nutStyles.macroVal, macroHit && { color: m.color }]}>{m.value}</Text>
                  <Text style={nutStyles.macroGoalText}>/ {m.goal}g</Text>
                </View>
                <View style={nutStyles.macroTrack}>
                  <View style={[nutStyles.macroFill, { width: `${pct * 100}%`, backgroundColor: macroHit ? m.color : m.color + "80" }]} />
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
  const { t, isSpanish } = useLanguage();
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
    { value: isSpanish ? (stats.weeklyMiles * 1.60934).toFixed(1) : stats.weeklyMiles.toFixed(1), unit: isSpanish ? "km" : "mi", label: t('home_distance'), color: "#00E5FF", icon: <Route size={20} color="#00E5FF" /> },
    { value: `${stats.weeklyRuns}`, unit: "", label: t('home_runs'), color: "#BFFF00", icon: <Footprints size={20} color="#BFFF00" /> },
    { value: formatTime(stats.weeklyTime), unit: "", label: t('home_active_time'), color: "#FF6B35", icon: <Timer size={20} color="#FF6B35" /> },
    { value: `${stats.weeklyWorkouts}`, unit: "", label: t('home_workouts'), color: "#00ADB5", icon: <Dumbbell size={20} color="#00ADB5" /> },
  ];

  return (
    <Animated.View style={[weekStyles.container, { opacity: fadeIn }]}>
      <View style={weekStyles.headerRow}>
        <TrendingUp size={15} color="#9CA3AF" />
        <Text style={weekStyles.heading}>{t('home_this_week')}</Text>
      </View>
      <View style={weekStyles.grid}>
        {items.map((item, idx) => (
          <View key={item.label} style={[weekStyles.cell, { borderColor: item.color + "12" }]}>
            <View style={weekStyles.cellTop}>
              <View style={[weekStyles.cellIcon, { backgroundColor: item.color + "14" }]}>
                {item.icon}
              </View>
              <Text style={[weekStyles.cellLabel, { color: item.color + "AA" }]}>{item.label}</Text>
            </View>
            <Text style={weekStyles.cellValue}>
              {item.value}
              {item.unit ? <Text style={[weekStyles.cellUnit, { color: item.color }]}> {item.unit}</Text> : null}
            </Text>
            {idx < 2 && (
              <View style={[weekStyles.cellAccent, { backgroundColor: item.color + "18" }]} />
            )}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

function XPFeed() {
  const { xpInfo } = useApp();
  const { t } = useLanguage();

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
        <Text style={feedStyles.heading}>{t('home_xp_activity')}</Text>
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
  const { t } = useLanguage();
  return useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return t('home_night_owl');
    if (hour < 12) return t('home_good_morning');
    if (hour < 17) return t('home_good_afternoon');
    if (hour < 21) return t('home_good_evening');
    return t('home_night_owl');
  }, [t]);
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const greeting = useGreeting();
  const { xpInfo } = useApp();
  const { t, setLanguage, isSpanish } = useLanguage();
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1, flexShrink: 1 }}>
          <Text style={styles.greetingText} numberOfLines={1}>{greeting}</Text>
          <Text style={styles.subGreeting}>{t('home_keep_leveling')}</Text>
        </View>
        <View style={[styles.levelChip, { backgroundColor: xpInfo.rank.color + "18", borderColor: xpInfo.rank.color + "35" }]}>
          <Text style={styles.levelChipEmoji}>{xpInfo.rank.emoji}</Text>
          <Text style={[styles.levelChipText, { color: xpInfo.rank.color }]}>Lv {xpInfo.level}</Text>
        </View>
      </View>
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
        <HeroSection />
        <StreakStrip />
        <DailyQuests />
        <TodayNutrition />
        <WeeklyStats />
        <XPFeed />
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
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#08090C",
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    justifyContent: "space-between" as const,
    gap: 10,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -0.8,
    flexShrink: 1,
  },
  subGreeting: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#6B7280",
    marginTop: 2,
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
    flexShrink: 0,
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

const heroStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0E1015",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  topRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 18,
  },
  ringCol: {
    alignItems: "center" as const,
  },
  ringWrap: {
    width: 130,
    height: 130,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ringCenter: {
    position: "absolute" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ringEmoji: {
    fontSize: 20,
    marginBottom: -2,
  },
  ringLevel: {
    fontSize: 40,
    fontWeight: "900" as const,
    letterSpacing: -2,
    lineHeight: 44,
  },
  infoCol: {
    flex: 1,
    gap: 4,
  },
  rankTag: {
    alignSelf: "flex-start" as const,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 2,
  },
  rankTagText: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  levelTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -0.5,
  },
  xpLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    marginTop: 1,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden" as const,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginTop: 6,
  },
  progressTrack: {
    flex: 1,
    position: "relative" as const,
  },
  progressFill: {
    height: "100%" as const,
    borderRadius: 3,
  },
  progressShimmer: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  xpToGo: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#6B7280",
    marginTop: 4,
  },
  bottomStrip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    gap: 0,
  },
  statChip: {
    flex: 1,
    alignItems: "center" as const,
    gap: 2,
  },
  statChipValue: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: "#E5E7EB",
    letterSpacing: -0.3,
  },
  statChipLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#4B5563",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  nextRankEmoji: {
    fontSize: 14,
  },
});

const questStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0E1015",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
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
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
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
    color: "#6B7280",
    letterSpacing: -0.5,
  },
  lbl: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#4B5563",
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
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.1)",
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginBottom: 20,
  },
  headerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,107,53,0.1)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerTitleArea: {
    flex: 1,
    gap: 1,
  },
  heading: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#6B7280",
  },
  headerArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  body: {
    alignItems: "center" as const,
    marginBottom: 20,
  },
  dialArea: {
    width: 110,
    height: 110,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dialInner: {
    position: "absolute" as const,
    alignItems: "center" as const,
  },
  calNum: {
    fontSize: 26,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: -1,
    lineHeight: 30,
  },
  calDivider: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#4B5563",
    marginTop: 1,
  },
  calUnit: {
    fontSize: 9,
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
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 12,
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
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#6B7280",
  },
  macroValues: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    gap: 3,
  },
  macroVal: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: "#E5E7EB",
    letterSpacing: -0.5,
  },
  macroGoalText: {
    fontSize: 11,
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
    gap: 7,
    marginBottom: 16,
  },
  heading: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#D1D5DB",
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
    backgroundColor: "rgba(255,255,255,0.025)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    overflow: "hidden" as const,
    position: "relative" as const,
    minHeight: 110,
  },
  cellTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap" as const,
  },
  cellIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cellValue: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -1,
  },
  cellUnit: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  cellAccent: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
});


const feedStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0E1015",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
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
    color: "#6B7280",
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
