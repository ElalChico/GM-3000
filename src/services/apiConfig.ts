// Centraliza la configuración de APIs para análisis de ajedrez
// Permite fallback automático si una API falla

export const API_MODELS = {
  // Modelo primario (análisis general)
  general: {
    primary: {
      name: "Chess.com",
      url: "https://chess-api.com/v1",
      requiresAuth: false,
      method: "POST",
      defaultPayload: (fen: string) => ({ fen, depth: 20 }),
    },
    fallback: {
      name: "Lichess Cloud",
      url: "https://lichess.org/api/cloud/eval",
      requiresAuth: true,
      method: "GET",
      defaultPayload: (fen: string) => ({ fen, multiPv: 3 }),
    },
  },
  
  // Modelo técnico (análisis profundo)
  technical: {
    primary: {
      name: "Stockfish Local",
      url: "http://localhost:3000/api/stockfish", // Usar LAN server
      requiresAuth: false,
      method: "POST",
      defaultPayload: (fen: string) => ({ fen, depth: 30, threads: 4 }),
    },
    fallback: {
      name: "Lichess Masters",
      url: "https://explorer.lichess.org/masters",
      requiresAuth: false,
      method: "GET",
      defaultPayload: (fen: string) => ({ fen }),
    },
  },
};

// Estado inicial de las APIs
export const API_STATUS = {
  general: { active: "primary", lastError: null },
  technical: { active: "primary", lastError: null },
};

export type ApiKey = keyof typeof API_MODELS;
export type ApiModel = typeof API_MODELS[ApiKey];