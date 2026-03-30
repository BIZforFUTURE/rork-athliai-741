export interface RunAchievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  category: 'distance' | 'pace' | 'time' | 'calories' | 'record';
}

interface RunData {
  distance: number;
  time: number;
  pace: number;
  calories: number;
}

interface PreviousRunsData {
  longestDistance: number;
  fastestPace: number;
  longestTime: number;
  mostCalories: number;
  totalRuns: number;
}

const DISTANCE_ACHIEVEMENTS: RunAchievement[] = [
  {
    id: 'dist_1mi',
    title: 'First Mile',
    description: 'Ran at least 1 mile',
    emoji: '',
    color: '#00E5FF',
    category: 'distance',
  },
  {
    id: 'dist_5k',
    title: '5K Finisher',
    description: 'Ran a 5K (3.1 miles)',
    emoji: '',
    color: '#10B981',
    category: 'distance',
  },
  {
    id: 'dist_5mi',
    title: 'Five Alive',
    description: 'Ran 5 miles in one go',
    emoji: '',
    color: '#3B82F6',
    category: 'distance',
  },
  {
    id: 'dist_10k',
    title: '10K Crusher',
    description: 'Ran a 10K (6.2 miles)',
    emoji: '',
    color: '#8B5CF6',
    category: 'distance',
  },
  {
    id: 'dist_half',
    title: 'Half Marathon',
    description: 'Ran 13.1 miles — half marathon!',
    emoji: '',
    color: '#F59E0B',
    category: 'distance',
  },
  {
    id: 'dist_marathon',
    title: 'Marathoner',
    description: 'Ran the full 26.2 miles',
    emoji: '',
    color: '#EF4444',
    category: 'distance',
  },
];

const PACE_ACHIEVEMENTS: RunAchievement[] = [
  {
    id: 'pace_sub12',
    title: 'Getting Moving',
    description: 'Averaged under 12:00/mi pace',
    emoji: '',
    color: '#6B7280',
    category: 'pace',
  },
  {
    id: 'pace_sub10',
    title: 'Solid Stride',
    description: 'Averaged under 10:00/mi pace',
    emoji: '',
    color: '#00ADB5',
    category: 'pace',
  },
  {
    id: 'pace_sub9',
    title: 'Quick Feet',
    description: 'Averaged under 9:00/mi pace',
    emoji: '',
    color: '#F59E0B',
    category: 'pace',
  },
  {
    id: 'pace_sub8',
    title: 'Speed Machine',
    description: 'Averaged under 8:00/mi pace',
    emoji: '',
    color: '#F97316',
    category: 'pace',
  },
  {
    id: 'pace_sub7',
    title: 'Speed Demon',
    description: 'Averaged under 7:00/mi pace',
    emoji: '',
    color: '#EF4444',
    category: 'pace',
  },
  {
    id: 'pace_sub6',
    title: 'Elite Runner',
    description: 'Averaged under 6:00/mi pace',
    emoji: '',
    color: '#E879F9',
    category: 'pace',
  },
];

const TIME_ACHIEVEMENTS: RunAchievement[] = [
  {
    id: 'time_10min',
    title: 'Warm Up',
    description: 'Ran for 10+ minutes',
    emoji: '',
    color: '#00E5FF',
    category: 'time',
  },
  {
    id: 'time_30min',
    title: 'Thirty & Thriving',
    description: 'Ran for 30+ minutes',
    emoji: '',
    color: '#10B981',
    category: 'time',
  },
  {
    id: 'time_60min',
    title: 'Hour Power',
    description: 'Ran for a full hour',
    emoji: '',
    color: '#3B82F6',
    category: 'time',
  },
  {
    id: 'time_90min',
    title: 'Endurance Beast',
    description: 'Ran for 90+ minutes',
    emoji: '',
    color: '#8B5CF6',
    category: 'time',
  },
  {
    id: 'time_120min',
    title: 'Ultra Stamina',
    description: 'Ran for 2+ hours',
    emoji: '',
    color: '#F59E0B',
    category: 'time',
  },
];

const CALORIE_ACHIEVEMENTS: RunAchievement[] = [
  {
    id: 'cal_100',
    title: 'Calorie Starter',
    description: 'Burned 100+ calories',
    emoji: '',
    color: '#F97316',
    category: 'calories',
  },
  {
    id: 'cal_250',
    title: 'Burn Notice',
    description: 'Burned 250+ calories',
    emoji: '',
    color: '#EF4444',
    category: 'calories',
  },
  {
    id: 'cal_500',
    title: 'Calorie Crusher',
    description: 'Burned 500+ calories',
    emoji: '',
    color: '#DC2626',
    category: 'calories',
  },
  {
    id: 'cal_1000',
    title: 'Inferno',
    description: 'Burned 1000+ calories in a single run',
    emoji: '',
    color: '#B91C1C',
    category: 'calories',
  },
];

const RECORD_ACHIEVEMENTS: RunAchievement[] = [
  {
    id: 'record_longest',
    title: 'New Distance PR!',
    description: 'Your longest run yet',
    emoji: '',
    color: '#00E5FF',
    category: 'record',
  },
  {
    id: 'record_fastest',
    title: 'New Pace PR!',
    description: 'Your fastest average pace',
    emoji: '',
    color: '#BFFF00',
    category: 'record',
  },
  {
    id: 'record_longest_time',
    title: 'New Duration PR!',
    description: 'Your longest run by time',
    emoji: '',
    color: '#8B5CF6',
    category: 'record',
  },
  {
    id: 'record_milestone_10',
    title: '10th Run!',
    description: 'You\'ve completed 10 runs',
    emoji: '',
    color: '#00ADB5',
    category: 'record',
  },
  {
    id: 'record_milestone_25',
    title: '25th Run!',
    description: 'You\'ve completed 25 runs',
    emoji: '',
    color: '#F59E0B',
    category: 'record',
  },
  {
    id: 'record_milestone_50',
    title: '50th Run!',
    description: 'You\'ve completed 50 runs',
    emoji: '',
    color: '#E879F9',
    category: 'record',
  },
  {
    id: 'record_milestone_100',
    title: '100th Run!',
    description: 'You\'ve completed 100 runs — legend!',
    emoji: '',
    color: '#EF4444',
    category: 'record',
  },
];

export const ALL_ACHIEVEMENTS = [
  ...DISTANCE_ACHIEVEMENTS,
  ...PACE_ACHIEVEMENTS,
  ...TIME_ACHIEVEMENTS,
  ...CALORIE_ACHIEVEMENTS,
  ...RECORD_ACHIEVEMENTS,
];

export function calculateRunAchievements(
  run: RunData,
  previousRuns: PreviousRunsData
): RunAchievement[] {
  const earned: RunAchievement[] = [];

  if (run.distance >= 1) earned.push(DISTANCE_ACHIEVEMENTS[0]);
  if (run.distance >= 3.1) earned.push(DISTANCE_ACHIEVEMENTS[1]);
  if (run.distance >= 5) earned.push(DISTANCE_ACHIEVEMENTS[2]);
  if (run.distance >= 6.2) earned.push(DISTANCE_ACHIEVEMENTS[3]);
  if (run.distance >= 13.1) earned.push(DISTANCE_ACHIEVEMENTS[4]);
  if (run.distance >= 26.2) earned.push(DISTANCE_ACHIEVEMENTS[5]);

  if (run.distance >= 0.25 && run.pace > 0 && isFinite(run.pace)) {
    if (run.pace < 12) earned.push(PACE_ACHIEVEMENTS[0]);
    if (run.pace < 10) earned.push(PACE_ACHIEVEMENTS[1]);
    if (run.pace < 9) earned.push(PACE_ACHIEVEMENTS[2]);
    if (run.pace < 8) earned.push(PACE_ACHIEVEMENTS[3]);
    if (run.pace < 7) earned.push(PACE_ACHIEVEMENTS[4]);
    if (run.pace < 6) earned.push(PACE_ACHIEVEMENTS[5]);
  }

  const timeMinutes = run.time / 60;
  if (timeMinutes >= 10) earned.push(TIME_ACHIEVEMENTS[0]);
  if (timeMinutes >= 30) earned.push(TIME_ACHIEVEMENTS[1]);
  if (timeMinutes >= 60) earned.push(TIME_ACHIEVEMENTS[2]);
  if (timeMinutes >= 90) earned.push(TIME_ACHIEVEMENTS[3]);
  if (timeMinutes >= 120) earned.push(TIME_ACHIEVEMENTS[4]);

  if (run.calories >= 100) earned.push(CALORIE_ACHIEVEMENTS[0]);
  if (run.calories >= 250) earned.push(CALORIE_ACHIEVEMENTS[1]);
  if (run.calories >= 500) earned.push(CALORIE_ACHIEVEMENTS[2]);
  if (run.calories >= 1000) earned.push(CALORIE_ACHIEVEMENTS[3]);

  if (previousRuns.totalRuns > 0 && run.distance > previousRuns.longestDistance) {
    earned.push(RECORD_ACHIEVEMENTS[0]);
  }
  if (
    previousRuns.totalRuns > 0 &&
    run.pace > 0 &&
    isFinite(run.pace) &&
    run.distance >= 0.5 &&
    (previousRuns.fastestPace <= 0 || run.pace < previousRuns.fastestPace)
  ) {
    earned.push(RECORD_ACHIEVEMENTS[1]);
  }
  if (previousRuns.totalRuns > 0 && run.time > previousRuns.longestTime) {
    earned.push(RECORD_ACHIEVEMENTS[2]);
  }

  const newTotal = previousRuns.totalRuns + 1;
  if (newTotal === 10) earned.push(RECORD_ACHIEVEMENTS[3]);
  if (newTotal === 25) earned.push(RECORD_ACHIEVEMENTS[4]);
  if (newTotal === 50) earned.push(RECORD_ACHIEVEMENTS[5]);
  if (newTotal === 100) earned.push(RECORD_ACHIEVEMENTS[6]);

  return earned;
}

export function getAchievementById(id: string): RunAchievement | undefined {
  return ALL_ACHIEVEMENTS.find(a => a.id === id);
}
