import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { FirebaseUser } from '../types/tournament';

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as FirebaseUser);
          } else {
            const newUser: FirebaseUser = {
              uid: firebaseUser.uid,
              nombre: firebaseUser.displayName || 'Jugador',
              email: firebaseUser.email || '',
              photoUrl: firebaseUser.photoURL || '',
              rol: 'JUGADOR',
              elo: 1200,
              createdAt: Date.now()
            };
            await setDoc(doc(db, 'usuarios', firebaseUser.uid), newUser);
            setUser(newUser);
          }
        } catch (err) {
          console.error('Error loading user:', err);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const isAdmin = user?.rol === 'SUPER_ADMIN' || user?.rol === 'ADMIN_TORNEOS';
  const isSuperAdmin = user?.rol === 'SUPER_ADMIN';

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    logout,
    isAdmin,
    isSuperAdmin
  };
}
