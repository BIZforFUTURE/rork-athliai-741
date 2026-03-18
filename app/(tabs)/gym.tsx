import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { 
  Dumbbell, 
  Clock, 
  Play, 
  Trophy, 
  TrendingUp,
  Calendar,
  X,
  ChevronRight,
  Plus,
  Zap,
  Settings,
  Hammer
} from "lucide-react-native";
import { useApp } from "@/providers/AppProvider";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { workoutPlans, WorkoutPlan, getTargetedMuscleGroups } from "@/constants/workouts";


interface QuizAnswer {
  question: string;
  answer: string;
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

export default function GymScreen() {
  const { stats, workoutLogs, customWorkoutPlan, updateCustomWorkoutPlan } = useApp();
  const insets = useSafeAreaInsets();

  const [showRecentWorkouts, setShowRecentWorkouts] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuizStep, setCurrentQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const [customGoals, setCustomGoals] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState<CustomWorkoutPlan | null>(customWorkoutPlan);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showCustomPlan, setShowCustomPlan] = useState(false);
  const [todaysWorkout, setTodaysWorkout] = useState<CustomWorkoutPlan['days'][0] | null>(null);
  const [selectedWorkoutDays, setSelectedWorkoutDays] = useState<string[]>([]);
  const [showDaySelector, setShowDaySelector] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showDayAdjustment, setShowDayAdjustment] = useState(false);
  const [adjustedWorkoutDays, setAdjustedWorkoutDays] = useState<string[]>([]);

  const _formatWeight = (weight: number): string => {
    if (weight >= 1000) {
      return `${(weight / 1000).toFixed(1)}k lbs`;
    }
    return `${weight.toFixed(0)} lbs`;
  };







  const quizQuestions = [
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
      question: "Which days of the week do you want to workout?",
      options: [
        "Monday, Wednesday, Friday (3 days)",
        "Monday, Tuesday, Thursday, Friday (4 days)",
        "Monday, Tuesday, Wednesday, Thursday, Friday (5 days)",
        "Monday, Wednesday, Friday, Saturday, Sunday (5 days)",
        "Custom schedule (select specific days)"
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

  const handleQuizAnswer = (answer: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newAnswers = [...quizAnswers];
    newAnswers[currentQuizStep] = {
      question: quizQuestions[currentQuizStep].question,
      answer
    };
    setQuizAnswers(newAnswers);

    if (currentQuizStep === 4 && answer === "Custom schedule (select specific days)") {
      setShowDaySelector(true);
      return;
    }

    if (currentQuizStep < quizQuestions.length - 1) {
      setCurrentQuizStep(currentQuizStep + 1);
    } else {
      setCurrentQuizStep(quizQuestions.length);
    }
  };

  const _generateFitnessPlan = async (answers: QuizAnswer[], _goals: string): Promise<CustomWorkoutPlan> => {
    console.log("Generating fitness plan with preset templates...");
    
    const fitnessLevel = answers.find(a => a.question.includes('fitness level'))?.answer || '';
    const primaryGoal = answers.find(a => a.question.includes('primary fitness goal'))?.answer || '';
    const equipment = answers.find(a => a.question.includes('equipment'))?.answer || '';
    const _timePerWorkout = answers.find(a => a.question.includes('time'))?.answer || '';
    
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
            description: "Keep your core tight and lower the weight with control. Press up explosively."
          },
          {
            name: "Overhead Press",
            sets: 3,
            reps: "8-10",
            restTime: 90,
            equipment: equipment.includes('bodyweight') ? "Pike Push-ups" : "Dumbbells",
            description: "Press straight up, keeping your core engaged. Don't arch your back excessively."
          },
          {
            name: "Dips",
            sets: 3,
            reps: "8-15",
            restTime: 60,
            equipment: equipment.includes('bodyweight') ? "Chair/Bench Dips" : "Dip Station",
            description: "Lower until your shoulders are below your elbows, then press up strongly."
          },
          {
            name: "Tricep Extensions",
            sets: 3,
            reps: "10-15",
            restTime: 60,
            equipment: equipment.includes('bodyweight') ? "Diamond Push-ups" : "Dumbbells",
            description: "Keep your elbows stationary and focus on the tricep contraction."
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
            description: "Keep your chest up, knees tracking over toes. Go down until thighs are parallel."
          },
          {
            name: "Romanian Deadlifts",
            sets: 3,
            reps: "8-10",
            restTime: 90,
            equipment: equipment.includes('bodyweight') ? "Single Leg RDL" : "Dumbbells",
            description: "Hinge at the hips, keep the bar close to your body. Feel the stretch in your hamstrings."
          },
          {
            name: "Lunges",
            sets: 3,
            reps: "10-12 each leg",
            restTime: 60,
            equipment: equipment.includes('bodyweight') ? "Bodyweight Lunges" : "Dumbbells",
            description: "Step forward and lower until both knees are at 90 degrees. Push back to start."
          },
          {
            name: "Calf Raises",
            sets: 3,
            reps: "15-20",
            restTime: 45,
            equipment: "Bodyweight or Dumbbells",
            description: "Rise up on your toes, squeeze at the top, then lower with control."
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
            description: "Pull your chest to the bar/handle. Squeeze your shoulder blades together."
          },
          {
            name: "Bent Over Rows",
            sets: 3,
            reps: "8-12",
            restTime: 90,
            equipment: equipment.includes('bodyweight') ? "Inverted Rows" : "Dumbbells",
            description: "Keep your back straight, pull the weight to your lower chest/upper abdomen."
          },
          {
            name: "Face Pulls",
            sets: 3,
            reps: "12-15",
            restTime: 60,
            equipment: equipment.includes('bodyweight') ? "Reverse Fly" : "Resistance Band",
            description: "Pull to your face level, focusing on rear deltoids and upper back."
          },
          {
            name: "Bicep Curls",
            sets: 3,
            reps: "10-15",
            restTime: 60,
            equipment: equipment.includes('bodyweight') ? "Chin-ups" : "Dumbbells",
            description: "Keep your elbows at your sides, curl with control and squeeze at the top."
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
            description: "Hold weight at chest level, squat down keeping your torso upright."
          },
          {
            name: "Bulgarian Split Squats",
            sets: 3,
            reps: "10-12 each leg",
            restTime: 60,
            equipment: equipment.includes('bodyweight') ? "Bodyweight" : "Dumbbells",
            description: "Rear foot elevated, lower into lunge position. Focus on front leg."
          },
          {
            name: "Hip Thrusts",
            sets: 3,
            reps: "12-15",
            restTime: 60,
            equipment: equipment.includes('bodyweight') ? "Bodyweight" : "Dumbbell",
            description: "Drive through your heels, squeeze glutes at the top. Keep core tight."
          },
          {
            name: "Wall Sit",
            sets: 3,
            reps: "30-60 seconds",
            restTime: 60,
            equipment: "Bodyweight",
            description: "Back against wall, thighs parallel to ground. Hold the position."
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
            description: "Drop down, jump back, push-up, jump forward, jump up. Keep it explosive."
          },
          {
            name: "Mountain Climbers",
            sets: 3,
            reps: "20-30",
            restTime: 45,
            equipment: "Bodyweight",
            description: "In plank position, alternate bringing knees to chest rapidly."
          },
          {
            name: "Plank",
            sets: 3,
            reps: "30-60 seconds",
            restTime: 60,
            equipment: "Bodyweight",
            description: "Hold straight line from head to heels. Keep core tight, breathe normally."
          },
          {
            name: "Jumping Jacks",
            sets: 3,
            reps: "20-30",
            restTime: 45,
            equipment: "Bodyweight",
            description: "Jump feet apart while raising arms overhead, then return to start."
          }
        ]
      }
    ];
    
    const adjustedWorkouts = baseWorkouts.map(workout => ({
      ...workout,
      exercises: workout.exercises.map(exercise => ({
        ...exercise,
        equipment: equipment.includes('bodyweight') ? 'Bodyweight' : 
                  equipment.includes('dumbbells') ? 'Dumbbells' : 
                  equipment.includes('Full gym') ? 'Gym Equipment' : 'Basic Equipment',
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

  const generateCustomPlan = async () => {
    if (!customGoals.trim()) {
      Alert.alert('Missing Information', 'Please describe your specific fitness goals.');
      return;
    }

    setIsGeneratingPlan(true);
    
    try {
      const prompt = `You are a certified personal trainer creating a personalized 5-day workout plan. Based on the user's quiz responses and specific goals, create a comprehensive training program.

User's Quiz Responses:
${quizAnswers.map(qa => `${qa.question}: ${qa.answer}`).join('\n')}

User's Specific Goals: ${customGoals}

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

      console.log("Generating personalized fitness plan with OpenAI...");
      
      const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API Error:', response.status, errorData);
        throw new Error(`OpenAI API Error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      console.log('AI Response:', aiResponse);
      
      let cleanedResponse = aiResponse
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        .trim();
      
      const jsonMatch = cleanedResponse.match(/{[^{}]*(?:{[^{}]*}[^{}]*)*}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      const planData = JSON.parse(cleanedResponse);
      
      await processPlanData(planData);
    } catch (error) {
      console.error('Error generating plan:', error);
      Alert.alert('Error', 'Failed to generate workout plan. Please check your connection and try again.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const processPlanData = async (planData: any) => {
    try {
        const workoutDaysAnswer = quizAnswers.find(qa => qa.question.includes('Which days'))?.answer || '';
        let workoutDays: string[] = [];
        
        if (workoutDaysAnswer.includes('Monday, Wednesday, Friday (3 days)')) {
          workoutDays = ['monday', 'wednesday', 'friday'];
        } else if (workoutDaysAnswer.includes('Monday, Tuesday, Thursday, Friday (4 days)')) {
          workoutDays = ['monday', 'tuesday', 'thursday', 'friday'];
        } else if (workoutDaysAnswer.includes('Monday, Tuesday, Wednesday, Thursday, Friday (5 days)')) {
          workoutDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        } else if (workoutDaysAnswer.includes('Monday, Wednesday, Friday, Saturday, Sunday (5 days)')) {
          workoutDays = ['monday', 'wednesday', 'friday', 'saturday', 'sunday'];
        } else if (workoutDaysAnswer.includes('Custom schedule')) {
          workoutDays = selectedWorkoutDays;
        } else {
          workoutDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        }

        const enhancedPlan: CustomWorkoutPlan = {
          ...planData,
          workoutDays
        };
          
        setGeneratedPlan(enhancedPlan);
        updateCustomWorkoutPlan(enhancedPlan);
        setTodaysWorkout(getTodaysWorkout(enhancedPlan));
        setShowQuiz(false);
        setShowCustomPlan(true);
    } catch (parseError) {
      console.error('Error creating plan:', parseError);
      Alert.alert('Error', 'Failed to generate workout plan. Please try again.');
    }
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

  const resetQuiz = () => {
    setCurrentQuizStep(0);
    setQuizAnswers([]);
    setCustomGoals('');
    setSelectedWorkoutDays([]);
    setShowDaySelector(false);
    setShowQuiz(false);
  };

  const getTodaysWorkout = (plan: CustomWorkoutPlan): CustomWorkoutPlan['days'][0] | null => {
    const today = new Date();
    const todayString = today.toDateString();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today.getDay()];
    
    const hasCompletedWorkoutToday = workoutLogs.some(log => {
      const logDate = new Date(log.date).toDateString();
      return logDate === todayString && log.completed;
    });
    
    if (hasCompletedWorkoutToday) {
      return null;
    }
    
    if (!plan.workoutDays.includes(todayName)) {
      return null;
    }
    
    const workoutDayIndex = plan.workoutDays.indexOf(todayName);
    
    if (workoutDayIndex >= 0 && workoutDayIndex < plan.days.length) {
      return plan.days[workoutDayIndex];
    }
    
    const cycleIndex = workoutDayIndex % plan.days.length;
    return plan.days[cycleIndex] || null;
  };

  const getNextWorkoutDay = (plan: CustomWorkoutPlan): string => {
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    for (let i = 1; i <= 7; i++) {
      const nextDay = new Date(today);
      nextDay.setDate(today.getDate() + i);
      const nextDayName = dayNames[nextDay.getDay()];
      
      if (plan.workoutDays.includes(nextDayName)) {
        return nextDayName.charAt(0).toUpperCase() + nextDayName.slice(1);
      }
    }
    
    return 'Tomorrow';
  };

  React.useEffect(() => {
    if (generatedPlan) {
      setTodaysWorkout(getTodaysWorkout(generatedPlan));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedPlan, workoutLogs]);

  React.useEffect(() => {
    if (customWorkoutPlan && !generatedPlan) {
      setGeneratedPlan(customWorkoutPlan);
      setTodaysWorkout(getTodaysWorkout(customWorkoutPlan));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customWorkoutPlan, generatedPlan]);

  React.useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const timeLeft = endOfDay.getTime() - now.getTime();
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeRemaining(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, []);

  const startCustomWorkout = (day: CustomWorkoutPlan['days'][0]) => {
    const customWorkoutPlan: WorkoutPlan = {
      id: `custom-day-${day.day}-${Date.now()}`,
      name: day.name,
      goal: 'hypertrophy',
      duration: day.exercises.length * 15,
      exercises: day.exercises.map((exercise, index) => ({
        id: `custom-exercise-${index}`,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        restTime: exercise.restTime,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
        equipment: exercise.equipment,
        description: exercise.description
      }))
    };

    (global as any).customWorkout = customWorkoutPlan;
    
    setShowCustomPlan(false);
    router.push({
      pathname: "/workout/[id]" as any,
      params: { id: customWorkoutPlan.id }
    });
  };

  const handleDayAdjustment = () => {
    if (generatedPlan) {
      setAdjustedWorkoutDays(generatedPlan.workoutDays);
      setShowDayAdjustment(true);
      setShowSettings(false);
    }
  };

  const saveDayAdjustment = () => {
    if (generatedPlan && adjustedWorkoutDays.length > 0) {
      const updatedPlan = {
        ...generatedPlan,
        workoutDays: adjustedWorkoutDays
      };
      setGeneratedPlan(updatedPlan);
      updateCustomWorkoutPlan(updatedPlan);
      setTodaysWorkout(getTodaysWorkout(updatedPlan));
      setShowDayAdjustment(false);
    }
  };

  const retakeQuiz = () => {
    setShowSettings(false);
    resetQuiz();
    setShowQuiz(true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#0D0F13', '#131820', '#0D0F13']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Gym</Text>
              <View style={styles.subtitleRow}>
                <Text style={styles.headerSubtitle}>
                  {todaysWorkout ? 'Ready to train' : generatedPlan ? 'Rest day' : 'Get started'}
                </Text>
                {generatedPlan && (
                  <View style={styles.countdownContainer}>
                    <Clock size={12} color="#00E5FF" />
                    <Text style={styles.countdownText}>{timeRemaining}</Text>
                  </View>
                )}
              </View>
            </View>
            {generatedPlan && (
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowSettings(true);
                }}
              >
                <Settings size={22} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {!generatedPlan ? (
          <>
            <TouchableOpacity 
              style={styles.customPlanCTA}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                setShowQuiz(true);
              }}
            >
              <View style={styles.ctaGradient}>
                <View style={styles.ctaContent}>
                  <Zap size={32} color="#FFFFFF" />
                  <View style={styles.ctaText}>
                    <Text style={styles.ctaTitle}>Get Your Custom Plan</Text>
                    <Text style={styles.ctaSubtitle}>Take a quick quiz for a personalized 5-day workout</Text>
                  </View>
                  <ChevronRight size={24} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.buildWorkoutCTA}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                router.push('/workout-builder');
              }}
            >
              <View style={styles.buildCtaGradient}>
                <View style={styles.ctaContent}>
                  <Hammer size={32} color="#FFFFFF" />
                  <View style={styles.ctaText}>
                    <Text style={styles.ctaTitle}>Build Your Own Workout</Text>
                    <Text style={styles.ctaSubtitle}>Choose exercises by body part and create a custom routine</Text>
                  </View>
                  <ChevronRight size={24} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>
          </>
        ) : null}

        {generatedPlan && (
          <View style={styles.todaysWorkoutSection}>
            {todaysWorkout ? (
              <TouchableOpacity 
                style={styles.todaysWorkoutCard}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  startCustomWorkout(todaysWorkout);
                }}
              >
                <View style={styles.todaysWorkoutGradient}>
                  <View style={styles.todaysWorkoutHeader}>
                    <View style={styles.todaysWorkoutTitleSection}>
                      <Text style={styles.todaysWorkoutLabel}>Today&apos;s Workout</Text>
                      <Text style={styles.todaysWorkoutName}>{todaysWorkout.name}</Text>
                    </View>
                    <Play size={32} color="#FFFFFF" />
                  </View>
                  <View style={styles.todaysWorkoutMeta}>
                    <Text style={styles.todaysWorkoutExercises}>
                      {todaysWorkout.exercises.length} exercises
                    </Text>
                    <Text style={styles.todaysWorkoutDuration}>
                      ~{Math.ceil(todaysWorkout.exercises.length * 12)} min
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.restDayCard}>
                <View style={styles.restDayGradient}>
                  <View style={styles.restDayContent}>
                    <Calendar size={40} color="#9CA3AF" />
                    <View style={styles.restDayText}>
                      <Text style={styles.restDayTitle}>Today is your off day</Text>
                      <Text style={styles.restDaySubtitle}>
                        Rest, recharge, and be ready.
                      </Text>
                      <Text style={styles.nextWorkoutText}>
                        Next workout: {getNextWorkoutDay(generatedPlan)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.viewPlanButton}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setShowCustomPlan(true);
                    }}
                  >
                    <Text style={styles.viewPlanButtonText}>View Plan</Text>
                    <ChevronRight size={16} color="#00ADB5" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {generatedPlan && (
          <TouchableOpacity 
            style={styles.buildWorkoutCTA}
            onPress={() => {
              if (Platform.OS !== 'web') {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              router.push('/workout-builder');
            }}
          >
            <View style={styles.buildCtaGradient}>
              <View style={styles.ctaContent}>
                <Hammer size={32} color="#FFFFFF" />
                <View style={styles.ctaText}>
                  <Text style={styles.ctaTitle}>Build Your Own Workout</Text>
                  <Text style={styles.ctaSubtitle}>Choose exercises by body part and create a custom routine</Text>
                </View>
                <ChevronRight size={24} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Trophy size={24} color="#00ADB5" />
            <Text style={styles.statNumber}>{stats.workoutStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Calendar size={24} color="#00ADB5" />
            <Text style={styles.statNumber}>{stats.weeklyWorkouts}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={24} color="#00ADB5" />
            <Text style={styles.statNumber}>{stats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>



        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Workouts</Text>
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowRecentWorkouts(!showRecentWorkouts);
              }}
            >
              <Text style={styles.toggleButtonText}>
                {showRecentWorkouts ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {showRecentWorkouts && (
            <View>
              {workoutLogs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Dumbbell size={48} color="#9CA3AF" />
                  <Text style={styles.emptyStateText}>No workouts completed yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Create a custom plan to start your first workout
                  </Text>
                </View>
              ) : (
                <View style={styles.recentWorkoutsContainer}>
                  {workoutLogs.slice(0, 5).map((log) => {
                    const workout = workoutPlans.find(w => w.id === log.workoutPlanId);
                    const customWorkout = (global as any).customWorkout;
                    
                    let workoutName = 'Custom Workout';
                    let muscleGroups: string[] = [];
                    
                    if (workout) {
                      workoutName = workout.name;
                      muscleGroups = getTargetedMuscleGroups(workout);
                    } else if (customWorkout && log.workoutPlanId === customWorkout.id) {
                      workoutName = customWorkout.name;
                    } else if (generatedPlan) {
                      const dayMatch = generatedPlan.days.find(d => 
                        log.workoutPlanId.includes(`custom-day-${d.day}`)
                      );
                      if (dayMatch) {
                        workoutName = dayMatch.name;
                      }
                    }
                    
                    const duration = Math.floor(log.duration / 60);
                    const completedExercises = log.exercises.length;
                    const totalSets = log.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
                    
                    return (
                      <View key={log.id} style={styles.recentWorkoutCard}>
                        <View style={styles.recentWorkoutHeader}>
                          <Text style={styles.recentWorkoutName}>{workoutName}</Text>
                          <Text style={styles.recentWorkoutDate}>
                            {new Date(log.date).toLocaleDateString()}
                          </Text>
                        </View>
                        
                        <View style={styles.recentWorkoutStats}>
                          <View style={styles.recentWorkoutStat}>
                            <Text style={styles.recentWorkoutStatValue}>{duration}m</Text>
                            <Text style={styles.recentWorkoutStatLabel}>Duration</Text>
                          </View>
                          <View style={styles.recentWorkoutStat}>
                            <Text style={styles.recentWorkoutStatValue}>{completedExercises}</Text>
                            <Text style={styles.recentWorkoutStatLabel}>Exercises</Text>
                          </View>
                          <View style={styles.recentWorkoutStat}>
                            <Text style={styles.recentWorkoutStatValue}>{totalSets}</Text>
                            <Text style={styles.recentWorkoutStatLabel}>Sets</Text>
                          </View>
                        </View>
                        
                        <View style={styles.recentWorkoutFooter}>
                          <View style={styles.workoutBadges}>
                            {muscleGroups.slice(0, 3).map((muscle) => (
                              <View key={muscle} style={styles.muscleBadge}>
                                <Text style={styles.muscleBadgeText}>{muscle}</Text>
                              </View>
                            ))}
                          </View>
                          <View style={[
                            styles.completionBadge,
                            { backgroundColor: log.completed ? '#00ADB5' : '#F59E0B' }
                          ]}>
                            <Text style={styles.completionBadgeText}>
                              {log.completed ? 'Completed' : 'Partial'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>



      <Modal
        visible={isGeneratingPlan}
        animationType="fade"
        presentationStyle="fullScreen"
        transparent={false}
      >
        <View style={styles.loadingContainer}>
          <View style={styles.loadingGradient}>
            <View style={styles.loadingContent}>
              <Zap size={64} color="#FFFFFF" />
              <Text style={styles.loadingTitle}>Creating Your Plan</Text>
              <Text style={styles.loadingMessage}>
                This might take a second.{"\n"}Thank you for your patience.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showQuiz && !isGeneratingPlan}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={[styles.quizContainer, { paddingTop: insets.top }]}>
          <View style={styles.quizHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                resetQuiz();
              }}
            >
              <X size={24} color="#9CA3AF" />
            </TouchableOpacity>
            <Text style={styles.quizTitle}>Fitness Assessment</Text>
            <View style={styles.quizProgress}>
              <Text style={styles.progressText}>
                {currentQuizStep + 1} / {quizQuestions.length + 1}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.quizContent}>
            {showDaySelector ? (
              <View style={styles.questionContainer}>
                <Text style={styles.questionText}>
                  Select your workout days
                </Text>
                <Text style={styles.daySelectionSubtext}>
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
                          styles.daySelectionButton,
                          isSelected && styles.daySelectionButtonSelected
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
                        <Text style={[
                          styles.daySelectionText,
                          isSelected && styles.daySelectionTextSelected
                        ]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    { opacity: selectedWorkoutDays.length === 0 ? 0.5 : 1 }
                  ]}
                  onPress={() => {
                    if (selectedWorkoutDays.length > 0) {
                      if (Platform.OS !== 'web') {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                      setShowDaySelector(false);
                      if (currentQuizStep < quizQuestions.length - 1) {
                        setCurrentQuizStep(currentQuizStep + 1);
                      } else {
                        setCurrentQuizStep(quizQuestions.length);
                      }
                    }
                  }}
                  disabled={selectedWorkoutDays.length === 0}
                >
                  <Text style={styles.continueButtonText}>Continue</Text>
                  <ChevronRight size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : currentQuizStep < quizQuestions.length ? (
              <View style={styles.questionContainer}>
                <Text style={styles.questionText}>
                  {quizQuestions[currentQuizStep].question}
                </Text>
                <View style={styles.optionsContainer}>
                  {quizQuestions[currentQuizStep].options.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.optionButton}
                      onPress={() => handleQuizAnswer(option)}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                      <ChevronRight size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.quizGoalsContainer}>
                <Text style={styles.questionText}>
                  Tell us about your specific fitness goals
                </Text>
                <Text style={styles.goalsSubtext}>
                  Be as detailed as possible about what you want to achieve, any problem areas you want to focus on, 
                  specific muscles you want to target, or any other preferences that will help us create your perfect plan.
                </Text>
                <TextInput
                  style={styles.goalsInput}
                  multiline
                  numberOfLines={6}
                  placeholder="e.g., I want to build bigger arms and chest, lose belly fat, improve my posture from sitting at a desk all day, and I have a previous knee injury that limits squatting..."
                  placeholderTextColor="#9CA3AF"
                  value={customGoals}
                  onChangeText={setCustomGoals}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[
                    styles.generateButton,
                    { opacity: isGeneratingPlan ? 0.6 : 1 }
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    void generateCustomPlan();
                  }}
                  disabled={isGeneratingPlan}
                >
                  {isGeneratingPlan ? (
                    <Text style={styles.generateButtonText}>Generating Plan...</Text>
                  ) : (
                    <>
                      <Zap size={20} color="#FFFFFF" />
                      <Text style={styles.generateButtonText}>Generate My Plan</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showCustomPlan}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {generatedPlan && (
          <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{generatedPlan.name}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowCustomPlan(false);
                }}
              >
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.planOverview}>
                <Text style={styles.planOverviewText}>{generatedPlan.description}</Text>
              </View>

              {generatedPlan.days.map((day) => (
                <View key={day.day} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayTitle}>Day {day.day}: {day.name}</Text>
                    <View style={styles.dayHeaderRight}>
                      <Text style={styles.exerciseCount}>{day.exercises.length} exercises</Text>
                      <TouchableOpacity
                        style={styles.startDayButton}
                        onPress={() => {
                          if (Platform.OS !== 'web') {
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          }
                          startCustomWorkout(day);
                        }}
                      >
                        <Play size={16} color="#FFFFFF" />
                        <Text style={styles.startDayButtonText}>Start</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {day.exercises.map((exercise, index) => (
                    <View key={index} style={styles.customExerciseCard}>
                      <View style={styles.exerciseHeader}>
                        <Text style={styles.exerciseName}>
                          {index + 1}. {exercise.name}
                        </Text>
                      </View>
                      <View style={styles.exerciseMetaRow}>
                        <Text style={styles.exerciseDetails}>
                          {exercise.sets} sets × {exercise.reps} reps
                        </Text>
                        <Text style={styles.exerciseRest}>
                          Rest: {Math.floor(exercise.restTime / 60)}:{(exercise.restTime % 60).toString().padStart(2, '0')}
                        </Text>
                      </View>
                      <Text style={styles.exerciseEquipment}>
                        Equipment: {exercise.equipment}
                      </Text>
                      <Text style={styles.exerciseDescription}>
                        {exercise.description}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.newPlanButton}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowCustomPlan(false);
                  setShowQuiz(true);
                }}
              >
                <Plus size={20} color="#00ADB5" />
                <Text style={styles.newPlanButtonText}>Create New Plan</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={true}
      >
        <View style={styles.settingsModalOverlay}>
          <View style={[styles.settingsModalContainer, { paddingBottom: insets.bottom }]}>
            <View style={styles.settingsModalHeader}>
              <Text style={styles.settingsModalTitle}>Workout Settings</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowSettings(false);
                }}
              >
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsContent}>
              <TouchableOpacity
                style={styles.settingsOption}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  handleDayAdjustment();
                }}
              >
                <View style={styles.settingsOptionLeft}>
                  <Calendar size={24} color="#00ADB5" />
                  <View style={styles.settingsOptionText}>
                    <Text style={styles.settingsOptionTitle}>Adjust Workout Days</Text>
                    <Text style={styles.settingsOptionSubtitle}>
                      Change which days you want to workout
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsOption}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  retakeQuiz();
                }}
              >
                <View style={styles.settingsOptionLeft}>
                  <Zap size={24} color="#F59E0B" />
                  <View style={styles.settingsOptionText}>
                    <Text style={styles.settingsOptionTitle}>Retake Quiz</Text>
                    <Text style={styles.settingsOptionSubtitle}>
                      Create a completely new workout plan
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDayAdjustment}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Adjust Workout Days</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowDayAdjustment(false);
              }}
            >
              <X size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.dayAdjustmentContainer}>
              <Text style={styles.dayAdjustmentTitle}>
                Select your workout days
              </Text>
              <Text style={styles.dayAdjustmentSubtext}>
                Choose which days of the week you want to workout. Your plan will adapt to your schedule.
              </Text>
              
              <View style={styles.daySelectionContainer}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                  const dayKey = day.toLowerCase();
                  const isSelected = adjustedWorkoutDays.includes(dayKey);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.daySelectionButton,
                        isSelected && styles.daySelectionButtonSelected
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        if (isSelected) {
                          setAdjustedWorkoutDays(prev => prev.filter(d => d !== dayKey));
                        } else {
                          setAdjustedWorkoutDays(prev => [...prev, dayKey]);
                        }
                      }}
                    >
                      <Text style={[
                        styles.daySelectionText,
                        isSelected && styles.daySelectionTextSelected
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.saveDaysButton,
                { opacity: adjustedWorkoutDays.length === 0 ? 0.5 : 1 }
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                saveDayAdjustment();
              }}
              disabled={adjustedWorkoutDays.length === 0}
            >
              <Text style={styles.saveDaysButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0F13",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerContent: {
    marginTop: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  subtitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginTop: 4,
  },
  countdownContainer: {
    alignItems: "center" as const,
    backgroundColor: "rgba(0, 229, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexDirection: "row" as const,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.2)",
  },
  countdownText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#00E5FF",
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#00E5FF",
    fontWeight: "500" as const,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 15,
    marginTop: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
    color: "#F9FAFB",
  },
  statLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 5,
  },
  section: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F9FAFB",
    marginBottom: 15,
  },
  goalsContainer: {
    gap: 15,
  },
  goalCard: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  goalIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  goalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  goalDescription: {
    fontSize: 14,
    color: "#9CA3AF",
    lineHeight: 20,
  },
  workoutsContainer: {
    gap: 15,
  },
  workoutCard: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F9FAFB",
    flex: 1,
  },
  workoutMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  workoutDuration: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  workoutExerciseCount: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 15,
  },
  workoutFooter: {
    alignItems: "flex-end",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 5,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#0D0F13",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#171B22",
    borderBottomWidth: 1,
    borderBottomColor: "#0D0F13",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F9FAFB",
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  workoutInfo: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    gap: 15,
  },
  workoutInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  workoutInfoText: {
    fontSize: 16,
    color: "#F9FAFB",
  },
  exercisesTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F9FAFB",
    marginTop: 25,
    marginBottom: 15,
  },
  exercisePreview: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
    flex: 1,
  },
  videoButton: {
    padding: 5,
  },
  exerciseDetails: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  exerciseRest: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  exerciseEquipment: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  modalFooter: {
    padding: 20,
    backgroundColor: "#171B22",
    borderTopWidth: 1,
    borderTopColor: "#0D0F13",
  },
  startWorkoutButton: {
    backgroundColor: "#00ADB5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 25,
    gap: 10,
  },
  startWorkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#171B22",
    borderRadius: 15,
  },
  toggleButtonText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  recentWorkoutsContainer: {
    gap: 15,
  },
  recentWorkoutCard: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  recentWorkoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  recentWorkoutName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
    flex: 1,
  },
  recentWorkoutDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  recentWorkoutStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  recentWorkoutStat: {
    alignItems: "center",
  },
  recentWorkoutStatValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#F9FAFB",
  },
  recentWorkoutStatLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  recentWorkoutFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  workoutBadges: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
  },
  muscleBadge: {
    backgroundColor: "#0D0F13",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  muscleBadgeText: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  completionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  completionBadgeText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  workoutInfoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
  },
  workoutMetaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  difficultyBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  difficultyBadgeText: {
    fontSize: 12,
    color: "#92400E",
    fontWeight: "600",
  },
  muscleGroupsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
    justifyContent: "flex-end",
  },
  muscleGroupBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  muscleGroupBadgeText: {
    fontSize: 10,
    color: "#7C3AED",
    fontWeight: "500",
  },
  exerciseMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  exerciseDescription: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginTop: 4,
  },
  customPlanCTA: {
    marginTop: 30,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaGradient: {
    padding: 20,
    backgroundColor: "#00ADB5",
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  ctaText: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  generatedPlanCard: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 20,
    marginTop: 30,
    borderLeftWidth: 4,
    borderLeftColor: "#00ADB5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F9FAFB",
  },
  planDescription: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 8,
    lineHeight: 20,
  },
  planDays: {
    fontSize: 12,
    color: "#00ADB5",
    fontWeight: "600",
  },
  quizContainer: {
    flex: 1,
    backgroundColor: "#0D0F13",
  },
  quizHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#171B22",
    borderBottomWidth: 1,
    borderBottomColor: "#0D0F13",
  },
  quizTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F9FAFB",
  },
  quizProgress: {
    backgroundColor: "#0D0F13",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  progressText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  quizContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  questionContainer: {
    marginTop: 30,
  },
  questionText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F9FAFB",
    marginBottom: 30,
    lineHeight: 32,
  },
  optionsContainer: {
    gap: 15,
  },
  optionButton: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  optionText: {
    fontSize: 16,
    color: "#F9FAFB",
    flex: 1,
  },
  quizGoalsContainer: {
    marginTop: 30,
  },
  goalsSubtext: {
    fontSize: 16,
    color: "#9CA3AF",
    marginBottom: 20,
    lineHeight: 24,
  },
  goalsInput: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 20,
    fontSize: 16,
    color: "#F9FAFB",
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#0D0F13",
    marginBottom: 30,
  },
  generateButton: {
    backgroundColor: "#00ADB5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 25,
    gap: 10,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  planOverview: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  planOverviewText: {
    fontSize: 16,
    color: "#9CA3AF",
    lineHeight: 24,
  },
  dayCard: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#0D0F13",
    flexWrap: "nowrap",
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F9FAFB",
    flex: 1,
    marginRight: 10,
  },
  exerciseCount: {
    fontSize: 12,
    color: "#9CA3AF",
    backgroundColor: "#0D0F13",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    textAlign: "center",
    minWidth: 80,
  },
  customExerciseCard: {
    backgroundColor: "#0D0F13",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  newPlanButton: {
    backgroundColor: "#171B22",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 25,
    gap: 10,
    borderWidth: 2,
    borderColor: "#00ADB5",
  },
  newPlanButtonText: {
    color: "#00ADB5",
    fontSize: 16,
    fontWeight: "600",
  },
  dayHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  startDayButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00ADB5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 5,
  },
  startDayButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  daySelectionSubtext: {
    fontSize: 16,
    color: "#9CA3AF",
    marginBottom: 20,
    lineHeight: 24,
  },
  daySelectionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 30,
  },
  daySelectionButton: {
    backgroundColor: "#171B22",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#0D0F13",
    minWidth: 100,
    alignItems: "center",
  },
  daySelectionButtonSelected: {
    backgroundColor: "#00ADB5",
    borderColor: "#00ADB5",
  },
  daySelectionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  daySelectionTextSelected: {
    color: "#FFFFFF",
  },
  continueButton: {
    backgroundColor: "#00ADB5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 25,
    gap: 10,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  todaysWorkoutSection: {
    marginTop: 30,
  },
  todaysWorkoutCard: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  todaysWorkoutGradient: {
    padding: 20,
    backgroundColor: "#00ADB5",
  },
  todaysWorkoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  todaysWorkoutTitleSection: {
    flex: 1,
  },
  todaysWorkoutLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 4,
  },
  todaysWorkoutName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  todaysWorkoutMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  todaysWorkoutExercises: {
    fontSize: 16,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  todaysWorkoutDuration: {
    fontSize: 16,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  restDayCard: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  restDayGradient: {
    padding: 20,
    backgroundColor: "#171B22",
  },
  restDayContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 15,
  },
  restDayText: {
    flex: 1,
  },
  restDayTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  restDaySubtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginBottom: 8,
  },
  nextWorkoutText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  viewPlanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  viewPlanButtonText: {
    fontSize: 16,
    color: "#00ADB5",
    fontWeight: "600",
  },
  settingsButton: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#171B22",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  settingsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  settingsModalContainer: {
    backgroundColor: "#171B22",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: "50%",
  },
  settingsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#0D0F13",
  },
  settingsModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F9FAFB",
  },
  settingsContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  settingsOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#0D0F13",
  },
  settingsOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    flex: 1,
  },
  settingsOptionText: {
    flex: 1,
  },
  settingsOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 2,
  },
  settingsOptionSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  dayAdjustmentContainer: {
    paddingTop: 20,
  },
  dayAdjustmentTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F9FAFB",
    marginBottom: 10,
  },
  dayAdjustmentSubtext: {
    fontSize: 16,
    color: "#9CA3AF",
    marginBottom: 30,
    lineHeight: 24,
  },
  saveDaysButton: {
    backgroundColor: "#00ADB5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 25,
  },
  saveDaysButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#00ADB5",
  },
  loadingContent: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 30,
    marginBottom: 20,
    textAlign: "center",
  },
  loadingMessage: {
    fontSize: 18,
    color: "#FFFFFF",
    opacity: 0.9,
    textAlign: "center",
    lineHeight: 28,
  },
  buildWorkoutCTA: {
    marginTop: 15,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buildCtaGradient: {
    padding: 20,
    backgroundColor: "#6366F1",
  },
});
