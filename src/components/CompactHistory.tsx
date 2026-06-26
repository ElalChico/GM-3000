import React, { useEffect, useRef, useMemo } from "react";
import { cn } from "../lib/utils";

interface CompactHistoryProps {
  history: string[];
  moveEvaluations?: number[];
  language?: "es" | "en";
  viewingMoveIndex?: number | null;
  onMoveClick?: (index: number) => void;
  moveComments?: Record<number, { comment: string; classification: string }>;
}

interface MoveClassification {
  icon: string;
  color: string;
  title: string;
}

/**
 * CompactHistory - Historial compacto y eficiente como en version_vieja
 * Muestra pares de movimientos (blancas/negras) en filas compactas
 * No se expande demasiado - mantiene altura controlada con scroll
 */
export const CompactHistory: React.FC<CompactHistoryProps> = ({
  history,
  moveEvaluations = [],
  language = "es",
  viewingMoveIndex = null,
  onMoveClick,
  moveComments,
}) => {
  const historyEndRef = useRef<HTMLDivElement>(null);

  // Mapear notación algebraica si es español
  const mapNotation = (move: string): string => {
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

  // Clasificar movimiento basado en cambio de evaluación
  const getMoveClassification = (
    evalBefore: number,
    evalAfter: number,
    isWhite: boolean
  ): MoveClassification | null => {
    if (evalBefore === undefined || evalAfter === undefined) return null;

    const diff = isWhite ? evalAfter - evalBefore : evalBefore - evalAfter;

    if (diff > 500) return { icon: "!!", color: "text-cyan-400", title: "Brilliant" };
    if (diff > 200) return { icon: "!", color: "text-blue-400", title: "Great" };
    if (diff > 50) return { icon: "✓", color: "text-green-400", title: "Good" };
    if (diff > -50) return null;
    if (diff > -200) return { icon: "?!", color: "text-yellow-400", title: "Inaccuracy" };
    if (diff > -500) return { icon: "?", color: "text-orange-400", title: "Mistake" };
    return { icon: "??", color: "text-red-500", title: "Blunder" };
  };

  // Crear pares de movimientos: [blancas, negras]
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

  // Auto-scroll al final cuando hay nuevos movimientos
  useEffect(() => {
    if (viewingMoveIndex === null) {
      historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [historyPairs, viewingMoveIndex]);

  return (
    <div className="flex flex-col w-full bg-slate-900/30 rounded-lg border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700/50 shrink-0">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
          {language === "es" ? "Historial de Movimientos" : "Move History"}
        </h3>
      </div>

      {/* Moves Container */}
      <div
        className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 text-[13px] font-mono font-medium tracking-tight"
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}
      >
        {historyPairs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 italic text-xs">
            {language === "es"
              ? "Esperando movimientos..."
              : "Waiting for moves..."}
          </div>
        ) : (
          historyPairs.map(([wMove, bMove], i) => {
            const wIdx = i * 2;
            const bIdx = i * 2 + 1;

            const wEvalBefore = wIdx > 0 ? moveEvaluations[wIdx - 1] : 0;
            const wEvalAfter = moveEvaluations[wIdx];
            const wClass = getMoveClassification(wEvalBefore, wEvalAfter, true);

            const bEvalBefore = moveEvaluations[wIdx];
            const bEvalAfter = moveEvaluations[bIdx];
            const bClass = getMoveClassification(bEvalBefore, bEvalAfter, false);

            // Decide badge display: show analysis icon only when moveComments provides classification;
            // otherwise show a small grid placeholder so the UI stays consistent.
            return (
              <div
                key={i}
                className="flex gap-1 px-1 py-0.5 items-center hover:bg-slate-700/30 rounded transition-colors group"
              >
                {/* Move number */}
                <span className="text-slate-600 w-6 text-right shrink-0 text-[11px] font-bold group-hover:text-slate-500">
                  {i + 1}.
                </span>

                {/* White move */}
                <div
                  onClick={() => onMoveClick?.(wIdx)}
                  className={cn(
                    "flex-1 flex flex-col gap-0 px-1.5 py-0.5 rounded transition-colors cursor-pointer truncate",
                    viewingMoveIndex === wIdx
                      ? "bg-slate-800/80 text-white border border-teal-500/20 shadow-[0_0_8px_rgba(20,184,166,0.18)]"
                      : "text-slate-300 hover:bg-slate-700/50"
                  )}
                  title={`Move ${wIdx + 1}`}
                >
                  <div className="flex gap-1 items-center truncate">
                    <span className="truncate font-bold">{wMove}</span>
                    {
                      (() => {
                        const mc = moveComments && moveComments[wIdx];
                        if (mc && mc.classification) {
                          const map: Record<string, string> = {
                            brilliant: '!!',
                            great: '!',
                            best: '⭐',
                            good: '✓',
                            inaccuracy: '?!',
                            mistake: '?',
                            blunder: '??',
                            book: '📖',
                          };
                          const colorMap: Record<string, string> = {
                            brilliant: 'text-cyan-400',
                            great: 'text-blue-400',
                            best: 'text-emerald-400',
                            good: 'text-green-400',
                            inaccuracy: 'text-yellow-400',
                            mistake: 'text-orange-400',
                            blunder: 'text-red-500',
                            book: 'text-amber-400/80',
                          };
                          const cls = mc.classification as string;
                          return (
                            <span className={cn('text-[9px] shrink-0 font-bold', colorMap[cls] || 'text-slate-400')} title={mc.comment}>
                              {map[cls] || '▦'}
                            </span>
                          );
                        }
                        return (
                          <span className="text-[9px] shrink-0 text-slate-500" title={language === 'es' ? 'No analizado' : 'Not analyzed'}>
                            ▦
                          </span>
                        );
                      })()
                    }
                  </div>
                  {(moveComments?.[wIdx]?.classification === "book" && moveComments?.[wIdx]?.comment) && (
                    <span className="text-[7px] text-amber-400/60 leading-tight truncate font-normal normal-case" title={moveComments[wIdx].comment}>
                      {moveComments[wIdx].comment}
                    </span>
                  )}
                </div>

                {/* Black move or spacer */}
                {bMove ? (
                  <div
                    onClick={() => onMoveClick?.(bIdx)}
                    className={cn(
                      "flex-1 flex flex-col gap-0 px-1.5 py-0.5 rounded transition-colors cursor-pointer truncate",
                      viewingMoveIndex === bIdx
                        ? "bg-slate-800/80 text-white border border-teal-500/20 shadow-[0_0_8px_rgba(20,184,166,0.18)]"
                        : "text-slate-300 hover:bg-slate-700/50"
                    )}
                    title={`Move ${bIdx + 1}`}
                  >
                    <div className="flex gap-1 items-center truncate">
                      <span className="truncate font-bold">{bMove}</span>
                      {
                        (() => {
                          const mc = moveComments && moveComments[bIdx];
                          if (mc && mc.classification) {
                            const map: Record<string, string> = {
                              brilliant: '!!',
                              great: '!',
                              best: '⭐',
                              good: '✓',
                              inaccuracy: '?!',
                              mistake: '?',
                              blunder: '??',
                              book: '📖',
                            };
                            const colorMap: Record<string, string> = {
                              brilliant: 'text-cyan-400',
                              great: 'text-blue-400',
                              best: 'text-emerald-400',
                              good: 'text-green-400',
                              inaccuracy: 'text-yellow-400',
                              mistake: 'text-orange-400',
                              blunder: 'text-red-500',
                              book: 'text-amber-400/80',
                            };
                            const cls = mc.classification as string;
                            return (
                              <span className={cn('text-[9px] shrink-0 font-bold', colorMap[cls] || 'text-slate-400')} title={mc.comment}>
                                {map[cls] || '▦'}
                              </span>
                            );
                          }
                          return (
                            <span className="text-[9px] shrink-0 text-slate-500" title={language === 'es' ? 'No analizado' : 'Not analyzed'}>
                              ▦
                            </span>
                          );
                        })()
                      }
                    </div>
                    {(moveComments?.[bIdx]?.classification === "book" && moveComments?.[bIdx]?.comment) && (
                      <span className="text-[7px] text-amber-400/60 leading-tight truncate font-normal normal-case" title={moveComments[bIdx].comment}>
                        {moveComments[bIdx].comment}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            );
          })
        )}
        <div ref={historyEndRef} className="h-0" />
      </div>

      {/* Stats Footer */}
      <div className="px-3 py-2 bg-slate-800/50 border-t border-slate-700/50 shrink-0 flex justify-between items-center text-[10px] text-slate-400">
        <span>
          {language === "es"
            ? `Total: ${history.length} movimientos`
            : `Total: ${history.length} moves`}
        </span>
        <span className="text-emerald-400 font-semibold">
          {Math.ceil(history.length / 2)} {language === "es" ? "pares" : "pairs"}
        </span>
      </div>
    </div>
  );
};

export default CompactHistory;
