export type LegacyLanColor = "white" | "black";

export interface LegacyLanPlayer {
  id: string;
  color: LegacyLanColor;
  name?: string;
  photoUrl?: string;
  confirmed?: boolean;
}

export function normalizeLanColor(color: any): LegacyLanColor | undefined {
  if (!color || typeof color !== "string") return undefined;
  const normalized = color.toLowerCase();
  if (normalized === "white" || normalized === "w") return "white";
  if (normalized === "black" || normalized === "b") return "black";
  return undefined;
}

export function normalizeLanPlayers(players: any[], selfId: string): LegacyLanPlayer[] {
  if (!Array.isArray(players)) return [];
  return players.map((player: any) => ({
    id: String(player.id || ""),
    color: normalizeLanColor(player.color) || "white",
    name: player.name,
    photoUrl: player.photoUrl,
    confirmed: player.confirmed,
  })).filter(player => player.id !== "");
}

export function extractLanColorFromJoinResponse(response: any): LegacyLanColor | undefined {
  if (!response || typeof response !== "object") return undefined;
  return normalizeLanColor(
    response.guestColor || response.hostColor || response.color || response.playerColor || response.preferredColor
  );
}

export function areOpponentsConnected(players: any[], selfId: string): boolean {
  // Considerar al oponente conectado si hay al menos otro jugador en la lista.
  // Esto previene que el invitado no pueda ver al host si el campo confirmed no está establecido.
  const others = normalizeLanPlayers(players, selfId).filter((p) => p.id !== selfId);
  return others.length > 0;
}

export function resolveLastEventId(data: any): number {
  if (!data || typeof data !== "object") return 0;
  if (typeof data.lastId === "number") return data.lastId;
  if (typeof data.eventCounter === "number") return data.eventCounter;
  return 0;
}

export function isLegacyJoinResponse(response: any): boolean {
  return response && typeof response === "object" && response.ok !== undefined && response.status === undefined;
}

export async function detectServerVersion(serverUrl: string): Promise<"legacy" | "modern"> {
  try {
    const res = await fetch(`${serverUrl}/info`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return "modern";
    }
    const data = await res.json();
    if (data && typeof data === "object") {
      if (data.pendingRequests !== undefined || data.hasHost !== undefined) {
        return "modern";
      }
      return "legacy";
    }
    return "modern";
  } catch (_e) {
    try {
      const res = await fetch(`${serverUrl}/ping`, {
        method: "GET",
        signal: AbortSignal.timeout(1000),
      });
      if (!res.ok) return "modern";
      const data = await res.json();
      if (data && typeof data === "object" && data.gm3000 === true) {
        return "legacy";
      }
    } catch (_e2) {
      // No hay servidor, asumimos moderno para no cambiar la lógica
    }
    return "modern";
  }
}
