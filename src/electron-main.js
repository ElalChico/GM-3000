// Importaciones de Electron y módulos nativos
const { app, BrowserWindow, Menu, screen, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { networkInterfaces, tmpdir } = require('os');
const { createServer } = require('http');
const { URL } = require('url');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { connect } = require('net');
const { request: httpsRequest } = require('https');
const tls = require('tls');
const nodeCrypto = require('crypto');
const execFileAsync = promisify(execFile);

// ── Squirrel: debe manejarse ANTES de cualquier otra lógica ──────────────────
// Squirrel (el instalador de Electron Forge) lanza la app con eventos especiales
// durante la instalación/desinstalación. Si no los atrapamos aquí, la app
// se abre (se ve brevemente) y luego se cierra → doble inicio visible.
if (process.platform === 'win32') {
  const squirrelArg = process.argv[1];
  if (squirrelArg && squirrelArg.startsWith('--squirrel')) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { execSync } = require('child_process');
    const updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
    const exeName   = path.basename(process.execPath);

    const squirrelActions = {
      // Al instalar: crear acceso directo en escritorio y menú inicio
      '--squirrel-install': () => {
        try { execSync(`"${updateExe}" --createShortcut "${exeName}"`); } catch (_) {}
      },
      // Al actualizar: recrear acceso directo
      '--squirrel-updated': () => {
        try { execSync(`"${updateExe}" --createShortcut "${exeName}"`); } catch (_) {}
      },
      // Al desinstalar: eliminar acceso directo
      '--squirrel-uninstall': () => {
        try { execSync(`"${updateExe}" --removeShortcut "${exeName}"`); } catch (_) {}
      },
      // Obsoleted event — solo salir
      '--squirrel-obsolete': () => {},
    };

    const handler = squirrelActions[squirrelArg];
    if (handler) {
      handler();
      app.quit();   // Salir inmediatamente — NO abrir ninguna ventana
      process.exit(0);
    }
  }
}
// ─────────────────────────────────────────────────────────────────────────────

console.log('[electron-main] Starting up...');

function resolveIconPath() {
  const candidates = [
    path.join(process.resourcesPath || '', 'Desktop.ico'),
    path.join(__dirname, '..', 'src', 'assets', 'Desktop.ico'),
    path.join(__dirname, '..', 'public', 'assets', 'dark_cat.ico'),
    path.join(__dirname, '..', 'src', 'assets', 'dark_cat.ico'),
  ];
  const found = candidates.find(fs.existsSync);
  if (found) console.log('[electron-main] Icon resolved:', found);
  else console.warn('[electron-main] No icon file found among:', candidates);
  return found || undefined;
}

process.on('uncaughtException', (err) => {
  console.error('[electron-main] CRASH (uncaughtException):', err?.stack || err);
  showErrorDialog('Error inesperado', String(err.stack || err));
});

process.on('unhandledRejection', (reason) => {
  console.error('[electron-main] CRASH (unhandledRejection):', reason?.stack || reason);
  showErrorDialog('Error inesperado', String(reason?.stack || reason));
});


// --- SERVIDOR LAN INTEGRADO (sin dependencias externas) ---
let players = [];
let pendingRequests = []; // Solicitudes de unión pendientes de aprobación
let events = [];
let eventCounter = 0;
let gameState = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  history: [],
  whiteTime: 600,
  blackTime: 600,
  hasStarted: false,
  isPaused: false,
  whitePlayer: 'human',
  blackPlayer: 'human',
  boardOrientation: 'white',
  gameResult: null,
};

function getLocalIPs() {
  const ifaces = networkInterfaces();
  const ips = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

function pushEvent(type, playerId, data) {
  eventCounter++;
  events.push({ id: eventCounter, type, playerId, data, ts: Date.now() });
  if (events.length > 1000) events = events.slice(-1000);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, data, status = 200) {
  const json = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(json);
}

async function handleRequest(req, res) {
  const parsedUrl = new URL(req.url, `http://localhost:3001`);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.searchParams;

  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && pathname === '/info') {
    return sendJSON(res, { ips: getLocalIPs(), players, eventCounter });
  }

  if (req.method === 'GET' && pathname === '/ping') {
    return sendJSON(res, {
      gm3000: true,
      ips: getLocalIPs(),
      hostName: players.length > 0 ? players[0].name : 'Sala de Juego',
      hasHost: players.length > 0,
      hostId: players.find(p => p.role === 'host')?.id
    });
  }

  if (req.method === 'GET' && pathname === '/players') {
    return sendJSON(res, { players });
  }

  // --- Endpoints de Conexión y Aprobación ---

  if (req.method === 'POST' && pathname === '/host') {
    const body = await readBody(req);
    const { playerId, preferredColor, name } = body;
    players = [{ id: playerId, role: 'host', color: preferredColor || 'white', name: name || 'Host', confirmed: true }];
    pendingRequests = [];
    events = [];
    eventCounter = 0;
    pushEvent('state', 'server', { type: 'host_joined', playerId, name });
    return sendJSON(res, { ok: true, color: players[0].color, ips: getLocalIPs() });
  }

  if (req.method === 'POST' && pathname === '/request-join') {
    const body = await readBody(req);
    const { playerId, preferredColor, name } = body;
    const existing = players.find(p => p.id === playerId);
    if (existing && existing.confirmed) {
      return sendJSON(res, { ok: true, status: 'confirmed', color: existing.color });
    }
    // Añadir a solicitudes pendientes
    if (!pendingRequests.some(r => r.playerId === playerId)) {
      pendingRequests.push({ playerId, preferredColor, name });
      pushEvent('state', 'server', { type: 'join_request', playerId, name, preferredColor });
    }
    return sendJSON(res, { ok: true, status: 'pending' });
  }

  if (req.method === 'POST' && pathname === '/accept-join') {
    const body = await readBody(req);
    const { guestId } = body;
    const request = pendingRequests.find(r => r.playerId === guestId);
    if (request) {
      const takenColors = players.map(p => p.color);
      let color = request.preferredColor;
      if (!color || color === 'random' || takenColors.includes(color)) {
        color = takenColors.includes('white') ? 'black' : 'white';
      }
      const newPlayer = { id: guestId, role: 'guest', color, name: request.name, confirmed: true };
      players.push(newPlayer);
      pendingRequests = pendingRequests.filter(r => r.playerId !== guestId);
      pushEvent('state', 'server', { 
        type: 'join_confirmed', 
        guestId, 
        guestColor: color, 
        hostColor: players.find(p => p.role === 'host')?.color,
        players 
      });
      return sendJSON(res, { ok: true });
    }
    return sendJSON(res, { error: 'Request not found' }, 404);
  }

  if (req.method === 'POST' && pathname === '/reject-join') {
    const body = await readBody(req);
    const { guestId } = body;
    pendingRequests = pendingRequests.filter(r => r.playerId !== guestId);
    pushEvent('state', 'server', { type: 'join_rejected', guestId });
    return sendJSON(res, { ok: true });
  }

  if (req.method === 'POST' && pathname === '/leave') {
    const body = await readBody(req);
    const { playerId } = body;
    const leaving = players.find(p => p.id === playerId);
    players = players.filter(p => p.id !== playerId);
    if (leaving) {
      pushEvent('state', 'server', { type: leaving.role === 'host' ? 'host_left' : 'player_left', playerId, name: leaving.name });
    }
    if (players.length === 0) {
      gameState = {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        history: [],
        whiteTime: 600,
        blackTime: 600,
        hasStarted: false,
        isPaused: false,
        whitePlayer: 'human',
        blackPlayer: 'human',
        boardOrientation: 'white',
        gameResult: null,
      };
      events = [];
      events = [];
      eventCounter = 0;
    }
    return sendJSON(res, { ok: true });
  }

  // --- Endpoints de Estado y Movimiento ---

  if (req.method === 'GET' && pathname === '/state') {
    const playerId = query.get('playerId');
    const player = players.find(p => p.id === playerId);
    const boardOrientation = player?.color || 'white';
    return sendJSON(res, { ...gameState, players, eventCounter, boardOrientation });
  }

  if (req.method === 'POST' && pathname === '/state') {
    const body = await readBody(req);
    gameState = { ...gameState, ...body };
    pushEvent('state', body.playerId || 'host', body);
    return sendJSON(res, { ok: true });
  }

  if (req.method === 'POST' && pathname === '/move') {
    const body = await readBody(req);
    const { playerId, move, fen, history, whiteTime, blackTime } = body;
    if (fen) gameState.fen = fen;
    if (history) gameState.history = history;
    if (whiteTime !== undefined) gameState.whiteTime = whiteTime;
    if (blackTime !== undefined) gameState.blackTime = blackTime;
    pushEvent('move', playerId, { move, fen, history, whiteTime, blackTime });
    return sendJSON(res, { ok: true, id: eventCounter });
  }

  if (req.method === 'POST' && pathname === '/control') {
    const body = await readBody(req);
    const { action, playerId, data } = body;
    if (action === 'pause') gameState.isPaused = true;
    if (action === 'resume') gameState.isPaused = false;
    if (action === 'stop') {
      gameState.hasStarted = false;
      gameState.isPaused = false;
    }
    if (action === 'reset') {
      gameState.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      gameState.history = [];
      gameState.hasStarted = false;
      gameState.isPaused = false;
      gameState.gameResult = null;
      // Sincronizar colores de los jugadores en el servidor integrado
      if (data && data.boardOrientation) {
        const hostColor = data.boardOrientation;
        const guestColor = hostColor === 'white' ? 'black' : 'white';
        players.forEach(p => {
          if (p.role === 'host') p.color = hostColor;
          if (p.role === 'guest') p.color = guestColor;
   });
   // Force zoom level 0 on any zoom changes (e.g., Ctrl + scroll)
   mainWindow.webContents.on('zoom-changed', (_event, _direction) => {
     try { mainWindow.webContents.setZoomLevel(0); } catch (e) { console.warn('[electron-main] Zoom reset failed:', e); }
   });
      }
    }
    pushEvent('control', playerId, { action, ...data, isPaused: gameState.isPaused, hasStarted: gameState.hasStarted });
    return sendJSON(res, { ok: true });
  }

  if (req.method === 'GET' && pathname === '/events') {
    const since = parseInt(query.get('since')) || 0;
    const requesterId = query.get('playerId');
    const newEvents = events.filter(e => e.id > since && e.playerId !== requesterId);
    return sendJSON(res, { 
      events: newEvents, 
      lastId: eventCounter, 
      players,
      pendingRequests: players.some(p => p.id === requesterId && p.role === 'host') ? pendingRequests : undefined
    });
  }



  sendJSON(res, { error: 'Not found' }, 404);
}

function startLanServer() {
  const PORT = 3001;
  const server = createServer(handleRequest);
  server.listen(PORT, '0.0.0.0', () => {
    console.log('[LAN] Servidor integrado activo en puerto 3001');
  });
  server.on('error', (err) => {
    console.error('[LAN] Error en servidor:', err.message);
  });
  return server;
}
// --- FIN SERVIDOR LAN ---

let transmissionsWindow = null;
let mainWindow = null;
let splashWindow = null;

function getAppRootPath() {
  if (app.isPackaged) {
    // En producción: carpeta junto al .exe (donde están los recursos extraídos del asar)
    return path.dirname(app.getPath('exe'));
  }
  return path.join(__dirname, '..');
}

function createTransmissionsWindow() {
  if (transmissionsWindow && !transmissionsWindow.isDestroyed()) {
    transmissionsWindow.focus();
    return;
  }

  const iconPath = resolveIconPath();

  transmissionsWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 620,
    title: 'GM-3000 Live Transmisiones',
    icon: iconPath,
    backgroundColor: '#070708',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const devServerUrl = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL || process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    const devUrl = new URL('transmisiones/index.html', devServerUrl).toString();
    transmissionsWindow.loadURL(devUrl).catch((error) => {
      console.error('[electron-main] Failed to load live transmissions dev URL:', devUrl, error);
    });
  } else {
    const candidatePaths = [
      path.join(rootPath, 'public', 'transmisiones', 'index.html'),
      path.join(rootPath, 'renderer', 'main_window', 'transmisiones', 'index.html'),
      path.join(rootPath, 'renderer', 'main_window', 'dist', 'transmisiones', 'index.html'),
      path.join(rootPath, 'dist', 'transmisiones', 'index.html'),
      path.join(app.getAppPath(), 'transmisiones', 'index.html'),
      path.join(app.getAppPath(), 'public', 'transmisiones', 'index.html'),
      path.join(app.getAppPath(), 'renderer', 'main_window', 'transmisiones', 'index.html'),
    ];
    const localPath = candidatePaths.find(fs.existsSync);
    if (localPath) {
      transmissionsWindow.loadFile(localPath).catch((error) => {
        console.error('[electron-main] Failed to load live transmissions file:', localPath, error);
      });
    } else {
      console.error('[electron-main] Transmissions index not found. Checked paths:', candidatePaths);
      transmissionsWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<!doctype html><html><body><h1>Transmisiones Live no encontrada</h1><p>Buscando en los siguientes paths:</p><pre>${candidatePaths.join('\n')}</pre></body></html>`));
    }
  }

  transmissionsWindow.once('ready-to-show', () => {
    transmissionsWindow.show();
    transmissionsWindow.focus();
  });

  transmissionsWindow.on('closed', () => {
    transmissionsWindow = null;
  });
}

function createSplashWindow() {
  if (splashWindow) return; // Already exists
  
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const iconPath = resolveIconPath();
  
  splashWindow = new BrowserWindow({
    width: 340,
    height: 180,
    center: true,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    backgroundColor: '#0a0d12',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          background: #0a0d12;
          font-family: 'Segoe UI', 'Roboto', sans-serif;
          color: #e2e8f0;
          overflow: hidden;
        }
        h1 { font-size: 22px; font-weight: 700; margin-bottom: 12px; color: #f8fafc; letter-spacing: 2px; }
        .progress-track { width: 200px; height: 3px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; margin-top: 8px; }
        .progress-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 2px; transition: width 0.1s linear; }
        .percent { margin-top: 6px; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <h1>GM-3000</h1>
      <div class="progress-track"><div class="progress-fill" id="pf"></div></div>
      <div class="percent" id="pct">0%</div>
      <script>
        let p = 0;
        const fill = document.getElementById('pf');
        const txt = document.getElementById('pct');
        const iv = setInterval(() => {
          p += Math.random()*5 + 1;
          if (p >= 100) { p = 100; clearInterval(iv); }
          fill.style.width = p.toFixed(0)+'%';
          txt.textContent = p.toFixed(0)+'%';
        }, 80);
      </script>
    </body>
    </html>
  `;

  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHtml));
  splashWindow.show();
}

function createWindow() {
  Menu.setApplicationMenu(null);

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Adaptar el tamaño a la pantalla, con un máximo de 1280x800
  // y dejar un pequeño margen (por ejemplo 40px) si la pantalla es muy pequeña.
  const appWidth = Math.min(1280, width - 20);
  const appHeight = Math.min(800, height - 20);

  const iconPath = resolveIconPath();

  mainWindow = new BrowserWindow({
    width: appWidth,
    height: appHeight,
    minWidth: 320,
    minHeight: 500,
    title: 'GM3000 — Chess Engine',
    icon: iconPath,
    backgroundColor: '#0f172a',
    // Use native frame so window can be dragged/moved between displays.
    frame: true,
    movable: true,
    // Hide initially to avoid showing an empty/blue window while content loads.
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const mainDevUrl = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL || process.env.VITE_DEV_SERVER_URL;
  if (mainDevUrl) {
    console.log('[electron-main] Loading dev URL:', mainDevUrl);
    mainWindow.loadURL(mainDevUrl).catch(err => {
      console.error('[electron-main] loadURL failed:', err);
    });
  } else {
    // En producción (electron-forge + plugin-vite), el renderer se construye en:
    // .vite/build/renderer/main_window/index.html
    // __dirname = .vite/build (donde está electron-main.js compilado)
    const rendererIndexPath = path.join(__dirname, '..', 'renderer', 'main_window', 'index.html');
    console.log('[electron-main] rendererIndexPath=', rendererIndexPath);
    if (fs.existsSync(rendererIndexPath)) {
      console.log('[electron-main] loading rendererIndexPath');
      mainWindow.loadFile(rendererIndexPath);
    } else {
      console.error('[electron-main] No index.html found at expected path', rendererIndexPath);
    }
  }

  // Mostrar la ventana sólo cuando esté lista para evitar un fondo azul vacío.
  let splashClosed = false;
  const closeSplash = () => {
    if (!splashClosed && splashWindow) {
      splashWindow.close();
      splashWindow = null;
      splashClosed = true;
    }
  };

  mainWindow.once('ready-to-show', () => {
    closeSplash();
    try { mainWindow.maximize(); } catch (e) { /* ignore */ }
    mainWindow.show();
  });

  // Safety timeout: if ready-to-show never fires, close splash after 10s and show anyway
  setTimeout(() => {
    if (!splashClosed) {
      console.warn('[electron-main] Splash timeout — closing splash and showing window');
      closeSplash();
    try { mainWindow.maximize(); } catch (e) { /* ignore */ }
    // Ensure no zoom is applied (important for Windows DPI handling)
    try { mainWindow.webContents.setZoomLevel(0); } catch (e) { console.warn('[electron-main] Could not set zoom level:', e); }
      mainWindow.show();
    }
  }, 10000);

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[electron-main] Renderer failed to load:', errorCode, errorDescription);
    closeSplash();
    mainWindow.show();
  });
}

// Manejadores de control de ventana (Globales)
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', (event) => {
  // Send confirmation request to renderer - it will call 'confirm-exit-actual' if user confirms
  if (mainWindow && mainWindow.webContents && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('confirm-exit-request');
  }
});

ipcMain.on('confirm-exit-actual', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

// --- Ventana flotante del Panel de Memoria Neural ---
const memoryWindows = {};

ipcMain.on('open-memory-window', (event, { storageData, engineName }) => {
  const engineKey = engineName || 'DxA.47';
  const existingWindow = memoryWindows[engineKey];
  if (existingWindow && !existingWindow.isDestroyed()) {
    existingWindow.focus();
    return;
  }

  const memoryWindow = new BrowserWindow({
    width: 360,
    height: 460,
    minWidth: 280,
    minHeight: 300,
    title: `Neural Memory — ${engineKey}`,
    alwaysOnTop: true,
    resizable: true,
    frame: true,
    transparent: false,
    backgroundColor: '#121418',
    icon: resolveIconPath(),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  memoryWindows[engineKey] = memoryWindow;

  // Cargar una página HTML mínima para el widget de memoria
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Neural Memory</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #121418; color: #e2e8f0; font-family: 'Consolas', monospace; font-size: 12px; padding: 12px; overflow-y: auto; }
  h2 { color: #4ade80; font-size: 13px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
  .sel { background: #1a1f27; color: #4ade80; border: 1px solid #2a2f38; border-radius: 4px; font-size: 11px; padding: 3px 6px; margin-left: auto; cursor: pointer; }
  .section { background: #1a1f27; border: 1px solid #2a2f38; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; }
  .section h4 { color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #2a2f38; }
  .row:last-child { border: none; }
  .row span:first-child { color: #94a3b8; }
  .row span:last-child { color: #e2e8f0; font-weight: bold; }
  .win { color: #4ade80 !important; }
  .err { color: #f87171 !important; }
  .insight { padding: 4px 0; border-bottom: 1px solid #2a2f38; font-size: 11px; }
  .insight:last-child { border: none; }
  #status { color: #64748b; font-size: 11px; padding: 12px; text-align: center; }
</style>
</head>
<body>
<h2>🧠 Neural Memory
  <button class="sel" id="openOtherBtn">Abrir otro motor</button>
  <select class="sel" id="engSel">
    <option value="DxA.47">DxA.47</option>
    <option value="M-P26">M-P26</option>
  </select>
</h2>
<div id="content"><div id="status">⏳ Esperando datos...</div></div>
<script>
  const { ipcRenderer } = require('electron');
  const KEYS = { "DxA.47": "dx47_memory_v4_DxA47", "M-P26": "gm3000_mem_v3_M_P26" };
  let curEngine = "DxA.47";

  function render(snap) {
    if (!snap) {
      document.getElementById('content').innerHTML = '<div id="status">Sin datos aún. Juega una partida.</div>';
      return;
    }
    const learnMap = snap.learnMap ? Object.entries(snap.learnMap) : [];
    let wins = 0, errs = 0;
    for (const [,v] of learnMap) {
      if (v.winWeight > v.errorWeight) wins++;
      else if (v.errorWeight > 0) errs++;
    }
    const history = (snap.recentHistory || []).slice(-5).reverse();
    const topLearned = learnMap
      .map(([key, v]) => {
        const move = key.includes('_M') ? key.split('_M').pop() : key.includes(':') ? key.split(':').pop() : key;
        return { move: String(move).substring(0, 8), net: (v.winWeight || 0) - (v.errorWeight || 0), visits: v.visits || 0 };
      })
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
      .slice(0, 5);

    let html = '';
    if (topLearned.length > 0) {
      html += '<div class="section"><h4>🧠 ' + curEngine + ' — Movimientos Aprendidos</h4>';
      for (const item of topLearned) {
        const sign = item.net > 0 ? '+' : '';
        const color = item.net > 0 ? 'win' : item.net < 0 ? 'err' : '';
        html += '<div class="row"><span>' + item.move + '</span><span class="' + color + '">' + sign + item.net.toFixed(1) + ' / ' + item.visits + 'x</span></div>';
      }
      html += '</div>';
    }
    html += '<div class="section"><h4>📊 ' + curEngine + ' — Estadísticas</h4>';
    html += '<div class="row"><span>Posiciones</span><span>' + learnMap.length + '</span></div>';
    html += '<div class="row"><span>Historial</span><span>' + (snap.recentHistory||[]).length + '</span></div>';
    html += '<div class="row"><span class="win">Ganadoras</span><span class="win">' + wins + '</span></div>';
    html += '<div class="row"><span class="err">Errores</span><span class="err">' + errs + '</span></div></div>';
    if (history.length > 0) {
      html += '<div class="section"><h4>⚡ Insights Recientes</h4>';
      for (const h of history) {
        const d = Math.round((h.score||0)/10);
        const cls = d > 20 ? 'win' : d < -20 ? 'err' : '';
        html += '<div class="insight"><span class="' + cls + '">' + (d>0?'+':'') + d + '</span> <b>' + (h.move||'?') + '</b> (' + (h.result||'?') + ') — Prof:' + (h.depth||'?') + '</div>';
      }
      html += '</div>';
    }
    document.getElementById('content').innerHTML = html;
  }

  function poll() {
    try {
      const raw = localStorage.getItem(KEYS[curEngine]);
      render(raw ? JSON.parse(raw) : null);
    } catch(e) { console.error(e); }
  }

  document.getElementById('engSel').addEventListener('change', function() {
    curEngine = this.value;
    poll();
  });

  document.getElementById('openOtherBtn').addEventListener('click', function() {
    const other = curEngine === 'DxA.47' ? 'M-P26' : 'DxA.47';
    ipcRenderer.send('open-memory-window', { engineName: other });
  });

  poll();
  const pollInterval = setInterval(poll, 2000);
  window.addEventListener('beforeunload', () => clearInterval(pollInterval));
</script>
</body>
</html>`;

  memoryWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

  memoryWindow.on('closed', () => {
    memoryWindows[engineKey] = null;
  });
});

ipcMain.on('open-transmissions-window', () => {
  createTransmissionsWindow();
});

ipcMain.on('close-memory-window', () => {
  for (const key of Object.keys(memoryWindows)) {
    const win = memoryWindows[key];
    if (win && !win.isDestroyed()) {
      win.close();
      memoryWindows[key] = null;
    }
  }
});


// --- Manejadores de memoria de motores ---

/**
 * Devuelve la ruta de engine_data/ DENTRO de la aplicacion GM-3000.
 * Desarrollo : {raiz del proyecto}/engine_data/
 * Produccion : {carpeta del ejecutable}/engine_data/
 * De esta forma los datos de entrenamiento viajan con la app y se pueden
 * compilar junto con el conocimiento acumulado.
 */
function getEngineDataDir() {
  if (app.isPackaged) {
    // Produccion: carpeta junto al .exe
    return path.join(path.dirname(app.getPath('exe')), 'engine_data');
  } else {
    // Desarrollo: raiz del proyecto (dos niveles arriba de src/electron-main.js)
    return path.join(__dirname, '..', 'engine_data');
  }
}

/** Retorna la ruta engine_data/ de forma sincrona (necesario para init del motor) */
ipcMain.on('get-engine-data-path-sync', (event) => {
  try {
    const dir = getEngineDataDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    event.returnValue = dir;
  } catch (e) {
    event.returnValue = null;
  }
});

/** Lee el archivo de memoria de un motor (lectura sínc. para init del motor) */
ipcMain.on('engine-memory-read-sync', (event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) { event.returnValue = null; return; }
    event.returnValue = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    console.error('[engine-memory-read-sync] Error:', e);
    event.returnValue = null;
  }
});

/** Retorna la carpeta userData de la app (async) */
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

/** Lee el archivo de memoria de un motor. Retorna null si no existe. */
ipcMain.handle('engine-memory-read', (_event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    console.error('[engine-memory-read] Error:', e);
    return null;
  }
});

/** Escribe el archivo de memoria de un motor (escritura atómica). */
ipcMain.handle('engine-memory-write', (_event, filePath, content) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, filePath);
    return true;
  } catch (e) {
    console.error('[engine-memory-write] Error:', e);
    return false;
  }
});

/** Elimina el archivo de memoria de un motor. */
ipcMain.handle('engine-memory-delete', (_event, filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  } catch (e) {
    console.error('[engine-memory-delete] Error:', e);
    return false;
  }
});

/** Guarda una imagen del tablero en el disco local. */
ipcMain.handle('save-board-image', async (_event, { dataUrl, defaultName }) => {
  try {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(win, {
      title: 'Guardar captura del tablero',
      defaultPath: defaultName || `tablero_${Date.now()}.png`,
      filters: [
        { name: 'PNG', extensions: ['png'] },
        { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
        { name: 'Todos los archivos', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePath) return false;
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(result.filePath, buffer);
    return true;
  } catch (e) {
    console.error('[save-board-image] Error:', e);
    return false;
  }
});

/** Guarda un archivo de texto (FEN) en el disco local. */
ipcMain.handle('save-fen-text', async (_event, { content, defaultName }) => {
  try {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(win, {
      title: 'Guardar FEN como archivo de texto',
      defaultPath: defaultName || `fen_${Date.now()}.txt`,
      filters: [
        { name: 'Texto', extensions: ['txt'] },
        { name: 'Todos los archivos', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePath) return false;
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return true;
  } catch (e) {
    console.error('[save-fen-text] Error:', e);
    return false;
  }
});

// --- Export data handler (PGN, analysis, audio) ---
ipcMain.handle('export-data', async (_event, { type, content, filename, mimeType }) => {
  try {
    const win = BrowserWindow.getFocusedWindow();
    const filters = [];

    if (type === 'pgn') {
      filters.push({ name: 'PGN Chess', extensions: ['pgn'] });
    } else if (type === 'txt') {
      filters.push({ name: 'Texto', extensions: ['txt'] });
    } else if (type === 'mp3') {
      filters.push({ name: 'Audio MP3', extensions: ['mp3'] });
    } else if (type === 'zip') {
      filters.push({ name: 'ZIP Archive', extensions: ['zip'] });
    }
    filters.push({ name: 'Todos los archivos', extensions: ['*'] });

    const result = await dialog.showSaveDialog(win, {
      title: 'Guardar archivo',
      defaultPath: filename || `gm3000_export_${Date.now()}.${type}`,
      filters,
    });

    if (result.canceled || !result.filePath) return { saved: false };

    // Handle different content types
    if (content instanceof ArrayBuffer || content instanceof Uint8Array) {
      fs.writeFileSync(result.filePath, Buffer.from(content));
    } else if (typeof content === 'string') {
      fs.writeFileSync(result.filePath, content, 'utf-8');
    } else {
      // Assume it's a base64 string for binary content
      const buffer = Buffer.from(content, 'base64');
      fs.writeFileSync(result.filePath, buffer);
    }

    return { saved: true, path: result.filePath };
  } catch (e) {
    console.error('[export-data] Error:', e);
    return { saved: false, error: e.message };
  }
});

// --- TTS synthesis handler (edge-tts via native API) ---

// Cache voices list
let cachedVoices = null;
async function getAllVoices() {
  if (cachedVoices) return cachedVoices;
  
  const voicesUrl = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0';

  return new Promise((resolve) => {
    httpsRequest(voicesUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          cachedVoices = json.map(v => ({
            name: v.Name || v.ShortName,
            shortName: v.ShortName,
            gender: v.Gender,
            locale: v.Locale,
            friendlyName: v.FriendlyName || v.LocalName || v.ShortName,
          }));
          console.log('[tts] Loaded', cachedVoices.length, 'voices natively');
          resolve(cachedVoices);
        } catch (e) {
          console.error('[tts] Failed to parse voices JSON:', e?.message);
          resolve([]);
        }
      });
    }).on('error', (e) => {
      console.error('[tts] Failed to request voices:', e?.message);
      resolve([]);
    }).end();
  });
}

// IPC: list all available voices
ipcMain.handle('tts-list-voices', async () => {
  const voices = await getAllVoices();
  return voices;
});

// Detect full Python path at startup
let pythonExe = 'python'; // default
try {
  const which = require('child_process').execFileSync('where', ['python'], { encoding: 'utf8', timeout: 5000 });
  const lines = which.split('\n').map(l => l.trim()).filter(Boolean);
  // Prefer the shorter path, or the one under Python* directory
  const prefer = lines.find(l => l.includes('Python314') || l.includes('Python3'));
  if (prefer) pythonExe = prefer;
  else if (lines.length > 0) pythonExe = lines[0];
} catch (_) {}
console.log('[tts] Python detectado:', pythonExe);
// ── Implementación nativa de Edge TTS ────────────────────────────────────────
// Basada en el protocolo real del repositorio github.com/rany2/edge-tts.
// Los puntos claves del protocolo:
//   1. Sec-MS-GEC y Sec-MS-GEC-Version van en la URL de conexión WSS
//   2. El header Cookie con muid aleatorio es obligatorio
//   3. Los frames binarios tienen los primeros 2 bytes como header_length (big-endian)
//      → header = data[2 : 2 + header_length]
//      → audio  = data[2 + header_length :]
//   4. Los X-Timestamp van con sufijo 'Z' en el mensaje SSML
// ─────────────────────────────────────────────────────────────────────────────

// Constantes del servicio Edge TTS (igual que constants.py del repo original)
const EDGE_TTS_CONSTANTS = {
  TRUSTED_CLIENT_TOKEN: '6A5AA1D4EAFF4E9FB37E23D68491D6F4',
  // URL base del WebSocket — Sec-MS-GEC va como query param, no como header
  WSS_URL: 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1',
  VOICES_URL: 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4',
  // Versión del Chromium que usa Edge TTS para el header GEC
  CHROMIUM_VERSION: '143.0.3650.75',
  get GEC_VERSION() { return `1-${this.CHROMIUM_VERSION}`; },
  get CHROMIUM_MAJOR() { return this.CHROMIUM_VERSION.split('.')[0]; },
};

// UUID sin guiones (igual que connect_id() del repo original)
function edgeTtsConnectId() {
  return nodeCrypto.randomUUID().replace(/-/g, '');
}

// UUID con guiones para X-RequestId
function edgeTtsUUID() {
  return nodeCrypto.randomUUID();
}

// Fecha en formato JavaScript (igual que date_to_string() del repo original)
function edgeTtsDateString() {
  // Mismo formato que usa el repo oficial
  return new Date().toUTCString().replace('GMT', 'GMT+0000 (Coordinated Universal Time)');
}

// Genera el token Sec-MS-GEC siguiendo el algoritmo de drm.py del repo original:
// ticks = unix_timestamp + WIN_EPOCH; redondear a 5 min; convertir a 100ns; SHA256
function edgeTtsGenSecMsGec() {
  const WIN_EPOCH = 11644473600; // segundos desde 1601-01-01 hasta 1970-01-01
  const S_TO_100NS = 1e7;         // 1 segundo = 10,000,000 intervalos de 100ns
  const ticks_raw = (Date.now() / 1000) + WIN_EPOCH;
  // Redondear hacia abajo al múltiplo de 300 más cercano (5 minutos)
  const ticks_rounded = ticks_raw - (ticks_raw % 300);
  // Convertir a intervalos de 100 nanosegundos
  const ticks_100ns = ticks_rounded * S_TO_100NS;
  const str_to_hash = `${ticks_100ns.toFixed(0)}${EDGE_TTS_CONSTANTS.TRUSTED_CLIENT_TOKEN}`;
  return nodeCrypto.createHash('sha256').update(str_to_hash, 'ascii').digest('hex').toUpperCase();
}

// MUID aleatorio para el header Cookie (igual que generate_muid() del repo)
function edgeTtsGenerateMuid() {
  return nodeCrypto.randomBytes(16).toString('hex').toUpperCase();
}

// Escapa caracteres especiales XML en el texto a sintetizar
function edgeTtsEscapeXml(text) {
  return text
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

// Construye el SSML (igual que mkssml() del repo original)
function edgeTtsMkSSML(text, voice, rate, volume, pitch) {
  const escapedText = edgeTtsEscapeXml(text);
  return (
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
    `<voice name='${voice}'>` +
    `<prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>` +
    `${escapedText}` +
    `</prosody></voice></speak>`
  );
}

// Construye el mensaje SSML completo con headers (igual que ssml_headers_plus_data())
function edgeTtsSsmlMessage(requestId, timestamp, ssml) {
  return (
    `X-RequestId:${requestId}\r\n` +
    `Content-Type:application/ssml+xml\r\n` +
    `X-Timestamp:${timestamp}Z\r\n` + // La 'Z' es intencional (igual que en el repo oficial)
    `Path:ssml\r\n\r\n` +
    ssml
  );
}

// Función principal de síntesis nativa con WebSocket sobre TLS
async function edgeTtsSynthesizeNative(text, voice, rate, volume, pitch) {
  const secMsGEC = edgeTtsGenSecMsGec();
  const muid     = edgeTtsGenerateMuid();
  const connId   = edgeTtsConnectId();
  const reqId    = edgeTtsUUID();
  const outputFormat = 'audio-24khz-48kbitrate-mono-mp3';
  const ssml = edgeTtsMkSSML(text, voice, rate || '+0%', volume || '+0%', pitch || '+0Hz');

  // La URL WSS lleva Sec-MS-GEC, Sec-MS-GEC-Version y ConnectionId como query params
  const chromMajor = EDGE_TTS_CONSTANTS.CHROMIUM_MAJOR;
  const wssPath = (
    `/consumer/speech/synthesize/readaloud/edge/v1` +
    `?TrustedClientToken=${EDGE_TTS_CONSTANTS.TRUSTED_CLIENT_TOKEN}` +
    `&ConnectionId=${connId}` +
    `&Sec-MS-GEC=${secMsGEC}` +
    `&Sec-MS-GEC-Version=${EDGE_TTS_CONSTANTS.GEC_VERSION}`
  );
  const host = 'speech.platform.bing.com';
  const port = 443;

  return new Promise((resolve, reject) => {
    const wsKey = nodeCrypto.randomBytes(16).toString('base64');
    const audioChunks = [];

    // Cabeceras del WebSocket handshake — el Cookie con muid es OBLIGATORIO
    const handshakeHeaders = [
      `GET ${wssPath} HTTP/1.1`,
      `Host: ${host}`,
      `Upgrade: websocket`,
      `Connection: Upgrade`,
      `Sec-WebSocket-Key: ${wsKey}`,
      `Sec-WebSocket-Version: 13`,
      `Origin: chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold`,
      `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromMajor}.0.0.0 Safari/537.36 Edg/${chromMajor}.0.0.0`,
      `Accept-Encoding: gzip, deflate, br, zstd`,
      `Accept-Language: en-US,en;q=0.9`,
      `Pragma: no-cache`,
      `Cache-Control: no-cache`,
      `Cookie: muid=${muid};`,
      ``,
      ``,
    ].join('\r\n');

    const socket = tls.connect({ host, port, servername: host }, () => {
      socket.write(handshakeHeaders);
    });

    const state = { handshaked: false, buffer: Buffer.alloc(0) };
    let settled = false;

    // Timeout de inactividad — si no recibimos datos en 30s, rechazamos
    const timer = { id: setTimeout(() => {
      socket.destroy();
      if (!settled) { settled = true; reject(new Error('edge-tts: timeout de inactividad')); }
    }, 30000) };

    function resetInactivity() {
      clearTimeout(timer.id);
      timer.id = setTimeout(() => {
        socket.destroy();
        if (!settled) { settled = true; reject(new Error('edge-tts: timeout de inactividad')); }
      }, 30000);
    }

    // ── Parser de frames WebSocket (RFC 6455) ────────────────────────────────
    function parseWebSocketFrames(buf) {
      const frames = [];
      let offset = 0;
      while (offset < buf.length) {
        if (offset + 2 > buf.length) break;
        const b0 = buf[offset];
        const b1 = buf[offset + 1];
        const opcode = b0 & 0x0f;
        const masked  = (b1 & 0x80) !== 0;
        let payloadLen = b1 & 0x7f;
        let hdrLen = 2;

        if (payloadLen === 126) {
          if (offset + 4 > buf.length) break;
          payloadLen = buf.readUInt16BE(offset + 2);
          hdrLen = 4;
        } else if (payloadLen === 127) {
          if (offset + 10 > buf.length) break;
          payloadLen = Number(buf.readBigUInt64BE(offset + 2));
          hdrLen = 10;
        }
        if (masked) hdrLen += 4;
        if (offset + hdrLen + payloadLen > buf.length) break;

        let payload = buf.subarray(offset + hdrLen, offset + hdrLen + payloadLen);
        if (masked) {
          const mk = buf.subarray(offset + hdrLen - 4, offset + hdrLen);
          const unmasked = Buffer.allocUnsafe(payloadLen);
          for (let i = 0; i < payloadLen; i++) unmasked[i] = payload[i] ^ mk[i % 4];
          payload = unmasked;
        }
        frames.push({ opcode, payload });
        offset += hdrLen + payloadLen;
      }
      return { frames, remaining: buf.subarray(offset) };
    }

    // Envía un frame WebSocket enmascarado (el cliente siempre enmascara)
    function sendWsFrame(data, opcode = 0x01) {
      const mask    = nodeCrypto.randomBytes(4);
      const payload = (typeof data === 'string') ? Buffer.from(data, 'utf8') : Buffer.from(data);
      const len = payload.length;
      let hdr;
      if (len < 126) {
        hdr = Buffer.alloc(6);
        hdr[0] = 0x80 | opcode; hdr[1] = 0x80 | len;
        mask.copy(hdr, 2);
      } else if (len < 65536) {
        hdr = Buffer.alloc(8);
        hdr[0] = 0x80 | opcode; hdr[1] = 0x80 | 126;
        hdr.writeUInt16BE(len, 2); mask.copy(hdr, 4);
      } else {
        hdr = Buffer.alloc(14);
        hdr[0] = 0x80 | opcode; hdr[1] = 0x80 | 127;
        hdr.writeBigUInt64BE(BigInt(len), 2); mask.copy(hdr, 10);
      }
      const body = Buffer.allocUnsafe(len);
      for (let i = 0; i < len; i++) body[i] = payload[i] ^ mask[i % 4];
      socket.write(Buffer.concat([hdr, body]));
    }
    // ────────────────────────────────────────────────────────────────────────

    socket.on('data', (chunk) => {
      state.buffer = Buffer.concat([state.buffer, chunk]);

      // Paso 1: esperar el handshake HTTP 101
      if (!state.handshaked) {
        const sep = state.buffer.indexOf('\r\n\r\n');
        if (sep === -1) return; // todavía no llegaron todos los headers
        const respLine = state.buffer.subarray(0, sep).toString().split('\r\n')[0];
        if (!respLine.includes('101')) {
          clearTimeout(timer.id);
          socket.destroy();
          if (!settled) { settled = true; reject(new Error('edge-tts: handshake WSS falló → ' + respLine)); }
          return;
        }
        state.handshaked = true;
        state.buffer = state.buffer.subarray(sep + 4);

        // Enviar mensaje de configuración de audio
        const ts = edgeTtsDateString();
        const cfgMsg = (
          `X-Timestamp:${ts}\r\n` +
          `Content-Type:application/json; charset=utf-8\r\n` +
          `Path:speech.config\r\n\r\n` +
          `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"${outputFormat}"}}}}\r\n`
        );
        sendWsFrame(cfgMsg, 0x01);

        // Enviar el SSML con el texto a sintetizar
        sendWsFrame(edgeTtsSsmlMessage(reqId, ts, ssml), 0x01);
        return;
      }

      resetInactivity();

      // Paso 2: parsear frames WebSocket acumulados
      let remaining = state.buffer;
      while (remaining.length > 0) {
        const { frames, remaining: rem } = parseWebSocketFrames(remaining);
        remaining = rem;

        for (const frame of frames) {
          const { opcode, payload } = frame;

          if (opcode === 0x01) {
            // Frame de TEXTO — contiene metadata o señal de fin de turno
            const text = payload.toString('utf8');
            if (text.includes('Path:turn.end')) {
              clearTimeout(timer.id);
              // Enviar frame de cierre WebSocket
              sendWsFrame(Buffer.from([0x03, 0xe8]), 0x08); // código 1000 = cierre normal
              socket.destroy();
            }
          } else if (opcode === 0x02) {
            // Frame BINARIO — contiene datos de audio
            // Protocolo: primeros 2 bytes = header_length (big-endian)
            // header = payload[2 : 2 + header_length]
            // audio  = payload[2 + header_length :]
            if (payload.length < 2) continue;
            const headerLength = payload.readUInt16BE(0);
            if (2 + headerLength > payload.length) continue;
            // Verificar que el path es 'audio' (no procesar otros tipos)
            const headerStr = payload.subarray(2, 2 + headerLength).toString('ascii');
            if (!headerStr.includes('Path:audio')) continue;
            const audioPart = payload.subarray(2 + headerLength);
            if (audioPart.length > 0) audioChunks.push(audioPart);
          } else if (opcode === 0x08) {
            // Frame de cierre
            clearTimeout(timer.id);
            socket.destroy();
          }
        }
      }
      state.buffer = remaining;
    });

    socket.on('close', () => {
      clearTimeout(timer.id);
      if (settled) return;
      settled = true;
      if (audioChunks.length === 0) {
        reject(new Error('edge-tts: no se recibió audio'));
        return;
      }
      resolve(Buffer.concat(audioChunks));
    });

    socket.on('error', (err) => {
      clearTimeout(timer.id);
      if (settled) return;
      settled = true;
      reject(new Error('edge-tts error de socket: ' + err.message));
    });
  });
}

// IPC: synthesize speech (native implementation first, npm fallback, Python last)
ipcMain.handle('tts-synthesize', async (_event, { text, voice, rate, volume, pitch }) => {
  console.log('[tts-synthesize] Request:', { voice, rate, volume, pitch, textLen: text?.length });
  const ttsText = text || '';
  if (!ttsText.trim()) {
    console.warn('[tts-synthesize] empty text, skipping');
    return { error: 'empty text' };
  }
  const ttsVoice = voice || 'es-MX-DaliaNeural';

  // 1) Native WebSocket implementation (works in .exe, no npm deps)
  try {
    const buffer = await edgeTtsSynthesizeNative(ttsText, ttsVoice, rate, volume, pitch);
    if (buffer && buffer.length > 0) {
      console.log('[tts-synthesize] native OK:', buffer.length, 'bytes');
      return { base64: buffer.toString('base64') };
    }
    console.warn('[tts-synthesize] native: empty buffer');
  } catch (nativeErr) {
    console.warn('[tts-synthesize] native failed:', nativeErr?.message);
  }

  // 2) npm @andresaya/edge-tts fallback
  try {
    const edgeTtsMod = require('@andresaya/edge-tts');
    const EdgeTTS = edgeTtsMod.EdgeTTS;
    const tts = new EdgeTTS();
    await tts.synthesize(ttsText, ttsVoice, {
      rate: rate || '+0%', volume: volume || '+0%', pitch: pitch || '+0Hz',
    });
    const buffer = tts.toBuffer();
    if (buffer && buffer.length > 0) {
      console.log('[tts-synthesize] npm OK:', buffer.length, 'bytes');
      return { base64: buffer.toString('base64') };
    }
    console.warn('[tts-synthesize] npm: empty buffer');
  } catch (npmErr) {
    console.warn('[tts-synthesize] npm failed:', npmErr?.message);
  }

  // 3) Ejecutable tts-worker.exe o Python fallback
  const payload = JSON.stringify({
    text: ttsText, voice: ttsVoice,
    rate: rate || '+0%', volume: volume || '+0%', pitch: pitch || '+0Hz',
  });
  const tmpPayloadPath = path.join(tmpdir(), `gm3000_payload_${Date.now()}.json`);
  try { fs.writeFileSync(tmpPayloadPath, payload, 'utf8'); } catch (e) {
    return { error: `No se pudo escribir payload: ${e?.message}` };
  }
  
  // Buscar el binario compilado tts-worker.exe en todas las rutas posibles
  // (dev, Forge/Squirrel, electron-builder, portable)
  const exePaths = [
    // En el .exe empaquetado con Squirrel / Forge (extraResource va a resources/)
    path.join(process.resourcesPath, 'tts-worker.exe'),
    // Ruta legacy electron-builder
    path.join(process.resourcesPath, 'resources', 'tts-worker.exe'),
    // En desarrollo: resources/ al lado del electron-main.js
    path.join(__dirname, '..', 'resources', 'tts-worker.exe'),
    // Fallback: mismo directorio del app.asar
    path.join(path.dirname(process.execPath), 'resources', 'tts-worker.exe'),
  ];
  console.log('[tts-synthesize] Buscando tts-worker.exe en:', exePaths);
  let exePath = exePaths.find(p => { try { return fs.existsSync(p); } catch { return false; } });

  if (exePath) {
    try {
      const { stdout, stderr } = await execFileAsync(exePath, [tmpPayloadPath], { timeout: 30000, maxBuffer: 10 * 1024 * 1024 });
      if (stderr) console.warn('[tts-synthesize] EXE stderr:', stderr.trim());
      const outputPath = stdout.trim();
      if (outputPath && fs.existsSync(outputPath)) {
        const buffer = fs.readFileSync(outputPath);
        try { fs.unlinkSync(outputPath); } catch {}
        try { fs.unlinkSync(tmpPayloadPath); } catch {}
        if (buffer && buffer.length > 0) {
          console.log('[tts-synthesize] EXE OK:', buffer.length, 'bytes');
          return { base64: buffer.toString('base64') };
        }
      }
    } catch (exeErr) {
      console.warn('[tts-synthesize] EXE failed:', exeErr?.message);
    }
  }

  // Si no hay EXE o falla, buscar tts_worker.py para ejecutar con Python
  const workerPaths = [
    path.join(__dirname, '..', 'src', 'tts_worker.py'),
    path.join(process.resourcesPath, 'src', 'tts_worker.py'),
    path.join(process.resourcesPath, 'tts_worker.py')
  ];
  let workerPath = workerPaths.find(p => fs.existsSync(p));
  
  if (workerPath) {
    for (const pyCmd of [pythonExe, 'python']) {
      try {
        const { stdout, stderr } = await execFileAsync(pyCmd, [workerPath, tmpPayloadPath], { timeout: 30000, maxBuffer: 10 * 1024 * 1024 });
        if (stderr) console.warn('[tts-synthesize] Python stderr:', stderr.trim());
        const outputPath = stdout.trim();
        if (!outputPath || !fs.existsSync(outputPath)) continue;
        const buffer = fs.readFileSync(outputPath);
        try { fs.unlinkSync(outputPath); } catch {}
        try { fs.unlinkSync(tmpPayloadPath); } catch {}
        if (!buffer || buffer.length === 0) continue;
        console.log('[tts-synthesize] Python OK:', pyCmd, buffer.length, 'bytes');
        return { base64: buffer.toString('base64') };
      } catch (pyErr) {
        const stderrDetail = pyErr?.stderr ? ` | stderr: ${pyErr.stderr.trim().slice(0, 200)}` : '';
        console.warn('[tts-synthesize]', pyCmd, 'failed:', pyErr?.message, stderrDetail);
      }
    }
  }

  try { fs.unlinkSync(tmpPayloadPath); } catch {}
  return { error: 'edge-tts falló (native, npm, exe y Python fallaron)' };
});

// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  if (!gotTheLock) app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Set AppUserModelId so Windows uses our custom icon in taskbar/Start Menu
  app.setAppUserModelId('com.gm3000.app');

  app.whenReady().then(() => {
    console.log('[electron-main] app.whenReady() fired');

    try {
      createSplashWindow();
      console.log('[electron-main] Splash window created');
    } catch (error) {
      console.error('[electron-main] Error creating splash window:', error);
    }

    try {
      startLanServer();
    } catch (error) {
      console.error('[electron-main] Error al iniciar servidor LAN:', error);
    }

    // Diagnóstico edge-tts eliminado para agilizar el arranque

    try {
      createWindow();
      console.log('[electron-main] Main window created');
    } catch (error) {
      console.error('[electron-main] Error creating main window:', error);
    }

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) {
        createSplashWindow();
        createWindow();
      }
    });
  });
}


app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// --- Error dialog with copy button ---
function showErrorDialog(title, message) {
  const errorWindow = new BrowserWindow({
    width: 700,
    height: 500,
    title: title || 'Error',
    icon: resolveIconPath(),
    backgroundColor: '#1e1e2e',
    modal: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const escapedTitle = (title || 'Error').replace(/</g, '&lt;');
  const escapedMsg = (message || 'Unknown error').replace(/</g, '&lt;').replace(/\n/g, '<br>');

  errorWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<!doctype html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', sans-serif; background: #1e1e2e; color: #cdd6f4; padding: 24px; display: flex; flex-direction: column; height: 100vh; }
  h1 { font-size: 18px; color: #f38ba8; margin-bottom: 12px; }
  .msg { flex: 1; overflow: auto; background: #181825; border: 1px solid #313244; border-radius: 8px; padding: 16px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; margin-bottom: 16px; }
  .btns { display: flex; gap: 10px; }
  button { flex: 1; padding: 10px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity .15s; }
  .copy { background: #89b4fa; color: #1e1e2e; }
  .copy:hover { opacity: .85; }
  .close { background: #45475a; color: #cdd6f4; }
  .close:hover { opacity: .85; }
  .copied { background: #a6e3a1; color: #1e1e2e; }
</style>
</head>
<body>
  <h1>${escapedTitle}</h1>
  <div class="msg" id="msg">${escapedMsg}</div>
  <div class="btns">
    <button class="copy" id="copyBtn" onclick="copyText()">Copiar texto</button>
    <button class="close" onclick="window.close()">Cerrar</button>
  </div>
  <script>
    const rawText = ${JSON.stringify(message || 'Unknown error')};
    const { clipboard } = require('electron');
    function copyText() {
      clipboard.writeText(rawText);
      const btn = document.getElementById('copyBtn');
      btn.textContent = 'Copiado!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copiar texto'; btn.classList.remove('copied'); }, 2000);
    }
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const sel = window.getSelection().toString();
        if (sel) clipboard.writeText(sel);
      }
    });
  </script>
</body>
</html>`));
}