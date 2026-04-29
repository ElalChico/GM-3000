import React from 'react';
import { cn } from '@/src/lib/utils';

interface EvalBarProps {
  score: number; // centipawns, white is positive
  mate?: number; // mate in N, white is positive
  turnColor: 'w' | 'b';
  player1Color: 'w' | 'b'; // perspective: which color is at the bottom?
}

export const EvalBar: React.FC<EvalBarProps> = ({ score, mate, player1Color }) => {
  let percentWhite = 50;
  
  let mainLabel = (Math.abs(score) / 100).toFixed(1);
  if (score > 0) mainLabel = '+' + mainLabel;
  else if (score < 0) mainLabel = '-' + mainLabel;
  
  if (mate !== undefined && mate !== null) {
    if (mate > 0) {
      percentWhite = 100;
      mainLabel = `M${mate}`;
    } else {
      percentWhite = 0;
      mainLabel = `M${Math.abs(mate)}`;
    }
  } else {
    const pawns = score / 100;
    percentWhite = 50 + (2 / Math.PI) * Math.atan(pawns / 2.5) * 50; 
  }

  percentWhite = Math.max(0, Math.min(100, percentWhite));

  const isFlip = player1Color === 'b';
  
  const whiteHeight = `${percentWhite}%`;
  
  // Decide where to put the label (top or bottom)
  const isWhiteWinning = (mate !== undefined && mate > 0) || score > 0;
  const isBlackWinning = (mate !== undefined && mate < 0) || score < 0;

  let topLabel = '';
  let bottomLabel = '';
  
  if (isFlip) {
    // Black at bottom
    if (isWhiteWinning) topLabel = mainLabel;
    else if (isBlackWinning) bottomLabel = mainLabel;
    else topLabel = '0.0';
  } else {
    // White at bottom
    if (isBlackWinning) topLabel = mainLabel;
    else if (isWhiteWinning) bottomLabel = mainLabel;
    else bottomLabel = '0.0';
  }
  
  return (
    <div className="flex flex-col items-center gap-2 h-full">
      <span className={cn("text-[10px] font-bold font-mono h-3", topLabel ? "text-white" : "text-transparent")}>
        {topLabel || '0.0'}
      </span>
      <div className="w-[12px] flex-1 bg-[#1a202c] rounded-md relative overflow-hidden shadow-inner">
        <div 
          className="absolute w-full transition-all duration-300 ease-out"
          style={{ 
            height: whiteHeight,
            background: 'linear-gradient(to top, #fff, #cbd5e1)',
            bottom: isFlip ? 'auto' : 0,
            top: isFlip ? 0 : 'auto',
          }}
        />
      </div>
      <span className={cn("text-[10px] font-bold font-mono h-3", bottomLabel ? "text-white" : "text-transparent")}>
        {bottomLabel || '0.0'}
      </span>
    </div>
  );
};
