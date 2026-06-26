import { API_MODELS, API_STATUS, type ApiKey } from "@/services/apiConfig";

// Tipos para resultados
export type AnalysisResult = {
  evaluation: number; // Centipawns o mate
  bestMoves: Array<{ move: string; eval: number }>;
  depth: number;
  // ...otros campos útiles
};

/**
 * Obtiene el endpoint activo para un tipo de análisis
 */
export const getActiveEndpoint = (apiType: ApiKey) => {
  const status = API_STATUS[apiType];
  return API_MODELS[apiType][status.active];
};

/**
 * Cambia el modelo activo (ej: pasar de Chess.com a Lichess)
 */
export const switchModel = (apiType: ApiKey, model: "primary" | "fallback") => {
  API_STATUS[apiType].active = model;
  API_STATUS[apiType].lastError = null; // Resetear error
};

/**
 * Intenta con el endpoint principal y luego con el fallback
 * @returns AnalysisResult o null si ambos fallan
 */
export const fetchWithFallback = async (
  apiType: ApiKey,
  fen: string,
): Promise<AnalysisResult | null> => {
  const models = API_MODELS[apiType];
  const payload = models.primary.defaultPayload(fen);
  
  // Intentar con el modelo activo primero
  for (const modelKey of [API_STATUS[apiType].active, getOtherModel(modelKey)]) {
    try {
      const model = models[modelKey];
      const result = await attemptFetch(model, payload);
      if (result) return normalizeResult(result, apiType);
    } catch (error) {
      console.error(`[${modelKey}] Error:`, error);
      API_STATUS[apiType].lastError = error.message;
    }
  }
  
  return null;
};

// Helper: Obtener el otro modelo (primary ↔ fallback)
const getOtherModel = (current: "primary" | "fallback"): "primary" | "fallback" => {
  return current === "primary" ? "fallback" : "primary";
};

// Helper: Realizar fetch con manejo de CORS/backend proxy
const attemptFetch = async (api: typeof API_MODELS.general.primary, payload: any) => {
  const { url, method, requiresAuth } = api;
  
  // Modo Electron: usar IPC para evitar CORS
  if (window.electron && !url.includes("localhost")) {
    return await window.electron.ipcRenderer.invoke("proxy-fetch", { url, payload });
  }
  
  // Modo Web: usar URL directa o proxy (Firebase Functions)
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(payload) : undefined,
  }); 
  
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return await response.json();
};

// Normalizar resultados para mantener consistencia
const normalizeResult = (data: any, apiType: ApiKey): AnalysisResult => {
  if (apiType === "general") {
    return {
      evaluation: data.eval || 0,
      bestMoves: data.bestMoves || [],
      depth: data.depth || 0,
    };
  } else {
    // Normalizar análisis técnico (ej: Stockfish)
    return {
      evaluation: data.evaluation?.value || 0,
      bestMoves: data.pvs?.map((pv: any) => ({
        move: pv.moves[0],
        eval: pv.cp || pv.mate || 0,
      })) || [],
      depth: data.depth || 0,
    };
  }
};

/**
 * Reintentar todos los análisis que fallaron
 */
export const retryFailedApis = async (fen: string) => {
  const results: Record<ApiKey, AnalysisResult | null> = {
    general: null,
    technical: null,
  };
  
  await Promise.all(
    Object.keys(API_MODELS).map(async (apiType) => {
      if (API_STATUS[apiType].lastError) {
        results[apiType as ApiKey] = await fetchWithFallback(apiType as ApiKey, fen);
      }
    })
  );
  
  return results;
};