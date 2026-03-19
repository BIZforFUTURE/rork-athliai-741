import React, { useState, useEffect } from "react";
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
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
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
} from "lucide-react-native";
import { useApp } from "@/providers/AppProvider";
import { RANKS, XPSource } from "@/constants/xp";

interface WeightEntry {
  date: string;
  weight: number;
}

type StatPeriod = '7d' | '30d' | '90d' | '1y';

export default function PersonalStatsScreen() {
  const { recentRuns, weeklyRuns, personalStats, updatePersonalStats, addWeightEntry, getWeightHistory, xpInfo, isLoading: appLoading } = useApp();
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

  const currentWeeklyMiles = weeklyRuns.reduce((sum, run) => sum + run.distance, 0);
  const currentLifetimeMiles = recentRuns.reduce((sum, run) => sum + run.distance, 0);
  const totalRuns = recentRuns.length;

  const calculateBMI = (weightLbs: number, heightInches: number) => {
    return (weightLbs / (heightInches * heightInches)) * 703;
  };

  const bmi = personalStats?.height && personalStats?.weight ? 
    calculateBMI(personalStats.weight, personalStats.height) : null;

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Underweight', color: '#00ADB5' };
    if (bmi < 25) return { category: 'Normal', color: '#10B981' };
    if (bmi < 30) return { category: 'Overweight', color: '#F59E0B' };
    return { category: 'Obese', color: '#EF4444' };
  };

  const weightProgress = personalStats?.targetWeight && personalStats?.weight ? 
    personalStats.weight - personalStats.targetWeight : null;

  const handleSaveStats = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    console.log('handleSaveStats called');
    console.log('Form values:', { tempHeightFeet, tempHeightInches, tempWeight, tempTargetWeight, tempAge, tempGender });
    
    const feet = parseInt(tempHeightFeet);
    const inches = parseInt(tempHeightInches);
    const weight = parseFloat(tempWeight);
    const targetWeight = tempTargetWeight ? parseFloat(tempTargetWeight) : undefined;
    const age = tempAge ? parseInt(tempAge) : undefined;

    if (!feet || !weight || inches < 0) {
      console.log('Required Fields: Please enter your height and weight.');
      return;
    }

    if (feet < 3 || feet > 8 || inches < 0 || inches >= 12) {
      console.log('Invalid Height: Please enter a valid height (3-8 feet, 0-11 inches).');
      return;
    }

    if (weight < 50 || weight > 500) {
      console.log('Invalid Weight: Please enter a valid weight between 50-500 lbs.');
      return;
    }

    const totalInches = feetAndInchesToInches(feet, inches);
    
    console.log('Updating personal stats with:', {
      height: totalInches,
      weight,
      targetWeight,
      age,
      gender: tempGender,
    });

    updatePersonalStats({
      height: totalInches,
      weight,
      targetWeight,
      age,
      gender: tempGender,
    });
    
    setShowStatsModal(false);
  };

  const getLocalDateString = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleAddWeight = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const weight = parseFloat(newWeight);
    
    if (!weight || weight < 50 || weight > 500) {
      console.log('Invalid Weight: Please enter a valid weight between 50-500 lbs.');
      return;
    }

    addWeightEntry({
      weight,
      date: getLocalDateString(),
    });
    
    setShowWeightModal(false);
    setNewWeight('');
  };
  
  if (appLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const renderStatsModal = () => (
    <Modal
      visible={showStatsModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowStatsModal(false)}
    >
      <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={["#00ADB5", "#1E293B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modalHeader}
        >
          <View style={styles.modalHeaderContent}>
            <Edit3 size={32} color="#FFFFFF" />
            <Text style={styles.modalTitle}>Update Your Stats</Text>
          </View>
          <Text style={styles.modalSubtitle}>
            Keep track of your physical measurements
          </Text>
        </LinearGradient>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Physical Measurements</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Height</Text>
              <View style={styles.heightInputContainer}>
                <View style={styles.heightInput}>
                  <TextInput
                    style={styles.input}
                    placeholder="5"
                    placeholderTextColor="#9CA3AF"
                    value={tempHeightFeet}
                    onChangeText={setTempHeightFeet}
                    keyboardType="numeric"
                  />
                  <Text style={styles.heightUnit}>ft</Text>
                </View>
                <View style={styles.heightInput}>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    placeholderTextColor="#9CA3AF"
                    value={tempHeightInches}
                    onChangeText={setTempHeightInches}
                    keyboardType="numeric"
                  />
                  <Text style={styles.heightUnit}>in</Text>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Weight (lbs)</Text>
              <TextInput
                style={styles.input}
                placeholder="150"
                placeholderTextColor="#9CA3AF"
                value={tempWeight}
                onChangeText={setTempWeight}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Weight (lbs) - Optional</Text>
              <TextInput
                style={styles.input}
                placeholder="140"
                placeholderTextColor="#9CA3AF"
                value={tempTargetWeight}
                onChangeText={setTempTargetWeight}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age - Optional</Text>
              <TextInput
                style={styles.input}
                placeholder="25"
                placeholderTextColor="#9CA3AF"
                value={tempAge}
                onChangeText={setTempAge}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderSelector}>
                {(['male', 'female', 'other'] as const).map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderButton,
                      tempGender === gender && styles.genderButtonSelected,
                    ]}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setTempGender(gender);
                    }}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      tempGender === gender && styles.genderButtonTextSelected,
                    ]}>
                      {gender.charAt(0).toUpperCase() + gender.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                handleSaveStats();
              }}
            >
              <Text style={styles.saveButtonText}>Save Stats</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowStatsModal(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderWeightModal = () => (
    <Modal
      visible={showWeightModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowWeightModal(false)}
    >
      <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={["#00ADB5", "#1E293B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modalHeader}
        >
          <View style={styles.modalHeaderContent}>
            <Plus size={32} color="#FFFFFF" />
            <Text style={styles.modalTitle}>Add Weight Entry</Text>
          </View>
          <Text style={styles.modalSubtitle}>
            Track your weight progress over time
          </Text>
        </LinearGradient>

        <View style={styles.modalContent}>
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Today&apos;s Weight</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight (lbs)</Text>
              <TextInput
                style={styles.input}
                placeholder="150.5"
                placeholderTextColor="#9CA3AF"
                value={newWeight}
                onChangeText={setNewWeight}
                keyboardType="numeric"
                autoFocus
              />
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                handleAddWeight();
              }}
            >
              <Text style={styles.saveButtonText}>Add Entry</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowWeightModal(false);
                setNewWeight('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {renderStatsModal()}
      {renderWeightModal()}
      
      <View style={[styles.headerBackground, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <User size={32} color="#00ADB5" />
            <Text style={styles.headerTitle}>Personal Stats</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>Track your fitness journey</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>XP &amp; Rank</Text>
          
          <View style={xpStatStyles.rankHeader}>
            <Text style={xpStatStyles.rankEmoji}>{xpInfo.rank.emoji}</Text>
            <View style={xpStatStyles.rankInfo}>
              <Text style={[xpStatStyles.rankLevel, { color: xpInfo.rank.color }]}>Level {xpInfo.level}</Text>
              <Text style={[xpStatStyles.rankName, { color: xpInfo.rank.color }]}>{xpInfo.rank.title}</Text>
            </View>
            <View style={xpStatStyles.totalXPBadge}>
              <Text style={xpStatStyles.totalXPText}>{xpInfo.totalXP.toLocaleString()} XP</Text>
            </View>
          </View>

          <View style={xpStatStyles.progressContainer}>
            <View style={xpStatStyles.progressBar}>
              <View style={[xpStatStyles.progressFill, { width: `${Math.round(xpInfo.progress * 100)}%`, backgroundColor: xpInfo.rank.color }]} />
            </View>
            <Text style={xpStatStyles.progressText}>{xpInfo.currentXP} / {xpInfo.neededXP} XP to next level</Text>
          </View>

          <View style={xpStatStyles.rankTimeline}>
            {RANKS.map((rank, index) => {
              const isCurrentOrPast = xpInfo.level >= rank.minLevel;
              const isCurrent = index < RANKS.length - 1
                ? xpInfo.level >= rank.minLevel && xpInfo.level < RANKS[index + 1].minLevel
                : xpInfo.level >= rank.minLevel;
              return (
                <View key={rank.title} style={xpStatStyles.rankTimelineItem}>
                  <View style={[
                    xpStatStyles.rankDot,
                    { backgroundColor: isCurrentOrPast ? rank.color : '#1F2937' },
                    isCurrent && { borderWidth: 2, borderColor: '#FFFFFF' },
                  ]} />
                  <Text style={[xpStatStyles.rankTimelineLabel, isCurrentOrPast && { color: rank.color }]}>
                    {rank.emoji}
                  </Text>
                  <Text style={[xpStatStyles.rankTimelineName, isCurrentOrPast && { color: '#9CA3AF' }]}>
                    {rank.title}
                  </Text>
                </View>
              );
            })}
          </View>

          {xpInfo.xpEvents.length > 0 && (
            <View style={xpStatStyles.breakdownSection}>
              <Text style={xpStatStyles.breakdownTitle}>XP Breakdown</Text>
              {(() => {
                const grouped: Record<XPSource, number> = { run: 0, workout: 0, food: 0, nutrition_goal: 0, streak: 0 };
                xpInfo.xpEvents.forEach(e => { grouped[e.source] = (grouped[e.source] || 0) + e.amount; });
                const labels: Record<XPSource, string> = { run: 'Runs', workout: 'Workouts', food: 'Food Logging', nutrition_goal: 'Nutrition Goals', streak: 'Streaks' };
                const colors: Record<XPSource, string> = { run: '#00E5FF', workout: '#00ADB5', food: '#BFFF00', nutrition_goal: '#F59E0B', streak: '#E879F9' };
                const totalXPFromEvents = Object.values(grouped).reduce((a, b) => a + b, 0);
                return Object.entries(grouped)
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, value]) => (
                    <View key={key} style={xpStatStyles.breakdownRow}>
                      <View style={xpStatStyles.breakdownLabelRow}>
                        <View style={[xpStatStyles.breakdownColorDot, { backgroundColor: colors[key as XPSource] }]} />
                        <Text style={xpStatStyles.breakdownLabel}>{labels[key as XPSource]}</Text>
                      </View>
                      <View style={xpStatStyles.breakdownBarContainer}>
                        <View style={[xpStatStyles.breakdownBar, { width: `${totalXPFromEvents > 0 ? (value / totalXPFromEvents) * 100 : 0}%`, backgroundColor: colors[key as XPSource] }]} />
                      </View>
                      <Text style={xpStatStyles.breakdownValue}>{value}</Text>
                    </View>
                  ));
              })()}
            </View>
          )}

          {xpInfo.xpEvents.length > 0 && (
            <View style={xpStatStyles.recentSection}>
              <Text style={xpStatStyles.breakdownTitle}>Recent XP</Text>
              {xpInfo.xpEvents.slice(-5).reverse().map(event => (
                <View key={event.id} style={xpStatStyles.recentRow}>
                  <Text style={xpStatStyles.recentDesc} numberOfLines={1}>{event.description}</Text>
                  <Text style={xpStatStyles.recentAmount}>+{event.amount}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {personalStats.targetWeight && personalStats.weight && (
          <TouchableOpacity 
            style={styles.weightProgressCard}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setShowWeightModal(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.weightProgressHeader}>
              <View style={styles.weightProgressTitleContainer}>
                <Target size={24} color="#00ADB5" />
                <Text style={styles.weightProgressTitle}>Weight Goal Progress</Text>
              </View>
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation();
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowWeightModal(true);
                }}
                style={styles.addWeightButton}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addWeightButtonText}>Log</Text>
              </TouchableOpacity>
            </View>
            
            {(() => {
              const weightHistory = getWeightHistory('30d');
              const currentWeight = personalStats.weight;
              const targetWeight = personalStats.targetWeight;
              const startWeight = weightHistory.length > 0 
                ? weightHistory[weightHistory.length - 1].weight 
                : currentWeight;
              
              const totalChange = targetWeight - startWeight;
              const currentChange = currentWeight - startWeight;
              const progress = totalChange !== 0 ? (currentChange / totalChange) * 100 : 0;
              const remaining = targetWeight - currentWeight;
              const isGaining = targetWeight > startWeight;
              
              let onPaceStatus = null;
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
                    const actualProgress = actualWeightChange;
                    
                    const progressDiff = Math.abs(actualProgress - expectedProgress);
                    const tolerance = Math.abs(requiredWeightChange) * 0.1;
                    
                    if (progressDiff <= tolerance) {
                      onPaceStatus = 'on-pace';
                    } else if ((isGaining && actualProgress < expectedProgress) || (!isGaining && actualProgress > expectedProgress)) {
                      onPaceStatus = 'behind';
                    } else {
                      onPaceStatus = 'ahead';
                    }
                  }
                }
              }
              
              return (
                <>
                  <View style={styles.weightStatsRow}>
                    <View style={styles.weightStatItem}>
                      <Text style={styles.weightStatLabel}>Current</Text>
                      <Text style={styles.weightStatValue}>{currentWeight} lbs</Text>
                    </View>
                    <View style={styles.weightStatDivider} />
                    <View style={styles.weightStatItem}>
                      <Text style={styles.weightStatLabel}>Target</Text>
                      <Text style={styles.weightStatValue}>{targetWeight} lbs</Text>
                    </View>
                    <View style={styles.weightStatDivider} />
                    <View style={styles.weightStatItem}>
                      <Text style={styles.weightStatLabel}>Remaining</Text>
                      <View style={styles.weightStatValueRow}>
                        {isGaining ? (
                          <TrendingUp size={16} color={remaining > 0 ? "#10B981" : "#EF4444"} />
                        ) : (
                          <TrendingDown size={16} color={remaining < 0 ? "#10B981" : "#EF4444"} />
                        )}
                        <Text style={[
                          styles.weightStatValue,
                          { color: Math.abs(remaining) < 5 ? "#10B981" : "#9CA3AF" }
                        ]}>
                          {Math.abs(remaining).toFixed(1)} lbs
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.weightProgressBarContainer}>
                    <View style={styles.weightProgressBar}>
                      <View 
                        style={[
                          styles.weightProgressBarFill,
                          { 
                            width: `${Math.min(Math.max(progress, 0), 100)}%`,
                            backgroundColor: progress >= 100 ? "#10B981" : "#00ADB5"
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.weightProgressPercentage}>
                      {Math.round(Math.min(Math.max(progress, 0), 100))}% Complete
                    </Text>
                  </View>
                  
                  {personalStats.goalEndDate && (
                    <View style={styles.goalDateContainer}>
                      <Calendar size={14} color="#9CA3AF" />
                      <Text style={styles.goalDateText}>
                        Goal Date: {new Date(personalStats.goalEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                  )}
                  
                  {onPaceStatus && (
                    <View style={[
                      styles.paceIndicator,
                      onPaceStatus === 'on-pace' && styles.paceIndicatorOnPace,
                      onPaceStatus === 'ahead' && styles.paceIndicatorAhead,
                      onPaceStatus === 'behind' && styles.paceIndicatorBehind,
                    ]}>
                      {onPaceStatus === 'on-pace' && <CheckCircle size={16} color="#10B981" />}
                      {onPaceStatus === 'ahead' && <TrendingUp size={16} color="#00ADB5" />}
                      {onPaceStatus === 'behind' && <AlertCircle size={16} color="#F59E0B" />}
                      <Text style={[
                        styles.paceIndicatorText,
                        onPaceStatus === 'on-pace' && styles.paceIndicatorTextOnPace,
                        onPaceStatus === 'ahead' && styles.paceIndicatorTextAhead,
                        onPaceStatus === 'behind' && styles.paceIndicatorTextBehind,
                      ]}>
                        {onPaceStatus === 'on-pace' && 'On Pace to Hit Goal!'}
                        {onPaceStatus === 'ahead' && 'Ahead of Schedule!'}
                        {onPaceStatus === 'behind' && 'Behind Schedule'}
                      </Text>
                    </View>
                  )}
                  
                  {Math.abs(remaining) < 5 && (
                    <View style={styles.weightGoalNearBadge}>
                      <Text style={styles.weightGoalNearText}>🎯 Almost there!</Text>
                    </View>
                  )}
                </>
              );
            })()}
          </TouchableOpacity>
        )}

        <View style={styles.statsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Physical Stats</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowStatsModal(true);
              }}
            >
              <Edit3 size={18} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {personalStats?.height && personalStats?.weight ? (
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ruler size={24} color="#00ADB5" />
                <Text style={styles.statValue}>
                  {(() => {
                    const { feet, inches } = inchesToFeetAndInches(personalStats.height);
                    return `${feet}ft ${inches}in`;
                  })()} 
                </Text>
                <Text style={styles.statLabel}>Height</Text>
              </View>

              <View style={styles.statItem}>
                <Scale size={24} color="#10B981" />
                <Text style={styles.statValue}>{personalStats.weight} lbs</Text>
                <Text style={styles.statLabel}>Weight</Text>
              </View>

              {bmi && (
                <View style={styles.statItem}>
                  <Activity size={24} color={getBMICategory(bmi).color} />
                  <Text style={[styles.statValue, { color: getBMICategory(bmi).color }]}>
                    {bmi.toFixed(1)}
                  </Text>
                  <Text style={styles.statLabel}>BMI - {getBMICategory(bmi).category}</Text>
                </View>
              )}

              {personalStats.targetWeight && (
                <View style={styles.statItem}>
                  <Target size={24} color="#F59E0B" />
                  <Text style={styles.statValue}>{personalStats.targetWeight} lbs</Text>
                  <Text style={styles.statLabel}>Target Weight</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Scale size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No stats yet</Text>
              <Text style={styles.emptyText}>
                Add your height and weight to start tracking your progress
              </Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowStatsModal(true);
                }}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add Stats</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {personalStats?.weight && (
          <View style={styles.statsCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Weight Progress</Text>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowWeightModal(true);
                }}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.editButtonText}>Add Entry</Text>
              </TouchableOpacity>
            </View>

            {weightProgress !== null && (
              <View style={styles.progressIndicator}>
                <View style={styles.progressItem}>
                  {weightProgress > 0 ? (
                    <TrendingUp size={24} color="#10B981" />
                  ) : (
                    <TrendingDown size={24} color="#EF4444" />
                  )}
                  <Text style={[
                    styles.progressValue,
                    { color: weightProgress > 0 ? '#10B981' : '#EF4444' }
                  ]}>
                    {Math.abs(weightProgress).toFixed(1)} lbs
                  </Text>
                  <Text style={styles.progressLabel}>
                    {weightProgress > 0 ? 'Above target' : 'Below target'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.periodSelector}>
              {(['7d', '30d', '90d', '1y'] as StatPeriod[]).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    selectedPeriod === period && styles.periodButtonSelected,
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setSelectedPeriod(period);
                  }}
                >
                  <Text style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextSelected,
                  ]}>
                    {period === '7d' ? '7 Days' : 
                     period === '30d' ? '30 Days' :
                     period === '90d' ? '90 Days' : '1 Year'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(() => {
              const filteredHistory = getWeightHistory(selectedPeriod);
              if (filteredHistory.length === 0) {
                return (
                  <View style={styles.emptyHistory}>
                    <Calendar size={32} color="#9CA3AF" />
                    <Text style={styles.emptyHistoryText}>No weight entries yet</Text>
                  </View>
                );
              }
              
              if (filteredHistory.length === 1) {
                return (
                  <View style={styles.singleEntryContainer}>
                    <BarChart3 size={32} color="#00ADB5" />
                    <Text style={styles.singleEntryTitle}>Need more data</Text>
                    <Text style={styles.singleEntryText}>
                      Add more weight entries to see your progress graph
                    </Text>
                    <View style={styles.singleEntry}>
                      <Text style={styles.singleEntryDate}>
                        {new Date(filteredHistory[0].date + 'T00:00:00').toLocaleDateString()}
                      </Text>
                      <Text style={styles.singleEntryWeight}>{filteredHistory[0].weight} lbs</Text>
                    </View>
                  </View>
                );
              }
              
              const sortedHistory = [...filteredHistory].reverse();
              const weights = sortedHistory.map(entry => entry.weight);
              const labels = sortedHistory.map(entry => {
                const date = new Date(entry.date + 'T00:00:00');
                return selectedPeriod === '7d' || selectedPeriod === '30d' 
                  ? `${date.getMonth() + 1}/${date.getDate()}`
                  : `${date.getMonth() + 1}/${date.getDate().toString().padStart(2, '0')}`;
              });
              
              const screenWidth = Dimensions.get('window').width;
              const chartWidth = screenWidth - 60;
              
              return (
                <View style={styles.chartContainer}>
                  <View style={styles.chartHeader}>
                    <BarChart3 size={20} color="#00ADB5" />
                    <Text style={styles.chartTitle}>Weight Progress</Text>
                  </View>
                  
                  <LineChart
                    data={{
                      labels: labels.length > 6 ? labels.filter((_, i) => i % Math.ceil(labels.length / 6) === 0) : labels,
                      datasets: [{
                        data: weights,
                        color: (opacity = 1) => `rgba(0, 173, 181, ${opacity})`,
                        strokeWidth: 3,
                      }]
                    }}
                    width={chartWidth}
                    height={220}
                    yAxisSuffix=" lbs"
                    yAxisInterval={1}
                    fromZero={false}
                    chartConfig={{
                      backgroundColor: '#171B22',
                      backgroundGradientFrom: '#171B22',
                      backgroundGradientTo: '#171B22',
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(0, 173, 181, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
                      style: {
                        borderRadius: 16,
                      },
                      propsForDots: {
                        r: '4',
                        strokeWidth: '2',
                        stroke: '#00ADB5',
                        fill: '#171B22'
                      },
                      propsForBackgroundLines: {
                        strokeDasharray: '',
                        stroke: '#0D0F13',
                        strokeWidth: 1
                      },
                      propsForLabels: {
                        fontSize: 12
                      }
                    }}
                    bezier
                    style={styles.chartStyle}
                  />
                  
                  <View style={styles.recentEntriesHeader}>
                    <Text style={styles.recentEntriesTitle}>Recent Entries</Text>
                  </View>
                  <View style={styles.recentEntriesList}>
                    {filteredHistory.slice(0, 3).map((entry: WeightEntry, index: number) => (
                      <View key={index} style={styles.historyItem}>
                        <Text style={styles.historyDate}>
                          {new Date(entry.date + 'T00:00:00').toLocaleDateString()}
                        </Text>
                        <Text style={styles.historyWeight}>{entry.weight} lbs</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}
          </View>
        )}

        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Fitness Stats</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Activity size={24} color="#00ADB5" />
              <Text style={styles.statValue}>{currentWeeklyMiles.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Miles This Week</Text>
            </View>

            <View style={styles.statItem}>
              <TrendingUp size={24} color="#00ADB5" />
              <Text style={styles.statValue}>{currentLifetimeMiles.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Total Miles</Text>
            </View>

            <View style={styles.statItem}>
              <Target size={24} color="#00ADB5" />
              <Text style={styles.statValue}>{totalRuns}</Text>
              <Text style={styles.statLabel}>Total Runs</Text>
            </View>

            <View style={styles.statItem}>
              <Calendar size={24} color="#00ADB5" />
              <Text style={styles.statValue}>{weeklyRuns.length}</Text>
              <Text style={styles.statLabel}>Runs This Week</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0F13",
  },
  headerBackground: {
    backgroundColor: "#0D0F13",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#F9FAFB",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -20,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  statsCard: {
    backgroundColor: "#171B22",
    borderRadius: 20,
    padding: 20,
    marginTop: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F9FAFB",
    borderBottomWidth: 2,
    borderBottomColor: "#00ADB5",
    paddingBottom: 8,
    marginBottom: 12,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#00ADB5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  statItem: {
    width: "47%",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#0D0F13",
    borderRadius: 15,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F9FAFB",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
    marginBottom: 20,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#00ADB5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: "#00ADB5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  progressIndicator: {
    marginBottom: 20,
  },
  progressItem: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#0D0F13",
    borderRadius: 15,
  },
  progressValue: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#0D0F13",
    borderRadius: 20,
    alignItems: "center",
  },
  periodButtonSelected: {
    backgroundColor: "#00ADB5",
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  periodButtonTextSelected: {
    color: "#FFFFFF",
  },
  chartContainer: {
    gap: 16,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  singleEntryContainer: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 12,
  },
  singleEntryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  singleEntryText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 8,
  },
  singleEntry: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#0D0F13",
    borderRadius: 12,
    minWidth: 200,
  },
  singleEntryDate: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  singleEntryWeight: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  recentEntriesHeader: {
    marginTop: 8,
  },
  recentEntriesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 8,
  },
  recentEntriesList: {
    gap: 8,
  },
  weightHistory: {
    gap: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#0D0F13",
    borderRadius: 8,
  },
  historyDate: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  historyWeight: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  emptyHistory: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#9CA3AF",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#0D0F13",
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  modalHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#FFFFFF",
    opacity: 0.9,
    marginTop: 8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -20,
  },
  formSection: {
    backgroundColor: "#171B22",
    borderRadius: 20,
    padding: 20,
    marginTop: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#00ADB5",
    paddingBottom: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#0D0F13",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#171B22",
  },
  genderSelector: {
    flexDirection: "row",
    gap: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#0D0F13",
    borderRadius: 12,
    alignItems: "center",
  },
  genderButtonSelected: {
    backgroundColor: "#00ADB5",
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  genderButtonTextSelected: {
    color: "#FFFFFF",
  },
  modalButtons: {
    gap: 12,
    marginTop: 30,
    marginBottom: 40,
  },
  saveButton: {
    backgroundColor: "#00ADB5",
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#00ADB5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0.1,
  },
  cancelButton: {
    backgroundColor: "#171B22",
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  heightInputContainer: {
    flexDirection: "row",
    gap: 12,
  },
  heightInput: {
    flex: 1,
    position: "relative",
  },
  heightUnit: {
    position: "absolute",
    right: 16,
    top: 14,
    fontSize: 16,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
  },
  weightProgressCard: {
    backgroundColor: "#171B22",
    borderRadius: 20,
    padding: 20,
    marginTop: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  weightProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  weightProgressTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  weightProgressTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F9FAFB",
  },
  addWeightButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00ADB5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addWeightButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  weightStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 20,
  },
  weightStatItem: {
    alignItems: "center",
    flex: 1,
  },
  weightStatLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  weightStatValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F9FAFB",
  },
  weightStatValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  weightStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#171B22",
  },
  weightProgressBarContainer: {
    marginBottom: 10,
  },
  weightProgressBar: {
    height: 12,
    backgroundColor: "#0D0F13",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
  },
  weightProgressBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  weightProgressPercentage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
    textAlign: "center",
  },
  weightGoalNearBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: "center",
    marginTop: 10,
  },
  weightGoalNearText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  goalDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 12,
  },
  goalDateText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  paceIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  paceIndicatorOnPace: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
  },
  paceIndicatorAhead: {
    backgroundColor: "rgba(0, 173, 181, 0.2)",
  },
  paceIndicatorBehind: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
  },
  paceIndicatorText: {
    fontSize: 14,
    fontWeight: "600",
  },
  paceIndicatorTextOnPace: {
    color: "#059669",
  },
  paceIndicatorTextAhead: {
    color: "#00ADB5",
  },
  paceIndicatorTextBehind: {
    color: "#D97706",
  },
});

const xpStatStyles = StyleSheet.create({
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
    marginBottom: 20,
  },
  rankEmoji: {
    fontSize: 40,
  },
  rankInfo: {
    flex: 1,
  },
  rankLevel: {
    fontSize: 24,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
  },
  rankName: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    marginTop: -2,
  },
  totalXPBadge: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  totalXPText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#9CA3AF',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1F2937',
    borderRadius: 4,
    overflow: 'hidden' as const,
    marginBottom: 6,
  },
  progressFill: {
    height: '100%' as const,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  rankTimeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  rankTimelineItem: {
    alignItems: 'center' as const,
    gap: 4,
  },
  rankDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rankTimelineLabel: {
    fontSize: 16,
  },
  rankTimelineName: {
    fontSize: 8,
    fontWeight: '600' as const,
    color: '#374151',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  breakdownSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#9CA3AF',
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 110,
  },
  breakdownColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#9CA3AF',
  },
  breakdownBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#1F2937',
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  breakdownBar: {
    height: '100%' as const,
    borderRadius: 3,
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#D1D5DB',
    width: 40,
    textAlign: 'right' as const,
  },
  recentSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1E26',
  },
  recentDesc: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#9CA3AF',
    flex: 1,
    marginRight: 12,
  },
  recentAmount: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#10B981',
  },
});
