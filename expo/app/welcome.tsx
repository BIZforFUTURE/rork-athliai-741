import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Switch,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Target,
  Activity,
  Calendar,
  Sparkles,
  Check,
  Camera,
  Zap,
  TrendingUp,
  Flame,
  Shield,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { callOpenAIWithVision, callOpenAI } from '@/utils/openai';
import { useApp } from '@/providers/AppProvider';
import { getStartingLevelFromQuiz } from '@/constants/xp';
import { useNotifications } from '@/providers/NotificationProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { getVideoUrlForExercise } from '@/utils/videoUrls';
import { useLanguage } from '@/providers/LanguageProvider';

const TOTAL_STEPS = 9;

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

const LOADING_STEPS_PT = [
  { label: 'Analisando seus objetivos', icon: Target },
  { label: 'Selecionando exercícios', icon: Dumbbell },
  { label: 'Otimizando séries e repetições', icon: Activity },
  { label: 'Montando seu cronograma', icon: Calendar },
  { label: 'Finalizando seu plano', icon: Sparkles },
];

const FITNESS_TIPS_EN = [
  "Progressive overload is the #1 driver of muscle growth — aim to increase weight or reps each week.",
  "Sleep 7-9 hours per night. Your muscles grow during recovery, not during the workout.",
  "Protein timing matters less than total daily intake. Aim for 0.7-1g per pound of bodyweight.",
  "Compound movements like squats and deadlifts recruit more muscle fibers than isolation exercises.",
  "Consistency beats intensity. Showing up 4x a week at 80% effort outperforms 1x at 100%.",
  "Rest periods of 2-3 min for strength, 60-90s for hypertrophy, and 30-45s for endurance.",
  "Mind-muscle connection is real — focusing on the target muscle improves activation by 20%.",
  "Creatine monohydrate is the most researched and effective supplement for strength gains.",
];

const FITNESS_TIPS_ES = [
  "La sobrecarga progresiva es el motor #1 del crecimiento muscular — intenta aumentar peso o repeticiones cada semana.",
  "Duerme 7-9 horas por noche. Tus músculos crecen durante la recuperación, no durante el entrenamiento.",
  "El momento de la proteína importa menos que la ingesta diaria total. Apunta a 1.5-2.2g por kg de peso corporal.",
  "Los movimientos compuestos como sentadillas y peso muerto reclutan más fibras musculares.",
  "La constancia supera la intensidad. Ir 4 veces a la semana al 80% supera ir 1 vez al 100%.",
  "Periodos de descanso de 2-3 min para fuerza, 60-90s para hipertrofia y 30-45s para resistencia.",
  "La conexión mente-músculo es real — enfocarte en el músculo objetivo mejora la activación un 20%.",
  "La creatina monohidratada es el suplemento más investigado y efectivo para ganar fuerza.",
];

const FITNESS_TIPS_PT = [
  "A sobrecarga progressiva é o motor #1 do crescimento muscular — tente aumentar peso ou repetições a cada semana.",
  "Durma 7-9 horas por noite. Seus músculos crescem durante a recuperação, não durante o treino.",
  "O momento da proteína importa menos que a ingestão diária total. Mire em 1,5-2,2g por kg de peso corporal.",
  "Movimentos compostos como agachamento e levantamento terra recrutam mais fibras musculares.",
  "Consistência supera intensidade. Ir 4x na semana a 80% supera ir 1x a 100%.",
  "Períodos de descanso de 2-3 min para força, 60-90s para hipertrofia e 30-45s para resistência.",
  "A conexão mente-músculo é real — focar no músculo alvo melhora a ativação em 20%.",
  "A creatina monoidratada é o suplemento mais pesquisado e eficaz para ganho de força.",
];

function LoadingScreen({ insets, progress, lang }: { insets: { top: number; bottom: number; left: number; right: number }; progress: number; lang: string }) {
  const LOADING_STEPS = lang === 'pt' ? LOADING_STEPS_PT : lang === 'es' ? LOADING_STEPS_ES : LOADING_STEPS_EN;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const tipOpacity = useRef(new Animated.Value(1)).current;
  const tipTranslateY = useRef(new Animated.Value(0)).current;
  const FITNESS_TIPS = lang === 'pt' ? FITNESS_TIPS_PT : lang === 'es' ? FITNESS_TIPS_ES : FITNESS_TIPS_EN;
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
  }, [progress, activeStep, LOADING_STEPS.length]);

  useEffect(() => {
    LOADING_STEPS.forEach((_, index) => {
      if (index <= activeStep) {
        Animated.parallel([
          Animated.timing(stepAnims[index], { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(stepScaleAnims[index], { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
        ]).start();
      }
    });
  }, [activeStep, stepAnims, stepScaleAnims, LOADING_STEPS]);

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
  }, [tipOpacity, tipTranslateY, FITNESS_TIPS.length]);

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
    Animated.timing(progressAnim, { toValue: progress, duration: 500, useNativeDriver: false }).start();
  }, [progress, progressAnim]);

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const percentText = Math.round(progress * 100);

  return (
    <View style={[s.flex1, { backgroundColor: '#FFFFFF', paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={loadingStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={loadingStyles.topSection}>
          <View style={loadingStyles.iconArea}>
            <Animated.View style={[loadingStyles.ring, { transform: [{ rotate }] }]}>
              <View style={loadingStyles.ringInner} />
            </Animated.View>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={loadingStyles.iconCircle}>
                <Dumbbell size={44} color="#00ADB5" strokeWidth={2.5} />
              </View>
            </Animated.View>
          </View>
          <Text style={loadingStyles.title}>{lang === 'pt' ? 'Criando Seu Plano' : lang === 'es' ? 'Creando Tu Plan' : 'Building Your Plan'}</Text>
          <Text style={loadingStyles.percent}>{percentText}%</Text>
          <View style={loadingStyles.progressBarWrap}>
            <View style={loadingStyles.progressBarBg}>
              <Animated.View style={[loadingStyles.progressBarFill, { width: progressWidth }]} />
            </View>
          </View>
        </View>
        <View style={loadingStyles.stepsContainer}>
          {LOADING_STEPS.map((step, index) => {
            const IconComponent = step.icon;
            const isActive = index === activeStep;
            const isComplete = index < activeStep;
            return (
              <Animated.View
                key={step.label}
                style={[loadingStyles.stepRow, {
                  opacity: stepAnims[index].interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                  transform: [{ scale: stepScaleAnims[index] }],
                }]}
              >
                <View style={[loadingStyles.stepDot, isComplete && loadingStyles.stepDotComplete, isActive && loadingStyles.stepDotActive]}>
                  {isComplete ? (
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  ) : (
                    <IconComponent size={14} color={isActive ? '#00ADB5' : '#5A5A5E'} />
                  )}
                </View>
                <Text style={[loadingStyles.stepLabel, isActive && loadingStyles.stepLabelActive, isComplete && loadingStyles.stepLabelComplete]}>
                  {step.label}
                </Text>
                {isActive && <View style={loadingStyles.stepPulse} />}
              </Animated.View>
            );
          })}
        </View>
        <View style={loadingStyles.tipCard}>
          <View style={loadingStyles.tipHeader}>
            <Sparkles size={14} color="#00ADB5" />
            <Text style={loadingStyles.tipHeaderText}>{lang === 'pt' ? 'VOCÊ SABIA?' : lang === 'es' ? '¿SABÍAS QUE?' : 'DID YOU KNOW?'}</Text>
          </View>
          <Animated.Text style={[loadingStyles.tipText, { opacity: tipOpacity, transform: [{ translateY: tipTranslateY }] }]}>
            {FITNESS_TIPS[currentTipIndex]}
          </Animated.Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

export default function WelcomeScreen() {
  const [step, setStep] = useState(0);

  const [fitnessGoal, setFitnessGoal] = useState<string | null>(null);
  const [fitnessLevel, setFitnessLevel] = useState<string | null>(null);
  const [equipmentAccess, setEquipmentAccess] = useState<string | null>(null);
  const [workoutTime, setWorkoutTime] = useState<string | null>(null);
  const [physicalLimitations, setPhysicalLimitations] = useState<string | null>(null);

  const [isMetric, setIsMetric] = useState(false);
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightVal, setWeightVal] = useState('');
  const [targetWeightVal, setTargetWeightVal] = useState('');

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [customGoals, setCustomGoals] = useState('');

  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isScanningEquipment, setIsScanningEquipment] = useState(false);
  const scanPulseAnim = useRef(new Animated.Value(0.4)).current;
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { markWelcomeAsSeen, updateNutrition, updatePersonalStats, updateCustomWorkoutPlan, setStartingXP } = useApp();
  const { requestPermissions, scheduleAllDailyReminders } = useNotifications();
  useRevenueCat();
  const insets = useSafeAreaInsets();
  const { t, setLanguage, isSpanish, language } = useLanguage();
  const isPt = language === 'pt';

  const progress = step > 0 ? step / TOTAL_STEPS : 0;

  const hapticLight = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const hapticMedium = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const goBack = useCallback(() => {
    hapticLight();
    setStep(prev => Math.max(0, prev - 1));
  }, [hapticLight]);

  const goNext = useCallback(() => {
    hapticMedium();
    setStep(prev => prev + 1);
  }, [hapticMedium]);

  const handleSkip = useCallback(() => {
    hapticLight();
    markWelcomeAsSeen();
    router.replace('/(tabs)/home');
  }, [hapticLight, markWelcomeAsSeen]);

  const goalOptions = [
    { key: 'muscle', label: t('gym_q1_o1'), icon: Dumbbell },
    { key: 'strength', label: t('gym_q1_o2'), icon: Zap },
    { key: 'lose', label: t('gym_q1_o3'), icon: Flame },
    { key: 'fitness', label: t('gym_q1_o4'), icon: Activity },
    { key: 'athletic', label: t('gym_q1_o5'), icon: TrendingUp },
  ];

  const levelOptions = [
    { key: 'beginner', label: t('gym_q2_o1') },
    { key: 'intermediate', label: t('gym_q2_o2') },
    { key: 'advanced', label: t('gym_q2_o3') },
  ];

  const equipmentOptions = [
    { key: 'full', label: t('gym_q3_o1') },
    { key: 'home', label: t('gym_q3_o2') },
    { key: 'bodyweight', label: t('gym_q3_o3') },
    { key: 'limited', label: t('gym_q3_o4') },
  ];

  const timeOptions = [
    { key: '30-45', label: t('gym_q4_o1') },
    { key: '45-60', label: t('gym_q4_o2') },
    { key: '60-90', label: t('gym_q4_o3') },
    { key: 'flexible', label: t('gym_q4_o4') },
  ];

  const limitationOptions = [
    { key: 'none', label: t('gym_q5_o1') },
    { key: 'back', label: t('gym_q5_o2') },
    { key: 'knee', label: t('gym_q5_o3') },
    { key: 'shoulder', label: t('gym_q5_o4') },
    { key: 'specify', label: t('gym_q5_o5') },
  ];

  const getWeightUnit = () => isMetric ? 'kg' : 'lbs';
  const _getHeightUnit = () => isMetric ? 'cm' : 'ft/in';

  const getCurrentWeightNum = useCallback((): number => {
    if (isMetric) {
      const kg = parseFloat(weightVal);
      return isNaN(kg) ? 0 : Math.round(kg / 0.453592 * 10) / 10;
    }
    const lbs = parseFloat(weightVal);
    return isNaN(lbs) ? 0 : lbs;
  }, [isMetric, weightVal]);

  const getHeightInInches = useCallback((): number => {
    if (isMetric) {
      const cm = parseFloat(heightCm);
      return isNaN(cm) ? 0 : Math.round(cm / 2.54);
    }
    const ft = parseFloat(heightFt) || 0;
    const inches = parseFloat(heightIn) || 0;
    return ft * 12 + inches;
  }, [isMetric, heightCm, heightFt, heightIn]);

  const getTargetWeightNum = useCallback((): number => {
    if (!targetWeightVal) return 0;
    if (isMetric) {
      const kg = parseFloat(targetWeightVal);
      return isNaN(kg) ? 0 : Math.round(kg / 0.453592 * 10) / 10;
    }
    const lbs = parseFloat(targetWeightVal);
    return isNaN(lbs) ? 0 : lbs;
  }, [isMetric, targetWeightVal]);

  const getWeightDirection = useCallback(() => {
    const current = getCurrentWeightNum();
    const target = getTargetWeightNum();
    if (!target || !current) return null;
    if (target < current - 2) return 'lose';
    if (target > current + 2) return 'gain';
    return 'maintain';
  }, [getCurrentWeightNum, getTargetWeightNum]);

  const buildGymAnswers = useCallback(() => {
    const answers: { question: string; answer: string }[] = [];
    if (fitnessGoal) {
      const goalOpts = [
        { key: 'muscle', label: t('gym_q1_o1') },
        { key: 'strength', label: t('gym_q1_o2') },
        { key: 'lose', label: t('gym_q1_o3') },
        { key: 'fitness', label: t('gym_q1_o4') },
        { key: 'athletic', label: t('gym_q1_o5') },
      ];
      const opt = goalOpts.find(o => o.key === fitnessGoal);
      answers.push({ question: t('gym_q1'), answer: opt?.label || fitnessGoal });
    }
    if (fitnessLevel) {
      const lvlOpts = [
        { key: 'beginner', label: t('gym_q2_o1') },
        { key: 'intermediate', label: t('gym_q2_o2') },
        { key: 'advanced', label: t('gym_q2_o3') },
      ];
      const opt = lvlOpts.find(o => o.key === fitnessLevel);
      answers.push({ question: t('gym_q2'), answer: opt?.label || fitnessLevel });
    }
    if (equipmentAccess) {
      const eqOpts = [
        { key: 'full', label: t('gym_q3_o1') },
        { key: 'home', label: t('gym_q3_o2') },
        { key: 'bodyweight', label: t('gym_q3_o3') },
        { key: 'limited', label: t('gym_q3_o4') },
      ];
      const opt = eqOpts.find(o => o.key === equipmentAccess);
      answers.push({ question: t('gym_q3'), answer: opt?.label || equipmentAccess });
    }
    if (workoutTime) {
      const tmOpts = [
        { key: '30-45', label: t('gym_q4_o1') },
        { key: '45-60', label: t('gym_q4_o2') },
        { key: '60-90', label: t('gym_q4_o3') },
        { key: 'flexible', label: t('gym_q4_o4') },
      ];
      const opt = tmOpts.find(o => o.key === workoutTime);
      answers.push({ question: t('gym_q4'), answer: opt?.label || workoutTime });
    }
    if (physicalLimitations) {
      const limOpts = [
        { key: 'none', label: t('gym_q5_o1') },
        { key: 'back', label: t('gym_q5_o2') },
        { key: 'knee', label: t('gym_q5_o3') },
        { key: 'shoulder', label: t('gym_q5_o4') },
        { key: 'specify', label: t('gym_q5_o5') },
      ];
      const opt = limOpts.find(o => o.key === physicalLimitations);
      answers.push({ question: t('gym_q5'), answer: opt?.label || physicalLimitations });
    }
    return answers;
  }, [fitnessGoal, fitnessLevel, equipmentAccess, workoutTime, physicalLimitations, t]);

  const generateFitnessPlan = async (answers: { question: string; answer: string }[], goals: string) => {
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

      const aiResponse = await callOpenAI(prompt);
      let cleaned = aiResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      const planData = JSON.parse(cleaned);
      console.log('AI-generated plan:', planData);
      return {
        ...planData,
        days: planData.days.map((day: any) => ({
          ...day,
          exercises: day.exercises.map((exercise: any) => ({
            ...exercise,
            videoUrl: getVideoUrlForExercise(exercise.name),
          })),
        })),
      };
    } catch (error) {
      console.error('Error generating AI plan, falling back to preset:', error);
    }

    const fitnessLevelAnswer = buildGymAnswers().find(a => a.question.includes('fitness level'))?.answer || '';
    const primaryGoal = buildGymAnswers().find(a => a.question.includes('primary fitness goal'))?.answer || '';
    const equipmentAnswer = buildGymAnswers().find(a => a.question.includes('equipment'))?.answer || '';

    let planName = "Personalized 5-Day Training Plan";
    let planDescription = "A balanced workout plan tailored to your goals and fitness level.";

    if (primaryGoal.includes('muscle mass')) {
      planName = "Muscle Building Program";
      planDescription = "Focus on hypertrophy with compound movements and progressive overload.";
    } else if (primaryGoal.includes('strength')) {
      planName = "Strength Training Program";
      planDescription = "Build raw strength with heavy compound lifts.";
    } else if (primaryGoal.includes('weight') || primaryGoal.includes('tone')) {
      planName = "Fat Loss & Toning Program";
      planDescription = "High-intensity workouts combining strength and cardio.";
    }

    const isBeginner = fitnessLevelAnswer.includes('Beginner') || fitnessLevelAnswer.includes('Principiante');
    const isBodyweight = equipmentAnswer.includes('bodyweight') || equipmentAnswer.includes('peso corporal');
    const isStrength = primaryGoal.includes('strength') || primaryGoal.includes('fuerza');

    const baseWorkouts = [
      {
        day: 1, name: "Upper Body Push",
        exercises: [
          { name: "Bench Press", sets: isBeginner ? 3 : 4, reps: isStrength ? "4-6" : "8-12", restTime: isStrength ? 180 : 90, equipment: isBodyweight ? "Push-ups" : "Barbell/Dumbbells", description: "Keep core tight, lower with control, press up explosively." },
          { name: "Overhead Press", sets: 3, reps: "8-10", restTime: 90, equipment: isBodyweight ? "Pike Push-ups" : "Dumbbells", description: "Press straight up, core engaged." },
          { name: "Dips", sets: 3, reps: "8-15", restTime: 60, equipment: isBodyweight ? "Chair Dips" : "Dip Station", description: "Lower until shoulders below elbows, press up." },
          { name: "Tricep Extensions", sets: 3, reps: "10-15", restTime: 60, equipment: isBodyweight ? "Diamond Push-ups" : "Dumbbells", description: "Elbows stationary, focus on tricep contraction." },
        ],
      },
      {
        day: 2, name: "Lower Body Power",
        exercises: [
          { name: "Squats", sets: isBeginner ? 3 : 4, reps: isStrength ? "4-6" : "8-12", restTime: isStrength ? 180 : 90, equipment: isBodyweight ? "Bodyweight Squats" : "Barbell", description: "Chest up, knees track over toes, thighs parallel." },
          { name: "Romanian Deadlifts", sets: 3, reps: "8-10", restTime: 90, equipment: isBodyweight ? "Single Leg RDL" : "Dumbbells", description: "Hinge at hips, bar close to body, feel hamstring stretch." },
          { name: "Lunges", sets: 3, reps: "10-12 each leg", restTime: 60, equipment: isBodyweight ? "Bodyweight" : "Dumbbells", description: "Step forward, both knees 90 degrees." },
          { name: "Calf Raises", sets: 3, reps: "15-20", restTime: 45, equipment: "Bodyweight", description: "Rise on toes, squeeze, lower with control." },
        ],
      },
      {
        day: 3, name: "Upper Body Pull",
        exercises: [
          { name: "Pull-ups/Rows", sets: isBeginner ? 3 : 4, reps: isBodyweight ? "5-10" : "8-12", restTime: 90, equipment: isBodyweight ? "Inverted Rows" : "Lat Pulldown", description: "Pull chest to bar, squeeze shoulder blades." },
          { name: "Bent Over Rows", sets: 3, reps: "8-12", restTime: 90, equipment: isBodyweight ? "Inverted Rows" : "Dumbbells", description: "Back straight, pull to lower chest." },
          { name: "Face Pulls", sets: 3, reps: "12-15", restTime: 60, equipment: isBodyweight ? "Reverse Fly" : "Band", description: "Pull to face level, rear delts and upper back." },
          { name: "Bicep Curls", sets: 3, reps: "10-15", restTime: 60, equipment: isBodyweight ? "Chin-ups" : "Dumbbells", description: "Elbows at sides, curl with control." },
        ],
      },
      {
        day: 4, name: "Lower Body Hypertrophy",
        exercises: [
          { name: "Goblet Squats", sets: 3, reps: "12-15", restTime: 60, equipment: isBodyweight ? "Bodyweight" : "Dumbbell", description: "Weight at chest, torso upright." },
          { name: "Bulgarian Split Squats", sets: 3, reps: "10-12 each", restTime: 60, equipment: isBodyweight ? "Bodyweight" : "Dumbbells", description: "Rear foot elevated, lower into lunge." },
          { name: "Hip Thrusts", sets: 3, reps: "12-15", restTime: 60, equipment: isBodyweight ? "Bodyweight" : "Dumbbell", description: "Drive through heels, squeeze glutes." },
          { name: "Wall Sit", sets: 3, reps: "30-60 seconds", restTime: 60, equipment: "Bodyweight", description: "Back against wall, thighs parallel." },
        ],
      },
      {
        day: 5, name: "Full Body Circuit",
        exercises: [
          { name: "Burpees", sets: 3, reps: "8-12", restTime: 60, equipment: "Bodyweight", description: "Drop, jump back, push-up, jump up." },
          { name: "Mountain Climbers", sets: 3, reps: "20-30", restTime: 45, equipment: "Bodyweight", description: "Plank position, alternate knees to chest." },
          { name: "Plank", sets: 3, reps: "30-60 seconds", restTime: 60, equipment: "Bodyweight", description: "Straight line head to heels, core tight." },
          { name: "Jumping Jacks", sets: 3, reps: "20-30", restTime: 45, equipment: "Bodyweight", description: "Jump feet apart, arms overhead." },
        ],
      },
    ];

    return {
      id: `preset-${Date.now()}`,
      name: planName,
      description: planDescription,
      workoutDays: [],
      days: baseWorkouts.map(w => ({
        ...w,
        exercises: w.exercises.map(e => ({ ...e, videoUrl: getVideoUrlForExercise(e.name) })),
      })),
    };
  };

  const startProgressSimulation = (from: number, to: number, durationMs: number) => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    const steps = 20;
    const increment = (to - from) / steps;
    const intervalTime = durationMs / steps;
    let current = from;
    progressIntervalRef.current = setInterval(() => {
      current += increment;
      if (current >= to) {
        current = to;
        if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; }
      }
      setGenerationProgress(current);
    }, intervalTime);
  };

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; }
  };

  const autoCalculateNutrition = useCallback(() => {
    const currentWeight = getCurrentWeightNum();
    const heightInches = getHeightInInches();
    const targetWeight = getTargetWeightNum();
    const direction = getWeightDirection();

    let calorieGoal = 2000;
    let proteinGoal = 150;
    let carbsGoal = 200;
    let fatGoal = 65;

    if (direction === 'lose') {
      calorieGoal = 1800; proteinGoal = 160; carbsGoal = 150; fatGoal = 60;
    } else if (direction === 'gain') {
      calorieGoal = 2500; proteinGoal = 180; carbsGoal = 280; fatGoal = 80;
    }

    updateNutrition({ calorieGoal, proteinGoal, carbsGoal, fatGoal, quizCompleted: true });

    const sixMonthsFromNow = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

    updatePersonalStats({
      weight: currentWeight || undefined,
      height: heightInches || undefined,
      ...(targetWeight ? { targetWeight, goalEndDate: sixMonthsFromNow } : {}),
    });
  }, [getCurrentWeightNum, getHeightInInches, getTargetWeightNum, getWeightDirection, updateNutrition, updatePersonalStats]);

  const generateGymPlan = async () => {
    if (!customGoals.trim()) return;

    setIsGeneratingPlan(true);
    setGenerationProgress(0.05);
    startProgressSimulation(0.05, 0.85, 15000);

    try {
      const answers = buildGymAnswers();
      const planData = await generateFitnessPlan(answers, customGoals);

      stopProgressSimulation();
      setGenerationProgress(0.9);

      const workoutDays = selectedDays.length > 0 ? selectedDays : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const enhancedPlan = { ...planData, workoutDays };
      updateCustomWorkoutPlan(enhancedPlan);
      setGenerationProgress(0.95);

      const fitnessLevelAnswer = answers.find(a => a.question.includes('fitness level'))?.answer || '';
      const starting = getStartingLevelFromQuiz(fitnessLevelAnswer);
      console.log('Setting starting XP from quiz:', starting);
      setStartingXP(starting.totalXP, starting.level);

      autoCalculateNutrition();
      setGenerationProgress(1);

      try {
        const granted = await requestPermissions();
        if (granted) await scheduleAllDailyReminders();
      } catch (e) { console.error('Notification error:', e); }

      setTimeout(() => {
        markWelcomeAsSeen();
        router.push('/paywall');
        router.replace('/(tabs)/home');
      }, 400);
    } catch (error) {
      console.error('Error generating plan:', error);
      stopProgressSimulation();
      setGenerationProgress(1);
      autoCalculateNutrition();
      setTimeout(() => {
        markWelcomeAsSeen();
        router.replace('/(tabs)/home');
      }, 400);
    } finally {
      stopProgressSimulation();
      setIsGeneratingPlan(false);
    }
  };

  const handleScanEquipment = async () => {
    hapticMedium();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS !== 'web') Alert.alert(t('gym_scan_permission'));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true, allowsEditing: false });
      if (result.canceled || !result.assets?.[0]?.base64) return;

      setIsScanningEquipment(true);
      const scanPulse = Animated.loop(Animated.sequence([
        Animated.timing(scanPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(scanPulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]));
      scanPulse.start();

      const prompt = `Analyze this gym photo. Identify equipment and classify into ONE category:
- "Full gym with free weights and machines"
- "Home gym with dumbbells and basic equipment"
- "Bodyweight only (no equipment)"
- "Limited equipment (resistance bands, light weights)"
Respond in JSON: {"category": "...", "equipment_list": "comma-separated list"}
Return ONLY valid JSON.`;

      const aiResponse = await callOpenAIWithVision(prompt, result.assets[0].base64);
      scanPulse.stop();
      scanPulseAnim.setValue(0.4);

      let cleaned = aiResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(cleaned);
      const category = (parsed.category || '').toLowerCase();

      if (category.includes('full gym')) setEquipmentAccess('full');
      else if (category.includes('home gym')) setEquipmentAccess('home');
      else if (category.includes('bodyweight')) setEquipmentAccess('bodyweight');
      else setEquipmentAccess('limited');

      setIsScanningEquipment(false);
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Scan error:', error);
      setIsScanningEquipment(false);
      scanPulseAnim.setValue(0.4);
      if (Platform.OS !== 'web') Alert.alert(t('gym_error'), t('gym_scan_error'));
    }
  };

  const canContinue = useCallback((): boolean => {
    switch (step) {
      case 1: return !!fitnessGoal;
      case 2: return !!fitnessLevel;
      case 3: return !!weightVal && (isMetric ? !!heightCm : (!!heightFt && !!heightIn));
      case 4: return true;
      case 5: return !!equipmentAccess;
      case 6: return !!workoutTime;
      case 7: return !!physicalLimitations;
      case 8: return selectedDays.length > 0;
      case 9: return !!customGoals.trim();
      default: return true;
    }
  }, [step, fitnessGoal, fitnessLevel, weightVal, isMetric, heightCm, heightFt, heightIn, equipmentAccess, workoutTime, physicalLimitations, selectedDays, customGoals]);

  const handleContinue = useCallback(() => {
    if (!canContinue()) return;
    if (step === 9) {
      hapticMedium();
      void generateGymPlan();
      return;
    }
    goNext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canContinue, step, hapticMedium, goNext]);

  if (isGeneratingPlan) {
    return <LoadingScreen insets={insets} progress={generationProgress} lang={language} />;
  }

  const renderHero = () => (
    <View style={[s.flex1, { backgroundColor: '#FFFFFF', paddingTop: insets.top }]}>
      <View style={heroStyles.langRow}>
        <TouchableOpacity
          style={[heroStyles.langButton, language === 'es' && heroStyles.langButtonActive]}
          onPress={() => { hapticLight(); setLanguage(language === 'es' ? 'en' : 'es'); }}
        >
          <Text style={[heroStyles.langText, language === 'es' && heroStyles.langTextActive]}>Español</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[heroStyles.langButton, language === 'pt' && heroStyles.langButtonActive]}
          onPress={() => { hapticLight(); setLanguage(language === 'pt' ? 'en' : 'pt'); }}
        >
          <Text style={[heroStyles.langText, language === 'pt' && heroStyles.langTextActive]}>Português</Text>
        </TouchableOpacity>
      </View>

      <View style={heroStyles.content}>
        <View style={heroStyles.iconWrap}>
          <View style={heroStyles.iconBg}>
            <Dumbbell size={48} color="#00ADB5" strokeWidth={2} />
          </View>
        </View>

        <Text style={heroStyles.appName}>AthliAI</Text>
        <View style={heroStyles.underline} />

        <Text style={heroStyles.tagline}>
          {isPt ? 'Seu treinador pessoal com IA' : isSpanish ? 'Tu entrenador personal con IA' : 'Your AI gym coach'}
        </Text>
        <Text style={heroStyles.description}>
          {isPt
            ? 'Planos de treino personalizados, acompanhamento inteligente e resultados reais — tudo com IA.'
            : isSpanish
            ? 'Planes de entrenamiento personalizados, seguimiento inteligente y resultados reales — todo impulsado por IA.'
            : 'Personalized workout plans, intelligent tracking, and real results — all powered by AI.'}
        </Text>
      </View>

      <View style={[heroStyles.bottomSection, { paddingBottom: Math.max(40, insets.bottom + 20) }]}>
        <TouchableOpacity style={heroStyles.getStartedBtn} onPress={goNext} activeOpacity={0.85}>
          <Text style={heroStyles.getStartedText}>
            {isPt ? 'Começar' : isSpanish ? 'Comenzar' : 'Get Started'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={heroStyles.skipLink} onPress={handleSkip}>
          <Text style={heroStyles.skipLinkText}>
            {isPt ? 'Pular configuração' : isSpanish ? 'Omitir configuración' : 'Skip setup'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSelectionStep = (
    title: string,
    subtitle: string,
    options: { key: string; label: string; icon?: any }[],
    selectedKey: string | null,
    onSelect: (key: string) => void,
    extra?: React.ReactNode,
  ) => (
    <View style={stepStyles.content}>
      <Text style={stepStyles.title}>{title}</Text>
      {subtitle ? <Text style={stepStyles.subtitle}>{subtitle}</Text> : null}
      <View style={stepStyles.optionsWrap}>
        {options.map((opt) => {
          const isSelected = selectedKey === opt.key;
          const IconComp = opt.icon;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[stepStyles.optionCard, isSelected && stepStyles.optionCardSelected]}
              onPress={() => { hapticLight(); onSelect(opt.key); }}
              activeOpacity={0.7}
            >
              {IconComp && (
                <View style={[stepStyles.optionIconWrap, isSelected && stepStyles.optionIconWrapSelected]}>
                  <IconComp size={20} color={isSelected ? '#00ADB5' : '#9CA3AF'} />
                </View>
              )}
              <Text style={[stepStyles.optionText, isSelected && stepStyles.optionTextSelected]}>{opt.label}</Text>
              {isSelected && (
                <View style={stepStyles.checkCircle}>
                  <Check size={14} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {extra}
    </View>
  );

  const renderBodyStats = () => (
    <View style={stepStyles.content}>
      <Text style={stepStyles.title}>
        {isPt ? 'Altura e peso' : isSpanish ? 'Altura y peso' : 'Height & weight'}
      </Text>
      <Text style={stepStyles.subtitle}>
        {isPt ? 'Será usado para calibrar seu plano personalizado.' : isSpanish ? 'Se usará para calibrar tu plan personalizado.' : 'This will be used to calibrate your custom plan.'}
      </Text>

      <View style={bodyStyles.toggleRow}>
        <Text style={[bodyStyles.toggleLabel, !isMetric && bodyStyles.toggleLabelActive]}>
          Imperial
        </Text>
        <Switch
          value={isMetric}
          onValueChange={(val) => setIsMetric(val)}
          trackColor={{ false: '#E5E7EB', true: '#00ADB5' }}
          thumbColor="#FFFFFF"
        />
        <Text style={[bodyStyles.toggleLabel, isMetric && bodyStyles.toggleLabelActive]}>
          {isPt ? 'Métrico' : isSpanish ? 'Métrico' : 'Metric'}
        </Text>
      </View>

      <View style={bodyStyles.fieldsRow}>
        <View style={bodyStyles.fieldGroup}>
          <Text style={bodyStyles.fieldLabel}>
            {isPt ? 'Altura' : isSpanish ? 'Altura' : 'Height'}
          </Text>
          {isMetric ? (
            <View style={bodyStyles.inputRow}>
              <TextInput
                style={bodyStyles.input}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
                placeholder="170"
                placeholderTextColor="#C4C4C4"
              />
              <Text style={bodyStyles.unitLabel}>cm</Text>
            </View>
          ) : (
            <View style={bodyStyles.inputRow}>
              <TextInput
                style={[bodyStyles.input, { flex: 1 }]}
                value={heightFt}
                onChangeText={setHeightFt}
                keyboardType="numeric"
                placeholder="5"
                placeholderTextColor="#C4C4C4"
              />
              <Text style={bodyStyles.unitLabel}>ft</Text>
              <TextInput
                style={[bodyStyles.input, { flex: 1 }]}
                value={heightIn}
                onChangeText={setHeightIn}
                keyboardType="numeric"
                placeholder="8"
                placeholderTextColor="#C4C4C4"
              />
              <Text style={bodyStyles.unitLabel}>in</Text>
            </View>
          )}
        </View>

        <View style={bodyStyles.fieldGroup}>
          <Text style={bodyStyles.fieldLabel}>
            {isPt ? 'Peso' : isSpanish ? 'Peso' : 'Weight'}
          </Text>
          <View style={bodyStyles.inputRow}>
            <TextInput
              style={bodyStyles.input}
              value={weightVal}
              onChangeText={setWeightVal}
              keyboardType="numeric"
              placeholder={isMetric ? '75' : '165'}
              placeholderTextColor="#C4C4C4"
            />
            <Text style={bodyStyles.unitLabel}>{getWeightUnit()}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderTargetWeight = () => {
    const direction = getWeightDirection();
    const directionLabel = direction === 'lose'
      ? (isPt ? 'Perder peso' : isSpanish ? 'Perder peso' : 'Lose weight')
      : direction === 'gain'
        ? (isPt ? 'Ganhar peso' : isSpanish ? 'Ganar peso' : 'Gain weight')
        : (isPt ? 'Manter peso' : isSpanish ? 'Mantener peso' : 'Maintain weight');

    return (
      <View style={stepStyles.content}>
        <Text style={stepStyles.title}>
          {isPt ? 'Qual é seu peso alvo?' : isSpanish ? '¿Cuál es tu peso objetivo?' : 'What is your target weight?'}
        </Text>
        <Text style={stepStyles.subtitle}>
          {isPt ? 'Opcional — você pode pular este passo.' : isSpanish ? 'Opcional — puedes omitir este paso.' : 'Optional — you can skip this step.'}
        </Text>

        <View style={targetStyles.centerWrap}>
          {targetWeightVal ? (
            <>
              <Text style={targetStyles.directionLabel}>{directionLabel}</Text>
              <Text style={targetStyles.bigWeight}>
                {targetWeightVal} {getWeightUnit()}
              </Text>
            </>
          ) : (
            <Text style={targetStyles.placeholder}>
              {isPt ? 'Insira seu peso alvo' : isSpanish ? 'Ingresa tu peso objetivo' : 'Enter your target weight'}
            </Text>
          )}
        </View>

        <View style={targetStyles.inputWrap}>
          <TextInput
            style={targetStyles.input}
            value={targetWeightVal}
            onChangeText={setTargetWeightVal}
            keyboardType="numeric"
            placeholder={isMetric ? '70' : '155'}
            placeholderTextColor="#C4C4C4"
            textAlign="center"
          />
          <Text style={targetStyles.inputUnit}>{getWeightUnit()}</Text>
        </View>
      </View>
    );
  };

  const renderEquipmentStep = () => (
    <>
      {renderSelectionStep(
        t('gym_q3'),
        isPt ? 'Selecione seu acesso a equipamento' : isSpanish ? 'Selecciona tu acceso a equipo' : 'Select your equipment access',
        equipmentOptions,
        equipmentAccess,
        setEquipmentAccess,
        isScanningEquipment ? (
          <View style={scanStyles.scanningContainer}>
            <Animated.View style={[scanStyles.scanningIconWrap, { opacity: scanPulseAnim }]}>
              <Camera size={40} color="#00ADB5" />
            </Animated.View>
            <Text style={scanStyles.scanningText}>{t('gym_scan_analyzing')}</Text>
          </View>
        ) : (
          <TouchableOpacity style={scanStyles.scanButton} onPress={handleScanEquipment} activeOpacity={0.7}>
            <View style={scanStyles.scanButtonInner}>
              <View style={scanStyles.scanIconCircle}>
                <Camera size={20} color="#00ADB5" />
              </View>
              <View style={scanStyles.scanTextWrap}>
                <Text style={scanStyles.scanButtonTitle}>{t('gym_q3_o5_scan')}</Text>
                <Text style={scanStyles.scanButtonSub}>
                  {isPt ? 'A IA detectará seu equipamento' : isSpanish ? 'La IA detectará tu equipo' : 'AI will detect your equipment'}
                </Text>
              </View>
              <ChevronRight size={18} color="#00ADB5" />
            </View>
          </TouchableOpacity>
        ),
      )}
    </>
  );

  const renderWorkoutDays = () => {
    const days = [
      { key: 'monday', label: t('day_monday'), short: isPt ? 'S' : isSpanish ? 'L' : 'M' },
      { key: 'tuesday', label: t('day_tuesday'), short: isPt ? 'T' : isSpanish ? 'Ma' : 'Tu' },
      { key: 'wednesday', label: t('day_wednesday'), short: isPt ? 'Q' : isSpanish ? 'Mi' : 'W' },
      { key: 'thursday', label: t('day_thursday'), short: isPt ? 'Qi' : isSpanish ? 'J' : 'Th' },
      { key: 'friday', label: t('day_friday'), short: isPt ? 'Sx' : isSpanish ? 'V' : 'F' },
      { key: 'saturday', label: t('day_saturday'), short: isPt ? 'Sa' : isSpanish ? 'S' : 'Sa' },
      { key: 'sunday', label: t('day_sunday'), short: isPt ? 'D' : isSpanish ? 'D' : 'Su' },
    ];

    return (
      <View style={stepStyles.content}>
        <Text style={stepStyles.title}>
          {isPt ? 'Selecione seus dias de treino' : isSpanish ? 'Selecciona tus días de entrenamiento' : 'Select your workout days'}
        </Text>
        <Text style={stepStyles.subtitle}>
          {isPt ? 'Escolha em quais dias quer treinar' : isSpanish ? 'Elige qué días quieres entrenar' : 'Choose which days you want to train'}
        </Text>

        <View style={dayStyles.grid}>
          {days.map((day) => {
            const isSelected = selectedDays.includes(day.key);
            return (
              <TouchableOpacity
                key={day.key}
                style={[dayStyles.dayCard, isSelected && dayStyles.dayCardSelected]}
                onPress={() => {
                  hapticLight();
                  setSelectedDays(prev =>
                    prev.includes(day.key)
                      ? prev.filter(d => d !== day.key)
                      : [...prev, day.key]
                  );
                }}
                activeOpacity={0.7}
              >
                <Text style={[dayStyles.dayShort, isSelected && dayStyles.dayShortSelected]}>{day.short}</Text>
                <Text style={[dayStyles.dayLabel, isSelected && dayStyles.dayLabelSelected]}>{day.label}</Text>
                {isSelected && (
                  <View style={dayStyles.checkDot}>
                    <Check size={10} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={dayStyles.countLabel}>
          {selectedDays.length} {isPt ? 'dias selecionados' : isSpanish ? 'días seleccionados' : 'days selected'}
        </Text>
      </View>
    );
  };

  const renderGoalsInput = () => (
    <View style={stepStyles.content}>
      <Text style={stepStyles.title}>
        {isPt ? 'Algum objetivo específico?' : isSpanish ? '¿Algún objetivo específico?' : 'Any specific goals?'}
      </Text>
      <Text style={stepStyles.subtitle}>
        {isPt
          ? 'Conte-nos sobre áreas específicas ou limitações que devemos saber.'
          : isSpanish
          ? 'Cuéntanos sobre áreas específicas o limitaciones que debamos saber.'
          : 'Tell us about specific areas you want to focus on or anything we should know.'}
      </Text>

      <TextInput
        style={goalsStyles.textArea}
        multiline
        numberOfLines={4}
        placeholder={
          isPt
            ? 'ex., Quero braços e peito maiores, melhorar minha postura...'
            : isSpanish
            ? 'ej., Quiero brazos y pecho más grandes, mejorar mi postura...'
            : 'e.g., I want bigger arms and chest, improve my posture...'
        }
        placeholderTextColor="#B0B0B0"
        value={customGoals}
        onChangeText={setCustomGoals}
        textAlignVertical="top"
      />
    </View>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderSelectionStep(
          t('gym_q1'),
          isPt ? 'Isso guiará seu plano de treino' : isSpanish ? 'Esto guiará tu plan de entrenamiento' : 'This will guide your training plan',
          goalOptions,
          fitnessGoal,
          setFitnessGoal,
        );
      case 2:
        return renderSelectionStep(
          t('gym_q2'),
          isPt ? 'Seja honesto — não há respostas erradas' : isSpanish ? 'Sé honesto — no hay respuestas incorrectas' : "Be honest — there are no wrong answers",
          levelOptions,
          fitnessLevel,
          setFitnessLevel,
        );
      case 3:
        return renderBodyStats();
      case 4:
        return renderTargetWeight();
      case 5:
        return renderEquipmentStep();
      case 6:
        return renderSelectionStep(
          t('gym_q4'),
          isPt ? 'Vamos adaptar seu plano ao seu horário' : isSpanish ? 'Adaptaremos tu plan a tu horario' : "We'll fit your plan to your schedule",
          timeOptions,
          workoutTime,
          setWorkoutTime,
        );
      case 7:
        return renderSelectionStep(
          t('gym_q5'),
          isPt ? 'Sua segurança vem primeiro' : isSpanish ? 'Tu seguridad es lo primero' : 'Your safety comes first',
          limitationOptions.map(o => ({ ...o, icon: o.key === 'none' ? Shield : undefined })),
          physicalLimitations,
          setPhysicalLimitations,
        );
      case 8:
        return renderWorkoutDays();
      case 9:
        return renderGoalsInput();
      default:
        return null;
    }
  };

  if (step === 0) return renderHero();

  const continueLabel = step === 9
    ? (isPt ? 'Criar Meu Plano' : isSpanish ? 'Crear Mi Plan' : 'Create My Plan')
    : (isPt ? 'Continuar' : isSpanish ? 'Continuar' : 'Continue');

  return (
    <View style={[s.flex1, { backgroundColor: '#FFFFFF', paddingTop: insets.top }]}>
      <View style={headerStyles.container}>
        <TouchableOpacity style={headerStyles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <ChevronLeft size={22} color="#2C2C2C" />
        </TouchableOpacity>
        <View style={headerStyles.progressTrack}>
          <View style={[headerStyles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.flex1}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={s.flex1}
          contentContainerStyle={stepStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>

        <View style={[footerStyles.container, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
          <TouchableOpacity
            style={[footerStyles.continueBtn, !canContinue() && footerStyles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!canContinue()}
            activeOpacity={0.85}
          >
            <Text style={footerStyles.continueText}>{continueLabel}</Text>
            {step === 9 && <Target size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />}
          </TouchableOpacity>
          {step === 4 && !targetWeightVal && (
            <TouchableOpacity style={footerStyles.skipBtn} onPress={goNext}>
              <Text style={footerStyles.skipText}>{isPt ? 'Pular' : isSpanish ? 'Omitir' : 'Skip'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  flex1: { flex: 1 },
});

const heroStyles = StyleSheet.create({
  langRow: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  langButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  },
  langText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  langButtonActive: {
    backgroundColor: '#1A1A2E',
  },
  langTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 32,
  },
  iconWrap: {
    marginBottom: 28,
  },
  iconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F0FAFA',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: '#D1F0F0',
  },
  appName: {
    fontSize: 52,
    fontWeight: '900' as const,
    color: '#1A1A2E',
    letterSpacing: -2,
    marginBottom: 4,
  },
  underline: {
    width: 64,
    height: 4,
    backgroundColor: '#00ADB5',
    borderRadius: 2,
    marginBottom: 24,
  },
  tagline: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#2C2C2C',
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    color: '#7A7A7A',
    textAlign: 'center' as const,
    maxWidth: 300,
  },
  bottomSection: {
    paddingHorizontal: 24,
    alignItems: 'center' as const,
  },
  getStartedBtn: {
    width: '100%',
    backgroundColor: '#1A1A2E',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  skipLink: {
    marginTop: 16,
    paddingVertical: 8,
  },
  skipLinkText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500' as const,
  },
});

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1A1A2E',
    borderRadius: 2,
  },
});

const stepStyles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#1A1A2E',
    letterSpacing: -0.5,
    marginBottom: 8,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    color: '#7A7A7A',
    lineHeight: 22,
    marginBottom: 28,
  },
  optionsWrap: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    gap: 14,
  },
  optionCardSelected: {
    backgroundColor: '#F0FAFA',
    borderColor: '#00ADB5',
  },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  optionIconWrapSelected: {
    backgroundColor: '#D1F0F0',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#374151',
  },
  optionTextSelected: {
    fontWeight: '600' as const,
    color: '#00929A',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00ADB5',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});

const bodyStyles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
    marginBottom: 32,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#C4C4C4',
  },
  toggleLabelActive: {
    color: '#1A1A2E',
  },
  fieldsRow: {
    gap: 24,
  },
  fieldGroup: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1A2E',
    textAlign: 'center' as const,
  },
  inputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1A1A2E',
    textAlign: 'center' as const,
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#9CA3AF',
    minWidth: 24,
  },
});

const targetStyles = StyleSheet.create({
  centerWrap: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 40,
  },
  directionLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#7A7A7A',
    marginBottom: 8,
  },
  bigWeight: {
    fontSize: 48,
    fontWeight: '800' as const,
    color: '#1A1A2E',
    letterSpacing: -1,
  },
  placeholder: {
    fontSize: 18,
    color: '#C4C4C4',
    fontWeight: '500' as const,
  },
  inputWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 16,
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1A1A2E',
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  inputUnit: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#9CA3AF',
  },
});

const dayStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    justifyContent: 'center' as const,
    marginBottom: 20,
  },
  dayCard: {
    width: 90,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    alignItems: 'center' as const,
    gap: 4,
  },
  dayCardSelected: {
    backgroundColor: '#F0FAFA',
    borderColor: '#00ADB5',
  },
  dayShort: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#C4C4C4',
  },
  dayShortSelected: {
    color: '#00ADB5',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#9CA3AF',
  },
  dayLabelSelected: {
    color: '#00929A',
  },
  checkDot: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00ADB5',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  countLabel: {
    fontSize: 14,
    color: '#7A7A7A',
    textAlign: 'center' as const,
    fontWeight: '500' as const,
  },
});

const goalsStyles = StyleSheet.create({
  textArea: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A1A2E',
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    minHeight: 120,
    lineHeight: 24,
  },
});

const footerStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  continueBtn: {
    width: '100%',
    backgroundColor: '#1A1A2E',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
  },
  continueBtnDisabled: {
    opacity: 0.35,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  skipBtn: {
    marginTop: 12,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  skipText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500' as const,
  },
});

const scanStyles = StyleSheet.create({
  scanningContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 32,
    gap: 16,
  },
  scanningIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 173, 181, 0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: 'rgba(0, 173, 181, 0.3)',
  },
  scanningText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1A1A2E',
  },
  scanButton: {
    borderWidth: 2,
    borderColor: 'rgba(0, 173, 181, 0.4)',
    borderStyle: 'dashed' as const,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 173, 181, 0.06)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 12,
  },
  scanButtonInner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
  },
  scanIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 173, 181, 0.15)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  scanTextWrap: {
    flex: 1,
    gap: 2,
  },
  scanButtonTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#00ADB5',
  },
  scanButtonSub: {
    fontSize: 12,
    color: '#7A7A7A',
  },
});

const loadingStyles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    alignItems: 'center' as const,
  },
  topSection: {
    alignItems: 'center' as const,
    marginBottom: 40,
  },
  iconArea: {
    width: 120,
    height: 120,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 28,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 173, 181, 0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  ring: {
    position: 'absolute' as const,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2.5,
    borderColor: 'transparent',
    borderTopColor: '#00ADB5',
    borderRightColor: '#00E5FF',
  },
  ringInner: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#1A1A2E',
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  percent: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: '#00ADB5',
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  progressBarWrap: {
    width: '100%',
    alignItems: 'center' as const,
  },
  progressBarBg: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00ADB5',
    borderRadius: 3,
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  stepRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  stepDotComplete: {
    backgroundColor: '#00ADB5',
  },
  stepDotActive: {
    backgroundColor: 'rgba(0, 173, 181, 0.2)',
    borderWidth: 2,
    borderColor: '#00ADB5',
  },
  stepLabel: {
    fontSize: 15,
    color: '#5A5A5E',
    fontWeight: '500' as const,
    flex: 1,
  },
  stepLabelActive: {
    color: '#2C2C2C',
    fontWeight: '600' as const,
  },
  stepLabelComplete: {
    color: '#8E8E93',
  },
  stepPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ADB5',
  },
  tipCard: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#00ADB5',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  tipHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 10,
  },
  tipHeaderText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#00929A',
    letterSpacing: 1.2,
  },
  tipText: {
    fontSize: 14,
    color: '#7A7A7A',
    lineHeight: 22,
  },
});
