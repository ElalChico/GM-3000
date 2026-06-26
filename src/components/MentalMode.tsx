import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Chess } from "chess.js";
import { ChessgroundBoard } from "./ChessgroundBoard";
import { Grid3x3, X, Brain, CornerDownLeft, Eye, EyeOff, ChevronDown, RotateCcw, Cpu, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Play, Pause } from "lucide-react";
import mentalBg0 from "../assets/fondos/mental-mode/fondo-mental-mode.png";
import mentalBg1 from "../assets/fondos/mental-mode/fondo-mental-mode1.png";

const MENTAL_BGS = [mentalBg0, mentalBg1];

const ERROR_SOUND_B64 = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f3+AgH9/f3+AgH9/f3+AgICAf39/f4CAgH9/f4B/f3+AgH9/f3+AgH9/f3+AgICAf39/f3+AgH9/gH9/f3+AgH9/f3+AgICAf39/gH9/f4B/f3+AgH9/f3+AgH9/f3+AgICAf3+Af39/gH9/f4B/f3+AgICAf39/f4B/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f3+AgH9/f3+AgICAf39/f4B/f3+AgICAf39/f4CAgH9/f4B/f3+AgICAf39/f4CAf3+AgH9/f4CAf39/gICAgICAgICAf39/gICAgICAgICAf39/gICAgICAgICAf39/f39/gICAgICAgICAf39/f39/gICAgICAgICAf39/f39/gICAgICAgICAf39/f39/gICAgICAgICAf39/f39/gICAgICAgICAf39/f4B/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f3+AgH9/f4B/f3+AgH9/f4B/f3+AgH9/f4CAf3+AgH9/f4CAf39/gICAgICAgICAf39/gICAgICAgICAf39/f39/gICAgICAgICAgH9/f39/gICAgICAgICAgH9/f39/gICAgICAgICAgICA";

function formatCoords(game: Chess) {
  const bd = game.board();
  const rows: string[][] = [];
  const whiteList: string[] = [];
  const blackList: string[] = [];
  for (let r = 0; r < 8; r++) {
    const row: string[] = [];
    for (let c = 0; c < 8; c++) {
      const sq = bd[r][c];
      const file = "abcdefgh"[c];
      const rank = 8 - r;
      const label = `${file}${rank}`;
      if (sq) {
        row.push(label);
        if (sq.color === "w") whiteList.push(label);
        else blackList.push(label);
      } else {
        row.push(label);
      }
    }
    rows.push(row);
  }
  return { map: rows, whiteList, blackList };
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function fenNotation(game: Chess): string {
  const bd = game.board();
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let row = "";
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const sq = bd[r][c];
      if (!sq) { empty++; }
      else {
        if (empty > 0) { row += empty; empty = 0; }
        row += sq.color === "w" ? sq.type.toUpperCase() : sq.type;
      }
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }
  return rows.join("/");
}

function formatHistory(history: string[]): Array<{ num: number; white: string; black: string }> {
  const entries: Array<{ num: number; white: string; black: string }> = [];
  for (let i = 0; i < history.length; i += 2) {
    entries.push({ num: Math.floor(i / 2) + 1, white: history[i], black: history[i + 1] || "" });
  }
  return entries;
}

interface EngineOption {
  id: string;
  name: string;
  isOwn?: boolean;
}

interface MentalModeProps {
  game: Chess;
  setGame: (g: Chess) => void;
  fen: string;
  setFen: (f: string) => void;
  setSystemNotification: (s: string) => void;
  onExit: () => void;
  onRestart?: () => void;
  onStartMentalGame?: (config: { engineType: string; depth: number; color: "w" | "b" }) => void;
  onHumanMove?: (san: string) => void;
  opponent: "ai" | "lan";
  lanSendStateRef?: React.MutableRefObject<any>;
  lanMyColor?: string | null;
  timeWhite: number;
  timeBlack: number;
  setTimeWhite: (t: number) => void;
  setTimeBlack: (t: number) => void;
  isTimerRunning: boolean;
  setIsTimerRunning: (b: boolean) => void;
  timerIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
  whitePlayer: "human" | "ai";
  blackPlayer: "human" | "ai";
  mentalClockEnabled: boolean;
  onMoveMade?: (g: Chess) => void;
  appHistory?: string[];
  notationFormat?: "san" | "long" | "coord" | "verbal";
  blackEngineType?: string;
  setBlackEngineType?: (t: string) => void;
  blackAiDepth?: number;
  setBlackAiDepth?: (d: number) => void;
  whiteEngineType?: string;
  getEloRating?: (depth: number, engineType: string) => string;
  engineOptions?: EngineOption[];
}

const NOTATION_FORMATS: Array<{ key: string; label: string; short: string }> = [
  { key: "san", label: "SAN", short: "SAN" },
  { key: "long", label: "Largo", short: "Largo" },
  { key: "coord", label: "Coordenadas", short: "Coord" },
  { key: "verbal", label: "Verbal", short: "Verbal" },
];

export default function MentalMode({
  game, setGame, fen, setFen, setSystemNotification, onExit, onRestart,
  opponent, lanSendStateRef, lanMyColor,
  timeWhite, timeBlack, setTimeWhite, setTimeBlack,
  isTimerRunning, setIsTimerRunning, timerIntervalRef,
  whitePlayer, blackPlayer, mentalClockEnabled, onMoveMade, appHistory,
  onStartMentalGame, onHumanMove,
  notationFormat: notationFormatProp,
  blackEngineType, setBlackEngineType, blackAiDepth, setBlackAiDepth,
  whiteEngineType, getEloRating, engineOptions,
}: MentalModeProps) {
  const [step, setStep] = useState<"setup" | "playing">(game.history().length > 0 ? "playing" : "setup");
  const [setupColor, setSetupColor] = useState<"w" | "b">("w");
  const [setupEngine, setSetupEngine] = useState<string>(blackEngineType || "stockfish");
  const [setupDepth, setSetupDepth] = useState<number>(blackAiDepth || 18);

  const [moveInput, setMoveInput] = useState("");
  const [showCoords, setShowCoords] = useState(false);
  const [revealLevel, setRevealLevel] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{top: number; left: number}>({top: 0, left: 0});
  const [illegalShake, setIllegalShake] = useState(false);
  const [illegalMsg, setIllegalMsg] = useState("");
  const [localNotationFormat, setLocalNotationFormat] = useState(2);
  const [showEnginePanel, setShowEnginePanel] = useState(false);
  const [viewingMoveIndex, setViewingMoveIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mentalBg] = useState(() => MENTAL_BGS[Math.floor(Math.random() * MENTAL_BGS.length)]);
  const errorAudioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyBoxRef = useRef<HTMLDivElement>(null);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const revealWrapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const enginePanelRef = useRef<HTMLDivElement>(null);

  const notationFormat = notationFormatProp || NOTATION_FORMATS[localNotationFormat].key as any;
  const cycleFormat = () => setLocalNotationFormat(i => (i + 1) % NOTATION_FORMATS.length);

  const displayHistory = (appHistory && appHistory.length > 0) ? appHistory : game.history();

  const [lastOpponentMove, setLastOpponentMove] = useState<string | null>(null);
  const [lastOpponentPlayer, setLastOpponentPlayer] = useState<string | null>(null);
  const prevHistoryLen = useRef(displayHistory.length);

  const turnName = game.turn() === "w" ? "Blancas" : "Negras";

  const localGameRef = useRef<Chess>(new Chess());
  const localGameInitialized = useRef(false);

  useEffect(() => {
    if (!errorAudioRef.current) {
      errorAudioRef.current = new Audio(ERROR_SOUND_B64);
      errorAudioRef.current.volume = 0.5;
    }
    inputRef.current?.focus();
  }, []);

  const SOUNDS = {
    move: new Audio("https://lichess1.org/assets/sound/standard/Move.mp3"),
    capture: new Audio("https://lichess1.org/assets/sound/standard/Capture.mp3"),
    check: new Audio("https://lichess1.org/assets/sound/standard/Check.mp3"),
  };

  const playSound = useCallback((type: "move" | "capture" | "check") => {
    try {
      const audio = SOUNDS[type].cloneNode() as HTMLAudioElement;
      audio.volume = 0.5;
      audio.play().catch((e) => console.warn("MentalMode audio failed", e));
    } catch {}
  }, []);

  useEffect(() => {
    if (!localGameInitialized.current) {
      const hist = (appHistory && appHistory.length > 0) ? appHistory : game.history();
      if (hist.length > 0) {
        const g = new Chess();
        for (const san of hist) {
          try { g.move(san); } catch { break; }
        }
        localGameRef.current = g;
      } else {
        localGameRef.current = new Chess(game.fen());
      }
      localGameInitialized.current = true;
    } else if (displayHistory.length > prevHistoryLen.current) {
      const newSan = displayHistory[displayHistory.length - 1];
      try { localGameRef.current.move(newSan); } catch {}
    } else if (displayHistory.length < localGameRef.current.history().length) {
      const g = new Chess();
      for (const san of displayHistory) {
        try { g.move(san); } catch { break; }
      }
      localGameRef.current = g;
    }
  }, [displayHistory]);

  const convertNotation = useCallback((san: string, format?: string): string => {
    if (!format || format === "san" || !san) return san;
    const hist = localGameRef.current.history({ verbose: true });
    const verbose = hist.find((m: any) => m.san === san);
    if (!verbose) return san;
    if (format === "verbal") {
      const names: Record<string, string> = { p: "peón", n: "caballo", b: "alfil", r: "torre", q: "dama", k: "rey" };
      if (verbose.san === "O-O") return "enroque corto";
      if (verbose.san === "O-O-O") return "enroque largo";
      const name = names[verbose.piece] || verbose.piece;
      if (verbose.captured) {
        const capName = names[verbose.captured] || verbose.captured;
        return `${name} ${verbose.from}x${capName} ${verbose.to}`;
      }
      return `${name} ${verbose.from} a ${verbose.to}`;
    }
    if (format === "long") return verbose.from + verbose.to + (verbose.promotion || "");
    return verbose.from[1] + verbose.to + (verbose.promotion || "");
  }, []);

  useEffect(() => {
    if (displayHistory.length > prevHistoryLen.current) {
      const lastSan = displayHistory[displayHistory.length - 1];
      const lastMoveWasWhite = displayHistory.length % 2 === 1;
      const lastMoveWasOpponent =
        (lastMoveWasWhite && blackPlayer === "human") ||
        (!lastMoveWasWhite && whitePlayer === "human");
      if (lastMoveWasOpponent) {
        const whoMoved = lastMoveWasWhite ? "Blancas" : "Negras";
        setLastOpponentMove(lastSan);
        setLastOpponentPlayer(whoMoved);
        if (lastSan.includes("#") || lastSan.includes("+")) {
          playSound("check");
        } else if (lastSan.includes("x")) {
          playSound("capture");
        } else {
          playSound("move");
        }
      } else {
        setLastOpponentMove(null);
        setLastOpponentPlayer(null);
      }
    } else if (displayHistory.length < prevHistoryLen.current) {
      setLastOpponentMove(null);
      setLastOpponentPlayer(null);
    }
    prevHistoryLen.current = displayHistory.length;
  }, [displayHistory, playSound]);

  useEffect(() => {
    if (historyBoxRef.current && viewingMoveIndex === null) {
      historyBoxRef.current.scrollTop = historyBoxRef.current.scrollHeight;
    }
  }, [displayHistory, viewingMoveIndex]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (revealWrapRef.current && !revealWrapRef.current.contains(e.target as Node)
          && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (showEnginePanel && enginePanelRef.current && !enginePanelRef.current.contains(e.target as Node)) {
        setShowEnginePanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEnginePanel]);

  const isCheckmate = game.isCheckmate();
  const isDraw = game.isDraw();
  const isCheck = game.inCheck();
  const isTimeout = timeWhite <= 0 || timeBlack <= 0;
  const isOver = game.isGameOver() || isTimeout;
  const winner = isCheckmate
    ? (game.turn() === "w" ? "Negras" : "Blancas")
    : isTimeout
    ? (timeWhite <= 0 ? "Negras" : "Blancas")
    : null;
  const endReason = isCheckmate
    ? "jaque mate"
    : isTimeout
    ? "tiempo agotado"
    : isDraw && game.isStalemate()
    ? "ahogado"
    : isDraw && game.isInsufficientMaterial()
    ? "material insuficiente"
    : isDraw && game.isThreefoldRepetition()
    ? "tresfold repetición"
    : isDraw
    ? "tablas"
    : null;

  const viewingGame = useMemo(() => {
    if (viewingMoveIndex === null) return null;
    const g = new Chess();
    const hist = (appHistory && appHistory.length > 0) ? appHistory : game.history();
    for (let i = 0; i <= viewingMoveIndex && i < hist.length; i++) {
      try { g.move(hist[i]); } catch { break; }
    }
    return g;
  }, [viewingMoveIndex, displayHistory, game, appHistory]);

  const activeGame = viewingGame || game;
  const coords = formatCoords(activeGame);
  const fenText = fenNotation(activeGame);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setViewingMoveIndex(prev => {
        if (prev === null || prev >= displayHistory.length - 1) {
          setIsPlaying(false);
          return displayHistory.length - 1;
        }
        return prev + 1;
      });
    }, 1200);
    return () => clearInterval(timer);
  }, [isPlaying, displayHistory.length]);

  useEffect(() => {
    if (!isTimerRunning || isOver) return;
    const interval = setInterval(() => {
      if (game.turn() === "w") {
        setTimeWhite((t: number) => {
          if (t <= 1) { setIsTimerRunning(false); return 0; }
          return t - 1;
        });
      } else {
        setTimeBlack((t: number) => {
          if (t <= 1) { setIsTimerRunning(false); return 0; }
          return t - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, isOver, game]);

  const playError = useCallback(() => {
    if (errorAudioRef.current) {
      errorAudioRef.current.currentTime = 0;
      errorAudioRef.current.play().catch(() => {});
    }
  }, []);

  const hideReveal = useCallback(() => {
    setRevealLevel(0);
    if (revealTimerRef.current) { clearTimeout(revealTimerRef.current); revealTimerRef.current = null; }
  }, []);

  const doReveal = useCallback((level: number) => {
    setRevealLevel(level);
    setDropdownOpen(false);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
  }, []);

  const parseVerbalMove = useCallback((raw: string): string | null => {
    const lower = raw.toLowerCase().trim();
    const pieceMap: Record<string, string> = {
      peón: "P", peon: "P", p: "P",
      caballo: "N", cab: "N", c: "N", n: "N",
      alfil: "B", ali: "B", a: "B", b: "B",
      torre: "R", tor: "R", t: "R", r: "R",
      dama: "Q", dam: "Q", d: "Q", q: "Q",
      rey: "K", re: "K", k: "K",
    };
    const coordRe = /([a-h][1-8]|[1-8][a-h])/g;
    const coords = lower.match(coordRe);
    const isCapture = lower.includes("x") || lower.includes("captura") || lower.includes("come");

    let piecePrefix = "";
    for (const [key, val] of Object.entries(pieceMap)) {
      if (lower.startsWith(key + " ") || lower.startsWith(key + "s ")) {
        piecePrefix = val;
        break;
      }
    }

    if (coords && coords.length >= 2) {
      const from = coords[0].length === 2 && /[a-h]/.test(coords[0][0]) ? coords[0] : "";
      const to = coords[1].length === 2 && /[a-h]/.test(coords[1][0]) ? coords[1] : "";
      if (from && to) {
        return piecePrefix + (isCapture ? "x" : "") + (piecePrefix ? to : from + to);
      }
    }

    if (coords && coords.length === 1 && piecePrefix) {
      const to = coords[0].length === 2 && /[a-h]/.test(coords[0][0]) ? coords[0] : "";
      if (to) return piecePrefix + to;
    }

    if (lower.includes("enroque corto") || lower.includes("enroque corto")) return "O-O";
    if (lower.includes("enroque largo") || lower.includes("enroque largo")) return "O-O-O";
    if (lower === "o-o" || lower === "0-0") return "O-O";
    if (lower === "o-o-o" || lower === "0-0-0") return "O-O-O";

    return null;
  }, []);

  const handleSubmit = useCallback(() => {
    if (viewingMoveIndex !== null) { setViewingMoveIndex(null); return; }
    const raw = moveInput.trim();
    if (!raw) return;

    const g = new Chess(game.fen());
    let result: any = null;

    const verbalMove = parseVerbalMove(raw);
    const attempts = verbalMove
      ? [raw, raw.charAt(0).toUpperCase() + raw.slice(1), raw.toLowerCase(), verbalMove]
      : [raw, raw.charAt(0).toUpperCase() + raw.slice(1), raw.toLowerCase()];

    for (const attempt of attempts) {
      try { result = g.move(attempt); if (result) break; } catch {}
    }

    if (!result && raw.length >= 3 && /[a-h]/.test(raw[1])) {
      const stripped = raw.slice(1);
      for (const attempt of [stripped, stripped.toLowerCase()]) {
        try { result = g.move(attempt); if (result) break; } catch {}
      }
    }

    if (result) {
      const san = result.san || "";
      if (san.includes("#") || san.includes("+")) {
        playSound("check");
      } else if (san.includes("x")) {
        playSound("capture");
      } else {
        playSound("move");
      }
      if (onHumanMove) {
        onHumanMove(result.san);
        setMoveInput("");
        setIllegalMsg("");
        setIllegalShake(false);
        setViewingMoveIndex(null);
      } else {
        setGame(g);
        setFen(g.fen());
        setMoveInput("");
        setIllegalMsg("");
        setIllegalShake(false);
        setViewingMoveIndex(null);
        const thinkDelay = opponent === "ai" ? 600 + Math.random() * 1000 : 0;
        console.log("[MentalMode] move accepted:", result.san, "delay:", Math.round(thinkDelay), "ms");
        setTimeout(() => { console.log("[MentalMode] calling onMoveMade after delay"); onMoveMade?.(g); }, thinkDelay);
      }
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      playError();
      setIllegalShake(true);
      setIllegalMsg(`"${raw}" no es v\u00e1lido`);
      setSystemNotification(`Movimiento ilegal: ${raw}`);
      setTimeout(() => setIllegalShake(false), 600);
    }
  }, [moveInput, game, setGame, setFen, playError, setSystemNotification, onMoveMade, viewingMoveIndex, playSound]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  }, [handleSubmit]);

  const isHumanTurn =
    (game.turn() === "w" && whitePlayer === "human") ||
    (game.turn() === "b" && blackPlayer === "human");

  let myTurn = isHumanTurn;
  if (opponent === "lan") {
    myTurn =
      (game.turn() === "w" && lanMyColor === "white") ||
      (game.turn() === "b" && lanMyColor === "black");
  }

  useEffect(() => {
    if (!isOver && isHumanTurn && viewingMoveIndex === null) {
      inputRef.current?.focus();
    }
  }, [isHumanTurn, isOver, viewingMoveIndex]);

  const handleRestart = useCallback(() => {
    if (onRestart) {
      onRestart();
      setStep("setup");
      setViewingMoveIndex(null);
      setMoveInput("");
      setIllegalMsg("");
      setLocalNotationFormat(0);
    }
  }, [onRestart]);

  const eloDisplay = getEloRating && blackAiDepth != null && blackEngineType
    ? `~${getEloRating(blackAiDepth, blackEngineType)}`
    : null;

  const mentalStyle = (<style>{`
.mental-container{background:radial-gradient(ellipse at 20% 50%,rgba(108,140,255,0.08) 0%,transparent 50%),radial-gradient(ellipse at 80% 20%,rgba(167,139,250,0.06) 0%,transparent 50%),radial-gradient(ellipse at 50% 80%,rgba(52,211,153,0.04) 0%,transparent 50%),linear-gradient(180deg,#0f1117,#131520,#0f1117);border:none;border-radius:0;display:flex;flex-direction:row;gap:0;max-width:none;min-height:100vh;width:100vw;margin:0;color:#e2e8f0;font-family:'Inter','Segoe UI',system-ui,sans-serif;font-size:14px;position:fixed;inset:0;z-index:9999;overflow:hidden;box-shadow:none}
.mental-sidebar{width:140px;flex-shrink:0;display:flex;flex-direction:column;align-items:stretch;gap:4px;padding:16px 10px;border-right:1px solid rgba(108,140,255,0.15);background:rgba(15,17,23,0.85);backdrop-filter:blur(24px);overflow-y:auto}
.msb-btn{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:rgba(15,17,23,0.7);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;cursor:pointer;transition:all 0.2s cubic-bezier(0.4,0,0.2,1);width:100%;text-align:left;font-size:13px;font-weight:500;font-family:inherit;backdrop-filter:blur(8px)}
.msb-btn:hover{background:rgba(108,140,255,0.1);color:#e2e8f0;border-color:rgba(108,140,255,0.3);box-shadow:0 0 20px rgba(108,140,255,0.12)}
.msb-btn:active{transform:scale(0.96);transition:transform 0.08s}
.msb-btn.active{background:rgba(108,140,255,0.15);border-color:rgba(108,140,255,0.4);color:#6c8cff;box-shadow:0 0 20px rgba(108,140,255,0.15)}
.msb-label{flex:1;line-height:1}
.msb-exit{color:#f87171;border-color:rgba(248,113,113,0.15)}
.msb-exit:hover{background:rgba(248,113,113,0.1);border-color:rgba(248,113,113,0.3);color:#fca5a5;box-shadow:0 0 20px rgba(248,113,113,0.12)}
.msb-sep{height:1px;background:rgba(255,255,255,0.06);margin:8px 14px}
.msb-reveal-wrap{position:relative}
.msb-dropdown{background:rgba(15,17,23,0.95);backdrop-filter:blur(20px);border:1px solid rgba(108,140,255,0.25);border-radius:10px;overflow:hidden;z-index:10000;box-shadow:0 8px 32px rgba(0,0,0,0.6);min-width:170px}
.msb-dropdown button{display:block;width:100%;padding:10px 16px;background:rgba(15,17,23,0.5);border:none;color:#94a3b8;cursor:pointer;font-size:12px;text-align:left;transition:all 0.15s;white-space:nowrap;font-family:inherit}
.msb-dropdown button:hover{background:rgba(108,140,255,0.15);color:#e2e8f0}
.msb-format{font-size:11px;font-weight:700;font-family:monospace;letter-spacing:0.5px;color:#6c8cff}
.mental-content{flex:1;display:flex;flex-direction:column;gap:14px;padding:24px 28px;overflow-y:auto;min-width:0}
.mental-pgn-panel{width:260px;flex-shrink:0;display:flex;flex-direction:column;border-left:1px solid rgba(108,140,255,0.15);background:rgba(15,17,23,0.80);backdrop-filter:blur(20px);overflow:hidden}
.mpg-header{padding:16px 18px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#6c8cff;border-bottom:1px solid rgba(108,140,255,0.15);background:rgba(108,140,255,0.1)}
.mental-clock-row{display:flex;gap:12px}
.mental-clock{width:100%;padding:14px 18px;border-radius:14px;font-size:22px;font-weight:700;font-family:'JetBrains Mono','Fira Code',monospace;display:flex;align-items:center;gap:10px;transition:all 0.2s}
.mental-clock.cw{background:rgba(15,17,23,0.75);backdrop-filter:blur(12px);color:#f1f5f9;border:1px solid rgba(255,255,255,0.12)}
.mental-clock.cb{background:rgba(15,17,23,0.75);backdrop-filter:blur(12px);color:#94a3b8;border:1px solid rgba(108,140,255,0.18)}
.mental-clock.active-white{background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.45);color:#fbbf24;box-shadow:0 0 20px rgba(251,191,36,0.15)}
.mental-clock.active-black{background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.45);color:#fbbf24;box-shadow:0 0 20px rgba(251,191,36,0.15)}
.mcd{width:12px;height:12px;border-radius:50%;flex-shrink:0}
.mcd.w{background:#f1f5f9;border:1px solid #cbd5e1;box-shadow:0 0 8px rgba(241,245,249,0.3)}
.mcd.b{background:#1e293b;border:1px solid #475569;box-shadow:0 0 8px rgba(108,140,255,0.3)}
.mental-last-move{background:rgba(15,17,23,0.75);backdrop-filter:blur(12px);border:1px solid rgba(251,191,36,0.2);border-radius:16px;padding:18px 28px;display:flex;flex-direction:column;gap:6px;align-items:center;box-shadow:0 4px 24px rgba(0,0,0,0.3);min-height:76px;justify-content:center;transition:all 0.3s}
.mlm-label{font-size:10px;color:#fbbf24;font-weight:700;text-transform:uppercase;letter-spacing:2px}
.mlm-value{font-family:'JetBrains Mono','Fira Code',monospace;font-size:38px;font-weight:900;color:#fbbf24;text-shadow:0 0 30px rgba(251,191,36,0.25);transition:color 0.3s}
.mlm-capture{color:#f87171;text-shadow:0 0 30px rgba(248,113,113,0.3)}
.mlm-check{color:#fbbf24;text-shadow:0 0 30px rgba(251,191,36,0.4)}
.mlm-placeholder{color:#64748b;text-shadow:none}
.mental-turn-row{display:flex;align-items:center;gap:10px;padding:10px 18px;background:rgba(15,17,23,0.75);backdrop-filter:blur(12px);border:1px solid rgba(52,211,153,0.2);border-radius:12px;font-weight:600;font-size:14px;color:#a7f3d0}
.mtd{width:12px;height:12px;border-radius:50%;flex-shrink:0}
.mtd.w{background:#f1f5f9;border:1px solid #cbd5e1;box-shadow:0 0 8px rgba(241,245,249,0.3)}
.mtd.b{background:#1e293b;border:1px solid #475569;box-shadow:0 0 8px rgba(108,140,255,0.3)}
.mental-history-box{flex:1;overflow-y:auto;padding:12px 16px;min-height:0}
.mental-empty{color:#64748b;font-style:italic;text-align:center;padding:16px;font-size:12px}
.mh-pairs{display:flex;flex-direction:column;gap:2px}
.mh-pair-row{display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;font-family:'JetBrains Mono','Fira Code',monospace;font-size:12px;transition:background 0.15s}
.mh-pair-row:hover{background:rgba(108,140,255,0.1)}
.mh-num{color:#475569;width:26px;text-align:right;flex-shrink:0;font-size:10px;font-weight:700}
.mh-move{padding:3px 8px;border-radius:4px;cursor:pointer;transition:all 0.15s}
.mh-move:hover{background:rgba(108,140,255,0.1);color:#e2e8f0}
.mh-white{color:#e2e8f0;flex:1}
.mh-black{color:#fbbf24;flex:1;background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.1)}
.mh-active{background:rgba(108,140,255,0.15)!important;border:1px solid rgba(108,140,255,0.4)!important;color:#6c8cff!important}
.mental-replay-bar{text-align:center;font-size:11px;color:#6c8cff;font-weight:600;letter-spacing:0.5px;padding:8px 14px;background:rgba(15,17,23,0.75);border:1px solid rgba(108,140,255,0.18);border-radius:10px;backdrop-filter:blur(12px)}
.mrb-info{display:inline-flex;align-items:center;gap:6px}
.mental-fen-box{background:rgba(15,17,23,0.75);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px 16px;font-family:monospace;font-size:11px;line-height:1.5}
.mfb-lbl{color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:1px;word-break:break-all}
.mfb-fen{color:#64748b;font-size:10px;word-break:break-all}
.mental-coords{background:rgba(15,17,23,0.75);backdrop-filter:blur(12px);border:1px solid rgba(108,140,255,0.15);border-radius:12px;padding:14px 16px;font-family:monospace;font-size:12px;line-height:1.6}
.mc-grid{margin-bottom:8px}
.mc-row{display:flex;flex-wrap:wrap;gap:2px}
.mc-cell{min-width:54px;color:#94a3b8}
.mc-lists{border-top:1px solid rgba(255,255,255,0.06);padding-top:8px}
.mc-sect{margin-bottom:4px;display:flex;gap:8px}
.mc-h{color:#64748b;font-size:11px;letter-spacing:1px;white-space:nowrap}
.mc-v{color:#cbd5e1;word-break:break-all}
.mc-close{margin-top:8px;background:rgba(15,17,23,0.7);border:1px solid rgba(108,140,255,0.25);color:#6c8cff;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:11px;width:100%;transition:all 0.2s;font-family:inherit;font-weight:500;backdrop-filter:blur(8px)}
.mc-close:hover{background:rgba(108,140,255,0.25);border-color:rgba(108,140,255,0.4)}
.mental-err{background:rgba(248,113,113,0.18);backdrop-filter:blur(12px);border:1px solid rgba(248,113,113,0.3);color:#f87171;padding:14px 18px;border-radius:12px;text-align:center;font-weight:600;font-size:14px}
.mental-err.shake,.mental-input-wrap.shake{animation:ms 0.4s}
@keyframes ms{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
.mental-input-wrap{transition:all 0.1s;background:rgba(15,17,23,0.7);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px 20px}
.mi-label{font-size:12px;color:#34d399;margin-bottom:6px;font-weight:700;letter-spacing:0.3px}
.mi-row{display:flex;gap:10px;justify-content:center;max-width:380px;margin:0 auto}
.mi-input{flex:1;max-width:260px;background:rgba(15,17,23,0.8);border:1px solid rgba(108,140,255,0.2);border-radius:12px;padding:14px 18px;color:#f1f5f9;font-family:'Inter','Segoe UI',system-ui,sans-serif;font-size:16px;outline:none;transition:all 0.2s}
.mi-input:focus{border-color:#6c8cff;box-shadow:0 0 20px rgba(108,140,255,0.15);background:rgba(15,17,23,0.9)}
.mi-input::placeholder{color:#64748b}
.mi-input:disabled{opacity:0.3;cursor:default}
.mi-btn{background:linear-gradient(135deg,#6c8cff,#5a7ae6);border:none;color:#fff;padding:14px 22px;border-radius:12px;cursor:pointer;font-size:18px;transition:all 0.2s cubic-bezier(0.4,0,0.2,1);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(108,140,255,0.25)}
.mi-btn:hover:not(:disabled){background:linear-gradient(135deg,#7d9aff,#6c8cff);box-shadow:0 6px 24px rgba(108,140,255,0.35);transform:translateY(-1px)}
.mi-btn:active:not(:disabled){transform:scale(0.95);transition:transform 0.08s}
.mi-btn:disabled{opacity:0.3;cursor:default;transform:none}
.mi-hint{font-size:10px;color:#34d399;margin-top:6px;text-align:center;font-weight:700}
.mental-clock-opponent{text-align:center}
.mental-clock-player{text-align:center}
.mental-zone{border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;align-items:center;transition:all 0.2s}
.mental-zone-opponent{background:rgba(15,17,23,0.65);border:1px solid rgba(248,113,113,0.15)}
.mental-zone-player{background:rgba(15,17,23,0.65);border:1px solid rgba(52,211,153,0.15)}
.mental-replay-nav{display:flex;gap:8px;justify-content:center;align-items:center}
.mrn-btn{background:rgba(15,17,23,0.7);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;transition:all 0.2s cubic-bezier(0.4,0,0.2,1);display:flex;align-items:center;justify-content:center;gap:2px;backdrop-filter:blur(8px)}
.mrn-btn:hover:not(:disabled){background:rgba(108,140,255,0.18);color:#e2e8f0;border-color:rgba(108,140,255,0.25)}
.mrn-btn:active:not(:disabled){transform:scale(0.94);transition:transform 0.08s}
.mrn-btn:disabled{opacity:0.2;cursor:default}
.mrn-btn.active{background:rgba(108,140,255,0.22);border-color:rgba(108,140,255,0.4);color:#6c8cff}
.mrn-center{min-width:90px;font-family:monospace}
.mental-engine-panel{background:rgba(15,17,23,0.80);backdrop-filter:blur(20px);border:1px solid rgba(108,140,255,0.18);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:14px}
.mep-header{display:flex;justify-content:space-between;align-items:center}
.mep-title{font-size:12px;font-weight:700;color:#6c8cff;display:flex;align-items:center;gap:8px;text-transform:uppercase;letter-spacing:1px}
.mep-close{background:rgba(15,17,23,0.7);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#94a3b8;cursor:pointer;padding:6px 12px;transition:all 0.2s;display:flex;align-items:center;gap:6px;font-family:inherit;font-size:11px;font-weight:500;backdrop-filter:blur(8px)}
.mep-close:hover{background:rgba(248,113,113,0.15);border-color:rgba(248,113,113,0.3);color:#f87171}
.mep-row{display:flex;flex-direction:column;gap:8px}
.mep-label{font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
.mep-label-row{display:flex;justify-content:space-between;align-items:center}
.mep-elo{font-size:12px;font-weight:700;color:#6c8cff;font-family:monospace}
.mep-select{background:rgba(15,17,23,0.8);border:1px solid rgba(108,140,255,0.2);border-radius:10px;padding:10px 12px;color:#e2e8f0;font-family:inherit;font-size:13px;outline:none;cursor:pointer;transition:border-color 0.2s}
.mep-select:focus{border-color:#6c8cff}
.mep-select option{background:#1e293b;color:#e2e8f0}
.mep-slider{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:3px;background:rgba(108,140,255,0.2);outline:none;cursor:pointer;transition:background 0.2s}
.mep-slider:hover{background:rgba(108,140,255,0.3)}
.mep-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#6c8cff,#5a7ae6);border:2px solid #e2e8f0;cursor:pointer;box-shadow:0 2px 12px rgba(108,140,255,0.4);transition:all 0.2s}
.mep-slider::-webkit-slider-thumb:hover{transform:scale(1.15);box-shadow:0 4px 20px rgba(108,140,255,0.5)}
.mep-slider::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#6c8cff,#5a7ae6);border:2px solid #e2e8f0;cursor:pointer}
.mep-range-labels{display:flex;justify-content:space-between;font-size:10px;color:#64748b}
.mental-reveal-inline{display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px;border-radius:14px;background:rgba(15,17,23,0.8);border:1px solid rgba(108,140,255,0.2);backdrop-filter:blur(16px)}
.mental-gameover-overlay{position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);animation:go-fade-in 0.3s ease-out}
@keyframes go-fade-in{from{opacity:0}to{opacity:1}}
.mental-gameover-card{background:rgba(15,17,23,0.95);border-radius:24px;padding:48px 56px;text-align:center;min-width:360px;max-width:520px;border:2px solid rgba(255,255,255,0.1);box-shadow:0 0 80px rgba(0,0,0,0.5);animation:go-scale-in 0.4s cubic-bezier(0.34,1.56,0.64,1);display:flex;flex-direction:column;align-items:center;gap:16px}
@keyframes go-scale-in{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}
.mental-gameover-card.checkmate{border-color:rgba(34,197,94,0.5);box-shadow:0 0 80px rgba(34,197,94,0.15)}
.mental-gameover-card.timeout{border-color:rgba(239,68,68,0.5);box-shadow:0 0 80px rgba(239,68,68,0.15)}
.mental-gameover-card.draw{border-color:rgba(251,191,36,0.5);box-shadow:0 0 80px rgba(251,191,36,0.15)}
.go-icon{font-size:56px;line-height:1;animation:go-bounce 0.6s ease-out 0.3s both}
@keyframes go-bounce{0%{transform:scale(0)}50%{transform:scale(1.3)}100%{transform:scale(1)}}
.go-title{font-size:28px;font-weight:900;letter-spacing:1px}
.checkmate .go-title{color:#22c55e}
.timeout .go-title{color:#ef4444}
.draw .go-title{color:#fbbf24}
.go-reason{font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:2px}
.checkmate .go-reason{color:rgba(34,197,94,0.7)}
.timeout .go-reason{color:rgba(239,68,68,0.7)}
.draw .go-reason{color:rgba(251,191,36,0.7)}
.go-buttons{display:flex;gap:12px;margin-top:12px}
.go-btn{padding:14px 28px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.2s;border:none;font-family:inherit;letter-spacing:0.5px}
.go-restart{background:linear-gradient(135deg,#6c8cff,#5a7ae6);color:#fff;box-shadow:0 4px 20px rgba(108,140,255,0.3)}
.go-restart:hover{background:linear-gradient(135deg,#7d9aff,#6c8cff);box-shadow:0 6px 28px rgba(108,140,255,0.4);transform:translateY(-2px)}
.go-restart:active{transform:scale(0.95)}
.go-exit{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#94a3b8}
.go-exit:hover{background:rgba(248,113,113,0.15);border-color:rgba(248,113,113,0.3);color:#f87171}
.go-exit:active{transform:scale(0.95)}
.mental-banner-exit{background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.35);color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;transition:all 0.15s;font-family:inherit}
.mental-banner-exit:hover{background:rgba(255,255,255,0.3);border-color:rgba(255,255,255,0.5)}
@media(max-width:768px){.mental-pgn-panel{display:none}.mental-sidebar{width:56px;padding:12px 6px}.msb-label{display:none}.msb-btn{justify-content:center;padding:10px}}
`}</style>);

  if (step === "setup") {
    return (
      <div className="mental-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", backgroundImage: `url(${mentalBg})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        {mentalStyle}
        <div style={{ position: "absolute", top: 20, right: 20 }}>
          <button className="mental-banner-exit" onClick={onExit} style={{ cursor: "pointer", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8 }}>Salir</button>
        </div>
        <div style={{ background: "rgba(0,0,0,0.8)", padding: 40, borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", width: 400, maxWidth: "90%", display: "flex", flexDirection: "column", gap: 20 }}>
          <h2 style={{ textAlign: "center", color: "#fff", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 20 }}>
            <Brain size={24} /> Modo Mental
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ color: "#aaa", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Tu Color</label>
            <select value={setupColor} onChange={(e) => setSetupColor(e.target.value as "w" | "b")} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: 10, borderRadius: 8, outline: "none" }}>
              <option value="w">Blancas</option>
              <option value="b">Negras</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ color: "#aaa", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Motor Oponente</label>
            <select value={setupEngine} onChange={(e) => setSetupEngine(e.target.value)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: 10, borderRadius: 8, outline: "none" }}>
              {engineOptions?.map((eng) => (
                <option key={eng.id} value={eng.id}>{eng.name}{eng.isOwn ? " (Nuestro)" : ""}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ color: "#aaa", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
              Nivel / Elo {getEloRating ? `(~${getEloRating(setupDepth, setupEngine)})` : ""}
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="range" min="3" max="25" value={setupDepth} onChange={(e) => setSetupDepth(parseInt(e.target.value))} style={{ flex: 1, accentColor: "#14b8a6" }} />
              <span style={{ color: "#fff", minWidth: 20, textAlign: "right", fontWeight: "bold" }}>{setupDepth}</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ color: "#aaa", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
              Formato de coordenadas
            </label>
            <select
              value={localNotationFormat}
              onChange={(e) => setLocalNotationFormat(parseInt(e.target.value))}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: 10, borderRadius: 8, outline: "none" }}
            >
              {NOTATION_FORMATS.map((fmt, i) => (
                <option key={fmt.key} value={i}>{fmt.label}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => {
              if (onStartMentalGame) {
                onStartMentalGame({ engineType: setupEngine, depth: setupDepth, color: setupColor });
              }
              setIsTimerRunning(true);
              setStep("playing");
            }}
            style={{ marginTop: 20, background: "#14b8a6", color: "#000", padding: "14px 20px", borderRadius: 8, fontWeight: "bold", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: 1, transition: "0.2s" }}
            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.02)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            Iniciar Partida
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mental-container" style={{ backgroundImage: `url(${mentalBg})`, backgroundSize: "cover", backgroundPosition: "center" }}>
      {isOver && (
        <div className="mental-gameover-overlay" onClick={handleRestart}>
          <div className={`mental-gameover-card ${isTimeout ? "timeout" : winner ? "checkmate" : "draw"}`} onClick={e => e.stopPropagation()}>
            <div className="go-icon">{isTimeout ? "\u23F0" : winner ? "\uD83C\uDFC6" : "\uD83E\uDD1D"}</div>
            <div className="go-title">
              {winner ? `\u00A1${winner} ganan!` : "\u00A1Tablas!"}
            </div>
            <div className="go-reason">{endReason}</div>
            <div className="go-buttons">
              <button className="go-btn go-restart" onClick={handleRestart}>Reiniciar</button>
              <button className="go-btn go-exit" onClick={onExit}>Salir</button>
            </div>
          </div>
        </div>
      )}

      <div className="mental-sidebar">
        <button className="msb-btn" onClick={handleRestart}>
          <RotateCcw size={16} /><span className="msb-label">Reiniciar</span>
        </button>
        <div className="msb-reveal-wrap" ref={revealWrapRef}>
          <button className={`msb-btn ${revealLevel > 0 ? "active" : ""}`} onClick={() => {
            if (revealLevel > 0) {
              hideReveal();
            } else {
              const rect = revealWrapRef.current?.getBoundingClientRect();
              if (rect) setDropdownPos({ top: rect.bottom + 4, left: rect.left });
              setDropdownOpen(true);
            }
          }}>
            {revealLevel > 0 ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="msb-label">{revealLevel > 0 ? "Ocultar" : "Revelar"}</span>
          </button>
        </div>
        {dropdownOpen && createPortal(
          <div ref={dropdownRef} className="msb-dropdown" style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left }}>
            <button onMouseDown={(e) => { e.preventDefault(); doReveal(1); }}>Solo tablero</button>
            <button onMouseDown={(e) => { e.preventDefault(); doReveal(2); }}>Tablero + Coords</button>
            <button onMouseDown={(e) => { e.preventDefault(); doReveal(3); }}>Todo revelado</button>
          </div>,
          document.body
        )}
        <button className={`msb-btn ${showCoords ? "active" : ""}`} onClick={() => setShowCoords(c => !c)}>
          <Grid3x3 size={16} /><span className="msb-label">Coords</span>
        </button>
        <button className={`msb-btn ${showEnginePanel ? "active" : ""}`} onClick={() => setShowEnginePanel(p => !p)}>
          <Cpu size={16} /><span className="msb-label">Motor</span>
        </button>
        <button className="msb-btn" onClick={cycleFormat}>
          <span className="msb-format">{NOTATION_FORMATS[localNotationFormat].short}</span><span className="msb-label">Formato</span>
        </button>
        <div className="msb-sep" />
        <button className="msb-btn msb-exit" onClick={onExit}>
          <X size={16} /><span className="msb-label">Salir</span>
        </button>
      </div>

      <div className="mental-content">

        <div className="mental-zone mental-zone-opponent">
          <div className="mental-clock-opponent">
            {whitePlayer === "human"
              ? <div className={`mental-clock cb ${!isOver && game.turn() === "b" ? "active-black" : ""}`}><span className="mcd b" />{formatTime(timeBlack)}</div>
              : <div className={`mental-clock cw ${!isOver && game.turn() === "w" ? "active-white" : ""}`}><span className="mcd w" />{formatTime(timeWhite)}</div>
            }
          </div>
          <div className="mental-last-move">
            {lastOpponentMove && !isOver ? (
              <>
                <div className="mlm-label">Último movimiento del oponente ({lastOpponentPlayer})</div>
                <div className={`mlm-value ${lastOpponentMove.includes("x") ? "mlm-capture" : ""} ${lastOpponentMove.includes("+") || lastOpponentMove.includes("#") ? "mlm-check" : ""}`}>
                  {convertNotation(lastOpponentMove, notationFormat)}
                </div>
              </>
            ) : (
              <>
                <div className="mlm-label">Esperando jugada del oponente</div>
                <div className="mlm-value mlm-placeholder">—</div>
              </>
            )}
          </div>
        </div>

        <div className="mental-turn-row">
          <span className={`mtd ${game.turn() === "w" ? "w" : "b"}`} />
          <span>Juegan las {turnName}{isCheck && !isOver && " \u2014 \u00A1JAQUE!"}</span>
        </div>

        {viewingMoveIndex !== null && (
          <div className="mental-replay-bar">
            <span className="mrb-info">{viewingMoveIndex === -1 ? "Posici\u00F3n inicial" : `Reproduciendo: movimiento ${viewingMoveIndex + 1} de ${displayHistory.length}`}</span>
          </div>
        )}

        <div className="mental-fen-box">
          <div className="mfb-lbl">Tablero \u2022 {fenText}</div>
          <div className="mfb-fen">{activeGame.fen().split(" ").slice(0, 4).join(" ")}</div>
        </div>

        {showCoords && (
          <div className="mental-coords">
            <div className="mc-grid">
              {coords.map.map((row, ri) => (
                <div key={ri} className="mc-row">
                  {row.map((cell, ci) => <span key={ci} className="mc-cell">{cell}</span>)}
                </div>
              ))}
            </div>
            <div className="mc-lists">
              <div className="mc-sect"><span className="mc-h">Blancas</span><span className="mc-v">{coords.whiteList.join(" ")}</span></div>
              <div className="mc-sect"><span className="mc-h">Negras</span><span className="mc-v">{coords.blackList.join(" ")}</span></div>
            </div>
            <button className="mc-close" onClick={() => setShowCoords(false)}>Ocultar coordenadas</button>
          </div>
        )}

        {showEnginePanel && (
          <div className="mental-engine-panel" ref={enginePanelRef}>
            <div className="mep-header">
              <span className="mep-title"><Cpu size={14} /> Motor / Oponente</span>
              <button className="mep-close" onClick={() => setShowEnginePanel(false)}>
                <X size={20} /> <span style={{fontSize:11,color:"#b8a890"}}>Cerrar</span>
              </button>
            </div>
            {engineOptions && setBlackEngineType && (
              <div className="mep-row">
                <label className="mep-label">Motor</label>
                <select
                  className="mep-select"
                  value={blackEngineType || "stockfish"}
                  onChange={(e) => setBlackEngineType(e.target.value)}
                >
                  {engineOptions.map((eng) => (
                    <option key={eng.id} value={eng.id}>{eng.name}{eng.isOwn ? " (Nuestro)" : ""}</option>
                  ))}
                </select>
              </div>
            )}
            {setBlackAiDepth && (
              <div className="mep-row">
                <div className="mep-label-row">
                  <label className="mep-label">Profundidad</label>
                  {eloDisplay && <span className="mep-elo">{eloDisplay}</span>}
                </div>
                <input
                  type="range"
                  min="3"
                  max="25"
                  value={blackAiDepth || 18}
                  onChange={(e) => setBlackAiDepth(parseInt(e.target.value))}
                  className="mep-slider"
                />
                <div className="mep-range-labels">
                  <span>3</span>
                  <span>14</span>
                  <span>25</span>
                </div>
              </div>
            )}
          </div>
        )}

        {illegalMsg && (
          <div className={`mental-err ${illegalShake ? "shake" : ""}`}>{illegalMsg}</div>
        )}

        {revealLevel > 0 && (
          <div className="mental-reveal-inline">
            <div className="mi-label" style={{ color: "#6c8cff", textAlign: "center", display: "flex", alignItems: "center", gap: 12 }}>
              <span>{revealLevel === 1 ? "Solo tablero" : revealLevel === 2 ? "Tablero + coordenadas" : "Todo revelado"}</span>
              <button className="mental-banner-exit" onClick={hideReveal}>Ocultar</button>
            </div>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: 420, maxWidth: "100%" }}>
                <div style={{ width: "100%", aspectRatio: "1 / 1" }}>
                  <ChessgroundBoard
                    fen={activeGame.fen()}
                    orientation={whitePlayer === "human" ? "white" : "black"}
                    viewOnly={true}
                    darkSquare="#b58863"
                    lightSquare="#f0d9b5"
                    showNotation={revealLevel >= 2}
                    hidePieces={revealLevel < 3}
                    id="mental-reveal-board"
                  />
                </div>
              </div>
              {revealLevel === 3 && (
              <div className="mental-replay-nav" style={{ flexDirection: "column", paddingTop: 4 }}>
                <button
                  className="mrn-btn mrn-play"
                  onClick={() => {
                    if (isPlaying) { setIsPlaying(false); return; }
                    if (viewingMoveIndex === null || viewingMoveIndex >= displayHistory.length - 1) {
                      setViewingMoveIndex(-1);
                    }
                    setIsPlaying(true);
                  }}
                  disabled={!displayHistory.length}
                  title={isPlaying ? "Pausar" : "Reproducir"}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button className="mrn-btn" onClick={() => { setIsPlaying(false); setViewingMoveIndex(-1); }} disabled={!displayHistory.length || viewingMoveIndex === -1}><ChevronsLeft size={14} /></button>
                <button className="mrn-btn" onClick={() => { setIsPlaying(false); setViewingMoveIndex(i => i !== null && i >= 0 ? i - 1 : -1); }} disabled={!displayHistory.length || viewingMoveIndex === -1}><ChevronLeft size={14} /></button>
                <button className={`mrn-btn mrn-center ${viewingMoveIndex !== null ? "active" : ""}`} onClick={() => { setIsPlaying(false); setViewingMoveIndex(null); }}>
                  {viewingMoveIndex === -1 ? "Inicio" : viewingMoveIndex !== null ? `${viewingMoveIndex + 1}/${displayHistory.length}` : `\u25B6 Vivo`}
                </button>
                <button className="mrn-btn" onClick={() => { setIsPlaying(false); setViewingMoveIndex(i => i !== null && i < displayHistory.length - 1 ? (i < 0 ? 0 : i + 1) : displayHistory.length - 1); }} disabled={!displayHistory.length || viewingMoveIndex === null || viewingMoveIndex >= displayHistory.length - 1}><ChevronRight size={14} /></button>
                <button className="mrn-btn" onClick={() => { setIsPlaying(false); setViewingMoveIndex(displayHistory.length > 0 ? displayHistory.length - 1 : null); }} disabled={!displayHistory.length || viewingMoveIndex === displayHistory.length - 1}><ChevronsRight size={14} /></button>
              </div>
              )}
            </div>
          </div>
        )}

        <div className="mental-zone mental-zone-player">
          <div className="mental-clock-player" style={{ textAlign: "center", marginBottom: 8 }}>
            {whitePlayer === "human"
              ? <div className={`mental-clock cw ${!isOver && game.turn() === "w" ? "active-white" : ""}`}><span className="mcd w" />{formatTime(timeWhite)}</div>
              : <div className={`mental-clock cb ${!isOver && game.turn() === "b" ? "active-black" : ""}`}><span className="mcd b" />{formatTime(timeBlack)}</div>
            }
          </div>
          {revealLevel === 0 && (
          <div className={`mental-input-wrap ${illegalShake ? "shake" : ""}`}>
            <div className="mi-label">
              {viewingMoveIndex !== null
                ? `\u25C6 ${viewingMoveIndex === -1 ? "Posici\u00F3n inicial" : `Viendo movimiento ${viewingMoveIndex + 1} de ${displayHistory.length}`} \u2014 Enter para volver`
                : opponent === "lan"
                  ? (myTurn ? "\u25C6 Tu turno" : "\u25C7 Esperando oponente...")
                  : `\u25C6 ${turnName} \u2014 Ingresa tu movimiento:`
              }
            </div>
            <div className="mi-row">
              <input
                ref={inputRef}
                className="mi-input"
                placeholder="ej. e2e4, Nf3, peón e2 a e4..."
                value={moveInput}
                onChange={(e) => { setMoveInput(e.target.value); setIllegalMsg(""); setIllegalShake(false); }}
                onKeyDown={handleKey}
                disabled={isOver || (opponent === "lan" && !myTurn) || (opponent === "ai" && !isHumanTurn)}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="mi-btn"
                onClick={handleSubmit}
                disabled={isOver || (!moveInput.trim() && viewingMoveIndex === null) || (opponent === "lan" && !myTurn) || (opponent === "ai" && !isHumanTurn)}
              ><CornerDownLeft size={18} /></button>
            </div>
            <div className="mi-hint">Acepta: algebraica (e2e4), SAN (Nf3), verbal (peón e2 a e4), enroque (O-O)</div>
          </div>
          )}
        </div>

      </div>

      <div className="mental-pgn-panel">
        <div className="mpg-header">Historial PGN</div>
        <div className="mental-history-box" ref={historyBoxRef}>
          {displayHistory.length === 0 ? (
            <div className="mental-empty">Sin movimientos a\u00FAn</div>
          ) : (
            <div className="mh-pairs">
              {formatHistory(displayHistory).map((e, i) => {
                const whiteIdx = i * 2;
                const blackIdx = i * 2 + 1;
                const isWhiteViewing = viewingMoveIndex === whiteIdx;
                const isBlackViewing = viewingMoveIndex === blackIdx;
                return (
                  <div key={i} className="mh-pair-row">
                    <span className="mh-num">{e.num}.</span>
                    <span
                      className={`mh-move mh-white ${isWhiteViewing ? "mh-active" : ""}`}
                      onClick={() => setViewingMoveIndex(whiteIdx)}
                    >{convertNotation(e.white, notationFormat)}</span>
                    {e.black && (
                      <span
                        className={`mh-move mh-black ${isBlackViewing ? "mh-active" : ""}`}
                        onClick={() => setViewingMoveIndex(blackIdx)}
                      >{convertNotation(e.black, notationFormat)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {mentalStyle}
    </div>
  );
}
