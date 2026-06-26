import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Crown, X, ChevronRight, ArrowRight, Clock, Users } from 'lucide-react';
import { BracketMatch, Participant } from '../types/tournament';

interface TournamentBracketTreeProps {
  matches: BracketMatch[];
  participants: Participant[];
  onMatchClick?: (match: BracketMatch) => void;
  onRecordResult?: (matchId: string, winnerUid: string) => void;
  isAdmin?: boolean;
}

function getRoundName(round: number, totalRounds: number): string {
  if (round === totalRounds) return 'FINAL';
  if (round === totalRounds - 1) return 'SEMIFINAL';
  if (round === totalRounds - 2) return 'CUARTOS';
  return `Ronda ${round}`;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TournamentBracketTree({ 
  matches, 
  participants, 
  onMatchClick,
  onRecordResult,
  isAdmin = false 
}: TournamentBracketTreeProps) {
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const bracketRef = useRef<HTMLDivElement>(null);

  // Group matches by round
  const matchesByRound: Record<number, BracketMatch[]> = {};
  for (const match of matches) {
    if (!matchesByRound[match.ronda]) {
      matchesByRound[match.ronda] = [];
    }
    matchesByRound[match.ronda].push(match);
  }

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  const totalRounds = rounds.length;
  const roundNames = rounds.map(r => getRoundName(r, totalRounds));

  // Find champion (winner of final)
  const finalRound = matchesByRound[totalRounds];
  const champion = finalRound?.[0]?.ganadorUid 
    ? participants.find(p => p.uid === finalRound[0].ganadorUid)
    : null;

  const completedMatches = matches.filter(m => m.ganadorUid !== null).length;
  const totalMatches = matches.length;
  const progress = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

  const handleMatchClick = (match: BracketMatch) => {
    setSelectedMatch(match);
    onMatchClick?.(match);
  };

  return (
    <div className="space-y-4">
      {/* Tournament Header */}
      <div className="bg-gradient-to-br from-[#0c0c0e] to-[#111118] border border-stone-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <Trophy className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">Llave del Torneo</h2>
            <p className="text-[11px] text-stone-500 font-mono">Eliminación Directa</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-stone-950/60 rounded-xl p-3 text-center border border-stone-800/50">
            <div className="text-xl font-bold text-amber-400">{participants.length}</div>
            <div className="text-[9px] text-stone-500 uppercase font-mono mt-0.5">Jugadores</div>
          </div>
          <div className="bg-stone-950/60 rounded-xl p-3 text-center border border-stone-800/50">
            <div className="text-xl font-bold text-emerald-400">{completedMatches}/{totalMatches}</div>
            <div className="text-[9px] text-stone-500 uppercase font-mono mt-0.5">Partidas</div>
          </div>
          <div className="bg-stone-950/60 rounded-xl p-3 text-center border border-stone-800/50">
            <div className="text-xl font-bold text-sky-400">{totalRounds}</div>
            <div className="text-[9px] text-stone-500 uppercase font-mono mt-0.5">Rondas</div>
          </div>
          <div className="bg-stone-950/60 rounded-xl p-3 text-center border border-stone-800/50">
            <div className="text-xl font-bold text-purple-400">{Math.round(progress)}%</div>
            <div className="text-[9px] text-stone-500 uppercase font-mono mt-0.5">Progreso</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-stone-900 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Champion Banner */}
        {champion && (
          <div className="mt-4 p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
              <Crown className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <div className="text-[10px] text-amber-500 uppercase font-mono font-bold tracking-wider">🏆 Campeón</div>
              <div className="text-lg font-bold text-white mt-0.5">{champion.nombre}</div>
              <div className="text-[10px] text-amber-400/70 font-mono">ELO: {champion.elo}</div>
            </div>
          </div>
        )}
      </div>

      {/* Bracket Tree */}
      <div className="bg-gradient-to-br from-[#0c0c0e] to-[#111118] border border-stone-800 rounded-2xl p-5 overflow-x-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Llave Visual</h3>
        </div>
        
        <div ref={bracketRef} className="flex gap-6 min-w-max pb-4">
          {rounds.map((round, roundIdx) => {
            const roundMatches = matchesByRound[round];
            const roundName = roundNames[roundIdx];
            const isLastRound = roundIdx === rounds.length - 1;
            const spacing = Math.pow(2, roundIdx) * 80;
            
            return (
              <div key={round} className="flex flex-col items-center" style={{ marginTop: roundIdx > 0 ? `${spacing / 2}px` : '0' }}>
                {/* Round Header */}
                <div className={`
                  px-4 py-2 rounded-lg mb-4 text-center
                  ${isLastRound 
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/10 border border-amber-500/30' 
                    : 'bg-stone-900/50 border border-stone-800'}
                `}>
                  <div className={`text-[10px] font-mono font-bold uppercase tracking-widest ${
                    isLastRound ? 'text-amber-400' : 'text-stone-400'
                  }`}>
                    {roundName}
                  </div>
                </div>

                {/* Matches Column */}
                <div className="flex flex-col gap-4" style={{ gap: `${spacing}px` }}>
                  {roundMatches.map((match) => (
                    <BracketMatchCard
                      key={match.id}
                      match={match}
                      onClick={() => handleMatchClick(match)}
                      onRecordResult={onRecordResult}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Match Detail Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-stone-800">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Partida #{selectedMatch.id}
                </h3>
                <p className="text-[10px] text-stone-500 font-mono mt-0.5">
                  {getRoundName(selectedMatch.ronda, totalRounds)}
                </p>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="p-2 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            <div className="p-5">
              {/* Player 1 */}
              <div className={`
                flex items-center justify-between p-4 rounded-xl border mb-3
                ${selectedMatch.ganadorUid === selectedMatch.jugador1Uid 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : 'bg-stone-900/50 border-stone-800'}
              `}>
                <div className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${selectedMatch.ganadorUid === selectedMatch.jugador1Uid 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-stone-800 text-stone-400'}
                  `}>
                    {selectedMatch.ganadorUid === selectedMatch.jugador1Uid ? '✓' : '1'}
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${
                      selectedMatch.ganadorUid === selectedMatch.jugador1Uid ? 'text-emerald-300' : 'text-stone-300'
                    }`}>
                      {selectedMatch.jugador1Nombre}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-stone-500" />
                      <span className="text-[10px] text-stone-500 font-mono">{formatTime(selectedMatch.tiempoBlancas)}</span>
                    </div>
                  </div>
                </div>
                {selectedMatch.ganadorUid === selectedMatch.jugador1Uid && (
                  <Crown className="w-5 h-5 text-amber-400" />
                )}
              </div>

              {/* VS */}
              <div className="flex items-center justify-center gap-3 my-3">
                <div className="h-px flex-1 bg-stone-800" />
                <span className="text-[10px] font-mono font-bold text-stone-600 tracking-widest">VS</span>
                <div className="h-px flex-1 bg-stone-800" />
              </div>

              {/* Player 2 */}
              <div className={`
                flex items-center justify-between p-4 rounded-xl border
                ${selectedMatch.ganadorUid === selectedMatch.jugador2Uid 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : 'bg-stone-900/50 border-stone-800'}
              `}>
                <div className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${selectedMatch.ganadorUid === selectedMatch.jugador2Uid 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-stone-800 text-stone-400'}
                  `}>
                    {selectedMatch.ganadorUid === selectedMatch.jugador2Uid ? '✓' : '2'}
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${
                      selectedMatch.ganadorUid === selectedMatch.jugador2Uid ? 'text-emerald-300' : 'text-stone-300'
                    }`}>
                      {selectedMatch.jugador2Nombre}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-stone-500" />
                      <span className="text-[10px] text-stone-500 font-mono">{formatTime(selectedMatch.tiempoNegras)}</span>
                    </div>
                  </div>
                </div>
                {selectedMatch.ganadorUid === selectedMatch.jugador2Uid && (
                  <Crown className="w-5 h-5 text-amber-400" />
                )}
              </div>

              {/* Admin Controls */}
              {isAdmin && !selectedMatch.ganadorUid && selectedMatch.jugador1Uid && selectedMatch.jugador2Uid && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="text-[9px] text-amber-500 uppercase font-mono font-bold mb-2">Admin: Marcar Ganador</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onRecordResult?.(selectedMatch.id, selectedMatch.jugador1Uid!);
                        setSelectedMatch(null);
                      }}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      {selectedMatch.jugador1Nombre} Gana
                    </button>
                    <button
                      onClick={() => {
                        onRecordResult?.(selectedMatch.id, selectedMatch.jugador2Uid!);
                        setSelectedMatch(null);
                      }}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      {selectedMatch.jugador2Nombre} Gana
                    </button>
                  </div>
                </div>
              )}

              {/* Winner Announcement */}
              {selectedMatch.ganadorUid && (
                <div className="mt-4 p-3 bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-300 font-bold">
                      Avanza: {selectedMatch.ganadorUid === selectedMatch.jugador1Uid 
                        ? selectedMatch.jugador1Nombre 
                        : selectedMatch.jugador2Nombre}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 p-4 border-t border-stone-800">
              <button
                onClick={() => setSelectedMatch(null)}
                className="flex-1 py-2.5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BracketMatchCard({ 
  match, 
  onClick, 
  onRecordResult,
  isAdmin 
}: { 
  match: BracketMatch; 
  onClick: () => void;
  onRecordResult?: (matchId: string, winnerUid: string) => void;
  isAdmin: boolean;
}) {
  const isWinner = (uid: string | null) => match.ganadorUid === uid;
  const isPending = match.ganadorUid === null;
  const isBye = match.esBye;

  return (
    <div
      onClick={onClick}
      className={`
        relative w-[180px] cursor-pointer transition-all duration-200
        ${isBye ? 'opacity-40' : 'hover:scale-[1.02]'}
        ${isPending ? 'ring-1 ring-amber-500/30' : 'ring-1 ring-emerald-500/30'}
        bg-stone-950 rounded-xl overflow-hidden border border-stone-800
      `}
    >
      {/* Match Header */}
      <div className={`
        flex items-center justify-between px-2 py-1
        ${isPending ? 'bg-amber-500/10' : 'bg-emerald-500/10'}
        border-b border-stone-800/50
      `}>
        <span className="text-[8px] font-mono text-stone-500">#{match.id}</span>
        <span className={`
          text-[8px] font-mono font-bold uppercase tracking-wider
          ${isPending ? 'text-amber-400' : 'text-emerald-400'}
        `}>
          {isPending ? 'Pendiente' : 'Jugada'}
        </span>
      </div>

      {/* Player 1 */}
      <div className={`
        flex items-center gap-2 px-2 py-1.5
        ${isWinner(match.jugador1Uid) ? 'bg-emerald-500/15' : ''}
        ${match.jugador1Nombre === 'BYE' || match.jugador1Nombre === 'Por definir' ? 'bg-stone-900/30' : ''}
      `}>
        <div className={`
          w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold
          ${isWinner(match.jugador1Uid) 
            ? 'bg-emerald-500 text-white' 
            : match.jugador1Nombre === 'BYE' || match.jugador1Nombre === 'Por definir'
              ? 'bg-stone-700 text-stone-500' 
              : 'bg-stone-800 text-stone-400'}
        `}>
          {isWinner(match.jugador1Uid) ? '✓' : '1'}
        </div>
        <span className={`
          text-[10px] flex-1 truncate font-medium
          ${isWinner(match.jugador1Uid) ? 'text-emerald-300 font-bold' : ''}
          ${match.jugador1Nombre === 'BYE' || match.jugador1Nombre === 'Por definir' ? 'text-stone-600 italic' : 'text-stone-300'}
        `}>
          {match.jugador1Nombre}
        </span>
      </div>

      {/* VS */}
      <div className="flex items-center justify-center py-0.5 bg-stone-900/50">
        <span className="text-[7px] font-mono font-bold text-stone-600 tracking-widest">VS</span>
      </div>

      {/* Player 2 */}
      <div className={`
        flex items-center gap-2 px-2 py-1.5
        ${isWinner(match.jugador2Uid) ? 'bg-emerald-500/15' : ''}
        ${match.jugador2Nombre === 'BYE' || match.jugador2Nombre === 'Por definir' ? 'bg-stone-900/30' : ''}
      `}>
        <div className={`
          w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold
          ${isWinner(match.jugador2Uid) 
            ? 'bg-emerald-500 text-white' 
            : match.jugador2Nombre === 'BYE' || match.jugador2Nombre === 'Por definir'
              ? 'bg-stone-700 text-stone-500' 
              : 'bg-stone-800 text-stone-400'}
        `}>
          {isWinner(match.jugador2Uid) ? '✓' : '2'}
        </div>
        <span className={`
          text-[10px] flex-1 truncate font-medium
          ${isWinner(match.jugador2Uid) ? 'text-emerald-300 font-bold' : ''}
          ${match.jugador2Nombre === 'BYE' || match.jugador2Nombre === 'Por definir' ? 'text-stone-600 italic' : 'text-stone-300'}
        `}>
          {match.jugador2Nombre}
        </span>
      </div>

      {/* Winner arrow */}
      {!isPending && (
        <div className="absolute -right-5 top-1/2 -translate-y-1/2 text-emerald-500">
          <ChevronRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
