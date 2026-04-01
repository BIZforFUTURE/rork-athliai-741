import React, { useMemo, useEffect, useRef, useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Animated,
  Pressable,
  RefreshControl,
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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideUp]);

  const xpRemaining = xpInfo.neededXP - xpInfo.currentXP;
  const currentIdx = RANKS.findIndex(r => r.title === xpInfo.rank.title);
  const nextRank = currentIdx < RANKS.length - 1 ? RANKS[currentIdx + 1] : null;
  const progressPct = Math.min(Math.max(xpInfo.progress, 0), 1);

  const bigRingSize = 150;
  const bigRingStroke = 6;
  const bigRingRadius = (bigRingSize - bigRingStroke) / 2;
  const bigRingCircumference = 2 * Math.PI * bigRingRadius;
  const bigRingOffset = bigRingCircumference * (1 - progressPct);

  return (
    <Animated.View style={[heroStyles.container, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <View style={heroStyles.ringCol}>
        <View style={heroStyles.ringWrap}>
          <Svg width={bigRingSize} height={bigRingSize}>
            <Defs>
              <SvgGradient id="heroRingGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#4A7C59" stopOpacity="1" />
                <Stop offset="1" stopColor="#4A7C59" stopOpacity="0.4" />
              </SvgGradient>
            </Defs>
            <Circle
              cx={bigRingSize / 2} cy={bigRingSize / 2} r={bigRingRadius}
              stroke="rgba(0,0,0,0.04)" strokeWidth={3} fill="none"
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
          </View>
        </View>
        <Text style={heroStyles.levelLabel}>LEVEL</Text>
      </View>

      <View style={heroStyles.rankTag}>
        <Text style={heroStyles.rankTagText}>{RANK_TRANSLATION_KEYS[xpInfo.rank.title] ? t(RANK_TRANSLATION_KEYS[xpInfo.rank.title]) : xpInfo.rank.title}</Text>
      </View>

      <View style={heroStyles.xpRow}>
        <Text style={heroStyles.xpLabel}>
          <Text style={{ color: "#4A7C59", fontWeight: "700" as const }}>{xpInfo.currentXP}</Text>
          <Text style={{ color: "#C7C7CC" }}> /{xpInfo.neededXP}</Text>
        </Text>
        <Text style={heroStyles.xpToGo}>{xpRemaining} to go</Text>
      </View>
      <View style={heroStyles.progressBar}>
        <View style={heroStyles.progressTrack}>
          <View style={[heroStyles.progressFill, { width: `${progressPct * 100}%` }]} />
        </View>
      </View>

      <View style={heroStyles.bottomStrip}>
        <View style={heroStyles.statChip}>
          <Zap size={11} color="#4A7C59" />
          <Text style={heroStyles.statChipValue}>{xpInfo.totalXP.toLocaleString()}</Text>
          <Text style={heroStyles.statChipLabel}>{t('home_total_xp')}</Text>
        </View>
        {nextRank && (
          <View style={heroStyles.statChip}>
            <Text style={heroStyles.statChipValue}>{RANK_TRANSLATION_KEYS[nextRank.title] ? t(RANK_TRANSLATION_KEYS[nextRank.title]) : nextRank.title}</Text>
            <Text style={heroStyles.statChipLabel}>Lv {nextRank.minLevel}</Text>
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
      icon: <Footprints size={16} color="#4A7C59" strokeWidth={1.5} />,
      color: "#4A7C59",
      done: todaysRuns.length > 0,
      progress: todaysRuns.length > 0 ? 1 : 0,
    },
    {
      id: "lift",
      label: t('home_finish_workout'),
      xp: "+75 XP",
      icon: <Dumbbell size={16} color="#E8725A" strokeWidth={1.5} />,
      color: "#E8725A",
      done: todaysWorkouts.length > 0,
      progress: todaysWorkouts.length > 0 ? 1 : 0,
    },
    {
      id: "cal",
      label: t('home_hit_calorie'),
      xp: "+50 XP",
      icon: <Target size={16} color="#4A7C59" strokeWidth={1.5} />,
      color: "#4A7C59",
      done: calProgress >= 0.95,
      progress: calProgress,
    },
    {
      id: "protein",
      label: t('home_hit_protein'),
      xp: "+30 XP",
      icon: <Award size={16} color="#D4A053" strokeWidth={1.5} />,
      color: "#D4A053",
      done: proteinProgress >= 0.95,
      progress: proteinProgress,
    },
  ], [todaysRuns.length, todaysWorkouts.length, calProgress, proteinProgress, t]);

  const completedCount = quests.filter(q => q.done).length;

  return (
    <Animated.View style={[questStyles.container, { opacity: fadeIn }]}>
      <View style={questStyles.header}>
        <View style={questStyles.headerLeft}>
          <Crown size={14} color="#D4A053" strokeWidth={1.5} />
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
              <View style={[questStyles.questFill, { width: `${quest.progress * 100}%`, backgroundColor: quest.done ? quest.color : quest.color + "60" }]} />
            </View>
          </View>
          <Text style={[questStyles.xpTag, { color: quest.done ? quest.color : "#C7C7CC" }]}>{quest.xp}</Text>
          {quest.done && (
            <View style={[questStyles.checkMark, { backgroundColor: quest.color + "15" }]}>
              <Text style={{ fontSize: 10, color: quest.color }}>✓</Text>
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
    { label: t('home_run'), value: stats.runStreak, color: "#4A7C59", icon: <Footprints size={14} color={stats.runStreak > 0 ? "#4A7C59" : "#C7C7CC"} strokeWidth={1.5} /> },
    { label: t('home_food'), value: stats.foodStreak, color: "#D4A053", icon: <UtensilsCrossed size={14} color={stats.foodStreak > 0 ? "#D4A053" : "#C7C7CC"} strokeWidth={1.5} /> },
    { label: t('home_gym'), value: stats.workoutStreak, color: "#E8725A", icon: <Dumbbell size={14} color={stats.workoutStreak > 0 ? "#E8725A" : "#C7C7CC"} strokeWidth={1.5} /> },
  ];

  const totalStreak = streaks.reduce((a, s) => a + s.value, 0);

  return (
    <Animated.View style={[streakStyles.strip, { opacity: enterAnim }]}>
      <View style={streakStyles.flameWrap}>
        <Flame size={18} color={totalStreak > 0 ? "#E8725A" : "#C7C7CC"} fill={totalStreak > 0 ? "#E8725A" : "none"} strokeWidth={1.5} />
      </View>
      <View style={streakStyles.items}>
        {streaks.map((s) => (
          <View key={s.label} style={[streakStyles.item, s.value > 0 && { backgroundColor: s.color + "08" }]}>
            {s.icon}
            <Text style={[streakStyles.val, s.value > 0 && { color: "#1A1A1A" }]}>{s.value}</Text>
            <Text style={[streakStyles.lbl, s.value > 0 && { color: s.color }]}>{s.label}</Text>
          </View>
        ))}
      </View>
      {totalStreak >= 3 && (
        <View style={streakStyles.bonusTag}>
          <Zap size={9} color="#D4A053" fill="#D4A053" />
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
    { label: t('home_protein'), value: nutrition.protein, goal: nutrition.proteinGoal, color: "#E8725A", short: "P" },
    { label: t('home_carbs_short'), value: nutrition.carbs, goal: nutrition.carbsGoal, color: "#4A7C59", short: "C" },
    { label: t('home_fat'), value: nutrition.fat, goal: nutrition.fatGoal, color: "#D4A053", short: "F" },
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
            <UtensilsCrossed size={15} color="#E8725A" strokeWidth={1.5} />
          </View>
          <View style={nutStyles.headerTitleArea}>
            <Text style={nutStyles.heading}>{t('home_todays_fuel')}</Text>
            <Text style={nutStyles.headerSub}>
              {isGoalHit ? t('home_goal_reached') : t('home_kcal_remaining', { cal: String(calRemaining) })}
            </Text>
          </View>
          <View style={nutStyles.headerArrow}>
            <ChevronRight size={16} color="#C7C7CC" strokeWidth={1.5} />
          </View>
        </View>

        <View style={nutStyles.body}>
          <View style={nutStyles.dialArea}>
            <Svg width={dialSize} height={dialSize}>
              <Defs>
                <SvgGradient id="fuelRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={isGoalHit ? "#34A853" : "#4A7C59"} stopOpacity="1" />
                  <Stop offset="1" stopColor={isGoalHit ? "#34A853" : "#4A7C59"} stopOpacity="0.4" />
                </SvgGradient>
              </Defs>
              <Circle cx={dialSize / 2} cy={dialSize / 2} r={r} stroke="rgba(0,0,0,0.04)" strokeWidth={stroke} fill="none" />
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
                  <Text style={nutStyles.macroLabel} numberOfLines={1}>{m.label}</Text>
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
    { value: stats.weeklyMiles.toFixed(1), unit: "mi", label: t('home_distance'), color: "#4A7C59", icon: <Route size={20} color="#4A7C59" strokeWidth={1.5} /> },
    { value: `${stats.weeklyRuns}`, unit: "", label: t('home_runs'), color: "#6E6E73", icon: <Footprints size={20} color="#6E6E73" strokeWidth={1.5} /> },
    { value: formatTime(stats.weeklyTime), unit: "", label: t('home_active_time'), color: "#E8725A", icon: <Timer size={20} color="#E8725A" strokeWidth={1.5} /> },
    { value: `${stats.weeklyWorkouts}`, unit: "", label: t('home_workouts'), color: "#D4A053", icon: <Dumbbell size={20} color="#D4A053" strokeWidth={1.5} /> },
  ];

  return (
    <Animated.View style={[weekStyles.container, { opacity: fadeIn }]}>
      <View style={weekStyles.headerRow}>
        <TrendingUp size={15} color="#6E6E73" strokeWidth={1.5} />
        <Text style={weekStyles.heading}>{t('home_this_week')}</Text>
      </View>
      <View style={weekStyles.grid}>
        {items.map((item) => (
          <View key={item.label} style={weekStyles.cell}>
            <View style={weekStyles.cellTop}>
              <View style={[weekStyles.cellIcon, { backgroundColor: item.color + "0A" }]}>
                {item.icon}
              </View>
              <Text style={weekStyles.cellLabel}>{item.label}</Text>
            </View>
            <Text style={weekStyles.cellValue}>
              {item.value}
              {item.unit ? <Text style={[weekStyles.cellUnit, { color: item.color }]}> {item.unit}</Text> : null}
            </Text>
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
      case "run": return <Footprints size={12} color="#4A7C59" strokeWidth={1.5} />;
      case "workout": return <Dumbbell size={12} color="#E8725A" strokeWidth={1.5} />;
      case "food": return <UtensilsCrossed size={12} color="#D4A053" strokeWidth={1.5} />;
      case "nutrition_goal": return <Award size={12} color="#D4A053" strokeWidth={1.5} />;
      case "streak": return <Flame size={12} color="#E8725A" strokeWidth={1.5} />;
      default: return <Zap size={12} color="#6E6E73" strokeWidth={1.5} />;
    }
  };

  const getColor = (source: string) => {
    switch (source) {
      case "run": return "#4A7C59";
      case "workout": return "#E8725A";
      case "food": return "#D4A053";
      case "nutrition_goal": return "#D4A053";
      case "streak": return "#E8725A";
      default: return "#6E6E73";
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
        <Zap size={13} color="#A1A1A6" strokeWidth={1.5} />
        <Text style={feedStyles.heading}>{t('home_xp_activity')}</Text>
        <Text style={feedStyles.total}>{t('home_total').replace('{xp}', xpInfo.totalXP.toLocaleString())}</Text>
      </View>
      <View style={feedStyles.timeline}>
        {recentEvents.map((event, index) => (
          <View key={event.id} style={feedStyles.row}>
            <View style={feedStyles.timelineLeft}>
              <View style={[feedStyles.timelineDot, { backgroundColor: getColor(event.source) + "10", borderColor: getColor(event.source) + "30" }]}>
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
  const { t, setLanguage, language } = useLanguage();
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
          <Text style={styles.levelChipText}>Lv {xpInfo.level}</Text>
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
            tintColor="#4A7C59"
            colors={["#4A7C59"]}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        <HeroSection />
        <StreakStrip />
        <DailyQuests />
        <TodayNutrition />
        <WeeklyStats />
        <XPFeed />
        <View style={styles.langToggleRow}>
          <Pressable
            onPress={() => setLanguage(language === 'es' ? 'en' : 'es')}
            style={[styles.langToggle, language === 'es' && styles.langToggleActive]}
          >
            <Globe size={13} color={language === 'es' ? '#4A7C59' : '#A1A1A6'} strokeWidth={1.5} />
            <Text style={[styles.langToggleText, language === 'es' && styles.langToggleTextActive]}>
              {language === 'es' ? 'English' : 'Español'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
            style={[styles.langToggle, language === 'pt' && styles.langToggleActive]}
          >
            <Globe size={13} color={language === 'pt' ? '#4A7C59' : '#A1A1A6'} strokeWidth={1.5} />
            <Text style={[styles.langToggleText, language === 'pt' && styles.langToggleTextActive]}>
              {language === 'pt' ? 'English' : 'Português'}
            </Text>
          </Pressable>
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3EDE4",
  },
  topBar: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: "#F3EDE4",
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    justifyContent: "space-between" as const,
    gap: 10,
  },
  greetingText: {
    fontSize: 30,
    fontWeight: "400" as const,
    color: "#2C2C2C",
    letterSpacing: -0.3,
    flexShrink: 1,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subGreeting: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#A8A8A0",
    marginTop: 2,
  },
  levelChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(74,124,89,0.15)",
    backgroundColor: "rgba(74,124,89,0.06)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 2,
    flexShrink: 0,
  },
  levelChipText: {
    fontSize: 14,
    fontWeight: "600" as const,
    letterSpacing: -0.3,
    color: "#4A7C59",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
    gap: 16,
  },
  langToggleRow: {
    flexDirection: "column" as const,
    alignItems: "center" as const,
    gap: 8,
    marginTop: 4,
  },
  langToggle: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignSelf: "center" as const,
  },
  langToggleActive: {
    backgroundColor: "rgba(74,124,89,0.08)",
  },
  langToggleText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#A8A8A0",
    letterSpacing: 0.2,
  },
  langToggleTextActive: {
    color: "#4A7C59",
    fontWeight: "600" as const,
  },
});

const heroStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FEFCF9",
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 18,
    paddingHorizontal: 24,
    alignItems: "center" as const,
    overflow: "hidden" as const,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  ringCol: {
    alignItems: "center" as const,
    marginBottom: 14,
  },
  ringWrap: {
    width: 150,
    height: 150,
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
    fontWeight: "300" as const,
    letterSpacing: -2,
    lineHeight: 48,
    color: "#2C2C2C",
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  levelLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#A8A8A0",
    letterSpacing: 2,
    marginTop: 6,
  },
  rankTag: {
    alignSelf: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(74,124,89,0.08)",
    marginBottom: 18,
  },
  rankTagText: {
    fontSize: 12,
    fontWeight: "600" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    color: "#4A7C59",
  },
  xpRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    width: "100%" as const,
    marginBottom: 8,
  },
  xpLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden" as const,
    backgroundColor: "rgba(0,0,0,0.04)",
    width: "100%" as const,
  },
  progressTrack: {
    flex: 1,
    position: "relative" as const,
  },
  progressFill: {
    height: "100%" as const,
    borderRadius: 2,
    backgroundColor: "#4A7C59",
  },
  xpToGo: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#A1A1A6",
  },
  bottomStrip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
    gap: 28,
    width: "100%" as const,
  },
  statChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  statChipValue: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#2C2C2C",
    letterSpacing: -0.3,
  },
  statChipLabel: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#A8A8A0",
  },
});

const questStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FEFCF9",
    borderRadius: 20,
    padding: 18,
    overflow: "hidden" as const,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
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
    fontSize: 16,
    fontWeight: "400" as const,
    color: "#2C2C2C",
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  completedBadge: {
    backgroundColor: "rgba(212,160,83,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  completedText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#D4A053",
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 8,
    position: "relative" as const,
  },
  leftAccent: {
    position: "absolute" as const,
    left: -18,
    top: 4,
    bottom: 4,
    width: 3,
    borderRadius: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
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
    fontWeight: "500" as const,
    color: "#2C2C2C",
  },
  questDone: {
    color: "#A8A8A0",
    textDecorationLine: "line-through" as const,
  },
  questTrack: {
    height: 3,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  questFill: {
    height: "100%" as const,
    borderRadius: 2,
  },
  xpTag: {
    fontSize: 12,
    fontWeight: "600" as const,
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
    backgroundColor: "#FEFCF9",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    overflow: "hidden" as const,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
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
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  val: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#C2BDB4",
    letterSpacing: -0.5,
  },
  lbl: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#C2BDB4",
  },
  bonusTag: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    backgroundColor: "rgba(212,160,83,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bonusText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#D4A053",
  },
});

const nutStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FEFCF9",
    borderRadius: 24,
    padding: 20,
    overflow: "hidden" as const,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
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
    backgroundColor: "rgba(232,114,90,0.08)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerTitleArea: {
    flex: 1,
    gap: 1,
  },
  heading: {
    fontSize: 17,
    fontWeight: "400" as const,
    color: "#2C2C2C",
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#A8A8A0",
  },
  headerArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  body: {
    alignItems: "center" as const,
    marginBottom: 20,
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
    fontWeight: "300" as const,
    color: "#2C2C2C",
    letterSpacing: -1,
    lineHeight: 28,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  calDivider: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#A8A8A0",
    marginTop: 1,
  },
  calUnit: {
    fontSize: 9,
    fontWeight: "500" as const,
    color: "#C2BDB4",
    marginTop: -1,
  },
  macroSection: {
    flexDirection: "row" as const,
    gap: 8,
  },
  macroCard: {
    flex: 1,
    backgroundColor: "#F0EBE3",
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
    fontWeight: "500" as const,
    color: "#7A7A7A",
    flexShrink: 1,
  },
  macroValues: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    gap: 3,
  },
  macroVal: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#2C2C2C",
    letterSpacing: -0.5,
  },
  macroGoalText: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#A8A8A0",
  },
  macroTrack: {
    height: 3,
    backgroundColor: "rgba(0,0,0,0.04)",
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
    backgroundColor: "#FEFCF9",
    borderRadius: 24,
    padding: 20,
    overflow: "hidden" as const,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
    marginBottom: 16,
  },
  heading: {
    fontSize: 16,
    fontWeight: "400" as const,
    color: "#2C2C2C",
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
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
    backgroundColor: "#F0EBE3",
    borderRadius: 18,
    padding: 14,
    overflow: "hidden" as const,
    position: "relative" as const,
    minHeight: 100,
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
    fontWeight: "300" as const,
    color: "#2C2C2C",
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -1,
  },
  cellUnit: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: "500" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    flexShrink: 1,
    color: "#7A7A7A",
  },
});


const feedStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FEFCF9",
    borderRadius: 20,
    padding: 18,
    overflow: "hidden" as const,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 14,
  },
  heading: {
    fontSize: 16,
    fontWeight: "400" as const,
    color: "#2C2C2C",
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  total: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#A8A8A0",
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
    width: 1,
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
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
    fontWeight: "500" as const,
    color: "#2C2C2C",
    marginRight: 8,
  },
  time: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#C2BDB4",
  },
  amount: {
    fontSize: 14,
    fontWeight: "600" as const,
    letterSpacing: -0.3,
  },
});
