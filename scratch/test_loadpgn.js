import { Chess } from 'chess.js';

const fen = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 1";
const g1 = new Chess(fen);
const pgn = g1.pgn();

const g2 = new Chess();
g2.loadPgn(pgn);

console.log("g1 fen:", g1.fen());
console.log("g2 fen:", g2.fen());
console.log("Match:", g1.fen() === g2.fen());

const g3 = new Chess();
// What if headers are modified?
g3.load(fen);
g3.header("White", "Player 1");
const pgn3 = g3.pgn();
const g4 = new Chess();
g4.loadPgn(pgn3);
console.log("g3 fen:", g3.fen());
console.log("g4 fen:", g4.fen());
console.log("Match 3-4:", g3.fen() === g4.fen());

