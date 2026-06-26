# Estado del Sistema de Torneos Firebase - GM-3000

## Lo que se implementó (código creado)

### Archivos creados/modificados:

1. **`src/firebase.js`** - Configuración Firebase con Auth, Firestore, Realtime Database
2. **`src/types/tournament.ts`** - Tipos TypeScript para torneos, participantes, llaves
3. **`src/hooks/useAuth.ts`** - Hook de autenticación con Google y roles
4. **`src/services/tournamentService.ts`** - Servicio completo de torneos en Firestore
5. **`src/components/GoogleLogin.tsx`** - Botón de login con Google
6. **`src/components/TournamentBracketTree.tsx`** - Bracket visual como árbol
7. **`src/components/MultiBoardView.tsx`** - Vista multi-tablero
8. **`E.TransmisionesLive/src/components/NuestrosTorneos.tsx`** - Panel unificado
9. **`E.TransmisionesLive/src/components/TournamentBracket.tsx`** - Bracket localStorage
10. **`E.TransmisionesLive/src/components/LooseTransmissions.tsx`** - Transmisiones sueltas

---

## Lo que falta configurar en Firebase (PASOS MANUALES)

### PASO 1: Habilitar Authentication con Google

1. Ir a **Firebase Console**: https://console.firebase.google.com/
2. Seleccionar proyecto **gm-3000**
3. Ir a **Authentication** → **Sign-in method**
4. Habilitar **Google** como proveedor
5. Agregar tu dominio de autorización:
   - Si usas Firebase Hosting: `gm-3000.web.app`
   - Si es localhost: `localhost`

### PASO 2: Crear Firestore Database

1. Ir a **Firestore Database** → **Create database**
2. Seleccionar **Start in test mode**
3. Elegir ubicación (us-central1 recomendado)

### PASO 3: Configurar Reglas de Seguridad de Firestore

Ir a **Firestore** → **Rules** y pegar:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios
    match /usuarios/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth.uid == userId || 
        get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol == 'SUPER_ADMIN';
    }
    
    // Torneos
    match /torneos/{tournamentId} {
      allow read: if true;
      allow create: if request.auth != null && 
        get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol in ['SUPER_ADMIN', 'ADMIN_TORNEOS'];
      allow update: if request.auth != null && 
        get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol in ['SUPER_ADMIN', 'ADMIN_TORNEOS'];
      allow delete: if request.auth != null && 
        get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol == 'SUPER_ADMIN';
      
      // Participantes
      match /participantes/{participantId} {
        allow read: if true;
        allow create: if request.auth != null;
        allow update: if request.auth != null && 
          get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol in ['SUPER_ADMIN', 'ADMIN_TORNEOS'];
        allow delete: if request.auth != null && 
          (request.auth.uid == participantId || 
           get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol in ['SUPER_ADMIN', 'ADMIN_TORNEOS']);
      }
      
      // Llave (partidas)
      match /llave/{matchId} {
        allow read: if true;
        allow write: if request.auth != null && 
          get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol in ['SUPER_ADMIN', 'ADMIN_TORNEOS'];
      }
    }
  }
}
```

### PASO 4: Crear tu usuario SUPER_ADMIN

1. Ir a **Authentication** → **Users**
2. Copiar tu **UID** (aparece después de hacer login)
3. Ir a **Firestore Database** → **Data**
4. Crear colección **usuarios**
5. Crear documento con tu UID como ID
6. Agregar campos:
   ```
   nombre: "Tu nombre"
   email: "tu@email.com"
   photoUrl: "url de tu foto"
   rol: "SUPER_ADMIN"
   elo: 1500
   createdAt: (timestamp)
   ```

### PASO 5: Habilitar Realtime Database (para transmisiones)

1. Ir a **Realtime Database** → **Create database**
2. Seleccionar **Start in test mode**
3. Reglas:
```json
{
  "rules": {
    "games": {
      ".read": true,
      ".write": true
    }
  }
}
```

---

## Funcionalidades Implementadas

### ✅ Autenticación
- Login con Google
- Roles: SUPER_ADMIN, ADMIN_TORNEOS, JUGADOR, INVITADO
- Solo el admin puede crear torneos

### ✅ Torneos
- Crear torneos (solo admin)
- Inscribirse a torneos
- Admin aprueba/rechaza participantes
- Estados: inscripciones → en curso → finalizado

### ✅ Llaves
- Bracket visual tipo árbol
- Emparejamiento serpentina por ELO
- BYE automático para cantidades impares
- Avance automático de ganadores

### ✅ Multi-Board
- Vista de múltiples tableros
- Selección individual con zoom
- Controles de navegación de movimientos
- Temporizadores por partida

### ✅ Transmisiones
- Transmisiones sueltas desde Firebase
- Conexión en tiempo real
- Controles de reproducción

---

## Próximos Pasos

1. **Configurar Firebase** (seguir los pasos arriba)
2. **Hacer login** con Google en la app
3. **Verificar tu UID** en Firestore
4. **Crear primer torneo** desde el panel de admin
5. **Probar inscripción** con otra cuenta

---

## Notas Importantes

- El sistema usa **localStorage** para torneos locales (sin Firebase)
- Para usar Firebase, debes estar **autenticado**
- Los torneos Firebase son **persistentes** y se sincronizan entre dispositivos
- El admin puede **editar resultados** manualmente
- Las transmisiones sueltas usan **Realtime Database** (no Firestore)
