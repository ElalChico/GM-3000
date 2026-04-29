import { Chess } from 'chess.js';

const fen = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 1";
const g = new Chess(fen);
console.log("PGN for custom FEN:", g.pgn());
