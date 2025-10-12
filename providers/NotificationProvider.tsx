import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import createContextHook from '@nkzw/create-context-hook';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const [expoPushToken, setExpoPushToken] = React.useState<string | null>(null);
  const [notification, setNotification] = React.useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Only set up listeners, don't automatically request permissions
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      if (notification) {
        setNotification(notification);
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      if (response) {
        console.log('Notification response:', response);
        
        // Handle notification tap - navigate to appropriate screen based on notification type
        const notificationData = response.notification.request.content.data;
        if (notificationData?.type === 'run-start' || notificationData?.type === 'run-progress') {
          // Import router dynamically to avoid circular dependencies
          import('expo-router').then(({ router }) => {
            router.push('/(tabs)/run');
          }).catch(error => {
            console.error('Error navigating to run screen:', error);
          });
        } else if (notificationData?.type === 'lunch-reminder' || notificationData?.type === 'meal-reminder') {
          // Navigate to nutrition tab for meal reminders
          import('expo-router').then(({ router }) => {
            router.push('/(tabs)/nutrition');
          }).catch(error => {
            console.error('Error navigating to nutrition screen:', error);
          });
        } else if (notificationData?.type === 'weight-reminder') {
          // Navigate to home tab for weight entry
          import('expo-router').then(({ router }) => {
            router.push('/(tabs)/home');
          }).catch(error => {
            console.error('Error navigating to home screen:', error);
          });
        }
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        console.log('Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }
      
      const granted = finalStatus === 'granted';
      console.log('Notification permission status:', finalStatus, 'granted:', granted);
      
      // If permissions granted, get push token
      if (granted && !expoPushToken) {
        const token = await registerForPushNotificationsAsync();
        if (token?.trim()) {
          setExpoPushToken(token.trim());
        }
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }, [expoPushToken]);

  const scheduleNotification = useCallback(async (title: string, body: string, trigger: Date): Promise<string | null> => {
    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web');
      return null;
    }

    if (!title?.trim() || !body?.trim()) {
      console.log('Invalid notification content');
      return null;
    }

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.log('No notification permissions');
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: title.trim(),
          body: body.trim(),
          sound: 'default',
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger 
        } as Notifications.DateTriggerInput,
      });

      console.log('Scheduled notification:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }, [requestPermissions]);

  const scheduleWorkoutReminder = useCallback(async (title: string, body: string, trigger: Date): Promise<string | null> => {
    return scheduleNotification(title, body, trigger);
  }, [scheduleNotification]);

  const sendWorkoutCompletionNotification = useCallback(async (workoutType: string, duration: number): Promise<string | null> => {
    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web');
      return null;
    }

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.log('No notification permissions');
        return null;
      }

      const title = '🎉 Workout Complete!';
      const body = `Great job! You completed your ${workoutType} workout in ${Math.round(duration)} minutes. Keep up the amazing work!`;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
        },
        trigger: null, // Send immediately
      });

      console.log('Sent workout completion notification:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error sending workout completion notification:', error);
      return null;
    }
  }, [requestPermissions]);

  const sendRunCompletionNotification = useCallback(async (distance: number, duration: number): Promise<string | null> => {
    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web');
      return null;
    }

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.log('No notification permissions');
        return null;
      }

      const title = '🏃‍♂️ Run Complete!';
      const body = `Awesome run! You covered ${distance.toFixed(1)} miles in ${Math.round(duration)} minutes. Your dedication is paying off!`;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
        },
        trigger: null, // Send immediately
      });

      console.log('Sent run completion notification:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error sending run completion notification:', error);
      return null;
    }
  }, [requestPermissions]);

  const sendRunStartNotification = useCallback(async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web');
      return null;
    }

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.log('No notification permissions');
        return null;
      }

      const title = '🏃‍♂️ Run Started - Tap to View Map';
      const body = '📍 Tracking your route • ⏱️ Timer running • 🔥 Calories counting';

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          sticky: true, // Keep notification visible
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'run-tracking',
          data: {
            type: 'run-start',
            timestamp: Date.now()
          },
        },
        trigger: null, // Send immediately
      });

      console.log('Sent run start notification:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error sending run start notification:', error);
      return null;
    }
  }, [requestPermissions]);

  const updateRunProgressNotification = useCallback(async (identifier: string | null, distance: number, time: number, calories?: number): Promise<void> => {
    if (Platform.OS === 'web' || !identifier) {
      return;
    }

    try {
      const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
      };

      const pace = distance > 0 ? time / 60 / distance : 0;
      const formatPace = (paceValue: number): string => {
        if (!paceValue || paceValue === 0 || !isFinite(paceValue)) return "0:00";
        const cappedPace = Math.min(paceValue, 99.99);
        const mins = Math.floor(cappedPace);
        const secs = Math.round((cappedPace - mins) * 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
      };

      // Calculate estimated calories burned
      const estimatedCalories = calories || Math.round(distance * 112.5); // ~112.5 cal/mile for 150lb person
      
      const title = '🏃‍♂️ Active Run - Tap to View Map';
      const body = `📍 ${distance.toFixed(2)} mi • ⏱️ ${formatTime(time)} • 🏃 ${formatPace(pace)} pace • 🔥 ${estimatedCalories} cal`;

      // Update the existing notification with enhanced content
      await Notifications.scheduleNotificationAsync({
        identifier, // Use same identifier to update
        content: {
          title,
          body,
          sound: undefined, // Don't play sound for updates
          sticky: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'run-tracking',
          data: {
            type: 'run-progress',
            distance,
            time,
            pace,
            calories: estimatedCalories,
            timestamp: Date.now()
          },
        },
        trigger: null,
      });

      console.log('Updated run progress notification:', { distance, time, pace, calories: estimatedCalories });
    } catch (error) {
      console.error('Error updating run progress notification:', error);
    }
  }, []);

  const cancelRunNotification = useCallback(async (identifier: string | null): Promise<void> => {
    if (Platform.OS === 'web' || !identifier) {
      return;
    }

    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log('Cancelled run notification:', identifier);
    } catch (error) {
      console.error('Error cancelling run notification:', error);
    }
  }, []);

  const scheduleDailyWorkoutReminder = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      // Cancel existing daily workout reminders
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const dailyReminders = scheduledNotifications.filter(n => 
        (n.content.title?.includes('Workout Time') || n.content.title?.includes('athliAI')) &&
        !n.content.title?.includes('Meal Time') && !n.content.title?.includes('Lunch Time')
      );
      
      for (const reminder of dailyReminders) {
        await Notifications.cancelScheduledNotificationAsync(reminder.identifier);
      }

      // Schedule new daily reminder for 8 AM
      const trigger: Notifications.CalendarTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: 8,
        minute: 0,
        repeats: true,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏋️ Workout Time!',
          body: 'Ready to crush your daily workout? Let\'s get moving!',
          sound: 'default',
        },
        trigger,
      });

      console.log('Daily workout reminder scheduled for 8 AM');
    } catch (error) {
      console.error('Error scheduling daily reminder:', error);
    }
  }, []);

  const scheduleMealReminders = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      // Cancel existing meal reminders
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const mealReminders = scheduledNotifications.filter(n => 
        n.content.title?.includes('Meal Time') || 
        n.content.title?.includes('Lunch Time') || 
        n.content.title?.includes('Scan your lunch') ||
        n.content.title?.includes('Scan your meal')
      );
      
      for (const reminder of mealReminders) {
        await Notifications.cancelScheduledNotificationAsync(reminder.identifier);
      }

      // Schedule 1:00 PM meal reminder
      const lunchTrigger: Notifications.CalendarTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: 13, // 1 PM in 24-hour format
        minute: 0,
        repeats: true,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🍽️ Meal Time!',
          body: 'Time for lunch! Don\'t forget to scan your meal and track your nutrition.',
          sound: 'default',
          data: {
            type: 'meal-reminder',
            mealTime: 'lunch',
            timestamp: Date.now()
          },
        },
        trigger: lunchTrigger,
      });

      // Schedule 5:00 PM meal reminder
      const dinnerTrigger: Notifications.CalendarTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: 17, // 5 PM in 24-hour format
        minute: 0,
        repeats: true,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🍽️ Meal Time!',
          body: 'Time for dinner! Don\'t forget to scan your meal and track your nutrition.',
          sound: 'default',
          data: {
            type: 'meal-reminder',
            mealTime: 'dinner',
            timestamp: Date.now()
          },
        },
        trigger: dinnerTrigger,
      });

      console.log('Daily meal reminders scheduled for 1:00 PM and 5:00 PM');
    } catch (error) {
      console.error('Error scheduling meal reminders:', error);
    }
  }, []);

  const scheduleWeightReminder = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      // Cancel existing weight reminders
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const weightReminders = scheduledNotifications.filter(n => 
        n.content.title?.includes('Weight Entry') || 
        n.content.title?.includes('Track Your Weight')
      );
      
      for (const reminder of weightReminders) {
        await Notifications.cancelScheduledNotificationAsync(reminder.identifier);
      }

      // Schedule 8:00 PM weight reminder
      const weightTrigger: Notifications.CalendarTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: 20, // 8 PM in 24-hour format
        minute: 0,
        repeats: true,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚖️ Track Your Weight',
          body: 'Time to log your daily weight entry. Stay consistent with your progress tracking!',
          sound: 'default',
          data: {
            type: 'weight-reminder',
            timestamp: Date.now()
          },
        },
        trigger: weightTrigger,
      });

      console.log('Daily weight reminder scheduled for 8:00 PM');
    } catch (error) {
      console.error('Error scheduling weight reminder:', error);
    }
  }, []);

  const scheduleWeeklyReport = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      // Cancel existing weekly reports
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const weeklyReports = scheduledNotifications.filter(n => 
        n.content.title?.includes('Weekly Report') || n.content.title?.includes('Week Summary')
      );
      
      for (const report of weeklyReports) {
        await Notifications.cancelScheduledNotificationAsync(report.identifier);
      }

      // Schedule weekly report for Sunday at 7 PM
      const trigger: Notifications.CalendarTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        weekday: 1, // Sunday (1 = Sunday, 2 = Monday, etc.)
        hour: 19, // 7 PM
        minute: 0,
        repeats: true,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📊 Weekly Fitness Report',
          body: 'Your weekly progress summary is ready! Tap to see how you did this week.',
          sound: 'default',
          data: {
            type: 'weekly-report',
            timestamp: Date.now()
          },
        },
        trigger,
      });

      console.log('Weekly report scheduled for Sunday at 7 PM');
    } catch (error) {
      console.error('Error scheduling weekly report:', error);
    }
  }, []);

  const sendWeeklyReport = useCallback(async (reportData: {
    weeklyRuns: number;
    weeklyMiles: number;
    weeklyWorkouts: number;
    runStreak: number;
    workoutStreak: number;
    caloriesBurned: number;
  }): Promise<string | null> => {
    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web');
      return null;
    }

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.log('No notification permissions');
        return null;
      }

      // Generate report summary
      const { weeklyRuns, weeklyMiles, weeklyWorkouts, runStreak, workoutStreak, caloriesBurned } = reportData;
      
      let title = '📊 Your Weekly Fitness Report';
      let body = '';
      
      if (weeklyRuns > 0 || weeklyWorkouts > 0) {
        const activities = [];
        if (weeklyRuns > 0) {
          activities.push(`${weeklyRuns} run${weeklyRuns > 1 ? 's' : ''} (${weeklyMiles.toFixed(1)} mi)`);
        }
        if (weeklyWorkouts > 0) {
          activities.push(`${weeklyWorkouts} workout${weeklyWorkouts > 1 ? 's' : ''}`);
        }
        
        body = `This week: ${activities.join(' • ')}`;
        
        if (caloriesBurned > 0) {
          body += ` • ${Math.round(caloriesBurned)} calories burned`;
        }
        
        // Add streak info
        const streaks = [];
        if (runStreak > 0) streaks.push(`${runStreak} day run streak`);
        if (workoutStreak > 0) streaks.push(`${workoutStreak} day workout streak`);
        
        if (streaks.length > 0) {
          body += ` 🔥 ${streaks.join(' • ')}`;
        }
        
        body += ' Keep up the great work! 💪';
      } else {
        title = '💪 Ready for a New Week?';
        body = 'Last week was quiet - let\'s make this week amazing! Your fitness journey is waiting.';
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: {
            type: 'weekly-report',
            reportData,
            timestamp: Date.now()
          },
        },
        trigger: null, // Send immediately
      });

      console.log('Sent weekly report notification:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error sending weekly report notification:', error);
      return null;
    }
  }, [requestPermissions]);

  const cancelNotification = useCallback(async (identifier: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return;
    }

    if (!identifier?.trim()) {
      console.log('Invalid notification identifier');
      return;
    }

    try {
      await Notifications.cancelScheduledNotificationAsync(identifier.trim());
      console.log('Cancelled notification:', identifier);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }, []);

  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all notifications');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }, []);

  const checkPermissionStatus = useCallback(async (): Promise<string> => {
    if (Platform.OS === 'web') {
      return 'unsupported';
    }
    
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return 'undetermined';
    }
  }, []);

  return useMemo(() => ({
    expoPushToken,
    notification,
    scheduleNotification,
    scheduleWorkoutReminder,
    scheduleDailyWorkoutReminder,
    scheduleMealReminders,
    scheduleWeightReminder,
    scheduleWeeklyReport,
    sendWeeklyReport,
    sendWorkoutCompletionNotification,
    sendRunCompletionNotification,
    sendRunStartNotification,
    updateRunProgressNotification,
    cancelRunNotification,
    cancelNotification,
    cancelAllNotifications,
    requestPermissions,
    checkPermissionStatus,
  }), [
    expoPushToken,
    notification,
    scheduleNotification,
    scheduleWorkoutReminder,
    scheduleDailyWorkoutReminder,
    scheduleMealReminders,
    scheduleWeightReminder,
    scheduleWeeklyReport,
    sendWeeklyReport,
    sendWorkoutCompletionNotification,
    sendRunCompletionNotification,
    sendRunStartNotification,
    updateRunProgressNotification,
    cancelRunNotification,
    cancelNotification,
    cancelAllNotifications,
    requestPermissions,
    checkPermissionStatus,
  ]);
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('Push notifications not supported on web');
    return null;
  }

  let token: string | null = null;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    try {
      const projectId = '4f46e5-4f46-4f46-4f46-4f46e54f46e5'; // Default project ID
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Expo push token:', token);
    } catch (error) {
      console.log('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    // Set up default notification channel
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    // Set up run tracking notification channel
    Notifications.setNotificationChannelAsync('run-tracking', {
      name: 'Run Tracking',
      description: 'Ongoing run tracking notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#3B82F6',
      sound: undefined, // No sound for ongoing notifications
      enableLights: true,
      enableVibrate: false,
    });
  }

  return token;
}