/**
 * EngineTranslator.ts
 *
 * Módulo responsable de encontrar y normalizar la memoria de motores externos,
 * y de traducirla al formato de aprendizaje que utiliza DxA.47.
 * Esto actúa como la "capa comunicadora" que adapta datos distintos de cada
 * motor a una representación común.
 */

export function normalizeEngineNameForStorage(engineName: string): string {
  let normalized = String(engineName || "").trim();
  if (normalized === "DxA.47" || normalized === "DxA.26") normalized = "DxA47";
  normalized = normalized.replace(/[^a-zA-Z0-9]/g, "_");
  return normalized;
}

function getIpcRenderer(): any | null {
  try {
    return (window as any).require?.("electron")?.ipcRenderer ?? null;
  } catch {
    return null;
  }
}

function resolveEngineDataPath(): string | null {
  try {
    const ipc = getIpcRenderer();
    if (!ipc) return null;
    return ipc.sendSync("get-engine-data-path-sync") ?? null;
  } catch {
    return null;
  }
}

function buildFilePath(dir: string, name: string): string {
  try {
    const path = (window as any).require("path");
    return path.join(dir, `engine_memory_${name.replace(/[^a-zA-Z0-9]/g, "_")}.json`);
  } catch {
    return "";
  }
}

function ipcReadSync(filePath: string): string | null {
  try {
    const ipc = getIpcRenderer();
    if (!ipc || !filePath) return null;
    const raw = ipc.sendSync("engine-memory-read-sync", filePath);
    return typeof raw === "string" ? raw : null;
  } catch {
    return null;
  }
}

function tryLocalStorageForEngine(engineName: string): string | null {
  const normalized = normalizeEngineNameForStorage(engineName);
  const candidates = [
    `gm3000_mem_v3_${normalized}`,
    `gm3000_mem_v3_${engineName.replace(/[^a-zA-Z0-9]/g, "_")}`,
    `gm3000_mem_v3_${engineName}`,
    `dx47_memory_v4_${normalized}`,
    `dx47_memory_v3_${normalized}`,
    `dx47_memory_${normalized}`,
  ];
  for (const key of candidates) {
    try {
      const raw = localStorage.getItem(key);
      if (raw && raw.length > 10) return raw;
    } catch {
      // continue
    }
  }
  return null;
}

function tryFileStorageForEngine(engineName: string): string | null {
  const dir = resolveEngineDataPath();
  if (!dir) return null;
  const normalized = normalizeEngineNameForStorage(engineName);
  const candidates = [
    { name: `engine_memory_${normalized}.json`, useBuildPath: true },
    { name: `engine_memory_${engineName.replace(/[^a-zA-Z0-9]/g, "_")}.json`, useBuildPath: true },
    { name: `dx47_memory_${normalized}.json`, useBuildPath: false },
  ];
  for (const candidate of candidates) {
    let filePath = "";
    if (candidate.useBuildPath) {
      filePath = buildFilePath(dir, candidate.name.replace(/\.json$/, ""));
    } else {
      try {
        const path = (window as any).require("path");
        filePath = path.join(dir, candidate.name);
      } catch {
        filePath = "";
      }
    }
    const raw = ipcReadSync(filePath);
    if (raw && raw.length > 10) return raw;
  }
  return null;
}

function convertLegacyEntry(entry: any): [string, any] | null {
  if (Array.isArray(entry) && entry.length >= 2 && typeof entry[0] === "string") {
    return [entry[0], entry[1]];
  }
  if (entry && typeof entry === "object" && typeof entry.fen === "string" && typeof entry.move === "string") {
    const rawValue = {
      winWeight: entry.winWeight ?? 0,
      errorWeight: entry.errorWeight ?? 0,
      tdWeight: entry.tdWeight ?? entry.avgDelta ?? 0,
      visits: entry.visits ?? 1,
      lastSeen: entry.lastSeen ?? Date.now(),
    };
    return [`${entry.fen}:${entry.move}`, rawValue];
  }
  return null;
}

function translateExternalEnginePayload(engineName: string, payload: any): any | null {
  if (!payload || typeof payload !== "object") return null;

  if (Array.isArray(payload.learnMap)) return payload;
  if (payload.memory && Array.isArray(payload.memory.learnMap)) {
    return {
      ...payload,
      learnMap: payload.memory.learnMap,
    };
  }
  if (Array.isArray(payload.entries)) {
    const learnMap = payload.entries
      .map(convertLegacyEntry)
      .filter((entry): entry is [string, any] => entry !== null);
    if (learnMap.length > 0) return { ...payload, learnMap };
  }
  if (Array.isArray(payload.patterns)) {
    const learnMap = payload.patterns
      .map((entry: any) => convertLegacyEntry(entry))
      .filter((entry): entry is [string, any] => entry !== null);
    if (learnMap.length > 0) return { ...payload, learnMap };
  }

  const normalized = normalizeEngineNameForStorage(engineName).toLowerCase();
  if (normalized.includes("maia")) {
    const learnMap = Array.isArray(payload.moves)
      ? payload.moves.map(convertLegacyEntry).filter((entry): entry is [string, any] => entry !== null)
      : [];
    if (learnMap.length > 0) return { ...payload, learnMap };
  }

  return payload;
}

export function loadExternalEnginePayload(engineName: string): any | null {
  let raw = tryLocalStorageForEngine(engineName);
  if (!raw) raw = tryFileStorageForEngine(engineName);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw);
    return translateExternalEnginePayload(engineName, payload);
  } catch {
    return null;
  }
}
