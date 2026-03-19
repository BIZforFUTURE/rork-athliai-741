interface FoodEntry {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface HealthScoreResult {
  score: number;
  color: string;
  label: string;
}

export const calculateHealthScore = (entry: FoodEntry): HealthScoreResult => {
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

  if (calories < 80 && (protein > 0 || carbs > 0)) {
    densityScore = 1.5;
  } else if (calories < 200) {
    densityScore = 0.5;
  } else if (calories > 800) {
    densityScore = -1;
  } else if (calories > 500) {
    densityScore = -0.5;
  }

  const calDensity = totalMacroCals > 0 ? calories / (protein + carbs + fat) : 0;
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
