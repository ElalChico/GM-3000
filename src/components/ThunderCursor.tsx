import React, { useEffect, useState } from 'react';

// Genera puntos para un rayo fractalesco
function generateLightning(startX: number, startY: number, endX: number, endY: number) {
  const points = [{ x: startX, y: startY }];
  let currentX = startX;
  let currentY = startY;
  
  const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  const steps = Math.max(10, Math.floor(distance / 20));
  
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const targetX = startX + (endX - startX) * progress;
    const targetY = startY + (endY - startY) * progress;
    
    // Variación aleatoria
    const variance = (Math.random() - 0.5) * 50;
    
    currentX = targetX + (i === steps ? 0 : variance);
    currentY = targetY; // Forzamos bajar
    
    points.push({ x: currentX, y: currentY });
  }
  
  points[points.length - 1] = { x: endX, y: endY };
  return points;
}

export function ThunderCursor() {
  const [lightnings, setLightnings] = useState<{ id: number; path: string; x: number; y: number }[]>([]);
  
  useEffect(() => {
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    let isRunning = true;
    let nextThunderTime = Date.now() + Math.random() * 5000 + 2000;
    
    const loop = () => {
      if (!isRunning) return;
      
      const now = Date.now();
      if (now > nextThunderTime) {
        // Disparar rayo
        const startX = mouseX + (Math.random() - 0.5) * 200;
        const startY = 0; // Desde arriba
        
        const pts = generateLightning(startX, startY, mouseX, mouseY);
        const path = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
        
        const id = now;
        setLightnings(prev => [...prev, { id, path, x: mouseX, y: mouseY }]);
        
        // Quitarlo después de 300ms
        setTimeout(() => {
          setLightnings(prev => prev.filter(l => l.id !== id));
        }, 400);
        
        // Programar siguiente
        nextThunderTime = now + Math.random() * 8000 + 3000; // Cada 3 a 11 segundos
      }
      
      requestAnimationFrame(loop);
    };
    
    requestAnimationFrame(loop);
    
    return () => {
      isRunning = false;
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  if (lightnings.length === 0) return null;

  return (
    <svg className="fixed inset-0 pointer-events-none z-50 w-full h-full">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {lightnings.map((l) => (
        <g key={l.id}>
          {/* Destello en el punto de impacto */}
          <circle cx={l.x} cy={l.y} r="8" fill="white" filter="url(#glow)" opacity="0.8">
            <animate attributeName="r" values="8;20;0" dur="0.3s" fill="freeze" />
            <animate attributeName="opacity" values="0.8;1;0" dur="0.3s" fill="freeze" />
          </circle>
          {/* Rayo principal */}
          <path
            d={l.path}
            fill="none"
            stroke="#a5f3fc"
            strokeWidth="3"
            filter="url(#glow)"
          >
            <animate attributeName="opacity" values="1;0" dur="0.25s" fill="freeze" />
          </path>
          {/* Brillo interno */}
          <path
            d={l.path}
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
          >
            <animate attributeName="opacity" values="1;0" dur="0.25s" fill="freeze" />
          </path>
        </g>
      ))}
    </svg>
  );
}
