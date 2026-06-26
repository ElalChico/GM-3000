import React, { useState, useEffect, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { X, Home, Zap, Award, Target, ChevronLeft, ChevronRight, Play, Pause, ChevronsLeft, ChevronsRight, CheckCircle2, Search, Book, Volume2, VolumeX, Brain, Settings, ChevronDown, AlertTriangle, Download, RotateCcw } from "lucide-react";
import { cn } from "../lib/utils";
import { MoveClassification } from "../utils/analysisTemplates";
import { getOpeningNameFromFen } from "../utils/openingRecognition";
import { generateSpanishMoveExplanation } from "../utils/analysisLLM";
import { OpeningAnalyzer } from "./OpeningAnalyzer";
import { speakText, stopSpeaking, isSpeaking, pauseSpeaking, resumeSpeaking, generateTtsCombined, listVoices, VoiceInfo, getAudioPosition, getAudioDuration, seekAudio, synthesizeTtsAudio, playFromBlob } from "../utils/tts";
import { AI_PROVIDERS, getProviderById, getDefaultModel } from "../utils/aiProviders";

interface MasterAnalysisOverlayProps {
  history: string[];
  historyFens: string[];
  moveComments: Record<number, { comment: string; classification: string }>;
  moveEvaluations: any[];
  onClose: () => void;
  onGoHome: () => void;
  boardOrientation: "white" | "black";
  whitePlayer?: string;
  blackPlayer?: string;
  effectivePlayerName?: string;
  language?: "es" | "en";
  aiAnalysisResult?: { general: string; technical: string } | null;
  isAiAnalyzing?: boolean;
  aiAnalysisProgress?: string;
  analysisDepthMode?: "fast" | "deep" | "lichess" | "explorer";
  aiFallbackInfo?: {
    originalModel: string;
    usedModel: string;
    originalProvider: string;
    usedProvider: string;
    fellBack: boolean;
    reason?: string;
  } | null;
  onReAnalyze?: () => void;
  // Nuevas props para análisis asíncrono y PGN personalizado
  aiGeneralResult?: string | null;
  aiTechnicalResult?: string | null;
  isAiGeneralLoading?: boolean;
  isAiTechnicalLoading?: boolean;
  onAnalyzeCustomPgn?: (pgn: string) => void;
  onLoadPgn?: (pgn: string) => void;
  enableTechnicalAnalysis?: boolean;
  onToggleTechnicalAnalysis?: (enabled: boolean) => void;
  currentGameMode?: string;
  isWebVersion?: boolean;
  aiProvider?: string;
  setAiProvider?: (v: string) => void;
  aiModel?: string;
  setAiModel?: (v: string) => void;
  aiApiKey?: string;
  setAiApiKey?: (v: string) => void;
  aiCustomUrl?: string;
  setAiCustomUrl?: (v: string) => void;
}

function formatEvaluation(evalData: any): string | null {
  if (evalData === null || evalData === undefined) return null;
  if (typeof evalData === "number") {
    return evalData > 0 ? `+${evalData}` : `${evalData}`;
  }
  if (typeof evalData === "object") {
    if (typeof evalData.score === "number") {
      return evalData.isMate ? `M${Math.abs(evalData.score)}` : (evalData.score > 0 ? `+${evalData.score}` : `${evalData.score}`);
    }
    if (typeof evalData.score === "string") {
      return evalData.score;
    }
    if (typeof evalData === "string") {
      return evalData;
    }
  }
  return null;
}

function formatCloudEvaluation(data: any): string | null {
  if (!data) return null;
  if (data.mate !== undefined && data.mate !== null) {
    return `M${Math.abs(data.mate)}`;
  }
  const cp = typeof data.eval === "number"
    ? data.eval
    : data.cp !== undefined && data.cp !== null
      ? data.cp / 100
      : null;
  if (typeof cp === "number") {
    return cp > 0 ? `+${cp}` : `${cp}`;
  }
  return null;
}

function getCloudLine(data: any): string | null {
  if (!data) return null;
  if (data.continuationArr && data.continuationArr.length > 0) {
    return data.continuationArr.join(" ");
  }
  if (data.pvs && data.pvs.length > 0 && typeof data.pvs[0].moves === "string") {
    return data.pvs[0].moves;
  }
  if (typeof data.move === "string") {
    return data.move;
  }
  return null;
}

function getBestCloudMove(data: any): string | null {
  if (!data) return null;
  if (typeof data.move === "string") return data.move;
  if (Array.isArray(data.continuationArr) && data.continuationArr.length > 0) {
    return String(data.continuationArr[0]);
  }
  if (data.pvs && data.pvs.length > 0 && typeof data.pvs[0].moves === "string") {
    return String(data.pvs[0].moves).split(" ")[0] || null;
  }
  return null;
}

// Etiqueta de clasificación según terminología profesional de ajedrez
function getClassificationLabel(c: string): string {
  switch (c) {
    case "brilliant": return "!! Brillante";
    case "great":     return "! Muy Buena";
    case "best":      return "Mejor Jugada";
    case "book":      return "Teoría";
    case "good":      return "Buena";
    case "inaccuracy": return "?! Imprecisión";
    case "mistake":   return "? Error";
    case "blunder":   return "?? Error Grave";
    default:          return c;
  }
}

function getClassificationColors(c: string): string {
  switch (c) {
    case "brilliant": return "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30";
    case "great":     return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
    case "best":      return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
    case "book":      return "bg-slate-500/20 text-slate-300 border border-slate-500/30";
    case "good":      return "bg-green-500/10 text-green-400/80 border border-green-500/20";
    case "inaccuracy": return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
    case "mistake":   return "bg-rose-500/20 text-rose-400 border border-rose-500/30";
    case "blunder":   return "bg-red-500/20 text-red-400 border border-red-500/30";
    default:          return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
  }
}

function getClassificationDot(c: string): string {
  switch (c) {
    case "brilliant": return "bg-cyan-400";
    case "great":     return "bg-blue-400";
    case "best":      return "bg-emerald-400";
    case "book":      return "bg-slate-400";
    case "good":      return "bg-green-400";
    case "inaccuracy": return "bg-yellow-400";
    case "mistake":   return "bg-rose-400";
    case "blunder":   return "bg-red-500";
    default:          return "bg-gray-500";
  }
}

function getClassificationIcon(c: string): string {
  switch (c) {
    case "brilliant": return "!!";
    case "great":     return "!";
    case "best":      return "★";
    case "book":      return "≡";
    case "good":      return "✓";
    case "inaccuracy": return "?!";
    case "mistake":   return "?";
    case "blunder":   return "??";
    default:          return "";
  }
}

function renderColoredMove(move: string): string {
  return move || "";
}

export const MasterAnalysisOverlay: React.FC<MasterAnalysisOverlayProps> = ({
  history,
  historyFens,
  moveComments,
  moveEvaluations,
  onClose,
  onGoHome,
  boardOrientation,
  whitePlayer = "ai",
  blackPlayer = "human",
  effectivePlayerName,
  language = "es",
  aiAnalysisResult,
  isAiAnalyzing,
  aiAnalysisProgress,
  analysisDepthMode = "fast",
  aiFallbackInfo,
  onReAnalyze,
  aiGeneralResult,
  aiTechnicalResult,
  isAiGeneralLoading,
  isAiTechnicalLoading,
  onAnalyzeCustomPgn,
  onLoadPgn,
  enableTechnicalAnalysis = true,
  onToggleTechnicalAnalysis,
  currentGameMode,
  isWebVersion = false,
  aiProvider = "openrouter",
  setAiProvider,
  aiModel = "openrouter/free",
  setAiModel,
  aiApiKey = "",
  setAiApiKey,
  aiCustomUrl = "",
  setAiCustomUrl,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(() => history.length);
  const [showOpeningAnalysis, setShowOpeningAnalysis] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<"history" | "openings" | "ai">("history");
  useEffect(() => {
    if (isWebVersion && activeRightTab === "ai") {
      setActiveRightTab("history");
    }
  }, [isWebVersion]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTtsSpeaking, setIsTtsSpeaking] = useState(false);
  const [activeTtsTab, setActiveTtsTab] = useState<"general" | "technical">("general");
  const [showTtsSettings, setShowTtsSettings] = useState(false);
  const [ttsEngine, setTtsEngine] = useState<"edge" | "webspeech">(() => {
    return (localStorage.getItem("chess_ttsEngine") as "edge" | "webspeech") || "edge";
    });
    const [ttsVoice, setTtsVoice] = useState(() => {
      return localStorage.getItem("chess_ttsVoice") || "es-MX-DaliaNeural";
    });
    useEffect(() => { localStorage.setItem("chess_ttsVoice", ttsVoice); }, [ttsVoice]);
    const [availableVoices, setAvailableVoices] = useState<VoiceInfo[]>([]);
    useEffect(() => {
      listVoices().then(voices => {
        setAvailableVoices(voices);
      });
    }, []);
    const [ttsRate, setTtsRate] = useState(() => {
    return Number(localStorage.getItem("chess_ttsRate") || "0.9");
  });
  const [ttsVolume, setTtsVolume] = useState(() => {
    return Number(localStorage.getItem("chess_ttsVolume") || "0.8");
  });
  const [ttsMuted, setTtsMuted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [ttsWarning, setTtsWarning] = useState<string | null>(null);
  const [audioPosition, setAudioPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isTtsPaused, setIsTtsPaused] = useState(false);
  const [autoPlayOnTtsReady, setAutoPlayOnTtsReady] = useState(() => {
    const saved = localStorage.getItem("chess_autoPlayTts");
    return saved !== null ? saved === "true" : true;
  });
  const [cachedTtsBlob, setCachedTtsBlob] = useState<Blob | null>(null);
  const [isConvertingTts, setIsConvertingTts] = useState(false);
  const [ttsReadyNotification, setTtsReadyNotification] = useState(false);
  const prevTtsVoiceRef = useRef(ttsVoice);

  // PGN personalizado
  const [customPgn, setCustomPgn] = useState("");
  const [showPgnInput, setShowPgnInput] = useState(false);

  // Estado de administración de APIs
  const [activeGeneralApi, setActiveGeneralApi] = useState<"primary" | "fallback">("primary");
  const [activeTechnicalApi, setActiveTechnicalApi] = useState<"primary" | "fallback">("primary");
  const [showApiAdmin, setShowApiAdmin] = useState(false);

  useEffect(() => { localStorage.setItem("chess_ttsEngine", ttsEngine); }, [ttsEngine]);
  useEffect(() => { localStorage.setItem("chess_ttsRate", String(ttsRate)); }, [ttsRate]);
  useEffect(() => { localStorage.setItem("chess_ttsVolume", String(ttsVolume)); }, [ttsVolume]);
  useEffect(() => { localStorage.setItem("chess_autoPlayTts", String(autoPlayOnTtsReady)); }, [autoPlayOnTtsReady]);
  useEffect(() => {
    if (prevTtsVoiceRef.current !== ttsVoice) {
      setCachedTtsBlob(null);
      prevTtsVoiceRef.current = ttsVoice;
    }
  }, [ttsVoice]);
  const playIntervalRef = useRef<any>(null);

  // Detener audio TTS al cerrar el overlay
  useEffect(() => {
    return () => {
      if (isSpeaking()) {
        stopSpeaking();
      }
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  // Poll audio position during playback
  useEffect(() => {
    let interval: any = null;
    if (isTtsSpeaking && !isTtsPaused) {
      setAudioPosition(getAudioPosition());
      setAudioDuration(getAudioDuration());
      interval = setInterval(() => {
        setAudioPosition(getAudioPosition());
        setAudioDuration(getAudioDuration());
      }, 200);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isTtsSpeaking, isTtsPaused]);
  const commentListRef = useRef<HTMLDivElement>(null);
  const activeCommentRef = useRef<HTMLDivElement>(null);

  const currentEvalData = moveEvaluations?.[currentIndex];
  const currentEval = formatEvaluation(currentEvalData);

  const [cloudAnalysis, setCloudAnalysis] = useState<any | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [openingName, setOpeningName] = useState<string | null>(null);
  const [moveExplanation, setMoveExplanation] = useState<string | null>(null);
  const [aiElapsed, setAiElapsed] = useState(0);
  const aiElapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiProgressRef = useRef(aiAnalysisProgress);
  const [explanationLoading, setExplanationLoading] = useState(false);

  // FEN para la posición actual sin animación innecesaria
  const currentFen =
    historyFens && historyFens.length > 0
      ? historyFens[Math.min(currentIndex, historyFens.length - 1)]
      : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  useEffect(() => {
    const name = getOpeningNameFromFen(currentFen);
    setOpeningName(name);
  }, [currentFen]);

  useEffect(() => {
    const currentMoveIndex = currentIndex - 1;
    if (!cloudAnalysis || currentMoveIndex < 0 || currentMoveIndex >= history.length) {
      setMoveExplanation(null);
      return;
    }

    const timer = setTimeout(() => {
      const explanationForMove = async () => {
        setExplanationLoading(true);
        try {
          const bestMove = getBestCloudMove(cloudAnalysis);
          const actualMove = history[currentMoveIndex] ?? null;
          const classification = (moveComments[currentMoveIndex]?.classification || "good") as MoveClassification;
          const explanation = await generateSpanishMoveExplanation({
            fenBefore: historyFens[currentMoveIndex] ?? currentFen,
            fenAfter: currentFen,
            bestMove,
            userMove: actualMove,
            classification,
            openingName: openingName || undefined,
          });
          setMoveExplanation(explanation);
        } catch {
          setMoveExplanation(null);
        } finally {
          setExplanationLoading(false);
        }
      };

      explanationForMove();
    }, 400);

    return () => clearTimeout(timer);
  }, [cloudAnalysis, currentIndex, history, historyFens, moveComments, openingName, currentFen]);

  useEffect(() => {
    if (!currentFen) {
      setCloudLoading(false);
      return;
    }

    setCloudLoading(true);
    setCloudError(null);
    setCloudAnalysis(null);

    const timer = setTimeout(() => {
      const controller = new AbortController();

      const fetchCloudData = async () => {
        // Intentar chess-api.com primero
        try {
          const response = await fetch("https://chess-api.com/v1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fen: currentFen,
              variants: 3,
              depth: 18,
              maxThinkingTime: 100,
            }),
            signal: controller.signal,
          });

          if (response.ok) {
            const data = await response.json();
            if (data && (data.move || data.pvs?.length || data.continuationArr?.length)) {
              setCloudAnalysis(data);
              return;
            }
          }
        } catch (e) {
          // Continuar al fallback
        }

        // Fallback: Lichess cloud eval
        try {
          const fenEncoded = encodeURIComponent(currentFen);
          const response = await fetch(
            `https://lichess.org/api/cloud/eval?fen=${fenEncoded}&multiPv=3`,
            {
              method: "GET",
              headers: { Accept: "application/json" },
              signal: controller.signal,
            }
          );

          if (response.ok) {
            const data = await response.json();
            const best = data.pvs?.[0];
            if (best) {
              setCloudAnalysis({
                move: best.moves?.split(" ")[0] || null,
                eval: best.score?.cp != null ? best.score.cp / 100 : null,
                mate: best.score?.mate != null ? best.score.mate : null,
                depth: data.depth || null,
                pvs: data.pvs || [],
                continuationArr: best.moves?.split(" ") || [],
                engine: "Lichess Cloud",
              });
              return;
            }
          }
        } catch (e) {
          // Ambos fallaron
        }

        if (!controller.signal.aborted) {
          setCloudError("Sin datos cloud — las APIs no retornaron evaluación para esta posición");
        }
      };

      fetchCloudData();
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [currentFen]);

  // Reproducción automática
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= history.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, history.length]);

  // Auto-scroll al comentario activo
  useEffect(() => {
    if (activeCommentRef.current && commentListRef.current) {
      activeCommentRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [currentIndex]);

  // Auto-seleccionar el análisis que tenga contenido real
  useEffect(() => {
    if (!aiAnalysisResult) return;
    const generalHasContent = aiAnalysisResult.general && !aiAnalysisResult.general.startsWith("No se pudo");
    const technicalHasContent = aiAnalysisResult.technical && aiAnalysisResult.technical.trim().length > 0;
    if (!generalHasContent && technicalHasContent) {
      setActiveTtsTab("technical");
    } else {
      setActiveTtsTab("general");
    }
  }, [aiAnalysisResult]);

  // Timer de elapsed para análisis IA
  useEffect(() => {
    if (isAiAnalyzing) {
      setAiElapsed(0);
      aiElapsedRef.current = setInterval(() => {
        setAiElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (aiElapsedRef.current) {
        clearInterval(aiElapsedRef.current);
        aiElapsedRef.current = null;
      }
      setAiElapsed(0);
    }
    return () => {
      if (aiElapsedRef.current) {
        clearInterval(aiElapsedRef.current);
        aiElapsedRef.current = null;
      }
    };
  }, [isAiAnalyzing]);

  // Sincronizar ref de progreso
  useEffect(() => {
    aiProgressRef.current = aiAnalysisProgress;
  }, [aiAnalysisProgress]);

  const goToMove = (idx: number) => {
    const clamped = Math.max(0, Math.min(history.length, idx));
    setCurrentIndex(clamped);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (currentIndex >= history.length) {
      setCurrentIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleTtsPlay = (forceTab?: "general" | "technical") => {
    const tabToPlay = forceTab || activeTtsTab;
    if (forceTab && forceTab !== activeTtsTab) {
      setActiveTtsTab(forceTab);
      setCachedTtsBlob(null); // invalidate cache since tab changed
    }

    if (isTtsPaused && !forceTab) {
      resumeSpeaking();
      setIsTtsPaused(false);
      return;
    }
    if (isTtsSpeaking && !forceTab) {
      pauseSpeaking();
      setIsTtsPaused(true);
      return;
    }
    
    const text = tabToPlay === "general"
      ? (aiAnalysisResult?.general || aiGeneralResult)
      : (aiAnalysisResult?.technical || aiTechnicalResult);
      
    if (!text || text.startsWith("No se pudo") || text.startsWith("Error en análisis")) return;

    const playWithBlob = (blob: Blob) => {
      playFromBlob(blob, {
        volume: ttsMuted ? 0 : ttsVolume,
        onEnd: () => {
          setIsTtsSpeaking(false);
          setIsTtsPaused(false);
          
          // Secuencia automática: Si terminó "general" y existe "technical", reproducir technical.
          if (tabToPlay === "general") {
            const hasTechnical = aiTechnicalResult || aiAnalysisResult?.technical;
            if (hasTechnical && !hasTechnical.startsWith("No se pudo") && !hasTechnical.startsWith("Error en")) {
              setTimeout(() => {
                handleTtsPlay("technical");
              }, 1000); // 1 segundo de pausa entre audios
            }
          }
        },
      });
    };

    if (cachedTtsBlob && !forceTab) {
      setIsTtsSpeaking(true);
      setIsTtsPaused(false);
      setTtsWarning(null);
      playWithBlob(cachedTtsBlob);
      return;
    }

    setIsConvertingTts(true);
    setIsTtsSpeaking(false);
    setIsTtsPaused(false);
    setTtsWarning(null);
    
    synthesizeTtsAudio(text, {
      voice: ttsVoice,
      rate: ttsRate,
      volume: ttsMuted ? 0 : ttsVolume,
    }).then((blob) => {
      setIsConvertingTts(false);
      if (!blob) {
        setTtsWarning("edge-tts no pudo sintetizar el audio");
        return;
      }
      setCachedTtsBlob(blob);
      setTtsReadyNotification(true);
      setTimeout(() => setTtsReadyNotification(false), 3000);
      
      if (autoPlayOnTtsReady) {
        setIsTtsSpeaking(true);
        playWithBlob(blob);
      }
    }).catch((err) => {
      setIsConvertingTts(false);
      console.warn("[TTS] synthesize error:", err);
      setTtsWarning(`edge-tts falló: ${String(err).substring(0, 80)}`);
    });
  };

  // Efecto para iniciar la conversión TTS automáticamente al terminar el análisis
  const prevIsAnalyzingRef = useRef(isAiAnalyzing);
  useEffect(() => {
    if (prevIsAnalyzingRef.current && !isAiAnalyzing) {
      // El análisis acaba de terminar
      const textToConvert = aiGeneralResult || aiAnalysisResult?.general;
      if (textToConvert && !textToConvert.startsWith("No se pudo") && !textToConvert.startsWith("Error en")) {
        setActiveTtsTab("general");
        setCachedTtsBlob(null);
        handleTtsPlay("general");
      }
    }
    prevIsAnalyzingRef.current = isAiAnalyzing;
  }, [isAiAnalyzing, aiGeneralResult, aiAnalysisResult]);


  const handleTtsPause = () => {
    pauseSpeaking();
  };

  const handleTtsResume = () => {
    resumeSpeaking();
  };

  const handleTtsStop = () => {
    stopSpeaking();
    setIsTtsSpeaking(false);
    setIsTtsPaused(false);
  };

  const handleTtsDownload = async () => {
    const text = activeTtsTab === "general"
      ? (aiAnalysisResult?.general || aiGeneralResult)
      : (aiAnalysisResult?.technical || aiTechnicalResult);
    if (!text || text.startsWith("No se pudo") || text.startsWith("Error en análisis")) return;
    setDownloading(true);
    try {
      const chunks = text.split(/\n{2,}/).filter(Boolean);
      const blob = await generateTtsCombined(chunks, { voice: ttsVoice });
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `analisis_${activeTtsTab}_${Date.now()}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Fallback: descargar como texto
        const blobText = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blobText);
        const a = document.createElement("a");
        a.href = url;
        a.download = `analisis_${activeTtsTab}_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.warn("[TTS] Download error:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleTtsRegenerate = () => {
    handleTtsStop();
    setCachedTtsBlob(null);
    setTimeout(() => handleTtsPlay(), 100);
  };

  function formatTime(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const precisionMoves = Object.values(moveComments).filter(
    (c: any) => ["best", "brilliant", "great"].includes(c.classification)
  ).length;
  const criticalErrors = Object.values(moveComments).filter(
    (c: any) => ["blunder", "mistake"].includes(c.classification)
  ).length;
  const inaccuracies = Object.values(moveComments).filter(
    (c: any) => c.classification === "inaccuracy"
  ).length;

  const positionLabel = currentIndex === 0
    ? "Posición Inicial"
    : currentIndex === history.length
    ? "Posición Final"
    : `Jugada ${Math.floor((currentIndex - 1) / 2) + 1}${(currentIndex - 1) % 2 === 0 ? ' ♙' : ' ♟'}: ${history[currentIndex - 1]}`;

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-sm master-analysis-overlay overflow-hidden"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="bg-[#05090a] border-2 border-teal-900/40 rounded-none w-full h-full overflow-hidden flex flex-col shadow-[0_0_150px_rgba(20,184,166,0.25)] medieval-panel relative z-[2001]">

        {/* Adorno gótico superior */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-teal-500/30 to-transparent"></div>

        {/* Header compacto */}
        <div className="px-5 py-3 border-b border-teal-900/30 flex items-center justify-between bg-teal-950/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-900/40 rounded-lg border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
              <Zap className={cn(
                "w-5 h-5 text-amber-400",
                cloudLoading || currentEvalData ? "animate-pulse" : "opacity-60"
              )} />
            </div>
            <div>
              <h2 className="text-lg font-black text-amber-50 uppercase tracking-[0.2em] font-serif">Análisis Maestro</h2>
              <p className="text-teal-400/70 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                <Award className="w-3 h-3" /> {({
                  fast: "Análisis Rápido",
                  deep: "Análisis Profundo",
                  lichess: "Análisis en Nube",
                  explorer: "Explorador de Aperturas",
                } as Record<string, string>)[analysisDepthMode] || "Análisis"} · {history.length} Jugadas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { stopSpeaking(); setIsTtsSpeaking(false); onGoHome(); }}
              className="p-2 hover:bg-slate-700/40 text-slate-200 hover:text-white transition-all rounded-xl border border-transparent hover:border-slate-600/30"
              title="Volver al Home"
            >
              <Home className="w-5 h-5" />
            </button>
            <button
              onClick={() => { stopSpeaking(); setIsTtsSpeaking(false); onClose(); }}
              className="p-2 hover:bg-rose-500/20 text-teal-400 hover:text-rose-400 transition-all rounded-xl border border-transparent hover:border-rose-500/20 group"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden min-h-0">

          {/* Columna izquierda: Tablero + Chess API */}
          <div className="w-[34%] shrink-0 border-r border-teal-900/20 flex flex-col bg-black/40 overflow-hidden">

            {/* Tablero */}
            <div className="p-3 shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent rounded-xl blur-sm opacity-40"></div>
                <div className="rounded-lg overflow-hidden border border-teal-900/50 shadow-xl relative">
                  <div className="w-full h-[30vh] min-h-[220px] flex justify-center overflow-hidden">
                    <div className="h-full aspect-square relative">
                      <Chessboard
                        options={{
                          id: "MasterAnalysisBoard",
                          position: currentFen,
                          boardOrientation,
                          allowDragging: false,
                          animationDurationInMs: 0,
                          darkSquareStyle: { backgroundColor: "#4b5563" },
                          lightSquareStyle: { backgroundColor: "#d1d5db" },
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Indicador de posición y controles de reproducción */}
              <div className="mt-2 flex flex-col gap-3">
                <div className="bg-teal-950/30 py-1.5 px-3 rounded-lg border border-teal-900/20 text-center flex justify-between items-center">
                  <span className="text-teal-200/80 text-[10px] font-bold uppercase tracking-[0.15em]">
                    {positionLabel}
                  </span>
                  {currentEval ? (
                    <span className={cn(
                      "text-[11px] font-black tracking-widest px-2 py-0.5 rounded",
                      currentEval.startsWith("+") || currentEval.startsWith("M")
                        ? "text-emerald-400 bg-emerald-500/10"
                        : "text-rose-400 bg-rose-500/10"
                    )}>
                      {currentEval}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 uppercase tracking-[0.15em]">
                      Sin datos de evaluación
                    </span>
                  )}
                </div>

                <div className="bg-slate-900/80 border border-teal-500/20 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center gap-2">
                    <button onClick={() => goToMove(0)} disabled={currentIndex === 0}
                      className="min-w-[2.8rem] h-11 flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-30 hover:bg-slate-800 transition shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => goToMove(currentIndex - 1)} disabled={currentIndex === 0}
                      className="min-w-[2.8rem] h-11 flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-30 hover:bg-slate-800 transition shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={togglePlay}
                      className="min-w-[3rem] h-11 flex items-center justify-center rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-100 hover:bg-teal-500/20 transition shadow-[0_4px_16px_rgba(20,184,166,0.25)]">
                      {isPlaying
                        ? <Pause className="w-5 h-5" />
                        : <Play className="w-5 h-5" />
                      }
                    </button>
                    <button onClick={() => goToMove(currentIndex + 1)} disabled={currentIndex >= history.length}
                      className="min-w-[2.8rem] h-11 flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-30 hover:bg-slate-800 transition shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button onClick={() => goToMove(history.length)} disabled={currentIndex >= history.length}
                      className="min-w-[2.8rem] h-11 flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-30 hover:bg-slate-800 transition shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold">Reproducción</span>
                </div>

                {currentEvalData && typeof currentEvalData === "object" && currentEvalData.pv && (
                  <div className="bg-slate-900/80 border border-teal-500/20 rounded-lg p-2.5 flex flex-col gap-1 shadow-inner min-h-[44px] justify-center">
                    <p className="text-[10px] text-slate-300 leading-tight italic">
                      <span className="text-teal-400 font-bold mr-1">Análisis:</span>
                      {currentEvalData.pv}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-3 pb-3 flex-1 flex flex-col min-h-0">
              <div className="bg-slate-900/90 border border-teal-500/20 rounded-2xl p-3 shadow-xl flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between gap-2 border-b border-teal-500/20 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-teal-400 font-bold bg-teal-500/10 px-1.5 py-0.5 rounded">Chess API</span>
                    <span className="text-[10px] font-black text-slate-100">Análisis</span>
                  </div>
                  <div className="text-[9px] font-semibold text-slate-300">
                    {cloudLoading ? "Conectando..." : cloudAnalysis ? "Activa" : cloudError ? "Error" : "Sin datos"}
                  </div>
                </div>

                {cloudAnalysis ? (
                  <div className="text-[9px] flex flex-wrap gap-x-4 gap-y-2 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <span className="uppercase tracking-[0.2em] text-slate-500">Eval:</span>
                      <span className="font-black text-slate-100 text-sm">{formatCloudEvaluation(cloudAnalysis) ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="uppercase tracking-[0.2em] text-slate-500">Prof:</span>
                      <span className="font-black text-slate-100">{cloudAnalysis.depth ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="uppercase tracking-[0.2em] text-slate-500">Línea:</span>
                      <span className="font-semibold text-slate-100 truncate">{getCloudLine(cloudAnalysis) ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="uppercase tracking-[0.2em] text-slate-500">Mov:</span>
                      <span className="font-semibold text-slate-100">{cloudAnalysis.move ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="uppercase tracking-[0.2em] text-slate-500">Fuente:</span>
                      <span className="font-semibold text-slate-100">{cloudAnalysis.engine ?? "Chess API"}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[9px] text-slate-400 italic m-0">{cloudError ?? "El overlay intentó conectarse al endpoint de chess-api."}</p>
                )}

                <div className="border-t border-teal-900/25 pt-2 mt-auto">
                  <div className="text-[8px] uppercase tracking-[0.25em] text-teal-400 font-bold mb-1">Explicación</div>
                  <div className="min-h-[4rem] rounded-xl border border-teal-500/20 bg-slate-950/90 p-2 text-slate-100 text-[11px] leading-relaxed shadow-inner">
                    {moveExplanation ? (
                      <p className="font-medium m-0">{moveExplanation}</p>
                    ) : explanationLoading ? (
                      <p className="text-slate-400 m-0">Generando...</p>
                    ) : (
                      <p className="text-slate-400 m-0">Selecciona jugada.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Columna central: Crónica de la Batalla */}
          <div className="w-[380px] shrink-0 flex flex-col p-5 overflow-hidden min-h-0 gap-4 bg-gradient-to-b from-transparent to-black/20">

            {/* Tarjetas de Resumen compactas */}
            <div className="grid grid-cols-3 gap-3 shrink-0">
              <div className="bg-teal-950/20 border border-teal-900/40 rounded-xl p-3 flex flex-col items-center justify-center text-center group">
                <Award className="w-6 h-6 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-white font-black text-2xl leading-none">{history.length}</span>
                <span className="text-teal-500/60 text-[9px] uppercase font-black tracking-widest mt-1">Jugadas</span>
              </div>
              <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3 flex flex-col items-center justify-center text-center group">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-white font-black text-2xl leading-none">{precisionMoves}</span>
                <span className="text-emerald-500/60 text-[9px] uppercase font-black tracking-widest mt-1">Precisas</span>
              </div>
              <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3 flex flex-col items-center justify-center text-center group">
                <Target className="w-6 h-6 text-rose-500 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-white font-black text-2xl leading-none">{criticalErrors}</span>
                <span className="text-rose-500/60 text-[9px] uppercase font-black tracking-widest mt-1">Errores</span>
              </div>
            </div>

            {/* Crónica */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 border-b border-teal-900/20 pb-2">
                <h3 className="text-amber-100/50 text-[11px] uppercase font-black tracking-[0.4em]">
                  Crónica de la Batalla
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-teal-600 font-bold uppercase">{inaccuracies} Imprecisiones</span>
                  <button
                    onClick={() => {
                      const cronicaText = history.map((move, idx) => {
                        const comment = moveComments[idx];
                        if (!comment) return "";
                        const moveNum = Math.floor(idx / 2) + 1;
                        const color = idx % 2 === 0 ? "blancas" : "negras";
                        return `${moveNum}. ${move} por ${color}: ${comment.comment}`;
                      }).filter(Boolean).join(". ");
                      if (!cronicaText) return;
                      const blob = cachedTtsBlob;
                      if (blob && isSpeaking()) {
                        stopSpeaking();
                        return;
                      }
                      synthesizeTtsAudio(cronicaText, {
                        voice: ttsVoice,
                        rate: ttsRate,
                        volume: ttsMuted ? 0 : ttsVolume,
                      }).then((audioBlob) => {
                        if (!audioBlob) return;
                        setTtsReadyNotification(true);
                        setTimeout(() => setTtsReadyNotification(false), 3000);
                        setIsTtsSpeaking(true);
                        playFromBlob(audioBlob, {
                          volume: ttsMuted ? 0 : ttsVolume,
                          onEnd: () => {
                            setIsTtsSpeaking(false);
                            setIsTtsPaused(false);
                          },
                        });
                      });
                    }}
                    className="p-1.5 rounded-lg hover:bg-amber-500/20 text-amber-400/60 hover:text-amber-300 transition-all"
                    title="Leer crónica en voz alta"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div ref={commentListRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 pb-4">
                {history.map((move, idx) => {
                  const comment = moveComments[idx];
                  if (!comment) return null;
                  const isWhite = idx % 2 === 0;
                  const isCurrent = currentIndex === idx + 1;

                  return (
                    <div
                      key={idx}
                      ref={isCurrent ? activeCommentRef : null}
                      onClick={() => goToMove(idx + 1)}
                      className={cn(
                        "flex gap-3 p-3 rounded-xl border transition-all cursor-pointer relative",
                        isCurrent
                          ? "bg-slate-900/80 border-teal-500/40 text-white"
                          : "bg-slate-950/70 border-slate-800 text-slate-300 hover:border-teal-500/20 hover:bg-slate-900/70 hover:text-slate-100"
                      )}
                    >
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-1 transition-all rounded-l-xl",
                        isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-30",
                        comment.classification === "blunder" ? "bg-red-500" :
                        comment.classification === "mistake" ? "bg-rose-500" :
                        comment.classification === "brilliant" ? "bg-cyan-400" :
                        comment.classification === "great" ? "bg-blue-400" :
                        comment.classification === "best" ? "bg-emerald-400" : "bg-slate-500"
                      )} />

                      <div className="flex flex-col items-center justify-center min-w-[48px] border-r border-white/10 pr-3">
                        <span className="text-teal-600 font-black text-[9px] leading-none mb-0.5 opacity-60">
                          {Math.floor(idx / 2) + 1}{isWhite ? "." : ".."}
                        </span>
                        <span className="text-white font-black text-base uppercase tracking-tighter">{move}</span>
                        <span className="text-[10px] mt-0.5 opacity-50">{isWhite ? "♙" : "♟"}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                            getClassificationColors(comment.classification)
                          )}>
                            {getClassificationLabel(comment.classification)}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed italic">
                          {comment.comment}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {history.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-700 gap-3">
                    <Search className="w-10 h-10 opacity-20" />
                    <p className="text-xs uppercase font-black tracking-[0.3em] opacity-40">Sin datos de análisis</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Columna derecha: Historial / Aperturas / Análisis */}
          <div className="flex-1 shrink-0 border-l border-teal-900/20 flex flex-col bg-black/40 overflow-hidden">
            {/* Tab selector */}
            <div className="shrink-0 flex items-center gap-1 p-2 border-b border-teal-900/20 bg-black/60">
              <button
                onClick={() => setActiveRightTab("history")}
                className={cn(
                  "flex-1 py-2.5 px-2 text-[9px] font-bold uppercase tracking-widest transition-all rounded-lg flex items-center justify-center gap-1.5 shadow-sm",
                  activeRightTab === "history"
                    ? "text-teal-200 bg-teal-500/20 border border-teal-500/30 shadow-teal-900/30"
                    : "text-slate-400 bg-black/40 border border-white/5 hover:bg-white/10 hover:text-slate-200 hover:border-white/20"
                )}
              >
                <Search className="w-3.5 h-3.5" />
                {language === "es" ? "Historial" : "History"}
              </button>
              <button
                onClick={() => setActiveRightTab("openings")}
                className={cn(
                  "flex-1 py-2.5 px-2 text-[9px] font-bold uppercase tracking-widest transition-all rounded-lg flex items-center justify-center gap-1.5 shadow-sm",
                  activeRightTab === "openings"
                    ? "text-amber-200 bg-amber-500/20 border border-amber-500/30 shadow-amber-900/30"
                    : "text-slate-400 bg-black/40 border border-white/5 hover:bg-white/10 hover:text-slate-200 hover:border-white/20"
                )}
              >
                <Book className="w-3.5 h-3.5" />
                {language === "es" ? "Aperturas" : "Openings"}
              </button>
              {!isWebVersion && (
                <button
                  onClick={() => setActiveRightTab("ai")}
                  className={cn(
                    "flex-1 py-2.5 px-2 text-[9px] font-bold uppercase tracking-widest transition-all rounded-lg flex items-center justify-center gap-1.5 shadow-sm",
                    activeRightTab === "ai"
                      ? "text-violet-200 bg-violet-500/20 border border-violet-500/30 shadow-violet-900/30"
                      : "text-slate-400 bg-black/40 border border-white/5 hover:bg-white/10 hover:text-slate-200 hover:border-white/20"
                  )}
                >
                  <Brain className="w-3.5 h-3.5" />
                  {language === "es" ? "Análisis" : "Analysis"}
                </button>
              )}
            </div>

            {isWebVersion && (
              <div className="flex items-center gap-2 px-3 py-2 bg-violet-950/30 border border-violet-500/20 rounded-lg text-[9px] text-violet-300">
                <Brain className="w-3.5 h-3.5 shrink-0 text-violet-400" />
                <span className="leading-relaxed">
                  {language === "es"
                    ? "Para análisis con IA en lenguaje natural y lectura por voz con voces realistas, instale la versión de escritorio."
                    : "For AI analysis in natural language and voice reading with realistic voices, please install the desktop version."}
                </span>
              </div>
            )}

            {/* Contenido del tab */}
            {activeRightTab === "history" && (
              <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 pt-3">
                <div className="text-[9px] text-teal-600/50 uppercase font-black tracking-widest mb-1.5 px-1">
                  {language === "es" ? "Historial de Jugadas" : "Move History"}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {Array.from({ length: Math.ceil(history.length / 2) }, (_, i) => {
                    const wIdx = i * 2;
                    const bIdx = i * 2 + 1;
                    const wComment = moveComments[wIdx];
                    const bComment = moveComments[bIdx];
                    const wActive = currentIndex === wIdx + 1;
                    const bActive = currentIndex === bIdx + 1;
                    const wRendered = renderColoredMove(history[wIdx]);
                    const bRendered = history[bIdx] ? renderColoredMove(history[bIdx]) : null;
                    return (
                      <React.Fragment key={i}>
                        <button
                          onClick={() => goToMove(wIdx + 1)}
                          className={cn(
                            "flex items-center gap-1.5 text-[11px] py-1.5 px-2 rounded-lg font-bold transition-all border relative text-left",
                            wActive
                              ? "bg-teal-500/40 border-teal-400 text-white shadow-[0_0_8px_rgba(20,184,166,0.4)]"
                              : "bg-slate-950/70 border-slate-800 text-slate-300 hover:border-teal-500/20 hover:bg-slate-900/70 hover:text-slate-100"
                          )}
                        >
                          <span className="text-[9px] text-teal-600/60 shrink-0 w-5">{i + 1}.</span>
                          {wComment && (
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getClassificationDot(wComment.classification))} />
                          )}
                          <span className="truncate">{wRendered}</span>
                          {wComment && (
                            <span className="text-[9px] shrink-0 opacity-70">{getClassificationIcon(wComment.classification)}</span>
                          )}
                        </button>
                        {history[bIdx] ? (
                          <button
                            onClick={() => goToMove(bIdx + 1)}
                            className={cn(
                              "flex items-center gap-1.5 text-[11px] py-1.5 px-2 rounded-lg font-bold transition-all border relative text-left",
                              bActive
                                ? "bg-teal-500/40 border-teal-400 text-white shadow-[0_0_8px_rgba(20,184,166,0.4)]"
                                : "bg-slate-950/70 border-slate-800 text-slate-300 hover:border-teal-500/20 hover:bg-slate-900/70 hover:text-slate-100"
                            )}
                          >
                            {bComment && (
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getClassificationDot(bComment.classification))} />
                            )}
                            <span className="truncate">{bRendered}</span>
                            {bComment && (
                              <span className="text-[9px] shrink-0 opacity-70">{getClassificationIcon(bComment.classification)}</span>
                            )}
                          </button>
                        ) : <div />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {activeRightTab === "openings" && (
              <OpeningAnalyzer
                history={history}
                boardOrientation={boardOrientation}
                language={language}
                whitePlayer={whitePlayer}
                blackPlayer={blackPlayer}
                effectivePlayerName={effectivePlayerName}
              />
            )}

             {activeRightTab === "ai" && !isWebVersion && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-3">
                {!aiAnalysisResult && !aiGeneralResult && !aiTechnicalResult && !isAiAnalyzing && !isAiGeneralLoading && !isAiTechnicalLoading && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-700 gap-3">
                    <Brain className="w-10 h-10 opacity-20" />
                    <p className="text-xs uppercase font-black tracking-[0.3em] opacity-40">Sin análisis de IA</p>
                    <p className="text-[9px] text-slate-500 text-center">Configura una API Key y ejecuta el análisis desde el selector de modo</p>
                  </div>
                )}

                {/* Sección de carga de PGN personalizado */}
                <button
                  onClick={() => setShowPgnInput(!showPgnInput)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700/30 rounded-xl text-[9px] text-slate-400 hover:text-amber-300 hover:border-amber-500/20 transition-all w-full"
                >
                  <Book className="w-3 h-3" />
                  <span className="font-bold uppercase tracking-widest">Cargar / Pegar PGN</span>
                  <div className="flex-1" />
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showPgnInput && "rotate-180")} />
                </button>

                {showPgnInput && (
                  <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-3 flex flex-col gap-2">
                    <span className="text-[9px] text-slate-400 font-semibold">Pega tu PGN aquí o sube un archivo:</span>
                    <textarea
                      value={customPgn}
                      onChange={(e) => setCustomPgn(e.target.value)}
                      placeholder={`[Event "Partida personalizada"]\n[Site "?"]\n[Date "2026.06.23"]\n[Round "?"]\n[White "Jugador"]\n[Black "Oponente"]\n[Result "*"]\n\n1.e4 e5 2.Nf3 Nc6 ...`}
                      className="w-full h-24 bg-gray-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 font-mono resize-y placeholder:text-slate-600"
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-dashed border-slate-600/50 rounded-lg text-[9px] text-slate-400 hover:text-slate-200 hover:border-slate-500 cursor-pointer transition-all">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <span className="font-bold uppercase tracking-widest">Subir archivo .pgn</span>
                        <input
                          type="file"
                          accept=".pgn,text/plain"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => setCustomPgn(reader.result as string);
                              reader.readAsText(file);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <button
                        onClick={() => {
                          const pgn = customPgn.trim();
                          if (!pgn) return;
                          if (onLoadPgn) onLoadPgn(pgn);
                          if (onAnalyzeCustomPgn) onAnalyzeCustomPgn(pgn);
                        }}
                        disabled={!customPgn.trim() || !onAnalyzeCustomPgn}
                        className="px-3 py-2 bg-amber-600/20 border border-amber-500/30 rounded-lg text-[9px] text-amber-300 font-bold uppercase tracking-widest hover:bg-amber-500/30 transition-all disabled:opacity-30"
                      >
                        Analizar con IA
                      </button>
                    </div>
                  </div>
                )}

                {/* Administrador de APIs */}
                <button
                  onClick={() => setShowApiAdmin(!showApiAdmin)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700/30 rounded-xl text-[9px] text-slate-400 hover:text-cyan-300 hover:border-cyan-500/20 transition-all w-full"
                >
                  <Settings className="w-3 h-3" />
                  <span className="font-bold uppercase tracking-widest">Configurar IA</span>
                  <div className="flex-1" />
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showApiAdmin && "rotate-180")} />
                </button>

                {showApiAdmin && (
                  <div className="bg-slate-900/60 border border-cyan-500/20 rounded-xl p-3 flex flex-col gap-3">
                    {/* Proveedor IA */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] text-violet-300 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Brain className="w-3 h-3" /> Proveedor de IA
                      </span>
                      <select
                        value={aiProvider}
                        onChange={(e) => {
                          const newProvider = e.target.value;
                          setAiProvider?.(newProvider);
                          setAiModel?.(getDefaultModel(newProvider));
                        }}
                        className="w-full bg-gray-800 text-white text-[10px] rounded p-1 border border-violet-500/20"
                      >
                        {AI_PROVIDERS.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Modelo */}
                    {aiProvider !== "custom" && getProviderById(aiProvider)?.models.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Target className="w-3 h-3" /> Modelo
                        </span>
                        <select
                          value={aiModel}
                          onChange={(e) => setAiModel?.(e.target.value)}
                          className="w-full bg-gray-800 text-white text-[10px] rounded p-1 border border-emerald-500/20"
                        >
                          {getProviderById(aiProvider)?.models.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Custom URL */}
                    {aiProvider === "custom" && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] text-cyan-300 font-bold uppercase tracking-wider">URL del Endpoint</span>
                        <input
                          type="text"
                          value={aiCustomUrl}
                          onChange={(e) => setAiCustomUrl?.(e.target.value)}
                          placeholder="https://api.example.com/v1/chat/completions"
                          className="w-full bg-gray-800 text-white text-[10px] rounded p-1 border border-cyan-500/20 placeholder:text-slate-600"
                        />
                      </div>
                    )}

                    {/* API Key */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] text-amber-300 font-bold uppercase tracking-wider">API Key — {getProviderById(aiProvider)?.name || aiProvider}</span>
                      <input
                        type="password"
                        value={aiApiKey}
                        onChange={(e) => setAiApiKey?.(e.target.value)}
                        placeholder={getProviderById(aiProvider)?.apiKeyPlaceholder || "sk-..."}
                        className="w-full bg-gray-800 text-white text-[10px] rounded p-1 border border-amber-500/20 placeholder:text-slate-600"
                      />
                      {aiApiKey ? (
                        <span className="text-[7px] text-emerald-400">✓ API Key configurada</span>
                      ) : (
                        <span className="text-[7px] text-amber-400/60">Ingresa la API Key de este proveedor</span>
                      )}
                    </div>

                    {/* Análisis Técnico */}
                    <label className="flex items-center gap-2 cursor-pointer text-[10px] text-slate-300 bg-slate-800/40 rounded-lg px-2 py-1.5 border border-slate-700/30">
                      <input
                        type="checkbox"
                        checked={enableTechnicalAnalysis}
                        onChange={(e) => onToggleTechnicalAnalysis?.(e.target.checked)}
                        className="accent-emerald-500"
                      />
                            <span className="font-bold uppercase tracking-wider text-[9px]">Análisis Técnico {enableTechnicalAnalysis ? '✅' : ''}</span>
                    </label>
                  </div>
                )}

                {/* Loading State / Converting TTS State */}
                {(isAiAnalyzing || isConvertingTts) && (
                  <div className="flex flex-col items-center justify-center py-12 text-violet-400 gap-4">
                    <div className="relative w-12 h-12">
                      <svg className="animate-spin w-12 h-12" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-90" />
                      </svg>
                      {isConvertingTts ? (
                        <Volume2 className="absolute inset-0 w-5 h-5 m-auto text-violet-300" />
                      ) : (
                        <Brain className="absolute inset-0 w-5 h-5 m-auto text-violet-300" />
                      )}
                    </div>
                    <p className="text-xs uppercase font-black tracking-[0.3em]">Cargando, por favor espere</p>
                    
                    {isConvertingTts ? (
                      <p className="text-[9px] text-violet-400/60 uppercase tracking-widest font-medium">Convirtiendo lenguaje natural a voz...</p>
                    ) : aiAnalysisProgress ? (
                      <p className="text-[9px] text-violet-400/60 uppercase tracking-widest font-medium">Convirtiendo PGN a lenguaje natural...</p>
                    ) : (
                      <p className="text-[9px] text-violet-400/60 uppercase tracking-widest font-medium">Convirtiendo PGN a lenguaje natural...</p>
                    )}
                  </div>
                )}

                {/* Always show results as they arrive, but hide TTS player if loading */}
                {(aiGeneralResult || aiTechnicalResult || aiAnalysisResult) && (
                  <>
                    {onReAnalyze && (
                      <button
                        onClick={onReAnalyze}
                        className="flex items-center gap-1.5 px-3 py-2 bg-violet-900/20 border border-violet-500/20 rounded-xl text-[9px] text-violet-300 hover:bg-violet-800/30 hover:text-violet-200 transition-all w-full"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span className="font-bold uppercase tracking-widest">Volver a analizar</span>
                      </button>
                    )}

                    {!isWebVersion && !isAiAnalyzing && !isConvertingTts && (
                    <>
                    {/* TTS Controls */}
                    <div className="bg-violet-950/20 border border-violet-500/15 rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setActiveTtsTab("general")}
                            className={cn("px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all", activeTtsTab === "general" ? "bg-violet-500/25 text-violet-200" : "text-slate-500 hover:text-violet-300")}
                          >
                            General
                          </button>
                          {(aiTechnicalResult || aiAnalysisResult?.technical) && (
                            <button
                              onClick={() => setActiveTtsTab("technical")}
                              className={cn("px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all", activeTtsTab === "technical" ? "bg-violet-500/25 text-violet-200" : "text-slate-500 hover:text-violet-300")}
                            >
                              Técnico
                            </button>
                          )}
                        </div>
                        <span className="text-[8px] text-slate-500 font-mono">{ttsEngine === "edge" ? "Neural" : "Web Speech"}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <select value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)} className="flex-1 bg-gray-800 text-white text-[10px] rounded p-1 border border-violet-500/20 min-w-0" title="Seleccionar voz">
                          {availableVoices.length > 0 ? (
                            <>
                              <optgroup label="Español">
                                {availableVoices.filter(v => v.locale.startsWith('es-')).map(v => (
                                  <option key={v.shortName} value={v.shortName}>{v.friendlyName}</option>
                                ))}
                              </optgroup>
                              <optgroup label="English">
                                {availableVoices.filter(v => v.locale.startsWith('en-')).map(v => (
                                  <option key={v.shortName} value={v.shortName}>{v.friendlyName}</option>
                                ))}
                              </optgroup>
                              <optgroup label="Otros">
                                {availableVoices.filter(v => !v.locale.startsWith('es-') && !v.locale.startsWith('en-')).map(v => (
                                  <option key={v.shortName} value={v.shortName}>{v.friendlyName}</option>
                                ))}
                              </optgroup>
                            </>
                          ) : (
                            <>
                              <option value="es-MX-DaliaNeural">Dalia (es-MX)</option>
                              <option value="es-ES-ElviraNeural">Elvira (es-ES)</option>
                              <option value="en-US-JennyNeural">Jenny (en-US)</option>
                            </>
                          )}
                        </select>
                        <button onClick={handleTtsRegenerate} disabled={!aiGeneralResult && !aiTechnicalResult && !aiAnalysisResult?.general && !aiAnalysisResult?.technical} className="px-2 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/20 transition-all disabled:opacity-30 flex items-center gap-1" title="Regenerar audio con la voz actual">
                          <RotateCcw className="w-3 h-3" />
                          <span className="text-[9px] font-bold uppercase">Regen</span>
                        </button>
                        <button onClick={handleTtsDownload} disabled={downloading} className="p-1.5 rounded-lg hover:bg-violet-500/20 text-slate-400 hover:text-violet-300 transition-all disabled:opacity-30" title="Descargar como MP3">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button onClick={handleTtsPlay} className="p-1.5 rounded-lg hover:bg-violet-500/20 text-violet-300 transition-all shrink-0" title={isTtsPaused ? "Reanudar" : isTtsSpeaking ? "Pausar" : "Reproducir"}>
                          {isTtsSpeaking && !isTtsPaused ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        {(isTtsSpeaking || isTtsPaused) && (
                          <button onClick={handleTtsStop} className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-300 transition-all shrink-0" title="Detener">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
                          </button>
                        )}
                        <div className="flex-1 flex items-center gap-1.5 min-w-0">
                          <input type="range" min="0" max={audioDuration || 1} step="0.1" value={audioPosition} onChange={(e) => seekAudio(Number(e.target.value))} className="flex-1 accent-violet-500 h-1 cursor-pointer min-w-0" title="Barra de reproducción" />
                          <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap shrink-0 w-16 text-right">{formatTime(audioPosition)} / {formatTime(audioDuration)}</span>
                        </div>
                      </div>

                        <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setTtsMuted(!ttsMuted)} className="p-1 rounded-lg hover:bg-violet-500/15 text-slate-400 hover:text-violet-300 transition-all">
                            {ttsMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>
                          <input type="range" min="0" max="1" step="0.05" value={ttsMuted ? 0 : ttsVolume} onChange={(e) => { const v = Number(e.target.value); setTtsVolume(v); setTtsMuted(v === 0); }} className="w-14 accent-violet-500 h-1 cursor-pointer" title="Volumen" />
                        </div>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-[9px] text-slate-400 font-semibold shrink-0">Vel</span>
                          <input type="range" min="0.5" max="2.0" step="0.1" value={ttsRate} onChange={(e) => setTtsRate(Number(e.target.value))} className="flex-1 accent-violet-500 h-1 cursor-pointer min-w-0" title="Velocidad" />
                          <span className="text-[9px] text-slate-400 font-mono w-8 text-right shrink-0">{ttsRate.toFixed(1)}x</span>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer text-[9px] text-slate-300 bg-slate-800/30 rounded-lg px-2 py-1.5 border border-slate-700/20">
                        <input
                          type="checkbox"
                          checked={autoPlayOnTtsReady}
                          onChange={(e) => setAutoPlayOnTtsReady(e.target.checked)}
                          className="accent-violet-500"
                        />
                        <span className="font-semibold">Reproducir al convertir</span>
                      </label>
                    </div>

                    {ttsWarning && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-950/30 border border-amber-500/20 rounded-lg text-[9px] text-amber-300">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{ttsWarning}</span>
                        <button onClick={() => setTtsWarning(null)} className="ml-auto text-amber-400/50 hover:text-amber-300">x</button>
                      </div>
                    )}

                    {ttsReadyNotification && (
                      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[3000] px-5 py-3 bg-emerald-900/90 border border-emerald-500/40 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center gap-2 transition-all animate-in fade-in duration-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span className="text-[11px] text-emerald-100 font-bold">Audio convertido — listo para reproducir</span>
                      </div>
                    )}

                    <button onClick={() => setShowTtsSettings(!showTtsSettings)} className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700/30 rounded-xl text-[9px] text-slate-400 hover:text-violet-300 hover:border-violet-500/20 transition-all w-full">
                      <Settings className="w-3 h-3" />
                      <span className="font-bold uppercase tracking-widest">Motor TTS</span>
                      <div className="flex-1" />
                      <ChevronDown className={cn("w-3 h-3 transition-transform", showTtsSettings && "rotate-180")} />
                    </button>

                    {showTtsSettings && (
                      <div className="bg-slate-900/60 border border-slate-700/30 rounded-xl p-3 flex flex-col gap-3">
                        <div>
                          <span className="text-[9px] text-slate-400 font-semibold block mb-1.5">Seleccionar Motor</span>
                          <div className="flex flex-col gap-1.5">
                            <label className="flex items-center gap-2 cursor-pointer text-[10px] text-slate-300">
                              <input type="radio" name="ttsEngine" value="edge" checked={ttsEngine === "edge"} onChange={() => setTtsEngine("edge")} className="accent-violet-500" />
                              edge-tts (Neural, Electron)
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-[10px] text-slate-300">
                              <input type="radio" name="ttsEngine" value="webspeech" checked={ttsEngine === "webspeech"} onChange={() => setTtsEngine("webspeech")} className="accent-violet-500" />
                              Web Speech API (Navegador)
                            </label>
                          </div>
                        </div>
                        <div className="text-[8px] text-slate-500 bg-slate-800/50 rounded-lg px-2 py-1.5">
                          {ttsEngine === "edge" ? "edge-tts usa voces neuronales de Microsoft. Requiere Electron." : "Web Speech API es gratuita pero la calidad depende del navegador."}
                        </div>
                      </div>
                    )}
                    </>
                    )}

                    {aiFallbackInfo && aiFallbackInfo.fellBack && (
                      <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-amber-300 font-bold uppercase tracking-wider">Modelo alternativo usado</span>
                          <span className="text-[8px] text-slate-400">Original: {aiFallbackInfo.originalProvider} — {aiFallbackInfo.originalModel}</span>
                          <span className="text-[8px] text-amber-300">Usado: {aiFallbackInfo.usedProvider} — {aiFallbackInfo.usedModel}</span>
                          {aiFallbackInfo.reason && <span className="text-[8px] text-slate-500">{aiFallbackInfo.reason}</span>}
                        </div>
                      </div>
                    )}

                    {aiFallbackInfo && !aiFallbackInfo.fellBack && (
                      <div className="bg-emerald-950/20 border border-emerald-500/15 rounded-xl px-3 py-2 flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="text-[8px] text-emerald-300">Modelo principal: {aiFallbackInfo.usedProvider} — {aiFallbackInfo.usedModel}</span>
                      </div>
                    )}

                    {/* Análisis General */}
                    {(aiGeneralResult || aiAnalysisResult?.general) && (
                      <div className="bg-slate-900/80 border border-violet-500/20 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2 border-b border-violet-500/10 pb-2">
                          <Brain className="w-4 h-4 text-violet-400" />
                          <span className="text-[10px] text-violet-300 font-black uppercase tracking-[0.2em]">Análisis General</span>
                        </div>
                        <div className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto custom-scrollbar">
                          {aiGeneralResult || aiAnalysisResult?.general || ""}
                        </div>
                      </div>
                    )}

                    {isAiGeneralLoading && !aiGeneralResult && (
                      <div className="bg-slate-900/60 border border-violet-500/20 rounded-xl p-4 flex items-center justify-center gap-3">
                        <svg className="animate-spin w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-90" />
                        </svg>
                        <span className="text-[9px] text-violet-400 uppercase tracking-widest font-bold">Esperando análisis general...</span>
                      </div>
                    )}

                    {/* Análisis Técnico */}
                    {(aiTechnicalResult || aiAnalysisResult?.technical) && (
                      <div className="bg-slate-900/80 border border-emerald-500/20 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-2">
                          <Brain className="w-4 h-4 text-emerald-400" />
                          <span className="text-[10px] text-emerald-300 font-black uppercase tracking-[0.2em]">Análisis Técnico</span>
                        </div>
                        <div className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto custom-scrollbar">
                          {aiTechnicalResult || aiAnalysisResult?.technical || ""}
                        </div>
                      </div>
                    )}

                    {isAiTechnicalLoading && !aiTechnicalResult && (
                      <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-center gap-3">
                        <svg className="animate-spin w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-90" />
                        </svg>
                        <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-bold">Esperando análisis técnico...</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-black/60 border-t border-teal-900/30 flex justify-between items-center shrink-0">
          <span className="text-[9px] text-teal-600/40 uppercase font-black tracking-[0.4em]">GM-3000 Master Analysis Engine v3.1</span>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {currentEvalData ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-teal-500/20 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                ))
              ) : (
                <div className="text-[10px] text-slate-400/80 font-bold">Sin datos de análisis</div>
              )}
            </div>
            {cloudAnalysis ? (
              <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-[0.25em]">Chess API conectado</div>
            ) : cloudError ? (
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-[0.25em]">Sin datos cloud</div>
            ) : (
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.25em]">Sin datos cloud</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
