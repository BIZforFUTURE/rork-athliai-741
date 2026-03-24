export type BodyPart = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'cardio';

export interface ExerciseTemplate {
  id: string;
  name: string;
  bodyPart: BodyPart;
  targetMuscle: string;
  equipment: string;
  description: string;
  imageUrl: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  videoUrl?: string;
}

export const exercisesByBodyPart: Record<BodyPart, ExerciseTemplate[]> = {
  chest: [
    {
      id: 'bench-press',
      name: 'Bench Press',
      bodyPart: 'chest',
      targetMuscle: 'Chest',
      equipment: 'Barbell',
      description: 'Lie on bench, grip bar slightly wider than shoulders, lower to chest, press up',
      imageUrl: 'https://r2-pub.rork.com/generated-images/46d8bf6b-65f4-48d0-8a8f-406d46f99fab.png',
      difficulty: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg'
    },
    {
      id: 'incline-dumbbell-press',
      name: 'Incline Bench Press',
      bodyPart: 'chest',
      targetMuscle: 'Upper Chest',
      equipment: 'Dumbbells',
      description: 'Press dumbbells on incline bench, full range of motion',
      imageUrl: 'https://r2-pub.rork.com/generated-images/5beb73f8-d7eb-4530-9db5-323f1ec6e228.png',
      difficulty: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=8iPEnn-ltC8'
    },
    {
      id: 'push-ups',
      name: 'Push Up',
      bodyPart: 'chest',
      targetMuscle: 'Chest',
      equipment: 'Bodyweight',
      description: 'Lower chest to floor, push back up',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=IODxDxX7oi4'
    },
    {
      id: 'dips',
      name: 'Chest Dip',
      bodyPart: 'chest',
      targetMuscle: 'Lower Chest',
      equipment: 'Dip Station',
      description: 'Lower body between parallel bars, push back up',
      imageUrl: 'https://r2-pub.rork.com/generated-images/d110a007-01ee-4103-ba38-525011ae1b2f.png',
      difficulty: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=2z8JmcrW-As'
    },
    {
      id: 'cable-flyes',
      name: 'Cable Crossover',
      bodyPart: 'chest',
      targetMuscle: 'Chest',
      equipment: 'Cable Machine',
      description: 'Bring cables together in front of chest, squeeze pecs',
      imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=600&fit=crop',
      difficulty: 'intermediate'
    },
    {
      id: 'dumbbell-fly',
      name: 'Dumbbell Fly',
      bodyPart: 'chest',
      targetMuscle: 'Chest',
      equipment: 'Dumbbells',
      description: 'Press on decline bench, targets lower chest',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'intermediate'
    }
  ],
  back: [
    {
      id: 'deadlift',
      name: 'Deadlift',
      bodyPart: 'back',
      targetMuscle: 'Lower Back',
      equipment: 'Barbell',
      description: 'Lift bar from floor by extending hips and knees simultaneously',
      imageUrl: 'https://r2-pub.rork.com/generated-images/14806c15-0db9-4c75-8ca7-3df193b518e1.png',
      difficulty: 'advanced',
      videoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q'
    },
    {
      id: 'bent-over-row',
      name: 'Barbell Row',
      bodyPart: 'back',
      targetMuscle: 'Back',
      equipment: 'Barbell',
      description: 'Hinge at hips, pull bar to lower chest, squeeze shoulder blades',
      imageUrl: 'https://r2-pub.rork.com/generated-images/fdf0f442-e990-4001-9b7b-0599620e5b6e.png',
      difficulty: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=FWJR5Ve8bnQ'
    },
    {
      id: 'pull-ups',
      name: 'Pull Up',
      bodyPart: 'back',
      targetMuscle: 'Lats',
      equipment: 'Pull-up Bar',
      description: 'Hang from bar, pull body up until chin over bar',
      imageUrl: 'https://r2-pub.rork.com/generated-images/cc2726d5-6eae-476b-8c35-3bbf63c6259b.png',
      difficulty: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g'
    },
    {
      id: 'lat-pulldown',
      name: 'Lat Pulldown',
      bodyPart: 'back',
      targetMuscle: 'Lats',
      equipment: 'Cable Machine',
      description: 'Pull bar to upper chest, squeeze lats, control the negative',
      imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc'
    },
    {
      id: 'cable-row',
      name: 'Seated Row',
      bodyPart: 'back',
      targetMuscle: 'Mid Back',
      equipment: 'Cable Machine',
      description: 'Pull handle to lower chest, squeeze shoulder blades together',
      imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=600&fit=crop',
      difficulty: 'beginner'
    },
    {
      id: 'face-pull',
      name: 'Face Pull',
      bodyPart: 'back',
      targetMuscle: 'Rear Delts',
      equipment: 'Cable Machine',
      description: 'Pull bar to chest, keep back straight',
      imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=600&fit=crop',
      difficulty: 'intermediate'
    }
  ],
  shoulders: [
    {
      id: 'overhead-press',
      name: 'Overhead Press',
      bodyPart: 'shoulders',
      targetMuscle: 'Shoulders',
      equipment: 'Barbell',
      description: 'Press bar overhead from shoulder height, keep core tight',
      imageUrl: 'https://r2-pub.rork.com/generated-images/ebda0087-ffde-4da3-b031-224d865685cf.png',
      difficulty: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=2yjwXTZQDDI'
    },
    {
      id: 'lateral-raise',
      name: 'Lateral Raise',
      bodyPart: 'shoulders',
      targetMuscle: 'Side Delts',
      equipment: 'Dumbbells',
      description: 'Press dumbbells overhead from shoulder height',
      imageUrl: 'https://r2-pub.rork.com/generated-images/ce577650-e0d6-455e-8595-9b8c3391da0a.png',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=qEwKCR5JCog'
    },
    {
      id: 'front-raise',
      name: 'Front Raise',
      bodyPart: 'shoulders',
      targetMuscle: 'Front Delts',
      equipment: 'Dumbbells',
      description: 'Raise arms to sides until parallel with floor',
      imageUrl: 'https://r2-pub.rork.com/generated-images/0b8a86f5-1600-41cc-8601-74c830630157.png',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo'
    },
    {
      id: 'reverse-fly',
      name: 'Reverse Fly',
      bodyPart: 'shoulders',
      targetMuscle: 'Rear Delts',
      equipment: 'Dumbbells',
      description: 'Raise dumbbells in front to shoulder height',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner'
    },
    {
      id: 'arnold-press',
      name: 'Arnold Press',
      bodyPart: 'shoulders',
      targetMuscle: 'Shoulders',
      equipment: 'Dumbbells',
      description: 'Rotate dumbbells while pressing overhead',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'intermediate'
    }
  ],
  arms: [
    {
      id: 'bicep-curl',
      name: 'Bicep Curl',
      bodyPart: 'arms',
      targetMuscle: 'Biceps',
      equipment: 'Dumbbells',
      description: 'Curl barbell up, squeeze biceps at top, control the descent',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo'
    },
    {
      id: 'hammer-curl',
      name: 'Hammer Curl',
      bodyPart: 'arms',
      targetMuscle: 'Biceps',
      equipment: 'Dumbbells',
      description: 'Neutral grip, curl dumbbells up, focus on biceps and forearms',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=zC3nLlEvin4'
    },
    {
      id: 'tricep-pushdown',
      name: 'Tricep Pushdown',
      bodyPart: 'arms',
      targetMuscle: 'Triceps',
      equipment: 'Cable Machine',
      description: 'Lower body using triceps, push back up',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=6kALZikXxLc'
    },
    {
      id: 'skull-crusher',
      name: 'Skull Crusher',
      bodyPart: 'arms',
      targetMuscle: 'Triceps',
      equipment: 'Barbell',
      description: 'Extend arms overhead, lower weight behind head',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=nRiJVZDpdL0'
    },
    {
      id: 'preacher-curl',
      name: 'Preacher Curl',
      bodyPart: 'arms',
      targetMuscle: 'Biceps',
      equipment: 'Barbell',
      description: 'Curl on preacher bench, isolates biceps',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'intermediate'
    },
    {
      id: 'overhead-tricep-extension',
      name: 'Overhead Tricep Extension',
      bodyPart: 'arms',
      targetMuscle: 'Triceps',
      equipment: 'Dumbbells',
      description: 'Lower bar to forehead, extend arms',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'intermediate'
    }
  ],
  legs: [
    {
      id: 'squat',
      name: 'Squat',
      bodyPart: 'legs',
      targetMuscle: 'Quads',
      equipment: 'Barbell',
      description: 'Bar on upper back, squat down until thighs parallel, drive up',
      imageUrl: 'https://r2-pub.rork.com/generated-images/faf8ba62-ac24-4ed6-bad3-91764a1b1f82.png',
      difficulty: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8'
    },
    {
      id: 'leg-press',
      name: 'Leg Press',
      bodyPart: 'legs',
      targetMuscle: 'Quads',
      equipment: 'Leg Press Machine',
      description: 'Press weight with legs, full range of motion, control the negative',
      imageUrl: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ'
    },
    {
      id: 'romanian-deadlift',
      name: 'Romanian Deadlift',
      bodyPart: 'legs',
      targetMuscle: 'Hamstrings',
      equipment: 'Barbell',
      description: 'Step forward into lunge, alternate legs, keep torso upright',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=L8fvypPrzzs'
    },
    {
      id: 'leg-extension',
      name: 'Leg Extension',
      bodyPart: 'legs',
      targetMuscle: 'Quads',
      equipment: 'Leg Extension Machine',
      description: 'Curl heels to glutes, squeeze hamstrings, slow negative',
      imageUrl: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=800&h=600&fit=crop',
      difficulty: 'beginner'
    },
    {
      id: 'leg-curl',
      name: 'Leg Curl',
      bodyPart: 'legs',
      targetMuscle: 'Hamstrings',
      equipment: 'Leg Curl Machine',
      description: 'Extend legs fully, squeeze quads at top, control the descent',
      imageUrl: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=800&h=600&fit=crop',
      difficulty: 'beginner'
    },
    {
      id: 'calf-raise',
      name: 'Calf Raise',
      bodyPart: 'legs',
      targetMuscle: 'Calves',
      equipment: 'Machine',
      description: 'Rear foot elevated, lunge down on front leg',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=2C-uNgKwPLE'
    },
    {
      id: 'lunge',
      name: 'Lunge',
      bodyPart: 'legs',
      targetMuscle: 'Quads',
      equipment: 'Dumbbells',
      description: 'Step forward into lunge, alternate legs',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner'
    },
    {
      id: 'bulgarian-split-squat',
      name: 'Bulgarian Split Squat',
      bodyPart: 'legs',
      targetMuscle: 'Quads',
      equipment: 'Dumbbells',
      description: 'Rear foot elevated, lunge down on front leg',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'intermediate'
    }
  ],
  core: [
    {
      id: 'plank',
      name: 'Plank',
      bodyPart: 'core',
      targetMuscle: 'Core',
      equipment: 'Bodyweight',
      description: 'Hold plank position, keep body straight',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c'
    },
    {
      id: 'crunch',
      name: 'Crunch',
      bodyPart: 'core',
      targetMuscle: 'Abs',
      equipment: 'Bodyweight',
      description: 'Alternate elbow to opposite knee, keep core engaged',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner'
    },
    {
      id: 'russian-twist',
      name: 'Russian Twist',
      bodyPart: 'core',
      targetMuscle: 'Obliques',
      equipment: 'Dumbbell',
      description: 'Rotate torso side to side, keep core tight',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner'
    },
    {
      id: 'leg-raise',
      name: 'Leg Raise',
      bodyPart: 'core',
      targetMuscle: 'Lower Abs',
      equipment: 'Bodyweight',
      description: 'Hang from bar, raise legs to 90 degrees',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'advanced'
    },
    {
      id: 'ab-wheel',
      name: 'Ab Wheel Rollout',
      bodyPart: 'core',
      targetMuscle: 'Core',
      equipment: 'Ab Wheel',
      description: 'Roll wheel forward, keep core tight, return to start',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'advanced'
    },
    {
      id: 'mountain-climber',
      name: 'Mountain Climber',
      bodyPart: 'core',
      targetMuscle: 'Core',
      equipment: 'Bodyweight',
      description: 'Plank position, alternate bringing knees to chest rapidly',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=nmwgirgXLYM'
    }
  ],
  cardio: [
    {
      id: 'treadmill',
      name: 'Treadmill',
      bodyPart: 'cardio',
      targetMuscle: 'Cardio',
      equipment: 'Treadmill',
      description: 'Squat down, jump back to plank, jump forward, jump up',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=TU8QYVW0gDU'
    },
    {
      id: 'elliptical',
      name: 'Elliptical',
      bodyPart: 'cardio',
      targetMuscle: 'Cardio',
      equipment: 'Elliptical',
      description: 'Squat down, explode up into jump',
      imageUrl: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=800&h=600&fit=crop',
      difficulty: 'intermediate'
    },
    {
      id: 'rowing-machine',
      name: 'Rowing Machine',
      bodyPart: 'cardio',
      targetMuscle: 'Cardio',
      equipment: 'Rowing Machine',
      description: 'Run in place bringing knees up high',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner'
    },
    {
      id: 'jump-rope',
      name: 'Jump Rope',
      bodyPart: 'cardio',
      targetMuscle: 'Cardio',
      equipment: 'Jump Rope',
      description: 'Jump feet apart while raising arms overhead, return to start',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=c4DAnQ6DtF8'
    },
    {
      id: 'stair-climber',
      name: 'Stair Climber',
      bodyPart: 'cardio',
      targetMuscle: 'Cardio',
      equipment: 'Stair Climber',
      description: 'Jump onto box, step down, repeat',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'intermediate'
    },
    {
      id: 'battle-ropes',
      name: 'Battle Ropes',
      bodyPart: 'cardio',
      targetMuscle: 'Cardio',
      equipment: 'Battle Ropes',
      description: 'Create waves with ropes, maintain intensity',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'intermediate'
    }
  ]
};

export const getAllExercises = (): ExerciseTemplate[] => {
  return Object.values(exercisesByBodyPart).flat();
};

export const getExercisesByBodyPart = (bodyPart: BodyPart): ExerciseTemplate[] => {
  return exercisesByBodyPart[bodyPart] || [];
};

export const getExerciseById = (id: string): ExerciseTemplate | undefined => {
  return getAllExercises().find(ex => ex.id === id);
};

export const bodyPartLabels: Record<BodyPart, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  core: 'Core',
  cardio: 'Cardio'
};

export const bodyPartColors: Record<BodyPart, string> = {
  chest: '#EF4444',
  back: '#3B82F6',
  shoulders: '#F59E0B',
  arms: '#8B5CF6',
  legs: '#10B981',
  core: '#EC4899',
  cardio: '#06B6D4'
};
