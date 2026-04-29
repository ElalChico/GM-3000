/**
 * GM-3000 LAN Relay Server
 * Corre en el puerto 3001 para permitir partidas en red local.
 * No requiere internet. Usar: npm run server
 */
import express from "express";
import { networkInterfaces } from "os";
import { createServer } from "http";

const app = express();
app.use(express.json());

// --- CORS manual (sin paquete extra) ---
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  next();
});

// --- Estado del servidor ---
interface Player { id: string; color: "white" | "black"; ip: string; name: string; }
interface GameEvent {
  id: number;
  type: "move" | "state" | "chat" | "ping";
  playerId: string;
  data: any;
  ts: number;
}

let players: Player[] = [];
let events: GameEvent[] = [];
let eventCounter = 0;
let gameState: any = {
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  history: [],
  whiteTime: 600,
  blackTime: 600,
  hasStarted: false,
  whitePlayer: "human",
  blackPlayer: "human",
  boardOrientation: "white",
};

function getLocalIPs() {
  const ifaces = networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] ?? []) {
      if (iface.family === "IPv4" && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

function pushEvent(type: GameEvent["type"], playerId: string, data: any) {
  eventCounter++;
  events.push({ id: eventCounter, type, playerId, data, ts: Date.now() });
  // Mantener máximo 1000 eventos
  if (events.length > 1000) events = events.slice(-1000);
}

// --- Endpoints ---

/** Info del servidor: IPs y jugadores conectados */
app.get("/info", (_req, res) => {
  res.json({ ips: getLocalIPs(), players, eventCounter });
});

/** Health check para auto-descubrimiento */
app.get("/ping", (_req, res) => {
  res.json({ gm3000: true, ips: getLocalIPs(), hostName: players.length > 0 ? players[0].name : "Sala de Juego", hasHost: players.length > 0 });
});

/** Lista de jugadores conectados */
app.get("/players", (_req, res) => {
  res.json({ players });
});

/** Unirse a la sala */
app.post("/join", (req, res) => {
  const { playerId, preferredColor, name } = req.body as { playerId: string; preferredColor?: "white" | "black"; name?: string };
  const ip = req.ip || "?";
  const playerName = name || `Jugador-${playerId.slice(3, 7)}`;

  // Si ya está conectado, actualizar nombre y devolver su info
  const existing = players.find(p => p.id === playerId);
  if (existing) {
    if (name) existing.name = name;
    res.json({ ok: true, color: existing.color });
    return;
  }

  // Asignar color
  const takenColors = players.map(p => p.color);
  let assignedColor: "white" | "black";

  if (preferredColor && !takenColors.includes(preferredColor)) {
    assignedColor = preferredColor;
  } else if (!takenColors.includes("white")) {
    assignedColor = "white";
  } else if (!takenColors.includes("black")) {
    assignedColor = "black";
  } else {
    // Más de 2 jugadores: asignar como espectador (color "white" por defecto, observador)
    assignedColor = "white";
  }

  players.push({ id: playerId, color: assignedColor, ip, name: playerName });
  console.log(`[LAN] Jugador conectado: ${playerName} (${playerId}) → ${assignedColor} (${ip})`);
  pushEvent("state", "server", { type: "player_joined", color: assignedColor, name: playerName, playerId });

  res.json({ ok: true, color: assignedColor });
});

/** Desconectarse */
app.post("/leave", (req, res) => {
  const { playerId } = req.body;
  const leaving = players.find(p => p.id === playerId);
  players = players.filter(p => p.id !== playerId);
  pushEvent("state", "server", { type: "player_left", playerId, name: leaving?.name });
  console.log(`[LAN] Jugador desconectado: ${leaving?.name || playerId}`);

  // Limpiar el estado del juego si la sala se vacía por completo
  if (players.length === 0) {
    gameState = {
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      history: [],
      whiteTime: 600,
      blackTime: 600,
      hasStarted: false,
      whitePlayer: "human",
      blackPlayer: "human",
      boardOrientation: "white",
    };
    events = [];
    eventCounter = 0;
    console.log("[LAN] Sala vacía. Estado del juego reiniciado.");
  }

  res.json({ ok: true });
});

/** Obtener estado completo del juego */
app.get("/state", (req, res) => {
  const playerId = req.query.playerId as string;
  const player = players.find(p => p.id === playerId);
  const boardOrientation = player?.color || "white";
  res.json({ ...gameState, players, eventCounter, boardOrientation });
});

/** El host actualiza el estado del juego */
app.post("/state", (req, res) => {
  gameState = { ...gameState, ...req.body };
  pushEvent("state", req.body.playerId || "host", req.body);
  res.json({ ok: true });
});

/** Enviar un movimiento */
app.post("/move", (req, res) => {
  const { playerId, move, fen, history, whiteTime, blackTime } = req.body;
  // Actualizar estado
  if (fen) gameState.fen = fen;
  if (history) gameState.history = history;
  if (whiteTime !== undefined) gameState.whiteTime = whiteTime;
  if (blackTime !== undefined) gameState.blackTime = blackTime;
  pushEvent("move", playerId, { move, fen, history, whiteTime, blackTime });
  console.log(`[LAN] Movimiento: ${playerId} → ${move?.from}${move?.to}`);
  res.json({ ok: true, id: eventCounter });
});

/** Polling: obtener eventos nuevos desde un ID */
app.get("/events", (req, res) => {
  const since = parseInt(req.query.since as string) || 0;
  const requesterId = req.query.playerId as string;
  // Devolver solo eventos de otros jugadores
  const newEvents = events.filter(e => e.id > since && e.playerId !== requesterId);
  res.json({ events: newEvents, lastId: eventCounter, players });
});

/** Reiniciar sala */
app.post("/reset", (req, res) => {
  players = [];
  events = [];
  eventCounter = 0;
  gameState = {
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    history: [],
    whiteTime: 600,
    blackTime: 600,
    hasStarted: false,
    whitePlayer: "human",
    blackPlayer: "human",
    boardOrientation: "white",
  };
  res.json({ ok: true });
});

// --- Función de inicio (Exportada para Electron) ---
export function startLanServer() {
  const PORT = 3001;
  const server = createServer(app);
  server.listen(PORT, "0.0.0.0", () => {
    console.log("\n╔══════════════════════════════════════╗");
    console.log("║   GM-3000 — Servidor LAN (Puerto 3001) ║");
    console.log("╚══════════════════════════════════════╝\n");
    console.log("Comparte una de estas IPs con el otro jugador:\n");
    getLocalIPs().forEach(ip => console.log(`  → http://${ip}:3001`));
    console.log("\nEsperando jugadores...\n");
  });
  return server;
}

// Iniciar automáticamente si se ejecuta este archivo directamente (desde terminal)
import { fileURLToPath } from "url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startLanServer();
}
