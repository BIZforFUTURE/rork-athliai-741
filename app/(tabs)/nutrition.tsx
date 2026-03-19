import React, { useState, useEffect } from "react";
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
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar, Settings, Zap, Brain, ScanLine, X, Edit, Plus, Trash2, FileText, Drumstick, Wheat, Droplet, Search, ChevronRight, UtensilsCrossed } from "lucide-react-native";
import { useApp } from "@/providers/AppProvider";
import { useRouter } from "expo-router";

import { CameraView, useCameraPermissions } from "expo-camera";

interface USDAFoodNutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

interface USDAFoodResult {
  fdcId: number;
  description: string;
  foodNutrients: USDAFoodNutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
  brandName?: string;
  brandOwner?: string;
  dataType?: string;
}

const searchUSDAFoods = async (query: string): Promise<{name: string; calories: number; protein: number; carbs: number; fat: number; serving: string}[]> => {
  const USDA_API_KEY = 'DEMO_KEY';
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=15&dataType=Foundation,SR Legacy,Survey (FNDDS),Branded`;

  console.log('Searching USDA FoodData Central for:', query);
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('USDA API Error:', response.status, errorText);
    throw new Error(`USDA API Error: ${response.status}`);
  }

  const data = await response.json();
  const foods: USDAFoodResult[] = data.foods || [];

  if (foods.length === 0) {
    throw new Error('No results found');
  }

  const getNutrient = (nutrients: USDAFoodNutrient[], id: number): number => {
    const n = nutrients.find(n => n.nutrientId === id);
    return n ? Math.round(n.value) : 0;
  };

  const seen = new Set<string>();
  const results: {name: string; calories: number; protein: number; carbs: number; fat: number; serving: string}[] = [];

  for (const food of foods) {
    const name = food.brandName
      ? `${food.description} (${food.brandName})`
      : food.description;

    const normalizedName = name.toLowerCase().trim();
    if (seen.has(normalizedName)) continue;
    seen.add(normalizedName);

    const calories = getNutrient(food.foodNutrients, 1008);
    const protein = getNutrient(food.foodNutrients, 1003);
    const carbs = getNutrient(food.foodNutrients, 1005);
    const fat = getNutrient(food.foodNutrients, 1004);

    let serving = '100g';
    if (food.servingSize && food.servingSizeUnit) {
      serving = `${Math.round(food.servingSize)}${food.servingSizeUnit.toLowerCase()}`;
    }

    if (calories > 0) {
      results.push({ name, calories, protein, carbs, fat, serving });
    }

    if (results.length >= 10) break;
  }

  console.log(`Found ${results.length} food results from USDA`);
  return results;
};

const callOpenAI = async (prompt: string): Promise<string> => {
  const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
  
  try {
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
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', response.status, errorData);
      throw new Error(`OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    console.error('OpenAI API call failed:', error);
    throw error;
  }
};

export default function NutritionScreen() {
  const _router = useRouter();
  const { nutrition, updateNutrition, foodHistory, addFoodEntry, deleteFoodEntry, updateFoodEntry, todaysFoodEntries } = useApp();
  const [showFirstTimePrompt, setShowFirstTimePrompt] = useState(false);

  const [timeUntilReset, setTimeUntilReset] = useState<string>("");
  const insets = useSafeAreaInsets();
  const [showAddFood, setShowAddFood] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showAIInput, setShowAIInput] = useState(false);
  const [_showCalendar, setShowCalendar] = useState(false);
  const [_selectedDate, _setSelectedDate] = useState(new Date());
  const [_showProteinShake, setShowProteinShake] = useState(false);
  const [_proteinIngredients, setProteinIngredients] = useState("");
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [foodSearchResults, setFoodSearchResults] = useState<{name: string; calories: number; protein: number; carbs: number; fat: number; serving: string}[]>([]);
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



  const calculateHealthScore = (entry: any): { score: number; color: string; label: string } => {
    const { calories, protein, carbs, fat } = entry;
    const foodName = (entry.name || '').toLowerCase().trim();

    if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
      return { score: 5, color: '#6B7280', label: 'Unknown' };
    }

    const proteinCals = protein * 4;
    const fatCals = fat * 9;
    const carbsCals = carbs * 4;
    const totalMacroCals = proteinCals + fatCals + carbsCals;

    const proteinPercent = totalMacroCals > 0 ? (proteinCals / totalMacroCals) * 100 : 0;
    const fatPercent = totalMacroCals > 0 ? (fatCals / totalMacroCals) * 100 : 0;
    const carbsPercent = totalMacroCals > 0 ? (carbsCals / totalMacroCals) * 100 : 0;

    const proteinPerCal = calories > 0 ? (protein / calories) * 100 : 0;

    const nameMatchesAny = (keywords: string[]) =>
      keywords.some(kw => foodName.includes(kw));

    const superfoods = ['salmon', 'sardine', 'mackerel', 'tuna', 'quinoa', 'lentil', 'chickpea',
      'kale', 'spinach', 'broccoli', 'sweet potato', 'avocado', 'blueberr', 'almond',
      'walnut', 'flaxseed', 'chia', 'oat', 'greek yogurt', 'cottage cheese', 'edamame',
      'tofu', 'tempeh', 'turkey breast', 'chicken breast', 'egg white'];

    const wholeFoods = ['apple', 'banana', 'orange', 'grape', 'strawberr', 'raspberr',
      'mango', 'peach', 'pear', 'plum', 'watermelon', 'pineapple', 'cherry', 'kiwi',
      'carrot', 'celery', 'cucumber', 'tomato', 'pepper', 'onion', 'garlic', 'mushroom',
      'zucchini', 'cauliflower', 'asparagus', 'green bean', 'pea', 'corn', 'lettuce',
      'cabbage', 'beet', 'squash', 'brown rice', 'whole wheat', 'whole grain',
      'bean', 'legume', 'hummus', 'olive oil', 'honey', 'nuts', 'seed',
      'yogurt', 'milk', 'egg', 'fish', 'shrimp', 'chicken', 'turkey'];

    const moderateFoods = ['rice', 'pasta', 'bread', 'tortilla', 'wrap', 'cereal',
      'granola', 'cheese', 'beef', 'pork', 'steak', 'ham', 'sausage', 'bacon',
      'butter', 'cream', 'pancake', 'waffle', 'muffin', 'bagel', 'cracker',
      'peanut butter', 'protein bar', 'protein shake', 'smoothie', 'juice',
      'soup', 'sandwich', 'burrito', 'taco', 'sub', 'salad dressing'];

    const unhealthyFoods = ['fried', 'deep fried', 'french fries', 'fries', 'onion ring',
      'mozzarella stick', 'chicken nugget', 'chicken tender', 'fish stick',
      'corn dog', 'hot dog', 'pizza', 'burger', 'cheeseburger', 'fast food',
      'nachos', 'loaded', 'alfredo', 'cream sauce', 'battered'];

    const junkFoods = ['candy', 'chocolate bar', 'gummy', 'skittles', 'm&m',
      'cake', 'cookie', 'brownie', 'donut', 'doughnut', 'pastry', 'pie',
      'ice cream', 'sundae', 'milkshake', 'frappuccino', 'soda', 'pop',
      'cola', 'energy drink', 'red bull', 'monster', 'mountain dew',
      'chips', 'cheetos', 'doritos', 'pringles', 'popcorn butter',
      'funnel cake', 'churro', 'cinnamon roll', 'frosting', 'syrup',
      'cotton candy', 'caramel', 'fudge', 'cupcake'];

    let nameBonus = 0;
    if (nameMatchesAny(superfoods)) {
      nameBonus = 2.5;
    } else if (nameMatchesAny(wholeFoods)) {
      nameBonus = 1.5;
    } else if (nameMatchesAny(junkFoods)) {
      nameBonus = -3;
    } else if (nameMatchesAny(unhealthyFoods)) {
      nameBonus = -2;
    } else if (nameMatchesAny(moderateFoods)) {
      nameBonus = 0;
    }

    if (nameMatchesAny(['grilled', 'baked', 'steamed', 'roasted', 'raw', 'fresh', 'organic', 'whole'])) {
      nameBonus += 0.5;
    }
    if (nameMatchesAny(['fried', 'deep', 'battered', 'breaded', 'creamy', 'smothered', 'loaded'])) {
      nameBonus -= 0.5;
    }

    let macroScore = 5;

    if (proteinPercent >= 35) {
      macroScore += 2;
    } else if (proteinPercent >= 25) {
      macroScore += 1.5;
    } else if (proteinPercent >= 15) {
      macroScore += 0.5;
    } else if (proteinPercent < 5 && calories > 100) {
      macroScore -= 1;
    }

    if (proteinPerCal > 8) {
      macroScore += 1;
    } else if (proteinPerCal > 5) {
      macroScore += 0.5;
    }

    if (fatPercent >= 20 && fatPercent <= 40) {
      macroScore += 0.5;
    } else if (fatPercent > 65) {
      macroScore -= 1.5;
    } else if (fatPercent > 50) {
      macroScore -= 0.5;
    }

    if (carbsPercent > 85 && calories > 150) {
      macroScore -= 1;
    } else if (carbsPercent >= 35 && carbsPercent <= 55) {
      macroScore += 0.5;
    }

    let densityScore = 0;
    const calDensity = totalMacroCals > 0 ? calories / (protein + carbs + fat) : 0;

    if (calories < 80 && (protein > 0 || carbs > 0)) {
      densityScore = 1.5;
    } else if (calories < 200) {
      densityScore = 0.5;
    } else if (calories > 800) {
      densityScore = -1;
    } else if (calories > 500) {
      densityScore = -0.5;
    }

    if (calDensity > 7) {
      densityScore -= 0.5;
    }

    const rawScore = macroScore + nameBonus + densityScore;
    const finalScore = Math.max(1, Math.min(10, Math.round(rawScore * 10) / 10));

    let color: string;
    let label: string;

    if (finalScore >= 9) {
      color = '#10B981';
      label = 'Excellent';
    } else if (finalScore >= 7.5) {
      color = '#34D399';
      label = 'Great';
    } else if (finalScore >= 6) {
      color = '#6EE7B7';
      label = 'Good';
    } else if (finalScore >= 4.5) {
      color = '#F59E0B';
      label = 'Fair';
    } else if (finalScore >= 3) {
      color = '#F97316';
      label = 'Poor';
    } else {
      color = '#EF4444';
      label = 'Unhealthy';
    }

    return { score: finalScore, color, label };
  };

  const handleEditGoals = () => {
    const calorieGoal = parseInt(editGoals.calorieGoal) || nutrition.calorieGoal;
    const proteinGoal = parseInt(editGoals.proteinGoal) || nutrition.proteinGoal;
    const carbsGoal = parseInt(editGoals.carbsGoal) || nutrition.carbsGoal;
    const fatGoal = parseInt(editGoals.fatGoal) || nutrition.fatGoal;

    updateNutrition({
      calorieGoal,
      proteinGoal,
      carbsGoal,
      fatGoal,
    });

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
    
    if (!isMealPrep || targetDate.toDateString() === new Date().toDateString()) {
      updateNutrition({
        calories: nutrition.calories + newEntry.calories,
        protein: nutrition.protein + newEntry.protein,
        carbs: nutrition.carbs + newEntry.carbs,
        fat: nutrition.fat + newEntry.fat,
      });
    }

    setFoodName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setShowAddFood(false);
    setIsMealPrep(false);
    
    if (isMealPrep) {
      Alert.alert(
        "Meal Prepped!",
        `Added "${newEntry.name}" for ${targetDate.toLocaleDateString()}`
      );
    }
  };

  const calculateNutritionGoals = () => {
    const weightPounds = Math.round(parseFloat(quizAnswers.weight));
    const weightKg = Math.round(weightPounds * 0.453592 * 10) / 10;
    const heightFeet = Math.round(parseFloat(quizAnswers.heightFeet));
    const heightInches = Math.round(parseFloat(quizAnswers.heightInches));
    const heightCm = Math.round((heightFeet * 30.48) + (heightInches * 2.54));
    const age = Math.round(parseFloat(quizAnswers.age));
    const gender = quizAnswers.gender;
    const activity = quizAnswers.activityLevel;
    const goal = quizAnswers.goal;

    let bmr = 0;
    if (gender === "male") {
      bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
    } else {
      bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
    }

    const activityMultipliers: { [key: string]: number } = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9,
    };

    let tdee = Math.round(bmr * (activityMultipliers[activity] || 1.55));

    const dietDuration = quizAnswers.dietDuration;
    let deficitMultiplier = 0.8;
    let surplusMultiplier = 1.2;
    
    if (dietDuration === "short") {
      deficitMultiplier = 0.75;
      surplusMultiplier = 1.25;
    } else if (dietDuration === "medium") {
      deficitMultiplier = 0.8;
      surplusMultiplier = 1.2;
    } else if (dietDuration === "long") {
      deficitMultiplier = 0.85;
      surplusMultiplier = 1.15;
    }
    
    if (goal === "lose") {
      tdee = Math.round(tdee * deficitMultiplier);
    } else if (goal === "gain") {
      tdee = Math.round(tdee * surplusMultiplier);
    }

    const proteinGoal = Math.round(weightKg * 1.6);
    const fatGoal = Math.round((tdee * 0.25) / 9);
    const carbsGoal = Math.round((tdee - (proteinGoal * 4 + fatGoal * 9)) / 4);

    updateNutrition({
      calorieGoal: tdee,
      proteinGoal,
      carbsGoal,
      fatGoal,
      quizCompleted: true,
    });

    setShowQuiz(false);
    setQuizStep(0);
    setQuizAnswers({
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
  };

  const _analyzeQuickMeal = async (mealName: string, targetDate: Date) => {
    setIsAnalyzing(true);
    try {
      const prompt = `You are a nutrition expert. Analyze meal names and provide accurate nutritional estimates based on typical serving sizes and preparation methods. Consider common ingredients, cooking methods, and standard portion sizes for the described meal.

Analyze this meal: "${mealName}". Estimate nutritional content based on a typical serving size. Return ONLY a valid JSON object (no markdown, no code blocks) with format: {"name": "${mealName}", "calories": number, "protein": number, "carbs": number, "fat": number}. All numeric values must be numbers, not strings.`;

      console.log("Analyzing quick meal for meal prep...");
      const response = await callOpenAI(prompt);
      
      let cleanedResponse = response
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        .trim();
      
      const jsonMatch = cleanedResponse.match(/{[^{}]*(?:{[^{}]*}[^{}]*)*}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      const nutritionData = JSON.parse(cleanedResponse);
      
      const name = nutritionData.name || mealName;
      const calories = Number(nutritionData.calories) || 0;
      const protein = Number(nutritionData.protein) || 0;
      const carbs = Number(nutritionData.carbs) || 0;
      const fat = Number(nutritionData.fat) || 0;
      
      if (calories === 0) {
        throw new Error("Invalid nutrition data");
      }
      
      const newEntry = {
        id: Date.now().toString(),
        name: name,
        calories: Math.round(calories),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        date: targetDate.toISOString(),
      };

      addFoodEntry(newEntry);
      
      setShowQuickMealPrep(false);
      setQuickMealName("");
      
      Alert.alert(
        "Meal Prepped!", 
        `Added "${name}" for ${targetDate.toLocaleDateString()}\n\nCalories: ${Math.round(calories)}\nProtein: ${Math.round(protein)}g\nCarbs: ${Math.round(carbs)}g\nFat: ${Math.round(fat)}g`
      );
    } catch (error: any) {
      console.error("Quick meal analysis error:", error.message);
      Alert.alert(
        "Analysis Failed", 
        "Unable to analyze the meal. Please try again or use manual meal prep.",
        [
          { text: "Try Again", onPress: () => setShowQuickMealPrep(true) },
          { text: "Manual Entry", onPress: () => { 
            setShowQuickMealPrep(false); 
            setIsMealPrep(true);
            setMealPrepDate(targetDate);
            setShowAddFood(true); 
          } }
        ]
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const _analyzeProteinShake = async (ingredients: string) => {
    setIsAnalyzing(true);
    try {
      const prompt = `You are a nutrition expert specializing in protein shakes and supplements. Analyze the ingredients list and provide accurate nutritional estimates based on typical serving sizes for protein shakes. Consider protein powders, fruits, liquids, nuts, seeds, and other common shake ingredients.

Analyze this protein shake recipe: "${ingredients}". Estimate the total nutritional content assuming this is one complete shake serving. Return ONLY a valid JSON object (no markdown, no code blocks) with format: {"name": "Protein Shake with [main ingredients]", "calories": number, "protein": number, "carbs": number, "fat": number}. All numeric values must be numbers, not strings.`;

      console.log("Analyzing protein shake...");
      const response = await callOpenAI(prompt);
      
      let cleanedResponse = response
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        .trim();
      
      const jsonMatch = cleanedResponse.match(/{[^{}]*(?:{[^{}]*}[^{}]*)*}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      const nutritionData = JSON.parse(cleanedResponse);
      
      const name = nutritionData.name || "Protein Shake";
      const calories = Number(nutritionData.calories) || 0;
      const protein = Number(nutritionData.protein) || 0;
      const carbs = Number(nutritionData.carbs) || 0;
      const fat = Number(nutritionData.fat) || 0;
      
      if (calories === 0) {
        throw new Error("Invalid nutrition data");
      }
      
      setFoodName(name);
      setCalories(Math.round(calories).toString());
      setProtein(Math.round(protein).toString());
      setCarbs(Math.round(carbs).toString());
      setFat(Math.round(fat).toString());
      
      setShowProteinShake(false);
      setShowAddFood(true);
      
      Alert.alert(
        "Protein Shake Analyzed!", 
        `${name}\nCalories: ${Math.round(calories)}\nProtein: ${Math.round(protein)}g\nCarbs: ${Math.round(carbs)}g\nFat: ${Math.round(fat)}g\n\nYou can adjust the values if needed.`
      );
    } catch (error: any) {
      console.error("Protein shake analysis error:", error.message);
      Alert.alert(
        "Analysis Failed", 
        "Unable to analyze the protein shake. Please try again or enter manually.",
        [
          { text: "Try Again", onPress: () => setShowProteinShake(true) },
          { text: "Enter Manually", onPress: () => { setShowProteinShake(false); setShowAddFood(true); } }
        ]
      );
    } finally {
      setIsAnalyzing(false);
      setProteinIngredients("");
    }
  };

  const refineWithAI = async (entry: any, refinementText: string) => {
    setIsAnalyzing(true);
    try {
      const prompt = `You are a nutrition expert. The user has logged a food item and wants to refine its nutritional information with additional details. Use the original food entry and the user's additional information to provide a more accurate nutritional estimate. Consider portion sizes, preparation methods, ingredients, and any other details provided.

Original food entry: "${entry.name}" with ${entry.calories} calories, ${entry.protein}g protein, ${entry.carbs}g carbs, ${entry.fat}g fat.

Additional details: "${refinementText}"

Please provide a refined nutritional estimate based on this additional information. Return ONLY a valid JSON object (no markdown, no code blocks) with format: {"name": "refined food description", "calories": number, "protein": number, "carbs": number, "fat": number}. All numeric values must be numbers, not strings.`;

      console.log("Refining food entry with AI...");
      const response = await callOpenAI(prompt);
      
      let cleanedResponse = response
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        .trim();
      
      const jsonMatch = cleanedResponse.match(/{[^{}]*(?:{[^{}]*}[^{}]*)*}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      const nutritionData = JSON.parse(cleanedResponse);
      
      const name = nutritionData.name || entry.name;
      const calories = Number(nutritionData.calories) || entry.calories;
      const protein = Number(nutritionData.protein) || entry.protein;
      const carbs = Number(nutritionData.carbs) || entry.carbs;
      const fat = Number(nutritionData.fat) || entry.fat;
      
      if (calories === 0) {
        throw new Error("Invalid nutrition data");
      }
      
      updateFoodEntry(entry.id, {
        name: name,
        calories: Math.round(calories),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
      });
      
      setShowRefineFood(false);
      setSelectedFoodEntry(null);
      setRefinementInput("");
      
      Alert.alert(
        "Food Refined!", 
        `Updated "${name}"\n\nCalories: ${Math.round(calories)}\nProtein: ${Math.round(protein)}g\nCarbs: ${Math.round(carbs)}g\nFat: ${Math.round(fat)}g`
      );
    } catch (error: any) {
      console.error("Food refinement error:", error.message);
      Alert.alert(
        "Refinement Failed", 
        "Unable to refine the food entry. Please try again.",
        [
          { text: "Try Again", onPress: () => setShowRefineFood(true) },
          { text: "Cancel", onPress: () => { 
            setShowRefineFood(false); 
            setSelectedFoodEntry(null);
            setRefinementInput("");
          } }
        ]
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeWithAI = async (input: string, isImage: boolean = false) => {
    setIsAnalyzing(true);
    try {
      let prompt;
      
      if (isImage) {
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer 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`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: 'You are a professional nutritionist. Analyze this food image and provide accurate nutritional estimates based on what you can see. Identify the food items, estimate portion sizes, and calculate approximate nutritional values. Return ONLY a valid JSON object (no markdown, no code blocks) with format: {"name": "food description", "calories": number, "protein": number, "carbs": number, "fat": number}. All numeric values must be numbers, not strings.'
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:image/jpeg;base64,${input}`
                      }
                    }
                  ]
                }
              ],
              max_tokens: 500,
              temperature: 0.1,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.text();
            console.error('OpenAI Vision API Error:', response.status, errorData);
            throw new Error('Image analysis failed');
          }
          
          const data = await response.json();
          const analysisResult = data.choices[0].message.content;
          console.log('Image analysis result:', analysisResult);
          
          prompt = analysisResult;
        } catch (imageError) {
          console.error('Image analysis failed:', imageError);
          Alert.alert(
            "Image Analysis Failed", 
            "Unable to analyze the image. Please try describing your food instead.",
            [
              { text: "OK", onPress: () => {
                setShowCamera(false);
                setShowAIInput(true);
              }}
            ]
          );
          return;
        }
      } else {
        prompt = `You are a professional nutritionist. Provide accurate nutritional estimates based on standard serving sizes and preparation methods. Return ONLY valid JSON without any markdown formatting or code blocks.

Analyze this food: "${input}". Estimate nutritional content based on typical serving sizes. Return ONLY a valid JSON object (no markdown, no code blocks) with format: {"name": "food description", "calories": number, "protein": number, "carbs": number, "fat": number}. All numeric values must be numbers, not strings.`;
      }

      let response;
      if (isImage) {
        response = prompt;
        console.log("Using image analysis result:", response);
      } else {
        console.log("Sending request to AI...");
        response = await callOpenAI(prompt);
        console.log("AI Response received:", response);
      }
      
      let cleanedResponse = response
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        .trim();
      
      const jsonMatch = cleanedResponse.match(/{[^{}]*(?:{[^{}]*}[^{}]*)*}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      console.log("Cleaned response:", cleanedResponse);
      
      try {
        const nutritionData = JSON.parse(cleanedResponse);
        console.log("Parsed nutrition data:", nutritionData);
        
        const name = nutritionData.name || "Unknown food";
        const calories = Number(nutritionData.calories) || 0;
        const protein = Number(nutritionData.protein) || 0;
        const carbs = Number(nutritionData.carbs) || 0;
        const fat = Number(nutritionData.fat) || 0;
        
        if (!name || calories === 0) {
          throw new Error("Invalid nutrition data: missing name or calories");
        }
        
        setFoodName(name);
        setCalories(Math.round(calories).toString());
        setProtein(Math.round(protein).toString());
        setCarbs(Math.round(carbs).toString());
        setFat(Math.round(fat).toString());
        
        setShowAIInput(false);
        setShowCamera(false);
        setCapturedImage(null);
        setShowAddFood(true);
        
        Alert.alert(
          "Food Analyzed", 
          `Detected: ${name}\nCalories: ${Math.round(calories)}\nProtein: ${Math.round(protein)}g\nCarbs: ${Math.round(carbs)}g\nFat: ${Math.round(fat)}g\n\nYou can adjust the values if needed.`
        );
      } catch (parseError: any) {
        console.error("Failed to parse AI response:", parseError.message);
        console.error("Response that failed to parse:", cleanedResponse);
        
        try {
          const nameMatch = cleanedResponse.match(/"name"\s*:\s*"([^"]+)"/);
          const caloriesMatch = cleanedResponse.match(/"calories"\s*:\s*(\d+)/);
          
          if (nameMatch && caloriesMatch) {
            const name = nameMatch[1];
            const calories = parseInt(caloriesMatch[1]);
            const proteinMatch = cleanedResponse.match(/"protein"\s*:\s*(\d+)/);
            const carbsMatch = cleanedResponse.match(/"carbs"\s*:\s*(\d+)/);
            const fatMatch = cleanedResponse.match(/"fat"\s*:\s*(\d+)/);
            
            setFoodName(name);
            setCalories(calories.toString());
            setProtein(proteinMatch ? proteinMatch[1] : "0");
            setCarbs(carbsMatch ? carbsMatch[1] : "0");
            setFat(fatMatch ? fatMatch[1] : "0");
            
            setShowAIInput(false);
            setShowCamera(false);
            setCapturedImage(null);
            setShowAddFood(true);
            
            Alert.alert(
              "Food Analyzed", 
              `Detected: ${name}\nCalories: ${calories}\n\nYou can adjust the values if needed.`
            );
            return;
          }
        } catch (fallbackError) {
          console.error("Fallback parsing also failed:", fallbackError);
        }
        
        Alert.alert(
          "Analysis Error", 
          "Could not understand the nutritional data. Please try again or enter manually.",
          [
            { text: "Try Again", onPress: () => isImage ? setShowCamera(true) : setShowAIInput(true) },
            { text: "Enter Manually", onPress: () => { setShowCamera(false); setShowAIInput(false); setShowAddFood(true); } }
          ]
        );
      }
    } catch (error: any) {
      console.error("AI analysis error:", error.message);
      Alert.alert(
        "Analysis Failed", 
        "Unable to analyze the food. Please try again or enter manually.",
        [
          { text: "Try Again", onPress: () => isImage ? setShowCamera(true) : setShowAIInput(true) },
          { text: "Enter Manually", onPress: () => { setShowCamera(false); setShowAIInput(false); setShowAddFood(true); } }
        ]
      );
    } finally {
      setIsAnalyzing(false);
      setAiInput("");
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        setIsAnalyzing(true);
        console.log("Taking picture...");
        
        const photo = await cameraRef.current.takePictureAsync({ 
          base64: true,
          quality: 0.5,
          skipProcessing: Platform.OS === 'ios',
          exif: false,
        });
        
        console.log("Photo captured, base64 length:", photo.base64?.length);
        
        if (!photo.base64) {
          throw new Error("Failed to capture image data");
        }
        
        setCapturedImage(photo.base64);
        await analyzeWithAI(photo.base64, true);
      } catch (error: any) {
        console.error("Failed to take picture:", error.message);
        Alert.alert("Camera Error", "Failed to capture image. Please try again.");
        setIsAnalyzing(false);
      }
    } else {
      console.error("Camera ref is not available");
      Alert.alert("Camera Error", "Camera is not ready. Please try again.");
      setIsAnalyzing(false);
    }
  };

  const CircularProgress = ({ value, goal, color, label }: any) => {
    const percentage = Math.min((value / goal) * 100, 100);
    const exceeds = value > goal;
    const [animatedPercentage] = useState(new Animated.Value(0));
    const [pulseAnim] = useState(new Animated.Value(1));

    useEffect(() => {
      Animated.spring(animatedPercentage, {
        toValue: percentage,
        useNativeDriver: false,
        tension: 40,
        friction: 8,
      }).start();

      if (percentage >= 95 && percentage <= 100) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.05,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ).start();
      } else {
        pulseAnim.setValue(1);
      }
    }, [percentage, animatedPercentage, pulseAnim]);

    const size = 110;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const AnimatedCircle = Animated.createAnimatedComponent(Circle);

    const strokeDashoffset = animatedPercentage.interpolate({
      inputRange: [0, 100],
      outputRange: [circumference, 0],
    });

    return (
      <View style={styles.progressContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={`${color}15`}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={exceeds ? "#EF4444" : color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </Svg>
          <View style={styles.progressRingCenter}>
            <Text style={[styles.progressPercentage, { color: exceeds ? "#EF4444" : color }]}>
              {Math.round(percentage)}%
            </Text>
          </View>
        </Animated.View>
        <Text style={styles.progressValue}>
          {value}{label === "Calories" ? "" : "g"} / {goal}{label === "Calories" ? "" : "g"}
        </Text>
      </View>
    );
  };

  const QuizModal = () => {
    const [localQuizAnswers, setLocalQuizAnswers] = useState(quizAnswers);
    
    React.useEffect(() => {
      setLocalQuizAnswers(quizAnswers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showQuiz]);
    
    const questions = [
      {
        title: "What's your age?",
        key: "age",
        type: "number",
        placeholder: "Enter your age",
      },
      {
        title: "What's your weight?",
        key: "weight",
        type: "number",
        placeholder: "Enter weight in pounds",
      },
      {
        title: "What's your height?",
        key: "height",
        type: "height",
        placeholder: "Enter height",
      },
      {
        title: "What's your gender?",
        key: "gender",
        type: "choice",
        choices: [
          { label: "Male", value: "male" },
          { label: "Female", value: "female" },
        ],
      },
      {
        title: "How active are you?",
        key: "activityLevel",
        type: "choice",
        choices: [
          { label: "Sedentary", value: "sedentary" },
          { label: "Lightly Active", value: "light" },
          { label: "Moderately Active", value: "moderate" },
          { label: "Very Active", value: "active" },
          { label: "Extremely Active", value: "veryActive" },
        ],
      },
      {
        title: "What's your goal?",
        key: "goal",
        type: "choice",
        choices: [
          { label: "Lose Weight", value: "lose" },
          { label: "Maintain Weight", value: "maintain" },
          { label: "Gain Weight", value: "gain" },
        ],
      },
      {
        title: "How much weight do you want to lose/gain?",
        key: "weightGoal",
        type: "number",
        placeholder: "Enter weight in pounds (optional)",
        skipCondition: (answers: any) => answers.goal === "maintain",
      },
      {
        title: "How long do you plan to be on this diet?",
        key: "dietDuration",
        type: "choice",
        choices: [
          { label: "1-3 months (Faster results)", value: "short" },
          { label: "3-6 months (Balanced approach)", value: "medium" },
          { label: "6+ months (Sustainable long-term)", value: "long" },
        ],
        skipCondition: (answers: any) => answers.goal === "maintain",
      },
    ];

    const filteredQuestions = questions.filter(q => 
      !q.skipCondition || !q.skipCondition(localQuizAnswers)
    );
    const currentQuestion = filteredQuestions[quizStep];

    return (
      <Modal visible={showQuiz} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.quizModal}>
            <Text style={styles.quizTitle}>Nutrition Goals Setup</Text>
            <Text style={styles.quizProgress}>Step {quizStep + 1} of {filteredQuestions.length}</Text>
            
            <Text style={styles.quizQuestion}>{currentQuestion?.title}</Text>
            
            {currentQuestion.type === "height" ? (
              <View style={styles.heightInputContainer}>
                <TextInput
                  style={[styles.quizInput, styles.heightInput]}
                  placeholder="Feet"
                  keyboardType="numeric"
                  value={localQuizAnswers.heightFeet}
                  onChangeText={(text) =>
                    setLocalQuizAnswers({ ...localQuizAnswers, heightFeet: text })
                  }
                />
                <TextInput
                  style={[styles.quizInput, styles.heightInput]}
                  placeholder="Inches"
                  keyboardType="numeric"
                  value={localQuizAnswers.heightInches}
                  onChangeText={(text) =>
                    setLocalQuizAnswers({ ...localQuizAnswers, heightInches: text })
                  }
                />
              </View>
            ) : currentQuestion.type === "number" ? (
              <TextInput
                style={styles.quizInput}
                placeholder={currentQuestion.placeholder}
                keyboardType="numeric"
                value={localQuizAnswers[currentQuestion.key as keyof typeof localQuizAnswers]}
                onChangeText={(text) =>
                  setLocalQuizAnswers({ ...localQuizAnswers, [currentQuestion.key]: text })
                }
              />
            ) : (
              <View style={styles.choicesContainer}>
                {currentQuestion.choices?.map((choice) => (
                  <TouchableOpacity
                    key={choice.value}
                    style={[
                      styles.choiceButton,
                      localQuizAnswers[currentQuestion.key as keyof typeof localQuizAnswers] === choice.value &&
                        styles.choiceButtonActive,
                    ]}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setLocalQuizAnswers({ ...localQuizAnswers, [currentQuestion.key]: choice.value });
                    }}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        localQuizAnswers[currentQuestion.key as keyof typeof localQuizAnswers] === choice.value &&
                          styles.choiceTextActive,
                      ]}
                    >
                      {choice.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            <View style={styles.quizButtons}>
              {quizStep > 0 && (
                <TouchableOpacity
                  style={[styles.quizButton, styles.quizButtonSecondary]}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setQuizStep(quizStep - 1);
                  }}
                >
                  <Text style={styles.quizButtonTextSecondary}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.quizButton, styles.quizButtonPrimary]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  if (quizStep < filteredQuestions.length - 1) {
                    setQuizAnswers(localQuizAnswers);
                    setQuizStep(quizStep + 1);
                  } else {
                    setQuizAnswers(localQuizAnswers);
                    calculateNutritionGoals();
                  }
                }}
                disabled={
                  currentQuestion.type === "height" 
                    ? !localQuizAnswers.heightFeet || !localQuizAnswers.heightInches
                    : currentQuestion.key === "weightGoal"
                    ? false
                    : !localQuizAnswers[currentQuestion.key as keyof typeof localQuizAnswers]
                }
              >
                <Text style={styles.quizButtonTextPrimary}>
                  {quizStep < filteredQuestions.length - 1 ? "Next" : "Calculate Goals"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  if (!permission) {
    return <View />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >


        <View style={styles.heroBanner}>
          <Text style={styles.heroBannerTitle}>Track Your Nutrition</Text>
          <Text style={styles.heroBannerSubtitle}>Ready to fuel your body?</Text>
        </View>

        <LinearGradient
          colors={["#00ADB5", "#00C6FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.weeklyReviewButtonTop}
        >
          <TouchableOpacity 
            style={styles.weeklyReviewButtonInner}
            onPress={async () => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setIsGeneratingReview(true);
                setShowWeeklyReview(true);
                try {
                  const oneWeekAgo = new Date();
                  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                  const weeklyFoods = foodHistory.filter(entry => 
                    new Date(entry.date) >= oneWeekAgo
                  );
                  
                  if (weeklyFoods.length === 0) {
                    setWeeklyReviewData("You haven't logged any meals this week yet. Start tracking your nutrition to get personalized insights!");
                    setIsGeneratingReview(false);
                    return;
                  }
                  
                  const totalCalories = weeklyFoods.reduce((sum, entry) => sum + entry.calories, 0);
                  const totalProtein = weeklyFoods.reduce((sum, entry) => sum + entry.protein, 0);
                  const totalCarbs = weeklyFoods.reduce((sum, entry) => sum + entry.carbs, 0);
                  const totalFat = weeklyFoods.reduce((sum, entry) => sum + entry.fat, 0);
                  const avgCaloriesPerDay = Math.round(totalCalories / 7);
                  
                  const foodList = weeklyFoods.map(f => `${f.name} (${f.calories} cal, ${f.protein}g P, ${f.carbs}g C, ${f.fat}g F)`).join(', ');
                  
                  const prompt = `You are a professional nutritionist analyzing a week of food intake. Here's the data:

Total meals logged: ${weeklyFoods.length}
Total calories: ${totalCalories}
Average calories per day: ${avgCaloriesPerDay}
Total protein: ${totalProtein}g
Total carbs: ${totalCarbs}g
Total fat: ${totalFat}g

User's goals:
Daily calorie goal: ${nutrition.calorieGoal}
Daily protein goal: ${nutrition.proteinGoal}g
Daily carbs goal: ${nutrition.carbsGoal}g
Daily fat goal: ${nutrition.fatGoal}g

Foods eaten this week: ${foodList}

Provide a comprehensive weekly nutrition review with:
1. Overall assessment of their eating habits
2. How well they're meeting their goals
3. Nutritional balance analysis (protein, carbs, fats)
4. Specific recommendations for improvement
5. Positive reinforcement for good choices
6. Suggestions for foods to add or reduce

Be encouraging, specific, and actionable. Keep it under 400 words.`;
                  
                  const response = await callOpenAI(prompt);
                  setWeeklyReviewData(response);
                } catch (error) {
                  console.error('Error generating weekly review:', error);
                  setWeeklyReviewData("Unable to generate your weekly review. Please try again later.");
                } finally {
                  setIsGeneratingReview(false);
                }
              }}
          >
            <FileText size={20} color="#FFFFFF" />
            <Text style={styles.weeklyReviewButtonTopText}>My Weekly Nutrition Review</Text>
          </TouchableOpacity>
        </LinearGradient>

        <LinearGradient
          colors={["#171B22", "#0D0F13"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.progressCard}
        >
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>Today's Progress</Text>
              <Text style={styles.resetTimer}>Resets in {timeUntilReset}</Text>
            </View>
            <View style={styles.progressIcons}>
              <TouchableOpacity onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setEditGoals({
                  calorieGoal: nutrition.calorieGoal.toString(),
                  proteinGoal: nutrition.proteinGoal.toString(),
                  carbsGoal: nutrition.carbsGoal.toString(),
                  fatGoal: nutrition.fatGoal.toString(),
                });
                setShowEditGoals(true);
              }}>
                <Edit size={20} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowCalendar(true);
              }}>
                <Calendar size={20} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowQuiz(true);
              }}>
                <Settings size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.progressSubtitle}>
            {nutrition.calories} / {nutrition.calorieGoal} calories
          </Text>

          <View style={styles.macrosGrid}>
            <LinearGradient
              colors={["#0D0F13", "#171B22"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.macroItem}
            >
              <Zap size={20} color="#00E5FF" />
              <Text style={styles.macroLabel}>Calories</Text>
              <CircularProgress
                value={nutrition.calories}
                goal={nutrition.calorieGoal}
                color="#00E5FF"
                label="Calories"
              />
            </LinearGradient>
            <LinearGradient
              colors={["#0D0F13", "#171B22"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.macroItem}
            >
              <Drumstick size={20} color="#FF4FB6" />
              <Text style={styles.macroLabel}>Protein</Text>
              <CircularProgress
                value={nutrition.protein}
                goal={nutrition.proteinGoal}
                color="#FF4FB6"
                label="Protein"
              />
            </LinearGradient>
            <LinearGradient
              colors={["#0D0F13", "#171B22"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.macroItem}
            >
              <Droplet size={20} color="#FFB400" />
              <Text style={styles.macroLabel}>Fat</Text>
              <CircularProgress
                value={nutrition.fat}
                goal={nutrition.fatGoal}
                color="#FFB400"
                label="Fat"
              />
            </LinearGradient>
            <LinearGradient
              colors={["#0D0F13", "#171B22"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.macroItem}
            >
              <Wheat size={20} color="#00FFC6" />
              <Text style={styles.macroLabel}>Carbs</Text>
              <CircularProgress
                value={nutrition.carbs}
                goal={nutrition.carbsGoal}
                color="#00FFC6"
                label="Carbs"
              />
            </LinearGradient>
          </View>
        </LinearGradient>

        {showAddFood ? (
          <View style={styles.addFoodCard}>
            <View style={styles.addFoodHeader}>
              <Text style={styles.addFoodTitle}>
                {isMealPrep ? "Meal Prep Food" : "Add Food"}
              </Text>
              {isMealPrep && (
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    if (mealPrepDate.toDateString() === new Date().toDateString()) {
                      setMealPrepDate(tomorrow);
                    } else {
                      const nextDay = new Date(mealPrepDate);
                      nextDay.setDate(nextDay.getDate() + 1);
                      setMealPrepDate(nextDay);
                    }
                  }}
                >
                  <Calendar size={16} color="#3B82F6" />
                  <Text style={styles.datePickerText}>
                    {mealPrepDate.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: mealPrepDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                    })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {isMealPrep && (
              <Text style={styles.mealPrepSubtitle}>
                Planning meals for {mealPrepDate.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            )}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Food name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter food name"
                placeholderTextColor="#9CA3AF"
                value={foodName}
                onChangeText={setFoodName}
              />
            </View>
            <View style={styles.nutritionInputRow}>
              <View style={styles.nutritionInputItem}>
                <Text style={styles.inputLabel}>Calories</Text>
                <TextInput
                  style={styles.nutritionInput}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.nutritionInputItem}>
                <Text style={styles.inputLabel}>Protein (g)</Text>
                <TextInput
                  style={styles.nutritionInput}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.nutritionInputRow}>
              <View style={styles.nutritionInputItem}>
                <Text style={styles.inputLabel}>Carbs (g)</Text>
                <TextInput
                  style={styles.nutritionInput}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.nutritionInputItem}>
                <Text style={styles.inputLabel}>Fat (g)</Text>
                <TextInput
                  style={styles.nutritionInput}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.addFoodButtons}>
              <TouchableOpacity
                style={[styles.addButton, styles.cancelButton]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowAddFood(false);
                  setIsMealPrep(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                handleAddFood();
              }}>
                <Text style={styles.addButtonText}>
                  {isMealPrep ? "Prep Meal" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {!nutrition.quizCompleted ? (
              <View style={styles.quizRequiredCard}>
                <View style={styles.quizRequiredHeader}>
                  <Brain size={48} color="#8B5CF6" />
                  <Text style={styles.quizRequiredTitle}>Complete Your Nutrition Setup</Text>
                </View>
                <Text style={styles.quizRequiredDescription}>
                  Before you can start logging food, we need to set up your personalized nutrition goals. This quick quiz will help us calculate your daily calorie and macro targets based on your body stats and fitness goals.
                </Text>
                <View style={styles.quizRequiredFeatures}>
                  <View style={styles.quizFeatureItem}>
                    <Text style={styles.quizFeatureBullet}>•</Text>
                    <Text style={styles.quizFeatureText}>Personalized calorie goals</Text>
                  </View>
                  <View style={styles.quizFeatureItem}>
                    <Text style={styles.quizFeatureBullet}>•</Text>
                    <Text style={styles.quizFeatureText}>Macro targets (protein, carbs, fat)</Text>
                  </View>
                  <View style={styles.quizFeatureItem}>
                    <Text style={styles.quizFeatureBullet}>•</Text>
                    <Text style={styles.quizFeatureText}>Based on your activity level & goals</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.startQuizButton}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setShowQuiz(true);
                  }}
                >
                  <Brain size={20} color="#FFFFFF" />
                  <Text style={styles.startQuizButtonText}>Start Nutrition Setup</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.scanButton}
                  onPress={async () => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    if (!permission.granted) {
                      const result = await requestPermission();
                      if (result.granted) {
                        setShowCamera(true);
                      }
                    } else {
                      setShowCamera(true);
                    }
                  }}
                >
                  <ScanLine size={24} color="#FFFFFF" />
                  <Text style={styles.scanButtonText}>Scan Food</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.aiButton}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setShowAIInput(true);
                  }}
                >
                  <Brain size={24} color="#FFFFFF" />
                  <Text style={styles.aiButtonText}>Describe Food to AI</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.foodSearchButton}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setShowFoodSearch(true);
                  }}
                >
                  <Search size={24} color="#FFFFFF" />
                  <Text style={styles.foodSearchButtonText}>Search Foods</Text>
                </TouchableOpacity>



                <TouchableOpacity
                  style={styles.manualButton}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setShowAddFood(true);
                  }}
                >
                  <Plus size={20} color="#FFFFFF" />
                  <Text style={styles.manualButtonText}>Add Food</Text>
                </TouchableOpacity>
                

              </>
            )}
          </>
        )}

        {nutrition.quizCompleted && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Today's Meals</Text>
            {todaysFoodEntries.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No meals logged today</Text>
              </View>
            ) : (
              todaysFoodEntries.map((entry) => (
                <TouchableOpacity 
                  key={entry.id} 
                  style={styles.mealCard}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setSelectedFoodEntry(entry);
                    setShowRefineFood(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.mealHeader}>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName}>{entry.name}</Text>
                      <Text style={styles.mealTime}>
                        {new Date(entry.date).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                      <Text style={styles.tapToRefineText}>Tap to refine with AI</Text>
                    </View>
                    <View style={styles.mealActions}>
                      <Text style={styles.mealCalories}>{entry.calories} cal</Text>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (Platform.OS !== 'web') {
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          Alert.alert(
                            "Delete Food Entry",
                            `Are you sure you want to delete "${entry.name}"?`,
                            [
                              { text: "Cancel", style: "cancel" },
                              { 
                                text: "Delete", 
                                style: "destructive",
                                onPress: () => deleteFoodEntry(entry.id)
                              }
                            ]
                          );
                        }}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.mealMacros}>
                    <View style={styles.macroTag}>
                      <Text style={styles.macroTagText}>P: {entry.protein}g</Text>
                    </View>
                    <View style={styles.macroTag}>
                      <Text style={styles.macroTagText}>C: {entry.carbs}g</Text>
                    </View>
                    <View style={styles.macroTag}>
                      <Text style={styles.macroTagText}>F: {entry.fat}g</Text>
                    </View>
                    {(() => {
                      const healthScore = calculateHealthScore(entry);
                      return (
                        <View style={[styles.healthScoreTag, { backgroundColor: `${healthScore.color}15` }]}>
                          <View style={[styles.healthScoreDot, { backgroundColor: healthScore.color }]} />
                          <Text style={[styles.healthScoreText, { color: healthScore.color }]}>
                            {healthScore.score}/10 • {healthScore.label}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <QuizModal />

      <Modal visible={showFirstTimePrompt} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.firstTimePromptModal}>
            <View style={styles.firstTimePromptHeader}>
              <Brain size={48} color="#10B981" />
              <Text style={styles.firstTimePromptTitle}>Welcome to Nutrition Tracking!</Text>
            </View>
            <Text style={styles.firstTimePromptDescription}>
              To get started with personalized nutrition tracking, let's set up your goals based on your body stats and fitness objectives.
            </Text>
            <View style={styles.firstTimePromptFeatures}>
              <View style={styles.firstTimeFeatureItem}>
                <Text style={styles.firstTimeFeatureBullet}>•</Text>
                <Text style={styles.firstTimeFeatureText}>Personalized daily calorie targets</Text>
              </View>
              <View style={styles.firstTimeFeatureItem}>
                <Text style={styles.firstTimeFeatureBullet}>•</Text>
                <Text style={styles.firstTimeFeatureText}>Optimized macro breakdown (protein, carbs, fat)</Text>
              </View>
              <View style={styles.firstTimeFeatureItem}>
                <Text style={styles.firstTimeFeatureBullet}>•</Text>
                <Text style={styles.firstTimeFeatureText}>Track progress toward your fitness goals</Text>
              </View>
            </View>
            <View style={styles.firstTimePromptButtons}>
              <TouchableOpacity
                style={[styles.firstTimePromptButton, styles.firstTimeSkipButton]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowFirstTimePrompt(false);
                }}
              >
                <Text style={styles.firstTimeSkipButtonText}>Maybe Later</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.firstTimePromptButton, styles.firstTimeStartButton]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setShowFirstTimePrompt(false);
                  setShowQuiz(true);
                }}
              >
                <Brain size={20} color="#FFFFFF" />
                <Text style={styles.firstTimeStartButtonText}>Take Quiz</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAIInput} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.aiModal}>
            <TouchableOpacity 
              style={styles.modalClose}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowAIInput(false);
                setAiInput("");
              }}
            >
              <X size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.aiModalTitle}>Describe Your Food</Text>
            <Text style={styles.aiModalSubtitle}>
              Tell me what you ate and I'll estimate the nutrition
            </Text>
            <TextInput
              style={styles.aiTextInput}
              placeholder="e.g., 'grilled chicken breast with rice and broccoli'"
              placeholderTextColor="#9CA3AF"
              value={aiInput}
              onChangeText={setAiInput}
              multiline
              autoFocus
            />
            <TouchableOpacity
              style={[
                styles.aiAnalyzeButton,
                (!aiInput || isAnalyzing) && styles.disabledButton,
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                void analyzeWithAI(aiInput);
              }}
              disabled={!aiInput || isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.aiAnalyzeButtonText}>Analyze Food</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          {!permission?.granted ? (
            <View style={styles.permissionContainer}>
              <Text style={styles.permissionText}>We need camera permission</Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestPermission}
              >
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
              >
                <View style={styles.cameraOverlay}>
                  <TouchableOpacity
                    style={styles.cameraClose}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setShowCamera(false);
                      setCapturedImage(null);
                    }}
                  >
                    <X size={32} color="#FFFFFF" />
                  </TouchableOpacity>
                  
                  <View style={styles.cameraGuide}>
                    <View style={[styles.cameraGuideCorner, { top: 0, left: 0 }]} />
                    <View style={[styles.cameraGuideCorner, styles.cameraGuideCornerTR]} />
                    <View style={[styles.cameraGuideCorner, styles.cameraGuideCornerBL]} />
                    <View style={[styles.cameraGuideCorner, styles.cameraGuideCornerBR]} />
                  </View>
                  
                  <Text style={styles.cameraText}>Position food in frame</Text>
                  
                  <View style={styles.cameraBottomContainer}>
                    <TouchableOpacity
                      style={styles.captureButton}
                      onPress={() => {
                        if (Platform.OS !== 'web') {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                        void takePicture();
                      }}
                      disabled={isAnalyzing}
                    >
                      <View style={styles.captureButtonInner} />
                    </TouchableOpacity>
                  </View>
                </View>
              </CameraView>
              
              {isAnalyzing && (
                <View style={styles.analyzingOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.analyzingText}>Analyzing food...</Text>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>

      <Modal visible={showFoodSearch} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.foodSearchModal}>
            <TouchableOpacity 
              style={styles.modalClose}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowFoodSearch(false);
                setFoodSearchQuery("");
                setFoodSearchResults([]);
              }}
            >
              <X size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.aiModalTitle}>Search Foods</Text>
            <View style={styles.foodSearchInputRow}>
              <TextInput
                style={styles.foodSearchInput}
                placeholder="e.g., apple, chicken breast, pizza"
                placeholderTextColor="#9CA3AF"
                value={foodSearchQuery}
                onChangeText={setFoodSearchQuery}
                autoFocus
                returnKeyType="search"
                onSubmitEditing={async () => {
                  if (!foodSearchQuery || isSearching) return;
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  setIsSearching(true);
                  setFoodSearchResults([]);
                  try {
                    const results = await searchUSDAFoods(foodSearchQuery);
                    setFoodSearchResults(results);
                  } catch (error: any) {
                    console.error("Food search error:", error.message);
                    Alert.alert("Search Failed", "Unable to find foods. Please try a different search.");
                  } finally {
                    setIsSearching(false);
                  }
                }}
              />
              <TouchableOpacity
                style={[styles.foodSearchBtn, (!foodSearchQuery || isSearching) && styles.disabledButton]}
                onPress={async () => {
                  if (!foodSearchQuery || isSearching) return;
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  setIsSearching(true);
                  setFoodSearchResults([]);
                  try {
                    const results = await searchUSDAFoods(foodSearchQuery);
                    setFoodSearchResults(results);
                  } catch (error: any) {
                    console.error("Food search error:", error.message);
                    Alert.alert("Search Failed", "Unable to find foods. Please try a different search.");
                  } finally {
                    setIsSearching(false);
                  }
                }}
                disabled={!foodSearchQuery || isSearching}
              >
                {isSearching ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Search size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.foodSearchResultsList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {isSearching && foodSearchResults.length === 0 && (
                <View style={styles.foodSearchLoading}>
                  <ActivityIndicator size="large" color="#00ADB5" />
                  <Text style={styles.foodSearchLoadingText}>Searching USDA database...</Text>
                </View>
              )}
              {!isSearching && foodSearchResults.length === 0 && foodSearchQuery.length > 0 && (
                <View style={styles.foodSearchEmpty}>
                  <UtensilsCrossed size={40} color="#D1D5DB" />
                  <Text style={styles.foodSearchEmptyText}>Press search to find foods</Text>
                </View>
              )}
              {!isSearching && foodSearchResults.length === 0 && foodSearchQuery.length === 0 && (
                <View style={styles.foodSearchEmpty}>
                  <Search size={40} color="#D1D5DB" />
                  <Text style={styles.foodSearchEmptyText}>Search USDA food database</Text>
                  <Text style={styles.foodSearchEmptyHint}>Try "banana", "chicken breast", or "rice"</Text>
                </View>
              )}
              {foodSearchResults.map((item, index) => (
                <TouchableOpacity
                  key={`${item.name}-${index}`}
                  style={styles.foodSearchResultItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
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
                    updateNutrition({
                      calories: nutrition.calories + newEntry.calories,
                      protein: nutrition.protein + newEntry.protein,
                      carbs: nutrition.carbs + newEntry.carbs,
                      fat: nutrition.fat + newEntry.fat,
                    });
                    setShowFoodSearch(false);
                    setFoodSearchQuery("");
                    setFoodSearchResults([]);
                    Alert.alert("Food Added", `"${item.name}" has been added to today's log.`);
                  }}
                >
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
                    <ChevronRight size={16} color="#9CA3AF" style={{ marginTop: 4 }} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.foodSearchManualBtn}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowFoodSearch(false);
                setFoodSearchQuery("");
                setFoodSearchResults([]);
                setShowAddFood(true);
              }}
            >
              <Plus size={16} color="#6B7280" />
              <Text style={styles.foodSearchManualText}>Enter manually instead</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showEditGoals} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.aiModal}>
            <TouchableOpacity 
              style={styles.modalClose}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowEditGoals(false);
              }}
            >
              <X size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.aiModalTitle}>Edit Nutrition Goals</Text>
            <Text style={styles.aiModalSubtitle}>
              Adjust your daily targets
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Daily Calorie Goal</Text>
              <TextInput
                style={styles.input}
                placeholder="Calories"
                placeholderTextColor="#9CA3AF"
                value={editGoals.calorieGoal}
                onChangeText={(text) => setEditGoals({ ...editGoals, calorieGoal: text })}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Daily Protein Goal (g)</Text>
              <TextInput
                style={styles.input}
                placeholder="Protein"
                placeholderTextColor="#9CA3AF"
                value={editGoals.proteinGoal}
                onChangeText={(text) => setEditGoals({ ...editGoals, proteinGoal: text })}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Daily Carbs Goal (g)</Text>
              <TextInput
                style={styles.input}
                placeholder="Carbs"
                placeholderTextColor="#9CA3AF"
                value={editGoals.carbsGoal}
                onChangeText={(text) => setEditGoals({ ...editGoals, carbsGoal: text })}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Daily Fat Goal (g)</Text>
              <TextInput
                style={styles.input}
                placeholder="Fat"
                placeholderTextColor="#9CA3AF"
                value={editGoals.fatGoal}
                onChangeText={(text) => setEditGoals({ ...editGoals, fatGoal: text })}
                keyboardType="numeric"
              />
            </View>
            
            <TouchableOpacity
              style={styles.aiAnalyzeButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                handleEditGoals();
              }}
            >
              <Text style={styles.aiAnalyzeButtonText}>Save Goals</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showRefineFood} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.aiModal}>
            <TouchableOpacity 
              style={styles.modalClose}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowRefineFood(false);
                setSelectedFoodEntry(null);
                setRefinementInput("");
              }}
            >
              <X size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.aiModalTitle}>Refine Food Entry</Text>
            <Text style={styles.aiModalSubtitle}>
              Add details to improve accuracy: portion size, cooking method, ingredients, etc.
            </Text>
            {selectedFoodEntry && (
              <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 16, color: "#1F2937", fontWeight: "600" }}>
                  {selectedFoodEntry.name}
                </Text>
                <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
                  {selectedFoodEntry.calories} cal • P: {selectedFoodEntry.protein}g • C: {selectedFoodEntry.carbs}g • F: {selectedFoodEntry.fat}g
                </Text>
              </View>
            )}
            <TextInput
              style={styles.aiTextInput}
              placeholder="e.g., 'it was a large portion, deep fried' or 'with olive oil and garlic'"
              placeholderTextColor="#9CA3AF"
              value={refinementInput}
              onChangeText={setRefinementInput}
              multiline
              autoFocus
            />
            <TouchableOpacity
              style={[
                styles.aiAnalyzeButton,
                (!refinementInput || isAnalyzing) && styles.disabledButton,
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                if (selectedFoodEntry) {
                  void refineWithAI(selectedFoodEntry, refinementInput);
                }
              }}
              disabled={!refinementInput || isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.aiAnalyzeButtonText}>Refine Entry</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showWeeklyReview} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.aiModal}>
            <TouchableOpacity 
              style={styles.modalClose}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setShowWeeklyReview(false);
                setWeeklyReviewData("");
              }}
            >
              <X size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.aiModalTitle}>Weekly Nutrition Review</Text>
            <ScrollView style={{ maxHeight: 400, marginTop: 20 }}>
              {isGeneratingReview ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text style={{ marginTop: 15, color: "#6B7280", fontSize: 16 }}>
                    Analyzing your week...
                  </Text>
                </View>
              ) : (
                <Text style={{ fontSize: 16, color: "#1F2937", lineHeight: 24 }}>
                  {weeklyReviewData}
                </Text>
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
    paddingHorizontal: 20,
  },
  progressCard: {
    borderRadius: 24,
    padding: 24,
    marginTop: 30,
    shadowColor: "#00ADB5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F9FAFB",
  },
  resetTimer: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  progressIcons: {
    flexDirection: "row",
    gap: 15,
  },
  progressSubtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 5,
  },
  macrosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    marginTop: 20,
  },
  macroItem: {
    width: "47%",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    backgroundColor: "#10141B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  macroIcon: {
    fontSize: 20,
  },
  macroLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
    marginTop: 5,
  },
  progressContainer: {
    alignItems: "center",
    marginTop: 15,
    position: "relative",
  },
  progressRingCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  progressPercentage: {
    fontSize: 22,
    fontWeight: "bold" as const,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  progressValue: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 10,
  },
  scanButton: {
    backgroundColor: "#00ADB5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 15,
    marginTop: 20,
    gap: 10,
  },
  scanButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  aiButton: {
    backgroundColor: "#00ADB5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 15,
    marginTop: 15,
    gap: 10,
  },
  aiButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  manualButton: {
    backgroundColor: "#00ADB5",
    padding: 18,
    borderRadius: 15,
    marginTop: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  manualButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  addFoodCard: {
    backgroundColor: "#171B22",
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  addFoodTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F9FAFB",
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#0D0F13",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 2,
    borderColor: "#1E293B",
    color: "#F9FAFB",
  },
  nutritionInputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
  },
  nutritionInputItem: {
    flex: 1,
  },
  nutritionInput: {
    backgroundColor: "#0D0F13",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 2,
    borderColor: "#1E293B",
    color: "#F9FAFB",
  },
  addFoodButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  addButton: {
    flex: 1,
    backgroundColor: "#00ADB5",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#1E293B",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButtonText: {
    color: "#9CA3AF",
    fontSize: 16,
    fontWeight: "600",
  },
  historySection: {
    marginTop: 30,
    marginBottom: 30,
  },
  historyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F9FAFB",
    marginBottom: 15,
  },
  emptyState: {
    backgroundColor: "#171B22",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
  },
  mealCard: {
    backgroundColor: "#171B22",
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 2,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  mealTime: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 2,
  },
  mealStats: {
    alignItems: "flex-end",
  },
  mealCalories: {
    fontSize: 16,
    fontWeight: "600",
    color: "#00ADB5",
  },
  mealMacro: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  quizModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    width: "90%",
    maxWidth: 400,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 5,
  },
  quizProgress: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
  },
  quizQuestion: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 20,
  },
  quizInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  choicesContainer: {
    gap: 10,
  },
  choiceButton: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 15,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  choiceButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  choiceText: {
    fontSize: 16,
    color: "#1F2937",
    textAlign: "center",
  },
  choiceTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  quizButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 30,
  },
  quizButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  quizButtonPrimary: {
    backgroundColor: "#10B981",
  },
  quizButtonSecondary: {
    backgroundColor: "#E5E7EB",
  },
  quizButtonTextPrimary: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  quizButtonTextSecondary: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  aiModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    width: "90%",
    maxWidth: 400,
  },
  modalClose: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 10,
    padding: 5,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  aiModalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 10,
  },
  aiModalSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 20,
  },
  aiTextInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 100,
    textAlignVertical: "top",
  },
  aiAnalyzeButton: {
    backgroundColor: "#3B82F6",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  aiAnalyzeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  heightInputContainer: {
    flexDirection: "row",
    gap: 10,
  },
  heightInput: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  cameraClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
  },
  cameraBottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 50,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingTop: 20,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
  },
  cameraText: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    color: "#FFFFFF",
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: "#3B82F6",
    padding: 15,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cameraGuide: {
    position: "absolute",
    top: "30%",
    left: "10%",
    right: "10%",
    height: "30%",
  },
  cameraGuideCorner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#FFFFFF",
    borderWidth: 3,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  cameraGuideCornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  cameraGuideCornerBL: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  cameraGuideCornerBR: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  analyzingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  analyzingText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
  },

  heroBanner: {
    marginTop: 20,
    marginBottom: 10,
  },
  heroBannerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  heroBannerSubtitle: {
    fontSize: 16,
    color: "#9CA3AF",
  },
  weeklyReviewButtonTop: {
    borderRadius: 20,
    marginTop: 16,
    shadowColor: "#00ADB5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
  },
  weeklyReviewButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  weeklyReviewButtonTopText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  quizRequiredCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    alignItems: "center",
  },
  quizRequiredHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  quizRequiredTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginTop: 15,
  },
  quizRequiredDescription: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 25,
  },
  quizRequiredFeatures: {
    alignSelf: "stretch",
    marginBottom: 30,
  },
  quizFeatureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  quizFeatureBullet: {
    fontSize: 18,
    color: "#8B5CF6",
    marginRight: 12,
    fontWeight: "bold",
  },
  quizFeatureText: {
    fontSize: 16,
    color: "#4B5563",
    flex: 1,
  },
  startQuizButton: {
    backgroundColor: "#8B5CF6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 15,
    gap: 10,
    alignSelf: "stretch",
  },
  startQuizButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  foodSearchButton: {
    backgroundColor: "#00ADB5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 15,
    marginTop: 15,
    gap: 10,
  },
  foodSearchButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  foodSearchModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "92%",
    maxWidth: 420,
    maxHeight: "85%",
  },
  foodSearchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  foodSearchInput: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  foodSearchBtn: {
    backgroundColor: "#00ADB5",
    width: 48,
    height: 48,
    borderRadius: 12,
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
    fontSize: 15,
    color: "#6B7280",
  },
  foodSearchEmpty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  foodSearchEmptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#9CA3AF",
    fontWeight: "500" as const,
  },
  foodSearchEmptyHint: {
    marginTop: 4,
    fontSize: 13,
    color: "#D1D5DB",
  },
  foodSearchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  foodSearchResultLeft: {
    flex: 1,
    marginRight: 12,
  },
  foodSearchResultName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#1F2937",
    lineHeight: 20,
  },
  foodSearchResultServing: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 2,
  },
  foodSearchResultMacros: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  foodSearchMacroP: {
    fontSize: 12,
    color: "#FF4FB6",
    fontWeight: "600" as const,
  },
  foodSearchMacroC: {
    fontSize: 12,
    color: "#00FFC6",
    fontWeight: "600" as const,
  },
  foodSearchMacroF: {
    fontSize: 12,
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
    color: "#00ADB5",
  },
  foodSearchResultCalLabel: {
    fontSize: 11,
    color: "#9CA3AF",
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
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  addFoodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EBF4FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  datePickerText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "600",
  },
  mealPrepSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 15,
    fontStyle: "italic",
  },
  tapToRefineText: {
    fontSize: 12,
    color: "#8B5CF6",
    marginTop: 2,
    fontStyle: "italic",
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  mealInfo: {
    flex: 1,
  },
  mealActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deleteButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: "#FEF2F2",
  },
  mealMacros: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  macroTag: {
    backgroundColor: "#0D0F13",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  macroTagText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  healthScoreTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  healthScoreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthScoreText: {
    fontSize: 13,
    fontWeight: "600",
  },
  firstTimePromptModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  firstTimePromptHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  firstTimePromptTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginTop: 15,
  },
  firstTimePromptDescription: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 25,
  },
  firstTimePromptFeatures: {
    marginBottom: 30,
  },
  firstTimeFeatureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  firstTimeFeatureBullet: {
    fontSize: 20,
    marginRight: 15,
    width: 30,
    color: "#8B5CF6",
    fontWeight: "bold" as const,
  },
  firstTimeFeatureText: {
    fontSize: 16,
    color: "#4B5563",
    flex: 1,
    lineHeight: 22,
  },
  firstTimePromptButtons: {
    flexDirection: "row",
    gap: 12,
  },
  firstTimePromptButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  firstTimeSkipButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  firstTimeStartButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    gap: 8,
  },
  firstTimeSkipButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  firstTimeStartButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
