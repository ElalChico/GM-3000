import { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ImageCropModalProps {
  imageSrc: string;
  onCrop: (croppedBase64: string) => void;
  onClose: () => void;
  language: string;
}

const CROP_SIZE = 320;

export default function ImageCropModal({ imageSrc, onCrop, onClose, language }: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = CROP_SIZE * 2;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    const imgAspect = img.naturalWidth / img.naturalHeight;
    let baseW: number, baseH: number;
    if (imgAspect > 1) {
      baseH = size * 0.8;
      baseW = baseH * imgAspect;
    } else {
      baseW = size * 0.8;
      baseH = baseW / imgAspect;
    }

    const drawW = baseW * zoom;
    const drawH = baseH * zoom;
    const drawX = (size - drawW) / 2 + offset.x;
    const drawY = (size - drawH) / 2 + offset.y;

    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }, [zoom, offset, loaded]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: t.clientX - offset.x, y: t.clientY - offset.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const t = e.touches[0];
    setOffset({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y });
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const out = document.createElement("canvas");
    out.width = 400;
    out.height = 400;
    const ctx = out.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(200, 200, 200, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(canvas, 0, 0, 400, 400);

    onCrop(out.toDataURL("image/jpeg", 0.85));
  };

  const resetTransform = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="w-[440px] rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#111318", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="text-sm font-semibold text-white/90 tracking-wide">
            {language === "es" ? "Recortar foto" : "Crop photo"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          <div
            ref={containerRef}
            className="relative rounded-full overflow-hidden select-none"
            style={{ width: CROP_SIZE, height: CROP_SIZE, cursor: isDragging ? "grabbing" : "grab" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            <div className="absolute inset-0 rounded-full" style={{ boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.1)" }} />
            <canvas
              ref={canvasRef}
              style={{ width: CROP_SIZE, height: CROP_SIZE, borderRadius: "50%" }}
            />
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-full">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full max-w-[260px]">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1 appearance-none rounded-full bg-white/10 accent-white/40 cursor-pointer"
            />
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetTransform}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-[10px] font-medium tracking-wide transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              {language === "es" ? "Restablecer" : "Reset"}
            </button>
            <span className="text-[9px] text-white/20">
              {language === "es" ? "Arrastra para posicionar" : "Drag to position"}
            </span>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/40 text-xs font-semibold uppercase tracking-wider hover:bg-white/8 transition-colors"
          >
            {language === "es" ? "Cancelar" : "Cancel"}
          </button>
          <button
            onClick={handleCrop}
            className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/90 text-xs font-semibold uppercase tracking-wider hover:bg-white/15 transition-colors"
          >
            {language === "es" ? "Aplicar" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
