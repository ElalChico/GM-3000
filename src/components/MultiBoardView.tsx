import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Maximize2, Minimize2, Clock, Users, Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { BracketMatch } from '../types/tournament';

interface MultiBoardViewProps {
  matches: BracketMatch[];
  onSelectMatch?: (match: BracketMatch) => void;
}

interface BoardState {
  game: Chess;
  fens: string[];
  currentIndex: number;
  isAutoPlaying: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MultiBoardView({ matches, onSelectMatch }: MultiBoardViewProps) {
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [boards, setBoards] = useState<Record<string, BoardState>>({});
  const [whiteTimes, setWhiteTimes] = useState<Record<string, number>>({});
  const [blackTimes, setBlackTimes] = useState<Record<string, number>>({});

  // Initialize boards
  useEffect(() => {
    const initialBoards: Record<string, BoardState> = {};
    const initialWhiteTimes: Record<string, number> = {};
    const initialBlackTimes: Record<string, number> = {};

    for (const match of matches) {
      initialBoards[match.id] = {
        game: new Chess(),
        fens: [new Chess().fen()],
        currentIndex: 0,
        isAutoPlaying: false
      };
      initialWhiteTimes[match.id] = match.tiempoBlancas || 600;
      initialBlackTimes[match.id] = match.tiempoNegras || 600;
    }

    setBoards(initialBoards);
    setWhiteTimes(initialWhiteTimes);
    setBlackTimes(initialBlackTimes);
  }, [matches]);

  const handleBoardClick = (matchId: string) => {
    setSelectedBoard(matchId);
    onSelectMatch?.(matches.find(m => m.id === matchId)!);
  };

  const toggleAutoPlay = (matchId: string) => {
    setBoards(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        isAutoPlaying: !prev[matchId].isAutoPlaying
      }
    }));
  };

  const navigateMove = (matchId: string, direction: 'prev' | 'next') => {
    setBoards(prev => {
      const board = prev[matchId];
      if (!board) return prev;
      
      const newIndex = direction === 'prev' 
        ? Math.max(0, board.currentIndex - 1)
        : Math.min(board.fens.length - 1, board.currentIndex + 1);
      
      return {
        ...prev,
        [matchId]: {
          ...board,
          currentIndex: newIndex
        }
      };
    });
  };

  const activeMatches = matches.filter(m => !m.ganadorUid);
  const completedMatches = matches.filter(m => m.ganadorUid);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0c0c0e] to-[#111118] border border-stone-800 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Users className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Multi-Board View</h2>
              <p className="text-[10px] text-stone-500 font-mono">{activeMatches.length} partidas activas</p>
            </div>
          </div>
          {selectedBoard && (
            <button
              onClick={() => setSelectedBoard(null)}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-[10px] font-bold transition-colors"
            >
              Ver Todas
            </button>
          )}
        </div>
      </div>

      {/* Selected Board - Full View */}
      {selectedBoard && boards[selectedBoard] && (
        <div className="bg-gradient-to-br from-[#0c0c0e] to-[#111118] border border-amber-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Partida Seleccionada</span>
            </div>
            <button
              onClick={() => setSelectedBoard(null)}
              className="p-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
            >
              <Minimize2 className="w-4 h-4 text-stone-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Board */}
            <div>
              <Chessboard
                position={boards[selectedBoard].fens[boards[selectedBoard].currentIndex]}
                boardWidth={400}
                animationDuration={200}
                arePiecesDraggable={false}
              />
              
              {/* Controls */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => navigateMove(selectedBoard, 'prev')}
                  disabled={boards[selectedBoard].currentIndex <= 0}
                  className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <SkipBack className="w-4 h-4 text-stone-400" />
                </button>
                <span className="text-xs font-mono text-stone-500 min-w-[50px] text-center">
                  {boards[selectedBoard].currentIndex}/{boards[selectedBoard].fens.length - 1}
                </span>
                <button
                  onClick={() => navigateMove(selectedBoard, 'next')}
                  disabled={boards[selectedBoard].currentIndex >= boards[selectedBoard].fens.length - 1}
                  className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <SkipForward className="w-4 h-4 text-stone-400" />
                </button>
                <button
                  onClick={() => toggleAutoPlay(selectedBoard)}
                  className={`p-2 rounded-lg transition-colors ${
                    boards[selectedBoard].isAutoPlaying 
                      ? 'bg-amber-600 text-white' 
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-400'
                  }`}
                >
                  {boards[selectedBoard].isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Match Info */}
            <div className="space-y-4">
              {/* Players */}
              <div className="bg-stone-900/50 rounded-xl p-4 border border-stone-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-white rounded-full" />
                    <span className="text-sm font-bold text-white">
                      {matches.find(m => m.id === selectedBoard)?.jugador1Nombre}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-stone-500" />
                    <span className="text-sm font-mono text-amber-400">
                      {formatTime(whiteTimes[selectedBoard] || 600)}
                    </span>
                  </div>
                </div>
                
                <div className="text-center text-[10px] font-mono text-stone-600 my-2">VS</div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-stone-800 rounded-full border border-stone-600" />
                    <span className="text-sm font-bold text-white">
                      {matches.find(m => m.id === selectedBoard)?.jugador2Nombre}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-stone-500" />
                    <span className="text-sm font-mono text-amber-400">
                      {formatTime(blackTimes[selectedBoard] || 600)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Match Status */}
              <div className="bg-stone-900/50 rounded-xl p-4 border border-stone-800">
                <div className="text-[9px] text-stone-500 uppercase font-mono mb-2">Estado</div>
                {matches.find(m => m.id === selectedBoard)?.ganadorUid ? (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="text-sm font-bold">Finalizada</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-400">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-sm font-bold">En curso</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Board Grid */}
      {!selectedBoard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {matches.map((match) => (
            <div
              key={match.id}
              onClick={() => handleBoardClick(match.id)}
              className={`
                bg-gradient-to-br from-[#0c0c0e] to-[#111118] border rounded-xl overflow-hidden cursor-pointer
                transition-all duration-200 hover:scale-[1.02] hover:border-amber-500/50
                ${match.ganadorUid ? 'border-emerald-500/30' : 'border-stone-800'}
              `}
            >
              {/* Board Thumbnail */}
              <div className="relative">
                <Chessboard
                  position={boards[match.id]?.fens[boards[match.id]?.currentIndex || 0] || new Chess().fen()}
                  boardWidth={200}
                  animationDuration={0}
                  arePiecesDraggable={false}
                />
                {!match.ganadorUid && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  </div>
                )}
              </div>

              {/* Match Info */}
              <div className="p-3 border-t border-stone-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-mono text-stone-500">#{match.id}</span>
                  <span className={`text-[8px] font-mono font-bold uppercase ${
                    match.ganadorUid ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {match.ganadorUid ? 'Finalizada' : 'En vivo'}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-stone-300 truncate max-w-[100px]">
                      {match.jugador1Nombre}
                    </span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-stone-500" />
                      <span className="text-[9px] font-mono text-stone-500">
                        {formatTime(whiteTimes[match.id] || 600)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-stone-300 truncate max-w-[100px]">
                      {match.jugador2Nombre}
                    </span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-stone-500" />
                      <span className="text-[9px] font-mono text-stone-500">
                        {formatTime(blackTimes[match.id] || 600)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Matches */}
      {completedMatches.length > 0 && !selectedBoard && (
        <div className="bg-gradient-to-br from-[#0c0c0e] to-[#111118] border border-stone-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Partidas Finalizadas</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {completedMatches.map((match) => (
              <div
                key={match.id}
                onClick={() => handleBoardClick(match.id)}
                className="p-2 bg-stone-900/50 rounded-lg border border-stone-800 cursor-pointer hover:border-emerald-500/30 transition-colors"
              >
                <div className="text-[9px] font-mono text-stone-500 mb-1">#{match.id}</div>
                <div className="text-[10px] text-emerald-400 font-bold truncate">
                  {match.ganadorUid === match.jugador1Uid ? match.jugador1Nombre : match.jugador2Nombre}
                </div>
                <div className="text-[9px] text-stone-600">Ganador</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
