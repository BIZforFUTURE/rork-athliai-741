import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

import { WorkoutLog, calculateWorkoutVolume } from "@/constants/workouts";
import { useNotifications } from "@/providers/NotificationProvider";
import {
  XPState,
  XPEvent,
  XPSource,
  defaultXPState,
  XP_REWARDS,
  getLevelFromTotalXP,
  getXPProgress,
  getRankForLevel,
} from "@/constants/xp";

interface User {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
}

interface Stats {
  runStreak: number;
  foodStreak: number;
  weeklyMiles: number;
  weeklyRuns: number;
  weeklyTime: number;
  workoutStreak: number;
  totalWorkouts: number;
  weeklyWorkouts: number;
  totalVolume: number;
  weeklyVolume: number;
}

interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  quizCompleted: boolean;
}

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

interface Run {
  id: string;
  date: string;
  distance: number;
  time: number;
  pace: number;
  calories: number;
  photos?: string[];
  notes?: string;
  weather?: string;
  route?: string;
  routeCoordinates?: RouteCoordinate[];
  treadmillVerified?: boolean;
}

interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
}



interface PersonalStats {
  height?: number;
  weight?: number;
  targetWeight?: number;
  goalEndDate?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
}

interface WeightEntry {
  date: string;
  weight: number;
}

interface CustomWorkoutPlan {
  id: string;
  name: string;
  description: string;
  workoutDays: string[];
  days: {
    day: number;
    name: string;
    exercises: {
      name: string;
      sets: number;
      reps: string;
      restTime: number;
      videoUrl: string;
      equipment: string;
      description: string;
    }[];
  }[];
}

interface SavedWorkout {
  id: string;
  name: string;
  exercises: {
    name: string;
    sets: number;
    reps: string;
    restTime: number;
    equipment: string;
    description: string;
    imageUrl: string;
  }[];
  createdAt: string;
}

interface CoreState {
  user: User;
  stats: Stats;
  nutrition: Nutrition;
  customWorkoutPlan: CustomWorkoutPlan | null;
  savedWorkouts: SavedWorkout[];
  personalStats: PersonalStats;
  weightHistory: WeightEntry[];
  xp: XPState;
  lastResetDate: string;
  lastRunDate: string | null;
  lastFoodDate: string | null;
  lastWorkoutDate: string | null;
  hasSeenWelcome: boolean;
}

interface AppState extends CoreState {
  runs: Run[];
  foodHistory: FoodEntry[];
  workoutLogs: WorkoutLog[];
}

const STORAGE_KEYS = {
  CORE: '@app_core',
  RUNS: '@app_runs',
  FOOD: '@app_food',
  WORKOUTS: '@app_workouts',
  LEGACY: 'appState',
} as const;

const generateUserId = () => {
  return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const defaultState: AppState = {
  user: {
    id: generateUserId(),
    name: "",
    email: "",
    profileImage: undefined,
  },
  stats: {
    runStreak: 0,
    foodStreak: 0,
    weeklyMiles: 0,
    weeklyRuns: 0,
    weeklyTime: 0,
    workoutStreak: 0,
    totalWorkouts: 0,
    weeklyWorkouts: 0,
    totalVolume: 0,
    weeklyVolume: 0,
  },
  nutrition: {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    calorieGoal: 2000,
    proteinGoal: 50,
    carbsGoal: 250,
    fatGoal: 65,
    quizCompleted: false,
  },
  runs: [],
  foodHistory: [],
  workoutLogs: [],
  customWorkoutPlan: null,
  savedWorkouts: [],
  personalStats: {},
  weightHistory: [],
  xp: defaultXPState,

  lastResetDate: new Date().toDateString(),
  lastRunDate: null,
  lastFoodDate: null,
  lastWorkoutDate: null,
  hasSeenWelcome: false,
};

const runStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item from storage:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item in storage:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from storage:', error);
    }
  },
};

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw || raw.trim() === '' || raw === 'undefined' || raw === 'null') {
    return fallback;
  }
  try {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return fallback;
    if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) return fallback;
    return JSON.parse(trimmed) as T;
  } catch {
    console.warn('safeJsonParse failed, using fallback');
    return fallback;
  }
}

function validateState(parsed: Record<string, unknown>): AppState {
  return {
    ...defaultState,
    ...parsed,
    user: {
      ...defaultState.user,
      ...((parsed.user as Record<string, unknown>) || {}),
      id: (parsed.user as Record<string, unknown>)?.id as string || generateUserId(),
    },
    stats: { ...defaultState.stats, ...((parsed.stats as Record<string, unknown>) || {}) },
    nutrition: { ...defaultState.nutrition, ...((parsed.nutrition as Record<string, unknown>) || {}) },
    runs: Array.isArray(parsed.runs) ? parsed.runs : [],
    foodHistory: Array.isArray(parsed.foodHistory) ? parsed.foodHistory : [],
    workoutLogs: Array.isArray(parsed.workoutLogs) ? parsed.workoutLogs : [],
    customWorkoutPlan: (parsed.customWorkoutPlan as CustomWorkoutPlan) || null,
    savedWorkouts: Array.isArray(parsed.savedWorkouts) ? parsed.savedWorkouts : [],
    personalStats: (parsed.personalStats as PersonalStats) || {},
    weightHistory: Array.isArray(parsed.weightHistory) ? parsed.weightHistory : [],
    xp: parsed.xp ? {
      ...defaultXPState,
      ...(parsed.xp as Record<string, unknown>),
      xpEvents: Array.isArray((parsed.xp as Record<string, unknown>)?.xpEvents) 
        ? (parsed.xp as Record<string, unknown>).xpEvents as XPEvent[] 
        : [],
    } : defaultXPState,
    lastResetDate: (parsed.lastResetDate as string) || new Date().toDateString(),
    lastRunDate: (parsed.lastRunDate as string) || null,
    lastFoodDate: (parsed.lastFoodDate as string) || null,
    lastWorkoutDate: (parsed.lastWorkoutDate as string) || null,
    hasSeenWelcome: Boolean(parsed.hasSeenWelcome),
  };
}

function extractCoreState(state: AppState): CoreState {
  const { runs, foodHistory, workoutLogs, ...core } = state;
  void runs;
  void foodHistory;
  void workoutLogs;
  return core;
}

async function migrateFromLegacy(): Promise<AppState | null> {
  try {
    const legacy = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY);
    if (!legacy) return null;

    console.log('Found legacy appState, migrating to split storage...');
    const parsed = safeJsonParse<Record<string, unknown>>(legacy, {});
    if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) {
      await AsyncStorage.removeItem(STORAGE_KEYS.LEGACY);
      return null;
    }

    const state = validateState(parsed);

    const coreData = extractCoreState(state);
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.CORE, JSON.stringify(coreData)],
      [STORAGE_KEYS.RUNS, JSON.stringify(state.runs)],
      [STORAGE_KEYS.FOOD, JSON.stringify(state.foodHistory)],
      [STORAGE_KEYS.WORKOUTS, JSON.stringify(state.workoutLogs)],
    ]);

    await AsyncStorage.removeItem(STORAGE_KEYS.LEGACY);
    console.log('Migration complete. Legacy key removed.');
    console.log(`Split sizes - core: ${JSON.stringify(coreData).length}, runs: ${JSON.stringify(state.runs).length}, food: ${JSON.stringify(state.foodHistory).length}, workouts: ${JSON.stringify(state.workoutLogs).length}`);
    return state;
  } catch (error) {
    console.error('Migration error:', error);
    try { await AsyncStorage.removeItem(STORAGE_KEYS.LEGACY); } catch {}
    return null;
  }
}

async function loadSplitState(): Promise<AppState> {
  const migrated = await migrateFromLegacy();
  if (migrated) return migrated;

  const results = await AsyncStorage.multiGet([
    STORAGE_KEYS.CORE,
    STORAGE_KEYS.RUNS,
    STORAGE_KEYS.FOOD,
    STORAGE_KEYS.WORKOUTS,
  ]);

  const coreRaw = results[0][1];
  const runsRaw = results[1][1];
  const foodRaw = results[2][1];
  const workoutsRaw = results[3][1];

  if (!coreRaw) {
    console.log('No stored state found, using default');
    return defaultState;
  }

  const core = safeJsonParse<Record<string, unknown>>(coreRaw, {});
  const runs = safeJsonParse<Run[]>(runsRaw, []);
  const food = safeJsonParse<FoodEntry[]>(foodRaw, []);
  const workouts = safeJsonParse<WorkoutLog[]>(workoutsRaw, []);

  const state = validateState({
    ...core,
    runs: Array.isArray(runs) ? runs : [],
    foodHistory: Array.isArray(food) ? food : [],
    workoutLogs: Array.isArray(workouts) ? workouts : [],
  });

  console.log(`State loaded - runs: ${state.runs.length}, food: ${state.foodHistory.length}, workouts: ${state.workoutLogs.length}`);
  return state;
}

type ChangedDomains = {
  core: boolean;
  runs: boolean;
  food: boolean;
  workouts: boolean;
};

async function saveSplitState(state: AppState, changed: ChangedDomains): Promise<AppState> {
  if (!state) {
    console.error('Attempted to save null/undefined state');
    return state;
  }

  try {
    const pairs: [string, string][] = [];

    if (changed.core) {
      const coreData = extractCoreState(state);
      const coreSerialized = JSON.stringify(coreData);
      pairs.push([STORAGE_KEYS.CORE, coreSerialized]);
    }
    if (changed.runs) {
      const runsSerialized = JSON.stringify(Array.isArray(state.runs) ? state.runs : []);
      pairs.push([STORAGE_KEYS.RUNS, runsSerialized]);
    }
    if (changed.food) {
      const foodSerialized = JSON.stringify(Array.isArray(state.foodHistory) ? state.foodHistory : []);
      pairs.push([STORAGE_KEYS.FOOD, foodSerialized]);
    }
    if (changed.workouts) {
      const workoutsSerialized = JSON.stringify(Array.isArray(state.workoutLogs) ? state.workoutLogs : []);
      pairs.push([STORAGE_KEYS.WORKOUTS, workoutsSerialized]);
    }

    if (pairs.length > 0) {
      await AsyncStorage.multiSet(pairs);
      const totalSize = pairs.reduce((sum, [, v]) => sum + v.length, 0);
      console.log(`Saved ${pairs.length} storage keys, total size: ${totalSize}`);
    }

    return state;
  } catch (error) {
    console.error('Error saving app state:', error);
    return state;
  }
}

export const [AppProvider, useApp] = createContextHook(() => {
  const [appState, setAppState] = useState<AppState>(defaultState);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingLevelUp, setPendingLevelUp] = useState<{ level: number; previousLevel: number } | null>(null);
  const { sendWeeklyReport, sendLevelUpNotification, sendRankUpNotification, sendStreakMilestoneNotification } = useNotifications();
  const prevStateRef = useRef<AppState>(defaultState);

  const getChangedDomains = useCallback((prev: AppState, next: AppState): ChangedDomains => {
    return {
      core: prev.user !== next.user || prev.stats !== next.stats || prev.nutrition !== next.nutrition ||
        prev.customWorkoutPlan !== next.customWorkoutPlan || prev.savedWorkouts !== next.savedWorkouts ||
        prev.personalStats !== next.personalStats || prev.weightHistory !== next.weightHistory ||
        prev.xp !== next.xp || prev.lastResetDate !== next.lastResetDate ||
        prev.lastRunDate !== next.lastRunDate || prev.lastFoodDate !== next.lastFoodDate ||
        prev.lastWorkoutDate !== next.lastWorkoutDate || prev.hasSeenWelcome !== next.hasSeenWelcome,
      runs: prev.runs !== next.runs,
      food: prev.foodHistory !== next.foodHistory,
      workouts: prev.workoutLogs !== next.workoutLogs,
    };
  }, []);

  const getWeeklyRunsFromState = useCallback((state: AppState) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return state.runs.filter(run => new Date(run.date) >= oneWeekAgo);
  }, []);
  
  const getWeeklyWorkoutsFromState = useCallback((state: AppState) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return state.workoutLogs.filter(log => new Date(log.date) >= oneWeekAgo);
  }, []);

  const checkDailyReset = useCallback((state: AppState): AppState => {
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();
    
    if (state.lastResetDate !== today) {
      console.log('Daily reset triggered - resetting nutrition values');
      let newRunStreak = state.stats.runStreak;
      let newFoodStreak = state.stats.foodStreak;
      let newWorkoutStreak = state.stats.workoutStreak;
      
      if (state.lastRunDate) {
        const lastRunDate = new Date(state.lastRunDate).toDateString();
        if (lastRunDate !== yesterdayString && lastRunDate !== today) {
          newRunStreak = 0;
        }
      }
      
      if (state.lastFoodDate) {
        const lastFoodDate = new Date(state.lastFoodDate).toDateString();
        if (lastFoodDate !== yesterdayString && lastFoodDate !== today) {
          newFoodStreak = 0;
        }
      }
      
      if (state.lastWorkoutDate) {
        const lastWorkoutDate = new Date(state.lastWorkoutDate).toDateString();
        if (lastWorkoutDate !== yesterdayString && lastWorkoutDate !== today) {
          newWorkoutStreak = 0;
        }
      }
      
      const dayOfWeek = now.getDay();
      if (dayOfWeek === 0) {
        const weeklyRuns = getWeeklyRunsFromState(state);
        const weeklyWorkouts = getWeeklyWorkoutsFromState(state);
        const weeklyMiles = weeklyRuns.reduce((sum, run) => sum + run.distance, 0);
        const caloriesBurned = weeklyRuns.reduce((sum, run) => sum + run.calories, 0);
        
        sendWeeklyReport({
          weeklyRuns: weeklyRuns.length,
          weeklyMiles,
          weeklyWorkouts: weeklyWorkouts.length,
          runStreak: newRunStreak,
          workoutStreak: newWorkoutStreak,
          caloriesBurned,
        }).catch(error => {
          console.error('Error sending weekly report:', error);
        });
      }
      
      return {
        ...state,
        nutrition: {
          ...state.nutrition,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
        stats: {
          ...state.stats,
          runStreak: newRunStreak,
          foodStreak: newFoodStreak,
          workoutStreak: newWorkoutStreak,
        },
        lastResetDate: today,
      };
    }
    return state;
  }, [sendWeeklyReport, getWeeklyRunsFromState, getWeeklyWorkoutsFromState]);

  const { data: storedState, isLoading: isLoadingState } = useQuery({
    queryKey: ["appState"],
    queryFn: loadSplitState,
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ state, changed }: { state: AppState; changed: ChangedDomains }) => {
      return saveSplitState(state, changed);
    },
  });

  const persistState = useCallback((updated: AppState) => {
    const changed = getChangedDomains(prevStateRef.current, updated);
    prevStateRef.current = updated;
    saveMutation.mutate({ state: updated, changed });
  }, [getChangedDomains, saveMutation]);

  useEffect(() => {
    if (storedState && !isLoadingState) {
      const resetState = checkDailyReset(storedState);
      setAppState(resetState);
      prevStateRef.current = resetState;
      setIsInitialized(true);
      if (resetState !== storedState) {
        const changed = getChangedDomains(storedState, resetState);
        saveMutation.mutate({ state: resetState, changed });
      }
    } else if (!isLoadingState && !storedState) {
      setAppState(defaultState);
      prevStateRef.current = defaultState;
      setIsInitialized(true);
    }
  }, [storedState, isLoadingState, checkDailyReset, saveMutation, getChangedDomains]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAppState(prev => {
        const resetState = checkDailyReset(prev);
        if (resetState !== prev) {
          console.log('Periodic daily reset check - resetting nutrition');
          persistState(resetState);
        }
        return resetState;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [checkDailyReset, persistState]);

  const updateUser = useCallback((user: Partial<User>) => {
    setAppState(prev => {
      const updated = { ...prev, user: { ...prev.user, ...user } };
      persistState(updated);
      return updated;
    });
  }, [persistState]);

  const updateStats = useCallback((stats: Partial<Stats>) => {
    setAppState(prev => {
      const updated = { ...prev, stats: { ...prev.stats, ...stats } };
      persistState(updated);
      return updated;
    });
  }, [persistState]);

  const updateNutrition = useCallback((nutrition: Partial<Nutrition>) => {
    setAppState(prev => {
      const resetState = checkDailyReset(prev);
      const updated = {
        ...resetState,
        nutrition: { ...resetState.nutrition, ...nutrition },
      };
      persistState(updated);
      return updated;
    });
  }, [persistState, checkDailyReset]);

  const awardXP = useCallback((state: AppState, amount: number, source: XPSource, description: string): AppState => {
    const event: XPEvent = {
      id: `xp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      source,
      amount,
      description,
      date: new Date().toISOString(),
    };
    const newTotalXP = state.xp.totalXP + amount;
    const previousLevel = getLevelFromTotalXP(state.xp.totalXP);
    const newLevel = getLevelFromTotalXP(newTotalXP);
    console.log(`XP awarded: +${amount} (${source}) | Total: ${newTotalXP} | Level: ${newLevel}`);
    if (newLevel > previousLevel) {
      console.log(`LEVEL UP! ${previousLevel} -> ${newLevel}`);
      setPendingLevelUp({ level: newLevel, previousLevel });
      const newRank = getRankForLevel(newLevel);
      const oldRank = getRankForLevel(previousLevel);
      sendLevelUpNotification(newLevel, newRank).catch(e => console.error('Level up notification error:', e));
      if (newRank.title !== oldRank.title) {
        sendRankUpNotification(newRank, newLevel).catch(e => console.error('Rank up notification error:', e));
      }
    }
    const recentEvents = [...state.xp.xpEvents, event].slice(-100);
    return {
      ...state,
      xp: {
        ...state.xp,
        totalXP: newTotalXP,
        level: newLevel,
        xpEvents: recentEvents,
      },
    };
  }, [sendLevelUpNotification, sendRankUpNotification]);

  const addRun = useCallback((run: Run) => {
    setAppState(prev => {
      const today = new Date().toDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toDateString();
      
      let newRunStreak = prev.stats.runStreak;
      if (!prev.lastRunDate || prev.lastRunDate === today) {
        if (prev.lastRunDate !== today) {
          if (prev.lastRunDate === yesterdayString) {
            newRunStreak = prev.stats.runStreak + 1;
          } else {
            newRunStreak = 1;
          }
        }
      }

      let state: AppState = {
        ...prev,
        runs: [run, ...prev.runs],
        stats: {
          ...prev.stats,
          runStreak: newRunStreak,
        },
        lastRunDate: today,
      };

      const quarterMiles = Math.floor(run.distance * 4);
      const runXP = XP_REWARDS.RUN_BASE + (quarterMiles * XP_REWARDS.RUN_PER_QUARTER_MILE);
      state = awardXP(state, runXP, 'run', `Completed a ${run.distance.toFixed(1)} mi run`);

      if (run.treadmillVerified) {
        state = awardXP(state, XP_REWARDS.TREADMILL_PHOTO, 'treadmill_photo', 'Treadmill photo verified');
      }

      if (newRunStreak >= XP_REWARDS.STREAK_MIN_DAYS) {
        const streakBonus = newRunStreak * XP_REWARDS.STREAK_RUN_BONUS;
        state = awardXP(state, streakBonus, 'streak', `${newRunStreak}-day run streak bonus`);
        if (newRunStreak % 7 === 0 || newRunStreak === 3 || newRunStreak === 14 || newRunStreak === 30) {
          sendStreakMilestoneNotification('Run', newRunStreak).catch(e => console.error('Streak milestone error:', e));
        }
      }

      persistState(state);
      return state;
    });
  }, [persistState, awardXP, sendStreakMilestoneNotification]);

  const addFoodEntry = useCallback((entry: FoodEntry) => {
    setAppState(prev => {
      const resetState = checkDailyReset(prev);
      const today = new Date().toDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toDateString();
      
      let newFoodStreak = resetState.stats.foodStreak;
      if (!resetState.lastFoodDate || resetState.lastFoodDate === today) {
        if (resetState.lastFoodDate !== today) {
          if (resetState.lastFoodDate === yesterdayString) {
            newFoodStreak = resetState.stats.foodStreak + 1;
          } else {
            newFoodStreak = 1;
          }
        }
      }
      
      const isToday = new Date(entry.date).toDateString() === today;

      let state: AppState = {
        ...resetState,
        foodHistory: [entry, ...resetState.foodHistory],
        nutrition: {
          ...resetState.nutrition,
          ...(isToday ? {
            calories: resetState.nutrition.calories + entry.calories,
            protein: resetState.nutrition.protein + entry.protein,
            carbs: resetState.nutrition.carbs + entry.carbs,
            fat: resetState.nutrition.fat + entry.fat,
          } : {}),
        },
        stats: {
          ...resetState.stats,
          foodStreak: newFoodStreak,
        },
        lastFoodDate: today,
      };

      state = awardXP(state, XP_REWARDS.FOOD_LOG, 'food', `Logged ${entry.name}`);

      const newCalories = state.nutrition.calories;
      const newProtein = state.nutrition.protein;
      if (newCalories >= state.nutrition.calorieGoal && state.nutrition.calorieGoal > 0 && state.xp.lastCalorieGoalDate !== today) {
        state = awardXP(state, XP_REWARDS.CALORIE_GOAL_HIT, 'nutrition_goal', 'Hit daily calorie goal');
        state = { ...state, xp: { ...state.xp, lastCalorieGoalDate: today } };
      }
      if (newProtein >= state.nutrition.proteinGoal && state.nutrition.proteinGoal > 0 && state.xp.lastProteinGoalDate !== today) {
        state = awardXP(state, XP_REWARDS.PROTEIN_GOAL_HIT, 'nutrition_goal', 'Hit daily protein goal');
        state = { ...state, xp: { ...state.xp, lastProteinGoalDate: today } };
      }

      if (newFoodStreak >= XP_REWARDS.STREAK_MIN_DAYS) {
        const streakBonus = newFoodStreak * XP_REWARDS.STREAK_FOOD_BONUS;
        state = awardXP(state, streakBonus, 'streak', `${newFoodStreak}-day food streak bonus`);
        if (newFoodStreak % 7 === 0 || newFoodStreak === 3 || newFoodStreak === 14 || newFoodStreak === 30) {
          sendStreakMilestoneNotification('Food', newFoodStreak).catch(e => console.error('Streak milestone error:', e));
        }
      }

      persistState(state);
      return state;
    });
  }, [persistState, checkDailyReset, awardXP, sendStreakMilestoneNotification]);

  const deleteFoodEntry = useCallback((entryId: string) => {
    setAppState(prev => {
      const entryToDelete = prev.foodHistory.find(entry => entry.id === entryId);
      if (!entryToDelete) return prev;
      
      const entryDate = new Date(entryToDelete.date).toDateString();
      const today = new Date().toDateString();
      
      const updatedFoodHistory = prev.foodHistory.filter(entry => entry.id !== entryId);
      
      let updatedNutrition = prev.nutrition;
      
      if (entryDate === today) {
        updatedNutrition = {
          ...prev.nutrition,
          calories: Math.max(0, prev.nutrition.calories - entryToDelete.calories),
          protein: Math.max(0, prev.nutrition.protein - entryToDelete.protein),
          carbs: Math.max(0, prev.nutrition.carbs - entryToDelete.carbs),
          fat: Math.max(0, prev.nutrition.fat - entryToDelete.fat),
        };
      }
      
      const updated = {
        ...prev,
        foodHistory: updatedFoodHistory,
        nutrition: updatedNutrition,
      };
      persistState(updated);
      return updated;
    });
  }, [persistState]);

  const updateFoodEntry = useCallback((entryId: string, updates: Partial<FoodEntry>) => {
    setAppState(prev => {
      const entryToUpdate = prev.foodHistory.find(entry => entry.id === entryId);
      if (!entryToUpdate) return prev;
      
      const entryDate = new Date(entryToUpdate.date).toDateString();
      const today = new Date().toDateString();
      
      const updatedFoodHistory = prev.foodHistory.map(entry => 
        entry.id === entryId ? { ...entry, ...updates } : entry
      );
      
      let updatedNutrition = prev.nutrition;
      
      if (entryDate === today) {
        const oldCalories = entryToUpdate.calories;
        const oldProtein = entryToUpdate.protein;
        const oldCarbs = entryToUpdate.carbs;
        const oldFat = entryToUpdate.fat;
        
        const newCalories = updates.calories ?? oldCalories;
        const newProtein = updates.protein ?? oldProtein;
        const newCarbs = updates.carbs ?? oldCarbs;
        const newFat = updates.fat ?? oldFat;
        
        updatedNutrition = {
          ...prev.nutrition,
          calories: Math.max(0, prev.nutrition.calories - oldCalories + newCalories),
          protein: Math.max(0, prev.nutrition.protein - oldProtein + newProtein),
          carbs: Math.max(0, prev.nutrition.carbs - oldCarbs + newCarbs),
          fat: Math.max(0, prev.nutrition.fat - oldFat + newFat),
        };
      }
      
      const updated = {
        ...prev,
        foodHistory: updatedFoodHistory,
        nutrition: updatedNutrition,
      };
      persistState(updated);
      return updated;
    });
  }, [persistState]);

  const subtractCaloriesFromRun = useCallback((calories: number) => {
    setAppState(prev => {
      const updated = {
        ...prev,
        nutrition: {
          ...prev.nutrition,
          calories: Math.max(0, prev.nutrition.calories - calories),
        },
      };
      persistState(updated);
      return updated;
    });
  }, [persistState]);

  const deleteRun = useCallback((runId: string) => {
    setAppState(prev => {
      const runToDelete = prev.runs.find(r => r.id === runId);
      if (!runToDelete) return prev;

      const updatedRuns = prev.runs.filter(r => r.id !== runId);
      const updated = {
        ...prev,
        runs: updatedRuns,
      };
      persistState(updated);
      return updated;
    });
  }, [persistState]);

  const updateRun = useCallback((runId: string, updates: Partial<Run>) => {
    setAppState(prev => {
      const updatedRuns = prev.runs.map(run => 
        run.id === runId ? { ...run, ...updates } : run
      );
      const updated = {
        ...prev,
        runs: updatedRuns,
      };
      persistState(updated);
      return updated;
    });
  }, [persistState]);

  const getWeeklyRuns = useCallback(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return appState.runs.filter(run => new Date(run.date) >= oneWeekAgo);
  }, [appState.runs]);
  
  const getWeeklyStats = useCallback(() => {
    const weeklyRuns = getWeeklyRuns();
    return {
      weeklyMiles: weeklyRuns.reduce((sum, run) => sum + run.distance, 0),
      weeklyRuns: weeklyRuns.length,
      weeklyTime: weeklyRuns.reduce((sum, run) => sum + run.time, 0),
    };
  }, [getWeeklyRuns]);

  const getTodaysFoodEntries = useCallback(() => {
    const today = new Date().toDateString();
    return appState.foodHistory.filter(entry => 
      new Date(entry.date).toDateString() === today
    );
  }, [appState.foodHistory]);

  const getTodaysRuns = useCallback(() => {
    const today = new Date().toDateString();
    return appState.runs.filter(run => new Date(run.date).toDateString() === today);
  }, [appState.runs]);

  const getTodaysWorkouts = useCallback(() => {
    const today = new Date().toDateString();
    return appState.workoutLogs.filter(log => new Date(log.date).toDateString() === today);
  }, [appState.workoutLogs]);
  
  const getWeeklyWorkouts = useCallback(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return appState.workoutLogs.filter(log => new Date(log.date) >= oneWeekAgo);
  }, [appState.workoutLogs]);
  
  const getGymStats = useCallback(() => {
    const weeklyWorkouts = getWeeklyWorkouts();
    const totalVolume = appState.workoutLogs.reduce((sum, log) => sum + calculateWorkoutVolume(log), 0);
    const weeklyVolume = weeklyWorkouts.reduce((sum, log) => sum + calculateWorkoutVolume(log), 0);
    
    return {
      totalWorkouts: appState.workoutLogs.length,
      weeklyWorkouts: weeklyWorkouts.length,
      totalVolume,
      weeklyVolume,
    };
  }, [appState.workoutLogs, getWeeklyWorkouts]);
  
  const addWorkoutLog = useCallback((log: WorkoutLog) => {
    setAppState(prev => {
      const today = new Date().toDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toDateString();
      
      let newWorkoutStreak = prev.stats.workoutStreak;
      if (!prev.lastWorkoutDate || prev.lastWorkoutDate === today) {
        if (prev.lastWorkoutDate !== today) {
          if (prev.lastWorkoutDate === yesterdayString) {
            newWorkoutStreak = prev.stats.workoutStreak + 1;
          } else {
            newWorkoutStreak = 1;
          }
        }
      }
      
      let state: AppState = {
        ...prev,
        workoutLogs: [log, ...prev.workoutLogs],
        stats: {
          ...prev.stats,
          workoutStreak: newWorkoutStreak,
        },
        lastWorkoutDate: today,
      };

      state = awardXP(state, XP_REWARDS.WORKOUT_COMPLETE, 'workout', 'Completed workout');

      if (newWorkoutStreak >= XP_REWARDS.STREAK_MIN_DAYS) {
        const streakBonus = newWorkoutStreak * XP_REWARDS.STREAK_WORKOUT_BONUS;
        state = awardXP(state, streakBonus, 'streak', `${newWorkoutStreak}-day workout streak bonus`);
        if (newWorkoutStreak % 7 === 0 || newWorkoutStreak === 3 || newWorkoutStreak === 14 || newWorkoutStreak === 30) {
          sendStreakMilestoneNotification('Workout', newWorkoutStreak).catch(e => console.error('Streak milestone error:', e));
        }
      }

      persistState(state);
      return state;
    });
  }, [persistState, awardXP, sendStreakMilestoneNotification]);
  
  const updateCustomWorkoutPlan = useCallback((plan: CustomWorkoutPlan | null) => {
    setAppState(prev => {
      const updated = { ...prev, customWorkoutPlan: plan };
      persistState(updated);
      return updated;
    });
  }, [persistState]);
  
  const saveCustomWorkout = useCallback((workout: Omit<SavedWorkout, 'id' | 'createdAt'>) => {
    setAppState(prev => {
      const newWorkout: SavedWorkout = {
        ...workout,
        id: `saved-workout-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const updated = { ...prev, savedWorkouts: [newWorkout, ...prev.savedWorkouts] };
      persistState(updated);
      return updated;
    });
  }, [persistState]);
  
  const deleteSavedWorkout = useCallback((workoutId: string) => {
    setAppState(prev => {
      const updated = { 
        ...prev, 
        savedWorkouts: prev.savedWorkouts.filter(w => w.id !== workoutId) 
      };
      persistState(updated);
      return updated;
    });
  }, [persistState]);
  
  const updatePersonalStats = useCallback((stats: PersonalStats) => {
    setAppState(prev => {
      const updated = { ...prev, personalStats: { ...prev.personalStats, ...stats } };
      persistState(updated);
      return updated;
    });
  }, [persistState]);
  
  const markWelcomeAsSeen = useCallback(() => {
    setAppState(prev => {
      const updated = { ...prev, hasSeenWelcome: true };
      persistState(updated);
      return updated;
    });
  }, [persistState]);

  const setStartingXP = useCallback((totalXP: number, level: number) => {
    setAppState(prev => {
      const updated = {
        ...prev,
        xp: {
          ...prev.xp,
          totalXP,
          level,
        },
      };
      persistState(updated);
      return updated;
    });
  }, [persistState]);

  const dismissLevelUp = useCallback(() => {
    setPendingLevelUp(null);
  }, []);

  const exportAllData = useCallback((): string => {
    const exportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      core: extractCoreState(appState),
      runs: appState.runs,
      foodHistory: appState.foodHistory,
      workoutLogs: appState.workoutLogs,
    };
    console.log('Exporting data, payload size:', JSON.stringify(exportPayload).length);
    return JSON.stringify(exportPayload);
  }, [appState]);

  const importAllData = useCallback((jsonString: string): { success: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'Invalid backup file format.' };
      }
      if (!parsed.version || !parsed.exportedAt) {
        return { success: false, error: 'This does not look like a valid backup.' };
      }

      const core = parsed.core && typeof parsed.core === 'object' ? parsed.core : {};
      const runs = Array.isArray(parsed.runs) ? parsed.runs : [];
      const food = Array.isArray(parsed.foodHistory) ? parsed.foodHistory : [];
      const workouts = Array.isArray(parsed.workoutLogs) ? parsed.workoutLogs : [];

      const restoredState = validateState({
        ...core,
        runs,
        foodHistory: food,
        workoutLogs: workouts,
      });

      console.log(`Import: runs=${runs.length}, food=${food.length}, workouts=${workouts.length}`);
      setAppState(restoredState);
      prevStateRef.current = restoredState;
      saveMutation.mutate({
        state: restoredState,
        changed: { core: true, runs: true, food: true, workouts: true },
      });
      return { success: true };
    } catch (e) {
      console.error('Import error:', e);
      return { success: false, error: 'Failed to parse backup data. Make sure you copied the full text.' };
    }
  }, [saveMutation]);

  const addWeightEntry = useCallback((entry: WeightEntry) => {
    console.log('Adding weight entry:', entry);
    setAppState(prev => {
      const updated = {
        ...prev,
        weightHistory: [entry, ...prev.weightHistory],
        personalStats: {
          ...prev.personalStats,
          weight: entry.weight,
        },
      };
      persistState(updated);
      return updated;
    });
  }, [persistState]);

  const deleteWeightEntry = useCallback((date: string) => {
    console.log('Deleting weight entry for date:', date);
    setAppState(prev => {
      const updatedHistory = prev.weightHistory.filter(e => e.date !== date);
      const latestEntry = updatedHistory.length > 0
        ? [...updatedHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        : null;
      const updated = {
        ...prev,
        weightHistory: updatedHistory,
        personalStats: {
          ...prev.personalStats,
          weight: latestEntry?.weight ?? prev.personalStats.weight,
        },
      };
      persistState(updated);
      return updated;
    });
  }, [persistState]);

  const updateWeightEntry = useCallback((date: string, newWeight: number) => {
    console.log('Updating weight entry:', date, newWeight);
    setAppState(prev => {
      const updatedHistory = prev.weightHistory.map(e =>
        e.date === date ? { ...e, weight: newWeight } : e
      );
      const latestEntry = [...updatedHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      const updated = {
        ...prev,
        weightHistory: updatedHistory,
        personalStats: {
          ...prev.personalStats,
          weight: latestEntry?.weight ?? prev.personalStats.weight,
        },
      };
      persistState(updated);
      return updated;
    });
  }, [persistState]);
  
  const getWeightHistory = useCallback((period: '7d' | '30d' | '90d' | '1y') => {
    let daysBack = 7;
    
    switch (period) {
      case '30d':
        daysBack = 30;
        break;
      case '90d':
        daysBack = 90;
        break;
      case '1y':
        daysBack = 365;
        break;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    return appState.weightHistory.filter(entry => 
      new Date(entry.date) >= cutoffDate
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appState.weightHistory]);
  

  const mergedStats = useMemo(() => {
    const weeklyStats = getWeeklyStats();
    const gymStats = getGymStats();
    return {
      ...appState.stats,
      ...weeklyStats,
      ...gymStats,
    };
  }, [appState.stats, getWeeklyStats, getGymStats]);

  const xpInfo = useMemo(() => {
    const level = getLevelFromTotalXP(appState.xp.totalXP);
    const progress = getXPProgress(appState.xp.totalXP);
    const rank = getRankForLevel(level);
    return {
      totalXP: appState.xp.totalXP,
      level,
      rank,
      currentXP: progress.current,
      neededXP: progress.needed,
      progress: progress.progress,
      xpEvents: appState.xp.xpEvents,
    };
  }, [appState.xp]);

  return useMemo(() => ({
    user: appState.user,
    stats: mergedStats,
    nutrition: appState.nutrition,
    recentRuns: appState.runs,
    foodHistory: appState.foodHistory,
    workoutLogs: appState.workoutLogs,
    customWorkoutPlan: appState.customWorkoutPlan,
    savedWorkouts: appState.savedWorkouts,
    personalStats: appState.personalStats,
    weightHistory: appState.weightHistory,
    hasSeenWelcome: appState.hasSeenWelcome,
    todaysFoodEntries: getTodaysFoodEntries(),
    todaysRuns: getTodaysRuns(),
    todaysWorkouts: getTodaysWorkouts(),
    weeklyRuns: getWeeklyRuns(),
    weeklyWorkouts: getWeeklyWorkouts(),
    xpInfo,
    pendingLevelUp,
    updateUser,
    updateStats,
    updateNutrition,
    addRun,
    deleteRun,
    updateRun,
    addFoodEntry,
    deleteFoodEntry,
    updateFoodEntry,
    addWorkoutLog,
    updateCustomWorkoutPlan,
    saveCustomWorkout,
    deleteSavedWorkout,
    updatePersonalStats,
    addWeightEntry,
    deleteWeightEntry,
    updateWeightEntry,
    getWeightHistory,
    subtractCaloriesFromRun,
    markWelcomeAsSeen,
    setStartingXP,
    dismissLevelUp,
    exportAllData,
    importAllData,
    runStorage,
    isLoading: !isInitialized || isLoadingState,
  }), [mergedStats, appState.user, appState.nutrition, appState.runs, appState.foodHistory, appState.workoutLogs, appState.customWorkoutPlan, appState.savedWorkouts, appState.personalStats, appState.weightHistory, appState.hasSeenWelcome, updateUser, updateStats, updateNutrition, addRun, deleteRun, updateRun, addFoodEntry, deleteFoodEntry, updateFoodEntry, addWorkoutLog, updateCustomWorkoutPlan, saveCustomWorkout, deleteSavedWorkout, updatePersonalStats, addWeightEntry, deleteWeightEntry, updateWeightEntry, getWeightHistory, subtractCaloriesFromRun, markWelcomeAsSeen, setStartingXP, dismissLevelUp, exportAllData, importAllData, pendingLevelUp, xpInfo, isInitialized, isLoadingState, getTodaysFoodEntries, getTodaysRuns, getTodaysWorkouts, getWeeklyRuns, getWeeklyWorkouts]);
});
