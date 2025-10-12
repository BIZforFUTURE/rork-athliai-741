export type BodyPart = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'cardio';

export interface ExerciseTemplate {
  id: string;
  name: string;
  bodyPart: BodyPart;
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
      equipment: 'Barbell',
      description: 'Lie on bench, grip bar slightly wider than shoulders, lower to chest, press up',
      imageUrl: 'https://r2-pub.rork.com/generated-images/46d8bf6b-65f4-48d0-8a8f-406d46f99fab.png',
      difficulty: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg'
    },
    {
      id: 'incline-dumbbell-press',
      name: 'Incline Dumbbell Press',
      bodyPart: 'chest',
      equipment: 'Dumbbells',
      description: 'Press dumbbells on incline bench, full range of motion',
      imageUrl: 'https://r2-pub.rork.com/generated-images/5beb73f8-d7eb-4530-9db5-323f1ec6e228.png',
      difficulty: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=8iPEnn-ltC8'
    },
    {
      id: 'push-ups',
      name: 'Push-ups',
      bodyPart: 'chest',
      equipment: 'Bodyweight',
      description: 'Lower chest to floor, push back up',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=IODxDxX7oi4'
    },
    {
      id: 'dips',
      name: 'Dips',
      bodyPart: 'chest',
      equipment: 'Dip Station',
      description: 'Lower body between parallel bars, push back up',
      imageUrl: 'https://r2-pub.rork.com/generated-images/d110a007-01ee-4103-ba38-525011ae1b2f.png',
      difficulty: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=2z8JmcrW-As'
    },
    {
      id: 'cable-flyes',
      name: 'Cable Flyes',
      bodyPart: 'chest',
      equipment: 'Cable Machine',
      description: 'Bring cables together in front of chest, squeeze pecs',
      imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=600&fit=crop',
      difficulty: 'intermediate'
    },
    {
      id: 'decline-press',
      name: 'Decline Press',
      bodyPart: 'chest',
      equipment: 'Barbell',
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
      equipment: 'Barbell',
      description: 'Lift bar from floor by extending hips and knees simultaneously',
      imageUrl: 'https://r2-pub.rork.com/generated-images/14806c15-0db9-4c75-8ca7-3df193b518e1.png',
      difficulty: 'advanced',
      videoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q'
    },
    {
      id: 'bent-over-row',
      name: 'Bent Over Row',
      bodyPart: 'back',
      equipment: 'Barbell',
      description: 'Hinge at hips, pull bar to lower chest, squeeze shoulder blades',
      imageUrl: 'https://r2-pub.rork.com/generated-images/fdf0f442-e990-4001-9b7b-0599620e5b6e.png',
      difficulty: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=FWJR5Ve8bnQ'
    },
    {
      id: 'pull-ups',
      name: 'Pull-ups',
      bodyPart: 'back',
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
      equipment: 'Cable Machine',
      description: 'Pull bar to upper chest, squeeze lats, control the negative',
      imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc'
    },
    {
      id: 'cable-row',
      name: 'Seated Cable Row',
      bodyPart: 'back',
      equipment: 'Cable Machine',
      description: 'Pull handle to lower chest, squeeze shoulder blades together',
      imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=600&fit=crop',
      difficulty: 'beginner'
    },
    {
      id: 't-bar-row',
      name: 'T-Bar Row',
      bodyPart: 'back',
      equipment: 'T-Bar',
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
      equipment: 'Barbell',
      description: 'Press bar overhead from shoulder height, keep core tight',
      imageUrl: 'https://r2-pub.rork.com/generated-images/ebda0087-ffde-4da3-b031-224d865685cf.png',
      difficulty: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=2yjwXTZQDDI'
    },
    {
      id: 'shoulder-press',
      name: 'Dumbbell Shoulder Press',
      bodyPart: 'shoulders',
      equipment: 'Dumbbells',
      description: 'Press dumbbells overhead from shoulder height',
      imageUrl: 'https://r2-pub.rork.com/generated-images/ce577650-e0d6-455e-8595-9b8c3391da0a.png',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=qEwKCR5JCog'
    },
    {
      id: 'lateral-raises',
      name: 'Lateral Raises',
      bodyPart: 'shoulders',
      equipment: 'Dumbbells',
      description: 'Raise arms to sides until parallel with floor',
      imageUrl: 'https://r2-pub.rork.com/generated-images/0b8a86f5-1600-41cc-8601-74c830630157.png',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo'
    },
    {
      id: 'face-pulls',
      name: 'Face Pulls',
      bodyPart: 'shoulders',
      equipment: 'Cable Machine',
      description: 'Pull rope to face level, focus on rear delts and rhomboids',
      imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=rep-qVOkqgk'
    },
    {
      id: 'front-raises',
      name: 'Front Raises',
      bodyPart: 'shoulders',
      equipment: 'Dumbbells',
      description: 'Raise dumbbells in front to shoulder height',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner'
    },
    {
      id: 'arnold-press',
      name: 'Arnold Press',
      bodyPart: 'shoulders',
      equipment: 'Dumbbells',
      description: 'Rotate dumbbells while pressing overhead',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'intermediate'
    }
  ],
  arms: [
    {
      id: 'barbell-curls',
      name: 'Barbell Curls',
      bodyPart: 'arms',
      equipment: 'Barbell',
      description: 'Curl barbell up, squeeze biceps at top, control the descent',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo'
    },
    {
      id: 'hammer-curls',
      name: 'Hammer Curls',
      bodyPart: 'arms',
      equipment: 'Dumbbells',
      description: 'Neutral grip, curl dumbbells up, focus on biceps and forearms',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=zC3nLlEvin4'
    },
    {
      id: 'tricep-dips',
      name: 'Tricep Dips',
      bodyPart: 'arms',
      equipment: 'Bench',
      description: 'Lower body using triceps, push back up',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=6kALZikXxLc'
    },
    {
      id: 'tricep-extensions',
      name: 'Tricep Extensions',
      bodyPart: 'arms',
      equipment: 'Dumbbells',
      description: 'Extend arms overhead, lower weight behind head',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=nRiJVZDpdL0'
    },
    {
      id: 'preacher-curls',
      name: 'Preacher Curls',
      bodyPart: 'arms',
      equipment: 'Barbell',
      description: 'Curl on preacher bench, isolates biceps',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'intermediate'
    },
    {
      id: 'skull-crushers',
      name: 'Skull Crushers',
      bodyPart: 'arms',
      equipment: 'Barbell',
      description: 'Lower bar to forehead, extend arms',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'intermediate'
    }
  ],
  legs: [
    {
      id: 'squat',
      name: 'Back Squat',
      bodyPart: 'legs',
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
      equipment: 'Leg Press Machine',
      description: 'Press weight with legs, full range of motion, control the negative',
      imageUrl: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ'
    },
    {
      id: 'walking-lunges',
      name: 'Walking Lunges',
      bodyPart: 'legs',
      equipment: 'Dumbbells',
      description: 'Step forward into lunge, alternate legs, keep torso upright',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=L8fvypPrzzs'
    },
    {
      id: 'leg-curls',
      name: 'Leg Curls',
      bodyPart: 'legs',
      equipment: 'Leg Curl Machine',
      description: 'Curl heels to glutes, squeeze hamstrings, slow negative',
      imageUrl: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=800&h=600&fit=crop',
      difficulty: 'beginner'
    },
    {
      id: 'leg-extensions',
      name: 'Leg Extensions',
      bodyPart: 'legs',
      equipment: 'Leg Extension Machine',
      description: 'Extend legs fully, squeeze quads at top, control the descent',
      imageUrl: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=800&h=600&fit=crop',
      difficulty: 'beginner'
    },
    {
      id: 'bulgarian-split-squat',
      name: 'Bulgarian Split Squat',
      bodyPart: 'legs',
      equipment: 'Dumbbells',
      description: 'Rear foot elevated, lunge down on front leg',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=2C-uNgKwPLE'
    },
    {
      id: 'calf-raises',
      name: 'Calf Raises',
      bodyPart: 'legs',
      equipment: 'Machine',
      description: 'Rise up on toes, squeeze calves at top',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=gwLzBJYoWlI'
    }
  ],
  core: [
    {
      id: 'plank',
      name: 'Plank Hold',
      bodyPart: 'core',
      equipment: 'Bodyweight',
      description: 'Hold plank position, keep body straight',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c'
    },
    {
      id: 'bicycle-crunches',
      name: 'Bicycle Crunches',
      bodyPart: 'core',
      equipment: 'Bodyweight',
      description: 'Alternate elbow to opposite knee, keep core engaged',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner'
    },
    {
      id: 'russian-twists',
      name: 'Russian Twists',
      bodyPart: 'core',
      equipment: 'Dumbbell',
      description: 'Rotate torso side to side, keep core tight',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner'
    },
    {
      id: 'hanging-leg-raises',
      name: 'Hanging Leg Raises',
      bodyPart: 'core',
      equipment: 'Pull-up Bar',
      description: 'Hang from bar, raise legs to 90 degrees',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'advanced'
    },
    {
      id: 'ab-wheel',
      name: 'Ab Wheel Rollout',
      bodyPart: 'core',
      equipment: 'Ab Wheel',
      description: 'Roll wheel forward, keep core tight, return to start',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'advanced'
    },
    {
      id: 'mountain-climbers',
      name: 'Mountain Climbers',
      bodyPart: 'core',
      equipment: 'Bodyweight',
      description: 'Plank position, alternate bringing knees to chest rapidly',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=nmwgirgXLYM'
    }
  ],
  cardio: [
    {
      id: 'burpees',
      name: 'Burpees',
      bodyPart: 'cardio',
      equipment: 'Bodyweight',
      description: 'Squat down, jump back to plank, jump forward, jump up',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'intermediate',
      videoUrl: 'https://www.youtube.com/watch?v=TU8QYVW0gDU'
    },
    {
      id: 'jump-squats',
      name: 'Jump Squats',
      bodyPart: 'cardio',
      equipment: 'Bodyweight',
      description: 'Squat down, explode up into jump',
      imageUrl: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=800&h=600&fit=crop',
      difficulty: 'intermediate'
    },
    {
      id: 'high-knees',
      name: 'High Knees',
      bodyPart: 'cardio',
      equipment: 'Bodyweight',
      description: 'Run in place bringing knees up high',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner'
    },
    {
      id: 'jumping-jacks',
      name: 'Jumping Jacks',
      bodyPart: 'cardio',
      equipment: 'Bodyweight',
      description: 'Jump feet apart while raising arms overhead, return to start',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'beginner',
      videoUrl: 'https://www.youtube.com/watch?v=c4DAnQ6DtF8'
    },
    {
      id: 'box-jumps',
      name: 'Box Jumps',
      bodyPart: 'cardio',
      equipment: 'Box',
      description: 'Jump onto box, step down, repeat',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
      difficulty: 'intermediate'
    },
    {
      id: 'battle-ropes',
      name: 'Battle Ropes',
      bodyPart: 'cardio',
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
