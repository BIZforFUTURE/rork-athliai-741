export type WorkoutGoal = 'strength' | 'endurance' | 'hypertrophy';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restTime: number; // in seconds
  imageUrl: string;
  equipment: string;
  description: string;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  goal: WorkoutGoal;
  duration: number; // estimated duration in minutes
  exercises: Exercise[];
}

export interface WorkoutLog {
  id: string;
  workoutPlanId: string;
  date: string;
  exercises: {
    exerciseId: string;
    sets: {
      reps: number;
      weight: number;
    }[];
  }[];
  duration: number; // actual duration in seconds
  completed: boolean;
}

export interface GymStats {
  workoutStreak: number;
  totalWorkouts: number;
  weeklyWorkouts: number;
  totalVolume: number; // total weight lifted
  weeklyVolume: number;
}

// Workout Plans Database
export const workoutPlans: WorkoutPlan[] = [
  {
    id: 'strength-upper-1',
    name: 'Upper Body Strength',
    goal: 'strength',
    duration: 75,
    exercises: [
      {
        id: 'bench-press',
        name: 'Bench Press',
        sets: 4,
        reps: '6-8',
        restTime: 180,
        imageUrl: 'https://r2-pub.rork.com/generated-images/46d8bf6b-65f4-48d0-8a8f-406d46f99fab.png',
        equipment: 'Barbell',
        description: 'Lie on bench, grip bar slightly wider than shoulders, lower to chest, press up'
      },
      {
        id: 'bent-over-row',
        name: 'Bent Over Row',
        sets: 4,
        reps: '6-8',
        restTime: 180,
        imageUrl: 'https://r2-pub.rork.com/generated-images/fdf0f442-e990-4001-9b7b-0599620e5b6e.png',
        equipment: 'Barbell',
        description: 'Hinge at hips, pull bar to lower chest, squeeze shoulder blades'
      },
      {
        id: 'overhead-press',
        name: 'Overhead Press',
        sets: 3,
        reps: '8-10',
        restTime: 150,
        imageUrl: 'https://r2-pub.rork.com/generated-images/ebda0087-ffde-4da3-b031-224d865685cf.png',
        equipment: 'Barbell',
        description: 'Press bar overhead from shoulder height, keep core tight'
      },
      {
        id: 'pull-ups',
        name: 'Pull-ups',
        sets: 3,
        reps: '8-12',
        restTime: 120,
        imageUrl: 'https://r2-pub.rork.com/generated-images/cc2726d5-6eae-476b-8c35-3bbf63c6259b.png',
        equipment: 'Pull-up Bar',
        description: 'Hang from bar, pull body up until chin over bar'
      },
      {
        id: 'dips',
        name: 'Dips',
        sets: 3,
        reps: '10-15',
        restTime: 120,
        imageUrl: 'https://r2-pub.rork.com/generated-images/d110a007-01ee-4103-ba38-525011ae1b2f.png',
        equipment: 'Dip Station',
        description: 'Lower body between parallel bars, push back up'
      }
    ]
  },
  {
    id: 'strength-lower-1',
    name: 'Lower Body Strength',
    goal: 'strength',
    duration: 75,
    exercises: [
      {
        id: 'squat',
        name: 'Back Squat',
        sets: 4,
        reps: '6-8',
        restTime: 180,
        imageUrl: 'https://r2-pub.rork.com/generated-images/faf8ba62-ac24-4ed6-bad3-91764a1b1f82.png',
        equipment: 'Barbell',
        description: 'Bar on upper back, squat down until thighs parallel, drive up'
      },
      {
        id: 'deadlift',
        name: 'Deadlift',
        sets: 4,
        reps: '5-6',
        restTime: 180,
        imageUrl: 'https://r2-pub.rork.com/generated-images/14806c15-0db9-4c75-8ca7-3df193b518e1.png',
        equipment: 'Barbell',
        description: 'Lift bar from floor by extending hips and knees simultaneously'
      },
      {
        id: 'bulgarian-split-squat',
        name: 'Bulgarian Split Squat',
        sets: 3,
        reps: '10-12 each leg',
        restTime: 120,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Dumbbells',
        description: 'Rear foot elevated, lunge down on front leg'
      },
      {
        id: 'hip-thrust',
        name: 'Hip Thrust',
        sets: 3,
        reps: '12-15',
        restTime: 90,
        imageUrl: 'https://images.unsplash.com/photo-1583500178690-f7fd39d8ba93?w=800&h=600&fit=crop',
        equipment: 'Barbell',
        description: 'Upper back on bench, drive hips up squeezing glutes'
      },
      {
        id: 'calf-raises',
        name: 'Calf Raises',
        sets: 4,
        reps: '15-20',
        restTime: 60,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Machine',
        description: 'Rise up on toes, squeeze calves at top'
      }
    ]
  },
  {
    id: 'hypertrophy-push-1',
    name: 'Push Day (Hypertrophy)',
    goal: 'hypertrophy',
    duration: 60,
    exercises: [
      {
        id: 'incline-dumbbell-press',
        name: 'Incline Dumbbell Press',
        sets: 4,
        reps: '8-12',
        restTime: 90,
        imageUrl: 'https://r2-pub.rork.com/generated-images/5beb73f8-d7eb-4530-9db5-323f1ec6e228.png',
        equipment: 'Dumbbells',
        description: 'Press dumbbells on incline bench, full range of motion'
      },
      {
        id: 'shoulder-press',
        name: 'Dumbbell Shoulder Press',
        sets: 3,
        reps: '10-15',
        restTime: 75,
        imageUrl: 'https://r2-pub.rork.com/generated-images/ce577650-e0d6-455e-8595-9b8c3391da0a.png',
        equipment: 'Dumbbells',
        description: 'Press dumbbells overhead from shoulder height'
      },
      {
        id: 'lateral-raises',
        name: 'Lateral Raises',
        sets: 3,
        reps: '12-15',
        restTime: 60,
        imageUrl: 'https://r2-pub.rork.com/generated-images/0b8a86f5-1600-41cc-8601-74c830630157.png',
        equipment: 'Dumbbells',
        description: 'Raise arms to sides until parallel with floor'
      },
      {
        id: 'tricep-dips',
        name: 'Tricep Dips',
        sets: 3,
        reps: '12-15',
        restTime: 60,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Bench',
        description: 'Lower body using triceps, push back up'
      },
      {
        id: 'push-ups',
        name: 'Push-ups',
        sets: 3,
        reps: '15-20',
        restTime: 45,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Bodyweight',
        description: 'Lower chest to floor, push back up'
      }
    ]
  },
  {
    id: 'endurance-circuit-1',
    name: 'Endurance Circuit',
    goal: 'endurance',
    duration: 45,
    exercises: [
      {
        id: 'burpees',
        name: 'Burpees',
        sets: 4,
        reps: '15-20',
        restTime: 30,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Bodyweight',
        description: 'Squat down, jump back to plank, jump forward, jump up'
      },
      {
        id: 'mountain-climbers',
        name: 'Mountain Climbers',
        sets: 4,
        reps: '30 seconds',
        restTime: 30,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Bodyweight',
        description: 'Plank position, alternate bringing knees to chest rapidly'
      },
      {
        id: 'jump-squats',
        name: 'Jump Squats',
        sets: 4,
        reps: '20-25',
        restTime: 30,
        imageUrl: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=800&h=600&fit=crop',
        equipment: 'Bodyweight',
        description: 'Squat down, explode up into jump'
      },
      {
        id: 'high-knees',
        name: 'High Knees',
        sets: 4,
        reps: '30 seconds',
        restTime: 30,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Bodyweight',
        description: 'Run in place bringing knees up high'
      },
      {
        id: 'plank',
        name: 'Plank Hold',
        sets: 3,
        reps: '45-60 seconds',
        restTime: 45,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Bodyweight',
        description: 'Hold plank position, keep body straight'
      }
    ]
  },
  // Additional Strength Workouts
  {
    id: 'strength-push-1',
    name: 'Push Day (Strength)',
    goal: 'strength',
    duration: 70,
    exercises: [
      {
        id: 'barbell-squat',
        name: 'Barbell Back Squat',
        sets: 5,
        reps: '5-6',
        restTime: 180,
        imageUrl: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=800&h=600&fit=crop',
        equipment: 'Barbell',
        description: 'Bar on upper back, squat down until thighs parallel, drive up through heels'
      },
      {
        id: 'incline-barbell-press',
        name: 'Incline Barbell Press',
        sets: 4,
        reps: '6-8',
        restTime: 150,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Barbell',
        description: 'Press barbell on incline bench, focus on upper chest'
      },
      {
        id: 'weighted-dips',
        name: 'Weighted Dips',
        sets: 3,
        reps: '8-10',
        restTime: 120,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Dip Belt',
        description: 'Add weight, lower body between bars, press up powerfully'
      },
      {
        id: 'close-grip-bench',
        name: 'Close Grip Bench Press',
        sets: 3,
        reps: '8-10',
        restTime: 120,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Barbell',
        description: 'Narrow grip, focus on triceps, keep elbows close to body'
      }
    ]
  },
  // Additional Hypertrophy Workouts
  {
    id: 'hypertrophy-pull-1',
    name: 'Pull Day (Hypertrophy)',
    goal: 'hypertrophy',
    duration: 65,
    exercises: [
      {
        id: 'lat-pulldown',
        name: 'Lat Pulldown',
        sets: 4,
        reps: '10-12',
        restTime: 90,
        imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=600&fit=crop',
        equipment: 'Cable Machine',
        description: 'Pull bar to upper chest, squeeze lats, control the negative'
      },
      {
        id: 'cable-row',
        name: 'Seated Cable Row',
        sets: 4,
        reps: '10-12',
        restTime: 90,
        imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=600&fit=crop',
        equipment: 'Cable Machine',
        description: 'Pull handle to lower chest, squeeze shoulder blades together'
      },
      {
        id: 'face-pulls',
        name: 'Face Pulls',
        sets: 3,
        reps: '15-20',
        restTime: 60,
        imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=600&fit=crop',
        equipment: 'Cable Machine',
        description: 'Pull rope to face level, focus on rear delts and rhomboids'
      },
      {
        id: 'hammer-curls',
        name: 'Hammer Curls',
        sets: 3,
        reps: '12-15',
        restTime: 60,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Dumbbells',
        description: 'Neutral grip, curl dumbbells up, focus on biceps and forearms'
      },
      {
        id: 'barbell-curls',
        name: 'Barbell Curls',
        sets: 3,
        reps: '10-12',
        restTime: 75,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Barbell',
        description: 'Curl barbell up, squeeze biceps at top, control the descent'
      }
    ]
  },
  {
    id: 'hypertrophy-legs-1',
    name: 'Leg Day (Hypertrophy)',
    goal: 'hypertrophy',
    duration: 70,
    exercises: [
      {
        id: 'leg-press',
        name: 'Leg Press',
        sets: 4,
        reps: '12-15',
        restTime: 90,
        imageUrl: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=800&h=600&fit=crop',
        equipment: 'Leg Press Machine',
        description: 'Press weight with legs, full range of motion, control the negative'
      },
      {
        id: 'walking-lunges',
        name: 'Walking Lunges',
        sets: 3,
        reps: '12 each leg',
        restTime: 75,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Dumbbells',
        description: 'Step forward into lunge, alternate legs, keep torso upright'
      },
      {
        id: 'leg-curls',
        name: 'Leg Curls',
        sets: 3,
        reps: '12-15',
        restTime: 60,
        imageUrl: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=800&h=600&fit=crop',
        equipment: 'Leg Curl Machine',
        description: 'Curl heels to glutes, squeeze hamstrings, slow negative'
      },
      {
        id: 'leg-extensions',
        name: 'Leg Extensions',
        sets: 3,
        reps: '12-15',
        restTime: 60,
        imageUrl: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=800&h=600&fit=crop',
        equipment: 'Leg Extension Machine',
        description: 'Extend legs fully, squeeze quads at top, control the descent'
      },
      {
        id: 'standing-calf-raises',
        name: 'Standing Calf Raises',
        sets: 4,
        reps: '15-20',
        restTime: 45,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Calf Raise Machine',
        description: 'Rise up on toes, squeeze calves at top, full stretch at bottom'
      }
    ]
  },
  // Additional Endurance Workouts
  {
    id: 'endurance-hiit-1',
    name: 'HIIT Cardio Blast',
    goal: 'endurance',
    duration: 30,
    exercises: [
      {
        id: 'jumping-jacks',
        name: 'Jumping Jacks',
        sets: 5,
        reps: '45 seconds',
        restTime: 15,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Bodyweight',
        description: 'Jump feet apart while raising arms overhead, return to start'
      },
      {
        id: 'squat-jumps',
        name: 'Squat Jumps',
        sets: 5,
        reps: '30 seconds',
        restTime: 30,
        imageUrl: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=800&h=600&fit=crop',
        equipment: 'Bodyweight',
        description: 'Squat down, explode up into jump, land softly'
      },
      {
        id: 'push-up-burpees',
        name: 'Push-up Burpees',
        sets: 4,
        reps: '20 seconds',
        restTime: 40,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Bodyweight',
        description: 'Add push-up to burpee movement, maintain form throughout'
      },
      {
        id: 'bicycle-crunches',
        name: 'Bicycle Crunches',
        sets: 4,
        reps: '40 seconds',
        restTime: 20,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: 'Bodyweight',
        description: 'Alternate elbow to opposite knee, keep core engaged'
      }
    ]
  }
];

// Get workouts by goal
export const getWorkoutsByGoal = (goal: WorkoutGoal): WorkoutPlan[] => {
  return workoutPlans.filter(plan => plan.goal === goal);
};

// Get random workout by goal
export const getRandomWorkoutByGoal = (goal: WorkoutGoal): WorkoutPlan | undefined => {
  const workouts = getWorkoutsByGoal(goal);
  return workouts[Math.floor(Math.random() * workouts.length)];
};

// Get all unique exercises
export const getAllExercises = (): Exercise[] => {
  const exerciseMap = new Map<string, Exercise>();
  workoutPlans.forEach(plan => {
    plan.exercises.forEach(exercise => {
      exerciseMap.set(exercise.id, exercise);
    });
  });
  return Array.from(exerciseMap.values());
};

// Get exercise by ID
export const getExerciseById = (id: string): Exercise | undefined => {
  for (const plan of workoutPlans) {
    const exercise = plan.exercises.find(ex => ex.id === id);
    if (exercise) return exercise;
  }
  return undefined;
};

// Calculate estimated calories burned for a workout
export const calculateWorkoutCalories = (log: WorkoutLog, userWeight: number = 70): number => {
  // Basic estimation: 5 calories per minute of workout + volume-based bonus
  const baseCalories = (log.duration / 60) * 5;
  const volumeBonus = calculateWorkoutVolume(log) * 0.01; // 0.01 cal per lb lifted
  return Math.round(baseCalories + volumeBonus);
};

// Get workout difficulty based on volume and intensity
export const getWorkoutDifficulty = (plan: WorkoutPlan): 'Beginner' | 'Intermediate' | 'Advanced' => {
  const totalSets = plan.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const avgRestTime = plan.exercises.reduce((sum, ex) => sum + ex.restTime, 0) / plan.exercises.length;
  
  if (totalSets <= 12 && avgRestTime <= 90) return 'Beginner';
  if (totalSets <= 18 && avgRestTime <= 120) return 'Intermediate';
  return 'Advanced';
};

// Get muscle groups targeted by workout
export const getTargetedMuscleGroups = (plan: WorkoutPlan): string[] => {
  const muscleGroups = new Set<string>();
  
  plan.exercises.forEach(exercise => {
    // Simple mapping based on exercise names - in a real app this would be more sophisticated
    const name = exercise.name.toLowerCase();
    if (name.includes('bench') || name.includes('push') || name.includes('press') && !name.includes('leg')) {
      muscleGroups.add('Chest');
    }
    if (name.includes('row') || name.includes('pull') || name.includes('lat')) {
      muscleGroups.add('Back');
    }
    if (name.includes('squat') || name.includes('lunge') || name.includes('leg')) {
      muscleGroups.add('Legs');
    }
    if (name.includes('curl') || name.includes('bicep')) {
      muscleGroups.add('Biceps');
    }
    if (name.includes('dip') || name.includes('tricep') || name.includes('close grip')) {
      muscleGroups.add('Triceps');
    }
    if (name.includes('shoulder') || name.includes('overhead') || name.includes('lateral')) {
      muscleGroups.add('Shoulders');
    }
    if (name.includes('plank') || name.includes('crunch') || name.includes('core')) {
      muscleGroups.add('Core');
    }
  });
  
  return Array.from(muscleGroups);
};

// Get workout by ID
export const getWorkoutById = (id: string): WorkoutPlan | undefined => {
  return workoutPlans.find(plan => plan.id === id);
};

// Calculate total volume for a workout log
export const calculateWorkoutVolume = (log: WorkoutLog): number => {
  return log.exercises.reduce((total, exercise) => {
    const exerciseVolume = exercise.sets.reduce((setTotal, set) => {
      return setTotal + (set.reps * set.weight);
    }, 0);
    return total + exerciseVolume;
  }, 0);
};