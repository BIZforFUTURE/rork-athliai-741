import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import createContextHook from '@nkzw/create-context-hook';

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
    notificationListener.current = Notifications.addNotificationReceivedListener(n => {
      if (n) {
        setNotification(n);
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      if (response) {
        console.log('Notification response:', response);

        const notificationData = response.notification.request.content.data;
        if (notificationData?.type === 'run-start' || notificationData?.type === 'run-progress' || notificationData?.type === 'midday-run-reminder') {
          import('expo-router').then(({ router }) => {
            router.push('/(tabs)/run');
          }).catch(error => {
            console.error('Error navigating to run screen:', error);
          });
        } else if (notificationData?.type === 'morning-food-reminder') {
          import('expo-router').then(({ router }) => {
            router.push('/(tabs)/nutrition');
          }).catch(error => {
            console.error('Error navigating to nutrition screen:', error);
          });
        } else if (notificationData?.type === 'evening-workout-reminder') {
          import('expo-router').then(({ router }) => {
            router.push('/(tabs)/gym');
          }).catch(error => {
            console.error('Error navigating to gym screen:', error);
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
          date: trigger,
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
    if (Platform.OS === 'web') return null;

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Workout Complete!',
          body: `Great job! You completed your ${workoutType} workout in ${Math.round(duration)} minutes. Keep up the amazing work!`,
          sound: 'default',
        },
        trigger: null,
      });

      console.log('Sent workout completion notification:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error sending workout completion notification:', error);
      return null;
    }
  }, [requestPermissions]);

  const sendRunCompletionNotification = useCallback(async (distance: number, duration: number): Promise<string | null> => {
    if (Platform.OS === 'web') return null;

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Run Complete!',
          body: `Awesome run! You covered ${distance.toFixed(1)} miles in ${Math.round(duration)} minutes. Your dedication is paying off!`,
          sound: 'default',
        },
        trigger: null,
      });

      console.log('Sent run completion notification:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error sending run completion notification:', error);
      return null;
    }
  }, [requestPermissions]);

  const sendRunStartNotification = useCallback(async (): Promise<string | null> => {
    if (Platform.OS === 'web') return null;

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Run Started - Tap to View Map',
          body: 'Tracking your route | Timer running | Calories counting',
          sound: 'default',
          sticky: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'run-tracking',
          data: {
            type: 'run-start',
            timestamp: Date.now(),
          },
        },
        trigger: null,
      });

      console.log('Sent run start notification:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error sending run start notification:', error);
      return null;
    }
  }, [requestPermissions]);

  const updateRunProgressNotification = useCallback(async (identifier: string | null, distance: number, time: number, calories?: number): Promise<void> => {
    if (Platform.OS === 'web' || !identifier) return;

    try {
      const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      const pace = distance > 0 ? time / 60 / distance : 0;
      const formatPace = (paceValue: number): string => {
        if (!paceValue || paceValue === 0 || !isFinite(paceValue)) return '0:00';
        const cappedPace = Math.min(paceValue, 99.99);
        const mins = Math.floor(cappedPace);
        const secs = Math.round((cappedPace - mins) * 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      const estimatedCalories = calories || Math.round(distance * 112.5);

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: 'Active Run - Tap to View Map',
          body: `${distance.toFixed(2)} mi | ${formatTime(time)} | ${formatPace(pace)} pace | ${estimatedCalories} cal`,
          sound: undefined,
          sticky: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'run-tracking',
          data: {
            type: 'run-progress',
            distance,
            time,
            pace,
            calories: estimatedCalories,
            timestamp: Date.now(),
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
    if (Platform.OS === 'web' || !identifier) return;

    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log('Cancelled run notification:', identifier);
    } catch (error) {
      console.error('Error cancelling run notification:', error);
    }
  }, []);

  const scheduleMorningFoodReminder = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'web') return;

    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const existing = scheduledNotifications.filter(n =>
        n.content.data?.type === 'morning-food-reminder'
      );
      for (const n of existing) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Good Morning! Time to Fuel Up',
          body: 'Start your day right \u2014 scan your breakfast and track your nutrition.',
          sound: 'default',
          data: { type: 'morning-food-reminder', timestamp: Date.now() },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: 8,
          minute: 0,
          repeats: true,
        },
      });

      console.log('Morning food reminder scheduled for 8:00 AM');
    } catch (error) {
      console.error('Error scheduling morning food reminder:', error);
    }
  }, []);

  const scheduleMiddayRunReminder = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'web') return;

    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const existing = scheduledNotifications.filter(n =>
        n.content.data?.type === 'midday-run-reminder'
      );
      for (const n of existing) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time for a Run!',
          body: 'Perfect time to lace up and hit the road. Your body will thank you!',
          sound: 'default',
          data: { type: 'midday-run-reminder', timestamp: Date.now() },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: 12,
          minute: 30,
          repeats: true,
        },
      });

      console.log('Midday run reminder scheduled for 12:30 PM');
    } catch (error) {
      console.error('Error scheduling midday run reminder:', error);
    }
  }, []);

  const scheduleEveningWorkoutReminder = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'web') return;

    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const existing = scheduledNotifications.filter(n =>
        n.content.data?.type === 'evening-workout-reminder'
      );
      for (const n of existing) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Evening Workout Time',
          body: 'End your day strong \u2014 time to crush your workout!',
          sound: 'default',
          data: { type: 'evening-workout-reminder', timestamp: Date.now() },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: 18,
          minute: 0,
          repeats: true,
        },
      });

      console.log('Evening workout reminder scheduled for 6:00 PM');
    } catch (error) {
      console.error('Error scheduling evening workout reminder:', error);
    }
  }, []);

  const scheduleAllDailyReminders = useCallback(async (): Promise<void> => {
    await scheduleMorningFoodReminder();
    await scheduleMiddayRunReminder();
    await scheduleEveningWorkoutReminder();
    console.log('All 3 daily reminders scheduled');
  }, [scheduleMorningFoodReminder, scheduleMiddayRunReminder, scheduleEveningWorkoutReminder]);

  const scheduleWeeklyReport = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'web') return;

    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const weeklyReports = scheduledNotifications.filter(n =>
        n.content.title?.includes('Weekly Report') || n.content.title?.includes('Week Summary')
      );

      for (const report of weeklyReports) {
        await Notifications.cancelScheduledNotificationAsync(report.identifier);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Weekly Fitness Report',
          body: 'Your weekly progress summary is ready! Tap to see how you did this week.',
          sound: 'default',
          data: {
            type: 'weekly-report',
            timestamp: Date.now(),
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          weekday: 1,
          hour: 19,
          minute: 0,
          repeats: true,
        },
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
    if (Platform.OS === 'web') return null;

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const { weeklyRuns, weeklyMiles, weeklyWorkouts, runStreak, workoutStreak, caloriesBurned } = reportData;

      let title = 'Your Weekly Fitness Report';
      let body = '';

      if (weeklyRuns > 0 || weeklyWorkouts > 0) {
        const activities: string[] = [];
        if (weeklyRuns > 0) {
          activities.push(`${weeklyRuns} run${weeklyRuns > 1 ? 's' : ''} (${weeklyMiles.toFixed(1)} mi)`);
        }
        if (weeklyWorkouts > 0) {
          activities.push(`${weeklyWorkouts} workout${weeklyWorkouts > 1 ? 's' : ''}`);
        }

        body = `This week: ${activities.join(' | ')}`;

        if (caloriesBurned > 0) {
          body += ` | ${Math.round(caloriesBurned)} calories burned`;
        }

        const streaks: string[] = [];
        if (runStreak > 0) streaks.push(`${runStreak} day run streak`);
        if (workoutStreak > 0) streaks.push(`${workoutStreak} day workout streak`);

        if (streaks.length > 0) {
          body += ` ${streaks.join(' | ')}`;
        }

        body += ' Keep up the great work!';
      } else {
        title = 'Ready for a New Week?';
        body = "Last week was quiet - let's make this week amazing! Your fitness journey is waiting.";
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: {
            type: 'weekly-report',
            reportData,
            timestamp: Date.now(),
          },
        },
        trigger: null,
      });

      console.log('Sent weekly report notification:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error sending weekly report notification:', error);
      return null;
    }
  }, [requestPermissions]);

  const cancelNotification = useCallback(async (identifier: string): Promise<void> => {
    if (Platform.OS === 'web') return;

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
    if (Platform.OS === 'web') return;

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all notifications');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }, []);

  const checkPermissionStatus = useCallback(async (): Promise<string> => {
    if (Platform.OS === 'web') return 'unsupported';

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
    scheduleMorningFoodReminder,
    scheduleMiddayRunReminder,
    scheduleEveningWorkoutReminder,
    scheduleAllDailyReminders,
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
    scheduleMorningFoodReminder,
    scheduleMiddayRunReminder,
    scheduleEveningWorkoutReminder,
    scheduleAllDailyReminders,
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
      const projectId = '4f46e5-4f46-4f46-4f46-4f46e54f46e5';
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Expo push token:', token);
    } catch (error) {
      console.log('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    void Notifications.setNotificationChannelAsync('run-tracking', {
      name: 'Run Tracking',
      description: 'Ongoing run tracking notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#3B82F6',
      sound: undefined,
      enableLights: true,
      enableVibrate: false,
    });
  }

  return token;
}
