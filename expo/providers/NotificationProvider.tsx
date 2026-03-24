import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import createContextHook from '@nkzw/create-context-hook';
import { getRankForLevel, getXPProgress, type RankInfo } from '@/constants/xp';
import { estimateRunCalories } from '@/utils/healthScore';

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

  const sendWorkoutCompletionNotification = useCallback(async (workoutType: string, duration: number, xpEarned?: number): Promise<string | null> => {
    if (Platform.OS === 'web') return null;

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const xpText = xpEarned ? ` +${xpEarned} XP earned!` : '';
      const titles = [
        '⚔️ Victory! Workout Conquered!',
        '🏆 Quest Complete!',
        '💪 Boss Defeated!',
        '🎯 Mission Accomplished!',
      ];
      const title = titles[Math.floor(Math.random() * titles.length)];

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: `${workoutType} crushed in ${Math.round(duration)} min.${xpText} The grind never stops!`,
          sound: 'default',
          data: { type: 'workout-complete', timestamp: Date.now() },
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

  const sendRunCompletionNotification = useCallback(async (distance: number, duration: number, xpEarned?: number): Promise<string | null> => {
    if (Platform.OS === 'web') return null;

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const xpText = xpEarned ? ` +${xpEarned} XP!` : '';
      const titles = [
        '🏃 Run Quest Complete!',
        '⚡ Distance Conquered!',
        '🔥 Trail Blazed!',
        '🎯 Run Mission Done!',
      ];
      const title = titles[Math.floor(Math.random() * titles.length)];

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: `${distance.toFixed(1)} mi in ${Math.round(duration)} min.${xpText} Every step levels you up!`,
          sound: 'default',
          data: { type: 'run-complete', timestamp: Date.now() },
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

      const estimatedCalories = calories || estimateRunCalories(distance);

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

      const messages = [
        { title: '🍳 Daily Quest: Fuel Up!', body: 'Log your breakfast to earn +15 XP. Every meal tracked levels you up!' },
        { title: '⚡ Morning XP Awaits', body: 'Scan your breakfast and stack that XP. Nutrition streaks = bonus XP!' },
        { title: '🎯 Side Quest: Breakfast', body: 'Hit your calorie goal today for a +50 XP bonus. Start with breakfast!' },
      ];
      const msg = messages[Math.floor(Math.random() * messages.length)];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: msg.title,
          body: msg.body,
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

      const messages = [
        { title: '🏃 Boss Battle: The Open Road', body: 'Earn 25+ XP per run. The further you go, the more XP you collect!' },
        { title: '⚔️ Quest Available: Go for a Run', body: 'Every 0.25 mi = +15 XP. Lace up and grind those levels!' },
        { title: '🔥 Your Run Streak is Calling', body: 'Keep the streak alive for massive bonus XP. Don\'t let it reset!' },
      ];
      const msg = messages[Math.floor(Math.random() * messages.length)];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: msg.title,
          body: msg.body,
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

      const messages = [
        { title: '💪 Raid Boss: Evening Workout', body: 'Earn +75 XP for completing today\'s workout. Time to level up!' },
        { title: '🛡️ Final Quest of the Day', body: 'One workout = 75 XP closer to your next rank. Don\'t skip this one!' },
        { title: '⚡ Power Hour: Workout Time', body: 'The gym is your arena. Crush it and collect your XP reward!' },
      ];
      const msg = messages[Math.floor(Math.random() * messages.length)];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: msg.title,
          body: msg.body,
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

  const sendLevelUpNotification = useCallback(async (newLevel: number, rankInfo: RankInfo): Promise<string | null> => {
    if (Platform.OS === 'web') return null;

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🎉 LEVEL UP! You're now Level ${newLevel}!`,
          body: `${rankInfo.emoji} New rank: ${rankInfo.title}! Keep grinding to unlock the next tier!`,
          sound: 'default',
          data: { type: 'level-up', level: newLevel, rank: rankInfo.title, timestamp: Date.now() },
        },
        trigger: null,
      });

      console.log('Sent level up notification:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error sending level up notification:', error);
      return null;
    }
  }, [requestPermissions]);

  const sendRankUpNotification = useCallback(async (newRank: RankInfo, level: number): Promise<string | null> => {
    if (Platform.OS === 'web') return null;

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${newRank.emoji} NEW RANK UNLOCKED: ${newRank.title}!`,
          body: `You've ascended to ${newRank.title} at Level ${level}. Few warriors reach this tier. Legendary!`,
          sound: 'default',
          data: { type: 'rank-up', rank: newRank.title, level, timestamp: Date.now() },
        },
        trigger: null,
      });

      console.log('Sent rank up notification:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error sending rank up notification:', error);
      return null;
    }
  }, [requestPermissions]);

  const sendStreakMilestoneNotification = useCallback(async (streakType: string, days: number): Promise<string | null> => {
    if (Platform.OS === 'web') return null;

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const milestoneEmoji = days >= 30 ? '👑' : days >= 14 ? '🔥' : days >= 7 ? '⚡' : '🎯';
      const bonusXP = streakType === 'food' ? days * 5 : days * 10;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${milestoneEmoji} ${days}-Day ${streakType} Streak!`,
          body: `Unstoppable! Your ${streakType} streak earns +${bonusXP} bonus XP daily. Don't break the chain!`,
          sound: 'default',
          data: { type: 'streak-milestone', streakType, days, timestamp: Date.now() },
        },
        trigger: null,
      });

      console.log('Sent streak milestone notification:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error sending streak milestone notification:', error);
      return null;
    }
  }, [requestPermissions]);

  const sendXPEarnedNotification = useCallback(async (amount: number, source: string, totalXP: number, level: number): Promise<string | null> => {
    if (Platform.OS === 'web') return null;

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const progress = getXPProgress(totalXP);
      const rank = getRankForLevel(level);

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `+${amount} XP ${rank.emoji} ${source}`,
          body: `${progress.current}/${progress.needed} XP to Level ${level + 1}. ${rank.title} rank — keep pushing!`,
          sound: 'default',
          data: { type: 'xp-earned', amount, source, timestamp: Date.now() },
        },
        trigger: null,
      });

      console.log('Sent XP earned notification:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error sending XP earned notification:', error);
      return null;
    }
  }, [requestPermissions]);

  const scheduleStreakWarning = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'web') return;

    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const existing = scheduledNotifications.filter(n =>
        n.content.data?.type === 'streak-warning'
      );
      for (const n of existing) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Streak in Danger!',
          body: 'Your streaks reset at midnight! Log a meal, run, or workout to protect your bonus XP.',
          sound: 'default',
          data: { type: 'streak-warning', timestamp: Date.now() },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: 21,
          minute: 0,
          repeats: true,
        },
      });

      console.log('Streak warning scheduled for 9:00 PM');
    } catch (error) {
      console.error('Error scheduling streak warning:', error);
    }
  }, []);

  const scheduleMorningXPReminder = useCallback(async (): Promise<void> => {
    if (Platform.OS === 'web') return;

    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const existing = scheduledNotifications.filter(n =>
        n.content.data?.type === 'morning-xp-reminder'
      );
      for (const n of existing) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }

      const messages = [
        { title: '🌅 New Day, New XP!', body: 'Your daily quests have reset. Complete all 3 for max XP today!' },
        { title: '⚔️ Daily Quests Available', body: 'Log food, go for a run, crush a workout — each one earns XP!' },
        { title: '🎮 Ready Player One', body: 'A fresh day of XP grinding awaits. How much will you earn today?' },
      ];
      const msg = messages[Math.floor(Math.random() * messages.length)];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: msg.title,
          body: msg.body,
          sound: 'default',
          data: { type: 'morning-xp-reminder', timestamp: Date.now() },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: 7,
          minute: 30,
          repeats: true,
        },
      });

      console.log('Morning XP reminder scheduled for 7:30 AM');
    } catch (error) {
      console.error('Error scheduling morning XP reminder:', error);
    }
  }, []);

  const scheduleAllDailyReminders = useCallback(async (): Promise<void> => {
    await scheduleMorningXPReminder();
    await scheduleMorningFoodReminder();
    await scheduleMiddayRunReminder();
    await scheduleEveningWorkoutReminder();
    await scheduleStreakWarning();
    console.log('All 5 daily reminders scheduled (including XP + streak warning)');
  }, [scheduleMorningXPReminder, scheduleMorningFoodReminder, scheduleMiddayRunReminder, scheduleEveningWorkoutReminder, scheduleStreakWarning]);

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
    sendLevelUpNotification,
    sendRankUpNotification,
    sendStreakMilestoneNotification,
    sendXPEarnedNotification,
    scheduleStreakWarning,
    scheduleMorningXPReminder,
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
    sendLevelUpNotification,
    sendRankUpNotification,
    sendStreakMilestoneNotification,
    sendXPEarnedNotification,
    scheduleStreakWarning,
    scheduleMorningXPReminder,
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
