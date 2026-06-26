export interface AIModel {
  id: string;
  name: string;
}

export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  models: AIModel[];
  responseParser: (body: any) => string;
  apiKeyPlaceholder?: string;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "google",
    name: "Google AI Studio (Gemini)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    models: [
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Gratis, 1M contexto)" },
      { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash-Lite (Gratis, límites altos)" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Gratis, legacy)" },
    ],
    responseParser: (body) => body.choices?.[0]?.message?.content || "",
    apiKeyPlaceholder: "AIza...",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    models: [
      { id: "openrouter/free", name: "Auto-Router (Gratis, mejor modelo auto)" },
      { id: "qwen/qwen3-235b-a22b:free", name: "Qwen3 235B MoE (Gratis, 128K ctx)" },
      { id: "meta-llama/llama-4-maverick:free", name: "Llama 4 Maverick (Gratis, 1M ctx)" },
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Gratis, razonamiento)" },
      { id: "deepseek/deepseek-chat-v3-0324:free", name: "DeepSeek V3 Chat (Gratis, chat)" },
    ],
    responseParser: (body) => body.choices?.[0]?.message?.content || "",
    apiKeyPlaceholder: "sk-or-...",
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1/chat/completions",
    models: [
      { id: "nvidia/nemotron-3-ultra-550b-a55b", name: "Nemotron 3 Ultra 550B (El más potente)" },
      { id: "deepseek-ai/deepseek-v4-pro", name: "DeepSeek V4 Pro (Razonamiento avanzado)" },
      { id: "deepseek-ai/deepseek-v4-flash", name: "DeepSeek V4 Flash (Rápido)" },
      { id: "minimax-m3", name: "MiniMax M3 (General)" },
      { id: "minimax-m2.7", name: "MiniMax M2.7 (General)" },
      { id: "mistral-medium-3.5-128b", name: "Mistral Medium 3.5 128B (General)" },
      { id: "step-3.7-flash", name: "Step 3.7 Flash (Rápido)" },
      { id: "kimi-k2.6", name: "Kimi K2.6 (Razonamiento)" },
      { id: "glm-5.1", name: "GLM 5.1 (General)" },
      { id: "gemma-4-31b-it", name: "Gemma 4 31B (Rápido)" },
      { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", name: "Nemotron 3 Nano Omni 30B (Multimodal)" },
      { id: "diffusiongemma-26b-a4b-it", name: "Diffusion Gemma 26B (Especializado)" },
      { id: "nvidia/chatterbox-multilingual-tts", name: "🗣️ Chatterbox TTS Multilingual (Voz)" },
    ],
    responseParser: (body) => body.choices?.[0]?.message?.content || "",
    apiKeyPlaceholder: "nvapi-...",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1/chat/completions",
    models: [
      { id: "gpt-oss-120b", name: "GPT-OSS 120B (Ultra-rápido, 128K ctx)" },
      { id: "qwen-3-235b", name: "Qwen3 235B (Potente, razonamiento)" },
      { id: "llama-3.3-70b", name: "Llama 3.3 70B (Rápido, general)" },
    ],
    responseParser: (body) => body.choices?.[0]?.message?.content || "",
    apiKeyPlaceholder: "csk-...",
  },
  {
    id: "together",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1/chat/completions",
    models: [
      { id: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", name: "Llama 3.1 405B (El más grande)" },
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", name: "Llama 3.3 70B (Rápido, barato)" },
      { id: "MiniMax/MiniMax-M2.7", name: "MiniMax M2.7 (230B, general)" },
      { id: "Qwen/Qwen3.6-Plus", name: "Qwen 3.6 Plus (Balance)" },
    ],
    responseParser: (body) => body.choices?.[0]?.message?.content || "",
    apiKeyPlaceholder: "tok-...",
  },
  {
    id: "custom",
    name: "API Personalizada (OpenAI-compatible)",
    baseUrl: "",
    models: [],
    responseParser: (body) => {
      if (body.choices?.[0]?.message?.content) return body.choices[0].message.content;
      if (body.generated_text) return body.generated_text;
      if (body?.data?.[0]?.generated_text) return body.data[0].generated_text;
      if (typeof body === "string") return body;
      return "";
    },
    apiKeyPlaceholder: "sk-...",
  },
];

export function getApiKeyForProvider(providerId: string): string {
  return localStorage.getItem(`chess_aiApiKey_${providerId}`) || "";
}

export function setApiKeyForProvider(providerId: string, key: string): void {
  localStorage.setItem(`chess_aiApiKey_${providerId}`, key);
}

export function getProviderById(id: string): AIProvider | undefined {
  return AI_PROVIDERS.find((p) => p.id === id);
}

export function getDefaultModel(providerId: string): string {
  const provider = getProviderById(providerId);
  if (!provider || provider.models.length === 0) return "";
  return provider.models[0].id;
}
