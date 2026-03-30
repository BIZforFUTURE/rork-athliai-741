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
  KeyboardAvoidingView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";

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
  ChevronRight,
  Footprints,
  Dumbbell,
  UtensilsCrossed,
  Trash2,
  Download,
  Upload,
  ClipboardPaste,
  Shield,
  Check,
  Award,
  Lock,
} from "lucide-react-native";
import * as Clipboard from 'expo-clipboard';
import { useApp } from "@/providers/AppProvider";

import { useLanguage } from "@/providers/LanguageProvider";
import { lbsToKg, formatHeightMetric } from "@/utils/metricConversions";
import { BADGES, AVATAR_OPTIONS, type BadgeStats } from "@/constants/badges";

interface WeightEntry {
  date: string;
  weight: number;
}

type StatPeriod = '7d' | '30d' | '90d' | '1y';








function AvatarPickerModal({ visible, onClose, onSelect, currentAvatar, t }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  currentAvatar: string;
  t: (key: any, params?: Record<string, string | number>) => string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[avatarModalStyles.container, { paddingTop: insets.top }]}>
        <View style={avatarModalStyles.header}>
          <Text style={avatarModalStyles.title}>{t('avatar_title')}</Text>
          <TouchableOpacity onPress={onClose} style={avatarModalStyles.closeBtn}>
            <Text style={avatarModalStyles.closeText}>{t('common_cancel')}</Text>
          </TouchableOpacity>
        </View>
        <View style={avatarModalStyles.grid}>
          {AVATAR_OPTIONS.map((avatar) => {
            const isSelected = avatar.id === currentAvatar;
            return (
              <TouchableOpacity
                key={avatar.id}
                style={[
                  avatarModalStyles.avatarOption,
                  isSelected && { borderColor: avatar.color, backgroundColor: avatar.color + '15' },
                ]}
                onPress={() => onSelect(avatar.id)}
                activeOpacity={0.7}
              >
                <Text style={avatarModalStyles.avatarEmoji}>{avatar.emoji}</Text>
                {isSelected && (
                  <View style={[avatarModalStyles.checkBadge, { backgroundColor: avatar.color }]}>
                    <Check size={10} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

function ProfileHeader({ onAvatarPress, _t }: { onAvatarPress: () => void; _t: (key: any, params?: Record<string, string | number>) => string }) {
  const { user, xpInfo, stats, recentRuns } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeIn]);

  const selectedAvatar = AVATAR_OPTIONS.find(a => a.id === user.profileImage) || AVATAR_OPTIONS[0];

  return (
    <Animated.View style={[profileStyles.card, { opacity: fadeIn }]}>
      <Pressable
        onPress={onAvatarPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, tension: 300, friction: 10 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start()}
      >
        <Animated.View style={[profileStyles.avatarWrap, { transform: [{ scale: scaleAnim }], borderColor: selectedAvatar.color + '60' }]}>
          <View style={[profileStyles.avatarInner, { backgroundColor: selectedAvatar.color + '18' }]}>
            <Text style={profileStyles.avatarEmoji}>{selectedAvatar.emoji}</Text>
          </View>
          <View style={profileStyles.avatarEditBadge}>
            <Edit3 size={10} color="#FFFFFF" />
          </View>
        </Animated.View>
      </Pressable>
      <View style={profileStyles.infoCol}>
        <View style={profileStyles.nameRow}>
          <Text style={profileStyles.rankEmoji}>{xpInfo.rank.emoji}</Text>
          <Text style={[profileStyles.rankLabel, { color: xpInfo.rank.color }]}>{xpInfo.rank.title}</Text>
        </View>
        <Text style={profileStyles.levelText}>Level {xpInfo.level}</Text>
        <View style={profileStyles.miniStats}>
          <View style={profileStyles.miniStat}>
            <Footprints size={11} color="#00E5FF" />
            <Text style={profileStyles.miniStatVal}>{recentRuns.length}</Text>
          </View>
          <View style={profileStyles.miniStat}>
            <Dumbbell size={11} color="#FF6B35" />
            <Text style={profileStyles.miniStatVal}>{stats.totalWorkouts}</Text>
          </View>
          <View style={profileStyles.miniStat}>
            <Activity size={11} color="#BFFF00" />
            <Text style={profileStyles.miniStatVal}>{xpInfo.totalXP.toLocaleString()}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function AchievementBadges({ t }: { t: (key: any, params?: Record<string, string | number>) => string }) {
  const { stats, recentRuns, workoutLogs, foodHistory, xpInfo } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }).start();
  }, [fadeIn]);

  const badgeStats: BadgeStats = useMemo(() => ({
    totalRuns: recentRuns.length,
    totalWorkouts: workoutLogs.length,
    totalFoodEntries: foodHistory.length,
    runStreak: stats.runStreak,
    workoutStreak: stats.workoutStreak,
    foodStreak: stats.foodStreak,
    totalXP: xpInfo.totalXP,
    level: xpInfo.level,
    totalMiles: recentRuns.reduce((sum, r) => sum + r.distance, 0),
  }), [recentRuns, workoutLogs, foodHistory, stats, xpInfo]);

  const earnedCount = BADGES.filter(b => b.requirement(badgeStats)).length;

  return (
    <Animated.View style={[cardStyles.card, { opacity: fadeIn }]}>
      <View style={cardStyles.cardHeader}>
        <Award size={13} color="#F59E0B" />
        <Text style={cardStyles.cardHeading}>{t('badges_title')}</Text>
        <View style={badgeStyles.countPill}>
          <Text style={badgeStyles.countText}>{earnedCount}/{BADGES.length} {t('badges_earned')}</Text>
        </View>
      </View>
      <View style={badgeStyles.grid}>
        {BADGES.map((badge) => {
          const earned = badge.requirement(badgeStats);
          return (
            <View key={badge.id} style={[badgeStyles.cell, earned && { borderColor: badge.color + '25' }]}>
              <View style={[
                badgeStyles.emojiWrap,
                { backgroundColor: earned ? badge.color + '15' : 'rgba(255,255,255,0.05)' },
              ]}>
                {earned ? (
                  <Text style={badgeStyles.emoji}>{badge.emoji}</Text>
                ) : (
                  <Lock size={16} color="#2C2C2E" />
                )}
              </View>
              <Text style={[badgeStyles.title, earned && { color: '#E5E7EB' }]} numberOfLines={1}>{t(badge.titleKey)}</Text>
              <Text style={[badgeStyles.desc, earned && { color: badge.color + 'AA' }]} numberOfLines={1}>{t(badge.descKey)}</Text>
            </View>
          );
        })}
      </View>
      {earnedCount === 0 && (
        <Text style={badgeStyles.lockedHint}>{t('badges_locked')}</Text>
      )}
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
          <Target size={13} color="#5A5A5E" />
          <Text style={cardStyles.cardHeading}>{t('stats_weight_goal')}</Text>
          <ChevronRight size={14} color="#2C2C2E" />
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
              <Text style={[goalStyles.statValue, { color: Math.abs(remaining) < 5 ? "#10B981" : "#D0D0D0" }]}>
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
            <Calendar size={11} color="#3A3A3C" />
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
        <User size={13} color="#5A5A5E" />
        <Text style={cardStyles.cardHeading}>{t('stats_physical_stats')}</Text>
        {hasStats && (
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onEdit();
            }}
            style={physStyles.editBtn}
          >
            <Edit3 size={12} color="#8E8E93" />
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
          <Scale size={36} color="#2C2C2E" />
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
        <TrendingUp size={13} color="#5A5A5E" />
        <Text style={cardStyles.cardHeading}>{t('stats_weight_progress')}</Text>
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAddWeight();
          }}
          style={physStyles.editBtn}
        >
          <Plus size={12} color="#8E8E93" />
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
          <Calendar size={24} color="#2C2C2E" />
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
                backgroundColor: '#0C1C1E',
                backgroundGradientFrom: '#0C1C1E',
                backgroundGradientTo: '#0C1C1E',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(0, 173, 181, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
                style: { borderRadius: 12 },
                propsForDots: { r: '3', strokeWidth: '1.5', stroke: '#00ADB5', fill: '#0C1C1E' },
                propsForBackgroundLines: { strokeDasharray: '', stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 },
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
                    <Edit3 size={13} color="#5A5A5E" />
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
        <Shield size={13} color="#5A5A5E" />
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
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
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
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const { user, updateUser } = useApp();

  const handleAvatarSelect = useCallback((avatarId: string) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateUser({ profileImage: avatarId });
    setShowAvatarModal(false);
  }, [updateUser]);

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
        <Text style={{ fontSize: 16, color: "#3A3A3C" }}>Loading...</Text>
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
              placeholderTextColor="#2C2C2E"
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
        <KeyboardAvoidingView style={[modalStyles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>{t('stats_update_stats')}</Text>
            <TouchableOpacity onPress={() => setShowStatsModal(false)} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeText}>{t('common_cancel')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>{t('stats_height')}</Text>
              <View style={modalStyles.heightRow}>
                <View style={modalStyles.heightField}>
                  <TextInput style={modalStyles.input} placeholder={isSpanish ? "170" : "5"} placeholderTextColor="#2C2C2E" value={tempHeightFeet} onChangeText={setTempHeightFeet} keyboardType="numeric" />
                  <Text style={modalStyles.heightUnit}>{isSpanish ? 'cm' : 'ft'}</Text>
                </View>
                {!isSpanish && (
                  <View style={modalStyles.heightField}>
                    <TextInput style={modalStyles.input} placeholder="10" placeholderTextColor="#2C2C2E" value={tempHeightInches} onChangeText={setTempHeightInches} keyboardType="numeric" />
                    <Text style={modalStyles.heightUnit}>in</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>{t('stats_current_weight_lbs')}</Text>
              <TextInput style={modalStyles.input} placeholder={isSpanish ? "70" : "150"} placeholderTextColor="#2C2C2E" value={tempWeight} onChangeText={setTempWeight} keyboardType="numeric" />
            </View>
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>{t('stats_target_weight_lbs')}</Text>
              <TextInput style={modalStyles.input} placeholder={isSpanish ? "65" : "140"} placeholderTextColor="#2C2C2E" value={tempTargetWeight} onChangeText={setTempTargetWeight} keyboardType="numeric" />
            </View>
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>{t('stats_age')}</Text>
              <TextInput style={modalStyles.input} placeholder="25" placeholderTextColor="#2C2C2E" value={tempAge} onChangeText={setTempAge} keyboardType="numeric" />
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
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showEditWeightModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowEditWeightModal(false); setEditingWeightEntry(null); }}>
        <KeyboardAvoidingView style={[modalStyles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>{t('stats_edit_weight')}</Text>
            <TouchableOpacity onPress={() => { setShowEditWeightModal(false); setEditingWeightEntry(null); setEditWeight(''); }} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeText}>{t('common_cancel')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={modalStyles.body} keyboardShouldPersistTaps="handled">
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>{editingWeightEntry ? new Date(editingWeightEntry.date + 'T00:00:00').toLocaleDateString() : ''}</Text>
              <TextInput style={modalStyles.input} placeholder="150.5" placeholderTextColor="#2C2C2E" value={editWeight} onChangeText={setEditWeight} keyboardType="numeric" autoFocus />
            </View>
            <TouchableOpacity style={modalStyles.saveBtn} onPress={handleSaveEditWeight}>
              <Text style={modalStyles.saveBtnText}>{t('common_save')}</Text>
            </TouchableOpacity>
            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showWeightModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowWeightModal(false)}>
        <KeyboardAvoidingView style={[modalStyles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>{t('stats_log_weight')}</Text>
            <TouchableOpacity onPress={() => { setShowWeightModal(false); setNewWeight(''); }} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeText}>{t('common_cancel')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={modalStyles.body} keyboardShouldPersistTaps="handled">
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>{t('stats_todays_weight')}</Text>
              <TextInput style={modalStyles.input} placeholder="150.5" placeholderTextColor="#2C2C2E" value={newWeight} onChangeText={setNewWeight} keyboardType="numeric" autoFocus />
            </View>
            <TouchableOpacity style={modalStyles.saveBtn} onPress={handleAddWeight}>
              <Text style={modalStyles.saveBtnText}>{t('stats_add_entry')}</Text>
            </TouchableOpacity>
            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.pageTitle}>{t('stats_title')}</Text>
          <Text style={styles.pageSubtitle}>{t('stats_your_journey')}</Text>
        </View>
      </View>

      <AvatarPickerModal
        visible={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSelect={handleAvatarSelect}
        currentAvatar={user.profileImage || 'default'}
        t={t}
      />

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
        <ProfileHeader onAvatarPress={() => setShowAvatarModal(true)} _t={t} />
        <AchievementBadges t={t} />
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
        <View style={{ height: 40 }} />
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#F3EDE4",
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: "400" as const,
    color: "#2C2C2C",
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  pageSubtitle: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#A8A8A0",
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
    backgroundColor: "#FEFCF9",
    borderRadius: 20,
    padding: 16,
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
    gap: 6,
    marginBottom: 14,
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#2C2C2C",
    flex: 1,
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
    color: "#A8A8A0",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#2C2C2C",
    letterSpacing: -0.3,
  },
  statUnit: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "#A8A8A0",
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  barOuter: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.04)",
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
    color: "#A8A8A0",
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
    color: "#A8A8A0",
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
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#7A7A7A",
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
    backgroundColor: "#F0EBE3",
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
    color: "#2C2C2C",
    letterSpacing: -0.3,
  },
  cellLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#A8A8A0",
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
    color: "#5A5A5E",
  },
  emptyDesc: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#2C2C2E",
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
    color: "#3A3A3C",
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
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  periodBtnActive: {
    backgroundColor: "#00ADB5",
  },
  periodText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#3A3A3C",
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
    color: "#2C2C2E",
    fontWeight: "500" as const,
  },
  emptyTextSub: {
    fontSize: 12,
    color: "#2C2C2E",
    fontWeight: "500" as const,
  },
  singleEntry: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 6,
    minWidth: 180,
  },
  singleDate: {
    fontSize: 12,
    color: "#5A5A5E",
    fontWeight: "500" as const,
  },
  singleWeight: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#D0D0D0",
  },
  recentHeader: {
    marginTop: 10,
    marginBottom: 6,
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#5A5A5E",
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
    color: "#5A5A5E",
    fontWeight: "500" as const,
  },
  historyWeight: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#D0D0D0",
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


const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: "#E8E8E8",
    letterSpacing: -0.3,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#5A5A5E",
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
    color: "#5A5A5E",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#0A0A0C",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#E8E8E8",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
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
    color: "#3A3A3C",
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
    backgroundColor: "#0A0A0C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  genderBtnActive: {
    backgroundColor: "#00ADB5",
    borderColor: "#00ADB5",
  },
  genderText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#5A5A5E",
  },
  genderTextActive: {
    color: "#FFFFFF",
  },
  saveBtn: {
    backgroundColor: "#4A7C59",
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
    backgroundColor: "rgba(0,0,0,0.03)",
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
    color: "#A8A8A0",
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
    backgroundColor: "rgba(74,124,89,0.06)",
    borderRadius: 12,
    paddingVertical: 12,
  },
  exportText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#4A7C59",
  },
  importBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    backgroundColor: "rgba(212,160,83,0.08)",
    borderRadius: 12,
    paddingVertical: 12,
  },
  importText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#F59E0B",
  },
});

const profileStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FEFCF9",
    borderRadius: 24,
    padding: 18,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 16,
    overflow: "hidden" as const,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowRadius: 20,
  },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    position: "relative" as const,
  },
  avatarInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  avatarEmoji: {
    fontSize: 30,
  },
  avatarEditBadge: {
    position: "absolute" as const,
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#4A7C59",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: "#0A0A0C",
  },
  infoCol: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  rankEmoji: {
    fontSize: 16,
  },
  rankLabel: {
    fontSize: 16,
    fontWeight: "800" as const,
    letterSpacing: 3,
    textTransform: "uppercase" as const,
  },
  levelText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#5A5A5E",
  },
  miniStats: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 4,
  },
  miniStat: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  miniStatVal: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#8E8E93",
  },
});

const badgeStyles = StyleSheet.create({
  countPill: {
    backgroundColor: "rgba(249,115,22,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.6)",
  },
  countText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: "#F97316",
  },
  grid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  cell: {
    width: "30%" as unknown as number,
    flexGrow: 1,
    flexBasis: "28%" as unknown as number,
    alignItems: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 6,
    backgroundColor: "#1A1A1C",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    gap: 5,
    overflow: "hidden" as const,
  },
  emojiWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  emoji: {
    fontSize: 20,
  },
  title: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#5A5A5E",
    textAlign: "center" as const,
  },
  desc: {
    fontSize: 9,
    fontWeight: "500" as const,
    color: "#2C2C2E",
    textAlign: "center" as const,
  },
  lockedHint: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#2C2C2E",
    textAlign: "center" as const,
    marginTop: 10,
  },
});

const avatarModalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  title: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: "#E8E8E8",
    letterSpacing: -0.3,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#5A5A5E",
  },
  grid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 14,
    padding: 20,
    justifyContent: "center" as const,
  },
  avatarOption: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.10)",
    position: "relative" as const,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  checkBadge: {
    position: "absolute" as const,
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: "#08090C",
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
    color: "#8E8E93",
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
    backgroundColor: "#0A0A0C",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 13,
    color: "#E8E8E8",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
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
