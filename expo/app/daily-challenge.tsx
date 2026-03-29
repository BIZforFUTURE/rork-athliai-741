import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  TextInput,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ArrowLeft,
  Trophy,
  Clock,
  Flame,
  Check,
  Zap,
  Timer,
  Target,
  ChevronRight,
  Star,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "@/providers/LanguageProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface DailyChallenge {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  duration: string;
  durationEs: string;
  howTo: string;
  howToEs: string;
  tips: string[];
  tipsEs: string[];
  icon: "plank" | "pushups" | "squats" | "wallsit" | "burpees" | "lunges" | "mountainclimbers" | "jumpingjacks";
  difficulty: "easy" | "medium" | "hard";
  xpReward: number;
  color: string;
  accentColor: string;
}

const DAILY_CHALLENGES: DailyChallenge[] = [
  {
    id: "plank-hold",
    name: "Plank Hold",
    nameEs: "Plancha",
    description: "Hold a plank position for as long as you can. Target: 60 seconds.",
    descriptionEs: "Mantén la posición de plancha el mayor tiempo posible. Meta: 60 segundos.",
    duration: "60 seconds",
    durationEs: "60 segundos",
    howTo: "Get into a push-up position but rest on your forearms. Keep your body in a straight line from head to heels. Engage your core and don't let your hips sag or pike up.",
    howToEs: "Ponte en posición de flexión pero apóyate en tus antebrazos. Mantén tu cuerpo en línea recta de la cabeza a los talones. Activa tu core y no dejes que tus caderas se hundan o se eleven.",
    tips: ["Breathe steadily throughout", "Look at a spot on the floor", "Squeeze your glutes", "Keep your shoulders over elbows"],
    tipsEs: ["Respira de manera constante", "Mira un punto en el suelo", "Aprieta los glúteos", "Mantén los hombros sobre los codos"],
    icon: "plank",
    difficulty: "medium",
    xpReward: 25,
    color: "#0EA5E9",
    accentColor: "#38BDF8",
  },
  {
    id: "pushup-challenge",
    name: "50 Push-Ups",
    nameEs: "50 Flexiones",
    description: "Complete 50 push-ups. Break them into sets if needed.",
    descriptionEs: "Completa 50 flexiones. Divídelas en series si es necesario.",
    duration: "50 reps",
    durationEs: "50 repeticiones",
    howTo: "Start in a high plank position with hands shoulder-width apart. Lower your chest to the ground, keeping elbows at 45 degrees. Push back up to the starting position.",
    howToEs: "Comienza en posición de plancha alta con las manos al ancho de los hombros. Baja el pecho al suelo, manteniendo los codos a 45 grados. Empuja hacia arriba a la posición inicial.",
    tips: ["Do sets of 10 with short rests", "Keep your core tight", "Full range of motion", "Modify on knees if needed"],
    tipsEs: ["Haz series de 10 con descansos cortos", "Mantén el core apretado", "Rango completo de movimiento", "Modifica de rodillas si es necesario"],
    icon: "pushups",
    difficulty: "hard",
    xpReward: 35,
    color: "#EF4444",
    accentColor: "#F87171",
  },
  {
    id: "squat-challenge",
    name: "100 Squats",
    nameEs: "100 Sentadillas",
    description: "Complete 100 bodyweight squats throughout the day.",
    descriptionEs: "Completa 100 sentadillas con peso corporal a lo largo del día.",
    duration: "100 reps",
    durationEs: "100 repeticiones",
    howTo: "Stand with feet shoulder-width apart. Push your hips back and bend your knees as if sitting in a chair. Go down until thighs are parallel to the floor, then stand back up.",
    howToEs: "Párate con los pies al ancho de los hombros. Empuja las caderas hacia atrás y dobla las rodillas como si te sentaras. Baja hasta que los muslos estén paralelos al suelo, luego levántate.",
    tips: ["Break into sets of 20", "Keep chest up throughout", "Knees track over toes", "Drive through your heels"],
    tipsEs: ["Divide en series de 20", "Mantén el pecho arriba", "Las rodillas siguen la dirección de los pies", "Empuja con los talones"],
    icon: "squats",
    difficulty: "medium",
    xpReward: 30,
    color: "#8B5CF6",
    accentColor: "#A78BFA",
  },
  {
    id: "wall-sit",
    name: "Wall Sit Challenge",
    nameEs: "Sentadilla en Pared",
    description: "Hold a wall sit for 90 seconds total. Break into sets if needed.",
    descriptionEs: "Mantén la sentadilla en pared por 90 segundos en total. Divide en series si es necesario.",
    duration: "90 seconds",
    durationEs: "90 segundos",
    howTo: "Lean your back flat against a wall. Slide down until your thighs are parallel to the ground. Keep your knees at 90 degrees and hold the position.",
    howToEs: "Apoya tu espalda plana contra una pared. Deslízate hacia abajo hasta que tus muslos estén paralelos al suelo. Mantén las rodillas a 90 grados y sostén la posición.",
    tips: ["Press your back flat into the wall", "Breathe normally", "Focus on a point ahead", "Engage your quads"],
    tipsEs: ["Presiona la espalda contra la pared", "Respira normalmente", "Enfoca la vista en un punto", "Activa los cuádriceps"],
    icon: "wallsit",
    difficulty: "medium",
    xpReward: 25,
    color: "#F59E0B",
    accentColor: "#FBBF24",
  },
  {
    id: "burpee-blast",
    name: "30 Burpees",
    nameEs: "30 Burpees",
    description: "Complete 30 burpees as fast as you can with good form.",
    descriptionEs: "Completa 30 burpees lo más rápido posible con buena forma.",
    duration: "30 reps",
    durationEs: "30 repeticiones",
    howTo: "From standing, drop into a squat with hands on the floor. Jump feet back to plank. Do a push-up, jump feet forward, then explode up with a jump and arms overhead.",
    howToEs: "Desde de pie, baja a sentadilla con manos en el suelo. Salta los pies a plancha. Haz una flexión, salta los pies adelante, luego salta con los brazos arriba.",
    tips: ["Pace yourself — don't burn out", "Land softly on the jump", "Keep core engaged", "Breathe on each rep"],
    tipsEs: ["Mide tu ritmo — no te agotes", "Aterriza suave en el salto", "Mantén el core activado", "Respira en cada repetición"],
    icon: "burpees",
    difficulty: "hard",
    xpReward: 40,
    color: "#EC4899",
    accentColor: "#F472B6",
  },
  {
    id: "lunge-walk",
    name: "60 Walking Lunges",
    nameEs: "60 Zancadas",
    description: "Complete 60 walking lunges (30 per leg).",
    descriptionEs: "Completa 60 zancadas caminando (30 por pierna).",
    duration: "60 reps",
    durationEs: "60 repeticiones",
    howTo: "Step forward with one leg and lower until both knees are at 90 degrees. Push off your front foot and step through with the back leg to repeat on the other side.",
    howToEs: "Da un paso adelante con una pierna y baja hasta que ambas rodillas estén a 90 grados. Empuja con el pie delantero y da paso con la pierna trasera para repetir del otro lado.",
    tips: ["Keep torso upright", "Don't let knee pass toes", "Take controlled steps", "Alternate legs each rep"],
    tipsEs: ["Mantén el torso erguido", "No dejes que la rodilla pase los dedos", "Da pasos controlados", "Alterna piernas cada repetición"],
    icon: "lunges",
    difficulty: "medium",
    xpReward: 30,
    color: "#10B981",
    accentColor: "#34D399",
  },
  {
    id: "mountain-climbers",
    name: "100 Mountain Climbers",
    nameEs: "100 Escaladores",
    description: "Complete 100 mountain climbers (50 per side) at high intensity.",
    descriptionEs: "Completa 100 escaladores (50 por lado) a alta intensidad.",
    duration: "100 reps",
    durationEs: "100 repeticiones",
    howTo: "Start in a high plank position. Drive one knee toward your chest, then quickly switch legs in a running motion. Keep your hips level and core tight.",
    howToEs: "Comienza en posición de plancha alta. Lleva una rodilla hacia el pecho, luego cambia rápidamente las piernas en movimiento de carrera. Mantén las caderas niveladas y el core apretado.",
    tips: ["Keep a steady rhythm", "Don't bounce your hips", "Hands under shoulders", "Go fast but controlled"],
    tipsEs: ["Mantén un ritmo constante", "No rebotes las caderas", "Manos bajo los hombros", "Ve rápido pero controlado"],
    icon: "mountainclimbers",
    difficulty: "hard",
    xpReward: 35,
    color: "#F97316",
    accentColor: "#FB923C",
  },
  {
    id: "jumping-jacks",
    name: "200 Jumping Jacks",
    nameEs: "200 Saltos de Tijera",
    description: "Complete 200 jumping jacks. A classic cardio burner!",
    descriptionEs: "Completa 200 saltos de tijera. ¡Un clásico quemador de calorías!",
    duration: "200 reps",
    durationEs: "200 repeticiones",
    howTo: "Stand with feet together and arms at your sides. Jump your feet apart while raising your arms overhead. Jump back to the starting position and repeat.",
    howToEs: "Párate con los pies juntos y brazos a los lados. Salta separando los pies mientras levas los brazos arriba. Salta de vuelta a la posición inicial y repite.",
    tips: ["Land on the balls of your feet", "Keep arms fully extended", "Stay light on your feet", "Break into sets of 50"],
    tipsEs: ["Aterriza en la punta de los pies", "Mantén los brazos extendidos", "Mantente ligero en los pies", "Divide en series de 50"],
    icon: "jumpingjacks",
    difficulty: "easy",
    xpReward: 20,
    color: "#06B6D4",
    accentColor: "#22D3EE",
  },
];

const CHALLENGE_STORAGE_KEY = "daily_challenge_data";

interface ChallengeData {
  lastCompletedDate: string | null;
  streak: number;
  bestStreak: number;
  totalCompleted: number;
}

function getDailyChallengeIndex(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return dayOfYear % DAILY_CHALLENGES.length;
}

function getIconForChallenge(type: DailyChallenge["icon"], size: number, color: string) {
  switch (type) {
    case "plank":
      return <Timer size={size} color={color} />;
    case "pushups":
      return <Zap size={size} color={color} />;
    case "squats":
      return <Target size={size} color={color} />;
    case "wallsit":
      return <Clock size={size} color={color} />;
    case "burpees":
      return <Flame size={size} color={color} />;
    case "lunges":
      return <ChevronRight size={size} color={color} />;
    case "mountainclimbers":
      return <Flame size={size} color={color} />;
    case "jumpingjacks":
      return <Star size={size} color={color} />;
    default:
      return <Zap size={size} color={color} />;
  }
}

function getDifficultyLabel(difficulty: DailyChallenge["difficulty"], isSpanish: boolean): string {
  if (isSpanish) {
    return difficulty === "easy" ? "Fácil" : difficulty === "medium" ? "Medio" : "Difícil";
  }
  return difficulty === "easy" ? "Easy" : difficulty === "medium" ? "Medium" : "Hard";
}

export default function DailyChallengeScreen() {
  const insets = useSafeAreaInsets();
  const { t, isSpanish } = useLanguage();
  const [challengeData, setChallengeData] = useState<ChallengeData>({
    lastCompletedDate: null,
    streak: 0,
    bestStreak: 0,
    totalCompleted: 0,
  });
  const [isCompleted, setIsCompleted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);
  const holdProgressAnim = useRef(new Animated.Value(0)).current;

  const REQUIRED_TEXT = "I fully completed my daily challenge today";
  const REQUIRED_TEXT_ES = "Completé mi desafío diario hoy";
  const HOLD_DURATION = 5000;

  const requiredText = isSpanish ? REQUIRED_TEXT_ES : REQUIRED_TEXT;
  const textMatches = confirmText.trim().toLowerCase() === requiredText.toLowerCase();

  const heroScale = useRef(new Animated.Value(0.9)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(30)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const completeBtnScale = useRef(new Animated.Value(1)).current;
  const confettiOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  const todayChallenge = useMemo(() => DAILY_CHALLENGES[getDailyChallengeIndex()], []);
  const todayStr = new Date().toDateString();

  const loadChallengeData = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(CHALLENGE_STORAGE_KEY);
      if (stored) {
        const data: ChallengeData = JSON.parse(stored);
        setChallengeData(data);
        if (data.lastCompletedDate === todayStr) {
          setIsCompleted(true);
        }
      }
    } catch (e) {
      console.log("Error loading challenge data:", e);
    }
  }, [todayStr]);

  useEffect(() => {
    void loadChallengeData();
    Animated.parallel([
      Animated.spring(heroScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.timing(heroOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();
  }, [loadChallengeData, heroScale, heroOpacity, contentSlide, contentOpacity]);

  const [timeRemaining, setTimeRemaining] = useState("");

  useEffect(() => {
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

  const completeChallenge = useCallback(async () => {
    if (isCompleted) return;

    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const newStreak = challengeData.lastCompletedDate === yesterdayStr ? challengeData.streak + 1 : 1;
    const newBest = Math.max(newStreak, challengeData.bestStreak);

    const newData: ChallengeData = {
      lastCompletedDate: todayStr,
      streak: newStreak,
      bestStreak: newBest,
      totalCompleted: challengeData.totalCompleted + 1,
    };

    setChallengeData(newData);
    setIsCompleted(true);
    setShowConfetti(true);

    try {
      await AsyncStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      console.log("Error saving challenge data:", e);
    }

    Animated.sequence([
      Animated.timing(completeBtnScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(completeBtnScale, { toValue: 1.05, duration: 200, useNativeDriver: true }),
      Animated.timing(completeBtnScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(confettiOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(checkScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(confettiOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start(() => {
          setShowConfetti(false);
        });
      }, 2000);
    });
  }, [isCompleted, challengeData, todayStr, completeBtnScale, confettiOpacity, checkScale]);

  const startHold = useCallback(() => {
    if (!textMatches || isCompleted) return;
    setIsHolding(true);
    holdStartRef.current = Date.now();
    holdProgressAnim.setValue(0);

    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Animated.timing(holdProgressAnim, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    }).start();

    let lastHapticAt = 0;
    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);
      setHoldProgress(progress);

      if (Platform.OS !== 'web') {
        const hapticInterval = progress < 0.5 ? 500 : progress < 0.8 ? 300 : 150;
        if (elapsed - lastHapticAt >= hapticInterval) {
          lastHapticAt = elapsed;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }

      if (progress >= 1) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        setIsHolding(false);
        setHoldProgress(0);
        holdProgressAnim.setValue(0);
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        void completeChallenge();
      }
    }, 50);
  }, [textMatches, isCompleted, completeChallenge, holdProgressAnim]);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
    holdProgressAnim.stopAnimation();
    holdProgressAnim.setValue(0);
  }, [holdProgressAnim]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, []);

  const challengeName = isSpanish ? todayChallenge.nameEs : todayChallenge.name;
  const challengeDesc = isSpanish ? todayChallenge.descriptionEs : todayChallenge.description;
  const challengeDuration = isSpanish ? todayChallenge.durationEs : todayChallenge.duration;
  const challengeHowTo = isSpanish ? todayChallenge.howToEs : todayChallenge.howTo;
  const challengeTips = isSpanish ? todayChallenge.tipsEs : todayChallenge.tips;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (Platform.OS !== "web") {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            router.back();
          }}
          testID="daily-challenge-back"
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("daily_challenge_title" as any)}</Text>
        <View style={styles.timerPill}>
          <Clock size={12} color={todayChallenge.accentColor} />
          <Text style={[styles.timerText, { color: todayChallenge.accentColor }]}>{timeRemaining}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.heroSection, { transform: [{ scale: heroScale }], opacity: heroOpacity }]}>
          <LinearGradient
            colors={[todayChallenge.color, `${todayChallenge.color}CC`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroDecoration}>
              {[...Array(6)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.heroCircle,
                    {
                      width: 40 + i * 30,
                      height: 40 + i * 30,
                      borderRadius: 20 + i * 15,
                      right: -20 + i * 5,
                      top: -10 + i * 8,
                      opacity: 0.06 + i * 0.02,
                    },
                  ]}
                />
              ))}
            </View>

            <View style={styles.heroContent}>
              <View style={styles.heroBadgeRow}>
                <View style={styles.difficultyBadge}>
                  <Text style={styles.difficultyText}>{getDifficultyLabel(todayChallenge.difficulty, isSpanish)}</Text>
                </View>
                <View style={styles.xpBadge}>
                  <Zap size={12} color="#FFD700" />
                  <Text style={styles.xpBadgeText}>+{todayChallenge.xpReward} XP</Text>
                </View>
              </View>

              <View style={styles.heroIconWrap}>
                {getIconForChallenge(todayChallenge.icon, 48, "#FFFFFF")}
              </View>

              <Text style={styles.heroTitle}>{challengeName}</Text>
              <Text style={styles.heroDescription}>{challengeDesc}</Text>

              <View style={styles.heroDurationPill}>
                <Timer size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroDurationText}>{challengeDuration}</Text>
              </View>
            </View>

            {showConfetti && (
              <Animated.View style={[styles.confettiOverlay, { opacity: confettiOpacity }]}>
                <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                  <View style={styles.completedCheckCircle}>
                    <Check size={48} color="#FFFFFF" strokeWidth={3} />
                  </View>
                </Animated.View>
                <Text style={styles.confettiText}>{t("daily_challenge_completed" as any)}</Text>
              </Animated.View>
            )}
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY: contentSlide }], opacity: contentOpacity }}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Flame size={18} color="#FF6B35" />
              <Text style={styles.statValue}>{challengeData.streak}</Text>
              <Text style={styles.statLabel}>{t("daily_challenge_streak" as any)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Trophy size={18} color="#F59E0B" />
              <Text style={styles.statValue}>{challengeData.bestStreak}</Text>
              <Text style={styles.statLabel}>{t("daily_challenge_best_streak" as any)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Star size={18} color="#8B5CF6" />
              <Text style={styles.statValue}>{challengeData.totalCompleted}</Text>
              <Text style={styles.statLabel}>{t("daily_challenge_total" as any)}</Text>
            </View>
          </View>

          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>{t("daily_challenge_how_to" as any)}</Text>
            <Text style={styles.instructionText}>{challengeHowTo}</Text>
          </View>

          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>{t("daily_challenge_tips" as any)}</Text>
            {challengeTips.map((tip, index) => (
              <View key={index} style={styles.tipRow}>
                <View style={[styles.tipDot, { backgroundColor: todayChallenge.accentColor }]} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {isCompleted ? (
          <View style={styles.completedBar}>
            <Check size={22} color="#10B981" strokeWidth={3} />
            <Text style={styles.completedBarText}>{t("daily_challenge_completed" as any)}</Text>
          </View>
        ) : (
          <View style={styles.confirmSection}>
            <Text style={styles.confirmLabel}>
              {isSpanish ? "Escribe para confirmar:" : "Type to confirm:"}
            </Text>
            <Text style={styles.confirmRequired}>
              "{requiredText}"
            </Text>
            <TextInput
              style={[
                styles.confirmInput,
                textMatches && styles.confirmInputValid,
              ]}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder={isSpanish ? "Escribe aquí..." : "Type here..."}
              placeholderTextColor="#4B5563"
              autoCapitalize="none"
              autoCorrect={false}
              testID="confirm-text-input"
            />
            {textMatches && (
              <Text style={styles.holdInstructionText}>
                {isSpanish ? "Mantén presionado 5 segundos para confirmar" : "Hold for 5 seconds to confirm"}
              </Text>
            )}
            <Animated.View style={{ transform: [{ scale: completeBtnScale }], width: "100%" as const }}>
              <View
                style={[
                  styles.holdButtonOuter,
                  !textMatches && styles.holdButtonDisabled,
                ]}
              >
                {isHolding && (
                  <Animated.View
                    style={[
                      styles.holdProgressFill,
                      {
                        backgroundColor: todayChallenge.color,
                        width: holdProgressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                )}
                <TouchableOpacity
                  style={[
                    styles.holdButtonInner,
                    textMatches && { borderColor: todayChallenge.color },
                  ]}
                  activeOpacity={1}
                  onPressIn={startHold}
                  onPressOut={cancelHold}
                  disabled={!textMatches}
                  testID="hold-confirm-btn"
                >
                  <Trophy size={20} color={textMatches ? "#FFFFFF" : "#4B5563"} />
                  <Text style={[
                    styles.holdButtonText,
                    !textMatches && styles.holdButtonTextDisabled,
                  ]}>
                    {isHolding
                      ? `${Math.ceil((1 - holdProgress) * 5)}s...`
                      : isSpanish
                        ? "Mantener para completar"
                        : "Hold to Complete"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0F13",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  timerText: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  heroSection: {
    marginTop: 8,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  heroGradient: {
    padding: 24,
    minHeight: 260,
    justifyContent: "flex-end",
    position: "relative",
    overflow: "hidden",
  },
  heroDecoration: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "50%",
  },
  heroCircle: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
  },
  heroContent: {
    zIndex: 1,
  },
  heroBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  difficultyBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,215,0,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#FFD700",
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 22,
    marginBottom: 16,
  },
  heroDurationPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  heroDurationText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.9)",
  },
  confettiOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    zIndex: 10,
  },
  completedCheckCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  confettiText: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#FFFFFF",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#171B22",
    borderRadius: 18,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#F9FAFB",
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500" as const,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 4,
  },
  instructionCard: {
    backgroundColor: "#171B22",
    borderRadius: 18,
    padding: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#E5E7EB",
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: "#94A3B8",
    lineHeight: 22,
  },
  tipsCard: {
    backgroundColor: "#171B22",
    borderRadius: 18,
    padding: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#E5E7EB",
    marginBottom: 14,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tipText: {
    fontSize: 14,
    color: "#94A3B8",
    flex: 1,
    lineHeight: 20,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "rgba(13, 15, 19, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    width: "100%",
  },
  completeButtonText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  completedBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(16, 185, 129, 0.25)",
  },
  completedBarText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#10B981",
  },
  confirmSection: {
    width: "100%",
    gap: 8,
  },
  confirmLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#9CA3AF",
    textAlign: "center",
  },
  confirmRequired: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 4,
  },
  confirmInput: {
    backgroundColor: "#171B22",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.06)",
  },
  confirmInputValid: {
    borderColor: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.06)",
  },
  holdInstructionText: {
    fontSize: 12,
    color: "#10B981",
    textAlign: "center",
    fontWeight: "600" as const,
  },
  holdButtonOuter: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  holdButtonDisabled: {
    opacity: 0.4,
  },
  holdProgressFill: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 16,
    opacity: 0.3,
  },
  holdButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  holdButtonText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  holdButtonTextDisabled: {
    color: "#4B5563",
  },
});
