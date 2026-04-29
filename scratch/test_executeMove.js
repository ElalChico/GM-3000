import { Chess } from 'chess.js';

let game = new Chess();
let history = [];

function executeMove(moveStr) {
  try {
    const g = new Chess(game.fen());
    const moveObj =
      typeof moveStr === "string"
        ? {
          from: moveStr.substring(0, 2),
          to: moveStr.substring(2, 4),
          promotion: moveStr.length > 4 ? moveStr[4] : undefined,
        }
        : moveStr;

    const move = g.move(moveObj);
    if (move) {
      history.push(move.san);
      game = g;
      return true;
    } else {
      console.error("g.move returned null for", moveObj, "FEN:", g.fen());
      return false;
    }
  } catch (e) {
    console.error("Exception:", e.message);
    return false;
  }
}

executeMove("e2e4");
executeMove("a7a6");
executeMove("e4e5");
executeMove("d7d5");

console.log("Before EP:", game.fen());
const res = executeMove("e5d6");
console.log("EP Success?", res);
console.log("After EP:", game.fen());
console.log("History:", history);
