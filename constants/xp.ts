export interface RankInfo {
  title: string;
  emoji: string;
  color: string;
  glowColor: string;
  minLevel: number;
}

export const RANKS: RankInfo[] = [
  { title: 'Rookie', emoji: '🌱', color: '#22C55E', glowColor: 'rgba(34, 197, 94, 0.3)', minLevel: 1 },
  { title: 'Warrior', emoji: '⚔️', color: '#3B82F6', glowColor: 'rgba(59, 130, 246, 0.3)', minLevel: 5 },
  { title: 'Gladiator', emoji: '🛡️', color: '#8B5CF6', glowColor: 'rgba(139, 92, 246, 0.3)', minLevel: 10 },
  { title: 'Champion', emoji: '🏆', color: '#F59E0B', glowColor: 'rgba(245, 158, 11, 0.3)', minLevel: 15 },
  { title: 'Titan', emoji: '⚡', color: '#F97316', glowColor: 'rgba(249, 115, 22, 0.3)', minLevel: 20 },
  { title: 'Legend', emoji: '🔥', color: '#EF4444', glowColor: 'rgba(239, 68, 68, 0.3)', minLevel: 30 },
  { title: 'Mythic', emoji: '👑', color: '#E879F9', glowColor: 'rgba(232, 121, 249, 0.3)', minLevel: 40 },
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
} as const;

export type XPSource = 'run' | 'workout' | 'food' | 'nutrition_goal' | 'streak';

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
