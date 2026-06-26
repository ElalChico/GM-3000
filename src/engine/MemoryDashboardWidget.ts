// MemoryDashboardWidget.ts
import "./MemoryDashboardWidget.css";

// Claves EXACTAS: EngineMemory y ObservableEngineMemory usan distintos prefijos
// DxA.47 usa dx47_memory_v4_DxA47
// M-P26 usa gm3000_mem_v3_M_P26
const STORAGE_KEYS: Record<string, string> = {
  "DxA.47": "dx47_memory_v4_DxA47",
  "M-P26": "gm3000_mem_v3_M_P26",
};
const LEGACY_STORAGE_KEYS: Record<string, string> = {
  "DxA.47": "gm3000_mem_v3_DxA47",
  "M-P26": "gm3000_mem_v3_M-P26",
};
const memoryTrends: Record<string, Array<{
  timestamp: number;
  quality: number;
  learnedPositions: number;
  positive: number;
  negative: number;
  historyCount: number;
}>> = {};
let currentEngine = "DxA.47";
let widget: HTMLElement | null = null;
let visible = false;
let pollId: ReturnType<typeof setInterval> | null = null;

function getEngineTrend(engine: string) {
  if (!memoryTrends[engine]) memoryTrends[engine] = [];
  return memoryTrends[engine];
}

function getOtherEngine(engine: string) {
  return engine === "DxA.47" ? "M-P26" : "DxA.47";
}

function renderHeader() {
  if (!widget) return;
  const title = widget.querySelector(".dx47-term-title");
  const subtitle = widget.querySelector(".dx47-term-subtitle");
  if (title) title.textContent = "MEMORIA DE MOTOR";
  if (subtitle) subtitle.textContent = currentEngine;
}

function openOtherEngineMemory() {
  const other = getOtherEngine(currentEngine);
  if (isElectron()) {
    try {
      const { ipcRenderer } = (window as any).require("electron");
      ipcRenderer.send("open-memory-window", { engineName: other });
      return;
    } catch (e) {
      console.warn("[MemoryDashboard] no se pudo abrir ventana electron:", e);
    }
  }
  if (!widget) createWidget();
  const sel = widget!.querySelector("#dx47-engine-select") as HTMLSelectElement;
  if (sel) {
    sel.value = other;
    currentEngine = other;
    getEngineTrend(currentEngine);
    renderHeader();
  }
}

function computeLearningQuality(snap: any) {
  const learnMapArr: [string, any][] = Array.isArray(snap.learnMap) ? snap.learnMap : [];
  if (!learnMapArr.length) return 0;
  let totalNet = 0;
  for (const [, v] of learnMapArr) {
    totalNet += (v.winWeight || 0) - (v.errorWeight || 0);
  }
  const avgNet = totalNet / learnMapArr.length;
  return Math.round(Math.tanh(avgNet / 1.6) * 100);
}

// ─────────────────────────────────────────────────────────────
// ÍCONOS SVG PROPIOS (sin emojis)
// ─────────────────────────────────────────────────────────────
const ICO = {
  // Circuito neural — icono del motor
  brain: `<svg class="dx47-section-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="3" cy="4" r="1.5" stroke="#58a6ff" stroke-width="1"/>
    <circle cx="13" cy="4" r="1.5" stroke="#58a6ff" stroke-width="1"/>
    <circle cx="3" cy="12" r="1.5" stroke="#58a6ff" stroke-width="1"/>
    <circle cx="13" cy="12" r="1.5" stroke="#58a6ff" stroke-width="1"/>
    <circle cx="8" cy="8" r="2" stroke="#3fb950" stroke-width="1.2"/>
    <line x1="4.5" y1="4" x2="6" y2="8" stroke="#30363d" stroke-width="1"/>
    <line x1="11.5" y1="4" x2="10" y2="8" stroke="#30363d" stroke-width="1"/>
    <line x1="4.5" y1="12" x2="6" y2="8" stroke="#30363d" stroke-width="1"/>
    <line x1="11.5" y1="12" x2="10" y2="8" stroke="#30363d" stroke-width="1"/>
  </svg>`,

  // Historial — reloj con manecillas
  history: `<svg class="dx47-section-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="5.5" stroke="#58a6ff" stroke-width="1.2"/>
    <polyline points="8,5 8,8 10.5,10" stroke="#d29922" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  // Base de datos
  db: `<svg class="dx47-section-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="8" cy="4" rx="5" ry="1.8" stroke="#58a6ff" stroke-width="1"/>
    <path d="M3 4 v4 c0 1 2.2 1.8 5 1.8 s5-.8 5-1.8 V4" stroke="#58a6ff" stroke-width="1"/>
    <ellipse cx="8" cy="8" rx="5" ry="1.8" stroke="#3fb950" stroke-width="0.9"/>
  </svg>`,

  // Check — acierto
  ok: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="1.5,5 4,7.5 8.5,2" stroke="#3fb950" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  // X — error
  err: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="2" y1="2" x2="8" y2="8" stroke="#f85149" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="8" y1="2" x2="2" y2="8" stroke="#f85149" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  // Neutro — guión
  neu: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="5" cy="5" r="3.5" stroke="#d29922" stroke-width="1.2"/>
    <line x1="3" y1="5" x2="7" y2="5" stroke="#d29922" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  // Flecha arriba — ganancia
  up: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="5" y1="2" x2="5" y2="8" stroke="#3fb950" stroke-width="1.5" stroke-linecap="round"/>
    <polyline points="2.5,4.5 5,2 7.5,4.5" stroke="#3fb950" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  // Flecha abajo — pérdida
  down: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="5" y1="2" x2="5" y2="8" stroke="#f85149" stroke-width="1.5" stroke-linecap="round"/>
    <polyline points="2.5,5.5 5,8 7.5,5.5" stroke="#f85149" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  // Minimizar
  min: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><line x1="2" y1="8" x2="8" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  // Cerrar
  close: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
};


// ─────────────────────────────────────────────────────────────
// CREACIÓN DEL WIDGET
// ─────────────────────────────────────────────────────────────
function createWidget() {
  widget = document.createElement("div");
  widget.id = "dx47-memory-widget";
  widget.className = "dx47-widget";
  widget.innerHTML = `
    <div class="dx47-widget-header">
      <div class="dx47-term-prompt">
        <div class="dx47-term-led"></div>
        <span class="dx47-term-title">MEMORIA DE MOTOR</span>
        <span class="dx47-term-subtitle">${currentEngine}</span>
      </div>
      <div class="dx47-widget-controls">
        <select id="dx47-engine-select">
          <option value="DxA.47">DxA.47</option>
          <option value="M-P26">M-P26</option>
        </select>
        <button class="dx47-btn-other" title="Abrir datos del otro motor">OTRO MOTOR</button>
        <button class="dx47-btn-min" title="Minimizar">${ICO.min}</button>
        <button class="dx47-btn-close" title="Ocultar">${ICO.close}</button>
      </div>
    </div>
    <div class="dx47-widget-body">
      <div id="dx47-clusters" class="dx47-section">
        <div class="dx47-section-title">${ICO.brain} MOVIMIENTOS APRENDIDOS</div>
        <div class="dx47-cluster-list"><div class="dx47-empty">Sin patrones aun</div></div>
      </div>
      <div id="dx47-stats" class="dx47-section">
        <div class="dx47-section-title">${ICO.db} ESTADÍSTICAS</div>
        <div class="dx47-empty">Iniciando...</div>
      </div>
      <div id="dx47-chart-section" class="dx47-section">
        <div class="dx47-section-title">${ICO.up} APRENDIZAJE VS HISTÓRICO</div>
        <canvas id="dx47-learning-chart" width="260" height="70" style="width:100%; height:70px; margin-top:8px; border:1px solid #1e293b; border-radius:4px; background:#0d1117;"></canvas>
      </div>
      <div id="dx47-insights" class="dx47-section">
        <div class="dx47-section-title">${ICO.history} HISTORIAL RECIENTE</div>
        <div class="dx47-insight-list"><div class="dx47-empty">Sin registros aun</div></div>
      </div>
    </div>
    <div class="dx47-resize-handle"></div>
  `;
  document.body.appendChild(widget);
  setupDrag();
  setupResize();
  setupControls();
  renderHeader();
}

// ─────────────────────────────────────────────────────────────
// DRAG & RESIZE
// ─────────────────────────────────────────────────────────────
function setupDrag() {
  const header = widget!.querySelector(".dx47-widget-header") as HTMLElement;
  let isDragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

  header.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX; startY = e.clientY;
    startLeft = widget!.offsetLeft; startTop = widget!.offsetTop;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  function onMove(e: MouseEvent) {
    if (!isDragging) return;
    widget!.style.left = `${startLeft + (e.clientX - startX)}px`;
    widget!.style.top = `${startTop + (e.clientY - startY)}px`;
    widget!.style.right = "auto";
  }
  function onUp() {
    isDragging = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  }
}

function setupResize() {
  const handle = widget!.querySelector(".dx47-resize-handle") as HTMLElement;
  let isResizing = false, startX = 0, startY = 0, startW = 0, startH = 0;

  handle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX; startY = e.clientY;
    startW = widget!.offsetWidth; startH = widget!.offsetHeight;
    e.preventDefault();
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  function onMove(e: MouseEvent) {
    if (!isResizing) return;
    widget!.style.width = `${Math.max(280, startW + (e.clientX - startX))}px`;
    widget!.style.height = `${Math.max(300, startH + (e.clientY - startY))}px`;
  }
  function onUp() {
    isResizing = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  }
}

function setupControls() {
  widget!.querySelector(".dx47-btn-close")?.addEventListener("click", toggleMemoryDashboard);
  widget!.querySelector(".dx47-btn-other")?.addEventListener("click", openOtherEngineMemory);
  widget!.querySelector(".dx47-btn-min")?.addEventListener("click", () => {
    const body = widget!.querySelector(".dx47-widget-body") as HTMLElement;
    const handle = widget!.querySelector(".dx47-resize-handle") as HTMLElement;
    const hidden = body.style.display === "none";
    body.style.display = hidden ? "flex" : "none";
    handle.style.display = hidden ? "block" : "none";
  });
  // Selector de motor
  const sel = widget!.querySelector("#dx47-engine-select") as HTMLSelectElement;
  sel?.addEventListener("change", () => {
    currentEngine = sel.value;
    getEngineTrend(currentEngine); // reset or create the trend buffer for the selected engine
    renderHeader();
  });
}

// ─────────────────────────────────────────────────────────────
// POLLING & RENDER
// ─────────────────────────────────────────────────────────────
function startPolling() {
  if (pollId) return;
  const render = () => {
    if (!visible || !widget || document.hidden) return; // No procesar si no es visible o la pestaña está en segundo plano
    try {
      const storageKey = STORAGE_KEYS[currentEngine];
      let raw = localStorage.getItem(storageKey);
      const legacyKey = LEGACY_STORAGE_KEYS[currentEngine];
      const legacyRaw = legacyKey ? localStorage.getItem(legacyKey) : null;
      if (!raw) {
        if (legacyRaw) {
          const parsed = JSON.parse(legacyRaw);
          localStorage.setItem(storageKey, legacyRaw);
          raw = legacyRaw;
          updateStats({
            engineName: currentEngine,
            totalPositions: Array.isArray(parsed.learnMap) ? parsed.learnMap.length : 0,
            winPositions: 0,
            errorPositions: 0,
            neutralPositions: 0,
            totalVisits: 0,
            avgVisits: 0,
            storageBytes: raw?.length || 0,
            persistenceMode: isElectron() ? "archivo_disco" : "localStorage",
            historyCount: (parsed.recentHistory || []).length,
            storageKey,
            savedAt: parsed.savedAt || parsed.savedAt || '?',
            qualityScore: 0,
          });
        }
        if (!raw) {
          const el = widget.querySelector("#dx47-stats")!;
          el.innerHTML = `<h4>📊 ${currentEngine}</h4><div style="color:#64748b;font-size:11px;padding:8px">Sin datos de entrenamiento aún.<br>Juega una partida para generar datos.</div>`;
          updateChart([]);
          updateInsights([]);
          updateClusters([]);
          return;
        }
      }
      const snap = JSON.parse(raw);
      const learnMapArr: [string, any][] = Array.isArray(snap.learnMap) ? snap.learnMap : [];
      const entriesToProcess = learnMapArr.length > 20000 ? learnMapArr.slice(-20000) : learnMapArr;

      let winPositions = 0, errorPositions = 0, totalVisits = 0;
      const candidates: any[] = [];
      for (let i = 0; i < entriesToProcess.length; i++) {
        const [key, v] = entriesToProcess[i];
        totalVisits += (v.visits || 0);
        const net = (v.winWeight || 0) - (v.errorWeight || 0);

        if (net > 0.3) winPositions++;
        else if (net < -0.3) errorPositions++;

        if (v.visits >= 2 && candidates.length < 50) {
          const movePart = key.split('_M').pop() || key;
          candidates.push({ move: movePart.substring(0, 8), visits: v.visits, net });
        }
      }

      const qualityScore = computeLearningQuality(snap);
      const avgVisits = learnMapArr.length > 0 ? Math.round(totalVisits / learnMapArr.length) : 0;
      updateStats({
        engineName: currentEngine,
        totalPositions: learnMapArr.length,
        winPositions,
        errorPositions,
        neutralPositions: 0,
        totalVisits,
        avgVisits,
        storageBytes: raw.length,
        persistenceMode: isElectron() ? "archivo_disco" : "localStorage",
        historyCount: (snap.recentHistory || []).length,
        storageKey,
        savedAt: snap.savedAt || '?',
        qualityScore,
      });

      const trend = getEngineTrend(currentEngine);
      trend.push({
        timestamp: Date.now(),
        quality: qualityScore,
        learnedPositions: learnMapArr.length,
        positive: winPositions,
        negative: errorPositions,
        historyCount: (snap.recentHistory || []).length,
      });
      if (trend.length > 40) trend.shift();

      const insights = (snap.recentHistory || []).slice(-6).reverse().map((h: any) => ({
        move: h.move || '?',
        result: h.result || '?',
        score: h.score || 0,
        fen: (h.fen || '').substring(0, 18),
      }));
      updateInsights(insights);

      const topLearned = candidates
        .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
        .slice(0, 5);
      if (topLearned.length) {
        updateClusters(topLearned);
      } else if (learnMapArr.length > 0) {
        const fallbackCandidates = learnMapArr
          .slice(-50)
          .map(([key, v]) => {
            const move = key.includes('_M')
              ? key.split('_M').pop()
              : key.includes(':')
              ? key.split(':').pop()
              : key;
            return {
              move: String(move).substring(0, 8),
              visits: v.visits || 0,
              net: (v.winWeight || 0) - (v.errorWeight || 0),
            };
          })
          .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
          .slice(0, 5);
        updateClusters(fallbackCandidates);
      } else {
        updateClusters([]);
      }

      updateChart(getEngineTrend(currentEngine));

    } catch (e) {
      console.error("[MemoryDashboard] Error al renderizar:", e);
    }
  };
  render();
  pollId = setInterval(render, 1500);
}

function updateStats(stats: any) {
  const el = widget!.querySelector("#dx47-stats")!;
  const pct = stats.totalPositions > 0
    ? Math.round((stats.winPositions / stats.totalPositions) * 100)
    : 0;
  // Barra de progreso tipo terminal
  const barLen = 16;
  const filled = Math.round((pct / 100) * barLen);
  const bar = '[' + '#'.repeat(filled) + '-'.repeat(barLen - filled) + ']';

  el.innerHTML = `
    <div class="dx47-section-title">${ICO.db} ESTAD&Iacute;STICAS &mdash; <span style="color:#d19a66">${stats.engineName}</span></div>
    <div class="dx47-stat-row">
      <span class="dx47-stat-key">posiciones_guardadas</span>
      <span class="dx47-stat-val num">${stats.totalPositions}</span>
    </div>
    <div class="dx47-stat-row">
      <span class="dx47-stat-key">visitas_totales</span>
      <span class="dx47-stat-val num">${stats.totalVisits}</span>
    </div>
    <div class="dx47-stat-row">
      <span class="dx47-stat-key">visitas_promedio</span>
      <span class="dx47-stat-val num">${stats.avgVisits ?? 0}</span>
    </div>
    <div class="dx47-stat-row">
      <span class="dx47-stat-key">ganadoras</span>
      <span class="dx47-stat-val ok">${ICO.ok}&nbsp;${stats.winPositions} <span style="color:#3a5a3a">(${pct}%)</span></span>
    </div>
    <div class="dx47-stat-row">
      <span class="dx47-stat-key">con_error</span>
      <span class="dx47-stat-val err">${ICO.err}&nbsp;${stats.errorPositions}</span>
    </div>
    <div class="dx47-stat-row">
      <span class="dx47-stat-key">quality_score</span>
      <span class="dx47-stat-val ok">${stats.qualityScore ?? 0}%</span>
    </div>
    <div class="dx47-stat-row">
      <span class="dx47-stat-key">neutras</span>
      <span class="dx47-stat-val warn">${ICO.neu}&nbsp;${stats.neutralPositions}</span>
    </div>
    <div class="dx47-stat-row">
      <span class="dx47-stat-key">historial_movs</span>
      <span class="dx47-stat-val str">${stats.historyCount}</span>
    </div>
    <div class="dx47-stat-row">
      <span class="dx47-stat-key">persistencia</span>
      <span class="dx47-stat-val str">${stats.persistenceMode || 'localStorage'}</span>
    </div>
    <div class="dx47-stat-row">
      <span class="dx47-stat-key">tamaño_bytes</span>
      <span class="dx47-stat-val num">${stats.storageBytes ?? 0}</span>
    </div>
    <div class="dx47-stat-row" style="margin-top:4px">
      <span class="dx47-stat-key">eficiencia</span>
      <span class="dx47-stat-val ok" style="font-size:10px;font-family:inherit">${bar} ${pct}%</span>
    </div>
    <div class="dx47-prompt-line"><span># </span>${stats.storageKey} &mdash; ${stats.savedAt?.substring(0, 16) || 'sin_guardar'}</div>
  `;
}

function updateInsights(insights: any[]) {
  const list = widget!.querySelector(".dx47-insight-list")!;
  if (!insights.length) {
    list.innerHTML = `<div class="dx47-empty">Sin registros de partidas aun</div>`;
    return;
  }
  list.innerHTML = insights.map((i, idx) => {
    const score  = Math.round(i.score / 10);
    const isWin  = i.result === 'win';
    const isErr  = i.result === 'error' || i.result === 'loss';
    const cls    = isWin ? 'pos' : isErr ? 'neg' : 'neu';
    const icon   = isWin ? ICO.up : isErr ? ICO.down : ICO.neu;
    const resCol = isWin ? '#00ff41' : isErr ? '#ff4444' : '#e5c07b';
    const scSign = score > 0 ? '+' : '';
    const lineN  = String(idx + 1).padStart(2, '0');
    return `
      <div class="dx47-insight ${cls}">
        <span style="color:#3a4a3a;font-size:9.5px">${lineN}</span>
        ${icon}
        <span class="dx47-insight-move"> ${i.move}</span>
        <span class="dx47-insight-res" style="color:${resCol}"> [${i.result}]</span>
        <span class="dx47-insight-score ${cls}"> ${scSign}${score}cp</span>
        <span style="color:#3a4a3a"> d:${i.depth}</span><br>
        <span class="dx47-insight-meta">${i.fen}</span>
      </div>`;
  }).join("");
}

function updateClusters(learned: any[]) {
  const list = widget!.querySelector(".dx47-cluster-list")!;
  if (!learned.length) {
    list.innerHTML = `<div class="dx47-empty">Sin movimientos recurrentes aun</div>`;
    return;
  }
  list.innerHTML = learned.map((c: any) => {
    const isGood = c.net > 0;
    const absNet = Math.abs(c.net).toFixed(2);
    const icon   = isGood ? ICO.ok : ICO.err;
    const pct    = Math.min(100, Math.round((Math.abs(c.net) / 5) * 100));
    return `
      <div class="dx47-cluster-row">
        ${icon}
        <span class="dx47-cluster-move">${c.move}</span>
        <div class="dx47-bar-wrap">
          <div class="dx47-bar-fill ${isGood ? 'ok' : 'err'}" style="width:${pct}%"></div>
        </div>
        <span class="dx47-cluster-vis">${c.visits}x</span>
        <span class="dx47-cluster-net ${isGood ? 'pos' : 'neg'}">${isGood ? '+' : ''}${absNet}</span>
      </div>`;
  }).join("");
}

function updateChart(history: any[]) {
  const canvas = widget!.querySelector("#dx47-learning-chart") as HTMLCanvasElement;
  const values = Array.isArray(history) ? history : [];
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  
  if (!values.length) {
    ctx.fillStyle = "#64748b";
    ctx.font = "10px monospace";
    ctx.fillText("Esperando datos de evaluación...", 10, h/2 + 3);
    return;
  }
  const data = values.slice(-40).map((item: any) => item.quality ?? item.score ?? 0);
  
  let min = Math.min(...data, -50);
  let max = Math.max(...data, 50);
  const range = max - min;
  min -= range * 0.1;
  max += range * 0.1;
  const adjRange = max - min;
  
  const stepX = w / Math.max(1, data.length - 1);
  
  // Dibujar línea de cero (0 centipeones) si está a la vista
  if (min < 0 && max > 0) {
    const zeroY = h - ((0 - min) / adjRange) * h;
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(w, zeroY);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  // Dibujar la curva de aprendizaje
  ctx.beginPath();
  data.forEach((val, i) => {
    const x = i * stepX;
    const y = h - ((val - min) / adjRange) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  
  ctx.strokeStyle = "#3fb950"; // Verde (crecimiento/buen rendimiento)
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.stroke();
  
  // Relleno gradiente debajo de la línea
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(63, 185, 80, 0.2)");
  grad.addColorStop(1, "rgba(63, 185, 80, 0)");
  ctx.fillStyle = grad;
  ctx.fill();
}

function snapshotToTrendData(snap: any, trend: any[]) {
  if (!snap) return [];
  return trend.length
    ? trend.map((entry) => ({ timestamp: entry.timestamp, quality: entry.quality }))
    : (snap.recentHistory || []).slice(-40).map((item: any, idx: number) => ({
        timestamp: Date.now() - (40 - idx) * 1000,
        quality: item.score ? Math.round(item.score / 10) : 0,
      }));
}


// ─────────────────────────────────────────────────────────────
// EXPORT PÚBLICO
// ─────────────────────────────────────────────────────────────

// Detecta si estamos en Electron
function isElectron(): boolean {
  return navigator.userAgent.toLowerCase().includes("electron") ||
    typeof (window as any).electronAPI !== "undefined";
}

export function toggleMemoryDashboard() {
  // En Electron: abre una BrowserWindow nativa independiente (se puede mover a otro monitor)
  if (isElectron()) {
    try {
      const { ipcRenderer } = (window as any).require("electron");
      ipcRenderer.send("open-memory-window", { engineName: currentEngine });
      return;
    } catch (_e) {
      // Si falla IPC, usar el widget DOM como fallback
    }
  }

  // En web: usar el widget flotante DOM (limitado al viewport del navegador)
  if (!widget) createWidget();
  visible = !visible;
  widget!.style.display = visible ? "flex" : "none";
  if (visible) {
    startPolling();
    // Enfocar la sección MOVIMIENTOS APRENDIDOS por defecto
    setTimeout(() => {
      try {
        const clusterSection = widget!.querySelector('#dx47-clusters') as HTMLElement | null;
        if (clusterSection) {
          clusterSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          clusterSection.style.transition = 'box-shadow 0.3s, border 0.3s';
          const prevBorder = clusterSection.style.border;
          clusterSection.style.boxShadow = '0 0 18px rgba(59,130,246,0.35)';
          clusterSection.style.border = '1px solid rgba(59,130,246,0.6)';
          setTimeout(() => {
            clusterSection.style.boxShadow = '';
            clusterSection.style.border = prevBorder || '1px solid #21262d';
          }, 2200);
        }
      } catch (e) {
        // silent
      }
    }, 260);
  } else if (pollId) {
    clearInterval(pollId);
    pollId = null;
  }
}

export function initMemoryDashboard() {
  // En Electron no pre-crea el widget DOM (se maneja con BrowserWindow)
  if (!isElectron() && !widget) createWidget();
}

// Expón globalmente para debug
(window as any).toggleDxA47Memory = toggleMemoryDashboard;
