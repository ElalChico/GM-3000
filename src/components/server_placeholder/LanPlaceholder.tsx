import React from 'react';
import { Download, Wifi } from 'lucide-react';

interface LanPlaceholderProps {
  language: string;
}

export const LanPlaceholder: React.FC<LanPlaceholderProps> = ({ language }) => {
  return (
    <div className="bg-slate-900/60 p-4 rounded-xl border border-teal-500/20 space-y-3 flex flex-col items-center text-center mt-3 shadow-lg">
      <div className="flex items-center gap-2 text-teal-400">
        <Wifi className="w-5 h-5" />
        <h3 className="text-[12px] font-black uppercase tracking-widest">
          {language === "es" ? "Multijugador LAN" : "LAN Multiplayer"}
        </h3>
      </div>
      <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
        {language === "es" 
          ? "La opción multijugador está disponible exclusivamente para la versión de escritorio de GM-3000." 
          : "The multiplayer option is exclusively available for the desktop version of GM-3000."}
      </p>
      <a 
        href="https://github.com/ElalChico/GM-3000" 
        target="_blank" 
        rel="noreferrer"
        className="w-full py-2.5 mt-2 bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-600 hover:to-teal-500 border border-teal-500/50 text-white rounded-lg text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(20,184,166,0.3)]"
      >
        <Download className="w-4 h-4" />
        {language === "es" ? "Descargar en GitHub" : "Download from GitHub"}
      </a>
    </div>
  );
};
