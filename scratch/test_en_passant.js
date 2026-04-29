import { Chess } from 'chess.js';

const chess = new Chess();
chess.move('e4');
chess.move('a6');
chess.move('e5');
chess.move('d5');
console.log(chess.fen()); // should be rn... pawns on e5 and d5

try {
  const move = chess.move({ from: 'e5', to: 'd6', promotion: 'q' });
  console.log("En passant with promotion: q", move);
} catch (e) {
  console.log("Error:", e.message);
}

const chess2 = new Chess();
chess2.move('e4');
chess2.move('a6');
chess2.move('e5');
chess2.move('d5');

try {
  const move = chess2.move({ from: 'e5', to: 'd6' });
  console.log("En passant without promotion", move);
} catch (e) {
  console.log("Error:", e.message);
}
