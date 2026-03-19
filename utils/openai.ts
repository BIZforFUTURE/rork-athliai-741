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

export { callOpenAI, cleanJsonResponse, parseNutritionResponse };
