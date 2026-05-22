/**
 * Direct OpenAI API client.
 * Uses EXPO_PUBLIC_OPENAI_API_KEY for all AI features in the app.
 */

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

type NutritionData = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type ExerciseData = {
  name: string;
  caloriesBurned: number;
  duration: string;
};

type TextPart = { type: "text"; text: string };
type ImageUrlPart = { type: "image_url"; image_url: { url: string } };
type Content = string | (TextPart | ImageUrlPart)[];
type Message = { role: "system" | "user" | "assistant"; content: Content };

const assertKey = () => {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "Missing EXPO_PUBLIC_OPENAI_API_KEY. Set it in your environment."
    );
  }
};

const postChat = async (body: Record<string, unknown>): Promise<any> => {
  assertKey();
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("OpenAI HTTP error", res.status, text);
    throw new Error(`OpenAI request failed (${res.status})`);
  }
  return res.json();
};

/** Extract assistant text content from a chat completion response. */
const extractText = (data: any): string => {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c: any) => (typeof c === "string" ? c : c?.text ?? ""))
      .join("");
  }
  return "";
};

/** Parse a JSON object out of an LLM response, stripping code fences if present. */
const parseJson = <T,>(text: string): T => {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
};

const nutritionJsonSchema = {
  name: "nutrition",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string" },
      calories: { type: "number" },
      protein: { type: "number" },
      carbs: { type: "number" },
      fat: { type: "number" },
    },
    required: ["name", "calories", "protein", "carbs", "fat"],
  },
};

const exerciseJsonSchema = {
  name: "exercise",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string" },
      caloriesBurned: { type: "number" },
      duration: { type: "string" },
    },
    required: ["name", "caloriesBurned", "duration"],
  },
};

const analyzeFood = async (description: string): Promise<NutritionData> => {
  console.log("Analyzing food via OpenAI:", description);
  try {
    const data = await postChat({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: `You are a professional nutritionist. Analyze this food and provide accurate nutritional estimates based on standard serving sizes: "${description}". Return name, calories, protein (g), carbs (g), fat (g).`,
        },
      ],
      response_format: { type: "json_schema", json_schema: nutritionJsonSchema },
    });
    const parsed = parseJson<NutritionData>(extractText(data));
    if (!parsed.name || parsed.calories <= 0) {
      throw new Error("Invalid nutrition data returned");
    }
    return {
      name: parsed.name,
      calories: Math.round(parsed.calories),
      protein: Math.round(parsed.protein),
      carbs: Math.round(parsed.carbs),
      fat: Math.round(parsed.fat),
    };
  } catch (error: any) {
    console.error("analyzeFood failed:", error?.message ?? error);
    throw new Error("Failed to analyze food. Please try again.");
  }
};

const analyzeFoodImage = async (base64Image: string): Promise<NutritionData> => {
  console.log("Analyzing food image via OpenAI vision...");
  try {
    const data = await postChat({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "You are a professional nutritionist. Analyze this food image and provide accurate nutritional estimates. Return name, calories, protein (g), carbs (g), fat (g).",
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
          ],
        },
      ],
      response_format: { type: "json_schema", json_schema: nutritionJsonSchema },
    });
    const parsed = parseJson<NutritionData>(extractText(data));
    if (!parsed.name || parsed.calories <= 0) {
      throw new Error("Invalid nutrition data from image");
    }
    return {
      name: parsed.name,
      calories: Math.round(parsed.calories),
      protein: Math.round(parsed.protein),
      carbs: Math.round(parsed.carbs),
      fat: Math.round(parsed.fat),
    };
  } catch (error: any) {
    console.error("analyzeFoodImage failed:", error?.message ?? error);
    throw new Error("Failed to analyze food image. Please try again.");
  }
};

const analyzeExerciseAI = async (description: string): Promise<ExerciseData> => {
  console.log("Analyzing exercise via OpenAI:", description);
  try {
    const data = await postChat({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: `You are a fitness expert. The user performed this exercise: "${description}". Estimate calories burned assuming an average adult. Return name, caloriesBurned, duration.`,
        },
      ],
      response_format: { type: "json_schema", json_schema: exerciseJsonSchema },
    });
    const parsed = parseJson<ExerciseData>(extractText(data));
    if (parsed.caloriesBurned <= 0) {
      throw new Error("Invalid exercise data returned");
    }
    return parsed;
  } catch (error: any) {
    console.error("analyzeExerciseAI failed:", error?.message ?? error);
    throw new Error("Failed to analyze exercise. Please try again.");
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
  console.log("Refining food entry via OpenAI...");
  try {
    const data = await postChat({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: `You are a nutrition expert. The user logged "${originalName}" with ${originalCalories} cal, ${originalProtein}g protein, ${originalCarbs}g carbs, ${originalFat}g fat. They want to refine it with: "${refinementText}". Return updated nutrition estimates.`,
        },
      ],
      response_format: { type: "json_schema", json_schema: nutritionJsonSchema },
    });
    const parsed = parseJson<NutritionData>(extractText(data));
    return {
      name: parsed.name || originalName,
      calories: Math.round(parsed.calories),
      protein: Math.round(parsed.protein),
      carbs: Math.round(parsed.carbs),
      fat: Math.round(parsed.fat),
    };
  } catch (error: any) {
    console.error("refineFoodAI failed:", error?.message ?? error);
    throw new Error("Failed to refine food entry. Please try again.");
  }
};

const callOpenAI = async (prompt: string): Promise<string> => {
  try {
    console.log("Calling OpenAI text...");
    const data = await postChat({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
    });
    return extractText(data);
  } catch (error: any) {
    console.error("callOpenAI failed:", error?.message ?? error);
    throw error;
  }
};

const callOpenAIWithVision = async (
  prompt: string,
  base64Image: string
): Promise<string> => {
  try {
    console.log("Calling OpenAI vision...");
    const data = await postChat({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
          ],
        },
      ],
    });
    return extractText(data);
  } catch (error: any) {
    console.error("callOpenAIWithVision failed:", error?.message ?? error);
    throw error;
  }
};

export type { NutritionData, ExerciseData, Message };
export {
  analyzeFood,
  analyzeFoodImage,
  analyzeExerciseAI,
  refineFoodAI,
  callOpenAI,
  callOpenAIWithVision,
};
