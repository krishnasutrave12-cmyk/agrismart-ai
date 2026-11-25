import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_FAST = "gemini-4-hydrogen";
const MODEL_FALLBACK = "gemini-3.5-flash-lite";
const MODEL_TTS = "gemini-3.8-flash-lite-tts";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const aiTts = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  apiVersion: "v1beta",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

function isQuotaOrRateLimitError(error: any): boolean {
  const status = Number(error?.status || error?.code || 0);
  const msg = String(error?.message || "");
  return (
    status === 429 ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota")
  );
}

function isTransientDemandError(error: any): boolean {
  const status = Number(error?.status || error?.code || 0);
  const msg = String(error?.message || "");
  return (
    status === 503 ||
    status === 500 ||
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("high demand") ||
    msg.includes("overloaded")
  );
}

async function generateContentResilient(params: any)
 {
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const models = [MODEL_FAST, MODEL_FALLBACK];
  let lastError: any;

  for (const model of models) {
    const config = params.config ? { ...params.config } : undefined;

    // Remove advanced thinking settings for the fallback model
    if (model === MODEL_FALLBACK && config) {
      delete config.thinkingConfig;
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await ai.models.generateContent({
          ...params,
          model,
          ...(config ? { config } : {}),
        });
      } catch (error: any) {
        lastError = error;

        const retryable =
          isTransientDemandError(error) ||
          isQuotaOrRateLimitError(error);

        if (!retryable) {
          throw error;
        }

        console.warn(
          `Gemini model ${model} failed. Attempt ${attempt + 1}/2. Status:`,
          error?.status || error?.code
        );

        if (attempt < 1) {
          // Exponential backoff with a little random delay
          const delay = 1500 * Math.pow(2, attempt) +
            Math.floor(Math.random() * 500);

          await sleep(delay);
        }
      }
    }

    console.warn(`Switching from ${model} to the next fallback model.`);
  }

  throw lastError;
}
  


const LANGUAGE_NAME: Record<string, string> = {
  en: "English (simple Indian farming English)",
  hi: "Hindi (natural Devanagari script with everyday Indian agricultural terminology)",
  mr: "Marathi (natural, grammatically correct Devanagari Marathi with authentic Maharashtra agricultural terminology; do NOT use Hindi words where Marathi equivalents exist)",
};

function getLanguagePrompt(lang: string): string {
  return LANGUAGE_NAME[lang] || LANGUAGE_NAME.en;
}

function cleanJsonText(raw?: string): string {
  if (!raw) return "{}";
  return raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
}

function parseDataUrl(base64Image: string): { mimeType: string; data: string } {
  const match = base64Image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  const mimeType = match ? match[1] : "image/jpeg";
  const data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
  return { mimeType, data };
}

function formatApiError(error: any, fallbackMessage: string) {
  const status = Number(error?.status || error?.code || 0);
  const rawMsg = String(error?.message || "");
  if (status === 403 || rawMsg.includes("API_KEY_INVALID") || rawMsg.includes("PERMISSION_DENIED")) {
    return {
      statusCode: 503,
      message: "AI service key is unavailable or invalid. Please check your Gemini API configuration.",
    };
  }
  if (status === 429 || rawMsg.includes("RESOURCE_EXHAUSTED")) {
    return {
      statusCode: 429,
      message: "AI service quota temporarily reached. Please wait a moment and try again.",
    };
  }
  if (isTransientDemandError(error)) {
    return {
      statusCode: 503,
      message: "AI service is temporarily busy due to high demand. Please try again in a few seconds.",
    };
  }
  return {
    statusCode: 502,
    message: fallbackMessage,
  };
}

function weatherCodeToLabel(code: number, lang: string): string {
  const map: Record<number, { en: string; hi: string; mr: string }> = {
    0: { en: "Clear Sky", hi: "साफ आसमान", mr: "स्वच्छ आकाश" },
    1: { en: "Mainly Clear", hi: "मुख्यतः साफ", mr: "मुख्यतः स्वच्छ" },
    2: { en: "Partly Cloudy", hi: "आंशिक बादल", mr: "अंशतः ढगाळ" },
    3: { en: "Overcast", hi: "घने बादल", mr: "दाट ढगाळ" },
    45: { en: "Fog", hi: "कोहरा", mr: "धुके" },
    48: { en: "Rime Fog", hi: "घना कोहरा", mr: "दाट धुके" },
    51: { en: "Light Drizzle", hi: "हल्की बूंदाबांदी", mr: "हलकी रिमझिम" },
    53: { en: "Moderate Drizzle", hi: "मध्यम बूंदाबांदी", mr: "मध्यम रिमझिम" },
    55: { en: "Dense Drizzle", hi: "तेज बूंदाबांदी", mr: "जोरदार रिमझिम" },
    61: { en: "Light Rain", hi: "हल्की बारिश", mr: "हलका पाऊस" },
    63: { en: "Moderate Rain", hi: "मध्यम बारिश", mr: "मध्यम पाऊस" },
    65: { en: "Heavy Rain", hi: "भारी बारिश", mr: "मुसळधार पाऊस" },
    80: { en: "Light Rain Showers", hi: "हल्की बौछारें", mr: "हलक्या सरी" },
    81: { en: "Moderate Showers", hi: "मध्यम बौछारें", mr: "मध्यम सरी" },
    82: { en: "Heavy Rain Showers", hi: "तेज बौछारें", mr: "जोरदार सरी" },
    95: { en: "Thunderstorm", hi: "आंधी-तूफान", mr: "वादळी पाऊस" },
    96: { en: "Thunderstorm with Hail", hi: "ओलावृष्टि के साथ तूफान", mr: "गारपिटीसह वादळ" },
    99: { en: "Heavy Hail Thunderstorm", hi: "भारी ओलावृष्टि", mr: "तीव्र गारपीट" },
  };
  const entry = map[code] || { en: "Variable Weather", hi: "बदलता मौसम", mr: "बदलते हवामान" };
  return lang === "hi" ? entry.hi : lang === "mr" ? entry.mr : entry.en;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const server = createServer(app);

  app.use(express.json({ limit: "30mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      voicePackAvailable: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // 1. AI Crop & Plant Disease Detection
  app.post("/api/analyze-plant", async (req, res) => {
    try {
      const { base64Image, language = "en" } = req.body;
      if (!base64Image) {
        return res.status(400).json({ error: "Please upload or capture a crop image." });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: "Gemini AI service is not configured on the server.",
        });
      }

      const { mimeType, data } = parseDataUrl(base64Image);
      const langDesc = getLanguagePrompt(language);

      const systemInstruction = `You are an experienced Indian agricultural scientist, botanist, and plant pathologist helping farmers.
Analyze the uploaded photograph carefully and truthfully.
Respond in ${langDesc}.

STRICT RULES:
1. PLANT IDENTIFICATION IS MANDATORY:
   - Look closely at leaf shape, venation, stem, fruit, flower, canopy, or field crop structure to identify the EXACT plant, crop, vegetable, fruit, herb, or flower (for example: Cotton, Soybean, Wheat, Rice/Paddy, Tomato, Potato, Onion, Chilli, Maize, Sugarcane, Brinjal, Okra, Groundnut, Rose, Hibiscus, Marigold, Mango, Banana, Grape, Pomegranate, Papaya, Tulsi, Neem, etc.).
   - Always fill "plantName" with the clear specific name in ${langDesc} (e.g., in Marathi "टोमॅटो", in Hindi "टमाटर", in English "Tomato").
   - Always fill "englishPlantName" with the standard English common name (e.g., "Tomato", "Cotton", "Wheat", "Rose").
   - Always fill "scientificName" with the botanical Latin name (e.g., "Solanum lycopersicum").
   - NEVER return vague placeholders like "Plant", "Crop", "Unknown", or "Leaf" if any recognizable plant foliage, stem, flower, or field crop is visible. Give your best botanical identification and reflect uncertainty honestly through the confidence percentage.
2. Only if the photo does NOT contain any plant/crop at all (e.g. a blank wall, person, car) or is completely unreadable:
   - Set "imageEvidenceSufficient": false
   - Set "status": "Uncertain"
   - Set "confidence" below 45 and ask for a clearer daylight close-up photo of the crop leaf or plant.
3. If the plant/crop/leaf looks healthy and normal with no visible disease spots, lesions, blight, rust, mildew, yellowing, mosaic, wilt, or pest damage:
   - Set "status": "Healthy"
   - Set "severity": "None"
   - Set "diseaseName": ""
   - Set "healthScore" between 85 and 98.
4. If genuine disease symptoms are visible:
   - Set "status": "Infected"
   - Set "severity" to "Mild", "Moderate", or "Severe"
   - Set "healthScore" between 20 and 72 based on severity
   - Clearly explain visible symptoms, likely causes, practical prevention, treatment (organic + recommended agricultural options), and when to consult a local Krishi Vigyan Kendra (KVK) or agronomist.
5. Keep all JSON keys in English, and write all human-readable values in ${langDesc}.`;

      const response = await generateContentResilient({
        model: MODEL_FAST,
        contents: {
          parts: [
            { inlineData: { mimeType, data } },
            {
              text: `Identify the exact crop, plant, or flower name shown in this photograph, provide its English name and botanical scientific name, and check whether it is healthy or has any crop disease. Return valid JSON matching the schema.`,
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              plantName: { type: Type.STRING, description: "Specific identified crop, plant, or flower name in the requested language" },
              englishPlantName: { type: Type.STRING, description: "Specific common English name of the crop or plant (e.g., Tomato, Cotton, Wheat)" },
              scientificName: { type: Type.STRING, description: "Botanical scientific name (e.g., Solanum lycopersicum)" },
              plantType: { type: Type.STRING, description: "e.g., Cereal Crop, Cash Crop, Vegetable, Fruit, Flower, Medicinal Plant" },
              imageEvidenceSufficient: { type: Type.BOOLEAN },
              status: { type: Type.STRING, description: "Must be one of: Healthy, Infected, Uncertain" },
              severity: { type: Type.STRING, description: "Must be one of: None, Mild, Moderate, Severe" },
              healthScore: { type: Type.INTEGER, description: "0 to 100" },
              confidence: { type: Type.INTEGER, description: "0 to 100" },
              diseaseName: { type: Type.STRING, description: "Disease name if infected, else empty string" },
              symptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
              possibleCauses: { type: Type.ARRAY, items: { type: Type.STRING } },
              diagnosisDetails: { type: Type.STRING },
              prevention: { type: Type.ARRAY, items: { type: Type.STRING } },
              treatment: { type: Type.ARRAY, items: { type: Type.STRING } },
              consultExpertAdvice: { type: Type.STRING },
              plantInfo: {
                type: Type.OBJECT,
                properties: {
                  overview: { type: Type.STRING },
                  sunlight: { type: Type.STRING },
                  watering: { type: Type.STRING },
                  soilType: { type: Type.STRING },
                  idealTemperature: { type: Type.STRING },
                  season: { type: Type.STRING },
                },
              },
            },
            required: [
              "plantName",
              "englishPlantName",
              "scientificName",
              "imageEvidenceSufficient",
              "status",
              "severity",
              "healthScore",
              "confidence",
              "diagnosisDetails",
              "prevention",
              "treatment",
              "consultExpertAdvice",
            ],
          },
        },
      });

      const cleanedJson = cleanJsonText(response.text);
      const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleanedJson);

      // Guarantee a clear, non-empty plant name is always returned
      if (!parsed.plantName || !String(parsed.plantName).trim()) {
        parsed.plantName = parsed.englishPlantName || parsed.scientificName || "Unidentified Plant";
      }
      if (!parsed.englishPlantName || !String(parsed.englishPlantName).trim()) {
        parsed.englishPlantName = parsed.plantName;
      }

      // Normalize status cleanly while preserving Uncertain
      const rawStatus = String(parsed.status || "").toLowerCase();
      if (parsed.imageEvidenceSufficient === false || rawStatus.includes("uncertain")) {
        parsed.status = "Uncertain";
        parsed.confidence = Math.min(Number(parsed.confidence) || 40, 55);
      } else if (rawStatus.includes("infect") || rawStatus.includes("diseas")) {
        parsed.status = "Infected";
        parsed.healthScore = Math.min(Math.max(Number(parsed.healthScore) || 50, 15), 75);
      } else {
        parsed.status = "Healthy";
        parsed.severity = "None";
        parsed.diseaseName = "";
        parsed.healthScore = Math.min(Math.max(Number(parsed.healthScore) || 92, 80), 99);
      }

      res.json(parsed);
    } catch (error: any) {
      console.error("Server plant analysis error:", error);
      const { statusCode, message } = formatApiError(
        error,
        "Unable to analyze the plant image right now. Please check your internet connection and try again."
      );
      res.status(statusCode).json({ error: message });
    }
  });

  // 1b. AI Flower Detection & Floriculture Care
  app.post("/api/analyze-flower", async (req, res) => {
    try {
      const { base64Image, language = "en" } = req.body;
      if (!base64Image) {
        return res.status(400).json({ error: "Please upload or capture a flower photo." });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "Gemini AI service is not configured on the server." });
      }

      const { mimeType, data } = parseDataUrl(base64Image);
      const langDesc = getLanguagePrompt(language);

      const systemInstruction = `You are an expert Indian botanist and floriculture specialist.
Analyze the uploaded photograph carefully and truthfully.
Respond in ${langDesc}.

STRICT RULES:
1. FLOWER IDENTIFICATION IS MANDATORY:
   - Identify the SPECIFIC flower shown (e.g., Marigold / Genda / Zendu, Rose / Gulab, Jasmine / Mogra / Chameli, Hibiscus / Gudhal / Jaswand, Chrysanthemum / Shevanti, Tuberose / Nishigandha / Rajnigandha, Lotus / Kamal, Sunflower / Suryaphool, Gerbera, Gladiolus, Periwinkle / Sadafuli, Frangipani / Chafa, Bougainvillea, Orchid, Lily, Dahlia, Zinnia, Tulip, etc.).
   - Always fill "flowerName" with the clear specific name in ${langDesc}.
   - Always fill "englishFlowerName" with the standard English common name (e.g., "Marigold", "Rose", "Hibiscus").
   - Always fill "scientificName" with the botanical Latin name (e.g., "Tagetes erecta", "Rosa indica").
   - NEVER return vague placeholders like "Flower" or "Unknown" when a recognizable bloom is visible. Give your best botanical match and reflect certainty honestly via confidence %.
2. Only if no flower/plant is visible or the image is completely unreadable:
   - Set "imageEvidenceSufficient": false, "healthStatus": "Uncertain", and "confidence" below 45.
3. Also check if petals or nearby leaves show any flower diseases or pests (petal blight, powdery mildew, black spot, thrips, aphids, spider mites) and set "healthStatus" to "Healthy", "Infected", or "Uncertain".
4. Provide practical Indian floriculture details: blooming season, sunlight, watering, soil, temperature, commercial/puja/medicinal uses, and care tips.
5. Keep JSON keys in English and human-readable values in ${langDesc}.`;

      const response = await generateContentResilient({
        model: MODEL_FAST,
        contents: {
          parts: [
            { inlineData: { mimeType, data } },
            {
              text: "Identify the exact flower in this photograph, including its common name, English name, scientific name, botanical family, petal color, health/disease check, blooming season, uses, and care tips. Return valid JSON.",
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              flowerName: { type: Type.STRING },
              englishFlowerName: { type: Type.STRING },
              scientificName: { type: Type.STRING },
              family: { type: Type.STRING },
              color: { type: Type.STRING },
              imageEvidenceSufficient: { type: Type.BOOLEAN },
              confidence: { type: Type.INTEGER },
              healthStatus: { type: Type.STRING, description: "Healthy, Infected, or Uncertain" },
              diseaseOrPest: { type: Type.STRING, description: "Detected flower disease/pest name if infected, else empty string" },
              overview: { type: Type.STRING },
              bloomingSeason: { type: Type.STRING },
              sunlight: { type: Type.STRING },
              watering: { type: Type.STRING },
              soilType: { type: Type.STRING },
              idealTemperature: { type: Type.STRING },
              usesAndMarketValue: { type: Type.STRING },
              careTips: { type: Type.ARRAY, items: { type: Type.STRING } },
              treatment: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              "flowerName",
              "englishFlowerName",
              "scientificName",
              "imageEvidenceSufficient",
              "confidence",
              "healthStatus",
              "overview",
              "bloomingSeason",
              "usesAndMarketValue",
              "careTips",
            ],
          },
        },
      });

      const cleanedJson = cleanJsonText(response.text);
      const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleanedJson);

      if (!parsed.flowerName || !String(parsed.flowerName).trim()) {
        parsed.flowerName = parsed.englishFlowerName || parsed.scientificName || "Unidentified Flower";
      }
      if (!parsed.englishFlowerName || !String(parsed.englishFlowerName).trim()) {
        parsed.englishFlowerName = parsed.flowerName;
      }

      const rawStatus = String(parsed.healthStatus || "").toLowerCase();
      if (parsed.imageEvidenceSufficient === false || rawStatus.includes("uncertain")) {
        parsed.healthStatus = "Uncertain";
        parsed.confidence = Math.min(Number(parsed.confidence) || 40, 55);
      } else if (rawStatus.includes("infect") || rawStatus.includes("diseas") || rawStatus.includes("pest")) {
        parsed.healthStatus = "Infected";
      } else {
        parsed.healthStatus = "Healthy";
        parsed.diseaseOrPest = "";
      }

      res.json(parsed);
    } catch (error: any) {
      console.error("Server flower analysis error:", error);
      const { statusCode, message } = formatApiError(
        error,
        "Unable to identify the flower right now. Please try again."
      );
      res.status(statusCode).json({ error: message });
    }
  });

  // 2. AI Pest Detection
  app.post("/api/analyze-pest", async (req, res) => {
    try {
      const { base64Image, language = "en" } = req.body;
      if (!base64Image) {
        return res.status(400).json({ error: "Please upload or capture a pest/insect photo." });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "Gemini AI service is not configured on the server." });
      }

      const { mimeType, data } = parseDataUrl(base64Image);
      const langDesc = getLanguagePrompt(language);

      const systemInstruction = `You are an Indian agricultural entomologist and Integrated Pest Management (IPM) specialist.
Inspect the image to identify any agricultural insect, caterpillar, beetle, aphid, whitefly, bollworm, thrips, mite, locust, or pest.
Respond in ${langDesc}.
If the image is unclear or does not clearly show an insect/pest, set "imageEvidenceSufficient": false and explain honestly without guessing.
Keep JSON keys in English and human-readable text in ${langDesc}.`;

      const response = await generateContentResilient({
        model: MODEL_FAST,
        contents: {
          parts: [
            { inlineData: { mimeType, data } },
            { text: "Identify the insect or crop pest in this photograph and provide damage, affected crops, prevention, and IPM recommendations." },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              pestName: { type: Type.STRING },
              scientificName: { type: Type.STRING },
              pestType: { type: Type.STRING, description: "e.g., Sucking Pest, Chewing Pest, Borer, Beneficial Insect, Unclear" },
              imageEvidenceSufficient: { type: Type.BOOLEAN },
              confidence: { type: Type.INTEGER },
              severity: { type: Type.STRING, description: "Low, Medium, High, or None" },
              damageCaused: { type: Type.STRING },
              affectedCrops: { type: Type.ARRAY, items: { type: Type.STRING } },
              preventionMethods: { type: Type.ARRAY, items: { type: Type.STRING } },
              ipmRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
              consultExpertAdvice: { type: Type.STRING },
            },
            required: [
              "pestName",
              "imageEvidenceSufficient",
              "confidence",
              "severity",
              "damageCaused",
              "affectedCrops",
              "preventionMethods",
              "ipmRecommendations",
              "consultExpertAdvice",
            ],
          },
        },
      });

      res.json(JSON.parse(cleanJsonText(response.text)));
    } catch (error: any) {
      console.error("Server pest analysis error:", error);
      const { statusCode, message } = formatApiError(
        error,
        "Unable to analyze the pest image right now. Please try again."
      );
      res.status(statusCode).json({ error: message });
    }
  });

  // 3. Contextual AI Farming Chatbot
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, messages, language = "en" } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "Gemini AI service is not configured on the server." });
      }

      const langDesc = getLanguagePrompt(language);
      const systemInstruction = `You are Agri SmartAI, a practical, friendly agricultural assistant helping Indian farmers.
Respond ONLY in ${langDesc}.
- Answer clearly using short paragraphs and numbered or bulleted practical steps.
- Help with crop diseases, pests, fertilizers, irrigation, sowing, harvesting, and Indian farming practices.
- Keep language simple, natural, and suitable for reading aloud (avoid markdown clutter like ** or ### symbols so voice read-aloud sounds natural).
- When severe crop loss or chemical dosage is involved, advise confirming exact dosage with a local Krishi Kendra or agriculture officer.`;

      // Build conversation contents preserving context
      const historyContents = Array.isArray(messages) && messages.length > 0
        ? messages.slice(-12).map((m: { role: string; text: string }) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: String(m.text || "") }],
          }))
        : [{ role: "user", parts: [{ text: String(message || "") }] }];

      const response = await generateContentResilient({
        model: MODEL_FAST,
        contents: historyContents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      res.json({ text: response.text || "" });
    } catch (error: any) {
      console.error("Server chat error:", error);
      const { statusCode, message } = formatApiError(
        error,
        "Could not get a response from the farming assistant right now. Please try again."
      );
      res.status(statusCode).json({ error: message });
    }
  });

  // 4. Real Weather Information (Open-Meteo Geocoding + Forecast API — Live Data Only)
  app.get("/api/weather", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      const latParam = req.query.lat ? Number(req.query.lat) : null;
      const lngParam = req.query.lng ? Number(req.query.lng) : null;
      const language = String(req.query.language || "en");

      let latitude: number;
      let longitude: number;
      let resolvedName = q || "Your Location";
      let adminRegion = "";

      if (latParam !== null && lngParam !== null && !isNaN(latParam) && !isNaN(lngParam)) {
        latitude = latParam;
        longitude = lngParam;
        // Try reverse-like lookup via BigDataCloud free endpoint or show coordinates cleanly
        try {
          const revRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (revRes.ok) {
            const rev = await revRes.json();
            resolvedName = rev.city || rev.locality || rev.principalSubdivision || resolvedName;
            adminRegion = [rev.principalSubdivision, rev.countryName].filter(Boolean).join(", ");
          }
        } catch {
          // Non-fatal; keep coordinate label
        }
      } else {
        const searchLocation = q || "Pune, India";
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          searchLocation
        )}&count=5&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        if (!geoRes.ok) {
          return res.status(502).json({ error: "Weather location service is temporarily unavailable." });
        }
        const geoData = await geoRes.json();
        const results = Array.isArray(geoData.results) ? geoData.results : [];
        if (results.length === 0) {
          return res.status(404).json({
            error:
              language === "hi"
                ? `"${searchLocation}" स्थान नहीं मिला। कृपया जिला या शहर का नाम लिखें (जैसे नाशिक, पुणे, नागपुर, इंदौर)।`
                : language === "mr"
                ? `"${searchLocation}" हे ठिकाण सापडले नाही. कृपया शहर किंवा जिल्ह्याचे नाव लिहा (उदा. नाशिक, पुणे, नागपूर, कोल्हापूर).`
                : `Location "${searchLocation}" was not found. Please enter an Indian city or district name (e.g., Pune, Nashik, Nagpur, Indore).`,
          });
        }
        const preferred = results.find((r: any) => r.country_code === "IN") || results[0];
        latitude = preferred.latitude;
        longitude = preferred.longitude;
        resolvedName = preferred.name;
        adminRegion = [preferred.admin1, preferred.country].filter(Boolean).join(", ");
      }

      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=7`;
      const weatherRes = await fetch(forecastUrl);
      if (!weatherRes.ok) {
        return res.status(502).json({ error: "Live weather API is currently unavailable." });
      }
      const wData = await weatherRes.json();

      const current = {
        temperature: Math.round(wData.current.temperature_2m),
        humidity: Math.round(wData.current.relative_humidity_2m),
        windSpeed: Math.round(wData.current.wind_speed_10m),
        precipitation: Number(wData.current.precipitation || 0),
        weatherCode: Number(wData.current.weather_code || 0),
        condition: weatherCodeToLabel(Number(wData.current.weather_code || 0), language),
        time: wData.current.time,
      };

      const daily = (wData.daily?.time || []).map((date: string, i: number) => ({
        date,
        maxTemp: Math.round(wData.daily.temperature_2m_max[i]),
        minTemp: Math.round(wData.daily.temperature_2m_min[i]),
        rainfallMm: Number((wData.daily.precipitation_sum[i] || 0).toFixed(1)),
        rainChance: Number(wData.daily.precipitation_probability_max?.[i] ?? 0),
        maxWind: Math.round(wData.daily.wind_speed_10m_max?.[i] ?? 0),
        weatherCode: Number(wData.daily.weather_code[i] || 0),
        condition: weatherCodeToLabel(Number(wData.daily.weather_code[i] || 0), language),
      }));

      // Real heavy rainfall alerts directly derived from Open-Meteo precipitation forecast
      const heavyRainDays = daily.filter(
        (d: any) => d.rainfallMm >= 20 || [65, 82, 95, 96, 99].includes(d.weatherCode)
      );

      // Generate practical weather-based farming suggestions using Gemini (or deterministic agronomic rules if AI busy)
      let farmingSuggestions: string[] = [];
      if (process.env.GEMINI_API_KEY) {
        try {
          const langDesc = getLanguagePrompt(language);
          const aiRes = await generateContentResilient({
            model: MODEL_FAST,
            contents: `Based ONLY on this real live weather forecast for ${resolvedName}, ${adminRegion}:
Current: ${current.temperature}°C, Humidity ${current.humidity}%, Wind ${current.windSpeed} km/h, Rain ${current.precipitation}mm (${current.condition}).
Next 3 days rainfall: ${daily
              .slice(0, 3)
              .map((d: any) => `${d.date}: ${d.rainfallMm}mm (${d.rainChance}% chance), ${d.minTemp}-${d.maxTemp}°C`)
              .join("; ")}.
Give 4 short, practical farming suggestions for Indian farmers in ${langDesc}. Return JSON { "suggestions": string[] }.`,
            config: {
              responseMimeType: "application/json",
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["suggestions"],
              },
            },
          });
          const parsedSuggestions = JSON.parse(cleanJsonText(aiRes.text));
          if (Array.isArray(parsedSuggestions.suggestions)) {
            farmingSuggestions = parsedSuggestions.suggestions;
          }
        } catch (err) {
          console.warn("Weather suggestion Gemini call skipped:", err);
        }
      }

      if (farmingSuggestions.length === 0) {
        if (heavyRainDays.length > 0) {
          farmingSuggestions.push(
            language === "hi"
              ? "तेज बारिश की संभावना है — खेत में जल निकासी की नालियां साफ रखें और कीटनाशक छिड़काव टालें।"
              : language === "mr"
              ? "मुसळधार पावसाची शक्यता आहे — शेतातील पाण्याचा निचरा होण्यासाठी चर मोकळे ठेवा आणि फवारणी पुढे ढकला."
              : "Heavy rain is forecast — keep field drainage channels clear and postpone pesticide or fertilizer spraying."
          );
        }
        if (current.temperature >= 35) {
          farmingSuggestions.push(
            language === "hi"
              ? "तापमान अधिक है — सुबह या शाम को हल्की सिंचाई करें और नमी बचाने के लिए मल्चिंग का उपयोग करें।"
              : language === "mr"
              ? "तापमान जास्त आहे — सकाळी किंवा संध्याकाळी सिंचन करा आणि ओलावा टिकवण्यासाठी आच्छादन (मल्चिंग) वापरा."
              : "High temperature — irrigate during early morning or evening and use organic mulch to conserve soil moisture."
          );
        }
        if (current.humidity >= 75) {
          farmingSuggestions.push(
            language === "hi"
              ? "अधिक नमी के कारण फफूंद रोग बढ़ सकते हैं — पत्तों की नियमित जांच करें।"
              : language === "mr"
              ? "जास्त आर्द्रतेमुळे बुरशीजन्य रोगांचा धोका वाढतो — पानांची नियमित तपासणी करा."
              : "High humidity increases fungal disease risk — inspect crop leaves regularly for spots or mildew."
          );
        }
        if (farmingSuggestions.length === 0) {
          farmingSuggestions.push(
            language === "hi"
              ? "मौसम खेत के सामान्य कार्यों जैसे निराई, खाद डालने और फसल निरीक्षण के लिए अनुकूल है।"
              : language === "mr"
              ? "सध्याचे हवामान खुरपणी, खत व्यवस्थापन आणि पीक निरीक्षणासाठी अनुकूल आहे."
              : "Weather conditions are suitable for routine field work, weeding, and timely crop inspection."
          );
        }
      }

      res.json({
        location: {
          name: resolvedName,
          region: adminRegion,
          latitude,
          longitude,
        },
        source: "Open-Meteo Live Weather API",
        fetchedAt: new Date().toISOString(),
        current,
        daily,
        heavyRainAlerts: heavyRainDays.map((d: any) => ({
          date: d.date,
          rainfallMm: d.rainfallMm,
          condition: d.condition,
        })),
        farmingSuggestions,
      });
    } catch (error: any) {
      console.error("Weather API error:", error);
      res.status(502).json({
        error: "Unable to fetch live weather data right now. Please check your internet connection and try again.",
      });
    }
  });

  // 5. Soil Health Analysis (Soil type, pH, N, P, K, Moisture)
  app.post("/api/analyze-soil", async (req, res) => {
    try {
      const {
        soilType = "Black Cotton Soil",
        ph = "6.8",
        nitrogen = "Medium",
        phosphorus = "Medium",
        potassium = "Medium",
        moisture = "45",
        language = "en",
      } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "Gemini AI service is not configured on the server." });
      }

      const langDesc = getLanguagePrompt(language);
      const response = await generateContentResilient({
        model: MODEL_FAST,
        contents: `You are an Indian soil science specialist. Analyze these soil test parameters:
- Soil Type: ${soilType}
- Soil pH: ${ph}
- Nitrogen (N): ${nitrogen}
- Phosphorus (P): ${phosphorus}
- Potassium (K): ${potassium}
- Soil Moisture: ${moisture}%

Provide a clear, farmer-friendly Soil Health Report in ${langDesc} as JSON.`,
        config: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              soilCondition: { type: Type.STRING, description: "Overall soil health status and brief explanation" },
              phStatus: { type: Type.STRING, description: "Acidic / Neutral / Alkaline explanation" },
              nutrientDeficiencies: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvementSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              fertilizerGuidance: { type: Type.STRING },
              suitableCrops: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    reason: { type: Type.STRING },
                  },
                  required: ["name", "reason"],
                },
              },
            },
            required: [
              "soilCondition",
              "phStatus",
              "nutrientDeficiencies",
              "improvementSuggestions",
              "fertilizerGuidance",
              "suitableCrops",
            ],
          },
        },
      });

      res.json(JSON.parse(cleanJsonText(response.text)));
    } catch (error: any) {
      console.error("Soil analysis error:", error);
      const { statusCode, message } = formatApiError(
        error,
        "Unable to analyze soil health right now. Please try again."
      );
      res.status(statusCode).json({ error: message });
    }
  });

  // 6. Crop Recommendation
  app.post("/api/crop-recommendation", async (req, res) => {
    try {
      const {
        location = "Maharashtra",
        soilType = "Black Cotton Soil",
        season = "Kharif",
        rainfall = "Medium (600-1000mm)",
        temperature = "28",
        irrigation = "Partial / Borewell",
        language = "en",
      } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "Gemini AI service is not configured on the server." });
      }

      const langDesc = getLanguagePrompt(language);
      const response = await generateContentResilient({
        model: MODEL_FAST,
        contents: `You are an experienced Indian agronomist. Recommend 4 practical crops suited to these farm conditions:
- Location / Region: ${location}
- Soil Type: ${soilType}
- Season: ${season}
- Expected Rainfall: ${rainfall}
- Average Temperature: ${temperature}°C
- Irrigation Availability: ${irrigation}

Respond in ${langDesc} as structured JSON explaining clearly WHY each crop fits these exact conditions.`,
        config: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    cropName: { type: Type.STRING },
                    suitabilityLevel: { type: Type.STRING, description: "High or Moderate" },
                    expectedDuration: { type: Type.STRING },
                    waterRequirement: { type: Type.STRING },
                    whyRecommended: { type: Type.STRING },
                    sowingTips: { type: Type.STRING },
                  },
                  required: [
                    "cropName",
                    "suitabilityLevel",
                    "expectedDuration",
                    "waterRequirement",
                    "whyRecommended",
                    "sowingTips",
                  ],
                },
              },
            },
            required: ["summary", "recommendations"],
          },
        },
      });

      res.json(JSON.parse(cleanJsonText(response.text)));
    } catch (error: any) {
      console.error("Crop recommendation error:", error);
      const { statusCode, message } = formatApiError(
        error,
        "Unable to generate crop recommendations right now. Please try again."
      );
      res.status(statusCode).json({ error: message });
    }
  });

  // 7. Mandi Price Tracker (Agmarknet / data.gov.in live API OR Search-Grounded Agmarknet Lookup — NEVER invents fake prices)
  app.post("/api/mandi-prices", async (req, res) => {
    try {
      const { crop = "Onion", state = "Maharashtra", market = "", language = "en" } = req.body;

      // Option A: Official Government data.gov.in Agmarknet API if key is present in env
      const dataGovKey = process.env.DATA_GOV_API_KEY;
      if (dataGovKey) {
        const params = new URLSearchParams({
          "api-key": dataGovKey,
          format: "json",
          limit: "20",
          "filters[commodity]": crop,
        });
        if (state) params.set("filters[state]", state);
        if (market) params.set("filters[market]", market);

        const govUrl = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?${params.toString()}`;
        const govRes = await fetch(govUrl);
        if (govRes.ok) {
          const govData = await govRes.json();
          const records = Array.isArray(govData.records) ? govData.records : [];
          if (records.length > 0) {
            return res.json({
              available: true,
              sourceName: "Government of India — Agmarknet (data.gov.in)",
              sourceUrls: [{ title: "Agmarknet Official Portal", uri: "https://agmarknet.gov.in" }],
              lastUpdated: records[0].arrival_date || new Date().toISOString().slice(0, 10),
              records: records.map((r: any) => ({
                crop: r.commodity || crop,
                variety: r.variety || "General",
                market: r.market || "APMC Market",
                district: r.district || "",
                state: r.state || state,
                minPrice: Number(r.min_price) || null,
                maxPrice: Number(r.max_price) || null,
                modalPrice: Number(r.modal_price) || null,
                unit: "₹ / Quintal",
                arrivalDate: r.arrival_date || "",
              })),
            });
          }
        }
      }

      // Option B: Live Google Search Grounding strictly targeting Agmarknet / e-NAM / APMC reports
      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          available: false,
          message:
            "Live Agmarknet / Mandi price API is currently unavailable. Please check the official Agmarknet portal directly.",
          officialLinks: [
            { title: "Agmarknet Official Portal", uri: "https://agmarknet.gov.in" },
            { title: "e-NAM National Agriculture Market", uri: "https://enam.gov.in" },
          ],
        });
      }

      const langDesc = getLanguagePrompt(language);
      const marketFilter = market ? `in ${market} market, ` : "";
      const prompt = `Search Agmarknet (agmarknet.gov.in), e-NAM (enam.gov.in), or official Indian APMC mandi price bulletins for the latest reported wholesale prices (in ₹ per Quintal) of "${crop}" ${marketFilter}${state}, India.

CRITICAL HONESTY RULES:
- ONLY report prices that appear in actual search results.
- NEVER invent, guess, or fabricate mandi prices.
- If no verified recent market prices are found in search results, output JSON with "available": false and empty "records": [].
- Return ONLY a valid JSON object (no markdown fences) with this exact structure:
{
  "available": boolean,
  "lastUpdated": "YYYY-MM-DD or reported date from source",
  "note": "Short summary in ${langDesc}",
  "records": [
    {
      "crop": "string",
      "variety": "string",
      "market": "Market / APMC name",
      "district": "District",
      "state": "State",
      "minPrice": number,
      "maxPrice": number,
      "modalPrice": number,
      "unit": "₹ / Quintal",
      "arrivalDate": "reported date"
    }
  ]
}`;

      const response = await generateContentResilient({
        model: MODEL_FAST,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sourceUrls = groundingChunks
        .filter((c: any) => c.web?.uri)
        .map((c: any) => ({
          title: c.web.title || "Market Price Source",
          uri: c.web.uri,
        }));

      const rawText = cleanJsonText(response.text);
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      let parsed: any = { available: false, records: [] };
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          parsed = { available: false, records: [] };
        }
      }

      // Only treat prices as verified if both records AND web grounding sources exist
      const validRecords = Array.isArray(parsed.records)
        ? parsed.records.filter(
            (r: any) =>
              r &&
              r.market &&
              (typeof r.modalPrice === "number" ||
                typeof r.minPrice === "number" ||
                typeof r.maxPrice === "number")
          )
        : [];

      if (!parsed.available || validRecords.length === 0 || sourceUrls.length === 0) {
        return res.json({
          available: false,
          message:
            language === "hi"
              ? `"${crop}" (${state}) के लिए सत्यापित लाइव मंडी भाव अभी प्राप्त नहीं हो सके। हम अनुमानित भाव नहीं दिखाते — कृपया नीचे दिए गए आधिकारिक Agmarknet या e-NAM पोर्टल पर देखें।`
              : language === "mr"
              ? `"${crop}" (${state}) साठी सत्यापित थेट बाजार भाव सध्या उपलब्ध होऊ शकले नाहीत. आम्ही अंदाजे किंवा खोटे भाव दाखवत नाही — कृपया खालील अधिकृत Agmarknet किंवा e-NAM पोर्टलवर पहा.`
              : `Verified live mandi prices for "${crop}" in ${state} could not be fetched right now. We never display fabricated prices — please check the official Agmarknet or e-NAM portals below.`,
          officialLinks: [
            { title: "Agmarknet (Govt. of India)", uri: "https://agmarknet.gov.in" },
            { title: "e-NAM National Agriculture Market", uri: "https://enam.gov.in" },
          ],
        });
      }

      res.json({
        available: true,
        sourceName: "Live Search Grounded (Agmarknet / APMC Bulletins)",
        sourceUrls: sourceUrls.slice(0, 5),
        lastUpdated: parsed.lastUpdated || validRecords[0]?.arrivalDate || new Date().toISOString().slice(0, 10),
        note: parsed.note || "",
        records: validRecords,
      });
    } catch (error: any) {
      console.error("Mandi price error:", error);
      res.status(502).json({
        available: false,
        error: "Mandi price service is temporarily unavailable. Please try again or visit agmarknet.gov.in.",
        officialLinks: [
          { title: "Agmarknet (Govt. of India)", uri: "https://agmarknet.gov.in" },
          { title: "e-NAM National Agriculture Market", uri: "https://enam.gov.in" },
        ],
      });
    }
  });

  // 8. Built-in Hindi, Marathi & Indian English AI Voice Pack (Gemini TTS)
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, language = "en", voiceName = "Kore" } = req.body || {};
      const cleaned = String(text || "")
        .replace(/[*#_`~]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1200);

      if (!cleaned) {
        return res.status(400).json({ error: "No text provided for speech synthesis." });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "Voice pack service is not configured on the server." });
      }

      const allowedVoices = new Set(["Kore", "Charon", "Puck", "Fenrir", "Zephyr"]);
      const selectedVoice = allowedVoices.has(String(voiceName)) ? String(voiceName) : "Kore";

      const styleByLang: Record<string, string> = {
        mr: "Natural native Marathi speaker from Maharashtra speaking clearly to a farmer",
        hi: "Natural warm native Hindi speaker speaking clearly to a farmer",
        en: "Clear warm Indian English speaker helping a farmer",
      };
      const style = styleByLang[String(language)] || styleByLang.en;

      const callTts = (withStyle: boolean) =>
        aiTts.models.generateContent({
          model: MODEL_TTS,
          contents: [
            {
              role: "user",
              parts: [
                withStyle
                  ? ({
                      text: cleaned,
                      speechMetadata: { style },
                    } as any)
                  : { text: cleaned },
              ],
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice },
              },
            },
          },
        });

      let response;
      try {
        response = await callTts(true);
      } catch (err: any) {
        const errStatus = Number(err?.status || err?.code || 0);
        if (errStatus === 400 || String(err?.message || "").includes("speechMetadata")) {
          response = await callTts(false);
        } else if (isTransientDemandError(err)) {
          await new Promise((r) => setTimeout(r, 700));
          response = await callTts(true);
        } else {
          throw err;
        }
      }

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const base64Audio = inlineData?.data;
      if (!base64Audio) {
        return res.status(502).json({ error: "Voice pack returned empty audio. Please try again." });
      }

      res.json({
        audioBase64: base64Audio,
        mimeType: inlineData?.mimeType || "audio/wav",
        language: String(language),
        voiceName: selectedVoice,
      });
    } catch (error: any) {
      console.error("Server TTS voice pack error:", error?.status, error?.message);
      const { statusCode, message } = formatApiError(
        error,
        "Built-in voice pack is temporarily unavailable. Please try again."
      );
      res.status(statusCode).json({ error: message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Agri SmartAI server running on http://localhost:${PORT}`);
  });
}

startServer();
