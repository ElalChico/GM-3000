import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { X, TrendingUp, Zap, Database, Brain } from "lucide-react";
import { cn } from "../lib/utils";

interface MotorMemorySnapshot {
  timestamp: number;
  capacityUsed: number;
  totalCapacity: number;
  entriesCount: number;
  knowledgeScore: number;
  learningRate: number;
}

function computeRealtimeQuality(snapshot: any) {
  if (!snapshot) return 0;
  const learnMapArr: [string, any][] = Array.isArray(snapshot.learnMap)
    ? snapshot.learnMap
    : [];
  if (learnMapArr.length) {
    let totalNet = 0;
    let totalVisits = 0;
    for (const [, entry] of learnMapArr) {
      totalNet += (entry.winWeight || 0) - (entry.errorWeight || 0);
      totalVisits += entry.visits || 0;
    }
    const avgNet = totalNet / Math.max(1, learnMapArr.length);
    return Math.round(Math.tanh(avgNet / 1.6) * 100);
  }
  if (snapshot.metadata?.stats?.avgConfidence !== undefined) {
    return Math.round(snapshot.metadata.stats.avgConfidence * 100);
  }
  if (snapshot.learnedPositions !== undefined && snapshot.totalCapacity !== undefined) {
    return Math.round(
      (snapshot.learnedPositions / Math.max(1, snapshot.totalCapacity)) * 100
    );
  }
  return 0;
}

interface MotorMemoryRealtimeProps {
  engineName?: string;
  isVisible?: boolean;
  onClose?: () => void;
  memorySnapshot?: any;
  isLearning?: boolean;
  language?: "es" | "en";
}

/**
 * MotorMemoryRealtime - Monitor de memoria del motor en tiempo real
 * Muestra:
 * - Gráfica lineal de capacidad de memoria
 * - Estadísticas en vivo
 * - Velocidad de aprendizaje
 * - Histórico de cambios
 */
export const MotorMemoryRealtime: React.FC<MotorMemoryRealtimeProps> = ({
  engineName = "DxA.47",
  isVisible = true,
  onClose,
  memorySnapshot,
  isLearning = false,
  language = "es",
}) => {
  const [memoryHistory, setMemoryHistory] = useState<MotorMemorySnapshot[]>([]);
  const [currentMemory, setCurrentMemory] = useState<MotorMemorySnapshot | null>(
    null
  );
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Actualizar memoria en tiempo real cada 500ms
  useEffect(() => {
    if (!isVisible || !memorySnapshot) return;

    pollIntervalRef.current = setInterval(() => {
      try {
        // Obtener snapshot actual de memoria
        const snapshot = memorySnapshot?.raw ? memorySnapshot.raw : memorySnapshot;
        if (!snapshot) return;

        const now = Date.now();
        const learningQuality = computeRealtimeQuality(snapshot);
        const totalCapacity = 100;
        const entriesCount = snapshot.entriesCount ?? snapshot.metadata?.stats?.movesLearned ?? snapshot.learnMap?.length ?? 0;
        const knowledgeScore = Number(snapshot.knowledgeScore ?? snapshot.metadata?.stats?.avgConfidence ?? 0) || 0;

        const newEntry: MotorMemorySnapshot = {
          timestamp: now,
          capacityUsed: learningQuality,
          totalCapacity,
          entriesCount: Number(entriesCount) || 0,
          knowledgeScore,
          learningRate: isLearning ? 1 : 0,
        };

        setCurrentMemory(newEntry);

        // Mantener histórico de los últimos 120 segundos (60 puntos @ 500ms)
        setMemoryHistory((prev) => {
          const updated = [...prev, newEntry];
          const cutoff = now - 120000; // 2 minutos
          return updated.filter((entry) => entry.timestamp > cutoff);
        });

        lastUpdateRef.current = now;
      } catch (e) {
        console.error("[MotorMemoryRealtime] Error reading memory:", e);
      }
    }, 500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isVisible, memorySnapshot, isLearning]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    if (!currentMemory) return null;

    const avgCapacity =
      memoryHistory.length > 0
        ? Math.round(
            memoryHistory.reduce((sum, m) => sum + m.capacityUsed, 0) /
              memoryHistory.length
          )
        : 0;

    const trend =
      memoryHistory.length > 1
        ? memoryHistory[memoryHistory.length - 1].capacityUsed -
          memoryHistory[0].capacityUsed
        : 0;

    return {
      current: currentMemory.capacityUsed,
      average: avgCapacity,
      trend,
      entries: currentMemory.entriesCount,
      knowledge: currentMemory.knowledgeScore,
    };
  }, [currentMemory, memoryHistory]);

  if (!isVisible) {
    return null;
  }

  if (!currentMemory || !stats) {
    return (
      <div
        className={cn(
          "fixed bottom-4 right-4 w-96 bg-slate-900 border-2 border-blue-500/50 rounded-xl shadow-2xl shadow-blue-500/20 overflow-hidden",
          "animate-in fade-in slide-in-from-bottom-5 duration-300 z-40"
        )}
      >
        <div className="flex justify-between items-center bg-slate-950 px-4 py-3 border-b border-blue-500/30">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-400" />
            <div>
              <h3 className="text-xs font-bold text-blue-300 uppercase tracking-widest">
                {language === "es" ? "Memoria Motor" : "Motor Memory"}
              </h3>
              <p className="text-[9px] text-slate-500">{engineName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
            title={language === "es" ? "Cerrar" : "Close"}
          >
            <X className="w-4 h-4 text-slate-400 hover:text-slate-200" />
          </button>
        </div>
        <div className="p-4 text-sm text-slate-400">
          {language === "es"
            ? "Esperando datos de memoria..."
            : "Waiting for memory data..."}
        </div>
      </div>
    );
  }

  // Preparar datos para gráfica (reduce puntos para rendering eficiente)
  const chartData = useMemo(() => {
    if (memoryHistory.length <= 30) return memoryHistory;

    // Si hay más de 30 puntos, hacer sampling
    const step = Math.ceil(memoryHistory.length / 30);
    return memoryHistory.filter((_, i) => i % step === 0);
  }, [memoryHistory]);

  const trendColor = stats.trend > 0 ? "text-emerald-400" : "text-rose-400";

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 w-96 bg-slate-900 border-2 border-blue-500/50 rounded-xl shadow-2xl shadow-blue-500/20 overflow-hidden",
        "animate-in fade-in slide-in-from-bottom-5 duration-300 z-40"
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-950 px-4 py-3 border-b border-blue-500/30">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-400" />
          <div>
            <h3 className="text-xs font-bold text-blue-300 uppercase tracking-widest">
              {language === "es" ? "Memoria Motor" : "Motor Memory"}
            </h3>
            <p className="text-[9px] text-slate-500">{engineName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-800 rounded transition-colors"
          title={language === "es" ? "Cerrar" : "Close"}
        >
          <X className="w-4 h-4 text-slate-400 hover:text-slate-200" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
        {/* Status Indicator */}
        <div
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg text-xs font-bold",
            isLearning
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-slate-800 text-slate-400 border border-slate-700"
          )}
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isLearning ? "bg-emerald-400" : "bg-slate-500"
            )}
          />
          {isLearning
            ? language === "es"
              ? "🧠 Aprendiendo en vivo..."
              : "🧠 Learning live..."
            : language === "es"
            ? "Esperando movimientos..."
            : "Waiting for moves..."}
        </div>

        {/* Realtime Metrics */}
        <div className="grid grid-cols-2 gap-2">
          {/* Capacidad Actual */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Database className="w-3 h-3 text-blue-400" />
              <span className="text-[9px] text-slate-400 uppercase font-bold">
                {language === "es" ? "Capacidad" : "Capacity"}
              </span>
            </div>
            <div className="text-lg font-bold text-blue-300">
              {stats.current}%
            </div>
            <div className="text-[8px] text-slate-500 mt-1">
              {language === "es" ? "calidad" : "quality"}
            </div>
          </div>

          {/* Tendencia */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] text-slate-400 uppercase font-bold">
                {language === "es" ? "Comparado" : "Compared"}
              </span>
            </div>
            <div className={cn("text-lg font-bold", trendColor)}>
              {stats.trend > 0 ? "+" : ""}
              {stats.trend}%
            </div>
            <div className="text-[8px] text-slate-500 mt-1">
              {language === "es" ? "Últimos 2 min" : "Last 2 min"}
            </div>
          </div>

          {/* Promedio */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-[9px] text-slate-400 uppercase font-bold">
                {language === "es" ? "Promedio" : "Average"}
              </span>
            </div>
            <div className="text-lg font-bold text-amber-300">
              {stats.average}%
            </div>
            <div className="text-[8px] text-slate-500 mt-1">
              {memoryHistory.length} {language === "es" ? "muestras" : "samples"}
            </div>
          </div>

          {/* Score */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Brain className="w-3 h-3 text-purple-400" />
              <span className="text-[9px] text-slate-400 uppercase font-bold">
                {language === "es" ? "Conocimiento" : "Knowledge"}
              </span>
            </div>
            <div className="text-lg font-bold text-purple-300">
              {stats.knowledge.toFixed(0)}
            </div>
            <div className="text-[8px] text-slate-500 mt-1">
              {language === "es" ? "Score" : "Score"}
            </div>
          </div>
        </div>

        {/* Realtime Graph */}
        {chartData.length > 1 && (
          <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
            <p className="text-[9px] text-slate-400 font-bold uppercase mb-2">
              {language === "es" ? "Gráfica en Vivo" : "Live Chart"}
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#30363d"
                  vertical={false}
                />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 8 }}
                  stroke="#64748b"
                  formatter={(val) => {
                    const date = new Date(val);
                    return date.toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });
                  }}
                  style={{ overflow: "visible" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 8 }}
                  stroke="#64748b"
                  label={{ value: "%", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: "4px",
                    fontSize: "10px",
                  }}
                  formatter={(value) => `${value}%`}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return date.toLocaleTimeString("es-ES");
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="capacityUsed"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
          <p className="text-[9px] text-slate-400">
            {language === "es"
              ? "✓ Las memorias se guardan automáticamente y NO se reemplazan entre partidas. El motor aprende acumulativamente."
              : "✓ Memories are saved automatically and NOT replaced between games. The engine learns cumulatively."}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-950 border-t border-blue-500/30 text-[8px] text-slate-500 flex justify-between">
        <span>{language === "es" ? "Actualizado" : "Updated"}: en vivo</span>
        <span>500ms ciclo</span>
      </div>
    </div>
  );
};

export default MotorMemoryRealtime;
