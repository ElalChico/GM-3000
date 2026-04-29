import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Chess } from "chess.js";
import { generateTrainingFen, generateChess960Fen } from "./utils/fenGenerator";
import { Chessboard } from "react-chessboard";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import {
  Settings,
  Play,
  Pause,
  RefreshCw,
  Cpu,
  User,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  PlayCircle,
  Maximize,
  Minimize,
  ExternalLink,
  X,
  Undo2,
  Redo2,
  Power,
  Square,
  Github,
  MessageCircle,
  Copy,
  FolderOpen,
  Trash2,
  Flag,
  Handshake,
  PawPrint,
  Wifi,
  Globe,
  Monitor,
  Search,
  Eye,
  EyeOff
} from "lucide-react";
import { Rnd } from "react-rnd";
import { StockfishEngineWhite, EngineMessage } from "./engine/StockfishWhite";
import { StockfishEngineBlack } from "./engine/StockfishBlack";
import { LiteEngine } from "./engine/LiteEngine";
import { EvalBar } from "./components/EvalBar";
import { cn } from "@/src/lib/utils";
import BannerImg from "./assets/Banner.webp";
import KittenImg from "./assets/dark_cat.webp";

import { NeuralTree } from "./components/NeuralTree";
import { useLanMultiplayer, LanMove, LanGameState } from "./hooks/useLanMultiplayer";

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState<string[]>([]);
  const [rightTab, setRightTab] = useState<"history" | "neural">("neural");
  const [showHostIps, setShowHostIps] = useState(false);
  const [showManualIp, setShowManualIp] = useState(false);

  const [whitePlayer, setWhitePlayer] = useState<"human" | "ai">("human");
  const [blackPlayer, setBlackPlayer] = useState<"human" | "ai">("ai");
  const [whiteAiDepth, setWhiteAiDepth] = useState(10);
  const [blackAiDepth, setBlackAiDepth] = useState(10);
  const [whiteEngineName, setWhiteEngineName] = useState<string>(() => {
    return localStorage.getItem("chess_whiteEngineName") || "";
  });
  const [blackEngineName, setBlackEngineName] = useState<string>(() => {
    return localStorage.getItem("chess_blackEngineName") || "";
  });
  const [whiteAiSpeed, setWhiteAiSpeed] = useState(300); // ms per move
  const [blackAiSpeed, setBlackAiSpeed] = useState(300);
  const [whiteEngineType, setWhiteEngineType] = useState<string>(() => {
    return (localStorage.getItem("chess_whiteEngineType") as any) || "stockfish";
  });
  const [blackEngineType, setBlackEngineType] = useState<string>(() => {
    return (localStorage.getItem("chess_blackEngineType") as any) || "stockfish";
  });
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">(
    () => {
      const saved = localStorage.getItem("chess_boardOrientation");
      return (saved as "white" | "black") || "white";
    },
  );
  const [language, setLanguage] = useState<"en" | "es">(() => {
    const saved = localStorage.getItem("chess_language");
    return (saved as "en" | "es") || "es";
  });
  const [neuralStyle, setNeuralStyle] = useState<
    "classic" | "simple" | "stream" | "organic" | "quantum" | "neural_flow"
  >(() => {
    const saved = localStorage.getItem("chess_neuralStyle");
    // migrate old values
    const migrated: Record<string, string> = { radar: 'quantum', void: 'neural_flow', blueprint: 'organic', hologram: 'neural_flow' };
    const v = (saved as any) || "classic";
    return (migrated[v] || v) as any;
  });
  const [neuralViewMode, setNeuralViewMode] = useState<"both" | "white" | "black">("both");
  const [viewingMoveIndex, setViewingMoveIndex] = useState<number | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isLoadedPgn, setIsLoadedPgn] = useState(false);
  const [moveEvaluations, setMoveEvaluations] = useState<number[]>([]);
  const [moveTimes, setMoveTimes] = useState<{ w: number, b: number }[]>([]);

  const [isNeuralVisionEnabled, setIsNeuralVisionEnabled] = useState(() => {
    const saved = localStorage.getItem("chess_isNeuralVisionEnabled");
    return saved === null ? true : saved === "true";
  });

  const isNeuralVisionEnabledRef = useRef(isNeuralVisionEnabled);
  useEffect(() => {
    isNeuralVisionEnabledRef.current = isNeuralVisionEnabled;
    triggerEngine(gameRef.current);
  }, [isNeuralVisionEnabled]);

  const [boardSize, setBoardSize] = useState<"small" | "medium" | "large" | "fill">(() => {
    return (localStorage.getItem("chess_boardSize") as any) || "medium";
  });
  const [boardTheme, setBoardTheme] = useState<string>(() => {
    return localStorage.getItem("chess_boardTheme") || "gray";
  });
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("chess_isSoundEnabled");
    return saved === null ? true : saved === "true";
  });
  const [isEngineVisible, setIsEngineVisible] = useState(() => {
    const saved = localStorage.getItem("chess_isEngineVisible");
    return saved === null ? true : saved === "true";
  });
  const [isUndoEnabled, setIsUndoEnabled] = useState(() => {
    return localStorage.getItem("chess_isUndoEnabled") === "true";
  });
  const [quickSelectOpen, setQuickSelectOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const [matchStats, setMatchStats] = useState<{
    hh: { w: number, b: number, d: number, total: number },
    hm: { w: number, b: number, d: number, total: number },
    mh: { w: number, b: number, d: number, total: number },
    mm: { w: number, b: number, d: number, total: number }
  }>(() => {
    const saved = localStorage.getItem("chess_matchStatsV2");
    if (saved) return JSON.parse(saved);
    const oldSaved = localStorage.getItem("chess_matchStats");
    if (oldSaved) {
      // Migrate old stats to "mm" by default or just reset
      return {
        hh: { w: 0, b: 0, d: 0, total: 0 }, hm: { w: 0, b: 0, d: 0, total: 0 }, mh: { w: 0, b: 0, d: 0, total: 0 }, mm: { w: 0, b: 0, d: 0, total: 0 }
      };
    }
    return { hh: { w: 0, b: 0, d: 0, total: 0 }, hm: { w: 0, b: 0, d: 0, total: 0 }, mh: { w: 0, b: 0, d: 0, total: 0 }, mm: { w: 0, b: 0, d: 0, total: 0 } };
  });

  const [tournament, setTournament] = useState<{ active: boolean, mode: "none" | "infinite" | "rounds", maxRounds: number, currentRound: number }>(() => {
    const saved = localStorage.getItem("chess_tournament");
    return saved ? JSON.parse(saved) : { active: false, mode: "none", maxRounds: 5, currentRound: 1 };
  });


  const [initialTimeMin, setInitialTimeMin] = useState(10);
  const [whiteTime, setWhiteTime] = useState(600); // 10 mins
  const [blackTime, setBlackTime] = useState(600);
  const [timerActive, setTimerActive] = useState(false);
  const [timeOutWinner, setTimeOutWinner] = useState<"w" | "b" | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [startCountdown, setStartCountdown] = useState<number | null>(null);
  const [moveFrom, setMoveFrom] = useState("");

  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!hasStarted) {
      setWhiteTime(initialTimeMin * 60);
      setBlackTime(initialTimeMin * 60);
    }
  }, [initialTimeMin, hasStarted]);

  const [gameResult, setGameResult] = useState<string | null>(null);
  const [preMoves, setPreMoves] = useState<string[]>([]);

  const gameRecordedRef = useRef(false);

  useEffect(() => {
    if (history.length <= 1) {
      gameRecordedRef.current = false;
    }
  }, [history]);

  useEffect(() => {
    if (hasStarted && (game.isGameOver() || timeOutWinner || gameResult) && !gameRecordedRef.current) {
      gameRecordedRef.current = true;
      let winner = "";
      if (gameResult && gameResult.includes("Blancas ganan")) winner = "w";
      else if (gameResult && gameResult.includes("Negras ganan")) winner = "b";
      else if (gameResult && gameResult.includes("Tablas")) winner = "draw";
      else if (timeOutWinner) winner = timeOutWinner;
      else if (game.isCheckmate()) winner = game.turn() === 'w' ? 'b' : 'w';
      else if (game.isDraw()) winner = "draw";

      if (winner) {
        // Determine matchup type
        let matchupType: "hh" | "hm" | "mh" | "mm" = "hh";
        if (whitePlayer === "human" && blackPlayer === "ai") matchupType = "hm";
        else if (whitePlayer === "ai" && blackPlayer === "human") matchupType = "mh";
        else if (whitePlayer === "ai" && blackPlayer === "ai") matchupType = "mm";

        setMatchStats(prev => {
          const next = { ...prev };
          const ms = { ...next[matchupType] };
          ms.total++;
          if (winner === "w") ms.w++;
          else if (winner === "b") ms.b++;
          else ms.d++;
          next[matchupType] = ms;
          localStorage.setItem("chess_matchStatsV2", JSON.stringify(next));
          return next;
        });

        // Handle Tournament specific logic
        setTournament(prev => {
          if (!prev.active) return prev;
          if (prev.mode === "rounds" && prev.currentRound >= prev.maxRounds) {
            // Tournament ended. Let it rest.
            return { ...prev, active: false };
          }
          // Advance round
          return { ...prev, currentRound: prev.currentRound + 1 };
        });
      }
    }
  }, [game, timeOutWinner, gameResult, hasStarted, history, whitePlayer, blackPlayer]);


  const [preMoveMode, setPreMoveMode] = useState<"disabled" | "single" | "multiple">("multiple");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isConfigSidebarOpen, setIsConfigSidebarOpen] = useState(true);
  const [showTournamentManager, setShowTournamentManager] = useState(false);

  const [moveComments, setMoveComments] = useState<Record<number, string>>({});
  const [moveArrows, setMoveArrows] = useState<Record<number, string[][]>>({});

  // ── Perfil de Usuario ────────────────────────────────────────
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem("chess_playerName") || "";
  });
  useEffect(() => {
    localStorage.setItem("chess_playerName", playerName);
  }, [playerName]);

  // ── Multijugador LAN (estado local) ──────────────────────────
  const [lanPreferredColor, setLanPreferredColor] = useState<"white" | "black" | "random">("white");
  const [lanManualIp, setLanManualIp] = useState("");

  // Los callbacks y el hook se instancian más abajo (después de playAudio/gameRef/etc.)
  const lanSendMoveRef = useRef<((data: any) => void) | null>(null);
  const lanStatusRef = useRef<string>("disconnected");
  const lanMyColorRef = useRef<"white" | "black">("white");

  useEffect(() => {
    const savedSession = sessionStorage.getItem('chess_gm2000_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.moveComments) setMoveComments(parsed.moveComments);
        if (parsed.moveArrows) setMoveArrows(parsed.moveArrows);
        if (parsed.fen) {
          const g = new Chess();
          if (parsed.history && parsed.history.length > 0) {
            for (const h of parsed.history) {
              try { g.move(h); } catch (e) { }
            }
            setGame(g);
            setHasStarted(true);
          } else {
            g.load(parsed.fen);
            setGame(g);
            if (parsed.fen !== "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1") {
              setHasStarted(true);
            }
          }
        }
        if (parsed.isLoadedPgn) setIsLoadedPgn(parsed.isLoadedPgn);
      } catch (e) { }
    }
  }, []);





  const historyFens = useMemo(() => {
    const tempGame = new Chess();
    const fens = [tempGame.fen()];
    history.forEach(move => {
      try {
        tempGame.move(move);
        fens.push(tempGame.fen());
      } catch (e) { }
    });
    return fens;
  }, [history]);

  useEffect(() => {
    sessionStorage.setItem('chess_gm2000_session', JSON.stringify({
      moveComments,
      moveArrows,
      fen: game.fen(),
      history,
      historyFens,
      isLoadedPgn
    }));
  }, [moveComments, moveArrows, game, history, historyFens, isLoadedPgn]);

  // GM-2000 Features Options
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState("smooth");
  const [isFreeMode, setIsFreeMode] = useState(false);
  const [isInvisiblePieces, setIsInvisiblePieces] = useState(false);
  const [revealedSquare, setRevealedSquare] = useState<string | null>(null);
  const [isRevealMode, setIsRevealMode] = useState(false);
  const [showLegalMoves, setShowLegalMoves] = useState(true);
  const [showLastMove, setShowLastMove] = useState(true);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string, to: string, color: string } | null>(null);
  const [isThreatRadarActive, setIsThreatRadarActive] = useState(false);
  const [threatRadarMode, setThreatRadarMode] = useState<"global" | "active">("global");
  const [showCheckRadar, setShowCheckRadar] = useState(true);
  const [showAttackRadar, setShowAttackRadar] = useState(true);
  const [showHints, setShowHints] = useState(true);

  // GM-2000 Free, Training, Freestyle
  const [isTrainingMode, setIsTrainingMode] = useState(false);
  const [trainingPiecesW, setTrainingPiecesW] = useState({ q: 1, r: 2, b: 2, n: 2, p: 8 });
  const [trainingPiecesB, setTrainingPiecesB] = useState({ q: 1, r: 2, b: 2, n: 2, p: 8 });
  const [trainingPreset, setTrainingPreset] = useState("custom");

  const [isFreestyleMode, setIsFreestyleMode] = useState(false);
  const [freestyleType, setFreestyleType] = useState<"960">("960");

  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [pgnLibrary, setPgnLibrary] = useState<{ name: string, content: string }[]>(() => {
    const saved = localStorage.getItem("chess_pgnLibrary");
    return saved ? JSON.parse(saved) : [];
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const appContainerRef = useRef<HTMLDivElement>(null);

  // Estado de análisis del motor
  const [evalScore, setEvalScore] = useState(0);
  const [evalMate, setEvalMate] = useState<number | undefined>();
  const [bestLine, setBestLine] = useState("");
  const [currentVariations, setCurrentVariations] = useState<any[]>([]);
  const [whiteVariations, setWhiteVariations] = useState<any[]>([]);
  const [blackVariations, setBlackVariations] = useState<any[]>([]);
  const [parsingReport, setParsingReport] = useState<{ total: number, omitted: number, errors: number } | null>(null);

  const [whiteStats, setWhiteStats] = useState<any>(null);
  const [blackStats, setBlackStats] = useState<any>(null);
  const [expandedNeural, setExpandedNeural] = useState<
    "none" | "white" | "black" | "current"
  >("none");

  // Referencias a motores duales — pueden contener tanto Stockfish como el motor Lite
  const engineWhiteRef = useRef<StockfishEngineWhite | LiteEngine | null>(null);
  const engineBlackRef = useRef<StockfishEngineBlack | LiteEngine | null>(null);
  const whiteEngineTypeRef = useRef(whiteEngineType);
  const blackEngineTypeRef = useRef(blackEngineType);

  // Referencias para callbacks para evitar ciclos de dependencias manteniendo el acceso al estado actualizado
  const gameRef = useRef(game);
  const whitePlayerRef = useRef(whitePlayer);
  const blackPlayerRef = useRef(blackPlayer);
  const whiteAiDepthRef = useRef(whiteAiDepth);
  const blackAiDepthRef = useRef(blackAiDepth);
  const timeOutWinnerRef = useRef(timeOutWinner);
  const isPausedRef = useRef(isPaused);
  const hasStartedRef = useRef(hasStarted);
  const turnRef = useRef(game.turn());
  const historyRef = useRef(history);

  const whiteAiSpeedRef = useRef(whiteAiSpeed);
  const blackAiSpeedRef = useRef(blackAiSpeed);
  const quickStartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const whiteTimeRef = useRef(whiteTime);
  const blackTimeRef = useRef(blackTime);

  useEffect(() => {
    whiteTimeRef.current = whiteTime;
  }, [whiteTime]);
  useEffect(() => {
    blackTimeRef.current = blackTime;
  }, [blackTime]);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);
  useEffect(() => {
    whitePlayerRef.current = whitePlayer;
  }, [whitePlayer]);
  useEffect(() => {
    blackPlayerRef.current = blackPlayer;
  }, [blackPlayer]);
  useEffect(() => {
    whiteAiDepthRef.current = whiteAiDepth;
  }, [whiteAiDepth]);
  useEffect(() => {
    blackAiDepthRef.current = blackAiDepth;
  }, [blackAiDepth]);
  useEffect(() => {
    whiteAiSpeedRef.current = whiteAiSpeed;
  }, [whiteAiSpeed]);
  useEffect(() => {
    blackAiSpeedRef.current = blackAiSpeed;
  }, [blackAiSpeed]);
  useEffect(() => {
    timeOutWinnerRef.current = timeOutWinner;
  }, [timeOutWinner]);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    hasStartedRef.current = hasStarted;
  }, [hasStarted]);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  useEffect(() => {
    whiteEngineTypeRef.current = whiteEngineType;
    localStorage.setItem("chess_whiteEngineType", whiteEngineType);
  }, [whiteEngineType]);
  useEffect(() => {
    localStorage.setItem("chess_whiteEngineName", whiteEngineName);
  }, [whiteEngineName]);
  useEffect(() => {
    blackEngineTypeRef.current = blackEngineType;
    localStorage.setItem("chess_blackEngineType", blackEngineType);
  }, [blackEngineType]);
  useEffect(() => {
    localStorage.setItem("chess_blackEngineName", blackEngineName);
  }, [blackEngineName]);

  useEffect(() => {
    localStorage.setItem("chess_tournament", JSON.stringify(tournament));
  }, [tournament]);

  useEffect(() => {
    localStorage.setItem("chess_language", language);
  }, [language]);
  useEffect(() => {
    localStorage.setItem("chess_boardOrientation", boardOrientation);
  }, [boardOrientation]);
  useEffect(() => {
    localStorage.setItem("chess_neuralStyle", neuralStyle);
  }, [neuralStyle]);
  useEffect(() => {
    localStorage.setItem(
      "chess_isNeuralVisionEnabled",
      String(isNeuralVisionEnabled),
    );
  }, [isNeuralVisionEnabled]);
  useEffect(() => {
    localStorage.setItem("chess_boardSize", boardSize);
  }, [boardSize]);
  useEffect(() => {
    localStorage.setItem("chess_boardTheme", boardTheme);
  }, [boardTheme]);
  useEffect(() => {
    localStorage.setItem("chess_isSoundEnabled", String(isSoundEnabled));
  }, [isSoundEnabled]);
  useEffect(() => {
    localStorage.setItem("chess_isEngineVisible", String(isEngineVisible));
  }, [isEngineVisible]);
  useEffect(() => {
    localStorage.setItem("chess_isUndoEnabled", String(isUndoEnabled));
  }, [isUndoEnabled]);

  useEffect(() => {
    localStorage.setItem("chess_pgnLibrary", JSON.stringify(pgnLibrary));
  }, [pgnLibrary]);

  const isSoundEnabledRef = useRef(isSoundEnabled);
  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      appContainerRef.current?.requestFullscreen().catch((err) => {
        console.warn(
          `Error attempting to enable fullscreen mode: ${err.message}`,
        );
      });
    } else {
      document.exitFullscreen();
    }
  };

  // --- Sistema de Audio --- (Sonidos de código abierto de Lichess, licencia AGPL)
  const SOUND_MAP: Record<string, string> = {
    move: "https://lichess1.org/assets/sound/standard/Move.mp3",
    capture: "https://lichess1.org/assets/sound/standard/Capture.mp3",
    jaque: "https://lichess1.org/assets/sound/standard/GenericNotify.mp3",
    check: "https://lichess1.org/assets/sound/standard/GenericNotify.mp3",
    mate: "https://lichess1.org/assets/sound/standard/GenericNotify.mp3",
    start: "https://lichess1.org/assets/sound/standard/GenericNotify.mp3",
    draw: "https://lichess1.org/assets/sound/standard/GenericNotify.mp3",
    tiempofinalizado: "https://lichess1.org/assets/sound/standard/LowTime.mp3",
    timelow: "https://lichess1.org/assets/sound/standard/LowTime.mp3",
    error: "https://lichess1.org/assets/sound/standard/Error.mp3",
    victory: "https://lichess1.org/assets/sound/standard/GenericNotify.mp3",
    enroque: "/sounds/enroque.mp3",
    torre: "/sounds/torre.mp3",
    torrefast: "/sounds/torrefast.mp3",
    save: "/sounds/save.mp3",
    connect_error: "/sounds/connect error.mp3",
    connect: "/sounds/connect.mp3",
  };

  // Pre-cachear objetos de Audio para que la reproducción sea instantánea (sin creación de objetos en cada reproducción)
  const audioCacheRef = useRef<Record<string, HTMLAudioElement>>({});
  useEffect(() => {
    Object.entries(SOUND_MAP).forEach(([id, url]) => {
      const audio = new Audio(url);
      audio.preload = "auto";
      if (id === "torrefast" || id === "torre" || id === "enroque") {
        audio.volume = 0.95; // Un poco más alto
      } else {
        audio.volume = 0.7;
      }
      audioCacheRef.current[id] = audio;
    });
  }, []);

  const lastPlayedRef = useRef<Record<string, number>>({});
  const lastAnySoundRef = useRef(0);
  const playAudio = useCallback((id: string) => {
    if (!isSoundEnabledRef.current) return;
    try {
      const now = Date.now();
      // Reducir throttle agresivo para evitar perder sonidos de movimientos rápidos
      if (now - lastAnySoundRef.current < 50) return;
      if (lastPlayedRef.current[id] && now - lastPlayedRef.current[id] < 50) return;
      lastPlayedRef.current[id] = now;
      lastAnySoundRef.current = now;

      // Usar el audio cacheado directamente y resetear su tiempo para evitar el delay de cloneNode
      const audio = audioCacheRef.current[id];
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => { });
      }
    } catch (e) {
      // Ignore audio errors
    }
  }, []);

  // --- Lógica del Reloj ---
  const formatTime = (seconds: number) => {
    const m = Math.floor(Math.abs(seconds) / 60);
    const s = Math.abs(seconds) % 60;
    return `${seconds < 0 ? "-" : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // (los sonidos se pre-cachean en el useEffect de arriba)

  const handleTimeOut = useCallback(
    (color: "w" | "b") => {
      setTimerActive(false);
      // Si 'w' se quedó sin tiempo, gana 'b'.
      setTimeOutWinner(color === "w" ? "b" : "w");
      playAudio("tiempofinalizado");
    },
    [playAudio],
  );

  // Lógica del Temporizador
  useEffect(() => {
    turnRef.current = game.turn();
    hasStartedRef.current = hasStarted;
    isPausedRef.current = isPaused;
  }, [game, hasStarted, isPaused]);

  useEffect(() => {
    if (!timerActive || timeOutWinner || isSyncing) return;

    const interval = setInterval(() => {
      if (!hasStartedRef.current || isPausedRef.current || game.isGameOver())
        return;

      if (turnRef.current === "w") {
        setWhiteTime((t) => {
          if (t <= 1) {
            handleTimeOut("w");
            return 0;
          }
          return t - 1;
        });
      } else {
        setBlackTime((t) => {
          if (t <= 1) {
            handleTimeOut("b");
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, timeOutWinner, handleTimeOut]);

  const resetGameRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (hasStarted && (game.isGameOver() || timeOutWinner)) {
      if (tournament.active && tournament.mode !== "none") {
        const timer = setTimeout(() => {
          resetGameRef.current?.();
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [game, timeOutWinner, hasStarted, tournament.active, tournament.mode, whitePlayer, blackPlayer]);

  // --- Lógica de Juego y Motor ---
  const executeMove = useCallback(
    (
      moveStr: string | { from: string; to: string; promotion?: string },
      isRedo = false,
      isPreMove = false,
      isLanSync = false,
    ) => {
      if (!hasStartedRef.current && !isPreMove) return false;
      try {
        const g = new Chess(gameRef.current.fen());
        const moveObj: any =
          typeof moveStr === "string"
            ? {
              from: moveStr.substring(0, 2),
              to: moveStr.substring(2, 4)
            }
            : { from: moveStr.from, to: moveStr.to };

        if (typeof moveStr === "string" && moveStr.length > 4) {
          moveObj.promotion = moveStr[4];
        } else if (typeof moveStr !== "string" && moveStr.promotion) {
          moveObj.promotion = moveStr.promotion;
        }

        const move = g.move(moveObj);

        if (move) {
          const newHistory = [...historyRef.current, move.san];
          const moveIndex = newHistory.length - 1;

          setGame(g);
          setHistory(newHistory);
          setMoveEvaluations((prev) => {
            const newEvals = [...prev];
            newEvals[moveIndex] = evalScore;
            return newEvals;
          });
          setMoveTimes((prev) => {
            const newTimes = [...prev];
            newTimes[moveIndex] = { w: whiteTime, b: blackTime };
            return newTimes;
          });
          setTimerActive(true);
          setMoveFrom("");
          if (!isRedo) setRedoStack([]);

          if (g.isCheckmate()) { playAudio("mate"); }
          else if (g.isDraw()) { playAudio("draw"); }
          else if (g.inCheck()) { playAudio("jaque"); }
          else if (move.flags.includes("c") || move.flags.includes("e")) { playAudio("capture"); }
          else if (move.flags.includes("k") || move.flags.includes("q")) { playAudio("enroque"); }
          else if (move.piece === "r") {
            const colDiff = Math.abs(move.from.charCodeAt(0) - move.to.charCodeAt(0));
            const rowDiff = Math.abs(move.from.charCodeAt(1) - move.to.charCodeAt(1));
            const distance = Math.max(colDiff, rowDiff);
            if (distance === 1) playAudio("torrefast"); else playAudio("torre");
          } else { playAudio("move"); }

          // Enviar movimiento al oponente LAN (si está conectado)
          if (lanSendMoveRef.current && !isLanSync) {
            lanSendMoveRef.current({
              move: { from: move.from, to: move.to, promotion: move.promotion },
              fen: g.fen(),
              history: newHistory,
              whiteTime: whiteTimeRef.current,
              blackTime: blackTimeRef.current,
            });
          }

          return true;
        } else {
          console.error("[executeMove] g.move returned null for moveObj:", moveObj, "FEN:", g.fen());
        }
      } catch (e) {
        console.error("[executeMove] Exception during g.move:", e, "for moveObj:", moveStr);
      }
      return false;
    },
    [playAudio],
  );

  // ── Callbacks y Hook de LAN Multiplayer ─────────────────────────
  const handleLanMoveReceived = useCallback((lanMove: LanMove) => {
    if (lanMove.move) {
      const res = executeMove(lanMove.move, false, false, true);
      // Si por alguna razón executeMove falló (ej. desincronización de PGN), forzamos el estado recibido
      if (!res && lanMove.fen) {
        const g = new Chess(lanMove.fen);
        setGame(g);
        if (lanMove.history) setHistory(lanMove.history);
      }
    }
    if (lanMove.whiteTime !== undefined) {
      setWhiteTime(lanMove.whiteTime);
      whiteTimeRef.current = lanMove.whiteTime;
    }
    if (lanMove.blackTime !== undefined) {
      setBlackTime(lanMove.blackTime);
      blackTimeRef.current = lanMove.blackTime;
    }
  }, [executeMove]);

  const handleLanStateReceived = useCallback((state: LanGameState) => {
    if (state.fen) {
      const g = new Chess(state.fen);
      setGame(g);
      gameRef.current = g;
    }
    if (state.history) setHistory(state.history);
    if (state.whiteTime !== undefined) {
      setWhiteTime(state.whiteTime);
      whiteTimeRef.current = state.whiteTime;
    }
    if (state.blackTime !== undefined) {
      setBlackTime(state.blackTime);
      blackTimeRef.current = state.blackTime;
    }
    if (state.hasStarted !== undefined) {
      setHasStarted(state.hasStarted);
      hasStartedRef.current = state.hasStarted;
      if (state.hasStarted) {
        // GUEST: Reiniciar juego desde cero al recibir inicio del host
        setGame(new Chess(state.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"));
        setHistory([]);
        setViewingMoveIndex(null);
        setGameResult(null);
        setTimerActive(true);
      }
    }
    if (state.whitePlayer) {
      setWhitePlayer(state.whitePlayer as any);
      whitePlayerRef.current = state.whitePlayer as any;
    }
    if (state.blackPlayer) {
      setBlackPlayer(state.blackPlayer as any);
      blackPlayerRef.current = state.blackPlayer as any;
    }
    if (state.gameResult !== undefined) {
      setGameResult(state.gameResult);
    }
    if (state.isPaused !== undefined) {
      setIsPaused(state.isPaused);
      isPausedRef.current = state.isPaused;
      if (state.isPaused) setTimerActive(false);
      else if (state.hasStarted && !state.gameResult && !gameRef.current.isGameOver()) setTimerActive(true);
    }
    if (state.timeControlIndex !== undefined) {
      setTimeControlIndex(state.timeControlIndex);
    }
    if ((state as any).initialTimeMin !== undefined) {
      setInitialTimeMin((state as any).initialTimeMin);
    }
    if (state.isPreparing === true) {
      setIsConfigSidebarOpen(false);
      setStartCountdown(3);
      const countdownInterval = setInterval(() => {
        setStartCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    // IMPORTANTE: NO actualizar boardOrientation desde el estado remoto. 
    // La orientación visual siempre debe dictarla 'lanMyColor' localmente.
  }, []);

  // No reproducir sonidos en estos callbacks — se gestionan con el useEffect de abajo
  const handleLanPlayerJoined = useCallback((_color: "white" | "black") => { }, []);
  const handleLanPlayerLeft = useCallback(() => { }, []);

  const {
    role: lanRole,
    status: lanStatus,
    myColor: lanMyColor,
    opponentConnected: lanOpponentConnected,
    localIps: lanLocalIps,
    hostIp: lanHostIp,
    errorMsg: lanErrorMsg,
    scanResults: lanScanResults,
    isScanning: lanIsScanning,
    connectedPlayers: lanConnectedPlayers,
    playerId: lanPlayerId,
    startHost: lanStartHost,
    joinHost: lanJoinHost,
    sendMove: lanSendMove,
    sendState: lanSendState,
    disconnect: lanDisconnect,
    scanNetwork: lanScanNetwork,
    fetchPlayers: lanFetchPlayers,
  } = useLanMultiplayer({
    onMoveReceived: handleLanMoveReceived,
    onStateReceived: handleLanStateReceived,
    onPlayerJoined: handleLanPlayerJoined,
    onPlayerLeft: handleLanPlayerLeft,
  });

  useEffect(() => {
    lanSendMoveRef.current = lanSendMove;
  }, [lanSendMove]);

  // Sonido único al detectar oponente (protegido por ref para evitar bucles)
  const lanOpponentSoundPlayedRef = useRef(false);
  useEffect(() => {
    if (lanOpponentConnected && !lanOpponentSoundPlayedRef.current) {
      lanOpponentSoundPlayedRef.current = true;
      playAudio("connect");
    }
    if (!lanOpponentConnected) {
      lanOpponentSoundPlayedRef.current = false;
    }
  }, [lanOpponentConnected, playAudio]);

  const lanConnectedSoundPlayedRef = useRef(false);
  const lanErrorSoundPlayedRef = useRef(false);

  useEffect(() => {
    if (lanStatus === "connected" && !lanConnectedSoundPlayedRef.current) {
      lanConnectedSoundPlayedRef.current = true;
      playAudio("connect");
    }
    if (lanStatus !== "connected") {
      lanConnectedSoundPlayedRef.current = false;
    }

    if (lanStatus === "error" && !lanErrorSoundPlayedRef.current) {
      lanErrorSoundPlayedRef.current = true;
      playAudio("connect_error");
    }
    if (lanStatus !== "error") {
      lanErrorSoundPlayedRef.current = false;
    }
  }, [lanStatus, playAudio]);

  useEffect(() => {
    lanStatusRef.current = lanStatus;
    lanMyColorRef.current = lanMyColor;

    if (lanStatus === "connected") {
      setBoardOrientation(lanMyColor as any);
      // Forzar Humano vs Humano para evitar que motores locales respondan solos
      setWhitePlayer("human");
      setBlackPlayer("human");
      whitePlayerRef.current = "human";
      blackPlayerRef.current = "human";
    }
  }, [lanStatus, lanMyColor]);


  useEffect(() => {
    // Auto-iniciar la partida si somos el host y el invitado se conecta (y aún no ha iniciado)
    if (lanStatus === "connected" && lanRole === "host" && lanOpponentConnected && !hasStartedRef.current) {
      setTimeout(() => {
        if (!hasStartedRef.current) startGame();
      }, 500);
    }
  }, [lanStatus, lanRole, lanOpponentConnected]);

  const undoMove = () => {
    setPreMoves([]);
    if (!hasStarted) return;
    if (isLoadedPgn) {
      if (viewingMoveIndex === null) {
        if (history.length > 0) setViewingMoveIndex(history.length - 2);
      } else if (viewingMoveIndex > -1) {
        setViewingMoveIndex(viewingMoveIndex - 1);
      }
      return;
    }
    const g = new Chess();
    g.loadPgn(game.pgn());
    const move = g.undo();
    if (move) {
      setRedoStack((prev) => [move.lan, ...prev]);
      setGame(g);
      setHistory(g.history());
      setTimerActive(false);
    }
  };

  const redoMove = () => {
    setPreMoves([]);
    if (isLoadedPgn) {
      if (viewingMoveIndex !== null && viewingMoveIndex < history.length - 1) {
        const nextIndex = viewingMoveIndex + 1;
        if (nextIndex === history.length - 1) setViewingMoveIndex(null);
        else setViewingMoveIndex(nextIndex);
      }
      return;
    }
    if (redoStack.length === 0) return;
    const stack = [...redoStack];
    const nextMove = stack.shift();
    if (nextMove) {
      setRedoStack(stack);
      executeMove(nextMove, true); // Pasar true para evitar limpiar la pila de rehacer
    }
  };

  const stopGame = () => {
    if (quickStartTimeoutRef.current) clearTimeout(quickStartTimeoutRef.current);

    // Destruir workers para limpiar todo estado zombi
    engineWhiteRef.current?.quit();
    engineBlackRef.current?.quit();
    engineWhiteRef.current = null;
    engineBlackRef.current = null;

    setHasStarted(false);
    hasStartedRef.current = false;
    setGameResult(null);
    setGame(new Chess());
    setHistory([]);
    setRedoStack([]);
    setTimerActive(false);
    setBoardOrientation("white");
    setIsPaused(false);
    isPausedRef.current = false;
    setTimeOutWinner(null);
    timeOutWinnerRef.current = null;
    setEvalScore(0);
    setEvalMate(undefined);
    setBestLine("");
    setWhiteVariations([]);
    setBlackVariations([]);
    setCurrentVariations([]);
    setMoveEvaluations([]);
    setMoveTimes([]);
    setIsAutoPlaying(false);
    setIsLoadedPgn(false);
    setViewingMoveIndex(null);
    setIsSyncing(false);
    setIsConfigSidebarOpen(true);

    // Recrear motores frescos listos para la próxima partida
    const engW = whiteEngineType === "lite"
      ? new LiteEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
      : new StockfishEngineWhite((msg) => handleEngineMessageRef.current?.(msg, "w"));
    engW.init();
    engineWhiteRef.current = engW;

    const engB = blackEngineType === "lite"
      ? new LiteEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
      : new StockfishEngineBlack((msg) => handleEngineMessageRef.current?.(msg, "b"));
    engB.init();
    engineBlackRef.current = engB;
  };

  const handleEngineMessageRef = useRef<((msg: any, color: "w" | "b") => void)>(null);

  const handleEngineMessage = useCallback(
    (msg: EngineMessage, engineColor: "w" | "b") => {
      if (msg.type === "evaluation") {
        setEvalScore(msg.score);
        setEvalMate(msg.mate);
        if (msg.pv) setBestLine(msg.pv);
        if (msg.variations) {
          if (engineColor === "w") {
            setWhiteVariations(msg.variations);
            if (msg.stats) setWhiteStats(msg.stats);
            setCurrentVariations(msg.variations);
          } else {
            setBlackVariations(msg.variations);
            if (msg.stats) setBlackStats(msg.stats);
            setCurrentVariations(msg.variations);
          }
        }
      } else if (msg.type === "bestmove") {
        const currentTurnColor = gameRef.current.turn();
        // Asegurarse de que el motor que envía el movimiento es aquel a quien le toca realmente el turno
        if (
          currentTurnColor === engineColor &&
          !isPausedRef.current &&
          !timeOutWinnerRef.current
        ) {
          executeMove(msg.move);
        }
      }
    },
    [executeMove],
  );

  useEffect(() => {
    handleEngineMessageRef.current = handleEngineMessage;
  }, [handleEngineMessage]);

  // Ref para poder llamar triggerEngine desde dentro de useEffects sin dependencia circular
  const triggerEngineRef = useRef<((g: Chess) => void) | null>(null);

  // Inicializar / re-inicializar motor BLANCO cuando cambia el tipo
  useEffect(() => {
    engineWhiteRef.current?.quit();
    engineWhiteRef.current = null;
    let cancelled = false;

    const eng = whiteEngineType === "lite"
      ? new LiteEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
      : new StockfishEngineWhite((msg) => handleEngineMessageRef.current?.(msg, "w"));

    const p = eng.init();
    engineWhiteRef.current = eng;

    // Esperar a que el motor esté listo antes de triggear
    p.then(() => {
      if (!cancelled && hasStartedRef.current) {
        triggerEngineRef.current?.(gameRef.current);
      }
    });

    return () => {
      cancelled = true;
      engineWhiteRef.current?.quit();
      engineWhiteRef.current = null;
    };
  }, [whiteEngineType]);

  // Inicializar / re-inicializar motor NEGRO cuando cambia el tipo
  useEffect(() => {
    engineBlackRef.current?.quit();
    engineBlackRef.current = null;
    let cancelled = false;

    const eng = blackEngineType === "lite"
      ? new LiteEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
      : new StockfishEngineBlack((msg) => handleEngineMessageRef.current?.(msg, "b"));

    const p = eng.init();
    engineBlackRef.current = eng;

    p.then(() => {
      if (!cancelled && hasStartedRef.current) {
        triggerEngineRef.current?.(gameRef.current);
      }
    });

    return () => {
      cancelled = true;
      engineBlackRef.current?.quit();
      engineBlackRef.current = null;
    };
  }, [blackEngineType]);

  const triggerEngine = useCallback(
    (currentGameState: Chess) => {
      if (
        currentGameState.isGameOver() ||
        timeOutWinnerRef.current ||
        !hasStartedRef.current
      ) {
        if (currentGameState.isGameOver()) setTimerActive(false);
        return;
      }

      const turn = currentGameState.turn();

      // Detener ambos para limpiar tareas obsoletas
      engineWhiteRef.current?.stop();
      engineBlackRef.current?.stop();

      const times = {
        wtime: whiteTimeRef.current * 1000,
        btime: blackTimeRef.current * 1000,
        winc: 0,
        binc: 0,
      };

      if (turn === "w") {
        if (whitePlayerRef.current === "ai" && !isPausedRef.current) {
          // Solo disparar si el motor está listo
          if (engineWhiteRef.current?.isReady) {
            engineWhiteRef.current.findBestMove(
              currentGameState.fen(),
              "w",
              whiteAiDepthRef.current,
              times,
              whiteAiSpeedRef.current
            );
          } else {
            // Motor aún inicializando: reintentar cuando esté listo
            engineWhiteRef.current?.initPromise?.then(() => {
              if (hasStartedRef.current && !gameRef.current.isGameOver() && gameRef.current.turn() === "w") {
                triggerEngineRef.current?.(gameRef.current);
              }
            });
          }
        } else if (whitePlayerRef.current === "human") {
          if (blackPlayerRef.current === "ai" && engineBlackRef.current?.isReady) {
            engineBlackRef.current.evaluate(currentGameState.fen(), "w", 8);
          } else if (isNeuralVisionEnabledRef.current && engineWhiteRef.current?.isReady) {
            engineWhiteRef.current.evaluate(currentGameState.fen(), "w", 8);
          }
        }
      } else {
        if (blackPlayerRef.current === "ai" && !isPausedRef.current) {
          if (engineBlackRef.current?.isReady) {
            engineBlackRef.current.findBestMove(
              currentGameState.fen(),
              "b",
              blackAiDepthRef.current,
              times,
              blackAiSpeedRef.current
            );
          } else {
            engineBlackRef.current?.initPromise?.then(() => {
              if (hasStartedRef.current && !gameRef.current.isGameOver() && gameRef.current.turn() === "b") {
                triggerEngineRef.current?.(gameRef.current);
              }
            });
          }
        } else if (blackPlayerRef.current === "human") {
          if (whitePlayerRef.current === "ai" && engineWhiteRef.current?.isReady) {
            engineWhiteRef.current.evaluate(currentGameState.fen(), "b", 8);
          } else if (isNeuralVisionEnabledRef.current && engineBlackRef.current?.isReady) {
            engineBlackRef.current.evaluate(currentGameState.fen(), "b", 8);
          }
        }
      }
    },
    [],
  );

  // Mantener el ref sincronizado con la función actual
  useEffect(() => {
    triggerEngineRef.current = triggerEngine;
  }, [triggerEngine]);

  useEffect(() => {
    // Solo re-disparar el motor por cambios de turno (game), pausa, jugadores y estado de partida.
    // Los cambios de ELO/velocidad NO deben interrumpir al motor en mitad de una búsqueda;
    // se aplicarán en el siguiente movimiento naturalmente.
    if (!isSyncing) {
      triggerEngine(game);
    }
  }, [
    game,
    isPaused,
    whitePlayer,
    blackPlayer,
    hasStarted,
    triggerEngine,
    isSyncing
  ]);

  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayIntervalRef.current = setInterval(() => {
        setViewingMoveIndex((prev) => {
          if (prev === null) return 0;
          if (prev >= history.length - 1) {
            setIsAutoPlaying(false);
            return null;
          }
          playAudio("move");
          return prev + 1;
        });
      }, 1000);
    } else {
      if (autoPlayIntervalRef.current) clearInterval(autoPlayIntervalRef.current);
    }
    return () => {
      if (autoPlayIntervalRef.current) clearInterval(autoPlayIntervalRef.current);
    };
  }, [isAutoPlaying, history.length]);



  // Objeto de opción mapeado para corregir re-renderizados de dependencias nativamente dentro de react-chessboard
  const onPieceDrop = useCallback(
    ({ piece, sourceSquare, targetSquare }: { piece: { pieceType: string; isSparePiece: boolean; position: string }; sourceSquare: string; targetSquare: string | null }) => {
      if (
        !hasStartedRef.current ||
        isSyncing ||
        gameRef.current.isGameOver() ||
        gameResult !== null ||
        timeOutWinnerRef.current ||
        isPausedRef.current ||
        !targetSquare ||
        viewingMoveIndex !== null
      )
        return false;

      // En modo LAN, solo puedes mover las piezas de tu propio color (y pre-move aplica solo a tu color)
      if (lanStatusRef.current === "connected") {
        const pieceOnBoard = gameRef.current.get(sourceSquare as any);
        const myColorInit = lanMyColorRef.current[0]; // "w" o "b"
        if (!pieceOnBoard || pieceOnBoard.color !== myColorInit) return false;
      }

      const turn = gameRef.current.turn();
      let myTurn = (turn === "w" && whitePlayerRef.current === "human") || (turn === "b" && blackPlayerRef.current === "human");

      if (lanStatusRef.current === "connected") {
        myTurn = (turn === "w" && lanMyColorRef.current === "white") || (turn === "b" && lanMyColorRef.current === "black");
      }

      if (!myTurn) {
        if (preMoveMode === "disabled") return false;
        // En LAN el color del humano es fijo, en local es el opuesto al turno actual
        const myColor = lanStatusRef.current === "connected"
          ? lanMyColorRef.current[0]
          : (gameRef.current.turn() === "w" ? "b" : "w");

        const pieceObj = gameRef.current.get(sourceSquare as any);
        if (!pieceObj || pieceObj.color !== myColor) return false;

        setPreMoves(prev => {
          if (preMoveMode === "single") return [`${sourceSquare}${targetSquare}`];
          return [...prev, `${sourceSquare}${targetSquare}`];
        });
        // En ajedrez real, the visual piece doesn't permanently move until it's executed, 
        // react-chessboard handles returning false by snapping back, but returning true creates an illusion. 
        // Usually we return false and draw an arrow or transparent square, but react-chessboard snapping 
        // back is standard. We return false so it snaps back, but the square will be highlighted red via custom styles.
        return false;
      }
      setPreMoves([]);

      if (!isFreeMode) {
        // Evitar que el humano arrastre piezas si es el turno de la IA
        if (turn === "w" && whitePlayerRef.current === "ai") return false;
        if (turn === "b" && blackPlayerRef.current === "ai") return false;

        // Evitar arrastrar piezas del color contrario
        const pieceType = piece?.pieceType ?? "";
        const isWhitePiece = pieceType[0] === "w";
        const isBlackPiece = pieceType[0] === "b";
        if (turn === "w" && isBlackPiece) return false;
        if (turn === "b" && isWhitePiece) return false;
      }

      setViewingMoveIndex(null);

      const pieceOnBoard = gameRef.current.get(sourceSquare as any);
      const isPawnPromotion = pieceOnBoard && pieceOnBoard.type === 'p' && (targetSquare[1] === '8' || targetSquare[1] === '1');

      const testMove = () => {
        try {
          const tempG = new Chess(gameRef.current.fen());
          const mObj: any = { from: sourceSquare, to: targetSquare };
          if (isPawnPromotion) mObj.promotion = 'q';
          return tempG.move(mObj);
        } catch (e) { return null; }
      }
      const validMove = testMove();
      if (validMove && validMove.promotion) {
        setPendingPromotion({ from: sourceSquare, to: targetSquare, color: turn });
        return false;
      }

      const mObj: any = { from: sourceSquare, to: targetSquare };
      if (isPawnPromotion) mObj.promotion = "q";
      const res = executeMove(mObj);

      if (!res && isFreeMode) {
        try {
          const g = new Chess(game.fen());
          const p = g.get(sourceSquare as any);
          if (p) {
            g.remove(sourceSquare as any);
            g.put(p, targetSquare as any);
            setGame(g);
            // PGN en modo libre no funcionará de la manera tradicional con history
            // Podemos añadirlo a una libreria custom o simplemente actualizar el tablero
            return true;
          }
        } catch (e) { }
      }
      return res;
    },
    [executeMove, viewingMoveIndex, isFreeMode, game, isSyncing, whitePlayer, blackPlayer],
  );

  useEffect(() => {
    if (preMoves.length > 0 && ((gameRef.current.turn() === "w" && whitePlayerRef.current === "human") || (gameRef.current.turn() === "b" && blackPlayerRef.current === "human"))) {
      if (!hasStartedRef.current || gameRef.current.isGameOver() || gameResult !== null || isPausedRef.current) {
        setPreMoves([]);
        return;
      }
      const nextMove = preMoves[0];
      const res = executeMove({ from: nextMove.substring(0, 2), to: nextMove.substring(2, 4), promotion: "q" }, false, true);
      if (res) {
        setPreMoves(prev => prev.slice(1));
      } else {
        setPreMoves([]);
      }
    }
  }, [game, preMoves, executeMove]);

  const onSquareClick = useCallback(
    ({ square }: { piece: { pieceType: string } | null; square: string }) => {
      if (
        !hasStartedRef.current ||
        isSyncing ||
        gameRef.current.isGameOver() ||
        gameResult !== null ||
        timeOutWinnerRef.current ||
        isPausedRef.current ||
        viewingMoveIndex !== null
      )
        return;

      if (isRevealMode) {
        setRevealedSquare(square);
        setIsRevealMode(false);
        return;
      }

      const turn = gameRef.current.turn();
      let myTurn = (turn === "w" && whitePlayerRef.current === "human") || (turn === "b" && blackPlayerRef.current === "human");

      if (lanStatusRef.current === "connected") {
        myTurn = (turn === "w" && lanMyColorRef.current === "white") || (turn === "b" && lanMyColorRef.current === "black");
      }

      if (!myTurn) {
        if (preMoveMode === "disabled") {
          setMoveFrom("");
          return;
        }
        const piece = gameRef.current.get(square as any);
        const myColor = turn === "w" ? "b" : "w";

        if (preMoves.length > 0 && (!piece || piece.color !== myColor) && !moveFrom) {
          // Cancelar movimientos al tocar casilla vacía u ocupada por el oponente
          setPreMoves([]);
          return;
        }

        if (!moveFrom) {
          if (piece && piece.color === myColor) {
            setMoveFrom(square);
          }
          return;
        }

        if (piece && piece.color === myColor) {
          setMoveFrom(square);
          return;
        }

        setPreMoves(prev => {
          if (preMoveMode === "single") return [`${moveFrom}${square}`];
          return [...prev, `${moveFrom}${square}`];
        });
        setMoveFrom("");
        return;
      }

      setPreMoves([]);

      // Evitar que el humano mueva si es el turno de la IA (redundante por myTurn, pero seguro)
      if (turn === "w" && whitePlayerRef.current === "ai") return;
      if (turn === "b" && blackPlayerRef.current === "ai") return;

      if (!moveFrom) {
        // Primera selección: elegir pieza propia
        const piece = gameRef.current.get(square as any);
        if (piece && piece.color === turn) {
          setMoveFrom(square);
        }
        return;
      }

      const pieceOnBoard = gameRef.current.get(moveFrom as any);
      const isPawnPromotion = pieceOnBoard && pieceOnBoard.type === 'p' && (square[1] === '8' || square[1] === '1');

      const testMove = () => {
        try {
          const tempG = new Chess(gameRef.current.fen());
          const mObj: any = { from: moveFrom, to: square };
          if (isPawnPromotion) mObj.promotion = 'q';
          return tempG.move(mObj);
        } catch (e) { return null; }
      }
      const validMove = testMove();
      if (validMove && validMove.promotion) {
        setPendingPromotion({ from: moveFrom, to: square, color: turn });
        setMoveFrom("");
        return;
      }

      // Segunda selección: intentar mover a la casilla
      const mObj: any = { from: moveFrom, to: square };
      if (isPawnPromotion) mObj.promotion = "q";
      const success = executeMove(mObj);

      if (!success) {
        // Si el movimiento falló, intentar seleccionar otra pieza propia
        const piece = gameRef.current.get(square as any);
        if (piece && piece.color === turn) {
          setMoveFrom(square);
        } else {
          setMoveFrom("");
        }
      } else {
        setMoveFrom("");
      }
    },
    [moveFrom, executeMove, viewingMoveIndex, isRevealMode, isSyncing],
  );

  const onPieceClick = useCallback(
    ({ square }: { isSparePiece: boolean; piece: { pieceType: string }; square: string }) => {
      onSquareClick({ square, piece: null });
    },
    [onSquareClick]
  );



  const resignGame = () => {
    const result = gameRef.current.turn() === 'w' ? 'Negras ganan por abandono' : 'Blancas ganan por abandono';
    setGameResult(result);
    setTimerActive(false);
    engineWhiteRef.current?.stop();
    engineBlackRef.current?.stop();
    if (lanStatusRef.current === "connected") {
      lanSendState({ gameResult: result, isPaused: false });
    }
  };

  const drawGame = () => {
    setGameResult('Tablas acordadas');
    setTimerActive(false);
    engineWhiteRef.current?.stop();
    engineBlackRef.current?.stop();
    if (lanStatusRef.current === "connected") {
      lanSendState({ gameResult: 'Tablas acordadas', isPaused: false });
    }
  };


  // Destruye y recrea ambos workers desde cero para garantizar estado limpio
  const recreateEngines = () => {
    engineWhiteRef.current?.quit();
    engineBlackRef.current?.quit();
    engineWhiteRef.current = null;
    engineBlackRef.current = null;

    const engW = whiteEngineType === "lite"
      ? new LiteEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
      : new StockfishEngineWhite((msg) => handleEngineMessageRef.current?.(msg, "w"));
    engW.init();
    engineWhiteRef.current = engW;

    const engB = blackEngineType === "lite"
      ? new LiteEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
      : new StockfishEngineBlack((msg) => handleEngineMessageRef.current?.(msg, "b"));
    engB.init();
    engineBlackRef.current = engB;

    return { engW, engB };
  };

  const toggleGame = () => {
    if (hasStarted) stopGame();
    else startGame();
  };



  const startGame = () => {
    if (lanStatusRef.current === "connected" && !lanOpponentConnected) {
      alert(language === "es" ? "Debes esperar a que el oponente se conecte a la sala antes de empezar." : "You must wait for the opponent to connect to the room before starting.");
      return;
    }

    let newFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    if (isTrainingMode) {
      newFen = generateTrainingFen(trainingPiecesW, trainingPiecesB);
    } else if (isFreestyleMode) {
      newFen = generateChess960Fen();
    }

    // Destruir y recrear workers SIEMPRE al iniciar para garantizar estado limpio
    engineWhiteRef.current?.quit();
    engineBlackRef.current?.quit();
    engineWhiteRef.current = null;
    engineBlackRef.current = null;

    const engW = whiteEngineType === "lite"
      ? new LiteEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
      : new StockfishEngineWhite((msg) => handleEngineMessageRef.current?.(msg, "w"));
    const engB = blackEngineType === "lite"
      ? new LiteEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
      : new StockfishEngineBlack((msg) => handleEngineMessageRef.current?.(msg, "b"));

    engineWhiteRef.current = engW;
    engineBlackRef.current = engB;

    const pW = engW.init();
    const pB = engB.init();

    const g = new Chess(newFen);
    g.header(
      "White",
      whitePlayer === "human" ? (playerName || "Jugador Humano") : (whiteEngineName || (whiteEngineType === "lite" ? "GM-Lite" : "Motor IA")),
      "Black",
      blackPlayer === "human" ? (playerName || "Jugador Humano") : (blackEngineName || (blackEngineType === "lite" ? "GM-Lite" : "Motor IA"))
    );
    setGame(g);
    gameRef.current = g;
    turnRef.current = g.turn();

    setViewingMoveIndex(null);
    setHistory([]);
    setMoveEvaluations([]);
    setMoveTimes([]);
    setRedoStack([]);
    setCurrentVariations([]);
    setWhiteVariations([]);
    setBlackVariations([]);

    setWhiteTime(initialTimeMin * 60);
    setBlackTime(initialTimeMin * 60);
    setGameResult(null);
    setHasStarted(false);
    hasStartedRef.current = false;
    setTimeOutWinner(null);
    timeOutWinnerRef.current = null;
    setIsPaused(false);
    isPausedRef.current = false;

    const shouldSync = whitePlayer === "ai" || blackPlayer === "ai";
    setIsSyncing(shouldSync);
    setTimerActive(false);

    setIsConfigSidebarOpen(false);
    setIsLoadedPgn(false);
    setViewingMoveIndex(null);

    if (whitePlayer === "human" && blackPlayer === "ai") {
      setBoardOrientation("white");
    } else if (blackPlayer === "human" && whitePlayer === "ai") {
      setBoardOrientation("black");
    }

    playAudio("start");

    const startAfterSync = async () => {
      // Si es LAN, iniciamos un conteo de preparación para AMBOS
      if (lanStatus === "connected" && lanRole === "host") {
        lanSendState({ isPreparing: true });
        // Nosotros también lo mostramos localmente (handleLanStateReceived no se dispara para nosotros)
        setStartCountdown(3);
        const countdownInterval = setInterval(() => {
          setStartCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(countdownInterval);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Siempre esperar a que AMBOS motores estén listos antes de comenzar
      await Promise.all([pW, pB]);

      // Retardo de 2 segundos adicionales para la pantalla de sincronización ("sincronizando, esperando tablero o cargando tablero")
      await new Promise(resolve => setTimeout(resolve, 2000));

      setIsSyncing(false);
      setHasStarted(true);
      hasStartedRef.current = true;
      setTimerActive(true);

      // Pequeño delay para garantizar que React haya aplicado el estado
      setTimeout(() => {
        triggerEngine(new Chess(g.fen()));
      }, 80);

      // Si somos Host de LAN, avisar a los invitados que el juego empezó
      if (lanStatus === "connected" && lanRole === "host") {
        lanSendState({
          hasStarted: true,
          fen: g.fen(),
          history: [],
          initialTimeMin: initialTimeMin,
          whiteTime: initialTimeMin * 60,
          blackTime: initialTimeMin * 60,
          whitePlayer: "human",
          blackPlayer: "human"
        });
      }
    };

    startAfterSync();
  };

  const cycleNeuralStyle = () => {
    const styles: any[] = [
      "simple",
      "classic",
      "organic",
      "quantum",
      "stream",
      "neural_flow",
    ];
    const currentIndex = styles.indexOf(neuralStyle);
    const nextIndex = (currentIndex + 1) % styles.length;
    setNeuralStyle(styles[nextIndex]);
  };

  const getEloRating = (depth: number, engineType: string = "stockfish") => {
    if (engineType === "lite") {
      // LiteEngine: depth 1→~200, depth 25→~1200
      return Math.round(200 + ((depth - 1) / 24) * 1000);
    }
    if (engineType === "maia1") {
      return 1100 + depth;
    }
    if (engineType === "maia2") {
      return 1500 + depth;
    }
    if (engineType === "ailed") {
      return 2000 + depth * 10;
    }
    // Stockfish: depth 1→~900, depth 25→~3400+
    const base = 800;
    const perDepth = 105;
    return base + depth * perDepth;
  };

  const resetGame = (wPlayer = whitePlayerRef.current, bPlayer = blackPlayerRef.current) => {
    // Destruir y recrear workers para garantizar estado limpio
    engineWhiteRef.current?.quit();
    engineBlackRef.current?.quit();
    engineWhiteRef.current = null;
    engineBlackRef.current = null;

    const engW = (wPlayer === "ai") || (bPlayer === "human") ?
      (whiteEngineType === "lite"
        ? new LiteEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
        : new StockfishEngineWhite((msg) => handleEngineMessageRef.current?.(msg, "w")))
      : (whiteEngineType === "lite"
        ? new LiteEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
        : new StockfishEngineWhite((msg) => handleEngineMessageRef.current?.(msg, "w")));

    const engB = blackEngineType === "lite"
      ? new LiteEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
      : new StockfishEngineBlack((msg) => handleEngineMessageRef.current?.(msg, "b"));

    engineWhiteRef.current = engW;
    engineBlackRef.current = engB;
    const pW = engW.init();
    const pB = engB.init();

    const g = new Chess();
    setGame(g);
    gameRef.current = g;
    turnRef.current = g.turn();
    setHistory([]);
    setRedoStack([]);
    setEvalScore(0);
    setEvalMate(undefined);
    setBestLine("");
    setMoveEvaluations([]);
    setMoveTimes([]);

    setWhiteTime(initialTimeMin * 60);
    setBlackTime(initialTimeMin * 60);
    whiteTimeRef.current = initialTimeMin * 60;
    blackTimeRef.current = initialTimeMin * 60;
    setTimerActive(false);
    setTimeOutWinner(null);
    timeOutWinnerRef.current = null;
    setIsPaused(false);
    isPausedRef.current = false;
    setGameResult(null);
    setIsSyncing(false);

    setWhitePlayer(wPlayer);
    setBlackPlayer(bPlayer);
    whitePlayerRef.current = wPlayer;
    blackPlayerRef.current = bPlayer;
    setMoveFrom("");
    setViewingMoveIndex(null);
    setIsLoadedPgn(false);
    setIsHeaderVisible(true);

    if (lanStatusRef.current === "connected") {
      lanSendState({
        hasStarted: hasStartedRef.current,
        gameResult: null,
        isPaused: false,
        history: [],
        fen: g.fen(),
        whiteTime: initialTimeMin * 60,
        blackTime: initialTimeMin * 60
      });
    }

    // Si había partida activa, esperar a que los motores estén listos y re-disparar
    if (hasStartedRef.current) {
      setHasStarted(true);
      setTimerActive(true);
      Promise.all([pW, pB]).then(() => {
        if (hasStartedRef.current && !gameRef.current.isGameOver()) {
          setTimeout(() => triggerEngine(g), 80);
        }
      });
    }
  };
  resetGameRef.current = resetGame;

  const loadPgn = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const pgn = event.target?.result as string;
      if (pgn) {
        const newGame = new Chess();

        const tryLoadPgn = (rawPgn: string) => {
          let cleanPgn = rawPgn.trim();
          if (cleanPgn.charCodeAt(0) === 0xFEFF) cleanPgn = cleanPgn.slice(1); // Remove BOM

          try {
            newGame.loadPgn(cleanPgn);
            return true;
          } catch (e) { }

          // Attempt 2: Extract just the first game
          try {
            const match = cleanPgn.match(/(\[.*?\]\s*)*(1\.\s+[a-zA-Z0-9\-+\#=].*?(?:1-0|0-1|1\/2-1\/2|\*))/s);
            if (match) {
              newGame.loadPgn(match[0]);
              return true;
            }
          } catch (e) { }

          // Attempt 3: Strip headers and newlines
          try {
            const movesOnlyMatch = cleanPgn.match(/1\.\s+[a-zA-Z0-9\-+\#=].*/s);
            if (movesOnlyMatch) {
              const flatMoves = movesOnlyMatch[0].replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
              newGame.loadPgn(flatMoves);
              return true;
            }
          } catch (e) { }

          // Attempt 4: Translate Spanish notation to English
          try {
            const translated = cleanPgn
              .replace(/\bR([a-h1-8x])/g, 'K$1')
              .replace(/\bD([a-h1-8x])/g, 'Q$1')
              .replace(/\bT([a-h1-8x])/g, 'R$1')
              .replace(/\bA([a-h1-8x])/g, 'B$1')
              .replace(/\bC([a-h1-8x])/g, 'N$1');
            newGame.loadPgn(translated);
            return true;
          } catch (e) { }

          // Attempt 5: Extreme fallback - manual token extraction
          try {
            let movesText = cleanPgn.replace(/\[.*?\]/g, ' '); // Strip headers
            movesText = movesText.replace(/\{[^}]*\}/g, ' '); // Strip comments
            movesText = movesText.replace(/\$\d+/g, ' '); // Strip NAGs
            movesText = movesText.replace(/(1-0|0-1|1\/2-1\/2|\*)/g, ' '); // Strip results
            movesText = movesText.replace(/\b\d+\.+/g, ' '); // Strip move numbers

            const tokens = movesText.split(/\s+/).filter(t => t.length > 0 && !t.includes('...'));

            if (tokens.length > 0) {
              const tempGame = new Chess();
              let success = true;
              for (const token of tokens) {
                try {
                  tempGame.move(token);
                } catch (e) {
                  // Fallback translation for this single move
                  const translated = token
                    .replace(/^R/, 'K')
                    .replace(/^D/, 'Q')
                    .replace(/^T/, 'R')
                    .replace(/^A/, 'B')
                    .replace(/^C/, 'N');
                  try {
                    tempGame.move(translated);
                  } catch (e2) {
                    success = false;
                    break;
                  }
                }
              }
              if (success && tempGame.history().length > 0) {
                newGame.loadPgn(tempGame.pgn());
                return true;
              }
            }
          } catch (e) { }

          return false;
        };

        if (tryLoadPgn(pgn)) {
          setGame(newGame);
          gameRef.current = newGame;
          setHistory(newGame.history());
          setMoveFrom("");
          setHasStarted(true);
          hasStartedRef.current = true;
          setTimerActive(false); // Stop timers for loaded games
          setIsConfigSidebarOpen(false);
          setIsPaused(false);
          isPausedRef.current = false;
          setIsLoadedPgn(true);
          setViewingMoveIndex(-1);
          setWhitePlayer("human");
          setBlackPlayer("human");
          whitePlayerRef.current = "human";
          blackPlayerRef.current = "human";

          const timeControl = newGame.header().TimeControl;
          let initialMin = 10;
          if (timeControl && timeControl.includes("+")) {
            const seconds = parseInt(timeControl.split("+")[0]);
            if (!isNaN(seconds)) {
              initialMin = seconds / 60;
              setInitialTimeMin(initialMin);
              setWhiteTime(seconds);
              setBlackTime(seconds);
            }
          }

          const historyMoves = newGame.history();
          const comments: string[] = [];
          for (let i = 0; i < historyMoves.length; i++) {
            comments.unshift(newGame.getComment() || "");
            newGame.undo();
          }

          const loadedTimes: { w: number, b: number }[] = [];
          let currentW = initialMin * 60;
          let currentB = initialMin * 60;

          for (let i = 0; i < historyMoves.length; i++) {
            newGame.move(historyMoves[i]);
            const comment = comments[i];
            if (comment && comment.includes("[%clk ")) {
              const match = comment.match(/\[%clk\s+(\d+):(\d+):(\d+)\]/);
              if (match) {
                const seconds = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
                if (i % 2 === 0) currentW = seconds;
                else currentB = seconds;
              }
            }
            loadedTimes.push({ w: currentW, b: currentB });
          }
          setMoveTimes(loadedTimes);
        } else {
          alert("Error al cargar archivo PGN. El formato es inválido o no está soportado (asegúrate de que usa notación estándar).");
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const downloadPgn = () => {
    const tempGame = new Chess();
    tempGame.header("TimeControl", `${initialTimeMin * 60}+0`);

    history.forEach((move, i) => {
      tempGame.move(move);
      let commentStr = "";
      const times = moveTimes[i];
      if (times) {
        const timeRemaining = i % 2 === 0 ? times.w : times.b;
        const h = Math.floor(timeRemaining / 3600);
        const m = Math.floor((timeRemaining % 3600) / 60);
        const s = timeRemaining % 60;
        const clk = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        commentStr += `[%clk ${clk}]`;
      }
      if (moveComments[i]) {
        commentStr += (commentStr ? " " : "") + moveComments[i];
      }
      if (commentStr) {
        tempGame.setComment(commentStr);
      }
    });

    const pgn = tempGame.pgn();
    const blob = new Blob([pgn], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `partida-${new Date().toISOString().slice(0, 10)}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyPgnAsTxt = () => {
    const tempGame = new Chess();
    tempGame.header("TimeControl", `${initialTimeMin * 60}+0`);
    history.forEach((move, i) => {
      tempGame.move(move);
      let commentStr = "";
      const times = moveTimes[i];
      if (times) {
        const timeRemaining = i % 2 === 0 ? times.w : times.b;
        const h = Math.floor(timeRemaining / 3600);
        const m = Math.floor((timeRemaining % 3600) / 60);
        const s = timeRemaining % 60;
        const clk = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        commentStr += `[%clk ${clk}]`;
      }
      if (moveComments[i]) {
        commentStr += (commentStr ? " " : "") + moveComments[i];
      }
      if (commentStr) {
        tempGame.setComment(commentStr);
      }
    });
    const pgn = tempGame.pgn();
    // Copiar al portapapeles (sin descargar)
    navigator.clipboard.writeText(pgn).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = pgn;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
  };

  const cleanPgnMetadata = (pgn: string) => {
    // Remove nested tags like <...>, non-standard metadata, and sanitize
    return pgn
      .replace(/<[^>]*>/g, '') // Remove <tag> style metadata
      .replace(/\[\w+\s+""\]/g, '') // Remove empty tags
      .trim();
  };

  const validateMoveIntegrity = (pgn: string) => {
    const tempGame = new Chess();
    // Clean and normalize moves text
    let movesOnly = pgn.replace(/\[.*?\]/gs, '').replace(/\{.*?\}/gs, '').trim();
    movesOnly = movesOnly.replace(/\$\d+/g, ''); // Remove NAGs
    movesOnly = movesOnly.replace(/\d+\.+/g, ''); // Remove move numbers

    const tokens = movesOnly.split(/\s+/).filter(t => t && !t.includes('-') && !t.includes('/'));

    let moveCount = 0;
    for (const token of tokens) {
      try {
        const move = tempGame.move(token);
        if (!move) throw new Error("Invalid move");
        moveCount++;
      } catch (e) {
        // Try Spanish translation as fallback
        const translated = token.replace(/^R/, 'K').replace(/^D/, 'Q').replace(/^T/, 'R').replace(/^A/, 'B').replace(/^C/, 'N');
        try {
          const move = tempGame.move(translated);
          if (!move) throw new Error("Invalid move");
          moveCount++;
        } catch (e2) {
          return {
            isValid: false,
            error: `Movimiento inválido en jugada ${Math.ceil(moveCount / 2)}: ${token}`,
            pgn: tempGame.pgn()
          };
        }
      }
    }
    return { isValid: true, pgn: tempGame.pgn() };
  };

  const parsePgnWithLimit = (pgnContent: string, maxGames = 20) => {
    // Split by [Event tag which usually starts a new game
    const gameBlocks = pgnContent.split(/\n?(?=\[Event)/);
    const results = {
      games: [] as { name: string, content: string, hasError?: boolean, errorMsg?: string }[],
      omitted: 0,
      errors: 0
    };

    const limitedBlocks = gameBlocks.slice(0, maxGames);
    results.omitted = Math.max(0, gameBlocks.length - maxGames);

    limitedBlocks.forEach((block, idx) => {
      const sanitized = cleanPgnMetadata(block);
      if (!sanitized) return;

      const eventMatch = sanitized.match(/\[Event "(.*?)"\]/);
      const whiteMatch = sanitized.match(/\[White "(.*?)"\]/);
      const blackMatch = sanitized.match(/\[Black "(.*?)"\]/);

      const name = eventMatch ? eventMatch[1] :
        (whiteMatch && blackMatch ? `${whiteMatch[1]} vs ${blackMatch[1]}` : `Partida ${idx + 1}`);

      const validation = validateMoveIntegrity(sanitized);

      results.games.push({
        name: validation.isValid ? name : `⚠️ ${name} (Error)`,
        content: block,
        hasError: !validation.isValid,
        errorMsg: validation.error
      });

      if (!validation.isValid) results.errors++;
    });

    return results;
  };

  const loadPgnFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const allGames: { name: string, content: string, hasError?: boolean, errorMsg?: string }[] = [];
    let totalOmitted = 0;
    let totalErrors = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.toLowerCase().endsWith('.pgn')) {
        const content = await file.text();
        const report = parsePgnWithLimit(content, 50); // Increased limit for folders
        allGames.push(...report.games);
        totalOmitted += report.omitted;
        totalErrors += report.errors;
      }
    }

    if (allGames.length > 0) {
      setPgnLibrary(prev => [...prev, ...allGames]);
      setParsingReport({
        total: allGames.length,
        omitted: totalOmitted,
        errors: totalErrors
      });
    }
    e.target.value = "";
  };

  const deleteLibraryPgn = (idx: number) => {
    setPgnLibrary(prev => prev.filter((_, i) => i !== idx));
  };

  const selectLibraryPgn = (content: string) => {
    const newGame = new Chess();
    const tryLoadPgn = (rawPgn: string) => {
      let cleanPgn = rawPgn.trim();
      if (cleanPgn.charCodeAt(0) === 0xFEFF) cleanPgn = cleanPgn.slice(1);
      try { newGame.loadPgn(cleanPgn); return true; } catch (e) { }
      try {
        const match = cleanPgn.match(/(\[.*?\]\s*)*(1\.\s+[a-zA-Z0-9\-+\#=].*?(?:1-0|0-1|1\/2-1\/2|\*))/s);
        if (match) { newGame.loadPgn(match[0]); return true; }
      } catch (e) { }
      try {
        const movesOnlyMatch = cleanPgn.match(/1\.\s+[a-zA-Z0-9\-+\#=].*/s);
        if (movesOnlyMatch) {
          const flatMoves = movesOnlyMatch[0].replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
          newGame.loadPgn(flatMoves); return true;
        }
      } catch (e) { }
      try {
        const translated = cleanPgn
          .replace(/\bR([a-h1-8x])/g, 'K$1')
          .replace(/\bD([a-h1-8x])/g, 'Q$1')
          .replace(/\bT([a-h1-8x])/g, 'R$1')
          .replace(/\bA([a-h1-8x])/g, 'B$1')
          .replace(/\bC([a-h1-8x])/g, 'N$1');
        newGame.loadPgn(translated); return true;
      } catch (e) { }
      try {
        let movesText = cleanPgn.replace(/\[.*?\]/g, ' ');
        movesText = movesText.replace(/\{[^}]*\}/g, ' ');
        movesText = movesText.replace(/\$\d+/g, ' ');
        movesText = movesText.replace(/(1-0|0-1|1\/2-1\/2|\*)/g, ' ');
        movesText = movesText.replace(/\b\d+\.+/g, ' ');
        const tokens = movesText.split(/\s+/).filter(t => t.length > 0 && !t.includes('...'));
        if (tokens.length > 0) {
          const tempGame = new Chess();
          let success = true;
          for (const token of tokens) {
            try { tempGame.move(token); } catch (e) {
              const translated = token.replace(/^R/, 'K').replace(/^D/, 'Q').replace(/^T/, 'R').replace(/^A/, 'B').replace(/^C/, 'N');
              try { tempGame.move(translated); } catch (e2) { success = false; break; }
            }
          }
          if (success && tempGame.history().length > 0) { newGame.loadPgn(tempGame.pgn()); return true; }
        }
      } catch (e) { }
      return false;
    };

    if (tryLoadPgn(content)) {
      const gameInfo = pgnLibrary.find(g => g.content === content);
      if (gameInfo?.hasError) {
        alert(gameInfo.errorMsg || "Esta partida contiene errores en el registro de jugadas.");
      }
      setGame(newGame);
      gameRef.current = newGame;
      setHistory(newGame.history());
      setMoveFrom("");
      setHasStarted(true);
      hasStartedRef.current = true;
      setTimerActive(false);
      setIsConfigSidebarOpen(false);
      setIsPaused(false);
      setIsLoadedPgn(true);
    }
  };


  let gameStatus = gameResult ? gameResult : "";
  let isGameOver = false;

  const isAiVsAi = whitePlayer === "ai" && blackPlayer === "ai";

  if (!gameResult) {
    if (timeOutWinner) {
      gameStatus =
        timeOutWinner === "w"
          ? "Blancas ganan por tiempo"
          : "Negras ganan por tiempo";
      isGameOver = true;
    } else if (game.isCheckmate()) {
      gameStatus = `¡Jaque Mate! ¡Ganan las ${game.turn() === "w" ? "Negras" : "Blancas"}!`;
      isGameOver = true;
    } else if (game.isDraw()) {
      if (game.isStalemate()) gameStatus = "Empate por Ahogado";
      else if (game.isThreefoldRepetition()) gameStatus = "Empate por Repetición";
      else gameStatus = "Empate";
      isGameOver = true;
    } else {
      gameStatus = `Juegan las ${game.turn() === "w" ? "Blancas" : "Negras"}`;
    }
  } else {
    isGameOver = true;
  }

  // Create pairs for history formatting without losing any moves
  const mapNotation = (move: string) => {
    if (language === "en") return move;
    const dict: Record<string, string> = {
      K: "R",
      Q: "D",
      R: "T",
      B: "A",
      N: "C",
    };
    return move
      .split("")
      .map((char) => dict[char] || char)
      .join("");
  };

  const historyPairs = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < history.length; i += 2) {
      pairs.push([
        mapNotation(history[i]),
        history[i + 1] ? mapNotation(history[i + 1]) : "",
      ]);
    }
    return pairs;
  }, [history, language]);

  // Find king square when in check — uses game.board() directly, no extra Chess instance
  const kingInCheckSquare = useMemo(() => {
    // For PGN viewing, parse the FEN to check
    if (viewingMoveIndex !== null) {
      const fen = historyFens[viewingMoveIndex + 1];
      if (!fen) return null;
      try {
        const tmp = new Chess(fen);
        if (!tmp.inCheck()) return null;
        const t = tmp.turn();
        const b = tmp.board();
        for (let r = 0; r < 8; r++)
          for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && p.type === 'k' && p.color === t)
              return String.fromCharCode(97 + c) + String(8 - r);
          }
      } catch { /* ignore */ }
      return null;
    }
    // For live game, use the existing game object directly (no allocation)
    if (!game.inCheck()) return null;
    const turn = game.turn();
    const board = game.board();
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === turn)
          return String.fromCharCode(97 + c) + String(8 - r);
      }
    return null;
  }, [game, viewingMoveIndex, historyFens]);

  const chessboardConfig = useMemo(() => {
    const squareStyles: Record<string, React.CSSProperties> = {};

    // Highlight last move
    if (showLastMove) {
      const verboseHist = game.history({ verbose: true });
      let targetMove = null;
      if (viewingMoveIndex !== null) {
        if (viewingMoveIndex >= 0 && viewingMoveIndex < verboseHist.length) {
          targetMove = verboseHist[viewingMoveIndex];
        }
      } else if (verboseHist.length > 0) {
        targetMove = verboseHist[verboseHist.length - 1];
      }
      if (targetMove) {
        squareStyles[targetMove.from] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
        squareStyles[targetMove.to] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
      }
    }

    // Highlight selected piece
    if (moveFrom) {
      squareStyles[moveFrom] = {
        ...squareStyles[moveFrom],
        backgroundColor: "rgba(255, 255, 0, 0.5)",
      };
      // Highlight legal moves
      if (showLegalMoves) {
        try {
          const moves = game.moves({ square: moveFrom as any, verbose: true });
          moves.forEach(m => {
            const isCapture = game.get(m.to as any) || m.flags.includes('e');
            squareStyles[m.to] = {
              ...squareStyles[m.to],
              background: isCapture
                ? "radial-gradient(circle, transparent 60%, rgba(0,0,0,.35) 61%, rgba(0,0,0,.35) 75%, transparent 76%)"
                : "radial-gradient(circle, rgba(0,0,0,.35) 20%, transparent 20%)",
              borderRadius: "0%"
            };
          });
        } catch (e) { }
      }
    }

    // Highlight pre-moves
    if (preMoves.length > 0) {
      preMoves.forEach(m => {
        const from = m.substring(0, 2);
        const to = m.substring(2, 4);
        squareStyles[from] = { ...(squareStyles[from] || {}), backgroundColor: "rgba(220, 38, 38, 0.6)" };
        squareStyles[to] = { ...(squareStyles[to] || {}), backgroundColor: "rgba(220, 38, 38, 0.6)" };
      });
    }

    if (kingInCheckSquare) {
      squareStyles[kingInCheckSquare] = {
        backgroundColor: "rgba(239, 68, 68, 0.7)",
        boxShadow: "inset 0 0 12px rgba(239, 68, 68, 0.9)",
      };
    }

    if (isThreatRadarActive) {
      try {
        if (threatRadarMode === "global") {
          const tokens = game.fen().split(' ');
          tokens[1] = tokens[1] === 'w' ? 'b' : 'w';
          tokens[3] = '-';
          const tempG = new Chess(tokens.join(' '));
          tempG.moves({ verbose: true }).forEach(m => {
            if (game.get(m.to as any)) {
              squareStyles[m.to] = { ...(squareStyles[m.to] || {}), boxShadow: "inset 0 0 8px red" };
            }
          });
        } else {
          const tokens = game.fen().split(' ');
          tokens[1] = tokens[1] === 'w' ? 'b' : 'w';
          tokens[3] = '-';
          const tempG = new Chess(tokens.join(' '));
          tempG.moves({ verbose: true }).forEach(m => {
            squareStyles[m.to] = { ...(squareStyles[m.to] || {}), backgroundColor: "rgba(255, 0, 0, 0.2)" };
          });
        }
      } catch (e) { }
    }

    return {
      position: viewingMoveIndex !== null ? historyFens[viewingMoveIndex + 1] : game.fen(),
      customPieces: undefined,
      onPieceDrop: onPieceDrop,
      onSquareClick: onSquareClick,
      customArrows: moveArrows[viewingMoveIndex !== null ? viewingMoveIndex : (historyFens.length > 0 ? historyFens.length - 1 : 0)] || [],
      onArrowsChange: (arrowsObj: any) => {
        const currentMoveIdx = viewingMoveIndex !== null ? viewingMoveIndex : (historyFens.length > 0 ? historyFens.length - 1 : 0);
        setMoveArrows((prev: any) => ({ ...prev, [currentMoveIdx]: arrowsObj.arrows || arrowsObj }));
      },
      squareStyles,
      boardOrientation: isAutoRotate ? (game.turn() === "b" ? "black" : "white") : boardOrientation,
      darkSquareStyle: { backgroundColor: ({ gray: "#4b5563", neutral: "#404040", classic: "#b58863", green: "#779952", blue: "#4b7399", purple: "#7b61a6" } as Record<string, string>)[boardTheme] || "#4b5563" },
      lightSquareStyle: { backgroundColor: ({ gray: "#d1d5db", neutral: "#e5e5e5", classic: "#f0d9b5", green: "#ebecd0", blue: "#d4e4f7", purple: "#e8dff5" } as Record<string, string>)[boardTheme] || "#d1d5db" },
      animationDurationInMs: isAutoRotate ? (autoRotateSpeed === 'slide' ? 400 : 50) : 50,
      showNotation: true,
      allowDragOffBoard: false,
      boardStyle: {
        touchAction: "none",
        WebkitTouchCallout: "none" as any,
        WebkitUserSelect: "none" as any,
        userSelect: "none" as any,
      },
    };
  }, [game, boardOrientation, onPieceDrop, onSquareClick, moveFrom, viewingMoveIndex, historyFens, kingInCheckSquare, boardTheme, isAutoRotate, isInvisiblePieces, isThreatRadarActive, threatRadarMode, autoRotateSpeed, showLegalMoves, showLastMove, preMoves, preMoveMode, moveArrows]);

  // Cuando el panel derecho esta oculto, forzar el modo fill para centrar el tablero
  const effectiveBoardSize = !isRightPanelOpen ? "fill" : boardSize;

  const boardSizeClassWrapper = {
    small: "w-[95vw] sm:w-[320px] md:w-[380px] lg:w-[420px] xl:w-[480px]",
    medium: "w-[95vw] sm:w-[360px] md:w-[420px] lg:w-[480px] xl:w-[500px]",
    large: "w-[95vw] sm:w-[520px] md:w-[620px] lg:w-[720px] xl:w-[820px]",
    fill: "w-full max-w-[min(95vw,65vh)] md:max-w-[min(95vw,70vh)] lg:max-w-[min(95vw,75vh)]"
  }[effectiveBoardSize];

  const boardSizeClassInner = {
    small: "w-full max-w-full sm:max-w-[320px] md:max-w-[380px] lg:max-w-[420px]",
    medium: "w-full max-w-full sm:max-w-[360px] md:max-w-[420px] lg:max-w-[480px]",
    large: "w-full max-w-full sm:max-w-[520px] md:max-w-[620px] lg:max-w-[720px]",
    fill: "w-full max-w-full"
  }[effectiveBoardSize];

  const getPlayerLabel = (color: "w" | "b") => {
    if (lanStatus === "connected") {
      const pColor = color === "w" ? "white" : "black";
      const player = lanConnectedPlayers.find(p => p.color === pColor);
      if (player && player.name) return player.name;
      if (lanMyColor === pColor && playerName) return playerName;
      return language === "es" ? (color === "w" ? "Blancas" : "Negras") : (color === "w" ? "White" : "Black");
    }

    const isHuman = color === "w" ? whitePlayer === "human" : blackPlayer === "human";
    const engineType = color === "w" ? whiteEngineType : blackEngineType;
    const customName = color === "w" ? whiteEngineName : blackEngineName;
    const depth = color === "w" ? whiteAiDepth : blackAiDepth;

    if (isHuman) {
      if (whitePlayer === "human" && blackPlayer !== "human" && playerName) {
        if (color === boardOrientation[0]) return playerName;
      }
      return language === "es" ? (color === "w" ? "Blancas" : "Negras") : (color === "w" ? "White" : "Black");
    }
    if (customName) return customName;

    const elo = getEloRating(depth, engineType);
    const baseName = engineType === "lite" ? "GM-Lite" : engineType.startsWith("maia") ? "Maia: " + engineType.substring(4) : engineType === "ailed" ? "Ailed" : "Stockfish";
    return `${baseName} (${elo})`;
  };

  return (
    <div ref={appContainerRef} className="flex flex-col h-[100dvh] bg-[#0f1115] text-[#e2e8f0] font-sans overflow-hidden relative">
      <header 
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        className={cn("flex justify-between items-center bg-slate-900/80 px-4 sm:px-6 border-b border-white/5 shrink-0 py-2 relative z-10 pr-[140px]", (isFullscreen || !isHeaderVisible) && "hidden")}
      >
        {/* Botón de cerrar cabecera destacado a la izquierda y un poco más abajo */}
        <button
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          onClick={() => setIsHeaderVisible(false)}
          className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/50 hover:border-slate-500/50 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm z-20 group"
          title={language === "es" ? "Ocultar cabecera" : "Hide header"}
        >
          <X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" strokeWidth={2.5} /> 
          <span className="hidden sm:inline">{language === "es" ? "Ocultar Cabecera" : "Hide Header"}</span>
        </button>

        {(!isFullscreen && isHeaderVisible) && (
          <div className="flex-1 flex justify-start items-center gap-3 w-full">
            <div className="w-full flex justify-center mb-2 px-4">
              <img
                src={BannerImg}
                alt="GM-3000"
                className="h-7 sm:h-9 md:h-11 object-contain pointer-events-none select-none shrink-0"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          </div>
        )}

      </header>

      <main
        ref={boardContainerRef}
        className={cn(
          "flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 w-full mx-auto overflow-y-auto items-start justify-start lg:justify-center pt-8 lg:pt-4",
          /* Removed: isRightPanelOpen ? "lg:flex-row lg:items-stretch" : "", */
          (isFullscreen || boardSize === "fill" || !isRightPanelOpen) ? "max-w-none p-4 md:p-8" : "max-w-[1550px]",
          isFullscreen && "bg-[#0f1115]"
        )}
      >
        <div className={cn(
          "flex gap-2 items-center w-full shrink-0 justify-center min-w-0 transition-all duration-300",
          boardSizeClassWrapper
        )}>

          <div className="h-[280px] sm:h-[400px] md:h-[480px] lg:h-[580px] shrink-0 hidden sm:block">
            {isEngineVisible && (
              <EvalBar
                score={evalScore}
                mate={evalMate}
                turnColor={game.turn()}
                player1Color={boardOrientation === "white" ? "w" : "b"}
              />
            )}
          </div>

          <div className={cn("w-full shrink-0 flex flex-col justify-center relative", boardSizeClassInner)}>
            <div className="mb-2 flex justify-between items-end bg-slate-800/80 px-4 py-2 rounded-t-lg border-b-2 border-slate-900 border-x border-t border-slate-700/50">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-4 h-4 rounded-sm shadow-inner overflow-hidden border",
                  boardOrientation === "white" ? "border-slate-600 bg-black" : "border-slate-400 bg-white"
                )}></div>
                <span className="font-bold text-slate-300 text-sm tracking-widest uppercase">
                  {getPlayerLabel(boardOrientation === "white" ? "b" : "w")}
                </span>
              </div>
              <div
                className={cn(
                  "text-2xl font-mono font-bold leading-none px-3 py-1 rounded bg-slate-900 shadow-inner",
                  timerActive &&
                    game.turn() === (boardOrientation === "white" ? "b" : "w")
                    ? "text-amber-400 bg-amber-400/10"
                    : "text-white/80",
                  timeOutWinner ===
                  (boardOrientation === "white" ? "w" : "b") &&
                  "text-red-500 bg-red-500/20",
                )}
              >
                {formatTime(
                  viewingMoveIndex !== null && moveTimes[viewingMoveIndex]
                    ? (boardOrientation === "white" ? moveTimes[viewingMoveIndex].b : moveTimes[viewingMoveIndex].w)
                    : (boardOrientation === "white" ? blackTime : whiteTime),
                )}
              </div>
            </div>

            <div className={cn(
              "w-full aspect-square shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border-4 border-[#2d3748] bg-[#2d3748] touch-none relative chess-container-wrapper",
              isRevealMode && "cursor-crosshair",
              isInvisiblePieces && "invisible-pieces"
            )}
              style={{
                '--rotate-duration': autoRotateSpeed === 'spin_fast' ? '300ms' : '700ms'
              } as any}>
              {isInvisiblePieces && <style>{`
                 .invisible-pieces [data-piece] { opacity: 0.001 !important; pointer-events: auto !important; }
                 ${revealedSquare ? `.invisible-pieces [id$="-${revealedSquare}"] { opacity: 1 !important; }` : ''}
              `}</style>}

              <div className="w-full h-full chess-board-inner relative" style={{ zIndex: 5 }}>
                <Chessboard id="GM3000Board" options={chessboardConfig} />
              </div>
              {isSyncing && (
                <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center rounded pointer-events-auto border-4 border-emerald-500/30">
                  <div className="relative w-48 h-48 flex items-center justify-center bg-slate-800/50 rounded-full border-4 border-emerald-500/30 mb-4 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                    <div className="absolute inset-0 rounded-full border-t-4 border-r-4 border-emerald-400 animate-spin" style={{ animationDuration: '3s' }}></div>
                    <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-emerald-300 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                    <img src={KittenImg} alt="Kitten" className="w-32 h-32 object-contain animate-pulse z-10 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />

                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl animate-bounce">♚</div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 text-2xl animate-bounce" style={{ animationDelay: '0.5s' }}>♛</div>
                    <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>♞</div>
                    <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 text-2xl animate-bounce" style={{ animationDelay: '0.7s' }}>♜</div>
                  </div>
                  <span className="text-emerald-400 font-bold uppercase tracking-[0.2em] text-xs animate-pulse">
                    {language === "es" ? "Sincronizando..." : "Synchronizing..."}
                  </span>
                  <span className="text-emerald-500/60 text-[10px] mt-2 font-mono uppercase">
                    {language === "es" ? "Cargando Tablero" : "Loading Board"}
                  </span>
                </div>
              )}
              {startCountdown !== null && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded pointer-events-auto">
                  <div className="text-8xl font-black text-white animate-ping">
                    {startCountdown}
                  </div>
                  <div className="mt-8 text-xl font-bold text-white uppercase tracking-[0.3em]">
                    {language === "es" ? "PREPÁRATE" : "GET READY"}
                  </div>
                </div>
              )}
              {pendingPromotion && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center pointer-events-auto" style={{ transform: game.turn() === "b" && isAutoRotate && autoRotateSpeed !== 'slide' ? "rotate(180deg)" : "none" }} onClick={(e) => { e.stopPropagation(); setPendingPromotion(null); }}>
                  <div className="bg-slate-800 p-4 rounded-xl border-2 border-slate-600 shadow-2xl flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                    <span className="text-white text-center text-xs font-bold uppercase tracking-widest">{language === "es" ? "Promoción" : "Promotion"}</span>
                    <div className="flex gap-2">
                      {['q', 'r', 'b', 'n'].map(p => (
                        <button key={p}
                          onClick={(e) => {
                            e.stopPropagation();
                            executeMove({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: p });
                            setPendingPromotion(null);
                          }}
                          className="w-12 h-12 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center text-3xl transition-colors"
                        >
                          {pendingPromotion.color === 'w' ? (p === 'q' ? '♕' : p === 'r' ? '♖' : p === 'b' ? '♗' : '♘') : (p === 'q' ? '♛' : p === 'r' ? '♜' : p === 'b' ? '♝' : '♞')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {isInvisiblePieces && (
                <div className="absolute top-1/2 -translate-y-1/2 -right-[60px] flex flex-col gap-2 z-20">
                  <button onClick={() => { setIsRevealMode(!isRevealMode); setRevealedSquare(null); }} className={cn("bg-slate-800 hover:bg-slate-700 text-[9px] text-white p-1.5 rounded shadow border border-slate-600 uppercase font-bold leading-tight transition-colors", isRevealMode && "bg-blue-600 hover:bg-blue-500 border-blue-400")}>{isRevealMode ? (language === "es" ? "Cancelar" : "Cancel") : (language === "es" ? "Revelar\nPieza" : "Reveal\nPiece")}</button>
                  <button onClick={() => setIsInvisiblePieces(false)} className="bg-slate-800 hover:bg-slate-700 text-[9px] text-white p-1.5 rounded shadow border border-slate-600 uppercase font-bold leading-tight whitespace-pre-line">{language === "es" ? "Revelar\nTodo" : "Reveal\nAll"}</button>
                </div>
              )}
            </div>

            <div className="mt-2 flex justify-between items-start bg-slate-800/80 px-4 py-2 rounded-b-lg border-t-2 border-slate-900 border-x border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-4 h-4 rounded-sm shadow-inner overflow-hidden border",
                  boardOrientation === "white" ? "border-slate-400 bg-white" : "border-slate-600 bg-black"
                )}></div>
                <span className="font-bold text-slate-300 text-sm tracking-widest uppercase">
                  {getPlayerLabel(boardOrientation === "white" ? "w" : "b")}
                </span>
              </div>
              <div
                className={cn(
                  "text-2xl font-mono font-bold leading-none px-3 py-1 rounded bg-slate-900 shadow-inner",
                  timerActive &&
                    game.turn() === (boardOrientation === "white" ? "w" : "b")
                    ? "text-amber-400 bg-amber-400/10"
                    : "text-white/80",
                  timeOutWinner ===
                  (boardOrientation === "white" ? "b" : "w") &&
                  "text-red-500 bg-red-500/20",
                )}
              >
                {formatTime(
                  viewingMoveIndex !== null && moveTimes[viewingMoveIndex]
                    ? (boardOrientation === "white" ? moveTimes[viewingMoveIndex].w : moveTimes[viewingMoveIndex].b)
                    : (boardOrientation === "white" ? whiteTime : blackTime),
                )}
              </div>
            </div>

            {isGameOver && viewingMoveIndex === null && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white font-bold tracking-widest p-4 rounded-xl text-center shadow-2xl border border-slate-700 z-10 w-3/4 backdrop-blur-sm">
                {gameStatus}
              </div>
            )}

            {!isRightPanelOpen && (
              <button
                onClick={() => setIsRightPanelOpen(true)}
                className="absolute -right-12 md:-right-16 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-16 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-600 rounded-xl transition-all shadow-lg group backdrop-blur-sm z-50"
                title={language === "es" ? "Mostrar Panel" : "Show Panel"}
              >
                <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>


        <aside className={cn(
          "w-full flex flex-col gap-4 overflow-hidden min-w-[320px] mx-auto shrink-0 transition-all duration-300",
          isRightPanelOpen ? "lg:flex-1 max-w-[1200px] h-[500px] lg:h-full lg:max-h-[calc(100vh-120px)] lg:mx-0 flex flex-col" : "h-auto",
          !isRightPanelOpen && "hidden lg:hidden"
        )}>
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-2 flex flex-col gap-2 shrink-0">
            {isEngineVisible && (!isLoadedPgn) && (
              <div className="bg-slate-900/50 rounded flex items-center px-3 text-[11px] font-mono text-slate-400 h-8 border border-slate-700/50 w-full overflow-hidden shrink-0">
                {hasStarted && bestLine && !isPaused ? (
                  <div className="flex items-center w-full min-w-0 gap-2">
                    <span className="text-emerald-400 font-bold shrink-0">
                      {evalMate !== undefined
                        ? `M${Math.abs(evalMate)}`
                        : `${evalScore > 0 ? "+" : ""}${(evalScore / 100).toFixed(2)}`}
                    </span>
                    <span className="truncate text-slate-400 flex-1">
                      {bestLine.split(" ").slice(0, 5).join(" ")}...
                    </span>
                  </div>
                ) : (
                  <div className="italic text-slate-600 truncate">
                    {!hasStarted ? "Motor listo" : isPaused ? "Motor en pausa" : "Analizando posición..."}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-auto">

              {hasStarted && !isLoadedPgn && (
                <>
                  <button
                    onClick={stopGame}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-800 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
                  >
                    <Square className="w-3.5 h-3.5" fill="currentColor" /> {language === "es" ? "Detener" : "Stop"}
                  </button>
                  <button
                    onClick={() => startGame()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-900 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> {language === "es" ? "Iniciar / Reiniciar" : "Start / Restart"}
                  </button>
                  <button
                    onClick={resignGame}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm text-red-400 hover:text-red-300"
                  >
                    <Flag className="w-3.5 h-3.5" /> {language === "es" ? "Abandonar" : "Resign"}
                  </button>
                  <button
                    onClick={drawGame}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm text-slate-400 hover:text-slate-300"
                  >
                    <Handshake className="w-3.5 h-3.5" /> {language === "es" ? "Tablas" : "Draw"}
                  </button>
                </>
              )}
              {!isLoadedPgn && (
                <button
                  onClick={() => {
                    const newState = !isPaused;
                    setIsPaused(newState);
                    isPausedRef.current = newState;
                    if (lanStatusRef.current === "connected") {
                      lanSendState({ isPaused: newState });
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider border shadow-sm",
                    isPaused
                      ? "bg-amber-950 hover:bg-amber-900 text-amber-400 border-amber-800"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                  )}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  {isPaused ? (language === "es" ? "Continuar" : "Resume") : (language === "es" ? "Pausar" : "Pause")}
                </button>
              )}
              {(isUndoEnabled || isLoadedPgn) && (
                <>
                  <button
                    onClick={undoMove}
                    disabled={history.length === 0 || (isLoadedPgn && viewingMoveIndex === -1)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-800 border border-slate-700 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
                  >
                    <Undo2 className="w-3.5 h-3.5" /> {language === "es" ? "Deshacer" : "Undo"}
                  </button>
                  <button
                    onClick={redoMove}
                    disabled={(isLoadedPgn ? (viewingMoveIndex === null) : (redoStack.length === 0))}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-800 border border-slate-700 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
                  >
                    <Redo2 className="w-3.5 h-3.5" /> {language === "es" ? "Rehacer" : "Redo"}
                  </button>
                </>
              )}
              <button
                onClick={toggleFullScreen}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                {language === "es" ? (isFullscreen ? "Salir" : "Pantalla") : (isFullscreen ? "Exit" : "Full")}
              </button>
              <button
                onClick={() => setBoardOrientation(boardOrientation === "white" ? "black" : "white")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 -scale-x-100" /> {language === "es" ? "Girar" : "Flip"}
              </button>

              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {(isLoadedPgn && history.length > 0) && (
                  <>
                    <button
                      onClick={() => {
                        setIsAutoPlaying(false);
                        setViewingMoveIndex(-1);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-900 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
                      title={language === "es" ? "Detener y reiniciar PGN" : "Stop and reset PGN"}
                    >
                      <Square className="w-3.5 h-3.5" fill="currentColor" /> {language === "es" ? "Detener" : "Stop"}
                    </button>
                    <button
                      onClick={() => {
                        if (!isAutoPlaying) {
                          if (viewingMoveIndex === null || viewingMoveIndex >= history.length - 1) {
                            setViewingMoveIndex(-1);
                          }
                          setIsAutoPlaying(true);
                        } else {
                          setIsAutoPlaying(false);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-900 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
                    >
                      {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                      {language === "es" ? (isAutoPlaying ? "Pausar" : "Reproducir") : (isAutoPlaying ? "Pause" : "Play")}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsConfigSidebarOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-900 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
                >
                  <Settings className="w-3.5 h-3.5" /> {language === "es" ? "Ajustes" : "Settings"}
                </button>
                <button
                  onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                  title={language === "es" ? "Modo sin distracciones" : "Distraction free mode"}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm",
                    !isRightPanelOpen
                      ? "bg-purple-900/50 hover:bg-purple-800/50 text-purple-400 border border-purple-900"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  )}
                >
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", !isRightPanelOpen ? "-rotate-90" : "rotate-90")} />
                  <span className="hidden sm:inline">{language === "es" ? "Panel" : "Panel"}</span>
                </button>
              </div>
            </div>
            {viewingMoveIndex !== null && (
              <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex justify-between items-center">
                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">
                  {language === "es" ? "Modo Análisis: Viendo jugada " : "Analysis Mode: Viewing move "} {viewingMoveIndex + 1}
                </span>
                <button
                  onClick={() => setViewingMoveIndex(null)}
                  className="px-2 py-0.5 bg-amber-500 text-black text-[9px] font-black rounded uppercase hover:bg-amber-400 transition-colors"
                >
                  {language === "es" ? "Cerrar Visor" : "Close Viewer"}
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 flex-1 flex flex-col h-full shrink-0 overflow-hidden relative">
            <div className="flex justify-between items-center bg-slate-900/30 border-b border-slate-700/50">
              <div className="flex">
                <button
                  onClick={() => setRightTab("neural")}
                  className={cn(
                    "px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors",
                    rightTab === "neural"
                      ? "text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/50"
                      : "text-slate-500 hover:text-slate-400",
                  )}
                >
                  <div className="flex flex-col items-center">
                    <span>Visión Neuronal</span>
                    {rightTab === "neural" && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          cycleNeuralStyle();
                        }}
                        className="flex items-center gap-1 text-[8px] bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 rounded mt-0.5"
                      >
                        <ChevronDown className="w-3 h-3" />{" "}
                        {language === "es" ? "SIGUIENTE" : "NEXT"}
                      </div>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setRightTab("history")}
                  className={cn(
                    "px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors relative",
                    rightTab === "history"
                      ? "text-blue-400 border-b-2 border-blue-400 bg-slate-800/50"
                      : "text-slate-500 hover:text-slate-400",
                  )}
                >
                  {language === "es" ? "Historial" : "History"}
                </button>
                <div className="flex items-center ml-auto pr-2">
                  <button
                    onClick={copyPgnAsTxt}
                    title={language === "es" ? "Copiar PGN" : "Copy PGN"}
                    className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800/50 rounded-lg transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 relative h-full flex flex-col bg-black">
              <HistoryNeuralPanel
                rightTab={rightTab}
                historyPairs={historyPairs}
                isAiVsAi={isAiVsAi}
                whiteVariations={whiteVariations}
                blackVariations={blackVariations}
                currentVariations={currentVariations}
                gameTurn={game.turn()}
                neuralStyle={neuralStyle}
                language={language}
                whiteStats={whiteStats}
                blackStats={blackStats}
                expandedNeural={expandedNeural}
                setExpandedNeural={setExpandedNeural}
                whitePlayer={whitePlayer}
                blackPlayer={blackPlayer}
                viewingMoveIndex={viewingMoveIndex}
                onMoveClick={(idx: number) => {
                  setViewingMoveIndex(idx);
                  setIsAutoPlaying(false);
                  setPreMoves([]);
                }}
                neuralViewMode={neuralViewMode}
                isNeuralVisionEnabled={isNeuralVisionEnabled}
                moveEvaluations={moveEvaluations}
                isLoadedPgn={isLoadedPgn}
                moveComments={moveComments}
                setMoveComments={setMoveComments}
                boardOrientation={boardOrientation}
                lanStatus={lanStatus}
              />
            </div>
          </div>
        </aside>
      </main>

      {/* Configuration Sidebar Overlay */}
      {isConfigSidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => hasStarted && setIsConfigSidebarOpen(false)}
          />
          <div className="relative w-full max-w-md h-full bg-slate-900/80 backdrop-blur-2xl border-l border-white/10 flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center p-5 pt-10 border-b border-white/5 bg-transparent">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-400" /> Configuración
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsConfigSidebarOpen(false)}
                  className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              <div className="w-full flex justify-center mb-2 px-4">
                <img
                  src={BannerImg}
                  alt="GM-3000"
                  className="w-full max-w-[250px] object-contain pointer-events-none select-none drop-shadow-md"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/50 shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900/50 rounded-lg">
                  <span className="text-[10px] text-slate-300 font-semibold tracking-wider uppercase">Creado por Elal Chico</span>
                  <div className="w-px h-3 bg-slate-600 mx-1"></div>
                  <a href="https://github.com/ElalChico" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors" title="GitHub">
                    <Github className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">GitHub Profile</span>
                  </a>
                </div>
                <a href="https://discord.gg/q4zxHJu7W9" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#5865F2]/15 hover:bg-[#5865F2]/25 border border-[#5865F2]/40 text-[#5865F2] rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  <MessageCircle className="w-3.5 h-3.5" /> Discord SERVER
                </a>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm">
                <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-400" /> Interfaz y Motor
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                      Idioma
                    </span>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2 outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                    >
                      <option value="es">ES (R,D,T,A,C)</option>
                      <option value="en">EN (K,Q,R,B,N)</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                      Tamaño Tablero
                    </span>
                    <select
                      value={boardSize}
                      onChange={(e) => setBoardSize(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2 outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                    >
                      <option value="small">Pequeño (Móvil)</option>
                      <option value="medium">Normal</option>
                      <option value="large">Grande</option>
                      <option value="fill">Ajustar Pantalla</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                      Tema Tablero
                    </span>
                    <select
                      value={boardTheme}
                      onChange={(e) => setBoardTheme(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2 outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                    >
                      <option value="gray">Predeterminado</option>
                      <option value="neutral">Gris Oscuro</option>
                      <option value="classic">Clásico (Madera)</option>
                      <option value="green">Verde</option>
                      <option value="blue">Azul</option>
                      <option value="purple">Púrpura</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Sonidos
                      </span>
                      <button
                        onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                        className={cn(
                          "w-8 h-4 rounded-full transition-all relative flex items-center cursor-pointer",
                          isSoundEnabled
                            ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                            : "bg-slate-700",
                        )}
                      >
                        <div
                          className={cn(
                            "absolute w-3 h-3 bg-white rounded-full transition-all shadow-md",
                            isSoundEnabled ? "right-0.5" : "left-0.5",
                          )}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Motor SF
                      </span>
                      <button
                        onClick={() => setIsEngineVisible(!isEngineVisible)}
                        className={cn(
                          "w-8 h-4 rounded-full transition-all relative flex items-center cursor-pointer",
                          isEngineVisible
                            ? "bg-blue-500"
                            : "bg-slate-700",
                        )}
                      >
                        <div
                          className={cn(
                            "absolute w-3 h-3 bg-white rounded-full transition-all shadow-md",
                            isEngineVisible ? "right-0.5" : "left-0.5",
                          )}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Deshacer Jugada
                      </span>
                      <button
                        onClick={() => setIsUndoEnabled(!isUndoEnabled)}
                        className={cn(
                          "w-8 h-4 rounded-full transition-all relative flex items-center cursor-pointer",
                          isUndoEnabled
                            ? "bg-orange-500"
                            : "bg-slate-700",
                        )}
                      >
                        <div
                          className={cn(
                            "absolute w-3 h-3 bg-white rounded-full transition-all shadow-md",
                            isUndoEnabled ? "right-0.5" : "left-0.5",
                          )}
                        />
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Visión Neuronal
                      </span>
                      <button
                        onClick={() =>
                          setIsNeuralVisionEnabled(!isNeuralVisionEnabled)
                        }
                        className={cn(
                          "w-8 h-4 rounded-full transition-all relative flex items-center cursor-pointer",
                          isNeuralVisionEnabled
                            ? "bg-emerald-500"
                            : "bg-slate-700",
                        )}
                      >
                        <div
                          className={cn(
                            "absolute w-3 h-3 bg-white rounded-full transition-all shadow-md",
                            isNeuralVisionEnabled ? "right-0.5" : "left-0.5",
                          )}
                        />
                      </button>
                    </div>
                    {isNeuralVisionEnabled && (
                      <div className="space-y-2 mt-2">
                        <select
                          value={neuralStyle}
                          onChange={(e) => setNeuralStyle(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2 outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
                        >
                          <option value="simple">{language === 'es' ? 'Red Básica' : 'Simple Network'}</option>
                          <option value="classic">{language === 'es' ? 'Red Clásica' : 'Classic Network'}</option>
                          <option value="organic">{language === 'es' ? 'Red Orgánica' : 'Organic Network'}</option>
                          <option value="quantum">{language === 'es' ? 'Nodos Cuánticos' : 'Quantum Nodes'}</option>
                          <option value="stream">{language === 'es' ? 'Flujo Datos' : 'Data Stream'}</option>
                          <option value="neural_flow">{language === 'es' ? 'Flujo Neuronal' : 'Neural Flow'}</option>
                        </select>
                        <select
                          value={neuralViewMode}
                          onChange={(e) => setNeuralViewMode(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700 text-[10px] text-slate-400 rounded-lg p-1.5 outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
                        >
                          <option value="both">{language === 'es' ? 'Vista: Ambas IA' : 'View: Both AI'}</option>
                          <option value="white">{language === 'es' ? 'Vista: Solo Blancas' : 'View: Only White'}</option>
                          <option value="black">{language === 'es' ? 'Vista: Solo Negras' : 'View: Only Black'}</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm">
                <h3 className="text-xs font-bold text-slate-300 mb-3 flex justify-between items-center">
                  <span>{language === "es" ? "Gestión PGN" : "PGN Management"}</span>
                </h3>
                <div className="flex gap-2 mb-3">
                  <label className="flex-1 text-center bg-slate-900 border border-slate-700 hover:bg-slate-800 cursor-pointer text-[10px] font-semibold text-slate-300 py-2 rounded-xl transition-all">
                    <input
                      type="file"
                      accept=".pgn"
                      onChange={loadPgn}
                      className="hidden"
                    />
                    {language === "es" ? "Cargar Archivo" : "Load File"}
                  </label>
                  <button
                    onClick={downloadPgn}
                    className="flex-1 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-[10px] font-semibold text-slate-300 py-2 rounded-xl transition-all"
                  >
                    {language === "es" ? "Guardar .pgn" : "Save .pgn"}
                  </button>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <h4 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest flex justify-between items-center">
                    <span>{language === "es" ? "Biblioteca PGN" : "PGN Library"}</span>
                    <div className="flex gap-1">
                      <label className="cursor-pointer hover:text-emerald-400 transition-colors">
                        <input
                          type="file"
                          multiple
                          // @ts-ignore
                          webkitdirectory=""
                          directory=""
                          onChange={loadPgnFolder}
                          className="hidden"
                        />
                        <FolderOpen className="w-3 h-3" />
                      </label>
                      <button
                        onClick={() => {
                          if (confirm(language === "es" ? "¿Eliminar toda la biblioteca?" : "Delete all library?")) {
                            setPgnLibrary([]);
                          }
                        }}
                        className="hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </h4>

                  <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                    {pgnLibrary.length === 0 ? (
                      <div className="text-[10px] text-slate-600 italic text-center py-4 bg-black/20 rounded-lg">
                        {language === "es" ? "Biblioteca vacía" : "Library empty"}
                      </div>
                    ) : (
                      pgnLibrary.map((item: any, idx) => (
                        <div key={idx} className="flex gap-1 group">
                          <button
                            onClick={() => selectLibraryPgn(item.content)}
                            className={cn(
                              "flex-1 text-left px-2 py-1.5 text-[10px] rounded-lg transition-all truncate border border-transparent",
                              item.hasError
                                ? "text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/5 hover:border-rose-500/20"
                                : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/20"
                            )}
                            title={item.hasError ? item.errorMsg : item.name}
                          >
                            {item.hasError ? "⚠️ " : "📄 "} {item.name}
                          </button>
                          <button
                            onClick={() => deleteLibraryPgn(idx)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-rose-500 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {parsingReport && (
                    <div className="mt-3 p-2 bg-black/30 rounded-lg border border-white/5">
                      <div className="flex justify-between text-[9px] text-slate-500 uppercase tracking-tighter mb-1">
                        <span>Reporte de Carga</span>
                        <button onClick={() => setParsingReport(null)} className="hover:text-white">Cerrar</button>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-center">
                        <div className="bg-slate-900/50 p-1 rounded">
                          <div className="text-emerald-400 font-bold">{parsingReport.total}</div>
                          <div className="text-[8px] text-slate-600">Total</div>
                        </div>
                        <div className="bg-slate-900/50 p-1 rounded">
                          <div className="text-amber-400 font-bold">{parsingReport.omitted}</div>
                          <div className="text-[8px] text-slate-600">Omitidos</div>
                        </div>
                        <div className="bg-slate-900/50 p-1 rounded">
                          <div className="text-rose-400 font-bold">{parsingReport.errors}</div>
                          <div className="text-[8px] text-slate-600">Errores</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>



              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm">
                <h3 className="text-xs font-bold text-slate-300 mb-2 flex justify-between items-center">
                  <span>Tiempo de partida (Minutos)</span>
                  <span className="text-emerald-400 font-mono text-sm bg-emerald-400/10 px-2 py-0.5 rounded-md">
                    {initialTimeMin}:00
                  </span>
                </h3>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={initialTimeMin}
                  onChange={(e) => {
                    const mins = parseInt(e.target.value);
                    setInitialTimeMin(mins);
                    if (lanStatusRef.current === "connected") {
                      lanSendState({ initialTimeMin: mins, whiteTime: mins * 60, blackTime: mins * 60 });
                    }
                  }}
                  disabled={hasStarted || (lanStatusRef.current === "connected" && lanRole !== "host")}
                  className="w-full h-1.5 cursor-pointer accent-emerald-500 bg-slate-800 rounded-full appearance-none opacity-80 hover:opacity-100 disabled:opacity-40 transition-opacity mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    Blancas
                  </h4>
                  <select
                    value={whitePlayer}
                    onChange={(e) =>
                      setWhitePlayer(e.target.value as "human" | "ai")
                    }
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2 mb-3 outline-none focus:border-white/30 transition-all cursor-pointer"
                  >
                    <option value="human">Humano</option>
                    <option value="ai">Máquina</option>
                  </select>
                  {whitePlayer === "ai" && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                          <span>Motor</span>
                          <span className={whiteEngineType === "lite" ? "text-amber-400" : (whiteEngineType.startsWith("maia") ? "text-purple-400" : (whiteEngineType === "ailed" ? "text-red-400" : "text-blue-400"))}>
                            {whiteEngineType === "lite" ? "GM-Lite" : (whiteEngineType === "maia1" ? "Maia 1" : (whiteEngineType === "maia2" ? "Maia 2" : (whiteEngineType === "ailed" ? "Ailed" : "Stockfish")))}
                          </span>
                        </div>
                        <select
                          value={whiteEngineType}
                          onChange={(e) => setWhiteEngineType(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded-lg p-1.5 outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                        >
                          <option value="stockfish">Stockfish</option>
                          <option value="lite">GM-Lite</option>
                          <option value="maia1">Maia 1</option>
                          <option value="maia2">Maia 2</option>
                          <option value="ailed">Ailed</option>
                        </select>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                          <span>Nombre (Opcional - Torneos)</span>
                        </div>
                        <input
                          type="text"
                          maxLength={30}
                          placeholder={language === "es" ? "Ej. AlphaZero" : "e.g. AlphaZero"}
                          value={whiteEngineName}
                          onChange={(e) => setWhiteEngineName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600 mb-3"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                          <span>Dificultad (ELO)</span>
                          <span className={whiteEngineType === "lite" ? "text-amber-400" : "text-blue-400"}>
                            ~{getEloRating(whiteAiDepth, whiteEngineType)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="25"
                          value={whiteAiDepth}
                          onChange={(e) =>
                            setWhiteAiDepth(parseInt(e.target.value))
                          }
                          className={cn("w-full h-1 cursor-pointer bg-slate-800 rounded-full appearance-none disabled:opacity-50",
                            whiteEngineType === "lite" ? "accent-amber-500" :
                              (whiteEngineType.startsWith("maia") ? "accent-purple-500" :
                                (whiteEngineType === "ailed" ? "accent-red-500" : "accent-blue-500")))}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                          <span>Retraso Movimiento</span>
                          <span className="text-blue-400">
                            {whiteAiSpeed}ms
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="5000"
                          step="10"
                          value={whiteAiSpeed}
                          onChange={(e) =>
                            setWhiteAiSpeed(parseInt(e.target.value))
                          }
                          className="w-full h-1 cursor-pointer accent-blue-500 bg-slate-800 rounded-full appearance-none disabled:opacity-50"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm">
                  <h4 className="text-xs font-bold text-slate-400 flex items-center gap-2 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-500" />
                    Negras
                  </h4>
                  <select
                    value={blackPlayer}
                    onChange={(e) =>
                      setBlackPlayer(e.target.value as "human" | "ai")
                    }
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2 mb-3 outline-none focus:border-white/30 transition-all cursor-pointer"
                  >
                    <option value="human">Humano</option>
                    <option value="ai">Máquina</option>
                  </select>
                  {blackPlayer === "ai" && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                          <span>Motor</span>
                          <span className={blackEngineType === "lite" ? "text-amber-400" : (blackEngineType.startsWith("maia") ? "text-purple-400" : (blackEngineType === "ailed" ? "text-red-400" : "text-rose-400"))}>
                            {blackEngineType === "lite" ? "GM-Lite" : (blackEngineType === "maia1" ? "Maia 1" : (blackEngineType === "maia2" ? "Maia 2" : (blackEngineType === "ailed" ? "Ailed" : "Stockfish")))}
                          </span>
                        </div>
                        <select
                          value={blackEngineType}
                          onChange={(e) => setBlackEngineType(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded-lg p-1.5 outline-none focus:border-rose-500/50 transition-all cursor-pointer"
                        >
                          <option value="stockfish">Stockfish</option>
                          <option value="lite">GM-Lite</option>
                          <option value="maia1">Maia 1</option>
                          <option value="maia2">Maia 2</option>
                          <option value="ailed">Ailed</option>
                        </select>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                          <span>Nombre (Opcional - Torneos)</span>
                        </div>
                        <input
                          type="text"
                          maxLength={30}
                          placeholder={language === "es" ? "Ej. Stockfish 2" : "e.g. Stockfish 2"}
                          value={blackEngineName}
                          onChange={(e) => setBlackEngineName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-600 mb-3"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                          <span>Dificultad (ELO)</span>
                          <span className={blackEngineType === "lite" ? "text-amber-400" : "text-rose-400"}>
                            ~{getEloRating(blackAiDepth, blackEngineType)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="25"
                          value={blackAiDepth}
                          onChange={(e) =>
                            setBlackAiDepth(parseInt(e.target.value))
                          }
                          className={cn("w-full h-1 cursor-pointer bg-slate-800 rounded-full appearance-none disabled:opacity-50",
                            blackEngineType === "lite" ? "accent-amber-500" :
                              (blackEngineType.startsWith("maia") ? "accent-purple-500" :
                                (blackEngineType === "ailed" ? "accent-red-500" : "accent-rose-500")))}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                          <span>Retraso Movimiento</span>
                          <span className="text-rose-400">{blackAiSpeed}ms</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="5000"
                          step="10"
                          value={blackAiSpeed}
                          onChange={(e) =>
                            setBlackAiSpeed(parseInt(e.target.value))
                          }
                          className="w-full h-1 cursor-pointer accent-rose-500 bg-slate-800 rounded-full appearance-none disabled:opacity-50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300">
                    {tournament.active && tournament.mode === "rounds"
                      ? `Torneo (Ronda ${tournament.currentRound}/${tournament.maxRounds})`
                      : tournament.active && tournament.mode === "infinite"
                        ? `Juego Infinito`
                        : (language === "es" ? "Estadísticas Globales" : "Global Stats")
                    }
                  </h3>
                  <button
                    title={language === "es" ? "Limpiar Estadísticas" : "Clear Stats"}
                    onClick={() => {
                      const empty = { hh: { w: 0, b: 0, d: 0, total: 0 }, hm: { w: 0, b: 0, d: 0, total: 0 }, mh: { w: 0, b: 0, d: 0, total: 0 }, mm: { w: 0, b: 0, d: 0, total: 0 } };
                      setMatchStats(empty);
                      localStorage.setItem("chess_matchStatsV2", JSON.stringify(empty));
                    }}
                    className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {(() => {
                  let matchupType: "hh" | "hm" | "mh" | "mm" = "hh";
                  if (whitePlayer === "human" && blackPlayer === "ai") matchupType = "hm";
                  else if (whitePlayer === "ai" && blackPlayer === "human") matchupType = "mh";
                  else if (whitePlayer === "ai" && blackPlayer === "ai") matchupType = "mm";

                  const mt = matchStats[matchupType];
                  const chartData = [
                    { name: "Blancas", value: mt.w, fill: "#10b981" },
                    { name: "Negras", value: mt.b, fill: "#f43f5e" },
                    { name: "Tablas", value: mt.d, fill: "#64748b" }
                  ].filter(d => d.value > 0);

                  return (
                    <div className="flex flex-col gap-2">
                      <div className="text-[10px] text-slate-400 font-semibold mb-2">
                        Visor de enfrentamiento: {
                          matchupType === "hh" ? "Humano vs Humano" :
                            matchupType === "hm" ? "Humano vs Máquina" :
                              matchupType === "mh" ? "Máquina vs Humano" : "Máquina vs Máquina"
                        }
                      </div>

                      {mt.total > 0 ? (
                        <div className="h-[120px] w-full mt-2">
                          <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '4px', fontSize: '12px' }} />
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={50}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-[120px] w-full flex items-center justify-center border border-dashed border-slate-700 rounded-lg">
                          <span className="text-[10px] text-slate-500">Sin datos aún</span>
                        </div>
                      )}

                      <div className="flex justify-between text-[10px] bg-black/20 p-2 rounded-lg mt-2 text-center">
                        <div className="flex flex-col items-center w-1/3">
                          <span className="text-emerald-400 font-bold">{mt.w}</span>
                          <span className="text-slate-500 leading-tight">Victorias (Blancas)<br />{whitePlayer === "human" ? "(Humano)" : "(Motor)"}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center border-l border-r border-slate-700/50 px-2 w-1/3">
                          <span className="text-slate-400 font-bold">{mt.d}</span>
                          <span className="text-slate-500">Empates</span>
                        </div>
                        <div className="flex flex-col items-center w-1/3">
                          <span className="text-rose-400 font-bold">{mt.b}</span>
                          <span className="text-slate-500 leading-tight">Victorias (Negras)<br />{blackPlayer === "human" ? "(Humano)" : "(Motor)"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-300 flex justify-between items-center mb-1">
                  <span>{language === "es" ? "Preferencias Visuales" : "Visual Preferences"}</span>
                </h3>
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <label className="flex items-center justify-between cursor-pointer" title="Sugerir a dónde puede mover la pieza seleccionada (movimientos legales).">
                    <span className="text-[10px] text-slate-400 font-semibold">{language === "es" ? "Sugerir Movimientos" : "Suggest Moves"}</span>
                    <input type="checkbox" className="hidden" checked={showLegalMoves} onChange={() => setShowLegalMoves(!showLegalMoves)} />
                    <div className={cn("w-8 h-4 rounded-full transition-all relative flex items-center", showLegalMoves ? "bg-amber-400" : "bg-slate-700")}>
                      <div className={cn("absolute w-3 h-3 bg-white rounded-full transition-all shadow-md", showLegalMoves ? "right-0.5" : "left-0.5")} />
                    </div>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer" title="Mostrar en el tablero cuál fue el último movimiento.">
                    <span className="text-[10px] text-slate-400 font-semibold">{language === "es" ? "Resaltar Último Move" : "Highlight Last Move"}</span>
                    <input type="checkbox" className="hidden" checked={showLastMove} onChange={() => setShowLastMove(!showLastMove)} />
                    <div className={cn("w-8 h-4 rounded-full transition-all relative flex items-center", showLastMove ? "bg-blue-400" : "bg-slate-700")}>
                      <div className={cn("absolute w-3 h-3 bg-white rounded-full transition-all shadow-md", showLastMove ? "right-0.5" : "left-0.5")} />
                    </div>
                  </label>

                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-[10px] text-slate-400 font-semibold" title={language === "es" ? "Permite anticipar movimientos cuando es el turno del rival. Para cancelar, toca una casilla vacía o retrocede el historial." : "Allows pre-moving during opponent's turn. Cancel by clicking an empty square or going back in history."}>
                      {language === "es" ? "Anticipar Jugada (Pre-Move)" : "Pre-Move"}
                    </span>
                    <select
                      value={preMoveMode}
                      onChange={(e) => setPreMoveMode(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded p-1 outline-none cursor-pointer"
                    >
                      <option value="disabled">{language === "es" ? "Desactivado" : "Disabled"}</option>
                      <option value="single">{language === "es" ? "Individual" : "Single"}</option>
                      <option value="multiple">{language === "es" ? "Múltiple" : "Multiple"}</option>
                    </select>
                  </div>
                </div>
              </div>

              {whitePlayer === "human" && blackPlayer === "human" && (
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 flex justify-between items-center mb-1">
                    <span>Variantes GM-3000</span>
                  </h3>

                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">{language === "es" ? "Auto-girar Tablero" : "Auto-rotate Board"}</span>
                      <select
                        value={isAutoRotate ? autoRotateSpeed : "off"}
                        onChange={(e) => {
                          if (e.target.value === "off") setIsAutoRotate(false);
                          else {
                            setIsAutoRotate(true);
                            setAutoRotateSpeed(e.target.value);
                          }
                        }}
                        className="bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded p-1 outline-none"
                      >
                        <option value="off">Desactivado</option>
                        <option value="slide">Clásico (Deslizar)</option>
                        <option value="spin_normal">Giro (Normal)</option>
                        <option value="spin_fast">Giro (Rápido)</option>
                        <option value="flip">3D Flip</option>
                      </select>
                    </div>

                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-[10px] text-slate-400 font-semibold">{language === "es" ? "Modo Libre (Guardar PGN)" : "Free Mode (Save PGN)"}</span>
                      <input type="checkbox" className="hidden" checked={isFreeMode} onChange={() => setIsFreeMode(!isFreeMode)} />
                      <div className={cn("w-8 h-4 rounded-full transition-all relative flex items-center", isFreeMode ? "bg-emerald-500" : "bg-slate-700")}>
                        <div className={cn("absolute w-3 h-3 bg-white rounded-full transition-all shadow-md", isFreeMode ? "right-0.5" : "left-0.5")} />
                      </div>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer" title="Activa este modo para ocultar las piezas y entrenar tu memoria.">
                      <span className="text-[10px] text-slate-400 font-semibold">{language === "es" ? "Piezas Invisibles" : "Invisible Pieces"}</span>
                      <input type="checkbox" className="hidden" checked={isInvisiblePieces} onChange={() => setIsInvisiblePieces(!isInvisiblePieces)} />
                      <div className={cn("w-8 h-4 rounded-full transition-all relative flex items-center", isInvisiblePieces ? "bg-purple-500" : "bg-slate-700")}>
                        <div className={cn("absolute w-3 h-3 bg-white rounded-full transition-all shadow-md", isInvisiblePieces ? "right-0.5" : "left-0.5")} />
                      </div>
                    </label>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-400 font-semibold">{language === "es" ? "Radar de Amenazas" : "Threat Radar"}</span>
                      <label className="flex items-center cursor-pointer">
                        <input type="checkbox" className="hidden" checked={isThreatRadarActive} onChange={(e) => setIsThreatRadarActive(e.target.checked)} />
                        <div className={cn("w-8 h-4 rounded-full transition-all relative flex items-center", isThreatRadarActive ? "bg-red-500" : "bg-slate-700")}>
                          <div className={cn("absolute w-3 h-3 bg-white rounded-full transition-all shadow-md", isThreatRadarActive ? "right-0.5" : "left-0.5")} />
                        </div>
                      </label>
                    </div>
                    {isThreatRadarActive && (
                      <div className="flex justify-between items-center ml-2 space-y-1">
                        <span className="text-[9px] text-slate-500">Modo Radar</span>
                        <select value={threatRadarMode} onChange={(e) => setThreatRadarMode(e.target.value as any)} className="bg-slate-900 border border-slate-700 text-[9px] text-slate-300 rounded p-1 outline-none">
                          <option value="global">Jaque (Global)</option>
                          <option value="active">Ataque (Turno Activo)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-white/5">
                    <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{language === "es" ? "Modo Freestyle Avanzado" : "Advanced Freestyle"}</h4>

                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-[10px] text-slate-400 font-semibold">{language === "es" ? "Activar Freestyle" : "Enable Freestyle"}</span>
                      <input type="checkbox" className="hidden" checked={isFreestyleMode} onChange={() => { setIsFreestyleMode(!isFreestyleMode); setIsTrainingMode(false); if (hasStarted) stopGame(); }} />
                      <div className={cn("w-8 h-4 rounded-full transition-all relative flex items-center", isFreestyleMode ? "bg-amber-500" : "bg-slate-700")}>
                        <div className={cn("absolute w-3 h-3 bg-white rounded-full transition-all shadow-md", isFreestyleMode ? "right-0.5" : "left-0.5")} />
                      </div>
                    </label>

                    {isFreestyleMode && (
                      <div className="space-y-2 mt-2 bg-black/20 p-2 rounded-lg border border-white/5">
                        <div className="text-[10px] text-slate-300 bg-slate-900 border border-slate-700 rounded p-1.5 text-center">
                          Modo 960 (Fila 1 Aleatoria)
                        </div>
                        <button onClick={startGame} className="w-full py-1.5 mt-2 bg-amber-500 hover:bg-amber-600 text-black rounded text-[10px] font-bold transition-all flex justify-center items-center gap-1 shadow-sm uppercase">
                          Iniciar Freestyle
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-white/5">
                    <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{language === "es" ? "Modo Entrenamiento" : "Training Mode"}</h4>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-[10px] text-slate-400 font-semibold">{language === "es" ? "Entrenar Jaque Mate" : "Train Checkmate"}</span>
                      <input type="checkbox" className="hidden" checked={isTrainingMode} onChange={() => { setIsTrainingMode(!isTrainingMode); setIsFreestyleMode(false); if (hasStarted) stopGame(); }} />
                      <div className={cn("w-8 h-4 rounded-full transition-all relative flex items-center", isTrainingMode ? "bg-cyan-500" : "bg-slate-700")}>
                        <div className={cn("absolute w-3 h-3 bg-white rounded-full transition-all shadow-md", isTrainingMode ? "right-0.5" : "left-0.5")} />
                      </div>
                    </label>

                    {isTrainingMode && (
                      <div className="space-y-3 mt-2">
                        <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5">
                          <span className="text-[10px] text-slate-400">Selección Rápida:</span>
                          <select
                            className="bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded p-1 outline-none flex-1 ml-2"
                            value={trainingPreset}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTrainingPreset(val);
                              if (val === "r") setTrainingPiecesW({ q: 0, r: 1, b: 0, n: 0, p: 0 });
                              else if (val === "2r") setTrainingPiecesW({ q: 0, r: 2, b: 0, n: 0, p: 0 });
                              else if (val === "q") setTrainingPiecesW({ q: 1, r: 0, b: 0, n: 0, p: 0 });
                              else if (val === "2b") setTrainingPiecesW({ q: 0, r: 0, b: 2, n: 0, p: 0 });
                              else if (val === "bn") setTrainingPiecesW({ q: 0, r: 0, b: 1, n: 1, p: 0 });

                              if (val !== "custom") {
                                setTrainingPiecesB({ q: 0, r: 0, b: 0, n: 0, p: 0 });
                              }
                            }}
                          >
                            <option value="custom">Personalizado</option>
                            <option value="q">Rey + Reina vs Rey</option>
                            <option value="r">Rey + Torre vs Rey</option>
                            <option value="2r">Rey + 2 Torres vs Rey</option>
                            <option value="2b">Rey + 2 Alfiles vs Rey</option>
                            <option value="bn">Rey + Alfil + Caballo vs Rey</option>
                          </select>
                        </div>

                        {trainingPreset === "custom" && (
                          <>
                            {/* Blancas */}
                            <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                              <div className="text-[10px] font-bold text-white mb-2 flex justify-between">Blancas <span>♔ (Siempre 1)</span></div>
                              <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                                {['q', 'r', 'b', 'n', 'p'].map(p => (
                                  <div key={p} className="flex flex-col items-center">
                                    <span className="text-xl mb-1">{p === 'q' ? '♕' : p === 'r' ? '♖' : p === 'b' ? '♗' : p === 'n' ? '♘' : '♙'}</span>
                                    <input type="number" min="0" max={p === 'p' ? 8 : 9} value={(trainingPiecesW as any)[p]} onChange={(e) => setTrainingPiecesW({ ...trainingPiecesW, [p]: parseInt(e.target.value) || 0 })} className="w-8 bg-slate-800 text-white rounded text-center border border-slate-700" />
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Negras */}
                            <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                              <div className="text-[10px] font-bold text-slate-400 mb-2 flex justify-between">Negras <span>♚ (Siempre 1)</span></div>
                              <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                                {['q', 'r', 'b', 'n', 'p'].map(p => (
                                  <div key={p} className="flex flex-col items-center">
                                    <span className="text-xl mb-1">{p === 'q' ? '♛' : p === 'r' ? '♜' : p === 'b' ? '♝' : p === 'n' ? '♞' : '♟'}</span>
                                    <input type="number" min="0" max={p === 'p' ? 8 : 9} value={(trainingPiecesB as any)[p]} onChange={(e) => setTrainingPiecesB({ ...trainingPiecesB, [p]: parseInt(e.target.value) || 0 })} className="w-8 bg-slate-800 text-white rounded text-center border border-slate-700" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        <button onClick={startGame} className="w-full py-1.5 mt-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold transition-all flex justify-center items-center gap-1 shadow-sm uppercase">
                          Iniciar Entrenamiento
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tournament Mode is now always visible */}
              <div className="flex flex-col gap-3 p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 shadow-sm transition-all animate-in zoom-in-95 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <RefreshCw className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-purple-300">Modo Torneo</h4>
                      <p className="text-[9px] text-purple-400/70">Juega una serie de partidas</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTournament(p => ({ ...p, active: !p.active }))}
                    className={cn(
                      "w-10 h-5 rounded-full transition-all relative flex items-center cursor-pointer shrink-0 border border-purple-500/30",
                      tournament.active ? "bg-purple-500" : "bg-slate-800"
                    )}
                  >
                    <div className={cn("absolute w-4 h-4 bg-white rounded-full transition-all shadow-md", tournament.active ? "right-0.5" : "left-0.5")} />
                  </button>
                </div>

                {tournament.active && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-purple-500/20">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] text-purple-400 font-semibold block mb-1">
                        Estilo de Selección (Perillas)
                      </span>
                      <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-700">
                        <button
                          onClick={() => setTournament(p => ({ ...p, mode: "none" }))}
                          className={cn(
                            "flex-1 text-[10px] uppercase font-bold py-1.5 rounded-lg transition-all",
                            tournament.mode === "none" ? "bg-purple-500 text-white shadow-md shadow-purple-500/20" : "text-slate-400 hover:text-slate-200"
                          )}
                        >
                          Apagado
                        </button>
                        <button
                          onClick={() => setTournament(p => ({ ...p, mode: "infinite" }))}
                          className={cn(
                            "flex-1 text-[10px] uppercase font-bold py-1.5 rounded-lg transition-all",
                            tournament.mode === "infinite" ? "bg-purple-500 text-white shadow-md shadow-purple-500/20" : "text-slate-400 hover:text-slate-200"
                          )}
                        >
                          Infinito
                        </button>
                        <button
                          onClick={() => setTournament(p => ({ ...p, mode: "rounds" }))}
                          className={cn(
                            "flex-1 text-[10px] uppercase font-bold py-1.5 rounded-lg transition-all",
                            tournament.mode === "rounds" ? "bg-purple-500 text-white shadow-md shadow-purple-500/20" : "text-slate-400 hover:text-slate-200"
                          )}
                        >
                          Rondas
                        </button>
                      </div>
                    </div>
                    {tournament.mode === "rounds" && (
                      <div className="flex-1 mt-1">
                        <span className="text-[10px] text-purple-400 font-semibold block mb-1">
                          Número de Rondas ({tournament.maxRounds})
                        </span>
                        <input
                          type="range"
                          min="1"
                          max="50"
                          value={tournament.maxRounds}
                          onChange={(e) => setTournament(p => ({ ...p, maxRounds: parseInt(e.target.value), currentRound: 1 }))}
                          className="w-full h-1.5 cursor-pointer accent-purple-500 bg-slate-800 rounded-full appearance-none mt-2"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-transparent mt-auto">
              <button
                onClick={startGame}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 flex justify-center items-center gap-2 shadow-lg"
              >
                <PlayCircle className="w-5 h-5" />
                {language === "es" ? "EMPEZAR DESAFIO" : "START CHALLENGE"}
              </button>
            </div>

            {/* ── Panel Multijugador LAN ── */}
            <div className="p-3 border-t border-white/5 bg-transparent mt-auto space-y-2">
              {/* Perfil de Usuario Compacto */}
              <div className="bg-gradient-to-r from-amber-500/10 to-transparent p-2 rounded-lg border border-amber-500/20 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <input
                  type="text"
                  placeholder={language === "es" ? "Tu nombre (ej: Maestro_GM)" : "Your name (e.g. GM_Master)"}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="flex-1 bg-slate-950/50 border border-amber-500/30 text-[10px] text-amber-50 font-bold rounded px-1.5 py-1 outline-none placeholder-slate-600 focus:border-amber-400 transition-colors"
                  maxLength={20}
                />
                <button
                  onClick={() => {
                    localStorage.setItem("chess_playerName", playerName);
                    playAudio("save");
                  }}
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[9px] font-bold transition-all shadow-md flex items-center gap-1 shrink-0"
                >
                  {language === "es" ? "Guardar" : "Save"}
                </button>
              </div>

              {/* Multijugador LAN Compacto — solo visible si ambos jugadores son humanos */}
              {whitePlayer === "human" && blackPlayer === "human" ? (
                <div className="bg-slate-800/60 p-2.5 rounded-lg border border-cyan-500/20 space-y-2">
                  <h3 className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5" />
                    {language === "es" ? "Conexión LAN" : "LAN Connection"}
                  </h3>

                  {lanStatus === "disconnected" && (
                    <div className="space-y-3">
                      <p className="text-[10px] text-slate-500">
                        {language === "es"
                          ? "Conecta con otro jugador en tu red local. Primero ejecuta el servidor LAN (npm run server)."
                          : "Connect to another player on your local network. Start the LAN server first (npm run server)."}
                      </p>

                      {/* Selector de color con opción al azar */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          {language === "es" ? "Jugar como:" : "Play as:"}
                        </span>
                        <select
                          value={lanPreferredColor}
                          onChange={(e) => setLanPreferredColor(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded-lg p-1.5 outline-none"
                        >
                          <option value="white">{language === "es" ? "♔ Blancas" : "♔ White"}</option>
                          <option value="black">{language === "es" ? "♚ Negras" : "♚ Black"}</option>
                          <option value="random">{language === "es" ? "🎲 Al Azar" : "🎲 Random"}</option>
                        </select>
                      </div>

                      {/* Crear sala (HOST) */}
                      <div className="space-y-2">
                        <button
                          onClick={() => lanStartHost(lanPreferredColor === "random" ? (Math.random() < 0.5 ? "white" : "black") : lanPreferredColor, playerName || undefined)}
                          className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <Monitor className="w-3.5 h-3.5" /> {language === "es" ? "Crear Sala (Host)" : "Create Room (Host)"}
                        </button>
                      </div>

                      {/* Unirse (GUEST) */}
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          {language === "es" ? "Unirse a una Sala" : "Join a Room"}
                        </span>

                        {/* Manual */}
                        <div className="flex gap-1.5 items-center">
                          <div className="flex-1 flex relative items-center">
                            <input
                              type={showManualIp ? "text" : "password"}
                              placeholder="IP del host (ej: 192.168.1.5)"
                              value={lanManualIp}
                              onChange={(e) => setLanManualIp(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded p-1.5 pr-7 outline-none placeholder-slate-600 focus:border-cyan-500/50"
                            />
                            <button onClick={() => setShowManualIp(!showManualIp)} className="absolute right-1.5 text-slate-500 hover:text-slate-300 transition-colors">
                              {showManualIp ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <button
                            onClick={() => lanManualIp && lanJoinHost(lanManualIp, lanPreferredColor === "random" ? (Math.random() < 0.5 ? "white" : "black") : lanPreferredColor, playerName || undefined)}
                            className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition-all"
                          >
                            {language === "es" ? "Conectar" : "Connect"}
                          </button>
                        </div>

                        {/* Auto-escaneo */}
                        <button
                          onClick={lanScanNetwork}
                          disabled={lanIsScanning}
                          className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Search className={cn("w-3 h-3", lanIsScanning && "animate-spin")} />
                          {lanIsScanning
                            ? (language === "es" ? "Escaneando red..." : "Scanning network...")
                            : (language === "es" ? "Buscar Salas en Red Local" : "Scan Local Network")}
                        </button>
                        {lanScanResults.length > 0 && (
                          <div className="space-y-1">
                            {lanScanResults.map((result: any) => (
                              <button
                                key={result.ip}
                                onClick={() => lanJoinHost(result.ip, lanPreferredColor === "random" ? (Math.random() < 0.5 ? "white" : "black") : lanPreferredColor, playerName || undefined)}
                                className="w-full py-1.5 bg-cyan-900/30 hover:bg-cyan-800/40 border border-cyan-500/30 text-cyan-200 rounded text-[10px] transition-all flex items-center justify-center px-2"
                              >
                                <div className="flex items-center gap-1.5 font-bold">
                                  <Globe className="w-3 h-3" /> {result.name}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {lanStatus === "connecting" && (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] text-cyan-400 font-semibold">
                        {language === "es" ? "Conectando..." : "Connecting..."}
                      </span>
                    </div>
                  )}

                  {lanStatus === "connected" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[10px] text-emerald-400 font-semibold">
                          {language === "es" ? "Conectado" : "Connected"} — {lanRole === "host" ? "Host" : (language === "es" ? "Invitado" : "Guest")}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 space-y-1">
                        <div>Tu color: <span className={cn("font-bold", lanMyColor === "white" ? "text-white" : "text-slate-300")}>{lanMyColor === "white" ? (language === "es" ? "Blancas" : "White") : (language === "es" ? "Negras" : "Black")}</span></div>
                        <div>Oponente: <span className={cn("font-bold", lanOpponentConnected ? "text-emerald-400" : "text-amber-400")}>{lanOpponentConnected ? (language === "es" ? "Conectado ✓" : "Connected ✓") : (language === "es" ? "Esperando..." : "Waiting...")}</span></div>
                        {lanRole === "host" && lanLocalIps.length > 0 && (
                          <div className="mt-1 bg-black/30 rounded p-1.5 border border-white/5 space-y-1">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[9px] text-slate-500 block">{language === "es" ? "Tu IP (compartir):" : "Your IP (share):"}</span>
                              <button onClick={() => setShowHostIps(!showHostIps)} className="text-[9px] text-slate-400 hover:text-white flex items-center gap-1">
                                {showHostIps ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                {showHostIps ? (language === "es" ? "Ocultar" : "Hide") : (language === "es" ? "Mostrar" : "Show")}
                              </button>
                            </div>
                            {lanLocalIps.map(ip => (
                              <div key={ip} className="flex gap-1 items-center bg-black/40 rounded px-1.5 py-1">
                                <input type={showHostIps ? "text" : "password"} readOnly value={ip} className="bg-transparent border-none outline-none text-cyan-400 font-mono text-[10px] w-full" />
                                <button onClick={() => navigator.clipboard.writeText(ip)} className="text-[9px] text-slate-400 hover:text-white p-1" title="Copiar"><Copy className="w-3 h-3" /></button>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Lista de jugadores conectados */}
                        {lanConnectedPlayers.length > 0 && (
                          <div className="mt-1 bg-black/20 rounded p-1.5 space-y-0.5">
                            <span className="text-[9px] text-slate-500 block mb-0.5">{language === "es" ? "Jugadores en la sala:" : "Players in room:"}</span>
                            {lanConnectedPlayers.map((p: any) => {
                              const isMe = p.id === lanPlayerId;
                              return (
                                <div key={p.id} className="flex items-center gap-1.5">
                                  <div className={cn("w-1.5 h-1.5 rounded-full", p.color === "white" ? "bg-white" : "bg-slate-500")} />
                                  <span className="text-[10px] text-slate-300 font-mono">{p.name || p.id}</span>
                                  <span className="text-[9px] text-slate-600">({p.color === "white" ? "♔" : "♚"})</span>
                                  {isMe && <span className="text-[9px] text-amber-400 font-bold">- {language === "es" ? "TÚ" : "YOU"}</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={lanDisconnect}
                        className="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                      >
                        <X className="w-3 h-3" /> {language === "es" ? "Desconectar" : "Disconnect"}
                      </button>
                    </div>
                  )}

                  {lanStatus === "error" && (
                    <div className="space-y-2">
                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
                        <span className="text-[10px] text-rose-400">{lanErrorMsg}</span>
                      </div>
                      <button
                        onClick={lanDisconnect}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold transition-all"
                      >
                        {language === "es" ? "Reintentar" : "Retry"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5 transition-colors shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Wifi className="w-4 h-4" />
                    <span className="text-[10px]">
                      {language === "es"
                        ? "Multijugador LAN disponible solo en modo Humano vs Humano"
                        : "LAN Multiplayer only available in Human vs Human mode"}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowTournamentManager(true)}
                className="w-full py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-2 cursor-pointer"
              >
                <Settings className="w-4 h-4" /> {language === "es" ? "Gestor de Torneos Profesional" : "Professional Tournament Manager"}
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> {language === "es" ? "Restaurar de Fábrica" : "Factory Reset"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Tournament Modal Overlay */}
      {showTournamentManager && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-6xl h-full max-h-[90vh] bg-slate-900 border border-purple-500/30 rounded-2xl flex flex-col shadow-2xl shadow-purple-500/20 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center bg-slate-950 p-4 border-b border-purple-500/20">
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400">
                {language === "es" ? "Gestor de Torneos Profesional" : "Professional Tournament Manager"}
              </h2>
              <button onClick={() => setShowTournamentManager(false)} className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-lg transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 w-full bg-slate-900 relative">
              <iframe src="/gestor de torneos.html" className="w-full h-full border-0 absolute inset-0" title="Tournament Manager" />
            </div>
          </div>
        </div>
      )}

      {/* Factory Reset Modal Overlay */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-2xl flex flex-col shadow-2xl shadow-rose-500/20 overflow-hidden relative animate-in zoom-in-95 duration-200 p-6 text-center">
            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <RefreshCw className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {language === "es" ? "Restaurar Fábrica" : "Factory Reset"}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              {language === "es" ? "¿Estás seguro de que quieres borrar todos los datos y restaurar la configuración de fábrica? Esta acción no se puede deshacer." : "Are you sure you want to delete all data and restore factory settings? This action cannot be undone."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
              >
                {language === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button
                onClick={() => {
                  // 1. Limpiar TODOS los datos de localStorage (sin excepción)
                  localStorage.clear();
                  // 2. Forzar limpieza de caches del navegador
                  if ('caches' in window) {
                    window.caches.keys().then(names => {
                      names.forEach(name => window.caches.delete(name));
                    });
                  }
                  // 3. Recargar la página
                  window.location.href = window.location.origin + window.location.pathname;
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-rose-600/20"
              >
                {language === "es" ? "Restaurar" : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Neural Overlay - always at root level */}
      {expandedNeural !== "none" && lanStatus !== "connected" && (
        <div className="fixed inset-4 z-[100] bg-[#020617] border border-slate-700 rounded-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
              VISUALIZACIÓN NEURONAL EXPANDIDA
            </span>
            <button
              onClick={() => setExpandedNeural("none")}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 relative overflow-hidden bg-black">
            {expandedNeural === "white" && (
              <NeuralTree
                variations={whiteVariations}
                turnColor="w"
                stats={whiteStats}
                style={neuralStyle}
                language={language}
              />
            )}
            {expandedNeural === "black" && (
              <NeuralTree
                variations={blackVariations}
                turnColor="b"
                stats={blackStats}
                style={neuralStyle}
                language={language}
              />
            )}
            {expandedNeural === "current" && (
              <NeuralTree
                variations={currentVariations}
                turnColor={game.turn()}
                stats={game.turn() === "w" ? whiteStats : blackStats}
                style={neuralStyle}
                language={language}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// Component to render the inner content of History / Neural tab to avoid duplicating
function HistoryNeuralPanel({
  rightTab,
  historyPairs,
  isAiVsAi,
  whiteVariations,
  blackVariations,
  currentVariations,
  gameTurn,
  whiteStats,
  blackStats,
  neuralStyle,
  language,
  expandedNeural,
  setExpandedNeural,
  whitePlayer,
  blackPlayer,
  viewingMoveIndex,
  onMoveClick,
  neuralViewMode,
  isNeuralVisionEnabled,
  moveEvaluations,
  isLoadedPgn,
  moveComments,
  setMoveComments,
  boardOrientation,
  lanStatus,
}: any) {
  const historyEndRef = useRef<HTMLDivElement>(null);
  const [isCommentOpen, setIsCommentOpen] = useState(false);

  useEffect(() => {
    // Cuando cambiamos de jugada, cerrar el comentario si está vacío para ahorrar espacio
    if (viewingMoveIndex !== null && !moveComments[viewingMoveIndex]) {
      setIsCommentOpen(false);
    } else {
      setIsCommentOpen(true);
    }
  }, [viewingMoveIndex, moveComments]);

  const getMoveClassification = (evalBefore: number, evalAfter: number, isWhiteMove: boolean) => {
    if (evalBefore === undefined || evalAfter === undefined) return null;
    const diff = isWhiteMove ? (evalAfter - evalBefore) : (evalBefore - evalAfter);

    if (diff > 100) return { icon: "!!", color: "text-cyan-400 font-black", title: "Brillante" };
    if (diff > 50) return { icon: "!", color: "text-blue-400 font-bold", title: "Gran Jugada" };
    if (diff < -300) return { icon: "??", color: "text-red-500 font-black", title: "Error Grave" };
    if (diff < -100) return { icon: "?", color: "text-orange-500 font-bold", title: "Error" };
    if (diff < -50) return { icon: "?!", color: "text-yellow-500 font-semibold", title: "Imprecisión" };

    // Simplification for standard play
    return null;
  };

  const renderColoredMove = (move: string) => {
    if (!move) return null;
    if (move.includes("O-O")) return <span className="text-sky-400 font-bold tracking-widest">{move}</span>;

    const pieceChars = language === "es" ? "RDATC" : "KQRBN";
    const parts: React.ReactNode[] = [];

    for (let i = 0; i < move.length; i++) {
      const char = move[i];
      if (pieceChars.includes(char)) {
        parts.push(<span key={i} className="text-emerald-400 font-bold">{char}</span>);
      } else if (char === "x") {
        parts.push(<span key={i} className="text-slate-500 mx-0.5">{char}</span>);
      } else if (char === "+" || char === "#") {
        parts.push(<span key={i} className="text-amber-500 font-bold">{char}</span>);
      } else if (char === "=") {
        parts.push(<span key={i} className="text-slate-500 font-bold">{char}</span>);
      } else if (/[a-h]/.test(char)) {
        parts.push(<span key={i} className="text-slate-200">{char}</span>);
      } else if (/[1-8]/.test(char)) {
        parts.push(<span key={i} className="text-slate-400">{char}</span>);
      } else {
        parts.push(<span key={i} className="text-slate-300">{char}</span>);
      }
    }
    return <>{parts}</>;
  };

  useEffect(() => {
    if (rightTab === "history" && viewingMoveIndex === null) {
      historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [historyPairs, rightTab, viewingMoveIndex]);

  return (
    <div className="relative h-full flex flex-col">

      {rightTab === "history" ? (
        <div className="flex flex-col h-full">
          <div
            className="flex flex-col text-[13px] font-mono font-medium tracking-tight pb-4 flex-1 overflow-y-auto"
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
          >
            {historyPairs.length === 0 && (
              <div className="text-slate-600 italic px-2 text-xs py-2">
                {language === "es"
                  ? "Simulación pausada o en espera."
                  : "Simulation paused or waiting."}
              </div>
            )}
            {historyPairs.map(([wMove, bMove]: any, i: number) => {
              const wIdx = i * 2;
              const bIdx = i * 2 + 1;

              const wEvalBefore = wIdx > 0 ? moveEvaluations[wIdx - 1] : 0;
              const wEvalAfter = moveEvaluations[wIdx];
              const wClass = getMoveClassification(wEvalBefore, wEvalAfter, true);

              const bEvalBefore = moveEvaluations[wIdx];
              const bEvalAfter = moveEvaluations[bIdx];
              const bClass = getMoveClassification(bEvalBefore, bEvalAfter, false);

              return (
                <div key={i} className="flex gap-1 px-1 py-0.5 items-center hover:bg-slate-800/30 rounded">
                  <span className="text-slate-600 w-6 text-right shrink-0 text-[11px] font-bold">
                    {i + 1}.
                  </span>
                  <div
                    onClick={() => onMoveClick(wIdx)}
                    className={cn(
                      "flex-1 flex gap-1 items-center px-1.5 py-0.5 rounded transition-colors cursor-pointer truncate",
                      viewingMoveIndex === wIdx
                        ? "bg-emerald-500/30 text-emerald-200"
                        : "text-slate-300 hover:bg-slate-700/50"
                    )}
                  >
                    <span className="truncate">{renderColoredMove(wMove)}</span>
                    {wClass && <span className={cn("text-[10px]", wClass.color)} title={wClass.title}>{wClass.icon}</span>}
                  </div>
                  {bMove ? (
                    <div
                      onClick={() => onMoveClick(bIdx)}
                      className={cn(
                        "flex-1 flex gap-1 items-center px-1.5 py-0.5 rounded transition-colors cursor-pointer truncate",
                        viewingMoveIndex === bIdx
                          ? "bg-emerald-500/30 text-emerald-200"
                          : "text-slate-300 hover:bg-slate-700/50"
                      )}
                    >
                      <span className="truncate">{renderColoredMove(bMove)}</span>
                      {bClass && <span className={cn("text-[10px]", bClass.color)} title={bClass.title}>{bClass.icon}</span>}
                    </div>
                  ) : <div className="flex-1" />}
                </div>
              );
            })}
            <div ref={historyEndRef} />
          </div>
          {viewingMoveIndex !== null && typeof setMoveComments === "function" && (
            <div className="mt-4 border-t border-slate-700/50 pt-4 flex flex-col gap-2 transition-all">
              {isCommentOpen ? (
                <>
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-400">
                    {language === "es" ? "Anotaciones (Jugada " + (viewingMoveIndex + 1) + ")" : "Annotations (Move " + (viewingMoveIndex + 1) + ")"}
                    <button onClick={() => setIsCommentOpen(false)} className="text-slate-500 hover:text-slate-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={moveComments[viewingMoveIndex] || ""}
                    onChange={(e) => setMoveComments((prev: any) => ({ ...prev, [viewingMoveIndex]: e.target.value }))}
                    placeholder={language === "es" ? "Escribe anotaciones para esta jugada..." : "Write annotations for this move..."}
                    className="w-full h-20 bg-slate-900/50 border border-slate-700 rounded p-2 text-xs text-slate-300 resize-none outline-none focus:border-emerald-500/50"
                  />
                  <div className="text-[10px] text-slate-500">
                    {language === "es" ? "Para flechas, usa el click derecho sobre el tablero. Se guardan en la sesión." : "For arrows, right click on the board. Saved in session."}
                  </div>
                </>
              ) : (
                <div className="flex justify-center mt-2">
                  <button
                    onClick={() => setIsCommentOpen(true)}
                    className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-emerald-400 transition-all shadow-lg group hover:scale-110"
                    title={language === "es" ? "Agregar anotación a esta jugada" : "Add annotation to this move"}
                  >
                    <span className="text-xl leading-none font-light">+</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 h-full relative">
          {(!isNeuralVisionEnabled || lanStatus === "connected") ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-700/50 p-6 text-center">
              <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                {lanStatus === "connected"
                  ? (language === "es" ? "Visión Neuronal deshabilitada en partidas LAN" : "Neural Vision disabled in LAN matches")
                  : (language === "es" ? "Visión Neuronal Desactivada" : "Neural Vision Disabled")}
              </span>
            </div>
          ) : isAiVsAi ? (
            <div className={cn("flex w-full h-full gap-2", boardOrientation === "white" ? "flex-col-reverse" : "flex-col")}>
              {(neuralViewMode === "both" || neuralViewMode === "white") && (
                <div
                  onClick={() => setExpandedNeural("white")}
                  className="flex-1 relative rounded-xl overflow-hidden border border-slate-700/50 shadow-inner bg-slate-900/20 cursor-zoom-in hover:border-emerald-500/30 transition-colors"
                >
                  <div className="absolute top-0 right-0 bg-slate-800 px-2 py-1 text-[8px] font-bold text-slate-300 z-10 border-b border-l border-slate-700 uppercase tracking-widest rounded-bl-lg">
                    #{language === "es" ? "1 Blancas" : "1 White"}
                  </div>
                  <NeuralTree
                    variations={whiteVariations}
                    turnColor="w"
                    stats={whiteStats}
                    style={neuralStyle}
                    language={language}
                  />
                </div>
              )}
              {(neuralViewMode === "both" || neuralViewMode === "black") && (
                <div
                  onClick={() => setExpandedNeural("black")}
                  className="flex-1 relative rounded-xl overflow-hidden border border-slate-700/50 shadow-inner bg-slate-900/20 cursor-zoom-in hover:border-emerald-500/30 transition-colors"
                >
                  <div className="absolute top-0 right-0 bg-slate-800 px-2 py-1 text-[8px] font-bold text-slate-300 z-10 border-b border-l border-slate-700 uppercase tracking-widest rounded-bl-lg">
                    #{language === "es" ? "2 Negras" : "2 Black"}
                  </div>
                  <NeuralTree
                    variations={blackVariations}
                    turnColor="b"
                    stats={blackStats}
                    style={neuralStyle}
                    language={language}
                  />
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => setExpandedNeural("current")}
              className="flex-1 relative rounded-xl overflow-hidden border border-slate-700/50 shadow-inner bg-slate-900/20 cursor-zoom-in hover:border-emerald-500/30 transition-colors"
            >
              <NeuralTree
                variations={currentVariations}
                turnColor={gameTurn}
                stats={gameTurn === "w" ? whiteStats : blackStats}
                style={neuralStyle}
                language={language}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
