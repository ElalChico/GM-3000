/**
 * GM-3000 TTS Utility
 * Priority: edge-tts (Electron) → Web Speech API (browser fallback)
 * edge-tts needs Node.js WebSocket with custom headers, so only works in Electron
 */

const DEFAULT_VOICE = "es-MX-DaliaNeural";
const DEFAULT_RATE = "+0%";
const DEFAULT_VOLUME = "+0%";
const DEFAULT_PITCH = "+0Hz";

let audioElement: HTMLAudioElement | null = null;
let isPlayingAudio = false;
let isPausedAudio = false;
let onChunkStartCallback: ((index: number) => void) | null = null;
let onChunkEndCallback: ((index: number) => void) | null = null;
let onAllEndCallback: (() => void) | null = null;
let currentChunks: string[] = [];
let currentChunkIndex = 0;

let _edgeTTSAvailable: boolean | null = null;

function isElectron(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).electronAPI || navigator.userAgent.toLowerCase().includes("electron");
}

async function tryLoadEdgeTTS(): Promise<any | null> {
  // En Electron con IPC bridge, no intentar import (fallará con contextIsolation)
  if (isElectron() && (window as any).electronAPI?.synthesizeSpeech) {
    return null; // synthesizeEdgeTTS usará IPC primero
  }
  if (_edgeTTSAvailable === false) return null;
  if (_edgeTTSAvailable === true) {
    const mod = await import("@andresaya/edge-tts");
    return mod.EdgeTTS;
  }
  try {
    const mod = await import("@andresaya/edge-tts");
    if (mod.EdgeTTS) {
      _edgeTTSAvailable = true;
      return mod.EdgeTTS;
    }
    _edgeTTSAvailable = false;
    return null;
  } catch {
    _edgeTTSAvailable = false;
    return null;
  }
}

async function synthesizeEdgeTTS(
  text: string,
  voice?: string,
  rate?: string,
  volume?: string
): Promise<{ buffer: ArrayBuffer | null; error?: string }> {
  // En Electron, usar IPC bridge al main process (evita import en renderer)
  if (isElectron() && (window as any).electronAPI?.synthesizeSpeech) {
    try {
      const result = await (window as any).electronAPI.synthesizeSpeech({
        text,
        voice: voice || DEFAULT_VOICE,
        rate: rate || DEFAULT_RATE,
        volume: volume || DEFAULT_VOLUME,
        pitch: DEFAULT_PITCH,
      });
      if (result?.base64) {
        const binaryStr = atob(result.base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        return { buffer: bytes.buffer as ArrayBuffer };
      }
      if (result?.error) {
        console.warn("[TTS] edge-tts IPC error:", result.error);
        return { buffer: null, error: result.error };
      }
      return { buffer: null, error: "No audio generated" };
    } catch (err) {
      console.warn("[TTS] edge-tts IPC failed:", err);
      return { buffer: null, error: String(err) };
    }
  }

  // Fallback: import directo (solo funciona si el bundler lo soporta)
  const EdgeTTSClass = await tryLoadEdgeTTS();
  if (!EdgeTTSClass) return { buffer: null, error: "EdgeTTS not available" };

  try {
    const tts = new EdgeTTSClass();
    await tts.synthesize(text, voice || DEFAULT_VOICE, {
      rate: rate || DEFAULT_RATE,
      volume: DEFAULT_VOLUME,
      pitch: DEFAULT_PITCH,
    });
    return { buffer: tts.toBuffer() };
  } catch (err) {
    console.error("[TTS] edge-tts synthesize error:", err);
    return { buffer: null, error: String(err) };
  }
}

export async function initTTS(): Promise<boolean> {
  if (isElectron()) {
    const EdgeTTSClass = await tryLoadEdgeTTS();
    if (EdgeTTSClass) {
      console.log("🔊 TTS initialized (edge-tts)");
      return true;
    }
    console.log("🔊 TTS initialized (Web Speech API — edge-tts module not found)");
    return true;
  }
  console.log("🔊 TTS initialized (Web Speech API — browser mode)");
  return true;
}

export interface VoiceInfo {
  name: string;
  shortName: string;
  gender: string;
  locale: string;
  friendlyName: string;
}

export async function listVoices(): Promise<VoiceInfo[]> {
  if (isElectron() && (window as any).electronAPI?.listVoices) {
    try {
      const voices = await (window as any).electronAPI.listVoices();
      return voices || [];
    } catch (err) {
      console.warn("[TTS] Failed to list voices via IPC:", err);
      return [];
    }
  }
  // Browser fallback: use Web Speech API
  if (typeof window !== "undefined" && window.speechSynthesis) {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      const tryGet = () => {
        const voices = synth.getVoices();
        if (voices.length > 0) {
          resolve(voices.map(v => ({
            name: v.name,
            shortName: v.name,
            gender: v.name.includes("Female") ? "Female" : "Male",
            locale: v.lang,
            friendlyName: v.name,
          })));
        } else {
          resolve([]);
        }
      };
      tryGet();
      synth.onvoiceschanged = tryGet;
    });
  }
  return [];
}

export async function generateTtsAudio(
  text: string,
  options?: { voice?: string; rate?: string; pitch?: string }
): Promise<Blob | null> {
  if (!text.trim()) return null;

  const { buffer } = await synthesizeEdgeTTS(text, options?.voice, options?.rate);
  if (buffer) {
    return new Blob([buffer], { type: "audio/mpeg" });
  }
  return null;
}

export function speakText(
  text: string,
  options?: {
    rate?: number;
    volume?: number;
    pitch?: number;
    onBoundary?: (charIndex: number) => void;
    onEnd?: () => void;
    onFallback?: (error: string) => void;
  }
): void {
  stopSpeaking();
  if (!text.trim()) return;

  const enginePref = localStorage.getItem("chess_ttsEngine") || "edge";

  if (enginePref === "webspeech") {
    speakTextWebSpeech(text, options);
    return;
  }

  if (isElectron()) {
    speakTextEdgeTTS(text, options).catch((err) => {
      console.warn("[TTS] edge-tts falló, usando Web Speech como respaldo:", err);
      options?.onFallback?.(String(err));
      speakTextWebSpeech(text, options);
    });
  } else {
    speakTextWebSpeech(text, options);
  }
}

export function speakChunks(
  chunks: string[],
  options?: {
    rate?: number;
    onChunkStart?: (index: number) => void;
    onChunkEnd?: (index: number) => void;
    onAllEnd?: () => void;
  }
): void {
  stopSpeaking();
  if (chunks.length === 0) return;

  onChunkStartCallback = options?.onChunkStart ?? null;
  onChunkEndCallback = options?.onChunkEnd ?? null;
  onAllEndCallback = options?.onAllEnd ?? null;
  currentChunks = chunks;
  currentChunkIndex = 0;
  isPlayingAudio = true;

  const enginePref = localStorage.getItem("chess_ttsEngine") || "edge";

  if (enginePref === "webspeech") {
    speakChunksWebSpeech(chunks, options);
    return;
  }

  if (isElectron()) {
    speakChunksEdgeTTS(chunks, options).catch(() => {
      isPlayingAudio = true;
      speakChunksWebSpeech(chunks, options);
    });
  } else {
    speakChunksWebSpeech(chunks, options);
  }
}

export async function generateTtsCombined(
  chunks: string[],
  options?: { voice?: string; rate?: string; filename?: string }
): Promise<Blob | null> {
  if (chunks.length === 0) return null;

  const fullText = chunks.join("\n\n");
  const voice = options?.voice || localStorage.getItem("chess_ttsVoice") || DEFAULT_VOICE;
  const { buffer } = await synthesizeEdgeTTS(fullText, voice, options?.rate);
  if (buffer) {
    return new Blob([buffer], { type: "audio/mpeg" });
  }
  return null;
}

export async function synthesizeTtsAudio(
  text: string,
  options?: { voice?: string; rate?: number; volume?: number }
): Promise<Blob | null> {
  if (!text.trim()) return null;
  const voice = options?.voice || localStorage.getItem("chess_ttsVoice") || DEFAULT_VOICE;
  const rateStr = options?.rate != null
    ? `${Math.round((options.rate - 1) * 100) >= 0 ? "+" : ""}${Math.round((options.rate - 1) * 100)}%`
    : DEFAULT_RATE;
  const volStr = options?.volume != null ? volumeToEdgeTTS(options?.volume) : DEFAULT_VOLUME;
  const { buffer, error } = await synthesizeEdgeTTS(text, voice, rateStr, volStr);
  if (buffer) {
    return new Blob([buffer], { type: "audio/mpeg" });
  }
  console.warn("[TTS] synthesizeTtsAudio error:", error);
  return null;
}

export function playFromBlob(
  blob: Blob,
  options?: { volume?: number; onEnd?: () => void }
): void {
  stopSpeaking();
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);
  audioElement = audio;

  if (options?.volume != null) {
    audio.volume = Math.max(0, Math.min(1, options.volume));
  }

  audio.onended = () => {
    URL.revokeObjectURL(audioUrl);
    audioElement = null;
    isPlayingAudio = false;
    isPausedAudio = false;
    options?.onEnd?.();
  };

  audio.onerror = () => {
    URL.revokeObjectURL(audioUrl);
    audioElement = null;
    isPlayingAudio = false;
    isPausedAudio = false;
    options?.onEnd?.();
  };

  audio.play().catch((err) => {
    console.warn("[TTS] playFromBlob error:", err);
    URL.revokeObjectURL(audioUrl);
    audioElement = null;
    isPlayingAudio = false;
    options?.onEnd?.();
  });
  isPlayingAudio = true;
  isPausedAudio = false;
}

// --- edge-tts implementation ---

function volumeToEdgeTTS(v?: number): string {
  if (v == null) return DEFAULT_VOLUME;
  const pct = Math.round((v - 0.5) * 200);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

async function speakTextEdgeTTS(
  text: string,
  options?: {
    rate?: number;
    volume?: number;
    pitch?: number;
    onEnd?: () => void;
  }
): Promise<void> {
  const rateChange = Math.round((options.rate - 1) * 100);
  const rateStr = options?.rate != null
    ? `${rateChange >= 0 ? "+" : ""}${rateChange}%`
    : DEFAULT_RATE;

   const volStr = volumeToEdgeTTS(options?.volume);
   const voice = localStorage.getItem("chess_ttsVoice") || DEFAULT_VOICE;

   const { buffer, error } = await synthesizeEdgeTTS(text, voice, rateStr, volStr);
  if (!buffer) throw new Error(error || "edge-tts synthesis failed");

  const audioBlob = new Blob([buffer], { type: "audio/mpeg" });
  const audioUrl = URL.createObjectURL(audioBlob);

  const audio = new Audio(audioUrl);
  audioElement = audio;

  if (options?.volume != null) {
    audio.volume = Math.max(0, Math.min(1, options.volume));
  }

  audio.onended = () => {
    URL.revokeObjectURL(audioUrl);
    audioElement = null;
    isPlayingAudio = false;
    options?.onEnd?.();
  };

  audio.onerror = () => {
    URL.revokeObjectURL(audioUrl);
    audioElement = null;
    isPlayingAudio = false;
    options?.onEnd?.();
  };

  await audio.play();
  isPlayingAudio = true;
}

async function speakChunksEdgeTTS(
  chunks: string[],
  options?: {
    rate?: number;
    onChunkStart?: (index: number) => void;
    onChunkEnd?: (index: number) => void;
    onAllEnd?: () => void;
  }
): Promise<void> {
  for (let i = 0; i < chunks.length; i++) {
    if (!isPlayingAudio) break;

    currentChunkIndex = i;
    if (onChunkStartCallback) onChunkStartCallback(i);

    const rateChange = Math.round((options.rate - 1) * 100);
    const rateStr = options?.rate != null
      ? `${rateChange >= 0 ? "+" : ""}${rateChange}%`
      : DEFAULT_RATE;

    const voice = localStorage.getItem("chess_ttsVoice") || DEFAULT_VOICE;
   const { buffer, error } = await synthesizeEdgeTTS(chunks[i], voice, rateStr);
    if (!buffer) throw new Error(error || "edge-tts synthesis failed for chunk " + i);

    const audioBlob = new Blob([buffer], { type: "audio/mpeg" });
    const audioUrl = URL.createObjectURL(audioBlob);

    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audioElement = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioElement = null;
        if (onChunkEndCallback) onChunkEndCallback(i);
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        audioElement = null;
        reject(new Error("Audio playback failed"));
      };

      audio.play().catch(reject);
    });
  }

  isPlayingAudio = false;
  if (onAllEndCallback) onAllEndCallback();
}

// --- Web Speech API fallback ---

function speakTextWebSpeech(
  text: string,
  options?: {
    rate?: number;
    volume?: number;
    pitch?: number;
    onBoundary?: (charIndex: number) => void;
    onEnd?: () => void;
  }
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  utterance.rate = options?.rate ?? 0.9;
  utterance.volume = options?.volume ?? 1.0;
  utterance.pitch = options?.pitch ?? 1.0;

  const voices = window.speechSynthesis.getVoices();
  const spanish = voices.find((v) => v.lang === "es-ES") || voices.find((v) => v.lang.startsWith("es"));
  if (spanish) utterance.voice = spanish;

  utterance.onboundary = (e) => options?.onBoundary?.(e.charIndex);
  utterance.onend = () => {
    isPlayingAudio = false;
    options?.onEnd?.();
  };
  utterance.onerror = () => {
    isPlayingAudio = false;
    options?.onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
  isPlayingAudio = true;
}

function speakChunksWebSpeech(
  chunks: string[],
  options?: {
    rate?: number;
    onChunkStart?: (index: number) => void;
    onChunkEnd?: (index: number) => void;
    onAllEnd?: () => void;
  }
): void {
  if (typeof window === "undefined" || !window.speechSynthesis || chunks.length === 0) return;

  let currentIndex = 0;

  function speakNext() {
    if (currentIndex >= chunks.length) {
      isPlayingAudio = false;
      options?.onAllEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[currentIndex]);
    utterance.lang = "es-ES";
    utterance.rate = options?.rate ?? 0.9;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis!.getVoices();
    const spanish = voices.find((v) => v.lang === "es-ES") || voices.find((v) => v.lang.startsWith("es"));
    if (spanish) utterance.voice = spanish;

    const idx = currentIndex;
    utterance.onstart = () => options?.onChunkStart?.(idx);
    utterance.onend = () => {
      options?.onChunkEnd?.(idx);
      currentIndex++;
      speakNext();
    };
    utterance.onerror = () => {
      currentIndex++;
      speakNext();
    };

    window.speechSynthesis!.speak(utterance);
  }

  speakNext();
}

// --- Playback controls ---

export function stopSpeaking() {
  if (audioElement) {
    audioElement.pause();
    audioElement.src = "";
    audioElement = null;
  }
  isPlayingAudio = false;
  isPausedAudio = false;
  onChunkStartCallback = null;
  onChunkEndCallback = null;
  onAllEndCallback = null;
  currentChunks = [];
  currentChunkIndex = 0;

  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function pauseSpeaking() {
  if (audioElement && isPlayingAudio) {
    audioElement.pause();
    isPausedAudio = true;
    isPlayingAudio = false;
  } else if (typeof window !== "undefined" && window.speechSynthesis?.speaking) {
    window.speechSynthesis.pause();
  }
}

export function resumeSpeaking() {
  if (audioElement && isPausedAudio) {
    audioElement.play();
    isPausedAudio = false;
    isPlayingAudio = true;
  } else if (typeof window !== "undefined" && window.speechSynthesis?.paused) {
    window.speechSynthesis.resume();
  }
}

export function isSpeaking(): boolean {
  return isPlayingAudio;
}

export function isPaused(): boolean {
  return isPausedAudio;
}

export function togglePause() {
  if (isPausedAudio) {
    resumeSpeaking();
  } else if (isPlayingAudio) {
    pauseSpeaking();
  }
}

export function getAudioPosition(): number {
  return audioElement ? audioElement.currentTime : 0;
}

export function getAudioDuration(): number {
  return audioElement ? audioElement.duration : 0;
}

export function seekAudio(time: number): void {
  if (audioElement) {
    audioElement.currentTime = time;
  }
}

// --- Available voices ---

export interface TtsVoice {
  name: string;
  locale: string;
  gender: string;
  friendlyName: string;
}

export async function getAvailableVoices(): Promise<TtsVoice[]> {
  const EdgeTTSClass = await tryLoadEdgeTTS();
  if (EdgeTTSClass) {
    try {
      const tts = new EdgeTTSClass();
      const voices = await tts.getVoices();
      return voices
        .filter((v: any) => v.Locale?.startsWith("es-"))
        .map((v: any) => ({
          name: v.ShortName || v.Name,
          locale: v.Locale || "",
          gender: v.Gender || "",
          friendlyName: v.FriendlyName || v.ShortName || v.Name,
        }));
    } catch {
      return [];
    }
  }
  return [];
}

export function getSpanishVoice(): TtsVoice | null {
  return null;
}
