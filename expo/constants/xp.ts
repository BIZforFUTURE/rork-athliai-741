export interface RankInfo {
  title: string;
  emoji: string;
  color: string;
  glowColor: string;
  minLevel: number;
}

export const RANKS: RankInfo[] = [
  { title: 'Rookie', emoji: 'I', color: '#CCFF00', glowColor: 'rgba(204, 255, 0, 0.3)', minLevel: 1 },
  { title: 'Warrior', emoji: 'II', color: '#818CF8', glowColor: 'rgba(129, 140, 248, 0.3)', minLevel: 5 },
  { title: 'Gladiator', emoji: 'III', color: '#22D3EE', glowColor: 'rgba(34, 211, 238, 0.3)', minLevel: 10 },
  { title: 'Champion', emoji: 'IV', color: '#FBBF24', glowColor: 'rgba(251, 191, 36, 0.3)', minLevel: 15 },
  { title: 'Titan', emoji: 'V', color: '#FB923C', glowColor: 'rgba(251, 146, 60, 0.3)', minLevel: 20 },
  { title: 'Legend', emoji: 'VI', color: '#F87171', glowColor: 'rgba(248, 113, 113, 0.3)', minLevel: 30 },
  { title: 'Mythic', emoji: 'VII', color: '#E879F9', glowColor: 'rgba(232, 121, 249, 0.3)', minLevel: 40 },
];

export const XP_REWARDS = {
  RUN_BASE: 25,
  RUN_PER_QUARTER_MILE: 15,
  WORKOUT_COMPLETE: 75,
  FOOD_LOG: 15,
  CALORIE_GOAL_HIT: 50,
  PROTEIN_GOAL_HIT: 30,
  STREAK_RUN_BONUS: 10,
  STREAK_WORKOUT_BONUS: 10,
  STREAK_FOOD_BONUS: 5,
  STREAK_MIN_DAYS: 3,
  TREADMILL_PHOTO: 20,
} as const;

export type XPSource = 'run' | 'workout' | 'food' | 'nutrition_goal' | 'streak' | 'treadmill_photo';

export interface XPEvent {
  id: string;
  source: XPSource;
  amount: number;
  description: string;
  date: string;
}

export interface XPState {
  totalXP: number;
  level: number;
  xpEvents: XPEvent[];
  lastCalorieGoalDate: string | null;
  lastProteinGoalDate: string | null;
}

export const defaultXPState: XPState = {
  totalXP: 0,
  level: 1,
  xpEvents: [],
  lastCalorieGoalDate: null,
  lastProteinGoalDate: null,
};

export function getXPForLevel(_level: number): number {
  return 500;
}

export function getTotalXPForLevel(level: number): number {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += getXPForLevel(i);
  }
  return total;
}

export function getLevelFromTotalXP(totalXP: number): number {
  let level = 1;
  let accumulated = 0;
  while (true) {
    const needed = getXPForLevel(level + 1);
    if (accumulated + needed > totalXP) break;
    accumulated += needed;
    level++;
  }
  return level;
}

export function getXPProgress(totalXP: number): { current: number; needed: number; progress: number } {
  const level = getLevelFromTotalXP(totalXP);
  const xpAtCurrentLevel = getTotalXPForLevel(level);
  const xpForNext = getXPForLevel(level + 1);
  const current = totalXP - xpAtCurrentLevel;
  return {
    current,
    needed: xpForNext,
    progress: xpForNext > 0 ? Math.min(current / xpForNext, 1) : 0,
  };
}

export function getRankForLevel(level: number): RankInfo {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (level >= r.minLevel) {
      rank = r;
    }
  }
  return rank;
}

export function getStartingLevelFromQuiz(fitnessLevelAnswer: string): { level: number; totalXP: number } {
  if (fitnessLevelAnswer.toLowerCase().includes('advanced')) {
    return { level: 10, totalXP: getTotalXPForLevel(10) };
  }
  if (fitnessLevelAnswer.toLowerCase().includes('intermediate')) {
    return { level: 5, totalXP: getTotalXPForLevel(5) };
  }
  return { level: 1, totalXP: 0 };
}

import type { TranslationKey } from '@/constants/translations';

export const RANK_TRANSLATION_KEYS: Record<string, TranslationKey> = {
  'Rookie': 'rank_rookie',
  'Warrior': 'rank_warrior',
  'Gladiator': 'rank_gladiator',
  'Champion': 'rank_champion',
  'Titan': 'rank_titan',
  'Legend': 'rank_legend',
  'Mythic': 'rank_mythic',
};

export const WORKOUT_NAME_TRANSLATION_KEYS: Record<string, TranslationKey> = {
  'Upper Body Strength': 'workout_upper_body_strength',
  'Lower Body Strength': 'workout_lower_body_strength',
  'Push Day (Hypertrophy)': 'workout_push_day_hypertrophy',
  'Endurance Circuit': 'workout_endurance_circuit',
  'Push Day (Strength)': 'workout_push_day_strength',
  'Pull Day (Hypertrophy)': 'workout_pull_day_hypertrophy',
  'Leg Day (Hypertrophy)': 'workout_leg_day_hypertrophy',
  'HIIT Cardio Blast': 'workout_hiit_cardio_blast',
};

export const LEVEL_UP_MESSAGE_KEYS: TranslationKey[] = [
  'levelup_msg_1',
  'levelup_msg_2',
  'levelup_msg_3',
  'levelup_msg_4',
  'levelup_msg_5',
  'levelup_msg_6',
  'levelup_msg_7',
  'levelup_msg_8',
  'levelup_msg_9',
  'levelup_msg_10',
];

export const LEVEL_UP_MESSAGES = [
  "You're unstoppable!",
  "New heights unlocked!",
  "The grind pays off!",
  "Built different.",
  "Another level conquered!",
  "Keep pushing limits!",
  "Strength is earned!",
  "No shortcuts, just progress!",
  "The journey continues!",
  "Leveling up in real life!",
];

export function getRandomLevelUpMessage(): string {
  return LEVEL_UP_MESSAGES[Math.floor(Math.random() * LEVEL_UP_MESSAGES.length)];
}

export function getRandomLevelUpMessageKey(): TranslationKey {
  return LEVEL_UP_MESSAGE_KEYS[Math.floor(Math.random() * LEVEL_UP_MESSAGE_KEYS.length)];
}
