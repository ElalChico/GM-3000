import React, { useEffect, useRef } from "react";

interface AdventureAmbienceProps {
  isActive: boolean;
  intensity?: "light" | "medium" | "heavy";
  enableSound?: boolean;
  highQuality?: boolean;
}

export const AdventureAmbience: React.FC<AdventureAmbienceProps> = ({
  isActive,
  intensity = "medium",
  enableSound = true,
  highQuality = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reproducir trueno - versión sintética WebAudio
  const playThunderSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioContext.currentTime;
      const duration = 0.5;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + duration);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    
    const setSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    setSize();
    window.addEventListener('resize', setSize);

    const multipliers = { light: 0.5, medium: 1, heavy: 1.5 };
    const mult = highQuality ? multipliers[intensity] : multipliers[intensity] * 0.5;

    // Determinar el "capítulo" o modo actual para no sobrecargar
    const modes = ['storm', 'fire', 'matrix', 'space'];
    const currentMode = modes[Math.floor(Math.random() * modes.length)];

    // 1. Tormenta (Lluvia)
    const rainDrops = Array.from({ length: 100 * mult }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      length: Math.random() * 20 + 10,
      speed: Math.random() * 10 + 15,
      opacity: Math.random() * 0.5 + 0.1
    }));

    // 2. Fuego y Humo
    const fireParticles = Array.from({ length: 60 * mult }).map(() => ({
      x: Math.random() * width,
      y: height + Math.random() * 20,
      size: Math.random() * 15 + 5,
      speedY: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 1,
      life: Math.random() * 100,
      maxLife: Math.random() * 50 + 50
    }));

    // 3. Matrix / Cálculos
    const chessMath = ["E = mc²", "f(x) = αx + β", "∇²f", "lim(x→∞)", "NPS: 3.4M", "Depth: 24", "mate in 12", "alpha-beta", "0100101", "W(x) = Σw_i*x_i"];
    const calculations = Array.from({ length: 25 * mult }).map(() => ({
      text: chessMath[Math.floor(Math.random() * chessMath.length)],
      x: Math.random() * width,
      y: Math.random() * height,
      speedY: -Math.random() * 1 - 0.5, // Matrix suele caer, pero aquí lo haremos subir rápido
      opacity: 0,
      life: 0,
      maxLife: Math.random() * 200 + 100
    }));

    // 4. Espacio (Estrellas)
    const stars = Array.from({ length: 150 * mult }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2,
      twinkle: Math.random() * Math.PI * 2
    }));

    let animationFrameId: number;
    let lastThunderTime = 0;
    let lightningOpacity = 0;

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // --- MODO TORMENTA ---
      if (currentMode === 'storm') {
        if (time - lastThunderTime > (highQuality ? 4000 : 8000) + Math.random() * 5000) {
          if (Math.random() < 0.4 * mult) {
            lightningOpacity = 0.8;
            lastThunderTime = time;
            if (enableSound) playThunderSound();
          }
        }
        if (lightningOpacity > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${lightningOpacity})`;
          ctx.fillRect(0, 0, width, height);
          ctx.beginPath();
          ctx.moveTo(Math.random() * width, 0);
          ctx.lineTo(Math.random() * width + 100, height / 2);
          ctx.lineTo(Math.random() * width, height);
          ctx.strokeStyle = `rgba(200, 230, 255, ${lightningOpacity + 0.2})`;
          ctx.lineWidth = 3;
          ctx.stroke();
          lightningOpacity -= 0.05;
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        rainDrops.forEach(drop => {
          ctx.globalAlpha = drop.opacity;
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - drop.length * 0.2, drop.y + drop.length);
          drop.y += drop.speed;
          drop.x -= drop.speed * 0.2;
          if (drop.y > height) {
            drop.y = -drop.length;
            drop.x = Math.random() * width;
          }
        });
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // --- MODO MATRIX / CÁLCULOS ---
      if (currentMode === 'matrix') {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.8)'; // Verde Matrix
        ctx.font = '14px monospace';
        calculations.forEach(calc => {
          calc.life++;
          if (calc.life < 50) calc.opacity = calc.life / 50;
          else if (calc.life > calc.maxLife - 50) calc.opacity = Math.max(0, (calc.maxLife - calc.life) / 50);
          else calc.opacity = 1;

          ctx.globalAlpha = calc.opacity * 0.6;
          ctx.fillText(calc.text, calc.x, calc.y);
          calc.y += calc.speedY; // Sube
          
          if (calc.life > calc.maxLife) {
            calc.life = 0;
            calc.y = height + 20;
            calc.x = Math.random() * width;
            calc.text = chessMath[Math.floor(Math.random() * chessMath.length)];
          }
        });
        ctx.globalAlpha = 1;
      }

      // --- MODO FUEGO ---
      if (currentMode === 'fire') {
        fireParticles.forEach(p => {
          p.life++;
          p.y -= p.speedY;
          p.x += p.speedX;
          const progress = p.life / p.maxLife;
          p.size = Math.max(0, p.size - 0.1);
          const opacity = Math.max(0, 1 - progress);
          
          let r = 255, g = 100, b = 0;
          if (progress > 0.5) { g = 200; b = 50; }
          if (progress > 0.8) { r = 100; g = 100; b = 100; }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.7})`;
          ctx.fill();

          if (p.life > p.maxLife || p.size <= 0) {
            p.life = 0;
            p.y = height + 10;
            p.x = Math.random() * width;
            p.size = Math.random() * 15 + 5;
          }
        });
      }

      // --- MODO ESPACIO ---
      if (currentMode === 'space') {
        ctx.fillStyle = 'white';
        stars.forEach(star => {
          star.twinkle += 0.05;
          const opacity = 0.5 + Math.sin(star.twinkle) * 0.5;
          ctx.globalAlpha = opacity;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', setSize);
    };
  }, [isActive, intensity, enableSound, highQuality]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[2]"
      style={{ width: '100%', height: '100%', mixBlendMode: 'screen' }}
    />
  );
};
