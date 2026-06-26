const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SOURCE = "src/assets/fondos/fondohome/logo-home.png";
const OUTPUT_ICO = "src/assets/Desktop.ico";
const OUTPUT_PNG = "src/assets/icon-256.png";
const OUTPUT_SIDEBAR = "src/assets/installer-sidebar.bmp";
const SIZES = [16, 32, 48, 64, 128, 256];
const SIDEBAR_W = 164;
const SIDEBAR_H = 314;

/**
 * Create a .ico file from an array of PNG buffers.
 * Modern .ico format supports storing PNG data directly.
 */
function createIco(pngBuffers) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);       // reserved
  header.writeUInt16LE(1, 2);       // type: 1 = .ico
  header.writeUInt16LE(pngBuffers.length, 4); // count

  // Calculate offsets
  let offset = 6 + pngBuffers.length * 16;
  const dirEntries = [];
  const imageData = [];

  for (const pngBuf of pngBuffers) {
    const w = pngBuf.readUInt32BE(16); // PNG width from IHDR
    const h = pngBuf.readUInt32BE(20); // PNG height from IHDR
    const entry = Buffer.alloc(16);
    entry.writeUInt8(w === 256 ? 0 : w, 0);   // width (0 = 256)
    entry.writeUInt8(h === 256 ? 0 : h, 1);   // height (0 = 256)
    entry.writeUInt8(0, 2);  // colors
    entry.writeUInt8(0, 3);  // reserved
    entry.writeUInt16LE(1, 4);  // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(pngBuf.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    dirEntries.push(entry);
    imageData.push(pngBuf);
    offset += pngBuf.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageData]);
}

async function main() {
  console.log(`[icons] Reading source: ${SOURCE}`);
  const srcBuffer = fs.readFileSync(path.resolve(SOURCE));

  const pngBuffers = [];
  for (const size of SIZES) {
    const resized = await sharp(srcBuffer)
      .resize(size, size, { fit: "cover", position: "center" })
      .png()
      .toBuffer();
    pngBuffers.push(resized);
    console.log(`[icons] Generated ${size}x${size}`);
  }

  // Save 256x256 standalone PNG for electron-builder
  const icon256 = pngBuffers[pngBuffers.length - 1];
  fs.writeFileSync(path.resolve(OUTPUT_PNG), icon256);
  console.log(`[icons] Saved ${OUTPUT_PNG}`);

  // Create multi-resolution .ico
  const icoBuffer = createIco(pngBuffers);
  fs.writeFileSync(path.resolve(OUTPUT_ICO), icoBuffer);
  console.log(`[icons] Saved ${OUTPUT_ICO} (${icoBuffer.length} bytes, ${SIZES.length} resolutions)`);

  // Create sidebar BMP for NSIS installer (164x314)
  const sidebar = await sharp({
    create: {
      width: SIDEBAR_W,
      height: SIDEBAR_H,
      channels: 3,
      background: { r: 18, g: 18, b: 18 },
    },
  })
    .composite([
      {
        input: await sharp(srcBuffer)
          .resize(120, 120, { fit: "inside" })
          .flatten({ background: "#121212" })
          .toBuffer(),
        top: 30,
        left: 22,
      },
    ])
    .raw()
    .toBuffer();

  // Write BMP manually (no alpha, 24-bit, bottom-up, BGR)
  const bmpHeader = Buffer.alloc(54);
  const rowSize = (SIDEBAR_W * 3 + 3) & ~3;
  const pixelSize = rowSize * SIDEBAR_H;
  bmpHeader.write("BM", 0, 2);
  bmpHeader.writeUInt32LE(54 + pixelSize, 2);
  bmpHeader.writeUInt32LE(54, 10);
  bmpHeader.writeUInt32LE(40, 14);
  bmpHeader.writeInt32LE(SIDEBAR_W, 18);
  bmpHeader.writeInt32LE(SIDEBAR_H, 22);
  bmpHeader.writeUInt16LE(1, 26);
  bmpHeader.writeUInt16LE(24, 28);
  bmpHeader.writeUInt32LE(0, 30);

  const bmpPixels = Buffer.alloc(pixelSize, 0);
  for (let y = 0; y < SIDEBAR_H; y++) {
    const srcY = SIDEBAR_H - 1 - y;
    for (let x = 0; x < SIDEBAR_W; x++) {
      const srcIdx = (srcY * SIDEBAR_W + x) * 3;
      const dstIdx = y * rowSize + x * 3;
      bmpPixels[dstIdx] = sidebar[srcIdx + 2];
      bmpPixels[dstIdx + 1] = sidebar[srcIdx + 1];
      bmpPixels[dstIdx + 2] = sidebar[srcIdx];
    }
  }

  fs.writeFileSync(path.resolve(OUTPUT_SIDEBAR), Buffer.concat([bmpHeader, bmpPixels]));
  console.log(`[icons] Saved ${OUTPUT_SIDEBAR}`);
}

main().catch(console.error);
