#!/usr/bin/env node
/**
 * GM-3000 TTS Diagnostic Script
 * Tests edge-tts via Python subprocess and npm package.
 *
 * Usage:
 *   node src/diagnose-tts.js           # Test Python subprocess only
 *   node src/diagnose-tts.js --npm     # Test npm @andresaya/edge-tts only
 *   node src/diagnose-tts.js --all     # Test both
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const execFileAsync = promisify(execFile);

const TEST_TEXT = 'Hola, soy el Gran Maestre de ajedrez. Esta es una prueba de voz.';
const VOICE = 'es-MX-DaliaNeural';

async function testPythonWorker() {
  console.log('\n=== Test 1: Python tts_worker.py subprocess ===');
  const workerPath = path.join(__dirname, 'tts_worker.py');
  const payload = JSON.stringify({
    text: TEST_TEXT,
    voice: VOICE,
    rate: '+0%',
    volume: '+0%',
    pitch: '+0Hz',
  });

  console.log(`Worker: ${workerPath}`);
  console.log(`Python: python`);
  console.log(`Text: "${TEST_TEXT.substring(0, 40)}..."`);

  const start = Date.now();
  try {
    const { stdout, stderr } = await execFileAsync('python', [workerPath, payload], {
      timeout: 30000,
    });
    const elapsed = Date.now() - start;
    const outputPath = stdout.trim();

    if (stderr) console.warn('STDERR:', stderr.trim());

    if (!outputPath) {
      console.error('FAIL: No output path returned');
      return false;
    }

    if (!fs.existsSync(outputPath)) {
      console.error('FAIL: Output file does not exist:', outputPath);
      return false;
    }

    const stats = fs.statSync(outputPath);
    console.log(`SUCCESS: ${stats.size} bytes generated in ${elapsed}ms`);
    console.log(`File: ${outputPath}`);

    // Cleanup
    try { fs.unlinkSync(outputPath); } catch {}
    return true;
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error(`FAIL (${elapsed}ms):`, err.message);
    if (err.stderr) console.error('STDERR:', err.stderr.trim());
    return false;
  }
}

async function testNpmEdgeTTS() {
  console.log('\n=== Test 2: npm @andresaya/edge-tts ===');
  try {
    const { EdgeTTS } = require('@andresaya/edge-tts');
    const tts = new EdgeTTS();

    console.log(`Voice: ${VOICE}`);
    console.log(`Text: "${TEST_TEXT.substring(0, 40)}..."`);

    const start = Date.now();
    await tts.synthesize(TEST_TEXT, VOICE, {
      rate: '+0%',
      volume: '+0%',
      pitch: '+0Hz',
    });
    const buffer = tts.toBuffer();
    const elapsed = Date.now() - start;

    if (!buffer || buffer.length === 0) {
      console.error('FAIL: Empty buffer returned');
      return false;
    }

    console.log(`SUCCESS: ${buffer.length} bytes generated in ${elapsed}ms`);
    return true;
  } catch (err) {
    console.error(`FAIL:`, err.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const testNpm = args.includes('--npm') || args.includes('--all');
  const testPy = !args.includes('--npm') || args.includes('--all');

  console.log('GM-3000 TTS Diagnostic');
  console.log('======================');

  const results = {};

  if (testPy) {
    results.python = await testPythonWorker();
  }

  if (testNpm) {
    results.npm = await testNpmEdgeTTS();
  }

  console.log('\n=== Summary ===');
  for (const [key, val] of Object.entries(results)) {
    console.log(`  ${key}: ${val ? 'PASS' : 'FAIL'}`);
  }

  const allPass = Object.values(results).every(v => v);
  process.exit(allPass ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
