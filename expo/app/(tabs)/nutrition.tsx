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

import { Calendar, Settings, Brain, ScanLine, X, Edit, Plus, Trash2, Drumstick, Wheat, Droplet, Search, ChevronRight, UtensilsCrossed, Flame, TrendingUp, Dumbbell, ArrowLeft, Pencil, Sparkles, ChevronLeft, Bookmark } from "lucide-react-native";
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

const MiniRing = React.memo(({ percentage, color, size, strokeWidth }: { percentage: number; color: string; size: number; strokeWidth: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(0,0,0,0.04)" strokeWidth={strokeWidth} fill="none" />
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" strokeDasharray={`${circumference}`} strokeDashoffset={`${offset}`} strokeLinecap="round" />
    </Svg>
  );
});
MiniRing.displayName = "MiniRing";

const CalorieRing = React.memo(({ percentage, color, size }: { percentage: number; color: string; size: number }) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(0,0,0,0.04)" strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" strokeDasharray={`${circumference}`} strokeDashoffset={`${offset}`} strokeLinecap="round" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
        <Flame size={28} color="#1A1A1A" />
      </View>
    </View>
  );
});
CalorieRing.displayName = "CalorieRing";

const MacroCard = React.memo(({ value, label, color, icon, percentage }: { value: number; label: string; color: string; icon: React.ReactNode; percentage: number }) => {
  return (
    <View style={macroCardStyles.container}>
      <Text style={macroCardStyles.value}>{value}g</Text>
      <Text style={macroCardStyles.label}>{label}</Text>
      <View style={macroCardStyles.ringWrap}>
        <MiniRing percentage={percentage} color={color} size={52} strokeWidth={5} />
        <View style={macroCardStyles.ringIcon}>
          {icon}
        </View>
      </View>
    </View>
  );
});
MacroCard.displayName = "MacroCard";

const macroCardStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFCF9',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
  },
  value: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 13,
    color: '#6E6E73',
    fontWeight: '500' as const,
    marginTop: 2,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  ringIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function NutritionScreen() {
  const _router = useRouter();
  const { t, isSpanish } = useLanguage();
  const { nutrition, updateNutrition, foodHistory, addFoodEntry, deleteFoodEntry, updateFoodEntry, todaysFoodEntries, stats, savedFoods, saveFoodItem, deleteSavedFood, isFoodSaved } = useApp();
  const { isPremium } = useRevenueCat();
  const [showFirstTimePrompt, setShowFirstTimePrompt] = useState(false);

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [_timeUntilReset, _setTimeUntilReset] = useState<string>("");
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekOffset, setWeekOffset] = useState<number>(0);
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
  const [showFoodDetail, setShowFoodDetail] = useState(false);
  const [detailServings, setDetailServings] = useState("1");
  const [detailMeasurement, setDetailMeasurement] = useState("serving");
  const [showDetailRefineInput, setShowDetailRefineInput] = useState(false);
  const [detailRefineText, setDetailRefineText] = useState("");
  const [showSavedFoods, setShowSavedFoods] = useState(false);
  const [showFABMenu, setShowFABMenu] = useState(false);
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const fabRotateAnim = useRef(new Animated.Value(0)).current;
  const [weeklyReviewData, setWeeklyReviewData] = useState<string>("");
  const [_isGeneratingReview, _setIsGeneratingReview] = useState(false);
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
  const [showAnalyzingCard, setShowAnalyzingCard] = useState(false);
  const [analyzingFoodName, setAnalyzingFoodName] = useState<string | null>(null);

  const cameraRef = React.useRef<any>(null);
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const analyzingProgressAnim = useRef(new Animated.Value(0)).current;
  const analyzingPulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.timing(headerFadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [headerFadeAnim]);

  const toggleFABMenu = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const opening = !showFABMenu;
    setShowFABMenu(opening);
    Animated.spring(fabRotateAnim, {
      toValue: opening ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  }, [showFABMenu, fabRotateAnim]);

  const startAnalyzingAnimation = useCallback(() => {
    analyzingProgressAnim.setValue(0);
    analyzingPulseAnim.setValue(0.4);
    Animated.timing(analyzingProgressAnim, {
      toValue: 0.85,
      duration: 8000,
      useNativeDriver: false,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(analyzingPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(analyzingPulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [analyzingProgressAnim, analyzingPulseAnim]);

  const completeAnalyzingAnimation = useCallback(() => {
    analyzingPulseAnim.stopAnimation();
    Animated.timing(analyzingProgressAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [analyzingProgressAnim, analyzingPulseAnim]);

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
      
      _setTimeUntilReset(`${hours}h ${minutes}m`);
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
      heightCm = parseFloat(a.heightFeet);
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
        name: `${name}`,
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
    setShowAIInput(false);
    setShowCamera(false);
    setCapturedImage(null);
    setShowAnalyzingCard(true);
    setAnalyzingFoodName(null);
    startAnalyzingAnimation();
    try {
      let prompt;
      
      if (isImage) {
        try {
          const visionPrompt = 'You are a professional nutritionist. Analyze this food image and provide accurate nutritional estimates. Return ONLY a valid JSON object with format: {"name": "food description", "calories": number, "protein": number, "carbs": number, "fat": number}.';
          prompt = await callOpenAIWithVision(visionPrompt, input);
        } catch (imageError) {
          console.error('Image analysis failed:', imageError);
          setShowAnalyzingCard(false);
          Alert.alert("Image Analysis Failed", "Unable to analyze the image. Please try describing your food instead.", [{ text: "OK", onPress: () => { setShowAIInput(true); } }]);
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
      
      let parsedName = "";
      let parsedCals = 0;
      let parsedProt = 0;
      let parsedCarb = 0;
      let parsedFatVal = 0;
      let parsed = false;

      try {
        const nutritionData = JSON.parse(cleanedResponse);
        parsedName = nutritionData.name || "Unknown food";
        parsedCals = Number(nutritionData.calories) || 0;
        parsedProt = Number(nutritionData.protein) || 0;
        parsedCarb = Number(nutritionData.carbs) || 0;
        parsedFatVal = Number(nutritionData.fat) || 0;
        if (parsedName && parsedCals > 0) parsed = true;
      } catch (parseError: any) {
        console.error("Failed to parse AI response:", parseError.message);
        try {
          const nameMatch = cleanedResponse.match(/"name"\s*:\s*"([^"]+)"/);
          const caloriesMatch = cleanedResponse.match(/"calories"\s*:\s*(\d+)/);
          if (nameMatch && caloriesMatch) {
            parsedName = nameMatch[1];
            parsedCals = parseInt(caloriesMatch[1]);
            const proteinMatch = cleanedResponse.match(/"protein"\s*:\s*(\d+)/);
            const carbsMatch = cleanedResponse.match(/"carbs"\s*:\s*(\d+)/);
            const fatMatch = cleanedResponse.match(/"fat"\s*:\s*(\d+)/);
            parsedProt = proteinMatch ? parseInt(proteinMatch[1]) : 0;
            parsedCarb = carbsMatch ? parseInt(carbsMatch[1]) : 0;
            parsedFatVal = fatMatch ? parseInt(fatMatch[1]) : 0;
            parsed = true;
          }
        } catch (fallbackError) { console.error("Fallback parsing also failed:", fallbackError); }
      }

      if (parsed) {
        completeAnalyzingAnimation();
        setAnalyzingFoodName(parsedName);
        const newEntry = {
          id: Date.now().toString(),
          name: parsedName,
          calories: Math.round(parsedCals),
          protein: Math.round(parsedProt),
          carbs: Math.round(parsedCarb),
          fat: Math.round(parsedFatVal),
          date: new Date().toISOString(),
        };
        setTimeout(() => {
          addFoodEntry(newEntry);
          if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => {
            setShowAnalyzingCard(false);
            setAnalyzingFoodName(null);
          }, 1200);
        }, 500);
      } else {
        setShowAnalyzingCard(false);
        Alert.alert("Analysis Error", "Could not understand the nutritional data. Please try again or enter manually.", [
          { text: "Try Again", onPress: () => isImage ? setShowCamera(true) : setShowAIInput(true) },
          { text: "Enter Manually", onPress: () => { setShowAddFood(true); } }
        ]);
      }
    } catch (error: any) {
      console.error("AI analysis error:", error.message);
      setShowAnalyzingCard(false);
      Alert.alert("Analysis Failed", "Unable to analyze the food. Please try again or enter manually.", [
        { text: "Try Again", onPress: () => isImage ? setShowCamera(true) : setShowAIInput(true) },
        { text: "Enter Manually", onPress: () => { setShowAddFood(true); } }
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

  const isViewingToday = useMemo(() => {
    return selectedDate.toDateString() === new Date().toDateString();
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekOffset]);

  const selectedDayEntries = useMemo(() => {
    const dateStr = selectedDate.toDateString();
    return foodHistory.filter((entry: { date: string }) => new Date(entry.date).toDateString() === dateStr);
  }, [selectedDate, foodHistory]);

  const selectedDayNutrition = useMemo(() => {
    const entries = selectedDayEntries.filter((e: { calories: number }) => e.calories > 0);
    return {
      calories: entries.reduce((s: number, e: { calories: number }) => s + e.calories, 0),
      protein: entries.reduce((s: number, e: { protein: number }) => s + e.protein, 0),
      carbs: entries.reduce((s: number, e: { carbs: number }) => s + e.carbs, 0),
      fat: entries.reduce((s: number, e: { fat: number }) => s + e.fat, 0),
    };
  }, [selectedDayEntries]);

  const dayHitGoal = useCallback((date: Date) => {
    const dateStr = date.toDateString();
    const entries = foodHistory.filter((entry: { date: string; calories: number }) => new Date(entry.date).toDateString() === dateStr && entry.calories > 0);
    if (entries.length === 0) return 'none' as const;
    const totalCal = entries.reduce((s: number, e: { calories: number }) => s + e.calories, 0);
    return totalCal >= nutrition.calorieGoal * 0.8 && totalCal <= nutrition.calorieGoal * 1.2 ? 'hit' as const : 'missed' as const;
  }, [foodHistory, nutrition.calorieGoal]);

  const activeNutrition = isViewingToday ? nutrition : {
    ...nutrition,
    calories: selectedDayNutrition.calories,
    protein: selectedDayNutrition.protein,
    carbs: selectedDayNutrition.carbs,
    fat: selectedDayNutrition.fat,
  };

  const activeEntries = isViewingToday ? todaysFoodEntries : selectedDayEntries;

  if (!permission) return <View />;

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
            progressBackgroundColor="#FEFCF9"
          />
        }
      >
        <Animated.View style={[styles.headerSection, { opacity: headerFadeAnim, transform: [{ translateY: headerFadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>{t('fuel_nutrition_header')}</Text>
            </View>
            <View style={styles.headerActions}>
              {stats.foodStreak > 0 && (
                <View style={styles.streakBadge}>
                  <Flame size={14} color="#F59E0B" />
                  <Text style={styles.streakCount}>{stats.foodStreak}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => {
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEditGoals({ calorieGoal: nutrition.calorieGoal.toString(), proteinGoal: nutrition.proteinGoal.toString(), carbsGoal: nutrition.carbsGoal.toString(), fatGoal: nutrition.fatGoal.toString() });
                setShowEditGoals(true);
              }}>
                <Edit size={18} color="#8E8E93" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => {
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowQuiz(true);
              }}>
                <Settings size={18} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.weekSelector}>
            <TouchableOpacity
              style={styles.weekArrowBtn}
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setWeekOffset(prev => prev - 1);
              }}
            >
              <ChevronLeft size={16} color="#5A5A5E" />
            </TouchableOpacity>
            {weekDays.map((day) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const isSelected = day.toDateString() === selectedDate.toDateString();
              const isFuture = day > new Date();
              const goalStatus = !isFuture ? dayHitGoal(day) : 'none';
              const dayLabel = day.toLocaleDateString(isSpanish ? 'es-ES' : 'en-US', { weekday: 'short' });
              const dayNum = day.getDate();
              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={[
                    styles.weekDayItem,
                    isSelected && styles.weekDayItemSelected,
                  ]}
                  onPress={() => {
                    if (isFuture) return;
                    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDate(day);
                  }}
                  activeOpacity={isFuture ? 1 : 0.7}
                  disabled={isFuture}
                >
                  <Text style={[
                    styles.weekDayLabel,
                    isSelected && styles.weekDayLabelSelected,
                    isFuture && styles.weekDayLabelFuture,
                  ]}>{dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1, 3)}</Text>
                  <View style={[
                    styles.weekDayCircle,
                    isSelected && styles.weekDayCircleSelected,
                    !isSelected && isToday && styles.weekDayCircleToday,
                    !isSelected && !isToday && !isFuture && goalStatus === 'hit' && styles.weekDayCircleHit,
                    !isSelected && !isToday && !isFuture && goalStatus === 'missed' && styles.weekDayCircleMissed,
                    !isSelected && !isToday && !isFuture && goalStatus === 'none' && styles.weekDayCircleEmpty,
                    !isSelected && isFuture && styles.weekDayCircleFuture,
                  ]}>
                    <Text style={[
                      styles.weekDayNum,
                      isSelected && styles.weekDayNumSelected,
                      !isSelected && isToday && styles.weekDayNumToday,
                      isFuture && !isSelected && styles.weekDayNumFuture,
                    ]}>{dayNum}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.weekArrowBtn}
              onPress={() => {
                if (weekOffset >= 0) return;
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setWeekOffset(prev => prev + 1);
              }}
              disabled={weekOffset >= 0}
            >
              <ChevronRight size={16} color={weekOffset >= 0 ? '#C7C7CC' : '#7A7A7A'} />
            </TouchableOpacity>
          </View>

          {!isViewingToday && (
            <TouchableOpacity
              style={styles.viewingPastBanner}
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedDate(new Date());
                setWeekOffset(0);
              }}
            >
              <Text style={styles.viewingPastText}>
                {t('fuel_viewing_past')} {selectedDate.toLocaleDateString(isSpanish ? 'es-ES' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.viewingPastBack}>← {t('fuel_today')}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        <View style={styles.calorieCard}>
          <View style={styles.calorieCardInner}>
            <View style={styles.calorieCardLeft}>
              <Text style={styles.calorieMainNumber}>{Math.max(activeNutrition.calorieGoal - activeNutrition.calories, 0)}</Text>
              <Text style={styles.calorieLeftLabel}>{t('fuel_calories_left')}</Text>
              {activeEntries.some(e => e.calories < 0) && (
                <View style={styles.exerciseBadge}>
                  <Dumbbell size={12} color="#8E8E93" />
                  <Text style={styles.exerciseBadgeText}>+{Math.abs(activeEntries.filter(e => e.calories < 0).reduce((s, e) => s + e.calories, 0))}</Text>
                </View>
              )}
            </View>
            <View style={styles.calorieCardRight}>
              <CalorieRing percentage={Math.min((activeNutrition.calories / activeNutrition.calorieGoal) * 100, 100)} color={activeNutrition.calories > activeNutrition.calorieGoal ? '#EF4444' : '#00E5FF'} size={100} />
            </View>
          </View>
        </View>

        <View style={styles.macroCardsRow}>
          <MacroCard
            value={Math.max(activeNutrition.proteinGoal - activeNutrition.protein, 0)}
            label={t('fuel_protein_left')}
            color="#FF4FB6"
            icon={<Drumstick size={16} color="#FF4FB6" />}
            percentage={Math.min((activeNutrition.protein / activeNutrition.proteinGoal) * 100, 100)}
          />
          <MacroCard
            value={Math.max(activeNutrition.carbsGoal - activeNutrition.carbs, 0)}
            label={t('fuel_carbs_left')}
            color="#00FFC6"
            icon={<Wheat size={16} color="#00FFC6" />}
            percentage={Math.min((activeNutrition.carbs / activeNutrition.carbsGoal) * 100, 100)}
          />
          <MacroCard
            value={Math.max(activeNutrition.fatGoal - activeNutrition.fat, 0)}
            label={t('fuel_fat_left')}
            color="#FFB400"
            icon={<Droplet size={16} color="#FFB400" />}
            percentage={Math.min((activeNutrition.fat / activeNutrition.fatGoal) * 100, 100)}
          />
        </View>

        {(() => {
          const hasFood = activeEntries.filter(e => e.calories > 0).length > 0;
          if (!hasFood) {
            return (
              <View style={styles.healthScoreCard}>
                <View style={styles.healthScoreHeader}>
                  <Text style={styles.healthScoreTitle}>{t('fuel_health_score')}</Text>
                  <Text style={styles.healthScoreValue}>{t('fuel_health_score_na')}</Text>
                </View>
                <View style={styles.healthScoreBarTrack}>
                  <View style={[styles.healthScoreBarFill, { width: '0%', backgroundColor: '#6B7280' }]} />
                </View>
                <Text style={styles.healthScoreDesc}>{t('fuel_health_score_desc')}</Text>
              </View>
            );
          }
          const foodEntries = activeEntries.filter(e => e.calories > 0);
          const avgScore = foodEntries.reduce((sum, e) => sum + calculateHealthScore(e).score, 0) / foodEntries.length;
          const roundedScore = Math.round(avgScore * 10) / 10;
          const scoreColor = roundedScore >= 7.5 ? '#10B981' : roundedScore >= 5 ? '#F59E0B' : '#EF4444';
          const scorePercent = (roundedScore / 10) * 100;
          const scoreMsg = roundedScore >= 7.5 ? t('fuel_health_score_great') : roundedScore >= 5 ? t('fuel_health_score_good') : roundedScore >= 3 ? t('fuel_health_score_fair') : t('fuel_health_score_poor');
          return (
            <View style={styles.healthScoreCard}>
              <View style={styles.healthScoreHeader}>
                <Text style={styles.healthScoreTitle}>{t('fuel_health_score')}</Text>
                <Text style={[styles.healthScoreValue, { color: scoreColor }]}>{roundedScore}/10</Text>
              </View>
              <View style={styles.healthScoreBarTrack}>
                <View style={[styles.healthScoreBarFill, { width: `${scorePercent}%`, backgroundColor: scoreColor }]} />
              </View>
              <Text style={styles.healthScoreDesc}>{scoreMsg}</Text>
            </View>
          );
        })()}

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
              <TextInput style={styles.input} placeholder={t('fuel_enter_food_name')} placeholderTextColor="#A8A8A0" value={foodName} onChangeText={setFoodName} />
            </View>
            <View style={styles.nutritionInputRow}>
              <View style={styles.nutritionInputItem}>
                <Text style={styles.inputLabel}>{t('fuel_calories')}</Text>
                <TextInput style={styles.nutritionInput} placeholder="0" placeholderTextColor="#A8A8A0" value={calories} onChangeText={setCalories} keyboardType="numeric" />
              </View>
              <View style={styles.nutritionInputItem}>
                <Text style={styles.inputLabel}>{t('fuel_protein_g')}</Text>
                <TextInput style={styles.nutritionInput} placeholder="0" placeholderTextColor="#A8A8A0" value={protein} onChangeText={setProtein} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.nutritionInputRow}>
              <View style={styles.nutritionInputItem}>
                <Text style={styles.inputLabel}>{t('fuel_carbs_g')}</Text>
                <TextInput style={styles.nutritionInput} placeholder="0" placeholderTextColor="#A8A8A0" value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
              </View>
              <View style={styles.nutritionInputItem}>
                <Text style={styles.inputLabel}>{t('fuel_fat_g')}</Text>
                <TextInput style={styles.nutritionInput} placeholder="0" placeholderTextColor="#A8A8A0" value={fat} onChangeText={setFat} keyboardType="numeric" />
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
            {!nutrition.quizCompleted && (
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
            )}
          </>
        )}

        {showAnalyzingCard && (
          <View style={analyzingStyles.container}>
            <View style={analyzingStyles.card}>
              <View style={analyzingStyles.cardContent}>
                <View style={analyzingStyles.progressCircleWrap}>
                  <Svg width={56} height={56} style={{ transform: [{ rotate: '-90deg' }] }}>
                    <Circle cx={28} cy={28} r={23} stroke="rgba(255,255,255,0.08)" strokeWidth={5} fill="none" />
                  </Svg>
                  <View style={analyzingStyles.progressFillWrap}>
                    <Animated.View style={[analyzingStyles.progressFillCircle, {
                      opacity: analyzingProgressAnim.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 1, 1] }),
                    }]}>
                      <Svg width={56} height={56} style={{ transform: [{ rotate: '-90deg' }] }}>
                        <Circle
                          cx={28} cy={28} r={23}
                          stroke="#00E5FF"
                          strokeWidth={5}
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 23}`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                        />
                      </Svg>
                    </Animated.View>
                  </View>
                  <Animated.Text style={[analyzingStyles.progressText, { opacity: analyzingPulseAnim }]}>
                    {analyzingFoodName ? 'Done' : '...'}
                  </Animated.Text>
                </View>
                <View style={analyzingStyles.textWrap}>
                  <Text style={analyzingStyles.title}>
                    {analyzingFoodName ? 'Food Logged!' : 'Estimating Nutrition'}
                  </Text>
                  <View style={analyzingStyles.shimmerRow}>
                    {analyzingFoodName ? (
                      <Text style={analyzingStyles.foodNameText} numberOfLines={1}>{analyzingFoodName}</Text>
                    ) : (
                      <>
                        <Animated.View style={[analyzingStyles.shimmerBar, { width: '55%', opacity: analyzingPulseAnim }]} />
                        <Animated.View style={[analyzingStyles.shimmerBar, { width: '35%', opacity: analyzingPulseAnim }]} />
                        <Animated.View style={[analyzingStyles.shimmerBar, { width: '45%', opacity: analyzingPulseAnim }]} />
                      </>
                    )}
                  </View>
                  <Text style={analyzingStyles.subtitle}>
                    {analyzingFoodName ? 'Tap on it to edit or remove' : 'Analyzing your food...'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {nutrition.quizCompleted && (
          <View style={styles.mealsSection}>
            <View style={styles.mealsSectionHeader}>
              <Text style={styles.mealsSectionTitle}>{isViewingToday ? t('fuel_todays_meals') : t('fuel_meals_for_day')}</Text>
              <Text style={styles.mealsSectionCount}>{activeEntries.length} {t('fuel_logged')}</Text>
            </View>
            {activeEntries.length === 0 ? (
              <View style={styles.emptyMeals}>
                <UtensilsCrossed size={32} color="#C2BDB4" />
                <Text style={styles.emptyMealsText}>{t('fuel_no_meals_logged')}</Text>
                <Text style={styles.emptyMealsHint}>{t('fuel_use_options')}</Text>
              </View>
            ) : (
              activeEntries.map((entry, index) => {
                const healthScore = calculateHealthScore(entry);
                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={[styles.mealCard, index === activeEntries.length - 1 && { marginBottom: 0 }]}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedFoodEntry(entry);
                      setDetailServings("1");
                      setDetailMeasurement("serving");
                      setShowDetailRefineInput(false);
                      setDetailRefineText("");
                      setShowFoodDetail(true);
                    }}
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
                        <Trash2 size={14} color="#5A5A5E" />
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
                      <TextInput style={[styles.quizInput, styles.heightInput]} placeholder="170 cm" placeholderTextColor="#A8A8A0" keyboardType="numeric" value={quizAnswers.heightFeet} onChangeText={(text) => setQuizAnswers(prev => ({ ...prev, heightFeet: text, heightInches: '0' }))} />
                    ) : (
                      <>
                        <TextInput style={[styles.quizInput, styles.heightInput]} placeholder={t('fuel_feet')} placeholderTextColor="#A8A8A0" keyboardType="numeric" value={quizAnswers.heightFeet} onChangeText={(text) => setQuizAnswers(prev => ({ ...prev, heightFeet: text }))} />
                        <TextInput style={[styles.quizInput, styles.heightInput]} placeholder={t('fuel_inches')} placeholderTextColor="#A8A8A0" keyboardType="numeric" value={quizAnswers.heightInches} onChangeText={(text) => setQuizAnswers(prev => ({ ...prev, heightInches: text }))} />
                      </>
                    )}
                  </View>
                ) : currentQuizQuestion.type === "number" ? (
                  <TextInput style={styles.quizInput} placeholder={currentQuizQuestion.placeholder} placeholderTextColor="#A8A8A0" keyboardType="numeric" value={quizAnswers[currentQuizQuestion.key as keyof typeof quizAnswers]} onChangeText={(text) => setQuizAnswers(prev => ({ ...prev, [currentQuizQuestion.key]: text }))} />
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
              <X size={22} color="#5A5A5E" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{t('fuel_describe_food')}</Text>
            <Text style={styles.sheetSubtitle}>{t('fuel_describe_food_sub')}</Text>
            <TextInput style={styles.sheetTextInput} placeholder={t('fuel_describe_placeholder')} placeholderTextColor="#A8A8A0" value={aiInput} onChangeText={setAiInput} multiline autoFocus />
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
              <X size={22} color="#5A5A5E" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{t('fuel_search_foods')}</Text>
            <View style={styles.foodSearchInputRow}>
              <TextInput style={styles.foodSearchInput} placeholder={t('fuel_search_placeholder')} placeholderTextColor="#A8A8A0" value={foodSearchQuery} onChangeText={setFoodSearchQuery} autoFocus returnKeyType="search"
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
              <Plus size={14} color="#5A5A5E" /><Text style={styles.foodSearchManualText}>{t('fuel_enter_manually_instead')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showEditGoals} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.sheetModal}>
            <TouchableOpacity style={styles.sheetClose} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowEditGoals(false); }}>
              <X size={22} color="#5A5A5E" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{t('fuel_edit_goals')}</Text>
            <Text style={styles.sheetSubtitle}>{t('fuel_adjust_targets')}</Text>
            <View style={styles.inputContainer}><Text style={styles.inputLabel}>{t('fuel_daily_calorie')}</Text><TextInput style={styles.input} placeholder="Calories" placeholderTextColor="#A8A8A0" value={editGoals.calorieGoal} onChangeText={(text) => setEditGoals({ ...editGoals, calorieGoal: text })} keyboardType="numeric" /></View>
            <View style={styles.inputContainer}><Text style={styles.inputLabel}>{t('fuel_daily_protein')}</Text><TextInput style={styles.input} placeholder="Protein" placeholderTextColor="#A8A8A0" value={editGoals.proteinGoal} onChangeText={(text) => setEditGoals({ ...editGoals, proteinGoal: text })} keyboardType="numeric" /></View>
            <View style={styles.inputContainer}><Text style={styles.inputLabel}>{t('fuel_daily_carbs')}</Text><TextInput style={styles.input} placeholder="Carbs" placeholderTextColor="#A8A8A0" value={editGoals.carbsGoal} onChangeText={(text) => setEditGoals({ ...editGoals, carbsGoal: text })} keyboardType="numeric" /></View>
            <View style={styles.inputContainer}><Text style={styles.inputLabel}>{t('fuel_daily_fat')}</Text><TextInput style={styles.input} placeholder="Fat" placeholderTextColor="#A8A8A0" value={editGoals.fatGoal} onChangeText={(text) => setEditGoals({ ...editGoals, fatGoal: text })} keyboardType="numeric" /></View>
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
              <X size={22} color="#5A5A5E" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{t('fuel_log_exercise')}</Text>
            <Text style={styles.sheetSubtitle}>{t('fuel_exercise_sub_desc')}</Text>
            <TextInput style={styles.sheetTextInput} placeholder={t('fuel_exercise_placeholder')} placeholderTextColor="#A8A8A0" value={exerciseInput} onChangeText={setExerciseInput} multiline autoFocus />
            <TouchableOpacity style={[styles.sheetPrimaryBtn, styles.exercisePrimaryBtn, (!exerciseInput || isAnalyzing) && styles.disabledButton]} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); void analyzeExercise(exerciseInput); }} disabled={!exerciseInput || isAnalyzing}>
              {isAnalyzing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sheetPrimaryBtnText}>{t('fuel_estimate_calories')}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showFoodDetail} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.foodDetailOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
          <View style={fdStyles.detailModal}>
            <View style={fdStyles.detailHeader}>
              <TouchableOpacity
                style={fdStyles.detailBackBtn}
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (showDetailRefineInput) {
                    setShowDetailRefineInput(false);
                    setDetailRefineText("");
                  } else {
                    setShowFoodDetail(false);
                    setSelectedFoodEntry(null);
                    setShowDetailRefineInput(false);
                    setDetailRefineText("");
                  }
                }}
              >
                <ArrowLeft size={20} color="#2C2C2C" />
              </TouchableOpacity>
              <Text style={fdStyles.detailHeaderTitle}>{t('fuel_detail_title')}</Text>
              <View style={fdStyles.detailHeaderRight}>
                <TouchableOpacity
                  style={[fdStyles.detailBookmarkBtn, selectedFoodEntry && isFoodSaved(selectedFoodEntry.name) && fdStyles.detailBookmarkBtnActive]}
                  onPress={() => {
                    if (!selectedFoodEntry) return;
                    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    if (isFoodSaved(selectedFoodEntry.name)) {
                      const saved = savedFoods.find(f => f.name.toLowerCase() === selectedFoodEntry.name.toLowerCase());
                      if (saved) deleteSavedFood(saved.id);
                      Alert.alert(t('fuel_food_unsaved'), t('fuel_food_unsaved_msg', { name: selectedFoodEntry.name }));
                    } else {
                      saveFoodItem({
                        name: selectedFoodEntry.name,
                        calories: selectedFoodEntry.calories,
                        protein: selectedFoodEntry.protein,
                        carbs: selectedFoodEntry.carbs,
                        fat: selectedFoodEntry.fat,
                      });
                      Alert.alert(t('fuel_food_saved'), t('fuel_food_saved_msg', { name: selectedFoodEntry.name }));
                    }
                  }}
                >
                  <Bookmark size={18} color={selectedFoodEntry && isFoodSaved(selectedFoodEntry.name) ? "#EF4444" : "#5A5A5E"} fill={selectedFoodEntry && isFoodSaved(selectedFoodEntry.name) ? "#EF4444" : "none"} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={fdStyles.detailDeleteBtn}
                  onPress={() => {
                    if (!selectedFoodEntry) return;
                    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert(t('fuel_delete_food'), t('fuel_delete_food_confirm', { name: selectedFoodEntry.name }), [
                      { text: t('common_cancel'), style: "cancel" },
                      { text: t('common_delete'), style: "destructive", onPress: () => {
                        deleteFoodEntry(selectedFoodEntry.id);
                        setShowFoodDetail(false);
                        setSelectedFoodEntry(null);
                      }}
                    ]);
                  }}
                >
                  <Trash2 size={18} color="#5A5A5E" />
                </TouchableOpacity>
              </View>
            </View>

            {selectedFoodEntry && (
              <ScrollView style={fdStyles.detailScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {!showDetailRefineInput && (
                  <>
                    <View style={fdStyles.detailTimeBadge}>
                      <Text style={fdStyles.detailTimeText}>
                        {new Date(selectedFoodEntry.date).toLocaleTimeString(isSpanish ? 'es-ES' : 'en-US', { hour: 'numeric', minute: '2-digit' })}
                      </Text>
                    </View>

                    <Text style={fdStyles.detailFoodName}>{selectedFoodEntry.name}</Text>

                    <View style={fdStyles.servingsRow}>
                      <Text style={fdStyles.servingsLabel}>{t('fuel_detail_servings')}</Text>
                      <View style={fdStyles.servingsInputWrap}>
                        <TextInput
                          style={fdStyles.servingsInput}
                          value={detailServings}
                          onChangeText={setDetailServings}
                          keyboardType="numeric"
                          selectTextOnFocus
                        />
                        <Pencil size={14} color="#5A5A5E" />
                      </View>
                    </View>

                    {(() => {
                      const measurementScales: Record<string, number> = {
                        serving: 1,
                        g: 0.01,
                        tbsp: 0.1,
                        cup: 2,
                        oz: 0.25,
                        piece: 0.5,
                      };
                      const scale = measurementScales[detailMeasurement] ?? 1;
                      const servings = parseFloat(detailServings) || 1;
                      const multiplier = scale * servings;
                      const cal = Math.round(selectedFoodEntry.calories * multiplier);
                      const prot = Math.round(selectedFoodEntry.protein * multiplier);
                      const carb = Math.round(selectedFoodEntry.carbs * multiplier);
                      const fatVal = Math.round(selectedFoodEntry.fat * multiplier);
                      return (
                        <>
                          <View style={fdStyles.calorieBox}>
                            <Flame size={22} color="#1F2937" />
                            <View>
                              <Text style={fdStyles.calorieBoxLabel}>{t('fuel_detail_calories')}</Text>
                              <Text style={fdStyles.calorieBoxValue}>{cal}</Text>
                            </View>
                          </View>

                          <View style={fdStyles.macroRow}>
                            <View style={fdStyles.macroBox}>
                              <Drumstick size={16} color="#FF4FB6" />
                              <Text style={fdStyles.macroBoxLabel}>{t('home_protein')}</Text>
                              <Text style={fdStyles.macroBoxValue}>{prot}g</Text>
                            </View>
                            <View style={fdStyles.macroBox}>
                              <Wheat size={16} color="#00FFC6" />
                              <Text style={fdStyles.macroBoxLabel}>{t('home_carbs')}</Text>
                              <Text style={fdStyles.macroBoxValue}>{carb}g</Text>
                            </View>
                            <View style={fdStyles.macroBox}>
                              <Droplet size={16} color="#FFB400" />
                              <Text style={fdStyles.macroBoxLabel}>{t('home_fat')}</Text>
                              <Text style={fdStyles.macroBoxValue}>{fatVal}g</Text>
                            </View>
                          </View>
                        </>
                      );
                    })()}

                    <TouchableOpacity
                      style={fdStyles.refineAIBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowDetailRefineInput(true);
                      }}
                    >
                      <Sparkles size={18} color="#00ADB5" />
                      <Text style={fdStyles.refineAIBtnText}>{t('fuel_detail_refine_ai')}</Text>
                      <ChevronRight size={16} color="#00ADB5" />
                    </TouchableOpacity>
                  </>
                )}

                {showDetailRefineInput && (
                  <>
                    <View style={fdStyles.macroRow}>
                      <View style={fdStyles.macroBox}>
                        <Text style={fdStyles.macroBoxLabel}>{t('home_protein')}</Text>
                        <Text style={fdStyles.macroBoxValue}>{selectedFoodEntry.protein}g</Text>
                      </View>
                      <View style={fdStyles.macroBox}>
                        <Text style={fdStyles.macroBoxLabel}>{t('home_carbs')}</Text>
                        <Text style={fdStyles.macroBoxValue}>{selectedFoodEntry.carbs}g</Text>
                      </View>
                      <View style={fdStyles.macroBox}>
                        <Text style={fdStyles.macroBoxLabel}>{t('home_fat')}</Text>
                        <Text style={fdStyles.macroBoxValue}>{selectedFoodEntry.fat}g</Text>
                      </View>
                    </View>

                    <View style={fdStyles.refineSection}>
                      <Text style={fdStyles.refineSectionTitle}>{t('fuel_detail_refine_ai')}</Text>
                      <TextInput
                        style={fdStyles.refineInput}
                        placeholder={t('fuel_detail_refine_placeholder')}
                        placeholderTextColor="#A8A8A0"
                        value={detailRefineText}
                        onChangeText={setDetailRefineText}
                        multiline
                        autoFocus
                      />
                      <TouchableOpacity
                        style={[fdStyles.refineSubmitBtn, (!detailRefineText || isAnalyzing) && styles.disabledButton]}
                        onPress={() => {
                          if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          if (selectedFoodEntry && detailRefineText) {
                            void refineWithAI(selectedFoodEntry, detailRefineText).then(() => {
                              setShowFoodDetail(false);
                            });
                          }
                        }}
                        disabled={!detailRefineText || isAnalyzing}
                      >
                        {isAnalyzing ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <Sparkles size={16} color="#FFFFFF" />
                            <Text style={fdStyles.refineSubmitText}>{t('fuel_refine_btn')}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <View style={{ height: 40 }} />
              </ScrollView>
            )}

            <TouchableOpacity
              style={fdStyles.doneBtn}
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                const measurementScalesDone: Record<string, number> = {
                  serving: 1, g: 0.01, tbsp: 0.1, cup: 2, oz: 0.25, piece: 0.5,
                };
                const scaleDone = measurementScalesDone[detailMeasurement] ?? 1;
                const finalMultiplier = scaleDone * (parseFloat(detailServings) || 1);
                if (selectedFoodEntry && finalMultiplier !== 1) {
                  updateFoodEntry(selectedFoodEntry.id, {
                    calories: Math.round(selectedFoodEntry.calories * finalMultiplier),
                    protein: Math.round(selectedFoodEntry.protein * finalMultiplier),
                    carbs: Math.round(selectedFoodEntry.carbs * finalMultiplier),
                    fat: Math.round(selectedFoodEntry.fat * finalMultiplier),
                  });
                }
                setShowFoodDetail(false);
                setSelectedFoodEntry(null);
                setShowDetailRefineInput(false);
                setDetailRefineText("");
              }}
            >
              <Text style={fdStyles.doneBtnText}>{t('fuel_detail_done')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showRefineFood} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.sheetModal}>
            <TouchableOpacity style={styles.sheetClose} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowRefineFood(false); setSelectedFoodEntry(null); setRefinementInput(""); }}>
              <X size={22} color="#5A5A5E" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{t('fuel_refine_entry')}</Text>
            <Text style={styles.sheetSubtitle}>{t('fuel_refine_sub')}</Text>
            {selectedFoodEntry && (
              <View style={styles.refineEntryPreview}>
                <Text style={styles.refineEntryName}>{selectedFoodEntry.name}</Text>
                <Text style={styles.refineEntryMacros}>{selectedFoodEntry.calories} cal · P: {selectedFoodEntry.protein}g · C: {selectedFoodEntry.carbs}g · F: {selectedFoodEntry.fat}g</Text>
              </View>
            )}
            <TextInput style={styles.sheetTextInput} placeholder={t('fuel_refine_placeholder')} placeholderTextColor="#A8A8A0" value={refinementInput} onChangeText={setRefinementInput} multiline autoFocus />
            <TouchableOpacity style={[styles.sheetPrimaryBtn, (!refinementInput || isAnalyzing) && styles.disabledButton]} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); if (selectedFoodEntry) void refineWithAI(selectedFoodEntry, refinementInput); }} disabled={!refinementInput || isAnalyzing}>
              {isAnalyzing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sheetPrimaryBtnText}>{t('fuel_refine_btn')}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showSavedFoods} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.foodSearchModal}>
            <TouchableOpacity style={styles.sheetClose} onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSavedFoods(false);
            }}>
              <X size={22} color="#5A5A5E" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{t('fuel_saved_foods')}</Text>
            <Text style={styles.sheetSubtitle}>{t('fuel_saved_sub')}</Text>
            <ScrollView style={styles.foodSearchResultsList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {savedFoods.length === 0 ? (
                <View style={styles.foodSearchEmpty}>
                  <Bookmark size={36} color="#2A2F3A" />
                  <Text style={styles.foodSearchEmptyText}>{t('fuel_no_saved_foods')}</Text>
                  <Text style={styles.foodSearchEmptyHint}>{t('fuel_no_saved_foods_hint')}</Text>
                </View>
              ) : (
                savedFoods.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.foodSearchResultItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      const newEntry = {
                        id: Date.now().toString(),
                        name: item.name,
                        calories: item.calories,
                        protein: item.protein,
                        carbs: item.carbs,
                        fat: item.fat,
                        date: new Date().toISOString(),
                      };
                      addFoodEntry(newEntry);
                      setShowSavedFoods(false);
                      Alert.alert(t('fuel_food_added'), t('fuel_food_added_msg', { name: item.name }));
                    }}
                  >
                    <View style={styles.foodSearchResultLeft}>
                      <Text style={styles.foodSearchResultName} numberOfLines={2}>{item.name}</Text>
                      <View style={styles.foodSearchResultMacros}>
                        <Text style={styles.foodSearchMacroP}>P: {item.protein}g</Text>
                        <Text style={styles.foodSearchMacroC}>C: {item.carbs}g</Text>
                        <Text style={styles.foodSearchMacroF}>F: {item.fat}g</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={styles.foodSearchResultRight}>
                        <Text style={styles.foodSearchResultCal}>{item.calories}</Text>
                        <Text style={styles.foodSearchResultCalLabel}>cal</Text>
                      </View>
                      <TouchableOpacity
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          deleteSavedFood(item.id);
                        }}
                      >
                        <Trash2 size={14} color="#5A5A5E" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {nutrition.quizCompleted && (
        <TouchableOpacity
          style={fabStyles.fab}
          activeOpacity={0.85}
          onPress={toggleFABMenu}
          testID="nutrition-fab"
        >
          <Animated.View style={{
            transform: [{
              rotate: fabRotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '45deg'],
              }),
            }],
          }}>
            <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
          </Animated.View>
        </TouchableOpacity>
      )}

      <Modal visible={showFABMenu} animationType="fade" transparent>
        <TouchableOpacity
          style={fabStyles.overlay}
          activeOpacity={1}
          onPress={toggleFABMenu}
        >
          <View style={fabStyles.menuContainer}>
            <View style={fabStyles.menuGrid}>
              <TouchableOpacity
                style={fabStyles.menuItem}
                activeOpacity={0.7}
                onPress={async () => {
                  toggleFABMenu();
                  if (!isPremium) { router.push('/paywall'); return; }
                  if (!permission?.granted) { const result = await requestPermission(); if (result.granted) setShowCamera(true); } else setShowCamera(true);
                }}
              >
                <View style={[fabStyles.menuItemIcon, { backgroundColor: 'rgba(0,229,255,0.12)' }]}>
                  <ScanLine size={24} color="#00E5FF" />
                </View>
                <Text style={fabStyles.menuItemLabel}>{t('fuel_scan')} food</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={fabStyles.menuItem}
                activeOpacity={0.7}
                onPress={() => {
                  toggleFABMenu();
                  if (!isPremium) { router.push('/paywall'); return; }
                  setShowAIInput(true);
                }}
              >
                <View style={[fabStyles.menuItemIcon, { backgroundColor: 'rgba(191,255,0,0.12)' }]}>
                  <Brain size={24} color="#BFFF00" />
                </View>
                <Text style={fabStyles.menuItemLabel}>{t('fuel_describe')} food</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={fabStyles.menuItem}
                activeOpacity={0.7}
                onPress={() => {
                  toggleFABMenu();
                  if (!isPremium) { router.push('/paywall'); return; }
                  setShowFoodSearch(true);
                }}
              >
                <View style={[fabStyles.menuItemIcon, { backgroundColor: 'rgba(255,107,53,0.12)' }]}>
                  <Search size={24} color="#FF6B35" />
                </View>
                <Text style={fabStyles.menuItemLabel}>Food Database</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={fabStyles.menuItem}
                activeOpacity={0.7}
                onPress={() => {
                  toggleFABMenu();
                  setShowSavedFoods(true);
                }}
              >
                <View style={[fabStyles.menuItemIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                  <Bookmark size={24} color="#EF4444" fill="#EF4444" />
                </View>
                <Text style={fabStyles.menuItemLabel}>{t('fuel_saved_foods')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={fabStyles.menuItem}
                activeOpacity={0.7}
                onPress={() => {
                  toggleFABMenu();
                  if (!isPremium) { router.push('/paywall'); return; }
                  setShowExerciseInput(true);
                }}
              >
                <View style={[fabStyles.menuItemIcon, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                  <Dumbbell size={24} color="#8B5CF6" />
                </View>
                <Text style={fabStyles.menuItemLabel}>{t('fuel_log_exercise')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={fabStyles.menuItem}
                activeOpacity={0.7}
                onPress={() => {
                  toggleFABMenu();
                  setShowAddFood(true);
                }}
              >
                <View style={[fabStyles.menuItemIcon, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                  <Plus size={24} color="#F59E0B" />
                </View>
                <Text style={fabStyles.menuItemLabel}>{t('fuel_manual')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showWeeklyReview} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.sheetModal}>
            <TouchableOpacity style={styles.sheetClose} onPress={() => { if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowWeeklyReview(false); setWeeklyReviewData(""); }}>
              <X size={22} color="#5A5A5E" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{t('fuel_weekly_review_title')}</Text>
            <ScrollView style={{ maxHeight: 400, marginTop: 16 }}>
              {_isGeneratingReview ? (
                <View style={{ alignItems: "center" as const, paddingVertical: 40 }}>
                  <ActivityIndicator size="large" color="#00ADB5" />
                  <Text style={{ marginTop: 15, color: "#7A7A7A", fontSize: 15 }}>{t('fuel_analyzing_week')}</Text>
                </View>
              ) : (
                <Text style={{ fontSize: 15, color: "#2C2C2C", lineHeight: 24 }}>{weeklyReviewData}</Text>
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
    backgroundColor: "#F3EDE4",
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
  headerTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "400" as const,
    color: "#2C2C2C",
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  streakBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(212,160,83,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakCount: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#D4A053",
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  weekSelector: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 20,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  weekArrowBtn: {
    width: 28,
    height: 56,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  weekDayItem: {
    alignItems: "center" as const,
    gap: 5,
    flex: 1,
    paddingVertical: 6,
    borderRadius: 16,
  },
  weekDayItemSelected: {
    backgroundColor: "rgba(74,124,89,0.06)",
    borderRadius: 18,
    paddingVertical: 6,
  },
  weekDayLabel: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#A1A1A6",
    letterSpacing: 0.3,
  },
  weekDayLabelSelected: {
    color: "#1A1A1A",
    fontWeight: "700" as const,
  },
  weekDayLabelFuture: {
    color: "#C7C7CC",
  },
  weekDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.08)",
    borderStyle: "dashed" as const,
  },
  weekDayCircleSelected: {
    backgroundColor: "rgba(74,124,89,0.08)",
    borderColor: "#4A7C59",
    borderStyle: "solid" as const,
    borderWidth: 2,
  },
  weekDayCircleToday: {
    borderColor: "#EF4444",
    borderStyle: "solid" as const,
    borderWidth: 2.5,
    backgroundColor: "transparent",
  },
  weekDayCircleHit: {
    borderColor: "#10B981",
    borderStyle: "dashed" as const,
    backgroundColor: "transparent",
  },
  weekDayCircleMissed: {
    borderColor: "#EF4444",
    borderStyle: "dashed" as const,
    backgroundColor: "transparent",
  },
  weekDayCircleEmpty: {
    borderColor: "rgba(0,0,0,0.08)",
    borderStyle: "dashed" as const,
  },
  weekDayCircleFuture: {
    borderColor: "rgba(0,0,0,0.06)",
    borderStyle: "solid" as const,
    backgroundColor: "transparent",
  },
  weekDayNum: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#6E6E73",
  },
  weekDayNumSelected: {
    color: "#1A1A1A",
    fontWeight: "700" as const,
  },
  weekDayNumToday: {
    color: "#EF4444",
    fontWeight: "700" as const,
  },
  weekDayNumFuture: {
    color: "#C7C7CC",
  },
  viewingPastBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: "rgba(74,124,89,0.06)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 14,
  },
  viewingPastText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#4A7C59",
    flex: 1,
  },
  viewingPastBack: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#4A7C59",
    marginLeft: 8,
  },

  calorieCard: {
    backgroundColor: "#FEFCF9",
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
  },
  calorieCardInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calorieCardLeft: {
    flex: 1,
  },
  calorieMainNumber: {
    fontSize: 48,
    fontWeight: "900" as const,
    color: "#1A1A1A",
    letterSpacing: -2,
  },
  calorieLeftLabel: {
    fontSize: 15,
    color: "#A1A1A6",
    fontWeight: "500" as const,
    marginTop: 2,
  },
  exerciseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  exerciseBadgeText: {
    fontSize: 13,
    color: "#6E6E73",
    fontWeight: "600" as const,
  },
  calorieCardRight: {
    marginLeft: 16,
  },
  macroCardsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  healthScoreCard: {
    backgroundColor: "#FEFCF9",
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
  },
  healthScoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  healthScoreTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: "#1A1A1A",
  },
  healthScoreValue: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: "#1A1A1A",
  },
  healthScoreBarTrack: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  healthScoreBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  healthScoreDesc: {
    fontSize: 14,
    color: "#6E6E73",
    lineHeight: 20,
  },

  quickActions: {
    marginTop: 20,
  },
  quickActionsTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#1A1A1A",
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionChip: {
    flex: 1,
    backgroundColor: "#FEFCF9",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
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
    color: "#1A1A1A",
  },
  actionChipSub: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: "#A1A1A6",
    marginTop: 2,
  },
  exerciseChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#FEFCF9",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    gap: 12,
  },
  exerciseChipTextWrap: {
    flex: 1,
  },
  exerciseChipSub: {
    fontSize: 12,
    color: "#A1A1A6",
    marginTop: 2,
  },
  exercisePrimaryBtn: {
    backgroundColor: "#4A7C59",
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
    color: "#2C2C2C",
  },
  mealsSectionCount: {
    fontSize: 13,
    color: "#5A5A5E",
    fontWeight: "500" as const,
  },
  emptyMeals: {
    backgroundColor: "#FEFCF9",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
  },
  emptyMealsText: {
    fontSize: 15,
    color: "#7A7A7A",
    marginTop: 12,
    fontWeight: "600" as const,
  },
  emptyMealsHint: {
    fontSize: 13,
    color: "#A8A8A0",
    marginTop: 4,
  },
  mealCard: {
    backgroundColor: "#FEFCF9",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
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
    color: "#2C2C2C",
  },
  mealCardTime: {
    fontSize: 13,
    color: "#5A5A5E",
    marginTop: 3,
  },
  mealCardRight: {
    alignItems: "flex-end",
  },
  mealCardCal: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#4A7C59",
    letterSpacing: -0.5,
  },
  mealCardCalUnit: {
    fontSize: 11,
    color: "#5A5A5E",
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
    backgroundColor: "rgba(0,0,0,0.04)",
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
    color: "#8E8E93",
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
    backgroundColor: "rgba(0,0,0,0.04)",
    marginLeft: 8,
  },

  addFoodCard: {
    backgroundColor: "#FEFCF9",
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
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
    color: "#2C2C2C",
  },
  inputContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#8E8E93",
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#F0EBE3",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    color: "#2C2C2C",
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
    backgroundColor: "#F0EBE3",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    color: "#2C2C2C",
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
    backgroundColor: "#F0EBE3",
  },
  confirmBtn: {
    backgroundColor: "#4A7C59",
  },
  cancelBtnText: {
    color: "#7A7A7A",
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
    color: "#5A5A5E",
    marginBottom: 14,
    fontStyle: "italic" as const,
  },

  quizRequiredCard: {
    backgroundColor: "#FEFCF9",
    borderRadius: 24,
    padding: 32,
    marginTop: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
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
    color: "#2C2C2C",
    textAlign: "center",
    marginBottom: 10,
  },
  quizRequiredDescription: {
    fontSize: 15,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  startQuizButton: {
    backgroundColor: "#4A7C59",
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
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  foodDetailOverlay: {
    flex: 1,
    backgroundColor: "#F3EDE4",
  },
  sheetModal: {
    backgroundColor: "#FEFCF9",
    borderRadius: 24,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
  },
  sheetClose: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#2C2C2C",
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: "#7A7A7A",
    marginBottom: 20,
  },
  sheetTextInput: {
    backgroundColor: "#F0EBE3",
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    minHeight: 100,
    textAlignVertical: "top",
    color: "#2C2C2C",
  },
  sheetPrimaryBtn: {
    backgroundColor: "#4A7C59",
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
    backgroundColor: "#F0EBE3",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  refineEntryName: {
    fontSize: 15,
    color: "#2C2C2C",
    fontWeight: "600" as const,
  },
  refineEntryMacros: {
    fontSize: 13,
    color: "#5A5A5E",
    marginTop: 4,
  },

  firstTimeModal: {
    backgroundColor: "#FEFCF9",
    borderRadius: 24,
    padding: 28,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
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
    color: "#2C2C2C",
    textAlign: "center",
    marginBottom: 10,
  },
  firstTimeDesc: {
    fontSize: 15,
    color: "#8E8E93",
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
    color: "#8E8E93",
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
    backgroundColor: "#F0EBE3",
  },
  firstTimeSkipText: {
    color: "#8E8E93",
    fontSize: 15,
    fontWeight: "600" as const,
  },
  firstTimeStartBtn: {
    flex: 1.5,
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A7C59",
    flexDirection: "row",
    gap: 6,
  },
  firstTimeStartText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600" as const,
    flexShrink: 1,
  },

  quizModal: {
    backgroundColor: "#FEFCF9",
    borderRadius: 24,
    padding: 28,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
  },
  quizTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#2C2C2C",
    marginBottom: 4,
  },
  quizProgress: {
    fontSize: 13,
    color: "#5A5A5E",
    marginBottom: 24,
    fontWeight: "500" as const,
  },
  quizQuestion: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#2C2C2C",
    marginBottom: 20,
  },
  quizInput: {
    backgroundColor: "#F0EBE3",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    color: "#2C2C2C",
  },
  choicesContainer: {
    gap: 10,
  },
  choiceButton: {
    backgroundColor: "#F0EBE3",
    borderRadius: 12,
    padding: 15,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.06)",
  },
  choiceButtonActive: {
    backgroundColor: "rgba(74,124,89,0.1)",
    borderColor: "#4A7C59",
  },
  choiceText: {
    fontSize: 15,
    color: "#7A7A7A",
    textAlign: "center",
    fontWeight: "500" as const,
  },
  choiceTextActive: {
    color: "#4A7C59",
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
    backgroundColor: "#4A7C59",
  },
  quizButtonSecondary: {
    backgroundColor: "#F0EBE3",
  },
  quizButtonTextPrimary: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600" as const,
  },
  quizButtonTextSecondary: {
    color: "#8E8E93",
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
    backgroundColor: "#FEFCF9",
    borderRadius: 24,
    padding: 24,
    width: "92%",
    maxWidth: 420,
    maxHeight: "85%",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
  },
  foodSearchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  foodSearchInput: {
    flex: 1,
    backgroundColor: "#F0EBE3",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#2C2C2C",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  foodSearchBtn: {
    backgroundColor: "#4A7C59",
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
    color: "#5A5A5E",
  },
  foodSearchEmpty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  foodSearchEmptyText: {
    marginTop: 12,
    fontSize: 15,
    color: "#5A5A5E",
    fontWeight: "500" as const,
  },
  foodSearchEmptyHint: {
    marginTop: 4,
    fontSize: 12,
    color: "#A8A8A0",
  },
  foodSearchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0EBE3",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  foodSearchResultLeft: {
    flex: 1,
    marginRight: 12,
  },
  foodSearchResultName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#2C2C2C",
    lineHeight: 20,
  },
  foodSearchResultServing: {
    fontSize: 12,
    color: "#5A5A5E",
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
    color: "#4A7C59",
  },
  foodSearchResultCalLabel: {
    fontSize: 11,
    color: "#5A5A5E",
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
    color: "#5A5A5E",
    fontWeight: "500" as const,
  },
});

const analyzingStyles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  card: {
    backgroundColor: '#FEFCF9',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
  },
  cardContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
  },
  progressCircleWrap: {
    width: 56,
    height: 56,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  progressFillWrap: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
  },
  progressFillCircle: {
    width: 56,
    height: 56,
  },
  progressText: {
    position: 'absolute' as const,
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#2C2C2C',
  },
  textWrap: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#2C2C2C',
  },
  shimmerRow: {
    flexDirection: 'row' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  shimmerBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  foodNameText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#4A7C59',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
});

const fdStyles = StyleSheet.create({
  detailModal: {
    flex: 1,
    backgroundColor: "#F3EDE4",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 12,
  },
  detailBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailHeaderTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#2C2C2C",
  },
  detailDeleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailScroll: {
    paddingHorizontal: 20,
  },
  detailTimeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
    marginBottom: 10,
  },
  detailTimeText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#8E8E93",
  },
  detailFoodName: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: "#2C2C2C",
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  detailSectionLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#8E8E93",
    marginBottom: 10,
  },
  measurementRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  measurementChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  measurementChipActive: {
    backgroundColor: "#F0EBE3",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  measurementChipText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#5A5A5E",
  },
  measurementChipTextActive: {
    color: "#2C2C2C",
  },
  servingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  servingsLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#8E8E93",
  },
  servingsInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 80,
  },
  servingsInput: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#2C2C2C",
    textAlign: "center" as const,
    minWidth: 30,
    padding: 0,
  },
  calorieBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#E8E8E8",
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
  },
  calorieBoxLabel: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#5A5A5E",
  },
  calorieBoxValue: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: "#111827",
    letterSpacing: -1,
  },
  macroRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  macroBox: {
    flex: 1,
    backgroundColor: "#FEFCF9",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  macroBoxLabel: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#5A5A5E",
  },
  macroBoxValue: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: "#2C2C2C",
  },
  refineAIBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,173,181,0.08)",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(0,173,181,0.15)",
  },
  refineAIBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#00ADB5",
  },
  refineSection: {
    gap: 12,
  },
  refineSectionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#2C2C2C",
  },
  refineInput: {
    backgroundColor: "#F0EBE3",
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: "#2C2C2C",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    minHeight: 80,
    textAlignVertical: "top" as const,
  },
  refineSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A7C59",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  refineSubmitText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  doneBtn: {
    backgroundColor: "#4A7C59",
    marginHorizontal: 20,
    marginBottom: 36,
    marginTop: 8,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    minHeight: 56,
  },
  doneBtnText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  detailHeaderRight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  detailBookmarkBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  detailBookmarkBtnActive: {
    backgroundColor: "rgba(239,68,68,0.12)",
  },
});

const fabStyles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A7C59',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A7C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  menuContainer: {
    backgroundColor: '#FEFCF9',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuItem: {
    width: '47%' as any,
    backgroundColor: '#F0EBE3',
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  menuItemIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#2C2C2C',
    textAlign: 'center' as const,
  },
});
