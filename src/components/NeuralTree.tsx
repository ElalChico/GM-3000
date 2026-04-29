import React, { useMemo } from 'react';
import { Variation, EngineStats } from '../engine/Stockfish';
import { cn } from '../lib/utils';

interface NeuralTreeProps {
  variations: Variation[];
  turnColor: 'w' | 'b';
  stats?: EngineStats;
  style?: 'classic' | 'simple' | 'stream' | 'organic' | 'quantum' | 'neural_flow';
  language?: 'es' | 'en';
}

interface TreeNode {
  id: string;
  move: string;
  depth: number;
  isBest: boolean;
  score: number;
  mate?: number;
  children: TreeNode[];
  x: number;
  y: number;
}

const mapNotation = (move: string, lang: 'es' | 'en' | string) => {
  if (move === '0000') return lang === 'es' ? '(nulo)' : '(null)';
  if (lang === 'en') return move;
  const dict: Record<string, string> = { 'K': 'R', 'Q': 'D', 'R': 'T', 'B': 'A', 'N': 'C' };
  return move.split('').map(char => dict[char] || char).join('');
};

export const NeuralTree: React.FC<NeuralTreeProps> = ({ variations, turnColor, stats, style = 'simple', language = 'es' }) => {
  const { nodes, links, maxDepth } = useMemo(() => {
    // 1. Construir Árbol Lógico
    const root: TreeNode = {
      id: 'root',
      move: 'START',
      depth: 0,
      isBest: true,
      score: 0,
      children: [],
      x: 0,
      y: 0
    };

    const nodeMap = new Map<string, TreeNode>();
    nodeMap.set('root', root);

    const MAX_VIZ_DEPTH = (style === 'quantum' || style === 'hologram') ? 8 : (style === 'simple' ? 8 : 6);
    const varsToUse = style === 'simple' ? variations.slice(0, 4) : variations;

    varsToUse.forEach((v) => {
      const moves = v.pv.split(' ').slice(0, MAX_VIZ_DEPTH);
      const isBestLine = v.id === 1;

      let curr = root;
      moves.forEach((moveStr, d) => {
        const mappedMove = mapNotation(moveStr, language);
        const childId = `${curr.id}-${mappedMove}`;
        let child = nodeMap.get(childId);

        if (!child) {
          child = {
            id: childId,
            move: mappedMove,
            depth: d + 1,
            isBest: isBestLine,
            score: v.score,
            mate: v.mate,
            children: [],
            x: 0,
            y: 0
          };
          curr.children.push(child);
          nodeMap.set(childId, child);
        } else if (isBestLine) {
          child.isBest = true;
          child.score = v.score;
          child.mate = v.mate;
        }
        curr = child;
      });
    });

    // 2. Calcular Diseño
    const groupedByDepth: Record<number, TreeNode[]> = {};
    Array.from(nodeMap.values()).forEach(n => {
      if (!groupedByDepth[n.depth]) groupedByDepth[n.depth] = [];
      groupedByDepth[n.depth].push(n);
    });

    const boxWidth = 900;
    const boxHeight = 500;
    const centerX = boxWidth / 2;
    const centerY = boxHeight / 2;
    const actMaxDepth = Math.max(...Object.keys(groupedByDepth).map(k => parseInt(k)));

    Object.keys(groupedByDepth).forEach(depthStr => {
      const d = parseInt(depthStr);
      const nodesAtDepth = groupedByDepth[d];

      nodesAtDepth.sort((a, b) => {
        if (a.isBest && !b.isBest) return -1;
        if (!a.isBest && b.isBest) return 1;
        return (parseInt(a.move, 36) || 0) - (parseInt(b.move, 36) || 0);
      });

      if (style === 'quantum') {
        const radius = d * 65;
        const offsetAngle = d * 0.2;
        nodesAtDepth.forEach((n, i) => {
          const angle = (i / nodesAtDepth.length) * 2 * Math.PI - Math.PI / 2 + offsetAngle;
          n.x = centerX + radius * Math.cos(angle);
          n.y = centerY + radius * Math.sin(angle);
        });
      } else if (style === 'organic') {
        const radius = d * 70;
        nodesAtDepth.forEach((n, i) => {
          const angle = (i / nodesAtDepth.length) * 2 * Math.PI + (d * 0.5);
          n.x = centerX + radius * Math.cos(angle);
          n.y = centerY + radius * Math.sin(angle);
        });
      } else if (style === 'neural_flow') {
        const xStep = boxWidth / (actMaxDepth + 1);
        nodesAtDepth.forEach((n, i) => {
          n.x = 50 + d * xStep;
          n.y = (boxHeight / (nodesAtDepth.length + 1)) * (i + 1);
        });
      } else {
        const xStep = boxWidth / Math.max(actMaxDepth, 1);
        const yStep = boxHeight / (nodesAtDepth.length + 1);
        const isTooCrowded = nodesAtDepth.length > 8;

        nodesAtDepth.forEach((n, i) => {
          n.x = 60 + d * xStep * 0.85;
          if (d === 0) {
            n.y = boxHeight / 2;
          } else {
            n.y = yStep * (i + 1);
            if (!n.isBest && !isTooCrowded && style !== 'simple') {
              n.y += ((parseInt(n.move, 36) || 0) % 40) - 20;
              n.x += ((parseInt(n.move, 36) || 0) % 20) - 10;
            }
          }
        });
      }
    });

    const outLinks: { source: TreeNode, target: TreeNode }[] = [];
    Array.from(nodeMap.values()).forEach(n => {
      n.children.forEach(c => {
        outLinks.push({ source: n, target: c });
      });
    });

    return { nodes: Array.from(nodeMap.values()), links: outLinks, maxDepth: actMaxDepth };
  }, [variations, language, style]);

  if (variations.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-700 text-[10px] uppercase font-mono italic bg-black">
        {language === 'es' ? 'Sincronizando red neuronal...' : 'Synchronizing neural network...'}
      </div>
    );
  }

  // Estilos Visuales
  if (style === 'stream') {
    return (
      <div className="w-full h-full bg-black p-3 font-mono text-[9px] overflow-hidden flex flex-col border border-slate-800 rounded shadow-inner">
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5">
          <div className="text-emerald-500 mb-2 opacity-50 border-b border-emerald-900/30 pb-1 font-bold">
            {language === 'es' ? '> FLUJO DE DATOS EN TIEMPO REAL' : '> REAL-TIME DATA STREAM'}
          </div>
          {variations.sort((a, b) => b.depth - a.depth).map((v, i) => (
            <div key={i} className="flex gap-2 border-l border-slate-800 pl-2 py-0.5 hover:bg-slate-800/20 transition-colors">
              <span className="text-slate-600 font-bold w-12 shrink-0">PV-{v.id}</span>
              <span className="text-blue-400 w-12 shrink-0 text-right">D{v.depth}</span>
              <span className={v.score >= 0 ? "text-emerald-400 w-14 shrink-0" : "text-rose-400 w-14 shrink-0"}>
                {v.mate ? `#${v.mate}` : (v.score / 100).toFixed(2)}
              </span>
              <span className="text-slate-300 truncate">
                {v.pv.split(' ').map(m => mapNotation(m, language)).join(' ')}
              </span>
            </div>
          ))}
        </div>
        {stats && (
          <div className="mt-2 pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-slate-500 font-bold uppercase tracking-tighter">
            <div>{language === 'es' ? 'NODOS:' : 'NODES:'} <span className="text-slate-300">{stats.nodes.toLocaleString()}</span></div>
            <div>NPS: <span className="text-slate-300">{(stats.nps / 1000).toFixed(1)}K</span></div>
            <div>{language === 'es' ? 'TIEMPO:' : 'TIME:'} <span className="text-slate-300">{stats.time}ms</span></div>
          </div>
        )}
      </div>
    );
  }

  const getStyleColors = () => {
    switch (style) {
      case 'simple': return { bg: '#080a0f', line: '#334155', node: '#3b82f6', text: '#94a3b8', grid: false, label: 'RED BÁSICA', glow: 'rgba(59,130,246,0.2)' };
      case 'organic': return { bg: '#0b0f0b', line: '#166534', node: '#22c55e', text: '#86efac', grid: false, label: 'RED ORGÁNICA', glow: 'rgba(34,197,94,0.2)' };
      case 'quantum': return { bg: '#050505', line: '#7e22ce', node: '#a855f7', text: '#d8b4fe', grid: 'circles', label: 'NODOS CUÁNTICOS', glow: 'rgba(168,85,247,0.4)' };
      case 'neural_flow': return { bg: '#0f172a', line: '#1e293b', node: '#6366f1', text: '#c7d2fe', grid: true, label: 'FLUJO NEURONAL', glow: 'rgba(99,102,241,0.3)' };
      case 'classic': return { bg: '#000000', line: '#b45309', node: '#059669', text: '#ffffff', grid: false, label: 'RED CLÁSICA', glow: 'rgba(16,185,129,0.4)' };
      default: return { bg: '#000000', line: '#334155', node: '#22c55e', text: '#ffffff', grid: false, label: 'SISTEMA NEURONAL', glow: 'transparent' };
    }
  };

  const colors = getStyleColors();

  return (
    <div className="w-full h-full relative overflow-hidden rounded flex outline-none group border border-slate-800 shadow-2xl" style={{ backgroundColor: colors.bg }}>
      <svg width="100%" height="100%" viewBox="0 0 920 500" preserveAspectRatio="xMidYMid meet" className="drop-shadow-2xl">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Renderizar Cuadrícula/Círculos Superpuestos */}
        {colors.grid === true && (
          <g opacity="0.1">
            {Array.from({ length: 20 }).map((_, i) => <line key={`gx-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="500" stroke="#fff" strokeWidth="1" />)}
            {Array.from({ length: 10 }).map((_, i) => <line key={`gy-${i}`} x1="0" y1={i * 50} x2="920" y2={i * 50} stroke="#fff" strokeWidth="1" />)}
          </g>
        )}
        {colors.grid === 'circles' && (
          <g opacity="0.05">
            {[60, 120, 180, 240, 300].map(r => <circle key={r} cx="460" cy="250" r={r} fill="none" stroke={colors.line} strokeWidth="1" strokeDasharray="5 5" />)}
            {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
              const x2 = 460 + 400 * Math.cos(a * Math.PI / 180);
              const y2 = 250 + 400 * Math.sin(a * Math.PI / 180);
              return <line key={a} x1="460" y1="250" x2={x2} y2={y2} stroke={colors.line} strokeWidth="1" />;
            })}
          </g>
        )}

        {/* Dibujar Enlaces */}
        {links.map((link, i) => {
          const isBest = link.target.isBest;
          let d = "";
          if (style === 'quantum' || style === 'organic' || style === 'simple' || style === 'neural_flow') {
            d = `M ${link.source.x} ${link.source.y} L ${link.target.x} ${link.target.y}`;
          } else {
            // Curvas de Bézier para estilo clásico
            d = `M ${link.source.x} ${link.source.y} C ${link.source.x + 50} ${link.source.y}, ${link.target.x - 50} ${link.target.y}, ${link.target.x} ${link.target.y}`;
          }

          return (
            <path
              key={`link-${i}`}
              d={d}
              fill="none"
              stroke={style === 'classic' ? (isBest ? '#10b981' : '#f59e0b') : (style === 'simple' && !isBest ? '#3b82f6' : (isBest ? '#10b981' : colors.line))}
              strokeWidth={style === 'classic' ? (isBest ? 4 : 1.5) : (isBest ? 2 : 1)}
              opacity={isBest ? 0.8 : (style === 'simple' ? 0.4 : 0.2)}
              className="transition-all duration-700"
              filter={isBest ? "url(#glow)" : "none"}
            />
          );
        })}

        {/* Dibujar Nodos */}
        {nodes.map((node) => {
          const isBest = node.isBest;
          let nodeColor = colors.node;
          if (style === 'classic') {
            nodeColor = isBest ? '#34d399' : '#fcd34d';
          }

          return (
            <g key={`node-${node.id}`} className="transition-all duration-700" transform={`translate(${node.x}, ${node.y})`}>
              {style === 'classic' && (
                <circle
                  r={isBest ? 15 : 10}
                  fill={isBest ? '#10b981' : '#f59e0b'}
                  opacity={isBest ? 0.2 : 0.1}
                  filter="url(#glow)"
                />
              )}
              <circle
                r={isBest ? (style === 'classic' ? 7 : 5) : (style === 'classic' ? 4 : 3)}
                fill={nodeColor}
                stroke={style === 'classic' ? (isBest ? '#fff' : '#b45309') : (isBest ? '#fff' : 'none')}
                strokeWidth={style === 'classic' ? 1 : (isBest ? 1 : 0)}
                className={cn("transition-all group-hover:scale-125", isBest && style !== 'neural_flow' && "animate-pulse")}
                style={{ animationDuration: '3s' }}
                filter={isBest ? "url(#glow)" : "none"}
              />
              {node.depth > 0 && (
                <>
                  <text
                    x={0}
                    y={node.y < 30 ? 30 : -22}
                    textAnchor="middle"
                    fill={style === 'classic' ? (isBest ? '#ffffff' : '#cbd5e1') : (isBest ? '#10b981' : colors.text)}
                    fontSize={style === 'classic' ? 18 : (style === 'mesh' ? 12 : 16)}
                    fontFamily="monospace"
                    fontWeight="900"
                    style={style === 'classic' ? { textShadow: '0px 0px 8px rgba(0,0,0,1)' } : {}}
                    className={cn("pointer-events-none transition-opacity", !isBest && (style === 'neural_flow' || style === 'quantum') ? "opacity-30" : "opacity-100")}
                  >
                    {node.move}
                  </text>
                  {style === 'classic' && (
                    <text
                      x={0}
                      y={node.y < 30 ? 30 : -22}
                      textAnchor="middle"
                      fill="transparent"
                      stroke="#000"
                      strokeWidth="1.5"
                      fontSize={18}
                      fontFamily="monospace"
                      fontWeight="900"
                      style={{ pointerEvents: 'none', opacity: 0.8 }}
                    >
                      {node.move}
                    </text>
                  )}
                  {node.children.length === 0 && (
                     <text
                        x={0}
                        y={node.y < 30 ? 45 : 18}
                        textAnchor="middle"
                        fill={isBest ? '#10b981' : colors.text}
                        fontSize={10}
                        fontFamily="monospace"
                        fontWeight="bold"
                        opacity={isBest ? 0.9 : 0.5}
                     >
                        {node.mate !== undefined ? `M${Math.abs(node.mate)}` : `${node.score > 0 ? '+' : ''}${(node.score / 100).toFixed(2)}`}
                     </text>
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Superposición de Etiqueta de Estilo */}
      <div className="absolute top-2 left-2 bg-black/40 px-2 py-0.5 rounded text-[8px] font-black text-white/40 uppercase tracking-[0.2em] border border-white/5">
        SYS_ESTILO.{colors.label}
      </div>

      {/* Información del HUD */}
      <div className="absolute bottom-2 left-2 flex gap-3 text-[8px] font-mono opacity-60">
        <div className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-500"></span> {language === 'es' ? 'Principal' : 'Best'}</div>
        <div className="flex items-center gap-1"><span className="w-2 h-0.5 border-t border-dashed border-amber-500"></span> {language === 'es' ? 'Podado/Explorado' : 'Pruned/Explored'}</div>
      </div>

      {stats && (
        <div className="absolute bottom-2 right-2 flex items-center gap-4 text-[9px] font-mono font-black tracking-tighter opacity-40 hover:opacity-100 transition-opacity">
          <div className="text-slate-400">NPS: <span className="text-white">{(stats.nps / 1000).toFixed(1)}K</span></div>
          <div className="text-slate-400">NOD: <span className="text-white">{stats.nodes.toLocaleString()}</span></div>
        </div>
      )}
    </div>
  );
};
