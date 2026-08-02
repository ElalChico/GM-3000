import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  startTransition,
} from "react";
import { Chess } from "chess.js";

// --- INICIO MONKEY PATCH REPETICIÓN ---
// @ts-ignore
Chess.prototype.getRepetitionCount = function() {
  const history = this.history({ verbose: true });
  const counts = {};
  const fens = history.map((h: any) => h.before.split(' ').slice(0,4).join(' '));
  fens.push(this.fen().split(' ').slice(0,4).join(' '));
  let maxCount = 0;
  for (let i = 0; i < fens.length; i++) {
    const f = fens[i];
    counts[f] = (counts[f] || 0) + 1;
    if (counts[f] > maxCount) maxCount = counts[f];
  }
  return maxCount;
};

// @ts-ignore
Chess.prototype.isGameOver = function() {
  if (this.isCheckmate() || this.isStalemate() || this.isDrawByFiftyMoves() || this.isInsufficientMaterial()) return true;
  // @ts-ignore
  if (this.getRepetitionCount() >= 5) return true;
  return false;
};

// @ts-ignore
Chess.prototype.isDraw = function() {
  if (this.isStalemate() || this.isDrawByFiftyMoves() || this.isInsufficientMaterial()) return true;
  // @ts-ignore
  if (this.getRepetitionCount() >= 5) return true;
  return false;
};
// --- FIN MONKEY PATCH REPETICIÓN ---

import { generateTrainingFen, generateChess960Fen } from "./utils/fenGenerator";
import { classifyMove, MoveClassification } from "./utils/analysisTemplates";
import { cn } from "./lib/utils";
import { Chessboard, ChessboardProvider, SparePiece } from "react-chessboard";
import { LanPlaceholder } from "./components/server_placeholder/LanPlaceholder";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
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
  ChevronsLeft,
  ChevronsRight,
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
  EyeOff,
  Zap,
  Award,
  Shield,
  Target,
  Trophy,
  Scale,
  Book,
  LogOut,
  Sword,
  Save,
  Code,
  RotateCcw,
  UserPlus,
  Volume2,
  VolumeX,
  Home,
  Users,
  Lightbulb,
  Brain,
  Loader2,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import SidebarProfileSummary from "./components/SidebarProfileSummary";
import { Rnd } from "react-rnd";
import { StockfishEngineWhite, EngineMessage } from "./engine/StockfishWhite";

type TournamentResultType = "white" | "black" | "draw";

interface TournamentGameLogItem {
  matchNumber: number;
  result: TournamentResultType;
  whiteName: string;
  blackName: string;
  winnerName: string;
  whiteIsAi: boolean;
  blackIsAi: boolean;
  moves: number;
  timestamp: number;
}
import { StockfishEngineBlack } from "./engine/StockfishBlack";
import { AtlasEngine } from "./engine/AtlasEngine";
import { EDDEngine } from "./engine/EDDEngine";
import { ObsidianEngine } from "./engine/ObsidianEngine";
import { getAssistEngine, destroyAssistEngine } from "./engine/AssistStockfish";
import { EvalBar } from "./components/EvalBar";
import BannerImg from "./assets/Banner.webp";
import RecursosJugadoresBtnImg from "./assets/RecursosJugadores/btn.png";
import LogoHomeImg from "./assets/fondos/fondohome/logo-home.webp";
// Carga dinámica de archivos dentro de fondohome (excluye videos del glob para evitar carga bloqueante)
const _fondos1 = import.meta.glob('./assets/fondos/fondohome/*', { eager: true, import: 'default' }) as Record<string, string>;
const _fondos2 = import.meta.glob('./assets/fondos/fondoshome/*', { eager: true, import: 'default' }) as Record<string, string>;
const fondoHomeModules = { ..._fondos1, ..._fondos2 } as Record<string, string>;
const fondoHomeImages = Object.entries(fondoHomeModules).filter(([k]) => !/\.(mp4|webm|ogg)$/i.test(k)).map(([k, v]) => ({ path: k, url: v }));

// Import directo del video de home (Vite lo procesa y da URL correcta)
import FhVideoDirect from "./assets/fondos/fondohome/fh.mp4";

let FhImg: string = '';
if (FhVideoDirect) {
  FhImg = FhVideoDirect;
} else if (fondoHomeImages.length > 0) {
  FhImg = fondoHomeImages[0].url;
}
import SelecNormalImg from "./assets/selec-normal.webp";
import SelecAventuraImg from "./assets/selec-aventura.webp";
import CabeceraAventuraImg from "./assets/cabecera modo aventura.webp";
import KittenImg from "./assets/dark_cat.webp";
import LoaderImg from "./assets/loader.webp";
import { MasterAnalysisOverlay } from "./components/MasterAnalysisOverlay";
import { NeuralTree } from "./components/NeuralTree";

import { useLanMultiplayer, LanMove, LanGameState, LanJoinRequest } from "./hooks/useLanMultiplayer";
import { useProfile } from "./hooks/useProfile";
import { Achievement, DEFAULT_STATS } from "./types/profile";
import { computeAchievements, mergeAchievements } from "./utils/achievements";
import ProfileView from "./components/ProfileView";
import MentalMode from "./components/MentalMode";
import { AdventureMode, AdventureProgress, AdventureEnemy, STAGES } from "./components/AdventureMode";
import { AdventureAmbience } from "./components/AdventureAmbience";
import { AI_PROVIDERS, getProviderById, getDefaultModel } from "./utils/aiProviders";
import { runGeneralAnalysis, runTechnicalAnalysis, buildPGNFromHistory, runPerMoveAIAnalysis, runWithFallback, type FallbackInfo } from "./utils/aiAnalysis";
import { initTTS, speakText, stopSpeaking, isSpeaking, pauseSpeaking, resumeSpeaking } from "./utils/tts";
import p1 from "./sounds/p1.mp3";
import p2 from "./sounds/p2.mp3";
import p3 from "./sounds/p3.mp3";
import p4 from "./sounds/p4.mp3";
import p5 from "./sounds/p5.mp3";
import p6 from "./sounds/p6.mp3";
import p7 from "./sounds/p7.mp3";
import p8 from "./sounds/p8.mp3";
const ADVENTURE_TRACKS = [p1, p2, p3, p4, p5, p6, p7, p8];
const ADVENTURE_MENU_TRACK = p2;

import bg1 from "./assets/fondos/1.webp";
import bg2 from "./assets/fondos/2.webp";
import bg3 from "./assets/fondos/3.webp";
import bg4 from "./assets/fondos/4.webp";
import bg5 from "./assets/fondos/5.webp";
import bg6 from "./assets/fondos/6.webp";
import bg7 from "./assets/fondos/7.webp";
import bg8 from "./assets/fondos/8.webp";
import bg9 from "./assets/fondos/9.webp";

// Fondos para el juego normal
import normalBg0 from "./assets/fondos/fondos-normal/f0.webp";
import normalBg1 from "./assets/fondos/fondos-normal/f1.webp";
import normalBg2 from "./assets/fondos/fondos-normal/f2.webp";
import normalBg3 from "./assets/fondos/fondos-normal/f3.webp";
import normalBg4 from "./assets/fondos/fondos-normal/f4.webp";
import normalBg5 from "./assets/fondos/fondos-normal/f5.webp";
import normalBg6 from "./assets/fondos/fondos-normal/f6.webp";
import normalBg7 from "./assets/fondos/fondos-normal/f7.webp";
import normalBg8 from "./assets/fondos/fondos-normal/f8.webp";
import normalBg9 from "./assets/fondos/fondos-normal/f9.webp";
import normalBg10 from "./assets/fondos/fondos-normal/f10.webp";
import normalBg11 from "./assets/fondos/fondos-normal/f11.webp";
import normalBg12 from "./assets/fondos/fondos-normal/f12.webp";
import normalBg13 from "./assets/fondos/fondos-normal/f13.webp";

const ADVENTURE_BGS = [bg1, bg2, bg3, bg4, bg5, bg6, bg7, bg8, bg9];
const NORMAL_BGS = [normalBg0, normalBg1, normalBg2, normalBg3, normalBg4, normalBg5, normalBg6, normalBg7, normalBg8, normalBg9, normalBg10, normalBg11, normalBg12, normalBg13];
import hoverModeSound from "./sounds/selec-mode.mp3";
import introSound from "./sounds/intro.mp3";
import { CURRENT_VERSION } from "./version";

// Exit guard and export utilities
import { useExitGuard } from "./hooks/useExitGuard";
import { ExitConfirmModal } from "./components/ExitConfirmModal";
import { exportPGN, exportAnalysis, exportVoice, exportCombined } from "./utils/exportUtils";

// Función auxiliar para obtener el nombre del motor y si es nuestro
const getEngineInfo = (engineType: string): { name: string; isOwn: boolean } => {
  switch (engineType) {
    case "atlas":
      return { name: "Atlas.1", isOwn: true };
    case "edd":
      return { name: "Nexus", isOwn: true };

    case "maia1":
      return { name: "Maia 1", isOwn: false };
    case "maia2":
      return { name: "Maia 2", isOwn: false };
    case "ailed":
      return { name: "Ailed", isOwn: true };
    case "stockfish":
    default:
      return { name: "Stockfish", isOwn: false };
  }
};

const getEngineColorClass = (engineType: string) => {
  if (engineType === "atlas") return "text-emerald-400";
  if (engineType === "obsidian" || engineType === "obsidian") return "text-teal-400";
  if (engineType === "edd") return "text-emerald-500";
  if (engineType.startsWith("maia")) return "text-purple-400";
  if (engineType === "ailed") return "text-red-400";
  return "text-blue-400";
};


// --- Caché de API Local ---
const fetchFromCache = (key: string) => {
  try {
    const cached = localStorage.getItem('api_cache_' + key);
    if (cached) return JSON.parse(cached);
  } catch (e) { }
  return null;
};
const saveToCache = (key: string, data: any) => {
  try {
    localStorage.setItem('api_cache_' + key, JSON.stringify(data));
  } catch (e) { }
};

const fetchChessApiCloudJson = async (
  fen: string,
  depth: number,
  maxThinkingTime: number,
  variants: number,
  signal?: AbortSignal
) => {
  // 1. Intentar Lichess Cloud Eval API
  try {
    const lichessRes = await fetch(`https://lichess.org/api/cloud/eval?fen=${encodeURIComponent(fen)}&multiPv=${variants}`, { signal });
    if (lichessRes.ok) {
      const data = await lichessRes.json();
      if (data && data.pvs && data.pvs.length > 0) {
        return {
          move: data.pvs[0].moves.split(" ")[0],
          eval: data.pvs[0].cp !== undefined ? data.pvs[0].cp / 100 : (data.pvs[0].mate ? (data.pvs[0].mate > 0 ? 100 : -100) : 0),
          depth: data.depth,
          mate: data.pvs[0].mate,
          pvs: data.pvs
        };
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.warn("Lichess cloud eval falló, usando fallback...", err);
  }

  // 2. Intentar Stockfish.online API
  try {
    const sfRes = await fetch(`https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=${Math.min(depth, 15)}`, { signal });
    if (sfRes.ok) {
      const data = await sfRes.json();
      if (data && data.success) {
        let best = data.bestmove || "";
        if (best.startsWith("bestmove ")) {
          best = best.split(" ")[1];
        }
        return {
          move: best,
          eval: data.evaluation,
          depth: depth,
          mate: data.mate,
        };
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.warn("Stockfish.online eval falló", err);
  }

  // 3. Intentar el chess-api original
  try {
    const res = await fetch("https://chess-api.com/v1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fen, depth, maxThinkingTime, variants }),
      signal,
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.warn("chess-api.com falló");
  }

  throw new Error("Todas las APIs en la Nube están inaccesibles");
};

const fetchChessApiCloudWebSocket = async (
  fen: string,
  depth: number,
  maxThinkingTime: number,
  variants: number,
  signal?: AbortSignal
): Promise<any> => {
  // Simplificado para usar la misma función robusta con fallbacks
  return fetchChessApiCloudJson(fen, depth, maxThinkingTime, variants, signal);
};
// --------------------------
function _detectIsWebVersion(): boolean {
  try {
    if ((window as any).electronAPI) return false;
    if (navigator.userAgent.toLowerCase().includes("electron")) return false;
    return true;
  } catch {
    return true;
  }
}
export const IS_WEB_VERSION = _detectIsWebVersion();

export default function App() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    try {
      return /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent);
    } catch (e) {
      return false;
    }
  });
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState<string[]>([]);
  const [rightTab, setRightTab] = useState<"history" | "neural" | "lore">("neural");
  const [showHostIps, setShowHostIps] = useState(false);
  const [showManualIp, setShowManualIp] = useState(false);
  const [isAdventureModeOpen, setIsAdventureModeOpen] = useState(false);


  useEffect(() => {
    // Si hay movimientos en el historial, mostrar automáticamente la pestaña History (solo si no es móvil)
    if (history.length > 0) {
      if (window.innerWidth > 768) {
        setRightTab("history");
      }
    }
  }, [history]);


  useEffect(() => {
    (async () => {
      await initTTS();
    })();
    const desktopDetected = !!(window as any).electronAPI || navigator.userAgent.toLowerCase().includes("electron");
    setIsDesktop(desktopDetected);
    const onResize = () => {
      try {
        const isElectronApp = !!(window as any).electronAPI || navigator.userAgent.toLowerCase().includes("electron");
        if (isElectronApp) {
          setIsMobile(false);
          return;
        }
        setIsMobile(/Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent) || window.innerWidth <= 768);
      } catch (e) { }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Al ocultar pestaña: solo pausar motores (NO destruir workers)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (isSpeaking()) stopSpeaking();
        engineWhiteRef.current?.stop();
        engineBlackRef.current?.stop();
      } else {
        // Al volver a la pestaña, reactivar motor si es su turno
        if (hasStartedRef.current && !gameRef.current.isGameOver()) {
          const turn = gameRef.current.turn();
          const isWhiteAi = turn === "w" && whitePlayerRef.current === "ai";
          const isBlackAi = turn === "b" && blackPlayerRef.current === "ai";
          if (isWhiteAi || isBlackAi) {
            setTimeout(() => triggerEngineRef.current?.(gameRef.current), 300);
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (isSpeaking()) stopSpeaking();
      engineWhiteRef.current?.quit();
      engineBlackRef.current?.quit();
    };
  }, []);

  // Mostrar splash minimalista en móviles (inserta overlay fuera de la jerarquía React para evitar problemas de hooks)
  useEffect(() => {
    if (!isMobile) return;
    const root = document.createElement('div');
    root.id = 'gm3000-mobile-splash';
    Object.assign(root.style, {
      position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', zIndex: '999999',
      display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#000000,#05080a)',
      color: '#fff', padding: '20px'
    });

    const card = document.createElement('div');
    Object.assign(card.style, { maxWidth: '420px', textAlign: 'center', background: '#05080a', padding: '28px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.6)' });

    const img = document.createElement('img');
    img.src = LogoHomeImg || '';
    img.alt = 'GM-3000';
    Object.assign(img.style, { width: '140px', height: 'auto', marginBottom: '18px', display: 'block', marginLeft: 'auto', marginRight: 'auto' });

    const h = document.createElement('h2');
    h.textContent = 'GM-3000';
    Object.assign(h.style, { fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#f5c06b' });

    const p = document.createElement('p');
    p.textContent = 'La versión GM-3000 está disponible solo para PC. Para una experiencia completa instala la app en tu equipo.';
    Object.assign(p.style, { fontSize: '14px', color: '#cbd5e1', marginBottom: '16px' });

    const btnWrap = document.createElement('div');
    Object.assign(btnWrap.style, { display: 'flex', gap: '10px', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' });

    const infoP = document.createElement('p');
    infoP.textContent = 'Para más información o para descargar el instalador, visita nuestro repositorio en GitHub.';
    Object.assign(infoP.style, { fontSize: '13px', color: '#cbd5e1', margin: '0 0 12px 0', textAlign: 'center', maxWidth: '380px' });

    const repoBtn = document.createElement('a');
    repoBtn.href = 'https://github.com/ElalChico/GM-3000';
    repoBtn.target = '_blank';
    repoBtn.rel = 'noreferrer';
    repoBtn.textContent = 'Repositorio en GitHub';
    Object.assign(repoBtn.style, { padding: '10px 14px', background: '#0ea5a4', color: '#012', borderRadius: '10px', fontWeight: '700', textDecoration: 'none' });

    btnWrap.appendChild(infoP);
    btnWrap.appendChild(repoBtn);

    card.appendChild(img);
    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(btnWrap);
    root.appendChild(card);
    document.body.appendChild(root);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      const el = document.getElementById('gm3000-mobile-splash');
      if (el) el.remove();
    };
  }, [isMobile]);

  const [adventureProgress, setAdventureProgress] = useState<AdventureProgress>(() => {
    const saved = localStorage.getItem("chess_adventureProgress");
    const defaults = {
      playerElo: 1000,
      currentStage: 1,
      wins: {},
      defeated: [],
      humanBattles: 0,
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          playerElo: parsed.playerElo ?? 1000,
          currentStage: parsed.currentStage ?? 1,
          wins: parsed.wins || {},
          defeated: parsed.defeated || [],
          humanBattles: parsed.humanBattles ?? 0,
        };
      } catch (e) {
        return defaults;
      }
    }
    return defaults;
  });
  // Estado del mensaje de hito narrativo (campana cada 100 noches)
  const [adventureMilestoneMsg, setAdventureMilestoneMsg] = useState<string | null>(null);
  // Enemigo activo en modo aventura (para registrar victoria al terminar la partida)
  const [activeAdventureEnemy, setActiveAdventureEnemy] = useState<AdventureEnemy | null>(null);
  const [adventureBgIndex, setAdventureBgIndex] = useState(() => {
    const saved = localStorage.getItem("chess_adventureBgIndex");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [adventureBgOpacity, setAdventureBgOpacity] = useState(() => Number(localStorage.getItem("chess_adventureBgOpacity") || "0.8"));
  const [adventureBgHighQuality, setAdventureBgHighQuality] = useState(() => localStorage.getItem("chess_adventureBgHighQuality") === "true");
  const [showEnemyElo, setShowEnemyElo] = useState(() => localStorage.getItem("chess_showEnemyElo") === "true");
  const [adventureAnimationsEnabled, setAdventureAnimationsEnabled] = useState(() => localStorage.getItem("chess_adventureAnimationsEnabled") !== "false");
  const [viewMode, setViewMode] = useState<"play">("play");
  const [showLanAdminOnly, setShowLanAdminOnly] = useState(false);
  const [tournamentManagerHtml, setTournamentManagerHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(encodeURI("./gestor de torneos.html"))
      .then(r => r.text())
      .then(html => { if (!cancelled) setTournamentManagerHtml(html); })
      .catch(err => console.error("Failed to load tournament manager:", err));
    return () => { cancelled = true; };
  }, []);

  // Wake Lock para mantener pantalla encendida durante juego en móvil
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  useEffect(() => {
    localStorage.setItem("chess_adventureBgIndex", String(adventureBgIndex));
  }, [adventureBgIndex]);

  useEffect(() => {
    localStorage.setItem("chess_adventureBgOpacity", adventureBgOpacity.toString());
    localStorage.setItem("chess_adventureBgHighQuality", adventureBgHighQuality.toString());
    localStorage.setItem("chess_showEnemyElo", showEnemyElo.toString());
    localStorage.setItem("chess_adventureAnimationsEnabled", adventureAnimationsEnabled.toString());
  }, [adventureBgOpacity, adventureBgHighQuality, showEnemyElo, adventureAnimationsEnabled]);

  // Wake Lock effect
  useEffect(() => {
    const hasGameStarted = hasStarted || activeAdventureEnemy !== null;

    if (hasGameStarted && !wakeLock && 'wakeLock' in navigator) {
        navigator.wakeLock.request('screen').then(lock => {
            setWakeLock(lock);
            // console.log('Wake Lock activated');
        }).catch(err => {
            // console.log('Wake Lock failed:', err);
        });
    } else if (!hasGameStarted && wakeLock) {
        wakeLock.release().then(() => {
            setWakeLock(null);
            // console.log('Wake Lock released');
        });
    }

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [game, activeAdventureEnemy, wakeLock]);

  const [newVersionAvailable, setNewVersionAvailable] = useState<string | null>(null);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        // Evitar consultas excesivas (caché de 1 hora)
        const lastCheck = localStorage.getItem("chess_lastUpdateCheck");
        const now = Date.now();
        if (lastCheck && now - parseInt(lastCheck) < 3600000) {
          const savedVersion = localStorage.getItem("chess_latestVersionFound");
          if (savedVersion && savedVersion !== CURRENT_VERSION) {
            setNewVersionAvailable(savedVersion);
            return;
          }
        }

        const response = await fetch("https://api.github.com/repos/ElalChico/GM-3000/releases/latest");
        if (!response.ok) return;
        const data = await response.json();
        const latestVersion = data.tag_name.replace(/^v/, '');

        localStorage.setItem("chess_lastUpdateCheck", now.toString());
        localStorage.setItem("chess_latestVersionFound", latestVersion);

        if (latestVersion !== CURRENT_VERSION) {
          setNewVersionAvailable(latestVersion);
        }
      } catch (e) { /* Fallback silencioso */ }
    };
    // checkUpdate();
  }, []);

  useEffect(() => {
    // Precargar fondos de aventura
    ADVENTURE_BGS.forEach(bg => {
      const img = new Image();
      img.src = bg;
    });
  }, []);

  // Fondo seleccionado para modo normal
  const [selectedNormalBgIndex, setSelectedNormalBgIndex] = useState<number>(() => {
    const saved = localStorage.getItem("chess_selectedNormalBgIndex");
    return saved ? parseInt(saved, 10) : 0; // Por defecto el fondo #1 (índice 0)
  });

  // Opacidad del fondo para modo normal
  const [normalBgOpacity, setNormalBgOpacity] = useState<number>(() => {
    const saved = localStorage.getItem("chess_normalBgOpacity");
    return saved ? parseFloat(saved) : 1.0; // Por defecto opacidad al 100%
  });

  useEffect(() => {
    localStorage.setItem("chess_normalBgOpacity", String(normalBgOpacity));
  }, [normalBgOpacity]);

  useEffect(() => {
    // Precargar fondos del juego normal
    NORMAL_BGS.forEach(bg => {
      const img = new Image();
      img.src = bg;
    });
  }, []);

  const [whitePlayer, setWhitePlayer] = useState<"human" | "ai">("human");
  const [blackPlayer, setBlackPlayer] = useState<"human" | "ai">("ai");
const [whiteAiDepth, setWhiteAiDepth] = useState(() => {
    const saved = localStorage.getItem("chess_whiteAiDepth");
    return saved ? parseInt(saved, 10) : 10;
});
const [blackAiDepth, setBlackAiDepth] = useState(() => {
    const saved = localStorage.getItem("chess_blackAiDepth");
    return saved ? parseInt(saved, 10) : 10;
});
  const [whiteEngineName, setWhiteEngineName] = useState<string>(() => {
    return localStorage.getItem("chess_whiteEngineName") || "";
  });
  const [blackEngineName, setBlackEngineName] = useState<string>(() => {
    return localStorage.getItem("chess_blackEngineName") || "";
  });
  const [whiteAiSpeed, setWhiteAiSpeed] = useState(300); // ms per move
  const [blackAiSpeed, setBlackAiSpeed] = useState(300);
  const defaultobsidianConfig = {
    aspirationDepth: 3,
    aspirationDelta: 25,
    nullMoveReduction: 3,
    futilityDepth: 3,
    lmrReduction: 2,
    transpositionTableSize: 8,
    enablePonder: false,
  };
  const [whiteObsidianConfig, setwhiteObsidianConfig] = useState(() => {
    const saved = localStorage.getItem("chess_whiteObsidianConfig");
    return saved ? JSON.parse(saved) : defaultobsidianConfig;
  });
  const [blackObsidianConfig, setblackObsidianConfig] = useState(() => {
    const saved = localStorage.getItem("chess_blackObsidianConfig");
    return saved ? JSON.parse(saved) : defaultobsidianConfig;
  });

useEffect(() => {
    localStorage.setItem("chess_whiteObsidianConfig", JSON.stringify(whiteObsidianConfig));
    applyObsidianEngineConfig(engineWhiteRef.current, whiteObsidianConfig);
}, [whiteObsidianConfig]);

useEffect(() => {
    localStorage.setItem("chess_whiteAiDepth", whiteAiDepth.toString());
}, [whiteAiDepth]);

useEffect(() => {
    localStorage.setItem("chess_blackObsidianConfig", JSON.stringify(blackObsidianConfig));
    applyObsidianEngineConfig(engineBlackRef.current, blackObsidianConfig);
}, [blackObsidianConfig]);

useEffect(() => {
    localStorage.setItem("chess_blackAiDepth", blackAiDepth.toString());
}, [blackAiDepth]);

  useEffect(() => {
    localStorage.setItem("chess_blackObsidianConfig", JSON.stringify(blackObsidianConfig));
    applyObsidianEngineConfig(engineBlackRef.current, blackObsidianConfig);
  }, [blackObsidianConfig]);

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
  const [isGameStopped, setIsGameStopped] = useState(false);
  const [stoppedGameSnapshot, setStoppedGameSnapshot] = useState<{
    fen: string;
    history: any[];
    whiteTime: number;
    blackTime: number;
    whitePlayer: string;
    blackPlayer: string;
    whiteEngineType: string;
    blackEngineType: string;
    whiteEngineName: string;
    blackEngineName: string;
    boardOrientation: string;
    moveEvaluations: number[];
    moveTimes: { w: number; b: number }[];
  } | null>(null);
  const [moveEvaluations, setMoveEvaluations] = useState<number[]>([]);
  const [moveTimes, setMoveTimes] = useState<{ w: number, b: number }[]>([]);
  const [moveElapsedTimes, setMoveElapsedTimes] = useState<number[]>([]);

  const [isNeuralVisionEnabled, setIsNeuralVisionEnabled] = useState(() => {
    const saved = localStorage.getItem("chess_isNeuralVisionEnabled");
    return saved === null ? true : saved === "true";
  });

  const [isRandomColors, setIsRandomColors] = useState(() => {
    const saved = localStorage.getItem("chess_isRandomColors");
    return saved === "true";
  });



  interface SavedGameState {
    pgn: string;
    whitePlayer: "human" | "ai";
    blackPlayer: "human" | "ai";
    whiteEngineType: string;
    blackEngineType: string;
    whiteEngineName: string;
    blackEngineName: string;
    whiteAiDepth: number;
    blackAiDepth: number;
    whiteTime: number;
    blackTime: number;
    initialTimeMin: number;
    initialTimeInc: number;
    activeAdventureEnemy: AdventureEnemy | null;
    moveEvaluations: number[];
    moveTimes: { w: number, b: number }[];
    whiteObsidianConfig: typeof defaultobsidianConfig;
    blackObsidianConfig: typeof defaultobsidianConfig;
  }

  const [savedNormalGame, setSavedNormalGame] = useState<SavedGameState | null>(null);
  const [savedAdventureGame, setSavedAdventureGame] = useState<SavedGameState | null>(null);
  const [currentGameMode, setCurrentGameMode] = useState<"normal" | "adventure" | "tournament" | "live_station">("normal");

  const [isGuestMode, setIsGuestMode] = useState(() => localStorage.getItem("chess_guestMode") === "true");
  useEffect(() => {
    localStorage.setItem("chess_guestMode", String(isGuestMode));
  }, [isGuestMode]);

  // Efecto para cambiar el fondo de aventura cuando se avanza de nivel/stage
  // El fondo se asigna por stage y persiste durante todo el nivel (~10 partidas)
  useEffect(() => {
    if (currentGameMode === "adventure" && adventureProgress.currentStage > 0) {
      // Asignar fondo basado en el stage actual (1-4 stages)
      // Cada stage tiene un fondo consistente
      const stageIndex = (adventureProgress.currentStage - 1) % ADVENTURE_BGS.length;
      setAdventureBgIndex(stageIndex);
    }
  }, [adventureProgress.currentStage, currentGameMode]);
  const [notificationConfig, setNotificationConfig] = useState<"all" | "adventure" | "normal" | "none">(() => {
    const saved = localStorage.getItem("chess_notificationConfig");
    if (saved && ["all", "adventure", "normal", "none"].includes(saved)) return saved as any;
    return "all";
  });
  const [systemNotification, setSystemNotification] = useState<string | null>(null);
  const [aliasSavedDialog, setAliasSavedDialog] = useState(false);

  useEffect(() => {
    if (systemNotification) {
      const timer = setTimeout(() => setSystemNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [systemNotification]);

  useEffect(() => {
    if (aliasSavedDialog) {
      const timer = setTimeout(() => setAliasSavedDialog(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [aliasSavedDialog]);

  const isNeuralVisionEnabledRef = useRef(isNeuralVisionEnabled);
  useEffect(() => {
    isNeuralVisionEnabledRef.current = isNeuralVisionEnabled;
    triggerEngine(gameRef.current);
  }, [isNeuralVisionEnabled]);

  const [boardSize, setBoardSize] = useState<"small" | "medium" | "large" | "fill">(() => {
    return (localStorage.getItem("chess_boardSize") as any) || "fill";
  });
  const [boardAlign, setBoardAlign] = useState<"center" | "left" | "right">(() => {
    return (localStorage.getItem("chess_boardAlign") as any) || "center";
  });
  const [boardTheme, setBoardTheme] = useState<string>(() => {
    return localStorage.getItem("chess_boardTheme") || "gray";
  });
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("chess_isSoundEnabled");
    return saved === null ? true : saved === "true";
  });
  const [isEngineVisible, setIsEngineVisible] = useState(false);

  const [isAssistModeEnabled, setIsAssistModeEnabled] = useState(false);
  const [assistEngineProvider, setAssistEngineProvider] = useState<"local" | "lichess">(() => {
    return (localStorage.getItem("chess_assistEngineProvider") as "local" | "lichess") || "local";
  });

  const [assistMessage, setAssistMessage] = useState<string | null>(null);
  const [apiCloudStatus, setApiCloudStatus] = useState<'ok' | 'offline' | 'checking'>('checking');
  const assistAbortControllerRef = useRef<AbortController | null>(null);

  const [isUndoEnabled, setIsUndoEnabled] = useState(() => {
    return localStorage.getItem("chess_isUndoEnabled") === "true";
  });
  const [quickSelectOpen, setQuickSelectOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [tournamentWins, setTournamentWins] = useState<Record<string, { w: number, b: number, d: number }>>(() => {
    const saved = localStorage.getItem("chess_tournamentWinsV1");
    return saved ? JSON.parse(saved) : {};
  });
  const [tournamentChartEnabled, setTournamentChartEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("chess_tournamentChartEnabled");
    return saved ? JSON.parse(saved) : false;
  });
  const [tournamentGameLog, setTournamentGameLog] = useState<TournamentGameLogItem[]>(() => {
    const saved = localStorage.getItem("chess_tournamentGameLogV1");
    return saved ? JSON.parse(saved) : [];
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isAnalyzingRef = useRef(false);
  const [tournamentCountdown, setTournamentCountdown] = useState<number | null>(null);
  
  // --- MODO PROGRESIVO ---
  interface ProgressiveState {
    enabled: boolean;
    level: number; // Nivel de dificultad (1, 2, 3, ...)
    startElo: number; // Elo inicial seleccionado
    currentElo: number; // Elo actual (puede aumentar)
    gamesPerLevel: number; // Partidas a jugar por nivel
    gamesPlayedAtLevel: number; // Partidas jugadas en nivel actual
    gamesWonAtLevel: number; // Partidas ganadas en nivel actual
    gamesLostAtLevel: number; // Partidas perdidas en nivel actual
    gamesTiedAtLevel: number; // Partidas empatadas en nivel actual
    eloIncrement: number; // Cuántos Elo aumenta por nivel
    lastProgressTime: number; // Timestamp del último progreso
  }

  // Rangos de Elo por motor
  const ENGINE_ELO_RANGES: Record<string, { min: number; max: number; default: number }> = {
    "atlas": { min: 800, max: 2200, default: 1200 },
    "edd": { min: 1000, max: 2400, default: 1400 },
    "ailed": { min: 1200, max: 2600, default: 1600 },
    "obsidian": { min: 1400, max: 3000, default: 1800 },
    
    "stockfish": { min: 400, max: 3500, default: 1600 },
    "maia1": { min: 1100, max: 1700, default: 1400 },
    "maia2": { min: 1300, max: 1900, default: 1600 },
  };

  const getEngineEloRange = (engineType: string) => {
    return ENGINE_ELO_RANGES[engineType] || { min: 400, max: 3500, default: 1600 };
  };
  
  const defaultProgressiveState: ProgressiveState = {
    enabled: false,
    level: 1,
    startElo: 1600,
    currentElo: 1600,
    gamesPerLevel: 4,
    gamesPlayedAtLevel: 0,
    gamesWonAtLevel: 0,
    gamesLostAtLevel: 0,
    gamesTiedAtLevel: 0,
    eloIncrement: 50,
    lastProgressTime: 0,
  };

  const [progressiveState, setProgressiveState] = useState<ProgressiveState>(() => {
    const saved = localStorage.getItem("chess_progressiveStateV1");
    return saved ? JSON.parse(saved) : defaultProgressiveState;
  });

  // Guardar estado progresivo en localStorage
  useEffect(() => {
    if (!isGuestMode) localStorage.setItem("chess_progressiveStateV1", JSON.stringify(progressiveState));
  }, [progressiveState, isGuestMode]);

  const [analysisIndex, setAnalysisIndex] = useState<number | null>(null);
  const analysisIndexRef = useRef<number | null>(null);
  const analyzingIndexSentRef = useRef<number | null>(null);
  const evalScoreRef = useRef(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisDepthMode, setAnalysisDepthMode] = useState<"fast" | "deep" | "lichess" | "explorer">("fast");
  const [isMasterAnalysisOpen, setIsMasterAnalysisOpen] = useState(false);
  const [showAnalysisConfig, setShowAnalysisConfig] = useState(false);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // --- AI Analysis Config ---
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem("chess_aiProvider") || "openrouter");
  const [aiApiKey, setAiApiKey] = useState(() => {
    const provider = localStorage.getItem("chess_aiProvider") || "openrouter";
    return localStorage.getItem(`chess_aiApiKey_${provider}`) || localStorage.getItem("chess_aiApiKey") || "";
  });
  const [aiModel, setAiModel] = useState(() => localStorage.getItem("chess_aiModel") || "openrouter/free");
  const [aiCustomUrl, setAiCustomUrl] = useState(() => localStorage.getItem("chess_aiCustomUrl") || "");
  const [enableTechnicalAnalysis, setEnableTechnicalAnalysis] = useState(() => localStorage.getItem("chess_enableTechnicalAnalysis") !== "false");
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysisProgress, setAiAnalysisProgress] = useState("");
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{ general: string; technical: string } | null>(null);
  // Estados separados para renderizado asíncrono
  const [aiGeneralResult, setAiGeneralResult] = useState<string | null>(null);
  const [aiTechnicalResult, setAiTechnicalResult] = useState<string | null>(null);
  const [isAiGeneralLoading, setIsAiGeneralLoading] = useState(false);
  const [isAiTechnicalLoading, setIsAiTechnicalLoading] = useState(false);
  const [aiFallbackInfo, setAiFallbackInfo] = useState<FallbackInfo | null>(null);
  const [showAIConfigExpanded, setShowAIConfigExpanded] = useState(false);
  const [showVisualPrefsExpanded, setShowVisualPrefsExpanded] = useState(false);

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

  const [showAdventureExitConfirm, setShowAdventureExitConfirm] = useState(false);

  const resetMatchStats = () => {
    const emptyStats = {
      hh: { w: 0, b: 0, d: 0, total: 0 },
      hm: { w: 0, b: 0, d: 0, total: 0 },
      mh: { w: 0, b: 0, d: 0, total: 0 },
      mm: { w: 0, b: 0, d: 0, total: 0 },
    };
    setMatchStats(emptyStats);
    setTournamentWins({});
    setTournamentGameLog([]);
    setTournamentChartEnabled(false);

    // También restaurar progreso de aventura
    const defaultAdventure = {
      playerElo: 1000,
      currentStage: 1,
      wins: {},
      defeated: [],
      humanBattles: 0,
    };
    setAdventureProgress(defaultAdventure);
    localStorage.setItem("chess_adventureProgress", JSON.stringify(defaultAdventure));

    localStorage.setItem("chess_matchStatsV2", JSON.stringify(emptyStats));
    localStorage.removeItem("chess_tournamentWinsV1");
    localStorage.removeItem("chess_tournamentGameLogV1");
    localStorage.removeItem("chess_tournamentChartEnabled");
    setShowResetConfirm(false);
    playAudio("error"); // Sonido de feedback
  };

  useEffect(() => {
    if (!isGuestMode) localStorage.setItem("chess_tournament", JSON.stringify(tournament));
  }, [tournament, isGuestMode]);

  useEffect(() => {
    if (!isGuestMode) localStorage.setItem("chess_tournamentChartEnabled", JSON.stringify(tournamentChartEnabled));
  }, [tournamentChartEnabled, isGuestMode]);

  useEffect(() => {
    if (!isGuestMode) localStorage.setItem("chess_tournamentGameLogV1", JSON.stringify(tournamentGameLog));
  }, [tournamentGameLog, isGuestMode]);

  const tournamentChartData = useMemo(() => {
    let whiteWins = 0;
    let blackWins = 0;
    let draws = 0;
    let winsAsWhite = 0;
    let winsAsBlack = 0;
    let cumulativeMoves = 0;

    return tournamentGameLog.map((entry, index) => {
      if (entry.result === "white") {
        whiteWins++;
        winsAsWhite++;
      } else if (entry.result === "black") {
        blackWins++;
        winsAsBlack++;
      } else {
        draws++;
      }
      cumulativeMoves += entry.moves;

      return {
        game: index + 1,
        whiteWins,
        blackWins,
        draws,
        winsAsWhite,
        winsAsBlack,
        moves: entry.moves,
        averageMoves: +(cumulativeMoves / (index + 1)).toFixed(1),
        cumulativeMoves,
      };
    });
  }, [tournamentGameLog]);

  const copyTournamentLog = async () => {
    const payload = {
      summary: {
        totalMatches: tournamentGameLog.length,
        whiteWins: tournamentChartData.length ? tournamentChartData[tournamentChartData.length - 1].whiteWins : 0,
        blackWins: tournamentChartData.length ? tournamentChartData[tournamentChartData.length - 1].blackWins : 0,
        draws: tournamentChartData.length ? tournamentChartData[tournamentChartData.length - 1].draws : 0,
        winsAsWhite: tournamentChartData.length ? tournamentChartData[tournamentChartData.length - 1].winsAsWhite : 0,
        winsAsBlack: tournamentChartData.length ? tournamentChartData[tournamentChartData.length - 1].winsAsBlack : 0,
        averageMoves: tournamentChartData.length ? tournamentChartData[tournamentChartData.length - 1].averageMoves : 0,
      },
      log: tournamentGameLog,
    };

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        setSystemNotification(language === "es" ? "Historial de torneo copiado" : "Tournament log copied");
      }
    } catch (err) {
      console.error(err);
      setSystemNotification(language === "es" ? "Error al copiar datos" : "Error copying data");
    }
  };

  const resetTournamentChart = () => {
    setTournamentGameLog([]);
    setTournamentChartEnabled(false);
    localStorage.removeItem("chess_tournamentGameLogV1");
    setSystemNotification(language === "es" ? "Gráficos de torneo reiniciados" : "Tournament charts reset");
  };

  // Escuchar comandos del Gestor de Torneos
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'chess_command' && e.newValue) {
        try {
          const cmd = JSON.parse(e.newValue);
          if (cmd.type === 'start_match') {
            // Configurar jugadores y comenzar la partida
            const { white, black, matchId } = cmd;
            setWhiteEngineName(white.isAi ? white.name : "");
            setBlackEngineName(black.isAi ? black.name : "");
            setWhitePlayer(white.isAi ? "ai" : "human");
            setBlackPlayer(black.isAi ? "ai" : "human");
            // Guardar el ID del encuentro para reportar el resultado después
            localStorage.setItem("chess_current_match_id", String(matchId));

            // Si es la ronda 1, reseteamos las estadísticas del torneo actual
            if (cmd.matchId === 1 || !localStorage.getItem("chess_tournamentWinsV1")) {
              setTournamentWins({});
              localStorage.removeItem("chess_tournamentWinsV1");
            }

            // Activar el modo torneo en la interfaz
            setTournament((prev: typeof tournament) => ({
              ...prev,
              active: true,
              currentRound: cmd.matchId || prev.currentRound,
              mode: prev.mode === "none" ? "rounds" : prev.mode
            }));

            // Reiniciar el juego (con un pequeño retraso para asegurar la actualización del estado)
            setTimeout(() => {
              resetGameRef.current?.();
            }, 100);
          }
          // Limpiar el comando procesado
          localStorage.removeItem('chess_command');
        } catch (e) { console.error("Error al procesar comando del torneo:", e); }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);


  const [initialTimeMin, setInitialTimeMin] = useState(10);
  const [initialTimeInc, setInitialTimeInc] = useState(0);
  const [whiteTime, setWhiteTime] = useState(600); // 10 mins
  const [blackTime, setBlackTime] = useState(600);
  const [timerActive, setTimerActive] = useState(false);
  const [timeOutWinner, setTimeOutWinner] = useState<"w" | "b" | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [startCountdown, setStartCountdown] = useState<number | null>(null);
  const [moveFrom, setMoveFrom] = useState("");

  const [hasStarted, setHasStarted] = useState(false);
  const [initialFen, setInitialFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [customFen, setCustomFen] = useState<string | null>(null);
  const [positionEditorFen, setPositionEditorFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [selectedSparePiece, setSelectedSparePiece] = useState<string | null>(null);
  const [showFreeMode, setShowFreeMode] = useState(false);
  const [freeModeStage, setFreeModeStage] = useState<'config' | 'board' | 'playing'>('config');
  const [freeModeEngineType, setFreeModeEngineType] = useState<string>("stockfish");
  const [freeModeElo, setFreeModeElo] = useState<number>(10);
  const [freeModeColor, setFreeModeColor] = useState<"white" | "black">("white");
  const [studyPanelExpanded, setStudyPanelExpanded] = useState(true);
  const isStartingGameRef = useRef(false);
  // Permite cancelar la secuencia de inicio (sync + countdown) si se detiene la partida
  const startSequenceAbortRef = useRef(false);

  // Auto-expandir el panel de Modo Estudio al activarse el modo
  useEffect(() => {
    if (freeModeStage === 'board') {
      setStudyPanelExpanded(true);
    }
  }, [freeModeStage]);

  // --- Historial del editor de posición (Modo Estudio) ---
  const EDITOR_INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const editorFenHistoryRef = useRef<string[]>([EDITOR_INITIAL_FEN]);
  const editorHistoryIndexRef = useRef(0);
  const [editorFenHistory, setEditorFenHistory] = useState<string[]>([EDITOR_INITIAL_FEN]);
  const recordEditorStepRef = useRef((_newFen: string) => {});
  const undoEditorStepRef = useRef(() => {});
  const redoEditorStepRef = useRef(() => {});
  const resetEditorHistoryRef = useRef((_fen?: string) => {});

  // Asignaciones por render: siempre leen el estado/ref actual (sin dependencias en handlers)
  recordEditorStepRef.current = (newFen: string) => {
    const hist = editorFenHistoryRef.current;
    const idx = editorHistoryIndexRef.current;
    // Si se retrocedió, truncar el historial hacia adelante antes de reescribir
    const base = idx < hist.length - 1 ? hist.slice(0, idx + 1) : hist;
    if (base[base.length - 1] === newFen) return;
    const next = [...base, newFen];
    editorFenHistoryRef.current = next;
    editorHistoryIndexRef.current = next.length - 1;
    setEditorFenHistory(next);
  };
  undoEditorStepRef.current = () => {
    if (editorHistoryIndexRef.current <= 0) return;
    editorHistoryIndexRef.current--;
    setPositionEditorFen(editorFenHistoryRef.current[editorHistoryIndexRef.current]);
    setSelectedSparePiece(null);
  };
  redoEditorStepRef.current = () => {
    const hist = editorFenHistoryRef.current;
    if (editorHistoryIndexRef.current >= hist.length - 1) return;
    editorHistoryIndexRef.current++;
    setPositionEditorFen(hist[editorHistoryIndexRef.current]);
    setSelectedSparePiece(null);
  };
  resetEditorHistoryRef.current = (fen?: string) => {
    const base = fen || EDITOR_INITIAL_FEN;
    editorFenHistoryRef.current = [base];
    editorHistoryIndexRef.current = 0;
    setEditorFenHistory([base]);
  };

  // --- Estados de Música de Aventura ---
const [adventureMusicVolume, setAdventureMusicVolume] = useState(() => {
    const saved = localStorage.getItem("chess_adventureMusicVolume");
    const parsed = saved ? parseFloat(saved) : 1.0;
    return isNaN(parsed) ? 1.0 : parsed;
});
  const [keepMusicDuringGame, setKeepMusicDuringGame] = useState(() => {
    const saved = localStorage.getItem("chess_keepMusicDuringGame");
    return saved !== null ? saved === "true" : true; // Por defecto true
  });
  const currentTrackIndexRef = useRef(0);
  const activeAdventureTrackRef = useRef<string>(ADVENTURE_TRACKS[0]);

  // --- Lógica de Música de Fondo (Aventura) - Implementación robusta ---
  const adventureAudioRef = useRef<HTMLAudioElement | null>(null);

  const isAdventureActive = isAdventureModeOpen || currentGameMode === "adventure";

  // Inicializa el elemento de audio una sola vez
  useEffect(() => {
    if (!adventureAudioRef.current) {
      const audio = new Audio();
      audio.volume = 0;
      audio.loop = false;
      // Al terminar una pista, avanza automáticamente a la siguiente
      audio.onended = () => {
        currentTrackIndexRef.current = (currentTrackIndexRef.current + 1) % ADVENTURE_TRACKS.length;
        activeAdventureTrackRef.current = ADVENTURE_TRACKS[currentTrackIndexRef.current];
        audio.src = activeAdventureTrackRef.current;
        audio.currentTime = 0;
        audio.play().catch(err => {
          console.warn('Error reproduciendo siguiente pista:', err);
        });
      };
      audio.onerror = (err) => {
        console.warn('Error cargando audio:', err);
      };
      adventureAudioRef.current = audio;
    }
    return () => {
      adventureAudioRef.current?.pause();
    };
    // Solo al montar/desmontar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reacciona a cambios de modo, sonido y volumen
  useEffect(() => {
    const audio = adventureAudioRef.current;
    if (!audio) return;

    const targetVol = Math.min(1, Math.max(0, adventureMusicVolume));
    // Se reproduce siempre que la aventura esté activa (mapa abierto O partida de aventura)
    const shouldPlay = (isAdventureModeOpen || (currentGameMode === "adventure" && keepMusicDuringGame && hasStarted)) && isSoundEnabled;

    // Si debería sonar pero está pausado: determinar qué pista y reproducir
    if (shouldPlay && audio.paused) {
      // Asegurarse de que hay un src asignado
      if (!audio.src || audio.src === window.location.href) {
        currentTrackIndexRef.current = 0;
        activeAdventureTrackRef.current = ADVENTURE_TRACKS[0];
        audio.src = activeAdventureTrackRef.current;
        audio.currentTime = 0;
      }
      audio.volume = targetVol;
      audio.play().catch(err => {
        console.warn('Error reproduciendo música de aventura:', err);
      });
    } else if (!shouldPlay && !audio.paused) {
      // Parar suavemente
      audio.pause();
      audio.currentTime = 0;
    }

    // Actualizar volumen en tiempo real
    if (!audio.paused) {
      audio.volume = targetVol;
    }
  }, [isAdventureModeOpen, isSoundEnabled, adventureMusicVolume, currentGameMode, keepMusicDuringGame, hasStarted]);


  useEffect(() => {
    localStorage.setItem("chess_adventureMusicVolume", adventureMusicVolume.toString());
    localStorage.setItem("chess_keepMusicDuringGame", keepMusicDuringGame.toString());
    localStorage.setItem("chess_adventureAnimationsEnabled", adventureAnimationsEnabled.toString());
  }, [adventureMusicVolume, keepMusicDuringGame, adventureAnimationsEnabled]);


  useEffect(() => {
    if (!hasStarted) {
      setWhiteTime(initialTimeMin * 60);
      setBlackTime(initialTimeMin * 60);
    }
  }, [initialTimeMin, hasStarted]);

  const [gameResult, setGameResult] = useState<string | null>(null);
  const gameResultRef = useRef<string | null>(null);
  const [gameResultDismissed, setGameResultDismissed] = useState(false);
  useEffect(() => { gameResultRef.current = gameResult; }, [gameResult]);
  const [preMoves, setPreMoves] = useState<string[]>([]);
  const preMovesRef = useRef(preMoves);
  useEffect(() => { preMovesRef.current = preMoves; }, [preMoves]);

  const gameRecordedRef = useRef(false);

  useEffect(() => {
    if (history.length <= 1) {
      gameRecordedRef.current = false;
    }
  }, [history]);

  useEffect(() => {
    if (hasStarted && !showMentalMode && (game.isGameOver() || timeOutWinner || gameResult) && !gameRecordedRef.current) {
      gameRecordedRef.current = true;
      let winner = "";
      if (gameResult && gameResult.includes("Blancas ganan")) winner = "w";
      else if (gameResult && gameResult.includes("Negras ganan")) winner = "b";
      else if (gameResult && gameResult.includes("Tablas")) winner = "draw";
      else if (timeOutWinner) winner = timeOutWinner;
      else if (game.isCheckmate()) winner = game.turn() === 'w' ? 'b' : 'w';
      else if (game.isDraw()) winner = "draw";

      if (winner) {
        // MODO PROGRESIVO: Actualizar estadísticas si está habilitado
        if (progressiveState.enabled && currentGameMode === "normal" && 
            ((whitePlayer === "human" && blackPlayer === "ai") || (whitePlayer === "ai" && blackPlayer === "human"))) {
          if (!isGuestMode) setProgressiveState(prev => {
            let newState = { ...prev };
            newState.gamesPlayedAtLevel++;
            
            // Contar resultado
            if (winner === "w" && whitePlayer === "human") {
              newState.gamesWonAtLevel++;
            } else if (winner === "b" && blackPlayer === "human") {
              newState.gamesWonAtLevel++;
            } else if (winner === "draw") {
              newState.gamesTiedAtLevel++;
            } else {
              newState.gamesLostAtLevel++;
            }
            
            // Verificar si completó el nivel (4 partidas GANADAS)
            if (newState.gamesWonAtLevel >= 4) {
              // Auto-aumentar Elo al siguiente nivel
              newState.level++;
              newState.currentElo = prev.startElo + (newState.level - 1) * newState.eloIncrement;
              newState.gamesPlayedAtLevel = 0;
              newState.gamesWonAtLevel = 0;
              newState.gamesLostAtLevel = 0;
              newState.gamesTiedAtLevel = 0;
              newState.lastProgressTime = Date.now();
              
               // Notificar al usuario del progreso (opcional: mostrar notificación)
               // console.log(`[Modo Progresivo] ¡Nivel completado! Subiendo a Nivel ${newState.level} (ELO ${newState.currentElo})`);
            }
            
            return newState;
          });
        }
        
        // Registrar el resultado en el sistema de aprendizaje de los motores
        const lastMove = history.length > 0 ? history[history.length - 1] : "";
        if ((whiteEngineType === "obsidian" || whiteEngineType === "obsidian") && engineWhiteRef.current && typeof (engineWhiteRef.current as any).recordGameResult === "function") {
          const whiteResult = winner === "w" ? "win" : (winner === "draw" ? "draw" : "loss");
          (engineWhiteRef.current as any).recordGameResult(game.fen(), lastMove, whiteResult);
        }
        if ((blackEngineType === "obsidian" || blackEngineType === "obsidian") && engineBlackRef.current && typeof (engineBlackRef.current as any).recordGameResult === "function") {
          const blackResult = winner === "b" ? "win" : (winner === "draw" ? "draw" : "loss");
          (engineBlackRef.current as any).recordGameResult(game.fen(), lastMove, blackResult);
        }

        // Determinar el texto del estado de la partida
        let statusText = "";
        if (winner === "w") statusText = language === "es" ? "¡Ganan las Blancas!" : "White Wins!";
        else if (winner === "b") statusText = language === "es" ? "¡Ganan las Negras!" : "Black Wins!";
        else statusText = language === "es" ? "Empate" : "Draw";

        if (game.isCheckmate()) statusText = (language === "es" ? "¡Jaque Mate! " : "Checkmate! ") + statusText;
        else if (game.isStalemate()) statusText = (language === "es" ? "Tablas por Ahogado" : "Stalemate");
        else if (game.isThreefoldRepetition()) statusText = (language === "es" ? "Tablas por Triple Repetición" : "Threefold Repetition");
        else if (game.isInsufficientMaterial()) statusText = (language === "es" ? "Tablas por Material Insuficiente" : "Insufficient Material");
        else if (game.isDraw()) statusText = (language === "es" ? "Tablas (Regla de 50 jugadas / Repetición)" : "Draw (50-move rule / Repetition)");

        // Asegurar que gameResult esté seteado para que aparezca el overlay de fin de partida
        if (!gameResult) {
          const finalStatus = statusText;
          // Añadimos un pequeño retardo (1 segundo) para que se vea la última jugada
          setTimeout(() => {
            setGameResult(finalStatus);
            // Si somos el host, sincronizamos el resultado con el invitado
            if (lanRole === "host" && lanSendStateRef.current) {
              lanSendStateRef.current({ gameResult: finalStatus, hasStarted: false });
            }
          }, 1200);
        }

        // Determine matchup type
        let matchupType: "hh" | "hm" | "mh" | "mm" = "hh";
        if (whitePlayer === "human" && blackPlayer === "ai") matchupType = "hm";
        else if (whitePlayer === "ai" && blackPlayer === "human") matchupType = "mh";
        else if (whitePlayer === "ai" && blackPlayer === "ai") matchupType = "mm";

        if (!isGuestMode) setMatchStats(prev => {
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

        // Actualizar estadísticas específicas del torneo si está activo
        if (tournament.active) {
          const baseNameW = whiteEngineName || (whiteEngineType === "atlas" ? "Atlas.1" : whiteEngineType === "edd" ? "Nexus" : whiteEngineType === "obsidian" ? "Obsidian" : whiteEngineType === "obsidian" ? "DxA.47" : whiteEngineType.startsWith("maia") ? "Maia: " + whiteEngineType.substring(4) : whiteEngineType === "ailed" ? "Ailed" : "Stockfish");
          const whiteName = whitePlayer === "human" ? (effectivePlayerName || "Humano") : baseNameW;

          const baseNameB = blackEngineName || (blackEngineType === "atlas" ? "Atlas.1" : blackEngineType === "edd" ? "Nexus" : blackEngineType === "obsidian" ? "Obsidian" : blackEngineType === "obsidian" ? "DxA.47" : blackEngineType.startsWith("maia") ? "Maia: " + blackEngineType.substring(4) : blackEngineType === "ailed" ? "Ailed" : "Stockfish");
          const blackName = blackPlayer === "human" ? (effectivePlayerName || "Humano") : baseNameB;

          if (!isGuestMode) setTournamentWins(prev => {
            const next = { ...prev };
            if (!next[whiteName]) next[whiteName] = { w: 0, b: 0, d: 0 };
            if (!next[blackName]) next[blackName] = { w: 0, b: 0, d: 0 };

            if (winner === "w") {
              next[whiteName].w++; // Blancas ganan siendo blancas
            } else if (winner === "b") {
              next[blackName].b++; // Negras ganan siendo negras
            } else {
              next[whiteName].d++;
              next[blackName].d++;
            }

            localStorage.setItem("chess_tournamentWinsV1", JSON.stringify(next));
            return next;
          });

          if (!isGuestMode) setTournamentGameLog(prev => {
            const nextLog = [
              ...prev,
              {
                matchNumber: tournament.currentRound,
                result: (winner === "w" ? "white" : winner === "b" ? "black" : "draw") as TournamentResultType,
                whiteName,
                blackName,
                winnerName: winner === "w" ? whiteName : winner === "b" ? blackName : "Draw",
                whiteIsAi: whitePlayer === "ai",
                blackIsAi: blackPlayer === "ai",
                moves: history.length,
                timestamp: Date.now(),
              },
            ];
            return nextLog;
          });
        }

        // Contador universal de batallas humanas ganadas (Crónicas de los Mortales)
        // Solo cuenta partidas donde hay un humano vs una máquina Y el humano gana
        const isHumanVsMachine = (whitePlayer === "human" && blackPlayer === "ai") ||
          (whitePlayer === "ai" && blackPlayer === "human");
        const isHumanWin = (whitePlayer === "human" && winner === "w") || (blackPlayer === "human" && winner === "b");
        if (isHumanVsMachine && isHumanWin) {
          if (!isGuestMode) setAdventureProgress(prev => {
            const newBattles = prev.humanBattles + 1;
            // Disparar mensaje de hito cada 100 noches
            if (newBattles % 100 === 0) {
              if (newBattles === 3000) {
                setTimeout(() => setAdventureMilestoneMsg(
                  "âaSï¸ Has completado el ciclo de las 3000 Noches. El Gran Maestre te reconoce. Eres digno de enfrentar al Códice Viviente en su forma verdadera. Tu nombre queda grabado en el Libro de los Caminantes para siempre."
                ), 1500);
              } else {
                setTimeout(() => setAdventureMilestoneMsg(
                  `ðx La Noche ${newBattles} ha caído. El Gran Maestre observa tu perseverancia. Tu nombre resuena en la Torre del Cálculo Perpetuo.`
                ), 1500);
              }
            }
            // Si hay un enemigo activo de aventura, también registrar la victoria/derrota en su progreso
            if (activeAdventureEnemy && whitePlayer === "human" && blackPlayer === "ai" && winner === "w") {
              const enemy = activeAdventureEnemy;
              const prevWins = (prev.wins && prev.wins[enemy.id]) || 0;
              const newWins = { ...(prev.wins || {}), [enemy.id]: prevWins + 1 };
              let newDefeated = [...(prev.defeated || [])];
              // Jefe derrotado por primera vez â  sellarlo como conquistado
              if (enemy.tier === "jefe" && !newDefeated.includes(enemy.id)) {
                newDefeated.push(enemy.id);
              }
              // Calcular el nivel actual de forma estricta:
              // Solo se avanza si el jefe y TODOS los soldados del nivel actual están completados.
              let newCurrentStage = 1;
              for (const s of STAGES) {
                const bossDone = newDefeated.includes(s.boss.id);
                const soldiersDone = s.enemies.every(e => (newWins[e.id] || 0) >= s.requiredWins);
                if (bossDone && soldiersDone) {
                  newCurrentStage = Math.min(STAGES.length, s.id + 1);
                } else {
                  break;
                }
              }

              return {
                ...prev,
                wins: newWins,
                defeated: newDefeated,
                humanBattles: newBattles,
                currentStage: newCurrentStage,
              };
            }
            return { ...prev, humanBattles: newBattles };
          });
          // âS& MANTENER en modo aventura después de terminar partida
          // El usuario puede jugar otra partida sin volver a configuración
          // NO limpiar enemigo activo, NO cambiar a modo normal
          // Solo resetear nombres de engine para la siguiente partida
          if (activeAdventureEnemy) {
            setWhiteEngineName("");
            setBlackEngineName("");
          }
        }

        // Handle Tournament specific logic
        setTournament(prev => {
          if (!prev.active) return prev;

          // Guardar resultado para el Gestor de Torneos Profesional
          const matchId = localStorage.getItem("chess_current_match_id");
          if (matchId) {
            localStorage.setItem("chess_last_result", JSON.stringify({
              matchId: parseInt(matchId),
              winner: winner,
              statusText: statusText
            }));
            localStorage.removeItem("chess_current_match_id");
          }

          if (prev.mode === "rounds" && prev.currentRound >= prev.maxRounds) {
            // Torneo finalizado. Resetear ronda para la próxima vez.
            return { ...prev, active: false, currentRound: 1 };
          }
          // Avanzar ronda
          return { ...prev, currentRound: prev.currentRound + 1 };
        });
      }
    }
  }, [game, timeOutWinner, gameResult, hasStarted, history, whitePlayer, blackPlayer, activeAdventureEnemy]);


  const [preMoveMode, setPreMoveMode] = useState<"disabled" | "single" | "multiple">("multiple");
  const [isSyncing, setIsSyncing] = useState(false);
  useEffect(() => {
    if (hasStarted && (isSyncing || startCountdown !== null)) {
      setIsSyncing(false);
      setStartCountdown(null);
    }
  }, [hasStarted, isSyncing, startCountdown]);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isConfigSidebarOpen, setIsConfigSidebarOpen] = useState(false);
  const [showMainScreen, setShowMainScreen] = useState(true);
  const [homeLogoAnimating, setHomeLogoAnimating] = useState(false); // Controla cuándo inicia la animación de vuelo del logo
  const [showHomeButtons, setShowHomeButtons] = useState(false); // Controla cuándo aparecen los botones
  const [isVideoReady, setIsVideoReady] = useState(false); // Controla cuándo el video de fondo está listo
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const [showBgLightning, setShowBgLightning] = useState(false);
  const [showRecursosJugadores, setShowRecursosJugadores] = useState(false);
  const [isIntroMuted, setIsIntroMuted] = useState(() => localStorage.getItem("gm3000_intro_muted") === "true");
  const isIntroMutedRef = useRef(isIntroMuted);
  useEffect(() => {
    isIntroMutedRef.current = isIntroMuted;
  }, [isIntroMuted]);
  const introAudioRef = useRef<HTMLAudioElement | null>(null);

  // Lógica para la música de la pantalla principal
  useEffect(() => {
    if (!introAudioRef.current) {
      introAudioRef.current = new Audio(introSound);
      introAudioRef.current.loop = true;
    }
    const audio = introAudioRef.current;

    if (showMainScreen && !isIntroMuted) {
      audio.volume = 0.4;
      audio.play().catch(() => {
        // Si falla por falta de interacción, se intentará de nuevo tras el primer clic
      });
    } else {
      audio.pause();
    }

    return () => {
      audio.pause();
    };
  }, [showMainScreen, isIntroMuted]);

  useEffect(() => {
    localStorage.setItem("gm3000_intro_muted", String(isIntroMuted));
  }, [isIntroMuted]);

  useEffect(() => {
    if (showMainScreen) setShowRecursosJugadores(false);
  }, [showMainScreen]);

  // Asegurar que el audio se active tras la primera interacción del usuario
  useEffect(() => {
    const enableAudio = () => {
      // Activar música de intro si aplica
      if (showMainScreen && !isIntroMuted && introAudioRef.current?.paused) {
        introAudioRef.current.play().catch(() => { });
      }
      // Activar música de aventura si aplica
      const shouldPlayAdventure = (isAdventureModeOpen || (currentGameMode === "adventure" && keepMusicDuringGame && hasStarted)) && isSoundEnabled;
      if (shouldPlayAdventure && adventureAudioRef.current?.paused) {
        adventureAudioRef.current.play().catch(() => { });
      }
      window.removeEventListener('click', enableAudio);
      window.removeEventListener('keydown', enableAudio);
    };
    window.addEventListener('click', enableAudio);
    window.addEventListener('keydown', enableAudio);
    return () => {
      window.removeEventListener('click', enableAudio);
      window.removeEventListener('keydown', enableAudio);
    };
  }, [showMainScreen, isIntroMuted, isSoundEnabled, isAdventureModeOpen, currentGameMode, keepMusicDuringGame, hasStarted]);

  // Escuchar mensaje para cerrar el iframe del modo en vivo (Transmisiones Live)
  useEffect(() => {
    const handleIframeMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'CLOSE_LIVE') {
        setCurrentGameMode("normal");
        setShowMainScreen(true);
        setIsHeaderVisible(true);
      }
    };
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, []);

  const [showTournamentManager, setShowTournamentManager] = useState(false);

  const [moveComments, setMoveComments] = useState<Record<number, string>>({});
  const [moveArrows, setMoveArrows] = useState<Record<number, string[][]>>({});
  const moveArrowsRef = useRef(moveArrows);
  moveArrowsRef.current = moveArrows;
  // Callback estable para onArrowsChange (evita loop infinito en useMemo del chessboard)
  const onArrowsChangeRef = useRef<(arrowsObj: any) => void>(null);
  onArrowsChangeRef.current = (arrowsObj: any) => {
    setMoveArrows((prev: any) => ({ ...prev, [currentMoveIdxRef.current ?? 0]: arrowsObj.arrows || arrowsObj }));
  };
  // Ref para currentMoveIdx que usa onArrowsChangeRef
  const currentMoveIdxRef = useRef(0);
  const [explorerStats, setExplorerStats] = useState<Record<number, { moves: Array<{ san: string; white: number; draws: number; black: number; total: number }>; totalGames: number }>>({});

  // --- Exit guard: check for unsaved data ---
  const [disableExitGuard, setDisableExitGuard] = useState(() => localStorage.getItem("chess_disableExitGuard") === "true");
  const hasUnsavedData = useCallback(() => {
    const hasAnalysis = !!(aiAnalysisResult && (aiAnalysisResult.general || aiAnalysisResult.technical));
    const hasMoveComments = Object.keys(moveComments).length > 0;
    const hasMoveHistory = history.length > 0;
    return hasAnalysis || hasMoveComments || hasMoveHistory;
  }, [aiAnalysisResult, moveComments, history]);

  const handleExitConfirmed = useCallback(() => {
    setIsMasterAnalysisOpen(false);
    setShowMainScreen(true);
  }, []);

  const { showConfirm: showExitConfirm, confirmExit: confirmExitAction, cancelExit: cancelExitAction, checkAndConfirm } = useExitGuard({
    hasUnsavedData,
    onExit: handleExitConfirmed,
    disabled: disableExitGuard,
  });

  // â¬⚡Perfil de Usuario â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem("chess_playerName") || "";
  });
  const [adventurePlayerName, setAdventurePlayerName] = useState<string>(() => {
    return localStorage.getItem("chess_adventurePlayerName") || "";
  });
  const [whitePlayerName, setWhitePlayerName] = useState<string>(() => {
    return localStorage.getItem("chess_whitePlayerName") || "";
  });
  const [blackPlayerName, setBlackPlayerName] = useState<string>(() => {
    return localStorage.getItem("chess_blackPlayerName") || "";
  });

  useEffect(() => {
    localStorage.setItem("chess_playerName", playerName);
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem("chess_adventurePlayerName", adventurePlayerName);
  }, [adventurePlayerName]);

  useEffect(() => {
    localStorage.setItem("chess_whitePlayerName", whitePlayerName);
  }, [whitePlayerName]);

  useEffect(() => {
    localStorage.setItem("chess_blackPlayerName", blackPlayerName);
  }, [blackPlayerName]);

  // --- Perfil de Desarrollador (GitHub) ---
  const [showDevProfile, setShowDevProfile] = useState(false);
  const [devGithubUsername, setDevGithubUsername] = useState<string>(() => localStorage.getItem('dev_github_username') || '');
  const [devProfile, setDevProfile] = useState<any>(null);
  const [showProfileView, setShowProfileView] = useState(false);
  const [showMentalMode, setShowMentalMode] = useState(false);
  const mentalTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDevProfile = useCallback(async (username?: string) => {
    const u = username || devGithubUsername || 'ElalChico';
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(u)}`);
      if (!res.ok) throw new Error('GitHub user not found');
      const json = await res.json();
      setDevProfile(json);
      localStorage.setItem('dev_github_username', u);
    } catch (e) {
      console.warn('[DevProfile] Error fetching GitHub profile', e);
      setDevProfile(null);
    }
  }, [devGithubUsername]);

  useEffect(() => {
    if (showDevProfile) {
      fetchDevProfile();
    }
  }, [showDevProfile, devGithubUsername, fetchDevProfile]);

  const { profile: profileHook, setProfile } = useProfile(isGuestMode);

  // Compute achievements from matchStats
  const prevAchievementsRef = useRef<Achievement[]>([]);

  // Compute initial achievements from localStorage on mount
  useEffect(() => {
    const savedMatchStats = localStorage.getItem("chess_matchStatsV2");
    const savedTournament = localStorage.getItem("chess_tournamentGameLogV1");
    if (savedMatchStats) {
      try {
        const ms = JSON.parse(savedMatchStats);
        const tLen = savedTournament ? JSON.parse(savedTournament).length : 0;
        const achievements = computeAchievements(ms, tLen);
        if (!isGuestMode) setProfile(prev => ({ ...prev, achievements: mergeAchievements(achievements, prev.achievements) }));
      } catch {}
    }
  }, [isGuestMode]);

  // Recompute achievements from matchStats
  useEffect(() => {
    const fresh = computeAchievements(matchStats, tournamentGameLog.length);
    const merged = mergeAchievements(fresh, profileHook.achievements);
    const changed = JSON.stringify(merged) !== JSON.stringify(prevAchievementsRef.current);
    if (changed && prevAchievementsRef.current.length > 0 && !isGuestMode) {
      setProfile(prev => ({ ...prev, achievements: merged }));
    }
    prevAchievementsRef.current = merged;
  }, [matchStats, tournamentGameLog.length, isGuestMode]);

  // Auto-estimate ELO from game data
  useEffect(() => {
    if (profileHook.eloManual) return;
    import("./utils/eloEstimation").then(({ estimateElo }) => {
      const result = estimateElo(matchStats, whiteAiDepth, whiteEngineType);
      if (!isGuestMode) setProfile(prev => ({ ...prev, eloRating: result.elo, eloTitle: result.title }));
    });
  }, [matchStats, whiteAiDepth, whiteEngineType, profileHook.eloManual]);

  const effectivePlayerName = profileHook.name || adventurePlayerName || playerName || (language === "es" ? "Humano" : "Human");

  const getWhitePlayerName = () => {
    if (whitePlayerName) return whitePlayerName;
    if (whitePlayer === "human") return effectivePlayerName;
    return language === "es" ? "Humano" : "Human";
  };
  const getBlackPlayerName = () => {
    if (blackPlayerName) return blackPlayerName;
    if (blackPlayer === "human") return effectivePlayerName;
    return language === "es" ? "Humano" : "Human";
  };

  // â¬⚡Multijugador LAN (estado local) â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
  const [lanPreferredColor, setLanPreferredColor] = useState<"white" | "black" | "random">("random");
  const [lanManualIp, setLanManualIp] = useState("");

  // Los callbacks y el hook se instancian más abajo (después de playAudio/gameRef/etc.)
  const lanSendMoveRef = useRef<((data: any) => void) | null>(null);
  const lanSendStateRef = useRef<((data: any) => void) | null>(null);
  const lanSendControlRef = useRef<((action: string, data?: any) => void) | null>(null);
  const lanStatusRef = useRef<string>("disconnected");
  const lanRoleRef = useRef<string | null>(null);
  const lanOpponentConnectedRef = useRef<boolean>(false);
  const lastLocalMoveTimeRef = useRef<number>(0);
  const lanMyColorRef = useRef<"white" | "black">("white");
  const moveFromRef = useRef<string>("");

  useEffect(() => {
    // Limpiar sessionStorage corrupto al montar
    const savedSession = sessionStorage.getItem('chess_gm2000_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.fen) {
          const g = new Chess();
          let valid = true;
          if (parsed.history && parsed.history.length > 0) {
            for (const h of parsed.history) {
              try { g.move(h); } catch (e) { valid = false; break; }
            }
          }
          if (!valid || !g.fen()) {
            sessionStorage.removeItem('chess_gm2000_session');
            console.log("[GM3000] sessionStorage limpiado: datos corruptos");
          }
        }
      } catch {
        sessionStorage.removeItem('chess_gm2000_session');
        console.log("[GM3000] sessionStorage limpiado: parse error");
      }
    }
  }, []);





  const historyFens = useMemo(() => {
    const tempGame = new Chess(initialFen);
    const fens = [tempGame.fen()];
    history.forEach(move => {
      try {
        tempGame.move(move);
        fens.push(tempGame.fen());
      } catch (e) { }
    });
    return fens;
  }, [history, initialFen]);

  useEffect(() => {
    // Guardar solo datos de análisis y configuración (NO estado de partida)
    sessionStorage.setItem('chess_gm2000_session', JSON.stringify({
      moveComments,
      moveArrows,
    }));
  }, [moveComments, moveArrows]);

  // GM-2000 Features Options
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState("smooth");
  const [isFreeMode, setIsFreeMode] = useState(false);
  const [isInvisiblePieces, setIsInvisiblePieces] = useState(false);
  const [revealedSquare, setRevealedSquare] = useState<string | null>(null);
  const [isRevealMode, setIsRevealMode] = useState(false);
  const [showLegalMoves, setShowLegalMoves] = useState(false);
  const [showLastMove, setShowLastMove] = useState(true);

  const [pendingPromotion, setPendingPromotion] = useState<{ from: string, to: string, color: string } | null>(null);
  const promotionInProgressRef = useRef(false);

  useEffect(() => {
    if (!pendingPromotion) {
      promotionInProgressRef.current = false;
    }
  }, [pendingPromotion]);

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

  const [isBoardAnalysisMode, setIsBoardAnalysisMode] = useState(false);
  const analysisGameRef = useRef<Chess | null>(null);
  const [analysisPosition, setAnalysisPosition] = useState<string | null>(null);
  const [lanDrawRequest, setLanDrawRequest] = useState(false);

  const enterBoardAnalysisMode = useCallback(() => {
    if (!hasStarted || isBoardAnalysisMode) return;
    let fen: string;
    if (viewingMoveIndex !== null && historyFens[viewingMoveIndex + 1]) {
      fen = historyFens[viewingMoveIndex + 1];
    } else if (viewingMoveIndex !== null && viewingMoveIndex === -1 && historyFens[0]) {
      fen = historyFens[0];
    } else {
      fen = game.fen();
    }
    const newGame = new Chess(fen);
    analysisGameRef.current = newGame;
    setAnalysisPosition(newGame.fen());
    setIsBoardAnalysisMode(true);
  }, [game, hasStarted, isBoardAnalysisMode, viewingMoveIndex, historyFens]);

  const exitBoardAnalysisMode = useCallback(() => {
    setIsBoardAnalysisMode(false);
    analysisGameRef.current = null;
    setAnalysisPosition(null);
  }, []);

  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [historyPanelPosition, setHistoryPanelPosition] = useState<"right" | "left" | "top">(() => {
    return (localStorage.getItem("chess_historyPanelPosition") as any) || "right";
  });
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

  useEffect(() => {
    isAnalyzingRef.current = isAnalyzing;
  }, [isAnalyzing]);

  useEffect(() => {
    analysisIndexRef.current = analysisIndex;
  }, [analysisIndex]);

  useEffect(() => {
    evalScoreRef.current = evalScore;
  }, [evalScore]);
  const [evalMate, setEvalMate] = useState<number | undefined>();
  const [bestLine, setBestLine] = useState("");
  const [currentVariations, setCurrentVariations] = useState<any[]>([]);
  const [whiteVariations, setWhiteVariations] = useState<any[]>([]);
  const [blackVariations, setBlackVariations] = useState<any[]>([]);
  const [parsingReport, setParsingReport] = useState<{ total: number, omitted: number, errors: number } | null>(null);

  const [whiteStats, setWhiteStats] = useState<any>(null);
  const [blackStats, setBlackStats] = useState<any>(null);


  // Referencias a motores duales ⚡pueden contener motores locales propios o Stockfish
  const engineWhiteRef = useRef<StockfishEngineWhite | AtlasEngine | EDDEngine | ObsidianEngine | null>(null);
  const engineBlackRef = useRef<StockfishEngineBlack | AtlasEngine | EDDEngine | ObsidianEngine | null>(null);
  const analysisEngineRef = useRef<StockfishEngineWhite | null>(null);

  const applyObsidianEngineConfig = (engine: any, config: {
    aspirationDepth: number;
    aspirationDelta: number;
    nullMoveReduction: number;
    futilityDepth: number;
    lmrReduction: number;
    transpositionTableSize?: number;
    enablePonder?: boolean;
  }) => {
    if (typeof engine?.setAspirationDepth !== "function") return;
    engine.setAspirationDepth(config.aspirationDepth);
    engine.setAspirationDelta(config.aspirationDelta);
    engine.setNullMoveReduction(config.nullMoveReduction);
    engine.setFutilityDepth(config.futilityDepth);
    engine.setLmrReduction(config.lmrReduction);
    if (config.transpositionTableSize !== undefined) {
      engine.setTranspositionTableSize(config.transpositionTableSize);
    }
    if (config.enablePonder !== undefined) {
      engine.setPonder(config.enablePonder);
    }
  };
  const whiteEngineTypeRef = useRef(whiteEngineType);
  const blackEngineTypeRef = useRef(blackEngineType);
  const prevWhiteEngineTypeRef = useRef(whiteEngineType);
  const prevBlackEngineTypeRef = useRef(blackEngineType);

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

  const hasTriggeredHomeAnimRef = useRef(false);

const triggerHomeAnimation = useCallback(() => {
    if (hasTriggeredHomeAnimRef.current) return;
    hasTriggeredHomeAnimRef.current = true;

    if (typeof (window as any).removeLoadingScreen === 'function') {
      (window as any).removeLoadingScreen();
    }

    // Mostrar el logo React al terminar la carga inicial (el loader se desvanece)
    setHomeLogoAnimating(true);

    setTimeout(() => {
      setShowHomeButtons(true);
    }, 2000);
  }, []);

  useEffect(() => {
    // Fallback de 45 segundos máximo por si falla la carga del video (10MB)
    const fallbackTimer = setTimeout(() => {
      triggerHomeAnimation();
    }, 45000);
    return () => clearTimeout(fallbackTimer);
  }, [triggerHomeAnimation]);

  // Ocultar el loader pre-React solo cuando el video esté listo
  useEffect(() => {
    if (isVideoReady && typeof (window as any).removeLoadingScreen === 'function') {
      (window as any).removeLoadingScreen();
    }
  }, [isVideoReady]);

  // Al salir del home: ocultar y eliminar el logo HTML del loader
  useEffect(() => {
    if (!showMainScreen && hasTriggeredHomeAnimRef.current) {
      const logo = document.querySelector('.index-logo') as HTMLElement;
      const loader = document.getElementById('loading-screen');
      if (logo) {
        logo.style.transition = 'opacity 0.4s ease-out';
        logo.style.opacity = '0';
      }
      if (loader) {
        loader.style.transition = 'opacity 0.4s ease-out';
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        setTimeout(() => loader.remove(), 500);
      }
    }
  }, [showMainScreen]);

  // Al volver al home (no en carga inicial): mostrar el logo React
  useEffect(() => {
    if (showMainScreen && hasTriggeredHomeAnimRef.current) {
      setHomeLogoAnimating(true);
    }
  }, [showMainScreen]);

  useEffect(() => {
    moveFromRef.current = moveFrom;
  }, [moveFrom]);

  useEffect(() => {
    whiteEngineTypeRef.current = whiteEngineType;
    localStorage.setItem("chess_whiteEngineType", whiteEngineType);
  }, [whiteEngineType]);

  useEffect(() => {
    if (prevWhiteEngineTypeRef.current !== whiteEngineType) {
      const prevName = getEngineInfo(prevWhiteEngineTypeRef.current).name;
      if (whiteEngineName === prevName) {
        setWhiteEngineName("");
      }
      prevWhiteEngineTypeRef.current = whiteEngineType;
    }
  }, [whiteEngineType, whiteEngineName]);

  useEffect(() => {
    localStorage.setItem("chess_whiteEngineName", whiteEngineName);
  }, [whiteEngineName]);
  useEffect(() => {
    blackEngineTypeRef.current = blackEngineType;
    localStorage.setItem("chess_blackEngineType", blackEngineType);
  }, [blackEngineType]);

  useEffect(() => {
    if (prevBlackEngineTypeRef.current !== blackEngineType) {
      const prevName = getEngineInfo(prevBlackEngineTypeRef.current).name;
      if (blackEngineName === prevName) {
        setBlackEngineName("");
      }
      prevBlackEngineTypeRef.current = blackEngineType;
    }
  }, [blackEngineType, blackEngineName]);

  useEffect(() => {
    localStorage.setItem("chess_blackEngineName", blackEngineName);
  }, [blackEngineName]);

  useEffect(() => {
    if (currentGameMode === "normal" && !activeAdventureEnemy && !isAdventureModeOpen) {
      if (whiteEngineName && whiteEngineName !== "") {
        setWhiteEngineName("");
        localStorage.removeItem("chess_whiteEngineName");
      }
      if (blackEngineName && blackEngineName !== "") {
        setBlackEngineName("");
        localStorage.removeItem("chess_blackEngineName");
      }
    }
  }, [currentGameMode, activeAdventureEnemy, isAdventureModeOpen]);

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
    localStorage.setItem(
      "chess_isRandomColors",
      String(isRandomColors),
    );
  }, [isRandomColors]);
  useEffect(() => {
    localStorage.setItem("chess_boardSize", boardSize);
  }, [boardSize]);
  useEffect(() => {
    localStorage.setItem("chess_boardAlign", boardAlign);
  }, [boardAlign]);
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
    localStorage.setItem("chess_notificationConfig", String(notificationConfig));
  }, [notificationConfig]);
  useEffect(() => {
    localStorage.setItem("chess_aiProvider", aiProvider);
    const savedKey = localStorage.getItem(`chess_aiApiKey_${aiProvider}`) || "";
    setAiApiKey(savedKey);
  }, [aiProvider]);
  useEffect(() => {
    if (aiProvider) {
      localStorage.setItem(`chess_aiApiKey_${aiProvider}`, aiApiKey);
    }
  }, [aiApiKey, aiProvider]);
  useEffect(() => {
    localStorage.setItem("chess_disableExitGuard", String(disableExitGuard));
  }, [disableExitGuard]);
  useEffect(() => {
    localStorage.setItem("chess_aiModel", aiModel);
  }, [aiModel]);
  useEffect(() => {
    localStorage.setItem("chess_aiCustomUrl", aiCustomUrl);
  }, [aiCustomUrl]);
  useEffect(() => {
    localStorage.setItem("chess_enableTechnicalAnalysis", String(enableTechnicalAnalysis));
  }, [enableTechnicalAnalysis]);

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

  useEffect(() => {
    if (showMainScreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [showMainScreen]);

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

  const [appTheme, setAppTheme] = useState(() => localStorage.getItem("chess_appTheme") || "obsidian");
  useEffect(() => { localStorage.setItem("chess_appTheme", appTheme); }, [appTheme]);
  // --- Sistema de Temas ---
  const getThemeClasses = () => {
    switch (appTheme) {
      case "matrix": return "bg-black text-[#00ff41] border-[#003b00]";
      case "emerald": return "bg-[#022c22] text-emerald-100 border-emerald-900/50";
      case "slate-gradient": return "bg-gradient-to-b from-slate-900 to-black text-slate-200 border-slate-800";
      case "nebula": return "bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-purple-100 border-purple-500/20";
      case "pure-black": return "bg-black text-slate-400 border-white/5";
      case "linux": return "bg-[#2d0922] text-white border-orange-500/20";
      case "obsidian":
      default: return "bg-[#0f1115] text-[#e2e8f0] border-white/10";
    }
  };

  const getSidebarThemeClasses = () => {
    switch (appTheme) {
      case "matrix": return "bg-black border-emerald-900/50 shadow-[0_0_50px_rgba(0,59,0,0.3)]";
      case "emerald": return "bg-emerald-950 border-emerald-800 shadow-[0_0_50px_rgba(6,78,59,0.3)]";
      case "slate-gradient": return "bg-gradient-to-b from-slate-900 to-black border-slate-800 shadow-2xl";
      case "nebula": return "bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 border-purple-500/20 shadow-[0_0_60px_rgba(88,28,135,0.2)]";
      case "pure-black": return "bg-black border-white/5 shadow-none";
      case "linux": return "bg-[#2d0922] border-orange-500/20 shadow-[0_0_40px_rgba(0,0,0,0.6)]";
      case "obsidian":
      default: return "bg-slate-900 border-white/10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]";
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
    hover_mode: hoverModeSound,
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
    const isHomeSound = id === "hover_mode";
    if (isHomeSound && isIntroMutedRef.current) return;
    if (!isHomeSound && !isSoundEnabledRef.current) return;
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
    // Mantener refs sincronizados (evita closures obsoletas)
    turnRef.current = game.turn();
    hasStartedRef.current = hasStarted;
    isPausedRef.current = isPaused;
  }, [game, hasStarted, isPaused]);

  useEffect(() => {
    // Robust timer: usar refs para leer estado actual y evitar condiciones de carrera
    if (!timerActive || timeOutWinner || isSyncing || showMentalMode) return;

    const tick = () => {
      try {
        if (!hasStartedRef.current || isPausedRef.current || gameRef.current.isGameOver()) return;
        const currentTurn = gameRef.current.turn();
        if (currentTurn === "w") {
          setWhiteTime((t) => {
            if (t <= 1) {
              handleTimeOut("w");
              return 0;
            }
            const nt = t - 1;
            whiteTimeRef.current = nt;
            return nt;
          });
        } else {
          setBlackTime((t) => {
            if (t <= 1) {
              handleTimeOut("b");
              return 0;
            }
            const nt = t - 1;
            blackTimeRef.current = nt;
            return nt;
          });
        }
      } catch (e) {
        console.warn("Timer tick error:", e);
      }
    };

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timeOutWinner, handleTimeOut, isSyncing]);

  const resetGameRef = useRef<(() => void) | null>(null);

  const getEloRating = (depth: number, engineType: string = "stockfish") => {
    const clampedDepth = Math.max(3, Math.min(depth, 25));
    const depthPercent = Math.round(((clampedDepth - 3) / (25 - 3)) * 100);

    if (["atlas", "edd", "obsidian", "obsidian", "ailed"].includes(engineType)) {
      return `${depthPercent}%`;
    }
    if (engineType === "maia1") return `${1100 + depth}`;
    if (engineType === "maia2") return `${1500 + depth}`;
    return `${800 + depth * 116}`;
  };

  const resetGame = (wPlayerArg = whitePlayerRef.current, bPlayerArg = blackPlayerRef.current, isRemoteLanReset = false) => {
    if (currentGameMode !== "adventure") {
      let wPlayer = wPlayerArg;
      let bPlayer = bPlayerArg;
      let wType = whiteEngineTypeRef.current;
      let bType = blackEngineTypeRef.current;
      let wName = whiteEngineName;
      let bName = blackEngineName;
      let wDepth = whiteAiDepthRef.current;
      let bDepth = blackAiDepthRef.current;
      let wSpeed = whiteAiSpeedRef.current;
      let bSpeed = blackAiSpeedRef.current;

      if (isRandomColors && Math.random() < 0.5) {
        wPlayer = bPlayerArg;
        bPlayer = wPlayerArg;
        wType = blackEngineType;
        bType = whiteEngineType;
        wName = blackEngineName;
        bName = whiteEngineName;
        wDepth = blackAiDepth;
        bDepth = whiteAiDepth;
        wSpeed = blackAiSpeed;
        bSpeed = whiteAiSpeed;

        // 🔥 CRITICAL: Actualizar referencias DIRECTAMENTE antes de usarlas
        // Los set states son asincrónico, pero necesitamos las referencias actualizadas AHORA
        whitePlayerRef.current = wPlayer;
        blackPlayerRef.current = bPlayer;
        whiteEngineTypeRef.current = wType;
        blackEngineTypeRef.current = bType;
        whiteAiDepthRef.current = wDepth;
        blackAiDepthRef.current = bDepth;
        whiteAiSpeedRef.current = wSpeed;
        blackAiSpeedRef.current = bSpeed;

        // Ahora actualizar los states para la UI
        setWhitePlayer(wPlayer);
        setBlackPlayer(bPlayer);
        setWhiteEngineType(wType);
        setBlackEngineType(bType);
        setWhiteEngineName(wName);
        setBlackEngineName(bName);
        setWhiteAiDepth(wDepth);
        setBlackAiDepth(bDepth);
        setWhiteAiSpeed(wSpeed);
        setBlackAiSpeed(bSpeed);
      }
    }

    engineWhiteRef.current?.quit();
    engineBlackRef.current?.quit();
    engineWhiteRef.current = null;
    engineBlackRef.current = null;

    const engW = (whiteEngineTypeRef.current === "atlas") ? new AtlasEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
        : whiteEngineTypeRef.current === "obsidian" ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
          : whiteEngineTypeRef.current === "obsidian" ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
            : (whiteEngineTypeRef.current === "edd" || whiteEngineTypeRef.current === "ailed") ? new EDDEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
              : new StockfishEngineWhite((msg) => handleEngineMessageRef.current?.(msg, "w"));

    const engB = (blackEngineTypeRef.current === "atlas") ? new AtlasEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
        : blackEngineTypeRef.current === "obsidian" ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
          : blackEngineTypeRef.current === "obsidian" ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
            : (blackEngineTypeRef.current === "edd" || blackEngineTypeRef.current === "ailed") ? new EDDEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
              : new StockfishEngineBlack((msg) => handleEngineMessageRef.current?.(msg, "b"));

    engineWhiteRef.current = engW;
    engineBlackRef.current = engB;
    applyObsidianEngineConfig(engW, whiteObsidianConfig);
    applyObsidianEngineConfig(engB, blackObsidianConfig);
    const pW = engW.init();
    const pB = engB.init();

    // 🔥 CRITICAL: Reinicializar contador de actividad para que el vigilante no crea que el motor está colgado
    lastEngineActivityRef.current = Date.now();

    const g = new Chess();
    setGame(g);
    gameRef.current = g;
    turnRef.current = g.turn();
    setHistory([]);
    setRedoStack([]);
    setEvalScore(0);
    setEvalMate(undefined);
    setBestLine("");
    setMoveEvaluations([0]);
    setMoveTimes([]);
    setMoveElapsedTimes([]);

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
    setGameResultDismissed(false);
    setIsSyncing(false);
    deleteAnalysisCache();

    setMoveFrom("");
    setViewingMoveIndex(null);
    setIsLoadedPgn(false);
    setIsHeaderVisible(true);

    if (currentGameMode === "adventure") {
      setBoardOrientation("white");
    } else if (whitePlayerRef.current === "human" && blackPlayerRef.current !== "human") {
      setBoardOrientation("white");
    } else if (blackPlayerRef.current === "human" && whitePlayerRef.current !== "human") {
      setBoardOrientation("black");
    } else {
      setBoardOrientation("white");
    }

    if ((window as any)._gameResetTimer) {
      clearTimeout((window as any)._gameResetTimer);
      delete (window as any)._gameResetTimer;
    }
    startSequenceAbortRef.current = true;

    if (lanStatusRef.current === "connected" && lanRoleRef.current === "host" && !isRemoteLanReset) {
      lanSendControlRef.current?.("reset");
      lanSendState({
        hasStarted: hasStartedRef.current,
        gameResult: null,
        isPaused: false,
        history: [],
        fen: g.fen(),
        whiteTime: initialTimeMin * 60,
        blackTime: initialTimeMin * 60,
        whitePlayer: whitePlayerRef.current,
        blackPlayer: blackPlayerRef.current,
        boardOrientation: boardOrientation
      });
    }

    if (hasStartedRef.current || tournamentRef.current.active) {
            setHasStarted(true);
            hasStartedRef.current = true;
            isStartingGameRef.current = false;
            setTimerActive(true);
      Promise.all([
        Promise.race([pW, new Promise(r => setTimeout(r, 5000))]),  // Aumentado de 3000 a 5000 ms
        Promise.race([pB, new Promise(r => setTimeout(r, 5000))])   // Aumentado de 3000 a 5000 ms
      ]).then(() => {
        if (!gameRef.current.isGameOver()) {
          // 🔥 IMPORTANTE: Disparar trigger con timeout para asegurar que haya suficiente tiempo
          setTimeout(() => triggerEngine(gameRef.current), 150);  // Aumentado de 80 a 150 ms
        }
      }).catch((err) => {
        console.error("[App] Error initializing engines:", err);
        // De todas formas intentar disparar el motor aunque haya error
        if (!gameRef.current.isGameOver()) {
          setTimeout(() => triggerEngine(gameRef.current), 150);
        }
      });
    }
  };
  resetGameRef.current = resetGame;
  const tournamentRef = useRef(tournament);
  useEffect(() => { tournamentRef.current = tournament; }, [tournament]);

  const lastEngineActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (hasStarted && (game.isGameOver() || timeOutWinner)) {
      const t = tournamentRef.current;
      if (t.active && t.mode !== "none") {
        // Guardar el timer en el objeto window para poder limpiarlo si el usuario resetea manualmente
        if ((window as any)._gameResetTimer) clearTimeout((window as any)._gameResetTimer);

        setTournamentCountdown(6);
        const countdownInterval = setInterval(() => {
          setTournamentCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
        }, 1000);

        (window as any)._gameResetTimer = setTimeout(() => {
          clearInterval(countdownInterval);
          setTournamentCountdown(null);
          resetGameRef.current?.();
        }, 6500);

        return () => {
          clearInterval(countdownInterval);
          setTournamentCountdown(null);
          if ((window as any)._gameResetTimer) {
            clearTimeout((window as any)._gameResetTimer);
            delete (window as any)._gameResetTimer;
          }
        };
      }
    } else {
      setTournamentCountdown(null);
    }
  }, [game, timeOutWinner, hasStarted]);

  // Referencia estable a executeMove para uso en requestAssist (definido despues)
  const executeMoveRef = useRef<((m: any) => boolean) | null>(null);

  const requestAssist = () => {
//    console.log("[Assist] Boton presionado. Turno:", gameRef.current.turn(), "Estado:", { started: hasStartedRef.current, over: gameRef.current.isGameOver(), paused: isPausedRef.current });
    if (!hasStartedRef.current || gameRef.current.isGameOver() || isPausedRef.current) return;

    const currentTurn = gameRef.current.turn();
    const isWhiteHuman = whitePlayerRef.current === "human";
    const isBlackHuman = blackPlayerRef.current === "human";

    if ((currentTurn === "w" && isWhiteHuman) || (currentTurn === "b" && isBlackHuman)) {
//      console.log("[Assist] Solicitando mejor jugada...");

      const executeFoundMove = (bestMove: string) => {
        setAssistMessage(null);
        if (executeMoveRef.current) {
          executeMoveRef.current(bestMove.trim());
        }
      };

      if (assistEngineProvider === "lichess") {
//        console.log("[Assist] Consultando Nube (Online)...");
        const fen = gameRef.current.fen();

        const cached = fetchFromCache(fen);
        if (cached) {
          const bestMove = cached.move || (cached.pvs && cached.pvs.length > 0 ? cached.pvs[0].moves.split(" ")[0] : undefined);
          if (bestMove) {
//            console.log("[Assist] Nube (Caché) sugirió:", bestMove);
            executeFoundMove(bestMove);
            return;
          }
        }

        setAssistMessage("Consultando Nube (Online)...");
        const abortController = new AbortController();
        assistAbortControllerRef.current = abortController;

        const cloudPromise = fetchChessApiCloudJson(fen, 12, 50, 1, abortController.signal)
          .catch(err => {
            if (err.name === 'AbortError') throw err;
            console.warn("[Assist] Nube POST falló. Intentando WebSocket...", err);
            return fetchChessApiCloudWebSocket(fen, 12, 50, 1, abortController.signal);
          });

        cloudPromise
          .then(data => {
            if (data && data.move) {
              saveToCache(fen, data);
              const bestMove = data.move;
//              console.log("[Assist] Nube sugirió:", bestMove, "(eval:", data.eval, "depth:", data.depth, ")");
              executeFoundMove(bestMove);
            } else if (data && data.pvs && data.pvs.length > 0) {
              saveToCache(fen, data);
              const bestMove = data.pvs[0].moves.split(" ")[0];
//              console.log("[Assist] Nube sugirió:", bestMove);
              executeFoundMove(bestMove);
            } else {
              throw new Error("Sin respuesta válida del servicio en la Nube");
            }
          })
          .catch(err => {
            if (err.name === 'AbortError') {
//              console.log("[Assist] Consulta a Nube abortada.");
              return;
            }
            console.warn("[Assist] Nube sin datos. Fallback al local.", err);
            setAssistMessage("Calculando con Motor Local...");
            const assistEngine = getAssistEngine(executeFoundMove);
            assistEngine.requestBestMove(fen, currentTurn, 15);
          });
      } else {
        setAssistMessage("Calculando con Motor Local...");
        const assistEngine = getAssistEngine(executeFoundMove);
        assistEngine.requestBestMove(gameRef.current.fen(), currentTurn, 15);
      }
    } else {
      console.warn("[Assist] No es el turno de un humano o el motor ya esta analizando.");
    }
  };

  const cancelAssist = useCallback(() => {
    setAssistMessage(null);
    if (assistAbortControllerRef.current) {
      assistAbortControllerRef.current.abort();
      assistAbortControllerRef.current = null;
    }
    // Instanciar o recuperar el motor y detenerlo
    const assistEngine = getAssistEngine(() => { });
    assistEngine.stop();
  }, []);

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
        const g = new Chess(gameRef.current.fen()); // Clonar la posición actual desde FEN
        const preMoveWhiteTime = whiteTimeRef.current;
        const preMoveBlackTime = blackTimeRef.current;
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

//        console.log("[executeMove] Intentando moveObj:", moveObj, "FEN antes:", gameRef.current.fen());

        // --- Corrección de enroque: Si se soltó el rey sobre la torre ---
        const pieceAtFrom = g.get(moveObj.from as any);
        if (pieceAtFrom && pieceAtFrom.type === 'k') {
          if (moveObj.from === 'e1') {
            if (moveObj.to === 'h1') moveObj.to = 'g1';
            else if (moveObj.to === 'a1') moveObj.to = 'c1';
          } else if (moveObj.from === 'e8') {
            if (moveObj.to === 'h8') moveObj.to = 'g8';
            else if (moveObj.to === 'a8') moveObj.to = 'c8';
          }
        }
        // Intentar ajustar la propiedad `promotion` automáticamente si chess.js
        // rechaza la jugada por una falta de coincidencia en la promoción.
        try {
          const legalMoves = g.moves({ verbose: true });
          const movesFromSource = legalMoves.filter((mv: any) => mv.from === moveObj.from);
//          console.log("[executeMove] legalMoves count:", legalMoves.length, "movesFromSource:", movesFromSource);

          // Si hay movimientos legales desde la casilla origen que coinciden
          // con el destino, y alguno tiene `promotion`, usar esa promoción
          // por defecto para evitar errores por promociones omitidas o
          // por discrepancias entre UI y motor.
          if (movesFromSource && movesFromSource.length > 0) {
            const matchingMoves = movesFromSource.filter((mv: any) => mv.to === moveObj.to && mv.promotion);
            if (matchingMoves.length > 0 && !moveObj.promotion) {
              const preferred = matchingMoves.find((mv: any) => mv.promotion === 'q') || matchingMoves[0];
              if (preferred && preferred.promotion) {
//                console.log("[executeMove] Ajustando promotion por defecto a", preferred.promotion, "para", moveObj.from, "->", moveObj.to);
                moveObj.promotion = preferred.promotion;
              }
            }
          }
        } catch (e) {
          console.warn("[executeMove] no pude listar movimientos legales:", e);
        }

        let move = null;
        try {
          move = g.move(moveObj);
        } catch (e) {
          console.warn("[executeMove] g.move threw, intentando fallback:", e, moveObj);
        }

        if (!move) {
          try {
            const legalMoves = g.moves({ verbose: true });
            const candidates = legalMoves.filter((mv: any) => mv.from === moveObj.from && mv.to === moveObj.to);
//            console.log("[executeMove] fallback candidates:", candidates.map((mv: any) => ({ to: mv.to, promotion: mv.promotion, san: mv.san, flags: mv.flags })));
            if (candidates.length > 0) {
              const preferred = candidates.find((mv: any) => mv.promotion === moveObj.promotion) || candidates.find((mv: any) => mv.promotion === 'q') || candidates[0];
              if (preferred && preferred.promotion) {
                moveObj.promotion = preferred.promotion;
//                console.log("[executeMove] Fallback promotion aplicado:", moveObj.promotion, "para", moveObj.from, "->", moveObj.to);
                try {
                  move = g.move(moveObj);
                } catch (e) {
                  console.warn("[executeMove] g.move fallback también falló:", e, moveObj);
                }
              }
            } else {
              console.warn("[executeMove] no hay candidatos de promoción para", moveObj.from, "->", moveObj.to);
            }
          } catch (e) {
            console.warn("[executeMove] no pude listar movimientos legales en fallback:", e);
          }
        }

        if (move) {
          const newHistory = [...historyRef.current, move.san];
          const moveIndex = newHistory.length - 1;

          // Actualizar referencias sincrónicamente para evitar condiciones de carrera con los motores
          gameRef.current = g;
          turnRef.current = g.turn();
          historyRef.current = newHistory;

//          console.log("[GM3000] Movimiento ejecutado:", move.san);
          setGame(new Chess(g.fen()));
          setHistory(newHistory);
          // Deferir actualizaciones no críticas al siguiente frame para no bloquear el drag
          startTransition(() => {
            // Solo actualizar si tenemos un valor real de evalScore (para evitar undefined en Master Analysis)
            if (typeof evalScore === "number") {
              setMoveEvaluations((prev) => {
                const newEvals = [...prev];
                newEvals[moveIndex] = evalScore;
                return newEvals;
              });

              // El motor DxA.47 ahora aprende internamente basándose en sus propias evaluaciones,
              // por lo que ya no es necesario llamarlo con el evalScore absoluto desde la UI.
            }
            setMoveTimes((prev) => {
              const newTimes = [...prev];
              newTimes[moveIndex] = { w: whiteTime, b: blackTime };
              return newTimes;
            });
            // Calcular tiempo transcurrido para esta jugada
            if (hasStartedRef.current && !isRedo && !isLanSync) {
              const playerWhoMoved = g.turn() === "w" ? "b" : "w";
              const preTime = playerWhoMoved === "w" ? preMoveWhiteTime : preMoveBlackTime;
              const postTime = playerWhoMoved === "w" ? whiteTime : blackTime;
              const elapsed = Math.max(0, Math.round(preTime - postTime));
              setMoveElapsedTimes((prev) => {
                const newArr = [...prev];
                newArr[moveIndex] = elapsed;
                return newArr;
              });
            }
          });
          setTimerActive(true);
          setMoveFrom("");
          if (!isRedo) setRedoStack([]);

          // --- Chequeo Automático de Condiciones de Tablas y Fin de Partida ---
          let finalResult = null;
          // Validar reglas de finalización
          if (g.isCheckmate()) {
            finalResult = g.turn() === 'w' ? (language === 'es' ? '¡Jaque Mate! Ganan las Negras' : 'Checkmate! Black Wins') : (language === 'es' ? '¡Jaque Mate! Ganan las Blancas' : 'Checkmate! White Wins');
          } else if (g.isStalemate()) {
            finalResult = language === 'es' ? 'Tablas por Ahogado' : 'Stalemate';
          } else if (g.isInsufficientMaterial()) {
            finalResult = language === 'es' ? 'Tablas por Material Insuficiente' : 'Insufficient Material';
          } else if (g.isThreefoldRepetition()) {
            finalResult = language === 'es' ? 'Tablas por Triple Repetición' : 'Threefold Repetition';
          } else if (g.isDraw()) {
            finalResult = language === 'es' ? 'Tablas (Regla de 50 jugadas / Repetición)' : 'Draw (50-move rule / Repetition)';
          }

          if (finalResult && !gameResultRef.current) {
            setGameResult(finalResult);
            gameResultRef.current = finalResult;
            setTimerActive(false);
            engineWhiteRef.current?.stop();
            engineBlackRef.current?.stop();
            if (notificationConfig !== "none") {
              setSystemNotification(finalResult);
            }
            if (lanStatusRef.current === "connected" && lanSendStateRef.current) {
              lanSendStateRef.current({ gameResult: finalResult, hasStarted: false });
            }
          }

          // Aplicar incremento de tiempo si corresponde
          if (hasStartedRef.current && initialTimeInc > 0 && !isRedo && !isLanSync) {
            const playerWhoMoved = g.turn() === "w" ? "b" : "w";
            if (playerWhoMoved === "w") {
              setWhiteTime(prev => prev + initialTimeInc);
            } else {
              setBlackTime(prev => prev + initialTimeInc);
            }
          }

          // Posponer sonido al siguiente frame para que el tablero se renderice primero
          requestAnimationFrame(() => {
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
          });

          // Enviar movimiento al oponente LAN (si está conectado)
          if (lanSendMoveRef.current && !isLanSync) {
            lastLocalMoveTimeRef.current = Date.now(); // Registrar tiempo del movimiento local
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
          console.error("[executeMove] g.move returned null. moveObj:", moveObj, "FEN:", g.fen(), "Turn:", g.turn());
        }
      } catch (e) {
        console.error("[executeMove] Exception during g.move:", e, "for moveObj:", moveStr);
      }
      return false;
    },
    [playAudio],
  );

  // Conectar la referencia para que requestAssist pueda usar executeMove
  executeMoveRef.current = executeMove;

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

    // Si jugamos contra la máquina, debemos deshacer 2 movimientos para devolver el turno al humano
    const isHumanVsAi = (whitePlayer === "human" && blackPlayer === "ai") || (whitePlayer === "ai" && blackPlayer === "human");
    const aiColor = whitePlayer === "ai" ? "w" : "b";

    let move1 = g.undo();
    if (!move1) return;

    let undoneMoves = [move1.lan];

    // Si el turno actual después de deshacer es de la máquina, deshacer de nuevo
    if (isHumanVsAi && g.turn() === aiColor && g.history().length > 0) {
      const move2 = g.undo();
      if (move2) {
        undoneMoves.unshift(move2.lan);
      }
    }

    setRedoStack((prev) => [...undoneMoves, ...prev]);
    gameRef.current = g;
    turnRef.current = g.turn();
    setGame(g);
    setHistory(g.history());
    setTimerActive(false);

    // Detener motores completamente — NO re-activar
    if (engineWhiteRef.current) engineWhiteRef.current.stop();
    if (engineBlackRef.current) engineBlackRef.current.stop();
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

  const stopGame = (isRemote = false) => {
    // Modo Estudio: si se detiene una partida de estudio, volver a la bandeja de piezas
    const wasStudyGame = freeModeStage === 'playing';
    // Cancelar cualquier secuencia de inicio pendiente (sync/countdown)
    startSequenceAbortRef.current = true;

    // Guardar snapshot antes de destruir motores (para poder retomar)
    if (!isRemote && hasStartedRef.current && !wasStudyGame) {
      const currentGame = gameRef.current;
      if (currentGame && !currentGame.isGameOver()) {
        setStoppedGameSnapshot({
          fen: currentGame.fen(),
          history: [...history],
          whiteTime: whiteTimeRef.current,
          blackTime: blackTimeRef.current,
          whitePlayer,
          blackPlayer,
          whiteEngineType,
          blackEngineType,
          whiteEngineName,
          blackEngineName,
          boardOrientation,
          moveEvaluations: [...moveEvaluations],
          moveTimes: [...moveTimes],
        });
        setIsGameStopped(true);
      }
    }

    // Enviar evento de stop en modo LAN (solo si no es remoto, para evitar loops)
    if (!isRemote && lanStatusRef.current === "connected" && lanSendControlRef.current) {
      lanSendControlRef.current("stop", { hasStarted: false, isPaused: false });
    }

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
    setMoveElapsedTimes([]);
    setIsAutoPlaying(false);
    setIsLoadedPgn(false);
    setViewingMoveIndex(null);
    setIsSyncing(false);

    // En modo aventura, mantener la interfaz visible para "Nueva Partida"
    if (currentGameMode !== "adventure") {
      // Al detener, si no hay partida, volvemos a la pantalla principal como base
      if (!hasStarted) setShowMainScreen(true);
    }

    // Recrear motores frescos listos para la próxima partida
    const engW = whiteEngineType === "atlas"
        ? new AtlasEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
        : whiteEngineType === "obsidian"
          ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
          : whiteEngineType === "obsidian"
            ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
            : new StockfishEngineWhite((msg) => handleEngineMessageRef.current?.(msg, "w"));
    applyObsidianEngineConfig(engW, whiteObsidianConfig);
    engW.init();
    engineWhiteRef.current = engW;

    const engB = blackEngineType === "atlas"
        ? new AtlasEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
        : blackEngineType === "obsidian"
          ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
          : blackEngineType === "obsidian"
            ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
            : new StockfishEngineBlack((msg) => handleEngineMessageRef.current?.(msg, "b"));
    applyObsidianEngineConfig(engB, blackObsidianConfig);
    engB.init();
    engineBlackRef.current = engB;

    // Modo Estudio: volver a la configuración del tablero para poder jugar otra vez sin salir del modo
    if (wasStudyGame) {
      setShowFreeMode(true);
      setFreeModeStage('board');
      setIsGameStopped(false);
      setStoppedGameSnapshot(null);
      setShowMainScreen(false);
      const lastFen = gameRef.current?.fen();
      if (lastFen) {
        setPositionEditorFen(lastFen);
        resetEditorHistoryRef.current(lastFen);
      }
    }
  };

  const resumeGame = () => {
    if (!stoppedGameSnapshot) return;
    const snap = stoppedGameSnapshot;

    // Restaurar orientación y modo
    setBoardOrientation(snap.boardOrientation as any);
    setShowMainScreen(false);
    setIsGameStopped(false);
    setStoppedGameSnapshot(null);

    // Restaurar jugadores
    setWhitePlayer(snap.whitePlayer as any);
    setBlackPlayer(snap.blackPlayer as any);

    // Recrear motores con los tipos que había
    const engW = snap.whiteEngineType === "atlas"
        ? new AtlasEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
        : snap.whiteEngineType === "obsidian"
          ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
          : snap.whiteEngineType === "edd"
            ? new EDDEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
            : new StockfishEngineWhite((msg) => handleEngineMessageRef.current?.(msg, "w"));
    applyObsidianEngineConfig(engW, whiteObsidianConfig);
    engineWhiteRef.current = engW;

    const engB = snap.blackEngineType === "atlas"
        ? new AtlasEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
        : snap.blackEngineType === "obsidian"
          ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
          : snap.blackEngineType === "edd"
            ? new EDDEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
            : new StockfishEngineBlack((msg) => handleEngineMessageRef.current?.(msg, "b"));
    applyObsidianEngineConfig(engB, blackObsidianConfig);
    engineBlackRef.current = engB;

    const pW = engW.init();
    const pB = engB.init();

    // Restaurar juego desde FEN guardado
    const g = new Chess(snap.fen);
    const baseNameW = snap.whiteEngineName || (snap.whiteEngineType === "atlas" ? "Atlas.1" : snap.whiteEngineType === "edd" ? "Nexus" : snap.whiteEngineType === "obsidian" ? "Obsidian" : snap.whiteEngineType.startsWith("maia") ? "Maia: " + snap.whiteEngineType.substring(4) : snap.whiteEngineType === "ailed" ? "Ailed" : "Stockfish");
    const baseNameB = snap.blackEngineName || (snap.blackEngineType === "atlas" ? "Atlas.1" : snap.blackEngineType === "edd" ? "Nexus" : snap.blackEngineType === "obsidian" ? "Obsidian" : snap.blackEngineType.startsWith("maia") ? "Maia: " + snap.blackEngineType.substring(4) : snap.blackEngineType === "ailed" ? "Ailed" : "Stockfish");

    g.header(
      "White",
      snap.whitePlayer === "human" ? (effectivePlayerName || "Humano") : baseNameW,
      "Black",
      snap.blackPlayer === "human" ? (effectivePlayerName || "Humano") : baseNameB
    );

    setGame(g);
    gameRef.current = g;
    turnRef.current = g.turn();

    setHistory(snap.history);
    historyRef.current = snap.history;
    setMoveEvaluations(snap.moveEvaluations);
    setMoveTimes(snap.moveTimes);
    setRedoStack([]);
    setCurrentVariations([]);
    setWhiteVariations([]);
    setBlackVariations([]);

    whiteTimeRef.current = snap.whiteTime;
    blackTimeRef.current = snap.blackTime;
    setWhiteTime(snap.whiteTime);
    setBlackTime(snap.blackTime);

    setWhiteEngineType(snap.whiteEngineType);
    setBlackEngineType(snap.blackEngineType);
    setWhiteEngineName(snap.whiteEngineName);
    setBlackEngineName(snap.blackEngineName);

    setGameResult(null);
    setGameResultDismissed(false);
    setTimeOutWinner(null);
    timeOutWinnerRef.current = null;
    setIsPaused(false);
    isPausedRef.current = false;
    setViewingMoveIndex(null);
    setIsSyncing(false);
    setIsLoadedPgn(false);

    playAudio("start");

    // Sincronizar motores y reanudar
    const resumeAfterSync = async () => {
      try {
        await Promise.all([pW, pB]);
        setIsSyncing(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsSyncing(false);
        setStartCountdown(3);
        let countdownValue = 3;
        const countdownInterval = setInterval(() => {
          countdownValue--;
          if (countdownValue <= 0) {
            clearInterval(countdownInterval);
            if (startSequenceAbortRef.current) return;
            setStartCountdown(null);
            setHasStarted(true);
            hasStartedRef.current = true;
            setTimerActive(true);

            setTimeout(() => {
              if (hasStartedRef.current && !gameRef.current.isGameOver()) {
                triggerEngine(gameRef.current);
              }
            }, 150);
          } else {
            setStartCountdown(countdownValue);
          }
        }, 1000);
      } catch (err) {
        console.error("Error al reanudar:", err);
      }
    };
    resumeAfterSync();
  };

  const handleEngineMessageRef = useRef<((msg: any, color: "w" | "b") => void)>(null);

  const handleEngineMessage = useCallback(
    (msg: EngineMessage, engineColor: "w" | "b") => {
      if (msg.type === "evaluation") {
        lastEngineActivityRef.current = Date.now();
        setEvalScore(msg.score);
        setEvalMate(msg.mate);
        if (msg.pv) setBestLine(msg.pv);

        // Mantener moveEvaluations actualizado con la posición actual
        setMoveEvaluations((prev) => {
          const newEvals = [...prev];
          // La evaluación recibida corresponde a la posición TRAS el movimiento actual
          const currentIndex = historyRef.current.length;
          newEvals[currentIndex] = msg.score;
          return newEvals;
        });

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

//        console.log(`[App] bestmove received from ${engineColor}. move: ${msg.move}, currentTurn: ${currentTurnColor}, isPaused: ${isPausedRef.current}, timeOut: ${timeOutWinnerRef.current}`);

        if (isAnalyzingRef.current) {
          // Capturamos el resultado del análisis profundo
          setMoveEvaluations((prev) => {
            const newEvals = [...prev];
            const idx = analysisIndexRef.current;
            if (idx !== null) {
              newEvals[idx] = evalScoreRef.current;
            }
            return newEvals;
          });

          // Avanzar al siguiente movimiento
          setAnalysisIndex(prev => {
            if (prev !== null && prev <= historyRef.current.length) {
              return prev + 1;
            }
            return null;
          });
        } else if (
          currentTurnColor === engineColor &&
          !isPausedRef.current &&
          !timeOutWinnerRef.current
        ) {
          setViewingMoveIndex(null);
          const success = executeMove(msg.move);
//          console.log(`[App] executeMove result: ${success}`);
        } else {
          console.warn(`[App] Ignored bestmove from ${engineColor}. Turn mismatch or paused.`);
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
    if (isStartingGameRef.current) return;
    engineWhiteRef.current?.quit();
    engineWhiteRef.current = null;
    let cancelled = false;

    // 🔥 FIX: Agregar rama para EDD/Ailed que faltaba
    const eng = whiteEngineType === "atlas"
        ? new AtlasEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
        : whiteEngineType === "obsidian"
          ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
          : whiteEngineType === "obsidian"
            ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
            : (whiteEngineType === "edd" || whiteEngineType === "ailed")
              ? new EDDEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
              : new StockfishEngineWhite((msg) => handleEngineMessageRef.current?.(msg, "w"));

    applyObsidianEngineConfig(eng, whiteObsidianConfig);
    const p = eng.init();
    engineWhiteRef.current = eng;

    // Esperar a que el motor esté listo antes de triggear
    p.then(() => {
      if (!cancelled && hasStartedRef.current) {
        triggerEngineRef.current?.(gameRef.current);
      }
    });

    return () => {
      if (isStartingGameRef.current) return;
      cancelled = true;
      engineWhiteRef.current?.quit();
      engineWhiteRef.current = null;
    };
  }, [whiteEngineType]);

  // Inicializar / re-inicializar motor NEGRO cuando cambia el tipo
  useEffect(() => {
    if (isStartingGameRef.current) return;
    engineBlackRef.current?.quit();
    engineBlackRef.current = null;
    let cancelled = false;

    // 🔥 FIX: Agregar rama para EDD/Ailed que faltaba
    const eng = blackEngineType === "atlas"
        ? new AtlasEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
        : blackEngineType === "obsidian"
          ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
          : blackEngineType === "obsidian"
            ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
            : (blackEngineType === "edd" || blackEngineType === "ailed")
              ? new EDDEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
              : new StockfishEngineBlack((msg) => handleEngineMessageRef.current?.(msg, "b"));

    applyObsidianEngineConfig(eng, blackObsidianConfig);
    const p = eng.init();
    engineBlackRef.current = eng;

    p.then(() => {
      if (!cancelled && hasStartedRef.current) {
        triggerEngineRef.current?.(gameRef.current);
      }
    });

    return () => {
      if (isStartingGameRef.current) return;
      cancelled = true;
      engineBlackRef.current?.quit();
      engineBlackRef.current = null;
    };
  }, [blackEngineType]);

  // Helper: Mapear profundidad de UI (3-25) a profundidad apropiada para Stockfish
  // Stockfish necesita profundidades más altas que los motores internos para funcionar bien
  const getStockfishDepth = (uiDepth: number): number => {
    // Asegurar que Stockfish nunca reciba profundidades muy bajas
    if (uiDepth <= 3) return 10;
    if (uiDepth <= 6) return 12;
    if (uiDepth <= 9) return 14;
    if (uiDepth <= 12) return 16;
    if (uiDepth <= 15) return 18;
    if (uiDepth <= 18) return 20;
    if (uiDepth <= 21) return 22;
    if (uiDepth <= 23) return 24;
    return 26;
  };

  const triggerEngine = useCallback(
    (currentGameState: Chess) => {
      if (
        currentGameState.isGameOver() ||
        timeOutWinnerRef.current ||
        !hasStartedRef.current
      ) {
        if (currentGameState.isGameOver()) setTimerActive(false);
        if (!isStartingGameRef.current) {
          if (engineWhiteRef.current) engineWhiteRef.current.stop();
          if (engineBlackRef.current) engineBlackRef.current.stop();
        }
        return;
      }

      const turn = currentGameState.turn();

      // Detener ambos para limpiar tareas obsoletas
      if (engineWhiteRef.current) engineWhiteRef.current.stop();
      if (engineBlackRef.current) engineBlackRef.current.stop();

      const times = {
        wtime: whiteTimeRef.current * 1000,
        btime: blackTimeRef.current * 1000,
        winc: 0,
        binc: 0,
      };

      // Compute history FENs and recent moves for repetition detection
      const historyMoves = currentGameState.history({ verbose: true });
      const historyFens: string[] = [];
      const tempGame = new Chess();
      for (const m of historyMoves) {
        tempGame.move(m);
        historyFens.push(tempGame.fen());
      }
      const recentMoves = historyMoves.slice(-8).map((m: any) => `${m.from}${m.to}${m.promotion || ""}`);

      if (turn === "w") {
        if (whitePlayerRef.current === "ai" && !isPausedRef.current) {
          // Solo disparar si el motor está listo
          if (engineWhiteRef.current?.isReady) {
            // ⚡ Validar profundidad mínima para evitar errores con motores en profundidades muy bajas
            const uiDepth = Math.max(3, whiteAiDepthRef.current);
            // Usar profundidad aumentada para Stockfish, profundidad normal para otros motores
            const isStockfish = whiteEngineTypeRef.current === "stockfish";
            const engineDepth = isStockfish ? getStockfishDepth(uiDepth) : uiDepth;
            // Aumentar movetime si la profundidad es baja para darle más tiempo al motor
            const adjustedSpeed = uiDepth <= 4 ? Math.max(whiteAiSpeedRef.current, 600) : whiteAiSpeedRef.current;

//            console.log(`[triggerEngine] White moving - Type: ${whiteEngineTypeRef.current}, Depth: ${engineDepth}, Speed: ${adjustedSpeed}ms`);
            // 🔥 Marcar actividad cuando se DISPARA, no solo cuando responde
            lastEngineActivityRef.current = Date.now();
            engineWhiteRef.current.findBestMove(
              currentGameState.fen(),
              "w",
              engineDepth,
              times,
              adjustedSpeed,
              historyFens,
              recentMoves
            );
          } else {
            // Motor aún inicializando: reintentar cuando esté listo
            console.warn(`[triggerEngine] White engine not ready yet. Type: ${whiteEngineTypeRef.current}, isReady: ${engineWhiteRef.current?.isReady}`);
            if (engineWhiteRef.current?.initPromise) {
              engineWhiteRef.current.initPromise.then(() => {
                // Guard: solo re-disparar si el motor realmente se inicializó
                if (engineWhiteRef.current?.isReady) {
//                  console.log(`[triggerEngine] White engine ready after waiting`);
                  if (hasStartedRef.current && !gameRef.current.isGameOver() && gameRef.current.turn() === "w") {
                    triggerEngineRef.current?.(gameRef.current);
                  }
                } else {
                  console.warn(`[triggerEngine] White engine init resolved but isReady=false, skipping`);
                }
              });
            } else {
              // Fallback: reintentar en 500ms
              setTimeout(() => {
                if (hasStartedRef.current && !gameRef.current.isGameOver() && gameRef.current.turn() === "w") {
                  triggerEngineRef.current?.(gameRef.current);
                }
              }, 500);
            }
          }
        } else if (whitePlayerRef.current === "human") {
          // No-op
        }
      } else {
        if (blackPlayerRef.current === "ai" && !isPausedRef.current) {
          if (engineBlackRef.current?.isReady) {
            // ⚡ Validar profundidad mínima para evitar errores con motores en profundidades muy bajas
            const uiDepth = Math.max(3, blackAiDepthRef.current);
            // Usar profundidad aumentada para Stockfish, profundidad normal para otros motores
            const isStockfish = blackEngineTypeRef.current === "stockfish";
            const engineDepth = isStockfish ? getStockfishDepth(uiDepth) : uiDepth;
            // Aumentar movetime si la profundidad es baja para darle más tiempo al motor
            const adjustedSpeed = uiDepth <= 4 ? Math.max(blackAiSpeedRef.current, 600) : blackAiSpeedRef.current;

//            console.log(`[triggerEngine] Black moving - Type: ${blackEngineTypeRef.current}, Depth: ${engineDepth}, Speed: ${adjustedSpeed}ms`);

            // 🔥 Marcar actividad cuando se DISPARA, no solo cuando responde
            lastEngineActivityRef.current = Date.now();
            engineBlackRef.current.findBestMove(
              currentGameState.fen(),
              "b",
              engineDepth,
              times,
              adjustedSpeed,
              historyFens,
              recentMoves
            );
          } else {
            // Motor aún inicializando: reintentar cuando esté listo
            console.warn(`[triggerEngine] Black engine not ready yet. Type: ${blackEngineTypeRef.current}, isReady: ${engineBlackRef.current?.isReady}`);
            if (engineBlackRef.current?.initPromise) {
              engineBlackRef.current.initPromise.then(() => {
                // Guard: solo re-disparar si el motor realmente se inicializó
                if (engineBlackRef.current?.isReady) {
//                  console.log(`[triggerEngine] Black engine ready after waiting`);
                  if (hasStartedRef.current && !gameRef.current.isGameOver() && gameRef.current.turn() === "b") {
                    triggerEngineRef.current?.(gameRef.current);
                  }
                } else {
                  console.warn(`[triggerEngine] Black engine init resolved but isReady=false, skipping`);
                }
              });
            } else {
              // Fallback: reintentar en 500ms
              setTimeout(() => {
                if (hasStartedRef.current && !gameRef.current.isGameOver() && gameRef.current.turn() === "b") {
                  triggerEngineRef.current?.(gameRef.current);
                }
              }, 500);
            }
          }
        } else if (blackPlayerRef.current === "human") {
          // No-op
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
    if (!isSyncing && !showMentalMode) {
      triggerEngine(game);
    }
  }, [
    game,
    isPaused,
    whitePlayer,
    blackPlayer,
    hasStarted,
    triggerEngine,
    isSyncing,
    showMentalMode
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



  const onPieceDrop = useCallback(
    ({ piece, sourceSquare, targetSquare }: { piece: { pieceType: string; isSparePiece: boolean; position: string }; sourceSquare: string; targetSquare: string | null }) => {
      // --- Modo Estudio: colocar piezas libremente en el tablero ---
      if (showFreeMode && !hasStartedRef.current) {
        try {
          const currentFen = positionEditorFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
          const fenPartsArr = currentFen.split(' ');
          const rows = fenPartsArr[0].split('/');
          const board: string[][] = rows.map(row => {
            const r: string[] = [];
            for (const c of row) {
              if (c >= '1' && c <= '8') { for (let i = 0; i < parseInt(c); i++) r.push(''); }
              else r.push(c);
            }
            return r;
          });

          // Pieza de repuesto: colocar en el tablero
          if (piece.isSparePiece) {
            if (!targetSquare) return false;
            const toCol = targetSquare.charCodeAt(0) - 97;
            const toRow = 8 - parseInt(targetSquare[1]);
            board[toRow][toCol] = piece.pieceType.startsWith('w') ? piece.pieceType[1] : piece.pieceType[1].toLowerCase();
          }
          // Arrastrar fuera del tablero: eliminar pieza
          else if (!targetSquare) {
            if (!sourceSquare) return false;
            const fromCol = sourceSquare.charCodeAt(0) - 97;
            const fromRow = 8 - parseInt(sourceSquare[1]);
            board[fromRow][fromCol] = '';
          }
          // Mover pieza existente dentro del tablero
          else {
            if (sourceSquare === targetSquare) return false;
            const fromCol = sourceSquare.charCodeAt(0) - 97;
            const fromRow = 8 - parseInt(sourceSquare[1]);
            const toCol = targetSquare.charCodeAt(0) - 97;
            const toRow = 8 - parseInt(targetSquare[1]);
            const pieceChar = board[fromRow]?.[fromCol];
            if (!pieceChar) return false;
            board[fromRow][fromCol] = '';
            board[toRow][toCol] = pieceChar;
          }

          const fenParts: string[] = [];
          for (const row of board) {
            let empty = 0;
            let fenRow = '';
            for (const cell of row) {
              if (cell === '') empty++;
              else { if (empty > 0) { fenRow += empty; empty = 0; } fenRow += cell; }
            }
            if (empty > 0) fenRow += empty;
            fenParts.push(fenRow);
          }
          const newFen = fenParts.join('/') + ' ' + (fenPartsArr[1] || 'w') + ' ' + (fenPartsArr[2] || '-') + ' - 0 1';
          setPositionEditorFen(newFen);
          recordEditorStepRef.current(newFen);
          return true;
        } catch { return false; }
      }

      // --- Modo Exploración: interceptar ANTES de cualquier otra guarda ---
      // Permite mover cualquier pieza (ambos colores) en una instancia aislada
      if (isBoardAnalysisMode && analysisGameRef.current) {
        if (!targetSquare || sourceSquare === targetSquare) return false;
        try {
          const g = new Chess(analysisGameRef.current.fen());
          const isPawnPromotion = g.get(sourceSquare as any)?.type === 'p' && (targetSquare[1] === '8' || targetSquare[1] === '1');
          const moveObj: any = { from: sourceSquare as any, to: targetSquare as any };
          if (isPawnPromotion) moveObj.promotion = 'q';
          const move = g.move(moveObj);
          if (move) {
            analysisGameRef.current = g;
            setAnalysisPosition(g.fen());
            setMoveFrom("");
            return true;
          }
        } catch (e) {
          return false;
        }
        return false;
      }

      if (
        !hasStartedRef.current ||
        isSyncing ||
        isPausedRef.current ||
        !targetSquare ||
        sourceSquare === targetSquare ||
        (lanStatusRef.current === "connected" && viewingMoveIndex !== null) // En LAN no se permite forkar
      )
        return false;

      // Permitir forkar la historia o seguir jugando después de terminada (Análisis / Exploración)
      const isGameOverState = gameRef.current.isGameOver() || gameResult !== null || timeOutWinnerRef.current !== null;

      if (isGameOverState) {
        return false;
      }

      if (viewingMoveIndex !== null) {
        const newGame = new Chess();
        const baseIndex = viewingMoveIndex !== null ? viewingMoveIndex : history.length - 1;

        if (history.length > 0 && baseIndex >= 0) {
          const newHistory = history.slice(0, baseIndex + 1);
          for (const m of newHistory) {
            try { newGame.move(m); } catch (e) { }
          }
        }

        try {
          const move = newGame.move({
            from: sourceSquare as any,
            to: targetSquare as any,
            promotion: "q", // Siempre promover a reina por defecto en modo exploración
          });

          if (move) {
            gameRef.current = newGame;
            setGame(newGame);
            setHistory(newGame.history());
            setViewingMoveIndex(null);
            setRedoStack([]);

            // Limpiar resultados anteriores para permitir jugar la variante
            setGameResult(null);
            setTimeOutWinner(null);
            timeOutWinnerRef.current = null;

            setMoveFrom("");
            // Sound playback disabled - ref not available
            // if (playSoundRef.current) playSound(move.captured ? "capture" : "move");

            // Si el motor debía jugar este turno, el useEffect(triggerEngine) se disparará
            // Si fue una jugada manual del usuario, ahora es el turno del oponente (que puede ser IA o humano)
            return true;
          }
        } catch (e) {
          return false; // Jugada ilegal para esta rama
        }
        return false;
      }

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
          const baseFen = gameRef.current.fen();
          const mObj: any = { from: sourceSquare, to: targetSquare };
          if (isPawnPromotion) {
//            console.log("[onPieceDrop] promotion candidate", { sourceSquare, targetSquare, pieceOnBoard });
            for (const promotion of ['q', 'r', 'b', 'n']) {
              try {
                const tempG = new Chess(baseFen);
                const result = tempG.move({ ...mObj, promotion });
                if (result) {
//                  console.log("[onPieceDrop] valid promotion candidate", { promotion, san: result.san, result });
                  return result;
                }
              } catch (_e) { }
            }
//            console.log("[onPieceDrop] promotion candidate has no legal promotion for target", { sourceSquare, targetSquare });
            return null;
          }
          const tempG = new Chess(baseFen);
          return tempG.move(mObj);
        } catch (e) { return null; }
      }
      const validMove = testMove();
      if (isPawnPromotion && validMove && validMove.promotion) {
        promotionInProgressRef.current = true;
        setPendingPromotion({ from: sourceSquare, to: targetSquare, color: turn });
//        console.log("[onPieceDrop] show promotion modal", { from: sourceSquare, to: targetSquare, promotion: validMove.promotion });
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
            return true;
          }
        } catch (e) { }
      }
      return res;
    },
    [executeMove, viewingMoveIndex, isFreeMode, game, isSyncing, whitePlayer, blackPlayer, isBoardAnalysisMode, showFreeMode, positionEditorFen],
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
      if (promotionInProgressRef.current) {
        return;
      }

      // Modo Estudio: colocar pieza de repuesto con clic
      if (showFreeMode && !hasStartedRef.current && selectedSparePiece) {
        try {
          const currentFen = positionEditorFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
          const fenPartsArr = currentFen.split(' ');
          const rows = fenPartsArr[0].split('/');
          const board: string[][] = rows.map(row => {
            const r: string[] = [];
            for (const c of row) {
              if (c >= '1' && c <= '8') { for (let i = 0; i < parseInt(c); i++) r.push(''); }
              else r.push(c);
            }
            return r;
          });
          const toCol = square.charCodeAt(0) - 97;
          const toRow = 8 - parseInt(square[1]);
          board[toRow][toCol] = selectedSparePiece.startsWith('w') ? selectedSparePiece[1] : selectedSparePiece[1].toLowerCase();
          const fenParts: string[] = [];
          for (const row of board) {
            let empty = 0;
            let fenRow = '';
            for (const cell of row) {
              if (cell === '') empty++;
              else { if (empty > 0) { fenRow += empty; empty = 0; } fenRow += cell; }
            }
            if (empty > 0) fenRow += empty;
            fenParts.push(fenRow);
          }
          const newFen = fenParts.join('/') + ' ' + (fenPartsArr[1] || 'w') + ' ' + (fenPartsArr[2] || '-') + ' - 0 1';
          setPositionEditorFen(newFen);
          recordEditorStepRef.current(newFen);
        } catch { }
        return;
      }

      // Modo Estudio: borrar pieza con clic si no hay pieza seleccionada
      if (showFreeMode && !hasStartedRef.current && !selectedSparePiece) {
        try {
          const currentFen = positionEditorFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
          const fenPartsArr = currentFen.split(' ');
          const rows = fenPartsArr[0].split('/');
          const board: string[][] = rows.map(row => {
            const r: string[] = [];
            for (const c of row) {
              if (c >= '1' && c <= '8') { for (let i = 0; i < parseInt(c); i++) r.push(''); }
              else r.push(c);
            }
            return r;
          });
          const toCol = square.charCodeAt(0) - 97;
          const toRow = 8 - parseInt(square[1]);
          if (!board[toRow][toCol]) return;
          board[toRow][toCol] = '';
          const fenParts: string[] = [];
          for (const row of board) {
            let empty = 0;
            let fenRow = '';
            for (const cell of row) {
              if (cell === '') empty++;
              else { if (empty > 0) { fenRow += empty; empty = 0; } fenRow += cell; }
            }
            if (empty > 0) fenRow += empty;
            fenParts.push(fenRow);
          }
          const newFen = fenParts.join('/') + ' ' + (fenPartsArr[1] || 'w') + ' ' + (fenPartsArr[2] || '-') + ' - 0 1';
          setPositionEditorFen(newFen);
          recordEditorStepRef.current(newFen);
        } catch { }
        return;
      }

      if (isBoardAnalysisMode && analysisGameRef.current) {
        const g = analysisGameRef.current;
        const pieceObj = g.get(square as any);
        if (!moveFrom) {
          if (pieceObj) {
            setMoveFrom(square);
          }
          return;
        }

        try {
          const tempG = new Chess(g.fen());
          const isPawnPromotion = tempG.get(moveFrom as any)?.type === 'p' && (square[1] === '8' || square[1] === '1');
          const moveObj: any = { from: moveFrom as any, to: square as any };
          if (isPawnPromotion) moveObj.promotion = 'q';
          const move = tempG.move(moveObj);

          if (move) {
            analysisGameRef.current = tempG;
            setAnalysisPosition(tempG.fen());
            setMoveFrom("");
          } else {
            if (pieceObj) setMoveFrom(square);
            else setMoveFrom("");
          }
        } catch (e) {
          if (pieceObj) setMoveFrom(square);
          else setMoveFrom("");
        }
        return;
      }

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
          const baseFen = gameRef.current.fen();
          const mObj: any = { from: moveFrom, to: square };
          if (isPawnPromotion) {
//            console.log("[onSquareClick] promotion candidate", { moveFrom, square, pieceOnBoard });
            for (const promotion of ['q', 'r', 'b', 'n']) {
              try {
                const tempG = new Chess(baseFen);
                const result = tempG.move({ ...mObj, promotion });
                if (result) {
//                  console.log("[onSquareClick] valid promotion candidate", { promotion, san: result.san, result });
                  return result;
                }
              } catch (_e) { }
            }
//            console.log("[onSquareClick] promotion candidate has no legal promotion for target", { moveFrom, square });
            return null;
          }
          const tempG = new Chess(baseFen);
          return tempG.move(mObj);
        } catch (e) { return null; }
      }
      const validMove = testMove();
      if (isPawnPromotion && validMove && validMove.promotion) {
        promotionInProgressRef.current = true;
        setPendingPromotion({ from: moveFrom, to: square, color: turn });
        setMoveFrom("");
//        console.log("[onSquareClick] show promotion modal", { from: moveFrom, to: square, promotion: validMove.promotion });
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
    [moveFrom, executeMove, viewingMoveIndex, isSyncing, isBoardAnalysisMode, game],
  );

  const onPieceClick = useCallback(
    ({ square }: { isSparePiece: boolean; piece: { pieceType: string }; square: string }) => {
      onSquareClick({ square, piece: null });
    },
    [onSquareClick]
  );



  const resignGame = () => {
    const result = gameRef.current.turn() === 'w' ? (language === 'es' ? 'Negras ganan por abandono' : 'Black wins by resignation') : (language === 'es' ? 'Blancas ganan por abandono' : 'White wins by resignation');
    setGameResult(result);
    gameResultRef.current = result;
    setTimerActive(false);
    engineWhiteRef.current?.stop();
    engineBlackRef.current?.stop();
    sendLanGameResult(result);
    if (notificationConfig !== "none") setSystemNotification(result);
  };

  const sendLanGameResult = useCallback((result: string) => {
    if (lanStatusRef.current === "connected" && lanSendStateRef.current) {
      lanSendStateRef.current({ gameResult: result, isPaused: false, hasStarted: false });
    }
  }, []);

  const drawGame = () => {
    if (lanStatusRef.current === "connected") {
      lanSendStateRef.current?.({ drawOffer: "request" });
      alert(language === 'es' ? 'Oferta de tablas enviada al oponente.' : 'Draw offer sent to opponent.');
      return;
    }
    const result = language === 'es' ? 'Tablas acordadas' : 'Draw by agreement';
    setGameResult(result);
    gameResultRef.current = result;
    setTimerActive(false);
    engineWhiteRef.current?.stop();
    engineBlackRef.current?.stop();
    sendLanGameResult(result);
    if (notificationConfig !== "none") setSystemNotification(result);
  };


  // Destruye y recrea ambos workers desde cero para garantizar estado limpio
  const recreateEngines = useCallback(async () => {
//    console.log("[App] Recreando motores...");
    engineWhiteRef.current?.quit();
    engineBlackRef.current?.quit();
    engineWhiteRef.current = null;
    engineBlackRef.current = null;

    const engW = whiteEngineType === "atlas"
        ? new AtlasEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
        : whiteEngineType === "obsidian"
          ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
          : whiteEngineType === "obsidian"
            ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
            : (whiteEngineType === "edd" || whiteEngineType === "ailed")
              ? new EDDEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
              : new StockfishEngineWhite((msg) => handleEngineMessageRef.current?.(msg, "w"));

    const engB = blackEngineType === "atlas"
        ? new AtlasEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
        : blackEngineType === "obsidian"
          ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
          : blackEngineType === "obsidian"
            ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
            : (blackEngineType === "edd" || blackEngineType === "ailed")
              ? new EDDEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
              : new StockfishEngineBlack((msg) => handleEngineMessageRef.current?.(msg, "b"));

    applyObsidianEngineConfig(engW, whiteObsidianConfig);
    applyObsidianEngineConfig(engB, blackObsidianConfig);

    try {
      const pW = engW.init();
      const pB = engB.init();

      // Esperar con timeout de 5s por motor (10s total máximo)
      await Promise.all([
        Promise.race([pW, new Promise((r) => setTimeout(r, 5000))]),
        Promise.race([pB, new Promise((r) => setTimeout(r, 5000))])
      ]);

//      console.log("[App] Motores recreados y listos");
    } catch (err) {
      console.error("[App] Error inicializando motores recreados:", err);
    }

    engineWhiteRef.current = engW;
    engineBlackRef.current = engB;

    // 🔥 Resetear el contador de actividad cuando se recrean
    lastEngineActivityRef.current = Date.now();
  }, [whiteEngineType, blackEngineType]);

  // Vigilante de salud del motor - usa refs para no recrear interval en cada jugada
  const engineWatchdogIntervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (engineWatchdogIntervalRef.current) {
      clearInterval(engineWatchdogIntervalRef.current);
      engineWatchdogIntervalRef.current = null;
    }
    if (!hasStarted || isPaused || game.isGameOver() || showMentalMode) return;

    engineWatchdogIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const diff = now - lastEngineActivityRef.current;

      const turn = gameRef.current.turn();
      const isAiTurn = (turn === "w" && whitePlayerRef.current === "ai") || (turn === "b" && blackPlayerRef.current === "ai");

      // 🔥 AUMENTADO de 10s a 45s - Atlas/EDD necesitan tiempo en profundidades altas
      if (isAiTurn && diff > 45000) { // 45 segundos sin noticias del motor
        console.warn(`[App] Motor parece colgado después de ${(diff / 1000).toFixed(1)}s, recreando...`);
        recreateEngines().then(() => {
          setTimeout(() => triggerEngine(gameRef.current), 500);
        }).catch((err) => {
          console.error("[App] Error al recrear motores:", err);
        });
        lastEngineActivityRef.current = now; // Resetear para no spamear
      }
    }, 5000);

    return () => {
      if (engineWatchdogIntervalRef.current) {
        clearInterval(engineWatchdogIntervalRef.current);
        engineWatchdogIntervalRef.current = null;
      }
    };
  }, [hasStarted, isPaused]);

  const runFullAnalysis = useCallback(async (overrideMode?: "fast" | "deep" | "lichess") => {
    if (isAnalyzing || history.length === 0) return;

    // Si se pasa un modo específico (p.ej. desde los botones del modal), aplicarlo ahora
    // para evitar leer el estado viejo de React en el useEffect
    const effectiveMode = overrideMode ?? analysisDepthMode;
    if (overrideMode) setAnalysisDepthMode(overrideMode);

    // Detener motores actuales para liberar recursos si es necesario
    engineWhiteRef.current?.stop();
    engineBlackRef.current?.stop();

    // El modo nube (lichess) usa chess-api.com directamente; NO necesita el motor local
    // Solo inicializamos el motor Stockfish si es análisis local
    if (effectiveMode !== "lichess") {
      if (!analysisEngineRef.current) {
        const sfEngine = new StockfishEngineWhite((msg) => handleEngineMessageRef.current?.(msg, "w"));
        await sfEngine.init();
        analysisEngineRef.current = sfEngine;
      }
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisIndex(0);
    analyzingIndexSentRef.current = null;
    setMoveEvaluations([]);
  }, [history, isAnalyzing, analysisDepthMode]);

  const cancelAnalysis = useCallback(() => {
    setIsAnalyzing(false);
    setAnalysisIndex(null);
    analyzingIndexSentRef.current = null;
    analysisEngineRef.current?.stop();
    setAnalysisProgress(0);
  }, []);

  const openAnalysisOrRun = useCallback(() => {
    if (history.length === 0) return;
    if (isAnalyzing) {
      cancelAnalysis();
      return;
    }
    // Si ya tenemos análisis completo cargado y no se ha modificado la partida, lo abrimos directamente
    if (Object.keys(moveComments).length > 0 && Object.keys(moveComments).length === history.length) {
      setIsMasterAnalysisOpen(true);
    } else {
      // Si no hay análisis, mostramos el selector de modo
      setShowAnalysisConfig(true);
    }
  }, [moveComments, history.length, isAnalyzing, cancelAnalysis]);

  const deleteAnalysisCache = useCallback(() => {
    setMoveComments({});
    setMoveEvaluations([]);
    setIsMasterAnalysisOpen(false);
    setAiAnalysisResult(null);
    setAiFallbackInfo(null);
    setIsAiAnalyzing(false);
    setAiAnalysisProgress("");
  }, []);

  const runAIAnalysis = useCallback(async (openOverlay = true, customPgn?: string) => {
    if (isAiAnalyzing) return;
    const pgn = customPgn || (history.length > 0 ? buildPGNFromHistory(history, historyFens, {
      White: getWhitePlayerName() || (whitePlayer === "human" ? "Humano" : "AI"),
      Black: getBlackPlayerName() || (blackPlayer === "human" ? "Humano" : "AI"),
    }) : "");
    if (!pgn || !aiApiKey) return;

    setIsAiAnalyzing(true);
    setAiAnalysisResult(null);
    setAiGeneralResult(null);
    setAiTechnicalResult(null);
    setIsAiGeneralLoading(true);
    setIsAiTechnicalLoading(enableTechnicalAnalysis);
    setAiFallbackInfo(null);
    setAiAnalysisProgress("Iniciando análisis...");

    const whiteName = getWhitePlayerName();
    const blackName = getBlackPlayerName();
    const prioritizedSide: "white" | "black" | "auto" =
      whitePlayer === "human" ? "white"
      : blackPlayer === "human" ? "black"
      : "auto";

    // Ejecutar ambos análisis en paralelo e ir mostrando resultados individualmente
    const runGeneral = async () => {
      try {
        setAiAnalysisProgress("Obteniendo análisis general...");
        const generalFallback = await runWithFallback(
          (pid, mid) => runGeneralAnalysis(pgn, prioritizedSide, pid, mid, aiCustomUrl, whiteName, blackName),
          aiProvider, aiModel,
          (msg) => setAiAnalysisProgress(msg)
        );
        const generalText = generalFallback.result || "No se pudo generar el análisis general.";
        setAiGeneralResult(generalText);
        setAiFallbackInfo(generalFallback.fallbackInfo);
        return generalFallback;
      } catch (err: any) {
        const errorText = `Error en análisis general: ${err.message || "Desconocido"}`;
        setAiGeneralResult(errorText);
        return null;
      } finally {
        setIsAiGeneralLoading(false);
      }
    };

    const runTechnical = async () => {
      if (!enableTechnicalAnalysis) {
        setIsAiTechnicalLoading(false);
        return null;
      }
      try {
        setAiAnalysisProgress("Obteniendo análisis técnico...");
        const technicalFallback = await runWithFallback(
          (pid, mid) => runTechnicalAnalysis(pgn, "", pid, mid, aiCustomUrl),
          aiProvider, aiModel,
          () => {}
        );
        if (technicalFallback.result) {
          setAiTechnicalResult(technicalFallback.result);
        }
        return technicalFallback;
      } catch (err: any) {
        const errorText = `Error en análisis técnico: ${err.message || "Desconocido"}`;
        setAiTechnicalResult(errorText);
        return null;
      } finally {
        setIsAiTechnicalLoading(false);
      }
    };

    // Iniciar ambos en paralelo - cada uno actualiza su estado individualmente
    const [generalFallback, technicalFallback] = await Promise.all([runGeneral(), runTechnical()]);

    // Una vez completados ambos, consolidar en el formato legacy
    const combinedGeneral = aiGeneralResult || generalFallback?.result || "No se pudo generar el análisis general.";
    const combinedTechnical = aiTechnicalResult || technicalFallback?.result || "";
    setAiAnalysisResult({ general: combinedGeneral, technical: combinedTechnical });

    if (openOverlay) {
      setIsMasterAnalysisOpen(true);
      playAudio("save");
    }
    setIsAiAnalyzing(false);
    setAiAnalysisProgress("");

    // Análisis por jugada en segundo plano (solo para historial de partida actual)
    if (!customPgn) {
      (async () => {
        try {
          const perMoveResult = await runPerMoveAIAnalysis(
            pgn, moveEvaluations, history, aiProvider, aiModel, aiCustomUrl, whiteName, blackName
          );
          if (perMoveResult && perMoveResult.length > 0) {
            const aiComments: Record<number, any> = {};
            for (const item of perMoveResult) {
              if (item.index >= 0 && item.index < history.length) {
                aiComments[item.index] = {
                  comment: item.comment,
                  classification: item.classification,
                  isAI: true,
                };
              }
            }
            if (Object.keys(aiComments).length > 0) {
              setMoveComments(aiComments as any);
            }
          } else {
            const evalComments: Record<number, any> = {};
            for (let i = 0; i < history.length; i++) {
              const evalBefore = moveEvaluations[i] ?? 0;
              const evalAfter = moveEvaluations[i + 1] ?? evalBefore;
              const delta = evalAfter - evalBefore;
              let classification = "good";
              if (delta < -3) classification = "blunder";
              else if (delta < -1.5) classification = "mistake";
              else if (delta < -0.5) classification = "inaccuracy";
              else if (delta > 0.3) classification = "excellent";
              const evalText = evalAfter >= 0 ? `+${evalAfter.toFixed(2)}` : `${evalAfter.toFixed(2)}`;
              evalComments[i] = { comment: evalText, classification, isAI: false };
            }
            setMoveComments(evalComments as any);
          }
        } catch (err) {
          console.warn("[AI] Background analysis error:", err);
        }
      })();
    }
  }, [isAiAnalyzing, history, historyFens, aiApiKey, aiProvider, aiModel, aiCustomUrl, enableTechnicalAnalysis, effectivePlayerName, playAudio, moveEvaluations]);

  // Maneja análisis de PGN personalizado
  const handleAnalyzeCustomPgn = useCallback((pgn: string) => {
    if (!pgn.trim()) return;
    runAIAnalysis(true, pgn.trim());
  }, [runAIAnalysis]);

  // Persistir enableTechnicalAnalysis en localStorage
  const handleToggleTechnicalAnalysis = useCallback((enabled: boolean) => {
    setEnableTechnicalAnalysis(enabled);
    localStorage.setItem("chess_enableTechnicalAnalysis", String(enabled));
  }, []);

  // Cargar PGN personalizado en el tablero
  const handleLoadPgn = useCallback((pgn: string) => {
    if (!pgn.trim()) return;
    const newGame = new Chess();
    let cleanPgn = pgn.trim();
    if (cleanPgn.charCodeAt(0) === 0xFEFF) cleanPgn = cleanPgn.slice(1);
    try {
      newGame.loadPgn(cleanPgn);
    } catch (e) {
      try {
        const match = cleanPgn.match(/(\[.*?\]\s*)*(1\.\s+[a-zA-Z0-9\-+\#=].*?(?:1-0|0-1|1\/2-1\/2|\*))/s);
        if (match) newGame.loadPgn(match[0]);
        else return;
      } catch (e2) { return; }
    }
    if (newGame.history().length === 0) return;
    setGame(newGame);
    gameRef.current = newGame;
    setInitialFen(newGame.header().FEN || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    setHistory(newGame.history());
    setMoveFrom("");
    setHasStarted(true);
    hasStartedRef.current = true;
    setTimerActive(false);
    setIsConfigSidebarOpen(false);
    setIsPaused(false);
    isPausedRef.current = false;
    setIsLoadedPgn(true);
    setViewingMoveIndex(-1);
    setWhitePlayer("human");
    setBlackPlayer("human");
    whitePlayerRef.current = "human";
    blackPlayerRef.current = "human";
    const whiteName = newGame.header().White || "";
    const blackName = newGame.header().Black || "";
    if (whiteName) setWhiteEngineName(whiteName);
    if (blackName) setBlackEngineName(blackName);
    setIsMasterAnalysisOpen(true);
  }, []);

  // Efecto que controla el bucle de análisis secuencial
  useEffect(() => {
    if (isAnalyzing && analysisIndex !== null) {
      const totalMoves = history.length + 1; // Incluyendo posición inicial
      const progress = Math.round((analysisIndex / totalMoves) * 100);
      setAnalysisProgress(progress);

      if (analysisIndex < totalMoves) {
        const fen = historyFens[analysisIndex];
        const turn = fen.split(" ")[1] as "w" | "b";

        // El modo nube (lichess) NO requiere el motor local; se procesa siempre
        // Para los modos locales, esperamos a que el motor esté listo
        const isCloudMode = analysisDepthMode === "lichess" || analysisDepthMode === "explorer";
        const engineReady = isCloudMode || !!analysisEngineRef.current;

        if (engineReady && analyzingIndexSentRef.current !== analysisIndex) {
          analyzingIndexSentRef.current = analysisIndex;

          const tempGame = new Chess(fen);
          if (tempGame.isGameOver()) {
            // Posición terminal (mate, tablas): no hay movimiento que evaluar.
            // Guardamos la evaluación final y avanzamos.
            const termScore = tempGame.isCheckmate()
              ? (tempGame.turn() === "w" ? -10000 : 10000)
              : 0;
            setMoveEvaluations(prev => {
              const arr = [...prev];
              arr[analysisIndex] = termScore;
              return arr;
            });
            setAnalysisIndex(prev => prev !== null ? prev + 1 : null);
          } else {
            // evaluate() es más ligero que findBestMove para análisis masivo.
            // El evento 'evaluation' actualiza evalScoreRef; 'bestmove' dispara el avance.

            if (analysisDepthMode === "explorer") {
              const cached = fetchFromCache('explorer_' + fen);
              if (cached) {
                const moves = (cached.moves || []).slice(0, 3).map((m: any) => {
                  const total = m.white + m.draws + m.black;
                  return { san: m.san, white: m.white, draws: m.draws, black: m.black, total };
                });
                const totalGames = moves.reduce((sum: number, m: any) => sum + m.total, 0);
                setExplorerStats(prev => ({ ...prev, [analysisIndex]: { moves, totalGames } }));

                setMoveEvaluations(prev => {
                  const arr = [...prev];
                  arr[analysisIndex] = 0;
                  return arr;
                });
                evalScoreRef.current = 0;
                setAnalysisIndex(prev => prev !== null ? prev + 1 : null);
                return;
              }

              const explorerHeaders: Record<string, string> = { Accept: "application/json" };
              const lichessToken = localStorage.getItem("chess_lichessToken");
              if (lichessToken) explorerHeaders["Authorization"] = `Bearer ${lichessToken}`;
              fetch(`https://explorer.lichess.org/masters?fen=${encodeURIComponent(fen)}`, { headers: explorerHeaders })
                .then(async res => {
                  if (!res.ok) throw new Error("Explorer no disponible");
                  return res.json();
                })
                .then(data => {
                  saveToCache('explorer_' + fen, data);
                  const moves = (data.moves || []).slice(0, 3).map((m: any) => {
                    const total = m.white + m.draws + m.black;
                    return { san: m.san, white: m.white, draws: m.draws, black: m.black, total };
                  });
                  const totalGames = moves.reduce((sum: number, m: any) => sum + m.total, 0);
                  setExplorerStats(prev => ({ ...prev, [analysisIndex]: { moves, totalGames } }));

                  setMoveEvaluations(prev => {
                    const arr = [...prev];
                    arr[analysisIndex] = 0;
                    return arr;
                  });
                  evalScoreRef.current = 0;
                  setAnalysisIndex(prev => prev !== null ? prev + 1 : null);
                })
                .catch(() => {
                  console.warn("[Explorer] Sin datos.");
                  setAnalysisIndex(prev => prev !== null ? prev + 1 : null);
                });
            } else if (analysisDepthMode === "lichess") {
              const cached = fetchFromCache(fen);
              if (cached) {
                const evalScore = cached.mate !== undefined && cached.mate !== null
                  ? (cached.mate > 0 ? 100 : -100)
                  : (typeof cached.eval === "number" ? cached.eval : (cached.cp !== undefined ? cached.cp / 100 : 0));
                const bestPv = cached.continuationArr ? cached.continuationArr.join(" ")
                  : (cached.pvs && cached.pvs.length > 0 ? cached.pvs[0].moves : cached.move || "");

                if (bestPv) {
                  setMoveEvaluations(prev => {
                    const arr = [...prev];
                    arr[analysisIndex] = evalScore;
                    return arr;
                  });
                  evalScoreRef.current = evalScore;
                  setAnalysisIndex(prev => prev !== null ? prev + 1 : null);
                  return;
                }
              }

              const fetchCloud = () => fetchChessApiCloudJson(fen, 18, 100, 3)
                .catch(err => {
                  if (err.name === 'AbortError') throw err;
                  console.warn("[Analysis] Nube POST falló. Intentando WebSocket...", err);
                  return fetchChessApiCloudWebSocket(fen, 18, 100, 3);
                });

              fetchCloud()
                .then(data => {
                  if (data && (data.move || (data.pvs && data.pvs.length > 0))) {
                    saveToCache(fen, data);
                    const evalScore = data.mate !== undefined && data.mate !== null
                      ? (data.mate > 0 ? 100 : -100)
                      : (typeof data.eval === "number" ? data.eval : (data.cp !== undefined ? data.cp / 100 : 0));
                    const isMate = data.mate !== undefined && data.mate !== null;

                    setMoveEvaluations(prev => {
                      const arr = [...prev];
                      arr[analysisIndex] = evalScore;
                      return arr;
                    });
                    evalScoreRef.current = evalScore;
                    setAnalysisIndex(prev => prev !== null ? prev + 1 : null);
                  } else {
                    throw new Error("Sin respuesta válida");
                  }
                })
                .catch(err => {
                  if (err?.name === 'AbortError') return;
                  console.warn("[Analysis] Nube sin datos. Fallback al motor local.", err);
                  // Intentar inicializar motor local como fallback
                  const tryLocalFallback = async () => {
                    if (!analysisEngineRef.current) {
                      try {
                        const sfEngine = new StockfishEngineWhite((msg) => handleEngineMessageRef.current?.(msg, "w"));
                        await sfEngine.init();
                        analysisEngineRef.current = sfEngine;
                      } catch (e) {
                        console.warn("[Analysis] No se pudo inicializar motor local:", e);
                        setAnalysisIndex(prev => prev !== null ? prev + 1 : null);
                        return;
                      }
                    }
                    if (analysisEngineRef.current?.isReady) {
                      analysisEngineRef.current.findBestMove(fen, turn, 8, undefined, 0);
                    } else {
                      analysisEngineRef.current?.initPromise?.then(() => {
                        analysisEngineRef.current?.findBestMove(fen, turn, 8, undefined, 0);
                      }).catch(() => setAnalysisIndex(prev => prev !== null ? prev + 1 : null));
                    }
                  };
                  tryLocalFallback();
                });
            } else {
              const currentAnalysisDepth = analysisDepthMode === "fast" ? 10 : 18;
              if (analysisEngineRef.current?.isReady) {
                analysisEngineRef.current.findBestMove(fen, "w", currentAnalysisDepth, undefined, 0);
              } else {
                analysisEngineRef.current?.initPromise?.then(() => {
                  analysisEngineRef.current?.findBestMove(fen, "w", currentAnalysisDepth, undefined, 0);
                });
              }
            }
          }
        }
      } else {
        // Análisis completado
        setIsAnalyzing(false);
        setAnalysisIndex(null);
        analyzingIndexSentRef.current = null;
        setAnalysisProgress(100);

        // Construir comentarios desde evaluaciones del motor (nunca comentarios genéricos predefinidos)
        const buildEvalComments = (): Record<number, { comment: string; classification: string }> => {
          const comments: Record<number, { comment: string; classification: string }> = {};
          for (let i = 0; i < history.length; i++) {
            // Modo explorer: mostrar stats de apertura
            if (analysisDepthMode === "explorer" && explorerStats[i]) {
              const stats = explorerStats[i];
              const statsText = stats.moves.length > 0
                ? stats.moves.map(m => {
                    const pw = Math.round((m.white / m.total) * 100);
                    const pd = Math.round((m.draws / m.total) * 100);
                    const pb = Math.round((m.black / m.total) * 100);
                    return `${m.san} (B:${pw}% E:${pd}% N:${pb}%)`;
                  }).join(" | ")
                : (language === "es" ? "Sin datos en BD" : "No data in DB");
              comments[i] = {
                comment: `${statsText}${stats.totalGames > 0 ? ` [${stats.totalGames} ${language === "es" ? "partidas" : "games"}]` : ""}`,
                classification: "book",
              };
              continue;
            }

            // Mostrar evaluación del motor
            const evalBefore = moveEvaluations[i] ?? 0;
            const evalAfter = moveEvaluations[i + 1] ?? evalBefore;
            
            // Calcular delta: positivo si el lado que movió mejoró, negativo si empeoró
            const isWhiteMove = i % 2 === 0;
            const delta = isWhiteMove ? (evalAfter - evalBefore) : (evalBefore - evalAfter);
            let classification = "good";
            if (delta < -3) classification = "blunder";
            else if (delta < -1.5) classification = "mistake";
            else if (delta < -0.5) classification = "inaccuracy";
            else if (delta > 0.3) classification = "excellent";

            const evalText = delta >= 0 ? `+${delta.toFixed(2)}` : `${delta.toFixed(2)}`;
            comments[i] = { comment: evalText, classification };
          }
          return comments;
        };

        if (aiApiKey) {
          setMoveComments({});
          runAIAnalysis(false);
        } else {
          setMoveComments(buildEvalComments() as any);
        }
        setIsMasterAnalysisOpen(true);
        playAudio("save");
      }
    }
  }, [isAnalyzing, analysisIndex, history, historyFens, moveEvaluations, playAudio, analysisDepthMode, explorerStats, language, aiApiKey, runAIAnalysis]);

  /**
   * FUNCIÓN CRÍTICA: Limpiar COMPLETAMENTE la sesión anterior antes de iniciar un nuevo juego
   */
  const cleanupPreviousSession = (options?: { preserveAdventure?: boolean }) => {
    const preserveAdventure = options?.preserveAdventure ?? false;

    // 1. Terminar todos los workers/motores de forma inmediata y completa
    engineWhiteRef.current?.stop();
    engineBlackRef.current?.stop();
    engineWhiteRef.current?.quit();
    engineBlackRef.current?.quit();
    engineWhiteRef.current = null;
    engineBlackRef.current = null;

    // 2. Detener análisis si está en curso
    if (isAnalyzingRef.current) {
      setIsAnalyzing(false);
      isAnalyzingRef.current = false;
      setAnalysisIndex(null);
      analysisIndexRef.current = null;
    }

    // 3. Terminar LAN si está activo
    if (lanStatusRef.current === "connected" && lanSendControlRef.current) {
      lanSendControlRef.current("stop", { hasStarted: false });
    }

    // 4. Limpiar timers
    startSequenceAbortRef.current = true;
    if (quickStartTimeoutRef.current) clearTimeout(quickStartTimeoutRef.current);
    if ((window as any)._gameResetTimer) {
      clearTimeout((window as any)._gameResetTimer);
      delete (window as any)._gameResetTimer;
    }

    // 5. Resetear estados de juego
    setHasStarted(false);
    hasStartedRef.current = false;
    setGameResult(null);
    setGameResultDismissed(false);
    gameResultRef.current = null;
    setGame(new Chess());
    gameRef.current = new Chess();
    setHistory([]);
    historyRef.current = [];
    setRedoStack([]);
    setTimerActive(false);
    setIsPaused(false);
    isPausedRef.current = false;
    setTimeOutWinner(null);
    timeOutWinnerRef.current = null;
    setIsGameStopped(false);
    setStoppedGameSnapshot(null);

    // 🔥 Resetear Modo Estudio
    setShowFreeMode(false);
    setFreeModeStage('config');

    // 6. Limpiar evaluaciones y variaciones
    setEvalScore(0);
    evalScoreRef.current = 0;
    setEvalMate(undefined);
    setBestLine("");
    setWhiteVariations([]);
    setBlackVariations([]);
    setCurrentVariations([]);
    setMoveEvaluations([]);
    setMoveTimes([]);
    setMoveElapsedTimes([]);

    // 6b. Limpiar análisis IA
    setAiAnalysisResult(null);
    setAiFallbackInfo(null);
    setIsAiAnalyzing(false);
    setAiAnalysisProgress("");
    setMoveComments({});

    // 7. Limpiar pre-movimientos
    setPreMoves([]);
    preMovesRef.current = [];

    // 8. Resetear vista
    setMoveFrom("");
    moveFromRef.current = "";
    setViewingMoveIndex(null);
    setIsLoadedPgn(false);
    setIsAutoPlaying(false);
    setTournamentCountdown(null);

    // 9. Limpiar sesiones guardadas de ambos modos
    setSavedNormalGame(null);
    setSavedAdventureGame(null);

    // 10. Resetear interfaz específica del modo adventure
    if (!preserveAdventure) {
      if (activeAdventureEnemy) {
        setWhitePlayer("human");
        setBlackPlayer("ai");
        setWhiteEngineType("stockfish");
        setBlackEngineType("stockfish");
        setWhiteEngineName("");
        setBlackEngineName("");
        setWhiteAiDepth(15);
        setBlackAiDepth(15);
      }

      setActiveAdventureEnemy(null);
      setRightTab(lanStatusRef.current !== "disconnected" && window.innerWidth > 768 ? "history" : "neural");
    }
  };

  const startGameInternal = (options?: { preserveAdventure?: boolean; freeMode?: { engineType: string; elo: number; color: "white" | "black"; fen?: string } }) => {
    isStartingGameRef.current = true;
    // No guardar partida en segundo plano: se elimina el guardado automático

    // --- Resolver configuración efectiva (freeMode tiene prioridad) ---
    let effectiveWhitePlayer = whitePlayer;
    let effectiveBlackPlayer = blackPlayer;
    let effectiveBoardOrientation = boardOrientation;
    let effectiveWhiteEngineType = whiteEngineType;
    let effectiveBlackEngineType = blackEngineType;
    let effectiveWhiteAiDepth = whiteAiDepth;
    let effectiveBlackAiDepth = blackAiDepth;

    if (options?.freeMode) {
      const fm = options.freeMode;
      if (fm.color === "white") {
        effectiveBoardOrientation = "white";
        effectiveWhitePlayer = "human";
        effectiveBlackPlayer = "ai";
        effectiveBlackEngineType = fm.engineType;
        effectiveBlackAiDepth = fm.elo;
      } else {
        effectiveBoardOrientation = "black";
        effectiveWhitePlayer = "ai";
        effectiveBlackPlayer = "human";
        effectiveWhiteEngineType = fm.engineType;
        effectiveWhiteAiDepth = fm.elo;
      }
      // Actualizar refs para triggerEngine (sin tocar el estado -> no dispara useEffects)
      whitePlayerRef.current = effectiveWhitePlayer;
      blackPlayerRef.current = effectiveBlackPlayer;
      whiteEngineTypeRef.current = effectiveWhiteEngineType;
      blackEngineTypeRef.current = effectiveBlackEngineType;
      whiteAiDepthRef.current = effectiveWhiteAiDepth;
      blackAiDepthRef.current = effectiveBlackAiDepth;
    }

    // Aplicar orientación/players al estado (estos no disparan useEffects de motores)
    setBoardOrientation(effectiveBoardOrientation);
    setWhitePlayer(effectiveWhitePlayer);
    setBlackPlayer(effectiveBlackPlayer);

    // ⚡ CRÍTICO: Limpiar COMPLETAMENTE la sesión anterior antes de iniciar una nueva
    cleanupPreviousSession({ preserveAdventure: options?.preserveAdventure ?? !!activeAdventureEnemy });

    // Reactivar la secuencia de inicio (cleanupPreviousSession la cancela al limpiar sesiones previas)
    startSequenceAbortRef.current = false;

    // Modo Estudio: mantener activo el contexto del modo durante toda la partida
    if (options?.freeMode) {
      setShowFreeMode(true);
      setFreeModeStage('playing');
    }

    // Solo resetea a modo normal si no estamos ya en modo aventura
    if (!activeAdventureEnemy && currentGameMode !== "adventure") {
      setCurrentGameMode("normal");
    }

    // En modo LAN: bloquear inicio si el host no tiene oponente, o si somos el guest (solo el host inicia)
    const currentLanRole = lanRoleRef.current;
    if (currentLanRole && currentLanRole !== "idle") {
      if (currentLanRole === "host" && !lanOpponentConnectedRef.current) {
        alert(language === "es" ? "Espera a que el oponente se conecte y sea aceptado en la sala." : "Wait for the opponent to connect and be accepted into the room.");
        return;
      }
      if (currentLanRole === "guest") {
        return;
      }
    }

    let newFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    if (isTrainingMode) {
      newFen = generateTrainingFen(trainingPiecesW, trainingPiecesB);
    } else if (isFreestyleMode) {
      newFen = generateChess960Fen();
    } else if (options?.freeMode?.fen && options.freeMode.fen.trim()) {
      newFen = options.freeMode.fen;
    } else if (customFen) {
      newFen = customFen;
      setCustomFen(null);
    }
    // Validar FEN: debe tener ambos reyes (blanco y negro) y no estar en jaque mate
    try {
      const testG = new Chess(newFen);
      const hasWK = testG.board().some(row => row.some(p => p?.type === 'k' && p.color === 'w'));
      const hasBK = testG.board().some(row => row.some(p => p?.type === 'k' && p.color === 'b'));
      if (!hasWK || !hasBK || testG.isGameOver()) {
        newFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      }
    } catch {
      newFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    }
    setInitialFen(newFen);

    // Crear nuevos motores frescos para la partida (usar tipos efectivos)
    const engW = effectiveWhiteEngineType === "atlas"
        ? new AtlasEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
        : effectiveWhiteEngineType === "obsidian"
          ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
          : effectiveWhiteEngineType === "obsidian"
            ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
            : effectiveWhiteEngineType === "edd"
              ? new EDDEngine((msg) => handleEngineMessageRef.current?.(msg as any, "w"))
              : new StockfishEngineWhite((msg) => handleEngineMessageRef.current?.(msg, "w"));
    const engB = effectiveBlackEngineType === "atlas"
        ? new AtlasEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
        : effectiveBlackEngineType === "obsidian"
          ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
          : effectiveBlackEngineType === "obsidian"
            ? new ObsidianEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
            : effectiveBlackEngineType === "edd"
              ? new EDDEngine((msg) => handleEngineMessageRef.current?.(msg as any, "b"))
              : new StockfishEngineBlack((msg) => handleEngineMessageRef.current?.(msg, "b"));

    engineWhiteRef.current = engW;
    engineBlackRef.current = engB;
    applyObsidianEngineConfig(engW, whiteObsidianConfig);
    applyObsidianEngineConfig(engB, blackObsidianConfig);
    const pW = engW.init();
    const pB = engB.init();

    const g = new Chess(newFen);
    const baseNameW = whiteEngineName || (effectiveWhiteEngineType === "atlas" ? "Atlas.1" : effectiveWhiteEngineType === "edd" ? "Nexus" : effectiveWhiteEngineType === "obsidian" ? "Obsidian" : effectiveWhiteEngineType === "obsidian" ? "DxA.47" : effectiveWhiteEngineType.startsWith("maia") ? "Maia: " + effectiveWhiteEngineType.substring(4) : effectiveWhiteEngineType === "ailed" ? "Ailed" : "Stockfish");
    const baseNameB = blackEngineName || (effectiveBlackEngineType === "atlas" ? "Atlas.1" : effectiveBlackEngineType === "edd" ? "Nexus" : effectiveBlackEngineType === "obsidian" ? "Obsidian" : effectiveBlackEngineType === "obsidian" ? "DxA.47" : effectiveBlackEngineType.startsWith("maia") ? "Maia: " + effectiveBlackEngineType.substring(4) : effectiveBlackEngineType === "ailed" ? "Ailed" : "Stockfish");

    g.header(
      "White",
      effectiveWhitePlayer === "human" ? (effectivePlayerName || "Humano") : baseNameW,
      "Black",
      effectiveBlackPlayer === "human" ? (effectivePlayerName || "Humano") : baseNameB
    );
    setGame(g);
    gameRef.current = g;
    turnRef.current = g.turn();

    setViewingMoveIndex(null);
    setHistory([]);
    setMoveEvaluations([]);
    setMoveTimes([]);
    setMoveElapsedTimes([]);
    setRedoStack([]);
    setCurrentVariations([]);
    setWhiteVariations([]);
    setBlackVariations([]);

    setWhiteTime(initialTimeMin * 60);
    setBlackTime(initialTimeMin * 60);
    setGameResult(null);
    setGameResultDismissed(false);
    setTimeOutWinner(null);
    timeOutWinnerRef.current = null;
    setIsPaused(false);
    isPausedRef.current = false;

    const shouldSync = effectiveWhitePlayer === "ai" || effectiveBlackPlayer === "ai";
    setIsSyncing(shouldSync);
    setTimerActive(false);

    setIsConfigSidebarOpen(false);
    setShowMainScreen(false);
    setIsHeaderVisible(true);
    setIsAdventureModeOpen(false);
    setIsLoadedPgn(false);
    setViewingMoveIndex(null);

    if (effectiveWhitePlayer === "human" && effectiveBlackPlayer === "ai") {
      setBoardOrientation("white");
    } else if (effectiveBlackPlayer === "human" && effectiveWhitePlayer === "ai") {
      setBoardOrientation("black");
    }

    playAudio("start");

    const startAfterSync = async () => {
      try {
        await Promise.all([pW, pB]);
        if (startSequenceAbortRef.current) return;
        const syncDelay = currentGameMode === "adventure" ? 1200 : 800;
        await new Promise(resolve => setTimeout(resolve, syncDelay));
        if (startSequenceAbortRef.current) return;

        setIsSyncing(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (startSequenceAbortRef.current) return;

        setIsSyncing(false);
        setStartCountdown(3);
        let countdownValue = 3;
        const countdownInterval = setInterval(() => {
          countdownValue--;
          if (countdownValue <= 0) {
            clearInterval(countdownInterval);
            if (startSequenceAbortRef.current) return;
            setStartCountdown(null);

            setHasStarted(true);
            hasStartedRef.current = true;
            setTimerActive(true);
            isStartingGameRef.current = false;

            setTimeout(() => {
              if (hasStartedRef.current && !gameRef.current.isGameOver()) {
                triggerEngine(gameRef.current);
              }
            }, 150);

            if (lanStatusRef.current === "connected" && lanRoleRef.current === "host") {
              lanSendStateRef.current?.({
                hasStarted: true,
                fen: g.fen(),
                history: [],
                initialTimeMin: initialTimeMin,
                whiteTime: initialTimeMin * 60,
                blackTime: initialTimeMin * 60,
                whitePlayer: "human",
                blackPlayer: "human",
                boardOrientation: lanMyColorRef.current,
              });
            }
          } else {
            setStartCountdown(countdownValue);
          }
        }, 1000);
      } catch (err) {
        console.error("Error en startAfterSync:", err);
        setIsSyncing(false);
      }
    };

    startAfterSync();
  };

  const handleLanMoveReceived = useCallback((lanMove: LanMove) => {
    if (lanMove.move) {
      lastLocalMoveTimeRef.current = Date.now();
      const res = executeMove(lanMove.move, false, false, true);
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

  const handleLanStateReceived = useCallback((state: LanGameState | any) => {
    if (!state) return;
    const s = state;

    if (s._isControl) {
      const { action, data } = s;
      if (action === 'pause') {
        lanPauseGame(data, true);
      } else if (action === 'resume') {
        lanResumeGame(data, true);
      } else if (action === 'stop') {
        stopGame(true);
      } else if (action === 'reset') {
        if (data?.whitePlayer !== undefined) {
          setWhitePlayer(data.whitePlayer);
          whitePlayerRef.current = data.whitePlayer;
        }
        if (data?.blackPlayer !== undefined) {
          setBlackPlayer(data.blackPlayer);
          blackPlayerRef.current = data.blackPlayer;
        }
        if (data?.whiteEngineType !== undefined) {
          setWhiteEngineType(data.whiteEngineType);
          whiteEngineTypeRef.current = data.whiteEngineType;
        }
        if (data?.blackEngineType !== undefined) {
          setBlackEngineType(data.blackEngineType);
          blackEngineTypeRef.current = data.blackEngineType;
        }
        if (data?.boardOrientation !== undefined) {
          setBoardOrientation(data.boardOrientation);
        }
        resetGame(whitePlayerRef.current, blackPlayerRef.current, true);
      }
      return;
    }

    if (s.drawOffer === 'request') {
      setLanDrawRequest(true);
    } else if (s.drawOffer === 'accept') {
      const result = language === 'es' ? 'Tablas acordadas' : 'Draw by agreement';
      setGameResult(result);
      gameResultRef.current = result;
      setTimerActive(false);
      engineWhiteRef.current?.stop();
      engineBlackRef.current?.stop();
    } else if (s.drawOffer === 'reject') {
      alert(language === 'es' ? 'El oponente rechazó la oferta de tablas.' : 'Opponent rejected the draw offer.');
    }

    if (s.whiteTime !== undefined && Math.abs(whiteTimeRef.current - s.whiteTime) > 1) {
      setWhiteTime(s.whiteTime);
      whiteTimeRef.current = s.whiteTime;
    }
    if (s.blackTime !== undefined && Math.abs(blackTimeRef.current - s.blackTime) > 1) {
      setBlackTime(s.blackTime);
      blackTimeRef.current = s.blackTime;
    }

    const timeSinceLastMove = Date.now() - lastLocalMoveTimeRef.current;
    const isNewMove = s.history && Array.isArray(s.history) && s.history.length > historyRef.current.length;
    const isDueForSync = timeSinceLastMove > 1500;

    if (s.fen && s.fen !== gameRef.current.fen() && !moveFromRef.current && (isDueForSync || isNewMove)) {
      const newGame = new Chess(s.fen);
      setGame(newGame);
      gameRef.current = newGame;
      if (s.history && Array.isArray(s.history)) {
        setHistory(s.history);
        historyRef.current = s.history;
      }
    }

    if (s.hasStarted !== undefined) {
      if (s.hasStarted === true && !hasStartedRef.current && !s.isPreparing) {
        setIsConfigSidebarOpen(false);
        setShowMainScreen(false);
        setIsAdventureModeOpen(false);

        setHasStarted(true);
        hasStartedRef.current = true;
        setViewingMoveIndex(null);
        setGameResult(null);
        setGameResultDismissed(false);
        setTimerActive(true);
      } else if (s.hasStarted === false && hasStartedRef.current) {
        setHasStarted(false);
        hasStartedRef.current = false;
        setTimerActive(false);
        setSystemNotification(language === "es" ? "Partida detenida por el Host" : "Match stopped by Host");
        setTimeout(() => setSystemNotification(null), 3000);
      }
    }

    if (s.isPaused !== undefined && isPausedRef.current !== s.isPaused) {
      setIsPaused(s.isPaused);
      isPausedRef.current = s.isPaused;
      if (s.isPaused) setTimerActive(false);
      else if (hasStartedRef.current && !gameResultRef.current && !gameRef.current.isGameOver()) setTimerActive(true);
    }

    if (s.isStopped && hasStartedRef.current) {
      stopGame();
    }

    setLanIsPreparing(!!s.isPreparing);

    if (s.isPreparing && s.boardOrientation) {
      if (lanRole === "guest") {
        const guestColor = s.boardOrientation === "white" ? "black" : "white";
        lanSetMyColor(guestColor);
        setBoardOrientation(guestColor);
      } else {
        setBoardOrientation(s.boardOrientation as any);
      }
    }

    if (s.whitePlayer) {
      setWhitePlayer(s.whitePlayer as any);
      whitePlayerRef.current = s.whitePlayer as any;
    }
    if (s.blackPlayer) {
      setBlackPlayer(s.blackPlayer as any);
      blackPlayerRef.current = s.blackPlayer as any;
    }
    if (s.gameResult !== undefined) {
      setGameResult(s.gameResult);
    }
    if (s.tournament) {
      setTournament(s.tournament);
      tournamentRef.current = s.tournament;
    }
    if (s.tournamentWins) {
      setTournamentWins(s.tournamentWins);
    }
  }, [language, stopGame, resetGame]);

  const handleLanPlayerJoined = useCallback((_color: "white" | "black") => { }, []);
  const handleLanPlayerLeft = useCallback(() => {
    setGameResult(prev => {
      if (hasStartedRef.current && !prev) {
        setTimerActive(false);
        return language === "es" ? "Victoria por abandono (Desconexión)" : "Win by resignation (Disconnect)";
      }
      return prev;
    });
  }, [language]);

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
    pendingRequests: lanPendingJoinRequests,
    playerId: lanPlayerId,
    startHost: lanStartHost,
    joinHost: lanJoinHost,
    acceptJoinRequest: lanAcceptJoinRequest,
    rejectJoinRequest: lanRejectJoinRequest,
    sendMove: lanSendMove,
    sendState: lanSendState,
    sendControl: lanSendControl,

    disconnect: lanDisconnect,
    scanNetwork: lanScanNetwork,
    fetchPlayers: lanFetchPlayers,
    setMyColor: lanSetMyColor,
  } = useLanMultiplayer({
    onMoveReceived: handleLanMoveReceived,
    onStateReceived: handleLanStateReceived,
    onPlayerJoined: handleLanPlayerJoined,
    onPlayerLeft: handleLanPlayerLeft,
  });

  const lanPauseGame = useCallback(async (data?: any, isRemote = false) => {
    setIsPaused(true);
    isPausedRef.current = true;
    setTimerActive(false);
    if (!isRemote && lanSendControl) {
      lanSendControl("pause", data);
    }
  }, [lanSendControl]);

  const lanResumeGame = useCallback(async (data?: any, isRemote = false) => {
    setIsPaused(false);
    isPausedRef.current = false;
    if (hasStartedRef.current && !gameResultRef.current && !gameRef.current.isGameOver()) {
      setTimerActive(true);
    }
    if (!isRemote && lanSendControl) {
      lanSendControl("resume", data);
    }
  }, [lanSendControl]);

  const lanStopGameCompletely = useCallback(() => {
    if (lanSendControlRef.current) {
      lanSendControlRef.current("stop", { hasStarted: false });
    }
    stopGame(true);
  }, []);

  const lanStartNewGame = useCallback(async (data?: any) => {
    if (lanStatusRef.current !== "connected") {
      console.warn("[LAN] No estás conectado");
      return;
    }

    deleteAnalysisCache();

    if (lanSendControl) {
      lanSendControl("reset");
    }

    let nextColor: any = lanMyColorRef.current;
    if (lanPreferredColor === "random") {
      nextColor = lanMyColorRef.current === "white" ? "black" : "white";
      lanSetMyColor(nextColor);
    }

    if (lanSendState) {
      setLanIsPreparing(true);
      lanSendState?.({
        isPreparing: true,
        boardOrientation: nextColor,
        lanPreferredColor: lanPreferredColor,
        ...data
      });
    }
  }, [lanSendState, lanSendControl, deleteAnalysisCache, lanPreferredColor, lanSetMyColor]);

  useEffect(() => {
    lanSendMoveRef.current = lanSendMove;
  }, [lanSendMove]);

  useEffect(() => {
    lanSendStateRef.current = lanSendState;
  }, [lanSendState]);

  useEffect(() => {
    lanSendControlRef.current = lanSendControl;
  }, [lanSendControl]);

  useEffect(() => {
    lanStatusRef.current = lanStatus;
  }, [lanStatus]);

  useEffect(() => {
    lanRoleRef.current = lanRole;
  }, [lanRole]);

  useEffect(() => {
    lanOpponentConnectedRef.current = lanOpponentConnected;
  }, [lanOpponentConnected]);

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

  function startGame() {
    return startGameInternal({ preserveAdventure: !!activeAdventureEnemy });
  }

  // Modo Estudio: iniciar partida de estudio conservando el contexto del modo
  function startStudyModeGame(resetBoard?: boolean) {
    const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    let fenToUse = resetBoard
      ? INITIAL_FEN
      : (positionEditorFen || INITIAL_FEN);
    if (resetBoard) {
      setPositionEditorFen(INITIAL_FEN);
      setSelectedSparePiece(null);
      resetEditorHistoryRef.current(INITIAL_FEN);
    }

    // El motor oponente siempre juega el PRIMER movimiento:
    // con blancas -> turno negro; con negras -> turno blanco
    const engineTurn = freeModeColor === "white" ? "b" : "w";
    const fenParts = fenToUse.split(" ");
    if (fenParts.length >= 2) {
      fenToUse = [fenParts[0], engineTurn, ...fenParts.slice(2)].join(" ");
    }

    // Validar la posición personalizada ANTES de iniciar (evita que se cambie en silencio a la posición inicial)
    try {
      const testG = new Chess(fenToUse);
      const hasWhiteKing = testG.board().some(row => row.some(p => p?.type === 'k' && p.color === 'w'));
      const hasBlackKing = testG.board().some(row => row.some(p => p?.type === 'k' && p.color === 'b'));
      if (!hasWhiteKing || !hasBlackKing) {
        alert(language === "es"
          ? "La posición personalizada debe contener ambos reyes para poder jugar."
          : "The custom position must contain both kings to play.");
        return;
      }
      if (testG.isGameOver()) {
        alert(language === "es"
          ? "La posición personalizada ya está terminada (jaque mate o tablas). Ajusta la posición para poder jugar."
          : "The custom position is already finished (checkmate or draw). Adjust the position to play.");
        return;
      }
    } catch {
      alert(language === "es"
        ? "El FEN personalizado no es válido. Revísalo antes de jugar."
        : "The custom FEN is invalid. Please review it before playing.");
      return;
    }

    startGameInternal({
      freeMode: { engineType: freeModeEngineType, elo: freeModeElo, color: freeModeColor, fen: fenToUse },
    });
    setShowFreeMode(true);
    setFreeModeStage('playing');
  }

  const lanPreparingHandledRef = useRef(false);
  const [lanIsPreparing, setLanIsPreparing] = useState(false);

  useEffect(() => {
    if (lanIsPreparing && !lanPreparingHandledRef.current) {
      lanPreparingHandledRef.current = true;

      const handleLanPreparation = async () => {
        setBoardOrientation(lanMyColor as any);
        setWhitePlayer("human");
        setBlackPlayer("human");
        whitePlayerRef.current = "human";
        blackPlayerRef.current = "human";
        setIsConfigSidebarOpen(false);
        setShowMainScreen(false);
        setIsAdventureModeOpen(false);
        setIsSyncing(true);
        playAudio("connect");

        await new Promise(resolve => setTimeout(resolve, 2000));

        setIsSyncing(false);
        setStartCountdown(3);
        let count = 3;
        const interval = setInterval(() => {
          count--;
          if (count <= 0) {
            clearInterval(interval);
            setStartCountdown(null);

            lanMyColorRef.current = lanMyColor;

            if (lanRole === "host") {
              startGame();
            }
          } else {
            setStartCountdown(count);
          }
        }, 1000);
      };

      handleLanPreparation();
    }

    if (!lanIsPreparing) {
      lanPreparingHandledRef.current = false;
    }
  }, [lanIsPreparing, lanMyColor, lanRole, startGame, playAudio]);

  const lanConnectedSoundPlayedRef = useRef(false);
  const lanErrorSoundPlayedRef = useRef(false);

  useEffect(() => {
    if (lanStatus === "connected" && !lanConnectedSoundPlayedRef.current) {
      lanConnectedSoundPlayedRef.current = true;
    }
    if (lanStatus !== "connected") {
      lanConnectedSoundPlayedRef.current = false;
    }

    if (lanStatus !== "disconnected" && lanStatus !== "error") {
      if (window.innerWidth > 768) {
        setRightTab("history");
      }
      setIsNeuralVisionEnabled(false);
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
    lanStatusRef.current = lanStatus as any;
    lanMyColorRef.current = lanMyColor;

    if (lanStatus === "connected") {
      setBoardOrientation(lanMyColor as any);

      if (lanRole === "guest") {
        (async () => {
          const state = await lanFetchPlayers();
          if (state) {
            if (state.hasStarted) {
              setHasStarted(true);
              hasStartedRef.current = true;
            }
            if (state.fen) {
              const g = new Chess(state.fen);
              setGame(g);
              gameRef.current = g;
            }
            if (state.history && Array.isArray(state.history)) {
              setHistory(state.history);
            }
            if (typeof state.whiteTime === "number") {
              setWhiteTime(state.whiteTime);
              whiteTimeRef.current = state.whiteTime;
            }
            if (typeof state.blackTime === "number") {
              setBlackTime(state.blackTime);
              blackTimeRef.current = state.blackTime;
            }
          }
        })();
      }
      setWhitePlayer("human");
      setBlackPlayer("human");
      whitePlayerRef.current = "human";
      blackPlayerRef.current = "human";
    }
  }, [lanStatus, lanMyColor, lanRole, lanFetchPlayers]);

  useEffect(() => {
    if (lanStatus !== "connected" || lanRole !== "host" || !hasStarted) return;

    const syncInterval = setInterval(() => {
      if (lanStatus === "connected" && hasStarted && !gameResultRef.current) {
        const isMyTurn = gameRef.current.turn() === (lanMyColorRef.current?.[0]);
        const timeSinceLastMove = Date.now() - lastLocalMoveTimeRef.current;

        lanSendState?.({
          fen: (isMyTurn || timeSinceLastMove > 10000) ? gameRef.current.fen() : undefined,
          history: (isMyTurn || timeSinceLastMove > 10000) ? historyRef.current : undefined,
          whiteTime: whiteTimeRef.current,
          blackTime: blackTimeRef.current,
          hasStarted: true,
          isPaused: isPausedRef.current,
          whitePlayer: whitePlayerRef.current,
          blackPlayer: blackPlayerRef.current,
          boardOrientation: lanMyColorRef.current,
          tournament: tournamentRef.current,
        });
      }
    }, 500);

    return () => clearInterval(syncInterval);
  }, [lanRole, lanStatus, hasStarted, lanSendState]);

  resetGameRef.current = resetGame;

  useEffect(() => {
    if (!isGuestMode) localStorage.setItem("chess_adventureProgress", JSON.stringify(adventureProgress));
  }, [adventureProgress, isGuestMode]);

  const saveCurrentGame = () => {
    if (!hasStartedRef.current) return;

    const snapshot: SavedGameState = {
      pgn: gameRef.current.pgn(),
      whitePlayer,
      blackPlayer,
      whiteEngineType,
      blackEngineType,
      whiteEngineName,
      blackEngineName,
      whiteAiDepth,
      blackAiDepth,
      whiteTime,
      blackTime,
      initialTimeMin,
      initialTimeInc,
      activeAdventureEnemy: currentGameMode === "adventure" ? activeAdventureEnemy : null,
      moveEvaluations,
      moveTimes,
      whiteObsidianConfig,
      blackObsidianConfig,
    };

    if (currentGameMode === "normal") {
      setSavedNormalGame(snapshot);
      if (notificationConfig === "all" || notificationConfig === "normal") {
        setSystemNotification("Juego normal pausado y guardado en segundo plano.");
      }
    } else {
      setSavedAdventureGame(snapshot);
      if (notificationConfig === "all" || notificationConfig === "adventure") {
        setSystemNotification("Partida de aventura pausada y guardada en segundo plano.");
      }
    }
  };

  const loadGameState = (snapshot: SavedGameState | null, targetMode: "normal" | "adventure") => {
    setCurrentGameMode(targetMode);

    if (!snapshot) {
      if (targetMode === "normal") {
        setWhitePlayer("human");
        setBlackPlayer("ai");
        setActiveAdventureEnemy(null);
        setBlackEngineType("stockfish");
        setBlackEngineName("");
        setWhiteEngineName("");
      }
      resetGameRef.current?.();
      return;
    }

    const newGame = new Chess();
    newGame.loadPgn(snapshot.pgn);
    setGame(newGame);
    gameRef.current = newGame;
    setHistory(newGame.history());
    historyRef.current = newGame.history();

    setWhitePlayer(snapshot.whitePlayer);
    setBlackPlayer(snapshot.blackPlayer);
    whitePlayerRef.current = snapshot.whitePlayer;
    blackPlayerRef.current = snapshot.blackPlayer;
    setWhiteEngineType(snapshot.whiteEngineType);
    setBlackEngineType(snapshot.blackEngineType);
    setWhiteEngineName(snapshot.whiteEngineName);
    setBlackEngineName(snapshot.blackEngineName);
    setWhiteAiDepth(snapshot.whiteAiDepth);
    setBlackAiDepth(snapshot.blackAiDepth);
    setWhiteTime(snapshot.whiteTime);
    setBlackTime(snapshot.blackTime);
    setInitialTimeMin(snapshot.initialTimeMin);
    setInitialTimeInc(snapshot.initialTimeInc);
    setActiveAdventureEnemy(targetMode === "adventure" ? snapshot.activeAdventureEnemy : null);
    setMoveEvaluations(snapshot.moveEvaluations);
    setMoveTimes(snapshot.moveTimes);
    if (snapshot.whiteObsidianConfig) {
      setwhiteObsidianConfig(snapshot.whiteObsidianConfig);
    }
    if (snapshot.blackObsidianConfig) {
      setblackObsidianConfig(snapshot.blackObsidianConfig);
    }

    setIsPaused(true);
    setHasStarted(true);
    hasStartedRef.current = true;

    setTimeout(() => {
      recreateEngines();
    }, 100);
  };

  const handleAdventureStartBattle = (enemy: AdventureEnemy, playerElo: number) => {
    // ⚡ CRÍTICO: Limpiar sesión anterior completamente antes de iniciar aventura
    cleanupPreviousSession();

    setCurrentGameMode("adventure");

    setWhitePlayer("human");
    setBlackPlayer("ai");
    whitePlayerRef.current = "human";
    blackPlayerRef.current = "ai";

    const newEngineType = enemy.engineType === "edd" ? "edd" : enemy.engineType === "atlas" ? "atlas" : "stockfish";
    blackEngineTypeRef.current = newEngineType;
    setBlackEngineType(newEngineType);

    setBlackAiDepth(enemy.depth);
    setBlackEngineName(enemy.name);
    setWhiteEngineName("");
    setBoardOrientation("white");
    setActiveAdventureEnemy(enemy);
    setIsAdventureModeOpen(false);
    setRightTab("lore");
    if (!isGuestMode) setAdventureProgress(prev => ({ ...prev, playerElo }));

    setIsSyncing(true);
    recreateEngines().then(() => {
      setTimeout(() => {
        startGameInternal({ preserveAdventure: true });
      }, 150);
    }).catch(err => {
      console.error("[App] Error recreando motores para aventura:", err);
      setTimeout(() => {
        startGameInternal({ preserveAdventure: true });
      }, 150);
    });
  };

  const exitAdventure = () => {
    setShowAdventureExitConfirm(true);
  };

  const confirmExitAdventure = () => {
    setShowAdventureExitConfirm(false);

    engineWhiteRef.current?.quit();
    engineBlackRef.current?.quit();
    engineWhiteRef.current = null;
    engineBlackRef.current = null;

    setHasStarted(false);
    hasStartedRef.current = false;
    setTimerActive(false);
    setIsPaused(false);
    isPausedRef.current = false;

    setActiveAdventureEnemy(null);
    setSavedAdventureGame(null);
    setRightTab(lanStatusRef.current !== "disconnected" && window.innerWidth > 768 ? "history" : "neural");

    setWhiteEngineName("");
    setBlackEngineName("");
    setWhitePlayer("human");
    setBlackPlayer("ai");
    whitePlayerRef.current = "human";
    blackPlayerRef.current = "ai";
    setWhiteEngineType("stockfish");
    setBlackEngineType("stockfish");
    whiteEngineTypeRef.current = "stockfish";
    blackEngineTypeRef.current = "stockfish";

    const freshGame = new Chess();
    setGame(freshGame);
    setHistory([]);
    setInitialFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    setViewingMoveIndex(-1);
    setMoveFrom("");
    setIsLoadedPgn(false);

    setIsConfigSidebarOpen(false);
    setIsAdventureModeOpen(false);
    setIsAnalyzing(false);
    setIsAutoPlaying(false);
    setShowAdventureExitConfirm(false);
    setCurrentGameMode("normal");
    setShowMainScreen(true);

    if (notificationConfig === "all" || notificationConfig === "normal") {
      setSystemNotification(language === "es" ? "Has salido del Modo Aventura. Partida finalizada." : "Exited Adventure Mode. Game terminated.");
    }
  };

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

          try {
            const match = cleanPgn.match(/(\[.*?\]\s*)*(1\.\s+[a-zA-Z0-9\-+\#=].*?(?:1-0|0-1|1\/2-1\/2|\*))/s);
            if (match) {
              newGame.loadPgn(match[0]);
              return true;
            }
          } catch (e) { }

          try {
            const movesOnlyMatch = cleanPgn.match(/1\.\s+[a-zA-Z0-9\-+\#=].*/s);
            if (movesOnlyMatch) {
              const flatMoves = movesOnlyMatch[0].replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
              newGame.loadPgn(flatMoves);
              return true;
            }
          } catch (e) { }

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
                try {
                  tempGame.move(token);
                } catch (e) {
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
          setInitialFen(newGame.header().FEN || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
          setHistory(newGame.history());
          setMoveFrom("");
          setHasStarted(true);
          hasStartedRef.current = true;
          setTimerActive(false);
          setIsConfigSidebarOpen(false);
          setIsPaused(false);
          isPausedRef.current = false;
          setIsLoadedPgn(true);
          setViewingMoveIndex(-1);
          setWhitePlayer("human");
          setBlackPlayer("human");
          whitePlayerRef.current = "human";
          blackPlayerRef.current = "human";

          const whitePlayerName = newGame.header().White || "";
          const blackPlayerName = newGame.header().Black || "";
          if (whitePlayerName) setWhiteEngineName(whitePlayerName);
          if (blackPlayerName) setBlackEngineName(blackPlayerName);

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

  const downloadPgnDataOnly = () => {
    const tempGame = new Chess();
    tempGame.header("Event", "GM-3000 Professional Data");
    tempGame.header("Site", "GM-3000");
    tempGame.header("Date", new Date().toISOString().slice(0, 10).replace(/-/g, "."));
    tempGame.header("Round", "1");
    tempGame.header("White", whitePlayer === "human" ? (getWhitePlayerName() || "Humano") : "AI");
    tempGame.header("Black", blackPlayer === "human" ? (getBlackPlayerName() || "Humano") : "AI");

    history.forEach((move) => {
      tempGame.move(move);
    });

    const pgn = tempGame.pgn();
    const blob = new Blob([pgn], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profesional-${new Date().toISOString().slice(0, 10)}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPgnApp = () => {
    const tempGame = new Chess();
    tempGame.header("Event", "GM-3000 App Session");
    tempGame.header("Site", "GM-3000");
    tempGame.header("Date", new Date().toISOString().slice(0, 10).replace(/-/g, "."));
    tempGame.header("Round", "1");
    tempGame.header("White", whitePlayer === "human" ? (getWhitePlayerName() || "Humano") : "AI");
    tempGame.header("Black", blackPlayer === "human" ? (getBlackPlayerName() || "Humano") : "AI");
    tempGame.header("TimeControl", `${initialTimeMin * 60}+${initialTimeInc}`);

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
      const elapsed = moveElapsedTimes[i];
      if (elapsed !== undefined && elapsed >= 0) {
        const em = Math.floor(elapsed / 60);
        const es = elapsed % 60;
        commentStr += (commentStr ? " " : "") + `{Tiempo: ${em}:${es.toString().padStart(2, '0')}}`;
      }
      if (moveComments[i]) {
        commentStr += (commentStr ? " " : "") + (typeof moveComments[i] === "string" ? moveComments[i] : (moveComments[i] as any)?.comment || "");
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
    a.download = `gm3000-app-${new Date().toISOString().slice(0, 10)}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyPgnAsTxt = () => {
    const tempGame = new Chess();
    tempGame.header("Event", "GM-3000 App Session");
    tempGame.header("Site", "GM-3000");
    tempGame.header("Date", new Date().toISOString().slice(0, 10).replace(/-/g, "."));
    tempGame.header("Round", "1");
    tempGame.header("White", whitePlayer === "human" ? (getWhitePlayerName() || "Humano") : "AI");
    tempGame.header("Black", blackPlayer === "human" ? (getBlackPlayerName() || "Humano") : "AI");
    tempGame.header("TimeControl", `${initialTimeMin * 60}+${initialTimeInc}`);
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
      const elapsed = moveElapsedTimes[i];
      if (elapsed !== undefined && elapsed >= 0) {
        const em = Math.floor(elapsed / 60);
        const es = elapsed % 60;
        commentStr += (commentStr ? " " : "") + `{Tiempo: ${em}:${es.toString().padStart(2, '0')}}`;
      }
      if (moveComments[i]) {
        commentStr += (commentStr ? " " : "") + (typeof moveComments[i] === "string" ? moveComments[i] : (moveComments[i] as any)?.comment || "");
      }
      if (commentStr) {
        tempGame.setComment(commentStr);
      }
    });
    const pgn = tempGame.pgn();
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
    return pgn
      .replace(/<[^>]*>/g, '')
      .replace(/\[\w+\s+""\]/g, '')
      .trim();
  };

  const validateMoveIntegrity = (pgn: string) => {
    const tempGame = new Chess();
    let movesOnly = pgn.replace(/\[.*?\]/gs, '').replace(/\{.*?\}/gs, '').trim();
    movesOnly = movesOnly.replace(/\$\d+/g, '');
    movesOnly = movesOnly.replace(/\d+\.+/g, '');

    const tokens = movesOnly.split(/\s+/).filter(t => t && !t.includes('-') && !t.includes('/'));

    let moveCount = 0;
    for (const token of tokens) {
      try {
        const move = tempGame.move(token);
        if (!move) throw new Error("Invalid move");
        moveCount++;
      } catch (e) {
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
        name: validation.isValid ? name : `âa ï¸  ${name} (Error)`,
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
        const report = parsePgnWithLimit(content, 50);
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
      setGame(newGame);
      gameRef.current = newGame;
      setInitialFen(newGame.header().FEN || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
      setHistory(newGame.history());
      setMoveFrom("");
      setHasStarted(true);
      hasStartedRef.current = true;
      setTimerActive(false);
      setIsConfigSidebarOpen(false);
      setIsPaused(false);
      setIsLoadedPgn(true);

      const whitePlayerName = newGame.header().White || "";
      const blackPlayerName = newGame.header().Black || "";
      if (whitePlayerName) setWhiteEngineName(whitePlayerName);
      if (blackPlayerName) setBlackEngineName(blackPlayerName);
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
      // @ts-ignore
      else if (game.isThreefoldRepetition() && game.getRepetitionCount && game.getRepetitionCount() >= 5) gameStatus = "Empate por Quíntuple Repetición";
      else if (game.isThreefoldRepetition()) gameStatus = "Empate (Reclamable)";
      else gameStatus = "Empate";
      isGameOver = true;
    } else {
      gameStatus = `Juegan las ${game.turn() === "w" ? "Blancas" : "Negras"}`;
    }
  } else {
    isGameOver = true;
  }

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

  const kingInCheckSquare = useMemo(() => {
    const activeKingGame = isBoardAnalysisMode && analysisGameRef.current ? analysisGameRef.current : game;
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
    if (!activeKingGame.inCheck()) return null;
    const turn = activeKingGame.turn();
    const board = activeKingGame.board();
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === turn)
          return String.fromCharCode(97 + c) + String(8 - r);
      }
    return null;
  }, [game, viewingMoveIndex, historyFens, isBoardAnalysisMode, analysisPosition]);

  const effectiveIsAutoRotate = activeAdventureEnemy ? false : isAutoRotate;

  const chessboardConfig = useMemo(() => {
    const squareStyles: Record<string, React.CSSProperties> = {};

    // Forzar visualización del último movimiento
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

    if (moveFrom) {
      squareStyles[moveFrom] = {
        ...squareStyles[moveFrom],
        backgroundColor: "rgba(255, 255, 0, 0.5)",
      };
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
        const tokens = game.fen().split(' ');
        tokens[1] = tokens[1] === 'w' ? 'b' : 'w';
        tokens[3] = '-';
        const tempG = new Chess(tokens.join(' '));
        tempG.moves({ verbose: true }).forEach(m => {
          if (threatRadarMode === "global" && game.get(m.to as any)) {
            squareStyles[m.to] = { ...(squareStyles[m.to] || {}), boxShadow: "inset 0 0 8px red" };
          } else if (threatRadarMode !== "global") {
            squareStyles[m.to] = { ...(squareStyles[m.to] || {}), backgroundColor: "rgba(255, 0, 0, 0.2)" };
          }
        });
      } catch (e) { }
    }

    const currentMoveIdx = viewingMoveIndex !== null ? viewingMoveIndex : (historyFens.length > 0 ? historyFens.length - 1 : 0);
    currentMoveIdxRef.current = currentMoveIdx;
    return {
      position: showFreeMode && !hasStarted ? positionEditorFen : (isBoardAnalysisMode && analysisPosition ? analysisPosition : (viewingMoveIndex !== null ? (historyFens[viewingMoveIndex + 1] || game.fen()) : game.fen())),
      customPieces: undefined,
      onPieceDrop: onPieceDrop,
      onSquareClick: onSquareClick,
      onPieceClick: ({ isSparePiece, piece }: { isSparePiece: boolean; piece: { pieceType: string } }) => {
        if (isSparePiece && showFreeMode && !hasStarted) {
          setSelectedSparePiece(prev => prev === piece.pieceType ? null : piece.pieceType);
        }
      },
      customArrows: moveArrowsRef.current[currentMoveIdxRef.current] || [],
      onArrowsChange: onArrowsChangeRef.current,
      squareStyles,
      boardOrientation: effectiveIsAutoRotate ? (game.turn() === "b" ? "black" : "white") : boardOrientation,
      darkSquareStyle: { backgroundColor: ({ gray: "#4b5563", chess: "#4b5563", neutral: "#111827", classic: "#b58863", green: "#2d5a27", blue: "#1e3a8a", purple: "#4c1d95", gothic: "#1a1a1a", neural: "#06161a" } as Record<string, string>)[boardTheme] || "#4b5563" },
      lightSquareStyle: { backgroundColor: ({ gray: "#d1d5db", chess: "#d1d5db", neutral: "#1f2937", classic: "#f0d9b5", green: "#4a7a3c", blue: "#3b82f6", purple: "#7c3aed", gothic: "#2d2d2d", neural: "#0d2d2d" } as Record<string, string>)[boardTheme] || "#d1d5db" },
      animationDurationInMs: effectiveIsAutoRotate ? (autoRotateSpeed === "slide" ? 400 : 50) : 50,
      showNotation: true,
      allowDragOffBoard: showFreeMode && !hasStarted,
    };
  }, [game, boardOrientation, viewingMoveIndex, boardTheme, preMoves, kingInCheckSquare, isThreatRadarActive, threatRadarMode, showLastMove, moveFrom, showLegalMoves, onPieceDrop, onSquareClick, isBoardAnalysisMode, analysisPosition, showFreeMode, hasStarted, positionEditorFen]);

  const effectiveBoardSize = boardSize;

  const boardSizeClassWrapper = {
    small: "w-[95vw] sm:w-[320px] md:w-[380px] lg:w-[420px] xl:w-[480px]",
    medium: "w-[95vw] sm:w-[360px] md:w-[420px] lg:w-[480px] xl:w-[500px]",
    large: "w-[95vw] sm:w-[520px] md:w-[640px] lg:w-[780px] xl:w-[920px]",
    fill: "w-full"
  }[effectiveBoardSize];

  const boardSizeClassInner = {
    small: "w-full max-w-full sm:max-w-[320px] md:max-w-[380px] lg:max-w-[420px]",
    medium: "w-full max-w-full sm:max-w-[360px] md:max-w-[420px] lg:max-w-[480px]",
    large: "w-full max-w-full sm:max-w-[520px] md:max-w-[640px] lg:max-w-[780px] xl:max-w-[920px]",
    fill: "w-full max-w-full"
  }[effectiveBoardSize];

  const calcBoardWidth = useCallback((size: string, fullscreen: boolean, gameMode?: string, headerVisible: boolean = true) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw <= 768;
    // Player bars (~40px each = 80px) + header (~50px) + main padding (~8px)
    const chrome = headerVisible ? 145 : 95;
    const availableH = vh - chrome;
    // On desktop with sidebar open, subtract sidebar width + gap
    const sidebarW = (!isMobile && isRightPanelOpen) ? 400 : 0;
    const availableW = vw - sidebarW - 20;
    const boardSize = Math.min(availableW, availableH);
    if (size === "fill") {
      return Math.round(boardSize);
    }
    const bases: Record<string, number> = { small: 320, medium: 360, large: 520, fill: 400 };
    const base = bases[size] || 480;
    return Math.round(Math.min(base, boardSize));
  }, [isRightPanelOpen]);

  const [boardWidthPx, setBoardWidthPx] = useState(() => calcBoardWidth(effectiveBoardSize, isFullscreen, currentGameMode, isHeaderVisible));

  useEffect(() => {
    const recalc = () => setBoardWidthPx(calcBoardWidth(effectiveBoardSize, isFullscreen, currentGameMode, isHeaderVisible));
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [effectiveBoardSize, isFullscreen, currentGameMode, isHeaderVisible, calcBoardWidth]);

  const getPlayerLabel = (color: "w" | "b") => {
    const colorLabel = language === "es" ? (color === "w" ? "Blancas" : "Negras") : (color === "w" ? "White" : "Black");

    if (lanStatus === "connected") {
      const pColor = color === "w" ? "white" : "black";
      const player = lanConnectedPlayers.find(p => p.color === pColor);
      if (player && player.name) return `${player.name} (${colorLabel})`;
      if (lanMyColor === pColor && effectivePlayerName) return `${effectivePlayerName} (${colorLabel})`;
      return colorLabel;
    }

    const isHuman = color === "w" ? whitePlayer === "human" : blackPlayer === "human";
    const engineType = color === "w" ? whiteEngineType : blackEngineType;
    const customName = color === "w" ? whiteEngineName : blackEngineName;
    const depth = color === "w" ? whiteAiDepth : blackAiDepth;

    if (isHuman) {
      const name = (color === "w" ? getWhitePlayerName() : getBlackPlayerName()) || (language === "es" ? "Humano" : "Human");
      return `${name} (${colorLabel})`;
    }

    const elo = getEloRating(depth, engineType);
    const baseName = customName || (engineType === "atlas" ? "Atlas.1" : engineType === "edd" ? "Nexus" : engineType === "obsidian" ? "Obsidian" : engineType === "obsidian" ? "DxA.47" : engineType.startsWith("maia") ? "Maia: " + engineType.substring(4) : engineType === "ailed" ? "Ailed" : "Stockfish");

    const displayElo = (currentGameMode === "adventure" && !showEnemyElo) ? "" : ` (${elo})`;
    return `${baseName}${displayElo} - ${colorLabel}`;
  };

  return (
    <div ref={appContainerRef} style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' } as React.CSSProperties} className={cn("flex flex-col font-sans overflow-x-hidden relative transition-colors duration-500", showMainScreen ? "min-h-[100vh] overflow-y-auto" : "h-screen overflow-hidden", currentGameMode === "adventure" ? "bg-[#0f1115]" : getThemeClasses())}>
      {/* Guest mode indicator bar */}
      {isGuestMode && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 py-2 px-4" style={{ background: "linear-gradient(90deg, rgba(180,120,30,0.15), rgba(180,120,30,0.25), rgba(180,120,30,0.15))", borderBottom: "1px solid rgba(180,120,30,0.3)" }}>
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
            {language === "es" ? "Modo Invitado" : "Guest Mode"}
          </span>
          <span className="text-[8px] text-amber-600 hidden sm:inline">
            {language === "es" ? "— Los resultados no se guardan" : "— Results are not saved"}
          </span>
          <button
            onClick={() => setIsGuestMode(false)}
            className="ml-2 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-500/20 transition-colors border border-amber-600/30"
          >
            {language === "es" ? "Salir" : "Exit"}
          </button>
        </div>
      )}
      {lanDrawRequest && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">{language === 'es' ? 'Oferta de Tablas' : 'Draw Offer'}</h3>
            <p className="text-slate-300 mb-6">{language === 'es' ? 'El oponente te ofrece tablas por mutuo acuerdo. ¿Aceptas?' : 'The opponent offers a draw by mutual agreement. Do you accept?'}</p>
            <div className="flex gap-4">
              <button onClick={() => {
                setLanDrawRequest(false);
                lanSendStateRef.current?.({ drawOffer: 'reject' });
              }} className="flex-1 py-2 px-4 rounded-lg font-bold bg-slate-700 hover:bg-slate-600 text-white transition-all">
                {language === 'es' ? 'Rechazar' : 'Reject'}
              </button>
              <button onClick={() => {
                setLanDrawRequest(false);
                lanSendStateRef.current?.({ drawOffer: 'accept' });
                const result = language === 'es' ? 'Tablas acordadas' : 'Draw by agreement';
                setGameResult(result);
                gameResultRef.current = result;
                setTimerActive(false);
                engineWhiteRef.current?.stop();
                engineBlackRef.current?.stop();
              }} className="flex-1 py-2 px-4 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-500/20">
                {language === 'es' ? 'Aceptar' : 'Accept'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Overlay del Modo Aventura ÔÜíLas 3000 Noches (Movido arriba para prioridad) */}

      {/* Controles de ventana personalizados removidos - titleBarOverlay de Electron los maneja */}

      {/* Pantalla Principal (Landing) */}
      {showMainScreen && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center bg-[#020408] overflow-hidden">
          {/* Status badge moved to Configuración clásica para evitar mostrarlo en el home principal. Si este texto vuelve a aparecer en el landing, revisar el panel de configuración. */}

          {/* Fondo Premium (prefiere FhImg si existe) */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0408] via-[#020408] to-[#000000]">
            {/* Si hay un asset fh.* prefijado, mostrarlo (video o imagen) */}
            {FhImg ? (
              (FhImg.match(/\.mp4$|\.webm$|\.ogg$/i)) ? (
      <>
      <video
        ref={bgVideoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        controls={false}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 w-full h-full object-cover opacity-100"
        style={{ userSelect: 'none' }}
        onCanPlay={() => {
          setIsVideoReady(true);
          triggerHomeAnimation();
        }}
        onTimeUpdate={(e) => {
          const v = e.target as HTMLVideoElement;
          if (!v.duration || isNaN(v.duration)) return;
          const remaining = v.duration - v.currentTime;
          setShowBgLightning(remaining > 0 && remaining < 2.5);
        }}
        onEnded={() => setShowBgLightning(false)}
        onError={(e) => { console.error("[GM3000] Video error:", e.nativeEvent, "src:", (e.target as HTMLVideoElement).currentSrc); }}
      >
        <source src={FhVideoDirect} type="video/mp4" />
      </video>
      {showBgLightning && (
        <div
          className="absolute inset-0 z-10 pointer-events-none animate-lightning-flash-bg"
          style={{
            background: "radial-gradient(ellipse at 50% 30%, rgba(180,200,255,0.5) 0%, rgba(100,130,255,0.2) 35%, transparent 70%)",
            mixBlendMode: "screen",
          }}
        />
      )}
      </>
              ) : FhImg.match(/\.gif$/i) ? (
                <img
                  src={FhImg}
                  alt=""
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="absolute inset-0 w-full h-full object-cover opacity-100"
                  style={{ userSelect: 'none' }}
                  onLoad={triggerHomeAnimation}
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{ backgroundImage: `url(${FhImg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(40px)' }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <img src={FhImg} style={{ display: 'none' }} onLoad={triggerHomeAnimation} />
                </div>
              )
            ) : (
              <div className="absolute inset-0 opacity-15" style={{ backgroundImage: `url(${BannerImg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(150px)' }}>
                 <img src={BannerImg} style={{ display: 'none' }} onLoad={triggerHomeAnimation} />
              </div>
            )}
            {/* Gradientes dinámicos */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(20,184,166,0.25)_0%,transparent_40%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(217,119,6,0.15)_0%,transparent_40%)]" />
            {/* Part├¡culas mejoradas */}
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-float"
                style={{
                  width: `${2 + Math.random() * 4}px`,
                  height: `${2 + Math.random() * 4}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  background: i % 2 === 0 ? 'rgba(20,184,166,0.3)' : 'rgba(217,119,6,0.2)',
                  boxShadow: i % 2 === 0 ? '0 0 8px rgba(20,184,166,0.4)' : '0 0 8px rgba(217,119,6,0.3)',
                  animationDuration: `${15 + Math.random() * 25}s`,
                  animationDelay: `${-Math.random() * 25}s`
                }}
              />
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center justify-between h-full w-full max-w-6xl px-4 md:px-6 py-6 md:py-12">
            {/* Logo principal con animación orbital */}
            <div className={`flex flex-col items-center gap-3 shrink-0 relative mt-4 md:mt-8 transition-opacity duration-500 ${homeLogoAnimating ? 'opacity-100' : 'opacity-0'}`}>
              {/* Anillo orbital animado alrededor del logo */}
              <div className="relative flex items-center justify-center">
                {/* Resplandores oscuros giratorios */}
                <div className="absolute w-[140%] h-[140%] rounded-full border border-teal-900/40 animate-[spin_12s_linear_infinite]" />
                <div className="absolute w-[160%] h-[160%] rounded-full border border-amber-900/30 animate-[spin_18s_linear_infinite_reverse]" />
                {/* Puntos orbitales */}
                <div className="absolute w-[140%] h-[140%] animate-[spin_8s_linear_infinite]">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-teal-500/60 shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
                </div>
                <div className="absolute w-[160%] h-[160%] animate-[spin_14s_linear_infinite_reverse]">
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500/60 shadow-[0_0_6px_rgba(217,119,6,0.8)]" />
                </div>
        {/* Glow de fondo oscuro */}
        <div className="absolute inset-0 rounded-full bg-black/30 blur-2xl" />
        {/* Reflejo de luz rojiza */}
        <div className="absolute top-[15%] right-0 md:-right-4 w-1/2 h-1/2 rounded-full bg-red-600/50 blur-[40px] pointer-events-none animate-pulse" style={{ animationDuration: '3s' }} />
        {/* Logo */}
        <img
          src={LogoHomeImg}
          alt="GM-3000"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          style={{ userSelect: 'none' }}
          className="relative h-[24vh] sm:h-[30vh] md:h-[40vh] max-h-80 object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.9)] hover:drop-shadow-[0_0_50px_rgba(20,184,166,0.5)] transition-all duration-700 hover:scale-110 cursor-default"
        />
              </div>
                 </div>
            </div>

            <div className="w-full max-w-6xl my-4 mt-8 md:mt-12 px-2 flex flex-col md:flex-row gap-3 md:gap-4 place-items-center">
              {/* Botones principales: Clásico y Aventura */}
              <div className="grid grid-cols-2 gap-3 md:gap-4 flex-1">
                {/* Botón Modo Clásico */}
                <div className="flex flex-col items-center group">
<button
                     onClick={() => {
                       console.log("[GM3000] Modo Clásico click - before cleanup");
                       cleanupPreviousSession();
                       console.log("[GM3000] Modo Clásico click - after cleanup, opening sidebar");
                       setActiveAdventureEnemy(null);
                       setShowMainScreen(false);
                       setIsConfigSidebarOpen(true);
                       setCurrentGameMode("normal");
                       setIsAdventureModeOpen(false);
                       setIsHeaderVisible(true);
                       setShowFreeMode(true);
                       setPositionEditorFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
                       setSelectedSparePiece(null);
                       resetEditorHistoryRef.current();
                     }}
                     onMouseEnter={() => playAudio("hover_mode")}
                    className="relative flex items-center justify-center bg-transparent border-none outline-none transition-all duration-300 hover:scale-[1.12] active:scale-[0.98] rounded-2xl min-h-[140px] md:min-h-[200px] lg:min-h-[240px] animate-slide-in-left overflow-hidden w-full"
                  >
                      <img
                        src={SelecNormalImg}
                        alt="Modo Clásico"
                        className="relative z-10 w-2/3 object-contain opacity-50 group-hover:opacity-100 transition-all duration-500 pointer-events-none"
                      />
                      <span className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none">
                        <span className="bg-black/80 px-3 py-1.5 rounded-lg text-sm md:text-base font-black tracking-widest text-blue-400 whitespace-nowrap backdrop-blur-sm" style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>modo clásico</span>
                      </span>
                  </button>
                </div>

                {/* Botón Modo Aventura */}
                <div className="flex flex-col items-center group">
                  <button
                    onClick={() => {
                      cleanupPreviousSession();
                      setActiveAdventureEnemy(null);
                      setCurrentGameMode("adventure");
                      setIsAdventureModeOpen(true);
                      setShowMainScreen(false);
                      setIsHeaderVisible(true);
                    }}
                    onMouseEnter={() => playAudio("hover_mode")}
                    className="relative flex items-center justify-center bg-transparent border-none outline-none transition-all duration-300 hover:scale-[1.12] active:scale-[0.98] rounded-2xl min-h-[140px] md:min-h-[200px] lg:min-h-[240px] animate-slide-in-right overflow-hidden w-full"
                  >
                      <img
                        src={SelecAventuraImg}
                        alt="Modo Aventura"
                        className="relative z-10 w-2/3 object-cover opacity-50 group-hover:opacity-100 transition-all duration-500 pointer-events-none"
                      />
                      <span className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none">
                        <span className="bg-black/80 px-3 py-1.5 rounded-lg text-sm md:text-base font-black tracking-widest text-amber-400 whitespace-nowrap backdrop-blur-sm" style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>modo aventura</span>
                      </span>
                  </button>
                </div>
              </div>

              {/* Recurso para Jugadores con ramas a la derecha */}
              <div className="flex place-items-center gap-0 animate-slide-in-right-delayed">
                {/* Botón principal */}
                <div className="flex flex-col items-center justify-center group">
                  <button
                    onClick={() => {
                      playAudio("hover_mode");
                      setShowRecursosJugadores(!showRecursosJugadores);
                    }}
                    onMouseEnter={() => playAudio("hover_mode")}
                    className="relative flex items-center justify-center bg-transparent border-none outline-none transition-all duration-300 hover:scale-[1.12] active:scale-[0.98] rounded-2xl min-h-[140px] md:min-h-[200px] lg:min-h-[240px] w-[180px] md:w-[200px] flex-shrink-0 overflow-hidden"
                  >
                    <img
                      src={RecursosJugadoresBtnImg}
                      alt="Recurso para Jugadores"
                      draggable={false}
                      className="relative z-10 w-full h-full object-contain opacity-25 group-hover:opacity-100 transition-all duration-500 pointer-events-none"
                    />
                    <span className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none">
                      <span className="bg-black/80 px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black tracking-widest text-emerald-400 whitespace-nowrap backdrop-blur-sm" style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>recursos para jugadores</span>
                    </span>
                  </button>
                </div>

                {/* Línea conectora */}
                <div className={`hidden md:flex items-center transition-all duration-500 ease-in-out ${showRecursosJugadores ? "w-8 opacity-100" : "w-0 opacity-0"}`}>
                  <div className="w-full h-[2px] bg-gradient-to-r from-teal-500/40 to-teal-500/10" />
                </div>

                {/* Ramas desplegables a la derecha */}
                <div className={`flex flex-col gap-2 overflow-hidden transition-all duration-500 ease-in-out ${showRecursosJugadores ? "max-w-[300px] md:max-w-[320px] opacity-100" : "max-w-0 opacity-0"}`}>
                  {/* Gestor de Torneos */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      cleanupPreviousSession();
                      setActiveAdventureEnemy(null);
                      setShowMainScreen(false);
                      setCurrentGameMode("tournament");
                      setIsAdventureModeOpen(false);
                      setIsHeaderVisible(true);
                      setShowRecursosJugadores(false);
                    }}
                    onMouseEnter={() => playAudio("hover_mode")}
                    className="group relative overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-0.5 bg-[#0a0a0f]/80 border border-amber-500/20 hover:border-amber-500/50 px-4 py-3 flex items-center gap-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.4)] hover:shadow-[0_0_18px_rgba(245,158,11,0.15)] backdrop-blur-sm"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="p-1.5 bg-amber-950/40 rounded-lg border border-amber-500/20 group-hover:bg-amber-900/40 transition-colors relative z-10 flex-shrink-0">
                      <Award className="w-4 h-4 text-amber-500/80 group-hover:text-amber-400 transition-colors duration-300" />
                    </div>
                    <div className="relative z-10 text-left">
                      <h3 className="text-amber-100 font-bold text-xs uppercase tracking-widest leading-tight">Gestor de Torneos</h3>
                      <p className="text-amber-500/60 text-[9px] font-mono">Ligas y competiciones</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400/40 ml-auto relative z-10 group-hover:text-amber-400/80 transition-colors" />
                  </button>

                  {/* Transmisiones Live */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      cleanupPreviousSession();
                      setActiveAdventureEnemy(null);
                      setShowMainScreen(false);
                      setCurrentGameMode("live_station");
                      setIsAdventureModeOpen(false);
                      setIsHeaderVisible(true);
                      setShowRecursosJugadores(false);
                    }}
                    onMouseEnter={() => playAudio("hover_mode")}
                    className="group relative overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-0.5 bg-[#0a0a0f]/80 border border-rose-500/20 hover:border-rose-500/50 px-4 py-3 flex items-center gap-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.4)] hover:shadow-[0_0_18px_rgba(244,63,94,0.15)] backdrop-blur-sm"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="p-1.5 bg-rose-950/40 rounded-lg border border-rose-500/20 group-hover:bg-rose-900/40 transition-colors relative z-10 flex-shrink-0">
                      <Zap className="w-4 h-4 text-rose-500/80 group-hover:text-rose-400 transition-colors duration-300" />
                    </div>
                    <div className="relative z-10 text-left">
                      <h3 className="text-rose-100 font-bold text-xs uppercase tracking-widest leading-tight">Transmisiones Live</h3>
                      <p className="text-rose-500/60 text-[9px] font-mono">Eventos en vivo</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-rose-400/40 ml-auto relative z-10 group-hover:text-rose-400/80 transition-colors" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer mejorado */}
            <div className="flex flex-col items-center gap-1.5 md:gap-3 text-[9px] md:text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] shrink-0">
              <div className="flex flex-col items-center gap-2 text-center">
              </div>
            </div>

          {/* Botón de Silencio Intro */}
          <button
            onClick={() => setIsIntroMuted(!isIntroMuted)}
            className="fixed md:top-14 bottom-6 md:bottom-auto right-6 z-[10001] p-3 rounded-full bg-black/40 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md"
            title={isIntroMuted ? "Activar m├║sica" : "Silenciar m├║sica"}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {isIntroMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <style>{`
            @keyframes logo-transition {
              0% {
                transform: translateY(5vh) scale(1);
                opacity: 1;
              }
              15% {
                transform: translateY(5vh) scale(1);
                opacity: 1;
              }
              100% {
                transform: translateY(0) scale(1);
                opacity: 1;
              }
            }
            .animate-logo-intro {
              animation: logo-transition 6s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
            }
            @keyframes lightning-flash-bg {
              0% { opacity: 0; }
              5% { opacity: 0.85; }
              10% { opacity: 0; }
              12% { opacity: 0.6; }
              17% { opacity: 0; }
              35% { opacity: 0; }
              37% { opacity: 0.7; }
              40% { opacity: 0.4; }
              43% { opacity: 0; }
              60% { opacity: 0; }
              62% { opacity: 0.5; }
              65% { opacity: 0; }
              100% { opacity: 0; }
            }
            .animate-lightning-flash-bg {
              animation: lightning-flash-bg 2s ease-in-out infinite;
            }
            @keyframes fade-in-delayed {
              0%, 60% { opacity: 0; transform: translateY(20px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-delayed {
              animation: fade-in-delayed 6s ease-out forwards;
            }
            @keyframes slide-in-left {
              0%, 60% { opacity: 0; transform: translateX(-100vw); }
              100% { opacity: 1; transform: translateX(0); }
            }
            .animate-slide-in-left {
              animation: slide-in-left 7s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
            }
            @keyframes slide-in-right {
              0%, 60% { opacity: 0; transform: translateX(100vw); }
              100% { opacity: 1; transform: translateX(0); }
            }
            .animate-slide-in-right {
              animation: slide-in-right 7s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
            }
            @keyframes slide-in-right-delayed {
              0%, 75% { opacity: 0; transform: translateX(100vw); }
              100% { opacity: 1; transform: translateX(0); }
            }
            .animate-slide-in-right-delayed {
              animation: slide-in-right-delayed 8s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
            }
            @keyframes float {
              0%, 100% { transform: translateY(0) translateX(0); }
              25% { transform: translateY(-20px) translateX(10px); }
              50% { transform: translateY(-10px) translateX(20px); }
              75% { transform: translateY(-30px) translateX(-10px); }
            }
            .animate-float {
              animation-name: float;
              animation-iteration-count: infinite;
              animation-timing-function: ease-in-out;
            }
            @keyframes scan {
              0%, 100% { top: 0%; opacity: 0; }
              5%, 95% { opacity: 1; }
              50% { top: 100%; }
            }
            @keyframes fire-glow {
              0%, 100% { opacity: 0.3; transform: translateY(0) scale(1); }
              50% { opacity: 0.6; transform: translateY(-2px) scale(1.05); }
            }
            .animate-fire-glow {
              animation: fire-glow 3s ease-in-out infinite;
            }
            .fire-particles {
              position: absolute;
              bottom: 0; left: 0; right: 0; height: 100%;
              background-image: radial-gradient(circle, #f59e0b 1px, transparent 1px);
              background-size: 15px 15px;
              mask-image: linear-gradient(to top, black, transparent);
              animation: fire-sparks 4s linear infinite;
            }
            @keyframes fire-sparks {
              0% { background-position: 0 0; opacity: 0; }
              50% { opacity: 0.5; }
              100% { background-position: 10px -40px; opacity: 0; }
            }
            @keyframes orbit {
              from { offset-distance: 0%; }
              to { offset-distance: 100%; }
            }
            @keyframes adventure-bg-breath {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.02); }
            }
            .adventure-bg-animate {
              animation: adventure-bg-breath 20s ease-in-out infinite;
            }
          `}</style>
        </div>
      )}

      <header
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        className={cn(
          "w-full flex justify-center items-center border-b shrink-0 py-0.5 relative z-10 backdrop-blur-md transition-all duration-700 px-0",
          (isFullscreen || !isHeaderVisible || showMainScreen || isAdventureModeOpen) && "hidden",
          currentGameMode === "adventure"
            ? "bg-black border-amber-900/50 shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
            : "bg-black/40 border-white/5"
        )}
      >
        {(!isFullscreen && isHeaderVisible && activeAdventureEnemy) && (
          <div className="flex-1 flex justify-center items-center w-[70vw] sm:w-full h-16 sm:h-22 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,0,0,0.9)_0%,transparent_75%)] pointer-events-none" />
            <div className="absolute top-2 left-0 right-0 flex items-center justify-center gap-3 px-10 z-10">
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent via-red-900/40 to-transparent" />
              <Sword className="w-4 h-4 text-red-700/60 rotate-12" />
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent via-red-900/40 to-transparent" />
            </div>

            <img
              src={CabeceraAventuraImg}
              alt="Las 3000 Noches"
              className="w-full h-full object-contain pointer-events-none select-none relative z-10"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        )}

        {(!isFullscreen && isHeaderVisible && !activeAdventureEnemy) && (
          <div className="flex-1 flex justify-center items-center w-[70vw] sm:w-full h-10 sm:h-14 relative">
            <img
              src={BannerImg}
              alt="GM-3000"
              className="w-full h-full object-contain pointer-events-none select-none"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        )}
      </header>

      {/* X button for closing header - fixed position to stay visible regardless of header layout */}
      {!isFullscreen && isHeaderVisible && !showMainScreen && !isAdventureModeOpen && (
        <button
          onClick={() => setIsHeaderVisible(false)}
          className="fixed right-4 top-2 flex items-center justify-center p-1.5 bg-slate-900/80 hover:bg-red-900/60 text-slate-300 hover:text-red-400 border border-slate-600/50 hover:border-red-500/50 rounded-lg transition-all shadow-md z-50 group"
          title={language === "es" ? "Cerrar cabecera" : "Close header"}
        >
          <X className="w-4 h-4 group-hover:scale-110 transition-transform" strokeWidth={3} />
        </button>
      )}

      {/* Exit fullscreen button - fixed position bottom-right, always visible in fullscreen */}
      {isFullscreen && !showMainScreen && (
        <button
          onClick={toggleFullScreen}
          className="fixed bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-lg z-[9999] backdrop-blur-sm"
        >
          <Minimize className="w-3.5 h-3.5" />
          {language === "es" ? "Salir" : "Exit"}
        </button>
      )}

      {/* Assist Toast at Bottom-Left */}
      {assistMessage && (
        <div className="fixed bottom-4 left-4 z-[9999] bg-slate-900/95 backdrop-blur shadow-2xl rounded-xl border border-blue-500/30 p-4 flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
              <span className="text-blue-200 text-xs font-bold uppercase tracking-wider">{assistMessage}</span>
            </div>
          </div>
          <button
            onClick={cancelAssist}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded text-xs font-bold transition-all border border-red-500/30 active:scale-95"
          >
            Cancelar
          </button>
        </div>
      )}

      {(currentGameMode === "adventure" || isAdventureModeOpen) && (
        <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden bg-black">
          <img
            src={ADVENTURE_BGS[adventureBgIndex]}
            alt="fondo aventura"
            className={cn("w-full h-full object-cover transition-all duration-1000 select-none pointer-events-auto", adventureAnimationsEnabled && "adventure-bg-animate")}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              opacity: adventureBgOpacity,
              filter: adventureBgHighQuality ? 'none' : 'blur(4px) brightness(0.7) contrast(1.1)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
        </div>
      )}

      {currentGameMode === "normal" && !isAdventureModeOpen && (
        <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden bg-black">
          <img
            src={NORMAL_BGS[selectedNormalBgIndex]}
            alt="fondo juego normal"
            className="w-full h-full object-fill transition-all duration-500 select-none pointer-events-auto"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              opacity: normalBgOpacity,
              filter: 'brightness(0.6) contrast(1.1)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />
        </div>
      )}

      <AdventureAmbience
        isActive={(currentGameMode === "adventure" || isAdventureModeOpen) && adventureAnimationsEnabled}
        intensity={adventureMusicVolume > 0.8 ? "medium" : "light"}
        enableSound={isSoundEnabled}
      />

      {lanStatus !== "disconnected" && (
        <button
          onClick={() => {
            if (lanStatus === "connected") {
              setShowLanAdminOnly(true);
            } else {
              setIsConfigSidebarOpen(true);
            }
          }}
          className={cn(
            "fixed top-[5.8rem] right-6 z-[100] flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all active:scale-95 group overflow-hidden backdrop-blur-xl border-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
            lanStatus === "connected"
              ? "bg-slate-950/80 border-cyan-500/30 text-cyan-50 hover:bg-slate-950 hover:border-cyan-500/60"
              : "bg-slate-950/80 border-amber-500/30 text-amber-50 hover:bg-slate-950 hover:border-amber-500/60"
          )}
          title={language === "es"
            ? (lanStatus === "connected" ? "Administración LAN" : "Configuración LAN")
            : (lanStatus === "connected" ? "LAN Administration" : "LAN Settings")
          }
        >
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <div className={cn(
                "w-2.5 h-2.5 rounded-full",
                lanStatus === "connected" ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" : "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)] animate-pulse"
              )} />
            </div>
            <div className="w-[1px] h-4 bg-white/10" />
            <Wifi className={cn("w-4 h-4", lanStatus !== "connected" && "animate-pulse")} />
          </div>

          <div className="flex flex-col items-start leading-none pr-1">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40 mb-0.5">LAN Network</span>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {lanStatus === "connected"
                ? (lanRole === "host" ? "ANFITRIÓN" : "INVITADO")
                : (language === "es" ? "BUSCANDO..." : "SCANNING...")}
            </span>
          </div>
        </button>
      )}

      {systemNotification && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] bg-slate-800 border border-slate-600 text-slate-200 px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-sm font-semibold tracking-wide">{systemNotification}</span>
        </div>
      )}

      {aliasSavedDialog && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="bg-[#1a1a2e]/95 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-white/90 tracking-wide">{language === "es" ? "Alias Guardado" : "Alias Saved"}</span>
              <span className="text-[9px] text-white/40 font-medium">{language === "es" ? "Tu identidad ha sido registrada" : "Your identity has been registered"}</span>
            </div>
          </div>
        </div>
      )}
      <main
        ref={boardContainerRef}
        className={cn(
          "flex-1 flex w-full overflow-y-auto overflow-x-hidden relative z-10",
          !isHeaderVisible && "py-0",
          isHeaderVisible && !isFullscreen && "pt-0 pb-0 sm:pt-0.5 sm:pb-0.5",
          isHeaderVisible && isFullscreen && "pt-0 pb-0",
          isFullscreen ? "flex-col items-center justify-center" : ((currentGameMode === "tournament" || currentGameMode === "live_station") ? "flex-col p-4" : "flex-col md:flex-row px-0 sm:px-3 lg:px-4 gap-1 sm:gap-2 lg:gap-4"),
          !isFullscreen && boardAlign === "center" && "justify-between",
          !isFullscreen && boardAlign === "right" && "justify-end",
          (isFullscreen && !isRightPanelOpen) ? "bg-[#0f1115]" : "bg-transparent",
          (currentGameMode === "adventure" || isAdventureModeOpen) && "bg-transparent"
        )}
      >
        {(currentGameMode === "tournament" || currentGameMode === "live_station") ? (
          <div className="fixed inset-0 z-[9999] w-full h-full bg-black flex flex-col animate-in fade-in duration-500">
            {currentGameMode === "tournament" && (
              <div className="absolute top-4 right-4 z-[10000]">
                <button
                  onClick={() => {
                    setCurrentGameMode("normal");
                    setShowMainScreen(true);
                    setIsHeaderVisible(true);
                  }}
                  className="flex items-center justify-center p-3 bg-slate-900/90 border border-slate-700/50 hover:border-teal-500/50 hover:bg-slate-800 text-slate-300 hover:text-teal-400 rounded-full transition-all shadow-[0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-md group"
                  title="Volver al Home Principal"
                >
                  <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={() => setShowProfileView(true)}
                  className={cn(
                    "flex items-center justify-center p-3 bg-slate-900/90 border border-slate-700/50 hover:border-teal-500/50 hover:bg-slate-800 text-slate-300 hover:text-teal-400 rounded-full transition-all shadow-[0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-md group ml-2"
                  )}
                  title={language === "es" ? "Perfil" : "Profile"}
                >
                  <User className="w-5 h-5" />
                </button>
              </div>
            )}
            <iframe
              src={currentGameMode === "tournament" ? undefined : "./transmisiones/index.html"}
              srcDoc={currentGameMode === "tournament" ? (tournamentManagerHtml ?? undefined) : undefined}
              className="w-full h-full border-0"
              allowFullScreen
            />
          </div>
        ) : (
          <>
            {!isFullscreen && isRightPanelOpen && boardAlign === "center" && <div className="hidden md:block w-[340px] sm:w-[360px] lg:w-[380px] xl:w-[420px] shrink pointer-events-none" />}

              <div className={cn(
              "flex gap-2 items-start shrink justify-center min-w-0",
              boardAlign === "center" ? "mx-auto" : (boardAlign === "right" ? "ml-auto" : "ml-0"),
              isFullscreen && "w-full h-full max-w-full max-h-full"
            )}>
              <ChessboardProvider options={chessboardConfig}>
              {/* Panel izquierdo: Perfiles LAN, EvalBar o Bandeja de piezas de Modo Estudio */}
              {(() => {
                if (freeModeStage === 'board' && !hasStarted) {
                  return (
                    <div className="hidden md:flex shrink-0 flex-col items-center gap-2 self-stretch justify-center py-2">
                      <div className="flex flex-col items-center gap-3 p-2.5 rounded-2xl border border-cyan-900/40 bg-slate-900/80 backdrop-blur-sm shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
                        <button
                          onClick={() => setStudyPanelExpanded(!studyPanelExpanded)}
                          className="w-full flex items-center justify-between gap-3 px-1 py-0.5 group"
                          title={language === "es" ? "Expandir/Colapsar Modo Estudio" : "Expand/Collapse Study Mode"}
                        >
                          <span className="text-[9px] font-bold text-cyan-400/90 uppercase tracking-widest select-none">
                            {language === "es" ? "Modo Estudio" : "Study Mode"}
                          </span>
                          <ChevronDown className={cn("w-3.5 h-3.5 text-cyan-400/70 transition-transform duration-200 group-hover:text-cyan-300", studyPanelExpanded ? "rotate-180" : "rotate-0")} />
                        </button>
                        {studyPanelExpanded && (
                        <>
                        <span className="text-[9px] font-bold text-cyan-400/90 uppercase tracking-widest select-none">{language === "es" ? "Piezas" : "Pieces"}</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(["wK", "wQ", "wR", "wB", "wN", "wP", "bK", "bQ", "bR", "bB", "bN", "bP"] as string[]).map((pt) => (
                            <div
                              key={pt}
                              className={cn(
                                "w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border-2 transition-all cursor-grab active:cursor-grabbing select-none",
                                selectedSparePiece === pt
                                  ? "bg-cyan-500/30 ring-2 ring-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.5)] border-cyan-500/50"
                                  : "border-slate-700/50 hover:border-cyan-500/30 hover:bg-cyan-900/30"
                              )}
                              title={pt}
                            >
                              <SparePiece pieceType={pt} />
                            </div>
                          ))}
                        </div>
                        <div className="w-full border-t border-slate-800 pt-2.5 space-y-2">
                          <input
                            type="text"
                            value={positionEditorFen}
                            onChange={(e) => {
                              setPositionEditorFen(e.target.value);
                              resetEditorHistoryRef.current(e.target.value);
                            }}
                            placeholder="FEN"
                            className="w-full bg-black/40 border border-cyan-900/30 text-[9px] text-cyan-300/80 rounded-lg px-2 py-1.5 outline-none focus:border-cyan-500/60 font-mono placeholder:text-slate-700 transition-all"
                          />
                          <div className="flex bg-slate-950/60 rounded-lg border border-slate-700/50 overflow-hidden">
                            <button
                              onClick={() => setFreeModeColor("white")}
                              className={cn("flex-1 text-[9px] px-2 py-1.5 font-bold transition-all flex items-center justify-center gap-1.5", freeModeColor === "white" ? "bg-white/10 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-300")}
                            >
                              <div className="w-2 h-2 rounded-full bg-white border border-slate-400" />
                              {language === "es" ? "Blancas" : "White"}
                            </button>
                            <button
                              onClick={() => setFreeModeColor("black")}
                              className={cn("flex-1 text-[9px] px-2 py-1.5 font-bold transition-all flex items-center justify-center gap-1.5", freeModeColor === "black" ? "bg-white/10 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-300")}
                            >
                              <div className="w-2 h-2 rounded-full bg-slate-800 border border-slate-500" />
                              {language === "es" ? "Negras" : "Black"}
                            </button>
                          </div>
                          <select
                            value={freeModeEngineType}
                            onChange={(e) => setFreeModeEngineType(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 text-[9px] text-slate-300 rounded-lg p-1.5 outline-none focus:border-cyan-500/50 transition-all cursor-pointer appearance-none"
                          >
                            <option value="stockfish">Stockfish</option>
                            <option value="atlas">Atlas.1 (Nuestro)</option>
                            <option value="edd">Nexus (Nuestro)</option>
                            <option value="maia1">Maia 1</option>
                            <option value="maia2">Maia 2</option>
                            <option value="ailed">Ailed (Nuestro)</option>
                            <option value="obsidian">Obsidian (Neural)</option>
                          </select>
                          <div className="flex justify-between text-[8px] text-slate-500 font-semibold select-none">
                            <span className="uppercase tracking-wider">{language === "es" ? "Fuerza" : "Strength"}</span>
                            <span className={cn("font-mono font-bold", freeModeEngineType === "atlas" ? "text-emerald-400" : freeModeEngineType === "obsidian" ? "text-teal-400" : freeModeEngineType === "edd" ? "text-emerald-400" : freeModeEngineType.startsWith("maia") ? "text-purple-400" : freeModeEngineType === "ailed" ? "text-red-400" : "text-blue-400")}>
                              ~{getEloRating(freeModeElo, freeModeEngineType)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="3"
                            max="25"
                            value={freeModeElo}
                            onChange={(e) => setFreeModeElo(parseInt(e.target.value))}
                            className="w-full h-1.5 cursor-pointer bg-slate-800 rounded-full appearance-none accent-cyan-500"
                          />
                          <select
                            value={initialTimeMin}
                            onChange={(e) => setInitialTimeMin(parseInt(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-700 text-[9px] text-slate-300 rounded-lg p-1.5 outline-none focus:border-cyan-500/50 transition-all cursor-pointer appearance-none"
                          >
                            {[1, 3, 5, 10, 15, 30, 60].map((m) => (
                              <option key={m} value={m}>{language === "es" ? "Tiempo" : "Time"}: {m} {m === 1 ? (language === "es" ? "min" : "min") : (language === "es" ? "min" : "min")}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              setPositionEditorFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
                              setSelectedSparePiece(null);
                              resetEditorHistoryRef.current();
                            }}
                            className="w-full py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 rounded-lg text-[9px] font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                          >
                            <RotateCcw className="w-3 h-3" />
                            {language === "es" ? "Reset Tablero" : "Reset Board"}
                          </button>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => undoEditorStepRef.current()}
                              disabled={editorHistoryIndexRef.current <= 0}
                              className="flex-1 py-1.5 bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 text-slate-400 rounded-lg text-[9px] font-bold transition-all flex items-center justify-center gap-1"
                            >
                              <Undo2 className="w-3 h-3" />
                              {language === "es" ? "Deshacer" : "Undo"}
                            </button>
                            <button
                              onClick={() => redoEditorStepRef.current()}
                              disabled={editorHistoryIndexRef.current >= editorFenHistory.length - 1}
                              className="flex-1 py-1.5 bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 text-slate-400 rounded-lg text-[9px] font-bold transition-all flex items-center justify-center gap-1"
                            >
                              <Redo2 className="w-3 h-3" />
                              {language === "es" ? "Rehacer" : "Redo"}
                            </button>
                          </div>
                          <span className="block text-[8px] text-slate-500 text-center select-none">
                            {language === "es" ? "Pasos" : "Steps"}: {editorHistoryIndexRef.current}/{editorFenHistory.length - 1}
                          </span>
                          <button
                            onClick={() => {
                              startStudyModeGame();
                            }}
                            className="w-full py-2 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg shadow-cyan-900/40 border border-cyan-400/30 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                          >
                            <Play className="w-3.5 h-3.5" fill="currentColor" />
                            {language === "es" ? "Jugar" : "Play"}
                          </button>
                          <span className="block text-[8px] text-slate-500 italic text-center leading-tight select-none">
                            {language === "es" ? "Arrastra o clic para colocar · Clic en casilla = borrar" : "Drag or click to place · Click square = remove"}
                          </span>
                        </div>
                        </>
                        )}
                      </div>
                    </div>
                  );
                }
                if (lanStatus === "connected") {
                  const topColor = boardOrientation === "white" ? "b" : "w";
                  const botColor = boardOrientation === "white" ? "w" : "b";
                  const opponentLanPlayer = lanConnectedPlayers.find(p => p.color === (topColor === "w" ? "white" : "black"));
                  const localLanPlayer = lanConnectedPlayers.find(p => p.color === (botColor === "w" ? "white" : "black"));
                  return (
                    <div className="hidden md:flex h-[280px] sm:h-[400px] md:h-[480px] lg:h-[580px] w-10 sm:w-12 lg:w-16 shrink-0 flex-col items-center justify-center gap-2 bg-slate-900/50 border-r border-slate-800/50">
                      <div className="flex-1 flex flex-col justify-between px-1.5 py-4">
                        {/* Jugador arriba (oponente) */}
                        <div className="w-full flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
                          {opponentLanPlayer?.photoUrl && (
                            <img src={opponentLanPlayer.photoUrl} alt="" className="w-20 h-20 lg:w-24 lg:h-24 rounded-full object-cover border-2 border-white/15" />
                          )}
                          {opponentLanPlayer?.name && (
                            <span className="text-sm font-semibold text-white/90 text-center truncate w-full px-1">{opponentLanPlayer.name}</span>
                          )}
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                            style={{ background: topColor === "w" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.4)", color: topColor === "w" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.5)" }}>
                            {topColor === "w" ? (language === "es" ? "Blancas" : "White") : (language === "es" ? "Negras" : "Black")}
                          </span>
                        </div>
                        {/* Jugador abajo (local) */}
                        <div className="w-full flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
                          {localLanPlayer?.photoUrl && (
                            <img src={localLanPlayer.photoUrl} alt="" className="w-20 h-20 lg:w-24 lg:h-24 rounded-full object-cover border-2 border-white/15" />
                          )}
                          {localLanPlayer?.name && (
                            <span className="text-sm font-semibold text-white/90 text-center truncate w-full px-1">{localLanPlayer.name}</span>
                          )}
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                            style={{ background: botColor === "w" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.4)", color: botColor === "w" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.5)" }}>
                            {botColor === "w" ? (language === "es" ? "Blancas" : "White") : (language === "es" ? "Negras" : "Black")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  isEngineVisible && (
                    <div className="hidden md:flex w-8 sm:w-10 shrink-0 flex-col items-center justify-center gap-2" style={{ height: boardWidthPx + 60 }}>
                      <EvalBar
                        score={evalScore}
                        mate={evalMate}
                        turnColor={game.turn()}
                        player1Color={boardOrientation === "white" ? "w" : "b"}
                      />
                    </div>
)
                );
              })()}

              <div style={isFullscreen ? undefined : { width: boardWidthPx, maxWidth: '100%' }} className={cn("w-full shrink flex flex-col items-stretch gap-0", !isRightPanelOpen ? "relative" : "justify-center", isFullscreen && "h-full max-w-[min(100%,calc(100vh-80px))] mx-auto")}>
                <div className={cn("mb-1 flex justify-between items-center bg-slate-800/80 px-2 py-0.5 rounded-t-lg border-b-2 border-slate-900 border-x border-t border-slate-700/50 overflow-visible", !isRightPanelOpen && "mb-0 rounded-lg border-x border-t border-b-0 border-slate-700/50 flex-col gap-1 px-1.5 py-1")}>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const topColor = boardOrientation === "white" ? "b" : "w";
                      const topPlayerType = topColor === "w" ? whitePlayer : blackPlayer;
                      if (topPlayerType === "human") {
                        if (lanStatus === "connected") {
                          const lanPColor = topColor === "w" ? "white" : "black";
                          const lanP = lanConnectedPlayers.find((p) => p.color === lanPColor);
                          if (lanP && lanP.photoUrl) {
                            return <img src={lanP.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" style={{ border: "1px solid rgba(255,255,255,0.15)" }} />;
                          }
                        } else if (profileHook.photoUrl) {
                          return <img src={profileHook.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" style={{ border: "1px solid rgba(255,255,255,0.15)" }} />;
                        }
                      }
                      return <div className={cn("w-4 h-4 rounded-sm shadow-inner overflow-hidden border", boardOrientation === "white" ? "border-slate-600 bg-black" : "border-slate-400 bg-white")}></div>;
                    })()}
                    {(boardOrientation === "white" ? blackPlayer === "ai" && blackEngineType === "edd" : whitePlayer === "ai" && whiteEngineType === "edd") && (
                      <img src={KittenImg} alt="Nexus" className="w-5 h-5 object-contain" />
                    )}
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

                    {!showMentalMode && <div className={cn(
                      "w-full aspect-square shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border-4 touch-none relative chess-container-wrapper mx-auto flex items-start justify-center p-1.5 sm:p-2",
                      currentGameMode === "adventure" ? "border-amber-900/60 bg-transparent" : "border-[#2d3748] bg-[#2d3748]",
                      isInvisiblePieces && "invisible-pieces",
                      !hasStarted && !showFreeMode && freeModeStage !== 'config' && "pointer-events-none opacity-70"
                    )}
                      onClick={() => { if (isConfigSidebarOpen && !showFreeMode) setIsConfigSidebarOpen(false); }}
                      style={{
                        '--rotate-duration': autoRotateSpeed === 'spin_fast' ? '300ms' : '700ms'
                      } as any}>
                      {isInvisiblePieces && <style>{`
                 .invisible-pieces [data-piece] { opacity: 0.001 !important; pointer-events: auto !important; }
              `}</style>}

                      <div className={cn("absolute top-2 left-2 right-2 flex justify-between items-start z-50", whitePlayer === "human" && blackPlayer === "human" ? "" : "pointer-events-none")}>
                        {whitePlayer === "human" && blackPlayer === "human" ? (
                          <input
                            value={whitePlayerName || effectivePlayerName || "Humano"}
                            onChange={(e) => setWhitePlayerName(e.target.value.slice(0, 20))}
                            onBlur={(e) => { if (!e.target.value.trim()) setWhitePlayerName(""); }}
                            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-lg backdrop-blur-sm border bg-transparent outline-none focus:ring-1 focus:ring-amber-400/50 max-w-[45%] text-center cursor-text",
                              boardOrientation === "white" ? "text-white border-slate-600/50 focus:border-amber-400/50" : "text-white border-gray-700/50 focus:border-amber-400/50"
                            )}
                            placeholder={language === "es" ? "Jugador Blancas" : "White Player"}
                          />
                        ) : (
                          <div className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-lg backdrop-blur-sm border",
                            boardOrientation === "white" ? "text-white bg-slate-800/90 border-slate-600" : "text-white bg-gray-900/90 border-gray-700"
                          )}>
                            {whitePlayer === "human" ? getWhitePlayerName() : (whiteEngineName || "Motor Blanco")}
                          </div>
                        )}
                        {whitePlayer === "human" && blackPlayer === "human" ? (
                          <input
                            value={blackPlayerName || effectivePlayerName || "Humano"}
                            onChange={(e) => setBlackPlayerName(e.target.value.slice(0, 20))}
                            onBlur={(e) => { if (!e.target.value.trim()) setBlackPlayerName(""); }}
                            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-lg backdrop-blur-sm border bg-transparent outline-none focus:ring-1 focus:ring-amber-400/50 max-w-[45%] text-center cursor-text",
                              boardOrientation === "white" ? "text-white border-gray-700/50 focus:border-amber-400/50" : "text-white border-slate-600/50 focus:border-amber-400/50"
                            )}
                            placeholder={language === "es" ? "Jugador Negras" : "Black Player"}
                          />
                        ) : (
                          <div className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-lg backdrop-blur-sm border",
                            boardOrientation === "white" ? "text-white bg-gray-900/90 border-gray-700" : "text-white bg-slate-800/90 border-slate-600"
                          )}>
                            {blackPlayer === "human" ? getBlackPlayerName() : (blackEngineName || "Motor Negro")}
                          </div>
                        )}
                      </div>

                      <div className="w-full h-full chess-board-inner relative" style={{ zIndex: 100 }}>
                        <Chessboard />
                      </div>

                  {(isSyncing || startCountdown !== null) && (
                    <div className="absolute inset-0 z-[1000] backdrop-blur-sm flex flex-col items-center justify-center rounded pointer-events-auto bg-black/60">
                      {/* Gato central con piezas blancas orbitando */}
                      <div className="relative w-52 h-52 flex items-center justify-center mb-6">

                        {/* Anillo exterior girando */}
                        <div className="absolute inset-0 rounded-full border border-teal-500/20 animate-spin" style={{ animationDuration: '8s' }}></div>

                        {/* Piezas blancas en órbita usando transform rotateZ + translateX */}
                        {[
                          { piece: '♙', delay: '0s', angle: 0 },
                          { piece: '♘', delay: '0.6s', angle: 72 },
                          { piece: '♗', delay: '1.2s', angle: 144 },
                          { piece: '♖', delay: '1.8s', angle: 216 },
                          { piece: '♕', delay: '2.4s', angle: 288 },
                        ].map(({ piece, delay, angle }) => (
                          <div
                            key={piece}
                            className="absolute inset-0 flex items-start justify-center animate-spin"
                            style={{
                              animationDuration: '6s',
                              animationTimingFunction: 'linear',
                              transform: `rotate(${angle}deg)`,
                            }}
                          >
                            <span
                              className="text-2xl"
                              style={{
                                color: '#fff',
                                filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.6))',
                                marginTop: '-8px',
                                display: 'block',
                                animationDelay: delay,
                              }}
                            >
                              {piece}
                            </span>
                          </div>
                        ))}

                        {/* Loader central, solo aparece cuando NO hay cuenta regresiva */}
                        {startCountdown === null && (
                          <img
                            src={LoaderImg}
                            alt=""
                            className="w-28 h-28 object-contain z-10 drop-shadow-[0_0_20px_rgba(20,184,166,0.7)] animate-pulse select-none pointer-events-none"
                            draggable={false}
                            onContextMenu={(e) => e.preventDefault()}
                          />
                        )}

                        {/* Número de cuenta regresiva encima del gato */}
                        {startCountdown !== null && (
                          <div className="absolute inset-0 flex items-center justify-center z-20">
                            <span className="text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] select-none" style={{ lineHeight: 1 }}>
                              {startCountdown}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Texto con fondo visible */}
                      <div className="bg-slate-900/90 border border-teal-500/40 rounded-xl px-5 py-2.5 flex flex-col items-center gap-1 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                        <span className="font-black uppercase tracking-[0.4em] text-xs text-teal-400">
                          {startCountdown !== null
                            ? (language === "es" ? "¡PREPÁRATE!" : "GET READY!")
                            : (language === "es" ? "Sincronizando..." : "Synchronizing...")}
                        </span>
                        <div className="w-40 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-teal-600 via-emerald-400 to-teal-600 animate-[progress-loading_1s_ease-in-out_infinite] rounded-full" />
                        </div>
                      </div>
                    </div>
                  )}

                  {pendingPromotion && (
                    // IMPORTANTE: este overlay debe tener un zIndex más alto que el tablero. Si el modal deja de recibir clics, este es el primer lugar que revisar.
                    <div className="fixed inset-0 flex items-center justify-center pointer-events-auto" style={{ zIndex: 9999, transform: game.turn() === "b" && isAutoRotate && autoRotateSpeed !== 'slide' ? "rotate(180deg)" : "none", background: activeAdventureEnemy ? "linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(60,20,0.8) 100%)" : "rgba(0,0,0,0.5)" }} onClick={(e) => { e.stopPropagation(); promotionInProgressRef.current = false; setPendingPromotion(null); }}>
                      <div className={cn(activeAdventureEnemy ? "bg-gradient-to-b from-stone-900 to-black border-2 border-amber-900/50 shadow-[0_0_30px_rgba(217,119,6,0.3)]" : "bg-slate-800 border-2 border-slate-600 shadow-2xl", "p-6 rounded-xl flex flex-col gap-4")} onClick={e => e.stopPropagation()} style={activeAdventureEnemy ? { fontFamily: "Georgia, serif" } : {}}>
                        <div className="text-center">
                          <span className={cn(activeAdventureEnemy ? "text-amber-400 font-black text-sm" : "text-white text-xs font-bold", "uppercase tracking-widest block")}>
                            {activeAdventureEnemy
                              ? language === "es" ? "RESURRECCIÓN PERMITIDA" : "RESURRECTION GRANTED"
                              : (language === "es" ? "Promoción" : "Promotion")}
                          </span>
                        </div>
                        <div className="flex gap-3 justify-center flex-wrap">
                          {['q', 'r', 'b', 'n'].map(p => {
                            const labels: Record<string, { es: string, en: string }> = {
                              q: { es: "Reina Renacida", en: "Reborn Queen" },
                              r: { es: "Torre Antigua", en: "Ancient Tower" },
                              b: { es: "Alfil Sagrado", en: "Holy Bishop" },
                              n: { es: "Caballo Eterno", en: "Eternal Knight" }
                            };
                            return (
                              <button key={p}
                                onClick={(e) => {
                                  e.stopPropagation();
                                   // console.log("[Promotion] selected promotion:", p, "for", pendingPromotion);
                                  executeMove({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: p });
                                  promotionInProgressRef.current = false;
                                  setPendingPromotion(null);
                                }}
                                className={cn(
                                  activeAdventureEnemy
                                    ? "flex flex-col items-center justify-center p-4 rounded-xl border-2 border-amber-900/40 hover:border-amber-400 bg-stone-950/80 hover:bg-amber-900/20 transition-all group min-w-[100px] shadow-[0_4px_15px_rgba(0,0,0,0.5)]"
                                    : "w-16 h-16 bg-slate-700/80 hover:bg-slate-600 rounded-xl flex items-center justify-center transition-all border border-slate-500/30 hover:border-emerald-500/50 shadow-lg",
                                  "relative"
                                )}
                                title={activeAdventureEnemy ? (language === "es" ? labels[p].es : labels[p].en) : ""}
                              >
                                <img
                                  src={`https://chessboardjs.com/img/chesspieces/wikipedia/${pendingPromotion.color}${p.toUpperCase()}.png`}
                                  alt={p}
                                  className={cn(
                                    "w-10 h-10 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110",
                                    pendingPromotion.color === 'w' ? "brightness-110 contrast-125" : "brightness-100"
                                  )}
                                />
                                {activeAdventureEnemy && (
                                  <span className="text-[9px] text-amber-400/80 font-black uppercase tracking-widest mt-2 group-hover:text-amber-200 transition-colors text-center leading-tight">
                                    {language === "es" ? labels[p].es : labels[p].en}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                </div>}

                <div className={cn("mt-1 flex justify-between items-center bg-slate-800/80 px-2 py-0.5 rounded-b-lg border-t-2 border-slate-900 border-x border-b border-slate-700/50", !isRightPanelOpen && "mt-0 rounded-lg border-x border-b border-t-0 border-slate-700/50 flex-col gap-1 px-1.5 py-1")}>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const botColor = boardOrientation === "white" ? "w" : "b";
                      const botPlayerType = botColor === "w" ? whitePlayer : blackPlayer;
                      if (botPlayerType === "human") {
                        if (lanStatus === "connected") {
                          const lanPColor = botColor === "w" ? "white" : "black";
                          const lanP = lanConnectedPlayers.find((p) => p.color === lanPColor);
                          if (lanP && lanP.photoUrl) {
                            return <img src={lanP.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" style={{ border: "1px solid rgba(255,255,255,0.15)" }} />;
                          }
                        } else if (profileHook.photoUrl) {
                          return <img src={profileHook.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" style={{ border: "1px solid rgba(255,255,255,0.15)" }} />;
                        }
                      }
                      return <div className={cn("w-4 h-4 rounded-sm shadow-inner overflow-hidden border", boardOrientation === "white" ? "border-slate-400 bg-white" : "border-slate-600 bg-black")}></div>;
                    })()}
                    {(boardOrientation === "white" ? whitePlayer === "ai" && whiteEngineType === "edd" : blackPlayer === "ai" && blackEngineType === "edd") && (
                      <img src={KittenImg} alt="Nexus" className="w-5 h-5 object-contain" />
                    )}
                    <span className="font-bold text-slate-300 text-sm tracking-widest uppercase flex items-center gap-2">
                      {getPlayerLabel(boardOrientation === "white" ? "w" : "b")}
                      {isAssistModeEnabled && (
                        (game.turn() === "w" ? whitePlayer === "human" : blackPlayer === "human")
                      ) && game.turn() === (boardOrientation === "white" ? "w" : "b") && (
                          <div className="relative flex items-center">
                            <button
                              onClick={requestAssist}
                              title="Sugerir Movimiento"
                              disabled={!!assistMessage}
                              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-500/20 hover:bg-blue-500/40 active:scale-90 text-blue-400 flex items-center justify-center transition-all border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse"
                            >
                              <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        )}
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

                {gameResult && !gameResultDismissed && viewingMoveIndex === null && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/95 text-white p-4 sm:p-8 rounded-3xl text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/20 z-[100] w-[90%] sm:w-[85%] max-w-[400px] backdrop-blur-xl animate-in zoom-in-95 duration-300 ring-4 ring-white/5">
                    <button
                      onClick={() => setGameResultDismissed(true)}
                      className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/30 hover:bg-black/60 rounded-full p-1.5 transition-colors z-10"
                      title={language === "es" ? "Cerrar" : "Close"}
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="flex justify-center mb-4">
                      {gameResult?.includes("Ganan") || gameResult?.includes("Wins") ? (
                        <Trophy className="w-12 h-12 text-amber-400 animate-bounce" />
                      ) : (
                        <Scale className="w-12 h-12 text-slate-400 animate-pulse" />
                      )}
                    </div>
                    <div className="text-2xl font-black tracking-[0.1em] mb-2 text-white uppercase drop-shadow-lg">
                      {gameResult || gameStatus}
                    </div>

                    {isAnalyzing && (
                      <div className="mt-3 flex flex-col items-center gap-2">
                        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-white/10">
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${analysisProgress}%` }}
                          />
                        </div>
                        <span className="text-teal-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                          {language === "es" ? "Analizando" : "Analyzing"} {analysisProgress}%
                        </span>
                      </div>
                    )}

                    {tournament.active && tournament.mode !== "none" ? (
                      <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                        <div className="text-purple-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">
                          {language === "es" ? "Siguiente Ronda" : "Next Round"}
                        </div>
                        <div className="flex items-center justify-center gap-3">
                          <div className="text-4xl font-black text-white w-12 h-12 flex items-center justify-center bg-purple-600 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.5)] animate-pulse">
                            {tournamentCountdown}
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-white">
                              {language === "es" ? "Preparando tablero" : "Preparing board"}
                            </div>
                            <div className="text-[10px] text-purple-300/70">
                              {language === "es" ? "Ronda" : "Round"} {tournament.currentRound} â   {tournament.currentRound + 1}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 mt-6">
                        <div className="flex place-items-center w-full">
                          {Object.keys(moveComments).length > 0 && Object.keys(moveComments).length === history.length && !isAnalyzing && (
                            <button
                              onClick={deleteAnalysisCache}
                              className="px-4 bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-800 border-r-0 rounded-l-2xl transition-all flex items-center justify-center"
                              title={language === "es" ? "Borrar Análisis" : "Clear Analysis"}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={openAnalysisOrRun}
                            className={cn("flex-1 py-4 bg-teal-600 hover:bg-teal-500 text-white text-xs font-black transition-all flex justify-center items-center gap-2 shadow-xl shadow-teal-900/40 uppercase border border-teal-400/30",
                              (Object.keys(moveComments).length > 0 && Object.keys(moveComments).length === history.length && !isAnalyzing) ? "rounded-r-2xl" : "rounded-2xl",
                              isAnalyzing && "bg-rose-600 hover:bg-rose-500 shadow-rose-900/40 border-rose-400/30"
                            )}
                          >
                            <Search className={cn("w-4 h-4", isAnalyzing && "animate-spin")} />
                            {isAnalyzing
                              ? (language === "es" ? "Cancelar Análisis" : "Cancel Analysis")
                              : (Object.keys(moveComments).length > 0 && Object.keys(moveComments).length === history.length
                                ? (language === "es" ? "Ver Análisis" : "View Analysis")
                                : (language === "es" ? "Análisis Maestro" : "Full Analysis"))}
                          </button>
                        </div>
                        <button
                          onClick={() => { if (freeModeStage === 'playing') startStudyModeGame(true); else startGame(); }}
                          className="w-full py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-2xl text-[10px] font-black transition-all uppercase border border-white/5 shadow-lg"
                        >
                          {language === "es" ? "Nueva Partida" : "New Game"}
                        </button>
                        <button
                          onClick={() => stopGame()}
                          className="w-full py-2 bg-transparent hover:bg-slate-800/40 text-slate-500 hover:text-slate-400 rounded-2xl text-[9px] font-bold transition-all uppercase"
                        >
                          {language === "es" ? "Cambiar Ajustes" : "Change Settings"}
                        </button>
                      </div>
          )}
          </div>
          )}

                </div>
              </ChessboardProvider>
              </div>

            <aside className={cn(
              "flex flex-col gap-4 transition-all duration-300 min-h-0 overflow-y-auto overflow-x-hidden self-stretch",
              !isRightPanelOpen && "hidden",
              isFullscreen && "hidden",
              isRightPanelOpen && !isFullscreen && "flex-1",
              isHeaderVisible ? "max-h-[calc(100vh-120px)]" : "max-h-[calc(100vh-60px)]",
              boardAlign === "left"
                  ? "ml-0 pl-2 sm:pl-4"
                  : boardAlign === "right"
                    ? "mr-0 md:order-first pr-2 sm:pr-4"
                    : "shrink ml-auto pl-1 sm:pl-2",
              isRightPanelOpen && "max-md:fixed max-md:inset-0 max-md:z-[4000] max-md:w-full max-md:bg-slate-950/98 max-md:backdrop-blur-md max-md:p-4 max-md:self-auto max-md:max-h-full"
            )}>
              <div className={cn(
                "flex flex-col gap-2 mt-4 p-4 rounded-xl relative overflow-hidden group w-full medieval-panel shrink-0",
                currentGameMode === "adventure"
                  ? "bg-[#0a0502]/90 border-2 border-amber-900/40 shadow-[0_0_25px_rgba(217,119,6,0.15)]"
                  : "bg-black/90 border-2 border-teal-900/50 shadow-[0_0_20px_rgba(20,184,166,0.3)]"
              )}>
                {isEngineVisible && (!isLoadedPgn) && (
                  <div className="bg-slate-900/50 rounded flex items-center px-3 text-[11px] font-mono text-slate-400 min-h-[2rem] border border-slate-700/50 w-full overflow-hidden shrink-0">
                    {hasStarted && bestLine && !isPaused ? (
                      <div className="flex items-center w-full min-w-0 gap-2">
                        <span className="text-emerald-400 font-bold shrink-0">
                          {evalMate !== undefined
                            ? `M${Math.abs(evalMate)}`
                            : `${evalScore > 0 ? "+" : ""}${(evalScore / 100).toFixed(2)}`}
                        </span>
                        <span className="text-slate-400 flex-1 text-[10px] leading-tight break-words" title={bestLine}>
                          {bestLine}
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

                  {!hasStarted && isGameStopped && stoppedGameSnapshot && (
                    <div className="w-full space-y-2 p-4 bg-gradient-to-b from-amber-900/20 to-slate-900/50 border border-amber-500/30 rounded-lg text-center">
                      <h3 className="text-sm font-bold text-amber-400 flex items-center justify-center gap-2">
                        <Play className="w-4 h-4" />
                        {language === "es" ? "Partida Detenida" : "Game Stopped"}
                      </h3>
                      <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                        {language === "es"
                          ? "Puedes retomar la partida desde donde la dejaste o iniciar una nueva."
                          : "You can resume the game from where you left off or start a new one."}
                      </p>
                      <button
                        onClick={resumeGame}
                        className="w-full py-2.5 bg-amber-900/60 hover:bg-amber-800/60 border border-amber-600/40 text-amber-300 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Play className="w-4 h-4" />
                        {language === "es" ? "Retomar Partida" : "Resume Game"}
                      </button>
                      <button
                        onClick={() => {
                          setIsGameStopped(false);
                          setStoppedGameSnapshot(null);
                          if (lanStatus === "connected") {
                            lanStartNewGame();
                          } else {
                            startGame();
                          }
                        }}
                        className="w-full py-2.5 bg-black/60 hover:bg-red-950/40 border border-red-900/40 text-red-400 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {language === "es" ? "Nueva Partida" : "New Game"}
                      </button>
                    </div>
                  )}

                  {!hasStarted && !isGameStopped && !isAdventureModeOpen && !showFreeMode && currentGameMode === "normal" && (
                    <div className="w-full space-y-2 p-4 bg-gradient-to-b from-slate-800/30 to-slate-900/50 border border-emerald-500/20 rounded-lg text-center">
                      <h3 className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-2">
                        <Play className="w-4 h-4" />
                        {language === "es" ? "Comenzar Partida" : "Start Game"}
                      </h3>
                      <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                        {language === "es"
                          ? "Configura el juego en Ajustes (motor, dificultad, tema del tablero, etc.) y presiona 'Empezar Desafío' abajo para comenzar."
                          : "Configure the game in Settings (engine, difficulty, board theme, etc.) and press 'Start Challenge' below to begin."}
                      </p>

                      {/* Acceso Directo a LAN */}
                      {isDesktop && (
                        <div className="pt-2 border-t border-white/5">
                          <button
                            onClick={() => {
                              setWhitePlayer("human");
                              setBlackPlayer("human");
                              whitePlayerRef.current = "human";
                              blackPlayerRef.current = "human";
                              setIsConfigSidebarOpen(true);
                            }}
                            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                          >
                            <Users className="w-4 h-4" />
                            {language === "es" ? "Administración LAN (Multijugador Local)" : "LAN Administration (Local Multiplayer)"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {hasStarted && !isLoadedPgn && (
                    <>
                      <button
                        onClick={() => {
                          if (lanStatus === "connected") {
                            // En LAN, usar la función eobsidian que mantiene la conexión
                            lanStopGameCompletely();
                          } else {
                            // En modo normal, solo detener
                            stopGame();
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-800 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
                      >
                        <Square className="w-3.5 h-3.5" fill="currentColor" /> {language === "es" ? "Detener" : "Stop"}
                      </button>
                      <button
                        onClick={() => {
                          if (lanStatus === "connected") {
                            // En LAN, usar la función que maneja reset y color aleatorio
                            lanStartNewGame();
                          } else if (freeModeStage === 'playing') {
                            // Modo Estudio: reiniciar en el mismo modo reseteando el tablero
                            startStudyModeGame(true);
                          } else {
                            // En modo normal, iniciar directamente
                            startGame();
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-black/80 hover:bg-red-950/40 text-red-400 border border-red-900 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
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
                      <div className="flex place-items-center">
                        {Object.keys(moveComments).length > 0 && Object.keys(moveComments).length === history.length && !isAnalyzing && (
                          <button
                            onClick={deleteAnalysisCache}
                            className="px-2 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-800 border-r-0 rounded-l-lg transition-all"
                            title={language === "es" ? "Borrar Análisis" : "Clear Analysis"}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={openAnalysisOrRun}
                          disabled={isAnalyzing || history.length === 0}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm border",
                            isAnalyzing
                              ? "bg-red-950/50 text-red-400 border-red-800 animate-pulse"
                              : "bg-teal-800 hover:bg-teal-700 text-white border-teal-500/30",
                            (Object.keys(moveComments).length > 0 && Object.keys(moveComments).length === history.length && !isAnalyzing) ? "rounded-r-lg" : "rounded-lg"
                          )}
                        >
                          <Search className={cn("w-3.5 h-3.5", isAnalyzing && "animate-spin")} />
                          {isAnalyzing
                            ? `${language === "es" ? "Analizando" : "Analyzing"} ${analysisProgress}%`
                            : (Object.keys(moveComments).length > 0 && Object.keys(moveComments).length === history.length
                              ? (language === "es" ? "Ver Análisis" : "View Analysis")
                              : (language === "es" ? "Análisis Maestro" : "Master Analysis"))}
                        </button>
                      </div>
                    </>
                  )}
                  {(!isLoadedPgn && hasStarted) && (
                    <>
                      <button
                        onClick={() => {
                          const newState = !isPaused;
                          // Aplicar cambio localmente de inmediato
                          setIsPaused(newState);
                          isPausedRef.current = newState;
                          // En LAN, también sincronizar con el otro jugador
                          if (lanStatus === "connected") {
                            const times = { whiteTime: whiteTimeRef.current, blackTime: blackTimeRef.current };
                            if (newState) lanPauseGame(times);
                            else lanResumeGame(times);
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
                    </>
                  )}
                  {hasStarted && (
                    <button
                      onClick={() => {
                        if (isBoardAnalysisMode) exitBoardAnalysisMode();
                        else enterBoardAnalysisMode();
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider border shadow-sm",
                        isBoardAnalysisMode
                          ? "bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border-emerald-800"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                      )}
                      title={isBoardAnalysisMode ? (language === "es" ? "Salir de modo exploración" : "Exit exploration mode") : (language === "es" ? "Abrir modo exploración" : "Open exploration mode")}
                    >
                      <Brain className="w-3.5 h-3.5" />
                      {isBoardAnalysisMode ? (language === "es" ? "Continuar" : "Continue") : (language === "es" ? "Explorar" : "Explore")}
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

                  {/* PANEL DE TORNEO ACTIVO (COMPACTO) */}
                  {tournament.active && tournament.mode !== "none" && (
                    <div className="flex flex-col gap-1.5 mt-3 p-3 bg-teal-950/20 border border-teal-500/30 rounded-xl shadow-[0_0_15px_rgba(20,184,166,0.2)] relative overflow-hidden group w-full">
                      <div className="absolute top-0 right-0 p-1 opacity-5 pointer-events-none text-teal-900"><RefreshCw className="w-16 h-16 animate-spin-slow" /></div>
                      <div className="flex items-center justify-between relative z-10 border-b border-teal-900/30 pb-1.5">
                        <span className="text-teal-500 font-black text-[9px] uppercase tracking-[0.2em]">DATOS DE TORNEO</span>
                        <span className="bg-teal-900 text-amber-200 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-500/30 animate-pulse uppercase">
                          RONDA {tournament.currentRound} / {tournament.maxRounds}
                        </span>
                      </div>

                      {(() => {
          const baseNameW = whiteEngineName || (whiteEngineType === "atlas" ? "Atlas.1" : whiteEngineType === "edd" ? "Nexus" : whiteEngineType === "obsidian" ? "Obsidian" : whiteEngineType === "obsidian" ? "DxA.47" : whiteEngineType.startsWith("maia") ? "Maia: " + whiteEngineType.substring(4) : whiteEngineType === "ailed" ? "Ailed" : "Stockfish");
                        const whiteName = whitePlayer === "human" ? (effectivePlayerName || "Humano") : baseNameW;

          const baseNameB = blackEngineName || (blackEngineType === "atlas" ? "Atlas.1" : blackEngineType === "edd" ? "Nexus" : blackEngineType === "obsidian" ? "Obsidian" : blackEngineType === "obsidian" ? "DxA.47" : blackEngineType.startsWith("maia") ? "Maia: " + blackEngineType.substring(4) : blackEngineType === "ailed" ? "Ailed" : "Stockfish");
                        const blackName = blackPlayer === "human" ? (effectivePlayerName || "Humano") : baseNameB;

                        const wStats = tournamentWins[whiteName] || { w: 0, b: 0, d: 0 };
                        const bStats = tournamentWins[blackName] || { w: 0, b: 0, d: 0 };

                        const totalWinsW = wStats.w + wStats.b;
                        const totalWinsB = bStats.w + bStats.b;
                        // Empates: la mitad de los d de cada uno (ya que ambos reciben el mismo empate)
                        const totalDraws = Math.max(wStats.d, bStats.d);
                        const totalGames = totalWinsW + totalWinsB + totalDraws;
                        const gamesRemaining = tournament.mode === "rounds" ? Math.max(0, tournament.maxRounds - totalGames) : null;
                        const ptsW = (totalWinsW + wStats.d * 0.5).toFixed(1);
                        const ptsB = (totalWinsB + bStats.d * 0.5).toFixed(1);

                        let winningText = "⚖️ Empate técnico";
                        let leaderColor = "text-amber-400";
                        if (totalWinsW > totalWinsB) { winningText = `🥇 ${whiteName}`; leaderColor = "text-emerald-400"; }
                        else if (totalWinsB > totalWinsW) { winningText = `🥇 ${blackName}`; leaderColor = "text-teal-400"; }

                        return (
                          <div className="flex flex-col gap-2.5 mt-2 relative z-10">
                            {showMainScreen && !isAdventureModeOpen && (
                              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in zoom-in-95 duration-1000">
                                <div className="flex flex-col items-center max-w-lg w-full bg-slate-950/80 p-8 sm:p-12 rounded-[2rem] border border-teal-900/50 shadow-[0_0_50px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(20,184,166,0.1)] backdrop-blur-md relative overflow-hidden group">
                                </div>
                              </div>
                            )}
                            {/* Marcador principal */}
                            <div className="grid grid-cols-3 gap-1.5 items-center">
                              {/* Jugador Blancas */}
                              <div className="flex flex-col items-center p-2 bg-gradient-to-b from-emerald-950/60 to-black/60 border border-emerald-500/20 rounded-xl">
                                <span className="text-[9px] text-emerald-400 font-black uppercase truncate w-full text-center mb-1.5 border-b border-emerald-500/10 pb-1">{whiteName}</span>
                                <span className="text-2xl font-black text-emerald-300 leading-none drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]">{totalWinsW}</span>
                                <span className="text-[8px] text-emerald-600 uppercase font-bold mt-0.5">victorias</span>
                                <div className="flex gap-2 mt-1.5 text-[8px]">
                                  <span className="text-slate-500">T: <span className="text-slate-300 font-bold">{wStats.d}</span></span>
                                  <span className="text-emerald-500/60">·</span>
                                  <span className="text-slate-500">Pts: <span className="text-emerald-300 font-bold">{ptsW}</span></span>
                                </div>
                              </div>
                              {/* Centro: empates y total */}
                              <div className="flex flex-col items-center gap-1">
                                <div className="text-[8px] text-slate-500 uppercase font-bold">Empates</div>
                                <div className="text-xl font-black text-amber-400 leading-none">{totalDraws}</div>
                                <div className="w-full h-px bg-slate-800 my-0.5" />
                                <div className="text-[8px] text-slate-600 uppercase">Total</div>
                                <div className="text-sm font-black text-slate-300">{totalGames}</div>
                                {gamesRemaining !== null && (
                                  <div className="text-[8px] text-slate-500 text-center leading-tight">
                                    <span className="text-amber-400 font-bold">{gamesRemaining}</span> restantes
                                  </div>
                                )}
                              </div>
                              {/* Jugador Negras */}
                              <div className="flex flex-col items-center p-2 bg-gradient-to-b from-teal-950/60 to-black/60 border border-teal-500/20 rounded-xl">
                                <span className="text-[9px] text-teal-400 font-black uppercase truncate w-full text-center mb-1.5 border-b border-teal-500/10 pb-1">{blackName}</span>
                                <span className="text-2xl font-black text-teal-300 leading-none drop-shadow-[0_0_10px_rgba(45,212,191,0.4)]">{totalWinsB}</span>
                                <span className="text-[8px] text-teal-600 uppercase font-bold mt-0.5">victorias</span>
                                <div className="flex gap-2 mt-1.5 text-[8px]">
                                  <span className="text-slate-500">T: <span className="text-slate-300 font-bold">{bStats.d}</span></span>
                                  <span className="text-teal-500/60">·</span>
                                  <span className="text-slate-500">Pts: <span className="text-teal-300 font-bold">{ptsB}</span></span>
                                </div>
                              </div>
                            </div>

                            {/* Barra de progreso */}
                            {tournament.mode === "rounds" && (
                              <div className="flex flex-col gap-1 px-1">
                                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                                  <div
                                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500 rounded-full transition-all duration-700"
                                    style={{ width: `${Math.min(100, (totalGames / tournament.maxRounds) * 100)}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[8px] text-slate-600 font-bold uppercase">
                                  <span>{totalGames} jugadas</span>
                                  <span className="text-amber-500">{tournament.maxRounds} totales</span>
                                </div>
                              </div>
                            )}

                            {/* Líder actual */}
                            <div className={cn("text-center text-[10px] font-black py-1.5 rounded-xl border uppercase tracking-wider bg-black/40", leaderColor === "text-emerald-400" ? "border-emerald-500/20" : leaderColor === "text-teal-400" ? "border-teal-500/20" : "border-amber-500/20")}>
                              <span className={leaderColor}>{winningText}</span>
                            </div>

                            {/* Botón de reinicio de datos del torneo */}
                            <button
                              onClick={() => {
                                setTournamentWins({});
                                setTournamentGameLog([]);
                                localStorage.removeItem("chess_tournamentWinsV1");
                                setTournament(p => ({ ...p, currentRound: 1 }));
                              }}
                              className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[9px] font-bold text-rose-400/70 hover:text-rose-300 border border-rose-900/30 hover:border-rose-500/30 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 transition-all uppercase tracking-widest"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              Reiniciar datos del torneo
                            </button>
                          </div>
                        );

                      })()}

                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
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
                    {isRightPanelOpen && isFullscreen && (
                      <button
                        onClick={() => setIsRightPanelOpen(false)}
                        title={language === "es" ? "Ocultar Panel" : "Hide Panel"}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm",
                          "bg-purple-900/50 hover:bg-purple-800/50 text-purple-400 border border-purple-900"
                        )}
                      >
                        <ChevronDown className="w-3.5 h-3.5 transition-transform rotate-90" />
                        <span className="hidden sm:inline">{language === "es" ? "Ocultar Panel" : "Hide Panel"}</span>
                      </button>
                    )}
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

              <div className="bg-slate-950/90 rounded-xl border border-teal-900/20 flex flex-col flex-1 h-full min-h-0 shrink-0 overflow-visible relative shadow-[inset_0_0_30px_rgba(0,0,0,0.4)]">
                <div className="flex justify-between items-center bg-black/60 border-b border-teal-900/30 relative z-20 shadow-[0_1px_8px_rgba(0,0,0,0.5)] backdrop-blur-sm">
                  <div className="flex">
                    {activeAdventureEnemy && (
                      <button
                        onClick={() => setRightTab("lore")}
                        className={cn(
                          "px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors",
                          rightTab === "lore"
                            ? "text-amber-500 border-b-2 border-amber-500 bg-slate-950/80"
                            : "text-slate-500 hover:text-slate-400",
                        )}
                      >
                        Códice
                      </button>
                    )}
                    <button
                      onClick={() => setRightTab("history")}
                      className={cn(
                        "mobile-hide-history px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors relative",
                        rightTab === "history"
                          ? "text-slate-200 border-b-2 border-slate-200 bg-slate-800/50"
                          : "text-slate-500 hover:text-slate-400",
                      )}
                    >
                      {language === "es" ? "Historial" : "History"}
                    </button>
                  </div>
                  <div className="flex items-center ml-auto pr-2 mobile-hide-history">
                    <button
                      onClick={copyPgnAsTxt}
                      title={language === "es" ? "Copiar PGN" : "Copy PGN"}
                      className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800/50 rounded-lg transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 relative h-full min-h-0 flex flex-col bg-slate-900/60 text-amber-500 rounded overflow-hidden">
                  {rightTab === "lore" && activeAdventureEnemy ? (
                    <AdventureBotPanel enemy={activeAdventureEnemy} onShowHistory={() => setRightTab("history")} showEnemyElo={showEnemyElo} />
                  ) : (
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

                      whitePlayer={whitePlayer}
                      blackPlayer={blackPlayer}
                      viewingMoveIndex={viewingMoveIndex}
                      onMoveClick={(idx: number, keepAutoPlay?: boolean) => {
                        setViewingMoveIndex(idx);
                        if (!keepAutoPlay) setIsAutoPlaying(false);
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
                      isAnalyzing={isAnalyzing}
                      analysisProgress={analysisProgress}
                      isAutoPlaying={isAutoPlaying}
                      setIsAutoPlaying={setIsAutoPlaying}
                      totalMoves={history.length}
                    />
                  )}
                </div>
              </div>
            </aside>
          </>
        )}
      </main>

      {/* Botón Flotante Panel - Solo cuando está cerrado */}
      {!isRightPanelOpen && (
        <button
          onClick={() => setIsRightPanelOpen(true)}
          className={cn(
            "fixed left-1.5 md:left-2 bottom-4 md:top-1/2 md:-translate-y-1/2 md:bottom-auto flex items-center justify-center w-10 h-12 md:h-16 rounded-xl transition-all shadow-lg group backdrop-blur-sm z-50",
            "bg-teal-800/80 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-600/50 hover:border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)]"
          )}
          title={language === "es" ? "Mostrar Panel" : "Show Panel"}
        >
          <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      {isConfigSidebarOpen && (
        <div className="fixed inset-0 z-[5000] flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsConfigSidebarOpen(false)}
          />
          <div className={cn(
            "relative w-[95vw] sm:w-[760px] h-full border-l flex flex-col transform transition-transform animate-in slide-in-from-right duration-300 medieval-panel shadow-2xl z-[5001] overflow-hidden",
            getSidebarThemeClasses()
          )}>
            <div className={cn("flex flex-col justify-between p-4 pt-12 border-b bg-transparent relative z-10",
              appTheme === "matrix" ? "border-emerald-900/50" :
                appTheme === "emerald" ? "border-emerald-800" :
                  appTheme === "nebula" ? "border-purple-500/20" : "border-white/5")}>
              <div className="flex justify-between items-center gap-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Settings className={cn("w-5 h-5",
                    appTheme === "matrix" ? "text-emerald-400" :
                      appTheme === "nebula" ? "text-purple-400" :
                        appTheme === "linux" ? "text-orange-400" : "text-emerald-400")} />
                  {language === "es" ? "Configuración" : "Settings"}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      playAudio("hover_mode");
                      cleanupPreviousSession();
                      setIsConfigSidebarOpen(false);
                      setShowMainScreen(true);
                      setHasStarted(false);
                      setCurrentGameMode("normal");
                      setIsAdventureModeOpen(false);
                    }}
                    title={language === "es" ? "Volver al Inicio" : "Back to Home"}
                    className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
                  >
                    <Home className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowProfileView(true)}
                    title={language === "es" ? "Perfil" : "Profile"}
                    className="text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
                  >
                    <User className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-row flex-1 overflow-hidden min-h-0">
              <div className="w-[35%] min-w-[200px] h-full overflow-y-auto overflow-x-hidden border-r border-white/5 p-3 custom-scrollbar relative z-10">
                <SidebarProfileSummary profile={profileHook} language={language} fallbackName={effectivePlayerName} matchStats={matchStats} onClick={() => setShowProfileView(true)} />
                {IS_WEB_VERSION && (
                  <div className="mt-2 p-3 rounded-xl bg-amber-950/20 border border-amber-500/15">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Monitor className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wide">
                        {language === "es" ? "Versión de escritorio" : "Desktop Version"}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-relaxed">
                      {language === "es"
                        ? "Para una experiencia más completa, instale la versión de escritorio que incluye: análisis con IA en lenguaje natural, lectura por voz con voces realistas y multijugador por LAN."
                        : "For a more complete experience, install the desktop version which includes: AI analysis in natural language, voice reading with realistic voices, and LAN multiplayer."}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 custom-scrollbar relative z-10">

              {(currentGameMode === "adventure" || isAdventureModeOpen) ? (
                <div className="bg-[#120d08] p-6 rounded-xl border-2 border-[#3d2b1f] shadow-[0_10px_40px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(60,30,10,0.4)] flex flex-col gap-5 text-center relative overflow-hidden group">
                  {/* Textura de pergamino/piedra oscura */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]" />
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-900/5 to-transparent pointer-events-none" />

                  {/* Adorno superior */}
                  <div className="flex justify-center items-center gap-2 mb-1">
                    <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-amber-900" />
                    <Sword className="w-4 h-4 text-amber-700/60" />
                    <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-amber-900" />
                  </div>

                  <h3 className="text-base font-black text-amber-600 uppercase tracking-[0.3em] relative z-10" style={{ fontFamily: "Georgia, serif", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                    Crónicas Mortales
                  </h3>

                  {/* Selector de Alias Gótico en el Sidebar */}
                  <div className="relative group/alias z-10 mx-1">
                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-900/20 via-amber-600/20 to-amber-900/20 rounded-xl blur opacity-30 group-hover/alias:opacity-50 transition duration-1000"></div>
                    <div className="relative bg-black/60 border border-amber-900/40 rounded-xl p-2 px-3 flex items-center gap-3 focus-within:border-amber-500/50 transition-all">
                      <User className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <div className="flex flex-col flex-1 text-left">
                        <span className="text-[8px] text-amber-900 font-bold uppercase tracking-widest leading-none mb-1">
                          {language === "es" ? "Identidad en la Aventura" : "Adventure Identity"}
                        </span>
                        <input
                          type="text"
                          placeholder={playerName || (language === "es" ? "Tu alias..." : "Your alias...")}
                          value={adventurePlayerName}
                          onChange={(e) => setAdventurePlayerName(e.target.value)}
                          className="bg-transparent border-none text-[10px] text-amber-200 font-bold outline-none placeholder-amber-900/40 uppercase tracking-widest"
                          maxLength={15}
                        />
                      </div>
                      {adventurePlayerName && (
                        <button onClick={() => setAdventurePlayerName("")} className="text-amber-900 hover:text-amber-500 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 relative z-10">
                    <div className="flex flex-col items-center bg-black/40 p-3 rounded-lg border border-amber-900/20">
                      <span className="text-[10px] text-amber-700 font-bold uppercase tracking-widest mb-1">{language === "es" ? "Rango actual" : "Current Rank"}</span>
                      <span className="font-black text-amber-500 text-xl tracking-wider uppercase drop-shadow-md">
                        {adventureProgress.currentStage >= 8 ? "Emperador" : adventureProgress.currentStage >= 7 ? "Rey" : adventureProgress.currentStage >= 6 ? "Duque" : adventureProgress.currentStage >= 5 ? "Conde" : adventureProgress.currentStage >= 4 ? "Barón" : adventureProgress.currentStage >= 3 ? "Capitán" : adventureProgress.currentStage >= 2 ? "Caballero" : "Siervo"}
                      </span>
                    </div>

                    <div className="bg-black/30 p-3 rounded-lg border border-amber-900/10 space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] text-amber-800 font-bold uppercase">{language === "es" ? "Almas Cosechadas" : "Souls Harvested"}:</span>
                          <span className="text-[8px] text-amber-900/60 italic leading-none">{language === "es" ? "En el Códice" : "In the Codex"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-amber-400 text-sm tracking-widest">{adventureProgress.humanBattles} <span className="text-[10px] text-amber-700 opacity-40">/ 3000</span></span>
                          <button
                            onClick={() => {
                              if (confirm(language === "es" ? "¿Restaurar el contador de Crónicas? (Se pondrá a 0)" : "Reset Chronicles counter? (Will be set to 0)")) {
                                if (!isGuestMode) setAdventureProgress(prev => ({ ...prev, humanBattles: 0 }));
                              }
                            }}
                            className="p-1 hover:bg-amber-900/20 rounded-md transition-colors text-amber-900 hover:text-amber-500"
                            title={language === "es" ? "Restaurar contador" : "Reset counter"}
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Línea de progreso al siguiente rango */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-end text-[8px] uppercase tracking-widest font-bold">
                          <span className="text-amber-900/60">{language === "es" ? "Progreso de Rango" : "Rank Progress"}</span>
                          <span className="text-amber-600">
                            {(() => {
                              const ranks = [0, 100, 300, 600, 1000, 1500, 2000, 2500, 3000];
                              const next = ranks.find(r => r > adventureProgress.humanBattles) || 3000;
                              return language === "es" ? `Faltan ${next - adventureProgress.humanBattles} para subir` : `${next - adventureProgress.humanBattles} left to rank up`;
                            })()}
                          </span>
                        </div>
                        <div className="h-1 bg-black/60 rounded-full overflow-hidden border border-amber-900/20">
                          <div
                            className="h-full bg-gradient-to-r from-amber-900 via-amber-600 to-amber-400 transition-all duration-1000 shadow-[0_0_8px_rgba(180,83,9,0.3)]"
                            style={{
                              width: `${(() => {
                                const ranks = [0, 100, 300, 600, 1000, 1500, 2000, 2500, 3000];
                                const current = [...ranks].reverse().find(r => r <= adventureProgress.humanBattles) || 0;
                                const next = ranks.find(r => r > adventureProgress.humanBattles) || 3000;
                                return ((adventureProgress.humanBattles - current) / (next - current)) * 100;
                              })()}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 mt-1 border-t border-white/5 animate-in slide-in-from-right-2 duration-500">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-3 h-3 text-amber-500" />
                      <h4 className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Atmósfera y Audio</h4>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-semibold">Volumen Música</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={adventureMusicVolume}
                        onChange={(e) => setAdventureMusicVolume(parseFloat(e.target.value))}
                        className="w-24 h-1 cursor-pointer accent-amber-500 bg-slate-800 rounded-full appearance-none"
                      />
                    </div>

                    <label className="flex items-center justify-between cursor-pointer" title="Permite que la música de ambiente siga sonando durante el combate.">
                      <span className="text-[10px] text-slate-400 font-semibold">Música en Partida</span>
                      <input type="checkbox" className="hidden" checked={keepMusicDuringGame} onChange={() => setKeepMusicDuringGame(!keepMusicDuringGame)} />
                      <div className={cn("w-8 h-4 rounded-full transition-all relative flex items-center", keepMusicDuringGame ? "bg-amber-600" : "bg-slate-700")}>
                        <div className={cn("absolute w-3 h-3 bg-white rounded-full transition-all shadow-md", keepMusicDuringGame ? "right-0.5" : "left-0.5")} />
                      </div>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer" title="Ver fondo de aventura sin desenfoque (Alta calidad).">
                      <span className="text-[10px] text-slate-400 font-semibold">Fondo Alta Calidad</span>
                      <input type="checkbox" className="hidden" checked={adventureBgHighQuality} onChange={() => setAdventureBgHighQuality(!adventureBgHighQuality)} />
                      <div className={cn("w-8 h-4 rounded-full transition-all relative flex items-center", adventureBgHighQuality ? "bg-cyan-600" : "bg-slate-700")}>
                        <div className={cn("absolute w-3 h-3 bg-white rounded-full transition-all shadow-md", adventureBgHighQuality ? "right-0.5" : "left-0.5")} />
                      </div>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-[10px] text-slate-400 font-semibold">Mostrar ELO Rivales</span>
                      <input type="checkbox" className="hidden" checked={showEnemyElo} onChange={() => setShowEnemyElo(!showEnemyElo)} />
                      <div className={cn("w-8 h-4 rounded-full transition-all relative flex items-center", showEnemyElo ? "bg-red-600" : "bg-slate-700")}>
                        <div className={cn("absolute w-3 h-3 bg-white rounded-full transition-all shadow-md", showEnemyElo ? "right-0.5" : "left-0.5")} />
                      </div>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer" title="Activar/desactivar lluvia, rayos, partículas y otros efectos de ambiente en modo aventura.">
                      <span className="text-[10px] text-slate-400 font-semibold">Animaciones Aventura</span>
                      <input type="checkbox" className="hidden" checked={adventureAnimationsEnabled} onChange={() => setAdventureAnimationsEnabled(!adventureAnimationsEnabled)} />
                      <div className={cn("w-8 h-4 rounded-full transition-all relative flex items-center", adventureAnimationsEnabled ? "bg-purple-600" : "bg-slate-700")}>
                        <div className={cn("absolute w-3 h-3 bg-white rounded-full transition-all shadow-md", adventureAnimationsEnabled ? "right-0.5" : "left-0.5")} />
                      </div>
                    </label>
                  </div>

                  {activeAdventureEnemy && !hasStarted && (
                    <button
                      onClick={startGame}
                      className="w-full py-4 bg-gradient-to-b from-rose-900 to-rose-950 hover:from-rose-800 hover:to-rose-900 text-amber-100 border border-amber-600/30 rounded-lg font-black uppercase tracking-[0.4em] text-[12px] shadow-2xl transition-all animate-pulse hover:animate-none hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 relative z-10 border-t-rose-700"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      <Sword className="w-5 h-5 text-amber-500" />
                      {language === "es" ? "ENTRAR EN COMBATE" : "ENTER COMBAT"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsAdventureModeOpen(true);
                      setShowMainScreen(false);
                      setIsConfigSidebarOpen(false);
                    }}
                    className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/15 text-amber-200 border border-amber-600/20 rounded-xl font-black uppercase tracking-[0.4em] text-[11px] transition-all mt-2 relative z-10"
                  >
                    {language === "es" ? "Abrir menú de aventura" : "Open Adventure Menu"}
                  </button>
                  <button
                    onClick={exitAdventure}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-stone-900/80 hover:bg-rose-950 text-amber-500 hover:text-rose-400 border border-amber-900/40 hover:border-rose-900 transition-all rounded-xl text-[10px] font-black uppercase tracking-widest group mt-2 relative z-10"
                  >
                    <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                    {language === "es" ? "Salir de la Aventura" : "Exit Adventure"}
                  </button>
                </div>
              ) : isAdventureModeOpen ? (
                <>
                  <button
                    onClick={() => {
                      setIsAdventureModeOpen(false);
                      setCurrentGameMode("normal");
                      setShowMainScreen(true);
                    }}
                    className="w-full py-4 bg-slate-900/90 hover:bg-slate-800 border-2 border-amber-500/30 text-amber-400 rounded-2xl font-black uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-2 shadow-lg group mb-4"
                  >
                    <ChevronLeft className="w-6 h-6 group-hover:-translate-x-2 transition-transform" />
                    <span>Regresar al Inicio</span>
                    <span className="text-[8px] opacity-40 font-normal">Cerrar menú de aventura</span>
                  </button>
                </>
              ) : null}

              {currentGameMode === "normal" && !activeAdventureEnemy && (
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm">
                  <h3 className="text-xs font-bold text-slate-300 mb-3 px-1 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-400" /> Interfaz y Motor
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5 px-1">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                        Idioma
                      </span>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2 outline-none focus:border-emerald-500/50 transition-all cursor-pointer appearance-none"
                      >
                        <option value="es" className="bg-slate-800 text-white">ES (R,D,T,A,C)</option>
                        <option value="en" className="bg-slate-800 text-white">EN (K,Q,R,B,N)</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                        Tamaño Tablero
                      </span>
                      <select
                        value={boardSize}
                        onChange={(e) => setBoardSize(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2 outline-none focus:border-emerald-500/50 transition-all cursor-pointer appearance-none"
                      >
                        <option value="small">Pequeño (Móvil)</option>
                        <option value="medium">Normal</option>
                        <option value="large">Grande</option>
                        <option value="fill">Ajustar Pantalla</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                        {language === "es" ? "Alineación" : "Alignment"}
                      </span>
                      <select
                        value={boardAlign}
                        onChange={(e) => setBoardAlign(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2 outline-none focus:border-emerald-500/50 transition-all cursor-pointer appearance-none"
                      >
                        <option value="center" className="bg-slate-800 text-white">{language === "es" ? "Centro" : "Center"}</option>
                        <option value="left" className="bg-slate-800 text-white">{language === "es" ? "Izquierda" : "Left"}</option>
                        <option value="right" className="bg-slate-800 text-white">{language === "es" ? "Derecha" : "Right"}</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                        Tema Tablero
                      </span>
                      <select
                        value={boardTheme}
                        onChange={(e) => setBoardTheme(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2 outline-none focus:border-emerald-500/50 transition-all cursor-pointer appearance-none"
                      >
                        <option value="gray">Grisáceo (Predeterminado)</option>
                        <option value="neural">Neural (Cyber)</option>
                        <option value="gothic">Gótico (Piedra)</option>
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
                              ? "bg-emerald-600"
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
                      {currentGameMode === "normal" && !activeAdventureEnemy && (
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
                      )}
                      {currentGameMode === "normal" && !activeAdventureEnemy && (
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
                      )}
                    </div>
                  </div>
                  {/* --- Configuración de IA para Análisis --- */}
                  {currentGameMode === "normal" && !activeAdventureEnemy && !IS_WEB_VERSION && (
                    <div className="bg-gradient-to-br from-violet-950/30 to-purple-950/20 rounded-2xl border border-violet-500/20 shadow-sm mt-3">
                      <button
                        onClick={() => setShowAIConfigExpanded(!showAIConfigExpanded)}
                        className="w-full flex items-center justify-between p-4 text-left"
                      >
                        <h3 className="text-xs font-bold text-violet-300 flex items-center gap-2">
                          <Brain className="w-4 h-4 text-violet-400" /> Análisis con IA
                        </h3>
                        <ChevronDown className={cn("w-4 h-4 text-violet-400/60 transition-transform duration-200", showAIConfigExpanded && "rotate-180")} />
                      </button>
                      {showAIConfigExpanded && (
                      <div className="px-4 pb-4">
                      <p className="text-[8px] text-violet-400/50 mb-3 leading-relaxed">
                        Configura un proveedor de inteligencia artificial para obtener análisis profundos de tus partidas. La IA actúa como Gran Maestro y evalúa cada jugada, errores, fortalezas y debilidades.
                       </p>
                       <div className="mb-3 px-3 py-2 bg-emerald-950/30 border border-emerald-500/25 rounded-xl flex items-center gap-2">
                         <span className="text-[10px]">💡</span>
                         <span className="text-[9px] text-emerald-300 font-semibold">Se recomienda OpenRouter con el modelo "Auto-Router" — ese debe ser el predeterminado cuando conecte su API.</span>
                       </div>

                      {/* Botón para mostrar/ocultar ayuda */}
                      <button
                        onClick={() => {
                          const el = document.getElementById('ai-help-section');
                          if (el) el.classList.toggle('hidden');
                        }}
                        className="w-full text-[9px] text-violet-300 bg-violet-900/30 hover:bg-violet-900/50 border border-violet-500/20 rounded-lg py-1.5 px-2 mb-2 transition-all flex items-center gap-1.5"
                      >
                        <span>?</span> ¿Cómo funciona? Guía completa
                      </button>

                      {/* Sección de ayuda expandible */}
                      <div id="ai-help-section" className="hidden mb-3">
                        <div className="bg-violet-950/50 border border-violet-500/15 rounded-xl p-3 flex flex-col gap-2.5">
                          <div>
                            <span className="text-[9px] font-black text-violet-300 uppercase tracking-widest">1. Elige un Proveedor</span>
                            <p className="text-[8px] text-slate-400 mt-1 leading-relaxed">
                              Los proveedores son servicios que ofrecen modelos de lenguaje (IA). Algunos son gratuitos, otros de pago. Selecciona el que prefieras en el menú desplegable.
                            </p>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-violet-300 uppercase tracking-widest">2. Selecciona un Modelo</span>
                            <p className="text-[8px] text-slate-400 mt-1 leading-relaxed">
                              Cada proveedor tiene varios modelos. Los más rápidos son ideales para análisis rápidos; los más grandes dan respuestas más detalladas.
                            </p>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-violet-300 uppercase tracking-widest">3. Obtén tu API Key</span>
                            <p className="text-[8px] text-slate-400 mt-1 leading-relaxed">
                              Cada proveedor te da una clave de acceso (API Key). Es como tu contraseña personal. Créala gratis en la página del proveedor y pégala aquí. Ejemplos:
                            </p>
                            <div className="flex flex-col gap-1 mt-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-violet-400 font-bold w-24 shrink-0">Google Gemini:</span>
                                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[8px] text-blue-400 underline">aistudio.google.com (Gratis)</a>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-violet-400 font-bold w-24 shrink-0">OpenRouter:</span>
                                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-[8px] text-blue-400 underline">openrouter.ai/keys (Gratis)</a>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-violet-400 font-bold w-24 shrink-0">NVIDIA:</span>
                                <a href="https://build.nvidia.com/" target="_blank" rel="noopener noreferrer" className="text-[8px] text-blue-400 underline">build.nvidia.com (Gratis)</a>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-violet-400 font-bold w-24 shrink-0">Cerebras:</span>
                                <a href="https://cloud.cerebras.ai/" target="_blank" rel="noopener noreferrer" className="text-[8px] text-blue-400 underline">cloud.cerebras.ai (Gratis)</a>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-violet-400 font-bold w-24 shrink-0">Together AI:</span>
                                <a href="https://api.together.xyz/settings/api-keys" target="_blank" rel="noopener noreferrer" className="text-[8px] text-blue-400 underline">api.together.xyz ($5 crédito gratis)</a>
                              </div>
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-violet-300 uppercase tracking-widest">4. Análisis Técnico (Opcional)</span>
                            <p className="text-[8px] text-slate-400 mt-1 leading-relaxed">
                              Actívalo para recibir un segundo análisis enfocado en táctica y posición. La IA analiza cambios de piezas, calidad de cálculo, desviaciones y más. Tarda el doble pero es más completo.
                            </p>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-violet-300 uppercase tracking-widest">5. Seguridad</span>
                            <p className="text-[8px] text-slate-400 mt-1 leading-relaxed">
                              Tu API Key se guarda únicamente en tu navegador (localStorage). Nunca se envía a ningún servidor nuestro. Solo el proveedor que elijas la recibirá para generar el análisis.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Configuración principal */}
                      <div className="flex flex-col gap-2.5 px-1">
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block mb-1">Proveedor</span>
                          <select
                            value={aiProvider}
                            onChange={(e) => {
                              const newProvider = e.target.value;
                              setAiProvider(newProvider);
                              setAiModel(getDefaultModel(newProvider));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2 outline-none focus:border-violet-500/50 transition-all cursor-pointer appearance-none"
                          >
                            {AI_PROVIDERS.map((p) => (
                              <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {aiProvider !== "custom" && getProviderById(aiProvider)?.models.length > 0 && (
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block mb-1">Modelo</span>
                            <select
                              value={aiModel}
                              onChange={(e) => setAiModel(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2 outline-none focus:border-violet-500/50 transition-all cursor-pointer appearance-none"
                            >
                              {getProviderById(aiProvider)?.models.map((m) => (
                                <option key={m.id} value={m.id} className="bg-slate-800 text-white">
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {aiProvider === "custom" && (
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block mb-1">URL del Endpoint</span>
                            <input
                              type="text"
                              value={aiCustomUrl}
                              onChange={(e) => setAiCustomUrl(e.target.value)}
                              placeholder="https://api.example.com/v1/chat/completions"
                              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2 outline-none focus:border-violet-500/50 transition-all placeholder:text-slate-600"
                            />
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block mb-1">API Key — {getProviderById(aiProvider)?.name || aiProvider}</span>
                          <input
                            type="password"
                            value={aiApiKey}
                            onChange={(e) => setAiApiKey(e.target.value)}
                            placeholder={getProviderById(aiProvider)?.apiKeyPlaceholder || "sk-..."}
                            className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl p-2 outline-none focus:border-violet-500/50 transition-all placeholder:text-slate-600"
                          />
                          {aiApiKey && (
                            <span className="text-[7px] text-emerald-400 mt-1 block">✓ API Key configurada para {getProviderById(aiProvider)?.name || aiProvider}</span>
                          )}
                          {!aiApiKey && (
                            <span className="text-[7px] text-amber-400/60 mt-1 block">Ingresa la API Key de este proveedor</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-semibold">Análisis Técnico</span>
                            <span className="text-[8px] text-slate-500">Complemento posicional/táctico</span>
                          </div>
                          <button
                            onClick={() => handleToggleTechnicalAnalysis(!enableTechnicalAnalysis)}
                            className={cn(
                              "w-8 h-4 rounded-full transition-all relative flex items-center cursor-pointer",
                              enableTechnicalAnalysis ? "bg-violet-500" : "bg-slate-700"
                            )}
                          >
                            <div
                              className={cn(
                                "absolute w-3 h-3 bg-white rounded-full transition-all shadow-md",
                                enableTechnicalAnalysis ? "right-0.5" : "left-0.5"
                              )}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-semibold">Confirmar al salir</span>
                            <span className="text-[8px] text-slate-500">Preguntar antes de volver al menú</span>
                          </div>
                          <button
                            onClick={() => setDisableExitGuard(!disableExitGuard)}
                            className={cn(
                              "w-8 h-4 rounded-full transition-all relative flex items-center cursor-pointer",
                              !disableExitGuard ? "bg-violet-500" : "bg-slate-700"
                            )}
                          >
                            <div
                              className={cn(
                                "absolute w-3 h-3 bg-white rounded-full transition-all shadow-md",
                                !disableExitGuard ? "right-0.5" : "left-0.5"
                              )}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-semibold">Reproducir voz al convertir</span>
                            <span className="text-[8px] text-slate-500">Audio se reproduce automáticamente</span>
                          </div>
                          <button
                            onClick={() => {
                              const current = localStorage.getItem("chess_autoPlayTts") !== "false";
                              localStorage.setItem("chess_autoPlayTts", String(!current));
                            }}
                            className="w-8 h-4 rounded-full bg-violet-500 transition-all relative flex items-center cursor-pointer"
                          >
                            <div className="absolute w-3 h-3 bg-white rounded-full transition-all shadow-md right-0.5" />
                          </button>
                        </div>

                        {/* Estado de la configuración */}
                        {aiApiKey ? (
                          <div className="text-[8px] text-emerald-400/80 bg-emerald-950/30 border border-emerald-500/15 rounded px-2 py-1.5 mt-1 leading-relaxed">
                            ✓ Todo listo para {getProviderById(aiProvider)?.name}. El análisis de IA estará disponible al finalizar una partida o desde el selector de modo de análisis.
                          </div>
                        ) : (
                          <div className="text-[8px] text-amber-400/60 bg-amber-950/20 border border-amber-500/10 rounded px-2 py-1.5 mt-1 leading-relaxed">
                            Configura la API Key de {getProviderById(aiProvider)?.name || "este proveedor"} para usar el análisis de IA.
                          </div>
                        )}
                      </div>
                      </div>
                    )}
                    </div>
                  )}
                  {/* --- Mensaje de IA no disponible en versión web --- */}
                  {currentGameMode === "normal" && !activeAdventureEnemy && IS_WEB_VERSION && (
                    <div className="bg-gradient-to-br from-violet-950/30 to-purple-950/20 rounded-2xl border border-violet-500/20 shadow-sm mt-3 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-violet-400" />
                        <h3 className="text-xs font-bold text-violet-300">
                          {language === "es" ? "Análisis con IA" : "AI Analysis"}
                        </h3>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-relaxed">
                        {language === "es"
                          ? "Para utilizar el análisis con IA en lenguaje natural, instale la versión de escritorio."
                          : "To use AI analysis in natural language, please install the desktop version."}
                      </p>
                    </div>
                  )}
                  {/* Asistencia: SOLO Humano vs Máquina en modo clásico */}
                      {currentGameMode === "normal" && !activeAdventureEnemy &&
                        ((whitePlayer === "human" && blackPlayer === "ai") || (whitePlayer === "ai" && blackPlayer === "human")) && (
                          <div className="flex flex-col gap-2 mt-3 p-3 pb-4 bg-blue-950/30 border border-blue-500/20 rounded-xl w-full">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex flex-col">
                                <span className="text-[11px] text-blue-300 font-black uppercase tracking-wide">
                                  Modo Asistencia
                                </span>
                                <span className="text-[8px] text-slate-500">Humano vs Máquina</span>
                              </div>
                              <button
                                onClick={() => {
                                  setIsAssistModeEnabled(!isAssistModeEnabled);
                                  localStorage.setItem("chess_isAssistModeEnabled", String(!isAssistModeEnabled));
                                }}
                                className={cn(
                                  "w-10 h-5 rounded-full transition-all relative flex items-center cursor-pointer shrink-0 border",
                                  isAssistModeEnabled ? "bg-blue-500 border-blue-400/40" : "bg-slate-700 border-slate-600",
                                )}
                              >
                                <div className={cn("absolute w-4 h-4 bg-white rounded-full transition-all shadow-md", isAssistModeEnabled ? "right-0.5" : "left-0.5")} />
                              </button>
                            </div>
                            
                            {isAssistModeEnabled && (
                              <div className="flex flex-col gap-2 w-full">
                                <div className="text-[8px] text-blue-300/70 bg-blue-950/50 border border-blue-500/10 rounded px-2 py-1.5 leading-tight break-words">
                                  Activado: presiona "Sugerir" para recibir ayuda de un motor externo.
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                  <div className="flex-1 min-w-0 bg-slate-900/50 border border-slate-700/40 rounded-lg p-2 flex flex-col gap-1">
                                    <div className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.08em]">
                                      Estado Nube
                                    </div>
                                    <div className="text-[8px] text-slate-400 leading-tight break-words">
                                      {apiCloudStatus === 'checking' ? (language === 'es' ? 'Conectando...' : 'Connecting...') : apiCloudStatus === 'ok' ? (language === 'es' ? 'Conectado' : 'Connected') : (language === 'es' ? 'Desconectado' : 'Disconnected')}
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-0 bg-slate-900/50 border border-slate-700/40 rounded-lg p-2 flex flex-col gap-1">
                                    <label className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.08em]">
                                      Motor
                                    </label>
                                    <select
                                      value={assistEngineProvider}
                                      onChange={(e) => {
                                        const val = e.target.value as "local" | "lichess";
                                        setAssistEngineProvider(val);
                                        localStorage.setItem("chess_assistEngineProvider", val);
                                      }}
                                      className="bg-slate-800 text-white text-[8px] px-1.5 py-1 rounded border border-slate-700 outline-none hover:border-slate-500 cursor-pointer w-full"
                                    >
                                      <option value="local">Local</option>
                                      <option value="lichess">Nube</option>
                                      <option value="explorer">{language === "es" ? "Aperturas (BD Maestros)" : "Openings (Masters DB)"}</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                      {/* MODO PROGRESIVO: Solo en Humano vs Máquina */}
                      {currentGameMode === "normal" && !activeAdventureEnemy &&
                        ((whitePlayer === "human" && blackPlayer === "ai") || (whitePlayer === "ai" && blackPlayer === "human")) && (
                          <div className="flex flex-col gap-2 mt-3 p-3 pb-6 bg-slate-900/50 border border-slate-700/60 rounded-xl w-full">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-col">
                                <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wide">
                                  Modo Progresivo
                                </span>
                                <span className="text-[8px] text-slate-500">
                                  Nivel {progressiveState.level} | ELO {progressiveState.currentElo}
                                </span>
                              </div>
                              <button
                                onClick={() => setProgressiveState(prev => ({ ...prev, enabled: !prev.enabled }))}
                                className={cn(
                                  "w-10 h-5 relative flex items-center cursor-pointer shrink-0 border transition-all rounded-full",
                                  progressiveState.enabled ? "bg-emerald-600 border-emerald-500/40" : "bg-slate-700 border-slate-600",
                                )}
                              >
                                <div className={cn("absolute w-4 h-4 bg-white transition-all shadow-md", progressiveState.enabled ? "right-0.5" : "left-0.5")} />
                              </button>
                            </div>
                            
                            {progressiveState.enabled && (
                              <div className="grid gap-2.5 pt-2 border-t border-slate-700/40 w-full">
                                <div className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-2 flex flex-col gap-1">
                                  <label className="text-[8px] text-slate-400 font-bold uppercase">Motor</label>
                                  <select
                                    value={whitePlayer === "ai" ? whiteEngineType : blackEngineType}
                                    onChange={(e) => {
                                      const engineType = e.target.value;
                                      if (whitePlayer === "ai") setWhiteEngineType(engineType);
                                      else setBlackEngineType(engineType);
                                      const range = getEngineEloRange(engineType);
                                      setProgressiveState(prev => ({...prev, level: 1, currentElo: range.default, startElo: range.default, gamesPlayedAtLevel: 0, gamesWonAtLevel: 0, gamesLostAtLevel: 0, gamesTiedAtLevel: 0}));
                                      localStorage.setItem(whitePlayer === "ai" ? "chess_whiteEngineType" : "chess_blackEngineType", engineType);
                                    }}
                                    className="bg-slate-800 text-white text-[8px] px-1.5 py-1 rounded border border-slate-700 outline-none hover:border-slate-500 cursor-pointer w-full"
                                  >
                                    <option value="ailed">Ailed</option>
                                    <option value="stockfish">Stockfish</option>
                                  </select>
                                </div>

                                {progressiveState.level === 1 && (
                                  <div className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-2 flex flex-col gap-1">
                                    <label className="text-[8px] text-slate-400 font-bold uppercase">ELO Inicial</label>
                                    <div className="flex gap-1 items-center">
                                      <input
                                        type="range"
                                        min={getEngineEloRange(whitePlayer === "ai" ? whiteEngineType : blackEngineType).min}
                                        max={getEngineEloRange(whitePlayer === "ai" ? whiteEngineType : blackEngineType).max}
                                        step="50"
                                        value={progressiveState.startElo}
                                        onChange={(e) => {
                                          const newElo = Math.max(
                                            getEngineEloRange(whitePlayer === "ai" ? whiteEngineType : blackEngineType).min,
                                            Math.min(getEngineEloRange(whitePlayer === "ai" ? whiteEngineType : blackEngineType).max, parseInt(e.target.value))
                                          );
                                          setProgressiveState(prev => ({...prev, startElo: newElo, currentElo: newElo, level: 1, gamesPlayedAtLevel: 0, gamesWonAtLevel: 0, gamesLostAtLevel: 0, gamesTiedAtLevel: 0}));
                                        }}
                                        className="flex-1 h-1 bg-slate-700 rounded-none appearance-none cursor-pointer accent-emerald-500"
                                      />
                                      <span className="text-[8px] text-emerald-400 font-bold w-10 text-right">{progressiveState.startElo}</span>
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-1 bg-slate-950/40 border border-slate-700/30 rounded-lg p-2 text-[8px] text-slate-300">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="uppercase text-slate-400">Ganadas</span>
                                    <span className="font-black text-emerald-400">{progressiveState.gamesWonAtLevel}</span>
                                  </div>
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="uppercase text-slate-400">Perdidas</span>
                                    <span className="font-black text-red-400">{progressiveState.gamesLostAtLevel}</span>
                                  </div>
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="uppercase text-slate-400">Empatadas</span>
                                    <span className="font-black text-amber-400">{progressiveState.gamesTiedAtLevel}</span>
                                  </div>
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="uppercase text-slate-400">Próximo</span>
                                    <span className="font-black text-cyan-400">+{progressiveState.eloIncrement}</span>
                                  </div>
                                </div>

                                <div className="bg-slate-950/40 border border-slate-700/30 rounded-lg p-2 text-[8px] text-slate-300">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold uppercase text-slate-400">Progreso</span>
                                    <span>{progressiveState.gamesPlayedAtLevel}/{progressiveState.gamesPerLevel}</span>
                                  </div>
                                  <div className="mt-1 w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(progressiveState.gamesPlayedAtLevel / progressiveState.gamesPerLevel) * 100}%` }} />
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      const range = getEngineEloRange(whitePlayer === "ai" ? whiteEngineType : blackEngineType);
                                      setProgressiveState(prev => ({...prev, level: 1, currentElo: range.default, startElo: range.default, gamesPlayedAtLevel: 0, gamesWonAtLevel: 0, gamesLostAtLevel: 0, gamesTiedAtLevel: 0}));
                                    }}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-[8px] font-bold text-slate-300 py-1.5 px-2 border border-slate-700 rounded"
                                  >
                                    Reiniciar
                                  </button>
                                  <button
                                    onClick={() => {
                                      const newElo = progressiveState.currentElo - progressiveState.eloIncrement;
                                      if (newElo >= getEngineEloRange(whitePlayer === "ai" ? whiteEngineType : blackEngineType).min) {
                                        setProgressiveState(prev => ({...prev, level: Math.max(1, prev.level - 1), currentElo: newElo}));
                                      }
                                    }}
                                    disabled={progressiveState.currentElo <= getEngineEloRange(whitePlayer === "ai" ? whiteEngineType : blackEngineType).min}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-[8px] font-bold text-slate-300 py-1.5 px-2 border border-slate-700 rounded"
                                  >
                                    Bajar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setProgressiveState(prev => ({...prev, level: prev.level + 1, currentElo: prev.currentElo + prev.eloIncrement, gamesPlayedAtLevel: 0, gamesWonAtLevel: 0, gamesLostAtLevel: 0, gamesTiedAtLevel: 0}));
                                    }}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-[8px] font-bold text-slate-300 py-1.5 px-2 border border-slate-700 rounded"
                                  >
                                    Subir
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                      {/* MODO INVITADO */}
                      <div className="flex flex-col gap-2 mt-3 p-3 pb-5 bg-slate-900/50 border border-slate-700/60 rounded-xl w-full">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wide">
                              Modo Invitado
                            </span>
                            <span className="text-[8px] text-slate-500">
                              {isGuestMode ? "Los resultados no se guardan" : "Jugar sin guardar datos"}
                            </span>
                          </div>
                          <button
                            onClick={() => setIsGuestMode(!isGuestMode)}
                            className={cn(
                              "w-10 h-5 relative flex items-center cursor-pointer shrink-0 border transition-all rounded-full",
                              isGuestMode ? "bg-amber-600 border-amber-500/40" : "bg-slate-700 border-slate-600",
                            )}
                          >
                            <div className={cn("absolute w-4 h-4 bg-white transition-all shadow-md", isGuestMode ? "right-0.5" : "left-0.5")} />
                          </button>
                        </div>
                      </div>
                </div>
              )}

              {currentGameMode === "normal" && !activeAdventureEnemy && (
                <>
                  <div className="bg-[#021818]/60 p-4 rounded-2xl border border-teal-900/40 hover:border-teal-700/60 transition-colors shadow-[inset_0_0_15px_rgba(20,184,166,0.05)] relative z-10">
                    <h3 className="text-xs font-bold text-teal-400/90 mb-3 flex justify-between items-center tracking-widest uppercase" style={{ fontFamily: "Georgia, serif" }}>
                      <span>{language === "es" ? "Gestión PGN" : "PGN Management"}</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-2 mb-3">
                      <label className="w-full flex items-center justify-center gap-2 bg-[#051a1a] border border-teal-900/50 hover:bg-[#082a2a] cursor-pointer text-[10px] font-bold text-teal-300 py-2.5 rounded-xl transition-all shadow-[0_0_10px_rgba(20,184,166,0.1)]">
                        <input
                          type="file"
                          accept=".pgn"
                          onChange={loadPgn}
                          className="hidden"
                        />
                        <FolderOpen className="w-3.5 h-3.5 text-teal-400" />
                        {language === "es" ? "Cargar Archivo PGN" : "Load PGN File"}
                      </label>
                      <div className="grid grid-cols-2 gap-2 w-full">
                        <button
                          onClick={downloadPgnDataOnly}
                          className="w-full bg-[#051a1a] border border-teal-900/50 hover:bg-[#082a2a] text-[10px] font-bold text-teal-300 py-2.5 rounded-xl transition-all shadow-[0_0_10px_rgba(20,184,166,0.1)] flex items-center justify-center gap-1.5"
                        >
                          <FolderOpen className="w-3 h-3" />
                          {language === "es" ? "Profesional" : "Professional"}
                        </button>
                        <button
                          onClick={downloadPgnApp}
                          className="w-full bg-[#051a1a] border border-teal-900/50 hover:bg-[#082a2a] text-[10px] font-bold text-amber-300/90 hover:text-amber-300 py-2.5 rounded-xl transition-all shadow-[0_0_10px_rgba(180,100,0,0.15)] flex items-center justify-center gap-1.5"
                        >
                          <PawPrint className="w-3 h-3 text-amber-500/80" />
                          {language === "es" ? "Formato APP" : "APP Format"}
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-teal-900/30">
                      <h4 className="text-[10px] font-bold text-teal-600/80 mb-2 uppercase tracking-widest flex justify-between items-center" style={{ fontFamily: "Georgia, serif" }}>
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
                                {item.hasError ? "âa ï¸  " : "ðx "} {item.name}
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
                </>)}
              {currentGameMode === "normal" && !activeAdventureEnemy && (
                <>
                  <div className="grid grid-cols-2 gap-3" key="game-config-time">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm">
                      <h3 className="text-xs font-bold text-slate-300 mb-2 flex justify-between items-center">
                        <span>Tiempo de partida (Minutos)</span>
                         <span className="text-emerald-400 font-mono text-sm bg-emerald-400/10 px-2 py-0.5 rounded-md">
                           {initialTimeMin >= 60 ? `${Math.floor(initialTimeMin / 60)}:${initialTimeMin % 60 < 10 ? '0' : ''}${initialTimeMin % 60}` : `${initialTimeMin}`}:00
                         </span>
                      </h3>
                       <input
                         type="range"
                         min="1"
                         max="360"
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
                      {hasStarted && (
                        <p className="text-[9px] text-amber-400/80 mt-1.5 leading-tight">
                          Detene la partida actual para cambiar el tiempo.
                        </p>
                      )}
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm">
                      <h3 className="text-xs font-bold text-slate-300 mb-2 flex justify-between items-center">
                        <span>Incremento (Segundos)</span>
                        <span className="text-blue-400 font-mono text-sm bg-blue-400/10 px-2 py-0.5 rounded-md">
                          +{initialTimeInc}s
                        </span>
                      </h3>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={initialTimeInc}
                        onChange={(e) => {
                          setInitialTimeInc(parseInt(e.target.value));
                        }}
                        disabled={hasStarted || (lanStatusRef.current === "connected" && lanRole !== "host")}
                        className="w-full h-1.5 cursor-pointer accent-blue-500 bg-slate-800 rounded-full appearance-none opacity-80 hover:opacity-100 disabled:opacity-40 transition-opacity mt-2"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm flex flex-col" key="game-config-white">
                      <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        Blancas
                      </h4>
                      <select
                        value={whitePlayer}
                        onChange={(e) =>
                          setWhitePlayer(e.target.value as "human" | "ai")
                        }
                        disabled={!!activeAdventureEnemy}
                        className="w-full bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-[11px] font-semibold rounded-xl p-2.5 mb-3 outline-none transition-all cursor-pointer shadow-sm appearance-none text-center disabled:opacity-50"
                      >
                        <option value="human">Humano</option>
                        <option value="ai">Máquina</option>
                      </select>
                      {whitePlayer === "ai" && (
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                              <span>Motor</span>
                              <span className={`flex items-center gap-2 ${getEngineColorClass(whiteEngineType)}`}>
                                <span>{getEngineInfo(whiteEngineType).name}</span>
                                {getEngineInfo(whiteEngineType).isOwn && <span className="text-[8px] px-1.5 py-0.5 bg-amber-900/40 rounded text-amber-300 font-bold">Nuestro</span>}
                              </span>
                            </div>
                            <select
                              value={whiteEngineType}
                              onChange={(e) => setWhiteEngineType(e.target.value as any)}
                              disabled={!!activeAdventureEnemy}
                              className="w-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded-lg p-1.5 outline-none focus:border-blue-500/50 transition-all cursor-pointer disabled:opacity-50 appearance-none"
                            >
                              <option value="stockfish">Stockfish</option>
                              <option value="atlas">Atlas.1 (Nuestro)</option>
                              <option value="edd">Nexus (Nuestro)</option>
                              <option value="maia1">Maia 1</option>
                              <option value="maia2">Maia 2</option>
                              <option value="ailed">Ailed (Nuestro)</option>
                              <option value="obsidian">Obsidian (Neural)</option>

                            </select>
                            <span className="text-[8px] text-slate-500 italic block mt-1 leading-tight">Algoritmo de ajedrez seleccionado para este jugador.</span>
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
                              disabled={!!activeAdventureEnemy}
                              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600 mb-3 disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                              <span>Potencia del motor</span>
                              <span className={(whiteEngineType === "atlas" ? "text-emerald-400" : (whiteEngineType === "obsidian" ? "text-teal-400" : (whiteEngineType === "edd" ? "text-emerald-400" : (whiteEngineType.startsWith("maia") ? "text-purple-400" : (whiteEngineType === "ailed" ? "text-red-400" : "text-blue-400")))))}>
                                ~{getEloRating(whiteAiDepth, whiteEngineType)}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="3"
                              max="25"
                              value={whiteAiDepth}
                              onChange={(e) =>
                                setWhiteAiDepth(parseInt(e.target.value))
                              }
                              disabled={!!activeAdventureEnemy}
                              className={cn("w-full h-1 cursor-pointer bg-slate-800 rounded-full appearance-none disabled:opacity-50",
                                (whiteEngineType === "atlas" ? "accent-emerald-500" :
                                  (whiteEngineType === "obsidian" ? "accent-teal-500" :
                                    (whiteEngineType === "edd" ? "accent-emerald-500" :
                                      (whiteEngineType.startsWith("maia") ? "accent-purple-500" :
                                        (whiteEngineType === "ailed" ? "accent-red-500" : "accent-blue-500"))))))}
                            />
                            <span className="text-[8px] text-slate-500 italic block mt-1 leading-tight">{whiteEngineType === "obsidian" ? "En Obsidian, la profundidad controla fuerza y tiempo: valores altos mejoran el cálculo pero tardan más, valores bajos aceleran respuestas." : "Define la profundidad de análisis e inteligencia de la IA."}</span>
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
                              min="100"
                              max="5000"
                              step="100"
                              value={whiteAiSpeed}
                              onChange={(e) =>
                                setWhiteAiSpeed(parseInt(e.target.value))
                              }
                              className="w-full h-1 cursor-pointer accent-blue-500 bg-slate-800 rounded-full appearance-none disabled:opacity-50"
                            />
                            <span className="text-[8px] text-slate-500 italic block mt-1 leading-tight">Pausa visual después de pensar (no afecta la inteligencia).</span>
                          </div>
                          {whiteEngineType === "obsidian" && (
                            <div className="space-y-3 border-t border-slate-700/40 pt-3">
                              <h5 className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-semibold">Configuración Obsidian</h5>
                              <div className="grid grid-cols-1 gap-3">
                                <div>
                                  <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                                    <span>Reducción Nulo</span>
                                    <span className="text-teal-400">{whiteObsidianConfig.nullMoveReduction}</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={whiteObsidianConfig.nullMoveReduction}
                                    onChange={(e) =>
                                      setwhiteObsidianConfig((prev) => ({ ...prev, nullMoveReduction: parseInt(e.target.value) }))
                                    }
                                    className="w-full h-1 cursor-pointer accent-teal-500 bg-slate-800 rounded-full appearance-none"
                                  />
                                  <p className="text-[8px] text-slate-500 mt-1 italic">Poda agresiva que acelera el motor ignorando líneas poco prometedoras.</p>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                                    <span>Profundidad Futilidad</span>
                                    <span className="text-teal-400">{whiteObsidianConfig.futilityDepth}</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="6"
                                    value={whiteObsidianConfig.futilityDepth}
                                    onChange={(e) =>
                                      setwhiteObsidianConfig((prev) => ({ ...prev, futilityDepth: parseInt(e.target.value) }))
                                    }
                                    className="w-full h-1 cursor-pointer accent-teal-500 bg-slate-800 rounded-full appearance-none"
                                  />
                                  <p className="text-[8px] text-slate-500 mt-1 italic">Evita cálculos profundos en posiciones estables para ganar velocidad.</p>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                                    <span>Reducción LMR</span>
                                    <span className="text-teal-400">{whiteObsidianConfig.lmrReduction}</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={whiteObsidianConfig.lmrReduction}
                                    onChange={(e) =>
                                      setwhiteObsidianConfig((prev) => ({ ...prev, lmrReduction: parseInt(e.target.value) }))
                                    }
                                    className="w-full h-1 cursor-pointer accent-teal-500 bg-slate-800 rounded-full appearance-none"
                                  />
                                  <p className="text-[8px] text-slate-500 mt-1 italic">Optimiza la búsqueda reduciendo el detalle en jugadas secundarias.</p>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                                    <span>Hash Memoria (MB)</span>
                                    <span className="text-teal-400">{whiteObsidianConfig.transpositionTableSize || 8}</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="1"
                                    max="256"
                                    value={whiteObsidianConfig.transpositionTableSize || 8}
                                    onChange={(e) =>
                                      setwhiteObsidianConfig((prev) => ({ ...prev, transpositionTableSize: parseInt(e.target.value) }))
                                    }
                                    className="w-full h-1 cursor-pointer accent-teal-500 bg-slate-800 rounded-full appearance-none"
                                  />
                                </div>
                                <div className="col-span-1 flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id="whitePonder"
                                    checked={whiteObsidianConfig.enablePonder || false}
                                    onChange={(e) =>
                                      setwhiteObsidianConfig((prev) => ({ ...prev, enablePonder: e.target.checked }))
                                    }
                                    className="w-3 h-3 rounded accent-teal-500 cursor-pointer"
                                  />
                                  <label htmlFor="whitePonder" className="text-[10px] text-slate-400 cursor-pointer">Activar Ponder</label>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm flex flex-col" key="game-config-black">
                      <h4 className="text-xs font-bold text-slate-400 flex items-center gap-2 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-500" />
                        Negras
                      </h4>
                      <select
                        value={blackPlayer}
                        onChange={(e) =>
                          setBlackPlayer(e.target.value as "human" | "ai")
                        }
                        disabled={!!activeAdventureEnemy}
                        className="w-full bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-[11px] font-semibold rounded-xl p-2.5 mb-3 outline-none transition-all cursor-pointer shadow-sm appearance-none text-center disabled:opacity-50"
                      >
                        <option value="human">Humano</option>
                        <option value="ai">Máquina</option>
                      </select>
                      {blackPlayer === "ai" && (
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                              <span>Motor</span>
                              <span className={`flex items-center gap-2 ${getEngineColorClass(blackEngineType)}`}>
                                <span>{getEngineInfo(blackEngineType).name}</span>
                                {getEngineInfo(blackEngineType).isOwn && <span className="text-[8px] px-1.5 py-0.5 bg-amber-900/40 rounded text-amber-300 font-bold">Nuestro</span>}
                              </span>
                            </div>
                            <select
                              value={blackEngineType}
                              onChange={(e) => setBlackEngineType(e.target.value as any)}
                              disabled={!!activeAdventureEnemy}
                              className="w-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded-lg p-1.5 outline-none focus:border-rose-500/50 transition-all cursor-pointer disabled:opacity-50 appearance-none"
                            >
                              <option value="stockfish">Stockfish</option>
                              <option value="atlas">Atlas.1 (Nuestro)</option>
                              <option value="edd">Nexus (Nuestro)</option>
                              <option value="maia1">Maia 1</option>
                              <option value="maia2">Maia 2</option>
                              <option value="ailed">Ailed (Nuestro)</option>
                              <option value="obsidian">Obsidian (Neural)</option>

                            </select>
                            <span className="text-[8px] text-slate-500 italic block mt-1 leading-tight">Algoritmo de ajedrez seleccionado para este jugador.</span>
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
                              disabled={!!activeAdventureEnemy}
                              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-600 mb-3 disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                              <span>Potencia del motor</span>
                              <span className={(blackEngineType === "atlas" ? "text-emerald-400" : (blackEngineType === "obsidian" ? "text-teal-400" : (blackEngineType === "edd" ? "text-emerald-400" : (blackEngineType.startsWith("maia") ? "text-purple-400" : (blackEngineType === "ailed" ? "text-red-400" : "text-rose-400")))))}>
                                ~{getEloRating(blackAiDepth, blackEngineType)}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="3"
                              max="25"
                              value={blackAiDepth}
                              onChange={(e) =>
                                setBlackAiDepth(parseInt(e.target.value))
                              }
                              disabled={!!activeAdventureEnemy}
                              className={cn("w-full h-1 cursor-pointer bg-slate-800 rounded-full appearance-none disabled:opacity-50",
                                (blackEngineType === "atlas" ? "accent-emerald-500" :
                                  (blackEngineType === "obsidian" ? "accent-teal-500" :
                                    (blackEngineType === "edd" ? "accent-emerald-500" :
                                      (blackEngineType.startsWith("maia") ? "accent-purple-500" :
                                        (blackEngineType === "ailed" ? "accent-red-500" : "accent-rose-500"))))))}
                            />
                            <span className="text-[8px] text-slate-500 italic block mt-1 leading-tight">{blackEngineType === "obsidian" ? "En Obsidian, la profundidad controla fuerza y tiempo: valores altos mejoran el cálculo pero tardan más, valores bajos aceleran respuestas." : "Define la profundidad de análisis e inteligencia de la IA."}</span>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                              <span>Retraso Movimiento</span>
                              <span className="text-rose-400">{blackAiSpeed}ms</span>
                            </div>
                            <input
                              type="range"
                              min="100"
                              max="5000"
                              step="100"
                              value={blackAiSpeed}
                              onChange={(e) =>
                                setBlackAiSpeed(parseInt(e.target.value))
                              }
                              className={cn("w-full h-1 cursor-pointer bg-slate-800 rounded-full appearance-none disabled:opacity-50",
                                (blackEngineType === "atlas" ? "accent-emerald-500" :
                                  (blackEngineType === "obsidian" ? "accent-teal-500" :
                                    (blackEngineType === "edd" ? "accent-emerald-500" :
                                        (blackEngineType.startsWith("maia") ? "accent-purple-500" :
                                          (blackEngineType === "ailed" ? "accent-red-500" : "accent-rose-500"))))))}
                            />
                            <span className="text-[8px] text-slate-500 italic block mt-1 leading-tight">Pausa visual después de pensar (no afecta la inteligencia).</span>
                          </div>
                          {blackEngineType === "obsidian" && (
                            <div className="space-y-3 border-t border-slate-700/40 pt-3">
                              <h5 className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-semibold">Configuración Obsidian</h5>
                              <div className="grid grid-cols-1 gap-3">
                                <div>
                                  <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                                    <span>Reducción Nulo</span>
                                    <span className="text-teal-400">{blackObsidianConfig.nullMoveReduction}</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={blackObsidianConfig.nullMoveReduction}
                                    onChange={(e) =>
                                      setblackObsidianConfig((prev) => ({ ...prev, nullMoveReduction: parseInt(e.target.value) }))
                                    }
                                    className="w-full h-1 cursor-pointer accent-teal-500 bg-slate-800 rounded-full appearance-none"
                                  />
                                  <p className="text-[8px] text-slate-500 mt-1 italic">Poda agresiva que acelera el motor ignorando líneas poco prometedoras.</p>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                                    <span>Profundidad Futilidad</span>
                                    <span className="text-teal-400">{blackObsidianConfig.futilityDepth}</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="6"
                                    value={blackObsidianConfig.futilityDepth}
                                    onChange={(e) =>
                                      setblackObsidianConfig((prev) => ({ ...prev, futilityDepth: parseInt(e.target.value) }))
                                    }
                                    className="w-full h-1 cursor-pointer accent-teal-500 bg-slate-800 rounded-full appearance-none"
                                  />
                                  <p className="text-[8px] text-slate-500 mt-1 italic">Evita cálculos profundos en posiciones estables para ganar velocidad.</p>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                                    <span>Reducción LMR</span>
                                    <span className="text-teal-400">{blackObsidianConfig.lmrReduction}</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={blackObsidianConfig.lmrReduction}
                                    onChange={(e) =>
                                      setblackObsidianConfig((prev) => ({ ...prev, lmrReduction: parseInt(e.target.value) }))
                                    }
                                    className="w-full h-1 cursor-pointer accent-teal-500 bg-slate-800 rounded-full appearance-none"
                                  />
                                  <p className="text-[8px] text-slate-500 mt-1 italic">Optimiza la búsqueda reduciendo el detalle en jugadas secundarias.</p>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                                    <span>Hash Memoria (MB)</span>
                                    <span className="text-teal-400">{blackObsidianConfig.transpositionTableSize || 8}</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="1"
                                    max="256"
                                    value={blackObsidianConfig.transpositionTableSize || 8}
                                    onChange={(e) =>
                                      setblackObsidianConfig((prev) => ({ ...prev, transpositionTableSize: parseInt(e.target.value) }))
                                    }
                                    className="w-full h-1 cursor-pointer accent-teal-500 bg-slate-800 rounded-full appearance-none"
                                  />
                                </div>
                                <div className="col-span-1 flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id="blackPonder"
                                    checked={blackObsidianConfig.enablePonder || false}
                                    onChange={(e) =>
                                      setblackObsidianConfig((prev) => ({ ...prev, enablePonder: e.target.checked }))
                                    }
                                    className="w-3 h-3 rounded accent-teal-500 cursor-pointer"
                                  />
                                  <label htmlFor="blackPonder" className="text-[10px] text-slate-400 cursor-pointer">Activar Ponder</label>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  </div>
                </>)}

              {/* Reloj de la Partida ⚡visible solo en Aventura para seguimiento */}
              {currentGameMode === "adventure" && activeAdventureEnemy && hasStarted && (
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm space-y-3 mt-1" key="game-clock">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-amber-500" />
                      Reloj de la Partida
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={cn(
                      "flex flex-col items-center p-2 rounded-xl border",
                      game.turn() === 'w' ? "bg-emerald-500/10 border-emerald-500/30" : "bg-black/20 border-white/5"
                    )}>
                      <span className="text-[8px] uppercase text-slate-500 mb-1 font-bold">Blancas</span>
                      <span className={cn("text-lg font-mono font-bold", game.turn() === 'w' ? "text-emerald-400" : "text-slate-400")}>
                        {formatTime(whiteTime)}
                      </span>
                    </div>
                    <div className={cn(
                      "flex flex-col items-center p-2 rounded-xl border",
                      game.turn() === 'b' ? "bg-rose-500/10 border-rose-500/30" : "bg-black/20 border-white/5"
                    )}>
                      <span className="text-[8px] uppercase text-slate-500 mb-1 font-bold">Negras</span>
                      <span className={cn("text-lg font-mono font-bold", game.turn() === 'b' ? "text-rose-400" : "text-slate-400")}>
                        {formatTime(blackTime)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => { setShowMentalMode(true); setIsConfigSidebarOpen(false); }}
                className={cn(
                  "w-full py-3 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all flex justify-center items-center gap-2 shadow-lg border active:scale-[0.98] active:shadow-inner",
                  currentGameMode === "adventure"
                    ? "bg-amber-900/60 hover:bg-amber-800/80 text-amber-100 border-amber-700/50 shadow-amber-900/30"
                    : "bg-purple-800/80 hover:bg-purple-700 text-purple-100 border-purple-500/50 shadow-purple-900/40"
                )}
              >
                <Brain className="w-4 h-4" />
                {language === "es" ? "Modo Mental" : "Mental Mode"}
              </button>

              {/* --- Modo Estudio / Study Mode --- */}
              {currentGameMode === "normal" && !activeAdventureEnemy && freeModeStage === 'config' && (
                <div className="bg-gradient-to-b from-[#0a1f1f]/80 to-[#061212]/90 p-4 rounded-2xl border border-cyan-900/40 hover:border-cyan-700/50 transition-all shadow-[inset_0_0_20px_rgba(34,211,238,0.04)] relative z-10">
                  <h3 className="text-xs font-bold text-cyan-400/90 flex items-center gap-2 tracking-widest uppercase mb-4" style={{ fontFamily: "Georgia, serif" }}>
                    <Target className="w-4 h-4 text-cyan-400" />
                    {language === "es" ? "Modo Estudio" : "Study Mode"}
                  </h3>

                  {/* PASO 1: Tu Color */}
                  <div className="mb-4">
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5 block font-semibold">{language === "es" ? "1. Juegas como" : "1. You play as"}</label>
                    <div className="flex bg-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden">
                      <button
                        onClick={() => { setFreeModeColor("white"); }}
                        className={cn("flex-1 text-[10px] px-3 py-2.5 font-bold transition-all flex items-center justify-center gap-1.5", freeModeColor === "white" ? "bg-white/10 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-300")}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400" />
                        {language === "es" ? "Blancas" : "White"}
                      </button>
                      <button
                        onClick={() => { setFreeModeColor("black"); }}
                        className={cn("flex-1 text-[10px] px-3 py-2.5 font-bold transition-all flex items-center justify-center gap-1.5", freeModeColor === "black" ? "bg-white/10 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.08)]" : "text-slate-500 hover:text-slate-300")}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-500" />
                        {language === "es" ? "Negras" : "Black"}
                      </button>
                    </div>
                  </div>

                  {/* PASO 2: Motor */}
                  <div className="mb-4">
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5 block font-semibold">{language === "es" ? "2. Motor oponente" : "2. Opponent engine"}</label>
                    <select
                      value={freeModeEngineType}
                      onChange={(e) => {
                        setFreeModeEngineType(e.target.value);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded-xl p-2.5 outline-none focus:border-cyan-500/50 transition-all cursor-pointer appearance-none"
                    >
                      <option value="stockfish">Stockfish</option>
                      <option value="atlas">Atlas.1 (Nuestro)</option>
                      <option value="edd">Nexus (Nuestro)</option>
                      <option value="maia1">Maia 1</option>
                      <option value="maia2">Maia 2</option>
                      <option value="ailed">Ailed (Nuestro)</option>
                      <option value="obsidian">Obsidian (Neural)</option>
                    </select>
                    <span className={cn("text-[8px] italic block mt-1", getEngineColorClass(freeModeEngineType))}>
                      {getEngineInfo(freeModeEngineType).name}
                      {getEngineInfo(freeModeEngineType).isOwn && " (Nuestro)"}
                    </span>
                  </div>

                  {/* PASO 3: ELO / Fuerza */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[9px] text-slate-500 mb-1.5 font-semibold">
                      <span className="uppercase tracking-wider">{language === "es" ? "3. Fuerza (ELO)" : "3. Strength (ELO)"}</span>
                      <span className={cn("font-mono font-bold",
                        freeModeEngineType === "atlas" ? "text-emerald-400" : freeModeEngineType === "obsidian" ? "text-teal-400" : freeModeEngineType === "edd" ? "text-emerald-400" : freeModeEngineType.startsWith("maia") ? "text-purple-400" : freeModeEngineType === "ailed" ? "text-red-400" : "text-blue-400"
                      )}>
                        ~{getEloRating(freeModeElo, freeModeEngineType)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="25"
                      value={freeModeElo}
                      onChange={(e) => {
                        setFreeModeElo(parseInt(e.target.value));
                      }}
                      className={cn("w-full h-1.5 cursor-pointer bg-slate-800 rounded-full appearance-none",
                        freeModeEngineType === "atlas" ? "accent-emerald-500" :
                        freeModeEngineType === "obsidian" ? "accent-teal-500" :
                        freeModeEngineType === "edd" ? "accent-emerald-500" :
                        freeModeEngineType.startsWith("maia") ? "accent-purple-500" :
                        freeModeEngineType === "ailed" ? "accent-red-500" : "accent-blue-500"
                      )}
                    />
                  </div>

                  {/* BOTÓN: IR AL TABLERO */}
                  <button
                    onClick={() => {
                      setFreeModeStage('board');
                      setShowFreeMode(true);
                      setIsConfigSidebarOpen(false);
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white rounded-2xl text-[11px] font-black transition-all uppercase tracking-widest shadow-xl shadow-cyan-900/40 border border-cyan-400/30 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <ArrowRight className="w-4 h-4" fill="currentColor" />
                    {language === "es" ? "Ir al tablero" : "Go to board"}
                  </button>
                </div>
              )}

              {/* Preferencias Visuales */}
              <div className="bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors shadow-sm">
                <button
                  onClick={() => setShowVisualPrefsExpanded(!showVisualPrefsExpanded)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <span>{language === "es" ? "Preferencias Visuales" : "Visual Preferences"}</span>
                  </h3>
                  <ChevronDown className={cn("w-4 h-4 text-slate-400/60 transition-transform duration-200", showVisualPrefsExpanded && "rotate-180")} />
                </button>
                {showVisualPrefsExpanded && (
                <div className="space-y-3 px-4 pb-4 border-t border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-semibold">Notificaciones de Modo</span>
                    <select
                      value={notificationConfig}
                      onChange={(e) => setNotificationConfig(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded p-1 outline-none cursor-pointer appearance-none"
                    >
                      <option value="all">Todas</option>
                      <option value="adventure">Solo Aventura</option>
                      <option value="normal">Solo Normal</option>
                      <option value="none">Desactivadas</option>
                    </select>
                  </div>

                  {currentGameMode === "normal" ? (
                    <>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">Fondo y Brillo</span>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={normalBgOpacity}
                            onChange={(e) => setNormalBgOpacity(parseFloat(e.target.value))}
                            className="w-16 h-1 cursor-pointer accent-emerald-500 bg-slate-800 rounded-full appearance-none"
                            title="Opacidad"
                          />
                          <select
                            value={selectedNormalBgIndex}
                            onChange={(e) => setSelectedNormalBgIndex(Number(e.target.value))}
                            className="bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded-lg p-1 outline-none focus:border-emerald-500/50 cursor-pointer appearance-none w-24"
                          >
                            {NORMAL_BGS.map((_, i) => (
                              <option key={i} value={i}>Nº {i + 1}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  ) : null}

                  <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-white/5" title="Sugerir a dónde puede mover la pieza seleccionada (movimientos legales).">
                    <span className="text-[10px] text-slate-400 font-semibold">{language === "es" ? "Sugerir Movimientos" : "Suggest Moves"}</span>
                    <input type="checkbox" className="hidden" checked={showLegalMoves} onChange={() => setShowLegalMoves(!showLegalMoves)} />
                    <div className={cn("w-8 h-4 rounded-full transition-all relative flex items-center", showLegalMoves ? "bg-amber-400" : "bg-slate-700")}>
                      <div className={cn("absolute w-3 h-3 bg-white rounded-full transition-all shadow-md", showLegalMoves ? "right-0.5" : "left-0.5")} />
                    </div>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer" title="Mostrar en el tablero cuál fue el último movimiento.">
                    <span className="text-[10px] text-slate-400 font-semibold">{language === "es" ? "Resaltar Último Movimiento" : "Highlight Last Move"}</span>
                    <input type="checkbox" className="hidden" checked={showLastMove} onChange={() => setShowLastMove(!showLastMove)} />
                    <div className={cn("w-8 h-4 rounded-full transition-all relative flex items-center", showLastMove ? "bg-blue-400" : "bg-slate-700")}>
                      <div className={cn("absolute w-3 h-3 bg-white rounded-full transition-all shadow-md", showLastMove ? "right-0.5" : "left-0.5")} />
                    </div>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-white/5" title="Al iniciar cada partida, se sortea aleatoriamente quien juega con Blancas y quien con Negras.">
                    <span className="text-[10px] text-slate-400 font-semibold">{language === "es" ? "Piezas por Color Aleatorio" : "Random Colors"}</span>
                    <input type="checkbox" className="hidden" checked={isRandomColors} onChange={() => setIsRandomColors(!isRandomColors)} />
                    <div className={cn("w-8 h-4 rounded-full transition-all relative flex items-center", isRandomColors ? "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]" : "bg-slate-700")}>
                      <div className={cn("absolute w-3 h-3 bg-white rounded-full transition-all shadow-md", isRandomColors ? "right-0.5" : "left-0.5")} />
                    </div>
                  </label>

                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-[10px] text-slate-400 font-semibold" title={language === "es" ? "Permite anticipar movimientos cuando es el turno del rival. Para cancelar, toca una casilla vacía o retrocede el historial." : "Allows pre-moving during opponent's turn. Cancel by clicking an empty square or going back in history."}>
                      {language === "es" ? "Anticipar Jugada (Pre-Move)" : "Pre-Move"}
                    </span>
                    <select
                      value={preMoveMode}
                      onChange={(e) => setPreMoveMode(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded p-1 outline-none cursor-pointer appearance-none"
                    >
                      <option value="disabled">{language === "es" ? "Desactivado" : "Disabled"}</option>
                      <option value="single">{language === "es" ? "Individual" : "Single"}</option>
                      <option value="multiple">{language === "es" ? "Múltiple" : "Multiple"}</option>
                    </select>
                  </div>
                </div>
              )}
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
                        className="bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded p-1 outline-none appearance-none"
                      >
                        <option value="off">Desactivado</option>
                        <option value="slide">Clásico (Deslizar)</option>
                        <option value="spin_normal">Giro (Normal)</option>
                        <option value="spin_fast">Giro (Rápido)</option>
                        <option value="flip">3D Flip</option>
                      </select>
                    </div>

                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-[10px] text-slate-400 font-semibold">{language === "es" ? "Modo Estudio (Guardar PGN)" : "Study Mode (Save PGN)"}</span>
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
                        <select value={threatRadarMode} onChange={(e) => setThreatRadarMode(e.target.value as any)} className="bg-slate-900 border border-slate-700 text-[9px] text-slate-300 rounded p-1 outline-none appearance-none">
                          <option value="global">Jaque (Global)</option>
                          <option value="active">Ataque (Turno Activo)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {currentGameMode === "normal" && !activeAdventureEnemy && (
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
                  )}

                  {currentGameMode === "normal" && !activeAdventureEnemy && (
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
                              className="bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded p-1 outline-none flex-1 ml-2 appearance-none"
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
                                <div className="text-[10px] font-bold text-white mb-2 flex justify-between">Blancas <span>⬜(Siempre 1)</span></div>
                                <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                                  {['q', 'r', 'b', 'n', 'p'].map(p => (
                                    <div key={p} className="flex flex-col items-center">
                                      <span className="text-xl mb-1">{p === 'q' ? 'â""' : p === 'r' ? 'â" ' : p === 'b' ? 'â" ' : p === 'n' ? 'â"Ü' : 'â""'}</span>
                                      <input type="number" min="0" max={p === 'p' ? 8 : 9} value={(trainingPiecesW as any)[p]} onChange={(e) => setTrainingPiecesW({ ...trainingPiecesW, [p]: parseInt(e.target.value) || 0 })} className="w-8 bg-slate-800 text-white rounded text-center border border-slate-700" />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Negras */}
                              <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                                <div className="text-[10px] font-bold text-slate-400 mb-2 flex justify-between">Negras <span>⬛ (Siempre 1)</span></div>
                                <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                                  {['q', 'r', 'b', 'n', 'p'].map(p => (
                                    <div key={p} className="flex flex-col items-center">
                                      <span className="text-xl mb-1">{p === 'q' ? 'â":' : p === 'r' ? 'â"S' : p === 'b' ? 'â" ' : p === 'n' ? 'â"~' : 'â"x'}</span>
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
                  )}
                </div>
              )}

              {currentGameMode === "normal" && !activeAdventureEnemy && (
                <>
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
                        onClick={() => setTournament(p => ({ ...p, active: !p.active, currentRound: 1 }))}
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
                          <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
                            <button
                              onClick={() => setTournament(p => ({ ...p, mode: "infinite", currentRound: 1 }))}
                              className={cn(
                                "flex-1 text-[10px] uppercase font-bold py-1.5 rounded-lg transition-all",
                                tournament.mode === "infinite" ? "bg-purple-600 text-white shadow-md shadow-purple-500/20" : "text-slate-500 hover:text-slate-300"
                              )}
                            >
                              Infinito
                            </button>
                            <button
                              onClick={() => setTournament(p => ({ ...p, mode: "rounds", currentRound: 1 }))}
                              className={cn(
                                "flex-1 text-[10px] uppercase font-bold py-1.5 rounded-lg transition-all",
                                tournament.mode === "rounds" ? "bg-purple-600 text-white shadow-md shadow-purple-500/20" : "text-slate-500 hover:text-slate-300"
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

                        <div className="bg-slate-900/70 border border-purple-500/20 rounded-2xl p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <span className="text-[10px] text-purple-300 uppercase tracking-[0.2em] font-bold">{language === "es" ? "Gráficos del torneo" : "Tournament Charts"}</span>
                              <p className="text-[9px] text-slate-400 mt-1">{language === "es" ? "Activa el gráfico y exporta o reinicia los datos." : "Enable the chart and export or reset the data."}</p>
                            </div>
                            <button
                              onClick={() => setTournamentChartEnabled(enabled => !enabled)}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all border shadow-sm",
                                tournamentChartEnabled
                                  ? "bg-purple-500 text-white border-purple-500/40"
                                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                              )}
                            >
                              {tournamentChartEnabled ? (language === "es" ? "Ocultar" : "Hide") : (language === "es" ? "Mostrar" : "Show")}
                            </button>
                          </div>

                          {tournamentChartEnabled && (
                            <div className="space-y-3 mt-3">
                              <div className="grid gap-2 md:grid-cols-3">
                                <button
                                  onClick={copyTournamentLog}
                                  className="w-full px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg text-[10px] font-bold uppercase transition-all"
                                >
                                  {language === "es" ? "Exportar datos" : "Export data"}
                                </button>
                                <button
                                  onClick={resetTournamentChart}
                                  className="w-full px-3 py-2 bg-rose-500 hover:bg-rose-600 text-black rounded-lg text-[10px] font-bold uppercase transition-all"
                                >
                                  {language === "es" ? "Reiniciar gráfico" : "Reset chart"}
                                </button>
                                <div className="w-full px-3 py-2 bg-slate-800 rounded-lg text-[10px] text-slate-300 border border-slate-700">
                                  <div className="font-bold text-white">{language === "es" ? "Partidas" : "Games"}: {tournamentGameLog.length}</div>
                                  <div className="text-[9px] text-slate-400">{language === "es" ? "Blancas" : "White"}: {tournamentChartData.length ? tournamentChartData[tournamentChartData.length - 1].whiteWins : 0}</div>
                                  <div className="text-[9px] text-slate-400">{language === "es" ? "Negras" : "Black"}: {tournamentChartData.length ? tournamentChartData[tournamentChartData.length - 1].blackWins : 0}</div>
                                  <div className="text-[9px] text-slate-400">{language === "es" ? "Tablas" : "Draws"}: {tournamentChartData.length ? tournamentChartData[tournamentChartData.length - 1].draws : 0}</div>
                                </div>
                              </div>

                              {tournamentGameLog.length === 0 ? (
                                <div className="text-[10px] text-slate-400 bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-center">
                                  {language === "es" ? "Juega partidas para ver los gráficos de progreso." : "Play games to fill tournament progress charts."}
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="bg-slate-950 border border-teal-500/20 rounded-2xl p-4 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
                                    <div className="flex items-center justify-between mb-4 text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                                      <div className="flex items-center gap-2">
                                        <Award className="w-4 h-4" />
                                        <span>{language === "es" ? "Victorias Acumuladas" : "Cumulative wins"}</span>
                                      </div>
                                      <span className="text-slate-500 text-[9px] font-bold">{language === "es" ? "Tendencia General" : "General Trend"}</span>
                                    </div>
                                    <div className="h-64">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={tournamentChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                                          <XAxis dataKey="game" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                                          <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                                          <Tooltip
                                            contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', padding: '12px' }}
                                            itemStyle={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 0' }}
                                            labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                          />
                                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px', textTransform: 'uppercase' }} />
                                          <Line type="monotone" name={language === "es" ? "Blancas" : "White"} dataKey="whiteWins" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#020617' }} activeDot={{ r: 6, shadow: '0 0 10px #10b981' }} />
                                          <Line type="monotone" name={language === "es" ? "Negras" : "Black"} dataKey="blackWins" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#020617' }} activeDot={{ r: 6, shadow: '0 0 10px #f97316' }} />
                                          <Line type="monotone" name={language === "es" ? "Tablas" : "Draws"} dataKey="draws" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#020617' }} activeDot={{ r: 6, shadow: '0 0 10px #3b82f6' }} />
                                        </LineChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>

                                  <div className="bg-slate-950 border border-teal-500/20 rounded-2xl p-4 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-rose-500" />
                                    <div className="flex items-center justify-between mb-4 text-[11px] font-black text-cyan-400 uppercase tracking-[0.2em]">
                                      <div className="flex items-center gap-2">
                                        <Zap className="w-4 h-4" />
                                        <span>{language === "es" ? "Rendimiento por Color" : "Performance by Side"}</span>
                                      </div>
                                      <span className="text-slate-500 text-[9px] font-bold">{language === "es" ? "Efectividad" : "Effectiveness"}</span>
                                    </div>
                                    <div className="h-64">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={tournamentChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                                          <XAxis dataKey="game" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                                          <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                                          <Tooltip
                                            contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px' }}
                                            itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                            labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase' }}
                                          />
                                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                                          <Line type="stepAfter" name={language === "es" ? "Ganadas como Blancas" : "Wins as White"} dataKey="winsAsWhite" stroke="#06b6d4" strokeWidth={3} dot={{ r: 3, fill: '#06b6d4' }} />
                                          <Line type="stepAfter" name={language === "es" ? "Ganadas como Negras" : "Wins as Black"} dataKey="winsAsBlack" stroke="#f43f5e" strokeWidth={3} dot={{ r: 3, fill: '#f43f5e' }} />
                                        </LineChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>

                                  <div className="bg-slate-950 border border-teal-500/20 rounded-2xl p-4 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-sky-500" />
                                    <div className="flex items-center justify-between mb-4 text-[11px] font-black text-purple-400 uppercase tracking-[0.2em]">
                                      <div className="flex items-center gap-2">
                                        <Target className="w-4 h-4" />
                                        <span>{language === "es" ? "Estadísticas de Partida" : "Game statistics"}</span>
                                      </div>
                                      <span className="text-slate-500 text-[9px] font-bold">{language === "es" ? "Duración" : "Duration"}</span>
                                    </div>
                                    <div className="h-64">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={tournamentChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                                          <XAxis dataKey="game" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                                          <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                                          <Tooltip
                                            contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }}
                                            itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                          />
                                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                                          <Line type="monotone" name={language === "es" ? "Movimientos" : "Moves"} dataKey="moves" stroke="#a855f7" strokeWidth={2} dot={{ r: 4, fill: '#a855f7' }} />
                                          <Line type="monotone" name={language === "es" ? "Promedio" : "Average"} dataKey="averageMoves" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                        </LineChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              {/* â¬⚡Panel Inferior Premium â¬⚡*/}
              <div className="p-3 bg-[#0a1118]/80 border-t border-teal-900/40 mt-auto flex flex-col gap-2 shrink-0 relative z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
                {/* Perfil de Usuario Compacto con Brillo */}
                {(currentGameMode === "adventure" || currentGameMode === "tournament" || isAdventureModeOpen || activeAdventureEnemy) && (
                  <div className="relative group/profile z-30">
                    <div className={cn(
                      "absolute -inset-0.5 rounded-xl blur opacity-20 group-hover/profile:opacity-40 transition duration-1000",
                      currentGameMode === "adventure" ? "bg-amber-600" : "bg-teal-500"
                    )}></div>
                    <div className={cn(
                      "relative p-1.5 rounded-xl border flex items-center gap-1.5 transition-all",
                      currentGameMode === "adventure"
                        ? "bg-black border-amber-900/60 shadow-[inset_0_0_15px_rgba(120,60,0,0.2)]"
                        : "bg-[#050a0f] border-teal-900/50"
                    )}>
                      <User className={cn("w-3.5 h-3.5 shrink-0 ml-1", currentGameMode === "adventure" ? "text-amber-700" : "text-teal-500")} />
                      <input
                        type="text"
                        placeholder={language === "es" ? "Tu alias..." : "Your alias..."}
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className={cn(
                          "flex-1 bg-transparent border-none text-[10px] font-bold px-1 py-1 outline-none transition-colors",
                          currentGameMode === "adventure" ? "text-amber-200 placeholder-amber-900/40" : "text-teal-100 placeholder-slate-600"
                        )}
                        maxLength={20}
                      />
                      <button
                        onClick={() => {
                          localStorage.setItem("chess_playerName", playerName);
                          playAudio("save");
                          setAliasSavedDialog(true);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all shadow-md flex items-center gap-1 shrink-0 border active:scale-95 active:shadow-inner",
                          currentGameMode === "adventure"
                            ? "bg-amber-900/60 hover:bg-amber-800/80 text-amber-100 border-amber-700/50"
                            : "bg-teal-800 hover:bg-teal-700 text-teal-100 border-teal-600/50"
                        )}
                      >
                        <Save className="w-3 h-3" />
                        {language === "es" ? "Guardar" : "Save"}
                      </button>
                    </div>
                  </div>
                )}

                {currentGameMode === "normal" && !activeAdventureEnemy && (
                  <>
                    <button
                      onClick={startGame}
                      className={cn(
                        "w-full py-4 text-teal-100 rounded text-sm font-black tracking-widest uppercase transition-all flex justify-center items-center gap-2 shadow-lg border",
                        appTheme === "matrix" ? "bg-emerald-900 hover:bg-emerald-800 border-emerald-500/50 shadow-emerald-900/50" :
                          appTheme === "nebula" ? "bg-purple-800 hover:bg-purple-700 shadow-purple-900/50 border-purple-500/50" :
                            appTheme === "linux" ? "bg-orange-700 hover:bg-orange-600 border-orange-500/50 shadow-orange-900/50" :
                              appTheme === "pure-black" ? "bg-slate-800 hover:bg-slate-700 border-slate-500/50" :
                                "bg-teal-700 hover:bg-teal-600 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.2)]",
                        (whitePlayer === "human" && blackPlayer === "human" && lanStatus === "connected" && lanRole !== "host") ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
                      )}
                      disabled={whitePlayer === "human" && blackPlayer === "human" && lanStatus === "connected" && lanRole !== "host"}
                    >
                      <PlayCircle className="w-5 h-5" />
                      {whitePlayer === "human" && blackPlayer === "human" && lanStatus === "connected" && lanRole !== "host"
                        ? (language === "es" ? "ESPERANDO AL HOST..." : "WAITING FOR HOST...")
                        : (language === "es" ? "EMPEZAR DESAFÍO" : "START CHALLENGE")}
                    </button>

                    {IS_WEB_VERSION ? (
                      <LanPlaceholder language={language} />
                    ) : (
                    <>
                      {/* Multijugador LAN */}
                      {(whitePlayer === "human" && blackPlayer === "human") ? (
                        <div className="bg-slate-900/40 p-2 rounded-lg border border-white/5 space-y-1.5">
                        <h3 className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                          <Wifi className="w-3.5 h-3.5 opacity-60" />
                          {language === "es" ? "Conexión LAN" : "LAN Connection"}
                        </h3>

                        {lanStatus === "disconnected" && (
                          <div className="space-y-3">
                            <p className="text-[10px] text-slate-500">
                              {language === "es"
                                ? "Conecta con otro jugador en tu red local. Si conectas con una versión anterior, esa versión debe crear la sala para mayor estabilidad."
                                : "Connect to another player on your local network. If connecting to an older version, that version should create the room for better stability."}
                            </p>

                            {/* Selector de color con opción al azar */}
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 font-semibold block">
                                {language === "es" ? "Jugar como:" : "Play as:"}
                              </span>
                              <select
                                value={lanPreferredColor}
                                onChange={(e) => setLanPreferredColor(e.target.value as any)}
                                className="w-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded-lg p-1.5 outline-none appearance-none"
                              >
                                <option value="white">{language === "es" ? "Blancas" : "White"}</option>
                                <option value="black">{language === "es" ? "Negras" : "Black"}</option>
                                <option value="random">{language === "es" ? "Al Azar" : "Random"}</option>
                              </select>
                            </div>

                            {/* Crear sala (HOST) */}
                            <div className="space-y-2">
                              <button
                                onClick={() => {
                                  const chosenColor = lanPreferredColor === "random" ? (Math.random() < 0.5 ? "white" : "black") : lanPreferredColor;
                                  lanStartHost(chosenColor as any, effectivePlayerName || undefined);
                                }}
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
                                  onClick={() => {
                                    if (lanManualIp) {
                                      // Al unirse, pasamos la preferencia directamente. Si es "random", el servidor decidirá el opuesto al host.
                                      lanJoinHost(lanManualIp, lanPreferredColor, effectivePlayerName || undefined);
                                    }
                                  }}
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
                                      onClick={() => lanJoinHost(result.ip, lanPreferredColor, effectivePlayerName || undefined)}
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

                        {/* ⚡ESTADO: Conectando ⚡*/}
                        {lanStatus === "connecting" && (
                          <div className="flex flex-col items-center gap-3 py-5 bg-cyan-500/5 rounded-xl border border-cyan-500/20">
                            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                              {language === "es" ? "Conectando..." : "Connecting..."}
                            </span>
                          </div>
                        )}

                        {/* ⚡ESTADO: Host esperando invitado ⚡*/}
                        {lanStatus === "waiting_for_opponent" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                              <span className="text-[10px] text-cyan-300 font-black uppercase tracking-widest">
                                {language === "es" ? "Sala Creada - Esperando Invitado" : "Room Created - Waiting for Guest"}
                              </span>
                            </div>

                            <p className="text-[9px] text-slate-500 italic">
                              {language === "es"
                                ? "Comparte tu IP con el otro jugador para que pueda unirse."
                                : "Share your IP with the other player so they can join."}
                            </p>

                            {/* IPs del host para compartir */}
                            {lanLocalIps.length > 0 && (
                              <div className="bg-black/30 rounded-lg p-2 border border-white/5 space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] text-slate-500">{language === "es" ? "Tu IP:" : "Your IP:"}</span>
                                  <button onClick={() => setShowHostIps(!showHostIps)} className="text-[9px] text-slate-400 hover:text-white flex items-center gap-1">
                                    {showHostIps ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    {showHostIps ? (language === "es" ? "Ocultar" : "Hide") : (language === "es" ? "Mostrar" : "Show")}
                                  </button>
                                </div>
                                {lanLocalIps.map(ip => (
                                  <div key={ip} className="flex gap-1 items-center bg-black/40 rounded px-2 py-1">
                                    <input type={showHostIps ? "text" : "password"} readOnly value={ip} className="bg-transparent border-none outline-none text-cyan-400 font-mono text-[10px] w-full" />
                                    <button onClick={() => navigator.clipboard.writeText(ip)} className="text-[9px] text-slate-400 hover:text-cyan-400 p-1" title="Copiar IP"><Copy className="w-3 h-3" /></button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Solicitudes de unión pendientes */}
                            {lanPendingJoinRequests.length > 0 && (
                              <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1">
                                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.15em] flex items-center gap-2 sticky top-0 bg-slate-800/60 py-1">
                                  <UserPlus className="w-3.5 h-3.5" />
                                  {language === "es" ? "Solicitudes de Unión" : "Join Requests"}
                                </h4>
                                {lanPendingJoinRequests.map(request => (
                                  <div key={request.playerId} className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 space-y-2 shadow-lg flex-shrink-0">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className={cn("w-2.5 h-2.5 rounded-full border", request.color === "white" ? "bg-white border-slate-400" : "bg-slate-900 border-emerald-400")} />
                                        <span className="text-[11px] font-black text-white">{request.name}</span>
                                        <span className="text-[9px] text-emerald-400/60">({request.color === "white" ? (language === "es" ? "Blancas" : "White") : (language === "es" ? "Negras" : "Black")})</span>
                                      </div>
                                      <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold animate-pulse">NUEVO</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={async () => {
                                          try {
                                            await lanAcceptJoinRequest(request.playerId);
                                            playAudio("confirm"); // Feedback sonoro opcional si existe
                                          } catch (e) {
                                            console.error("[LAN] Error al aceptar solicitud:", e);
                                          }
                                        }}
                                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
                                      >
                                        {language === "es" ? "Aceptar" : "Accept"}
                                      </button>
                                      <button
                                        onClick={() => lanRejectJoinRequest(request.playerId)}
                                        className="flex-1 py-2 bg-rose-900/40 hover:bg-rose-800 text-rose-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                      >
                                        {language === "es" ? "❌ Rechazar" : "❌ Reject"}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <button onClick={lanDisconnect} className="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 mt-2">
                              <X className="w-3 h-3" /> {language === "es" ? "Cancelar Sala" : "Cancel Room"}
                            </button>
                          </div>
                        )}

                        {/* ⚡ESTADO: Guest esperando confirmación del host ⚡*/}
                        {lanStatus === "waiting_approval" && (
                          <div className="space-y-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
                              <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                                {language === "es" ? "Esperando al Host" : "Waiting for Host"}
                              </h4>
                            </div>
                            <p className="text-[10px] text-amber-200/60 leading-relaxed">
                              {language === "es"
                                ? "Tu solicitud fue enviada. El host debe aceptarla para continuar."
                                : "Your request was sent. The host must accept it to continue."}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span>{language === "es" ? "Tu color:" : "Color:"}</span>
                              <span className={cn("font-bold", lanMyColor === "white" ? "text-white" : "text-slate-300")}>
                                {lanMyColor === "white" ? (language === "es" ? "Blancas" : "White") : (language === "es" ? "Negras" : "Black")}
                              </span>
                            </div>
                            <button onClick={lanDisconnect} className="w-full py-1.5 bg-slate-800 hover:bg-rose-900/30 border border-slate-700 hover:border-rose-900/50 text-slate-400 hover:text-rose-400 rounded-lg text-[10px] font-bold transition-all">
                              {language === "es" ? "Cancelar Solicitud" : "Cancel Request"}
                            </button>
                          </div>
                        )}

                        {/* ⚡ ESTADO: Conexión Establecida (Handshake) ⚡ */}
                        {lanStatus === "connected" && !hasStarted && lanOpponentConnected && (
                          <div className="space-y-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse mx-auto" />
                            <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">
                              {language === "es" ? "¡Conexión Establecida!" : "Connection Established!"}
                            </h4>
                            <p className="text-[10px] text-emerald-200/60">
                              {language === "es" ? "La partida está por comenzar..." : "The match is about to start..."}
                            </p>
                            <button
                              onClick={lanDisconnect}
                              className="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 mt-1"
                            >
                              <X className="w-3 h-3" /> {language === "es" ? "Desconectar" : "Disconnect"}
                            </button>
                          </div>
                        )}

                        {/* ⚡ ESTADO: Partida en curso ⚡ */}
                        {lanStatus === "connected" && hasStarted && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">
                                {language === "es" ? "Partida en Curso" : "Match in Progress"} ⚡{lanRole === "host" ? "Host" : (language === "es" ? "Invitado" : "Guest")}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 space-y-0.5 px-1">
                              <div>{language === "es" ? "Tu color:" : "Your color:"} <span className={cn("font-bold", lanMyColor === "white" ? "text-white" : "text-slate-300")}>{lanMyColor === "white" ? "⬜" + (language === "es" ? "Blancas" : "White") : "⬛ " + (language === "es" ? "Negras" : "Black")}</span></div>
                              <div>{language === "es" ? "Oponente:" : "Opponent:"} <span className={cn("font-bold", lanOpponentConnected ? "text-emerald-400" : "text-rose-400")}>{lanOpponentConnected ? "✅" + (language === "es" ? "Conectado" : "Connected") : (language === "es" ? "Desconectado" : "Disconnected")}</span></div>
                            </div>
                            <div className="flex gap-2 mt-2 flex-col">
                              {/* Botón Detener - disponible cuando hay partida en curso */}
                              {hasStarted && lanStatus === "connected" && (
                                <button
                                  onClick={lanStopGameCompletely}
                                  className="w-full py-1.5 bg-red-600/30 hover:bg-red-600/50 border border-red-600/50 text-red-400 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                                >
                                  <Power className="w-3 h-3" /> {language === "es" ? "Detener" : "Stop"}
                                </button>
                              )}

                              {/* Botón Iniciar/Reiniciar - disponible cuando hay partida en curso */}
                              {hasStarted && lanStatus === "connected" && (
                                <button
                                  onClick={lanStartNewGame}
                                  className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3" /> {language === "es" ? "Iniciar/Reiniciar" : "Start/Restart"}
                                </button>
                              )}

                              <button
                                onClick={lanDisconnect}
                                className="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                              >
                                <X className="w-3 h-3" /> {language === "es" ? "Desconectar" : "Disconnect"}
                              </button>
                            </div>
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
                    </>
                    )}
                  </>
                )}

                {/* Cuadro del Creador Medieval al final de todo */}
                {/* Cuadro del Creador Minimalista */}
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 mt-4 transition-all hover:border-white/10 group/dev">
                  <div className="flex items-center justify-between relative z-10">
                    <button onClick={() => setShowDevProfile(true)} className="flex-1 text-left p-0 m-0 cursor-pointer group transition-all hover:text-emerald-300" title={language === 'es' ? 'Ver perfil del desarrollador' : 'View developer profile'}>
                      <div className="flex flex-col">
                        <span className="text-[7px] text-slate-500 uppercase tracking-[0.2em] mb-0.5 block">Desarrollado por</span>
                        <span className="text-[11px] text-slate-300 font-medium tracking-wider block group-hover:text-emerald-300 transition-colors">Elal Chico</span>
                      </div>
                    </button>
                    <div className="flex gap-1">
                      <a href="https://github.com/ElalChico" target="_blank" rel="noreferrer"
                        className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-slate-500 hover:text-slate-200"
                        title="GitHub">
                        <Github className="w-3.5 h-3.5" />
                      </a>
                      <a href="https://github.com/ElalChico/GM-3000" target="_blank" rel="noreferrer"
                        className="p-1.5 hover:bg-emerald-500/10 rounded-lg transition-colors text-slate-500 hover:text-emerald-400"
                        title="Repositorio">
                        <Code className="w-3.5 h-3.5" />
                      </a>
                      <a href="https://discord.gg/hNB5FnVdaR" target="_blank" rel="noreferrer"
                        className="p-1.5 hover:bg-[#5865F2]/10 rounded-lg transition-colors text-slate-500 hover:text-[#5865F2]"
                        title="Discord">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-center gap-2 opacity-50 group-hover/dev:opacity-100 transition-opacity">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] text-slate-600 uppercase tracking-widest">GM-3000 Engine System v{CURRENT_VERSION}</span>
                  </div>

                  {newVersionAvailable && (
                    <div className="mt-2 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg flex items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-500">
                      <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        <span className="text-[9px] text-emerald-300 font-bold uppercase tracking-widest">Nueva v{newVersionAvailable}</span>
                      </div>
                      <button
                        onClick={() => window.open("https://github.com/ElalChico/GM-3000/releases/latest", "_blank")}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-md transition-all shadow-[0_0_10px_rgba(10,185,129,0.2)]"
                      >
                        Actualizar
                      </button>
                    </div>
                  )}
                </div>

                {/* Botón de Restaurar de Fábrica - Ubicado abajo del todo para máxima seguridad */}
                {currentGameMode === "normal" && !hasStarted && !isAdventureModeOpen && !activeAdventureEnemy && (
                  <div className="mt-4 pt-2 border-t border-rose-900/10">
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      className="w-full py-3 bg-rose-950/20 hover:bg-rose-900/40 border border-rose-500/30 text-rose-400/80 hover:text-rose-100 rounded-xl text-[10px] font-black tracking-widest transition-all flex justify-center items-center gap-2 opacity-70 hover:opacity-100 uppercase shadow-lg shadow-black/40"
                    >
                      <RefreshCw className="w-3 h-3" /> {language === "es" ? "Restaurar todo de Fábrica" : "Full Factory Reset"}
                    </button>
                  </div>
                )}


              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Modal Overlay */}
      {showTournamentManager && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2">
          <div className="w-full max-w-7xl h-full max-h-[95vh] bg-slate-900 border border-slate-600 rounded-2xl flex flex-col shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-4 right-4 z-[10000]">
              <button onClick={() => setShowTournamentManager(false)} className="p-2 bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-lg transition-all cursor-pointer backdrop-blur-md border border-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 w-full bg-slate-900 relative">
              <iframe
                srcDoc={tournamentManagerHtml ?? undefined}
                className="w-full h-full border-0 absolute inset-0"
                title="Tournament Manager"
              />
            </div>
          </div>
        </div>
      )}

      {/* Factory Reset Modal Overlay */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-2xl flex flex-col shadow-2xl shadow-rose-500/20 overflow-hidden relative animate-in zoom-in-95 duration-200 p-6 text-center">
            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <RefreshCw className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {language === "es" ? "Restaurar Fábrica" : "Factory Reset"}
            </h2>
            <p className="text-sm text-slate-400 mb-3">
              {language === "es" ? "¿Estás seguro de que quieres borrar todos los datos y restaurar la configuración de fábrica? Esta acción no se puede deshacer." : "Are you sure you want to delete all data and restore factory settings? This action cannot be undone."}
            </p>
            <div className="mb-5 px-4 py-3 rounded-xl border-2 border-rose-500/50 bg-rose-950/20 text-left shadow-lg">
              <div className="text-[10px] uppercase tracking-[0.2em] text-rose-400 font-black mb-1">
                {language === "es" ? "ADVERTENCIA CRÍTICA" : "CRITICAL WARNING"}
              </div>
              <div className="text-[11px] text-rose-200 font-bold leading-relaxed">
                {language === "es"
                  ? "Se borrarán TODOS los datos: Estadísticas normales, ajustes y TODO el progreso del Modo Aventura (Códice de las 3000 Noches)."
                  : "ALL data will be deleted: Normal stats, settings, and ALL Adventure Mode progress (3000 Nights Codex)."}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
              >
                {language === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button
                onClick={() => {
                  // Preservar el progreso de aventura antes del reset (Crónicas de los Mortales)
                  const adventureBackup = localStorage.getItem("chess_adventureProgress");
                  // Preservar memorias de aprendizaje de los motores
                  const preservedMemories: Record<string, string> = {};
                  Object.keys(localStorage).forEach((key) => {
                    if (key.startsWith("Memory_")) {
                      const value = localStorage.getItem(key);
                      if (value !== null) preservedMemories[key] = value;
                    }
                  });
                  // 1. Limpiar TODOS los demás datos de localStorage
                  localStorage.clear();
                  // 2. Restaurar las memorias preservadas
                  Object.entries(preservedMemories).forEach(([key, value]) => {
                    localStorage.setItem(key, value);
                  });
                  // 3. Restaurar las Crónicas de los Mortales
                  if (adventureBackup) {
                    localStorage.setItem("chess_adventureProgress", adventureBackup);
                  }
                  setTournament({ active: false, mode: "none", maxRounds: 5, currentRound: 1 });
                  // 4. Forzar limpieza de caches del navegador
                  if ('caches' in window) {
                    window.caches.keys().then(names => {
                      names.forEach(name => window.caches.delete(name));
                    });
                  }

                  // Limpiar caché de análisis
                  deleteAnalysisCache();
                  // 5. Recargar la página
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

      {isMasterAnalysisOpen && (
        <MasterAnalysisOverlay
          history={history}
          historyFens={historyFens}
          moveComments={moveComments as any}
          moveEvaluations={moveEvaluations}
          onClose={() => setIsMasterAnalysisOpen(false)}
          onGoHome={() => {
            checkAndConfirm(() => {
              setIsMasterAnalysisOpen(false);
              setShowMainScreen(true);
            });
          }}
          boardOrientation={
            (lanStatus === "connected" && lanMyColor) ? lanMyColor :
            (whitePlayer === "ai" && blackPlayer === "human") ? "black" :
            (whitePlayer === "human" && blackPlayer === "ai") ? "white" :
            boardOrientation
          }
          whitePlayer={whitePlayer}
          blackPlayer={blackPlayer}
          effectivePlayerName={effectivePlayerName}
          language={language}
          aiAnalysisResult={aiAnalysisResult}
          isAiAnalyzing={isAiAnalyzing}
          aiAnalysisProgress={aiAnalysisProgress}
          analysisDepthMode={analysisDepthMode}
          aiFallbackInfo={aiFallbackInfo}
          onReAnalyze={() => runAIAnalysis(true)}
          aiGeneralResult={aiGeneralResult}
          aiTechnicalResult={aiTechnicalResult}
          isAiGeneralLoading={isAiGeneralLoading}
          isAiTechnicalLoading={isAiTechnicalLoading}
          onAnalyzeCustomPgn={handleAnalyzeCustomPgn}
          onLoadPgn={handleLoadPgn}
          enableTechnicalAnalysis={enableTechnicalAnalysis}
          onToggleTechnicalAnalysis={handleToggleTechnicalAnalysis}
          isWebVersion={IS_WEB_VERSION}
          aiProvider={aiProvider}
          setAiProvider={setAiProvider}
          aiModel={aiModel}
          setAiModel={setAiModel}
          aiApiKey={aiApiKey}
          setAiApiKey={setAiApiKey}
          aiCustomUrl={aiCustomUrl}
          setAiCustomUrl={setAiCustomUrl}
        />
      )}

      {/* Exit Confirmation Modal */}
      <ExitConfirmModal
        show={showExitConfirm}
        hasUnsavedData={hasUnsavedData()}
        onConfirm={() => {
          confirmExitAction();
        }}
        onCancel={cancelExitAction}
        onSavePGN={() => {
          exportPGN(history, whitePlayerName || "Blancas", blackPlayerName || "Negras", game.fen());
          confirmExitAction();
        }}
        onSaveAnalysis={() => {
          exportAnalysis(
            aiAnalysisResult?.general || "",
            aiAnalysisResult?.technical || "",
            moveComments as Record<number, string>,
            whitePlayerName || "Blancas",
            blackPlayerName || "Negras"
          );
          confirmExitAction();
        }}
        onSaveVoice={() => {
          // Voice export handled by MasterAnalysisOverlay
          confirmExitAction();
        }}
        onSaveAll={() => {
          exportCombined(
            history,
            whitePlayerName || "Blancas",
            blackPlayerName || "Negras",
            game.fen(),
            aiAnalysisResult?.general || "",
            aiAnalysisResult?.technical || "",
            moveComments as Record<number, string>
          );
          confirmExitAction();
        }}
      />

      {/* Developer Profile Overlay */}
      {showDevProfile && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { setShowDevProfile(false); setDevProfile(null); }}>
          <div className="bg-[#05080a] border-2 border-teal-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(20,184,166,0.2)] medieval-panel p-6 flex flex-col gap-6 relative" style={{ width: "min(90vw, 780px)" }} onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />

            {devProfile ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-row items-center gap-5">
                  <div className="relative group p-1 shrink-0">
                    {/* Animación del marco de la foto */}
                    <div className="absolute inset-0 rounded-full border border-teal-500/30"></div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 via-amber-500 to-emerald-500 rounded-full blur-md opacity-40 group-hover:opacity-100 transition duration-1000 animate-[spin_4s_linear_infinite]"></div>
                    <img
                      src={`${devProfile.avatar_url}${devProfile.avatar_url.includes('?') ? '&' : '?'}t=${new Date().getTime()}`}
                      alt="Developer"
                      className="relative w-24 h-24 rounded-full border-2 border-slate-900 object-cover select-none pointer-events-none z-10"
                      draggable={false}
                      onContextMenu={e => e.preventDefault()}
                    />
                  </div>

                  <div className="text-left">
                    <h3 className="text-2xl font-black text-amber-50 uppercase tracking-[0.2em] font-serif">{devProfile.name || devProfile.login}</h3>
                    <p className="text-teal-400/80 text-[10px] font-bold uppercase tracking-widest mt-1">
                      {devProfile.login} • {language === 'es' ? 'Creador y Desarrollador' : 'Creator & Developer'}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed italic border-y border-teal-900/30 py-4 w-full">
                  {language === "es"
                    ? "Desarrollador autodidacta | Hacking ético & software libre | Comprometido con la justicia, el antiespecismo y la tecnología al servicio de la crítica social."
                    : "Self-taught developer | Ethical hacking & free software | Committed to justice, anti-speciesism, and technology at the service of social critique."}
                </p>

                {/* Project info - detailed description */}
                <div className="w-full text-left space-y-4">
                  {/* Description */}
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-teal-500/10">
                    <span className="block text-[10px] uppercase tracking-[0.2em] text-teal-600 mb-2 font-bold">{language === 'es' ? 'Descripción' : 'Description'}</span>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {language === 'es'
                          ? 'Tablero profesional de autoentrenamiento construido a medida para el aprendizaje profundo del ajedrez. Sustituye los métodos tradicionales por motores de alta precisión como Stockfish, Maia, Atlas y otros desarrollados por la comunidad, además de motores propios. Incluye análisis neural en tiempo real y herramientas interactivas. Aclaración Importante: No es solo un juego: es una herramienta de estudio diseñada para el análisis serio y sistemático.'
                        : 'Professional self-training board built for deep chess study. Replaces traditional methods with high-precision engines like Stockfish, Maia, Atlas and others developed by the community, plus custom engines. Features real-time neural analysis and interactive tools. Important Note: Not just a game: a study tool designed for serious and systematic analysis.'}
                    </p>
                  </div>

                  {/* Features + Philosophy side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Features */}
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-teal-500/10">
                      <span className="block text-[10px] uppercase tracking-[0.2em] text-teal-600 mb-2 font-bold">{language === 'es' ? 'Características' : 'Features'}</span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {[
                          'Stockfish, Maia, Atlas, Obsidian, Ailed',
                          language === 'es' ? 'Análisis neural en tiempo real' : 'Real-time neural analysis',
                          language === 'es' ? 'Modo Mental (ajedrez a ciegas verbal)' : 'Mental Mode (verbal blindfold chess)',
                          language === 'es' ? 'Aventura RPG con progresión' : 'RPG Adventure with progression',
                          language === 'es' ? 'Modo Progresivo con ajuste de ELO' : 'Progressive Mode with ELO adjustment',
                          language === 'es' ? 'Torneos y estadísticas detalladas' : 'Tournaments and detailed stats',
                          language === 'es' ? 'Perfil con logros, nivel y ranking' : 'Profile with achievements, level and rank',
                          language === 'es' ? 'Perfíl de desarrollador y GitHub' : 'Developer profile and GitHub',
                        ].map((feat, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-500 text-[8px] mt-0.5">▸</span>
                            <span className="text-[10px] text-slate-400">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Philosophy */}
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-teal-500/10">
                      <span className="block text-[10px] uppercase tracking-[0.2em] text-teal-600 mb-2 font-bold">{language === 'es' ? 'Filosofía' : 'Philosophy'}</span>
                      <p className="text-[11px] text-slate-300 leading-relaxed italic">
                        {language === 'es'
                          ? '"Hoy se usa tecnología para aprender, no solo libros. Buscando herramientas para estudiar ajedrez sin complicaciones, empecé a experimentar y fui construyendo esto a mi exacta medida. No nació como un proyecto planificado, sino como una necesidad real de tener un espacio de entrenamiento que se adaptara a mi forma de pensar y aprender siendo autista."'
                          : '"Today technology is used to learn, not just books. Looking for tools to study chess without complications, I started experimenting and built this to my exact needs. It was not born as a planned project, but as a real need to have a training space that adapted to the way I think and learn as an autistic person."'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full bg-slate-900/50 rounded-xl p-4 border border-teal-500/10 text-left">
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-teal-600 mb-2 font-bold">{language === 'es' ? 'Firma del Proyecto' : 'Project Signature'}</span>
                  <pre className="font-mono text-[10px] text-slate-300 overflow-x-auto custom-scrollbar leading-relaxed">
                    <span className="text-emerald-400">const</span> <span className="text-amber-400">project</span> = {'{\n'}
                    {'  '}<span className="text-sky-400">author</span>: <span className="text-emerald-300">'Elal Chico'</span>,<br />
                    {'  '}<span className="text-sky-400">version</span>: <span className="text-emerald-300">'{CURRENT_VERSION}'</span>,<br />
                    {'  '}<span className="text-sky-400">purpose</span>: <span className="text-emerald-300">'Sistema de Estudio Ajedrecístico de Nueva Generación'</span><br />
                    {'}'};
                  </pre>
                </div>

                <div className="flex gap-3 w-full mt-2">
                  <a
                    href={devProfile.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-3 rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-400 font-bold uppercase text-[10px] tracking-widest hover:bg-teal-500/20 hover:border-teal-400/50 transition-all text-center"
                  >
                    GitHub
                  </a>
                  <button
                    onClick={() => { setShowDevProfile(false); setDevProfile(null); }}
                    className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all"
                  >
                    {language === 'es' ? 'Cerrar' : 'Close'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 text-center items-center justify-center p-8">
                <div className="w-12 h-12 rounded-full border-2 border-teal-500/20 border-t-teal-400 animate-spin mx-auto"></div>
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                  {language === 'es' ? 'Sincronizando con GitHub...' : 'Syncing with GitHub...'}
                </p>
                <button onClick={() => { setShowDevProfile(false); setDevProfile(null); }} className="mt-4 px-6 py-2 rounded-xl border border-white/10 text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all">
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showProfileView && (
  <ProfileView
    profile={profileHook}
    onUpdate={(fields) => { if (!isGuestMode) setProfile(prev => ({...prev, ...fields})); }}
    onReset={() => { if (!isGuestMode) setProfile({
      name: "",
      bio: "",
      photoUrl: "",
      xp: 0,
      level: 1,
      stats: DEFAULT_STATS,
      achievements: [],
      profileViews: 0,
      lastActive: new Date().toISOString(),
      eloRating: 0,
      eloTitle: "Sin clasificar",
      eloManual: false,
    }); }}
    language={language}
    onClose={() => setShowProfileView(false)}
    matchStats={matchStats}
    whitePlayer={whitePlayer}
    blackPlayer={blackPlayer}
    whiteEngineName={whiteEngineName}
    blackEngineName={blackEngineName}
    boardOrientation={boardOrientation}
    lanStatus={lanStatus}
    playerName={effectivePlayerName}
    humanBattles={adventureProgress?.humanBattles ?? 0}
    resetMatchStats={resetMatchStats}
    tournamentGameLog={tournamentGameLog}
    progressiveState={progressiveState}
    adventureProgress={adventureProgress}
    whiteAiDepth={whiteAiDepth}
    whiteEngineType={whiteEngineType}
  />
)}
{showMentalMode && (
  <MentalMode
    game={game}
    setGame={setGame}
    fen={game.fen()}
    setFen={() => {}}
    setSystemNotification={setSystemNotification}
    onExit={() => {
      setShowMentalMode(false);
      setShowMainScreen(false);
      setIsConfigSidebarOpen(true);
      hasStartedRef.current = false;
      setHasStarted(false);
      setTimerActive(false);
      setTimeOutWinner(null);
      const g = new Chess();
      setGame(g);
      setHistory([]);
      historyRef.current = [];
    }}
    onRestart={() => {
      const g = new Chess();
      setGame(g);
      setHistory([]);
      historyRef.current = [];
      hasStartedRef.current = false;
      setHasStarted(false);
      setWhiteTime(initialTimeMin * 60);
      setBlackTime(initialTimeMin * 60);
      whiteTimeRef.current = initialTimeMin * 60;
      blackTimeRef.current = initialTimeMin * 60;
    }}
    opponent="ai"
    onStartMentalGame={(config) => {
      console.log("[Mental] onStartMentalGame color:", config.color, "engine:", config.engineType, "depth:", config.depth);
      const g = new Chess();
      setGame(g);
      setHistory([]);
      historyRef.current = [];
      if (config.color === "w") {
        setWhitePlayer("human");
        setBlackPlayer("ai");
        if (config.engineType) setBlackEngineType(config.engineType);
        if (config.depth) setBlackAiDepth(config.depth);
      } else {
        setWhitePlayer("ai");
        setBlackPlayer("human");
        if (config.engineType) setWhiteEngineType(config.engineType);
        if (config.depth) setWhiteAiDepth(config.depth);
      }
      setWhiteTime(initialTimeMin * 60);
      setBlackTime(initialTimeMin * 60);
      whiteTimeRef.current = initialTimeMin * 60;
      blackTimeRef.current = initialTimeMin * 60;
      gameRef.current = g;
      setTimeOutWinner(null);
      hasStartedRef.current = true;
      setHasStarted(true);
      if (!engineWhiteRef.current && !engineBlackRef.current) {
        recreateEngines();
      }
      if (config.color === "b") {
        setTimeout(() => triggerEngine(g), 200);
      }
    }}
    timeWhite={whiteTime}
    timeBlack={blackTime}
    setTimeWhite={setWhiteTime}
    setTimeBlack={setBlackTime}
    isTimerRunning={timerActive}
    setIsTimerRunning={setTimerActive}
    timerIntervalRef={mentalTimerIntervalRef}
    whitePlayer={whitePlayer}
    blackPlayer={blackPlayer}
    mentalClockEnabled={true}
    onMoveMade={(g) => {
      console.log("[Mental] onMoveMade called, move:", g.history()[g.history().length - 1], "hasStarted:", hasStartedRef.current);
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
      }
      const moveSan = g.history()[g.history().length - 1];
      if (moveSan) {
        const newHist = [...historyRef.current, moveSan];
        historyRef.current = newHist;
        setHistory(newHist);
        const fullGame = new Chess();
        for (const san of newHist) { try { fullGame.move(san); } catch {} }
        gameRef.current = fullGame;
        setGame(g);
        setTimeout(() => triggerEngine(fullGame), 200);
      } else {
        setGame(g);
        setTimeout(() => triggerEngine(g), 200);
      }
    }}
    appHistory={history}
    blackEngineType={blackEngineType}
    setBlackEngineType={setBlackEngineType}
    blackAiDepth={blackAiDepth}
    setBlackAiDepth={setBlackAiDepth}
    whiteEngineType={whiteEngineType}
    getEloRating={getEloRating}
    engineOptions={[
      { id: "stockfish", name: "Stockfish" },
      { id: "atlas", name: "Atlas.1", isOwn: true },
      { id: "edd", name: "Nexus", isOwn: true },
      { id: "maia1", name: "Maia 1" },
      { id: "maia2", name: "Maia 2" },
      { id: "ailed", name: "Ailed", isOwn: true },
      { id: "obsidian", name: "Obsidian" },
    ]}
  />
)}
{showAnalysisConfig && (
        <div onClick={() => setShowAnalysisConfig(false)} className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div onClick={e => e.stopPropagation()} className="bg-[#05080a] border-2 border-teal-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(20,184,166,0.2)] medieval-panel p-6 flex flex-col gap-6 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
            <div className="flex items-center gap-4 border-b border-teal-500/20 pb-4">
              <div className="p-3 bg-teal-500/20 rounded-xl border border-teal-500/30">
                <Search className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-amber-50 uppercase tracking-[0.2em] font-serif">Configurar Análisis</h3>
                <p className="text-teal-400/60 text-[10px] font-bold uppercase tracking-widest">Selecciona el nivel de profundidad técnica</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => { setShowAnalysisConfig(false); runFullAnalysis("fast"); }}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-all group relative overflow-hidden",
                  analysisDepthMode === "fast" ? "bg-teal-500/20 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.1)]" : "bg-black/40 border-white/5 hover:border-teal-500/30"
                )}
              >
                <div className="flex flex-col items-start relative z-10">
                  <span className="text-teal-400 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                    <Zap className="w-3 h-3 text-amber-400" /> Modo Rápido
                  </span>
                  <span className="text-slate-400 text-[10px] mt-1 font-medium italic">Evaluación táctica básica (Profundidad 10)</span>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-teal-500/30 flex items-center justify-center group-hover:border-teal-500/60 relative z-10">
                  {analysisDepthMode === "fast" && <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />}
                </div>
              </button>

              <button
                onClick={() => { setShowAnalysisConfig(false); runFullAnalysis("deep"); }}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-all group relative overflow-hidden",
                  analysisDepthMode === "deep" ? "bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]" : "bg-black/40 border-white/5 hover:border-indigo-500/30"
                )}
              >
                <div className="flex flex-col items-start relative z-10">
                  <span className="text-indigo-400 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                    <Target className="w-3 h-3 text-amber-400" /> Modo Profundo
                  </span>
                  <span className="text-slate-400 text-[10px] mt-1 font-medium italic">Análisis magistral estratégico (Profundidad 18)</span>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-indigo-500/30 flex items-center justify-center group-hover:border-indigo-500/60 relative z-10">
                  {analysisDepthMode === "deep" && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />}
                </div>
              </button>

              <button
                onClick={() => { setShowAnalysisConfig(false); runFullAnalysis("lichess"); }}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-all group relative overflow-hidden",
                  analysisDepthMode === "lichess" ? "bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]" : "bg-black/40 border-white/5 hover:border-cyan-500/30"
                )}
              >
                <div className="flex flex-col items-start relative z-10">
                  <span className="text-cyan-400 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                    <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
                    Modo Nube (Online)
                  </span>
                  <span className="text-slate-400 text-[10px] mt-1 font-medium italic">Análisis instantáneo (Fallback a Rápido si no existe)</span>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-cyan-500/30 flex items-center justify-center group-hover:border-cyan-500/60 relative z-10">
                  {analysisDepthMode === "lichess" && <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />}
                </div>
              </button>
            </div>

            {aiApiKey && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <Brain className="w-3 h-3 text-violet-400" />
                <span className="text-[9px] text-violet-300 font-medium">
                  IA activa: {getProviderById(aiProvider)?.name || "API"} — {enableTechnicalAnalysis ? "General + Técnico" : "Solo General"}
                </span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAnalysisConfig(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Modal de confirmación de salida aventura */}
      {showAdventureExitConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="bg-[#050a0f] border border-amber-900/50 p-8 rounded-2xl max-w-sm w-full text-center shadow-[0_0_50px_rgba(180,100,0,0.3)] animate-in zoom-in-95 duration-200">
            <Sword className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <h3 className="text-amber-400 font-black uppercase tracking-widest text-lg mb-2" style={{ fontFamily: "Georgia, serif" }}>
              ¿Abandonar el Camino?
            </h3>
            <p className="text-stone-400 text-xs leading-relaxed mb-8 italic">
              "Tu progreso en esta noche se preservará en el Códice, pero los motores del destino serán silenciados hasta tu regreso."
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAdventureExitConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-stone-800 text-stone-500 text-[10px] uppercase font-bold hover:bg-stone-900 transition-all"
              >
                Permanecer
              </button>
              <button
                onClick={confirmExitAdventure}
                className="flex-1 py-2 rounded-lg bg-amber-950/40 border border-amber-700/50 text-amber-300 text-[10px] uppercase font-bold hover:bg-red-900/40 hover:text-red-200 transition-all"
              >
                Salir al Mundo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast gótico de hito narrativo (campana de la noche caída) */}
      {adventureMilestoneMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] max-w-lg w-full px-4">
          <div
            className="relative rounded-2xl border border-amber-700/50 bg-[#080004] shadow-[0_0_60px_rgba(180,100,0,0.4)] p-5 text-center overflow-hidden"
            style={{ fontFamily: "Georgia, serif" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-950/40 via-transparent to-red-950/20 pointer-events-none" />
            <div className="relative z-10">
              <div className="text-amber-400/60 text-[9px] uppercase tracking-[0.5em] mb-2">Año 3000 del Cómputo Sombrío</div>
              <p className="text-amber-200 text-sm leading-relaxed italic">{adventureMilestoneMsg}</p>
              <button
                onClick={() => setAdventureMilestoneMsg(null)}
                className="mt-4 px-6 py-1.5 text-[10px] uppercase tracking-widest font-black text-amber-700 border border-amber-900/40 rounded-full hover:border-amber-600/60 hover:text-amber-500 transition-all"
              >
                El Códice lo recuerda
              </button>
            </div>
          </div>
        </div>
      )}



      {isAdventureModeOpen && (
        <AdventureMode
          playAudio={playAudio}
          adventureProgress={adventureProgress}
          onStartBattle={handleAdventureStartBattle}
          onClose={() => {
            if (activeAdventureEnemy) {
              setShowAdventureExitConfirm(true);
            } else {
              confirmExitAdventure();
            }
          }}
          onReturnToGame={() => {
            setIsAdventureModeOpen(false);
            setShowMainScreen(false);
          }}
          hasActiveGame={!!activeAdventureEnemy}
          isAdventureModeOpen={isAdventureModeOpen}
          onResetCounter={() => {
            if (confirm(language === "es" ? "¿Seguro que quieres reiniciar tu progreso de aventura?" : "Are you sure you want to reset your adventure progress?")) {
              setAdventureProgress({
                playerElo: 1000,
                currentStage: 1,
                wins: {},
                defeated: [],
                humanBattles: 0,
              });
            }
          }}
          language={language}
          playerName={playerName}
          adventurePlayerName={adventurePlayerName}
          setAdventurePlayerName={setAdventurePlayerName}
          showEnemyElo={showEnemyElo}
          setShowEnemyElo={setShowEnemyElo}
          adventureMusicVolume={adventureMusicVolume}
          setAdventureMusicVolume={setAdventureMusicVolume}
          lanColor={lanMyColor}
          lanStatus={lanStatus}
        />
      )}
    </div>
  );
}


// Componente panel de Códice/Aventura
function AdventureBotPanel({ enemy, onShowHistory, showEnemyElo }: { enemy: AdventureEnemy, onShowHistory: () => void, showEnemyElo: boolean }) {
  if (!enemy) return null; // Seguridad contra nulos
  return (
    <div className="flex-1 flex flex-col h-full bg-black text-amber-500 overflow-y-auto" style={{ fontFamily: "Georgia, serif" }}>
      <div className="relative h-48 shrink-0 border-b border-red-900/30">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
        <img src={enemy.image} alt={enemy.name} className="w-full h-full object-cover object-top opacity-50" />
        <div className="absolute bottom-4 left-4 z-20">
          <h2 className="text-2xl font-black text-amber-400 tracking-widest uppercase" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>{enemy.name}</h2>
          <p className="text-xs text-amber-700 uppercase tracking-widest">{enemy.title}</p>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-6 relative z-20">
        {/* Narrativa */}
        <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-4 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
          <p className="text-sm text-stone-300 italic mb-4 leading-relaxed">
            {enemy.bio}
          </p>
          <p className="text-xs font-bold text-red-500">
            "{enemy.quote}"
          </p>
        </div>

        {/* Técnica */}
        <div className="bg-stone-900/40 border border-amber-900/30 rounded-lg p-4">
          <h3 className="text-[10px] text-amber-600 font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
            <Settings className="w-3.5 h-3.5" /> Parámetros Técnicos
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="block text-stone-500 mb-1">Motor Asociado</span>
              <span className="font-mono text-amber-300">{enemy.engineType.toUpperCase()}</span>
            </div>
            <div>
              <span className="block text-stone-500 mb-1">Nivel / Prof</span>
              <span className="font-mono text-amber-300">{enemy.depth}</span>
            </div>
            <div className="col-span-2">
              <span className="block text-stone-500 mb-1">Fuerza Estimada (Elo)</span>
              <span className="font-mono text-amber-300">{showEnemyElo ? enemy.eloRange : "Oculto"}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onShowHistory}
          className="mobile-hide-history mt-auto py-2 border border-amber-900/50 rounded-lg text-amber-600 text-[10px] uppercase tracking-widest hover:bg-amber-900/20 transition-colors"
        >
          Ver Historial de Partida
        </button>
      </div>
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
  isAutoPlaying,
  setIsAutoPlaying,
  totalMoves,
}: any) {
  const historyEndRef = useRef<HTMLDivElement>(null);
  const [isCommentOpen, setIsCommentOpen] = useState(false);

  useEffect(() => {
    // Cuando cambiamos de jugada, cerrar el comentario si está vacío para ahorrar espacio
    if (viewingMoveIndex !== null) {
      const c = moveComments[viewingMoveIndex];
      const hasContent = typeof c === "object" ? !!c.comment : !!c;
      setIsCommentOpen(hasContent);
    }
  }, [viewingMoveIndex, moveComments]);

  const getMoveClassification = (evalBefore: number, evalAfter: number, isWhiteMove: boolean) => {
    if (evalBefore === undefined || evalAfter === undefined) return null;
    const delta = evalAfter - evalBefore;
    const classification = classifyMove(delta, evalAfter);

    const map: Record<MoveClassification, { icon: string, color: string, title: string } | null> = {
      brilliant: { icon: "!!", color: "text-cyan-400 font-black", title: "Brillante" },
      great: { icon: "!", color: "text-blue-400 font-bold", title: "Gran Jugada" },
      best: { icon: "⭐", color: "text-emerald-400 font-bold", title: "La Mejor" },
      excellent: { icon: "â²", color: "text-green-400 font-bold", title: "Excelente" },
      good: { icon: "✔", color: "text-slate-400 font-bold", title: "Buena" },
      book: { icon: "📖", color: "text-amber-400/80 font-bold", title: "Libro" },
      inaccuracy: { icon: "?!", color: "text-yellow-500 font-semibold", title: "Imprecisión" },
      mistake: { icon: "?", color: "text-orange-500 font-bold", title: "Error" },
      blunder: { icon: "??", color: "text-red-500 font-black", title: "Error Grave" }
    };

    return map[classification];
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
    // Auto-scroll al ultimo movimiento cuando se agrega uno nuevo
    if (rightTab === "history" && viewingMoveIndex === null) {
      historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [rightTab, historyPairs, viewingMoveIndex]);

  return (
    <div className="relative h-full flex flex-col flex-1 min-h-0">

      {rightTab === "history" ? (
        <div className="flex flex-col h-full min-h-0 flex-1 overflow-hidden">
          {totalMoves > 0 && (
            <div className="flex items-center justify-between gap-1 px-2 py-1.5 bg-slate-900/80 border-b border-slate-700/50 shrink-0">
              <button onClick={() => { setIsAutoPlaying(false); onMoveClick(-1); }} disabled={viewingMoveIndex === -1 && !isAutoPlaying}
                className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-all">
                <ChevronsLeft className="w-3 h-3" />
              </button>
              <button onClick={() => { setIsAutoPlaying(false); const idx = viewingMoveIndex !== null ? viewingMoveIndex - 1 : totalMoves - 2; onMoveClick(Math.max(-1, idx)); }} disabled={viewingMoveIndex === null || viewingMoveIndex <= -1}
                className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-all">
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button onClick={() => {
                if (!isAutoPlaying) {
                  if (viewingMoveIndex === null || viewingMoveIndex >= totalMoves - 1) onMoveClick(-1, true);
                  setIsAutoPlaying(true);
                } else {
                  setIsAutoPlaying(false);
                }
              }}
                className="w-7 h-6 flex items-center justify-center rounded bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:bg-teal-500/30 transition-all">
                {isAutoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <button onClick={() => { setIsAutoPlaying(false); const idx = viewingMoveIndex !== null ? viewingMoveIndex + 1 : 0; onMoveClick(Math.min(totalMoves - 1, idx)); }} disabled={viewingMoveIndex === null || viewingMoveIndex >= totalMoves - 1}
                className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-all">
                <ChevronRight className="w-3 h-3" />
              </button>
              <button onClick={() => { setIsAutoPlaying(false); onMoveClick(totalMoves - 1); }} disabled={viewingMoveIndex === totalMoves - 1 && !isAutoPlaying}
                className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-all">
                <ChevronsRight className="w-3 h-3" />
              </button>
              <span className="text-[9px] text-slate-500 font-mono font-bold tabular-nums min-w-[3rem] text-center">
                {viewingMoveIndex !== null ? `${viewingMoveIndex + 1}/${totalMoves}` : `▶ ${totalMoves}`}
              </span>
            </div>
          )}
          <div
            className="flex-1 min-h-0 flex flex-col text-[13px] font-mono font-medium tracking-tight pb-2 overflow-y-auto history-scrollbar"
            style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              // Asegura que el contenedor no colapse y respete el espacio del sidebar
              height: "100%",
            }}
          >
            {historyPairs.map(([wMove, bMove]: any, i: number) => {
              const wIdx = i * 2;
              const bIdx = i * 2 + 1;
              const wClass = getMoveClassification(moveEvaluations[wIdx], moveEvaluations[wIdx + 1], true);
              const bClass = getMoveClassification(moveEvaluations[bIdx], moveEvaluations[bIdx + 1], false);
              const wClassName = cn(
                "flex-1 flex gap-1 items-center px-1.5 py-1 rounded transition-colors cursor-pointer truncate",
                viewingMoveIndex === wIdx
                  ? "bg-slate-800 text-white shadow-inner"
                  : "text-slate-300 hover:bg-slate-700/50"
              );
              const bClassName = cn(
                "flex-1 flex gap-1 items-center px-1.5 py-1 rounded transition-colors cursor-pointer truncate",
                viewingMoveIndex === bIdx
                  ? "bg-slate-800 text-white shadow-inner"
                  : "text-slate-300 hover:bg-slate-700/50"
              );
              const wRendered = renderColoredMove(wMove);
              const bRendered = renderColoredMove(bMove);
              return (
                <div key={i} className="flex flex-col gap-1 px-1 py-1 hover:bg-slate-800/30 rounded border-b border-white/5 last:border-0">
                  <div className="flex gap-1 items-center">
                    <span className="text-slate-600 w-6 text-right shrink-0 text-[11px] font-bold">
                      {i + 1}.
                    </span>
                    <div onClick={() => onMoveClick(wIdx)} className={wClassName}>
                      <span className="truncate">{wRendered}</span>
                      {(() => {
                        const mc = moveComments?.[wIdx];
                        if (mc?.classification === "book") {
                          return <span className="text-[10px] text-amber-400/80" title={mc.comment}>📖</span>;
                        }
                        if (wClass) {
                          return <span className={cn("text-[10px]", wClass.color)} title={wClass.title}>{wClass.icon}</span>;
                        }
                        return null;
                      })()}
                    </div>
                    {bMove ? (
                      <div onClick={() => onMoveClick(bIdx)} className={bClassName}>
                        <span className="truncate">{bRendered}</span>
                        {(() => {
                          const mc = moveComments?.[bIdx];
                          if (mc?.classification === "book") {
                            return <span className="text-[10px] text-amber-400/80" title={mc.comment}>📖</span>;
                          }
                          if (bClass) {
                            return <span className={cn("text-[10px]", bClass.color)} title={bClass.title}>{bClass.icon}</span>;
                          }
                          return null;
                        })()}
                      </div>
                    ) : <div className="flex-1" />}
                  </div>

                </div>
              );
            })}
            <div ref={historyEndRef} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 h-full relative">
          {!isNeuralVisionEnabled ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] rounded-xl border border-slate-700/50 p-6 text-center z-10 pointer-events-none">
              <span className="text-slate-500 font-bold uppercase tracking-widest text-xs pointer-events-auto">
                {language === "es" ? "Visión Neuronal Desactivada" : "Neural Vision Disabled"}
              </span>
            </div>
          ) : isAiVsAi ? (
            <div className={cn("flex w-full h-full gap-2", boardOrientation === "white" ? "flex-col-reverse" : "flex-col")}>
              {(neuralViewMode === "both" || neuralViewMode === "white") && (
                <div
                  className="flex-1 relative rounded-xl overflow-hidden border border-teal-900/30 shadow-[0_0_15px_rgba(20,184,166,0.08)] bg-gradient-to-b from-slate-950 to-black hover:border-teal-500/40 hover:shadow-[0_0_20px_rgba(20,184,166,0.15)] transition-all duration-300"
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
                  className="flex-1 relative rounded-xl overflow-hidden border border-slate-600/50 shadow-lg bg-slate-900/30 hover:border-emerald-400/60 transition-all duration-200"
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
              className="flex-1 relative rounded-xl overflow-hidden border border-teal-900/30 shadow-[0_0_15px_rgba(20,184,166,0.08)] bg-gradient-to-b from-slate-950 to-black hover:border-teal-500/40 hover:shadow-[0_0_20px_rgba(20,184,166,0.15)] transition-all duration-300"
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

// â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬




