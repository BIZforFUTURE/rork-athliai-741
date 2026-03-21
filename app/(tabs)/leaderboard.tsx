import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Dimensions,
  Platform,
  Animated,
  Pressable,
  RefreshControl,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";
import Svg, { Circle } from "react-native-svg";
import {
  User,
  Scale,
  Ruler,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Calendar,
  Edit3,
  Plus,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Zap,
  Footprints,
  Dumbbell,
  UtensilsCrossed,
  Award,
  Flame,
  ChevronRight,
  Camera,
} from "lucide-react-native";
import { useApp } from "@/providers/AppProvider";
import { RANKS, XPSource } from "@/constants/xp";

interface WeightEntry {
  date: string;
  weight: number;
}

type StatPeriod = '7d' | '30d' | '90d' | '1y';

function XPRankCard() {
  const { xpInfo } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(ringAnim, { toValue: 1, tension: 40, friction: 10, useNativeDriver: false }),
    ]).start();
  }, [fadeIn, ringAnim]);

  const ringSize = 80;
  const ringStroke = 6;
  const r = (ringSize - ringStroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(Math.max(xpInfo.progress, 0), 1));

  return (
    <Animated.View style={[cardStyles.card, { opacity: fadeIn }]}>
      <View style={cardStyles.cardHeader}>
        <Zap size={13} color="#6B7280" />
        <Text style={cardStyles.cardHeading}>XP & Rank</Text>
      </View>

      <View style={xpStyles.rankRow}>
        <View style={xpStyles.ringWrap}>
          <Svg width={ringSize} height={ringSize}>
            <Circle cx={ringSize / 2} cy={ringSize / 2} r={r} stroke="rgba(255,255,255,0.04)" strokeWidth={3} fill="none" />
            <Circle
              cx={ringSize / 2} cy={ringSize / 2} r={r}
              stroke={xpInfo.rank.color} strokeWidth={ringStroke} fill="none"
              strokeDasharray={`${circ}`} strokeDashoffset={offset}
              strokeLinecap="round" transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            />
          </Svg>
          <View style={xpStyles.ringInner}>
            <Text style={xpStyles.ringEmoji}>{xpInfo.rank.emoji}</Text>
            <Text style={[xpStyles.ringLevel, { color: xpInfo.rank.color }]}>{xpInfo.level}</Text>
          </View>
        </View>

        <View style={xpStyles.rankInfo}>
          <View style={[xpStyles.rankBadge, { backgroundColor: xpInfo.rank.color + "15" }]}>
            <Text style={[xpStyles.rankTitle, { color: xpInfo.rank.color }]}>{xpInfo.rank.title}</Text>
          </View>
          <View style={xpStyles.xpBarOuter}>
            <View style={[xpStyles.xpBarFill, { width: `${xpInfo.progress * 100}%`, backgroundColor: xpInfo.rank.color }]} />
          </View>
          <View style={xpStyles.xpNumbers}>
            <Text style={xpStyles.xpText}>
              <Text style={{ color: "#E5E7EB", fontWeight: "700" as const }}>{xpInfo.currentXP}</Text>
              <Text style={{ color: "#4B5563" }}> / {xpInfo.neededXP} XP</Text>
            </Text>
            <Text style={[xpStyles.xpRemaining, { color: xpInfo.rank.color + "BB" }]}>
              {xpInfo.neededXP - xpInfo.currentXP} to go
            </Text>
          </View>
        </View>

        <View style={xpStyles.totalBadge}>
          <Zap size={10} color={xpInfo.rank.color} fill={xpInfo.rank.color} />
          <Text style={[xpStyles.totalText, { color: xpInfo.rank.color }]}>{xpInfo.totalXP.toLocaleString()}</Text>
        </View>
      </View>

      <View style={xpStyles.timeline}>
        {RANKS.map((rank, index) => {
          const isCurrentOrPast = xpInfo.level >= rank.minLevel;
          const isCurrent = index < RANKS.length - 1
            ? xpInfo.level >= rank.minLevel && xpInfo.level < RANKS[index + 1].minLevel
            : xpInfo.level >= rank.minLevel;
          return (
            <View key={rank.title} style={xpStyles.timelineItem}>
              <View style={[
                xpStyles.timelineDot,
                { backgroundColor: isCurrentOrPast ? rank.color : "rgba(255,255,255,0.06)" },
                isCurrent && { borderWidth: 1.5, borderColor: "#FFFFFF" },
              ]} />
              <Text style={xpStyles.timelineEmoji}>{rank.emoji}</Text>
              <Text style={[xpStyles.timelineName, isCurrentOrPast && { color: rank.color + "AA" }]}>
                {rank.title}
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

function XPBreakdownCard() {
  const { xpInfo } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }).start();
  }, [fadeIn]);

  if (xpInfo.xpEvents.length === 0) return null;

  const grouped: Record<XPSource, number> = { run: 0, workout: 0, food: 0, nutrition_goal: 0, streak: 0, treadmill_photo: 0 };
  xpInfo.xpEvents.forEach(e => { grouped[e.source] = (grouped[e.source] || 0) + e.amount; });

  const labels: Record<XPSource, string> = { run: 'Runs', workout: 'Workouts', food: 'Food', nutrition_goal: 'Goals', streak: 'Streaks', treadmill_photo: 'Treadmill' };
  const colors: Record<XPSource, string> = { run: '#00E5FF', workout: '#FF6B35', food: '#BFFF00', nutrition_goal: '#F59E0B', streak: '#E879F9', treadmill_photo: '#38BDF8' };
  const icons: Record<XPSource, React.ReactNode> = {
    run: <Footprints size={12} color="#00E5FF" />,
    workout: <Dumbbell size={12} color="#FF6B35" />,
    food: <UtensilsCrossed size={12} color="#BFFF00" />,
    nutrition_goal: <Award size={12} color="#F59E0B" />,
    streak: <Flame size={12} color="#E879F9" />,
    treadmill_photo: <Camera size={12} color="#38BDF8" />,
  };
  const totalXP = Object.values(grouped).reduce((a, b) => a + b, 0);

  const entries = Object.entries(grouped)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <Animated.View style={[cardStyles.card, { opacity: fadeIn }]}>
      <View style={cardStyles.cardHeader}>
        <BarChart3 size={13} color="#6B7280" />
        <Text style={cardStyles.cardHeading}>XP Breakdown</Text>
        <Text style={breakdownStyles.totalLabel}>{totalXP.toLocaleString()} total</Text>
      </View>
      {entries.map(([key, value]) => (
        <View key={key} style={breakdownStyles.row}>
          <View style={[breakdownStyles.iconWrap, { backgroundColor: colors[key as XPSource] + "12" }]}>
            {icons[key as XPSource]}
          </View>
          <Text style={breakdownStyles.label}>{labels[key as XPSource]}</Text>
          <View style={breakdownStyles.barTrack}>
            <View style={[breakdownStyles.barFill, { width: `${totalXP > 0 ? (value / totalXP) * 100 : 0}%`, backgroundColor: colors[key as XPSource] }]} />
          </View>
          <Text style={[breakdownStyles.value, { color: colors[key as XPSource] }]}>{value}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

function RecentXPCard() {
  const { xpInfo } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }).start();
  }, [fadeIn]);

  const recentEvents = useMemo(() => xpInfo.xpEvents.slice(-5).reverse(), [xpInfo.xpEvents]);

  if (recentEvents.length === 0) return null;

  const getColor = (source: string) => {
    switch (source) {
      case "run": return "#00E5FF";
      case "workout": return "#FF6B35";
      case "food": return "#BFFF00";
      case "nutrition_goal": return "#F59E0B";
      case "streak": return "#E879F9";
      case "treadmill_photo": return "#38BDF8";
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
    <Animated.View style={[cardStyles.card, { opacity: fadeIn }]}>
      <View style={cardStyles.cardHeader}>
        <Zap size={13} color="#6B7280" />
        <Text style={cardStyles.cardHeading}>Recent XP</Text>
      </View>
      {recentEvents.map((event) => (
        <View key={event.id} style={recentStyles.row}>
          <View style={[recentStyles.dot, { backgroundColor: getColor(event.source) + "20", borderColor: getColor(event.source) + "40" }]} />
          <View style={recentStyles.info}>
            <Text style={recentStyles.desc} numberOfLines={1}>{event.description}</Text>
            <Text style={recentStyles.time}>{timeAgo(event.date)} ago</Text>
          </View>
          <Text style={[recentStyles.amount, { color: getColor(event.source) }]}>+{event.amount}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

function WeightGoalCard({ onAddWeight }: { onAddWeight: () => void }) {
  const { personalStats, getWeightHistory } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }).start();
  }, [fadeIn]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 10 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start();
  }, [scaleAnim]);

  if (!personalStats?.targetWeight || !personalStats?.weight) return null;

  const weightHistory = getWeightHistory('30d');
  const currentWeight = personalStats.weight;
  const targetWeight = personalStats.targetWeight;
  const startWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : currentWeight;
  const totalChange = targetWeight - startWeight;
  const currentChange = currentWeight - startWeight;
  const progress = totalChange !== 0 ? (currentChange / totalChange) * 100 : 0;
  const remaining = targetWeight - currentWeight;
  const isGaining = targetWeight > startWeight;

  let onPaceStatus: string | null = null;
  if (personalStats.goalEndDate) {
    const now = new Date();
    const endDate = new Date(personalStats.goalEndDate);
    const totalDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDays > 0 && weightHistory.length > 1) {
      const oldestEntry = weightHistory[weightHistory.length - 1];
      const oldestDate = new Date(oldestEntry.date + 'T00:00:00');
      const daysPassed = Math.ceil((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysPassed > 0) {
        const actualWeightChange = currentWeight - oldestEntry.weight;
        const requiredWeightChange = targetWeight - oldestEntry.weight;
        const totalDaysForGoal = Math.ceil((endDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
        const expectedProgress = (daysPassed / totalDaysForGoal) * requiredWeightChange;
        const progressDiff = Math.abs(actualWeightChange - expectedProgress);
        const tolerance = Math.abs(requiredWeightChange) * 0.1;
        if (progressDiff <= tolerance) onPaceStatus = 'on-pace';
        else if ((isGaining && actualWeightChange < expectedProgress) || (!isGaining && actualWeightChange > expectedProgress)) onPaceStatus = 'behind';
        else onPaceStatus = 'ahead';
      }
    }
  }

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onAddWeight}>
      <Animated.View style={[cardStyles.card, { opacity: fadeIn, transform: [{ scale: scaleAnim }] }]}>
        <View style={cardStyles.cardHeader}>
          <Target size={13} color="#6B7280" />
          <Text style={cardStyles.cardHeading}>Weight Goal</Text>
          <ChevronRight size={14} color="#374151" />
        </View>

        <View style={goalStyles.statsRow}>
          <View style={goalStyles.statItem}>
            <Text style={goalStyles.statLabel}>Current</Text>
            <Text style={goalStyles.statValue}>{currentWeight}<Text style={goalStyles.statUnit}> lbs</Text></Text>
          </View>
          <View style={goalStyles.divider} />
          <View style={goalStyles.statItem}>
            <Text style={goalStyles.statLabel}>Target</Text>
            <Text style={goalStyles.statValue}>{targetWeight}<Text style={goalStyles.statUnit}> lbs</Text></Text>
          </View>
          <View style={goalStyles.divider} />
          <View style={goalStyles.statItem}>
            <Text style={goalStyles.statLabel}>Left</Text>
            <View style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 3 }}>
              {isGaining ? (
                <TrendingUp size={12} color={remaining > 0 ? "#10B981" : "#EF4444"} />
              ) : (
                <TrendingDown size={12} color={remaining < 0 ? "#10B981" : "#EF4444"} />
              )}
              <Text style={[goalStyles.statValue, { color: Math.abs(remaining) < 5 ? "#10B981" : "#D1D5DB" }]}>
                {Math.abs(remaining).toFixed(1)}<Text style={goalStyles.statUnit}> lbs</Text>
              </Text>
            </View>
          </View>
        </View>

        <View style={goalStyles.barOuter}>
          <View style={[goalStyles.barFill, {
            width: `${Math.min(Math.max(progress, 0), 100)}%`,
            backgroundColor: progress >= 100 ? "#10B981" : "#00ADB5"
          }]} />
        </View>
        <Text style={goalStyles.barLabel}>
          {Math.round(Math.min(Math.max(progress, 0), 100))}% complete
        </Text>

        {personalStats.goalEndDate && (
          <View style={goalStyles.dateRow}>
            <Calendar size={11} color="#4B5563" />
            <Text style={goalStyles.dateText}>
              Goal: {new Date(personalStats.goalEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
        )}

        {onPaceStatus && (
          <View style={[
            goalStyles.paceTag,
            onPaceStatus === 'on-pace' && { backgroundColor: "rgba(16,185,129,0.1)" },
            onPaceStatus === 'ahead' && { backgroundColor: "rgba(0,173,181,0.1)" },
            onPaceStatus === 'behind' && { backgroundColor: "rgba(245,158,11,0.1)" },
          ]}>
            {onPaceStatus === 'on-pace' && <CheckCircle size={12} color="#10B981" />}
            {onPaceStatus === 'ahead' && <TrendingUp size={12} color="#00ADB5" />}
            {onPaceStatus === 'behind' && <AlertCircle size={12} color="#F59E0B" />}
            <Text style={[
              goalStyles.paceText,
              onPaceStatus === 'on-pace' && { color: "#10B981" },
              onPaceStatus === 'ahead' && { color: "#00ADB5" },
              onPaceStatus === 'behind' && { color: "#F59E0B" },
            ]}>
              {onPaceStatus === 'on-pace' && 'On Pace'}
              {onPaceStatus === 'ahead' && 'Ahead of Schedule'}
              {onPaceStatus === 'behind' && 'Behind Schedule'}
            </Text>
          </View>
        )}

        {Math.abs(remaining) < 5 && (
          <View style={goalStyles.nearBadge}>
            <Text style={goalStyles.nearText}>🎯 Almost there!</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

function PhysicalStatsCard({ onEdit }: { onEdit: () => void }) {
  const { personalStats } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 250, useNativeDriver: true }).start();
  }, [fadeIn]);

  const inchesToFeetAndInches = (totalInches: number) => {
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return { feet, inches };
  };

  const calculateBMI = (weightLbs: number, heightInches: number) => {
    return (weightLbs / (heightInches * heightInches)) * 703;
  };

  const bmi = personalStats?.height && personalStats?.weight
    ? calculateBMI(personalStats.weight, personalStats.height) : null;

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Underweight', color: '#00ADB5' };
    if (bmi < 25) return { category: 'Normal', color: '#10B981' };
    if (bmi < 30) return { category: 'Overweight', color: '#F59E0B' };
    return { category: 'Obese', color: '#EF4444' };
  };

  const hasStats = personalStats?.height && personalStats?.weight;

  const stats = useMemo(() => {
    if (!hasStats) return [];
    const result = [
      {
        icon: <Ruler size={16} color="#00ADB5" />,
        value: (() => { const { feet, inches } = inchesToFeetAndInches(personalStats.height!); return `${feet}'${inches}"`; })(),
        label: "Height",
        color: "#00ADB5",
      },
      {
        icon: <Scale size={16} color="#10B981" />,
        value: `${personalStats.weight} lbs`,
        label: "Weight",
        color: "#10B981",
      },
    ];
    if (bmi) {
      const cat = getBMICategory(bmi);
      result.push({
        icon: <Activity size={16} color={cat.color} />,
        value: bmi.toFixed(1),
        label: `BMI · ${cat.category}`,
        color: cat.color,
      });
    }
    if (personalStats.targetWeight) {
      result.push({
        icon: <Target size={16} color="#F59E0B" />,
        value: `${personalStats.targetWeight} lbs`,
        label: "Target",
        color: "#F59E0B",
      });
    }
    return result;
  }, [personalStats, bmi, hasStats]);

  return (
    <Animated.View style={[cardStyles.card, { opacity: fadeIn }]}>
      <View style={cardStyles.cardHeader}>
        <User size={13} color="#6B7280" />
        <Text style={cardStyles.cardHeading}>Physical Stats</Text>
        {hasStats && (
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onEdit();
            }}
            style={physStyles.editBtn}
          >
            <Edit3 size={12} color="#9CA3AF" />
            <Text style={physStyles.editText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {hasStats ? (
        <View style={physStyles.grid}>
          {stats.map((s) => (
            <View key={s.label} style={physStyles.cell}>
              <View style={[physStyles.cellIcon, { backgroundColor: s.color + "10" }]}>
                {s.icon}
              </View>
              <Text style={physStyles.cellValue}>{s.value}</Text>
              <Text style={physStyles.cellLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={physStyles.empty}>
          <Scale size={36} color="#374151" />
          <Text style={physStyles.emptyTitle}>No stats yet</Text>
          <Text style={physStyles.emptyDesc}>Add your height and weight to track progress</Text>
          <TouchableOpacity
            style={physStyles.addBtn}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onEdit();
            }}
          >
            <Plus size={14} color="#FFFFFF" />
            <Text style={physStyles.addBtnText}>Add Stats</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

function WeightProgressCard({ onAddWeight, selectedPeriod, setSelectedPeriod }: {
  onAddWeight: () => void;
  selectedPeriod: StatPeriod;
  setSelectedPeriod: (p: StatPeriod) => void;
}) {
  const { personalStats, getWeightHistory } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }).start();
  }, [fadeIn]);

  if (!personalStats?.weight) return null;

  const weightProgress = personalStats?.targetWeight && personalStats?.weight
    ? personalStats.weight - personalStats.targetWeight : null;

  const filteredHistory = getWeightHistory(selectedPeriod);

  return (
    <Animated.View style={[cardStyles.card, { opacity: fadeIn }]}>
      <View style={cardStyles.cardHeader}>
        <TrendingUp size={13} color="#6B7280" />
        <Text style={cardStyles.cardHeading}>Weight Progress</Text>
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAddWeight();
          }}
          style={physStyles.editBtn}
        >
          <Plus size={12} color="#9CA3AF" />
          <Text style={physStyles.editText}>Log</Text>
        </TouchableOpacity>
      </View>

      {weightProgress !== null && (
        <View style={wpStyles.progressStrip}>
          {weightProgress > 0 ? (
            <TrendingUp size={16} color="#10B981" />
          ) : (
            <TrendingDown size={16} color="#EF4444" />
          )}
          <Text style={[wpStyles.progressVal, { color: weightProgress > 0 ? '#10B981' : '#EF4444' }]}>
            {Math.abs(weightProgress).toFixed(1)} lbs
          </Text>
          <Text style={wpStyles.progressLabel}>
            {weightProgress > 0 ? 'above target' : 'below target'}
          </Text>
        </View>
      )}

      <View style={wpStyles.periodRow}>
        {(['7d', '30d', '90d', '1y'] as StatPeriod[]).map((period) => (
          <TouchableOpacity
            key={period}
            style={[wpStyles.periodBtn, selectedPeriod === period && wpStyles.periodBtnActive]}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPeriod(period);
            }}
          >
            <Text style={[wpStyles.periodText, selectedPeriod === period && wpStyles.periodTextActive]}>
              {period === '7d' ? '7D' : period === '30d' ? '30D' : period === '90d' ? '90D' : '1Y'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredHistory.length === 0 && (
        <View style={wpStyles.emptyChart}>
          <Calendar size={24} color="#374151" />
          <Text style={wpStyles.emptyText}>No entries yet</Text>
        </View>
      )}

      {filteredHistory.length === 1 && (
        <View style={wpStyles.emptyChart}>
          <BarChart3 size={24} color="#00ADB5" />
          <Text style={wpStyles.emptyTextSub}>Add more entries to see your graph</Text>
          <View style={wpStyles.singleEntry}>
            <Text style={wpStyles.singleDate}>{new Date(filteredHistory[0].date + 'T00:00:00').toLocaleDateString()}</Text>
            <Text style={wpStyles.singleWeight}>{filteredHistory[0].weight} lbs</Text>
          </View>
        </View>
      )}

      {filteredHistory.length > 1 && (() => {
        const sortedHistory = [...filteredHistory].reverse();
        const weights = sortedHistory.map(entry => entry.weight);
        const labels = sortedHistory.map(entry => {
          const date = new Date(entry.date + 'T00:00:00');
          return `${date.getMonth() + 1}/${date.getDate()}`;
        });
        const screenWidth = Dimensions.get('window').width;
        const chartWidth = screenWidth - 64;

        return (
          <View>
            <LineChart
              data={{
                labels: labels.length > 6 ? labels.filter((_, i) => i % Math.ceil(labels.length / 6) === 0) : labels,
                datasets: [{
                  data: weights,
                  color: (opacity = 1) => `rgba(0, 173, 181, ${opacity})`,
                  strokeWidth: 2,
                }]
              }}
              width={chartWidth}
              height={180}
              yAxisSuffix=""
              yAxisInterval={1}
              fromZero={false}
              chartConfig={{
                backgroundColor: '#0E1015',
                backgroundGradientFrom: '#0E1015',
                backgroundGradientTo: '#0E1015',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(0, 173, 181, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
                style: { borderRadius: 12 },
                propsForDots: { r: '3', strokeWidth: '1.5', stroke: '#00ADB5', fill: '#0E1015' },
                propsForBackgroundLines: { strokeDasharray: '', stroke: 'rgba(255,255,255,0.03)', strokeWidth: 1 },
                propsForLabels: { fontSize: 10 },
              }}
              bezier
              style={{ borderRadius: 12, marginLeft: -8 }}
            />
            <View style={wpStyles.recentHeader}>
              <Text style={wpStyles.recentTitle}>Recent</Text>
            </View>
            {filteredHistory.slice(0, 3).map((entry: WeightEntry, index: number) => (
              <View key={index} style={wpStyles.historyRow}>
                <Text style={wpStyles.historyDate}>{new Date(entry.date + 'T00:00:00').toLocaleDateString()}</Text>
                <Text style={wpStyles.historyWeight}>{entry.weight} lbs</Text>
              </View>
            ))}
          </View>
        );
      })()}
    </Animated.View>
  );
}

function FitnessStatsCard() {
  const { recentRuns, weeklyRuns } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 350, useNativeDriver: true }).start();
  }, [fadeIn]);

  const currentWeeklyMiles = weeklyRuns.reduce((sum, run) => sum + run.distance, 0);
  const currentLifetimeMiles = recentRuns.reduce((sum, run) => sum + run.distance, 0);

  const items = [
    { value: currentWeeklyMiles.toFixed(1), unit: "mi", label: "This Week", color: "#00E5FF", icon: <Footprints size={14} color="#00E5FF" /> },
    { value: currentLifetimeMiles.toFixed(1), unit: "mi", label: "All Time", color: "#FF6B35", icon: <TrendingUp size={14} color="#FF6B35" /> },
    { value: `${weeklyRuns.length}`, unit: "", label: "Runs/Wk", color: "#BFFF00", icon: <Activity size={14} color="#BFFF00" /> },
    { value: `${recentRuns.length}`, unit: "", label: "Total Runs", color: "#F59E0B", icon: <Target size={14} color="#F59E0B" /> },
  ];

  return (
    <Animated.View style={[cardStyles.card, { opacity: fadeIn }]}>
      <View style={cardStyles.cardHeader}>
        <Activity size={13} color="#6B7280" />
        <Text style={cardStyles.cardHeading}>Fitness Stats</Text>
      </View>
      <View style={fitStyles.grid}>
        {items.map((item, idx) => (
          <View key={item.label} style={[fitStyles.cell, idx < 3 && fitStyles.cellBorder]}>
            <View style={[fitStyles.cellIcon, { backgroundColor: item.color + "10" }]}>
              {item.icon}
            </View>
            <Text style={fitStyles.cellValue}>
              {item.value}
              {item.unit ? <Text style={[fitStyles.cellUnit, { color: item.color }]}> {item.unit}</Text> : null}
            </Text>
            <Text style={fitStyles.cellLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

export default function PersonalStatsScreen() {
  const { personalStats, updatePersonalStats, addWeightEntry, isLoading: appLoading } = useApp();
  const insets = useSafeAreaInsets();
  const [selectedPeriod, setSelectedPeriod] = useState<StatPeriod>('30d');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [tempHeightFeet, setTempHeightFeet] = useState('');
  const [tempHeightInches, setTempHeightInches] = useState('');
  const [tempWeight, setTempWeight] = useState('');
  const [tempTargetWeight, setTempTargetWeight] = useState('');
  const [tempAge, setTempAge] = useState('');
  const [tempGender, setTempGender] = useState<'male' | 'female' | 'other'>('male');
  const [newWeight, setNewWeight] = useState('');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const inchesToFeetAndInches = (totalInches: number) => {
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return { feet, inches };
  };

  const feetAndInchesToInches = (feet: number, inches: number) => {
    return feet * 12 + inches;
  };

  useEffect(() => {
    if (personalStats) {
      if (personalStats.height) {
        const { feet, inches } = inchesToFeetAndInches(personalStats.height);
        setTempHeightFeet(feet.toString());
        setTempHeightInches(inches.toString());
      }
      setTempWeight(personalStats.weight?.toString() || '');
      setTempTargetWeight(personalStats.targetWeight?.toString() || '');
      setTempAge(personalStats.age?.toString() || '');
      setTempGender(personalStats.gender || 'male');
    }
  }, [personalStats]);

  const handleSaveStats = () => {
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const feet = parseInt(tempHeightFeet);
    const inches = parseInt(tempHeightInches);
    const weight = parseFloat(tempWeight);
    const targetWeight = tempTargetWeight ? parseFloat(tempTargetWeight) : undefined;
    const age = tempAge ? parseInt(tempAge) : undefined;

    if (!feet || !weight || inches < 0) return;
    if (feet < 3 || feet > 8 || inches < 0 || inches >= 12) return;
    if (weight < 50 || weight > 500) return;

    const totalInches = feetAndInchesToInches(feet, inches);
    updatePersonalStats({ height: totalInches, weight, targetWeight, age, gender: tempGender });
    setShowStatsModal(false);
  };

  const getLocalDateString = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleAddWeight = () => {
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const weight = parseFloat(newWeight);
    if (!weight || weight < 50 || weight > 500) return;
    addWeightEntry({ weight, date: getLocalDateString() });
    setShowWeightModal(false);
    setNewWeight('');
  };

  if (appLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center" as const, alignItems: "center" as const }]}>
        <Text style={{ fontSize: 16, color: "#4B5563" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Modal visible={showStatsModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowStatsModal(false)}>
        <View style={[modalStyles.container, { paddingTop: insets.top }]}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>Update Stats</Text>
            <TouchableOpacity onPress={() => setShowStatsModal(false)} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false}>
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>Height</Text>
              <View style={modalStyles.heightRow}>
                <View style={modalStyles.heightField}>
                  <TextInput style={modalStyles.input} placeholder="5" placeholderTextColor="#374151" value={tempHeightFeet} onChangeText={setTempHeightFeet} keyboardType="numeric" />
                  <Text style={modalStyles.heightUnit}>ft</Text>
                </View>
                <View style={modalStyles.heightField}>
                  <TextInput style={modalStyles.input} placeholder="10" placeholderTextColor="#374151" value={tempHeightInches} onChangeText={setTempHeightInches} keyboardType="numeric" />
                  <Text style={modalStyles.heightUnit}>in</Text>
                </View>
              </View>
            </View>
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>Current Weight (lbs)</Text>
              <TextInput style={modalStyles.input} placeholder="150" placeholderTextColor="#374151" value={tempWeight} onChangeText={setTempWeight} keyboardType="numeric" />
            </View>
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>Target Weight (lbs)</Text>
              <TextInput style={modalStyles.input} placeholder="140" placeholderTextColor="#374151" value={tempTargetWeight} onChangeText={setTempTargetWeight} keyboardType="numeric" />
            </View>
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>Age</Text>
              <TextInput style={modalStyles.input} placeholder="25" placeholderTextColor="#374151" value={tempAge} onChangeText={setTempAge} keyboardType="numeric" />
            </View>
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>Gender</Text>
              <View style={modalStyles.genderRow}>
                {(['male', 'female', 'other'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[modalStyles.genderBtn, tempGender === g && modalStyles.genderBtnActive]}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTempGender(g);
                    }}
                  >
                    <Text style={[modalStyles.genderText, tempGender === g && modalStyles.genderTextActive]}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={modalStyles.saveBtn} onPress={handleSaveStats}>
              <Text style={modalStyles.saveBtnText}>Save</Text>
            </TouchableOpacity>
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showWeightModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowWeightModal(false)}>
        <View style={[modalStyles.container, { paddingTop: insets.top }]}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>Log Weight</Text>
            <TouchableOpacity onPress={() => { setShowWeightModal(false); setNewWeight(''); }} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={modalStyles.body}>
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>Today&apos;s Weight (lbs)</Text>
              <TextInput style={modalStyles.input} placeholder="150.5" placeholderTextColor="#374151" value={newWeight} onChangeText={setNewWeight} keyboardType="numeric" autoFocus />
            </View>
            <TouchableOpacity style={modalStyles.saveBtn} onPress={handleAddWeight}>
              <Text style={modalStyles.saveBtnText}>Add Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.pageTitle}>Stats</Text>
          <Text style={styles.pageSubtitle}>Your fitness journey</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A855F7"
            colors={["#A855F7"]}
            progressBackgroundColor="#1A1D24"
          />
        }
      >
        <XPRankCard />
        <XPBreakdownCard />
        <RecentXPCard />
        <WeightGoalCard onAddWeight={() => setShowWeightModal(true)} />
        <PhysicalStatsCard onEdit={() => setShowStatsModal(true)} />
        <WeightProgressCard onAddWeight={() => setShowWeightModal(true)} selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod} />
        <FitnessStatsCard />
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
    paddingBottom: 16,
    backgroundColor: "#08090C",
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -0.8,
  },
  pageSubtitle: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#6B7280",
    marginTop: 2,
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

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: "#0E1015",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 14,
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#9CA3AF",
    flex: 1,
  },
});

const xpStyles = StyleSheet.create({
  rankRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    marginBottom: 16,
  },
  ringWrap: {
    width: 80,
    height: 80,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ringInner: {
    position: "absolute" as const,
    alignItems: "center" as const,
  },
  ringEmoji: {
    fontSize: 14,
    marginBottom: -2,
  },
  ringLevel: {
    fontSize: 28,
    fontWeight: "900" as const,
    letterSpacing: -2,
    lineHeight: 32,
  },
  rankInfo: {
    flex: 1,
    gap: 8,
  },
  rankBadge: {
    alignSelf: "flex-start" as const,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rankTitle: {
    fontSize: 12,
    fontWeight: "800" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
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
  xpNumbers: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  xpText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  xpRemaining: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
  totalBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  totalText: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
  timeline: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  timelineItem: {
    alignItems: "center" as const,
    gap: 3,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineEmoji: {
    fontSize: 14,
  },
  timelineName: {
    fontSize: 7,
    fontWeight: "600" as const,
    color: "#4B5563",
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
});

const breakdownStyles = StyleSheet.create({
  totalLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#6B7280",
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingVertical: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  label: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#9CA3AF",
    width: 65,
  },
  barTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  barFill: {
    height: "100%" as const,
    borderRadius: 2,
  },
  value: {
    fontSize: 13,
    fontWeight: "800" as const,
    width: 40,
    textAlign: "right" as const,
    letterSpacing: -0.3,
  },
});

const recentStyles = StyleSheet.create({
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  info: {
    flex: 1,
    gap: 1,
  },
  desc: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#D1D5DB",
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

const goalStyles = StyleSheet.create({
  statsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    alignItems: "center" as const,
    gap: 3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#4B5563",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#D1D5DB",
    letterSpacing: -0.3,
  },
  statUnit: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#4B5563",
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  barOuter: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden" as const,
    marginBottom: 6,
  },
  barFill: {
    height: "100%" as const,
    borderRadius: 3,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#4B5563",
    textAlign: "center" as const,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 5,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#4B5563",
  },
  paceTag: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: "center" as const,
  },
  paceText: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  nearBadge: {
    backgroundColor: "rgba(16,185,129,0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: "center" as const,
    marginTop: 6,
  },
  nearText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#10B981",
  },
});

const physStyles = StyleSheet.create({
  editBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#9CA3AF",
  },
  grid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  cell: {
    width: "48%" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 14,
  },
  cellIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cellValue: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -0.3,
  },
  cellLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#4B5563",
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  empty: {
    alignItems: "center" as const,
    paddingVertical: 28,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#6B7280",
  },
  emptyDesc: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#374151",
    textAlign: "center" as const,
    marginBottom: 8,
  },
  addBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: "#00ADB5",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
});

const wpStyles = StyleSheet.create({
  progressStrip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  progressVal: {
    fontSize: 18,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#4B5563",
  },
  periodRow: {
    flexDirection: "row" as const,
    gap: 6,
    marginBottom: 14,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center" as const,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  periodBtnActive: {
    backgroundColor: "#00ADB5",
  },
  periodText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#4B5563",
  },
  periodTextActive: {
    color: "#FFFFFF",
  },
  emptyChart: {
    alignItems: "center" as const,
    paddingVertical: 24,
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500" as const,
  },
  emptyTextSub: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500" as const,
  },
  singleEntry: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 6,
    minWidth: 180,
  },
  singleDate: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  singleWeight: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#D1D5DB",
  },
  recentHeader: {
    marginTop: 10,
    marginBottom: 6,
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  historyRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 8,
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  historyWeight: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#D1D5DB",
  },
});

const fitStyles = StyleSheet.create({
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
    borderRightColor: "rgba(255,255,255,0.06)",
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

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08090C",
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    letterSpacing: -0.3,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  section: {
    marginTop: 18,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#0E1015",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#F3F4F6",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  heightRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  heightField: {
    flex: 1,
    position: "relative" as const,
  },
  heightUnit: {
    position: "absolute" as const,
    right: 16,
    top: 14,
    fontSize: 15,
    color: "#4B5563",
    fontWeight: "600" as const,
  },
  genderRow: {
    flexDirection: "row" as const,
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center" as const,
    backgroundColor: "#0E1015",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  genderBtnActive: {
    backgroundColor: "#00ADB5",
    borderColor: "#00ADB5",
  },
  genderText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  genderTextActive: {
    color: "#FFFFFF",
  },
  saveBtn: {
    backgroundColor: "#00ADB5",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center" as const,
    marginTop: 28,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
});
