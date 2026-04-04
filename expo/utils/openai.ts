import { generateText } from "@rork-ai/toolkit-sdk";

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
    console.log('AI response received, length:', response?.length ?? 0);
    return response;
  } catch (error: any) {
    console.error('AI call failed:', error?.message || error);
    throw new Error('AI analysis failed: ' + (error?.message || 'Unknown error'));
  }
};

const callOpenAIWithVision = async (prompt: string, base64Image: string): Promise<string> => {
  try {
    const imageSizeKB = (base64Image.length / 1024).toFixed(0);
    console.log('Calling AI vision via Rork toolkit... (image size: ' + imageSizeKB + 'KB)');

    const imagePrefix = base64Image.startsWith('data:')
      ? base64Image
      : 'data:image/jpeg;base64,' + base64Image;

    const response = await generateText({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', image: imagePrefix },
          ],
        },
      ],
    });
    console.log('AI vision response received, length:', response?.length ?? 0);
    if (!response || response.trim().length === 0) {
      throw new Error('Empty response from AI vision');
    }
    return response;
  } catch (error: any) {
    console.error('AI vision call failed:', error?.message || error);
    throw new Error('AI vision analysis failed: ' + (error?.message || 'Unknown error'));
  }
};

const cleanJsonResponse = (response: string): string => {
  let cleaned = response
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/^[^{]*/, '')
    .replace(/[^}]*$/, '')
    .trim();
  
  const jsonMatch = cleaned.match(/{[^{}]*(?:{[^{}]*}[^{}]*)*}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  return cleaned;
};

const parseNutritionResponse = (response: string): { name: string; calories: number; protein: number; carbs: number; fat: number } | null => {
  try {
    const cleaned = cleanJsonResponse(response);
    const data = JSON.parse(cleaned);
    
    const name = data.name || 'Unknown food';
    const calories = Number(data.calories) || 0;
    const protein = Number(data.protein) || 0;
    const carbs = Number(data.carbs) || 0;
    const fat = Number(data.fat) || 0;
    
    if (!name || calories === 0) return null;
    
    return {
      name,
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
    };
  } catch {
    const nameMatch = response.match(/"name"\s*:\s*"([^"]+)"/);
    const caloriesMatch = response.match(/"calories"\s*:\s*(\d+)/);
    
    if (nameMatch && caloriesMatch) {
      const proteinMatch = response.match(/"protein"\s*:\s*(\d+)/);
      const carbsMatch = response.match(/"carbs"\s*:\s*(\d+)/);
      const fatMatch = response.match(/"fat"\s*:\s*(\d+)/);
      
      return {
        name: nameMatch[1],
        calories: parseInt(caloriesMatch[1]),
        protein: proteinMatch ? parseInt(proteinMatch[1]) : 0,
        carbs: carbsMatch ? parseInt(carbsMatch[1]) : 0,
        fat: fatMatch ? parseInt(fatMatch[1]) : 0,
      };
    }
    
    return null;
  }
};

export { callOpenAI, callOpenAIWithVision, cleanJsonResponse, parseNutritionResponse };
