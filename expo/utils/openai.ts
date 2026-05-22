/**
 * Direct OpenAI API client.
 * Uses EXPO_PUBLIC_OPENAI_API_KEY for all AI features in the app.
 */

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const TEXT_MODEL = "gpt-4o-mini";
const VISION_MODEL = "gpt-4o";
const MODEL = TEXT_MODEL;
const REQUEST_TIMEOUT_MS = 45_000;

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("OpenAI HTTP error", res.status, text);
      let message = `OpenAI request failed (${res.status})`;
      try {
        const parsed = JSON.parse(text);
        if (parsed?.error?.message) message = parsed.error.message;
      } catch {}
      throw new Error(message);
    }
    return await res.json();
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error("Request timed out. Please check your connection and try again.");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
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

const NUTRITION_SYSTEM_PROMPT = `You are a board-certified nutritionist and registered dietitian with 20 years of experience analyzing food portions and macronutrients.

Rules:
- Always estimate based on the MOST LIKELY real-world serving size shown or implied. If a quantity is given ("2 slices", "a bowl", "large"), respect it. Otherwise assume one standard adult serving.
- For mixed/prepared dishes, infer typical ingredients and proportions (e.g. a burger = bun + patty + cheese + condiments).
- Round all macro grams to whole numbers; calories to the nearest 5.
- The "name" field MUST be a short, human-readable description including the portion (e.g. "Grilled chicken breast (6 oz)", "2 slices of pepperoni pizza", "Large caesar salad with chicken"). Title Case.
- Calories MUST roughly equal protein*4 + carbs*4 + fat*9 (±15%). Self-check before answering.
- If the input is clearly not food (e.g. a chair, person, blank image), set name="Unknown" and all macros to 0.
- Never refuse. Never add disclaimers. Only return the JSON object that matches the schema.`;

const sanitizeNutrition = (parsed: NutritionData): NutritionData => {
  const safe = (n: unknown): number => {
    const v = typeof n === "number" ? n : Number(n);
    return Number.isFinite(v) && v > 0 ? v : 0;
  };
  return {
    name: (parsed.name ?? "").toString().trim() || "Unknown food",
    calories: Math.max(0, Math.round(safe(parsed.calories) / 5) * 5),
    protein: Math.max(0, Math.round(safe(parsed.protein))),
    carbs: Math.max(0, Math.round(safe(parsed.carbs))),
    fat: Math.max(0, Math.round(safe(parsed.fat))),
  };
};

const requestNutrition = async (
  model: string,
  userContent: Content
): Promise<NutritionData> => {
  const data = await postChat({
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: NUTRITION_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_schema", json_schema: nutritionJsonSchema },
  });
  const raw = extractText(data);
  if (!raw) {
    console.warn("OpenAI returned empty content", JSON.stringify(data).slice(0, 500));
    throw new Error("Empty response from AI");
  }
  const parsed = parseJson<NutritionData>(raw);
  const cleaned = sanitizeNutrition(parsed);
  if (cleaned.name.toLowerCase() === "unknown" || cleaned.name === "Unknown food") {
    throw new Error("Could not identify the food. Try describing it more specifically.");
  }
  return cleaned;
};

const analyzeFood = async (description: string): Promise<NutritionData> => {
  const trimmed = description.trim();
  if (!trimmed) throw new Error("Please describe the food first.");
  console.log("[Food][text] analyze:", trimmed);
  try {
    return await requestNutrition(
      TEXT_MODEL,
      `Analyze this food and return nutrition for the portion described. If no portion is given, assume one standard adult serving.\n\nFood: "${trimmed}"`
    );
  } catch (error: any) {
    const msg = error?.message ?? String(error);
    console.error("[Food][text] failed:", msg);
    throw new Error(msg.startsWith("Could not identify") ? msg : `Failed to analyze food: ${msg}`);
  }
};

const analyzeFoodImage = async (base64Image: string): Promise<NutritionData> => {
  if (!base64Image || base64Image.length < 100) {
    throw new Error("No image data captured. Please try taking the photo again.");
  }
  console.log("[Food][image] analyze, bytes:", base64Image.length);
  try {
    return await requestNutrition(VISION_MODEL, [
      {
        type: "text",
        text: "Identify every food and drink in this image and estimate the total nutrition for what is actually visible on the plate / in the cup. Pay attention to portion size relative to the plate, utensils, or hand for scale. If multiple distinct items, combine them into a single entry and reflect that in the name (e.g. \"Steak, mashed potatoes & broccoli\").",
      },
      {
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${base64Image}` },
      },
    ]);
  } catch (error: any) {
    const msg = error?.message ?? String(error);
    console.error("[Food][image] failed:", msg);
    throw new Error(msg.startsWith("Could not identify") ? msg : `Failed to analyze image: ${msg}`);
  }
};

const analyzeExerciseAI = async (description: string): Promise<ExerciseData> => {
  console.log("Analyzing exercise via OpenAI:", description);
  try {
    const data = await postChat({
      model: MODEL,
      temperature: 0.2,
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
      model: TEXT_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: NUTRITION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `The user logged "${originalName}" with ${originalCalories} cal, ${originalProtein}g protein, ${originalCarbs}g carbs, ${originalFat}g fat. They want to refine it with this extra info: "${refinementText}". Return updated nutrition estimates that reflect the refinement.`,
        },
      ],
      response_format: { type: "json_schema", json_schema: nutritionJsonSchema },
    });
    const parsed = parseJson<NutritionData>(extractText(data));
    const cleaned = sanitizeNutrition(parsed);
    return { ...cleaned, name: cleaned.name || originalName };
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
