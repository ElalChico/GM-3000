const { execSync, execFile, exec } = require('child_process');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const electron = require('electron');

const PROJECT_ROOT = path.resolve(__dirname, '..');
let DEV_SERVER_URL = 'http://localhost:3000'; // will be auto‑adjusted if port occupied
const MAX_RETRIES = 60;
const RETRY_INTERVAL = 1000;

function waitForDevServer() {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const checkPorts = () => {
      // Try ports 3000-3010 sequentially
      const tryPort = (port) => {
        if (port > 3010) {
          // all ports tried this round
          retries++;
          if (retries >= MAX_RETRIES) {
            reject(new Error('Vite dev server not ready after ' + MAX_RETRIES + 's'));
          } else {
            process.stdout.write('.');
            setTimeout(checkPorts, RETRY_INTERVAL);
          }
          return;
        }
        const url = `http://localhost:${port}`;
        http.get(url, (res) => {
          res.resume();
          DEV_SERVER_URL = url;
          resolve();
        }).on('error', () => {
          tryPort(port + 1);
        });
      };
      tryPort(3000);
    };
    checkPorts();
  });
}

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      execSync('netstat -aon | findstr :' + port, { stdio: 'ignore' });
    }
  } catch {}
}

function killOrphanElectron() {
  try {
    if (process.platform === 'win32') {
      execSync('taskkill /F /IM electron.exe 2>nul', { stdio: 'ignore' });
    } else {
      execSync('pkill -f electron 2>/dev/null', { stdio: 'ignore' });
    }
  } catch {}
}

async function main() {
  killOrphanElectron();
  // Ensure port 3000 is free so Vite binds to it deterministically
  try {
    if (process.platform === 'win32') {
      execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :3000') do taskkill /F /PID %a`, { stdio: 'ignore' });
    } else {
      execSync(`lsof -ti:3000 | xargs kill -9`, { stdio: 'ignore' });
    }
  } catch {}

  console.log('[electron:dev] Starting Vite dev server...');

  const vitePath = process.platform === 'win32'
    ? path.join(PROJECT_ROOT, 'node_modules', '.bin', 'vite.cmd')
    : path.join(PROJECT_ROOT, 'node_modules', '.bin', 'vite');
  const viteProc = exec(`\"${vitePath}\" --port=3000 --host=0.0.0.0`, {
    cwd: PROJECT_ROOT,
    env: Object.assign({}, process.env),
  });

  // Capture Vite's "Local: http://localhost:xxxx/" line to know the exact URL
  let viteReadyResolver;
  const viteReady = new Promise((resolve) => { viteReadyResolver = resolve; });

  viteProc.stdout.on('data', (data) => {
    const msg = data.toString();
    const lines = msg.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) console.log('[vite] ' + trimmed);
      // Strip ANSI escape codes for reliable matching
      const clean = trimmed.replace(/\u001b\[[0-9;]*m/g, '');
      const match = clean.match(/Local:\s+(http:\/\/localhost:\d+\/)/);
      if (match) {
        DEV_SERVER_URL = match[1];
        viteReadyResolver();
      }
    }
  });

  viteProc.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) console.error('[vite] ' + msg);
  });

  console.log('[electron:dev] Waiting for Vite dev server...');
  try {
    await viteReady;
    console.log('\n[electron:dev] Vite dev server ready at ' + DEV_SERVER_URL);
  } catch (err) {
    console.error('\n[electron:dev] ' + err.message);
    viteProc.kill();
    process.exit(1);
  }

  console.log('[electron:dev] Building main process...');
  try {
    const viteCmd = process.platform === 'win32'
      ? path.join(PROJECT_ROOT, 'node_modules', '.bin', 'vite.cmd')
      : path.join(PROJECT_ROOT, 'node_modules', '.bin', 'vite');
    execSync(`\"${viteCmd}\" build --config vite.main.config.ts`, { stdio: 'inherit', cwd: PROJECT_ROOT });
  } catch (e) {
    console.error('[electron:dev] Failed to build main process');
    viteProc.kill();
    process.exit(1);
  }

  console.log('[electron:dev] Building preload script...');
  try {
    const vitePreloadPath = process.platform === 'win32'
      ? path.join(PROJECT_ROOT, 'node_modules', '.bin', 'vite.cmd')
      : path.join(PROJECT_ROOT, 'node_modules', '.bin', 'vite');
    execSync(`\"${vitePreloadPath}\" build --config vite.preload.config.ts`, { stdio: 'inherit', cwd: PROJECT_ROOT });
  } catch (e) {
    console.error('[electron:dev] Failed to build preload script');
    viteProc.kill();
    process.exit(1);
  }

  console.log('[electron:dev] Launching Electron...');
  const electronEnv = Object.assign({}, process.env);
  electronEnv.VITE_DEV_SERVER_URL = DEV_SERVER_URL;

  const electronProc = spawn(electron, ['.', '--remote-debugging-port=5858'], {
    cwd: PROJECT_ROOT,
    env: electronEnv,
    stdio: 'inherit',
  });

  electronProc.on('exit', function (code) {
    console.log('[electron:dev] Electron exited with code ' + code);
    viteProc.kill();
    process.exit(code || 0);
  });

  process.on('SIGINT', function () {
    viteProc.kill();
    try { electronProc.kill(); } catch {}
    process.exit(0);
  });
}

main();
