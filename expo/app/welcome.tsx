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
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Activity, Dumbbell, Bell, Utensils, Target, Calendar, Sparkles, Check, Camera, Star } from 'lucide-react-native';
import { Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { callOpenAIWithVision } from '@/utils/openai';
import { useApp } from '@/providers/AppProvider';
import { getStartingLevelFromQuiz } from '@/constants/xp';
import { useNotifications } from '@/providers/NotificationProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getVideoUrlForExercise } from '@/utils/videoUrls';
import { callOpenAI } from '@/utils/openai';
import { useLanguage } from '@/providers/LanguageProvider';


interface WelcomeSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  gradient: string[];
}

function OnboardingSteps({ activePhase, isSpanish }: { activePhase: 'welcome' | 'workout' | 'nutrition'; isSpanish: boolean }) {
  const phases = [
    { key: 'welcome' as const, label: isSpanish ? 'Bienvenida' : 'Welcome', num: '1' },
    { key: 'workout' as const, label: isSpanish ? 'Ejercicio' : 'Workout', num: '2' },
    { key: 'nutrition' as const, label: isSpanish ? 'Nutrición' : 'Nutrition', num: '3' },
  ];
  const activeIdx = phases.findIndex(p => p.key === activePhase);

  return (
    <View style={onboardStyles.container}>
      {phases.map((phase, idx) => {
        const isActive = idx === activeIdx;
        const isDone = idx < activeIdx;
        return (
          <React.Fragment key={phase.key}>
            {idx > 0 && (
              <View style={[onboardStyles.connector, isDone && onboardStyles.connectorDone]} />
            )}
            <View style={[onboardStyles.step, isActive && onboardStyles.stepActive, isDone && onboardStyles.stepDone]}>
              <Text style={[
                onboardStyles.stepNum,
                isActive && onboardStyles.stepNumActive,
                isDone && onboardStyles.stepNumDone,
              ]}>
                {isDone ? 'OK' : phase.num}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const LOADING_STEPS_EN = [
  { label: 'Analyzing your goals', icon: Target },
  { label: 'Selecting exercises', icon: Dumbbell },
  { label: 'Optimizing sets & reps', icon: Activity },
  { label: 'Building your schedule', icon: Calendar },
  { label: 'Finalizing your plan', icon: Sparkles },
];

const LOADING_STEPS_ES = [
  { label: 'Analizando tus objetivos', icon: Target },
  { label: 'Seleccionando ejercicios', icon: Dumbbell },
  { label: 'Optimizando series y repeticiones', icon: Activity },
  { label: 'Construyendo tu horario', icon: Calendar },
  { label: 'Finalizando tu plan', icon: Sparkles },
];

const FITNESS_TIPS_EN = [
  "Progressive overload is the #1 driver of muscle growth — aim to increase weight or reps each week.",
  "Sleep 7-9 hours per night. Your muscles grow during recovery, not during the workout.",
  "Protein timing matters less than total daily intake. Aim for 0.7-1g per pound of bodyweight.",
  "Compound movements like squats and deadlifts recruit more muscle fibers than isolation exercises.",
  "Drinking water before meals can reduce calorie intake by up to 13%.",
  "Consistency beats intensity. Showing up 4x a week at 80% effort outperforms 1x at 100%.",
  "Rest periods of 2-3 min for strength, 60-90s for hypertrophy, and 30-45s for endurance.",
  "Warming up with dynamic stretches reduces injury risk by up to 30%.",
  "Mind-muscle connection is real — focusing on the target muscle improves activation by 20%.",
  "Creatine monohydrate is the most researched and effective supplement for strength gains.",
];

const FITNESS_TIPS_ES = [
  "La sobrecarga progresiva es el motor #1 del crecimiento muscular — intenta aumentar peso o repeticiones cada semana.",
  "Duerme 7-9 horas por noche. Tus músculos crecen durante la recuperación, no durante el entrenamiento.",
  "El momento de la proteína importa menos que la ingesta diaria total. Apunta a 1.5-2.2g por kg de peso corporal.",
  "Los movimientos compuestos como sentadillas y peso muerto reclutan más fibras musculares que los ejercicios de aislamiento.",
  "Beber agua antes de las comidas puede reducir la ingesta calórica hasta un 13%.",
  "La constancia supera la intensidad. Ir 4 veces a la semana al 80% supera ir 1 vez al 100%.",
  "Periodos de descanso de 2-3 min para fuerza, 60-90s para hipertrofia y 30-45s para resistencia.",
  "Calentar con estiramientos dinámicos reduce el riesgo de lesiones hasta un 30%.",
  "La conexión mente-músculo es real — enfocarte en el músculo objetivo mejora la activación un 20%.",
  "La creatina monohidratada es el suplemento más investigado y efectivo para ganar fuerza.",
];

function LoadingScreen({ insets, progress, isSpanish }: { insets: { top: number; bottom: number; left: number; right: number }, progress: number, isSpanish: boolean }) {
  const LOADING_STEPS = isSpanish ? LOADING_STEPS_ES : LOADING_STEPS_EN;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const tipOpacity = useRef(new Animated.Value(1)).current;
  const tipTranslateY = useRef(new Animated.Value(0)).current;
  const FITNESS_TIPS = isSpanish ? FITNESS_TIPS_ES : FITNESS_TIPS_EN;
  const [currentTipIndex, setCurrentTipIndex] = useState(() => Math.floor(Math.random() * FITNESS_TIPS_EN.length));
  const [activeStep, setActiveStep] = useState(0);
  const stepAnims = useRef(LOADING_STEPS.map(() => new Animated.Value(0))).current;
  const stepScaleAnims = useRef(LOADING_STEPS.map(() => new Animated.Value(0.8))).current;

  useEffect(() => {
    const stepIndex = Math.min(Math.floor(progress * LOADING_STEPS.length), LOADING_STEPS.length - 1);
    if (stepIndex !== activeStep) {
      setActiveStep(stepIndex);
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, activeStep]);

  useEffect(() => {
    LOADING_STEPS.forEach((_, index) => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, stepAnims, stepScaleAnims]);

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(tipOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(tipTranslateY, { toValue: -12, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setCurrentTipIndex(prev => (prev + 1) % FITNESS_TIPS.length);
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
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const percentText = Math.round(progress * 100);

  return (
    <View style={[styles.container, styles.loadingBackground, { paddingTop: insets.top }]}>
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

            <Text style={styles.loadingTitle}>{isSpanish ? 'Creando Tu Plan' : 'Building Your Plan'}</Text>
            <Text style={styles.loadingPercent}>{percentText}%</Text>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
              </View>
            </View>
          </View>

          <View style={styles.loadingStepsContainer}>
            {LOADING_STEPS.map((step, index) => {
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
              <Text style={styles.loadingTipHeaderText}>{isSpanish ? '¿SABÍAS QUE?' : 'DID YOU KNOW?'}</Text>
            </View>
            <Animated.Text
              style={[
                styles.loadingTipText,
                { opacity: tipOpacity, transform: [{ translateY: tipTranslateY }] },
              ]}
            >
              {FITNESS_TIPS[currentTipIndex]}
            </Animated.Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
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
    gradient: ['#091517', '#111827'],
  },
  {
    id: 2,
    title: 'Track Everything',
    subtitle: 'Runs • Workouts • Nutrition',
    description: 'Monitor your complete fitness journey in one place. Every rep, every mile, every meal counts.',
    icon: <Activity size={80} color="#00ADB5" />,
    gradient: ['#091517', '#111827'],
  },
  {
    id: 3,
    title: 'Personalized Plans',
    subtitle: 'Built for You',
    description: 'AI-generated workout and nutrition plans that match your fitness level, goals, and lifestyle.',
    icon: <Dumbbell size={80} color="#00ADB5" />,
    gradient: ['#091517', '#111827'],
  },
  {
    id: 4,
    title: 'Stay Consistent',
    subtitle: 'Build Lasting Habits',
    description: 'Smart reminders and streak tracking keep you motivated and on track every single day.',
    icon: <Bell size={80} color="#00ADB5" />,
    gradient: ['#091517', '#111827'],
  },
  {
    id: 5,
    title: 'Enjoying AthliAI?',
    subtitle: 'Help Us Grow',
    description: 'A 5-star rating means the world to us and helps other athletes discover AthliAI.',
    icon: <Star size={80} color="#FFD700" fill="#FFD700" />,
    gradient: ['#091517', '#111827'],
  },
];

export default function WelcomeScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [showNutritionQuiz, setShowNutritionQuiz] = useState(false);
  const [showGymQuiz, setShowGymQuiz] = useState(false);


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
  const [isScanningEquipment, setIsScanningEquipment] = useState(false);
  const scanPulseAnim = useRef(new Animated.Value(0.4)).current;
  const { markWelcomeAsSeen, updateNutrition, updatePersonalStats, updateCustomWorkoutPlan, setStartingXP } = useApp();
  const { requestPermissions, scheduleAllDailyReminders } = useNotifications();
  useRevenueCat();
  const insets = useSafeAreaInsets();
  const { t, setLanguage, isSpanish } = useLanguage();
  void setLanguage;

  const handleRateApp = async () => {
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('https://apps.apple.com/app/id6745189622?action=write-review');
      } else if (Platform.OS === 'android') {
        await Linking.openURL('market://details?id=com.athliai');
      }
    } catch (error) {
      console.log('Could not open store for rating:', error);
    }
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      setShowGymQuiz(true);
    }
  };

  const handleNext = async () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (currentSlide === 3) {
      setIsRequestingPermissions(true);
      try {
        const granted = await requestPermissions();
        if (granted) {
          await scheduleAllDailyReminders();
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
    if (!nutritionGoal || !currentWeight || !heightFeet || (!isSpanish && !heightInches) || (nutritionGoal !== 'maintain' && (!targetWeight || !goalEndDate))) return;

    let currentWeightNum: number;
    let heightNum: number;
    let targetWeightNum: number;
    if (isSpanish) {
      const weightKg = parseFloat(currentWeight);
      currentWeightNum = Math.round(weightKg / 0.453592 * 10) / 10;
      heightNum = Math.round(parseFloat(heightFeet) / 2.54);
      const targetKg = targetWeight ? parseFloat(targetWeight) : weightKg;
      targetWeightNum = Math.round(targetKg / 0.453592 * 10) / 10;
    } else {
      currentWeightNum = parseFloat(currentWeight);
      heightNum = (parseFloat(heightFeet) * 12) + parseFloat(heightInches);
      targetWeightNum = targetWeight ? parseFloat(targetWeight) : currentWeightNum;
    }
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
    router.push('/paywall');
    handleGetStarted();
  };

  const handleSkipNutrition = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateNutrition({ quizCompleted: true });
    setShowNutritionQuiz(false);
    router.push('/paywall');
    handleGetStarted();
  };

  const handleSkipGym = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowGymQuiz(false);
    setShowNutritionQuiz(true);
  };

  const handleScanEquipment = async () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS !== 'web') {
          Alert.alert(t('gym_scan_permission'));
        }
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]?.base64) {
        console.log('Camera cancelled or no base64 data');
        return;
      }

      setIsScanningEquipment(true);

      const scanPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(scanPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(scanPulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ])
      );
      scanPulse.start();

      const base64Image = result.assets[0].base64;

      const prompt = `You are analyzing a photo of a gym or workout space. Look at all visible equipment and surroundings.

Identify the equipment available and classify the gym into ONE of these categories:
- "Full gym with free weights and machines" (if you see barbells, squat racks, cable machines, bench press, etc.)
- "Home gym with dumbbells and basic equipment" (if you see dumbbells, a bench, pull-up bar, kettlebells, etc.)
- "Bodyweight only (no equipment)" (if there's no visible equipment, just open space)
- "Limited equipment (resistance bands, light weights)" (if you see only bands, light dumbbells, yoga mats, etc.)

Also provide a brief summary of the specific equipment you can see.

Respond in JSON format:
{"category": "one of the four categories above", "equipment_list": "comma-separated list of equipment spotted"}

Return ONLY valid JSON.`;

      console.log('Analyzing gym equipment with AI vision...');
      const aiResponse = await callOpenAIWithVision(prompt, base64Image);
      console.log('AI equipment analysis:', aiResponse);

      scanPulse.stop();
      scanPulseAnim.setValue(0.4);

      let cleaned = aiResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(cleaned);
      const category = parsed.category || t('gym_q3_o1');
      const equipmentList = parsed.equipment_list || '';

      const answerText = equipmentList
        ? `${category} (Detected: ${equipmentList})`
        : category;

      console.log('Equipment scan result:', answerText);
      setIsScanningEquipment(false);

      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      handleGymAnswer(answerText);
    } catch (error) {
      console.error('Error scanning equipment:', error);
      setIsScanningEquipment(false);
      scanPulseAnim.setValue(0.4);
      if (Platform.OS !== 'web') {
        Alert.alert(t('gym_error'), t('gym_scan_error'));
      }
    }
  };

  const gymQuestions = [
    {
      question: t('gym_q1'),
      options: [
        t('gym_q1_o1'),
        t('gym_q1_o2'),
        t('gym_q1_o3'),
        t('gym_q1_o4'),
        t('gym_q1_o5'),
      ]
    },
    {
      question: t('gym_q2'),
      options: [
        t('gym_q2_o1'),
        t('gym_q2_o2'),
        t('gym_q2_o3'),
      ]
    },
    {
      question: t('gym_q3'),
      hasScanOption: true,
      options: [
        t('gym_q3_o1'),
        t('gym_q3_o2'),
        t('gym_q3_o3'),
        t('gym_q3_o4'),
      ]
    },
    {
      question: t('gym_q4'),
      options: [
        t('gym_q4_o1'),
        t('gym_q4_o2'),
        t('gym_q4_o3'),
        t('gym_q4_o4'),
      ]
    },
    {
      question: t('gym_q5'),
      options: [
        t('gym_q5_o1'),
        t('gym_q5_o2'),
        t('gym_q5_o3'),
        t('gym_q5_o4'),
        t('gym_q5_o5'),
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
    
    try {
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
}

Return ONLY valid JSON, no markdown or code blocks.`;

      console.log('Generating fitness plan via Rork toolkit...');
      const aiResponse = await callOpenAI(prompt);
      
      let cleaned = aiResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      const planData = JSON.parse(cleaned);
        
        console.log('AI-generated plan:', planData);
        
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
  


  const [generationProgress, setGenerationProgress] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startProgressSimulation = (from: number, to: number, durationMs: number) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    const steps = 20;
    const increment = (to - from) / steps;
    const intervalTime = durationMs / steps;
    let current = from;
    progressIntervalRef.current = setInterval(() => {
      current += increment;
      if (current >= to) {
        current = to;
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      }
      setGenerationProgress(current);
    }, intervalTime);
  };

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const generateGymPlan = async () => {
    if (!customGoals.trim()) {
      return;
    }

    setIsGeneratingPlan(true);
    setGenerationProgress(0.05);
    startProgressSimulation(0.05, 0.85, 15000);
    
    try {
      const planData = await generateFitnessPlan(gymAnswers, customGoals);
      
      stopProgressSimulation();
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

      const fitnessLevelAnswer = gymAnswers.find(a => a.question.includes('fitness level'))?.answer || '';
      const starting = getStartingLevelFromQuiz(fitnessLevelAnswer);
      console.log('Setting starting XP from quiz:', starting);
      setStartingXP(starting.totalXP, starting.level);
      
      setTimeout(() => {
        setShowGymQuiz(false);
        setShowNutritionQuiz(true);
      }, 300);
    } catch (error) {
      console.error('Error generating plan:', error);
      stopProgressSimulation();
      setGenerationProgress(1);
      setTimeout(() => {
        setShowGymQuiz(false);
        setShowNutritionQuiz(true);
      }, 300);
    } finally {
      stopProgressSimulation();
      setIsGeneratingPlan(false);
    }
  };

  const currentSlideData = slides[currentSlide] || slides[0];
  const _isLastSlide = currentSlide === slides.length - 1;

  const _onboardingPhase: 'welcome' | 'workout' | 'nutrition' = showNutritionQuiz ? 'nutrition' : showGymQuiz ? 'workout' : 'welcome';



  if (isGeneratingPlan) {
    return <LoadingScreen insets={insets} progress={generationProgress} isSpanish={isSpanish} />;
  }

  if (showGymQuiz) {
    const progressPercent = showDaySelector 
      ? 100 
      : currentGymStep >= gymQuestions.length 
        ? 90 
        : ((currentGymStep + 1) / (gymQuestions.length + 2)) * 100;

    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#091517' }]}>
        <LinearGradient
          colors={['#091517', '#111827', '#091517']}
          style={styles.gradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          <View style={{ paddingHorizontal: 32, paddingTop: 16, paddingBottom: 8 }}>
            <OnboardingSteps activePhase="workout" isSpanish={isSpanish} />
          </View>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkipGym}>
            <Text style={styles.skipText}>{t('welcome_skip')}</Text>
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
              <Dumbbell size={80} color="#00ADB5" />
            </View>

            <View style={styles.contentContainer}>
              <Text style={styles.title}>{t('gym_quiz_title')}</Text>
              <Text style={styles.subtitle}>{t('gym_quiz_subtitle')}</Text>
              <Text style={styles.description}>
                {t('gym_quiz_description')}
              </Text>
              <Text style={styles.quizStepIndicator}>
                {showDaySelector ? t('gym_quiz_final_step') : currentGymStep >= gymQuestions.length ? t('gym_quiz_almost_done') : t('gym_quiz_question_of', { current: String(currentGymStep + 1), total: String(gymQuestions.length) })}
              </Text>
            </View>

            <View style={styles.quizContainer}>
              {showDaySelector ? (
                <>
                  <Text style={styles.quizQuestion}>{t('gym_quiz_select_days')}</Text>
                  <Text style={styles.daySelectionSubtext}>
                    {t('gym_quiz_select_days_sub')}
                  </Text>
                  <View style={styles.daySelectionContainer}>
                    {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((dayKey) => {
                      const dayLabel = t(`day_${dayKey}` as any);
                      const isSelected = selectedWorkoutDays.includes(dayKey);
                      return (
                        <TouchableOpacity
                          key={dayKey}
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
                              isSelected && styles.dayButtonTextSelected,
                            ]}
                          >
                            {dayLabel}
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
                    <Text style={styles.actionButtonText}>{t('gym_quiz_continue')}</Text>
                    <ChevronRight size={20} color="#FFFFFF" style={styles.chevron} />
                  </TouchableOpacity>
                </>
              ) : currentGymStep < gymQuestions.length && gymQuestions[currentGymStep] ? (
                <>
                  <Text style={styles.quizQuestion}>
                    {gymQuestions[currentGymStep].question}
                  </Text>

                  {isScanningEquipment ? (
                    <View style={scanStyles.scanningContainer}>
                      <Animated.View style={[scanStyles.scanningIconWrap, { opacity: scanPulseAnim }]}>
                        <Camera size={40} color="#00ADB5" />
                      </Animated.View>
                      <Text style={scanStyles.scanningText}>{t('gym_scan_analyzing')}</Text>
                      <View style={scanStyles.scanningDots}>
                        <View style={[scanStyles.dot, scanStyles.dotActive]} />
                        <View style={[scanStyles.dot, scanStyles.dotActive]} />
                        <View style={[scanStyles.dot, scanStyles.dotActive]} />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.optionsContainer}>
                      {gymQuestions[currentGymStep].options.map((option, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.optionButton}
                          onPress={() => handleGymAnswer(option)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.optionText}>{option}</Text>
                        </TouchableOpacity>
                      ))}

                      {gymQuestions[currentGymStep].hasScanOption && (
                        <TouchableOpacity
                          style={scanStyles.scanButton}
                          onPress={handleScanEquipment}
                          activeOpacity={0.7}
                        >
                          <View style={scanStyles.scanButtonInner}>
                            <View style={scanStyles.scanIconCircle}>
                              <Camera size={20} color="#00ADB5" />
                            </View>
                            <View style={scanStyles.scanTextWrap}>
                              <Text style={scanStyles.scanButtonTitle}>{t('gym_q3_o5_scan')}</Text>
                              <Text style={scanStyles.scanButtonSub}>
                                {isSpanish ? 'La IA detectará tu equipo' : 'AI will detect your equipment'}
                              </Text>
                            </View>
                            <ChevronRight size={18} color="#00ADB5" />
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.quizQuestion}>
                    {t('gym_quiz_goals_question')}
                  </Text>
                  <Text style={styles.goalsSubtext}>
                    {t('gym_quiz_goals_sub')}
                  </Text>
                  <TextInput
                    style={styles.goalsInput}
                    multiline
                    numberOfLines={4}
                    placeholder={isSpanish ? 'ej., Quiero construir brazos y pecho más grandes, mejorar mi postura...' : 'e.g., I want to build bigger arms and chest, improve my posture...'}
                    placeholderTextColor="#6B7280"
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
                    <Text style={styles.actionButtonText}>{t('gym_quiz_create_plan')}</Text>
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
    if (isSpanish ? heightFeet : (heightFeet && heightInches)) currentNutritionStep = 3;
    if (nutritionGoal === 'maintain' || (targetWeight && goalEndDate)) currentNutritionStep = 4;
    
    const nutritionProgressPercent = (currentNutritionStep / totalNutritionSteps) * 100;

    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#091517' }]}>
        <LinearGradient
          colors={['#091517', '#111827', '#091517']}
          style={styles.gradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          <View style={{ paddingHorizontal: 32, paddingTop: 16, paddingBottom: 8 }}>
            <OnboardingSteps activePhase="nutrition" isSpanish={isSpanish} />
          </View>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkipNutrition}>
            <Text style={styles.skipText}>{t('welcome_skip')}</Text>
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
              <Utensils size={80} color="#00ADB5" />
            </View>

            <View style={styles.contentContainer}>
              <Text style={styles.title}>{t('nutrition_title')}</Text>
              <Text style={styles.subtitle}>{t('nutrition_subtitle')}</Text>
              <Text style={styles.description}>
                {t('nutrition_description')}
              </Text>
              <Text style={styles.quizStepIndicator}>
                {t('nutrition_step_of', { current: String(currentNutritionStep + 1), total: String(totalNutritionSteps) })}
              </Text>
            </View>

            <View style={styles.quizContainer}>
              <Text style={styles.quizQuestion}>{t('nutrition_primary_goal')}</Text>
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
                      nutritionGoal === 'lose' && styles.optionTextSelected,
                    ]}
                  >
                    {t('nutrition_lose')}
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
                      nutritionGoal === 'maintain' && styles.optionTextSelected,
                    ]}
                  >
                    {t('nutrition_maintain')}
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
                      nutritionGoal === 'gain' && styles.optionTextSelected,
                    ]}
                  >
                    {t('nutrition_gain')}
                  </Text>
                </TouchableOpacity>
              </View>

              {nutritionGoal && (
                <>
                  <Text style={styles.quizQuestion}>{t('nutrition_current_weight')}</Text>
                  <TextInput
                    style={styles.weightInput}
                    placeholder={isSpanish ? 'ej., 80 kg' : 'e.g., 180'}
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={currentWeight}
                    onChangeText={setCurrentWeight}
                  />
                </>
              )}

              {nutritionGoal && currentWeight && (
                <>
                  <Text style={styles.quizQuestion}>{t('nutrition_height')}</Text>
                  <View style={styles.heightInputContainer}>
                    {isSpanish ? (
                      <View style={styles.heightInputWrapper}>
                        <TextInput
                          style={styles.heightInput}
                          placeholder="170"
                          placeholderTextColor="#6B7280"
                          keyboardType="numeric"
                          value={heightFeet}
                          onChangeText={(text) => { setHeightFeet(text); setHeightInches('0'); }}
                        />
                        <Text style={styles.heightLabel}>cm</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.heightInputWrapper}>
                          <TextInput
                            style={styles.heightInput}
                            placeholder="Feet"
                            placeholderTextColor="#6B7280"
                            keyboardType="numeric"
                            value={heightFeet}
                            onChangeText={setHeightFeet}
                          />
                          <Text style={styles.heightLabel}>ft</Text>
                        </View>
                        <View style={styles.heightInputWrapper}>
                          <TextInput
                            style={styles.heightInput}
                            placeholder="Inches"
                            placeholderTextColor="#6B7280"
                            keyboardType="numeric"
                            value={heightInches}
                            onChangeText={setHeightInches}
                          />
                          <Text style={styles.heightLabel}>in</Text>
                        </View>
                      </>
                    )}
                  </View>
                </>
              )}

              {nutritionGoal && nutritionGoal !== 'maintain' && currentWeight && heightFeet && (isSpanish || heightInches) && (
                <>
                  <Text style={styles.quizQuestion}>{t('nutrition_target_weight')}</Text>
                  <TextInput
                    style={styles.weightInput}
                    placeholder={isSpanish ? 'ej., 75 kg' : 'e.g., 165'}
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                  />

                  <Text style={styles.quizQuestion}>{t('nutrition_when_achieve')}</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setShowDatePicker(true);
                    }}
                  >
                    <Calendar size={20} color="#F9FAFB" />
                    <Text style={styles.datePickerButtonText}>
                      {goalEndDate ? goalEndDate.toLocaleDateString(isSpanish ? 'es-ES' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : t('nutrition_select_date')}
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
                      textColor="#F9FAFB"
                      themeVariant="dark"
                    />
                  )}
                </>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.actionButton,
                (!nutritionGoal || !currentWeight || !heightFeet || (!isSpanish && !heightInches) ||
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
                !nutritionGoal || !currentWeight || !heightFeet || (!isSpanish && !heightInches) ||
                (nutritionGoal !== 'maintain' && (!targetWeight || !goalEndDate))
              }
            >
              <Text style={styles.actionButtonText}>{t('nutrition_complete_setup')}</Text>
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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#091517' }]}>
      <LinearGradient
        colors={['#091517', '#111827', '#091517']}
        style={styles.darkBackground}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <TouchableOpacity
          style={styles.langButton}
          onPress={() => {
            if (Platform.OS !== 'web') {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            setLanguage(isSpanish ? 'en' : 'es');
          }}
        >
          <Text style={styles.langButtonText}>{isSpanish ? 'English' : 'Español'}</Text>
        </TouchableOpacity>

        <View style={{ paddingHorizontal: 32, paddingTop: 16 }}>
          <OnboardingSteps activePhase="welcome" isSpanish={isSpanish} />
        </View>

        <TouchableOpacity style={styles.skipButtonMain} onPress={handleSkip}>
          <Text style={styles.skipTextMain}>{t('welcome_skip')}</Text>
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(60, insets.bottom + 40) }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            {currentSlideData.id === 1 ? (
              <View style={styles.appNameContainer}>
                <Text style={styles.appNameLarge}>AthliAI</Text>
                <View style={styles.underlineTeal} />
              </View>
            ) : currentSlideData.icon ? (
              <View style={styles.iconWrapper}>
                {currentSlideData.icon}
              </View>
            ) : null}
          </View>

          <View style={styles.contentContainer}>
            <Text style={styles.titleDark}>{isSpanish ? (
              currentSlide === 0 ? t('welcome_slide1_title') :
              currentSlide === 1 ? t('welcome_slide2_title') :
              currentSlide === 2 ? t('welcome_slide3_title') :
              currentSlide === 3 ? t('welcome_slide4_title') : t('welcome_slide5_title')
            ) : currentSlideData.title}</Text>
            <Text style={styles.subtitleDark}>{isSpanish ? (
              currentSlide === 0 ? t('welcome_slide1_subtitle') :
              currentSlide === 1 ? t('welcome_slide2_subtitle') :
              currentSlide === 2 ? t('welcome_slide3_subtitle') :
              currentSlide === 3 ? t('welcome_slide4_subtitle') : t('welcome_slide5_subtitle')
            ) : currentSlideData.subtitle}</Text>
            <Text style={styles.descriptionDark}>{isSpanish ? (
              currentSlide === 0 ? t('welcome_slide1_description') :
              currentSlide === 1 ? t('welcome_slide2_description') :
              currentSlide === 2 ? t('welcome_slide3_description') :
              currentSlide === 3 ? t('welcome_slide4_description') : t('welcome_slide5_description')
            ) : currentSlideData.description}</Text>
          </View>

          <View style={styles.pagination}>
            {slides.map((slide, index) => (
              <View
                key={slide.id}
                style={[
                  styles.dotDark,
                  index === currentSlide && styles.activeDotDark,
                ]}
              />
            ))}
          </View>

          {currentSlide === 4 ? (
            <>
              <View style={styles.ratingStarsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={36} color="#FFD700" fill="#FFD700" />
                ))}
              </View>
              <TouchableOpacity
                style={styles.rateButton}
                onPress={handleRateApp}
              >
                <Star size={20} color="#091517" fill="#091517" />
                <Text style={styles.rateButtonText}>{t('welcome_rate_app')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.skipNotificationsButton}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowGymQuiz(true);
                }}
              >
                <Text style={styles.skipNotificationsText}>{t('welcome_maybe_later')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={[
                  styles.actionButton,
                  isRequestingPermissions && styles.actionButtonDisabled
                ]} 
                onPress={handleNext}
                disabled={isRequestingPermissions}
              >
                <Text style={styles.actionButtonText}>
                  {isRequestingPermissions ? t('welcome_requesting') : 
                   currentSlide === 3 ? t('welcome_allow_notifications') : t('welcome_next')}
                </Text>
                {!isRequestingPermissions && (
                  <ChevronRight size={20} color="#FFFFFF" style={styles.chevron} />
                )}
              </TouchableOpacity>
              
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
                  <Text style={styles.skipNotificationsText}>{t('welcome_skip_for_now')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      </LinearGradient>
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
    color: '#9CA3AF',
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
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
    marginBottom: 12,
    color: '#F9FAFB',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center' as const,
    marginBottom: 20,
    fontWeight: '500' as const,
    color: '#00ADB5',
  },
  description: {
    fontSize: 16,
    textAlign: 'center' as const,
    lineHeight: 24,
    opacity: 0.8,
    maxWidth: '80%',
    color: '#9CA3AF',
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
    backgroundColor: '#00ADB5',
    borderColor: '#00ADB5',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
    color: '#FFFFFF',
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
  underlineTeal: {
    width: 120,
    height: 4,
    backgroundColor: '#00ADB5',
    marginTop: 12,
    borderRadius: 2,
  },
  darkBackground: {
    flex: 1,
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
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '500' as const,
    opacity: 0.8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleDark: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
    marginBottom: 12,
    color: '#F9FAFB',
  },
  subtitleDark: {
    fontSize: 18,
    textAlign: 'center' as const,
    marginBottom: 20,
    fontWeight: '500' as const,
    color: '#00ADB5',
  },
  descriptionDark: {
    fontSize: 16,
    textAlign: 'center' as const,
    lineHeight: 24,
    opacity: 0.8,
    maxWidth: '80%',
    color: '#9CA3AF',
  },
  dotDark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.3,
    marginHorizontal: 4,
    backgroundColor: '#9CA3AF',
  },
  activeDotDark: {
    opacity: 1,
    width: 24,
    backgroundColor: '#00ADB5',
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
    color: '#9CA3AF',
  },
  quizContainer: {
    width: '100%',
    marginBottom: 30,
  },
  quizQuestion: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#F9FAFB',
    marginBottom: 15,
    textAlign: 'center' as const,
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 25,
  },
  optionButton: {
    backgroundColor: '#171B22',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1F2937',
    width: '100%',
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(0, 173, 181, 0.15)',
    borderColor: '#00ADB5',
  },
  optionText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'left',
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  weightInput: {
    backgroundColor: '#171B22',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 18,
    color: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#1F2937',
    marginBottom: 25,
    textAlign: 'center',
  },
  daySelectionSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
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
    backgroundColor: '#171B22',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#1F2937',
    minWidth: 90,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: 'rgba(0, 173, 181, 0.15)',
    borderColor: '#00ADB5',
  },
  dayButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  dayButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  goalsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    opacity: 0.8,
    marginBottom: 15,
    textAlign: 'center',
  },
  goalsInput: {
    backgroundColor: '#171B22',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#1F2937',
    marginBottom: 25,
    minHeight: 100,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171B22',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderWidth: 2,
    borderColor: '#1F2937',
    marginBottom: 25,
    gap: 10,
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#F9FAFB',
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
    backgroundColor: '#091517',
  },
  loadingScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    alignItems: 'center',
  },
  loadingTopSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  loadingIconArea: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  loadingIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 173, 181, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingPercent: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: '#00ADB5',
    textAlign: 'center',
    marginBottom: 16,
  },
  loadingSubtitle: {
    fontSize: 18,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.7,
    fontWeight: '500' as const,
  },
  loadingDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.6,
    maxWidth: '80%',
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
  progressBarContainer: {
    width: '100%',
    alignItems: 'center' as const,
  },
  progressBarBackground: {
    width: '80%',
    height: 6,
    backgroundColor: '#1F2937',
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00ADB5',
    borderRadius: 3,
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
    backgroundColor: '#171B22',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 18,
    color: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#1F2937',
    textAlign: 'center',
  },
  heightLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  quizStepIndicator: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 8,
    textAlign: 'center' as const,
    opacity: 0.7,
    color: '#6B7280',
  },
  quizProgressBarInline: {
    width: '100%',
    height: 4,
    backgroundColor: '#1F2937',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 40,
  },
  quizProgressFill: {
    height: '100%',
    backgroundColor: '#00ADB5',
    borderRadius: 2,
  },
  paywallContainer: {
    flex: 1,
    backgroundColor: '#091517',
  },
  paywallCloseBtn: {
    position: 'absolute' as const,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  paywallScrollContent: {
    paddingHorizontal: 24,
    alignItems: 'center' as const,
  },
  paywallCrownWrap: {
    marginBottom: 24,
  },
  paywallCrownBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  paywallTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#F9FAFB',
    textAlign: 'center' as const,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  paywallSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  paywallFeatures: {
    width: '100%',
    marginBottom: 28,
    gap: 16,
  },
  paywallFeatureRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
  },
  paywallFeatureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 173, 181, 0.1)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  paywallFeatureText: {
    flex: 1,
  },
  paywallFeatureTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#F9FAFB',
    marginBottom: 2,
  },
  paywallFeatureDesc: {
    fontSize: 13,
    color: '#6B7280',
  },
  paywallPriceCard: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: 'rgba(0, 173, 181, 0.25)',
    marginBottom: 20,
  },
  paywallPriceGradient: {
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  paywallPriceRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  paywallPlanName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#F9FAFB',
  },
  paywallTrialLabel: {
    fontSize: 13,
    color: '#00ADB5',
    marginTop: 2,
    fontWeight: '500' as const,
  },
  paywallPriceRight: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
  },
  paywallPriceAmount: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#F9FAFB',
  },
  paywallPricePeriod: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 2,
  },
  paywallCTA: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden' as const,
    marginBottom: 16,
  },
  paywallCTAGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 16,
    gap: 6,
  },
  paywallCTAText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  paywallSkipBtn: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  paywallSkipText: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'underline' as const,
  },
  paywallLegal: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center' as const,
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  langButton: {
    position: 'absolute' as const,
    top: 60,
    left: 20,
    zIndex: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 173, 181, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 173, 181, 0.3)',
  },
  langButtonText: {
    color: '#00ADB5',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  ratingStarsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    marginBottom: 28,
  },
  rateButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: '#FFD700',
    minWidth: 160,
    gap: 8,
  },
  rateButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#091517',
  },
});

const onboardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 0,
  },
  step: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1F2937',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  stepActive: {
    backgroundColor: 'rgba(0,173,181,0.2)',
    borderColor: '#00ADB5',
  },
  stepDone: {
    backgroundColor: '#00ADB5',
    borderColor: '#00ADB5',
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#4B5563',
  },
  stepNumActive: {
    color: '#00ADB5',
  },
  stepNumDone: {
    color: '#FFFFFF',
  },
  connector: {
    width: 40,
    height: 2,
    backgroundColor: '#1F2937',
    borderRadius: 1,
  },
  connectorDone: {
    backgroundColor: '#00ADB5',
  },
});

const scanStyles = StyleSheet.create({
  scanningContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  scanningIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 173, 181, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 173, 181, 0.3)',
  },
  scanningText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#F9FAFB',
  },
  scanningDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#374151',
  },
  dotActive: {
    backgroundColor: '#00ADB5',
  },
  scanButton: {
    borderWidth: 2,
    borderColor: 'rgba(0, 173, 181, 0.4)',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: 'rgba(0, 173, 181, 0.06)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
  },
  scanButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  scanIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 173, 181, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTextWrap: {
    flex: 1,
    gap: 2,
  },
  scanButtonTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#00ADB5',
  },
  scanButtonSub: {
    fontSize: 12,
    color: '#6B7280',
  },
});