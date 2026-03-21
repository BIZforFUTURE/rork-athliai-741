import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Animated,
  RefreshControl,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { 
  Dumbbell, 
  Clock, 
  Play, 
  TrendingUp,
  Calendar,
  X,
  ChevronRight,
  Zap,
  Settings,
  Hammer,
  Target,
  Activity,
  Sparkles,
  Check,
  Flame,
  ArrowRight,
  RotateCcw,
  Moon,
  Sun,
} from "lucide-react-native";
import { useApp } from "@/providers/AppProvider";
import { useRevenueCat } from "@/providers/RevenueCatProvider";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { workoutPlans, WorkoutPlan, getTargetedMuscleGroups } from "@/constants/workouts";
import { getVideoUrlForExercise } from "@/utils/videoUrls";

interface QuizAnswer {
  question: string;
  answer: string;
}

const GYM_LOADING_STEPS = [
  { label: 'Analyzing your goals', icon: Target },
  { label: 'Selecting exercises', icon: Dumbbell },
  { label: 'Optimizing sets & reps', icon: Activity },
  { label: 'Building your schedule', icon: Calendar },
  { label: 'Finalizing your plan', icon: Sparkles },
];

const GYM_TIPS = [
  "Progressive overload is the #1 driver of muscle growth — aim to increase weight or reps each week.",
  "Sleep 7-9 hours per night. Your muscles grow during recovery, not during the workout.",
  "Protein timing matters less than total daily intake. Aim for 0.7-1g per pound of bodyweight.",
  "Compound movements like squats and deadlifts recruit more muscle fibers than isolation exercises.",
  "Consistency beats intensity. Showing up 4x a week at 80% effort outperforms 1x at 100%.",
  "Rest periods of 2-3 min for strength, 60-90s for hypertrophy, and 30-45s for endurance.",
  "Warming up with dynamic stretches reduces injury risk by up to 30%.",
  "Mind-muscle connection is real — focusing on the target muscle improves activation by 20%.",
  "Creatine monohydrate is the most researched and effective supplement for strength gains.",
  "Drinking water before meals can reduce calorie intake by up to 13%.",
];

const RECOVERY_QUOTES = [
  "Muscles grow during rest, not during the workout.",
  "Recovery is where the magic happens.",
  "Rest today, conquer tomorrow.",
  "Your body repairs and strengthens between sessions.",
  "Quality rest = quality gains.",
  "Sleep is the most powerful recovery tool you have.",
  "Active recovery: stretch, walk, hydrate.",
  "Overtraining kills progress. Rest is strategic.",
  "Let your nervous system recharge fully.",
  "Foam rolling and mobility work on rest days pay dividends.",
];

const WEEK_DAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEK_DAYS_FULL = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function GymLoadingScreen() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const tipOpacity = useRef(new Animated.Value(1)).current;
  const tipTranslateY = useRef(new Animated.Value(0)).current;
  const [currentTipIndex, setCurrentTipIndex] = useState(() => Math.floor(Math.random() * GYM_TIPS.length));
  const [activeStep, setActiveStep] = useState(0);
  const [fakeProgress, setFakeProgress] = useState(0);
  const stepAnims = useRef(GYM_LOADING_STEPS.map(() => new Animated.Value(0))).current;
  const stepScaleAnims = useRef(GYM_LOADING_STEPS.map(() => new Animated.Value(0.8))).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setFakeProgress(prev => {
        if (prev >= 0.95) {
          clearInterval(interval);
          return prev;
        }
        const increment = prev < 0.3 ? 0.04 : prev < 0.6 ? 0.025 : prev < 0.85 ? 0.015 : 0.005;
        return Math.min(prev + increment + Math.random() * 0.02, 0.95);
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const stepIndex = Math.min(Math.floor(fakeProgress * GYM_LOADING_STEPS.length), GYM_LOADING_STEPS.length - 1);
    if (stepIndex !== activeStep) {
      setActiveStep(stepIndex);
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [fakeProgress, activeStep]);

  useEffect(() => {
    GYM_LOADING_STEPS.forEach((_, index) => {
      if (index <= activeStep) {
        Animated.parallel([
          Animated.timing(stepAnims[index], {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(stepScaleAnims[index], {
            toValue: 1,
            friction: 6,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  }, [activeStep, stepAnims, stepScaleAnims]);

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(tipOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(tipTranslateY, { toValue: -12, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setCurrentTipIndex(prev => (prev + 1) % GYM_TIPS.length);
        tipTranslateY.setValue(12);
        Animated.parallel([
          Animated.timing(tipOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(tipTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [tipOpacity, tipTranslateY]);

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 2500, useNativeDriver: true })
    );
    pulseAnimation.start();
    rotateAnimation.start();
    return () => { pulseAnimation.stop(); rotateAnimation.stop(); };
  }, [pulseAnim, rotateAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: fakeProgress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [fakeProgress, progressAnim]);

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const percentText = Math.round(fakeProgress * 100);

  return (
    <View style={styles.loadingContainer}>
      <ScrollView
        contentContainerStyle={styles.loadingScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.loadingTopSection}>
          <View style={styles.loadingIconArea}>
            <Animated.View style={[styles.loadingRing, { transform: [{ rotate }] }]}>
              <View style={styles.loadingRingInner} />
            </Animated.View>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={styles.loadingIconCircle}>
                <Dumbbell size={44} color="#00ADB5" strokeWidth={2.5} />
              </View>
            </Animated.View>
          </View>

          <Text style={styles.loadingTitle}>Building Your Plan</Text>
          <Text style={styles.loadingPercent}>{percentText}%</Text>

          <View style={styles.loadingProgressBarContainer}>
            <View style={styles.loadingProgressBarBg}>
              <Animated.View style={[styles.loadingProgressBarFill, { width: progressWidth }]} />
            </View>
          </View>
        </View>

        <View style={styles.loadingStepsContainer}>
          {GYM_LOADING_STEPS.map((step, index) => {
            const IconComponent = step.icon;
            const isActive = index === activeStep;
            const isComplete = index < activeStep;
            return (
              <Animated.View
                key={step.label}
                style={[
                  styles.loadingStepRow,
                  {
                    opacity: stepAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                    transform: [{ scale: stepScaleAnims[index] }],
                  },
                ]}
              >
                <View style={[
                  styles.loadingStepDot,
                  isComplete && styles.loadingStepDotComplete,
                  isActive && styles.loadingStepDotActive,
                ]}>
                  {isComplete ? (
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  ) : (
                    <IconComponent size={14} color={isActive ? '#00ADB5' : '#6B7280'} />
                  )}
                </View>
                <Text style={[
                  styles.loadingStepLabel,
                  isActive && styles.loadingStepLabelActive,
                  isComplete && styles.loadingStepLabelComplete,
                ]}>
                  {step.label}
                </Text>
                {isActive && (
                  <View style={styles.loadingStepPulse} />
                )}
              </Animated.View>
            );
          })}
        </View>

        <View style={styles.loadingTipCard}>
          <View style={styles.loadingTipHeader}>
            <Sparkles size={14} color="#00ADB5" />
            <Text style={styles.loadingTipHeaderText}>DID YOU KNOW?</Text>
          </View>
          <Animated.Text
            style={[
              styles.loadingTipText,
              { opacity: tipOpacity, transform: [{ translateY: tipTranslateY }] },
            ]}
          >
            {GYM_TIPS[currentTipIndex]}
          </Animated.Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
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

function WeekDayIndicator({ workoutDays }: { workoutDays: string[] }) {
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  return (
    <View style={styles.weekDayRow}>
      {WEEK_DAYS_SHORT.map((letter, i) => {
        const isWorkoutDay = workoutDays.includes(WEEK_DAYS_FULL[i]);
        const isToday = i === todayIndex;
        return (
          <View
            key={`${letter}-${i}`}
            style={[
              styles.weekDayDot,
              isWorkoutDay && styles.weekDayDotActive,
              isToday && styles.weekDayDotToday,
            ]}
          >
            <Text style={[
              styles.weekDayLetter,
              isWorkoutDay && styles.weekDayLetterActive,
              isToday && styles.weekDayLetterToday,
            ]}>
              {letter}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function RestDayCard({ hasCompletedToday, nextWorkoutDay, onViewPlan }: {
  hasCompletedToday: boolean;
  nextWorkoutDay: string;
  onViewPlan: () => void;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const quoteIndex = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return dayOfYear % RECOVERY_QUOTES.length;
  }, []);

  useEffect(() => {
    if (hasCompletedToday) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim, hasCompletedToday]);

  return (
    <View style={styles.restDayCard}>
      <LinearGradient
        colors={['rgba(15, 23, 42, 0.95)', 'rgba(15, 30, 50, 0.98)']}
        style={styles.restDayGradient}
      >
        <View style={styles.restDayStars}>
          {[12, 45, 78, 120, 160, 200, 240, 30, 90, 150, 210, 260].map((left, i) => (
            <View
              key={i}
              style={[
                styles.restDayStar,
                {
                  left: left,
                  top: 8 + (i * 7) % 40,
                  opacity: 0.15 + (i % 3) * 0.12,
                  width: i % 3 === 0 ? 3 : 2,
                  height: i % 3 === 0 ? 3 : 2,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.restDayInner}>
          <View style={styles.restDayIconWrap}>
            {hasCompletedToday ? (
              <View style={[styles.restDayIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Check size={28} color="#10B981" strokeWidth={2.5} />
              </View>
            ) : (
              <Animated.View
                style={[
                  styles.restDayIconCircle,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Moon size={28} color="#7DD3FC" />
              </Animated.View>
            )}
          </View>
          <View style={styles.restDayTextBlock}>
            <Text style={styles.restDayTitle}>
              {hasCompletedToday ? "Workout Complete" : "Rest Day"}
            </Text>
            <Text style={styles.restDayQuote}>
              {hasCompletedToday
                ? "Great job today! Recovery starts now."
                : `"${RECOVERY_QUOTES[quoteIndex]}"`}
            </Text>
            <View style={styles.restDayNextRow}>
              <Calendar size={13} color="#38BDF8" />
              <Text style={styles.nextWorkoutText}>
                Next workout: {nextWorkoutDay}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
      <TouchableOpacity
        style={styles.viewPlanButton}
        activeOpacity={0.7}
        onPress={onViewPlan}
      >
        <Text style={styles.viewPlanButtonText}>View Full Plan</Text>
        <ChevronRight size={16} color="#38BDF8" />
      </TouchableOpacity>
    </View>
  );
}

function AnimatedStatCard({ icon: Icon, value, label, delay, color }: {
  icon: React.ComponentType<any>;
  value: number;
  label: string;
  delay: number;
  color: string;
}) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
        delay,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim, delay]);

  return (
    <Animated.View style={[
      styles.statCard,
      { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
    ]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}15` }]}>
        <Icon size={18} color={color} strokeWidth={2.5} />
      </View>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

export default function GymScreen() {
  const { stats, workoutLogs, customWorkoutPlan, updateCustomWorkoutPlan } = useApp();
  const { isPremium } = useRevenueCat();
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
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(heroSlide, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [heroFade, heroSlide]);

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
          { name: "Bench Press", sets: fitnessLevel.includes('Beginner') ? 3 : 4, reps: primaryGoal.includes('strength') ? "4-6" : "8-12", restTime: primaryGoal.includes('strength') ? 180 : 90, equipment: equipment.includes('bodyweight') ? "Push-ups" : "Barbell/Dumbbells", description: "Keep your core tight and lower the weight with control. Press up explosively." },
          { name: "Overhead Press", sets: 3, reps: "8-10", restTime: 90, equipment: equipment.includes('bodyweight') ? "Pike Push-ups" : "Dumbbells", description: "Press straight up, keeping your core engaged. Don't arch your back excessively." },
          { name: "Dips", sets: 3, reps: "8-15", restTime: 60, equipment: equipment.includes('bodyweight') ? "Chair/Bench Dips" : "Dip Station", description: "Lower until your shoulders are below your elbows, then press up strongly." },
          { name: "Tricep Extensions", sets: 3, reps: "10-15", restTime: 60, equipment: equipment.includes('bodyweight') ? "Diamond Push-ups" : "Dumbbells", description: "Keep your elbows stationary and focus on the tricep contraction." }
        ]
      },
      {
        day: 2,
        name: "Lower Body Power",
        exercises: [
          { name: "Squats", sets: fitnessLevel.includes('Beginner') ? 3 : 4, reps: primaryGoal.includes('strength') ? "4-6" : "8-12", restTime: primaryGoal.includes('strength') ? 180 : 90, equipment: equipment.includes('bodyweight') ? "Bodyweight Squats" : "Barbell/Dumbbells", description: "Keep your chest up, knees tracking over toes. Go down until thighs are parallel." },
          { name: "Romanian Deadlifts", sets: 3, reps: "8-10", restTime: 90, equipment: equipment.includes('bodyweight') ? "Single Leg RDL" : "Dumbbells", description: "Hinge at the hips, keep the bar close to your body. Feel the stretch in your hamstrings." },
          { name: "Lunges", sets: 3, reps: "10-12 each leg", restTime: 60, equipment: equipment.includes('bodyweight') ? "Bodyweight Lunges" : "Dumbbells", description: "Step forward and lower until both knees are at 90 degrees. Push back to start." },
          { name: "Calf Raises", sets: 3, reps: "15-20", restTime: 45, equipment: "Bodyweight or Dumbbells", description: "Rise up on your toes, squeeze at the top, then lower with control." }
        ]
      },
      {
        day: 3,
        name: "Upper Body Pull",
        exercises: [
          { name: "Pull-ups/Rows", sets: fitnessLevel.includes('Beginner') ? 3 : 4, reps: equipment.includes('bodyweight') ? "5-10" : "8-12", restTime: 90, equipment: equipment.includes('bodyweight') ? "Pull-ups/Inverted Rows" : "Lat Pulldown", description: "Pull your chest to the bar/handle. Squeeze your shoulder blades together." },
          { name: "Bent Over Rows", sets: 3, reps: "8-12", restTime: 90, equipment: equipment.includes('bodyweight') ? "Inverted Rows" : "Dumbbells", description: "Keep your back straight, pull the weight to your lower chest/upper abdomen." },
          { name: "Face Pulls", sets: 3, reps: "12-15", restTime: 60, equipment: equipment.includes('bodyweight') ? "Reverse Fly" : "Resistance Band", description: "Pull to your face level, focusing on rear deltoids and upper back." },
          { name: "Bicep Curls", sets: 3, reps: "10-15", restTime: 60, equipment: equipment.includes('bodyweight') ? "Chin-ups" : "Dumbbells", description: "Keep your elbows at your sides, curl with control and squeeze at the top." }
        ]
      },
      {
        day: 4,
        name: "Lower Body Hypertrophy",
        exercises: [
          { name: "Goblet Squats", sets: 3, reps: "12-15", restTime: 60, equipment: equipment.includes('bodyweight') ? "Bodyweight Squats" : "Dumbbell", description: "Hold weight at chest level, squat down keeping your torso upright." },
          { name: "Bulgarian Split Squats", sets: 3, reps: "10-12 each leg", restTime: 60, equipment: equipment.includes('bodyweight') ? "Bodyweight" : "Dumbbells", description: "Rear foot elevated, lower into lunge position. Focus on front leg." },
          { name: "Hip Thrusts", sets: 3, reps: "12-15", restTime: 60, equipment: equipment.includes('bodyweight') ? "Bodyweight" : "Dumbbell", description: "Drive through your heels, squeeze glutes at the top. Keep core tight." },
          { name: "Wall Sit", sets: 3, reps: "30-60 seconds", restTime: 60, equipment: "Bodyweight", description: "Back against wall, thighs parallel to ground. Hold the position." }
        ]
      },
      {
        day: 5,
        name: "Full Body Circuit",
        exercises: [
          { name: "Burpees", sets: 3, reps: "8-12", restTime: 60, equipment: "Bodyweight", description: "Drop down, jump back, push-up, jump forward, jump up. Keep it explosive." },
          { name: "Mountain Climbers", sets: 3, reps: "20-30", restTime: 45, equipment: "Bodyweight", description: "In plank position, alternate bringing knees to chest rapidly." },
          { name: "Plank", sets: 3, reps: "30-60 seconds", restTime: 60, equipment: "Bodyweight", description: "Hold straight line from head to heels. Keep core tight, breathe normally." },
          { name: "Jumping Jacks", sets: 3, reps: "20-30", restTime: 45, equipment: "Bodyweight", description: "Jump feet apart while raising arms overhead, then return to start." }
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
        .trim();
      
      const firstBrace = cleanedResponse.indexOf('{');
      const lastBrace = cleanedResponse.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('No valid JSON found in AI response');
      }
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
      
      console.log('Cleaned JSON length:', cleanedResponse.length);
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

        const safeDays = Array.isArray(planData.days) ? planData.days.map((day: any, idx: number) => ({
          day: day.day ?? idx + 1,
          name: day.name ?? `Day ${idx + 1}`,
          exercises: Array.isArray(day.exercises) ? day.exercises.map((ex: any) => ({
            name: ex.name ?? 'Exercise',
            sets: typeof ex.sets === 'number' ? ex.sets : 3,
            reps: ex.reps ?? '8-12',
            restTime: typeof ex.restTime === 'number' ? ex.restTime : 90,
            videoUrl: ex.videoUrl ?? getVideoUrlForExercise(ex.name ?? ''),
            equipment: ex.equipment ?? 'Bodyweight',
            description: ex.description ?? '',
          })) : [],
        })) : [];

        if (safeDays.length === 0) {
          throw new Error('Plan has no workout days');
        }

        const enhancedPlan: CustomWorkoutPlan = {
          id: planData.id ?? `ai-plan-${Date.now()}`,
          name: planData.name ?? 'Custom Training Plan',
          description: planData.description ?? 'A personalized workout plan.',
          workoutDays,
          days: safeDays,
        };

        console.log('Enhanced plan created:', enhancedPlan.name, 'with', enhancedPlan.days.length, 'days');
          
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

  const resetQuiz = () => {
    setCurrentQuizStep(0);
    setQuizAnswers([]);
    setCustomGoals('');
    setSelectedWorkoutDays([]);
    setShowDaySelector(false);
    setShowQuiz(false);
  };

  const getTodaysWorkout = useCallback((plan: CustomWorkoutPlan): CustomWorkoutPlan['days'][0] | null => {
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
  }, [workoutLogs]);

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
  }, [generatedPlan, workoutLogs, getTodaysWorkout]);

  React.useEffect(() => {
    if (customWorkoutPlan && !generatedPlan) {
      setGeneratedPlan(customWorkoutPlan);
      setTodaysWorkout(getTodaysWorkout(customWorkoutPlan));
    }
  }, [customWorkoutPlan, generatedPlan, getTodaysWorkout]);

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
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    const customWorkoutPlanData: WorkoutPlan = {
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

    (global as any).customWorkout = customWorkoutPlanData;
    
    setShowCustomPlan(false);
    router.push({
      pathname: "/workout/[id]" as any,
      params: { id: customWorkoutPlanData.id }
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
    Alert.alert(
      'Retake Quiz?',
      'This will replace your current workout plan with a new one. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retake',
          style: 'destructive',
          onPress: () => {
            setShowSettings(false);
            resetQuiz();
            setShowQuiz(true);
          },
        },
      ]
    );
  };

  const hasCompletedToday = workoutLogs.some(log => {
    const logDate = new Date(log.date).toDateString();
    return logDate === new Date().toDateString() && log.completed;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#0D0F13', '#111520', '#0D0F13']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={[styles.headerContent, { opacity: heroFade, transform: [{ translateY: heroSlide }] }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Gym</Text>
              <View style={styles.subtitleRow}>
                {todaysWorkout ? (
                  <View style={styles.statusBadge}>
                    <Flame size={12} color="#FF6B35" />
                    <Text style={styles.statusBadgeText}>Ready to train</Text>
                  </View>
                ) : generatedPlan ? (
                  hasCompletedToday ? (
                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.25)' }]}>
                      <Check size={12} color="#10B981" strokeWidth={3} />
                      <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>Done for today</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(148, 163, 184, 0.1)', borderColor: 'rgba(148, 163, 184, 0.2)' }]}>
                      <Moon size={12} color="#94A3B8" />
                      <Text style={[styles.statusBadgeText, { color: '#94A3B8' }]}>Rest day</Text>
                    </View>
                  )
                ) : (
                  <Text style={styles.headerSubtitle}>Get started</Text>
                )}
              </View>
            </View>
            <View style={styles.headerRight}>
              {generatedPlan && (
                <View style={styles.timerPill}>
                  <Clock size={11} color="#00E5FF" />
                  <Text style={styles.timerText}>{timeRemaining}</Text>
                </View>
              )}
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
                  <Settings size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {generatedPlan && (
            <WeekDayIndicator workoutDays={generatedPlan.workoutDays} />
          )}
        </Animated.View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00ADB5"
            colors={["#00ADB5"]}
            progressBackgroundColor="#1A1D24"
          />
        }
      >
        {!generatedPlan ? (
          <>
            <TouchableOpacity 
              style={styles.customPlanCTA}
              activeOpacity={0.85}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                setShowQuiz(true);
              }}
            >
              <LinearGradient
                colors={['#00ADB5', '#0891B2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradientBg}
              >
                <View style={styles.ctaIconWrap}>
                  <Zap size={28} color="#FFFFFF" strokeWidth={2.5} />
                </View>
                <View style={styles.ctaTextBlock}>
                  <Text style={styles.ctaTitle}>Get Your Custom Plan</Text>
                  <Text style={styles.ctaSubtitle}>Take a quick quiz for a personalized workout</Text>
                </View>
                <View style={styles.ctaArrow}>
                  <ArrowRight size={20} color="rgba(255,255,255,0.7)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.buildWorkoutCTA}
              activeOpacity={0.85}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                if (!isPremium) {
                  router.push('/paywall');
                  return;
                }
                router.push('/workout-builder');
              }}
            >
              <LinearGradient
                colors={['#6366F1', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradientBg}
              >
                <View style={styles.ctaIconWrap}>
                  <Hammer size={28} color="#FFFFFF" strokeWidth={2.5} />
                </View>
                <View style={styles.ctaTextBlock}>
                  <Text style={styles.ctaTitle}>Build Your Own Workout</Text>
                  <Text style={styles.ctaSubtitle}>Choose exercises and create a custom routine</Text>
                </View>
                <View style={styles.ctaArrow}>
                  <ArrowRight size={20} color="rgba(255,255,255,0.7)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : null}

        {generatedPlan && (
          <View style={styles.todaysWorkoutSection}>
            {todaysWorkout ? (
              <TouchableOpacity 
                style={styles.todaysWorkoutCard}
                activeOpacity={0.9}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  startCustomWorkout(todaysWorkout);
                }}
              >
                <LinearGradient
                  colors={['#00ADB5', '#0E7490']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.todaysWorkoutGradient}
                >
                  <View style={styles.todaysLabel}>
                    <Sun size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.todaysLabelText}>TODAY&apos;S WORKOUT</Text>
                  </View>
                  <Text style={styles.todaysWorkoutName}>{todaysWorkout.name}</Text>
                  <View style={styles.todaysWorkoutMeta}>
                    <View style={styles.todayMetaPill}>
                      <Dumbbell size={13} color="rgba(255,255,255,0.85)" />
                      <Text style={styles.todayMetaText}>{todaysWorkout.exercises.length} exercises</Text>
                    </View>
                    <View style={styles.todayMetaPill}>
                      <Clock size={13} color="rgba(255,255,255,0.85)" />
                      <Text style={styles.todayMetaText}>~{Math.ceil(todaysWorkout.exercises.length * 12)} min</Text>
                    </View>
                  </View>
                  <View style={styles.todayStartRow}>
                    <View style={styles.todayStartBtn}>
                      <Play size={16} color="#0E7490" fill="#0E7490" />
                      <Text style={styles.todayStartText}>Start Workout</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <RestDayCard
                hasCompletedToday={hasCompletedToday}
                nextWorkoutDay={getNextWorkoutDay(generatedPlan)}
                onViewPlan={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowCustomPlan(true);
                }}
              />
            )}
          </View>
        )}

        {generatedPlan && (
          <TouchableOpacity 
            style={styles.buildWorkoutCTASmall}
            activeOpacity={0.85}
            onPress={() => {
              if (Platform.OS !== 'web') {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              if (!isPremium) {
                router.push('/paywall');
                return;
              }
              router.push('/workout-builder');
            }}
          >
            <View style={styles.buildSmallInner}>
              <View style={styles.buildSmallIcon}>
                <Hammer size={18} color="#6366F1" />
              </View>
              <View style={styles.buildSmallText}>
                <Text style={styles.buildSmallTitle}>Build Custom Workout</Text>
                <Text style={styles.buildSmallSub}>Pick exercises by body part</Text>
              </View>
              <ChevronRight size={18} color="#4B5563" />
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.statsContainer}>
          <AnimatedStatCard icon={Flame} value={stats.workoutStreak} label="Streak" delay={0} color="#FF6B35" />
          <AnimatedStatCard icon={Calendar} value={stats.weeklyWorkouts} label="This Week" delay={80} color="#00ADB5" />
          <AnimatedStatCard icon={TrendingUp} value={stats.totalWorkouts} label="Total" delay={160} color="#8B5CF6" />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Workouts</Text>
            <TouchableOpacity 
              style={styles.toggleButton}
              activeOpacity={0.7}
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
                  <View style={styles.emptyIconWrap}>
                    <Dumbbell size={36} color="#4B5563" />
                  </View>
                  <Text style={styles.emptyStateText}>No workouts yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Start your first workout to see it here
                  </Text>
                </View>
              ) : (
                <View style={styles.recentWorkoutsContainer}>
                  {workoutLogs.slice(0, 5).map((log) => {
                    const workout = workoutPlans.find(w => w.id === log.workoutPlanId);
                    const customWorkout = (global as any).customWorkout;
                    
                    let workoutName = 'Custom Workout';
                    let _muscleGroups: string[] = [];
                    
                    if (workout) {
                      workoutName = workout.name;
                      _muscleGroups = getTargetedMuscleGroups(workout);
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
                        <View style={styles.recentWorkoutLeft}>
                          <View style={[
                            styles.recentWorkoutIndicator,
                            { backgroundColor: log.completed ? '#00ADB5' : '#F59E0B' }
                          ]} />
                          <View style={styles.recentWorkoutInfo}>
                            <Text style={styles.recentWorkoutName} numberOfLines={1}>{workoutName}</Text>
                            <Text style={styles.recentWorkoutDate}>
                              {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.recentWorkoutMetrics}>
                          <View style={styles.recentMetric}>
                            <Text style={styles.recentMetricValue}>{duration}m</Text>
                            <Text style={styles.recentMetricLabel}>Time</Text>
                          </View>
                          <View style={styles.recentMetricDivider} />
                          <View style={styles.recentMetric}>
                            <Text style={styles.recentMetricValue}>{completedExercises}</Text>
                            <Text style={styles.recentMetricLabel}>Exer</Text>
                          </View>
                          <View style={styles.recentMetricDivider} />
                          <View style={styles.recentMetric}>
                            <Text style={styles.recentMetricValue}>{totalSets}</Text>
                            <Text style={styles.recentMetricLabel}>Sets</Text>
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
        <GymLoadingScreen />
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

          <View style={styles.quizProgressBar}>
            <View style={[styles.quizProgressFill, { width: `${((currentQuizStep + 1) / (quizQuestions.length + 1)) * 100}%` }]} />
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
                        activeOpacity={0.7}
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
                        {isSelected && (
                          <Check size={16} color="#FFFFFF" strokeWidth={3} />
                        )}
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
                      activeOpacity={0.7}
                      onPress={() => handleQuizAnswer(option)}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                      <ChevronRight size={20} color="#4B5563" />
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
                  placeholder="e.g., I want to build bigger arms and chest, lose belly fat, improve my posture..."
                  placeholderTextColor="#4B5563"
                  value={customGoals}
                  onChangeText={setCustomGoals}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[
                    styles.generateButton,
                    { opacity: isGeneratingPlan ? 0.6 : 1 }
                  ]}
                  activeOpacity={0.8}
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
              <View>
                <Text style={styles.modalTitle}>{generatedPlan.name}</Text>
                <Text style={styles.modalSubtitle}>{generatedPlan.days.length} day program</Text>
              </View>
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

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.planOverview}>
                <Text style={styles.planOverviewText}>{generatedPlan.description}</Text>
              </View>

              {generatedPlan.days.map((day) => (
                <View key={day.day} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayNumberBadge}>
                      <Text style={styles.dayNumberText}>{day.day}</Text>
                    </View>
                    <View style={styles.dayTitleBlock}>
                      <Text style={styles.dayTitle}>{day.name}</Text>
                      <Text style={styles.exerciseCount}>{day.exercises.length} exercises</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.startDayButton}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (Platform.OS !== 'web') {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                        startCustomWorkout(day);
                      }}
                    >
                      <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  
                  {day.exercises.map((exercise, index) => (
                    <View key={index} style={styles.customExerciseCard}>
                      <View style={styles.exerciseNameRow}>
                        <View style={styles.exerciseIndex}>
                          <Text style={styles.exerciseIndexText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                      </View>
                      <View style={styles.exerciseMetaRow}>
                        <View style={styles.exerciseMetaPill}>
                          <Text style={styles.exerciseMetaPillText}>{exercise.sets} x {exercise.reps}</Text>
                        </View>
                        <View style={styles.exerciseMetaPill}>
                          <Text style={styles.exerciseMetaPillText}>
                            Rest {Math.floor(exercise.restTime / 60)}:{(exercise.restTime % 60).toString().padStart(2, '0')}
                          </Text>
                        </View>
                        <View style={styles.exerciseMetaPill}>
                          <Text style={styles.exerciseMetaPillText}>{exercise.equipment}</Text>
                        </View>
                      </View>
                      {exercise.description ? (
                        <Text style={styles.exerciseDescription}>{exercise.description}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))}

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.newPlanButton}
                activeOpacity={0.7}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowCustomPlan(false);
                  setShowQuiz(true);
                }}
              >
                <RotateCcw size={18} color="#9CA3AF" />
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
          <View style={[styles.settingsModalContainer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.settingsHandle} />
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
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsContent}>
              <TouchableOpacity
                style={styles.settingsOption}
                activeOpacity={0.7}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  handleDayAdjustment();
                }}
              >
                <View style={[styles.settingsIconWrap, { backgroundColor: 'rgba(0, 173, 181, 0.12)' }]}>
                  <Calendar size={20} color="#00ADB5" />
                </View>
                <View style={styles.settingsOptionText}>
                  <Text style={styles.settingsOptionTitle}>Adjust Workout Days</Text>
                  <Text style={styles.settingsOptionSubtitle}>
                    Change which days you train
                  </Text>
                </View>
                <ChevronRight size={18} color="#4B5563" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsOption}
                activeOpacity={0.7}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowSettings(false);
                  setShowCustomPlan(true);
                }}
              >
                <View style={[styles.settingsIconWrap, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                  <Dumbbell size={20} color="#6366F1" />
                </View>
                <View style={styles.settingsOptionText}>
                  <Text style={styles.settingsOptionTitle}>View Full Plan</Text>
                  <Text style={styles.settingsOptionSubtitle}>
                    Browse all workout days
                  </Text>
                </View>
                <ChevronRight size={18} color="#4B5563" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingsOption, { borderBottomWidth: 0 }]}
                activeOpacity={0.7}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  retakeQuiz();
                }}
              >
                <View style={[styles.settingsIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                  <RotateCcw size={20} color="#F59E0B" />
                </View>
                <View style={styles.settingsOptionText}>
                  <Text style={styles.settingsOptionTitle}>Retake Quiz</Text>
                  <Text style={styles.settingsOptionSubtitle}>
                    Generate a completely new plan
                  </Text>
                </View>
                <ChevronRight size={18} color="#4B5563" />
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
                Your plan will adapt to your schedule.
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
                      activeOpacity={0.7}
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
                      {isSelected && (
                        <Check size={16} color="#FFFFFF" strokeWidth={3} />
                      )}
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
              activeOpacity={0.8}
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
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerContent: {},
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  subtitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: 6,
  },
  statusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    backgroundColor: "rgba(255, 107, 53, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.25)",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#FF6B35",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  headerRight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  timerPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(0, 229, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.15)",
  },
  timerText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#00E5FF",
  },
  settingsButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  weekDayRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  weekDayDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  weekDayDotActive: {
    backgroundColor: "rgba(0, 173, 181, 0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 173, 181, 0.3)",
  },
  weekDayDotToday: {
    borderWidth: 2,
    borderColor: "#00ADB5",
  },
  weekDayLetter: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#4B5563",
  },
  weekDayLetterActive: {
    color: "#00ADB5",
  },
  weekDayLetterToday: {
    color: "#FFFFFF",
    fontWeight: "700" as const,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  customPlanCTA: {
    marginTop: 24,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#00ADB5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaGradientBg: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 18,
    gap: 14,
  },
  ctaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ctaTextBlock: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 3,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 18,
  },
  ctaArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  buildWorkoutCTA: {
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  buildWorkoutCTASmall: {
    marginTop: 14,
    backgroundColor: "#171B22",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  buildSmallInner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 14,
    gap: 12,
  },
  buildSmallIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  buildSmallText: {
    flex: 1,
  },
  buildSmallTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#E5E7EB",
  },
  buildSmallSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1,
  },

  todaysWorkoutSection: {
    marginTop: 24,
  },
  todaysWorkoutCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#00ADB5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  todaysWorkoutGradient: {
    padding: 22,
  },
  todaysLabel: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 10,
  },
  todaysLabelText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1.5,
  },
  todaysWorkoutName: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  todaysWorkoutMeta: {
    flexDirection: "row" as const,
    gap: 10,
    marginBottom: 18,
  },
  todayMetaPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  todayMetaText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.85)",
  },
  todayStartRow: {
    alignItems: "flex-start" as const,
  },
  todayStartBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  todayStartText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#0E7490",
  },

  restDayCard: {
    borderRadius: 20,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.15)",
  },
  restDayGradient: {
    position: "relative" as const,
  },
  restDayStars: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  restDayStar: {
    position: "absolute" as const,
    borderRadius: 2,
    backgroundColor: "#7DD3FC",
  },
  restDayInner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 20,
    gap: 16,
  },
  restDayIconWrap: {},
  restDayIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.15)",
  },
  restDayTextBlock: {
    flex: 1,
  },
  restDayTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#F1F5F9",
    marginBottom: 4,
  },
  restDayQuote: {
    fontSize: 13,
    color: "#94A3B8",
    lineHeight: 18,
    marginBottom: 8,
    fontStyle: "italic" as const,
  },
  restDayNextRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  nextWorkoutText: {
    fontSize: 12,
    color: "#38BDF8",
    fontWeight: "600" as const,
  },
  viewPlanButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(56, 189, 248, 0.08)",
    backgroundColor: "rgba(56, 189, 248, 0.04)",
  },
  viewPlanButtonText: {
    fontSize: 14,
    color: "#38BDF8",
    fontWeight: "600" as const,
  },

  statsContainer: {
    flexDirection: "row" as const,
    gap: 10,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#171B22",
    borderRadius: 16,
    padding: 16,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#F9FAFB",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500" as const,
  },

  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#E5E7EB",
    letterSpacing: -0.3,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
  },
  toggleButtonText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600" as const,
  },

  emptyState: {
    backgroundColor: "#171B22",
    borderRadius: 16,
    padding: 36,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(75, 85, 99, 0.1)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 14,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#9CA3AF",
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 4,
    textAlign: "center" as const,
  },

  recentWorkoutsContainer: {
    gap: 8,
  },
  recentWorkoutCard: {
    backgroundColor: "#171B22",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  recentWorkoutLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
    gap: 12,
  },
  recentWorkoutIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  recentWorkoutInfo: {
    flex: 1,
  },
  recentWorkoutName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#E5E7EB",
    marginBottom: 2,
  },
  recentWorkoutDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  recentWorkoutMetrics: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  recentMetric: {
    alignItems: "center" as const,
    minWidth: 32,
  },
  recentMetricValue: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#D1D5DB",
  },
  recentMetricLabel: {
    fontSize: 10,
    color: "#4B5563",
    marginTop: 1,
  },
  recentMetricDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  quizContainer: {
    flex: 1,
    backgroundColor: "#0D0F13",
  },
  quizHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#E5E7EB",
  },
  quizProgress: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600" as const,
  },
  quizProgressBar: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginHorizontal: 20,
    borderRadius: 2,
    marginBottom: 8,
  },
  quizProgressFill: {
    height: "100%",
    backgroundColor: "#00ADB5",
    borderRadius: 2,
  },
  quizContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  questionContainer: {
    marginTop: 24,
  },
  questionText: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: "#F1F5F9",
    marginBottom: 24,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    backgroundColor: "#171B22",
    borderRadius: 14,
    padding: 18,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  optionText: {
    fontSize: 15,
    color: "#E5E7EB",
    fontWeight: "500" as const,
    flex: 1,
    lineHeight: 22,
  },
  quizGoalsContainer: {
    marginTop: 24,
  },
  goalsSubtext: {
    fontSize: 15,
    color: "#64748B",
    marginBottom: 20,
    lineHeight: 22,
  },
  goalsInput: {
    backgroundColor: "#171B22",
    borderRadius: 14,
    padding: 18,
    fontSize: 15,
    color: "#E5E7EB",
    minHeight: 120,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: 24,
    lineHeight: 22,
  },
  generateButton: {
    backgroundColor: "#00ADB5",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  daySelectionSubtext: {
    fontSize: 15,
    color: "#64748B",
    marginBottom: 20,
    lineHeight: 22,
  },
  daySelectionContainer: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
    marginBottom: 28,
  },
  daySelectionButton: {
    backgroundColor: "#171B22",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.06)",
    minWidth: 105,
    alignItems: "center" as const,
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: 6,
  },
  daySelectionButtonSelected: {
    backgroundColor: "#00ADB5",
    borderColor: "#00ADB5",
  },
  daySelectionText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  daySelectionTextSelected: {
    color: "#FFFFFF",
  },
  continueButton: {
    backgroundColor: "#00ADB5",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "#0D0F13",
  },
  modalHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: "#F1F5F9",
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  planOverview: {
    backgroundColor: "#171B22",
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  planOverviewText: {
    fontSize: 14,
    color: "#94A3B8",
    lineHeight: 22,
  },
  dayCard: {
    backgroundColor: "#171B22",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  dayHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  dayNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(0, 173, 181, 0.12)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dayNumberText: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#00ADB5",
  },
  dayTitleBlock: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#E5E7EB",
    marginBottom: 2,
  },
  exerciseCount: {
    fontSize: 12,
    color: "#64748B",
  },
  startDayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#00ADB5",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  customExerciseCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  exerciseNameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginBottom: 8,
  },
  exerciseIndex: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  exerciseIndexText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#6B7280",
  },
  exerciseHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#D1D5DB",
    flex: 1,
  },
  exerciseMetaRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 6,
    marginBottom: 4,
  },
  exerciseMetaPill: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  exerciseMetaPillText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500" as const,
  },
  exerciseDescription: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 6,
    lineHeight: 18,
  },
  exerciseDetails: {
    fontSize: 13,
    color: "#94A3B8",
  },
  exerciseRest: {
    fontSize: 13,
    color: "#94A3B8",
  },
  exerciseEquipment: {
    fontSize: 13,
    color: "#94A3B8",
  },

  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
  },
  newPlanButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
  },
  newPlanButtonText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "600" as const,
  },

  settingsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end" as const,
  },
  settingsModalContainer: {
    backgroundColor: "#171B22",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  settingsHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignSelf: "center" as const,
    marginBottom: 12,
  },
  settingsModalHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  settingsModalTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#E5E7EB",
  },
  settingsContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  settingsOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  settingsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  settingsOptionText: {
    flex: 1,
  },
  settingsOptionTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#E5E7EB",
    marginBottom: 2,
  },
  settingsOptionSubtitle: {
    fontSize: 13,
    color: "#64748B",
  },

  dayAdjustmentContainer: {
    paddingTop: 20,
  },
  dayAdjustmentTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#F1F5F9",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  dayAdjustmentSubtext: {
    fontSize: 15,
    color: "#64748B",
    marginBottom: 24,
    lineHeight: 22,
  },
  saveDaysButton: {
    backgroundColor: "#00ADB5",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveDaysButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D0F13',
  },
  loadingScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center' as const,
  },
  loadingTopSection: {
    alignItems: 'center' as const,
    marginBottom: 36,
  },
  loadingIconArea: {
    width: 120,
    height: 120,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 24,
  },
  loadingIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 173, 181, 0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  loadingRing: {
    position: 'absolute' as const,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2.5,
    borderColor: 'transparent',
    borderTopColor: '#00ADB5',
    borderRightColor: '#00E5FF',
  },
  loadingRingInner: {
    width: '100%',
    height: '100%',
  },
  loadingTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  loadingPercent: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: '#00ADB5',
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  loadingProgressBarContainer: {
    width: '100%',
    alignItems: 'center' as const,
  },
  loadingProgressBarBg: {
    width: '80%',
    height: 6,
    backgroundColor: '#1F2937',
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  loadingProgressBarFill: {
    height: '100%',
    backgroundColor: '#00ADB5',
    borderRadius: 3,
  },
  loadingStepsContainer: {
    width: '100%',
    backgroundColor: '#151921',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginBottom: 24,
  },
  loadingStepRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
  },
  loadingStepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F2937',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  loadingStepDotComplete: {
    backgroundColor: '#00ADB5',
  },
  loadingStepDotActive: {
    backgroundColor: 'rgba(0, 173, 181, 0.2)',
    borderWidth: 2,
    borderColor: '#00ADB5',
  },
  loadingStepLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500' as const,
    flex: 1,
  },
  loadingStepLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  loadingStepLabelComplete: {
    color: '#9CA3AF',
  },
  loadingStepPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ADB5',
  },
  loadingTipCard: {
    width: '100%',
    backgroundColor: '#151921',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#00ADB5',
  },
  loadingTipHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 10,
  },
  loadingTipHeaderText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#00ADB5',
    letterSpacing: 1.2,
  },
  loadingTipText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
    fontWeight: '400' as const,
  },
});
