import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
  RefreshControl,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar, Settings, Brain, ScanLine, X, Edit, Plus, Trash2, FileText, Drumstick, Wheat, Droplet, Search, ChevronRight, UtensilsCrossed, Flame, TrendingUp, Clock, Dumbbell } from "lucide-react-native";
import { useApp } from "@/providers/AppProvider";
import { useRouter, router } from "expo-router";
import { useRevenueCat } from "@/providers/RevenueCatProvider";
import { CameraView, useCameraPermissions } from "expo-camera";
import { callOpenAI, callOpenAIWithVision } from "@/utils/openai";
import { searchUSDAFoods, FoodSearchResult } from "@/utils/foodApi";
import { calculateHealthScore } from "@/utils/healthScore";
import Svg, { Circle } from "react-native-svg";
import { useLanguage } from "@/providers/LanguageProvider";

const _SCREEN_WIDTH = Dimensions.get("window").width;

const CalorieRing = React.memo(({ calories, goal, t }: { calories: number; goal: number; t: (key: any, params?: Record<string, string | number>) => string }) => {
  const percentage = Math.min((calories / goal) * 100, 100);
  const exceeds = calories > goal;
  const remaining = Math.max(goal - calories, 0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (percentage >= 90 && percentage <= 100) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [percentage, pulseAnim]);

  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const ringColor = exceeds ? "#EF4444" : "#00E5FF";

  return (
    <Animated.View style={[calorieRingStyles.container, { transform: [{ scale: pulseAnim }] }]}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="rgba(0,229,255,0.08)" strokeWidth={strokeWidth} fill="none"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={ringColor} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circumference}`} strokeDashoffset={`${offset}`}
          strokeLinecap="round"
        />
      </Svg>
      <View style={calorieRingStyles.center}>
        <Text style={[calorieRingStyles.value, exceeds && { color: "#EF4444" }]}>{calories}</Text>
        <Text style={calorieRingStyles.label}>{t('fuel_of')} {goal} cal</Text>
        {!exceeds && remaining > 0 && (
          <Text style={calorieRingStyles.remaining}>{remaining} {t('fuel_left')}</Text>
        )}
        {exceeds && (
          <Text style={calorieRingStyles.over}>{calories - goal} {t('fuel_over')}</Text>
        )}
      </View>
    </Animated.View>
  );
});
CalorieRing.displayName = "CalorieRing";

const calorieRingStyles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  center: { position: "absolute", alignItems: "center" },
  value: { fontSize: 36, fontWeight: "800" as const, color: "#F9FAFB", letterSpacing: -1 },
  label: { fontSize: 13, color: "#6B7280", marginTop: 2, fontWeight: "500" as const },
  remaining: { fontSize: 12, color: "#00E5FF", marginTop: 4, fontWeight: "600" as const },
  over: { fontSize: 12, color: "#EF4444", marginTop: 4, fontWeight: "600" as const },
});

const MacroBar = React.memo(({ label, value, goal, color, icon }: { label: string; value: number; goal: number; color: string; icon: React.ReactNode }) => {
  const percentage = Math.min((value / goal) * 100, 100);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, { toValue: percentage, duration: 800, useNativeDriver: false }).start();
  }, [percentage, widthAnim]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={macroBarStyles.container}>
      <View style={macroBarStyles.header}>
        <View style={macroBarStyles.labelRow}>
          {icon}
          <Text style={macroBarStyles.label}>{label}</Text>
        </View>
        <Text style={[macroBarStyles.values, { color }]}>
          {value}g <Text style={macroBarStyles.goal}>/ {goal}g</Text>
        </Text>
      </View>
      <View style={macroBarStyles.trackOuter}>
        <Animated.View style={[macroBarStyles.trackFill, { width: animatedWidth, backgroundColor: color }]} />
      </View>
    </View>
  );
});
MacroBar.displayName = "MacroBar";

const macroBarStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 14, fontWeight: "600" as const, color: "#D1D5DB" },
  values: { fontSize: 14, fontWeight: "700" as const },
  goal: { fontSize: 12, fontWeight: "400" as const, color: "#6B7280" },
  trackOuter: { height: 8, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" },
  trackFill: { height: "100%", borderRadius: 4 },
});

export default function NutritionScreen() {
  const _router = useRouter();
  const { t, isSpanish } = useLanguage();
  const { nutrition, updateNutrition, foodHistory, addFoodEntry, deleteFoodEntry, updateFoodEntry, todaysFoodEntries } = useApp();
  const { isPremium } = useRevenueCat();
  const [showFirstTimePrompt, setShowFirstTimePrompt] = useState(false);

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [timeUntilReset, setTimeUntilReset] = useState<string>("");
  const insets = useSafeAreaInsets();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);
  const [showAddFood, setShowAddFood] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showAIInput, setShowAIInput] = useState(false);
  const [_showCalendar, _setShowCalendar] = useState(false);
  const [_selectedDate, _setSelectedDate] = useState(new Date());
  const [_showProteinShake, setShowProteinShake] = useState(false);
  const [_proteinIngredients, setProteinIngredients] = useState("");
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [foodSearchResults, setFoodSearchResults] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMealPrep, setIsMealPrep] = useState(false);
  const [mealPrepDate, setMealPrepDate] = useState(new Date());
  const [_showQuickMealPrep, setShowQuickMealPrep] = useState(false);
  const [_quickMealName, setQuickMealName] = useState("");
  const [_showBulkMealPrep, _setShowBulkMealPrep] = useState(false);
  const [_bulkMealPrepFoods, _setBulkMealPrepFoods] = useState<{
    id: string;
    name: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  }[]>([]);
  const [_bulkMealPrepDate, _setBulkMealPrepDate] = useState(new Date());
  const [showExerciseInput, setShowExerciseInput] = useState(false);
  const [exerciseInput, setExerciseInput] = useState("");
  const [showRefineFood, setShowRefineFood] = useState(false);
  const [selectedFoodEntry, setSelectedFoodEntry] = useState<any>(null);
  const [refinementInput, setRefinementInput] = useState("");
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const [weeklyReviewData, setWeeklyReviewData] = useState<string>("");
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [showEditGoals, setShowEditGoals] = useState(false);
  const [editGoals, setEditGoals] = useState({
    calorieGoal: nutrition.calorieGoal.toString(),
    proteinGoal: nutrition.proteinGoal.toString(),
    carbsGoal: nutrition.carbsGoal.toString(),
    fatGoal: nutrition.fatGoal.toString(),
  });

  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [_capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const cameraRef = React.useRef<any>(null);
  const headerFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [headerFadeAnim]);

  useEffect(() => {
    if (!nutrition.quizCompleted) {
      const timer = setTimeout(() => {
        setShowFirstTimePrompt(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [nutrition.quizCompleted]);

  useEffect(() => {
    const calculateTimeUntilReset = () => {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeUntilReset(`${hours}h ${minutes}m`);
    };

    calculateTimeUntilReset();
    const interval = setInterval(calculateTimeUntilReset, 60000);

    return () => clearInterval(interval);
  }, []);

  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({
    age: "",
    weight: "",
    heightFeet: "",
    heightInches: "",
    gender: "",
    activityLevel: "",
    goal: "",
    weightGoal: "",
    dietDuration: "",
  });

  const handleEditGoals = () => {
    const calorieGoal = parseInt(editGoals.calorieGoal) || nutrition.calorieGoal;
    const proteinGoal = parseInt(editGoals.proteinGoal) || nutrition.proteinGoal;
    const carbsGoal = parseInt(editGoals.carbsGoal) || nutrition.carbsGoal;
    const fatGoal = parseInt(editGoals.fatGoal) || nutrition.fatGoal;

    updateNutrition({ calorieGoal, proteinGoal, carbsGoal, fatGoal });
    setShowEditGoals(false);
    Alert.alert("Goals Updated", "Your nutrition goals have been updated successfully!");
  };

  const handleAddFood = () => {
    if (!foodName || !calories) {
      Alert.alert("Error", "Please enter food name and calories");
      return;
    }

    const targetDate = isMealPrep ? mealPrepDate : new Date();
    const newEntry = {
      id: Date.now().toString(),
      name: foodName,
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
      date: targetDate.toISOString(),
    };

    addFoodEntry(newEntry);

    setFoodName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setShowAddFood(false);
    setIsMealPrep(false);
    
    if (isMealPrep) {
      Alert.alert("Meal Prepped!", `Added "${newEntry.name}" for ${targetDate.toLocaleDateString()}`);
    }
  };

  const calculateNutritionGoals = useCallback((answers: typeof quizAnswers) => {
    console.log('Quiz answers received:', JSON.stringify(answers));
    const a = answers;
    let weightKg: number;
    let heightCm: number;
    if (isSpanish) {
      weightKg = parseFloat(a.weight);
      heightCm = parseFloat(a.heightFeet) * 100 + parseFloat(a.heightInches || '0');
    } else {
      const weightPounds = parseFloat(a.weight);
      weightKg = weightPounds * 0.453592;
      const heightFeet = parseFloat(a.heightFeet);
      const heightInches = parseFloat(a.heightInches);
      heightCm = (heightFeet * 30.48) + (heightInches * 2.54);
    }
    const age = parseFloat(a.age);
    const gender = a.gender;
    const activity = a.activityLevel;
    const goal = a.goal;

    if (isNaN(weightKg) || isNaN(heightCm) || isNaN(age) || !gender || !activity || !goal) {
      console.error('Quiz validation failed:', { weightKg, heightCm, age, gender, activity, goal });
      Alert.alert("Error", "Some quiz answers are missing or invalid. Please try again.");
      return;
    }

    let bmr = 0;
    if (gender === "male") {
      bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
    } else {
      bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
    }

    const activityMultipliers: { [key: string]: number } = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9,
    };

    let tdee = Math.round(bmr * (activityMultipliers[activity] || 1.55));

    const dietDuration = a.dietDuration;
    let deficitMultiplier = 0.8;
    let surplusMultiplier = 1.2;
    
    if (dietDuration === "short") { deficitMultiplier = 0.75; surplusMultiplier = 1.25; }
    else if (dietDuration === "medium") { deficitMultiplier = 0.8; surplusMultiplier = 1.2; }
    else if (dietDuration === "long") { deficitMultiplier = 0.85; surplusMultiplier = 1.15; }
    
    if (goal === "lose") { tdee = Math.round(tdee * deficitMultiplier); }
    else if (goal === "gain") { tdee = Math.round(tdee * surplusMultiplier); }

    const proteinGoal = Math.round(weightKg * 1.6);
    const fatGoal = Math.round((tdee * 0.25) / 9);
    const carbsGoal = Math.max(0, Math.round((tdee - (proteinGoal * 4 + fatGoal * 9)) / 4));

    console.log('Calculated goals:', { calorieGoal: tdee, proteinGoal, carbsGoal, fatGoal });

    updateNutrition({ calorieGoal: tdee, proteinGoal, carbsGoal, fatGoal, quizCompleted: true });
    setShowQuiz(false);
    setQuizStep(0);
    setQuizAnswers({ age: "", weight: "", heightFeet: "", heightInches: "", gender: "", activityLevel: "", goal: "", weightGoal: "", dietDuration: "" });

    setTimeout(() => {
      Alert.alert(
        "Goals Set!",
        `Your personalized nutrition goals:\n\nCalories: ${tdee} kcal\nProtein: ${proteinGoal}g\nCarbs: ${carbsGoal}g\nFat: ${fatGoal}g\n\nYou can adjust these anytime from the settings icon.`
      );
    }, 300);
  }, [updateNutrition, isSpanish]);

  const _analyzeQuickMeal = async (mealName: string, targetDate: Date) => {
    setIsAnalyzing(true);
    try {
      const prompt = `You are a nutrition expert. Analyze meal names and provide accurate nutritional estimates based on typical serving sizes and preparation methods. Consider common ingredients, cooking methods, and standard portion sizes for the described meal.

Analyze this meal: "${mealName}". Estimate nutritional content based on a typical serving size. Return ONLY a valid JSON object (no markdown, no code blocks) with format: {"name": "${mealName}", "calories": number, "protein": number, "carbs": number, "fat": number}. All numeric values must be numbers, not strings.`;

      console.log("Analyzing quick meal for meal prep...");
      const response = await callOpenAI(prompt);
      
      let cleanedResponse = response.replace(/```json/gi, '').replace(/```/g, '').replace(/^[^{]*/, '').replace(/[^}]*$/, '').trim();
      const jsonMatch = cleanedResponse.match(/{[^{}]*(?:{[^{}]*}[^{}]*)*}/);
      if (jsonMatch) cleanedResponse = jsonMatch[0];
      
      const nutritionData = JSON.parse(cleanedResponse);
      const name = nutritionData.name || mealName;
      const cals = Number(nutritionData.calories) || 0;
      const prot = Number(nutritionData.protein) || 0;
      const carb = Number(nutritionData.carbs) || 0;
      const fatVal = Number(nutritionData.fat) || 0;
      
      if (cals === 0) throw new Error("Invalid nutrition data");
      
      const newEntry = { id: Date.now().toString(), name, calories: Math.round(cals), protein: Math.round(prot), carbs: Math.round(carb), fat: Math.round(fatVal), date: targetDate.toISOString() };
      addFoodEntry(newEntry);
      setShowQuickMealPrep(false);
      setQuickMealName("");
      Alert.alert("Meal Prepped!", `Added "${name}" for ${targetDate.toLocaleDateString()}\n\nCalories: ${Math.round(cals)}\nProtein: ${Math.round(prot)}g\nCarbs: ${Math.round(carb)}g\nFat: ${Math.round(fatVal)}g`);
    } catch (error: any) {
      console.error("Quick meal analysis error:", error.message);
      Alert.alert("Analysis Failed", "Unable to analyze the meal. Please try again or use manual meal prep.", [
        { text: "Try Again", onPress: () => setShowQuickMealPrep(true) },
        { text: "Manual Entry", onPress: () => { setShowQuickMealPrep(false); setIsMealPrep(true); setMealPrepDate(targetDate); setShowAddFood(true); } }
      ]);
    } finally { setIsAnalyzing(false); }
  };

  const _analyzeProteinShake = async (ingredients: string) => {
    setIsAnalyzing(true);
    try {
      const prompt = `You are a nutrition expert specializing in protein shakes and supplements. Analyze the ingredients list and provide accurate nutritional estimates based on typical serving sizes for protein shakes.

Analyze this protein shake recipe: "${ingredients}". Estimate the total nutritional content assuming this is one complete shake serving. Return ONLY a valid JSON object (no markdown, no code blocks) with format: {"name": "Protein Shake with [main ingredients]", "calories": number, "protein": number, "carbs": number, "fat": number}. All numeric values must be numbers, not strings.`;

      console.log("Analyzing protein shake...");
      const response = await callOpenAI(prompt);
      let cleanedResponse = response.replace(/```json/gi, '').replace(/```/g, '').replace(/^[^{]*/, '').replace(/[^}]*$/, '').trim();
      const jsonMatch = cleanedResponse.match(/{[^{}]*(?:{[^{}]*}[^{}]*)*}/);
      if (jsonMatch) cleanedResponse = jsonMatch[0];
      
      const nutritionData = JSON.parse(cleanedResponse);
      const name = nutritionData.name || "Protein Shake";
      const cals = Number(nutritionData.calories) || 0;
      const prot = Number(nutritionData.protein) || 0;
      const carb = Number(nutritionData.carbs) || 0;
      const fatVal = Number(nutritionData.fat) || 0;
      if (cals === 0) throw new Error("Invalid nutrition data");
      
      setFoodName(name);
      setCalories(Math.round(cals).toString());
      setProtein(Math.round(prot).toString());
      setCarbs(Math.round(carb).toString());
      setFat(Math.round(fatVal).toString());
      setShowProteinShake(false);
      setShowAddFood(true);
      Alert.alert("Protein Shake Analyzed!", `${name}\nCalories: ${Math.round(cals)}\nProtein: ${Math.round(prot)}g\nCarbs: ${Math.round(carb)}g\nFat: ${Math.round(fatVal)}g\n\nYou can adjust the values if needed.`);
    } catch (error: any) {
      console.error("Protein shake analysis error:", error.message);
      Alert.alert("Analysis Failed", "Unable to analyze the protein shake. Please try again or enter manually.", [
        { text: "Try Again", onPress: () => setShowProteinShake(true) },
        { text: "Enter Manually", onPress: () => { setShowProteinShake(false); setShowAddFood(true); } }
      ]);
    } finally { setIsAnalyzing(false); setProteinIngredients(""); }
  };

  const analyzeExercise = async (description: string) => {
    setIsAnalyzing(true);
    try {
      const prompt = `You are a fitness and nutrition expert. The user will describe an exercise or physical activity they performed. Estimate the calories burned based on the description, assuming an average adult body weight unless specified otherwise.

Exercise described: "${description}"

Return ONLY a valid JSON object (no markdown, no code blocks) with format: {"name": "exercise description", "caloriesBurned": number, "duration": "estimated duration string"}. All numeric values must be numbers, not strings.`;

      console.log("Analyzing exercise...");
      const response = await callOpenAI(prompt);
      let cleanedResponse = response.replace(/```json/gi, '').replace(/```/g, '').replace(/^[^{]*/, '').replace(/[^}]*$/, '').trim();
      const jsonMatch = cleanedResponse.match(/{[^{}]*(?:{[^{}]*}[^{}]*)*}/);
      if (jsonMatch) cleanedResponse = jsonMatch[0];

      const exerciseData = JSON.parse(cleanedResponse);
      const name = exerciseData.name || description;
      const burned = Number(exerciseData.caloriesBurned) || 0;
      const duration = exerciseData.duration || "";
      if (burned === 0) throw new Error("Invalid exercise data");

      const newEntry = {
        id: Date.now().toString(),
        name: `🏋️ ${name}`,
        calories: -Math.round(burned),
        protein: 0,
        carbs: 0,
        fat: 0,
        date: new Date().toISOString(),
      };

      addFoodEntry(newEntry);

      setShowExerciseInput(false);
      setExerciseInput("");
      Alert.alert(
        "Exercise Logged!",
        `${name}${duration ? ` (~${duration})` : ""}\n\nCalories burned: ${Math.round(burned)} cal\n\nThis has been subtracted from your daily intake.`
      );
    } catch (error: any) {
      console.error("Exercise analysis error:", error.message);
      Alert.alert("Analysis Failed", "Unable to estimate calories burned. Please try again.", [
        { text: "Try Again", onPress: () => setShowExerciseInput(true) },
        { text: "Cancel", style: "cancel" },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const refineWithAI = async (entry: any, refinementText: string) => {
    setIsAnalyzing(true);
    try {
      const prompt = `You are a nutrition expert. The user has logged a food item and wants to refine its nutritional information with additional details.

Original food entry: "${entry.name}" with ${entry.calories} calories, ${entry.protein}g protein, ${entry.carbs}g carbs, ${entry.fat}g fat.
Additional details: "${refinementText}"

Please provide a refined nutritional estimate. Return ONLY a valid JSON object (no markdown, no code blocks) with format: {"name": "refined food description", "calories": number, "protein": number, "carbs": number, "fat": number}. All numeric values must be numbers, not strings.`;

      console.log("Refining food entry with AI...");
      const response = await callOpenAI(prompt);
      let cleanedResponse = response.replace(/```json/gi, '').replace(/```/g, '').replace(/^[^{]*/, '').replace(/[^}]*$/, '').trim();
      const jsonMatch = cleanedResponse.match(/{[^{}]*(?:{[^{}]*}[^{}]*)*}/);
      if (jsonMatch) cleanedResponse = jsonMatch[0];
      
      const nutritionData = JSON.parse(cleanedResponse);
      const name = nutritionData.name || entry.name;
      const cals = Number(nutritionData.calories) || entry.calories;
      const prot = Number(nutritionData.protein) || entry.protein;
      const carb = Number(nutritionData.carbs) || entry.carbs;
      const fatVal = Number(nutritionData.fat) || entry.fat;
      if (cals === 0) throw new Error("Invalid nutrition data");
      
      updateFoodEntry(entry.id, { name, calories: Math.round(cals), protein: Math.round(prot), carbs: Math.round(carb), fat: Math.round(fatVal) });
      setShowRefineFood(false);
      setSelectedFoodEntry(null);
      setRefinementInput("");
      Alert.alert("Food Refined!", `Updated "${name}"\n\nCalories: ${Math.round(cals)}\nProtein: ${Math.round(prot)}g\nCarbs: ${Math.round(carb)}g\nFat: ${Math.round(fatVal)}g`);
    } catch (error: any) {
      console.error("Food refinement error:", error.message);
      Alert.alert("Refinement Failed", "Unable to refine the food entry. Please try again.", [
        { text: "Try Again", onPress: () => setShowRefineFood(true) },
        { text: "Cancel", onPress: () => { setShowRefineFood(false); setSelectedFoodEntry(null); setRefinementInput(""); } }
      ]);
    } finally { setIsAnalyzing(false); }
  };

  const analyzeWithAI = async (input: string, isImage: boolean = false) => {
    setIsAnalyzing(true);
    try {
      let prompt;
      
      if (isImage) {
        try {
          const visionPrompt = 'You are a professional nutritionist. Analyze this food image and provide accurate nutritional estimates. Return ONLY a valid JSON object with format: {"name": "food description", "calories": number, "protein": number, "carbs": number, "fat": number}.';
          prompt = await callOpenAIWithVision(visionPrompt, input);
        } catch (imageError) {
          console.error('Image analysis failed:', imageError);
          Alert.alert("Image Analysis Failed", "Unable to analyze the image. Please try describing your food instead.", [{ text: "OK", onPress: () => { setShowCamera(false); setShowAIInput(true); } }]);
          return;
        }
      } else {
        prompt = `You are a professional nutritionist. Provide accurate nutritional estimates based on standard serving sizes. Return ONLY valid JSON without any markdown formatting.

Analyze this food: "${input}". Return ONLY a valid JSON object with format: {"name": "food description", "calories": number, "protein": number, "carbs": number, "fat": number}. All numeric values must be numbers.`;
      }

      let response;
      if (isImage) { response = prompt; } else { console.log("Sending request to AI..."); response = await callOpenAI(prompt); }
      
      let cleanedResponse = response.replace(/```json/gi, '').replace(/```/g, '').replace(/^[^{]*/, '').replace(/[^}]*$/, '').trim();
      const jsonMatch = cleanedResponse.match(/{[^{}]*(?:{[^{}]*}[^{}]*)*}/);
      if (jsonMatch) cleanedResponse = jsonMatch[0];
      
      try {
        const nutritionData = JSON.parse(cleanedResponse);
        const name = nutritionData.name || "Unknown food";
        const cals = Number(nutritionData.calories) || 0;
        const prot = Number(nutritionData.protein) || 0;
        const carb = Number(nutritionData.carbs) || 0;
        const fatVal = Number(nutritionData.fat) || 0;
        if (!name || cals === 0) throw new Error("Invalid nutrition data");
        
        setFoodName(name);
        setCalories(Math.round(cals).toString());
        setProtein(Math.round(prot).toString());
        setCarbs(Math.round(carb).toString());
        setFat(Math.round(fatVal).toString());
        setShowAIInput(false);
        setShowCamera(false);
        setCapturedImage(null);
        setShowAddFood(true);
        Alert.alert("Food Analyzed", `Detected: ${name}\nCalories: ${Math.round(cals)}\nProtein: ${Math.round(prot)}g\nCarbs: ${Math.round(carb)}g\nFat: ${Math.round(fatVal)}g\n\nYou can adjust the values if needed.`);
      } catch (parseError: any) {
        console.error("Failed to parse AI response:", parseError.message);
        try {
          const nameMatch = cleanedResponse.match(/"name"\s*:\s*"([^"]+)"/);
          const caloriesMatch = cleanedResponse.match(/"calories"\s*:\s*(\d+)/);
          if (nameMatch && caloriesMatch) {
            const n = nameMatch[1]; const c = parseInt(caloriesMatch[1]);
            const proteinMatch = cleanedResponse.match(/"protein"\s*:\s*(\d+)/);
            const carbsMatch = cleanedResponse.match(/"carbs"\s*:\s*(\d+)/);
            const fatMatch = cleanedResponse.match(/"fat"\s*:\s*(\d+)/);
            setFoodName(n); setCalories(c.toString()); setProtein(proteinMatch ? proteinMatch[1] : "0"); setCarbs(carbsMatch ? carbsMatch[1] : "0"); setFat(fatMatch ? fatMatch[1] : "0");
            setShowAIInput(false); setShowCamera(false); setCapturedImage(null); setShowAddFood(true);
            Alert.alert("Food Analyzed", `Detected: ${n}\nCalories: ${c}\n\nYou can adjust the values if needed.`);
            return;
          }
        } catch (fallbackError) { console.error("Fallback parsing also failed:", fallbackError); }
        Alert.alert("Analysis Error", "Could not understand the nutritional data. Please try again or enter manually.", [
          { text: "Try Again", onPress: () => isImage ? setShowCamera(true) : setShowAIInput(true) },
          { text: "Enter Manually", onPress: () => { setShowCamera(false); setShowAIInput(false); setShowAddFood(true); } }
        ]);
      }
    } catch (error: any) {
      console.error("AI analysis error:", error.message);
      Alert.alert("Analysis Failed", "Unable to analyze the food. Please try again or enter manually.", [
        { text: "Try Again", onPress: () => isImage ? setShowCamera(true) : setShowAIInput(true) },
        { text: "Enter Manually", onPress: () => { setShowCamera(false); setShowAIInput(false); setShowAddFood(true); } }
      ]);
    } finally { setIsAnalyzing(false); setAiInput(""); }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        setIsAnalyzing(true);
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5, skipProcessing: Platform.OS === 'ios', exif: false });
        if (!photo.base64) throw new Error("Failed to capture image data");
        setCapturedImage(photo.base64);
        await analyzeWithAI(photo.base64, true);
      } catch (error: any) {
        console.error("Failed to take picture:", error.message);
        Alert.alert("Camera Error", "Failed to capture image. Please try again.");
        setIsAnalyzing(false);
      }
    } else {
      Alert.alert("Camera Error", "Camera is not ready. Please try again.");
      setIsAnalyzing(false);
    }
  };

  const quizQuestions = useMemo(() => [
    { title: t('fuel_whats_age'), key: "age", type: "number" as const, placeholder: t('fuel_enter_age') },
    { title: t('fuel_whats_weight'), key: "weight", type: "number" as const, placeholder: t('fuel_enter_weight') },
    { title: t('fuel_whats_height'), key: "height", type: "height" as const, placeholder: t('fuel_enter_age') },
    { title: t('fuel_whats_gender'), key: "gender", type: "choice" as const, choices: [{ label: t('fuel_male'), value: "male" }, { label: t('fuel_female'), value: "female" }] },
    { title: t('fuel_how_active'), key: "activityLevel", type: "choice" as const, choices: [
      { label: t('fuel_sedentary'), value: "sedentary" }, { label: t('fuel_lightly_active'), value: "light" },
      { label: t('fuel_moderately_active'), value: "moderate" }, { label: t('fuel_very_active'), value: "active" },
      { label: t('fuel_extremely_active'), value: "veryActive" },
    ]},
    { title: t('fuel_whats_goal'), key: "goal", type: "choice" as const, choices: [
      { label: t('fuel_lose_weight'), value: "lose" }, { label: t('fuel_maintain_weight'), value: "maintain" }, { label: t('fuel_gain_weight'), value: "gain" },
    ]},
    { title: t('fuel_how_much_weight'), key: "weightGoal", type: "number" as const, placeholder: t('fuel_weight_placeholder'), skipCondition: (answers: { goal: string }) => answers.goal === "maintain" },
    { title: t('fuel_diet_duration'), key: "dietDuration", type: "choice" as const, choices: [
      { label: t('fuel_short_duration'), value: "short" },
      { label: t('fuel_medium_duration'), value: "medium" },
      { label: t('fuel_long_duration'), value: "long" },
    ], skipCondition: (answers: { goal: string }) => answers.goal === "maintain" },
  ], [t]);

  const filteredQuizQuestions = useMemo(() => 
    quizQuestions.filter((q: { skipCondition?: (a: { goal: string }) => boolean }) => !q.skipCondition || !q.skipCondition(quizAnswers)),
  [quizQuestions, quizAnswers]);

  const currentQuizQuestion = filteredQuizQuestions[quizStep];

  if (!permission) return <View />;

  const totalMacrosCal = (nutrition.protein * 4) + (nutrition.carbs * 4) + (nutrition.fat * 9);
  const proteinPct = totalMacrosCal > 0 ? Math.round((nutrition.protein * 4) / totalMacrosCal * 100) : 0;
  const carbsPct = totalMacrosCal > 0 ? Math.round((nutrition.carbs * 4) / totalMacrosCal * 100) : 0;
  const fatPct = totalMacrosCal > 0 ? Math.round((nutrition.fat * 9) / totalMacrosCal * 100) : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF6B35"
            colors={["#FF6B35"]}
            progressBackgroundColor="#1A1D24"
          />
        }
      >
        <Animated.View style={[styles.headerSection, { opacity: headerFadeAnim, transform: [{ translateY: headerFadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>{t('fuel_title')}</Text>
              <Text style={styles.headerSubtitle}>
                {new Date().toLocaleDateString(isSpanish ? 'es-ES' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => {
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEditGoals({ calorieGoal: nutrition.calorieGoal.toString(), proteinGoal: nutrition.proteinGoal.toString(), carbsGoal: nutrition.carbsGoal.toString(), fatGoal: nutrition.fatGoal.toString() });
                setShowEditGoals(true);
              }}>
                <Edit size={18} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => {
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowQuiz(true);
              }}>
                <Settings size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        <TouchableOpacity
          style={styles.weeklyReviewBtn}
          activeOpacity={0.7}
          onPress={async () => {
            if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsGeneratingReview(true);
            setShowWeeklyReview(true);
            try {
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
              const weeklyFoods = foodHistory.filter(entry => new Date(entry.date) >= oneWeekAgo);
              if (weeklyFoods.length === 0) { setWeeklyReviewData(t('fuel_no_meals_week')); setIsGeneratingReview(false); return; }
              const totalCalories = weeklyFoods.reduce((sum, entry) => sum + entry.calories, 0);
              const totalProtein = weeklyFoods.reduce((sum, entry) => sum + entry.protein, 0);
              const totalCarbs = weeklyFoods.reduce((sum, entry) => sum + entry.carbs, 0);
              const totalFat = weeklyFoods.reduce((sum, entry) => sum + entry.fat, 0);
              const avgCaloriesPerDay = Math.round(totalCalories / 7);
              const foodList = weeklyFoods.map(f => `${f.name} (${f.calories} cal, ${f.protein}g P, ${f.carbs}g C, ${f.fat}g F)`).join(', ');
              const langInstruction = isSpanish ? 'IMPORTANT: Respond entirely in Spanish. Use metric units (kg, cm, km) instead of imperial units (lbs, feet, miles).' : '';
              const prompt = `You are a professional nutritionist analyzing a week of food intake. ${langInstruction} Here's the data:\n\nTotal meals logged: ${weeklyFoods.length}\nTotal calories: ${totalCalories}\nAverage calories per day: ${avgCaloriesPerDay}\nTotal protein: ${totalProtein}g\nTotal carbs: ${totalCarbs}g\nTotal fat: ${totalFat}g\n\nUser's goals:\nDaily calorie goal: ${nutrition.calorieGoal}\nDaily protein goal: ${nutrition.proteinGoal}g\nDaily carbs goal: ${nutrition.carbsGoal}g\nDaily fat goal: ${nutrition.fatGoal}g\n\nFoods eaten this week: ${foodList}\n\nProvide a comprehensive weekly nutrition review with:\n1. Overall assessment\n2. How well they're meeting their goals\n3. Nutritional balance analysis\n4. Specific recommendations\n5. Positive reinforcement\n6. Suggestions for foods to add or reduce\n\nBe encouraging, specific, and actionable. Keep it under 400 words.`;
              const response = await callOpenAI(prompt);
              setWeeklyReviewData(response);
            } catch (error) { console.error('Error generating weekly review:', error); setWeeklyReviewData(t('fuel_review_error')); } finally { setIsGeneratingReview(false); }
          }}
        >
          <LinearGradient colors={["rgba(0,173,181,0.12)", "rgba(0,173,181,0.04)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.weeklyReviewGradient}>
            <FileText size={18} color="#00ADB5" />
            <Text style={styles.weeklyReviewText}>{t('fuel_weekly_review')}</Text>
            <ChevronRight size={16} color="#00ADB5" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.calorieCard}>
          <View style={styles.calorieCardHeader}>
            <View style={styles.calorieCardTitleRow}>
              <Flame size={18} color="#FF6B35" />
              <Text style={styles.calorieCardTitle}>{t('fuel_todays_calories')}</Text>
            </View>
            <View style={styles.resetBadge}>
              <Clock size={12} color="#6B7280" />
              <Text style={styles.resetText}>{timeUntilReset}</Text>
            </View>
          </View>
          
          <View style={styles.calorieRingWrapper}>
            <CalorieRing calories={nutrition.calories} goal={nutrition.calorieGoal} t={t} />
          </View>

          {todaysFoodEntries.length > 0 && totalMacrosCal > 0 && (
            <View style={styles.macroSplitRow}>
              <View style={styles.macroSplitItem}>
                <View style={[styles.macroSplitDot, { backgroundColor: "#FF4FB6" }]} />
                <Text style={styles.macroSplitLabel}>{t('home_protein')} {proteinPct}%</Text>
              </View>
              <View style={styles.macroSplitItem}>
                <View style={[styles.macroSplitDot, { backgroundColor: "#00FFC6" }]} />
                <Text style={styles.macroSplitLabel}>{t('home_carbs')} {carbsPct}%</Text>
              </View>
              <View style={styles.macroSplitItem}>
                <View style={[styles.macroSplitDot, { backgroundColor: "#FFB400" }]} />
                <Text style={styles.macroSplitLabel}>{t('home_fat')} {fatPct}%</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.macrosCard}>
          <Text style={styles.macrosCardTitle}>{t('fuel_macros')}</Text>
          <MacroBar label={t('home_protein')} value={nutrition.protein} goal={nutrition.proteinGoal} color="#FF4FB6" icon={<Drumstick size={16} color="#FF4FB6" />} />
          <MacroBar label={t('home_carbs')} value={nutrition.carbs} goal={nutrition.carbsGoal} color="#00FFC6" icon={<Wheat size={16} color="#00FFC6" />} />
          <MacroBar label={t('home_fat')} value={nutrition.fat} goal={nutrition.fatGoal} color="#FFB400" icon={<Droplet size={16} color="#FFB400" />} />
        </View>

        {showAddFood ? (
          <View style={styles.addFoodCard}>
            <View style={styles.addFoodHeader}>
              <Text style={styles.addFoodTitle}>{isMealPrep ? t('fuel_meal_prep_food') : t('fuel_add_food_title')}</Text>
              {isMealPrep && (
                <TouchableOpacity style={styles.datePickerButton} onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
                  if (mealPrepDate.toDateString() === new Date().toDateString()) setMealPrepDate(tomorrow);
                  else { const nextDay = new Date(mealPrepDate); nextDay.setDate(nextDay.getDate() + 1); setMealPrepDate(nextDay); }
                }}>
                  <Calendar size={14} color="#00ADB5" />
                  <Text style={styles.datePickerText}>{mealPrepDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: mealPrepDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })}</Text>
                </TouchableOpacity>
              )}
            </View>
            {isMealPrep && (
              <Text style={styles.mealPrepSubtitle}>{t('fuel_planning_meals')} {mealPrepDate.toLocaleDateString(isSpanish ? 'es-ES' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            )}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('fuel_food_name')}</Text>
              <TextInput style={styles.input} placeholder={t('fuel_enter_food_name')} placeholderTextColor="#4B5563" value={foodName} onChangeText={setFoodName} />
            </View>
            <View style={styles.nutritionInputRow}>
              <View style={styles.nutritionInputItem}>
                <Text style={styles.inputLabel}>{t('fuel_calories')}</Text>
                <TextInput style={styles.nutritionInput} placeholder="0" placeholderTextColor="#4B5563" value={calories} onChangeText={setCalories} keyboardType="numeric" />
              </View>
              <View style={styles.nutritionInputItem}>
                <Text style={styles.inputLabel}>{t('fuel_protein_g')}</Text>
                <TextInput style={styles.nutritionInput} placeholder="0" placeholderTextColor="#4B5563" value={protein} onChangeText={setProtein} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.nutritionInputRow}>
              <View style={styles.nutritionInputItem}>
                <Text style={styles.inputLabel}>{t('fuel_carbs_g')}</Text>
                <TextInput style={styles.nutritionInput} placeholder="0" placeholderTextColor="#4B5563" value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
              </View>
              <View style={styles.nutritionInputItem}>
                <Text style={styles.inputLabel}>{t('fuel_fat_g')}</Text>
                <TextInput style={styles.nutritionInput} placeholder="0" placeholderTextColor="#4B5563" value={fat} onChangeText={setFat} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.addFoodButtons}>
              <TouchableOpacity style={[styles.addFoodBtn, styles.cancelBtn]} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddFood(false); setIsMealPrep(false); }}>
                <Text style={styles.cancelBtnText}>{t('common_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addFoodBtn, styles.confirmBtn]} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleAddFood(); }}>
                <Text style={styles.confirmBtnText}>{isMealPrep ? t('fuel_prep_meal') : t('fuel_add')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {!nutrition.quizCompleted ? (
              <View style={styles.quizRequiredCard}>
                <View style={styles.quizRequiredIconWrap}>
                  <Brain size={40} color="#00ADB5" />
                </View>
                <Text style={styles.quizRequiredTitle}>{t('fuel_setup_goals')}</Text>
                <Text style={styles.quizRequiredDescription}>{t('fuel_setup_desc')}</Text>
                <TouchableOpacity style={styles.startQuizButton} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowQuiz(true); }}>
                  <Brain size={18} color="#FFFFFF" />
                  <Text style={styles.startQuizButtonText}>{t('fuel_start_setup')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.quickActions}>
                <Text style={styles.quickActionsTitle}>{t('fuel_log_food')}</Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionChip} activeOpacity={0.7} onPress={async () => {
                    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (!isPremium) { router.push('/paywall'); return; }
                    if (!permission.granted) { const result = await requestPermission(); if (result.granted) setShowCamera(true); } else setShowCamera(true);
                  }}>
                    <View style={[styles.actionChipIcon, { backgroundColor: 'rgba(0,229,255,0.12)' }]}>
                      <ScanLine size={20} color="#00E5FF" />
                    </View>
                    <View style={styles.actionChipText}>
                      <Text style={styles.actionChipLabel}>{t('fuel_scan')}</Text>
                      <Text style={styles.actionChipSub}>{t('fuel_camera')}</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionChip} activeOpacity={0.7} onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (!isPremium) { router.push('/paywall'); return; }
                    setShowAIInput(true);
                  }}>
                    <View style={[styles.actionChipIcon, { backgroundColor: 'rgba(191,255,0,0.12)' }]}>
                      <Brain size={20} color="#BFFF00" />
                    </View>
                    <View style={styles.actionChipText}>
                      <Text style={styles.actionChipLabel}>{t('fuel_describe')}</Text>
                      <Text style={styles.actionChipSub}>{t('fuel_ai_text')}</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionChip} activeOpacity={0.7} onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (!isPremium) { router.push('/paywall'); return; }
                    setShowFoodSearch(true);
                  }}>
                    <View style={[styles.actionChipIcon, { backgroundColor: 'rgba(255,107,53,0.12)' }]}>
                      <Search size={20} color="#FF6B35" />
                    </View>
                    <View style={styles.actionChipText}>
                      <Text style={styles.actionChipLabel}>{t('fuel_search')}</Text>
                      <Text style={styles.actionChipSub}>USDA</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionChip} activeOpacity={0.7} onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowAddFood(true);
                  }}>
                    <View style={[styles.actionChipIcon, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                      <Plus size={20} color="#F59E0B" />
                    </View>
                    <View style={styles.actionChipText}>
                      <Text style={styles.actionChipLabel}>{t('fuel_manual')}</Text>
                      <Text style={styles.actionChipSub}>{t('fuel_enter_manually')}</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.exerciseChip}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (!isPremium) { router.push('/paywall'); return; }
                    setShowExerciseInput(true);
                  }}
                >
                  <View style={[styles.actionChipIcon, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                    <Dumbbell size={20} color="#8B5CF6" />
                  </View>
                  <View style={styles.exerciseChipTextWrap}>
                    <Text style={styles.actionChipLabel}>{t('fuel_log_exercise')}</Text>
                    <Text style={styles.exerciseChipSub}>{t('fuel_exercise_desc')}</Text>
                  </View>
                  <ChevronRight size={16} color="#4B5563" />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {nutrition.quizCompleted && (
          <View style={styles.mealsSection}>
            <View style={styles.mealsSectionHeader}>
              <Text style={styles.mealsSectionTitle}>{t('fuel_todays_meals')}</Text>
              <Text style={styles.mealsSectionCount}>{todaysFoodEntries.length} {t('fuel_logged')}</Text>
            </View>
            {todaysFoodEntries.length === 0 ? (
              <View style={styles.emptyMeals}>
                <UtensilsCrossed size={32} color="#2A2F3A" />
                <Text style={styles.emptyMealsText}>{t('fuel_no_meals_logged')}</Text>
                <Text style={styles.emptyMealsHint}>{t('fuel_use_options')}</Text>
              </View>
            ) : (
              todaysFoodEntries.map((entry, index) => {
                const healthScore = calculateHealthScore(entry);
                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={[styles.mealCard, index === todaysFoodEntries.length - 1 && { marginBottom: 0 }]}
                    onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedFoodEntry(entry); setShowRefineFood(true); }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.mealCardTop}>
                      <View style={styles.mealCardInfo}>
                        <Text style={styles.mealCardName} numberOfLines={1}>{entry.name}</Text>
                        <Text style={styles.mealCardTime}>
                          {new Date(entry.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </Text>
                      </View>
                      <View style={styles.mealCardRight}>
                        <Text style={styles.mealCardCal}>{entry.calories}</Text>
                        <Text style={styles.mealCardCalUnit}>cal</Text>
                      </View>
                    </View>
                    <View style={styles.mealCardBottom}>
                      <View style={styles.mealCardMacros}>
                        <View style={styles.mealMacroChip}>
                          <View style={[styles.mealMacroDot, { backgroundColor: "#FF4FB6" }]} />
                          <Text style={styles.mealMacroVal}>{entry.protein}g</Text>
                        </View>
                        <View style={styles.mealMacroChip}>
                          <View style={[styles.mealMacroDot, { backgroundColor: "#00FFC6" }]} />
                          <Text style={styles.mealMacroVal}>{entry.carbs}g</Text>
                        </View>
                        <View style={styles.mealMacroChip}>
                          <View style={[styles.mealMacroDot, { backgroundColor: "#FFB400" }]} />
                          <Text style={styles.mealMacroVal}>{entry.fat}g</Text>
                        </View>
                        <View style={[styles.healthBadge, { backgroundColor: `${healthScore.color}15` }]}>
                          <View style={[styles.healthBadgeDot, { backgroundColor: healthScore.color }]} />
                          <Text style={[styles.healthBadgeText, { color: healthScore.color }]}>{healthScore.score}/10</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.mealDeleteBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          Alert.alert(t('fuel_delete_food'), t('fuel_delete_food_confirm', { name: entry.name }), [
                            { text: t('common_cancel'), style: "cancel" },
                            { text: t('common_delete'), style: "destructive", onPress: () => deleteFoodEntry(entry.id) }
                          ]);
                        }}
                      >
                        <Trash2 size={14} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={showQuiz} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.quizModal}>
            <Text style={styles.quizTitle}>{t('fuel_nutrition_goals_setup')}</Text>
            <Text style={styles.quizProgress}>{t('fuel_step')} {quizStep + 1} {t('fuel_of_total')} {filteredQuizQuestions.length}</Text>
            {currentQuizQuestion && (
              <>
                <Text style={styles.quizQuestion}>{currentQuizQuestion.title}</Text>
                
                {currentQuizQuestion.type === "height" ? (
                  <View style={styles.heightInputContainer}>
                    {isSpanish ? (
                      <TextInput style={[styles.quizInput, styles.heightInput]} placeholder="170 cm" placeholderTextColor="#6B7280" keyboardType="numeric" value={quizAnswers.heightFeet} onChangeText={(text) => setQuizAnswers(prev => ({ ...prev, heightFeet: text, heightInches: '0' }))} />
                    ) : (
                      <>
                        <TextInput style={[styles.quizInput, styles.heightInput]} placeholder={t('fuel_feet')} placeholderTextColor="#6B7280" keyboardType="numeric" value={quizAnswers.heightFeet} onChangeText={(text) => setQuizAnswers(prev => ({ ...prev, heightFeet: text }))} />
                        <TextInput style={[styles.quizInput, styles.heightInput]} placeholder={t('fuel_inches')} placeholderTextColor="#6B7280" keyboardType="numeric" value={quizAnswers.heightInches} onChangeText={(text) => setQuizAnswers(prev => ({ ...prev, heightInches: text }))} />
                      </>
                    )}
                  </View>
                ) : currentQuizQuestion.type === "number" ? (
                  <TextInput style={styles.quizInput} placeholder={currentQuizQuestion.placeholder} placeholderTextColor="#6B7280" keyboardType="numeric" value={quizAnswers[currentQuizQuestion.key as keyof typeof quizAnswers]} onChangeText={(text) => setQuizAnswers(prev => ({ ...prev, [currentQuizQuestion.key]: text }))} />
                ) : (
                  <View style={styles.choicesContainer}>
                    {currentQuizQuestion.choices?.map((choice: { label: string; value: string }) => (
                      <TouchableOpacity
                        key={choice.value}
                        style={[styles.choiceButton, quizAnswers[currentQuizQuestion.key as keyof typeof quizAnswers] === choice.value && styles.choiceButtonActive]}
                        onPress={() => {
                          if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setQuizAnswers(prev => ({ ...prev, [currentQuizQuestion.key]: choice.value }));
                        }}
                      >
                        <Text style={[styles.choiceText, quizAnswers[currentQuizQuestion.key as keyof typeof quizAnswers] === choice.value && styles.choiceTextActive]}>{choice.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                <View style={styles.quizButtons}>
                  {quizStep > 0 && (
                    <TouchableOpacity style={[styles.quizButton, styles.quizButtonSecondary]} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQuizStep(quizStep - 1); }}>
                      <Text style={styles.quizButtonTextSecondary}>{t('fuel_back')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.quizButton, styles.quizButtonPrimary]}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (quizStep < filteredQuizQuestions.length - 1) {
                        setQuizStep(quizStep + 1);
                      } else {
                        calculateNutritionGoals(quizAnswers);
                      }
                    }}
                    disabled={currentQuizQuestion.type === "height" ? !quizAnswers.heightFeet || !quizAnswers.heightInches : currentQuizQuestion.key === "weightGoal" ? false : !quizAnswers[currentQuizQuestion.key as keyof typeof quizAnswers]}
                  >
                    <Text style={styles.quizButtonTextPrimary}>{quizStep < filteredQuizQuestions.length - 1 ? t('fuel_next') : t('fuel_calculate_goals')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showFirstTimePrompt} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.firstTimeModal}>
            <View style={styles.firstTimeIconWrap}>
              <Brain size={40} color="#10B981" />
            </View>
            <Text style={styles.firstTimeTitle}>{t('fuel_welcome_title')}</Text>
            <Text style={styles.firstTimeDesc}>{t('fuel_welcome_desc')}</Text>
            <View style={styles.firstTimeFeatures}>
              <View style={styles.firstTimeFeatureRow}>
                <View style={[styles.firstTimeFeatureDot, { backgroundColor: "#00E5FF" }]} />
                <Text style={styles.firstTimeFeatureText}>{t('fuel_feature_calories')}</Text>
              </View>
              <View style={styles.firstTimeFeatureRow}>
                <View style={[styles.firstTimeFeatureDot, { backgroundColor: "#FF4FB6" }]} />
                <Text style={styles.firstTimeFeatureText}>{t('fuel_feature_macros')}</Text>
              </View>
              <View style={styles.firstTimeFeatureRow}>
                <View style={[styles.firstTimeFeatureDot, { backgroundColor: "#00FFC6" }]} />
                <Text style={styles.firstTimeFeatureText}>{t('fuel_feature_progress')}</Text>
              </View>
            </View>
            <View style={styles.firstTimeBtns}>
              <TouchableOpacity style={styles.firstTimeSkipBtn} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFirstTimePrompt(false); }}>
                <Text style={styles.firstTimeSkipText}>{t('fuel_later')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.firstTimeStartBtn} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFirstTimePrompt(false); setShowQuiz(true); }}>
                <TrendingUp size={18} color="#FFFFFF" />
                <Text style={styles.firstTimeStartText}>{t('fuel_take_quiz')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAIInput} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.sheetModal}>
            <TouchableOpacity style={styles.sheetClose} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAIInput(false); setAiInput(""); }}>
              <X size={22} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{t('fuel_describe_food')}</Text>
            <Text style={styles.sheetSubtitle}>{t('fuel_describe_food_sub')}</Text>
            <TextInput style={styles.sheetTextInput} placeholder={t('fuel_describe_placeholder')} placeholderTextColor="#4B5563" value={aiInput} onChangeText={setAiInput} multiline autoFocus />
            <TouchableOpacity style={[styles.sheetPrimaryBtn, (!aiInput || isAnalyzing) && styles.disabledButton]} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); void analyzeWithAI(aiInput); }} disabled={!aiInput || isAnalyzing}>
              {isAnalyzing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sheetPrimaryBtnText}>{t('fuel_analyze_food')}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          {!permission?.granted ? (
            <View style={styles.permissionContainer}>
              <Text style={styles.permissionText}>{t('fuel_camera_permission')}</Text>
              <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                <Text style={styles.permissionButtonText}>{t('fuel_grant_permission')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView ref={cameraRef} style={styles.camera} facing="back">
                <View style={styles.cameraOverlay}>
                  <TouchableOpacity style={styles.cameraClose} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCamera(false); setCapturedImage(null); }}>
                    <X size={32} color="#FFFFFF" />
                  </TouchableOpacity>
                  <View style={styles.cameraGuide}>
                    <View style={[styles.cameraGuideCorner, { top: 0, left: 0 }]} />
                    <View style={[styles.cameraGuideCorner, styles.cameraGuideCornerTR]} />
                    <View style={[styles.cameraGuideCorner, styles.cameraGuideCornerBL]} />
                    <View style={[styles.cameraGuideCorner, styles.cameraGuideCornerBR]} />
                  </View>
                  <Text style={styles.cameraText}>{t('fuel_position_food')}</Text>
                  <View style={styles.cameraBottomContainer}>
                    <TouchableOpacity style={styles.captureButton} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); void takePicture(); }} disabled={isAnalyzing}>
                      <View style={styles.captureButtonInner} />
                    </TouchableOpacity>
                  </View>
                </View>
              </CameraView>
              {isAnalyzing && (
                <View style={styles.analyzingOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.analyzingText}>{t('fuel_analyzing_food')}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>

      <Modal visible={showFoodSearch} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.foodSearchModal}>
            <TouchableOpacity style={styles.sheetClose} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFoodSearch(false); setFoodSearchQuery(""); setFoodSearchResults([]); }}>
              <X size={22} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{t('fuel_search_foods')}</Text>
            <View style={styles.foodSearchInputRow}>
              <TextInput style={styles.foodSearchInput} placeholder={t('fuel_search_placeholder')} placeholderTextColor="#4B5563" value={foodSearchQuery} onChangeText={setFoodSearchQuery} autoFocus returnKeyType="search"
                onSubmitEditing={async () => {
                  if (!foodSearchQuery || isSearching) return;
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setIsSearching(true); setFoodSearchResults([]);
                  try { const results = await searchUSDAFoods(foodSearchQuery); setFoodSearchResults(results); }
                  catch (error: any) { console.error("Food search error:", error.message); Alert.alert("Search Failed", "Unable to find foods. Please try a different search."); }
                  finally { setIsSearching(false); }
                }} />
              <TouchableOpacity style={[styles.foodSearchBtn, (!foodSearchQuery || isSearching) && styles.disabledButton]}
                onPress={async () => {
                  if (!foodSearchQuery || isSearching) return;
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setIsSearching(true); setFoodSearchResults([]);
                  try { const results = await searchUSDAFoods(foodSearchQuery); setFoodSearchResults(results); }
                  catch (error: any) { console.error("Food search error:", error.message); Alert.alert("Search Failed", "Unable to find foods."); }
                  finally { setIsSearching(false); }
                }} disabled={!foodSearchQuery || isSearching}>
                {isSearching ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Search size={18} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.foodSearchResultsList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {isSearching && foodSearchResults.length === 0 && (
                <View style={styles.foodSearchLoading}><ActivityIndicator size="large" color="#00ADB5" /><Text style={styles.foodSearchLoadingText}>{t('fuel_searching_usda')}</Text></View>
              )}
              {!isSearching && foodSearchResults.length === 0 && foodSearchQuery.length > 0 && (
                <View style={styles.foodSearchEmpty}><UtensilsCrossed size={36} color="#2A2F3A" /><Text style={styles.foodSearchEmptyText}>{t('fuel_press_search')}</Text></View>
              )}
              {!isSearching && foodSearchResults.length === 0 && foodSearchQuery.length === 0 && (
                <View style={styles.foodSearchEmpty}><Search size={36} color="#2A2F3A" /><Text style={styles.foodSearchEmptyText}>{t('fuel_search_usda_db')}</Text><Text style={styles.foodSearchEmptyHint}>{t('fuel_search_hint')}</Text></View>
              )}
              {foodSearchResults.map((item, index) => (
                <TouchableOpacity key={`${item.name}-${index}`} style={styles.foodSearchResultItem} activeOpacity={0.7}
                  onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    const newEntry = { id: Date.now().toString(), name: item.name, calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat, date: new Date().toISOString() };
                    addFoodEntry(newEntry);
                    setShowFoodSearch(false); setFoodSearchQuery(""); setFoodSearchResults([]);
                    Alert.alert(t('fuel_food_added'), t('fuel_food_added_msg', { name: item.name }));
                  }}>
                  <View style={styles.foodSearchResultLeft}>
                    <Text style={styles.foodSearchResultName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.foodSearchResultServing}>{item.serving}</Text>
                    <View style={styles.foodSearchResultMacros}>
                      <Text style={styles.foodSearchMacroP}>P: {item.protein}g</Text>
                      <Text style={styles.foodSearchMacroC}>C: {item.carbs}g</Text>
                      <Text style={styles.foodSearchMacroF}>F: {item.fat}g</Text>
                    </View>
                  </View>
                  <View style={styles.foodSearchResultRight}>
                    <Text style={styles.foodSearchResultCal}>{item.calories}</Text>
                    <Text style={styles.foodSearchResultCalLabel}>cal</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.foodSearchManualBtn} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFoodSearch(false); setFoodSearchQuery(""); setFoodSearchResults([]); setShowAddFood(true); }}>
              <Plus size={14} color="#6B7280" /><Text style={styles.foodSearchManualText}>{t('fuel_enter_manually_instead')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showEditGoals} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.sheetModal}>
            <TouchableOpacity style={styles.sheetClose} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowEditGoals(false); }}>
              <X size={22} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{t('fuel_edit_goals')}</Text>
            <Text style={styles.sheetSubtitle}>{t('fuel_adjust_targets')}</Text>
            <View style={styles.inputContainer}><Text style={styles.inputLabel}>{t('fuel_daily_calorie')}</Text><TextInput style={styles.input} placeholder="Calories" placeholderTextColor="#4B5563" value={editGoals.calorieGoal} onChangeText={(text) => setEditGoals({ ...editGoals, calorieGoal: text })} keyboardType="numeric" /></View>
            <View style={styles.inputContainer}><Text style={styles.inputLabel}>{t('fuel_daily_protein')}</Text><TextInput style={styles.input} placeholder="Protein" placeholderTextColor="#4B5563" value={editGoals.proteinGoal} onChangeText={(text) => setEditGoals({ ...editGoals, proteinGoal: text })} keyboardType="numeric" /></View>
            <View style={styles.inputContainer}><Text style={styles.inputLabel}>{t('fuel_daily_carbs')}</Text><TextInput style={styles.input} placeholder="Carbs" placeholderTextColor="#4B5563" value={editGoals.carbsGoal} onChangeText={(text) => setEditGoals({ ...editGoals, carbsGoal: text })} keyboardType="numeric" /></View>
            <View style={styles.inputContainer}><Text style={styles.inputLabel}>{t('fuel_daily_fat')}</Text><TextInput style={styles.input} placeholder="Fat" placeholderTextColor="#4B5563" value={editGoals.fatGoal} onChangeText={(text) => setEditGoals({ ...editGoals, fatGoal: text })} keyboardType="numeric" /></View>
            <TouchableOpacity style={styles.sheetPrimaryBtn} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleEditGoals(); }}>
              <Text style={styles.sheetPrimaryBtnText}>{t('fuel_save_goals')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showExerciseInput} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.sheetModal}>
            <TouchableOpacity style={styles.sheetClose} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowExerciseInput(false); setExerciseInput(""); }}>
              <X size={22} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{t('fuel_log_exercise')}</Text>
            <Text style={styles.sheetSubtitle}>{t('fuel_exercise_sub_desc')}</Text>
            <TextInput style={styles.sheetTextInput} placeholder={t('fuel_exercise_placeholder')} placeholderTextColor="#4B5563" value={exerciseInput} onChangeText={setExerciseInput} multiline autoFocus />
            <TouchableOpacity style={[styles.sheetPrimaryBtn, styles.exercisePrimaryBtn, (!exerciseInput || isAnalyzing) && styles.disabledButton]} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); void analyzeExercise(exerciseInput); }} disabled={!exerciseInput || isAnalyzing}>
              {isAnalyzing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sheetPrimaryBtnText}>{t('fuel_estimate_calories')}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showRefineFood} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.sheetModal}>
            <TouchableOpacity style={styles.sheetClose} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowRefineFood(false); setSelectedFoodEntry(null); setRefinementInput(""); }}>
              <X size={22} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{t('fuel_refine_entry')}</Text>
            <Text style={styles.sheetSubtitle}>{t('fuel_refine_sub')}</Text>
            {selectedFoodEntry && (
              <View style={styles.refineEntryPreview}>
                <Text style={styles.refineEntryName}>{selectedFoodEntry.name}</Text>
                <Text style={styles.refineEntryMacros}>{selectedFoodEntry.calories} cal · P: {selectedFoodEntry.protein}g · C: {selectedFoodEntry.carbs}g · F: {selectedFoodEntry.fat}g</Text>
              </View>
            )}
            <TextInput style={styles.sheetTextInput} placeholder={t('fuel_refine_placeholder')} placeholderTextColor="#4B5563" value={refinementInput} onChangeText={setRefinementInput} multiline autoFocus />
            <TouchableOpacity style={[styles.sheetPrimaryBtn, (!refinementInput || isAnalyzing) && styles.disabledButton]} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); if (selectedFoodEntry) void refineWithAI(selectedFoodEntry, refinementInput); }} disabled={!refinementInput || isAnalyzing}>
              {isAnalyzing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sheetPrimaryBtnText}>{t('fuel_refine_btn')}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showWeeklyReview} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.sheetModal}>
            <TouchableOpacity style={styles.sheetClose} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowWeeklyReview(false); setWeeklyReviewData(""); }}>
              <X size={22} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{t('fuel_weekly_review_title')}</Text>
            <ScrollView style={{ maxHeight: 400, marginTop: 16 }}>
              {isGeneratingReview ? (
                <View style={{ alignItems: "center" as const, paddingVertical: 40 }}>
                  <ActivityIndicator size="large" color="#00ADB5" />
                  <Text style={{ marginTop: 15, color: "#6B7280", fontSize: 15 }}>{t('fuel_analyzing_week')}</Text>
                </View>
              ) : (
                <Text style={{ fontSize: 15, color: "#D1D5DB", lineHeight: 24 }}>{weeklyReviewData}</Text>
              )}
            </ScrollView>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  headerSection: {
    marginTop: 8,
    marginBottom: 4,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800" as const,
    color: "#F9FAFB",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "500" as const,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },

  weeklyReviewBtn: {
    marginTop: 16,
    borderRadius: 14,
    overflow: "hidden",
  },
  weeklyReviewGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,173,181,0.15)",
  },
  weeklyReviewText: {
    flex: 1,
    color: "#00ADB5",
    fontSize: 14,
    fontWeight: "600" as const,
  },

  calorieCard: {
    backgroundColor: "#141720",
    borderRadius: 24,
    padding: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  calorieCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  calorieCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  calorieCardTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#F9FAFB",
  },
  resetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  resetText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  calorieRingWrapper: {
    alignItems: "center",
    paddingVertical: 8,
  },
  macroSplitRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  macroSplitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  macroSplitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroSplitLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500" as const,
  },

  macrosCard: {
    backgroundColor: "#141720",
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  macrosCardTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#F9FAFB",
    marginBottom: 20,
  },

  quickActions: {
    marginTop: 20,
  },
  quickActionsTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#F9FAFB",
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionChip: {
    flex: 1,
    backgroundColor: "#141720",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    gap: 8,
  },
  actionChipIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionChipText: {
    alignItems: "center",
  },
  actionChipLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#F3F4F6",
  },
  actionChipSub: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#4B5563",
    marginTop: 2,
  },
  exerciseChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#141720",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.12)",
    gap: 12,
  },
  exerciseChipTextWrap: {
    flex: 1,
  },
  exerciseChipSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  exercisePrimaryBtn: {
    backgroundColor: "#8B5CF6",
  },

  mealsSection: {
    marginTop: 28,
    marginBottom: 20,
  },
  mealsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  mealsSectionTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#F9FAFB",
  },
  mealsSectionCount: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  emptyMeals: {
    backgroundColor: "#141720",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  emptyMealsText: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 12,
    fontWeight: "600" as const,
  },
  emptyMealsHint: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 4,
  },
  mealCard: {
    backgroundColor: "#141720",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  mealCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  mealCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  mealCardName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#F9FAFB",
  },
  mealCardTime: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 3,
  },
  mealCardRight: {
    alignItems: "flex-end",
  },
  mealCardCal: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#00E5FF",
    letterSpacing: -0.5,
  },
  mealCardCalUnit: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500" as const,
    marginTop: -2,
  },
  mealCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealCardMacros: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    flex: 1,
  },
  mealMacroChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  mealMacroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mealMacroVal: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600" as const,
  },
  healthBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  healthBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  healthBadgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  mealDeleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginLeft: 8,
  },

  addFoodCard: {
    backgroundColor: "#141720",
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  addFoodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addFoodTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#F9FAFB",
  },
  inputContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#9CA3AF",
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#0D0F13",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    color: "#F9FAFB",
  },
  nutritionInputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  nutritionInputItem: {
    flex: 1,
  },
  nutritionInput: {
    backgroundColor: "#0D0F13",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    color: "#F9FAFB",
  },
  addFoodButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  addFoodBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  confirmBtn: {
    backgroundColor: "#00ADB5",
  },
  cancelBtnText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "600" as const,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600" as const,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,173,181,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  datePickerText: {
    color: "#00ADB5",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  mealPrepSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 14,
    fontStyle: "italic" as const,
  },

  quizRequiredCard: {
    backgroundColor: "#141720",
    borderRadius: 24,
    padding: 32,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
  },
  quizRequiredIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "rgba(0,173,181,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  quizRequiredTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    textAlign: "center",
    marginBottom: 10,
  },
  quizRequiredDescription: {
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  startQuizButton: {
    backgroundColor: "#00ADB5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 8,
    alignSelf: "stretch",
  },
  startQuizButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetModal: {
    backgroundColor: "#141720",
    borderRadius: 24,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  sheetClose: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
  },
  sheetTextInput: {
    backgroundColor: "#0D0F13",
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    minHeight: 100,
    textAlignVertical: "top",
    color: "#F3F4F6",
  },
  sheetPrimaryBtn: {
    backgroundColor: "#00ADB5",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
  },
  sheetPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  disabledButton: {
    opacity: 0.4,
  },
  refineEntryPreview: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  refineEntryName: {
    fontSize: 15,
    color: "#F3F4F6",
    fontWeight: "600" as const,
  },
  refineEntryMacros: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },

  firstTimeModal: {
    backgroundColor: "#141720",
    borderRadius: 24,
    padding: 28,
    width: "90%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  firstTimeIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "rgba(16,185,129,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  firstTimeTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    textAlign: "center",
    marginBottom: 10,
  },
  firstTimeDesc: {
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  firstTimeFeatures: {
    alignSelf: "stretch",
    marginBottom: 24,
    gap: 14,
  },
  firstTimeFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  firstTimeFeatureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  firstTimeFeatureText: {
    fontSize: 15,
    color: "#9CA3AF",
    flex: 1,
  },
  firstTimeBtns: {
    flexDirection: "row",
    gap: 12,
    alignSelf: "stretch",
  },
  firstTimeSkipBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  firstTimeSkipText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "600" as const,
  },
  firstTimeStartBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    flexDirection: "row",
    gap: 8,
  },
  firstTimeStartText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600" as const,
  },

  quizModal: {
    backgroundColor: "#141720",
    borderRadius: 24,
    padding: 28,
    width: "90%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  quizTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#F3F4F6",
    marginBottom: 4,
  },
  quizProgress: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 24,
    fontWeight: "500" as const,
  },
  quizQuestion: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#E5E7EB",
    marginBottom: 20,
  },
  quizInput: {
    backgroundColor: "#0D0F13",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    color: "#F3F4F6",
  },
  choicesContainer: {
    gap: 10,
  },
  choiceButton: {
    backgroundColor: "#0D0F13",
    borderRadius: 12,
    padding: 15,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.06)",
  },
  choiceButtonActive: {
    backgroundColor: "rgba(0,173,181,0.15)",
    borderColor: "#00ADB5",
  },
  choiceText: {
    fontSize: 15,
    color: "#D1D5DB",
    textAlign: "center",
    fontWeight: "500" as const,
  },
  choiceTextActive: {
    color: "#00E5FF",
    fontWeight: "600" as const,
  },
  quizButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 28,
  },
  quizButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  quizButtonPrimary: {
    backgroundColor: "#00ADB5",
  },
  quizButtonSecondary: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  quizButtonTextPrimary: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600" as const,
  },
  quizButtonTextSecondary: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "600" as const,
  },
  heightInputContainer: {
    flexDirection: "row",
    gap: 10,
  },
  heightInput: {
    flex: 1,
  },

  cameraContainer: { flex: 1, backgroundColor: "#000000" },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: "space-between" },
  cameraClose: { position: "absolute", top: 50, right: 20, zIndex: 1 },
  cameraBottomContainer: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", paddingBottom: 50, backgroundColor: "rgba(0, 0, 0, 0.3)", paddingTop: 20 },
  captureButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255, 255, 255, 0.3)", justifyContent: "center", alignItems: "center" },
  captureButtonInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#FFFFFF" },
  cameraText: { position: "absolute", top: "50%", left: 0, right: 0, textAlign: "center", color: "#FFFFFF", fontSize: 18, fontWeight: "600" as const, textShadowColor: "rgba(0, 0, 0, 0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  permissionContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  permissionText: { fontSize: 18, color: "#FFFFFF", marginBottom: 20 },
  permissionButton: { backgroundColor: "#00ADB5", padding: 15, borderRadius: 12 },
  permissionButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" as const },
  cameraGuide: { position: "absolute", top: "30%", left: "10%", right: "10%", height: "30%" },
  cameraGuideCorner: { position: "absolute", width: 40, height: 40, borderColor: "#FFFFFF", borderWidth: 3, borderTopWidth: 3, borderLeftWidth: 3, borderBottomWidth: 0, borderRightWidth: 0 },
  cameraGuideCornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderRightWidth: 3 },
  cameraGuideCornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderBottomWidth: 3 },
  cameraGuideCornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  analyzingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", alignItems: "center" },
  analyzingText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" as const, marginTop: 20 },

  foodSearchModal: {
    backgroundColor: "#141720",
    borderRadius: 24,
    padding: 24,
    width: "92%",
    maxWidth: 420,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  foodSearchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  foodSearchInput: {
    flex: 1,
    backgroundColor: "#0D0F13",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#F3F4F6",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  foodSearchBtn: {
    backgroundColor: "#00ADB5",
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  foodSearchResultsList: {
    marginTop: 16,
    maxHeight: 380,
  },
  foodSearchLoading: {
    alignItems: "center",
    paddingVertical: 40,
  },
  foodSearchLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  foodSearchEmpty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  foodSearchEmptyText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  foodSearchEmptyHint: {
    marginTop: 4,
    fontSize: 12,
    color: "#4B5563",
  },
  foodSearchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  foodSearchResultLeft: {
    flex: 1,
    marginRight: 12,
  },
  foodSearchResultName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#F3F4F6",
    lineHeight: 20,
  },
  foodSearchResultServing: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  foodSearchResultMacros: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  foodSearchMacroP: {
    fontSize: 11,
    color: "#FF4FB6",
    fontWeight: "600" as const,
  },
  foodSearchMacroC: {
    fontSize: 11,
    color: "#00FFC6",
    fontWeight: "600" as const,
  },
  foodSearchMacroF: {
    fontSize: 11,
    color: "#FFB400",
    fontWeight: "600" as const,
  },
  foodSearchResultRight: {
    alignItems: "center",
    minWidth: 50,
  },
  foodSearchResultCal: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#00E5FF",
  },
  foodSearchResultCalLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  foodSearchManualBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  foodSearchManualText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
});
