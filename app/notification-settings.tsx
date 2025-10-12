import React, { useState, useEffect } from 'react';
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
  Clock,
  Dumbbell,
  Activity,
  Calendar,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Scale,
} from 'lucide-react-native';
import { useNotifications } from '@/providers/NotificationProvider';
import { useApp } from '@/providers/AppProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationSettings {
  dailyWorkoutReminder: boolean;
  workoutCompletionCelebration: boolean;
  weeklyProgressSummary: boolean;
  runningReminders: boolean;
  nutritionReminders: boolean;
  lunchReminder: boolean;
  weightReminder: boolean;
  reminderTime: string; // Format: "HH:MM"
}

const DEFAULT_SETTINGS: NotificationSettings = {
  dailyWorkoutReminder: true,
  workoutCompletionCelebration: true,
  weeklyProgressSummary: true,
  runningReminders: true,
  nutritionReminders: false,
  lunchReminder: true,
  weightReminder: true,
  reminderTime: '08:00',
};

const STORAGE_KEY = 'notification_settings';

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    requestPermissions,
    scheduleDailyWorkoutReminder,
    scheduleMealReminders,
    scheduleWeightReminder,
    scheduleWeeklyReport,
    sendWeeklyReport,
    cancelAllNotifications,
    checkPermissionStatus,
  } = useNotifications();
  
  const { stats, weeklyRuns, weeklyWorkouts } = useApp();
  
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from storage
  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  const loadSettings = async () => {
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
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const checkPermissions = async () => {
    const status = await checkPermissionStatus();
    setPermissionStatus(status);
  };

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
      // Schedule enabled notifications
      if (settings.dailyWorkoutReminder) {
        await scheduleDailyWorkoutReminder();
      }
      if (settings.weeklyProgressSummary) {
        await scheduleWeeklyReport();
      }
      if (settings.lunchReminder) {
        await scheduleMealReminders();
      }
      if (settings.weightReminder) {
        await scheduleWeightReminder();
      }
      Alert.alert(
        'Notifications Enabled! 🎉',
        'You\'ll now receive workout reminders and progress updates to help you stay on track with your fitness goals.'
      );
    } else {
      Alert.alert(
        'Permission Denied',
        'To receive workout reminders, please enable notifications in your device settings.'
      );
    }
  };

  const handleSettingChange = async (key: keyof NotificationSettings, value: boolean | string) => {
    const newSettings = { ...settings, [key]: value };
    await saveSettings(newSettings);

    // Handle specific setting changes
    if (permissionStatus === 'granted') {
      if (key === 'dailyWorkoutReminder') {
        if (value) {
          await scheduleDailyWorkoutReminder();
        } else {
          await cancelAllNotifications();
        }
      } else if (key === 'weeklyProgressSummary') {
        if (value) {
          await scheduleWeeklyReport();
        }
      } else if (key === 'lunchReminder') {
        if (value) {
          await scheduleMealReminders();
        }
      } else if (key === 'weightReminder') {
        if (value) {
          await scheduleWeightReminder();
        }
      }
    }
  };

  const getPermissionStatusInfo = () => {
    switch (permissionStatus) {
      case 'granted':
        return {
          icon: CheckCircle,
          color: '#10B981',
          title: 'Notifications Enabled',
          description: 'You\'ll receive workout reminders and progress updates',
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
          description: 'Allow notifications to receive workout reminders',
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
          headerTitleStyle: { fontWeight: 'bold' },
        }} 
      />
      
      <LinearGradient
        colors={['#3B82F6', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Bell size={32} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Customize your workout reminders and progress updates
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Permission Status Card */}
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
            >
              <Bell size={20} color="#FFFFFF" />
              <Text style={styles.enableButtonText}>Enable Notifications</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notification Settings */}
        <View style={styles.settingsCard}>
          <Text style={styles.cardTitle}>Notification Preferences</Text>
          
          <View style={styles.settingsList}>
            {/* Daily Workout Reminder */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  <Dumbbell size={20} color="#3B82F6" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Daily Workout Reminder</Text>
                  <Text style={styles.settingDescription}>
                    Get reminded to work out every day at {settings.reminderTime}
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.dailyWorkoutReminder}
                onValueChange={(value) => handleSettingChange('dailyWorkoutReminder', value)}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor={settings.dailyWorkoutReminder ? '#FFFFFF' : '#9CA3AF'}
                disabled={permissionStatus !== 'granted'}
              />
            </View>

            {/* Workout Completion */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  <CheckCircle size={20} color="#10B981" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Workout Completion</Text>
                  <Text style={styles.settingDescription}>
                    Celebrate when you complete a workout
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.workoutCompletionCelebration}
                onValueChange={(value) => handleSettingChange('workoutCompletionCelebration', value)}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor={settings.workoutCompletionCelebration ? '#FFFFFF' : '#9CA3AF'}
                disabled={permissionStatus !== 'granted'}
              />
            </View>

            {/* Weekly Progress */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  <Calendar size={20} color="#8B5CF6" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Weekly Progress Summary</Text>
                  <Text style={styles.settingDescription}>
                    Get a summary of your weekly fitness progress
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.weeklyProgressSummary}
                onValueChange={(value) => handleSettingChange('weeklyProgressSummary', value)}
                trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
                thumbColor={settings.weeklyProgressSummary ? '#FFFFFF' : '#9CA3AF'}
                disabled={permissionStatus !== 'granted'}
              />
            </View>

            {/* Running Reminders */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  <Activity size={20} color="#F59E0B" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Running Reminders</Text>
                  <Text style={styles.settingDescription}>
                    Get reminded to go for a run
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.runningReminders}
                onValueChange={(value) => handleSettingChange('runningReminders', value)}
                trackColor={{ false: '#E5E7EB', true: '#F59E0B' }}
                thumbColor={settings.runningReminders ? '#FFFFFF' : '#9CA3AF'}
                disabled={permissionStatus !== 'granted'}
              />
            </View>

            {/* Nutrition Reminders */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  <Clock size={20} color="#EF4444" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Nutrition Reminders</Text>
                  <Text style={styles.settingDescription}>
                    Get reminded to log your meals
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.nutritionReminders}
                onValueChange={(value) => handleSettingChange('nutritionReminders', value)}
                trackColor={{ false: '#E5E7EB', true: '#EF4444' }}
                thumbColor={settings.nutritionReminders ? '#FFFFFF' : '#9CA3AF'}
                disabled={permissionStatus !== 'granted'}
              />
            </View>

            {/* Lunch Reminder */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  <Clock size={20} color="#F97316" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Meal Reminders</Text>
                  <Text style={styles.settingDescription}>
                    Daily reminders at 1:00 PM and 5:00 PM to scan your meals
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.lunchReminder}
                onValueChange={(value) => handleSettingChange('lunchReminder', value)}
                trackColor={{ false: '#E5E7EB', true: '#F97316' }}
                thumbColor={settings.lunchReminder ? '#FFFFFF' : '#9CA3AF'}
                disabled={permissionStatus !== 'granted'}
              />
            </View>

            {/* Weight Reminder */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  <Scale size={20} color="#06B6D4" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Weight Entry Reminder</Text>
                  <Text style={styles.settingDescription}>
                    Daily reminder at 8:00 PM to log your weight
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.weightReminder}
                onValueChange={(value) => handleSettingChange('weightReminder', value)}
                trackColor={{ false: '#E5E7EB', true: '#06B6D4' }}
                thumbColor={settings.weightReminder ? '#FFFFFF' : '#9CA3AF'}
                disabled={permissionStatus !== 'granted'}
              />
            </View>
          </View>
        </View>

        {/* Reminder Time Settings */}
        {settings.dailyWorkoutReminder && (
          <View style={styles.settingsCard}>
            <Text style={styles.cardTitle}>Reminder Time</Text>
            <View style={styles.timeSelector}>
              <Clock size={20} color="#6B7280" />
              <Text style={styles.timeText}>
                Daily reminders at {settings.reminderTime}
              </Text>
              <TouchableOpacity
                style={styles.changeTimeButton}
                onPress={() => {
                  Alert.alert(
                    'Change Reminder Time',
                    'Time picker functionality would be implemented here. Currently set to 8:00 AM.'
                  );
                }}
              >
                <Text style={styles.changeTimeText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Weekly Report Test */}
        {settings.weeklyProgressSummary && permissionStatus === 'granted' && (
          <View style={styles.settingsCard}>
            <Text style={styles.cardTitle}>Weekly Report Preview</Text>
            <Text style={styles.infoText}>
              Test your weekly report notification with current data:
            </Text>
            <TouchableOpacity
              style={styles.testButton}
              onPress={async () => {
                const weeklyMiles = weeklyRuns.reduce((sum, run) => sum + run.distance, 0);
                const caloriesBurned = weeklyRuns.reduce((sum, run) => sum + run.calories, 0);
                
                await sendWeeklyReport({
                  weeklyRuns: weeklyRuns.length,
                  weeklyMiles,
                  weeklyWorkouts: weeklyWorkouts.length,
                  runStreak: stats.runStreak,
                  workoutStreak: stats.workoutStreak,
                  caloriesBurned,
                });
              }}
            >
              <Calendar size={20} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Send Test Weekly Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Settings size={20} color="#6B7280" />
            <Text style={styles.infoTitle}>About Notifications</Text>
          </View>
          <Text style={styles.infoText}>
            Notifications help you stay consistent with your fitness goals. You can customize which reminders you receive and when you receive them.
          </Text>
          <Text style={styles.infoText}>
            Weekly reports are automatically sent every Sunday at 7 PM with your fitness progress summary.
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
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
    fontWeight: '600',
    color: '#FFFFFF',
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
    fontWeight: 'bold',
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
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  timeText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  changeTimeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  changeTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
    fontWeight: '600',
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
    fontWeight: '600',
    color: '#FFFFFF',
  },
});