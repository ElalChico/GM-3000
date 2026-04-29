import { Chess } from 'chess.js';

const g = new Chess();
g.move('e4');
g.move('a6');
g.move('e5');
g.move('d5');

try {
  const moveObj = { from: 'e5', to: 'd6', promotion: undefined };
  console.log("Keys in moveObj:", Object.keys(moveObj));
  const move = g.move(moveObj);
  console.log("Move successful:", !!move);
} catch (e) {
  console.error("Error:", e.message);
}
