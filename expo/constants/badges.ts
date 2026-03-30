import type { TranslationKey } from '@/constants/translations';

export interface Badge {
  id: string;
  emoji: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  color: string;
  requirement: (stats: BadgeStats) => boolean;
}

export interface BadgeStats {
  totalRuns: number;
  totalWorkouts: number;
  totalFoodEntries: number;
  runStreak: number;
  workoutStreak: number;
  foodStreak: number;
  totalXP: number;
  level: number;
  totalMiles: number;
}

export const BADGES: Badge[] = [
  {
    id: 'first_run',
    emoji: '🏃',
    titleKey: 'badge_first_run',
    descKey: 'badge_first_run_desc',
    color: '#CCFF00',
    requirement: (s) => s.totalRuns >= 1,
  },
  {
    id: 'first_workout',
    emoji: '💪',
    titleKey: 'badge_first_workout',
    descKey: 'badge_first_workout_desc',
    color: '#FB923C',
    requirement: (s) => s.totalWorkouts >= 1,
  },
  {
    id: 'first_meal',
    emoji: '🍽️',
    titleKey: 'badge_first_meal',
    descKey: 'badge_first_meal_desc',
    color: '#818CF8',
    requirement: (s) => s.totalFoodEntries >= 1,
  },
  {
    id: 'run_streak_3',
    emoji: '🔥',
    titleKey: 'badge_run_streak_3',
    descKey: 'badge_run_streak_3_desc',
    color: '#FBBF24',
    requirement: (s) => s.runStreak >= 3,
  },
  {
    id: 'run_streak_7',
    emoji: '⚡',
    titleKey: 'badge_run_streak_7',
    descKey: 'badge_run_streak_7_desc',
    color: '#F97316',
    requirement: (s) => s.runStreak >= 7,
  },
  {
    id: 'workout_streak_7',
    emoji: '🏋️',
    titleKey: 'badge_workout_streak_7',
    descKey: 'badge_workout_streak_7_desc',
    color: '#818CF8',
    requirement: (s) => s.workoutStreak >= 7,
  },
  {
    id: 'food_streak_7',
    emoji: '🥗',
    titleKey: 'badge_food_streak_7',
    descKey: 'badge_food_streak_7_desc',
    color: '#10B981',
    requirement: (s) => s.foodStreak >= 7,
  },
  {
    id: '10_runs',
    emoji: '🎯',
    titleKey: 'badge_10_runs',
    descKey: 'badge_10_runs_desc',
    color: '#CCFF00',
    requirement: (s) => s.totalRuns >= 10,
  },
  {
    id: '50_runs',
    emoji: '🏅',
    titleKey: 'badge_50_runs',
    descKey: 'badge_50_runs_desc',
    color: '#E879F9',
    requirement: (s) => s.totalRuns >= 50,
  },
  {
    id: '100_workouts',
    emoji: '🏆',
    titleKey: 'badge_100_workouts',
    descKey: 'badge_100_workouts_desc',
    color: '#FBBF24',
    requirement: (s) => s.totalWorkouts >= 100,
  },
  {
    id: 'level_10',
    emoji: '⭐',
    titleKey: 'badge_level_10',
    descKey: 'badge_level_10_desc',
    color: '#3B82F6',
    requirement: (s) => s.level >= 10,
  },
  {
    id: 'level_20',
    emoji: '🌟',
    titleKey: 'badge_level_20',
    descKey: 'badge_level_20_desc',
    color: '#F97316',
    requirement: (s) => s.level >= 20,
  },
  {
    id: '1000_xp',
    emoji: '💎',
    titleKey: 'badge_1000_xp',
    descKey: 'badge_1000_xp_desc',
    color: '#CCFF00',
    requirement: (s) => s.totalXP >= 1000,
  },
  {
    id: '10_miles',
    emoji: '🛤️',
    titleKey: 'badge_10_miles',
    descKey: 'badge_10_miles_desc',
    color: '#CCFF00',
    requirement: (s) => s.totalMiles >= 10,
  },
  {
    id: '50_miles',
    emoji: '🗺️',
    titleKey: 'badge_50_miles',
    descKey: 'badge_50_miles_desc',
    color: '#EF4444',
    requirement: (s) => s.totalMiles >= 50,
  },
];

export const AVATAR_OPTIONS = [
  { id: 'default', emoji: '👤', color: '#52525B' },
  { id: 'runner', emoji: '🏃', color: '#CCFF00' },
  { id: 'lifter', emoji: '🏋️', color: '#FB923C' },
  { id: 'athlete', emoji: '⚡', color: '#FBBF24' },
  { id: 'ninja', emoji: '🥷', color: '#818CF8' },
  { id: 'fire', emoji: '🔥', color: '#EF4444' },
  { id: 'star', emoji: '⭐', color: '#FBBF24' },
  { id: 'crown', emoji: '👑', color: '#E879F9' },
  { id: 'tiger', emoji: '🐯', color: '#F97316' },
  { id: 'eagle', emoji: '🦅', color: '#3B82F6' },
  { id: 'shark', emoji: '🦈', color: '#CCFF00' },
  { id: 'dragon', emoji: '🐉', color: '#CCFF00' },
];
