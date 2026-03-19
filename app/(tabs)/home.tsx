import React, { useMemo, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Animated,
  Pressable,
  Platform,
  Dimensions,
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
  TrendingUp,
  Timer,
  Footprints,
  UtensilsCrossed,
  Sparkles,
  Heart,
  Crown,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useApp } from "@/providers/AppProvider";
import { useRouter } from "expo-router";
import { RANKS } from "@/constants/xp";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function HeroLevelCard() {
  const { xpInfo } = useApp();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const levelScale = useRef(new Animated.Value(0)).current;
  const badgeFade = useRef(new Animated.Value(0)).current;
  const orbFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(levelScale, {
      toValue: 1,
      tension: 60,
      friction: 7,
      useNativeDriver: true,
    }).start();
    Animated.timing(badgeFade, {
      toValue: 1,
      duration: 800,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, [levelScale, badgeFade]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: xpInfo.progress,
      duration: 1400,
      useNativeDriver: false,
    }).start();
  }, [xpInfo.progress, progressAnim]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

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

  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(orbFloat, { toValue: -6, duration: 2000, useNativeDriver: true }),
        Animated.timing(orbFloat, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    float.start();
    return () => float.stop();
  }, [orbFloat]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const ringSize = 130;
  const ringStroke = 8;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(Math.max(xpInfo.progress, 0), 1));

  const nextRank = useMemo(() => {
    const currentRankIndex = RANKS.findIndex(r => r.title === xpInfo.rank.title);
    if (currentRankIndex < RANKS.length - 1) {
      return RANKS[currentRankIndex + 1];
    }
    return null;
  }, [xpInfo.rank.title]);

  return (
    <View style={heroStyles.wrapper}>
      <LinearGradient
        colors={[xpInfo.rank.color + "08", "transparent", xpInfo.rank.color + "04"]}
        style={heroStyles.gradientBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={heroStyles.topRow}>
        <Animated.View style={[heroStyles.rankBadgeTop, { backgroundColor: xpInfo.rank.color + "18", opacity: badgeFade }]}>
          <Text style={[heroStyles.rankBadgeText, { color: xpInfo.rank.color }]}>{xpInfo.rank.title.toUpperCase()}</Text>
        </Animated.View>
        <View style={heroStyles.xpTotalChip}>
          <Sparkles size={11} color={xpInfo.rank.color} />
          <Text style={[heroStyles.xpTotalText, { color: xpInfo.rank.color }]}>{xpInfo.totalXP.toLocaleString()} XP</Text>
        </View>
      </View>

      <View style={heroStyles.centerSection}>
        <Animated.View style={[heroStyles.orbContainer, { transform: [{ scale: pulseAnim }, { translateY: orbFloat }] }]}>
          <Svg width={ringSize} height={ringSize}>
            <Defs>
              <SvgGradient id="heroRingGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={xpInfo.rank.color} stopOpacity="0.9" />
                <Stop offset="1" stopColor={xpInfo.rank.color} stopOpacity="0.4" />
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
              stroke="url(#heroRingGrad)"
              strokeWidth={ringStroke}
              fill="none"
              strokeDasharray={`${ringCircumference}`}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            />
          </Svg>
          <View style={heroStyles.orbCenter}>
            <Animated.Text style={[heroStyles.levelNumber, { color: xpInfo.rank.color, transform: [{ scale: levelScale }] }]}>
              {xpInfo.level}
            </Animated.Text>
            <Text style={heroStyles.levelLabel}>LEVEL</Text>
          </View>
        </Animated.View>

        <View style={heroStyles.rankEmojiWrap}>
          <Text style={heroStyles.rankEmoji}>{xpInfo.rank.emoji}</Text>
        </View>
      </View>

      <View style={heroStyles.progressSection}>
        <View style={heroStyles.barOuter}>
          <View style={heroStyles.barTrack}>
            <Animated.View
              style={[heroStyles.barFill, { width: progressWidth, backgroundColor: xpInfo.rank.color }]}
            />
            <Animated.View
              style={[heroStyles.barGlow, { width: progressWidth, backgroundColor: xpInfo.rank.color, opacity: glowAnim }]}
            />
          </View>
        </View>
        <View style={heroStyles.xpNumbers}>
          <Text style={heroStyles.xpCurrent}>
            <Text style={{ color: xpInfo.rank.color, fontWeight: "800" as const }}>{xpInfo.currentXP}</Text>
            <Text style={heroStyles.xpSlash}> / {xpInfo.neededXP} XP</Text>
          </Text>
          <Text style={[heroStyles.xpToGo, { color: xpInfo.rank.color + "99" }]}>
            {xpInfo.neededXP - xpInfo.currentXP} to level {xpInfo.level + 1}
          </Text>
        </View>
      </View>

      {nextRank && (
        <View style={heroStyles.nextRankRow}>
          <View style={heroStyles.nextRankLine} />
          <View style={heroStyles.nextRankInfo}>
            <Text style={heroStyles.nextRankLabel}>NEXT RANK</Text>
            <Text style={heroStyles.nextRankEmoji}>{nextRank.emoji}</Text>
            <Text style={[heroStyles.nextRankTitle, { color: nextRank.color }]}>{nextRank.title}</Text>
            <Text style={heroStyles.nextRankLevel}>Lv {nextRank.minLevel}</Text>
          </View>
          <View style={heroStyles.nextRankLine} />
        </View>
      )}
    </View>
  );
}

function XPCategoryBreakdown() {
  const { xpInfo } = useApp();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const breakdown = useMemo(() => {
    const categories = {
      run: { label: "Runs", icon: "run", color: "#00E5FF", xp: 0 },
      workout: { label: "Workouts", icon: "workout", color: "#00ADB5", xp: 0 },
      food: { label: "Nutrition", icon: "food", color: "#BFFF00", xp: 0 },
      nutrition_goal: { label: "Goals Hit", icon: "goal", color: "#FF6B35", xp: 0 },
      streak: { label: "Streaks", icon: "streak", color: "#F59E0B", xp: 0 },
    };

    for (const event of xpInfo.xpEvents) {
      const key = event.source as keyof typeof categories;
      if (categories[key]) {
        categories[key].xp += event.amount;
      }
    }

    return Object.values(categories).sort((a, b) => b.xp - a.xp);
  }, [xpInfo.xpEvents]);

  const maxXP = Math.max(...breakdown.map(b => b.xp), 1);

  const getIcon = (icon: string) => {
    switch (icon) {
      case "run": return <Footprints size={14} color="#00E5FF" />;
      case "workout": return <Dumbbell size={14} color="#00ADB5" />;
      case "food": return <UtensilsCrossed size={14} color="#BFFF00" />;
      case "goal": return <Target size={14} color="#FF6B35" />;
      case "streak": return <Flame size={14} color="#F59E0B" />;
      default: return <Zap size={14} color="#9CA3AF" />;
    }
  };

  if (xpInfo.totalXP === 0) return null;

  return (
    <Animated.View style={[catStyles.container, { opacity: fadeAnim }]}>
      <View style={catStyles.headerRow}>
        <View style={catStyles.titleRow}>
          <Zap size={16} color="#F59E0B" strokeWidth={2.5} />
          <Text style={catStyles.title}>XP Sources</Text>
        </View>
        <Text style={catStyles.totalXP}>{xpInfo.totalXP.toLocaleString()} total</Text>
      </View>
      {breakdown.map((cat) => (
        <View key={cat.label} style={catStyles.row}>
          <View style={[catStyles.iconWrap, { backgroundColor: cat.color + "12" }]}>
            {getIcon(cat.icon)}
          </View>
          <View style={catStyles.barSection}>
            <View style={catStyles.labelRow}>
              <Text style={catStyles.label}>{cat.label}</Text>
              <Text style={[catStyles.xpVal, { color: cat.color }]}>{cat.xp.toLocaleString()}</Text>
            </View>
            <View style={catStyles.barTrack}>
              <View style={[catStyles.barFill, { width: `${(cat.xp / maxXP) * 100}%`, backgroundColor: cat.color }]} />
            </View>
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

function RankProgressLadder() {
  const { xpInfo } = useApp();

  return (
    <View style={ladderStyles.container}>
      <View style={ladderStyles.headerRow}>
        <View style={ladderStyles.titleRow}>
          <Crown size={16} color="#E879F9" strokeWidth={2.5} />
          <Text style={ladderStyles.title}>Rank Ladder</Text>
        </View>
      </View>
      <View style={ladderStyles.ranksRow}>
        {RANKS.map((rank) => {
          const isActive = xpInfo.rank.title === rank.title;
          const isUnlocked = xpInfo.level >= rank.minLevel;
          return (
            <View key={rank.title} style={[ladderStyles.rankItem, isActive && { borderColor: rank.color + "40" }]}>
              <View style={[ladderStyles.emojiCircle, isActive && { backgroundColor: rank.color + "20" }, !isUnlocked && { opacity: 0.3 }]}>
                <Text style={ladderStyles.rankEmoji}>{rank.emoji}</Text>
              </View>
              <Text style={[ladderStyles.rankName, isActive && { color: rank.color }, !isUnlocked && { color: "#2A2E35" }]} numberOfLines={1}>
                {rank.title}
              </Text>
              {isActive && <View style={[ladderStyles.activeDot, { backgroundColor: rank.color }]} />}
            </View>
          );
        })}
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

  const streakXP = useMemo(() => {
    if (!active || value < 3) return 0;
    if (label === "Food") return value * 5;
    return value * 10;
  }, [active, value, label]);

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
            <View style={[streakStyles.xpBonusBadge, { backgroundColor: color + "15" }]}>
              <Zap size={8} color={color} />
              <Text style={[streakStyles.xpBonusText, { color }]}>+{streakXP}</Text>
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

  const dialSize = 120;
  const outerStroke = 10;
  const outerR = (dialSize - outerStroke) / 2;
  const outerC = 2 * Math.PI * outerR;
  const outerOffset = outerC * (1 - calProgress);


  return (
    <View style={nutritionStyles.card}>
      <View style={nutritionStyles.headerRow}>
        <View style={nutritionStyles.titleRow}>
          <UtensilsCrossed size={16} color="#FF6B35" strokeWidth={2.5} />
          <Text style={nutritionStyles.title}>Today's Fuel</Text>
        </View>
        <View style={nutritionStyles.xpHint}>
          <Zap size={10} color="#BFFF00" />
          <Text style={nutritionStyles.xpHintText}>+15 XP per log</Text>
        </View>
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
          <Text style={feedStyles.title}>XP Activity</Text>
        </View>
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
            <Zap size={10} color={getSourceColor(event.source)} />
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
    { icon: <Footprints size={18} color="#00E5FF" strokeWidth={2.5} />, label: "Run", xp: "+50", color: "#00E5FF", route: "run" },
    { icon: <UtensilsCrossed size={18} color="#BFFF00" strokeWidth={2.5} />, label: "Eat", xp: "+15", color: "#BFFF00", route: "nutrition" },
    { icon: <Dumbbell size={18} color="#00ADB5" strokeWidth={2.5} />, label: "Lift", xp: "+75", color: "#00ADB5", route: "gym" },
  ];

  return (
    <View style={actionStyles.row}>
      {actions.map((action, i) => (
        <Animated.View key={action.label} style={{ flex: 1, transform: [{ scale: scaleAnims[i] }] }}>
          <Pressable onPress={() => handlePress(i, action.route)} style={[actionStyles.btn, { borderColor: action.color + "15" }]}>
            <View style={[actionStyles.iconCircle, { backgroundColor: action.color + "10" }]}>
              {action.icon}
            </View>
            <Text style={actionStyles.label}>{action.label}</Text>
            <View style={[actionStyles.xpTag, { backgroundColor: action.color + "12" }]}>
              <Zap size={8} color={action.color} />
              <Text style={[actionStyles.xpTagText, { color: action.color }]}>{action.xp}</Text>
            </View>
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
          <Text style={pulseStyles.title}>Today's Pulse</Text>
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
  const { stats, xpInfo } = useApp();
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
      "XP doesn't earn itself",
      "Rank up. No excuses.",
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
          <View style={styles.greetingRow}>
            <View>
              <Text style={styles.greetingText}>{greeting}</Text>
              <Text style={styles.headerSubtitle}>{motivationalLine}</Text>
            </View>
            <View style={[styles.headerLevelPill, { backgroundColor: xpInfo.rank.color + "15", borderColor: xpInfo.rank.color + "30" }]}>
              <Text style={styles.headerLevelEmoji}>{xpInfo.rank.emoji}</Text>
              <Text style={[styles.headerLevelText, { color: xpInfo.rank.color }]}>Lv {xpInfo.level}</Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <HeroLevelCard />

        <RankProgressLadder />

        <QuickActionRow />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>🔥</Text>
          <Text style={styles.sectionTitle}>Streaks</Text>
          <View style={styles.sectionXPHint}>
            <Zap size={10} color="#F59E0B" />
            <Text style={styles.sectionXPHintText}>Bonus XP at 3+</Text>
          </View>
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

        <XPCategoryBreakdown />

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
    paddingBottom: 18,
  },
  headerContent: {
    marginTop: 4,
  },
  greetingRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -1,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#4B5563",
    letterSpacing: 0.2,
    maxWidth: SCREEN_WIDTH * 0.6,
  },
  headerLevelPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  headerLevelEmoji: {
    fontSize: 14,
  },
  headerLevelText: {
    fontSize: 13,
    fontWeight: "900" as const,
    letterSpacing: 0.5,
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
    flex: 1,
  },
  sectionXPHint: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(245,158,11,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sectionXPHintText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#F59E0B",
    letterSpacing: 0.3,
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
    borderRadius: 28,
    padding: 24,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden" as const,
    position: "relative" as const,
  },
  gradientBg: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  topRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 20,
  },
  rankBadgeTop: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: "900" as const,
    letterSpacing: 1.5,
  },
  xpTotalChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  xpTotalText: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  centerSection: {
    alignItems: "center" as const,
    marginBottom: 24,
    position: "relative" as const,
  },
  orbContainer: {
    width: 130,
    height: 130,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  orbCenter: {
    position: "absolute" as const,
    alignItems: "center" as const,
  },
  levelNumber: {
    fontSize: 48,
    fontWeight: "900" as const,
    letterSpacing: -2,
  },
  levelLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: "#4B5563",
    letterSpacing: 3,
    marginTop: -4,
  },
  rankEmojiWrap: {
    position: "absolute" as const,
    bottom: -4,
    right: SCREEN_WIDTH / 2 - 90,
    backgroundColor: "#1A1D24",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: "#111318",
  },
  rankEmoji: {
    fontSize: 18,
  },
  progressSection: {
    gap: 8,
  },
  barOuter: {
    marginBottom: 2,
  },
  barTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 4,
    overflow: "hidden" as const,
    position: "relative" as const,
  },
  barFill: {
    height: "100%" as const,
    borderRadius: 4,
    position: "absolute" as const,
    left: 0,
    top: 0,
  },
  barGlow: {
    height: "100%" as const,
    borderRadius: 4,
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
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  xpSlash: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#374151",
  },
  xpToGo: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  nextRankRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 20,
    gap: 12,
  },
  nextRankLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  nextRankInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  nextRankLabel: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: "#374151",
    letterSpacing: 1.2,
  },
  nextRankEmoji: {
    fontSize: 14,
  },
  nextRankTitle: {
    fontSize: 12,
    fontWeight: "800" as const,
  },
  nextRankLevel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#374151",
  },
});

const ladderStyles = StyleSheet.create({
  container: {
    backgroundColor: "#111318",
    borderRadius: 22,
    padding: 18,
    marginTop: 14,
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
  ranksRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    gap: 4,
  },
  rankItem: {
    flex: 1,
    alignItems: "center" as const,
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    position: "relative" as const,
  },
  emojiCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  rankEmoji: {
    fontSize: 16,
  },
  rankName: {
    fontSize: 8,
    fontWeight: "700" as const,
    color: "#4B5563",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    textAlign: "center" as const,
  },
  activeDot: {
    position: "absolute" as const,
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

const catStyles = StyleSheet.create({
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
    marginBottom: 16,
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
  totalXP: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#4B5563",
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  barSection: {
    flex: 1,
    gap: 5,
  },
  labelRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  label: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#9CA3AF",
  },
  xpVal: {
    fontSize: 13,
    fontWeight: "800" as const,
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

const streakStyles = StyleSheet.create({
  orb: {
    backgroundColor: "#111318",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center" as const,
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    position: "relative" as const,
  },
  iconRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  orbValue: {
    fontSize: 24,
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
  xpBonusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  xpBonusText: {
    fontSize: 10,
    fontWeight: "800" as const,
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
  xpHint: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(191,255,0,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  xpHintText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#BFFF00",
  },
  mainRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 20,
  },
  dialWrapper: {
    width: 120,
    height: 120,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    position: "relative" as const,
  },
  dialCenter: {
    position: "absolute" as const,
    alignItems: "center" as const,
  },
  dialCalories: {
    fontSize: 24,
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
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
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
    gap: 6,
    borderWidth: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  label: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#9CA3AF",
    letterSpacing: 0.3,
  },
  xpTag: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  xpTagText: {
    fontSize: 10,
    fontWeight: "800" as const,
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
