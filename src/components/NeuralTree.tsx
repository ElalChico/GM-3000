import React, { useMemo, useEffect, useRef } from 'react';
import { Variation, EngineStats } from '../engine/Stockfish';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { nodes, links, maxDepth } = useMemo(() => {
    const root: TreeNode = { id: 'root', move: 'START', depth: 0, isBest: true, score: 0, children: [], x: 0, y: 0 };
    const nodeMap = new Map<string, TreeNode>();
    nodeMap.set('root', root);

    const MAX_VIZ_DEPTH = (style === 'quantum' || style === 'organic') ? 15 : 12;
    const varsToUse = style === 'simple' ? variations.slice(0, 10) : variations.slice(0, 25);

    varsToUse.forEach((v) => {
      const moves = v.pv.split(' ').slice(0, MAX_VIZ_DEPTH);
      const isBestLine = v.id === 1;
      let curr = root;
      moves.forEach((moveStr, d) => {
        const mappedMove = mapNotation(moveStr, language);
        const childId = `${curr.id}-${mappedMove}`;
        let child = nodeMap.get(childId);
        if (!child) {
          child = { id: childId, move: mappedMove, depth: d + 1, isBest: isBestLine, score: v.score, mate: v.mate, children: [], x: 0, y: 0 };
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

    const groupedByDepth: Record<number, TreeNode[]> = {};
    Array.from(nodeMap.values()).forEach(n => {
      if (!groupedByDepth[n.depth]) groupedByDepth[n.depth] = [];
      groupedByDepth[n.depth].push(n);
    });

    const boxWidth = 920;
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
      n.children.forEach(c => outLinks.push({ source: n, target: c }));
    });

    return { nodes: Array.from(nodeMap.values()), links: outLinks, maxDepth: actMaxDepth };
  }, [variations, language, style]);

  const getStyleColors = () => {
    switch (style) {
      case 'simple': return { bg: '#080a0f', line: '#1e293b', node: '#3b82f6', text: '#94a3b8', grid: false, label: 'RED BÁSICA', glow: '#3b82f6' };
      case 'organic': return { bg: '#0b0f0b', line: '#14532d', node: '#22c55e', text: '#86efac', grid: false, label: 'RED ORGÁNICA', glow: '#22c55e' };
      case 'quantum': return { bg: '#050505', line: '#581c87', node: '#a855f7', text: '#d8b4fe', grid: 'circles', label: 'NODOS CUÁNTICOS', glow: '#a855f7' };
      case 'neural_flow': return { bg: '#020617', line: '#0f172a', node: '#6366f1', text: '#c7d2fe', grid: true, label: 'FLUJO NEURONAL', glow: '#6366f1' };
      case 'classic': return { bg: '#000000', line: '#78350f', node: '#10b981', text: '#ffffff', grid: false, label: 'RED CLÁSICA', glow: '#10b981' };
      default: return { bg: '#000000', line: '#1e293b', node: '#14b8a6', text: '#ffffff', grid: false, label: 'SISTEMA NEURONAL', glow: '#14b8a6' };
    }
  };
  const colors = getStyleColors();

  useEffect(() => {
    if (style === 'stream' || variations.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Variables para Pan y Zoom
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const zoom = Math.exp(-e.deltaY * zoomSensitivity);
      
      const mouseX = e.offsetX * dpr;
      const mouseY = e.offsetY * dpr;
      
      panX = mouseX - (mouseX - panX) * zoom;
      panY = mouseY - (mouseY - panY) * zoom;
      scale *= zoom;
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastX = e.offsetX;
      lastY = e.offsetY;
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = (e.offsetX - lastX) * dpr;
      const dy = (e.offsetY - lastY) * dpr;
      panX += dx;
      panY += dy;
      lastX = e.offsetX;
      lastY = e.offsetY;
    };

    const handleMouseUp = () => {
      isDragging = false;
      canvas.style.cursor = 'grab';
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.style.cursor = 'grab';

    // Animación continua para efecto "tiempo real"
    let animationFrameId: number;

    const render = (timestamp: number) => {
      const time = timestamp * 0.002;
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.setTransform(scale, 0, 0, scale, panX, panY);

      // Dibujar cuadrícula si es necesario
      if (colors.grid === true) {
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1 / scale; // Mantener grosor visual
        ctx.beginPath();
        for (let i = -10; i < 40; i++) { ctx.moveTo(i * 50, -500); ctx.lineTo(i * 50, 1000); }
        for (let i = -10; i < 20; i++) { ctx.moveTo(-500, i * 50); ctx.lineTo(1500, i * 50); }
        ctx.stroke();
      } else if (colors.grid === 'circles') {
        ctx.strokeStyle = colors.line;
        ctx.lineWidth = 1 / scale;
        ctx.setLineDash([5 / scale, 5 / scale]);
        [60, 120, 180, 240, 300, 400, 500].forEach(r => {
          ctx.beginPath();
          ctx.arc(460, 250, r, 0, 2 * Math.PI);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }

      // Dibujar enlaces (links)
      links.forEach(link => {
        const isBest = link.target.isBest;
        ctx.beginPath();
        if (style === 'classic') {
          ctx.moveTo(link.source.x, link.source.y);
          ctx.bezierCurveTo(link.source.x + 50, link.source.y, link.target.x - 50, link.target.y, link.target.x, link.target.y);
        } else {
          ctx.moveTo(link.source.x, link.source.y);
          ctx.lineTo(link.target.x, link.target.y);
        }
        
        ctx.strokeStyle = style === 'classic' ? (isBest ? '#10b981' : '#f59e0b') : (style === 'simple' && !isBest ? '#3b82f6' : (isBest ? '#10b981' : colors.line));
        ctx.lineWidth = (style === 'classic' ? (isBest ? 4 : 1.5) : (isBest ? 3 : 1.5)) / scale;
        ctx.globalAlpha = isBest ? 0.95 : (style === 'simple' ? 0.6 : 0.35);
        ctx.stroke();
      });

      // Dibujar nodos (nodes)
      nodes.forEach(node => {
        const isBest = node.isBest;
        let nodeColor = colors.node;
        if (style === 'classic') nodeColor = isBest ? '#34d399' : '#fcd34d';

        ctx.globalAlpha = 1;
        
        // Efecto de pulso u oscilación para nodos principales (Hardware Accelerated Feel)
        const pulse = isBest ? Math.sin(time + node.depth) * 2 : 0;
        const radius = (isBest ? (style === 'classic' ? 7 : 6) : 4) + (isBest ? pulse : 0);

        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(radius, 2), 0, 2 * Math.PI);
        ctx.fillStyle = nodeColor;
        
        if (isBest) {
          ctx.shadowColor = colors.glow;
          ctx.shadowBlur = 15;
        } else {
          ctx.shadowBlur = 0;
        }
        
        ctx.fill();

        if (isBest) {
          ctx.lineWidth = 1.5 / scale;
          ctx.strokeStyle = '#10b981';
          ctx.stroke();
        }

        ctx.shadowBlur = 0; // Reset shadow for text

        // Textos y etiquetas
        if (node.depth > 0) {
          ctx.textAlign = 'center';
          ctx.font = `900 ${style === 'classic' ? 18 : 14}px monospace`;
          ctx.fillStyle = style === 'classic' ? (isBest ? '#ffffff' : '#cbd5e1') : (isBest ? '#10b981' : colors.text);
          ctx.globalAlpha = !isBest && (style === 'neural_flow' || style === 'quantum') ? 0.4 : 1;
          
          const textY = node.y < 30 ? node.y + 30 : node.y - 15;
          ctx.fillText(node.move, node.x, textY);

          if (node.children.length === 0) {
            ctx.font = 'bold 10px monospace';
            ctx.globalAlpha = isBest ? 0.9 : 0.5;
            const evalText = node.mate !== undefined ? `M${Math.abs(node.mate)}` : `${node.score > 0 ? '+' : ''}${(node.score / 100).toFixed(2)}`;
            const evalY = node.y < 30 ? node.y + 45 : node.y + 18;
            ctx.fillText(evalText, node.x, evalY);
          }
        }
      });
      
      animationFrameId = requestAnimationFrame(render);
    };
    
    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [nodes, links, style, colors]);

  if (variations.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/20 rounded">
        <div className="flex flex-col items-center gap-2 opacity-30">
          <div className="w-8 h-8 rounded-full border-2 border-teal-500/50 border-t-transparent animate-spin" />
          <span className="text-slate-500 text-[9px] uppercase font-mono tracking-widest">
            {language === 'es' ? 'Esperando datos...' : 'Waiting for data...'}
          </span>
        </div>
      </div>
    );
  }

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

  return (
    <div className="w-full h-full relative overflow-hidden rounded flex flex-col outline-none group border border-slate-800 shadow-2xl" style={{ backgroundColor: colors.bg }}>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block flex-1" 
        style={{ width: '100%', height: '100%' }}
      />
      
      <div className="absolute top-2 left-2 bg-black/40 px-2 py-0.5 rounded text-[8px] font-black text-emerald-400/80 uppercase tracking-[0.2em] border border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]">
        SYS_ESTILO.{colors.label} (ACELERACIÓN CANVAS ⚡)
      </div>

      <div className="absolute bottom-2 left-2 flex gap-3 text-[8px] font-mono opacity-60">
        <div className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-500"></span> {language === 'es' ? 'Principal' : 'Best'}</div>
        <div className="flex items-center gap-1"><span className="w-2 h-0.5 border-t border-dashed border-amber-500"></span> {language === 'es' ? 'Podado/Explorado' : 'Pruned/Explored'}</div>
      </div>

      {stats && (
        <div className="absolute bottom-2 right-2 flex items-center gap-4 text-[9px] font-mono font-black tracking-tighter opacity-80 bg-black/50 px-2 py-1 rounded">
          <div className="text-emerald-500">NPS: <span className="text-emerald-100">{(stats.nps / 1000).toFixed(1)}K</span></div>
          <div className="text-emerald-500">NODES: <span className="text-emerald-100">{stats.nodes.toLocaleString()}</span></div>
        </div>
      )}
    </div>
  );
};
