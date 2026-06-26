import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  orderBy,
  onSnapshot,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { Tournament, Participant, BracketMatch, FirebaseUser } from '../types/tournament';

const TOURNAMENTS_REF = 'torneos';

export async function createTournament(
  tournament: Omit<Tournament, 'id'>,
  creatorUid: string
): Promise<string> {
  const docRef = await addDoc(collection(db, TOURNAMENTS_REF), {
    ...tournament,
    creadorUid: creatorUid,
    participantesCount: 0
  });
  return docRef.id;
}

export async function joinTournament(
  tournamentId: string,
  user: FirebaseUser
): Promise<void> {
  const participantRef = doc(db, TOURNAMENTS_REF, tournamentId, 'participantes', user.uid);
  const participant: Participant = {
    uid: user.uid,
    nombre: user.nombre,
    elo: user.elo,
    photoUrl: user.photoUrl,
    inscriptoEn: Date.now(),
    confirmado: false,
    posicionLlave: 0
  };
  await setDoc(participantRef, participant);
  await updateDoc(doc(db, TOURNAMENTS_REF, tournamentId), {
    participantesCount: increment(1)
  });
}

export async function confirmParticipant(
  tournamentId: string,
  participantUid: string
): Promise<void> {
  const participantRef = doc(db, TOURNAMENTS_REF, tournamentId, 'participantes', participantUid);
  await updateDoc(participantRef, { confirmado: true });
}

export async function rejectParticipant(
  tournamentId: string,
  participantUid: string
): Promise<void> {
  await deleteDoc(doc(db, TOURNAMENTS_REF, tournamentId, 'participantes', participantUid));
  await updateDoc(doc(db, TOURNAMENTS_REF, tournamentId), {
    participantesCount: increment(-1)
  });
}

export async function generateBracket(
  tournamentId: string,
  participants: Participant[]
): Promise<void> {
  const sorted = [...participants].sort((a, b) => b.elo - a.elo);
  let size = 1;
  while (size < sorted.length) size *= 2;
  
  const positions: (Participant | null)[] = new Array(size).fill(null);
  let left = 0, right = size - 1;
  
  for (let i = 0; i < sorted.length; i++) {
    if (i % 2 === 0) {
      positions[left++] = sorted[i];
    } else {
      positions[right--] = sorted[i];
    }
  }
  
  const batch = writeBatch(db);
  const matchesRef = collection(db, TOURNAMENTS_REF, tournamentId, 'llave');
  
  let matchId = 1;
  const firstRoundMatches: string[] = [];
  
  for (let i = 0; i < size; i += 2) {
    const p1 = positions[i];
    const p2 = positions[i + 1];
    
    const match: Omit<BracketMatch, 'id'> = {
      ronda: 1,
      jugador1Uid: p1?.uid || null,
      jugador2Uid: p2?.uid || null,
      jugador1Nombre: p1?.nombre || 'BYE',
      jugador2Nombre: p2?.nombre || 'BYE',
      resultado: null,
      ganadorUid: null,
      fechaJugado: null,
      editadoPorAdmin: false,
      origenJ1: null,
      origenJ2: null,
      pgn: null,
      tiempoBlancas: 600,
      tiempoNegras: 600,
      esBye: !p1 || !p2
    };
    
    if (!p1 || !p2) {
      match.ganadorUid = p1?.uid || p2?.uid || null;
      match.resultado = p1 ? 'jugador1' : 'jugador2';
    }
    
    const docRef = doc(matchesRef, `match_${matchId}`);
    batch.set(docRef, { ...match, id: `match_${matchId}` });
    firstRoundMatches.push(`match_${matchId}`);
    matchId++;
  }
  
  let currentRound = firstRoundMatches;
  let round = 2;
  
  while (currentRound.length > 1) {
    const nextRound: string[] = [];
    
    for (let i = 0; i < currentRound.length; i += 2) {
      const match: Omit<BracketMatch, 'id'> = {
        ronda: round,
        jugador1Uid: null,
        jugador2Uid: null,
        jugador1Nombre: 'Por definir',
        jugador2Nombre: 'Por definir',
        resultado: null,
        ganadorUid: null,
        fechaJugado: null,
        editadoPorAdmin: false,
        origenJ1: currentRound[i],
        origenJ2: currentRound[i + 1] || null,
        pgn: null,
        tiempoBlancas: 600,
        tiempoNegras: 600
      };
      
      const docRef = doc(matchesRef, `match_${matchId}`);
      batch.set(docRef, { ...match, id: `match_${matchId}` });
      nextRound.push(`match_${matchId}`);
      matchId++;
    }
    
    currentRound = nextRound;
    round++;
  }
  
  await batch.commit();
  
  await updateDoc(doc(db, TOURNAMENTS_REF, tournamentId), {
    estado: 'en curso'
  });
}

export async function recordMatchResult(
  tournamentId: string,
  matchId: string,
  winnerUid: string
): Promise<void> {
  const matchRef = doc(db, TOURNAMENTS_REF, tournamentId, 'llave', matchId);
  const matchDoc = await getDoc(matchRef);
  const matchData = matchDoc.data() as BracketMatch;
  
  await updateDoc(matchRef, {
    ganadorUid: winnerUid,
    resultado: winnerUid === matchData.jugador1Uid ? 'jugador1' : 'jugador2',
    fechaJugado: Date.now(),
    editadoPorAdmin: true
  });
  
  // Find and update next match
  const matchesRef = collection(db, TOURNAMENTS_REF, tournamentId, 'llave');
  const q = query(matchesRef);
  const snapshot = await getDocs(q);
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as BracketMatch;
    if (data.origenJ1 === matchId || data.origenJ2 === matchId) {
      const winner = matchData.jugador1Uid === winnerUid 
        ? matchData.jugador1Nombre 
        : matchData.jugador2Nombre;
      
      if (data.origenJ1 === matchId) {
        await updateDoc(docSnap.ref, {
          jugador1Uid: winnerUid,
          jugador1Nombre: winner
        });
      } else {
        await updateDoc(docSnap.ref, {
          jugador2Uid: winnerUid,
          jugador2Nombre: winner
        });
      }
      break;
    }
  }
}

export function subscribeTournaments(
  callback: (tournaments: Tournament[]) => void
): () => void {
  const q = query(
    collection(db, TOURNAMENTS_REF),
    orderBy('fechaCreacion', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const tournaments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Tournament[];
    callback(tournaments);
  });
}

export function subscribeParticipants(
  tournamentId: string,
  callback: (participants: Participant[]) => void
): () => void {
  const participantsRef = collection(db, TOURNAMENTS_REF, tournamentId, 'participantes');
  
  return onSnapshot(participantsRef, (snapshot) => {
    const participants = snapshot.docs.map(doc => doc.data() as Participant);
    callback(participants);
  });
}

export function subscribeBracket(
  tournamentId: string,
  callback: (matches: BracketMatch[]) => void
): () => void {
  const matchesRef = collection(db, TOURNAMENTS_REF, tournamentId, 'llave');
  
  return onSnapshot(matchesRef, (snapshot) => {
    const matches = snapshot.docs.map(doc => doc.data() as BracketMatch);
    callback(matches);
  });
}
