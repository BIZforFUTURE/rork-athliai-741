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
  Alert,
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
  Trash2,
  Download,
  Upload,
  ClipboardPaste,
  Shield,
  Check,
} from "lucide-react-native";
import * as Clipboard from 'expo-clipboard';
import { useApp } from "@/providers/AppProvider";
import { RANKS, XPSource, RANK_TRANSLATION_KEYS } from "@/constants/xp";
import { useLanguage } from "@/providers/LanguageProvider";
import { lbsToKg, formatHeightMetric } from "@/utils/metricConversions";

interface WeightEntry {
  date: string;
  weight: number;
}

type StatPeriod = '7d' | '30d' | '90d' | '1y';
type StatsTab = 'progress' | 'profile';

function XPRankCard({ t }: { t: (key: any, params?: Record<string, string | number>) => string }) {
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
        <Text style={cardStyles.cardHeading}>{t('stats_xp_rank')}</Text>
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
            <Text style={[xpStyles.rankTitle, { color: xpInfo.rank.color }]}>{RANK_TRANSLATION_KEYS[xpInfo.rank.title] ? t(RANK_TRANSLATION_KEYS[xpInfo.rank.title]) : xpInfo.rank.title}</Text>
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
              {xpInfo.neededXP - xpInfo.currentXP} {t('stats_to_go_xp')}
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
                {RANK_TRANSLATION_KEYS[rank.title] ? t(RANK_TRANSLATION_KEYS[rank.title]) : rank.title}
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

function XPBreakdownCard({ t }: { t: (key: any, params?: Record<string, string | number>) => string }) {
  const { xpInfo } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }).start();
  }, [fadeIn]);

  if (xpInfo.xpEvents.length === 0) return null;

  const grouped: Record<XPSource, number> = { run: 0, workout: 0, food: 0, nutrition_goal: 0, streak: 0, treadmill_photo: 0 };
  xpInfo.xpEvents.forEach(e => { grouped[e.source] = (grouped[e.source] || 0) + e.amount; });

  const labels: Record<XPSource, string> = { run: t('stats_runs'), workout: t('stats_workouts_label'), food: t('home_food'), nutrition_goal: t('stats_goals'), streak: t('stats_streaks'), treadmill_photo: t('stats_treadmill') };
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
        <Text style={cardStyles.cardHeading}>{t('stats_xp_breakdown')}</Text>
        <Text style={breakdownStyles.totalLabel}>{totalXP.toLocaleString()} {t('stats_total_label')}</Text>
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

function RecentXPCard({ t }: { t: (key: any, params?: Record<string, string | number>) => string }) {
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
    if (mins < 1) return t('common_now');
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <Animated.View style={[cardStyles.card, { opacity: fadeIn }]}>
      <View style={cardStyles.cardHeader}>
        <Zap size={13} color="#6B7280" />
        <Text style={cardStyles.cardHeading}>{t('stats_recent_xp')}</Text>
      </View>
      {recentEvents.map((event) => (
        <View key={event.id} style={recentStyles.row}>
          <View style={[recentStyles.dot, { backgroundColor: getColor(event.source) + "20", borderColor: getColor(event.source) + "40" }]} />
          <View style={recentStyles.info}>
            <Text style={recentStyles.desc} numberOfLines={1}>{event.description}</Text>
            <Text style={recentStyles.time}>{timeAgo(event.date)} {t('common_ago')}</Text>
          </View>
          <Text style={[recentStyles.amount, { color: getColor(event.source) }]}>+{event.amount}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

function WeightGoalCard({ onAddWeight, t, isSpanish }: { onAddWeight: () => void; t: (key: any, params?: Record<string, string | number>) => string; isSpanish: boolean }) {
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
          <Text style={cardStyles.cardHeading}>{t('stats_weight_goal')}</Text>
          <ChevronRight size={14} color="#374151" />
        </View>

        <View style={goalStyles.statsRow}>
          <View style={goalStyles.statItem}>
            <Text style={goalStyles.statLabel}>{t('stats_current')}</Text>
            <Text style={goalStyles.statValue}>{isSpanish ? lbsToKg(currentWeight) : currentWeight}<Text style={goalStyles.statUnit}> {isSpanish ? 'kg' : 'lbs'}</Text></Text>
          </View>
          <View style={goalStyles.divider} />
          <View style={goalStyles.statItem}>
            <Text style={goalStyles.statLabel}>{t('stats_target')}</Text>
            <Text style={goalStyles.statValue}>{isSpanish ? lbsToKg(targetWeight) : targetWeight}<Text style={goalStyles.statUnit}> {isSpanish ? 'kg' : 'lbs'}</Text></Text>
          </View>
          <View style={goalStyles.divider} />
          <View style={goalStyles.statItem}>
            <Text style={goalStyles.statLabel}>{t('stats_left')}</Text>
            <View style={{ flexDirection: "row" as const, alignItems: "center" as const, gap: 3 }}>
              {isGaining ? (
                <TrendingUp size={12} color={remaining > 0 ? "#10B981" : "#EF4444"} />
              ) : (
                <TrendingDown size={12} color={remaining < 0 ? "#10B981" : "#EF4444"} />
              )}
              <Text style={[goalStyles.statValue, { color: Math.abs(remaining) < 5 ? "#10B981" : "#D1D5DB" }]}>
                {isSpanish ? lbsToKg(Math.abs(remaining)).toFixed(1) : Math.abs(remaining).toFixed(1)}<Text style={goalStyles.statUnit}> {isSpanish ? 'kg' : 'lbs'}</Text>
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
          {Math.round(Math.min(Math.max(progress, 0), 100))}{t('stats_complete')}
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
              {onPaceStatus === 'on-pace' && t('stats_on_pace')}
              {onPaceStatus === 'ahead' && t('stats_ahead')}
              {onPaceStatus === 'behind' && t('stats_behind')}
            </Text>
          </View>
        )}

        {Math.abs(remaining) < 5 && (
          <View style={goalStyles.nearBadge}>
            <Text style={goalStyles.nearText}>{t('stats_almost_there')}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

function PhysicalStatsCard({ onEdit, t, isSpanish }: { onEdit: () => void; t: (key: any, params?: Record<string, string | number>) => string; isSpanish: boolean }) {
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
        value: isSpanish ? formatHeightMetric(personalStats.height!) : (() => { const { feet, inches } = inchesToFeetAndInches(personalStats.height!); return `${feet}'${inches}"`; })(),
        label: t('stats_height'),
        color: "#00ADB5",
      },
      {
        icon: <Scale size={16} color="#10B981" />,
        value: isSpanish ? `${lbsToKg(personalStats.weight!)} kg` : `${personalStats.weight} lbs`,
        label: t('stats_weight'),
        color: "#10B981",
      },
    ];
    if (bmi) {
      const cat = getBMICategory(bmi);
      result.push({
        icon: <Activity size={16} color={cat.color} />,
        value: bmi.toFixed(1),
        label: `${t('stats_bmi')} · ${cat.category}`,
        color: cat.color,
      });
    }
    if (personalStats.targetWeight) {
      result.push({
        icon: <Target size={16} color="#F59E0B" />,
        value: isSpanish ? `${lbsToKg(personalStats.targetWeight!)} kg` : `${personalStats.targetWeight} lbs`,
        label: t('stats_target'),
        color: "#F59E0B",
      });
    }
    return result;
  }, [personalStats, bmi, hasStats, t, isSpanish]);

  return (
    <Animated.View style={[cardStyles.card, { opacity: fadeIn }]}>
      <View style={cardStyles.cardHeader}>
        <User size={13} color="#6B7280" />
        <Text style={cardStyles.cardHeading}>{t('stats_physical_stats')}</Text>
        {hasStats && (
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onEdit();
            }}
            style={physStyles.editBtn}
          >
            <Edit3 size={12} color="#9CA3AF" />
            <Text style={physStyles.editText}>{t('stats_edit')}</Text>
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
          <Text style={physStyles.emptyTitle}>{t('stats_no_stats')}</Text>
          <Text style={physStyles.emptyDesc}>{t('stats_add_stats_desc')}</Text>
          <TouchableOpacity
            style={physStyles.addBtn}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onEdit();
            }}
          >
            <Plus size={14} color="#FFFFFF" />
            <Text style={physStyles.addBtnText}>{t('stats_add_stats')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

function WeightProgressCard({ onAddWeight, onEditWeight, onDeleteWeight, selectedPeriod, setSelectedPeriod, t, isSpanish }: {
  onAddWeight: () => void;
  onEditWeight: (entry: WeightEntry) => void;
  onDeleteWeight: (entry: WeightEntry) => void;
  selectedPeriod: StatPeriod;
  setSelectedPeriod: (p: StatPeriod) => void;
  t: (key: any, params?: Record<string, string | number>) => string;
  isSpanish: boolean;
}) {
  const { personalStats, getWeightHistory } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }).start();
  }, [fadeIn]);

  if (!personalStats?.weight) return null;

  const weightProgress = personalStats?.targetWeight && personalStats?.weight
    ? personalStats.weight - personalStats.targetWeight : null;

  const isGaining = (personalStats?.targetWeight ?? 0) > (personalStats?.weight ?? 0);
  const isOnTrack = weightProgress !== null
    ? (isGaining ? weightProgress >= 0 : weightProgress <= 0)
    : false;

  const filteredHistory = getWeightHistory(selectedPeriod);

  return (
    <Animated.View style={[cardStyles.card, { opacity: fadeIn }]}>
      <View style={cardStyles.cardHeader}>
        <TrendingUp size={13} color="#6B7280" />
        <Text style={cardStyles.cardHeading}>{t('stats_weight_progress')}</Text>
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAddWeight();
          }}
          style={physStyles.editBtn}
        >
          <Plus size={12} color="#9CA3AF" />
          <Text style={physStyles.editText}>{t('stats_log')}</Text>
        </TouchableOpacity>
      </View>

      {weightProgress !== null && (
        <View style={wpStyles.progressStrip}>
          {isOnTrack ? (
            <TrendingUp size={16} color="#10B981" />
          ) : (
            <TrendingDown size={16} color="#EF4444" />
          )}
          <Text style={[wpStyles.progressVal, { color: isOnTrack ? '#10B981' : '#EF4444' }]}>
            {Math.abs(weightProgress).toFixed(1)} lbs
          </Text>
          <Text style={wpStyles.progressLabel}>
            {isOnTrack ? t('stats_on_track') : t('stats_to_go', { weight: Math.abs(weightProgress).toFixed(1) })}
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
          <Text style={wpStyles.emptyText}>{t('stats_no_entries')}</Text>
        </View>
      )}

      {filteredHistory.length === 1 && (
        <View style={wpStyles.emptyChart}>
          <BarChart3 size={24} color="#00ADB5" />
          <Text style={wpStyles.emptyTextSub}>{t('stats_add_more')}</Text>
          <View style={wpStyles.singleEntry}>
            <Text style={wpStyles.singleDate}>{new Date(filteredHistory[0].date + 'T00:00:00').toLocaleDateString()}</Text>
            <Text style={wpStyles.singleWeight}>{isSpanish ? lbsToKg(filteredHistory[0].weight) : filteredHistory[0].weight} {isSpanish ? 'kg' : 'lbs'}</Text>
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
              <Text style={wpStyles.recentTitle}>{t('stats_recent')}</Text>
            </View>
            {filteredHistory.slice(0, 5).map((entry: WeightEntry, index: number) => (
              <View key={index} style={wpStyles.historyRow}>
                <Text style={wpStyles.historyDate}>{new Date(entry.date + 'T00:00:00').toLocaleDateString()}</Text>
                <View style={wpStyles.historyActions}>
                  <Text style={wpStyles.historyWeight}>{isSpanish ? lbsToKg(entry.weight) : entry.weight} {isSpanish ? 'kg' : 'lbs'}</Text>
                  <TouchableOpacity
                    onPress={() => onEditWeight(entry)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={wpStyles.historyActionBtn}
                  >
                    <Edit3 size={13} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onDeleteWeight(entry)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={wpStyles.historyActionBtn}
                  >
                    <Trash2 size={13} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        );
      })()}
    </Animated.View>
  );
}

function FitnessStatsCard({ t, isSpanish }: { t: (key: any, params?: Record<string, string | number>) => string; isSpanish: boolean }) {
  const { recentRuns, weeklyRuns } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 350, useNativeDriver: true }).start();
  }, [fadeIn]);

  const currentWeeklyMiles = weeklyRuns.reduce((sum, run) => sum + run.distance, 0);
  const currentLifetimeMiles = recentRuns.reduce((sum, run) => sum + run.distance, 0);

  const items = [
    { value: isSpanish ? (currentWeeklyMiles * 1.60934).toFixed(1) : currentWeeklyMiles.toFixed(1), unit: isSpanish ? "km" : "mi", label: t('stats_this_week'), color: "#00E5FF", icon: <Footprints size={14} color="#00E5FF" /> },
    { value: isSpanish ? (currentLifetimeMiles * 1.60934).toFixed(1) : currentLifetimeMiles.toFixed(1), unit: isSpanish ? "km" : "mi", label: t('stats_all_time'), color: "#FF6B35", icon: <TrendingUp size={14} color="#FF6B35" /> },
    { value: `${weeklyRuns.length}`, unit: "", label: t('stats_runs_wk'), color: "#BFFF00", icon: <Activity size={14} color="#BFFF00" /> },
    { value: `${recentRuns.length}`, unit: "", label: t('stats_total_runs'), color: "#F59E0B", icon: <Target size={14} color="#F59E0B" /> },
  ];

  return (
    <Animated.View style={[cardStyles.card, { opacity: fadeIn }]}>
      <View style={cardStyles.cardHeader}>
        <Activity size={13} color="#6B7280" />
        <Text style={cardStyles.cardHeading}>{t('stats_fitness_stats')}</Text>
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

interface DataBackupCardProps {
  onExport: () => void;
  onImport: () => void;
  exportCopied: boolean;
  runCount: number;
  foodCount: number;
  workoutCount: number;
}

function DataBackupCard({ onExport, onImport, exportCopied, runCount, foodCount, workoutCount, t }: DataBackupCardProps & { t: (key: any, params?: Record<string, string | number>) => string }) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const exportScale = useRef(new Animated.Value(1)).current;
  const importScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }).start();
  }, [fadeIn]);

  const totalEntries = runCount + foodCount + workoutCount;

  return (
    <Animated.View style={[cardStyles.card, { opacity: fadeIn }]}>
      <View style={cardStyles.cardHeader}>
        <Shield size={13} color="#6B7280" />
        <Text style={cardStyles.cardHeading}>{t('stats_data_backup')}</Text>
      </View>

      <View style={bkStyles.statsRow}>
        <View style={bkStyles.statPill}>
          <Footprints size={10} color="#00E5FF" />
          <Text style={[bkStyles.statText, { color: '#00E5FF' }]}>{runCount} {t('stats_runs_label')}</Text>
        </View>
        <View style={bkStyles.statPill}>
          <UtensilsCrossed size={10} color="#BFFF00" />
          <Text style={[bkStyles.statText, { color: '#BFFF00' }]}>{foodCount} {t('stats_meals')}</Text>
        </View>
        <View style={bkStyles.statPill}>
          <Dumbbell size={10} color="#FF6B35" />
          <Text style={[bkStyles.statText, { color: '#FF6B35' }]}>{workoutCount} {t('stats_workouts_count')}</Text>
        </View>
      </View>

      <Text style={bkStyles.desc}>
        {totalEntries > 0
          ? `${totalEntries} ${t('stats_entries_count')}. ${t('stats_export_desc')}`
          : t('stats_no_data')}
      </Text>

      <View style={bkStyles.btnRow}>
        <Pressable
          onPress={onExport}
          onPressIn={() => Animated.spring(exportScale, { toValue: 0.95, useNativeDriver: true, tension: 300, friction: 10 }).start()}
          onPressOut={() => Animated.spring(exportScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start()}
          style={{ flex: 1 }}
        >
          <Animated.View style={[bkStyles.exportBtn, { transform: [{ scale: exportScale }] }]}>
            {exportCopied ? <Check size={16} color="#10B981" /> : <Download size={16} color="#00E5FF" />}
            <Text style={[bkStyles.exportText, exportCopied && { color: '#10B981' }]}>
              {exportCopied ? t('stats_copied') : t('stats_export')}
            </Text>
          </Animated.View>
        </Pressable>
        <Pressable
          onPress={onImport}
          onPressIn={() => Animated.spring(importScale, { toValue: 0.95, useNativeDriver: true, tension: 300, friction: 10 }).start()}
          onPressOut={() => Animated.spring(importScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start()}
          style={{ flex: 1 }}
        >
          <Animated.View style={bkStyles.importBtn}>
            <Upload size={16} color="#F59E0B" />
            <Text style={bkStyles.importText}>{t('stats_restore')}</Text>
          </Animated.View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function PersonalStatsScreen() {
  const { personalStats, updatePersonalStats, addWeightEntry, deleteWeightEntry, updateWeightEntry, exportAllData, importAllData, recentRuns, foodHistory, workoutLogs, isLoading: appLoading } = useApp();
  const { t, isSpanish } = useLanguage();
  const insets = useSafeAreaInsets();
  const [selectedPeriod, setSelectedPeriod] = useState<StatPeriod>('30d');
  const [activeTab, setActiveTab] = useState<StatsTab>('progress');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const segmentAnim = useRef(new Animated.Value(0)).current;
  const [tempHeightFeet, setTempHeightFeet] = useState('');
  const [tempHeightInches, setTempHeightInches] = useState('');
  const [tempWeight, setTempWeight] = useState('');
  const [tempTargetWeight, setTempTargetWeight] = useState('');
  const [tempAge, setTempAge] = useState('');
  const [tempGender, setTempGender] = useState<'male' | 'female' | 'other'>('male');
  const [newWeight, setNewWeight] = useState('');
  const [editingWeightEntry, setEditingWeightEntry] = useState<WeightEntry | null>(null);
  const [showEditWeightModal, setShowEditWeightModal] = useState(false);
  const [editWeight, setEditWeight] = useState('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState('');
  const [exportCopied, setExportCopied] = useState(false);

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
        if (isSpanish) {
          const cm = Math.round(personalStats.height * 2.54);
          setTempHeightFeet(cm.toString());
          setTempHeightInches('0');
        } else {
          const { feet, inches } = inchesToFeetAndInches(personalStats.height);
          setTempHeightFeet(feet.toString());
          setTempHeightInches(inches.toString());
        }
      }
      if (isSpanish) {
        setTempWeight(personalStats.weight ? lbsToKg(personalStats.weight).toString() : '');
        setTempTargetWeight(personalStats.targetWeight ? lbsToKg(personalStats.targetWeight).toString() : '');
      } else {
        setTempWeight(personalStats.weight?.toString() || '');
        setTempTargetWeight(personalStats.targetWeight?.toString() || '');
      }
      setTempAge(personalStats.age?.toString() || '');
      setTempGender(personalStats.gender || 'male');
    }
  }, [personalStats, isSpanish]);

  const handleSaveStats = () => {
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const age = tempAge ? parseInt(tempAge) : undefined;

    if (isSpanish) {
      const cm = parseFloat(tempHeightFeet);
      const weightKg = parseFloat(tempWeight);
      const targetWeightKg = tempTargetWeight ? parseFloat(tempTargetWeight) : undefined;
      if (!cm || !weightKg) return;
      if (cm < 100 || cm > 250) return;
      if (weightKg < 25 || weightKg > 250) return;
      const totalInches = Math.round(cm / 2.54);
      const weightLbs = Math.round(weightKg / 0.453592 * 10) / 10;
      const targetWeightLbs = targetWeightKg ? Math.round(targetWeightKg / 0.453592 * 10) / 10 : undefined;
      updatePersonalStats({ height: totalInches, weight: weightLbs, targetWeight: targetWeightLbs, age, gender: tempGender });
    } else {
      const feet = parseInt(tempHeightFeet);
      const inches = parseInt(tempHeightInches);
      const weight = parseFloat(tempWeight);
      const targetWeight = tempTargetWeight ? parseFloat(tempTargetWeight) : undefined;
      if (!feet || !weight || inches < 0) return;
      if (feet < 3 || feet > 8 || inches < 0 || inches >= 12) return;
      if (weight < 50 || weight > 500) return;
      const totalInches = feetAndInchesToInches(feet, inches);
      updatePersonalStats({ height: totalInches, weight, targetWeight, age, gender: tempGender });
    }
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
    const inputWeight = parseFloat(newWeight);
    if (!inputWeight) return;
    if (isSpanish) {
      if (inputWeight < 25 || inputWeight > 250) return;
      const weightLbs = Math.round(inputWeight / 0.453592 * 10) / 10;
      addWeightEntry({ weight: weightLbs, date: getLocalDateString() });
    } else {
      if (inputWeight < 50 || inputWeight > 500) return;
      addWeightEntry({ weight: inputWeight, date: getLocalDateString() });
    }
    setShowWeightModal(false);
    setNewWeight('');
  };

  const handleEditWeight = (entry: WeightEntry) => {
    setEditingWeightEntry(entry);
    setEditWeight(isSpanish ? lbsToKg(entry.weight).toString() : entry.weight.toString());
    setShowEditWeightModal(true);
  };

  const handleSaveEditWeight = () => {
    if (!editingWeightEntry) return;
    const inputWeight = parseFloat(editWeight);
    if (!inputWeight) return;
    const weight = isSpanish ? Math.round(inputWeight / 0.453592 * 10) / 10 : inputWeight;
    if (!isSpanish && (weight < 50 || weight > 500)) return;
    if (isSpanish && (inputWeight < 25 || inputWeight > 250)) return;
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateWeightEntry(editingWeightEntry.date, weight);
    setShowEditWeightModal(false);
    setEditingWeightEntry(null);
    setEditWeight('');
  };

  const handleExport = useCallback(async () => {
    try {
      const json = exportAllData();
      await Clipboard.setStringAsync(json);
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 3000);
      Alert.alert('Backup Copied', 'Your full backup has been copied to clipboard. Paste it somewhere safe (Notes, email, cloud doc) to keep it.');
    } catch (e) {
      console.error('Export error:', e);
      Alert.alert('Export Failed', 'Could not copy backup to clipboard.');
    }
  }, [exportAllData]);

  const handleImport = useCallback(() => {
    if (!importText.trim()) return;
    Alert.alert(
      'Restore Backup',
      'This will replace ALL your current data with the backup. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => {
            const result = importAllData(importText);
            if (result.success) {
              if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setImportStatus('success');
              setTimeout(() => {
                setShowImportModal(false);
                setImportText('');
                setImportStatus('idle');
              }, 1500);
            } else {
              if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              setImportStatus('error');
              setImportError(result.error || 'Unknown error');
            }
          },
        },
      ]
    );
  }, [importText, importAllData]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setImportText(text);
        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.error('Paste error:', e);
    }
  }, []);

  const handleDeleteWeight = (entry: WeightEntry) => {
    Alert.alert(
      t('stats_delete_weight'),
      `${t('stats_delete_weight_confirm', { date: new Date(entry.date + 'T00:00:00').toLocaleDateString(), weight: isSpanish ? String(lbsToKg(entry.weight)) : String(entry.weight) })}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteWeightEntry(entry.date);
          },
        },
      ]
    );
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
      <Modal visible={showImportModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowImportModal(false); setImportText(''); setImportStatus('idle'); }}>
        <View style={[modalStyles.container, { paddingTop: insets.top }]}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>{t('stats_restore_backup')}</Text>
            <TouchableOpacity onPress={() => { setShowImportModal(false); setImportText(''); setImportStatus('idle'); }} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeText}>{t('common_cancel')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={backupModalStyles.infoBox}>
              <Shield size={16} color="#F59E0B" />
              <Text style={backupModalStyles.infoText}>{t('stats_restore_info')}</Text>
            </View>
            <TouchableOpacity style={backupModalStyles.pasteBtn} onPress={handlePasteFromClipboard} activeOpacity={0.7}>
              <ClipboardPaste size={16} color="#00E5FF" />
              <Text style={backupModalStyles.pasteBtnText}>{t('stats_paste_clipboard')}</Text>
            </TouchableOpacity>
            <TextInput
              style={backupModalStyles.textArea}
              placeholder={t('stats_paste_backup')}
              placeholderTextColor="#374151"
              value={importText}
              onChangeText={(t) => { setImportText(t); setImportStatus('idle'); setImportError(''); }}
              multiline
              textAlignVertical="top"
            />
            {importStatus === 'error' && (
              <View style={backupModalStyles.errorBox}>
                <AlertCircle size={14} color="#EF4444" />
                <Text style={backupModalStyles.errorText}>{importError}</Text>
              </View>
            )}
            {importStatus === 'success' && (
              <View style={backupModalStyles.successBox}>
                <Check size={14} color="#10B981" />
                <Text style={backupModalStyles.successText}>{t('stats_data_restored')}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[modalStyles.saveBtn, { backgroundColor: '#F59E0B', opacity: importText.trim() ? 1 : 0.4 }]}
              onPress={handleImport}
              disabled={!importText.trim() || importStatus === 'success'}
            >
              <Text style={modalStyles.saveBtnText}>{t('stats_restore_data')}</Text>
            </TouchableOpacity>
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showStatsModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowStatsModal(false)}>
        <View style={[modalStyles.container, { paddingTop: insets.top }]}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>{t('stats_update_stats')}</Text>
            <TouchableOpacity onPress={() => setShowStatsModal(false)} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeText}>{t('common_cancel')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false}>
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>{t('stats_height')}</Text>
              <View style={modalStyles.heightRow}>
                <View style={modalStyles.heightField}>
                  <TextInput style={modalStyles.input} placeholder={isSpanish ? "170" : "5"} placeholderTextColor="#374151" value={tempHeightFeet} onChangeText={setTempHeightFeet} keyboardType="numeric" />
                  <Text style={modalStyles.heightUnit}>{isSpanish ? 'cm' : 'ft'}</Text>
                </View>
                {!isSpanish && (
                  <View style={modalStyles.heightField}>
                    <TextInput style={modalStyles.input} placeholder="10" placeholderTextColor="#374151" value={tempHeightInches} onChangeText={setTempHeightInches} keyboardType="numeric" />
                    <Text style={modalStyles.heightUnit}>in</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>{t('stats_current_weight_lbs')}</Text>
              <TextInput style={modalStyles.input} placeholder={isSpanish ? "70" : "150"} placeholderTextColor="#374151" value={tempWeight} onChangeText={setTempWeight} keyboardType="numeric" />
            </View>
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>{t('stats_target_weight_lbs')}</Text>
              <TextInput style={modalStyles.input} placeholder={isSpanish ? "65" : "140"} placeholderTextColor="#374151" value={tempTargetWeight} onChangeText={setTempTargetWeight} keyboardType="numeric" />
            </View>
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>{t('stats_age')}</Text>
              <TextInput style={modalStyles.input} placeholder="25" placeholderTextColor="#374151" value={tempAge} onChangeText={setTempAge} keyboardType="numeric" />
            </View>
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>{t('stats_gender')}</Text>
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
              <Text style={modalStyles.saveBtnText}>{t('common_save')}</Text>
            </TouchableOpacity>
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showEditWeightModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowEditWeightModal(false); setEditingWeightEntry(null); }}>
        <View style={[modalStyles.container, { paddingTop: insets.top }]}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>{t('stats_edit_weight')}</Text>
            <TouchableOpacity onPress={() => { setShowEditWeightModal(false); setEditingWeightEntry(null); setEditWeight(''); }} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeText}>{t('common_cancel')}</Text>
            </TouchableOpacity>
          </View>
          <View style={modalStyles.body}>
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>{editingWeightEntry ? new Date(editingWeightEntry.date + 'T00:00:00').toLocaleDateString() : ''}</Text>
              <TextInput style={modalStyles.input} placeholder="150.5" placeholderTextColor="#374151" value={editWeight} onChangeText={setEditWeight} keyboardType="numeric" autoFocus />
            </View>
            <TouchableOpacity style={modalStyles.saveBtn} onPress={handleSaveEditWeight}>
              <Text style={modalStyles.saveBtnText}>{t('common_save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showWeightModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowWeightModal(false)}>
        <View style={[modalStyles.container, { paddingTop: insets.top }]}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>{t('stats_log_weight')}</Text>
            <TouchableOpacity onPress={() => { setShowWeightModal(false); setNewWeight(''); }} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeText}>{t('common_cancel')}</Text>
            </TouchableOpacity>
          </View>
          <View style={modalStyles.body}>
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>{t('stats_todays_weight')}</Text>
              <TextInput style={modalStyles.input} placeholder="150.5" placeholderTextColor="#374151" value={newWeight} onChangeText={setNewWeight} keyboardType="numeric" autoFocus />
            </View>
            <TouchableOpacity style={modalStyles.saveBtn} onPress={handleAddWeight}>
              <Text style={modalStyles.saveBtnText}>{t('stats_add_entry')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.pageTitle}>{t('stats_title')}</Text>
          <Text style={styles.pageSubtitle}>{t('stats_your_journey')}</Text>
        </View>
      </View>

      <View style={segStyles.container}>
        <View style={segStyles.track}>
          <Animated.View
            style={[
              segStyles.slider,
              {
                transform: [{
                  translateX: segmentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [2, (Dimensions.get('window').width - 40) / 2 - 2],
                  }),
                }],
              },
            ]}
          />
          <Pressable
            style={segStyles.btn}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('progress');
              Animated.spring(segmentAnim, { toValue: 0, useNativeDriver: true, tension: 300, friction: 25 }).start();
            }}
          >
            <Zap size={13} color={activeTab === 'progress' ? '#00E5FF' : '#4B5563'} />
            <Text style={[segStyles.btnText, activeTab === 'progress' && segStyles.btnTextActive]}>{t('stats_progress')}</Text>
          </Pressable>
          <Pressable
            style={segStyles.btn}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('profile');
              Animated.spring(segmentAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 25 }).start();
            }}
          >
            <User size={13} color={activeTab === 'profile' ? '#00E5FF' : '#4B5563'} />
            <Text style={[segStyles.btnText, activeTab === 'profile' && segStyles.btnTextActive]}>{t('stats_profile')}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}
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
        {activeTab === 'progress' ? (
          <>
            <XPRankCard t={t} />
            <XPBreakdownCard t={t} />
            <RecentXPCard t={t} />
            <FitnessStatsCard t={t} isSpanish={isSpanish} />
          </>
        ) : (
          <>
            <PhysicalStatsCard onEdit={() => setShowStatsModal(true)} t={t} isSpanish={isSpanish} />
            <WeightGoalCard onAddWeight={() => setShowWeightModal(true)} t={t} isSpanish={isSpanish} />
            <WeightProgressCard onAddWeight={() => setShowWeightModal(true)} onEditWeight={handleEditWeight} onDeleteWeight={handleDeleteWeight} selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod} t={t} isSpanish={isSpanish} />
            <DataBackupCard
              onExport={handleExport}
              onImport={() => { setShowImportModal(true); setImportText(''); setImportStatus('idle'); setImportError(''); }}
              exportCopied={exportCopied}
              runCount={recentRuns.length}
              foodCount={foodHistory.length}
              workoutCount={workoutLogs.length}
              t={t}
            />
          </>
        )}
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

const segStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  track: {
    flexDirection: "row" as const,
    backgroundColor: "#0E1015",
    borderRadius: 14,
    padding: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    position: "relative" as const,
  },
  slider: {
    position: "absolute" as const,
    top: 2,
    left: 0,
    width: "50%" as const,
    height: "100%" as const,
    backgroundColor: "rgba(0,229,255,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.15)",
  },
  btn: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  btnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#4B5563",
    letterSpacing: -0.2,
  },
  btnTextActive: {
    color: "#E5E7EB",
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
  historyActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  historyActionBtn: {
    padding: 4,
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

const bkStyles = StyleSheet.create({
  statsRow: {
    flexDirection: "row" as const,
    gap: 6,
    marginBottom: 10,
    flexWrap: "wrap" as const,
  },
  statPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  desc: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 14,
  },
  btnRow: {
    flexDirection: "row" as const,
    gap: 8,
  },
  exportBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    backgroundColor: "rgba(0,229,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.15)",
    borderRadius: 12,
    paddingVertical: 12,
  },
  exportText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#00E5FF",
  },
  importBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.15)",
    borderRadius: 12,
    paddingVertical: 12,
  },
  importText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#F59E0B",
  },
});

const backupModalStyles = StyleSheet.create({
  infoBox: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
    backgroundColor: "rgba(245,158,11,0.06)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.12)",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#9CA3AF",
    lineHeight: 19,
  },
  pasteBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: "rgba(0,229,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.12)",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  pasteBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#00E5FF",
  },
  textArea: {
    backgroundColor: "#0E1015",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 13,
    color: "#F3F4F6",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    minHeight: 160,
    maxHeight: 300,
  },
  errorBox: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#EF4444",
  },
  successBox: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: "rgba(16,185,129,0.08)",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#10B981",
  },
});
