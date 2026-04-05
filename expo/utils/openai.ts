import { generateObject, generateText } from "@rork-ai/toolkit-sdk";
import * as z from "zod/v4";

const NutritionSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

type NutritionData = z.infer<typeof NutritionSchema>;

const ExerciseSchema = z.object({
  name: z.string(),
  caloriesBurned: z.number(),
  duration: z.string(),
});

type ExerciseData = z.infer<typeof ExerciseSchema>;

const analyzeFood = async (description: string): Promise<NutritionData> => {
  console.log('Analyzing food with AI (structured):', description);
  try {
    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: `You are a professional nutritionist. Analyze this food and provide accurate nutritional estimates based on standard serving sizes: "${description}". Provide the food name, calories, protein (g), carbs (g), and fat (g).`,
        },
      ],
      schema: NutritionSchema,
    });
    console.log('Food analysis result:', JSON.stringify(result));
    if (!result.name || result.calories <= 0) {
      throw new Error('Invalid nutrition data returned');
    }
    return {
      name: result.name,
      calories: Math.round(result.calories),
      protein: Math.round(result.protein),
      carbs: Math.round(result.carbs),
      fat: Math.round(result.fat),
    };
  } catch (error: any) {
    console.error('analyzeFood failed:', error?.message || error);
    throw new Error('Failed to analyze food. Please try again.');
  }
};

const analyzeFoodImage = async (base64Image: string): Promise<NutritionData> => {
  console.log('Analyzing food image with AI vision (structured)...');
  try {
    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'You are a professional nutritionist. Analyze this food image and provide accurate nutritional estimates. Provide the food name, calories, protein (g), carbs (g), and fat (g).' },
            { type: 'image', image: `data:image/jpeg;base64,${base64Image}` },
          ],
        },
      ],
      schema: NutritionSchema,
    });
    console.log('Food image analysis result:', JSON.stringify(result));
    if (!result.name || result.calories <= 0) {
      throw new Error('Invalid nutrition data from image');
    }
    return {
      name: result.name,
      calories: Math.round(result.calories),
      protein: Math.round(result.protein),
      carbs: Math.round(result.carbs),
      fat: Math.round(result.fat),
    };
  } catch (error: any) {
    console.error('analyzeFoodImage failed:', error?.message || error);
    throw new Error('Failed to analyze food image. Please try again.');
  }
};

const analyzeExerciseAI = async (description: string): Promise<ExerciseData> => {
  console.log('Analyzing exercise with AI (structured):', description);
  try {
    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: `You are a fitness expert. The user performed this exercise: "${description}". Estimate the calories burned assuming an average adult. Provide the exercise name, calories burned, and estimated duration.`,
        },
      ],
      schema: ExerciseSchema,
    });
    console.log('Exercise analysis result:', JSON.stringify(result));
    if (result.caloriesBurned <= 0) {
      throw new Error('Invalid exercise data returned');
    }
    return result;
  } catch (error: any) {
    console.error('analyzeExerciseAI failed:', error?.message || error);
    throw new Error('Failed to analyze exercise. Please try again.');
  }
};

const refineFoodAI = async (
  originalName: string,
  originalCalories: number,
  originalProtein: number,
  originalCarbs: number,
  originalFat: number,
  refinementText: string
): Promise<NutritionData> => {
  console.log('Refining food entry with AI (structured)...');
  try {
    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: `You are a nutrition expert. The user logged "${originalName}" with ${originalCalories} cal, ${originalProtein}g protein, ${originalCarbs}g carbs, ${originalFat}g fat. They want to refine it with: "${refinementText}". Provide updated nutritional estimates.`,
        },
      ],
      schema: NutritionSchema,
    });
    console.log('Food refinement result:', JSON.stringify(result));
    return {
      name: result.name || originalName,
      calories: Math.round(result.calories),
      protein: Math.round(result.protein),
      carbs: Math.round(result.carbs),
      fat: Math.round(result.fat),
    };
  } catch (error: any) {
    console.error('refineFoodAI failed:', error?.message || error);
    throw new Error('Failed to refine food entry. Please try again.');
  }
};

const callOpenAI = async (prompt: string): Promise<string> => {
  try {
    console.log('Calling AI via Rork toolkit...');
    const response = await generateText({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });
    return response;
  } catch (error: any) {
    console.error('AI call failed:', error);
    throw error;
  }
};

const callOpenAIWithVision = async (prompt: string, base64Image: string): Promise<string> => {
  try {
    console.log('Calling AI vision via Rork toolkit...');
    const response = await generateText({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', image: `data:image/jpeg;base64,${base64Image}` },
          ],
        },
      ],
    });
    return response;
  } catch (error: any) {
    console.error('AI vision call failed:', error);
    throw error;
  }
};

export {
  analyzeFood,
  analyzeFoodImage,
  analyzeExerciseAI,
  refineFoodAI,
  callOpenAI,
  callOpenAIWithVision,
};
