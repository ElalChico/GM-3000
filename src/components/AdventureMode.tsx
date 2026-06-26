import React, { useState, useEffect } from "react";
import { Sword, Shield, X, Award, ChevronRight, Skull, Target, Cpu, MessageCircle, ChevronLeft, Crown, Lock, User, Home, Book, Trophy, Zap, Flag, Gem, Flame, Ghost, AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";

// Importar assets
import SirAlaricImg from "../assets/Sir_Alaric.webp";
import EddImg from "../assets/EDD.webp";
import LordValeriusImg from "../assets/Lord_Valerius.webp";
import LordElrodImg from "../assets/Lord_Elrod.webp";
import CaballeroImg from "../assets/caballero_sombra.webp";
import SoldadoImg from "../assets/soldado_oscuro.webp";
import EjercitoImg from "../assets/ejercito.webp";
import CabeceraAventuraImg from "../assets/cabecera modo aventura.webp";

export interface AdventureEnemy {
  id: string;
  name: string;
  title: string;
  image: string;
  bio: string;
  quote: string;
  engineType: "lite" | "atlas" | "edd" | "stockfish" | "obsidian";
  depth: number;
  eloRange: string;
  tier: "soldado" | "jefe";
}

export interface AdventureStage {
  id: number;
  name: string;
  subtitle: string;
  requiredWins: number;
  enemies: AdventureEnemy[];
  boss: AdventureEnemy;
}

export const STAGES: AdventureStage[] = [
  {
    id: 1,
    name: "Primera Noche",
    subtitle: "El Alba del Asedio",
    requiredWins: 10,
    enemies: [
      {
        id: "soldado_1",
        name: "Soldado Oscuro",
        title: "Autómata del Umbral",
        image: SoldadoImg,
        bio: "Un vestigio de voluntad atrapado en una armadura que ya no alberga carne, sino ecos de una orden olvidada. No posee nombre ni miedo; es el primer peldaño de una escalera que desciende hacia un abismo de mármol y sombras.",
        quote: "No hay gloria en el primer paso, solo la amarga certeza de que el camino ya ha sido escrito con tu propia sangre.",
        engineType: "lite",
        depth: 3,
        eloRange: "800",
        tier: "soldado",
      },
    ],
    boss: {
      id: "sir_alaric",
      name: "Sir Alaric",
      title: "Guardián del Primer Milenio · El Iniciador",
      image: SirAlaricImg,
      bio: "Primogénito de las sombras, Alaric custodia el umbral donde el tiempo se detiene. Su mirada ha visto caer imperios ante el avance de un simple peón, y su espada es el heraldo de una noche eterna que no conoce el alba ni el perdón.",
      quote: "No temas al acero, sino al silencio sepulcral que precede al colapso. El tablero es el espejo donde tu destino se quiebra.",
      engineType: "lite",
      depth: 8,
      eloRange: "1200",
      tier: "jefe",
    },
  },
  {
    id: 2,
    name: "Segunda Noche",
    subtitle: "El Ojo del Observador",
    requiredWins: 10,
    enemies: [
      {
        id: "caballero_sombra",
        name: "Caballero Sombra",
        title: "Espectro del Segundo Círculo",
        image: CaballeroImg,
        bio: "Un vigía sin rostro atrapado en una paradoja táctica. Sus movimientos no siguen la lógica de los vivos; son susurros de una inteligencia cósmica que habita en los rincones más oscuros del pensamiento, allí donde la razón se rinde ante lo desconocido.",
        quote: "Las sombras no mienten, pues no tienen lengua; solo revelan la fragilidad que intentas ocultar tras tus defensas de cristal.",
        engineType: "atlas",
        depth: 6,
        eloRange: "1400",
        tier: "soldado",
      },
    ],
    boss: {
      id: "edd",
      name: "EDD",
      title: "Guardián del Segundo Milenio · El Observador Silente",
      image: EddImg,
      bio: "Se dice que EDD fue un erudito que se asomó al Abismo Táctico y el Abismo le devolvió la mirada, devorando su humanidad. Ahora, su mente procesa infinitas variantes simultáneas, viendo cada partida como un tapiz de realidades donde tu derrota es la única constante absoluta.",
      quote: "Tus piezas son marionetas de un azar que yo ya he calculado hasta el fin de los tiempos. El jaque no es una posibilidad, es una ley física inevitable.",
      engineType: "atlas",
      depth: 12,
      eloRange: "1700",
      tier: "jefe",
    },
  },
  {
    id: 3,
    name: "Tercera Noche",
    subtitle: "La Muralla Eterna",
    requiredWins: 10,
    enemies: [
      {
        id: "caballero_sombra_2",
        name: "Caballero de Hierro",
        title: "Bastión del Tercer Círculo",
        image: CaballeroImg,
        bio: "Un centinela cuya armadura ha sido sellada por el peso de mil inviernos. Su estrategia no busca el brillo de la estocada, sino la erosión lenta de la esperanza enemiga. Es la roca contra la que se estrellan los sueños de grandeza.",
        quote: "La victoria es una ilusión de los jóvenes. El verdadero poder reside en la resistencia infinita del acero que no cede.",
        engineType: "edd",
        depth: 8,
        eloRange: "1900",
        tier: "soldado",
      },
    ],
    boss: {
      id: "lord_valerius",
      name: "Lord Valerius",
      title: "Guardián del Tercer Milenio · La Muralla de la Orden",
      image: LordValeriusImg,
      bio: "La fortificación viviente del Códice. Su escudo ha repelido asedios que duraron milenios y su armadura lleva las marcas de batallas libradas en el silencio del vacío. Representa la quietud cósmica que precede a la extinción.",
      quote: "La paciencia es el único acero que no se quiebra ante la eternidad. Si buscas gloria rápida, solo encontrarás cenizas.",
      engineType: "edd",
      depth: 18,
      eloRange: "2200",
      tier: "jefe",
    },
  },
  {
    id: 4,
    name: "El Umbral",
    subtitle: "La Noche Sin Nombre",
    requiredWins: 10,
    enemies: [
      {
        id: "ejercito_elrod",
        name: "Legión de Elrod",
        title: "La Enjambre de la Locura",
        image: EjercitoImg,
        bio: "No son soldados, sino una mente colmena que procesa el caos como si fuera una sinfonía de destrucción. Cada guerrero es un fragmento de la voluntad fragmentada de Elrod, moviéndose con una coordinación que desafía toda lógica humana.",
        quote: "El caos no es desorden; es la libertad absoluta de un tablero que ya no respeta las leyes de los hombres.",
        engineType: "stockfish",
        depth: 12,
        eloRange: "2500",
        tier: "soldado",
      },
    ],
    boss: {
      id: "lord_elrod",
      name: "Lord Elrod",
      title: "El Arquitecto de la Nada · Señor del Umbral",
      image: LordElrodImg,
      bio: "El último guardián, una entidad que habita en el espacio entre las jugadas. Lord Elrod no juega al ajedrez; él dicta las leyes de la realidad donde las piezas mueren. Su presencia es un poema de horror escrito en la oscuridad absoluta.",
      quote: "Has cruzado tres mil noches solo para descubrir que el final es el mismo que el principio: el vacío. Tu rey es mío antes de que toques la primera pieza.",
      engineType: "stockfish",
      depth: 24,
      eloRange: "3000",
      tier: "jefe",
    },
  },
];

export interface AdventureProgress {
  playerElo: number;
  currentStage: number;
  wins: Record<string, number>;
  defeated: string[];
  humanBattles: number;
}

interface AdventureModeProps {
  onStartBattle: (enemy: AdventureEnemy, playerElo: number) => void;
  onClose: () => void;
  onReturnToGame: () => void;
  adventureProgress: AdventureProgress;
  onResetCounter: () => void;
  adventureBgOpacity: number;
  setAdventureBgOpacity: (val: number) => void;
  adventureBgHighQuality: boolean;
  setAdventureBgHighQuality: (val: boolean) => void;
  language: string;
  playerName: string;
  adventurePlayerName: string;
  setAdventurePlayerName: (val: string) => void;
  showEnemyElo: boolean;
  setShowEnemyElo: (val: boolean) => void;
  adventureMusicVolume: number;
  setAdventureMusicVolume: (val: number) => void;
  hasActiveGame: boolean;
  isAdventureModeOpen: boolean;
  lanColor?: "white" | "black";
  lanStatus?: string;
  playAudio: (id: string) => void;
}

function getEloDepth(baseDepth: number, playerElo: number, enemyEloStr: string): number {
  const base = baseDepth;
  if (playerElo < 800) return Math.max(1, base - 4);
  if (playerElo < 1200) return Math.max(2, base - 2);
  if (playerElo < 1600) return base;
  return Math.min(25, base + 2);
}

function getEngineByElo(playerElo: number, enemy: AdventureEnemy): AdventureEnemy {
  let engineType: "lite" | "atlas" | "edd" | "stockfish" | "obsidian" = enemy.engineType;
  if (playerElo >= 2000) {
    engineType = "stockfish";
  } else if (playerElo >= 1400) {
    engineType = enemy.engineType === "lite" ? "atlas" : (Math.random() > 0.5 ? "edd" : "atlas");
  } else {
    engineType = "lite";
  }
  return { ...enemy, engineType };
}

const RANK_TITLES = [
  { min: 0, title: "Siervo", icon: <Flame className="w-3 h-3 text-amber-900/40" /> },
  { min: 10, title: "Escudero", icon: <Shield className="w-3.5 h-3.5 text-amber-800" /> },
  { min: 50, title: "Caballero", icon: <Sword className="w-3.5 h-3.5 text-amber-700" /> },
  { min: 150, title: "Capitán", icon: <Sword className="w-4 h-4 text-amber-600 shadow-lg" /> },
  { min: 400, title: "Barón", icon: <Crown className="w-4 h-4 text-amber-500" /> },
  { min: 900, title: "Conde", icon: <Crown className="w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" /> },
  { min: 1500, title: "Duque", icon: <Gem className="w-4 h-4 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" /> },
  { min: 2200, title: "Rey", icon: <Crown className="w-5 h-5 text-amber-200 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]" /> },
  { min: 3000, title: "Gran Maestre", icon: <Skull className="w-5 h-5 text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]" /> },
];

function getRank(battles: number = 0) {
  let rank = RANK_TITLES[0];
  const safeBattles = isNaN(battles) ? 0 : battles;
  for (const r of RANK_TITLES) {
    if (safeBattles >= r.min) rank = r;
  }
  return rank;
}

// --- Componentes Internos ---
const CharacterPanel: React.FC<{
  enemy: AdventureEnemy;
  playerElo: number;
  onStart: () => void;
  onClose: () => void;
  lanColor?: "white" | "black";
  lanStatus?: string;
  language: string;
  playAudio: (id: string) => void;
}> = ({ enemy, playerElo, onStart, onClose, lanColor, lanStatus, language, playAudio }) => {
  const isBoss = enemy.tier === "jefe";
  return (
    <div className="absolute inset-0 z-[6000] flex items-center justify-center bg-black/95 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-500">
      <div className={`relative w-full max-w-3xl rounded-2xl border overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.7)] ${isBoss ? "border-red-900/40 shadow-red-900/10" : "border-amber-900/30 shadow-amber-900/5"} bg-[#050408] max-h-[92vh] flex flex-col md:flex-row`}>
        
        {/* Imagen Estilo Tarjeta - Proporción Ajustada */}
        <div className="w-full md:w-[320px] shrink-0 relative flex items-center justify-center bg-black group/card border-b md:border-b-0 md:border-r border-amber-900/20">
           <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,rgba(217,119,6,0.15)_0%,transparent_70%)]" />
           <img 
             src={enemy.image} 
             alt={enemy.name} 
             className="relative z-10 w-full h-48 md:h-full object-contain p-4 md:p-6 drop-shadow-[0_5px_20px_rgba(0,0,0,0.8)] animate-in slide-in-from-left duration-700 select-none pointer-events-none" 
             draggable={false}
             onContextMenu={(e) => e.preventDefault()}
           />
           
           <div className="absolute bottom-0 left-0 p-4 opacity-10 pointer-events-none hidden md:block">
              <Sword className="w-8 h-8 text-amber-700 -rotate-45" />
           </div>
        </div>

        {/* Información Lateral Compacta */}
        <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar bg-gradient-to-br from-transparent via-black/20 to-amber-950/5">
          <div className="space-y-1 animate-in fade-in slide-in-from-top duration-700 delay-100">
            <span className="text-amber-800 text-[9px] font-black uppercase tracking-[0.3em] mb-1 block">Guardián de las 3000 Noches</span>
            <h2 className="text-3xl md:text-4xl font-black text-amber-500 uppercase tracking-tight leading-tight" style={{ fontFamily: "Georgia, serif" }}>{enemy.name}</h2>
            <p className="text-amber-600/60 text-[10px] font-bold uppercase tracking-[0.2em]">{enemy.title}</p>
          </div>

          <div className="space-y-4 animate-in fade-in duration-700 delay-300">
            <div className="relative">
              <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-amber-900/40" />
              <p className="text-stone-400 text-sm italic leading-relaxed">
                {enemy.bio}
              </p>
            </div>

            <div className="bg-black/60 p-4 rounded-xl border border-amber-900/10 relative overflow-hidden">
              <p className="text-amber-200/80 text-xs font-bold italic leading-relaxed relative z-10">
                "{enemy.quote}"
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom duration-700 delay-500">
            <div className="bg-stone-950/80 p-3 rounded-lg border border-amber-900/10 flex flex-col gap-0.5">
              <span className="text-[8px] text-stone-600 uppercase tracking-widest font-black">Poder (Elo)</span>
              <span className="text-lg font-mono text-amber-500 font-black tracking-tighter">{enemy.eloRange}</span>
            </div>
            <div className="bg-stone-950/80 p-3 rounded-lg border border-amber-900/10 flex flex-col gap-0.5">
              <span className="text-[8px] text-stone-600 uppercase tracking-widest font-black">Motor</span>
              <span className="text-lg font-mono text-amber-500 font-black tracking-tighter">{enemy.engineType.toUpperCase()}</span>
            </div>
          </div>

          <div className="mt-auto pt-4 flex flex-col sm:row gap-3 animate-in fade-in duration-700 delay-700">
             <button 
               onClick={() => { playAudio("hover_mode"); onStart(); }} 
               onMouseEnter={() => playAudio("hover_mode")}
               className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-700 to-amber-600 text-black font-black uppercase text-[10px] tracking-[0.2em] hover:from-amber-600 hover:to-amber-500 transition-all shadow-lg active:scale-95"
             >
               Iniciar Combate Sagrado
             </button>
             <button 
               onClick={() => { playAudio("hover_mode"); onClose(); }} 
               onMouseEnter={() => playAudio("hover_mode")}
               className="w-full py-3 rounded-xl border border-amber-900/30 text-amber-800 hover:text-amber-600 transition-all uppercase text-[9px] font-black tracking-[0.2em]"
             >
               Regresar
             </button>
          </div>
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 text-amber-900/40 hover:text-amber-500 transition-colors z-30">
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

const EnemyCard: React.FC<{
  enemy: AdventureEnemy;
  wins: number;
  required: number;
  done: boolean;
  isBoss?: boolean;
  locked?: boolean;
  onSelect: () => void;
  showEnemyElo: boolean;
  playAudio: (id: string) => void;
}> = ({ enemy, wins, required, done, isBoss, locked, onSelect, showEnemyElo, playAudio }) => {
  return (
    <button
      onClick={() => {
        if (!locked) {
          playAudio("hover_mode");
          onSelect();
        }
      }}
      onMouseEnter={() => !locked && playAudio("hover_mode")}
      disabled={locked}
      className={cn(
        "group relative flex items-center gap-4 p-4 rounded-2xl border transition-all w-full",
        locked ? "opacity-30 grayscale cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]",
        done ? "border-amber-600/50 bg-amber-950/20" : isBoss ? "border-red-900/50 bg-red-950/10" : "border-white/5 bg-white/5"
      )}
    >
      <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
        <img src={enemy.image} alt="" className="w-full h-full object-cover select-none pointer-events-none" draggable={false} onContextMenu={(e) => e.preventDefault()} />
      </div>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          {isBoss && <Skull className="w-3 h-3 text-red-500" />}
          <span className={cn("font-black uppercase text-xs tracking-widest", isBoss ? "text-red-400" : "text-amber-500")}>{enemy.name}</span>
        </div>
        <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-2">{enemy.title}</div>
        <div className="flex items-center gap-2">
           <div className="flex-1 h-1 bg-black/40 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 transition-all" style={{ width: `${(wins/required)*100}%` }} />
           </div>
           <span className="text-[10px] font-bold text-slate-400">{wins}/{required}</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-500 transition-colors" />
    </button>
  );
};

export const AdventureMode: React.FC<AdventureModeProps> = ({
  onStartBattle,
  onClose,
  onReturnToGame,
  adventureProgress,
  onResetCounter,
  language,
  playerName,
  adventurePlayerName,
  setAdventurePlayerName,
  showEnemyElo,
  setShowEnemyElo,
  hasActiveGame,
  isAdventureModeOpen,
  lanColor,
  lanStatus,
  playAudio
}) => {
  const [selectedEnemy, setSelectedEnemy] = useState<AdventureEnemy | null>(null);
  const [view, setView] = useState<"map" | "character">("map");
  const [eloInput, setEloInput] = useState(adventureProgress?.playerElo || 1000);

  useEffect(() => {
    if (!isAdventureModeOpen) {
      setSelectedEnemy(null);
      setView("map");
    }
  }, [isAdventureModeOpen]);

  const safeProgress = adventureProgress || { currentStage: 1, defeated: [], wins: {}, humanBattles: 0, playerElo: 1000 };
  const rank = getRank(safeProgress.humanBattles);
  const currentStageIndex = Math.max(0, (safeProgress.currentStage || 1) - 1);
  const currentStage = STAGES[Math.min(currentStageIndex, STAGES.length - 1)] || STAGES[0];

  const getWins = (id: string) => (safeProgress.wins ? safeProgress.wins[id] : 0) || 0;
  const isDefeated = (id: string) => safeProgress.defeated ? safeProgress.defeated.includes(id) : false;

  const isStageUnlocked = (stageId: number) => {
    if (stageId === 1) return true;
    for (let i = 1; i < stageId; i++) {
      const prevStage = STAGES[i - 1];
      const bossDone = isDefeated(prevStage.boss.id);
      const enemiesDone = prevStage.enemies.every(e => getWins(e.id) >= prevStage.requiredWins);
      if (!bossDone || !enemiesDone) return false;
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-[5000] flex flex-col items-center overflow-y-auto bg-black/95 backdrop-blur-lg">
      {/* Brasas flotantes (Animación atmosférica) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-amber-500/20 rounded-full animate-float opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${10 + Math.random() * 20}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative w-full h-auto min-h-fit flex flex-col overflow-visible px-0 animate-in fade-in zoom-in-95 duration-700">
      
        <div className="shrink-0 w-full py-4 px-0 border-b border-amber-900/30 relative bg-black shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-900/5 via-transparent to-black pointer-events-none" />
          
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between px-6 gap-4 relative z-10">
            <div className="flex flex-col items-center md:items-start text-center md:text-left md:pl-8 lg:pl-16 transition-all">
              <span className="text-amber-700 text-[9px] font-black uppercase tracking-[0.4em] mb-2 opacity-80">Crónicas de la Campaña</span>
              {CabeceraAventuraImg && (
                <img
                  src={CabeceraAventuraImg}
                  alt="Las 3000 Noches"
                  className="h-14 sm:h-20 md:h-28 lg:h-32 w-auto object-contain select-none pointer-events-none"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              )}
            </div>

            <div className="flex items-center gap-3 md:gap-8">
              <div className="hidden md:flex flex-col items-end pr-4 border-r border-amber-900/20">
                <span className="text-amber-900/60 text-[8px] font-black uppercase tracking-[0.3em] mb-1">Rango Actual</span>
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-black text-sm uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                    {rank.title}
                  </span>
                  <div className="animate-pulse">
                    {rank.icon}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Selector de Alias Gótico */}
                <div className="hidden lg:block w-[180px]">
                  <div className="relative group/alias">
                    <div className="relative bg-black/60 border border-amber-900/40 rounded-xl p-2 px-3 flex items-center gap-3 focus-within:border-amber-500/50 transition-all">
                      <User className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <div className="flex flex-col flex-1">
                        <span className="text-[7px] text-amber-900 font-bold uppercase tracking-widest leading-none mb-1">Identidad</span>
                        <input
                          type="text"
                          value={adventurePlayerName}
                          onChange={(e) => setAdventurePlayerName(e.target.value)}
                          className="bg-transparent border-none text-[10px] text-amber-200 font-bold outline-none placeholder-amber-900/40 uppercase tracking-widest"
                          maxLength={15}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={onClose}
                  onMouseEnter={() => playAudio("hover_mode")}
                  className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-stone-900/40 hover:bg-amber-600/20 text-amber-500 hover:text-amber-400 transition-all rounded-full border border-amber-900/20 hover:border-amber-500/40 group shadow-lg">
                  <Home className="w-5 h-5 md:w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
                {hasActiveGame && (
                  <button 
                    type="button"
                    onClick={onReturnToGame}
                    onMouseEnter={() => playAudio("hover_mode")}
                    className="flex items-center justify-center px-3 py-2 md:px-4 md:py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 border border-amber-600/20 rounded-lg md:rounded-xl font-bold uppercase tracking-[0.25em] transition-all flex-1 md:flex-initial">
                    {language === "es" ? "Regresar" : "Return"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Elo del jugador y Configuraciones rápidas */}
        <div className="shrink-0 px-4 py-2 border-b border-amber-900/20 flex flex-col gap-2 bg-black/20 relative z-10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-amber-200/70 text-[10px] uppercase tracking-widest">Tu poder:</span>
              <input
                type="number"
                value={eloInput}
                onChange={e => setEloInput(Number(e.target.value))}
                min={200} max={3000} step={50}
                className="w-20 bg-stone-900/80 border border-amber-900/40 text-amber-300 text-xs font-bold text-center rounded-lg px-2 py-0.5 focus:outline-none focus:border-amber-600/60"
              />
              <span className="text-amber-400/50 text-[9px]">Los rivales se adaptan</span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-amber-900/60 font-bold uppercase tracking-widest">
                {safeProgress.humanBattles} / 3000 Noches
              </span>
            </div>
          </div>
        </div>

        {/* Códice del Guerrero (Información del Juego Rediseñada) */}
        <div className="shrink-0 px-4 py-8 relative overflow-hidden border-b border-amber-900/40 bg-[#0a0805]">
          {/* Textura de fondo sutil */}
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]" />
          <div className="absolute inset-0 bg-gradient-to-b from-amber-950/10 via-transparent to-amber-950/10 pointer-events-none" />
          
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-12 md:w-24 bg-gradient-to-r from-transparent to-amber-800" />
              <div className="flex items-center gap-2 text-amber-500 font-black uppercase tracking-[0.4em] text-[10px] md:text-xs">
                <Sword className="w-4 h-4 text-amber-700 rotate-45" />
                <span>Códice del Guerrero</span>
                <Sword className="w-4 h-4 text-amber-700 -rotate-45" />
              </div>
              <div className="h-px w-12 md:w-24 bg-gradient-to-l from-transparent to-amber-800" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="relative group/info p-5 rounded-xl border border-amber-900/20 bg-black/40 hover:border-amber-700/40 transition-all duration-700">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Award className="w-8 h-8 text-amber-600" />
                </div>
                <h4 className="text-amber-500 font-bold uppercase tracking-widest text-[11px] mb-2 flex items-center gap-2">
                   <div className="w-1 h-1 rounded-full bg-amber-600 shadow-[0_0_5px_rgba(217,119,6,0.8)]" />
                   Senda de las 10 Sombras
                </h4>
                <p className="text-stone-400 text-[10px] leading-relaxed italic font-medium">
                  "Para debilitar el umbral, debes cosechar 10 victorias ante cada soldado de la noche. Solo entonces el Guardián del Milenio se verá obligado a revelarse."
                </p>
              </div>

              <div className="relative group/info p-5 rounded-xl border border-amber-900/20 bg-black/40 hover:border-amber-700/40 transition-all duration-500">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Crown className="w-8 h-8 text-amber-600" />
                </div>
                <h4 className="text-amber-500 font-bold uppercase tracking-widest text-[11px] mb-2 flex items-center gap-2">
                   <div className="w-1 h-1 rounded-full bg-amber-600 shadow-[0_0_5px_rgba(217,119,6,0.8)]" />
                   Jerarquía Nobiliaria
                </h4>
                <p className="text-stone-400 text-[10px] leading-relaxed italic font-medium">
                  "Tu rango (desde Siervo hasta Gran Maestre) refleja tus crónicas. Hay 9 rangos sagrados que solo los más constantes podrán reclamar."
                </p>
              </div>

              <div className="relative group/info p-5 rounded-xl border border-amber-900/20 bg-black/40 hover:border-amber-700/40 transition-all duration-500">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Zap className="w-8 h-8 text-amber-600" />
                </div>
                <h4 className="text-amber-500 font-bold uppercase tracking-widest text-[11px] mb-2 flex items-center gap-2">
                   <div className="w-1 h-1 rounded-full bg-amber-600 shadow-[0_0_5px_rgba(217,119,6,0.8)]" />
                   Desafío Adaptativo
                </h4>
                <p className="text-stone-400 text-[10px] leading-relaxed italic font-medium">
                  "Los rivales no son estáticos; su ingenio escala con tu poder. Desde el motor Lite hasta el implacable Stockfish, la IA se adaptará a tu Elo."
                </p>
              </div>

              <div className="relative group/info p-5 rounded-xl border border-amber-900/20 bg-black/40 hover:border-amber-700/40 transition-all duration-500">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Flag className="w-8 h-8 text-amber-600" />
                </div>
                <h4 className="text-amber-500 font-bold uppercase tracking-widest text-[11px] mb-2 flex items-center gap-2">
                   <div className="w-1 h-1 rounded-full bg-amber-600 shadow-[0_0_5px_rgba(217,119,6,0.8)]" />
                   Regla de Color
                </h4>
                <p className="text-stone-400 text-[10px] leading-relaxed italic font-medium">
                  "En Aventura empiezas siempre jugando con Negras. Solo podrás jugar con Blancas si derrotas al enemigo en combate."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mapa de etapas */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 sm:px-3 md:px-6 py-3 md:py-6 relative z-10">
          <div className="space-y-3 md:space-y-6 max-w-5xl mx-auto">
            {STAGES.map((stage) => {
              const unlocked = isStageUnlocked(stage.id);
              const bossDefeated = isDefeated(stage.boss.id);

              return (
                <div key={stage.id} className="flex gap-3 items-stretch">
                <div
                  className={cn(
                    "flex-1 rounded-2xl border overflow-hidden transition-all shadow-lg relative group/stage",
                    unlocked
                      ? "border-amber-700/50 bg-gradient-to-br from-amber-950/40 to-stone-950/40 shadow-amber-900/20"
                      : "border-stone-800/30 bg-stone-950/20 opacity-50"
                  )}>
                  {unlocked && !bossDefeated && (
                    <div className="absolute inset-0 bg-amber-500/5 animate-pulse pointer-events-none" />
                  )}

                  {/* Header de etapa */}
                  <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-black/60 to-black/30 border-b border-amber-900/30">
                    <div className="flex items-center gap-3">
                      {unlocked ? (
                        bossDefeated
                          ? <Crown className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
                          : <Sword className="w-5 h-5 text-amber-600 drop-shadow-[0_0_6px_rgba(217,119,6,0.3)]" />
                      ) : (
                        <Lock className="w-5 h-5 text-stone-600" />
                      )}
                      <div>
                        <div className="text-amber-300 font-black uppercase tracking-widest text-sm">{stage.name}</div>
                        <div className="text-white/60 text-[10px] uppercase tracking-widest italic">{stage.subtitle}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!unlocked && (
                        <span className="text-[8px] text-stone-500 border border-stone-700/40 px-2 py-1 rounded-full uppercase tracking-widest bg-stone-900/40">
                          🔒 Bloqueado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Enemigos de la etapa */}
                  {unlocked && (
                    <div className="p-2 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                      {stage.enemies.map(enemy => (
                        <EnemyCard
                          key={enemy.id}
                          enemy={enemy}
                          wins={getWins(enemy.id)}
                          required={stage.requiredWins}
                          done={getWins(enemy.id) >= stage.requiredWins}
                          playAudio={playAudio}
                          onSelect={() => {
                            const adjusted = getEngineByElo(eloInput, enemy);
                            setSelectedEnemy(adjusted);
                            setView("character");
                          }}
                          showEnemyElo={showEnemyElo}
                        />
                      ))}

                      <div className={cn(!stage.enemies.every(e => getWins(e.id) >= stage.requiredWins) && "opacity-40 pointer-events-none")}>
                        <EnemyCard
                          enemy={stage.boss}
                          wins={getWins(stage.boss.id)}
                          required={1}
                          done={isDefeated(stage.boss.id)}
                          isBoss
                          locked={!stage.enemies.every(e => getWins(e.id) >= stage.requiredWins)}
                          playAudio={playAudio}
                          onSelect={() => {
                            const adjusted = getEngineByElo(eloInput, stage.boss);
                            setSelectedEnemy(adjusted);
                            setView("character");
                          }}
                          showEnemyElo={showEnemyElo}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {stage.id === 1 && (
                  <div className="hidden md:flex w-[120px] shrink-0 flex-col items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-center">
                    <AlertTriangle className="w-7 h-7 text-red-400" />
                    <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider leading-tight">
                      {language === "es" ? "Fase de Desarrollo" : "Dev Phase"}
                    </span>
                    <span className="text-[8px] text-red-400/70 leading-tight">
                      {language === "es"
                        ? "Este modo es una prueba y puede contener errores."
                        : "This mode is a test and may contain bugs."}
                    </span>
                  </div>
                )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Panel de personaje */}
      {view === "character" && selectedEnemy && (
        <CharacterPanel
          enemy={selectedEnemy}
          playerElo={eloInput}
          playAudio={playAudio}
          onStart={() => onStartBattle(selectedEnemy, eloInput)}
          onClose={() => { setView("map"); setSelectedEnemy(null); }}
          language={language}
          lanColor={lanColor}
          lanStatus={lanStatus}
        />
      )}
    </div>
  );
};
