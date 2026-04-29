import { Chess } from "chess.js";

function randInt(max: number) {
  return Math.floor(Math.random() * max);
}

export function generateTrainingFen(whitePieces: Record<string, number>, blackPieces: Record<string, number>): string {
  const chess = new Chess();
  chess.clear();

  const squares = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      squares.push(String.fromCharCode(97 + c) + String(8 - r));
    }
  }

  for (let i = squares.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [squares[i], squares[j]] = [squares[j], squares[i]];
  }
  
  let valid = false;
  let attempts = 0;
  
  while (!valid && attempts < 100) {
    chess.clear();
    let sqIdx = 0;
    
    const placePieces = (color: 'w'|'b', pieces: Record<string, number>) => {
      const pTypes = ['k', 'q', 'r', 'b', 'n', 'p'];
      for (const p of pTypes) {
        let count = pieces[p] || 0;
        if (p === 'k') count = 1; // force 1 king
        for (let i = 0; i < count; i++) {
          if (sqIdx >= squares.length) return false;
          let s = squares[sqIdx++];
          if (p === 'p' && (s[1] === '1' || s[1] === '8')) {
            let found = false;
            for(let j=sqIdx; j<squares.length; j++) {
               if (squares[j][1] !== '1' && squares[j][1] !== '8') {
                 s = squares[j];
                 [squares[sqIdx-1], squares[j]] = [squares[j], squares[sqIdx-1]];
                 found = true;
                 break;
               }
            }
            if(!found) return false;
          }
          chess.put({ type: p as any, color }, s as any);
        }
      }
      return true;
    }
    
    placePieces('w', whitePieces);
    placePieces('b', blackPieces);
    valid = true;
    attempts++;
  }

  // Force a default just in case
  if (!chess.fen()) {
     return "8/8/8/8/8/8/8/8 w - - 0 1";
  }
  return chess.fen();
}

export function generateChess960Fen(): string {
   const pieces = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
   for (let i = pieces.length - 1; i > 0; i--) {
     const j = randInt(i + 1);
     [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
   }
   const rank1 = pieces.join('').toUpperCase();
   const rank8 = pieces.join('').toLowerCase();
   return `${rank8}/pppppppp/8/8/8/8/PPPPPPPP/${rank1} w KQkq - 0 1`;
}

