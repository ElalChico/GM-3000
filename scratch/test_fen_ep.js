import { Chess } from 'chess.js';

const g = new Chess();
g.move('e4');
g.move('a6');
g.move('e5');
g.move('d5');

console.log("FEN after d5:", g.fen());

// Simulate what App.tsx does:
const g2 = new Chess(g.fen());
const move = g2.move({from: 'e5', to: 'd6', promotion: 'q'});
console.log("Move successful?", !!move);
console.log("FEN after en passant:", g2.fen());

