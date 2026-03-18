import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Activity, Dumbbell, Bell, Utensils, Target, Calendar, Sparkles, Check } from 'lucide-react-native';
import { useApp } from '@/providers/AppProvider';
import { useNotifications } from '@/providers/NotificationProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


interface WelcomeSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  gradient: string[];
}

function LoadingScreen({ insets, progress }: { insets: { top: number; bottom: number; left: number; right: number }, progress: number }) {
  const dumbbellAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const liftAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(dumbbellAnim, {
          toValue: -30,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(dumbbellAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );

    liftAnimation.start();
    pulseAnimation.start();
    rotateAnimation.start();

    return () => {
      liftAnimation.stop();
      pulseAnimation.stop();
      rotateAnimation.stop();
    };
  }, [dumbbellAnim, pulseAnim, rotateAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.loadingBackground}>
        <View style={styles.loadingContainer}>
          <View style={styles.iconContainer}>
            <Animated.View
              style={{
                transform: [
                  { translateY: dumbbellAnim },
                  { scale: pulseAnim },
                ],
              }}
            >
              <Dumbbell size={100} color="#000000" strokeWidth={2.5} />
            </Animated.View>
            
            <Animated.View
              style={[
                styles.loadingRing,
                {
                  transform: [{ rotate }],
                },
              ]}
            >
              <View style={styles.loadingRingInner} />
            </Animated.View>
          </View>
          
          <View style={styles.contentContainer}>
            <Text style={styles.loadingTitle}>Creating Your Plan</Text>
            <Text style={styles.loadingSubtitle}>This might take a second.</Text>
            <Text style={styles.loadingDescription}>
              Thank you for your patience.
            </Text>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View 
                  style={[
                    styles.progressBarFill,
                    { width: progressWidth }
                  ]} 
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const slides: WelcomeSlide[] = [
  {
    id: 1,
    title: 'AthliAI',
    subtitle: 'Your AI Fitness Companion',
    description: 'Track runs, workouts, and nutrition with intelligent insights that adapt to your goals.',
    icon: null,
    gradient: ['#FFFFFF', '#FFFFFF'],
  },
  {
    id: 2,
    title: 'Track Everything',
    subtitle: 'Runs • Workouts • Nutrition',
    description: 'Monitor your complete fitness journey in one place. Every rep, every mile, every meal counts.',
    icon: <Activity size={80} color="#000000" />,
    gradient: ['#FFFFFF', '#FFFFFF'],
  },
  {
    id: 3,
    title: 'Personalized Plans',
    subtitle: 'Built for You',
    description: 'AI-generated workout and nutrition plans that match your fitness level, goals, and lifestyle.',
    icon: <Dumbbell size={80} color="#000000" />,
    gradient: ['#FFFFFF', '#FFFFFF'],
  },
  {
    id: 4,
    title: 'Stay Consistent',
    subtitle: 'Build Lasting Habits',
    description: 'Smart reminders and streak tracking keep you motivated and on track every single day.',
    icon: <Bell size={80} color="#000000" />,
    gradient: ['#FFFFFF', '#FFFFFF'],
  },
];

export default function WelcomeScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [showNutritionQuiz, setShowNutritionQuiz] = useState(false);
  const [showGymQuiz, setShowGymQuiz] = useState(false);

  const [showPaywall, setShowPaywall] = useState(false);
  const [nutritionGoal, setNutritionGoal] = useState<'lose' | 'maintain' | 'gain' | null>(null);
  const [currentWeight, setCurrentWeight] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [goalEndDate, setGoalEndDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentGymStep, setCurrentGymStep] = useState(0);
  const [gymAnswers, setGymAnswers] = useState<{question: string; answer: string}[]>([]);
  const [customGoals, setCustomGoals] = useState('');
  const [selectedWorkoutDays, setSelectedWorkoutDays] = useState<string[]>([]);
  const [showDaySelector, setShowDaySelector] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const { markWelcomeAsSeen, updateNutrition, updatePersonalStats, updateCustomWorkoutPlan } = useApp();
  const { requestPermissions, scheduleDailyWorkoutReminder } = useNotifications();
  useRevenueCat();
  const insets = useSafeAreaInsets();

  const handleNext = async () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (currentSlide === 3) {
      setIsRequestingPermissions(true);
      try {
        const granted = await requestPermissions();
        if (granted) {
          await scheduleDailyWorkoutReminder();
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
      } finally {
        setIsRequestingPermissions(false);
      }
    }
    
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      setShowGymQuiz(true);
    }
  };

  const handleSkip = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    handleGetStarted();
  };

  const handleGetStarted = () => {
    markWelcomeAsSeen();
    router.replace('/(tabs)/home');
  };

  const calculateNutritionGoals = () => {
    if (!nutritionGoal || !currentWeight || !heightFeet || !heightInches || (nutritionGoal !== 'maintain' && (!targetWeight || !goalEndDate))) return;

    const currentWeightNum = parseFloat(currentWeight);
    const heightNum = (parseFloat(heightFeet) * 12) + parseFloat(heightInches);
    const targetWeightNum = targetWeight ? parseFloat(targetWeight) : currentWeightNum;
    let calorieGoal = 2000;
    let proteinGoal = 150;
    let carbsGoal = 200;
    let fatGoal = 65;

    if (nutritionGoal === 'lose') {
      calorieGoal = 1800;
      proteinGoal = 160;
      carbsGoal = 150;
      fatGoal = 60;
    } else if (nutritionGoal === 'gain') {
      calorieGoal = 2500;
      proteinGoal = 180;
      carbsGoal = 280;
      fatGoal = 80;
    }

    updateNutrition({
      calorieGoal,
      proteinGoal,
      carbsGoal,
      fatGoal,
      quizCompleted: true,
    });

    updatePersonalStats({
      weight: currentWeightNum,
      height: heightNum,
      ...(targetWeight && goalEndDate ? {
        targetWeight: targetWeightNum,
        goalEndDate: goalEndDate.toISOString(),
      } : {}),
    });

    setShowNutritionQuiz(false);
    setShowPaywall(true);
  };

  const handleSkipNutrition = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateNutrition({ quizCompleted: true });
    setShowNutritionQuiz(false);
    setShowPaywall(true);
  };

  const handleSkipGym = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowGymQuiz(false);
    setShowNutritionQuiz(true);
  };

  const gymQuestions = [
    {
      question: "What is your primary fitness goal?",
      options: [
        "Build muscle mass and size",
        "Increase strength and power",
        "Lose weight and tone up",
        "Improve overall fitness",
        "Athletic performance"
      ]
    },
    {
      question: "What is your current fitness level?",
      options: [
        "Beginner (new to working out)",
        "Intermediate (6 months - 2 years)",
        "Advanced (2+ years of consistent training)"
      ]
    },
    {
      question: "What equipment do you have access to?",
      options: [
        "Full gym with free weights and machines",
        "Home gym with dumbbells and basic equipment",
        "Bodyweight only (no equipment)",
        "Limited equipment (resistance bands, light weights)"
      ]
    },
    {
      question: "How much time can you dedicate per workout?",
      options: [
        "30-45 minutes",
        "45-60 minutes",
        "60-90 minutes",
        "I'm flexible with time"
      ]
    },
    {
      question: "Do you have any physical limitations or injuries?",
      options: [
        "No limitations or injuries",
        "Lower back issues",
        "Knee or joint problems",
        "Shoulder or arm issues",
        "I'll specify in my goals"
      ]
    }
  ];

  const handleGymAnswer = (answer: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newAnswers = [...gymAnswers];
    newAnswers[currentGymStep] = {
      question: gymQuestions[currentGymStep].question,
      answer
    };
    setGymAnswers(newAnswers);

    if (currentGymStep < gymQuestions.length - 1) {
      setCurrentGymStep(currentGymStep + 1);
    } else {
      setShowDaySelector(true);
    }
  };

  const generateFitnessPlan = async (answers: {question: string; answer: string}[], goals: string) => {
    console.log('Generating fitness plan with AI...');
    setGenerationProgress(0.2);
    
    const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (openaiApiKey) {
      try {
        setGenerationProgress(0.4);
        const prompt = `You are a certified personal trainer creating a personalized 5-day workout plan. Based on the user's quiz responses and specific goals, create a comprehensive training program.

User's Quiz Responses:
${answers.map(qa => `${qa.question}: ${qa.answer}`).join('\n')}

User's Specific Goals: ${goals}

Create a 5-day workout plan that:
1. Addresses their specific goals and fitness level
2. Works with their available equipment
3. Fits their time constraints
4. Accounts for any limitations mentioned
5. Follows proper training principles (progressive overload, muscle balance, recovery)

Structure each day with:
- Descriptive day name (e.g., "Upper Body Power", "Lower Body Hypertrophy", "Full Body Circuit")
- 4-6 exercises that complement each other
- Appropriate sets, reps, and rest times for their goals
- Equipment that matches their access
- Clear, concise exercise descriptions

Format as JSON:
{
  "name": "Personalized 5-Day Training Plan",
  "description": "2-3 sentence description of the plan's focus and benefits",
  "days": [
    {
      "day": 1,
      "name": "Descriptive day name",
      "exercises": [
        {
          "name": "Exercise name",
          "sets": 3,
          "reps": "8-12",
          "restTime": 90,
          "equipment": "Equipment needed",
          "description": "Clear form cues and execution tips"
        }
      ]
    }
  ]
}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a certified personal trainer and fitness expert. Generate workout plans in valid JSON format only.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenAI API error:', errorText);
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        setGenerationProgress(0.7);
        const data = await response.json();
        const planData = JSON.parse(data.choices[0].message.content);
        
        console.log('AI-generated plan:', planData);
        setGenerationProgress(0.85);
        
        const enhancedPlan = {
          ...planData,
          days: planData.days.map((day: any) => ({
            ...day,
            exercises: day.exercises.map((exercise: any) => ({
              ...exercise,
              videoUrl: getVideoUrlForExercise(exercise.name)
            }))
          }))
        };
        
        return enhancedPlan;
      } catch (error) {
        console.error('Error generating AI plan, falling back to preset:', error);
      }
    } else {
      console.log('OpenAI API key not found, using preset templates');
    }
    
    const fitnessLevel = answers.find(a => a.question.includes('fitness level'))?.answer || '';
    const primaryGoal = answers.find(a => a.question.includes('primary fitness goal'))?.answer || '';
    const equipment = answers.find(a => a.question.includes('equipment'))?.answer || '';
    
    let planName = "Personalized 5-Day Training Plan";
    let planDescription = "A balanced workout plan tailored to your goals and fitness level.";
    
    if (primaryGoal.includes('muscle mass')) {
      planName = "Muscle Building Program";
      planDescription = "Focus on hypertrophy with compound movements and progressive overload for maximum muscle growth.";
    } else if (primaryGoal.includes('strength')) {
      planName = "Strength Training Program";
      planDescription = "Build raw strength with heavy compound lifts and powerlifting-focused movements.";
    } else if (primaryGoal.includes('weight') || primaryGoal.includes('tone')) {
      planName = "Fat Loss & Toning Program";
      planDescription = "High-intensity workouts combining strength training and cardio for fat loss and muscle definition.";
    }
    
    const baseWorkouts = [
      {
        day: 1,
        name: "Upper Body Push",
        exercises: [
          {
            name: "Bench Press",
            sets: fitnessLevel.includes('Beginner') ? 3 : 4,
            reps: primaryGoal.includes('strength') ? "4-6" : "8-12",
            restTime: primaryGoal.includes('strength') ? 180 : 90,
            equipment: equipment.includes('bodyweight') ? "Push-ups" : "Barbell/Dumbbells",
            description: "Keep your core tight and lower the weight with control. Press up explosively.",
            videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg'
          },
          {
            name: "Overhead Press",
            sets: 3,
            reps: "8-10",
            restTime: 90,
            equipment: equipment.includes('bodyweight') ? "Pike Push-ups" : "Dumbbells",
            description: "Press straight up, keeping your core engaged. Don't arch your back excessively.",
            videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg'
          },
          {
            name: "Dips",
            sets: 3,
            reps: "8-15",
            restTime: 60,
            equipment: equipment.includes('bodyweight') ? "Chair/Bench Dips" : "Dip Station",
            description: "Lower until your shoulders are below your elbows, then press up strongly.",
            videoUrl: 'https://www.youtube.com/watch?v=2z8JmcrW-As'
          },
          {
            name: "Tricep Extensions",
            sets: 3,
            reps: "10-15",
            restTime: 60,
            equipment: equipment.includes('bodyweight') ? "Diamond Push-ups" : "Dumbbells",
            description: "Keep your elbows stationary and focus on the tricep contraction.",
            videoUrl: 'https://www.youtube.com/watch?v=nRiJVZDpdL0'
          }
        ]
      },
      {
        day: 2,
        name: "Lower Body Power",
        exercises: [
          {
            name: "Squats",
            sets: fitnessLevel.includes('Beginner') ? 3 : 4,
            reps: primaryGoal.includes('strength') ? "4-6" : "8-12",
            restTime: primaryGoal.includes('strength') ? 180 : 90,
            equipment: equipment.includes('bodyweight') ? "Bodyweight Squats" : "Barbell/Dumbbells",
            description: "Keep your chest up, knees tracking over toes. Go down until thighs are parallel.",
            videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8'
          },
          {
            name: "Romanian Deadlifts",
            sets: 3,
            reps: "8-10",
            restTime: 90,
            equipment: equipment.includes('bodyweight') ? "Single Leg RDL" : "Dumbbells",
            description: "Hinge at the hips, keep the bar close to your body. Feel the stretch in your hamstrings.",
            videoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q'
          },
          {
            name: "Lunges",
            sets: 3,
            reps: "10-12 each leg",
            restTime: 60,
            equipment: equipment.includes('bodyweight') ? "Bodyweight Lunges" : "Dumbbells",
            description: "Step forward and lower until both knees are at 90 degrees. Push back to start.",
            videoUrl: 'https://www.youtube.com/watch?v=L8fvypPrzzs'
          },
          {
            name: "Calf Raises",
            sets: 3,
            reps: "15-20",
            restTime: 45,
            equipment: "Bodyweight or Dumbbells",
            description: "Rise up on your toes, squeeze at the top, then lower with control.",
            videoUrl: 'https://www.youtube.com/watch?v=gwLzBJYoWlI'
          }
        ]
      },
      {
        day: 3,
        name: "Upper Body Pull",
        exercises: [
          {
            name: "Pull-ups/Rows",
            sets: fitnessLevel.includes('Beginner') ? 3 : 4,
            reps: equipment.includes('bodyweight') ? "5-10" : "8-12",
            restTime: 90,
            equipment: equipment.includes('bodyweight') ? "Pull-ups/Inverted Rows" : "Lat Pulldown",
            description: "Pull your chest to the bar/handle. Squeeze your shoulder blades together.",
            videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g'
          },
          {
            name: "Bent Over Rows",
            sets: 3,
            reps: "8-12",
            restTime: 90,
            equipment: equipment.includes('bodyweight') ? "Inverted Rows" : "Dumbbells",
            description: "Keep your back straight, pull the weight to your lower chest/upper abdomen.",
            videoUrl: 'https://www.youtube.com/watch?v=FWJR5Ve8bnQ'
          },
          {
            name: "Face Pulls",
            sets: 3,
            reps: "12-15",
            restTime: 60,
            equipment: equipment.includes('bodyweight') ? "Reverse Fly" : "Resistance Band",
            description: "Pull to your face level, focusing on rear deltoids and upper back.",
            videoUrl: 'https://www.youtube.com/watch?v=rep-qVOkqgk'
          },
          {
            name: "Bicep Curls",
            sets: 3,
            reps: "10-15",
            restTime: 60,
            equipment: equipment.includes('bodyweight') ? "Chin-ups" : "Dumbbells",
            description: "Keep your elbows at your sides, curl with control and squeeze at the top.",
            videoUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo'
          }
        ]
      },
      {
        day: 4,
        name: "Lower Body Hypertrophy",
        exercises: [
          {
            name: "Goblet Squats",
            sets: 3,
            reps: "12-15",
            restTime: 60,
            equipment: equipment.includes('bodyweight') ? "Bodyweight Squats" : "Dumbbell",
            description: "Hold weight at chest level, squat down keeping your torso upright.",
            videoUrl: 'https://www.youtube.com/watch?v=MeIiIdhvXT4'
          },
          {
            name: "Bulgarian Split Squats",
            sets: 3,
            reps: "10-12 each leg",
            restTime: 60,
            equipment: equipment.includes('bodyweight') ? "Bodyweight" : "Dumbbells",
            description: "Rear foot elevated, lower into lunge position. Focus on front leg.",
            videoUrl: 'https://www.youtube.com/watch?v=2C-uNgKwPLE'
          },
          {
            name: "Hip Thrusts",
            sets: 3,
            reps: "12-15",
            restTime: 60,
            equipment: equipment.includes('bodyweight') ? "Bodyweight" : "Dumbbell",
            description: "Drive through your heels, squeeze glutes at the top. Keep core tight.",
            videoUrl: 'https://www.youtube.com/watch?v=xDmFkJxPzeM'
          },
          {
            name: "Wall Sit",
            sets: 3,
            reps: "30-60 seconds",
            restTime: 60,
            equipment: "Bodyweight",
            description: "Back against wall, thighs parallel to ground. Hold the position.",
            videoUrl: 'https://www.youtube.com/watch?v=y-wV4Venusw'
          }
        ]
      },
      {
        day: 5,
        name: "Full Body Circuit",
        exercises: [
          {
            name: "Burpees",
            sets: 3,
            reps: "8-12",
            restTime: 60,
            equipment: "Bodyweight",
            description: "Drop down, jump back, push-up, jump forward, jump up. Keep it explosive.",
            videoUrl: 'https://www.youtube.com/watch?v=TU8QYVW0gDU'
          },
          {
            name: "Mountain Climbers",
            sets: 3,
            reps: "20-30",
            restTime: 45,
            equipment: "Bodyweight",
            description: "In plank position, alternate bringing knees to chest rapidly.",
            videoUrl: 'https://www.youtube.com/watch?v=nmwgirgXLYM'
          },
          {
            name: "Plank",
            sets: 3,
            reps: "30-60 seconds",
            restTime: 60,
            equipment: "Bodyweight",
            description: "Hold straight line from head to heels. Keep core tight, breathe normally.",
            videoUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c'
          },
          {
            name: "Jumping Jacks",
            sets: 3,
            reps: "20-30",
            restTime: 45,
            equipment: "Bodyweight",
            description: "Jump feet apart while raising arms overhead, then return to start.",
            videoUrl: 'https://www.youtube.com/watch?v=c4DAnQ6DtF8'
          }
        ]
      }
    ];
    
    const adjustedWorkouts = baseWorkouts.map(workout => ({
      ...workout,
      exercises: workout.exercises.map(exercise => ({
        ...exercise,
        videoUrl: getVideoUrlForExercise(exercise.name)
      }))
    }));
    
    return {
      id: `preset-${Date.now()}`,
      name: planName,
      description: planDescription,
      workoutDays: [],
      days: adjustedWorkouts
    };
  };
  
  const getVideoUrlForExercise = (exerciseName: string): string => {
    const name = exerciseName.toLowerCase();
    if (name.includes('squat')) return 'https://www.youtube.com/watch?v=ultWZbUMPL8';
    if (name.includes('deadlift')) return 'https://www.youtube.com/watch?v=op9kVnSso6Q';
    if (name.includes('bench') || name.includes('press')) return 'https://www.youtube.com/watch?v=rT7DgCr-3pg';
    if (name.includes('row')) return 'https://www.youtube.com/watch?v=FWJR5Ve8bnQ';
    if (name.includes('pull')) return 'https://www.youtube.com/watch?v=eGo4IYlbE5g';
    if (name.includes('curl')) return 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo';
    if (name.includes('lunge')) return 'https://www.youtube.com/watch?v=L8fvypPrzzs';
    if (name.includes('plank')) return 'https://www.youtube.com/watch?v=ASdvN_XEl_c';
    if (name.includes('push')) return 'https://www.youtube.com/watch?v=IODxDxX7oi4';
    if (name.includes('burpee')) return 'https://www.youtube.com/watch?v=TU8QYVW0gDU';
    if (name.includes('mountain')) return 'https://www.youtube.com/watch?v=nmwgirgXLYM';
    if (name.includes('jumping')) return 'https://www.youtube.com/watch?v=c4DAnQ6DtF8';
    if (name.includes('dip')) return 'https://www.youtube.com/watch?v=2z8JmcrW-As';
    if (name.includes('tricep')) return 'https://www.youtube.com/watch?v=nRiJVZDpdL0';
    if (name.includes('calf')) return 'https://www.youtube.com/watch?v=gwLzBJYoWlI';
    if (name.includes('face')) return 'https://www.youtube.com/watch?v=rep-qVOkqgk';
    if (name.includes('bulgarian')) return 'https://www.youtube.com/watch?v=2C-uNgKwPLE';
    if (name.includes('hip thrust')) return 'https://www.youtube.com/watch?v=xDmFkJxPzeM';
    if (name.includes('wall sit')) return 'https://www.youtube.com/watch?v=y-wV4Venusw';
    if (name.includes('goblet')) return 'https://www.youtube.com/watch?v=MeIiIdhvXT4';
    return 'https://www.youtube.com/watch?v=rT7DgCr-3pg';
  };

  const [generationProgress, setGenerationProgress] = useState(0);

  const generateGymPlan = async () => {
    if (!customGoals.trim()) {
      return;
    }

    setIsGeneratingPlan(true);
    setGenerationProgress(0.1);
    
    try {
      setGenerationProgress(0.3);
      const planData = await generateFitnessPlan(gymAnswers, customGoals);
      
      setGenerationProgress(0.9);
      const workoutDays = selectedWorkoutDays.length > 0 
        ? selectedWorkoutDays 
        : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

      const enhancedPlan = {
        ...planData,
        workoutDays
      };
        
      updateCustomWorkoutPlan(enhancedPlan);
      setGenerationProgress(1);
      
      setTimeout(() => {
        setShowGymQuiz(false);
        setShowNutritionQuiz(true);
      }, 300);
    } catch (error) {
      console.error('Error generating plan:', error);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const currentSlideData = slides[currentSlide] || slides[0];
  const isLastSlide = currentSlide === slides.length - 1;

  if (showPaywall) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#8B5CF6', '#EC4899']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(60, insets.bottom + 40) }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              <View style={styles.paywallIconContainer}>
                <Sparkles size={60} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.contentContainer}>
              <Text style={styles.title}>Your Personal Plan is Ready!</Text>
              <Text style={styles.subtitle}>Start your 3-day free trial</Text>
              <Text style={styles.description}>
                Begin your fitness journey with AI-powered workouts, nutrition tracking, and personalized insights.
              </Text>
            </View>

            <View style={styles.featuresContainer}>
              <View style={styles.featureRow}>
                <Check size={20} color="#FFFFFF" />
                <Text style={styles.featureText}>Personalized workout plans</Text>
              </View>
              <View style={styles.featureRow}>
                <Check size={20} color="#FFFFFF" />
                <Text style={styles.featureText}>Custom nutrition goals</Text>
              </View>

              <View style={styles.featureRow}>
                <Check size={20} color="#FFFFFF" />
                <Text style={styles.featureText}>Progress tracking & analytics</Text>
              </View>
              <View style={styles.featureRow}>
                <Check size={20} color="#FFFFFF" />
                <Text style={styles.featureText}>Unlimited workouts & runs</Text>
              </View>
            </View>

            <View style={styles.pricingContainer}>
              <Text style={styles.pricingText}>Then $9.99/year</Text>
              <Text style={styles.pricingSubtext}>Only $0.83/month • Cancel anytime</Text>
            </View>

            <TouchableOpacity
              style={styles.startTrialButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                }
                router.push('/paywall');
              }}
            >
              <Text style={styles.startTrialButtonText}>Start Free Trial</Text>
              <ChevronRight size={20} color="#8B5CF6" style={styles.chevron} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                handleGetStarted();
              }}
            >
              <Text style={styles.continueButtonText}>Continue to App</Text>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
              Your subscription will automatically renew unless cancelled.
            </Text>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  if (isGeneratingPlan) {
    return <LoadingScreen insets={insets} progress={generationProgress} />;
  }

  if (showGymQuiz) {
    const progressPercent = showDaySelector 
      ? 100 
      : currentGymStep >= gymQuestions.length 
        ? 90 
        : ((currentGymStep + 1) / (gymQuestions.length + 2)) * 100;

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#FFFFFF', '#FFFFFF']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity style={styles.skipButton} onPress={handleSkipGym}>
            <Text style={[styles.skipText, { color: '#000000' }]}>Skip</Text>
          </TouchableOpacity>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={insets.top}
          >
            <ScrollView
              contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(60, insets.bottom + 40) }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
            <View style={styles.quizProgressBarInline}>
              <View style={[styles.quizProgressFill, { width: `${progressPercent}%` }]} />
            </View>

            <View style={styles.iconContainer}>
              <Dumbbell size={80} color="#000000" />
            </View>

            <View style={styles.contentContainer}>
              <Text style={[styles.title, { color: '#000000' }]}>Create Your Gym Plan</Text>
              <Text style={[styles.subtitle, { color: '#000000' }]}>Let&apos;s build your personalized workout routine</Text>
              <Text style={[styles.description, { color: '#000000' }]}>
                Answer a few questions to get a custom 5-day training plan.
              </Text>
              <Text style={[styles.quizStepIndicator, { color: '#000000' }]}>
                {showDaySelector ? 'Final Step' : currentGymStep >= gymQuestions.length ? 'Almost Done' : `Question ${currentGymStep + 1} of ${gymQuestions.length}`}
              </Text>
            </View>

            <View style={styles.quizContainer}>
              {showDaySelector ? (
                <>
                  <Text style={[styles.quizQuestion, { color: '#000000' }]}>Select your workout days</Text>
                  <Text style={[styles.daySelectionSubtext, { color: '#000000' }]}>
                    Choose which days of the week you want to workout
                  </Text>
                  <View style={styles.daySelectionContainer}>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                      const dayKey = day.toLowerCase();
                      const isSelected = selectedWorkoutDays.includes(dayKey);
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.dayButton,
                            isSelected && styles.dayButtonSelected,
                          ]}
                          onPress={() => {
                            if (Platform.OS !== 'web') {
                              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                            if (isSelected) {
                              setSelectedWorkoutDays(prev => prev.filter(d => d !== dayKey));
                            } else {
                              setSelectedWorkoutDays(prev => [...prev, dayKey]);
                            }
                          }}
                        >
                          <Text
                            style={[
                              styles.dayButtonText,
                              { color: isSelected ? '#000000' : '#000000' },
                              isSelected && styles.dayButtonTextSelected,
                            ]}
                          >
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      selectedWorkoutDays.length === 0 && styles.actionButtonDisabled,
                    ]}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                      if (selectedWorkoutDays.length > 0) {
                        setShowDaySelector(false);
                        setCurrentGymStep(gymQuestions.length);
                      }
                    }}
                    disabled={selectedWorkoutDays.length === 0}
                  >
                    <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Continue</Text>
                    <ChevronRight size={20} color="#FFFFFF" style={styles.chevron} />
                  </TouchableOpacity>
                </>
              ) : currentGymStep < gymQuestions.length && gymQuestions[currentGymStep] ? (
                <>
                  <Text style={[styles.quizQuestion, { color: '#000000' }]}>
                    {gymQuestions[currentGymStep].question}
                  </Text>
                  <View style={styles.optionsContainer}>
                    {gymQuestions[currentGymStep].options.map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.optionButton}
                        onPress={() => handleGymAnswer(option)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.optionText, { color: '#000000' }]}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.quizQuestion, { color: '#000000' }]}>
                    Any specific goals or limitations?
                  </Text>
                  <Text style={[styles.goalsSubtext, { color: '#000000' }]}>
                    Tell us about any specific areas you want to focus on or limitations we should know about.
                  </Text>
                  <TextInput
                    style={[styles.goalsInput, { color: '#000000', borderColor: 'rgba(0,0,0,0.3)', backgroundColor: 'rgba(0,0,0,0.05)' }]}
                    multiline
                    numberOfLines={4}
                    placeholder="e.g., I want to build bigger arms and chest, improve my posture..."
                    placeholderTextColor="rgba(0,0,0,0.5)"
                    value={customGoals}
                    onChangeText={setCustomGoals}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      !customGoals.trim() && styles.actionButtonDisabled,
                    ]}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                      void generateGymPlan();
                    }}
                    disabled={!customGoals.trim()}
                  >
                    <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Create My Plan</Text>
                    <Target size={20} color="#FFFFFF" style={styles.chevron} />
                  </TouchableOpacity>
                </>
              )}
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </View>
    );
  }

  if (showNutritionQuiz) {
    const totalNutritionSteps = 5;
    let currentNutritionStep = 0;
    if (nutritionGoal) currentNutritionStep = 1;
    if (currentWeight) currentNutritionStep = 2;
    if (heightFeet && heightInches) currentNutritionStep = 3;
    if (nutritionGoal === 'maintain' || (targetWeight && goalEndDate)) currentNutritionStep = 4;
    
    const nutritionProgressPercent = (currentNutritionStep / totalNutritionSteps) * 100;

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#FFFFFF', '#FFFFFF']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity style={styles.skipButton} onPress={handleSkipNutrition}>
            <Text style={[styles.skipText, { color: '#000000' }]}>Skip</Text>
          </TouchableOpacity>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={insets.top}
          >
            <ScrollView
              contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(60, insets.bottom + 40) }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
            <View style={styles.quizProgressBarInline}>
              <View style={[styles.quizProgressFill, { width: `${nutritionProgressPercent}%` }]} />
            </View>

            <View style={styles.iconContainer}>
              <Utensils size={80} color="#000000" />
            </View>

            <View style={styles.contentContainer}>
              <Text style={[styles.title, { color: '#000000' }]}>Nutrition Goals</Text>
              <Text style={[styles.subtitle, { color: '#000000' }]}>Let&apos;s personalize your nutrition plan</Text>
              <Text style={[styles.description, { color: '#000000' }]}>
                Tell us your goals so we can calculate your daily calorie and macro targets.
              </Text>
              <Text style={[styles.quizStepIndicator, { color: '#000000' }]}>
                Step {currentNutritionStep + 1} of {totalNutritionSteps}
              </Text>
            </View>

            <View style={styles.quizContainer}>
              <Text style={[styles.quizQuestion, { color: '#000000' }]}>What&apos;s your primary goal?</Text>
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    nutritionGoal === 'lose' && styles.optionButtonSelected,
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setNutritionGoal('lose');
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: '#000000' },
                      nutritionGoal === 'lose' && styles.optionTextSelected,
                    ]}
                  >
                    Lose Weight
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    nutritionGoal === 'maintain' && styles.optionButtonSelected,
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setNutritionGoal('maintain');
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: '#000000' },
                      nutritionGoal === 'maintain' && styles.optionTextSelected,
                    ]}
                  >
                    Maintain Weight
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    nutritionGoal === 'gain' && styles.optionButtonSelected,
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setNutritionGoal('gain');
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: '#000000' },
                      nutritionGoal === 'gain' && styles.optionTextSelected,
                    ]}
                  >
                    Gain Weight
                  </Text>
                </TouchableOpacity>
              </View>

              {nutritionGoal && (
                <>
                  <Text style={[styles.quizQuestion, { color: '#000000' }]}>Current weight (lbs)?</Text>
                  <TextInput
                    style={[styles.weightInput, { color: '#000000', borderColor: 'rgba(0,0,0,0.3)', backgroundColor: 'rgba(0,0,0,0.05)' }]}
                    placeholder="e.g., 180"
                    placeholderTextColor="rgba(0,0,0,0.5)"
                    keyboardType="numeric"
                    value={currentWeight}
                    onChangeText={setCurrentWeight}
                  />
                </>
              )}

              {nutritionGoal && currentWeight && (
                <>
                  <Text style={[styles.quizQuestion, { color: '#000000' }]}>Height</Text>
                  <View style={styles.heightInputContainer}>
                    <View style={styles.heightInputWrapper}>
                      <TextInput
                        style={[styles.heightInput, { color: '#000000', borderColor: 'rgba(0,0,0,0.3)', backgroundColor: 'rgba(0,0,0,0.05)' }]}
                        placeholder="Feet"
                        placeholderTextColor="rgba(0,0,0,0.5)"
                        keyboardType="numeric"
                        value={heightFeet}
                        onChangeText={setHeightFeet}
                      />
                      <Text style={[styles.heightLabel, { color: '#000000' }]}>ft</Text>
                    </View>
                    <View style={styles.heightInputWrapper}>
                      <TextInput
                        style={[styles.heightInput, { color: '#000000', borderColor: 'rgba(0,0,0,0.3)', backgroundColor: 'rgba(0,0,0,0.05)' }]}
                        placeholder="Inches"
                        placeholderTextColor="rgba(0,0,0,0.5)"
                        keyboardType="numeric"
                        value={heightInches}
                        onChangeText={setHeightInches}
                      />
                      <Text style={[styles.heightLabel, { color: '#000000' }]}>in</Text>
                    </View>
                  </View>
                </>
              )}

              {nutritionGoal && nutritionGoal !== 'maintain' && currentWeight && heightFeet && heightInches && (
                <>
                  <Text style={[styles.quizQuestion, { color: '#000000' }]}>Target weight (lbs)?</Text>
                  <TextInput
                    style={[styles.weightInput, { color: '#000000', borderColor: 'rgba(0,0,0,0.3)', backgroundColor: 'rgba(0,0,0,0.05)' }]}
                    placeholder="e.g., 165"
                    placeholderTextColor="rgba(0,0,0,0.5)"
                    keyboardType="numeric"
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                  />

                  <Text style={[styles.quizQuestion, { color: '#000000' }]}>When do you want to achieve this by?</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setShowDatePicker(true);
                    }}
                  >
                    <Calendar size={20} color="#000000" />
                    <Text style={[styles.datePickerButtonText, { color: '#000000' }]}>
                      {goalEndDate ? goalEndDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Select End Date'}
                    </Text>
                  </TouchableOpacity>
                  
                  {showDatePicker && (
                    <DateTimePicker
                      value={goalEndDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (selectedDate) {
                          setGoalEndDate(selectedDate);
                        }
                      }}
                      textColor="#000000"
                      themeVariant="light"
                    />
                  )}
                </>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.actionButton,
                (!nutritionGoal || !currentWeight || !heightFeet || !heightInches ||
                  (nutritionGoal !== 'maintain' && (!targetWeight || !goalEndDate))) &&
                  styles.actionButtonDisabled,
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                calculateNutritionGoals();
              }}
              disabled={
                !nutritionGoal || !currentWeight || !heightFeet || !heightInches ||
                (nutritionGoal !== 'maintain' && (!targetWeight || !goalEndDate))
              }
            >
              <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Complete Setup</Text>
              <Target size={20} color="#FFFFFF" style={styles.chevron} />
            </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </View>
    );
  }

  const _isWhiteBackground = currentSlideData.gradient[0] === '#FFFFFF';

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#FFFFFF' }]}>
      <View style={styles.whiteBackground}>
        <TouchableOpacity style={styles.skipButtonMain} onPress={handleSkip}>
          <Text style={styles.skipTextMain}>Skip</Text>
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(60, insets.bottom + 40) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            {currentSlideData.id === 1 ? (
              <View style={styles.appNameContainer}>
                <Text style={styles.appNameLargeBlack}>AthliAI</Text>
                <View style={styles.underlineBlack} />
              </View>
            ) : currentSlideData.icon ? (
              <View style={styles.iconWrapper}>
                {currentSlideData.icon}
              </View>
            ) : null}
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <Text style={styles.titleBlack}>{currentSlideData.title}</Text>
            <Text style={styles.subtitleBlack}>{currentSlideData.subtitle}</Text>
            <Text style={styles.descriptionBlack}>{currentSlideData.description}</Text>
          </View>

          {/* Pagination Dots */}
          <View style={styles.pagination}>
            {slides.map((slide, index) => (
              <View
                key={slide.id}
                style={[
                  styles.dotBlack,
                  index === currentSlide && styles.activeDotBlack,
                ]}
              />
            ))}
          </View>

          {/* Action Button */}
          <TouchableOpacity 
            style={[
              styles.actionButtonBlack,
              isRequestingPermissions && styles.actionButtonDisabled
            ]} 
            onPress={handleNext}
            disabled={isRequestingPermissions}
          >
            <Text style={styles.actionButtonTextBlack}>
              {isRequestingPermissions ? 'Requesting...' : 
               currentSlide === 3 ? 'Allow Notifications' :
               isLastSlide ? 'Get Started' : 'Next'}
            </Text>
            {!isRequestingPermissions && (
              <ChevronRight size={20} color="#FFFFFF" style={styles.chevron} />
            )}
          </TouchableOpacity>
          
          {/* Skip notifications option */}
          {currentSlide === 3 && (
            <TouchableOpacity 
              style={styles.skipNotificationsButton} 
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setCurrentSlide(currentSlide + 1);
              }}
            >
              <Text style={styles.skipNotificationsTextBlack}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  iconContainer: {
    marginBottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.9,
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
    maxWidth: '80%',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.3,
    marginHorizontal: 4,
  },
  activeDot: {
    opacity: 1,
    width: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 1,
    minWidth: 160,
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  chevron: {
    marginLeft: 4,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  appNameContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appNameLarge: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  appNameLargeBlack: {
    fontSize: 72,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -2,
  },
  underline: {
    width: 120,
    height: 4,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
  },
  underlineBlack: {
    width: 120,
    height: 4,
    backgroundColor: '#000000',
    marginTop: 12,
  },
  whiteBackground: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipButtonMain: {
    position: 'absolute' as const,
    top: 60,
    right: 20,
    zIndex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipTextMain: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlack: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#000000',
  },
  subtitleBlack: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.9,
    fontWeight: '500',
    color: '#000000',
  },
  descriptionBlack: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
    maxWidth: '80%',
    color: '#000000',
  },
  dotBlack: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.3,
    marginHorizontal: 4,
    backgroundColor: '#000000',
  },
  activeDotBlack: {
    opacity: 1,
    width: 24,
  },
  actionButtonBlack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 1,
    minWidth: 160,
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  actionButtonTextBlack: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
    color: '#FFFFFF',
  },
  skipNotificationsTextBlack: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.7,
    textAlign: 'center',
    color: '#000000',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  skipNotificationsButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  skipNotificationsText: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.7,
    textAlign: 'center',
  },
  quizContainer: {
    width: '100%',
    marginBottom: 30,
  },
  quizQuestion: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 25,
  },
  optionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    width: '100%',
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderColor: 'rgba(0, 0, 0, 0.4)',
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'left',
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  weightInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 18,
    color: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 25,
    textAlign: 'center',
  },
  daySelectionSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 15,
    textAlign: 'center',
  },
  daySelectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 25,
  },
  dayButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    minWidth: 90,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderColor: '#000000',
  },
  dayButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  dayButtonTextSelected: {
    opacity: 1,
    fontWeight: '700',
  },
  goalsSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 15,
    textAlign: 'center',
  },
  goalsInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 25,
    minHeight: 100,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.3)',
    marginBottom: 25,
    gap: 10,
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  paywallIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  featuresContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  pricingContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  pricingText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  pricingSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  startTrialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startTrialButtonText: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  continueButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.8,
    textAlign: 'center',
  },
  loadingBackground: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  loadingSubtitle: {
    fontSize: 18,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.7,
    fontWeight: '500',
  },
  loadingDescription: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.6,
    maxWidth: '80%',
  },
  loadingRing: {
    position: 'absolute' as const,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#000000',
    borderRightColor: '#000000',
  },
  loadingRingInner: {
    width: '100%',
    height: '100%',
  },
  progressBarContainer: {
    width: '100%',
    marginTop: 40,
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '80%',
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 4,
  },
  heightInputContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 25,
    width: '100%',
  },
  heightInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heightInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 18,
    color: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    textAlign: 'center',
  },
  heightLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quizStepIndicator: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  quizProgressBarInline: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 40,
  },
  quizProgressFill: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 2,
  },
});