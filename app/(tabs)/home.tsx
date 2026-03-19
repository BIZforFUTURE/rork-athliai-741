import React, { useMemo, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Animated,
  Pressable,
  Platform,
  Easing,
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
  Lock,
  User,
  Beef,
  Cookie,
  Droplets,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useApp } from "@/providers/AppProvider";
import { useRouter } from "expo-router";
import { RANKS } from "@/constants/xp";

function useGreeting() {
  return useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return { text: "Night owl mode", emoji: "🦉" };
    if (hour < 12) return { text: "Good morning", emoji: "🌅" };
    if (hour < 17) return { text: "Good afternoon", emoji: "☀️" };
    if (hour < 21) return { text: "Good evening", emoji: "🌙" };
    return { text: "Night owl mode", emoji: "🦉" };
  }, []);
}

function ProfileHeader() {
  const { xpInfo, user, stats } = useApp();
  const greeting = useGreeting();
  const insets = useSafeAreaInsets();
  const fadeIn = useRef(new Animated.Value(0)).current;

  const totalStreak = stats.runStreak + stats.foodStreak + stats.workoutStreak;
  const avatarProgress = Math.min(xpInfo.progress, 1);
  const avatarRingSize = 44;
  const avatarStroke = 2.5;
  const avatarR = (avatarRingSize - avatarStroke) / 2;
  const avatarCirc = 2 * Math.PI * avatarR;
  const avatarOffset = avatarCirc * (1 - avatarProgress);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeIn]);

  return (
    <Animated.View style={[headerStyles.container, { paddingTop: insets.top + 8, opacity: fadeIn }]}>
      <View style={headerStyles.left}>
        <View style={headerStyles.avatarWrap}>
          <Svg width={avatarRingSize} height={avatarRingSize} style={headerStyles.avatarRingSvg}>
            <Circle
              cx={avatarRingSize / 2} cy={avatarRingSize / 2} r={avatarR}
              stroke="rgba(255,255,255,0.08)" strokeWidth={avatarStroke} fill="none"
            />
            <Circle
              cx={avatarRingSize / 2} cy={avatarRingSize / 2} r={avatarR}
              stroke={xpInfo.rank.color} strokeWidth={avatarStroke} fill="none"
              strokeDasharray={`${avatarCirc}`} strokeDashoffset={avatarOffset}
              strokeLinecap="round" transform={`rotate(-90 ${avatarRingSize / 2} ${avatarRingSize / 2})`}
            />
          </Svg>
          <View style={[headerStyles.avatarInner, { backgroundColor: xpInfo.rank.color + "18" }]}>
            <User size={18} color={xpInfo.rank.color} />
          </View>
        </View>
        <View style={headerStyles.textBlock}>
          <Text style={headerStyles.greeting}>{greeting.text} {greeting.emoji}</Text>
          {user.name ? (
            <Text style={headerStyles.userName}>{user.name}</Text>
          ) : null}
        </View>
      </View>
      <View style={headerStyles.right}>
        {totalStreak > 0 && (
          <View style={headerStyles.streakBadge}>
            <Flame size={12} color="#F59E0B" fill="#F59E0B" />
            <Text style={headerStyles.streakNum}>{totalStreak}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function MotivationBanner() {
  const { xpInfo } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const xpRemaining = xpInfo.neededXP - xpInfo.currentXP;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }).start();
  }, [fadeIn]);

  const message = useMemo(() => {
    if (xpRemaining <= 20) return `Almost there! Just ${xpRemaining} XP to level up`;
    if (xpRemaining <= 50) return `You're ${xpRemaining} XP away from leveling up`;
    if (xpInfo.progress > 0.5) return `Over halfway to Level ${xpInfo.level + 1}! Keep grinding`;
    return `${xpRemaining} XP to reach Level ${xpInfo.level + 1}`;
  }, [xpRemaining, xpInfo.progress, xpInfo.level]);

  return (
    <Animated.View style={[motivStyles.container, { opacity: fadeIn }]}>
      <Zap size={14} color="#F59E0B" fill="#F59E0B" />
      <Text style={motivStyles.text}>{message}</Text>
    </Animated.View>
  );
}

function HeroSection() {
  const { xpInfo } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.4)).current;

  const currentIdx = RANKS.findIndex(r => r.title === xpInfo.rank.title);
  const nextRank = currentIdx < RANKS.length - 1 ? RANKS[currentIdx + 1] : null;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ringAnim, { toValue: 1, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 0.8, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.4, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [fadeIn, slideUp, ringAnim, glowPulse]);

  const ringSize = 150;
  const ringStroke = 10;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;

  const xpRemaining = xpInfo.neededXP - xpInfo.currentXP;

  const milestones = useMemo(() => {
    const marks: { level: number; position: number }[] = [];
    if (!nextRank) return marks;
    const totalForCurrent = currentIdx > 0 ? RANKS[currentIdx].minLevel : 1;
    const totalForNext = nextRank.minLevel;
    const range = totalForNext - totalForCurrent;
    for (let lv = totalForCurrent + 1; lv < totalForNext; lv++) {
      const pos = (lv - totalForCurrent) / range;
      marks.push({ level: lv, position: pos });
    }
    return marks;
  }, [currentIdx, nextRank]);

  const rankProgress = useMemo(() => {
    if (!nextRank) return 1;
    const totalForCurrent = currentIdx > 0 ? RANKS[currentIdx].minLevel : 1;
    const totalForNext = nextRank.minLevel;
    return Math.min((xpInfo.level - totalForCurrent) / (totalForNext - totalForCurrent), 1);
  }, [currentIdx, nextRank, xpInfo.level]);

  return (
    <Animated.View style={[heroStyles.container, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <Animated.View style={[heroStyles.glowLayer, { backgroundColor: xpInfo.rank.color, opacity: glowPulse }]} />

      <View style={heroStyles.topRow}>
        <View style={[heroStyles.rankBadge, { backgroundColor: xpInfo.rank.color + "20", borderColor: xpInfo.rank.color + "40" }]}>
          <Text style={heroStyles.rankEmoji}>{xpInfo.rank.emoji}</Text>
          <Text style={[heroStyles.rankTitle, { color: xpInfo.rank.color }]}>{xpInfo.rank.title}</Text>
        </View>
        <View style={heroStyles.totalXpBadge}>
          <Zap size={11} color={xpInfo.rank.color} />
          <Text style={[heroStyles.totalXpText, { color: xpInfo.rank.color }]}>{xpInfo.totalXP.toLocaleString()} XP</Text>
        </View>
      </View>

      <View style={heroStyles.centerBlock}>
        <View style={heroStyles.ringArea}>
          <View style={[heroStyles.ringGlow, { shadowColor: xpInfo.rank.color }]} />
          <Svg width={ringSize} height={ringSize}>
            <Defs>
              <SvgGradient id="heroRingGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={xpInfo.rank.color} stopOpacity="1" />
                <Stop offset="1" stopColor={xpInfo.rank.color} stopOpacity="0.3" />
              </SvgGradient>
            </Defs>
            <Circle
              cx={ringSize / 2} cy={ringSize / 2} r={ringRadius}
              stroke="rgba(255,255,255,0.04)" strokeWidth={ringStroke} fill="none"
            />
            <Circle
              cx={ringSize / 2} cy={ringSize / 2} r={ringRadius}
              stroke="url(#heroRingGrad)" strokeWidth={ringStroke} fill="none"
              strokeDasharray={`${ringCircumference}`}
              strokeDashoffset={ringCircumference * (1 - Math.min(Math.max(xpInfo.progress, 0), 1))}
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
          <View style={heroStyles.xpSection}>
            <View style={heroStyles.xpNumbers}>
              <Text style={heroStyles.xpCurrent}>{xpInfo.currentXP}</Text>
              <Text style={heroStyles.xpSep}>/</Text>
              <Text style={heroStyles.xpNeeded}>{xpInfo.neededXP}</Text>
              <Text style={heroStyles.xpLabel}>XP</Text>
            </View>
            <View style={heroStyles.xpBarOuter}>
              <Animated.View
                style={[heroStyles.xpBarFill, {
                  width: ringAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", `${xpInfo.progress * 100}%`],
                  }),
                  backgroundColor: xpInfo.rank.color,
                }]}
              />
              <View style={[heroStyles.xpBarGlow, { backgroundColor: xpInfo.rank.color }]} />
            </View>
          </View>

          <Text style={[heroStyles.xpRemaining, { color: xpInfo.rank.color }]}>
            {xpRemaining} XP to Level {xpInfo.level + 1}
          </Text>

          {nextRank && (
            <View style={heroStyles.milestoneTrack}>
              <View style={heroStyles.milestoneBar}>
                <View style={[heroStyles.milestoneFill, { width: `${rankProgress * 100}%`, backgroundColor: nextRank.color + "60" }]} />
              </View>
              <View style={heroStyles.milestoneLabels}>
                <Text style={[heroStyles.milestoneLv, { color: xpInfo.rank.color }]}>Lv {xpInfo.level}</Text>
                {milestones.filter((_, i) => i % 2 === 0).slice(0, 3).map(m => (
                  <View key={m.level} style={[heroStyles.milestoneDot, { left: `${m.position * 100}%` }]}>
                    <View style={[heroStyles.milestoneDotInner, { backgroundColor: xpInfo.level >= m.level ? nextRank.color : "rgba(255,255,255,0.1)" }]} />
                  </View>
                ))}
                <Text style={heroStyles.milestoneLvEnd}>Lv {nextRank.minLevel}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {nextRank && (
        <View style={heroStyles.nextRankCard}>
          <View style={heroStyles.nextRankLocked}>
            <Lock size={12} color="#4B5563" />
          </View>
          <View style={heroStyles.nextRankInfo}>
            <Text style={heroStyles.nextRankEmoji}>{nextRank.emoji}</Text>
            <View>
              <Text style={[heroStyles.nextRankName, { color: nextRank.color + "80" }]}>{nextRank.title}</Text>
              <Text style={heroStyles.nextRankUnlock}>Unlock at Level {nextRank.minLevel}</Text>
            </View>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

function ActivityCards() {
  const { stats } = useApp();
  const router = useRouter();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }).start();
  }, [fadeIn]);

  const activities = useMemo(() => [
    {
      label: "Runs",
      value: stats.weeklyRuns,
      icon: Footprints,
      color: "#3B9EFF",
      bgColor: "#3B9EFF12",
      borderColor: "#3B9EFF20",
      route: "/(tabs)/run" as const,
    },
    {
      label: "Meals",
      value: stats.foodStreak > 0 ? stats.foodStreak : 0,
      icon: UtensilsCrossed,
      color: "#34D399",
      bgColor: "#34D39912",
      borderColor: "#34D39920",
      route: "/(tabs)/nutrition" as const,
    },
    {
      label: "Lifts",
      value: stats.weeklyWorkouts,
      icon: Dumbbell,
      color: "#FB923C",
      bgColor: "#FB923C12",
      borderColor: "#FB923C20",
      route: "/(tabs)/gym" as const,
    },
  ], [stats.weeklyRuns, stats.foodStreak, stats.weeklyWorkouts]);

  const handlePress = useCallback((route: string) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route as never);
  }, [router]);

  return (
    <Animated.View style={[actStyles.row, { opacity: fadeIn }]}>
      {activities.map((a) => (
        <AnimatedCard key={a.label} activity={a} onPress={() => handlePress(a.route)} />
      ))}
    </Animated.View>
  );
}

const AnimatedCard = React.memo(function AnimatedCard({
  activity,
  onPress,
}: {
  activity: { label: string; value: number; icon: React.ComponentType<{ size: number; color: string }>; color: string; bgColor: string; borderColor: string };
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const Icon = activity.icon;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  }, [scale]);

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={actStyles.cardWrap}>
      <Animated.View style={[actStyles.card, { backgroundColor: activity.bgColor, borderColor: activity.borderColor, transform: [{ scale }] }]}>
        <View style={[actStyles.iconCircle, { backgroundColor: activity.color + "18" }]}>
          <Icon size={18} color={activity.color} />
        </View>
        <Text style={[actStyles.cardValue, { color: activity.color }]}>{activity.value}</Text>
        <Text style={actStyles.cardLabel}>{activity.label}</Text>
      </Animated.View>
    </Pressable>
  );
});

function StreakStrip() {
  const { stats } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const flameScale = useRef(new Animated.Value(1)).current;

  const streaks = useMemo(() => [
    { label: "Run", value: stats.runStreak, color: "#3B9EFF", active: stats.runStreak > 0 },
    { label: "Food", value: stats.foodStreak, color: "#34D399", active: stats.foodStreak > 0 },
    { label: "Gym", value: stats.workoutStreak, color: "#FB923C", active: stats.workoutStreak > 0 },
  ], [stats.runStreak, stats.foodStreak, stats.workoutStreak]);

  const anyActive = streaks.some(s => s.active);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 250, useNativeDriver: true }).start();
    if (anyActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(flameScale, { toValue: 1.2, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(flameScale, { toValue: 0.9, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(flameScale, { toValue: 1, duration: 300, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    }
  }, [fadeIn, flameScale, anyActive]);

  return (
    <Animated.View style={[streakStyles.strip, { opacity: fadeIn }]}>
      <Animated.View style={{ transform: [{ scale: flameScale }] }}>
        <Flame size={18} color={anyActive ? "#F59E0B" : "#2A2E35"} fill={anyActive ? "#F59E0B" : "none"} />
      </Animated.View>
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
          <Text style={streakStyles.bonusText}>Active</Text>
        </View>
      )}
    </Animated.View>
  );
}

function TodayNutrition() {
  const { nutrition } = useApp();
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }),
      Animated.timing(barAnim, { toValue: 1, duration: 1000, delay: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
  }, [fadeIn, barAnim]);

  const calPct = nutrition.calorieGoal > 0 ? Math.min(nutrition.calories / nutrition.calorieGoal, 1) : 0;
  const calRemaining = Math.max(0, nutrition.calorieGoal - nutrition.calories);

  const macros = useMemo(() => [
    { label: "Protein", icon: Beef, value: nutrition.protein, goal: nutrition.proteinGoal, color: "#3B9EFF", remaining: Math.max(0, nutrition.proteinGoal - nutrition.protein), unit: "g" },
    { label: "Carbs", icon: Cookie, value: nutrition.carbs, goal: nutrition.carbsGoal, color: "#F59E0B", remaining: Math.max(0, nutrition.carbsGoal - nutrition.carbs), unit: "g" },
    { label: "Fat", icon: Droplets, value: nutrition.fat, goal: nutrition.fatGoal, color: "#A78BFA", remaining: Math.max(0, nutrition.fatGoal - nutrition.fat), unit: "g" },
  ], [nutrition]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  }, [scale]);

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/nutrition")}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[nutStyles.card, { opacity: fadeIn, transform: [{ scale }] }]}>
        <View style={nutStyles.header}>
          <Text style={nutStyles.heading}>Today's Fuel</Text>
          <View style={nutStyles.calBadge}>
            <Text style={nutStyles.calNum}>{nutrition.calories}</Text>
            <Text style={nutStyles.calSep}>/</Text>
            <Text style={nutStyles.calGoal}>{nutrition.calorieGoal}</Text>
            <Text style={nutStyles.calUnit}>cal</Text>
          </View>
        </View>

        <View style={nutStyles.calBar}>
          <Animated.View style={[nutStyles.calBarFill, {
            width: barAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", `${calPct * 100}%`],
            }),
          }]} />
        </View>
        <Text style={nutStyles.calRemaining}>{calRemaining} cal remaining</Text>

        <View style={nutStyles.macroList}>
          {macros.map((m) => {
            const pct = m.goal > 0 ? Math.min(m.value / m.goal, 1) : 0;
            const Icon = m.icon;
            return (
              <View key={m.label} style={nutStyles.macroRow}>
                <View style={[nutStyles.macroIconWrap, { backgroundColor: m.color + "14" }]}>
                  <Icon size={13} color={m.color} />
                </View>
                <Text style={nutStyles.macroLabel}>{m.label}</Text>
                <View style={nutStyles.macroBarWrap}>
                  <View style={nutStyles.macroBarTrack}>
                    <Animated.View style={[nutStyles.macroBarFill, {
                      backgroundColor: m.color,
                      width: barAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", `${pct * 100}%`],
                      }),
                    }]} />
                  </View>
                </View>
                <Text style={[nutStyles.macroRemaining, { color: m.color }]}>
                  {m.remaining}{m.unit}
                </Text>
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
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 400, useNativeDriver: true }).start();
  }, [fadeIn]);

  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, []);

  const items = useMemo(() => [
    { value: stats.weeklyMiles.toFixed(1), unit: "mi", label: "Distance", color: "#3B9EFF" },
    { value: `${stats.weeklyRuns}`, unit: "", label: "Runs", color: "#34D399" },
    { value: formatTime(stats.weeklyTime), unit: "", label: "Active", color: "#FB923C" },
    { value: `${stats.weeklyWorkouts}`, unit: "", label: "Lifts", color: "#A78BFA" },
  ], [stats, formatTime]);

  return (
    <Animated.View style={[weekStyles.container, { opacity: fadeIn }]}>
      <Text style={weekStyles.heading}>This Week</Text>
      <View style={weekStyles.grid}>
        {items.map((item) => (
          <View key={item.label} style={weekStyles.cell}>
            <Text style={weekStyles.cellValue}>
              {item.value}
              {item.unit ? <Text style={[weekStyles.cellUnit, { color: item.color }]}> {item.unit}</Text> : null}
            </Text>
            <Text style={weekStyles.cellLabel}>{item.label}</Text>
            <View style={[weekStyles.cellAccent, { backgroundColor: item.color }]} />
          </View>
        ))}
      </View>
    </Animated.View>
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
      case "run": return <Footprints size={13} color="#3B9EFF" />;
      case "workout": return <Dumbbell size={13} color="#FB923C" />;
      case "food": return <UtensilsCrossed size={13} color="#34D399" />;
      case "nutrition_goal": return <Award size={13} color="#F59E0B" />;
      case "streak": return <Flame size={13} color="#F59E0B" />;
      default: return <Zap size={13} color="#6B7280" />;
    }
  };

  const getColor = (source: string) => {
    switch (source) {
      case "run": return "#3B9EFF";
      case "workout": return "#FB923C";
      case "food": return "#34D399";
      case "nutrition_goal": return "#F59E0B";
      case "streak": return "#F59E0B";
      default: return "#6B7280";
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

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <ProfileHeader />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <MotivationBanner />
        <HeroSection />
        <ActivityCards />
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
    backgroundColor: "#08090C",
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

const headerStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: "#08090C",
  },
  left: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  avatarRingSvg: {
    position: "absolute" as const,
  },
  avatarInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  textBlock: {
    gap: 1,
  },
  greeting: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#6B7280",
    letterSpacing: -0.2,
  },
  userName: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -0.5,
  },
  right: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  streakBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(245,158,11,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.15)",
  },
  streakNum: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: "#F59E0B",
  },
});

const motivStyles = StyleSheet.create({
  container: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "rgba(245,158,11,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.1)",
  },
  text: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#D4A017",
    flex: 1,
    letterSpacing: -0.2,
  },
});

const heroStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0E1117",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden" as const,
  },
  glowLayer: {
    position: "absolute" as const,
    top: -60,
    left: "20%" as const,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.08,
  },
  topRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 18,
  },
  rankBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  rankEmoji: {
    fontSize: 16,
  },
  rankTitle: {
    fontSize: 14,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
  totalXpBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    gap: 18,
  },
  ringArea: {
    width: 150,
    height: 150,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ringGlow: {
    position: "absolute" as const,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.15,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
      },
      android: {
        elevation: 8,
      },
      web: {},
    }),
  },
  ringInner: {
    position: "absolute" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  levelNum: {
    fontSize: 52,
    fontWeight: "900" as const,
    letterSpacing: -3,
  },
  levelLabel: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: "#4B5563",
    letterSpacing: 3,
    marginTop: -4,
  },
  infoBlock: {
    flex: 1,
    gap: 10,
  },
  xpSection: {
    gap: 6,
  },
  xpNumbers: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    gap: 2,
  },
  xpCurrent: {
    fontSize: 26,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  xpSep: {
    fontSize: 16,
    fontWeight: "500" as const,
    color: "#2A2E35",
    marginHorizontal: 2,
  },
  xpNeeded: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#374151",
  },
  xpLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#374151",
    marginLeft: 4,
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
  xpBarGlow: {
    position: "absolute" as const,
    right: 0,
    top: 0,
    width: 20,
    height: "100%" as const,
    opacity: 0,
    borderRadius: 3,
  },
  xpRemaining: {
    fontSize: 13,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  milestoneTrack: {
    marginTop: 2,
    gap: 4,
  },
  milestoneBar: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  milestoneFill: {
    height: "100%" as const,
    borderRadius: 2,
  },
  milestoneLabels: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  milestoneLv: {
    fontSize: 9,
    fontWeight: "700" as const,
  },
  milestoneLvEnd: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: "#374151",
  },
  milestoneDot: {
    position: "absolute" as const,
    top: -6,
  },
  milestoneDotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  nextRankCard: {
    marginTop: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.025)",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  nextRankLocked: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  nextRankInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    flex: 1,
  },
  nextRankEmoji: {
    fontSize: 20,
    opacity: 0.4,
  },
  nextRankName: {
    fontSize: 14,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
  nextRankUnlock: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#374151",
  },
});

const actStyles = StyleSheet.create({
  row: {
    flexDirection: "row" as const,
    gap: 8,
  },
  cardWrap: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    alignItems: "center" as const,
    gap: 8,
    borderWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: "900" as const,
    letterSpacing: -1.5,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
});

const streakStyles = StyleSheet.create({
  strip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#0E1117",
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
    backgroundColor: "#0E1117",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  heading: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#9CA3AF",
  },
  calBadge: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    gap: 2,
  },
  calNum: {
    fontSize: 20,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  calSep: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#2A2E35",
    marginHorizontal: 2,
  },
  calGoal: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#374151",
  },
  calUnit: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#4B5563",
    marginLeft: 3,
  },
  calBar: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden" as const,
    marginBottom: 6,
  },
  calBarFill: {
    height: "100%" as const,
    borderRadius: 3,
    backgroundColor: "#34D399",
  },
  calRemaining: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#4B5563",
    marginBottom: 14,
  },
  macroList: {
    gap: 10,
  },
  macroRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  macroIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#9CA3AF",
    width: 52,
  },
  macroBarWrap: {
    flex: 1,
  },
  macroBarTrack: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden" as const,
  },
  macroBarFill: {
    height: "100%" as const,
    borderRadius: 3,
  },
  macroRemaining: {
    fontSize: 12,
    fontWeight: "700" as const,
    width: 42,
    textAlign: "right" as const,
    letterSpacing: -0.3,
  },
});

const weekStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0E1117",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  heading: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#6B7280",
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "space-between" as const,
  },
  cell: {
    width: "24%" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingVertical: 6,
  },
  cellValue: {
    fontSize: 20,
    fontWeight: "900" as const,
    color: "#F3F4F6",
    letterSpacing: -0.5,
  },
  cellUnit: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  cellLabel: {
    fontSize: 9,
    fontWeight: "600" as const,
    color: "#4B5563",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  cellAccent: {
    width: 16,
    height: 2,
    borderRadius: 1,
    marginTop: 2,
    opacity: 0.5,
  },
});

const feedStyles = StyleSheet.create({
  container: {
    backgroundColor: "#0E1117",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 12,
  },
  heading: {
    fontSize: 15,
    fontWeight: "700" as const,
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
