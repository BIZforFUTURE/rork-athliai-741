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
import { LinearGradient } from "expo-linear-gradient";
import {
  Activity,
  MapPin,
  Target,
  Dumbbell,
  Flame,
  Zap,
  ChevronRight,
  TrendingUp,
  Timer,
  Footprints,
  UtensilsCrossed,
  Sparkles,
  Heart,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useApp } from "@/providers/AppProvider";
import { useRouter } from "expo-router";

function HeroXPCard() {
  const { xpInfo } = useApp();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const badgeScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.spring(badgeScale, {
      toValue: 1,
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [badgeScale]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: xpInfo.progress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [xpInfo.progress, progressAnim]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 2500, useNativeDriver: false }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 2500, useNativeDriver: false }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.7, duration: 1800, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1800, useNativeDriver: false }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, [glowAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.1, 0.4, 0.1],
  });

  const ringProgress = xpInfo.progress;
  const ringSize = 100;
  const ringStroke = 6;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(Math.max(ringProgress, 0), 1));

  return (
    <View style={heroStyles.wrapper}>
      <Animated.View style={[heroStyles.shimmerOverlay, { opacity: shimmerOpacity }]} />

      <View style={heroStyles.topSection}>
        <Animated.View style={[heroStyles.avatarRing, { transform: [{ scale: pulseAnim }] }]}>
          <View style={heroStyles.ringContainer}>
            <Svg width={ringSize} height={ringSize}>
              <Defs>
                <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={xpInfo.rank.color} stopOpacity="0.2" />
                  <Stop offset="1" stopColor={xpInfo.rank.color} stopOpacity="0.05" />
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
                stroke={xpInfo.rank.color}
                strokeWidth={ringStroke}
                fill="none"
                strokeDasharray={`${ringCircumference}`}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              />
            </Svg>
            <View style={heroStyles.emojiCenter}>
              <Text style={heroStyles.rankEmoji}>{xpInfo.rank.emoji}</Text>
            </View>
          </View>
        </Animated.View>

        <View style={heroStyles.levelInfo}>
          <View style={heroStyles.levelRow}>
            <Animated.View style={[heroStyles.levelBadge, { backgroundColor: xpInfo.rank.color + "18", transform: [{ scale: badgeScale }] }]}>
              <Text style={[heroStyles.levelText, { color: xpInfo.rank.color }]}>LV {xpInfo.level}</Text>
            </Animated.View>
            <View style={heroStyles.xpChip}>
              <Sparkles size={10} color="#9CA3AF" />
              <Text style={heroStyles.xpChipText}>{xpInfo.totalXP.toLocaleString()} XP</Text>
            </View>
          </View>
          <Text style={[heroStyles.rankTitle, { color: xpInfo.rank.color }]}>{xpInfo.rank.title}</Text>

          <View style={heroStyles.barOuter}>
            <View style={heroStyles.barTrack}>
              <Animated.View
                style={[heroStyles.barFill, { width: progressWidth, backgroundColor: xpInfo.rank.color }]}
              />
              <Animated.View
                style={[heroStyles.barShine, { width: progressWidth, backgroundColor: xpInfo.rank.color, opacity: glowAnim }]}
              />
            </View>
          </View>
          <View style={heroStyles.xpNumbers}>
            <Text style={heroStyles.xpCurrent}>{xpInfo.currentXP} / {xpInfo.neededXP}</Text>
            <Text style={heroStyles.xpRemaining}>{xpInfo.neededXP - xpInfo.currentXP} to go</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function StreakOrb({
  icon,
  value,
  label,
  color,
  active,
  delay,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  active: boolean;
  delay: number;
}) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, fadeAnim, delay]);

  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, tension: 200, friction: 10 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
    ]).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }, { scale: scaleAnim }], opacity: fadeAnim, flex: 1 }}>
      <Pressable onPress={handlePress}>
        <View style={[streakStyles.orb, active && { borderColor: color + "35" }]}>
          <View style={[streakStyles.iconRing, { backgroundColor: active ? color + "15" : "rgba(255,255,255,0.03)" }]}>
            {icon}
          </View>
          <Text style={streakStyles.orbValue}>{value}</Text>
          <Text style={streakStyles.orbLabel}>{label}</Text>
          {value >= 3 && (
            <View style={[streakStyles.fireBadge, { backgroundColor: color + "20" }]}>
              <Text style={streakStyles.fireEmoji}>🔥</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function NutritionDial() {
  const { nutrition } = useApp();

  const calProgress = nutrition.calorieGoal > 0 ? Math.min(nutrition.calories / nutrition.calorieGoal, 1) : 0;
  const proteinProgress = nutrition.proteinGoal > 0 ? Math.min(nutrition.protein / nutrition.proteinGoal, 1) : 0;
  const carbsProgress = nutrition.carbsGoal > 0 ? Math.min(nutrition.carbs / nutrition.carbsGoal, 1) : 0;
  const fatProgress = nutrition.fatGoal > 0 ? Math.min(nutrition.fat / nutrition.fatGoal, 1) : 0;

  const dialSize = 130;
  const outerStroke = 10;
  const outerR = (dialSize - outerStroke) / 2;
  const outerC = 2 * Math.PI * outerR;
  const outerOffset = outerC * (1 - calProgress);

  const calPercent = Math.round(calProgress * 100);

  return (
    <View style={nutritionStyles.card}>
      <View style={nutritionStyles.headerRow}>
        <View style={nutritionStyles.titleRow}>
          <UtensilsCrossed size={16} color="#FF6B35" strokeWidth={2.5} />
          <Text style={nutritionStyles.title}>Today&apos;s Fuel</Text>
        </View>
        <Text style={nutritionStyles.percentBig}>{calPercent}%</Text>
      </View>

      <View style={nutritionStyles.mainRow}>
        <View style={nutritionStyles.dialWrapper}>
          <Svg width={dialSize} height={dialSize}>
            <Circle
              cx={dialSize / 2}
              cy={dialSize / 2}
              r={outerR}
              stroke="rgba(255, 107, 53, 0.08)"
              strokeWidth={outerStroke}
              fill="none"
            />
            <Circle
              cx={dialSize / 2}
              cy={dialSize / 2}
              r={outerR}
              stroke="#FF6B35"
              strokeWidth={outerStroke}
              fill="none"
              strokeDasharray={`${outerC}`}
              strokeDashoffset={outerOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${dialSize / 2} ${dialSize / 2})`}
            />
          </Svg>
          <View style={nutritionStyles.dialCenter}>
            <Text style={nutritionStyles.dialCalories}>{nutrition.calories}</Text>
            <Text style={nutritionStyles.dialUnit}>kcal</Text>
          </View>
        </View>

        <View style={nutritionStyles.macrosColumn}>
          <MacroBar label="Protein" value={nutrition.protein} goal={nutrition.proteinGoal} color="#00E5FF" progress={proteinProgress} />
          <MacroBar label="Carbs" value={nutrition.carbs} goal={nutrition.carbsGoal} color="#BFFF00" progress={carbsProgress} />
          <MacroBar label="Fat" value={nutrition.fat} goal={nutrition.fatGoal} color="#F59E0B" progress={fatProgress} />
        </View>
      </View>
    </View>
  );
}

function MacroBar({
  label,
  value,
  goal,
  color,
  progress,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
  progress: number;
}) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.min(progress, 1),
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress, widthAnim]);

  const barWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={macroStyles.row}>
      <View style={macroStyles.labelRow}>
        <View style={[macroStyles.dot, { backgroundColor: color }]} />
        <Text style={macroStyles.label}>{label}</Text>
        <Text style={macroStyles.values}>{value}<Text style={macroStyles.goal}>/{goal}g</Text></Text>
      </View>
      <View style={macroStyles.barTrack}>
        <Animated.View style={[macroStyles.barFill, { width: barWidth, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function WeeklyCard({
  icon,
  label,
  value,
  color,
  progress,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  progress: number;
  delay: number;
}) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enterAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }).start();
    Animated.timing(barAnim, { toValue: Math.min(progress, 1), duration: 900, delay: delay + 200, useNativeDriver: false }).start();
  }, [enterAnim, barAnim, progress, delay]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View style={[weeklyStyles.card, { opacity: enterAnim, transform: [{ scale: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
      <View style={[weeklyStyles.iconWrap, { backgroundColor: color + "12" }]}>
        {icon}
      </View>
      <Text style={weeklyStyles.value}>{value}</Text>
      <Text style={weeklyStyles.label}>{label}</Text>
      <View style={weeklyStyles.barTrack}>
        <Animated.View style={[weeklyStyles.barFill, { width: barWidth, backgroundColor: color }]} />
      </View>
    </Animated.View>
  );
}

function RecentActivityFeed() {
  const { xpInfo } = useApp();

  const recentEvents = useMemo(() => {
    return xpInfo.xpEvents.slice(-5).reverse();
  }, [xpInfo.xpEvents]);

  if (recentEvents.length === 0) return null;

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "run": return <Footprints size={14} color="#00E5FF" />;
      case "workout": return <Dumbbell size={14} color="#00ADB5" />;
      case "food": return <UtensilsCrossed size={14} color="#BFFF00" />;
      case "nutrition_goal": return <Target size={14} color="#FF6B35" />;
      case "streak": return <Flame size={14} color="#F59E0B" />;
      default: return <Zap size={14} color="#9CA3AF" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "run": return "#00E5FF";
      case "workout": return "#00ADB5";
      case "food": return "#BFFF00";
      case "nutrition_goal": return "#FF6B35";
      case "streak": return "#F59E0B";
      default: return "#9CA3AF";
    }
  };

  const getTimeAgo = (dateStr: string) => {
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
      <View style={feedStyles.headerRow}>
        <View style={feedStyles.titleRow}>
          <TrendingUp size={16} color="#00E5FF" strokeWidth={2.5} />
          <Text style={feedStyles.title}>Recent XP</Text>
        </View>
        <ChevronRight size={16} color="#4B5563" />
      </View>

      {recentEvents.map((event, index) => (
        <View key={event.id} style={[feedStyles.eventRow, index === recentEvents.length - 1 && { borderBottomWidth: 0 }]}>
          <View style={[feedStyles.eventIconWrap, { backgroundColor: getSourceColor(event.source) + "12" }]}>
            {getSourceIcon(event.source)}
          </View>
          <View style={feedStyles.eventInfo}>
            <Text style={feedStyles.eventDesc} numberOfLines={1}>{event.description}</Text>
            <Text style={feedStyles.eventTime}>{getTimeAgo(event.date)}</Text>
          </View>
          <View style={[feedStyles.xpBadge, { backgroundColor: getSourceColor(event.source) + "15" }]}>
            <Text style={[feedStyles.xpAmount, { color: getSourceColor(event.source) }]}>+{event.amount}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function QuickActionRow() {
  const router = useRouter();
  const scaleAnims = useRef([new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)]).current;

  const handlePress = useCallback((index: number, route: string) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Animated.sequence([
      Animated.spring(scaleAnims[index], { toValue: 0.9, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.spring(scaleAnims[index], { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
    ]).start();
    setTimeout(() => {
      if (route === "run") router.push("/(tabs)/run");
      else if (route === "nutrition") router.push("/(tabs)/nutrition");
      else if (route === "gym") router.push("/(tabs)/gym");
    }, 100);
  }, [router, scaleAnims]);

  const actions = [
    { icon: <Footprints size={20} color="#00E5FF" strokeWidth={2.5} />, label: "Run", color: "#00E5FF", route: "run" },
    { icon: <UtensilsCrossed size={20} color="#BFFF00" strokeWidth={2.5} />, label: "Eat", color: "#BFFF00", route: "nutrition" },
    { icon: <Dumbbell size={20} color="#00ADB5" strokeWidth={2.5} />, label: "Lift", color: "#00ADB5", route: "gym" },
  ];

  return (
    <View style={actionStyles.row}>
      {actions.map((action, i) => (
        <Animated.View key={action.label} style={{ flex: 1, transform: [{ scale: scaleAnims[i] }] }}>
          <Pressable onPress={() => handlePress(i, action.route)} style={[actionStyles.btn, { borderColor: action.color + "20" }]}>
            <View style={[actionStyles.iconCircle, { backgroundColor: action.color + "12" }]}>
              {action.icon}
            </View>
            <Text style={actionStyles.label}>{action.label}</Text>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

function HealthPulse() {
  const { stats, nutrition } = useApp();
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  const activeStreaks = [stats.runStreak, stats.foodStreak, stats.workoutStreak].filter(s => s > 0).length;
  const calHit = nutrition.calorieGoal > 0 && nutrition.calories >= nutrition.calorieGoal;
  const healthScore = Math.min(100, activeStreaks * 20 + (calHit ? 40 : 0));

  const scoreColor = healthScore >= 80 ? "#22C55E" : healthScore >= 50 ? "#F59E0B" : "#EF4444";
  const scoreLabel = healthScore >= 80 ? "On Fire" : healthScore >= 50 ? "Solid" : "Get Moving";

  return (
    <View style={pulseStyles.card}>
      <View style={pulseStyles.headerRow}>
        <View style={pulseStyles.titleRow}>
          <Animated.View style={{ opacity: pulseAnim }}>
            <Heart size={16} color={scoreColor} fill={scoreColor} strokeWidth={2.5} />
          </Animated.View>
          <Text style={pulseStyles.title}>Today&apos;s Pulse</Text>
        </View>
        <View style={[pulseStyles.scoreBadge, { backgroundColor: scoreColor + "18" }]}>
          <Text style={[pulseStyles.scoreText, { color: scoreColor }]}>{scoreLabel}</Text>
        </View>
      </View>
      <View style={pulseStyles.barOuter}>
        <View style={[pulseStyles.barFill, { width: `${healthScore}%`, backgroundColor: scoreColor }]} />
      </View>
      <View style={pulseStyles.checksRow}>
        <View style={pulseStyles.checkItem}>
          <View style={[pulseStyles.checkDot, stats.runStreak > 0 && { backgroundColor: "#00E5FF" }]} />
          <Text style={pulseStyles.checkLabel}>Run</Text>
        </View>
        <View style={pulseStyles.checkItem}>
          <View style={[pulseStyles.checkDot, stats.foodStreak > 0 && { backgroundColor: "#BFFF00" }]} />
          <Text style={pulseStyles.checkLabel}>Food</Text>
        </View>
        <View style={pulseStyles.checkItem}>
          <View style={[pulseStyles.checkDot, stats.workoutStreak > 0 && { backgroundColor: "#00ADB5" }]} />
          <Text style={pulseStyles.checkLabel}>Gym</Text>
        </View>
        <View style={pulseStyles.checkItem}>
          <View style={[pulseStyles.checkDot, calHit && { backgroundColor: "#FF6B35" }]} />
          <Text style={pulseStyles.checkLabel}>Cals</Text>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { stats } = useApp();
  const insets = useSafeAreaInsets();
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [headerFade]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return "Late night grind";
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Late night grind";
  }, []);

  const motivationalLine = useMemo(() => {
    const lines = [
      "Every rep counts toward your next level",
      "Your future self will thank you",
      "Consistency beats intensity",
      "The grind doesn't stop",
      "Level up, one day at a time",
    ];
    return lines[new Date().getDay() % lines.length];
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0A0C10", "#0F1218", "#0A0C10"]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={[styles.headerContent, { opacity: headerFade, transform: [{ translateY: headerFade.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }]}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.headerSubtitle}>{motivationalLine}</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <HeroXPCard />

        <QuickActionRow />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>🔥</Text>
          <Text style={styles.sectionTitle}>Streaks</Text>
        </View>
        <View style={styles.streakRow}>
          <StreakOrb
            icon={<Activity size={20} color="#00E5FF" strokeWidth={2.5} />}
            value={stats.runStreak}
            label="Run"
            color="#00E5FF"
            active={stats.runStreak > 0}
            delay={0}
          />
          <StreakOrb
            icon={<Flame size={20} color="#BFFF00" strokeWidth={2.5} />}
            value={stats.foodStreak}
            label="Food"
            color="#BFFF00"
            active={stats.foodStreak > 0}
            delay={80}
          />
          <StreakOrb
            icon={<Dumbbell size={20} color="#00ADB5" strokeWidth={2.5} />}
            value={stats.workoutStreak}
            label="Gym"
            color="#00ADB5"
            active={stats.workoutStreak > 0}
            delay={160}
          />
        </View>

        <HealthPulse />

        <NutritionDial />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>📊</Text>
          <Text style={styles.sectionTitle}>This Week</Text>
        </View>
        <View style={styles.weeklyRow}>
          <WeeklyCard
            icon={<MapPin size={16} color="#00E5FF" strokeWidth={2.5} />}
            label="Miles"
            value={stats.weeklyMiles.toFixed(1)}
            color="#00E5FF"
            progress={stats.weeklyMiles / 20}
            delay={0}
          />
          <WeeklyCard
            icon={<Footprints size={16} color="#BFFF00" strokeWidth={2.5} />}
            label="Runs"
            value={`${stats.weeklyRuns}`}
            color="#BFFF00"
            progress={stats.weeklyRuns / 5}
            delay={80}
          />
          <WeeklyCard
            icon={<Timer size={16} color="#00ADB5" strokeWidth={2.5} />}
            label="Time"
            value={formatTime(stats.weeklyTime)}
            color="#00ADB5"
            progress={stats.weeklyTime / 3600}
            delay={160}
          />
        </View>

        <RecentActivityFeed />

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerContent: {
    marginTop: 4,
  },
  greetingText: {
    fontSize: 30,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -1,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#4B5563",
    letterSpacing: 0.2,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginTop: 28,
    marginBottom: 14,
  },
  sectionEmoji: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#E5E7EB",
    letterSpacing: -0.3,
  },
  streakRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  weeklyRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
});

const heroStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#111318",
    borderRadius: 24,
    padding: 22,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    overflow: "hidden" as const,
    position: "relative" as const,
  },
  shimmerOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 24,
  },
  topSection: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 18,
  },
  avatarRing: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ringContainer: {
    width: 100,
    height: 100,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    position: "relative" as const,
  },
  emojiCenter: {
    position: "absolute" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  rankEmoji: {
    fontSize: 36,
  },
  levelInfo: {
    flex: 1,
  },
  levelRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 2,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 14,
    fontWeight: "900" as const,
    letterSpacing: 0.5,
  },
  xpChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  xpChipText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  rankTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  barOuter: {
    marginBottom: 6,
  },
  barTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 3,
    overflow: "hidden" as const,
    position: "relative" as const,
  },
  barFill: {
    height: "100%" as const,
    borderRadius: 3,
    position: "absolute" as const,
    left: 0,
    top: 0,
  },
  barShine: {
    height: "100%" as const,
    borderRadius: 3,
    position: "absolute" as const,
    left: 0,
    top: 0,
  },
  xpNumbers: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  xpCurrent: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#4B5563",
  },
  xpRemaining: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#374151",
  },
});

const streakStyles = StyleSheet.create({
  orb: {
    backgroundColor: "#111318",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: "center" as const,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    position: "relative" as const,
  },
  iconRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  orbValue: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  orbLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#4B5563",
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
  },
  fireBadge: {
    position: "absolute" as const,
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  fireEmoji: {
    fontSize: 10,
  },
});

const nutritionStyles = StyleSheet.create({
  card: {
    backgroundColor: "#111318",
    borderRadius: 22,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  headerRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#E5E7EB",
    letterSpacing: -0.2,
  },
  percentBig: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: "#FF6B35",
    letterSpacing: -1,
  },
  mainRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 20,
  },
  dialWrapper: {
    width: 130,
    height: 130,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    position: "relative" as const,
  },
  dialCenter: {
    position: "absolute" as const,
    alignItems: "center" as const,
  },
  dialCalories: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  dialUnit: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#6B7280",
    marginTop: -2,
  },
  macrosColumn: {
    flex: 1,
    gap: 14,
  },
});

const macroStyles = StyleSheet.create({
  row: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#9CA3AF",
    flex: 1,
  },
  values: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#E5E7EB",
  },
  goal: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#4B5563",
  },
  barTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  barFill: {
    height: "100%" as const,
    borderRadius: 2,
  },
});

const weeklyStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#111318",
    borderRadius: 18,
    padding: 14,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    gap: 6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#4B5563",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 4,
  },
  barTrack: {
    height: 3,
    width: "100%" as const,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 1.5,
    overflow: "hidden" as const,
  },
  barFill: {
    height: "100%" as const,
    borderRadius: 1.5,
  },
});

const feedStyles = StyleSheet.create({
  container: {
    backgroundColor: "#111318",
    borderRadius: 22,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  headerRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#E5E7EB",
    letterSpacing: -0.2,
  },
  eventRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  eventIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  eventInfo: {
    flex: 1,
  },
  eventDesc: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#D1D5DB",
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#4B5563",
  },
  xpBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  xpAmount: {
    fontSize: 13,
    fontWeight: "800" as const,
  },
});

const actionStyles = StyleSheet.create({
  row: {
    flexDirection: "row" as const,
    gap: 10,
    marginTop: 16,
  },
  btn: {
    backgroundColor: "#111318",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center" as const,
    gap: 8,
    borderWidth: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  label: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#9CA3AF",
    letterSpacing: 0.3,
  },
});

const pulseStyles = StyleSheet.create({
  card: {
    backgroundColor: "#111318",
    borderRadius: 22,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  headerRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#E5E7EB",
    letterSpacing: -0.2,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: "800" as const,
    letterSpacing: 0.3,
  },
  barOuter: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 3,
    overflow: "hidden" as const,
    marginBottom: 14,
  },
  barFill: {
    height: "100%" as const,
    borderRadius: 3,
  },
  checksRow: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
  },
  checkItem: {
    alignItems: "center" as const,
    gap: 6,
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  checkLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#4B5563",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
});
