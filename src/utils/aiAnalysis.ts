import { getProviderById, getApiKeyForProvider, AI_PROVIDERS } from "./aiProviders";

const GENERAL_SYSTEM_PROMPT = `Eres un Gran Maestro de ajedrez analista profesional. Responde siempre en espanol latino.

REGLAS:
1. Todo en espanol latino. Piezas en espanol: rey, dama, torre, alfil, caballo, peon.
2. Nombra a los jugadores por su nombre extraido del PGN. No digas "las blancas mueven peon a c4". Di "[NombreJugador] responde con peon a c4". Usa siempre el nombre del jugador que realizo la jugada.
3. Analiza cada jugada en contexto posicional y tactico.
4. Senala errores reales con la jugada mejor.
5. Sin simbolos #, *, -, /, >, <, [, ], {, } ni markdown. Todo texto plano.
6. NUNCA uses bold (**), asterisks (*), or any markdown formatting. Use plain text only.
7. NUNCA uses English words like "White", "Black", "checkmate". Use Spanish: "blancas", "negras", "jaque mate".
8. NUNCA uses symbols like #, *, -, /, >, <, [, ], {, }. Use only Spanish words and punctuation.

ESTRUCTURA OBLIGATORIA (EN ESTE ORDEN ESTRICTO):

1. CABECERA
Identifica los jugadores desde los metadatos del PGN ([White "Nombre"] / [Black "Nombre"]). Indica quien jugo con blancas y negras.

2. ANALISIS CRONOLOGICO JUGADA POR JUGADA
Analiza CADA jugada en orden cronologico, desde la primera hasta la ultima. Para cada jugada:
- Numero de jugada y quien la realizo ([NombreJugador] responde con [jugada])
- Clasificacion: Teoria, Buena, Imprecision, Error, Error Grave, Brillante
- Breve explicacion con contexto posicional o tactico

3. DEBILIDADES Y ERRORES
Identifica los momentos clave donde un jugador perdio ventaja. Errores recurrentes. Malos habitos detectados. Predice que habria pasado con la jugada correcta.

4. FORTALEZAS Y JUGADAS EXCELENTES
Que hizo bien cada jugador. Jugadas brillantes, notables o precisas. Patrones de juego positivos.

5. ELO ESTIMADO
Estima el nivel ELO aproximado de cada jugador basandote en la calidad de las jugadas.

6. DONDE MEJORAR
Recomendaciones personalizadas para cada jugador. Que aspectos trabajar.

7. CONCLUSION FINAL
Cierre conciso con el veredicto general de la partida.`;

const TECHNICAL_SYSTEM_PROMPT = `Eres un Gran Maestro de ajedrez especialista en analisis tecnico profundo. Responde siempre en espanol latino.

REGLAS:
1. Todo en espanol latino. Piezas en espanol: rey, dama, torre, alfil, caballo, peon.
2. Enfocate en aspectos tactics y posicionales profundos.
3. Sin simbolos #, *, -, /, >, <, [, ], {, } ni markdown. Todo texto plano.
4. No repitas nada del analisis general. Eres complementario.

ESTRUCTURA OBLIGATORIA:

VALORACION DEL CAMBIO
Quien gana ventaja tras cada cambio de piezas. Analiza si los cambios favorecieron a blancas o negras.

CONTRAATAQUE E INICIATIVA
Cándo un jugador gana la iniciativa tras un cambio. Momentos en que el rival pierde el control.

ATRACCION
Cándo se obliga a una pieza enemiga a ir a una casilla vulnerable. Trampas posicionales.

CAMBIO DESFAVORABLE
Cándo un jugador acepta un cambio que empeora su posicion. Errores de evaluacion.

CESION DE LA INICIATIVA
Cándo se gana material pero se cede el turno. Compromisos materiales vs posicionales.

LA PIEZA ACTIVA DOMINANTE
Que pieza queda en mejor casilla tras un cambio. Valoracion de piezas activas.

DESVIACION Y ERRORES TACTICOS
Cándo capturar es un error tactico directo. Desviaciones forzadas.

CALIDAD DEL CALCULO
Precision de ambos jugadores en momentos criticos. Calculo profundo vs jugadas de intuicion.

CONCLUSION TECNICA
Veredicto tactico y posicional de la partida.`;

export interface AIAnalysisResult {
  general: string;
  technical: string;
}

function buildAnalysisRequest(
  systemPrompt: string,
  userContent: string,
  model: string
): { url: string; headers: Record<string, string>; body: any } | null {
  const providerId = model.split("::")[0] || "";
  const modelId = model.split("::")[1] || "";

  const provider = getProviderById(providerId);
  if (!provider) return null;

  const apiKey = getApiKeyForProvider(providerId);
  const customUrl = localStorage.getItem("chess_aiCustomUrl") || "";

  const url = providerId === "custom" ? customUrl : provider.baseUrl;

  if (!url) return null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  if (providerId === "openrouter") {
    headers["HTTP-Referer"] = window.location.origin;
    headers["X-Title"] = "GM-3000 Chess Analysis";
  }

  const body: any = {
    model: modelId,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  };

  return { url, headers, body };
}

// Detecta si estamos en navegador (necesita proxy CORS) vs Electron (sin CORS)
function isBrowserMode(): boolean {
  return typeof window !== 'undefined' && !(window as any).process?.type;
}

// Wrapper fetch que usa proxy local en navegador para evitar CORS
async function aiFetch(
  request: { url: string; headers: Record<string, string>; body: any },
  signal?: AbortSignal
): Promise<Response> {
  if (isBrowserMode()) {
    const proxyResponse = await fetch('/api/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: request.url,
        headers: request.headers,
        requestBody: request.body,
      }),
      signal,
    });
    return proxyResponse;
  }
  return fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body),
    signal,
  });
}

export async function runGeneralAnalysis(
  pgn: string,
  userSide: "white" | "black" | "auto",
  providerId: string,
  modelId: string,
  customUrl?: string,
  whiteName?: string,
  blackName?: string
): Promise<string> {
  const compositeModel = `${providerId}::${modelId}`;

  const prioritizedName = userSide === "white"
    ? (whiteName || "Blancas")
    : userSide === "black"
    ? (blackName || "Negras")
    : undefined;

  const priorityNote = prioritizedName
    ? `\n[PRIORIDAD DEL USUARIO: Enfoca el analisis desde la perspectiva de ${prioritizedName}. Analiza sus decisiones, aciertos y errores con mayor detalle. Presta atencion especial a las jugadas de ${prioritizedName} y proporciona recomendaciones centradas en el.]\n`
    : "\n[PRIORIDAD DEL USUARIO: Analiza ambos bandos por igual.]\n";

  const userContent = `${priorityNote}\n${pgn}`;

  const request = buildAnalysisRequest(
    GENERAL_SYSTEM_PROMPT,
    userContent,
    compositeModel
  );

  if (!request) {
    return "Error: No se pudo configurar la API. Verifica la configuracion de IA en Ajustes.";
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const response = await aiFetch(request, controller.signal);

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return `Error de la API (${response.status}): ${errorText || response.statusText}. Verifica tu API key en Ajustes.`;
    }

    let data: any;
    try {
      const responseText = await response.text();
      data = JSON.parse(responseText);
    } catch {
      return "Error: La respuesta de la API no es un JSON valido. Verifica la URL del endpoint y que el modelo sea compatible con OpenAI Chat Completions.";
    }
    const provider = getProviderById(providerId);
    let result = provider?.responseParser(data);

    if (!result) {
      return "Error: No se pudo interpretar la respuesta de la API.";
    }

    result = result.replace(/\[?User Safety:\s*safe\]?/gi, '').trim();
    if (result.startsWith(']')) {
      result = result.substring(1).trim();
    }

    return result;
  } catch (error: any) {
    if (error.name === "AbortError") {
      return "Error: La API tardo demasiado en responder (30s timeout). Intenta con un modelo mas rapido.";
    }
    return `Error de conexion: ${error.message || "Desconocido"}. Verifica tu conexion y configuracion de API.`;
  }
}

export async function runTechnicalAnalysis(
  pgn: string,
  generalAnalysis: string,
  providerId: string,
  modelId: string,
  customUrl?: string
): Promise<string> {
  const compositeModel = `${providerId}::${modelId}`;
  const userContent = generalAnalysis
    ? `Esta es la partida en PGN:
${pgn}

Y este es el analisis general:
${generalAnalysis}

Ahora haz tu analisis tecnico profundo complementario, sin repetir nada de lo que ya se dijo.`
    : `Esta es la partida en PGN:
${pgn}

Haz tu analisis tecnico profundo complementario.`;

  const request = buildAnalysisRequest(
    TECHNICAL_SYSTEM_PROMPT,
    userContent,
    compositeModel
  );

  if (!request) {
    return "Error: No se pudo configurar la API para el analisis tecnico.";
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const response = await aiFetch(request, controller.signal);

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return `Error de la API tecnica (${response.status}): ${errorText || response.statusText}.`;
    }

    let data: any;
    try {
      const responseText = await response.text();
      data = JSON.parse(responseText);
    } catch {
      return "Error: La respuesta del analisis tecnico no es un JSON valido.";
    }
    const provider = getProviderById(providerId);
    let result = provider?.responseParser(data);

    if (!result) {
      return "Error: No se pudo interpretar la respuesta del analisis tecnico.";
    }

    result = result.replace(/\[?User Safety:\s*safe\]?/gi, '').trim();
    if (result.startsWith(']')) {
      result = result.substring(1).trim();
    }

    return result.trim();
  } catch (error: any) {
    if (error.name === "AbortError") {
      return "Error: El analisis tecnico tardo demasiado (90s timeout).";
    }
    return `Error de conexion en analisis tecnico: ${error.message || "Desconocido"}.`;
  }
}

export function buildPGNFromHistory(
  history: string[],
  historyFens: string[],
  header?: Record<string, string>
): string {
  let pgn = "";

  if (header) {
    Object.entries(header).forEach(([key, value]) => {
      if (value) pgn += `[${key} "${value}"]\n`;
    });
    pgn += "\n";
  }

  let moveText = "";
  for (let i = 0; i < history.length; i++) {
    const moveNum = Math.floor(i / 2) + 1;
    if (i % 2 === 0) {
      moveText += `${moveNum}. `;
    }
    moveText += `${history[i]} `;
  }

  moveText = moveText.trim();
  if (history.length > 0) {
    const lastFen = historyFens[historyFens.length - 1] || "";
    const turn = lastFen.split(" ")[1];
    const isCheckmate = lastFen.includes("#") || history[history.length - 1]?.includes("#");
    if (isCheckmate) {
      moveText += turn === "w" ? " 0-1" : " 1-0";
    }
  }

  pgn += moveText;
  return pgn;
}

const PER_MOVE_SYSTEM_PROMPT = `Eres un Gran Maestro de ajedrez analista profesional. Responde SIEMPRE en espanol latino.

REGLAS ESTRICTAS:
1. Todo en espanol latino. Piezas en espanol: rey, dama, torre, alfil, caballo, peon.
2. Nombra a los jugadores por su nombre extraido del PGN. En el comment, di "[NombreJugador] responde con ...". Ejemplo: "Jorge responde con peon a c4, desarrollo solido" NO "mueve peon a c4".
3. Analiza cada jugada en contexto posicional y tactico.
4. Clasifica cada jugada con precision.
5. Comentarios concisos: MAXIMO 15 palabras por comment.
6. Sin simbolos #, *, -, /, >, <, [, ], {, } ni markdown.
7. Responde SOLO con el JSON array, sin texto adicional antes o despues.

CLASIFICACIONES:
- brilliant: sacrifice excepcional o jugada tactica brillante inesperada
- great: jugada fuerte que refuerza la ventaja o posicion
- best: la mejor jugada disponible en la posicion
- good: jugada solida sin errores significativos
- inaccuracy: imprecision menor que pierde algo de ventaja
- mistake: error claro que pierde ventaja importante
- blunder: error grave que pierde material o la partida
- book: teoria de apertura conocida (primeras 10 jugadas maximo)

FORMATO DE RESPUESTA:
Devuelve UNICAMENTE un JSON array. Ejemplo:
[{"index":0,"classification":"book","comment":"Apertura de teoria, desarrollo normal del caballo"},{"index":1,"classification":"best","comment":"Jugada solida que controla el centro"}]

IMPORTANTE: Tu respuesta DEBE ser un JSON array valido, sin ningun texto antes o despues.`;

export interface PerMoveComment {
  index: number;
  classification: string;
  comment: string;
}

export async function runPerMoveAIAnalysis(
  pgn: string,
  evals: number[],
  moveHistory: string[],
  providerId: string,
  modelId: string,
  customUrl?: string,
  whiteName?: string,
  blackName?: string
): Promise<PerMoveComment[] | null> {
  const compositeModel = `${providerId}::${modelId}`;

  const moveList = moveHistory.map((m, i) => {
    const num = Math.floor(i / 2) + 1;
    const side = i % 2 === 0 ? "B" : "N";
    const evalBefore = evals[i] !== undefined ? (evals[i] / 100).toFixed(2) : "?";
    const evalAfter = evals[i + 1] !== undefined ? (evals[i + 1] / 100).toFixed(2) : "?";
    return `${num}.${side} ${m} (eval: ${evalBefore} -> ${evalAfter})`;
  }).join("\n");

  const userContent = `Partida en PGN:
${pgn}

Evaluaciones del motor (en peones, antes y despues de cada jugada):
${moveList}

Nombres de los jugadores - Blancas: ${whiteName || "Blancas"}, Negras: ${blackName || "Negras"}

Analiza CADA jugada y devuelve el JSON array con index, classification y comment. En cada comment, nombra al jugador que realizo la jugada: "[NombreJugador] responde con ..."`;

  const request = buildAnalysisRequest(
    PER_MOVE_SYSTEM_PROMPT,
    userContent,
    compositeModel
  );

  if (!request) return null;

  // Increase max_tokens for per-move analysis
  request.body.max_tokens = 4096;
  request.body.temperature = 0.5;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const response = await aiFetch(request, controller.signal);

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    let data: any;
    try {
      const responseText = await response.text();
      data = JSON.parse(responseText);
    } catch {
      return null;
    }
    const provider = getProviderById(providerId);
    const raw = provider?.responseParser(data);

    if (!raw) return null;

    // Extract JSON array from response (handle cases where LLM wraps it in text)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) return null;

    // Validate and normalize each entry
    const validClassifications = ["brilliant", "great", "best", "good", "inaccuracy", "mistake", "blunder", "book"];
    const result: PerMoveComment[] = parsed
      .filter((item: any) => item && typeof item.index === "number" && typeof item.comment === "string")
      .map((item: any) => ({
        index: item.index,
        classification: validClassifications.includes(item.classification) ? item.classification : "good",
        comment: String(item.comment).substring(0, 100),
      }));

    return result.length > 0 ? result : null;
  } catch {
    return null;
  }
}

// ============================================================
// PING + FALLBACK SYSTEM
// ============================================================

export interface FallbackInfo {
  originalModel: string;
  usedModel: string;
  originalProvider: string;
  usedProvider: string;
  fellBack: boolean;
  reason?: string;
}

/**
 * Verifica si un modelo esta disponible enviando un request minimo.
 * Retorna true si el modelo responde 200, false si falla.
 */
export async function pingModel(
  providerId: string,
  modelId: string,
  signal?: AbortSignal
): Promise<{ available: boolean; status?: number; error?: string }> {
  const provider = getProviderById(providerId);
  if (!provider) return { available: false, error: "Proveedor no encontrado" };

  const apiKey = getApiKeyForProvider(providerId);
  if (!apiKey) return { available: false, error: "API Key no configurada" };

  const request = buildAnalysisRequest(
    "Responde solo con OK",
    "ping",
    `${providerId}::${modelId}`
  );
  if (!request) return { available: false, error: "No se pudo construir el request" };

  // Request minimo para verificar conectividad
  request.body.max_tokens = 5;
  request.body.temperature = 0;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await aiFetch(request, signal || controller.signal);
    clearTimeout(timeout);

    if (response.ok) return { available: true, status: response.status };

    const errorText = await response.text().catch(() => "");
    return { available: false, status: response.status, error: errorText || response.statusText };
  } catch (err: any) {
    return { available: false, error: err.message || "Error de conexion" };
  }
}

/**
 * Retorna la lista de modelos probables para un proveedor, ordenados por prioridad.
 * El modelo seleccionado va primero, luego los demas del mismo proveedor.
 */
function getModelFallbackOrder(providerId: string, selectedModelId: string): string[] {
  const provider = getProviderById(providerId);
  if (!provider) return [selectedModelId];

  const models = provider.models
    .filter(m => !m.id.includes("tts")) // Excluir modelos TTS del fallback de texto
    .map(m => m.id);

  // Poner el seleccionado primero
  const ordered = [selectedModelId, ...models.filter(m => m !== selectedModelId)];
  return [...new Set(ordered)]; // Sin duplicados
}

/**
 * Ejecuta un analisis con fallback automatico.
 * Si el modelo seleccionado falla, intenta con otros del mismo proveedor,
 * y finalmente con OpenRouter gratis.
 */
export async function runWithFallback<T>(
  fn: (providerId: string, modelId: string) => Promise<T>,
  providerId: string,
  modelId: string,
  onProgress?: (message: string) => void
): Promise<{ result: T | null; fallbackInfo: FallbackInfo }> {
  const provider = getProviderById(providerId);
  const providerName = provider?.name || providerId;
  let lastError = "";

  // 1. Intentar el modelo seleccionado
  onProgress?.(`Probando ${providerName} — ${modelId}...`);
  try {
    const result = await fn(providerId, modelId);
    if (result && result !== "" && !(typeof result === "string" && result.startsWith("Error"))) {
      return {
        result,
        fallbackInfo: {
          originalModel: modelId,
          usedModel: modelId,
          originalProvider: providerName,
          usedProvider: providerName,
          fellBack: false,
        },
      };
    }
    if (typeof result === "string") lastError = result;
  } catch (e: any) {
    lastError = e?.message || "Error desconocido";
  }

  const isAuthError = lastError.includes("(401)") || lastError.includes("(403)");

  // 2. Intentar otros modelos del mismo proveedor (solo si no es error de autenticacion)
  if (!isAuthError) {
    const sameProviderModels = getModelFallbackOrder(providerId, modelId);
    for (const altModel of sameProviderModels) {
      if (altModel === modelId) continue;
      onProgress?.(`Intentando ${providerName} — ${altModel}...`);
      try {
        const result = await fn(providerId, altModel);
        if (result && result !== "" && !(typeof result === "string" && result.startsWith("Error"))) {
          return {
            result,
            fallbackInfo: {
              originalModel: modelId,
              usedModel: altModel,
              originalProvider: providerName,
              usedProvider: providerName,
              fellBack: true,
              reason: `${modelId} no respondio correctamente`,
            },
          };
        }
        if (typeof result === "string") lastError = result;
      } catch (e: any) {
        lastError = e?.message || "Error desconocido";
      }
    }
  } else {
    lastError = `Error de autenticacion (401/403) con ${providerName}. Verifica tu API Key.`;
  }

  // 3. Fallback final: OpenRouter gratis (solo si no es error de auth con OpenRouter)
  if (providerId !== "openrouter") {
    const orModels = ["qwen/qwen3-235b-a22b:free", "meta-llama/llama-4-maverick:free"];
    for (const orModel of orModels) {
      onProgress?.(`Fallback a OpenRouter — ${orModel}...`);
      try {
        const result = await fn("openrouter", orModel);
        if (result && result !== "" && !(typeof result === "string" && result.startsWith("Error"))) {
          return {
            result,
            fallbackInfo: {
              originalModel: modelId,
              usedModel: orModel,
              originalProvider: providerName,
              usedProvider: "OpenRouter (fallback automatico)",
              fellBack: true,
              reason: `${providerName} norespondio. Se uso OpenRouter como respaldo.`,
            },
          };
        }
        if (typeof result === "string") lastError = result;
      } catch (e: any) {
        lastError = e?.message || "Error desconocido";
      }
    }
  }

  return {
    result: null,
    fallbackInfo: {
      originalModel: modelId,
      usedModel: modelId,
      originalProvider: providerName,
      usedProvider: providerName,
      fellBack: false,
      reason: lastError || "Todos los modelos fallaron",
    },
  };
}
