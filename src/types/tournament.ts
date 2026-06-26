export type UserRole = 'SUPER_ADMIN' | 'ADMIN_TORNEOS' | 'JUGADOR' | 'INVITADO';
export type TournamentStatus = 'inscripciones' | 'en curso' | 'finalizado' | 'cancelado';
export type MatchResult = 'jugador1' | 'jugador2' | 'empate' | null;

export interface FirebaseUser {
  uid: string;
  nombre: string;
  email: string;
  photoUrl: string;
  rol: UserRole;
  elo: number;
  createdAt: number;
}

export interface Tournament {
  id: string;
  nombre: string;
  descripcion: string;
  creadorUid: string;
  estado: TournamentStatus;
  modoAvance: 'automatico' | 'manual';
  tipoLlave: 'eliminacion_directa' | 'suiza';
  fechaCreacion: number;
  fechaInicio: number;
  maxParticipantes: number;
  participantesCount: number;
  tipo?: string;
}

export interface Participant {
  uid: string;
  nombre: string;
  elo: number;
  photoUrl: string;
  inscriptoEn: number;
  confirmado: boolean;
  posicionLlave: number;
}

export interface BracketMatch {
  id: string;
  ronda: number;
  jugador1Uid: string | null;
  jugador2Uid: string | null;
  jugador1Nombre: string;
  jugador2Nombre: string;
  resultado: MatchResult;
  ganadorUid: string | null;
  fechaJugado: number | null;
  editadoPorAdmin: boolean;
  origenJ1: string | null;
  origenJ2: string | null;
  pgn: string | null;
  tiempoBlancas: number;
  tiempoNegras: number;
  esBye?: boolean;
}
