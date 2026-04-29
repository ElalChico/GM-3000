import { Chess } from 'chess.js';

const g1 = new Chess();
g1.move("e4");

const g2 = new Chess();
g2.loadPgn(g1.pgn());

console.log("g1 fen:", g1.fen());
console.log("g2 fen:", g2.fen());
console.log("Match:", g1.fen() === g2.fen());
