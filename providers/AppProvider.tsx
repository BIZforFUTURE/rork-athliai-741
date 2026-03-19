import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";

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
  photos?: string[]; // Array of photo URIs
  notes?: string;
  weather?: string;
  route?: string;
  routeCoordinates?: RouteCoordinate[]; // GPS coordinates of the route
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
  height?: number; // in inches
  weight?: number; // in pounds
  targetWeight?: number; // in pounds
  goalEndDate?: string; // ISO date string
  age?: number;
  gender?: 'male' | 'female' | 'other';
}

interface WeightEntry {
  date: string;
  weight: number; // in pounds
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

interface AppState {
  user: User;
  stats: Stats;
  nutrition: Nutrition;
  runs: Run[];
  foodHistory: FoodEntry[];
  workoutLogs: WorkoutLog[];
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

// Generate a user ID (will be persisted with app state)
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

export const [AppProvider, useApp] = createContextHook(() => {
  const [appState, setAppState] = useState<AppState>(defaultState);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingLevelUp, setPendingLevelUp] = useState<{ level: number; previousLevel: number } | null>(null);
  const { sendWeeklyReport, sendLevelUpNotification, sendRankUpNotification, sendStreakMilestoneNotification } = useNotifications();
  



  // Check for daily reset and update streaks
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
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem("appState");
        console.log('Loading stored state, length:', stored?.length || 0);
        
        if (!stored || stored.trim() === '' || stored === 'undefined' || stored === 'null') {
          console.log('No valid stored state found, using default');
          return defaultState;
        }
        
        // Additional validation for JSON format
        const trimmed = stored.trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          console.warn('Stored data does not appear to be valid JSON format, clearing and using default');
          await AsyncStorage.removeItem("appState");
          return defaultState;
        }
        
        // Check for common corruption patterns
        if (trimmed.includes('undefined') || trimmed.includes('NaN') || trimmed.includes('[object Object]') || trimmed.includes('"o"')) {
          console.warn('Stored data contains invalid values, clearing and using default');
          await AsyncStorage.removeItem("appState");
          return defaultState;
        }
        
        // Check for incomplete JSON (common corruption pattern)
        const openBraces = (trimmed.match(/{/g) || []).length;
        const closeBraces = (trimmed.match(/}/g) || []).length;
        if (openBraces !== closeBraces) {
          console.warn('Stored data has mismatched braces, clearing and using default');
          await AsyncStorage.removeItem("appState");
          return defaultState;
        }
        
        let parsed;
        try {
          // Additional safety check - ensure the string is properly terminated
          if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) {
            console.warn('Stored data does not end properly, clearing and using default');
            await AsyncStorage.removeItem("appState");
            return defaultState;
          }
          
          parsed = JSON.parse(trimmed);
          console.log('Successfully parsed stored state');
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.log('Error message:', parseError instanceof Error ? parseError.message : 'Unknown error');
          console.log('Problematic stored data (first 200 chars):', trimmed.substring(0, 200));
          console.log('Data type:', typeof stored);
          console.log('Data ends with:', trimmed.slice(-50));
          console.log('Data length:', trimmed.length);
          
          // Clear corrupted data and start fresh
          await AsyncStorage.removeItem("appState");
          return defaultState;
        }
        
        // Validate that parsed data is an object
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          console.warn('Parsed data is not a valid app state object, using default');
          await AsyncStorage.removeItem("appState");
          return defaultState;
        }
        
        // Ensure all required fields exist, including user ID
        const validatedState = {
          ...defaultState,
          ...parsed,
          user: { 
            ...defaultState.user, 
            ...(parsed.user || {}),
            // Ensure user has an ID (for existing users without one)
            id: parsed.user?.id || generateUserId()
          },
          stats: { ...defaultState.stats, ...(parsed.stats || {}) },
          nutrition: { ...defaultState.nutrition, ...(parsed.nutrition || {}) },
          runs: Array.isArray(parsed.runs) ? parsed.runs : [],
          foodHistory: Array.isArray(parsed.foodHistory) ? parsed.foodHistory : [],
          workoutLogs: Array.isArray(parsed.workoutLogs) ? parsed.workoutLogs : [],
          customWorkoutPlan: parsed.customWorkoutPlan || null,
          savedWorkouts: Array.isArray(parsed.savedWorkouts) ? parsed.savedWorkouts : [],
          personalStats: parsed.personalStats || {},
          weightHistory: Array.isArray(parsed.weightHistory) ? parsed.weightHistory : [],
          xp: parsed.xp ? {
            ...defaultXPState,
            ...parsed.xp,
            xpEvents: Array.isArray(parsed.xp.xpEvents) ? parsed.xp.xpEvents : [],
          } : defaultXPState,
        };
        
        console.log('State loaded successfully');
        return validatedState;
      } catch (error) {
        console.error("Error loading app state:", error);
        // Clear any corrupted data
        try {
          await AsyncStorage.removeItem("appState");
          console.log('Cleared corrupted app state');
        } catch (clearError) {
          console.error("Error clearing corrupted app state:", clearError);
        }
        return defaultState;
      }
    },
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (state: AppState) => {
      if (!state) {
        console.error('Attempted to save null/undefined state');
        return state;
      }
      
      try {
        // Clean the state before serialization
        const cleanState = {
          ...state,
          // Ensure all arrays are valid
          runs: Array.isArray(state.runs) ? state.runs : [],
          foodHistory: Array.isArray(state.foodHistory) ? state.foodHistory : [],
          workoutLogs: Array.isArray(state.workoutLogs) ? state.workoutLogs : [],
          savedWorkouts: Array.isArray(state.savedWorkouts) ? state.savedWorkouts : [],
          weightHistory: Array.isArray(state.weightHistory) ? state.weightHistory : [],
          // Ensure objects are valid
          user: state.user || defaultState.user,
          stats: state.stats || defaultState.stats,
          nutrition: state.nutrition || defaultState.nutrition,
          personalStats: state.personalStats || {},
        };
        
        const serialized = JSON.stringify(cleanState);
        
        // Validate that serialization worked
        if (!serialized || serialized === 'undefined' || serialized === 'null' || serialized.length < 10) {
          console.error('Failed to serialize app state properly');
          return state;
        }
        
        // Test that we can parse it back
        try {
          JSON.parse(serialized);
        } catch (testError) {
          console.error('Serialized state is not valid JSON:', testError);
          return state;
        }
        
        await AsyncStorage.setItem("appState", serialized);
        console.log('App state saved successfully, size:', serialized.length);
        return state;
      } catch (error) {
        console.error('Error saving app state:', error);
        return state;
      }
    },
  });

  const { mutate } = saveMutation;

  useEffect(() => {
    if (storedState && !isLoadingState) {
      const resetState = checkDailyReset(storedState);
      setAppState(resetState);
      setIsInitialized(true);
      if (resetState !== storedState) {
        mutate(resetState);
      }
    } else if (!isLoadingState && !storedState) {
      setAppState(defaultState);
      setIsInitialized(true);
    }
  }, [storedState, isLoadingState, checkDailyReset, mutate]);

  // Check for daily reset periodically (every minute)
  useEffect(() => {
    const interval = setInterval(() => {
      setAppState(prev => {
        const resetState = checkDailyReset(prev);
        if (resetState !== prev) {
          console.log('Periodic daily reset check - resetting nutrition');
          mutate(resetState);
        }
        return resetState;
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkDailyReset, mutate]);

  const updateUser = useCallback((user: Partial<User>) => {
    setAppState(prev => {
      const updated = { ...prev, user: { ...prev.user, ...user } };
      mutate(updated);
      return updated;
    });
  }, [mutate]);

  const updateStats = useCallback((stats: Partial<Stats>) => {
    setAppState(prev => {
      const updated = { ...prev, stats: { ...prev.stats, ...stats } };
      mutate(updated);
      return updated;
    });
  }, [mutate]);

  const updateNutrition = useCallback((nutrition: Partial<Nutrition>) => {
    setAppState(prev => {
      // First check if we need a daily reset
      const resetState = checkDailyReset(prev);
      const updated = {
        ...resetState,
        nutrition: { ...resetState.nutrition, ...nutrition },
      };
      mutate(updated);
      return updated;
    });
  }, [mutate, checkDailyReset]);

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

      const runXP = XP_REWARDS.RUN_BASE + Math.round(run.distance * XP_REWARDS.RUN_PER_MILE);
      state = awardXP(state, runXP, 'run', `Completed a ${run.distance.toFixed(1)} mi run`);

      if (newRunStreak >= XP_REWARDS.STREAK_MIN_DAYS) {
        const streakBonus = newRunStreak * XP_REWARDS.STREAK_RUN_BONUS;
        state = awardXP(state, streakBonus, 'streak', `${newRunStreak}-day run streak bonus`);
        if (newRunStreak % 7 === 0 || newRunStreak === 3 || newRunStreak === 14 || newRunStreak === 30) {
          sendStreakMilestoneNotification('Run', newRunStreak).catch(e => console.error('Streak milestone error:', e));
        }
      }

      mutate(state);
      return state;
    });
  }, [mutate, awardXP, sendStreakMilestoneNotification]);

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
      
      let state: AppState = {
        ...resetState,
        foodHistory: [entry, ...resetState.foodHistory],
        stats: {
          ...resetState.stats,
          foodStreak: newFoodStreak,
        },
        lastFoodDate: today,
      };

      state = awardXP(state, XP_REWARDS.FOOD_LOG, 'food', `Logged ${entry.name}`);

      const newCalories = state.nutrition.calories + entry.calories;
      const newProtein = state.nutrition.protein + entry.protein;
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

      mutate(state);
      return state;
    });
  }, [mutate, checkDailyReset, awardXP, sendStreakMilestoneNotification]);

  const deleteFoodEntry = useCallback((entryId: string) => {
    setAppState(prev => {
      const entryToDelete = prev.foodHistory.find(entry => entry.id === entryId);
      if (!entryToDelete) return prev;
      
      const entryDate = new Date(entryToDelete.date).toDateString();
      const today = new Date().toDateString();
      
      // Remove the entry from history
      const updatedFoodHistory = prev.foodHistory.filter(entry => entry.id !== entryId);
      
      let updatedNutrition = prev.nutrition;
      
      // If deleting today's entry, subtract from today's nutrition totals
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
      mutate(updated);
      return updated;
    });
  }, [mutate]);

  const updateFoodEntry = useCallback((entryId: string, updates: Partial<FoodEntry>) => {
    setAppState(prev => {
      const entryToUpdate = prev.foodHistory.find(entry => entry.id === entryId);
      if (!entryToUpdate) return prev;
      
      const entryDate = new Date(entryToUpdate.date).toDateString();
      const today = new Date().toDateString();
      
      // Update the entry in history
      const updatedFoodHistory = prev.foodHistory.map(entry => 
        entry.id === entryId ? { ...entry, ...updates } : entry
      );
      
      let updatedNutrition = prev.nutrition;
      
      // If updating today's entry, adjust today's nutrition totals
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
      mutate(updated);
      return updated;
    });
  }, [mutate]);

  const subtractCaloriesFromRun = useCallback((calories: number) => {
    setAppState(prev => {
      const updated = {
        ...prev,
        nutrition: {
          ...prev.nutrition,
          calories: Math.max(0, prev.nutrition.calories - calories),
        },
      };
      mutate(updated);
      return updated;
    });
  }, [mutate]);

  const updateRun = useCallback((runId: string, updates: Partial<Run>) => {
    setAppState(prev => {
      const updatedRuns = prev.runs.map(run => 
        run.id === runId ? { ...run, ...updates } : run
      );
      const updated = {
        ...prev,
        runs: updatedRuns,
      };
      mutate(updated);
      return updated;
    });
  }, [mutate]);

  // Get runs from this week
  const getWeeklyRuns = useCallback(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return appState.runs.filter(run => new Date(run.date) >= oneWeekAgo);
  }, [appState.runs]);
  
  // Calculate weekly stats from actual runs
  const getWeeklyStats = useCallback(() => {
    const weeklyRuns = getWeeklyRuns();
    return {
      weeklyMiles: weeklyRuns.reduce((sum, run) => sum + run.distance, 0),
      weeklyRuns: weeklyRuns.length,
      weeklyTime: weeklyRuns.reduce((sum, run) => sum + run.time, 0),
    };
  }, [getWeeklyRuns]);

  // Get food entries from today
  const getTodaysFoodEntries = useCallback(() => {
    const today = new Date().toDateString();
    return appState.foodHistory.filter(entry => 
      new Date(entry.date).toDateString() === today
    );
  }, [appState.foodHistory]);
  
  // Get workouts from this week
  const getWeeklyWorkouts = useCallback(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return appState.workoutLogs.filter(log => new Date(log.date) >= oneWeekAgo);
  }, [appState.workoutLogs]);
  
  // Calculate gym stats from actual workout logs
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

      mutate(state);
      return state;
    });
  }, [mutate, awardXP, sendStreakMilestoneNotification]);
  
  // Update custom workout plan
  const updateCustomWorkoutPlan = useCallback((plan: CustomWorkoutPlan | null) => {
    setAppState(prev => {
      const updated = { ...prev, customWorkoutPlan: plan };
      mutate(updated);
      return updated;
    });
  }, [mutate]);
  
  // Save a custom workout
  const saveCustomWorkout = useCallback((workout: Omit<SavedWorkout, 'id' | 'createdAt'>) => {
    setAppState(prev => {
      const newWorkout: SavedWorkout = {
        ...workout,
        id: `saved-workout-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const updated = { ...prev, savedWorkouts: [newWorkout, ...prev.savedWorkouts] };
      mutate(updated);
      return updated;
    });
  }, [mutate]);
  
  // Delete a saved workout
  const deleteSavedWorkout = useCallback((workoutId: string) => {
    setAppState(prev => {
      const updated = { 
        ...prev, 
        savedWorkouts: prev.savedWorkouts.filter(w => w.id !== workoutId) 
      };
      mutate(updated);
      return updated;
    });
  }, [mutate]);
  
  // Update personal stats
  const updatePersonalStats = useCallback((stats: PersonalStats) => {
    setAppState(prev => {
      const updated = { ...prev, personalStats: { ...prev.personalStats, ...stats } };
      mutate(updated);
      return updated;
    });
  }, [mutate]);
  
  const markWelcomeAsSeen = useCallback(() => {
    setAppState(prev => {
      const updated = { ...prev, hasSeenWelcome: true };
      mutate(updated);
      return updated;
    });
  }, [mutate]);

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
      mutate(updated);
      return updated;
    });
  }, [mutate]);

  const dismissLevelUp = useCallback(() => {
    setPendingLevelUp(null);
  }, []);
  
  // Add weight entry
  const addWeightEntry = useCallback((entry: WeightEntry) => {
    console.log('Adding weight entry:', entry);
    setAppState(prev => {
      console.log('Previous personal stats:', prev.personalStats);
      const updated = {
        ...prev,
        weightHistory: [entry, ...prev.weightHistory],
        personalStats: {
          ...prev.personalStats,
          weight: entry.weight, // Update current weight
        },
      };
      console.log('Updated personal stats:', updated.personalStats);
      mutate(updated);
      return updated;
    });
  }, [mutate]);
  
  // Get weight history for a specific period
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
  


  // Merge calculated weekly stats with stored stats
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
    weeklyRuns: getWeeklyRuns(),
    weeklyWorkouts: getWeeklyWorkouts(),
    xpInfo,
    pendingLevelUp,
    updateUser,
    updateStats,
    updateNutrition,
    addRun,
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
    getWeightHistory,
    subtractCaloriesFromRun,
    markWelcomeAsSeen,
    setStartingXP,
    dismissLevelUp,
    runStorage,
    isLoading: !isInitialized || isLoadingState,
  }), [mergedStats, appState, updateUser, updateStats, updateNutrition, addRun, updateRun, addFoodEntry, deleteFoodEntry, updateFoodEntry, addWorkoutLog, updateCustomWorkoutPlan, saveCustomWorkout, deleteSavedWorkout, updatePersonalStats, addWeightEntry, getWeightHistory, subtractCaloriesFromRun, markWelcomeAsSeen, setStartingXP, dismissLevelUp, pendingLevelUp, xpInfo, isInitialized, isLoadingState, getTodaysFoodEntries, getWeeklyRuns, getWeeklyWorkouts]);
});