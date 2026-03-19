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

export interface FoodSearchResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
}

export const searchUSDAFoods = async (query: string): Promise<FoodSearchResult[]> => {
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
  const results: FoodSearchResult[] = [];

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
