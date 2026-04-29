/**
 * useLanMultiplayer.ts
 * Hook React para conectar GM-3000 al servidor LAN relay.
 * Funciona en desarrollo (navegador) y en Electron sin cambios.
 */
import { useRef, useState, useCallback, useEffect } from "react";

export type LanRole = "idle" | "host" | "guest";
export type LanStatus = "disconnected" | "connecting" | "connected" | "error";
export type LanColor = "white" | "black";

export interface LanMove {
  move?: { from: string; to: string; promotion?: string };
  fen?: string;
  history?: string[];
  whiteTime?: number;
  blackTime?: number;
}

export interface LanGameState {
  fen: string;
  history: string[];
  whiteTime: number;
  blackTime: number;
  hasStarted: boolean;
  whitePlayer: string;
  blackPlayer: string;
  boardOrientation: string;
  gameResult?: string | null;
  isPaused?: boolean;
  timeControlIndex?: number;
  isPreparing?: boolean;
}

export interface LanPlayer {
  id: string;
  color: LanColor;
  name?: string;
}

interface UseLanMultiplayerOptions {
  onMoveReceived: (move: LanMove) => void;
  onStateReceived: (state: LanGameState) => void;
  onPlayerJoined: (color: LanColor) => void;
  onPlayerLeft: () => void;
}

const POLL_INTERVAL = 500; // ms

export function useLanMultiplayer({
  onMoveReceived,
  onStateReceived,
  onPlayerJoined,
  onPlayerLeft,
}: UseLanMultiplayerOptions) {
  const [role, setRole] = useState<LanRole>("idle");
  const [status, setStatus] = useState<LanStatus>("disconnected");
  const [myColor, setMyColor] = useState<LanColor>("white");
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [localIps, setLocalIps] = useState<string[]>([]);
  const [hostIp, setHostIp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [scanResults, setScanResults] = useState<{ip: string, name: string}[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedPlayers, setConnectedPlayers] = useState<LanPlayer[]>([]);

  const serverUrlRef = useRef("");
  const playerIdRef = useRef<string>("");
  if (!playerIdRef.current) {
    const saved = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("gm3000_lan_player_id") : null;
    if (saved) {
      playerIdRef.current = saved;
    } else {
      const newId = `gm-${Math.random().toString(36).slice(2, 8)}`;
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem("gm3000_lan_player_id", newId);
      playerIdRef.current = newId;
    }
  }
  const lastEventIdRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roleRef = useRef<LanRole>("idle");

  // Usar refs para callbacks para evitar recreaciones de pollEvents
  const onMoveReceivedRef = useRef(onMoveReceived);
  const onStateReceivedRef = useRef(onStateReceived);
  const onPlayerJoinedRef = useRef(onPlayerJoined);
  const onPlayerLeftRef = useRef(onPlayerLeft);

  useEffect(() => { onMoveReceivedRef.current = onMoveReceived; }, [onMoveReceived]);
  useEffect(() => { onStateReceivedRef.current = onStateReceived; }, [onStateReceived]);
  useEffect(() => { onPlayerJoinedRef.current = onPlayerJoined; }, [onPlayerJoined]);
  useEffect(() => { onPlayerLeftRef.current = onPlayerLeft; }, [onPlayerLeft]);

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };

  // ── Polling de eventos (SIN dependencias que cambien → no se recrea nunca) ──
  const pollEvents = useCallback(async () => {
    if (!serverUrlRef.current) return;
    try {
      const url = `${serverUrlRef.current}/events?since=${lastEventIdRef.current}&playerId=${playerIdRef.current}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return;
      const data = await res.json();

      // Actualizar lista de jugadores conectados
      if (data.players) {
        setConnectedPlayers(data.players);
        // El oponente está conectado si hay más de 1 jugador Y no soy el único
        // O si hay exactamente 1 jugador que NO soy yo
        const otherPlayers = data.players.filter((p: LanPlayer) => p.id !== playerIdRef.current);
        setOpponentConnected(otherPlayers.length > 0);
      }

      if (!data.events?.length) return;

      for (const ev of data.events) {
        if (ev.type === "move") {
          onMoveReceivedRef.current(ev.data);
        } else if (ev.type === "state") {
          if (ev.data.type === "player_joined") {
            // Notificar que alguien serió
            setConnectedPlayers(prev => {
              if (!prev.some(p => p.id === ev.playerId)) {
                return [...prev, { id: ev.playerId, color: ev.data.color, name: ev.data.name }];
              }
              return prev;
            });
            setOpponentConnected(true);
            onPlayerJoinedRef.current(ev.data.color);
          } else if (ev.data.type === "player_left") {
            setConnectedPlayers(prev => prev.filter(p => p.id !== ev.playerId));
            // Verificar si quedan otros jugadores
            const remaining = data.players?.filter((p: LanPlayer) => p.id !== playerIdRef.current) || [];
            setOpponentConnected(remaining.length > 0);
            onPlayerLeftRef.current();
          } else {
            onStateReceivedRef.current(ev.data);
          }
        }
      }
      lastEventIdRef.current = data.lastId;
    } catch (_e) {
      // timeout o conexión caída — no hacer nada, seguir intentando
    }
  }, []); // Sin dependencias → función estable, el setInterval nunca se recrea

  // ── Iniciar servidor (HOST) ─────────────────────────────────────
  const startHost = useCallback(async (preferredColor: LanColor, playerName?: string) => {
    // Siempre conectar via localhost para el host
    serverUrlRef.current = "http://localhost:3001";
    roleRef.current = "host";
    setRole("host");
    setStatus("connecting");
    setErrorMsg("");

    try {
      // Verificar que el servidor LAN está corriendo
      const info = await fetch(`${serverUrlRef.current}/info`, {
        signal: AbortSignal.timeout(2000),
      }).then(r => r.json());

      setLocalIps(info.ips || []);
      setConnectedPlayers(info.players || []);
      setOpponentConnected((info.players || []).length > 1);
      
      // Unirse como host
      const join = await fetch(`${serverUrlRef.current}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: playerIdRef.current, preferredColor, name: playerName }),
        signal: AbortSignal.timeout(2000),
      }).then(r => r.json());

      if (!join.ok) throw new Error(join.error || "Error al unirse");

      setMyColor(join.color);
      
      // Obtener estado actual del juego (por si estamos reconectando a una partida en curso)
      const state = await fetch(`${serverUrlRef.current}/state?playerId=${playerIdRef.current}`, {
        signal: AbortSignal.timeout(2000),
      }).then(r => r.json());

      setStatus("connected");
      lastEventIdRef.current = state.eventCounter || 0;
      onStateReceivedRef.current(state);

      stopPolling(); // por si ya existía uno
      pollingRef.current = setInterval(pollEvents, POLL_INTERVAL);
    } catch (e: any) {
      setStatus("error");
      if (e.name === "TimeoutError") {
        setErrorMsg("Tiempo de espera agotado. Verifica el Firewall de Windows en el equipo Host para permitir el puerto 3001.");
      } else {
        setErrorMsg("Servidor LAN no encontrado. Ejecuta: npm run server (desde la carpeta del proyecto)");
      }
      roleRef.current = "idle";
      setRole("idle");
    }
  }, [pollEvents]);

  // ── Unirse a host (GUEST) ───────────────────────────────────────
  const joinHost = useCallback(async (ip: string, preferredColor: LanColor, playerName?: string) => {
    const url = `http://${ip}:3001`;
    serverUrlRef.current = url;
    roleRef.current = "guest";
    setRole("guest");
    setStatus("connecting");
    setHostIp(ip);
    setErrorMsg("");

    try {
      const join = await fetch(`${url}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: playerIdRef.current, preferredColor, name: playerName }),
        signal: AbortSignal.timeout(5000),
      }).then(r => r.json());

      if (!join.ok) throw new Error(join.error || "Sala llena o error al unirse");

      setMyColor(join.color);

      // Obtener estado actual del juego
      const state = await fetch(`${url}/state?playerId=${playerIdRef.current}`, {
        signal: AbortSignal.timeout(2000),
      }).then(r => r.json());

      setStatus("connected");
      lastEventIdRef.current = state.eventCounter || 0;
      setConnectedPlayers(state.players || []);
      setOpponentConnected((state.players || []).length > 1);
      onStateReceivedRef.current(state);
      stopPolling();
      pollingRef.current = setInterval(pollEvents, POLL_INTERVAL);
    } catch (e: any) {
      setStatus("error");
      if (e.name === "TimeoutError") {
        setErrorMsg(`Tiempo agotado conectando a ${ip}. Verifica el Firewall del host.`);
      } else {
        setErrorMsg(`No se pudo conectar a ${ip}:3001 — ${e.message}`);
      }
      roleRef.current = "idle";
      setRole("idle");
    }
  }, [pollEvents]);

  // ── Enviar un movimiento ────────────────────────────────────────
  const sendMove = useCallback(async (moveData: LanMove) => {
    if (!serverUrlRef.current) return;
    try {
      await fetch(`${serverUrlRef.current}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...moveData, playerId: playerIdRef.current }),
        signal: AbortSignal.timeout(2000),
      });
    } catch (_e) {}
  }, []);

  // ── Sincronizar estado completo (cualquier jugador puede notificar rendición, pausa, etc) ──
  const sendState = useCallback(async (state: Partial<LanGameState>) => {
    if (!serverUrlRef.current) return;
    try {
      await fetch(`${serverUrlRef.current}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...state, playerId: playerIdRef.current }),
        signal: AbortSignal.timeout(2000),
      });
    } catch (_e) {}
  }, []);

  // ── Desconectarse ───────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    stopPolling();
    if (serverUrlRef.current) {
      try {
        await fetch(`${serverUrlRef.current}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: playerIdRef.current }),
          signal: AbortSignal.timeout(1000),
        });
      } catch (_e) {}
    }
    serverUrlRef.current = "";
    lastEventIdRef.current = 0;
    roleRef.current = "idle";
    playerIdRef.current = `gm-${Math.random().toString(36).slice(2, 8)}`;
    setRole("idle");
    setStatus("disconnected");
    setOpponentConnected(false);
    setHostIp("");
    setErrorMsg("");
    setLocalIps([]);
    setConnectedPlayers([]);
    setScanResults([]);
  }, []);

  // ── Auto-escaneo de IPs de la red local ────────────────────────
  const scanNetwork = useCallback(async () => {
    setIsScanning(true);
    setScanResults([]);
    const found: {ip: string, name: string}[] = [];

    let subnet = "192.168.1";
    let hasLocalServer = false;
    
    try {
      const pingRes = await fetch("http://localhost:3001/ping", {
        signal: AbortSignal.timeout(1000),
      }).then(r => r.json());
      
      hasLocalServer = true;
      if (pingRes.ips?.[0]) {
        const parts = pingRes.ips[0].split(".");
        subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
      }
      
      // Si hay servidor local Y ya tiene host, agregarlo
      if (pingRes.gm3000 && pingRes.hasHost) {
        const localIp = "127.0.0.1";
        setScanResults([{ ip: localIp, name: pingRes.hostName || "Tu Servidor Local" }]);
        found.push({ ip: localIp, name: pingRes.hostName || "Tu Servidor Local" });
      }
    } catch (_e) {
      // Si no hay servidor local, ignorar
    }

    // Escanear subred en paralelo (por lotes de 30 para mayor velocidad)
    const BATCH = 30;
    for (let start = 1; start <= 254; start += BATCH) {
      const batch: Promise<void>[] = [];
      for (let i = start; i < start + BATCH && i <= 254; i++) {
        if (hasLocalServer && i === 1) continue; // Already scanned localhost
        const ip = `${subnet}.${i}`;
        batch.push(
          fetch(`http://${ip}:3001/ping`, { signal: AbortSignal.timeout(600) })
            .then(r => r.json())
            .then(d => {
              if (d.gm3000 && d.hasHost) {
                setScanResults(prev => {
                  if (!prev.some(r => r.ip === ip)) {
                    return [...prev, { ip, name: d.hostName || "Sala" }];
                  }
                  return prev;
                });
              }
            })
            .catch(() => {})
        );
      }
      await Promise.all(batch);
    }

    setIsScanning(false);
    return found;
  }, []);

  // ── Obtener la lista de jugadores del servidor ──────────────────
  const fetchPlayers = useCallback(async () => {
    if (!serverUrlRef.current) return [];
    try {
      const res = await fetch(`${serverUrlRef.current}/players`, {
        signal: AbortSignal.timeout(2000),
      });
      const data = await res.json();
      setConnectedPlayers(data.players || []);
      return data.players || [];
    } catch (_e) {
      return [];
    }
  }, []);

  // Limpieza al desmontar y al cerrar la ventana
  useEffect(() => {
    const handleUnload = () => {
      if (serverUrlRef.current && playerIdRef.current) {
        // Enviar petición de desconexión al cerrar la pestaña
        fetch(`${serverUrlRef.current}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: playerIdRef.current }),
          keepalive: true,
        }).catch(() => {});
      }
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      stopPolling();
    };
  }, []);

  return {
    role,
    status,
    myColor,
    opponentConnected,
    localIps,
    hostIp,
    errorMsg,
    scanResults,
    isScanning,
    connectedPlayers,
    playerId: playerIdRef.current,
    startHost,
    joinHost,
    sendMove,
    sendState,
    disconnect,
    scanNetwork,
    fetchPlayers,
  };
}
