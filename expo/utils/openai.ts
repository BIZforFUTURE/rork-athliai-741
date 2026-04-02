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

const callOpenAIWithMultipleFrames = async (prompt: string, base64Frames: string[]): Promise<string> => {
  try {
    console.log('Calling AI vision with', base64Frames.length, 'frames via Rork toolkit...');
    const contentParts: ({ type: 'text'; text: string } | { type: 'image'; image: string })[] = [
      { type: 'text', text: prompt },
      ...base64Frames.map((b64) => ({
        type: 'image' as const,
        image: `data:image/jpeg;base64,${b64}`,
      })),
    ];
    const response = await generateText({
      messages: [
        {
          role: 'user',
          content: contentParts,
        },
      ],
    });
    return response;
  } catch (error: any) {
    console.error('AI multi-frame vision call failed:', error);
    throw error;
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

export { callOpenAI, callOpenAIWithVision, callOpenAIWithMultipleFrames, cleanJsonResponse, parseNutritionResponse };
