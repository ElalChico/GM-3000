import React, { useState, useEffect } from "react";
import {
  Zap,
  TrendingUp,
  Book,
  ChevronDown,
  ChevronUp,
  Loader,
  AlertCircle,
  User,
  Cpu,
} from "lucide-react";
import { cn } from "../lib/utils";
import {
  detectOpeningFromLichess,
  generatePedagogicalComment,
  translateOpeningName,
  OpeningInfo,
} from "../utils/lichessOpeningExplorer";

interface OpeningAnalyzerProps {
  history: string[];
  boardOrientation: "white" | "black";
  language: "es" | "en";
  whitePlayer: string;
  blackPlayer: string;
  effectivePlayerName?: string;
}

export const OpeningAnalyzer: React.FC<OpeningAnalyzerProps> = ({
  history,
  boardOrientation,
  language,
  whitePlayer,
  blackPlayer,
  effectivePlayerName,
}) => {
  const [openingInfo, setOpeningInfo] = useState<OpeningInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMove, setExpandedMove] = useState<number | null>(null);
  const [pedagogicalComments, setPedagogicalComments] = useState<
    Record<number, string>
  >({});

  // Detectar quien es el jugador humano
  const humanPlayerColor = whitePlayer === "human" ? "white" : "black";
  const isHumanWhite = humanPlayerColor === "white";

  const isPlayerMove = (moveIndex: number): boolean => {
    const isWhiteMove = moveIndex % 2 === 0;
    if (whitePlayer === "human" && isWhiteMove) return true;
    if (blackPlayer === "human" && !isWhiteMove) return true;
    return false;
  };

  const getPlayerLabel = (moveIndex: number): { label: string; isHuman: boolean } => {
    const isWhiteMove = moveIndex % 2 === 0;
    const isHuman = isPlayerMove(moveIndex);
    return {
      label: isWhiteMove ? "♙" : "♟",
      isHuman,
    };
  };

  // Detectar apertura cuando cambia el historial
  useEffect(() => {
    if (history.length === 0) {
      setOpeningInfo(null);
      return;
    }

    const detectOpening = async () => {
      setLoading(true);
      setError(null);
      try {
        // Limitar a máximo 20 movimientos para la detección
        const movesToAnalyze = history.slice(0, Math.min(20, history.length));
        const info = await detectOpeningFromLichess(movesToAnalyze);
        setOpeningInfo(info);

        // Generar comentarios pedagógicos
        const comments: Record<number, string> = {};
        const isOpeningPhase = history.length <= 20;
        for (let i = 0; i < movesToAnalyze.length; i++) {
          comments[i] = generatePedagogicalComment(i, isOpeningPhase);
        }
        setPedagogicalComments(comments);
      } catch (err) {
        console.error("[OpeningAnalyzer] Error:", err);
        setError(language === "es" ? "Error al detectar apertura" : "Error detecting opening");
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(detectOpening, 500);
    return () => clearTimeout(timer);
  }, [history, language]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-2 border-teal-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-2 border-teal-500 rounded-full border-r-transparent animate-spin"></div>
          </div>
          <p className="text-teal-400 text-xs uppercase font-black tracking-widest">
            {language === "es" ? "Analizando aperturas..." : "Analyzing openings..."}
          </p>
        </div>
      </div>
    );
  }

  if (error || !openingInfo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden gap-3">
        <AlertCircle className="w-10 h-10 text-amber-500/40" />
        <p className="text-center text-slate-400 text-xs uppercase font-black tracking-widest">
          {error || (language === "es" ? "Sin datos de apertura" : "No opening data")}
        </p>
        <p className="text-center text-slate-500 text-[10px] max-w-xs">
          {language === "es"
            ? "Juega algunos movimientos para que aparezca el análisis de aperturas"
            : "Play some moves for opening analysis to appear"}
        </p>
      </div>
    );
  }

  const translatedName = translateOpeningName(openingInfo.name);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#050305]">
      {/* Header de Apertura */}
      <div className="shrink-0 px-4 py-3 border-b border-teal-900/30 bg-black/40">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Book className="w-4 h-4 text-amber-500" />
              <span className="text-teal-400/70 text-[10px] uppercase font-black tracking-widest">
                {language === "es" ? "Análisis de Apertura" : "Opening Analysis"}
              </span>
            </div>
            <h3 className="text-white font-black text-sm mb-1 leading-tight">
              {translatedName}
            </h3>
            <p className="text-teal-300/60 text-[9px] font-bold flex items-center gap-2">
              ECO: {openingInfo.eco}
              {openingInfo.stats.total === 0 && (
                <span className="inline-block px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400/80 text-[7px] font-black uppercase tracking-wider">
                  {language === "es" ? "Local" : "Local"}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Estadísticas de la Apertura */}
      <div className="shrink-0 px-4 py-3 bg-gradient-to-b from-teal-950/20 to-transparent border-b border-teal-900/20">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-800/50 text-center">
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">
              {language === "es" ? "Blancas" : "White"}
            </div>
            <div className="text-white font-black text-lg leading-none">
              {openingInfo.stats.whiteWinRate}
            </div>
            <div className="text-[8px] text-slate-500 mt-0.5">
              ({openingInfo.stats.whites} {language === "es" ? "partidas" : "games"})
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-800/50 text-center">
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">
              {language === "es" ? "Empates" : "Draws"}
            </div>
            <div className="text-amber-400 font-black text-lg leading-none">
              {openingInfo.stats.drawRate}
            </div>
            <div className="text-[8px] text-slate-500 mt-0.5">
              ({openingInfo.stats.draws} {language === "es" ? "partidas" : "games"})
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-800/50 text-center">
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">
              {language === "es" ? "Negras" : "Black"}
            </div>
            <div className="text-blue-400 font-black text-lg leading-none">
              {openingInfo.stats.blackWinRate}
            </div>
            <div className="text-[8px] text-slate-500 mt-0.5">
              ({openingInfo.stats.blacks} {language === "es" ? "partidas" : "games"})
            </div>
          </div>
        </div>
        <div className="mt-2 text-center text-[9px] text-slate-500">
          {openingInfo.stats.total > 0
            ? (language === "es"
              ? `Total: ${openingInfo.stats.total.toLocaleString()} partidas de maestros (FIDE 2200+)`
              : `Total: ${openingInfo.stats.total.toLocaleString()} master games (FIDE 2200+)`)
            : (language === "es"
              ? "Sin datos de partidas de maestros — mostrando nombre local"
              : "No master game data — showing local name")}
        </div>
      </div>

      {/* Lista de Movimientos con Comentarios */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-2 pb-4">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <Book className="w-8 h-8 opacity-30 mb-2" />
            <p className="text-[10px] uppercase font-black tracking-widest">
              {language === "es" ? "Sin movimientos" : "No moves"}
            </p>
          </div>
        ) : (
          history.map((move, idx) => {
            const isWhiteMove = idx % 2 === 0;
            const moveNumber = Math.floor(idx / 2) + 1;
            const playerInfo = getPlayerLabel(idx);
            const isPlayerMove = playerInfo.isHuman;
            const comment = pedagogicalComments[idx];
            const isExpanded = expandedMove === idx;

            return (
              <div key={idx} className="space-y-1">
                <button
                  onClick={() => setExpandedMove(isExpanded ? null : idx)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left relative overflow-hidden",
                    isExpanded
                      ? "bg-teal-950/50 border-teal-500/40 shadow-[0_0_12px_rgba(20,184,166,0.2)]"
                      : isPlayerMove
                        ? "bg-gradient-to-r from-emerald-950/40 to-emerald-950/20 border-emerald-700/30 hover:border-emerald-600/40 hover:bg-emerald-950/30"
                        : "bg-slate-900/30 border-slate-800/30 hover:border-slate-700/30 hover:bg-slate-900/40"
                  )}
                >
                  {/* Borde izquierdo de color */}
                  <div
                    className={cn(
                      "absolute left-0 top-0 bottom-0 w-1",
                      isPlayerMove ? "bg-emerald-500/60" : "bg-slate-500/40"
                    )}
                  />

                  <div className="flex-shrink-0 relative">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-teal-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    <div className="text-[9px] text-teal-600/60 font-bold">
                      {moveNumber}.{isWhiteMove ? "" : ".."}
                    </div>
                  </div>

                  {/* Movimiento */}
                  <div className="flex-shrink-0">
                    <div className="text-white font-black text-base">
                      {move}
                    </div>
                  </div>

                  {/* Indicador de quién jugó */}
                  <div className="flex-shrink-0 ml-auto flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {isPlayerMove ? (
                        <>
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[8px] font-bold text-emerald-300 uppercase tracking-widest">
                            {language === "es" ? "Tu" : "You"}
                          </span>
                        </>
                      ) : (
                        <>
                          <Cpu className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                            {language === "es" ? "Oponente" : "Opp"}
                          </span>
                        </>
                      )}
                    </div>
                    <span className={cn(
                      "text-xs font-bold px-1.5 py-0.5 rounded",
                      isWhiteMove
                        ? "bg-slate-700/60 text-slate-300"
                        : "bg-slate-800/60 text-slate-400"
                    )}>
                      {playerInfo.label}
                    </span>
                  </div>
                </button>

                {isExpanded && comment && (
                  <div className={cn(
                    "ml-2 pl-4 border-l-2 py-2.5 rounded-r-lg",
                    isPlayerMove
                      ? "border-emerald-500/40 bg-emerald-950/20"
                      : "border-slate-500/40 bg-slate-950/20"
                  )}>
                    <div className="text-[10px] leading-relaxed">
                      {isPlayerMove ? (
                        <div className="text-emerald-200/90">
                          💡 <span className="font-semibold">{comment}</span>
                        </div>
                      ) : (
                        <div className="text-slate-300/80">
                          📖 <span className="font-semibold">{comment}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Próximos Movimientos Populares */}
      {openingInfo.nextMoves && openingInfo.nextMoves.length > 0 && (
        <div className="shrink-0 border-t border-teal-900/30 bg-black/40 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-500/60" />
            <span className="text-teal-400/70 text-[10px] uppercase font-black tracking-widest">
              {language === "es" ? "Movimientos Populares" : "Popular Moves"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {openingInfo.nextMoves.slice(0, 4).map((move, idx) => (
              <div
                key={idx}
                className="bg-slate-900/50 rounded-lg p-2 border border-slate-800/50 text-center hover:border-teal-500/30 transition-all cursor-pointer hover:bg-slate-900/70"
              >
                <div className="text-white font-bold text-sm mb-1">{move.san}</div>
                <div className="flex justify-around text-[8px] text-slate-400">
                  <span className="text-emerald-400/70">W: {move.whiteWinRate}</span>
                  <span className="text-amber-400/70">D: {move.drawRate}</span>
                  <span className="text-blue-400/70">B: {move.blackWinRate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
