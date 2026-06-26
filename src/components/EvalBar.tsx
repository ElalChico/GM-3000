import React from 'react';
import { cn } from '@/src/lib/utils';

interface EvalBarProps {
  score: number; // centipawns, white is positive
  mate?: number; // mate in N, white is positive
  turnColor: 'w' | 'b';
  player1Color: 'w' | 'b'; // perspective: which color is at the bottom?
}

export const EvalBar: React.FC<EvalBarProps> = ({ score, mate, player1Color }) => {
  const bottomIsWhite = player1Color === 'w';

  const sideScore = (isWhiteSide: boolean) => {
    return isWhiteSide ? score : -score;
  };

  const sideMate = (isWhiteSide: boolean) => {
    if (mate === undefined || mate === null) return null;
    return isWhiteSide ? mate : -mate;
  };

  const formatLabel = (value: number, mateValue: number | null) => {
    if (mateValue !== null) {
      const sign = value > 0 ? '+' : value < 0 ? '-' : '';
      return `${sign}M${Math.abs(mateValue)}`;
    }
    const labelValue = Math.abs(value) / 100;
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${labelValue.toFixed(1)}`;
  };

  const topIsWhite = !bottomIsWhite;
  const topScore = sideScore(topIsWhite);
  const bottomScore = sideScore(bottomIsWhite);
  const topMate = sideMate(topIsWhite);
  const bottomMate = sideMate(bottomIsWhite);

  const topLabel = formatLabel(topScore, topMate);
  const bottomLabel = formatLabel(bottomScore, bottomMate);

  const percentWhite = Math.max(0, Math.min(100, 50 + (2 / Math.PI) * Math.atan(score / 250) * 50));
  const whiteHeight = `${percentWhite}%`;

  return (
    <div className="flex flex-col items-center gap-1 h-full w-full px-1">
      <span className="text-[9px] font-bold font-mono h-3 text-slate-200">
        {topLabel}
      </span>
      <div className="w-4 flex-1 bg-[#1a202c] rounded-full relative overflow-hidden shadow-inner border border-slate-700">
        <div
          className="absolute w-full transition-all duration-300 ease-out"
          style={{
            height: whiteHeight,
            background: bottomIsWhite
              ? 'linear-gradient(to top, #f8fafc, #cbd5e1)'
              : 'linear-gradient(to bottom, #f8fafc, #cbd5e1)',
            ...(bottomIsWhite ? { bottom: 0 } : { top: 0 }),
          }}
        />
      </div>
      <span className="text-[9px] font-bold font-mono h-3 text-slate-200">
        {bottomLabel}
      </span>
    </div>
  );
};
