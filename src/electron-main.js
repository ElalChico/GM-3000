// Importación del módulo para manejar eventos del instalador Squirrel (Windows)
import started from 'electron-squirrel-startup';

// Si la aplicación se lanza debido al instalador (--squirrel-install, etc.)
// se gestionan los accesos directos y se cierra el proceso inmediatamente.
if (started) {
  process.exit(0);
}

// Importaciones de Electron y módulos nativos
import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { networkInterfaces } from 'os';
import { createServer } from 'http';
import { URL } from 'url';

// --- SERVIDOR LAN INTEGRADO (sin dependencias externas) ---
let players = [];
let events = [];
let eventCounter = 0;
let gameState = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  history: [],
  whiteTime: 600,
  blackTime: 600,
  hasStarted: false,
  whitePlayer: 'human',
  blackPlayer: 'human',
  boardOrientation: 'white',
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
    });
  }

  if (req.method === 'GET' && pathname === '/players') {
    return sendJSON(res, { players });
  }

  if (req.method === 'POST' && pathname === '/join') {
    const body = await readBody(req);
    const { playerId, preferredColor, name } = body;
    const ip = req.socket.remoteAddress || '?';
    const playerName = name || `Jugador-${playerId.slice(3, 7)}`;
    const existing = players.find(p => p.id === playerId);
    if (existing) {
      if (name) existing.name = name;
      return sendJSON(res, { ok: true, color: existing.color });
    }
    const takenColors = players.map(p => p.color);
    let assignedColor;
    if (preferredColor && !takenColors.includes(preferredColor)) {
      assignedColor = preferredColor;
    } else if (!takenColors.includes('white')) {
      assignedColor = 'white';
    } else if (!takenColors.includes('black')) {
      assignedColor = 'black';
    } else {
      assignedColor = 'white';
    }
    players.push({ id: playerId, color: assignedColor, ip, name: playerName });
    pushEvent('state', 'server', { type: 'player_joined', color: assignedColor, name: playerName, playerId });
    return sendJSON(res, { ok: true, color: assignedColor });
  }

  if (req.method === 'POST' && pathname === '/leave') {
    const body = await readBody(req);
    const { playerId } = body;
    const leaving = players.find(p => p.id === playerId);
    players = players.filter(p => p.id !== playerId);
    pushEvent('state', 'server', { type: 'player_left', playerId, name: leaving?.name });
    if (players.length === 0) {
      gameState = {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        history: [],
        whiteTime: 600,
        blackTime: 600,
        hasStarted: false,
        whitePlayer: 'human',
        blackPlayer: 'human',
        boardOrientation: 'white',
      };
      events = [];
      eventCounter = 0;
    }
    return sendJSON(res, { ok: true });
  }

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

  if (req.method === 'GET' && pathname === '/events') {
    const since = parseInt(query.get('since')) || 0;
    const requesterId = query.get('playerId');
    const newEvents = events.filter(e => e.id > since && e.playerId !== requesterId);
    return sendJSON(res, { events: newEvents, lastId: eventCounter, players });
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

function createWindow() {
  Menu.setApplicationMenu(null);

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'GM3000 — Chess Engine',
    icon: process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL
      ? path.join(__dirname, '../public/assets/dark_cat.ico')
      : path.join(__dirname, '../renderer/main_window/assets/dark_cat.ico'),
    backgroundColor: '#0f172a',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#94a3b8',
      height: 32,
    },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/main_window/index.html'));
  }
}

app.whenReady().then(() => {
  console.log('Iniciando servidor LAN interno...');
  try {
    startLanServer();
  } catch (error) {
    console.error('Error al iniciar servidor LAN:', error);
  }

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});