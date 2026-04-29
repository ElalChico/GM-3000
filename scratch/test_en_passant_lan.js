import { Chess } from 'chess.js';

const chess = new Chess();
chess.move('e4');
chess.move('a6');
chess.move('e5');
chess.move('d5');
console.log(chess.fen()); // should be rn... pawns on e5 and d5

try {
  const move = chess.move('e5d6'); // Try LAN string
  console.log("En passant with LAN string:", move);
} catch (e) {
  console.log("Error:", e.message);
}
