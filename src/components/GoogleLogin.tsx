import React from 'react';
import { useAuth } from '../hooks/useAuth';

export function GoogleLogin() {
  const { user, loading, signInWithGoogle, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-stone-800 rounded-xl">
        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-stone-400">Cargando...</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <img 
          src={user.photoUrl} 
          alt={user.nombre}
          className="w-8 h-8 rounded-full border-2 border-amber-500/30"
        />
        <div className="text-right">
          <div className="text-xs font-bold text-white">{user.nombre}</div>
          <div className="text-[9px] text-stone-500 font-mono uppercase">{user.rol}</div>
        </div>
        <button
          onClick={logout}
          className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded-lg text-[10px] font-bold transition-colors"
        >
          Salir
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl font-bold text-xs hover:bg-gray-100 transition-colors"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Iniciar sesión con Google
    </button>
  );
}
