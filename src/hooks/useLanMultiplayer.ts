/**
 * useLanMultiplayer.ts
 * Hook React para conectar GM-3000 al servidor LAN relay.
 *
 * Flujo de estados:
 *   idle â†’ (host crea sala) â†’ waiting_for_opponent â†’ (guest aceptado) â†’ connected
 *   idle â†’ (guest envía solicitud) â†’ waiting_approval â†’ (host acepta) â†’ connected
 */
import { useRef, useState, useCallback, useEffect } from "react";
import { normalizeLanColor, extractLanColorFromJoinResponse, normalizeLanPlayers, areOpponentsConnected, resolveLastEventId, detectServerVersion } from "./lanMultiplayerCompat";

export type LanRole = "idle" | "host" | "guest";
export type LanStatus =
  | "disconnected"
  | "connecting"
  | "waiting_for_opponent"   // host espera que alguien se una
  | "waiting_approval"        // guest espera que el host lo acepte
  | "connected"
  | "error";
export type LanColor = "white" | "black";
export type LanPreferredColor = "white" | "black" | "random";

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
  tournament?: any;
  initialTimeMin?: number;
}

export interface LanPlayer {
  id: string;
  color: LanColor;
  name?: string;
  photoUrl?: string;
  confirmed?: boolean;
}

export interface LanJoinRequest {
  playerId: string;
  name: string;
  photoUrl?: string;
  preferredColor: LanPreferredColor;
  color?: LanPreferredColor; // Alias para compatibilidad con la UI
}



interface UseLanMultiplayerOptions {
  onMoveReceived: (move: LanMove) => void;
  onStateReceived: (state: LanGameState) => void;
  onPlayerJoined: (color: LanColor) => void;
  onPlayerLeft: () => void;
}

// Intervalo de polling: 200ms — reduce carga y evita bucles de polling demasiado agresivos
const POLL_INTERVAL = 200;

export function useLanMultiplayer({
  onMoveReceived,
  onStateReceived,
  onPlayerJoined,
  onPlayerLeft,
}: UseLanMultiplayerOptions) {
  const [role, setRole] = useState<LanRole>("idle");
  const [status, setStatus] = useState<LanStatus>("disconnected");
  const [myColor, setMyColor] = useState<LanColor>("white");
  const [opponentColor, setOpponentColor] = useState<LanColor | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [localIps, setLocalIps] = useState<string[]>([]);
  const [hostIp, setHostIp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [scanResults, setScanResults] = useState<{ ip: string, name: string, hostId?: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedPlayers, setConnectedPlayers] = useState<LanPlayer[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LanJoinRequest[]>([]);

  const serverUrlRef = useRef("");
  const playerIdRef = useRef<string>("");
  const serverVersionRef = useRef<"legacy" | "modern">("modern");
  const isLegacyModeRef = useRef(false);
  // Inicializar ID de jugador (persistente en sesión)
  if (!playerIdRef.current) {
    const saved = typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("gm3000_lan_player_id")
      : null;
    if (saved) {
      playerIdRef.current = saved;
    } else {
      const newId = `gm-${Math.random().toString(36).slice(2, 8)}`;
      if (typeof sessionStorage !== "undefined")
        sessionStorage.setItem("gm3000_lan_player_id", newId);
      playerIdRef.current = newId;
    }
  }

  const lastEventIdRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);
  const roleRef = useRef<LanRole>("idle");
  const scanAbortControllerRef = useRef<AbortController | null>(null);

  // Refs para callbacks â€” evitan recrear pollEvents al cambiar las funciones
  const onMoveReceivedRef = useRef(onMoveReceived);
  const onStateReceivedRef = useRef(onStateReceived);
  const onPlayerJoinedRef = useRef(onPlayerJoined);
  const onPlayerLeftRef = useRef(onPlayerLeft);

  useEffect(() => { onMoveReceivedRef.current = onMoveReceived; }, [onMoveReceived]);
  useEffect(() => { onStateReceivedRef.current = onStateReceived; }, [onStateReceived]);
  useEffect(() => { onPlayerJoinedRef.current = onPlayerJoined; }, [onPlayerJoined]);
  useEffect(() => { onPlayerLeftRef.current = onPlayerLeft; }, [onPlayerLeft]);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const syncCurrentServerEventCursor = useCallback(async () => {
    if (!serverUrlRef.current) return;
    try {
      const res = await fetch(`${serverUrlRef.current}/info`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return;
      const data = await res.json();
      // No sobrescribir el cursor de eventos automáticamente;
      // la sincronización de eventos debe hacerse a través de pollEvents para no perder
      // confirmaciones emitidas entre la consulta /info y el inicio de polling.
      if (data.pendingRequests && Array.isArray(data.pendingRequests)) {
        const normalized = data.pendingRequests.map((r: any) => ({
          ...r,
          color: r.color || r.preferredColor
        }));
        setPendingRequests(normalized);
      }
    } catch (_e) {
      // Ignorar errores de red; mantener cursor actual.
    }
  }, []);

  const syncCurrentGameState = useCallback(async () => {
    if (!serverUrlRef.current) return;
    try {
      const res = await fetch(`${serverUrlRef.current}/state?playerId=${encodeURIComponent(playerIdRef.current)}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return;
      const stateData = await res.json();
      if (stateData && typeof stateData === "object") {
        onStateReceivedRef.current(stateData);
      }
    } catch (_e) {
      // Ignore issues while attempting state sync.
    }
  }, []);

  // â”€â”€ Polling de eventos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pollEvents = useCallback(async () => {
    if (!serverUrlRef.current || isPollingRef.current) return;
    isPollingRef.current = true;
    try {
      const url = `${serverUrlRef.current}/events?since=${lastEventIdRef.current}&playerId=${playerIdRef.current}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(500) });
      if (!res.ok) { isPollingRef.current = false; return; }
      const data = await res.json();

      // Actualizar lista de jugadores
      if (data.players) {
        setConnectedPlayers(normalizeLanPlayers(data.players, playerIdRef.current));
        setOpponentConnected(areOpponentsConnected(data.players, playerIdRef.current));
      }

      // Actualizar solicitudes pendientes (solo el host las ve)
      if (data.pendingRequests !== undefined && Array.isArray(data.pendingRequests)) {
        const normalizedRequests = data.pendingRequests.map((r: any) => ({
          ...r,
          color: r.color || r.preferredColor // Asegurar que 'color' existe para la UI
        }));
        setPendingRequests(normalizedRequests);
      }

      if (data.boardOrientation !== undefined) {
        const normalized = normalizeLanColor(data.boardOrientation);
        if (normalized) {
          onStateReceivedRef.current({ boardOrientation: normalized });
        }
      }

      if (data.events?.length) {
        for (const ev of data.events) {
          if (ev.type === "move") {
            onMoveReceivedRef.current(ev.data);

          } else if (ev.type === "control") {
            // Evento de control (pausa, resume, stop, reset)
            // Se pasa como parte del estado del juego
            const controlData = {
              _isControl: true,
              type: "control",
              action: ev.data.action,
              isPaused: ev.data.isPaused,
              hasStarted: ev.data.hasStarted,
              ...ev.data
            };
            onStateReceivedRef.current(controlData as any);

          } else if (ev.type === "state") {
            const d = ev.data;

            if (d.type === "join_request" || d.type === "request_join") {
              // Solo el host actualiza las solicitudes pendientes
              if (roleRef.current === "host") {
                setPendingRequests(prev => {
                  if (!prev.some(r => r.playerId === (d.playerId || d.id))) {
                    return [...prev, { 
                      playerId: d.playerId || d.id, 
                      name: d.name || "Invitado", 
                      preferredColor: d.preferredColor || d.color || "random",
                      color: d.color || d.preferredColor || "random"
                    }];
                  }
                  return prev;
                });
              }
            } else if (d.type === "join_confirmed" || ev.type === "join_confirmed") {
              const guestId = String(d.guestId ?? d.playerId ?? d.id ?? "");
              const hostId = String(d.hostId ?? d.playerId ?? d.id ?? "");
              const guestAccepted = guestId === playerIdRef.current;
              const isHost = roleRef.current === "host";
              const isGuest = roleRef.current === "guest";

              if (isGuest) {
                const guestCol = d.guestColor ?? d.color ?? d.playerColor ?? "black";
                const hostCol = d.hostColor ?? d.color ?? d.hostPlayerColor ?? "white";
                setMyColor(guestCol);
                setOpponentColor(hostCol);
                setStatus("connected");
                setConnectedPlayers(normalizeLanPlayers(d.players || [], playerIdRef.current));
                setOpponentConnected(true);
                onPlayerJoinedRef.current(hostCol);
              }

              if (isHost) {
                const guestCol = d.guestColor ?? d.color ?? d.guestPlayerColor ?? "black";
                setOpponentColor(guestCol);
                setStatus("connected");
                setConnectedPlayers(normalizeLanPlayers(d.players || [], playerIdRef.current));
                setOpponentConnected(true);
                setPendingRequests(prev => prev.filter(r => r.playerId !== guestId));
                onPlayerJoinedRef.current(guestCol);
              }

            } else if (d.type === "join_rejected" || ev.type === "join_rejected") {
              const guestId = String(d.guestId ?? d.playerId ?? d.id ?? "");
              if (roleRef.current === "guest" && guestId === playerIdRef.current) {
                setStatus("error");
                setErrorMsg("El host rechazó tu solicitud de unión.");
                stopPolling();
                serverUrlRef.current = "";
                roleRef.current = "idle";
                setRole("idle");
              }

            } else if (d.type === "player_joined" || ev.type === "player_joined") {
              setConnectedPlayers(prev => {
                if (!prev.some(p => p.id === ev.playerId)) {
                  return [...prev, { id: ev.playerId, color: d.color, name: d.name }];
                }
                return prev;
              });

            } else if (d.type === "player_left" || d.type === "host_left") {
              setConnectedPlayers(prev => prev.filter(p => p.id !== (d.playerId || "")));
              const remaining = data.players?.filter((p: LanPlayer) => p.id !== playerIdRef.current) || [];
              setOpponentConnected(remaining.some((p: LanPlayer) => p.confirmed));
              onPlayerLeftRef.current();

            } else {
              // Estado de juego genérico — solo reenviar al callback, NO cambiar estado de conexión.
              // El guest solo pasa a "connected" cuando recibe un join_confirmed explícito del host.
              onStateReceivedRef.current(d);
            }
          }
        }
      }
      lastEventIdRef.current = resolveLastEventId(data);
    } catch (_e) {
      // Silenciar timeout o red caída
    } finally {
      isPollingRef.current = false;
    }
  }, []);

  // â”€â”€ Crear sala (HOST) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const startHost = useCallback(async (preferredColor: LanColor, playerName?: string, photoUrl?: string) => {
    serverUrlRef.current = "http://localhost:3001";
    roleRef.current = "host";
    setRole("host");
    setStatus("connecting");
    setErrorMsg("");
    setPendingRequests([]);

    try {
      // Detectar versión del servidor
      const version = await detectServerVersion(serverUrlRef.current);
      serverVersionRef.current = version;
      isLegacyModeRef.current = version === "legacy";

      if (version === "legacy") {
        // VERSIÓN VIEJA: Usar /join directo
        const res = await fetch(`${serverUrlRef.current}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId: playerIdRef.current,
            preferredColor,
            name: playerName,
            photoUrl,
          }),
          signal: AbortSignal.timeout(3000),
        }).then(r => r.json());

        if (!res.ok) throw new Error(res.error || "Error al unirse");

        setMyColor(res.color);
        
        // Obtener IPs del servidor
        const infoRes = await fetch(`${serverUrlRef.current}/info`, {
          signal: AbortSignal.timeout(2000),
        }).then(r => r.json());
        
        setLocalIps(infoRes.ips || []);
        setStatus("connected");
      } else {
        // VERSIÓN NUEVA: Usar /host con sistema de solicitudes
        const res = await fetch(`${serverUrlRef.current}/host`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId: playerIdRef.current,
            preferredColor,
            name: playerName,
            photoUrl,
          }),
          signal: AbortSignal.timeout(3000),
        }).then(r => r.json());

        if (!res.ok) throw new Error(res.error || "Error al crear sala");

        setMyColor(res.color);
        setLocalIps(res.ips || []);
        setStatus("waiting_for_opponent");
      }

      stopPolling();
      await pollEvents();
      pollingRef.current = setInterval(pollEvents, POLL_INTERVAL);
    } catch (e: any) {
      setStatus("error");
      if (e.name === "TimeoutError") {
        setErrorMsg("Tiempo agotado. Verifica que el Firewall permita el puerto 3001.");
      } else {
        setErrorMsg("Servidor LAN no encontrado. Por favor, verifica que el servidor esté corriendo.");
      }
      roleRef.current = "idle";
      setRole("idle");
    }
  }, [pollEvents]);

  // ── Enviar solicitud de unión (GUEST) ──────────────────────────────────────────────────────────
  const joinHost = useCallback(async (ip: string, preferredColor: LanPreferredColor, playerName?: string, photoUrl?: string) => {
    const url = `http://${ip}:3001`;
    serverUrlRef.current = url;
    roleRef.current = "guest";
    setRole("guest");
    setStatus("connecting");
    setHostIp(ip);
    setErrorMsg("");

    try {
      const version = await detectServerVersion(url);
      serverVersionRef.current = version;
      isLegacyModeRef.current = version === "legacy";

      if (version === "legacy") {
        const legacyResponse = await fetch(`${url}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId: playerIdRef.current,
            preferredColor,
            name: playerName,
            photoUrl,
          }),
          signal: AbortSignal.timeout(5000),
        });

        const res = await legacyResponse.json();
        const normalizedColor = extractLanColorFromJoinResponse(res);
        if (normalizedColor) setMyColor(normalizedColor);
        if (Array.isArray(res.players)) {
          setConnectedPlayers(normalizeLanPlayers(res.players, playerIdRef.current));
          setOpponentConnected(areOpponentsConnected(res.players, playerIdRef.current));
        }

        if (!legacyResponse.ok && res.ok === false) {
          throw new Error(res.error || "No se pudo enviar la solicitud");
        }

        const hasConfirmedOpponent = areOpponentsConnected(res.players || [], playerIdRef.current);
        if (hasConfirmedOpponent) {
          setStatus("connected");
          setOpponentConnected(true);
          await syncCurrentGameState();
        } else {
          setStatus("waiting_approval");
        }
      } else {
        const response = await fetch(`${url}/request-join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId: playerIdRef.current,
            preferredColor,
            name: playerName,
            photoUrl,
          }),
          signal: AbortSignal.timeout(5000),
        });

        const res = await response.json();
        const normalizedColor = extractLanColorFromJoinResponse(res);
        if (normalizedColor) setMyColor(normalizedColor);
        if (Array.isArray(res.players)) {
          setConnectedPlayers(normalizeLanPlayers(res.players, playerIdRef.current));
          setOpponentConnected(areOpponentsConnected(res.players, playerIdRef.current));
        }

        if (res.status === "confirmed") {
          setStatus("connected");
          setOpponentConnected(true);
          await syncCurrentGameState();
        } else {
          setStatus("waiting_approval");
        }
      }

      stopPolling();
      await pollEvents();
      pollingRef.current = setInterval(pollEvents, POLL_INTERVAL);
    } catch (e: any) {
      setStatus("error");
      if (e.name === "TimeoutError") {
        setErrorMsg(`Tiempo agotado conectando a ${ip}. Verifica el Firewall del host.`);
      } else {
        setErrorMsg(`No se pudo conectar a ${ip}:3001 â€” ${e.message}`);
      }
      serverUrlRef.current = "";
      roleRef.current = "idle";
      setRole("idle");
    }
  }, [pollEvents]);

  // â”€â”€ Aceptar solicitud de unión (solo HOST) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const acceptJoinRequest = useCallback(async (guestId: string) => {
    if (!serverUrlRef.current) return;
    try {
      // Intentar aceptar la solicitud
      const res = await fetch(`${serverUrlRef.current}/accept-join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: playerIdRef.current, guestId }),
        signal: AbortSignal.timeout(5000), // Aumentar timeout a 5s
      });
      
      const data = await res.json();
      
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "El servidor rechazó la solicitud de unión.");
      }
      
      // Limpiar de la lista local inmediatamente para feedback visual
      setPendingRequests(prev => prev.filter(r => r.playerId !== guestId));
      
      // Si el servidor ya nos devuelve que está conectado, actualizamos estado
      if (data.status === "connected" || data.connected) {
        setStatus("connected");
        setOpponentConnected(true);
      }

      if (Array.isArray(data.players)) {
        setConnectedPlayers(normalizeLanPlayers(data.players, playerIdRef.current));
        if (areOpponentsConnected(data.players, playerIdRef.current)) {
          setStatus("connected");
          setOpponentConnected(true);
        }
      }
      
      return data;
    } catch (e: any) {
      const msg = e?.message || "Error al conectar con el servidor.";
      setErrorMsg(msg);
      // Si hay error, mostramos el estado de error para que el usuario vea el mensaje
      setStatus("error");
      throw e;
    }
  }, []);

  // â”€â”€ Rechazar solicitud de unión (solo HOST) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const rejectJoinRequest = useCallback(async (guestId: string) => {
    if (!serverUrlRef.current) return;
    try {
      await fetch(`${serverUrlRef.current}/reject-join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: playerIdRef.current, guestId }),
        signal: AbortSignal.timeout(3000),
      });
      setPendingRequests(prev => prev.filter(r => r.playerId !== guestId));
    } catch (_e) { }
  }, []);

  // â”€â”€ Enviar movimiento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sendMove = useCallback(async (moveData: LanMove) => {
    if (!serverUrlRef.current) return;
    try {
      await fetch(`${serverUrlRef.current}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...moveData, playerId: playerIdRef.current }),
        signal: AbortSignal.timeout(2000),
      });
    } catch (_e) { }
  }, []);

  // â”€â”€ Sincronizar estado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sendState = useCallback(async (state: Partial<LanGameState>) => {
    if (!serverUrlRef.current) return;
    try {
      await fetch(`${serverUrlRef.current}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...state, playerId: playerIdRef.current }),
        signal: AbortSignal.timeout(2000),
      });
    } catch (_e) { }
  }, []);

  // â”€â”€ Desconectarse â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      } catch (_e) { }
    }
    serverUrlRef.current = "";
    lastEventIdRef.current = 0;
    roleRef.current = "idle";
    setRole("idle");
    setStatus("disconnected");
    setOpponentConnected(false);
    setHostIp("");
    setErrorMsg("");
    setLocalIps([]);
    setConnectedPlayers([]);
    setScanResults([]);
    setPendingRequests([]);
  }, []);

  // â”€â”€ Escaneo de red local â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const scanNetwork = useCallback(async () => {
    if (scanAbortControllerRef.current) {
      scanAbortControllerRef.current.abort();
      scanAbortControllerRef.current = null;
    }

    const controller = new AbortController();
    scanAbortControllerRef.current = controller;

    setIsScanning(true);
    setScanResults([]);

    let preferredSubnet = "192.168.1";
    let hasLocalServer = false;
    const candidateSubnets = new Set<string>();

    try {
      const pingRes = await fetch("http://localhost:3001/ping", {
        signal: AbortSignal.timeout(1000),
      }).then(r => r.json());

      hasLocalServer = true;
      if (pingRes.ips?.[0]) {
        const parts = pingRes.ips[0].split(".");
        if (parts.length >= 3) {
          preferredSubnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
        }
      }

      candidateSubnets.add(preferredSubnet);
      if (pingRes.gm3000 && pingRes.hasHost) {
        setScanResults([{ ip: "127.0.0.1", name: pingRes.hostName || "Tu Servidor Local", hostId: pingRes.hostId }]);
      }
    } catch (_e) { }

    ["192.168.1", "192.168.0", "10.0.0", "10.0.1", "172.16.0"].forEach(subnet => candidateSubnets.add(subnet));

    const scanSubnet = async (subnet: string) => {
      const BATCH = 30;
      for (let start = 1; start <= 254; start += BATCH) {
        if (!scanAbortControllerRef.current || scanAbortControllerRef.current.signal.aborted) return;
        const batch: Promise<void>[] = [];
        for (let i = start; i < start + BATCH && i <= 254; i++) {
          const ip = `${subnet}.${i}`;
          batch.push(
            new Promise<void>(async (resolve) => {
              if (!scanAbortControllerRef.current || scanAbortControllerRef.current.signal.aborted) {
                resolve();
                return;
              }

              const requestController = new AbortController();
              const timeoutId = setTimeout(() => requestController.abort(), 800);
              const onAbort = () => requestController.abort();
              scanAbortControllerRef.current?.signal.addEventListener("abort", onAbort);

              try {
                const res = await fetch(`http://${ip}:3001/ping`, { signal: requestController.signal });
                const d = await res.json();
                if (d.gm3000 && d.hasHost) {
                  setScanResults(prev => {
                    if (!prev.some(r => r.ip === ip || (r.hostId && r.hostId === d.hostId))) {
                      return [...prev, { ip, name: d.hostName || "Sala", hostId: d.hostId }];
                    }
                    return prev;
                  });
                }
              } catch (_e) {
                // Ignorar errores de red y abortos.
              } finally {
                clearTimeout(timeoutId);
                scanAbortControllerRef.current?.signal.removeEventListener("abort", onAbort);
                resolve();
              }
            })
          );
        }
      }
    };

    for (const subnet of Array.from(candidateSubnets)) {
      if (!scanAbortControllerRef.current || scanAbortControllerRef.current.signal.aborted) break;
      await scanSubnet(subnet);
    }

    scanAbortControllerRef.current = null;
    setIsScanning(false);
  }, []);

  const cancelScan = useCallback(() => {
    if (scanAbortControllerRef.current) {
      scanAbortControllerRef.current.abort();
      scanAbortControllerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const fetchPlayers = useCallback(async () => {
    if (!serverUrlRef.current) return [];
    try {
      const res = await fetch(`${serverUrlRef.current}/players`, {
        signal: AbortSignal.timeout(2000),
      });
      const data = await res.json();
      const normalizedPlayers = normalizeLanPlayers(data.players || [], playerIdRef.current);
      setConnectedPlayers(normalizedPlayers);
      return normalizedPlayers;
    } catch (_e) {
      return [];
    }
  }, []);

  // ── Eventos de Control (PAUSA, STOP, ETC.) ──
  const sendControl = useCallback(async (action: "pause" | "resume" | "stop" | "reset", data?: any) => {
    if (!serverUrlRef.current) return;
    try {
      // Asegurar que el payload incluya la intención de mostrar/ocultar el modal de pausa
      const payloadData = { ...(data || {}) };
      if (action === "pause" && payloadData.showPauseModal === undefined) payloadData.showPauseModal = true;
      if (action === "resume" && payloadData.showPauseModal === undefined) payloadData.showPauseModal = false;

      await fetch(`${serverUrlRef.current}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: playerIdRef.current,
          action,
          data: payloadData,
        }),
        signal: AbortSignal.timeout(2000),
      });
    } catch (_e) { }
  }, []);

  // ── Modo Espectador ──
  const generateSpectatorToken = useCallback(async (): Promise<string | null> => {
    if (!serverUrlRef.current || roleRef.current !== "host") return null;
    try {
      const res = await fetch(`${serverUrlRef.current}/spectator-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: playerIdRef.current }),
        signal: AbortSignal.timeout(2000),
      }).then(r => r.json());
      
      if (res.ok) return res.token;
    } catch (_e) { }
    return null;
  }, []);

  const joinAsSpectator = useCallback(async (ip: string, token: string, name?: string) => {
    const url = `http://${ip}:3001`;
    serverUrlRef.current = url;
    roleRef.current = "idle"; // Los espectadores no tienen rol de jugador
    setRole("idle");
    setStatus("connecting");
    setHostIp(ip);
    setErrorMsg("");

    try {
      const res = await fetch(`${url}/join-spectator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spectatorId: playerIdRef.current,
          token,
          name: name || `Espectador`,
        }),
        signal: AbortSignal.timeout(5000),
      }).then(r => r.json());

      if (!res.ok) {
        throw new Error(res.error || "No se pudo conectar como espectador");
      }

      setStatus("connected");
      setConnectedPlayers(normalizeLanPlayers(res.players || [], playerIdRef.current));
      lastEventIdRef.current = 0;
      stopPolling();
      pollingRef.current = setInterval(pollEvents, POLL_INTERVAL);
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(`No se pudo conectar como espectador: ${e.message}`);
      serverUrlRef.current = "";
      roleRef.current = "idle";
      setRole("idle");
    }
  }, [pollEvents]);

  const leaveAsSpectator = useCallback(async () => {
    if (!serverUrlRef.current) return;
    try {
      await fetch(`${serverUrlRef.current}/leave-spectator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spectatorId: playerIdRef.current }),
        signal: AbortSignal.timeout(1000),
      });
    } catch (_e) { }
    stopPolling();
    serverUrlRef.current = "";
    setStatus("disconnected");
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    const handleUnload = () => {
      if (serverUrlRef.current && playerIdRef.current) {
        fetch(`${serverUrlRef.current}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: playerIdRef.current }),
          keepalive: true,
        }).catch(() => { });
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      stopPolling();
    };
  }, []);

  // Sincronización extra para solicitudes de unión (Host)
  useEffect(() => {
    if (status === "waiting_for_opponent" && role === "host" && serverUrlRef.current) {
      const interval = setInterval(syncCurrentServerEventCursor, 1500);
      return () => clearInterval(interval);
    }
  }, [status, role, syncCurrentServerEventCursor]);

  return {
    role,
    status,
    myColor,
    opponentColor,
    opponentConnected,
    localIps,
    hostIp,
    errorMsg,
    scanResults,
    isScanning,
    connectedPlayers,
    pendingRequests,
    playerId: playerIdRef.current,
    startHost,
    joinHost,
    acceptJoinRequest,
    rejectJoinRequest,
    sendMove,
    sendState,
    disconnect,
    scanNetwork,
    cancelScan,
    fetchPlayers,
    fetchGameState: syncCurrentGameState,
    setMyColor,
    // Nuevos métodos para control
    sendControl,
  };
}

