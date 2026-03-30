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
import { DS } from "@/constants/theme";

const S = DS.stroke.iconThin;

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

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  const bigRingSize = 140;
  const bigRingStroke = 6;
  const bigRingRadius = (bigRingSize - bigRingStroke) / 2;
  const bigRingCircumference = 2 * Math.PI * bigRingRadius;
  const bigRingOffset = bigRingCircumference * (1 - progressPct);

  return (
    <Animated.View style={[heroStyles.container, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <View style={heroStyles.topRow}>
        <View style={heroStyles.ringCol}>
          <View style={heroStyles.ringWrap}>
            <Svg width={bigRingSize} height={bigRingSize}>
              <Defs>
                <SvgGradient id="heroRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={DS.accent.lime} stopOpacity="1" />
                  <Stop offset="1" stopColor={DS.accent.periwinkle} stopOpacity="0.6" />
                </SvgGradient>
              </Defs>
              <Circle
                cx={bigRingSize / 2} cy={bigRingSize / 2} r={bigRingRadius}
                stroke="rgba(255,255,255,0.04)" strokeWidth={2} fill="none"
              />
              <Circle
                cx={bigRingSize / 2} cy={bigRingSize / 2} r={bigRingRadius}
                stroke="url(#heroRingGrad)" strokeWidth={bigRingStroke} fill="none"
                strokeDasharray={`${bigRingCircumference}`} strokeDashoffset={bigRingOffset}
                strokeLinecap="round" transform={`rotate(-90 ${bigRingSize / 2} ${bigRingSize / 2})`}
              />
            </Svg>
            <View style={heroStyles.ringCenter}>
              <Text style={heroStyles.ringLevel}>{xpInfo.level}</Text>
              <Text style={heroStyles.ringLevelLabel}>LVL</Text>
            </View>
          </View>
        </View>

        <View style={heroStyles.infoCol}>
          <View style={heroStyles.rankTag}>
            <Text style={heroStyles.rankTagText}>{RANK_TRANSLATION_KEYS[xpInfo.rank.title] ? t(RANK_TRANSLATION_KEYS[xpInfo.rank.title]) : xpInfo.rank.title}</Text>
          </View>
          <View style={heroStyles.xpRow}>
            <Text style={heroStyles.xpCurrent}>{xpInfo.currentXP}</Text>
            <Text style={heroStyles.xpDivider}> / {xpInfo.neededXP}</Text>
          </View>
          <View style={heroStyles.progressBar}>
            <View style={heroStyles.progressTrack}>
              <View style={[heroStyles.progressFill, { width: `${progressPct * 100}%` }]} />
              <Animated.View style={[heroStyles.progressShimmer, { width: `${progressPct * 100}%`, opacity: shimmerOpacity }]} />
            </View>
          </View>
          <Text style={heroStyles.xpToGo}>{xpRemaining} XP TO NEXT</Text>
        </View>
      </View>

      <View style={heroStyles.bottomStrip}>
        <View style={heroStyles.statChip}>
          <Zap size={11} color={DS.accent.lime} strokeWidth={S} />
          <Text style={heroStyles.statChipValue}>{xpInfo.totalXP.toLocaleString()}</Text>
          <Text style={heroStyles.statChipLabel}>{t('home_total_xp')}</Text>
        </View>
        {nextRank && (
          <View style={heroStyles.statChip}>
            <Text style={[heroStyles.statChipValue, { color: nextRank.color + "CC" }]}>{RANK_TRANSLATION_KEYS[nextRank.title] ? t(RANK_TRANSLATION_KEYS[nextRank.title]) : nextRank.title}</Text>
            <Text style={heroStyles.statChipLabel}>LV {nextRank.minLevel}</Text>
          </View>
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
      icon: <Footprints size={14} color={DS.accent.lime} strokeWidth={S} />,
      color: DS.accent.lime,
      done: todaysRuns.length > 0,
      progress: todaysRuns.length > 0 ? 1 : 0,
    },
    {
      id: "lift",
      label: t('home_finish_workout'),
      xp: "+75 XP",
      icon: <Dumbbell size={14} color={DS.accent.orange} strokeWidth={S} />,
      color: DS.accent.orange,
      done: todaysWorkouts.length > 0,
      progress: todaysWorkouts.length > 0 ? 1 : 0,
    },
    {
      id: "cal",
      label: t('home_hit_calorie'),
      xp: "+50 XP",
      icon: <Target size={14} color={DS.accent.periwinkle} strokeWidth={S} />,
      color: DS.accent.periwinkle,
      done: calProgress >= 0.95,
      progress: calProgress,
    },
    {
      id: "protein",
      label: t('home_hit_protein'),
      xp: "+30 XP",
      icon: <Award size={14} color={DS.accent.amber} strokeWidth={S} />,
      color: DS.accent.amber,
      done: proteinProgress >= 0.95,
      progress: proteinProgress,
    },
  ], [todaysRuns.length, todaysWorkouts.length, calProgress, proteinProgress, t]);

  const completedCount = quests.filter(q => q.done).length;

  return (
    <Animated.View style={[questStyles.container, { opacity: fadeIn }]}>
      <View style={questStyles.header}>
        <View style={questStyles.headerLeft}>
          <Crown size={13} color={DS.accent.amber} strokeWidth={S} />
          <Text style={questStyles.heading}>{t('home_daily_quests')}</Text>
        </View>
        <View style={questStyles.completedBadge}>
          <Text style={questStyles.completedText}>{completedCount}/{quests.length}</Text>
        </View>
      </View>
      {quests.map((quest) => (
        <View key={quest.id} style={questStyles.row}>
          {quest.done && <View style={[questStyles.leftAccent, { backgroundColor: quest.color }]} />}
          <View style={[questStyles.iconWrap, { backgroundColor: quest.color + "10" }]}>
            {quest.icon}
          </View>
          <View style={questStyles.info}>
            <Text style={[questStyles.questLabel, quest.done && questStyles.questDone]}>{quest.label}</Text>
            <View style={questStyles.questTrack}>
              <View style={[questStyles.questFill, { width: `${quest.progress * 100}%`, backgroundColor: quest.done ? quest.color : quest.color + "50" }]} />
            </View>
          </View>
          <Text style={[questStyles.xpTag, { color: quest.done ? quest.color : DS.slate.mid }]}>{quest.xp}</Text>
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
    { label: t('home_run'), value: stats.runStreak, color: DS.accent.lime, icon: <Footprints size={13} color={stats.runStreak > 0 ? DS.accent.lime : DS.slate.light} strokeWidth={S} /> },
    { label: t('home_food'), value: stats.foodStreak, color: DS.accent.periwinkle, icon: <UtensilsCrossed size={13} color={stats.foodStreak > 0 ? DS.accent.periwinkle : DS.slate.light} strokeWidth={S} /> },
    { label: t('home_gym'), value: stats.workoutStreak, color: DS.accent.orange, icon: <Dumbbell size={13} color={stats.workoutStreak > 0 ? DS.accent.orange : DS.slate.light} strokeWidth={S} /> },
  ];

  const totalStreak = streaks.reduce((a, s) => a + s.value, 0);

  return (
    <Animated.View style={[streakStyles.strip, { opacity: enterAnim }]}>
      <View style={streakStyles.flameWrap}>
        <Flame size={16} color={totalStreak > 0 ? DS.accent.amber : DS.slate.deep} fill={totalStreak > 0 ? DS.accent.amber : "none"} strokeWidth={S} />
      </View>
      <View style={streakStyles.items}>
        {streaks.map((s) => (
          <View key={s.label} style={[streakStyles.item, s.value > 0 && { backgroundColor: s.color + "08" }]}>
            {s.icon}
            <Text style={[streakStyles.val, s.value > 0 && { color: DS.text.primary }]}>{s.value}</Text>
            <Text style={[streakStyles.lbl, s.value > 0 && { color: s.color + "99" }]}>{s.label}</Text>
          </View>
        ))}
      </View>
      {totalStreak >= 3 && (
        <View style={streakStyles.bonusTag}>
          <Zap size={9} color={DS.accent.lime} fill={DS.accent.lime} strokeWidth={S} />
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

  const dialSize = 100;
  const stroke = 6;
  const r = (dialSize - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - calPct);

  const macros = [
    { label: t('home_protein'), value: nutrition.protein, goal: nutrition.proteinGoal, color: DS.accent.periwinkle, short: "P" },
    { label: t('home_carbs'), value: nutrition.carbs, goal: nutrition.carbsGoal, color: DS.accent.lime, short: "C" },
    { label: t('home_fat'), value: nutrition.fat, goal: nutrition.fatGoal, color: DS.accent.amber, short: "F" },
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
            <UtensilsCrossed size={14} color={DS.accent.orange} strokeWidth={S} />
          </View>
          <View style={nutStyles.headerTitleArea}>
            <Text style={nutStyles.heading}>FUEL</Text>
            <Text style={nutStyles.headerSub}>
              {isGoalHit ? t('home_goal_reached') : t('home_kcal_remaining', { cal: String(calRemaining) })}
            </Text>
          </View>
          <View style={nutStyles.headerArrow}>
            <ChevronRight size={14} color={DS.slate.light} strokeWidth={S} />
          </View>
        </View>

        <View style={nutStyles.body}>
          <View style={nutStyles.dialArea}>
            <Svg width={dialSize} height={dialSize}>
              <Defs>
                <SvgGradient id="fuelRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={isGoalHit ? DS.accent.green : DS.accent.lime} stopOpacity="1" />
                  <Stop offset="1" stopColor={isGoalHit ? DS.accent.periwinkle : DS.accent.periwinkle} stopOpacity="0.5" />
                </SvgGradient>
              </Defs>
              <Circle cx={dialSize / 2} cy={dialSize / 2} r={r} stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} fill="none" />
              <Circle
                cx={dialSize / 2} cy={dialSize / 2} r={r}
                stroke="url(#fuelRingGrad)" strokeWidth={stroke} fill="none"
                strokeDasharray={`${circ}`} strokeDashoffset={offset}
                strokeLinecap="round" transform={`rotate(-90 ${dialSize / 2} ${dialSize / 2})`}
              />
            </Svg>
            <View style={nutStyles.dialInner}>
              <Text style={nutStyles.calNum}>{nutrition.calories}</Text>
              <Text style={nutStyles.calUnit}>KCAL</Text>
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
                  <View style={[nutStyles.macroFill, { width: `${pct * 100}%`, backgroundColor: macroHit ? m.color : m.color + "50" }]} />
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
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }).start();
  }, [fadeIn]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const items = [
    { value: stats.weeklyMiles.toFixed(1), unit: "mi", label: t('home_distance'), color: DS.accent.lime, icon: <Route size={18} color={DS.accent.lime} strokeWidth={S} /> },
    { value: `${stats.weeklyRuns}`, unit: "", label: t('home_runs'), color: DS.accent.periwinkle, icon: <Footprints size={18} color={DS.accent.periwinkle} strokeWidth={S} /> },
    { value: formatTime(stats.weeklyTime), unit: "", label: t('home_active_time'), color: DS.accent.orange, icon: <Timer size={18} color={DS.accent.orange} strokeWidth={S} /> },
    { value: `${stats.weeklyWorkouts}`, unit: "", label: t('home_workouts'), color: DS.accent.cyan, icon: <Dumbbell size={18} color={DS.accent.cyan} strokeWidth={S} /> },
  ];

  return (
    <Animated.View style={[weekStyles.container, { opacity: fadeIn }]}>
      <View style={weekStyles.headerRow}>
        <TrendingUp size={13} color={DS.text.tertiary} strokeWidth={S} />
        <Text style={weekStyles.heading}>THIS WEEK</Text>
      </View>
      <View style={weekStyles.grid}>
        {items.map((item) => (
          <View key={item.label} style={weekStyles.cell}>
            <View style={weekStyles.cellTop}>
              <View style={[weekStyles.cellIcon, { backgroundColor: item.color + "0D" }]}>
                {item.icon}
              </View>
            </View>
            <Text style={weekStyles.cellValue}>
              {item.value}
              {item.unit ? <Text style={[weekStyles.cellUnit, { color: item.color }]}> {item.unit}</Text> : null}
            </Text>
            <Text style={[weekStyles.cellLabel]}>{item.label}</Text>
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
      case "run": return <Footprints size={11} color={DS.accent.lime} strokeWidth={S} />;
      case "workout": return <Dumbbell size={11} color={DS.accent.orange} strokeWidth={S} />;
      case "food": return <UtensilsCrossed size={11} color={DS.accent.periwinkle} strokeWidth={S} />;
      case "nutrition_goal": return <Award size={11} color={DS.accent.amber} strokeWidth={S} />;
      case "streak": return <Flame size={11} color={DS.accent.amber} strokeWidth={S} />;
      default: return <Zap size={11} color={DS.text.tertiary} strokeWidth={S} />;
    }
  };

  const getColor = (source: string) => {
    switch (source) {
      case "run": return DS.accent.lime;
      case "workout": return DS.accent.orange;
      case "food": return DS.accent.periwinkle;
      case "nutrition_goal": return DS.accent.amber;
      case "streak": return DS.accent.amber;
      default: return DS.text.tertiary;
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('xp_time_now');
    if (mins < 60) return t('xp_time_m').replace('{n}', String(mins));
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t('xp_time_h').replace('{n}', String(hrs));
    return t('xp_time_d').replace('{n}', String(Math.floor(hrs / 24)));
  };

  const translateDescription = (desc: string) => {
    const runMatch = desc.match(/^Completed a ([\d.]+) mi run$/);
    if (runMatch) return t('xp_completed_run').replace('{distance}', runMatch[1]);
    if (desc === 'Treadmill photo verified') return t('xp_treadmill_verified');
    if (desc === 'Completed workout') return t('xp_completed_workout');
    if (desc === 'Hit daily calorie goal') return t('xp_calorie_goal');
    if (desc === 'Hit daily protein goal') return t('xp_protein_goal');
    const runStreakMatch = desc.match(/^(\d+)-day run streak bonus$/);
    if (runStreakMatch) return t('xp_run_streak').replace('{days}', runStreakMatch[1]);
    const foodStreakMatch = desc.match(/^(\d+)-day food streak bonus$/);
    if (foodStreakMatch) return t('xp_food_streak').replace('{days}', foodStreakMatch[1]);
    const workoutStreakMatch = desc.match(/^(\d+)-day workout streak bonus$/);
    if (workoutStreakMatch) return t('xp_workout_streak').replace('{days}', workoutStreakMatch[1]);
    const loggedMatch = desc.match(/^Logged (.+)$/);
    if (loggedMatch) return t('xp_logged_food').replace('{name}', loggedMatch[1]);
    return desc;
  };

  return (
    <View style={feedStyles.container}>
      <View style={feedStyles.header}>
        <Zap size={12} color={DS.text.muted} strokeWidth={S} />
        <Text style={feedStyles.heading}>XP ACTIVITY</Text>
        <Text style={feedStyles.total}>{xpInfo.totalXP.toLocaleString()} TOTAL</Text>
      </View>
      <View style={feedStyles.timeline}>
        {recentEvents.map((event, index) => (
          <View key={event.id} style={feedStyles.row}>
            <View style={feedStyles.timelineLeft}>
              <View style={[feedStyles.timelineDot, { backgroundColor: getColor(event.source) + "15", borderColor: getColor(event.source) + "40" }]}>
                {getIcon(event.source)}
              </View>
              {index < recentEvents.length - 1 && <View style={feedStyles.timelineLine} />}
            </View>
            <View style={feedStyles.rowContent}>
              <View style={feedStyles.rowTop}>
                <Text style={feedStyles.desc} numberOfLines={1}>{translateDescription(event.description)}</Text>
                <Text style={[feedStyles.amount, { color: getColor(event.source) }]}>+{event.amount}</Text>
              </View>
              <Text style={feedStyles.time}>{timeAgo(event.date)}</Text>
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
  const { t, setLanguage, isSpanish } = useLanguage();
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const { xpInfo } = useApp();

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{greeting}</Text>
          <Text style={styles.subGreeting}>{t('home_keep_leveling')}</Text>
        </View>
        <View style={styles.levelChip}>
          <Text style={styles.levelChipText}>LV {xpInfo.level}</Text>
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
            tintColor={DS.accent.lime}
            colors={[DS.accent.lime]}
            progressBackgroundColor={DS.bg.card}
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
          <Globe size={12} color={DS.slate.mid} strokeWidth={S} />
          <Text style={styles.langToggleText}>{isSpanish ? 'English' : 'Espanol'}</Text>
        </Pressable>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.bg.base,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: DS.bg.base,
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    justifyContent: "space-between" as const,
    gap: 10,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: DS.text.primary,
    letterSpacing: -0.8,
    flexShrink: 1,
  },
  subGreeting: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: DS.text.muted,
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  levelChip: {
    borderWidth: 1,
    borderColor: DS.accent.lime + "30",
    backgroundColor: DS.accent.lime + "08",
    borderRadius: DS.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 2,
    flexShrink: 0,
  },
  levelChipText: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: DS.accent.lime,
    letterSpacing: 1.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 10,
  },
  langToggle: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: DS.bg.card,
    alignSelf: "center" as const,
    marginTop: 4,
    borderWidth: 1,
    borderColor: DS.border.subtle,
  },
  langToggleText: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: DS.text.muted,
    letterSpacing: 0.5,
  },
});

const heroStyles = StyleSheet.create({
  container: {
    backgroundColor: DS.bg.card,
    borderRadius: DS.radius.hero,
    paddingTop: 20,
    paddingBottom: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: DS.border.default,
    overflow: "hidden" as const,
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
    width: 140,
    height: 140,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ringCenter: {
    position: "absolute" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ringLevel: {
    fontSize: 44,
    fontWeight: "900" as const,
    color: DS.text.primary,
    letterSpacing: -2,
    lineHeight: 48,
  },
  ringLevelLabel: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: DS.text.muted,
    letterSpacing: 3,
    marginTop: 2,
  },
  infoCol: {
    flex: 1,
    gap: 6,
  },
  rankTag: {
    alignSelf: "flex-start" as const,
    backgroundColor: DS.accent.lime + "10",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: DS.radius.sm,
  },
  rankTagText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: DS.accent.lime,
    letterSpacing: 3,
    textTransform: "uppercase" as const,
  },
  xpRow: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
  },
  xpCurrent: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: DS.text.primary,
    letterSpacing: -1,
  },
  xpDivider: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: DS.slate.mid,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden" as const,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  progressTrack: {
    flex: 1,
    position: "relative" as const,
  },
  progressFill: {
    height: "100%" as const,
    borderRadius: 2,
    backgroundColor: DS.accent.lime,
  },
  progressShimmer: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  xpToGo: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: DS.text.muted,
    letterSpacing: 1.5,
  },
  bottomStrip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DS.border.subtle,
    gap: 24,
  },
  statChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  statChipValue: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: DS.accent.lime,
    letterSpacing: -0.3,
  },
  statChipLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: DS.text.muted,
    letterSpacing: 0.5,
  },
});

const questStyles = StyleSheet.create({
  container: {
    backgroundColor: DS.bg.card,
    borderRadius: DS.radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: DS.border.default,
    overflow: "hidden" as const,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  heading: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: DS.text.tertiary,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },
  completedBadge: {
    backgroundColor: DS.accent.lime + "10",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: DS.radius.sm,
  },
  completedText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: DS.accent.lime,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 7,
    position: "relative" as const,
  },
  leftAccent: {
    position: "absolute" as const,
    left: -14,
    top: 4,
    bottom: 4,
    width: 3,
    borderRadius: 2,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  questLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: DS.text.secondary,
  },
  questDone: {
    color: DS.text.muted,
    textDecorationLine: "line-through" as const,
  },
  questTrack: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 1,
    overflow: "hidden" as const,
  },
  questFill: {
    height: "100%" as const,
    borderRadius: 1,
  },
  xpTag: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
});

const streakStyles = StyleSheet.create({
  strip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: DS.bg.card,
    borderRadius: DS.radius.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: DS.border.default,
    overflow: "hidden" as const,
  },
  flameWrap: {
    position: "relative" as const,
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
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  val: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: DS.text.muted,
    letterSpacing: -0.5,
  },
  lbl: {
    fontSize: 9,
    fontWeight: "600" as const,
    color: DS.text.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  bonusTag: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    backgroundColor: DS.accent.lime + "10",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: DS.radius.sm,
  },
  bonusText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: DS.accent.lime,
    letterSpacing: 0.5,
  },
});

const nutStyles = StyleSheet.create({
  card: {
    backgroundColor: DS.bg.card,
    borderRadius: DS.radius.hero,
    padding: 18,
    borderWidth: 1,
    borderColor: DS.border.default,
    overflow: "hidden" as const,
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginBottom: 16,
  },
  headerIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: DS.accent.orange + "10",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerTitleArea: {
    flex: 1,
    gap: 1,
  },
  heading: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: DS.text.secondary,
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: DS.text.muted,
  },
  headerArrow: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: DS.bg.cardHover,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  body: {
    alignItems: "center" as const,
    marginBottom: 16,
  },
  dialArea: {
    width: 100,
    height: 100,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dialInner: {
    position: "absolute" as const,
    alignItems: "center" as const,
  },
  calNum: {
    fontSize: 24,
    fontWeight: "900" as const,
    color: DS.text.primary,
    letterSpacing: -1,
    lineHeight: 28,
  },
  calUnit: {
    fontSize: 8,
    fontWeight: "700" as const,
    color: DS.text.muted,
    letterSpacing: 2,
    marginTop: 1,
  },
  macroSection: {
    flexDirection: "row" as const,
    gap: 6,
  },
  macroCard: {
    flex: 1,
    backgroundColor: DS.bg.inner,
    borderRadius: DS.radius.inner,
    padding: 10,
    gap: 6,
  },
  macroTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  macroDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  macroLabel: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: DS.text.muted,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  macroValues: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    gap: 2,
  },
  macroVal: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: DS.text.primary,
    letterSpacing: -0.5,
  },
  macroGoalText: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: DS.text.muted,
  },
  macroTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.04)",
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
    backgroundColor: DS.bg.card,
    borderRadius: DS.radius.hero,
    padding: 16,
    borderWidth: 1,
    borderColor: DS.border.default,
    overflow: "hidden" as const,
  },
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 14,
  },
  heading: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: DS.text.tertiary,
    letterSpacing: 1.5,
  },
  grid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  cell: {
    width: "47%" as unknown as number,
    flexGrow: 1,
    flexBasis: "44%" as unknown as number,
    backgroundColor: DS.bg.inner,
    borderRadius: DS.radius.card,
    padding: 14,
    borderWidth: 1,
    overflow: "hidden" as const,
    position: "relative" as const,
    minHeight: 100,
    borderColor: DS.border.subtle,
  },
  cellTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 10,
  },
  cellIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cellValue: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: DS.text.primary,
    letterSpacing: -1,
  },
  cellUnit: {
    fontSize: 14,
    fontWeight: "700" as const,
  },
  cellLabel: {
    fontSize: 9,
    fontWeight: "600" as const,
    color: DS.text.muted,
    textTransform: "uppercase" as const,
    letterSpacing: 1.5,
    marginTop: 2,
  },
});

const feedStyles = StyleSheet.create({
  container: {
    backgroundColor: DS.bg.card,
    borderRadius: DS.radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: DS.border.default,
    overflow: "hidden" as const,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 12,
  },
  heading: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: DS.text.tertiary,
    letterSpacing: 1.5,
    flex: 1,
  },
  total: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: DS.text.muted,
    letterSpacing: 0.5,
  },
  timeline: {
    gap: 0,
  },
  row: {
    flexDirection: "row" as const,
    gap: 10,
  },
  timelineLeft: {
    alignItems: "center" as const,
    width: 26,
  },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    backgroundColor: DS.border.subtle,
    marginVertical: 2,
  },
  rowContent: {
    flex: 1,
    paddingBottom: 12,
    gap: 2,
  },
  rowTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  desc: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600" as const,
    color: DS.text.secondary,
    marginRight: 8,
  },
  time: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: DS.text.muted,
  },
  amount: {
    fontSize: 13,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
});
