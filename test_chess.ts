import { Chess } from 'chess.js';
const g = new Chess();
g.move('e4');
g.setComment('[%clk 00:09:50]');
g.move('e5');
g.setComment('[%clk 00:09:40]');
console.log(g.pgn());
const g2 = new Chess();
g2.loadPgn(g.pgn());
console.log("Loaded PGN:");
const history = g2.history();
const g3 = new Chess();
history.forEach(m => {
    g3.move(m);
    console.log(m, g3.getComment());
});
