const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('BROWSER ERROR:', msg.text());
      } else {
        console.log('BROWSER LOG:', msg.text());
      }
    });

    await page.goto('http://localhost:3001');

    // Wait for the board to render
    await page.waitForSelector('[data-square="e2"]');

    console.log("Ready. Evaluating moves...");
    const success = await page.evaluate(async () => {
        // Find the executeMove function on window if possible, or we just click squares.
        // But clicking squares is harder because they are div elements.
        // Let's click the squares!
        const clickSquare = async (sq) => {
            const el = document.querySelector(`[data-square="${sq}"]`);
            if (el) {
                el.click();
                await new Promise(r => setTimeout(r, 100)); // wait for logic
            } else {
                console.error("Square not found:", sq);
            }
        };

        // e4
        await clickSquare("e2");
        await clickSquare("e4");
        await new Promise(r => setTimeout(r, 500));

        // e5
        await clickSquare("e7");
        await clickSquare("e5");
        await new Promise(r => setTimeout(r, 500));

        // d4
        await clickSquare("d2");
        await clickSquare("d4");
        await new Promise(r => setTimeout(r, 500));

        // exd4
        await clickSquare("e5");
        await clickSquare("d4");
        await new Promise(r => setTimeout(r, 500));

        // e5
        await clickSquare("e4");
        await clickSquare("e5");
        await new Promise(r => setTimeout(r, 500));

        // d5
        await clickSquare("d7");
        await clickSquare("d5");
        await new Promise(r => setTimeout(r, 500));

        // exd6 (en passant)
        console.log("Attempting en passant...");
        await clickSquare("e5");
        await clickSquare("d6");
        await new Promise(r => setTimeout(r, 1000));

        // Check if the pawn on d5 is gone
        const d5Pawn = document.querySelector(`[data-square="d5"] [data-piece]`);
        const e5Pawn = document.querySelector(`[data-square="e5"] [data-piece]`);
        const d6Pawn = document.querySelector(`[data-square="d6"] [data-piece]`);
        
        console.log("d5 piece:", d5Pawn ? d5Pawn.getAttribute('data-piece') : 'empty');
        console.log("e5 piece:", e5Pawn ? e5Pawn.getAttribute('data-piece') : 'empty');
        console.log("d6 piece:", d6Pawn ? d6Pawn.getAttribute('data-piece') : 'empty');

        return !d5Pawn && d6Pawn;
    });

    console.log("En passant success:", success);

    await browser.close();
  } catch (e) {
    console.error("Test failed:", e);
  }
})();
