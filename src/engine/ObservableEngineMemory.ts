/**
 * EngineMemory.ts
 *
 * Sistema de memoria y aprendizaje persistente para los motores experimentales.
 *
 * Almacenamiento:
 *   1. localStorage del navegador (siempre activo, funciona en Electron y en dev)
 *   2. Archivo JSON en engine_data/ (solo en Electron - persistencia adicional)
 *
 * Los motores llaman recordMove() al finalizar cada búsqueda, y el sistema
 * guarda automáticamente cada N entradas. El archivo en disco se sincroniza
 * periódicamente cuando se ejecuta dentro de Electron.
 */

export interface StrategicPattern {
  pawnStructure: string;
  pieceConfiguration: string;
  successfulPlans: Array<{
    description: string;
    moveSequence: string[];
    winRate: number;
    avgScore: number;
    visits: number;
  }>;
}

export interface OpponentProfile {
  name: string;
  style: "tactical" | "positional" | "aggressive" | "solid";
  weakAgainst: ("complications" | "endgames" | "time-pressure")[];
  openingRepertoire: string[];
  blunderRate: number;
}

export interface ThreatPattern {
  threatenedPieces: string[];
  tacticalMotif: string;
  outcome: string;
  confidence: number;
}

export interface MovePattern {
  fen: string;
  move: string;
  result: "win" | "loss" | "draw" | "error";
  score: number;
  depth: number;
  timestamp: number;
  visits: number;
}

interface LearnEntry {
  winWeight: number;
  errorWeight: number;
  tdWeight: number;
  visits: number;
  lastSeen: number;
}

// Parámetros de aprendizaje - editables manualmente para experimentar
const DECAY_HALF_LIFE_MS  = 30 * 24 * 60 * 60 * 1000; // 30 días
const MAX_LEARN_ENTRIES   = 15000;
const MAX_PATTERNS        = 5000;
const SAVE_QUOTA_BYTES    = 4_500_000; 
const DIRTY_SAVE_INTERVAL = 15;

function decayFactor(lastSeen: number): number {
  const age = Date.now() - lastSeen;
  return Math.exp(-age / DECAY_HALF_LIFE_MS);
}

// ---------------------------------------------------------------------------
// Capa IPC para acceso al sistema de archivos (solo Electron)
// ---------------------------------------------------------------------------

let _ipcRenderer: any = undefined; // undefined = no chequeado, null = no disponible

function getIpcRenderer(): any | null {
  if (_ipcRenderer !== undefined) return _ipcRenderer;
  try {
    _ipcRenderer = (window as any).require?.("electron")?.ipcRenderer ?? null;
  } catch {
    _ipcRenderer = null;
  }
  return _ipcRenderer;
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
    const r = ipc.sendSync("engine-memory-read-sync", filePath);
    return typeof r === "string" ? r : null;
  } catch {
    return null;
  }
}

function ipcWriteAsync(filePath: string, content: string): void {
  try {
    const ipc = getIpcRenderer();
    if (!ipc || !filePath) return;
    // No esperamos la respuesta — fire-and-forget para no bloquear
    ipc.invoke("engine-memory-write", filePath, content).catch(() => {});
  } catch {
    // Silencioso — el localStorage ya tiene los datos
  }
}

// ---------------------------------------------------------------------------
// Clase principal EngineMemory
// ---------------------------------------------------------------------------

export class EngineMemory {
  private readonly storageKey: string;
  private readonly memoryName: string;
  private readonly filePath: string;
  private readonly inElectron: boolean;

  private learnMap: Map<string, LearnEntry> = new Map();
  private recentHistory: MovePattern[] = [];
  private strategicPatterns: StrategicPattern[] = [];
  private threatHistory: ThreatPattern[] = [];
  private opponentProfiles: Map<string, OpponentProfile> = new Map();
  private dirtyCount = 0;
  private sessionId: string = Math.random().toString(36).substring(7);

  constructor(memoryName: string = "default") {
    this.memoryName = memoryName;
    this.storageKey = `gm3000_mem_v3_${memoryName.replace(/[^a-zA-Z0-9]/g, "_")}`;

    const dir = resolveEngineDataPath();
    this.inElectron = dir !== null;
    this.filePath = dir ? buildFilePath(dir, memoryName) : "";

    this.loadFromStorage();
  }

  // --------------------------------------------------------------------------
  // Carga
  // --------------------------------------------------------------------------

  private loadFromStorage(): void {
    try {
      let raw: string | null = null;
      let source = "";

      // 1. Archivo en disco (solo Electron)
      if (this.filePath) {
        raw = ipcReadSync(this.filePath);
        if (raw && raw.length > 10) source = "archivo";
      }

      // 2. localStorage (siempre disponible)
      if (!raw || raw.length < 10) {
        const lsRaw = localStorage.getItem(this.storageKey);
        if (lsRaw && lsRaw.length > 10) {
          raw = lsRaw;
          source = "localStorage";
        }
      }

      if (!raw) {
//         console.log(`[EngineMemory:${this.memoryName}] Iniciando sin datos previos`);
        return;
      }

      const saved = JSON.parse(raw);
      if (saved.learnMap && Array.isArray(saved.learnMap)) {
        this.learnMap = new Map(saved.learnMap);
      }
      if (saved.recentHistory && Array.isArray(saved.recentHistory)) {
        this.recentHistory = saved.recentHistory;
      } else if (saved.patterns && Array.isArray(saved.patterns)) {
        this.recentHistory = saved.patterns;
      }
      if (saved.strategicPatterns && Array.isArray(saved.strategicPatterns)) {
        this.strategicPatterns = saved.strategicPatterns;
      }
      if (saved.opponentProfiles && Array.isArray(saved.opponentProfiles)) {
        this.opponentProfiles = new Map(saved.opponentProfiles);
      }
      this.applyDecayAll();

//       console.log(
//         `[EngineMemory:${this.memoryName}] Cargado: ` +
//         `${this.learnMap.size} posiciones, ${this.patterns.length} patrones (${source})`
//       );
    } catch (e) {
      console.warn(`[EngineMemory:${this.memoryName}] Datos corruptos, reiniciando:`, e);
      this.learnMap = new Map();
      this.patterns = [];
    }
  }

  // --------------------------------------------------------------------------
  // Guardado — SIEMPRE guarda en localStorage, opcionalmente en disco
  // --------------------------------------------------------------------------

  public saveToStorage(): void {
    this.pruneLearnMap();

    const payload = {
      version: 4,
      savedAt: new Date().toISOString(),
      motorName: this.memoryName,
      learnMap: Array.from(this.learnMap.entries()),
      recentHistory: this.recentHistory.slice(-MAX_PATTERNS),
      strategicPatterns: this.strategicPatterns.slice(-500),
      opponentProfiles: Array.from(this.opponentProfiles.entries()),
    };

    const serialized = JSON.stringify(payload);

    // 1. SIEMPRE guardar en localStorage (sincrono, inmediato)
    try {
      if (serialized.length <= SAVE_QUOTA_BYTES) {
        localStorage.setItem(this.storageKey, serialized);
      } else {
        this.aggressivePrune(0.3);
        const trimmed = JSON.stringify({
          version: 3,
          motorName: this.memoryName,
          learnMap: Array.from(this.learnMap.entries()),
          patterns: this.patterns.slice(-Math.floor(MAX_PATTERNS * 0.7)),
        });
        localStorage.setItem(this.storageKey, trimmed);
      }
    } catch (e) {
      console.warn(`[EngineMemory:${this.memoryName}] localStorage lleno:`, e);
    }

    // 2. Si estamos en Electron, tambien guardar en archivo (fire-and-forget)
    if (this.filePath) {
      ipcWriteAsync(this.filePath, serialized);
    }

//     console.log(
//       `[EngineMemory:${this.memoryName}] Guardado: ${this.learnMap.size} pos, ${this.patterns.length} pat`
//     );
  }

  // --------------------------------------------------------------------------
  // Registro de aprendizaje
  // --------------------------------------------------------------------------

  public recordMove(
    fen: string,
    move: string,
    result: "win" | "loss" | "draw" | "error",
    score: number,
    depth: number
  ): void {
    const key = this.generatePatternKey(fen, move);
    const now = Date.now();

    const contextWeight = this.getContextWeight(fen);
    const depthWeight = Math.min(depth / 3, 4.0);
    const baseWeight  = Math.max(1.0, depthWeight) * contextWeight;

    const existing = this.learnMap.get(key);
    if (existing) {
      const personalDecay = result === "win" ? 0.99 : decayFactor(existing.lastSeen);
      existing.winWeight   *= personalDecay;
      existing.errorWeight *= personalDecay;
      existing.visits++;
      existing.lastSeen = now;

      if (result === "win") {
        existing.winWeight += baseWeight;
        existing.errorWeight *= 0.5;
      } else if (result === "error" || result === "loss") {
        existing.errorWeight += baseWeight * (result === "error" ? 2.0 : 1.2);
      }
    } else {
      this.learnMap.set(key, {
        winWeight:   result === "win" ? baseWeight : 0,
        errorWeight: (result === "error" || result === "loss")
          ? baseWeight * (result === "error" ? 2.0 : 1.2)
          : 0,
        tdWeight:    0,
        visits:   1,
        lastSeen: now,
      });
    }

    if (result !== "draw") {
      this.recentHistory.push({ fen: this.normalizeFen(fen), move, result, score, depth, timestamp: now, visits: 1 });
      if (this.recentHistory.length > MAX_PATTERNS) {
        this.recentHistory.splice(0, Math.floor(MAX_PATTERNS * 0.1));
      }
    }

    this.dirtyCount++;
    if (this.dirtyCount >= DIRTY_SAVE_INTERVAL) {
      this.dirtyCount = 0;
      this.saveToStorage();
    }
  }

  public recordMoveWithTD(
    fen: string,
    move: string,
    immediateScore: number,
    futureValue: number,
    depth: number
  ): void {
    const key = this.generatePatternKey(fen, move);
    const now = Date.now();
    const tdError = futureValue - immediateScore;
    const contextWeight = this.getContextWeight(fen);
    const learningRate = 0.15 * contextWeight;
    const adjustment = learningRate * (tdError / 100) * (depth / 3);

    const existing = this.learnMap.get(key);
    if (existing) {
      existing.tdWeight += adjustment;
      existing.visits++;
      existing.lastSeen = now;
      existing.tdWeight = Math.max(-5.0, Math.min(5.0, existing.tdWeight));
    } else {
      this.learnMap.set(key, {
        winWeight: 0,
        errorWeight: 0,
        tdWeight: adjustment,
        visits: 1,
        lastSeen: now
      });
    }

    this.dirtyCount++;
    if (this.dirtyCount >= DIRTY_SAVE_INTERVAL * 2) {
      this.dirtyCount = 0;
      this.saveToStorage();
    }
  }

  public matchStrategicPattern(fen: string): StrategicPattern | null {
    const structure = this.extractPawnStructure(fen);
    const config = this.hashPieceConfig(fen);
    return this.strategicPatterns.find(p => 
      p.pawnStructure === structure && (p.pieceConfiguration === config || config === "*")
    ) || null;
  }

  public recordStrategicPlan(fen: string, plan: StrategicPattern["successfulPlans"][0]): void {
    const structure = this.extractPawnStructure(fen);
    const config = this.hashPieceConfig(fen);
    let existing = this.strategicPatterns.find(p => p.pawnStructure === structure && p.pieceConfiguration === config);
    if (!existing) {
      existing = { pawnStructure: structure, pieceConfiguration: config, successfulPlans: [] };
      this.strategicPatterns.push(existing);
    }
    const planIdx = existing.successfulPlans.findIndex(p => p.description === plan.description);
    if (planIdx >= 0) {
      const p = existing.successfulPlans[planIdx];
      p.visits++;
      p.winRate = (p.winRate * (p.visits - 1) + plan.winRate) / p.visits;
    } else {
      existing.successfulPlans.push({ ...plan, visits: 1 });
    }
    if (this.strategicPatterns.length > 500) this.strategicPatterns.shift();
  }

  private extractPawnStructure(fen: string): string {
    const board = fen.split(" ")[0];
    return board.replace(/[^pP/]/g, ".");
  }

  private hashPieceConfig(fen: string): string {
    const board = fen.split(" ")[0];
    return board.replace(/[pPkK1-8/]/g, "");
  }

  public getOpponentProfile(name: string): OpponentProfile {
    return this.opponentProfiles.get(name) || {
      name,
      style: "solid",
      weakAgainst: ["time-pressure"],
      openingRepertoire: [],
      blunderRate: 0.05
    };
  }

  public recordThreatPattern(fen: string, threat: ThreatPattern): void {
    this.threatHistory.push(threat);
    if (this.threatHistory.length > 300) this.threatHistory.shift();
  }


  // --------------------------------------------------------------------------
  // Consulta — usado por los motores para ajustar su evaluacion
  // --------------------------------------------------------------------------

  public getMoveBonus(fen: string, move: string): number {
    const patternKey = this.generatePatternKey(fen, move);
    const entry = this.learnMap.get(patternKey);
    
    let explorationBonus = 0;
    if (!entry || entry.visits < 5) {
      const prefix = patternKey.split("_M")[0];
      let totalPosVisits = 0;
      for (const [k, v] of this.learnMap.entries()) {
        if (k.startsWith(prefix)) totalPosVisits += v.visits;
      }
      
      const v = entry?.visits || 0.1;
      explorationBonus = 200 * Math.sqrt(Math.log(totalPosVisits + 1) / v);
      explorationBonus = Math.min(explorationBonus, 400);
    }

    if (!entry) return Math.round(explorationBonus);

    const decay      = decayFactor(entry.lastSeen);
    const wins       = entry.winWeight;
    const errors     = entry.errorWeight * decay;
    const tdBonus    = (entry.tdWeight || 0) * 200;
    const raw        = wins - errors;
    const confidence = Math.min(1.0, Math.log2(entry.visits + 1) / 3.0);

    return Math.round(
      (raw > 0
        ? Math.min(raw * 300 * confidence, 2000)
        : Math.max(raw * 1200 * confidence, -6000)) + tdBonus + explorationBonus
    );
  }

  public getPruningAdvice(fen: string, move: string): { prune: boolean, reason: string } {
    const key = this.generatePatternKey(fen, move);
    const entry = this.learnMap.get(key);
    if (entry && entry.visits > 10) {
      const bonus = this.getMoveBonus(fen, move);
      if (bonus <= -5000) {
        return { prune: true, reason: "Historial desastroso detectado" };
      }
    }
    return { prune: false, reason: "" };
  }


  public isKnownBadMove(fen: string, move: string): boolean {
    const key = this.generatePatternKey(fen, move);
    const entry = this.learnMap.get(key);
    if (!entry || entry.visits < 1) return false;
    const decay = decayFactor(entry.lastSeen);
    return (entry.errorWeight * decay - entry.winWeight) > 0.3;
  }

  // --------------------------------------------------------------------------
  // Estadisticas
  // --------------------------------------------------------------------------

  public getMemoryStats() {
    let goodMoves = 0, badMoves = 0;
    for (const entry of this.learnMap.values()) {
      const net = (entry.winWeight - entry.errorWeight) * decayFactor(entry.lastSeen);
      if (net > 0.5) goodMoves++;
      else if (net < -0.5) badMoves++;
    }
    return {
      totalPatterns:    this.patterns.length,
      learnedPositions: this.learnMap.size,
      goodMoves,
      badMoves,
      storageBytes:     (localStorage.getItem(this.storageKey) ?? "").length,
      persistenceMode:  this.inElectron ? "archivo_disco" : "localStorage",
      filePath:         this.filePath || null,
    };
  }

  // --------------------------------------------------------------------------
  // Limpieza
  // --------------------------------------------------------------------------

  public clear(): void {
    this.learnMap.clear();
    this.patterns   = [];
    this.dirtyCount = 0;
    localStorage.removeItem(this.storageKey);
//     console.log(`[EngineMemory:${this.memoryName}] Memoria reiniciada.`);
  }

  // --------------------------------------------------------------------------
  // Utilidades internas
  // --------------------------------------------------------------------------

  private normalizeFen(fen: string): string {
    return fen.split(" ").slice(0, 3).join(" ");
  }

  private generatePatternKey(fen: string, move: string): string {
    const parts = fen.split(" ");
    const boardStr = parts[0];
    const turn = parts[1];
    
    const materialBalance = this.calculateTotalMaterial(boardStr, true);
    const pawnStructure = boardStr.replace(/[^pP/]/g, ".");
    return `MB${materialBalance}_PS${pawnStructure}_T${turn}_M${move}`;
  }

  private calculateTotalMaterial(boardStr: string, isRelative: boolean = false): number {
    let total = 0;
    const values: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
    for (const char of boardStr) {
      if (char === "/") continue;
      const lower = char.toLowerCase();
      if (values[lower] !== undefined) {
        const val = values[lower];
        if (isRelative) {
          total += (char === char.toUpperCase() ? val / 100 : -(val / 100));
        } else {
          total += val;
        }
      }
    }
    return total;
  }

  private getContextWeight(fen: string): number {
    const material = this.calculateTotalMaterial(fen.split(" ")[0]);
    if (material > 2600) return 0.7;
    if (material > 1300) return 1.0;
    return 1.3;
  }

  private pruneLearnMap(): void {
    if (this.learnMap.size <= MAX_LEARN_ENTRIES) return;
    
    // Poda inteligente: mantenemos posiciones con mucha confianza (muchas visitas) 
    // y posiciones con resultados extremos (muy buenas o muy malas).
    // Eliminamos las posiciones donde el motor esta "indiferente" o casi no ha pasado.
    const entries = Array.from(this.learnMap.entries())
      .map(([key, e]) => {
        const decay = decayFactor(e.lastSeen);
        const importance = (Math.abs(e.winWeight - e.errorWeight) * 2 + e.visits) * decay;
        return { key, importance };
      })
      .sort((a, b) => a.importance - b.importance);

    const removeCount = entries.length - MAX_LEARN_ENTRIES;
    for (let i = 0; i < removeCount; i++) {
      this.learnMap.delete(entries[i].key);
    }
//     console.log(`[EngineMemory:${this.memoryName}] Poda realizada: ${removeCount} posiciones irrelevantes eliminadas.`);
  }

  private aggressivePrune(fraction: number): void {
    const entries = Array.from(this.learnMap.entries())
      .sort((a, b) => a[1].lastSeen - b[1].lastSeen);
    const removeCount = Math.floor(entries.length * fraction);
    for (let i = 0; i < removeCount; i++) this.learnMap.delete(entries[i][0]);
    this.patterns = this.patterns.slice(-Math.floor(MAX_PATTERNS * (1 - fraction)));
  }

  private applyDecayAll(): void {
    const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000; // 60 dias
    for (const [key, entry] of this.learnMap.entries()) {
      if (entry.lastSeen < cutoff && entry.visits < 5) {
        this.learnMap.delete(key);
      }
    }
  }
}
