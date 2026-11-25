// Client-side API service communicating with Express server routes (/api/*)

async function postJson<T = any>(url: string, body: Record<string, any>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const analyzePlantImage = async (base64Image: string, language: string) => {
  return postJson("/api/analyze-plant", { base64Image, language });
};

export const analyzeFlowerImage = async (base64Image: string, language: string) => {
  return postJson("/api/analyze-flower", { base64Image, language });
};

export const analyzePestImage = async (base64Image: string, language: string) => {
  return postJson("/api/analyze-pest", { base64Image, language });
};

export const getChatResponse = async (
  messages: { role: "user" | "assistant"; text: string }[],
  language: string
): Promise<string> => {
  const data = await postJson<{ text: string }>("/api/chat", { messages, language });
  return data.text || "";
};

export const fetchLiveWeather = async (params: {
  q?: string;
  lat?: number;
  lng?: number;
  language: string;
}) => {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (typeof params.lat === "number") sp.set("lat", String(params.lat));
  if (typeof params.lng === "number") sp.set("lng", String(params.lng));
  sp.set("language", params.language);

  const res = await fetch(`/api/weather?${sp.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Weather service error (${res.status})`);
  }
  return data;
};

export const analyzeSoilHealth = async (payload: {
  soilType: string;
  ph: string;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  moisture: string;
  language: string;
}) => {
  return postJson("/api/analyze-soil", payload);
};

export const getCropRecommendation = async (payload: {
  location: string;
  soilType: string;
  season: string;
  rainfall: string;
  temperature: string;
  irrigation: string;
  language: string;
}) => {
  return postJson("/api/crop-recommendation", payload);
};

export const fetchMandiPrices = async (payload: {
  crop: string;
  state: string;
  market?: string;
  language: string;
}) => {
  return postJson("/api/mandi-prices", payload);
};
