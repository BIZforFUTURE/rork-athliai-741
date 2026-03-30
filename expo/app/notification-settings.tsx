import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import {
  Bell,
  BellOff,
  Dumbbell,
  Activity,
  Calendar,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  UtensilsCrossed,
  Zap,
  Flame,
  Trophy,
  Swords,
} from 'lucide-react-native';
import { useNotifications } from '@/providers/NotificationProvider';
import { useApp } from '@/providers/AppProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationSettings {
  morningFoodReminder: boolean;
  middayRunReminder: boolean;
  eveningWorkoutReminder: boolean;
  workoutCompletionCelebration: boolean;
  weeklyProgressSummary: boolean;
  morningXPReminder: boolean;
  streakWarning: boolean;
  levelUpAlerts: boolean;
  streakMilestones: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  morningFoodReminder: true,
  middayRunReminder: true,
  eveningWorkoutReminder: true,
  workoutCompletionCelebration: true,
  weeklyProgressSummary: true,
  morningXPReminder: true,
  streakWarning: true,
  levelUpAlerts: true,
  streakMilestones: true,
};

const STORAGE_KEY = 'notification_settings';

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    requestPermissions,
    scheduleMorningFoodReminder,
    scheduleMiddayRunReminder,
    scheduleEveningWorkoutReminder,
    scheduleAllDailyReminders,
    scheduleWeeklyReport,
    sendWeeklyReport,
    cancelAllNotifications,
    checkPermissionStatus,
    scheduleMorningXPReminder,
    scheduleStreakWarning,
  } = useNotifications();

  const { stats, weeklyRuns, weeklyWorkouts } = useApp();

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }, []);

  const checkPermissions = useCallback(async () => {
    const status = await checkPermissionStatus();
    setPermissionStatus(status);
  }, [checkPermissionStatus]);

  useEffect(() => {
    void loadSettings();
    void checkPermissions();
  }, [loadSettings, checkPermissions]);

  const handlePermissionRequest = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Web Platform',
        'Notifications are not supported on web. Please use the mobile app for notification features.'
      );
      return;
    }

    const granted = await requestPermissions();
    if (granted) {
      setPermissionStatus('granted');
      await scheduleAllDailyReminders();
      if (settings.weeklyProgressSummary) {
        await scheduleWeeklyReport();
      }
      Alert.alert(
        'Notifications Enabled!',
        'Your daily quest notifications are active!\n\n7:30 AM - Daily XP Quests\n8:00 AM - Nutrition Quest\n12:30 PM - Run Quest\n6:00 PM - Workout Raid\n9:00 PM - Streak Warning'
      );
    } else {
      Alert.alert(
        'Permission Denied',
        'To receive reminders, please enable notifications in your device settings.'
      );
    }
  };

  const handleSettingChange = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    await saveSettings(newSettings);

    if (permissionStatus === 'granted') {
      await cancelAllNotifications();
      if (newSettings.morningXPReminder) await scheduleMorningXPReminder();
      if (newSettings.morningFoodReminder) await scheduleMorningFoodReminder();
      if (newSettings.middayRunReminder) await scheduleMiddayRunReminder();
      if (newSettings.eveningWorkoutReminder) await scheduleEveningWorkoutReminder();
      if (newSettings.streakWarning) await scheduleStreakWarning();
      if (newSettings.weeklyProgressSummary) await scheduleWeeklyReport();
    }
  };

  const getPermissionStatusInfo = () => {
    switch (permissionStatus) {
      case 'granted':
        return {
          icon: CheckCircle,
          color: '#10B981',
          title: 'Notifications Enabled',
          description: 'You\'ll receive daily reminders for food, running, and workouts',
        };
      case 'denied':
        return {
          icon: XCircle,
          color: '#EF4444',
          title: 'Notifications Disabled',
          description: 'Enable notifications in settings to receive reminders',
        };
      case 'undetermined':
        return {
          icon: AlertCircle,
          color: '#F59E0B',
          title: 'Permission Required',
          description: 'Allow notifications to receive your daily reminders',
        };
      case 'unsupported':
        return {
          icon: BellOff,
          color: '#6B7280',
          title: 'Not Supported',
          description: 'Notifications are not available on this platform',
        };
      default:
        return {
          icon: Bell,
          color: '#6B7280',
          title: 'Unknown Status',
          description: 'Unable to determine notification status',
        };
    }
  };

  const statusInfo = getPermissionStatusInfo();
  const StatusIcon = statusInfo.icon;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerStyle: { backgroundColor: '#3B82F6' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' as const },
        }}
      />

      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Swords size={32} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Quest Alerts</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Daily quests, XP reminders & streak warnings
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <StatusIcon size={24} color={statusInfo.color} />
            <Text style={[styles.statusTitle, { color: statusInfo.color }]}>
              {statusInfo.title}
            </Text>
          </View>
          <Text style={styles.statusDescription}>{statusInfo.description}</Text>

          {permissionStatus !== 'granted' && permissionStatus !== 'unsupported' && (
            <TouchableOpacity
              style={[styles.enableButton, { backgroundColor: statusInfo.color }]}
              onPress={handlePermissionRequest}
              testID="enable-notifications-button"
            >
              <Bell size={20} color="#FFFFFF" />
              <Text style={styles.enableButtonText}>Enable Notifications</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.scheduleCard}>
          <Text style={styles.cardTitle}>Daily Quest Schedule</Text>
          <View style={styles.scheduleTimeline}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#E879F9' }]} />
              <View style={styles.timelineLine} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTime}>7:30 AM</Text>
                <Text style={styles.timelineLabel}>Daily Quests Available</Text>
                <Text style={styles.timelineDesc}>New day, new XP to earn!</Text>
              </View>
            </View>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#F97316' }]} />
              <View style={styles.timelineLine} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTime}>8:00 AM</Text>
                <Text style={styles.timelineLabel}>Nutrition Quest (+15 XP)</Text>
                <Text style={styles.timelineDesc}>Log food to earn XP</Text>
              </View>
            </View>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#3B82F6' }]} />
              <View style={styles.timelineLine} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTime}>12:30 PM</Text>
                <Text style={styles.timelineLabel}>Run Quest (+25 XP)</Text>
                <Text style={styles.timelineDesc}>Every mile = +10 bonus XP</Text>
              </View>
            </View>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#10B981' }]} />
              <View style={styles.timelineLine} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTime}>6:00 PM</Text>
                <Text style={styles.timelineLabel}>Workout Raid (+75 XP)</Text>
                <Text style={styles.timelineDesc}>Crush the final quest of the day</Text>
              </View>
            </View>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#EF4444' }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTime}>9:00 PM</Text>
                <Text style={styles.timelineLabel}>Streak Warning</Text>
                <Text style={styles.timelineDesc}>Don't lose your bonus XP!</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.cardTitle}>Daily Quest Alerts</Text>

          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIcon, { backgroundColor: '#FAE8FF' }]}>
                  <Swords size={20} color="#E879F9" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Morning XP Quests</Text>
                  <Text style={styles.settingDescription}>7:30 AM — Daily quest reset reminder</Text>
                </View>
              </View>
              <Switch
                value={settings.morningXPReminder}
                onValueChange={(value) => handleSettingChange('morningXPReminder', value)}
                trackColor={{ false: '#E5E7EB', true: '#E879F9' }}
                thumbColor={settings.morningXPReminder ? '#FFFFFF' : '#9CA3AF'}
                disabled={permissionStatus !== 'granted'}
                testID="morning-xp-switch"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIcon, { backgroundColor: '#FFF7ED' }]}>
                  <UtensilsCrossed size={20} color="#F97316" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Nutrition Quest</Text>
                  <Text style={styles.settingDescription}>8:00 AM — Earn +15 XP per food log</Text>
                </View>
              </View>
              <Switch
                value={settings.morningFoodReminder}
                onValueChange={(value) => handleSettingChange('morningFoodReminder', value)}
                trackColor={{ false: '#E5E7EB', true: '#F97316' }}
                thumbColor={settings.morningFoodReminder ? '#FFFFFF' : '#9CA3AF'}
                disabled={permissionStatus !== 'granted'}
                testID="morning-food-switch"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Activity size={20} color="#3B82F6" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Run Quest</Text>
                  <Text style={styles.settingDescription}>12:30 PM — Earn +25 XP per run</Text>
                </View>
              </View>
              <Switch
                value={settings.middayRunReminder}
                onValueChange={(value) => handleSettingChange('middayRunReminder', value)}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor={settings.middayRunReminder ? '#FFFFFF' : '#9CA3AF'}
                disabled={permissionStatus !== 'granted'}
                testID="midday-run-switch"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Dumbbell size={20} color="#10B981" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Workout Raid</Text>
                  <Text style={styles.settingDescription}>6:00 PM — Earn +75 XP per workout</Text>
                </View>
              </View>
              <Switch
                value={settings.eveningWorkoutReminder}
                onValueChange={(value) => handleSettingChange('eveningWorkoutReminder', value)}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor={settings.eveningWorkoutReminder ? '#FFFFFF' : '#9CA3AF'}
                disabled={permissionStatus !== 'granted'}
                testID="evening-workout-switch"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIcon, { backgroundColor: '#FEF2F2' }]}>
                  <Flame size={20} color="#EF4444" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Streak Warning</Text>
                  <Text style={styles.settingDescription}>9:00 PM — Protect your bonus XP</Text>
                </View>
              </View>
              <Switch
                value={settings.streakWarning}
                onValueChange={(value) => handleSettingChange('streakWarning', value)}
                trackColor={{ false: '#E5E7EB', true: '#EF4444' }}
                thumbColor={settings.streakWarning ? '#FFFFFF' : '#9CA3AF'}
                disabled={permissionStatus !== 'granted'}
                testID="streak-warning-switch"
              />
            </View>
          </View>
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.cardTitle}>XP & Achievement Alerts</Text>

          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Trophy size={20} color="#F59E0B" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Level Up Alerts</Text>
                  <Text style={styles.settingDescription}>When you reach a new level or rank</Text>
                </View>
              </View>
              <Switch
                value={settings.levelUpAlerts}
                onValueChange={(value) => handleSettingChange('levelUpAlerts', value)}
                trackColor={{ false: '#E5E7EB', true: '#F59E0B' }}
                thumbColor={settings.levelUpAlerts ? '#FFFFFF' : '#9CA3AF'}
                disabled={permissionStatus !== 'granted'}
                testID="level-up-switch"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Zap size={20} color="#F97316" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Streak Milestones</Text>
                  <Text style={styles.settingDescription}>When you hit 3, 7, 14, 30 day streaks</Text>
                </View>
              </View>
              <Switch
                value={settings.streakMilestones}
                onValueChange={(value) => handleSettingChange('streakMilestones', value)}
                trackColor={{ false: '#E5E7EB', true: '#F97316' }}
                thumbColor={settings.streakMilestones ? '#FFFFFF' : '#9CA3AF'}
                disabled={permissionStatus !== 'granted'}
                testID="streak-milestones-switch"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIcon, { backgroundColor: '#F5F3FF' }]}>
                  <CheckCircle size={20} color="#8B5CF6" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Quest Complete</Text>
                  <Text style={styles.settingDescription}>XP earned after runs & workouts</Text>
                </View>
              </View>
              <Switch
                value={settings.workoutCompletionCelebration}
                onValueChange={(value) => handleSettingChange('workoutCompletionCelebration', value)}
                trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
                thumbColor={settings.workoutCompletionCelebration ? '#FFFFFF' : '#9CA3AF'}
                disabled={permissionStatus !== 'granted'}
                testID="workout-celebration-switch"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Calendar size={20} color="#D97706" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Weekly XP Report</Text>
                  <Text style={styles.settingDescription}>Every Sunday at 7:00 PM</Text>
                </View>
              </View>
              <Switch
                value={settings.weeklyProgressSummary}
                onValueChange={(value) => handleSettingChange('weeklyProgressSummary', value)}
                trackColor={{ false: '#E5E7EB', true: '#D97706' }}
                thumbColor={settings.weeklyProgressSummary ? '#FFFFFF' : '#9CA3AF'}
                disabled={permissionStatus !== 'granted'}
                testID="weekly-summary-switch"
              />
            </View>
          </View>
        </View>

        {settings.weeklyProgressSummary && permissionStatus === 'granted' && (
          <View style={styles.settingsCard}>
            <Text style={styles.cardTitle}>Weekly Report Preview</Text>
            <Text style={styles.infoText}>
              Test your weekly report notification with current data:
            </Text>
            <TouchableOpacity
              style={styles.testButton}
              onPress={async () => {
                const weeklyMiles = weeklyRuns.reduce((sum: number, run: { distance: number }) => sum + run.distance, 0);
                const caloriesBurned = weeklyRuns.reduce((sum: number, run: { calories: number }) => sum + run.calories, 0);

                await sendWeeklyReport({
                  weeklyRuns: weeklyRuns.length,
                  weeklyMiles,
                  weeklyWorkouts: weeklyWorkouts.length,
                  runStreak: stats.runStreak,
                  workoutStreak: stats.workoutStreak,
                  caloriesBurned,
                });
              }}
              testID="test-weekly-report-button"
            >
              <Calendar size={20} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Send Test Weekly Report</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Settings size={20} color="#6B7280" />
            <Text style={styles.infoTitle}>How Quest Alerts Work</Text>
          </View>
          <Text style={styles.infoText}>
            You receive 5 daily quest notifications to maximize your XP gains: morning XP reminder, nutrition quest, run quest, workout raid, and a streak warning before midnight.
          </Text>
          <Text style={styles.infoText}>
            Level up and rank up alerts fire instantly when you earn enough XP. Streak milestones trigger at 3, 7, 14, and 30 days.
          </Text>
          <Text style={styles.infoText}>
            All notifications are sent locally from your device and respect your privacy.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerEmoji: {
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -20,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  scheduleTimeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 72,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute' as const,
    left: 6,
    top: 18,
    bottom: -4,
    width: 2,
    backgroundColor: '#E5E7EB',
  },
  timelineContent: {
    flex: 1,
    marginLeft: 14,
    paddingBottom: 16,
  },
  timelineTime: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  timelineLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginTop: 2,
  },
  timelineDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#1F2937',
    marginBottom: 20,
  },
  settingsList: {
    gap: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    marginTop: 12,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
