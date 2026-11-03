# Changelog - GM-3000

## v3.3.0 (2026-11-02)

### Panel de Resumen de Partida
- **Nuevo panel anclado al de configuración**: Se divide visualmente el sidebar de ajustes en dos mitades unidas, del mismo estilo y con animación conjunta.
- **Resumen rápido**: Motor de cada bando (con ELO/profundidad) y ritmo de juego (minutos + incremento) siempre a la vista.
- **Botón INICIAR PARTIDA grande**: Nuevo diseño con textura de rayas diagonales, degradado rojo→negro, borde y resplandor. Reemplaza al botón pequeño dentro del panel de ajustes.
- **Botón de pantalla completa duplicado eliminado**: Se quitó el botón flotante fuera del sidebar; queda solo el del panel lateral de botones.

### Motor Maia 2
- **8 niveles ELO discretos**: 400, 600, 800, 1000, 1200, 1500, 1800 y 2100.
- **El ELO realmente afecta la fuerza**: Cada nivel se traduce a la profundidad de cálculo del motor y a su `Skill Level` (UCI_LimitStrength), de 0 a 20.
- **Selector de niveles** en la configuración de Blancas, Negras y en el Modo Estudio.
- **Modo Progresivo funcional**: El ELO elegido ahora define la fuerza real del rival al iniciar la partida (antes era solo informativo).

### Interfaz de Usuario
- **Banner auto-ocultable**: La cabecera se oculta sola 4 segundos después de iniciar la partida.
- **Marco del tablero negro**: Sustituye el gris pizarra por negro puro.
- **Finalizar Modo Estudio**: Nuevo botón en el modal de fin de partida y en el panel lateral para salir del Modo Estudio y volver a la configuración.
- **Tablero centrado en pantalla completa** y sin barra de desplazamiento vertical.

### Bugs corregidos
- **Error de sintaxis JSX en el sidebar de configuración**: Faltaba un cierre `</div>` tras incorporar el panel de resumen, lo que rompía la compilación.
- **Argumentos ignorados en `findBestMove`**: `historyFens` y `recentMoves` se enviaban pero ningún motor los consumía; se eliminaron y se añadió el parámetro `skillLevel` en su lugar.

### Notas técnicas
- `tsc --noEmit`: 79 errores pre-existentes (LAN legacy, props de AdventureMode y tipos de torneo). Ninguno nuevo introducido en esta versión.

---

## v3.2.0 (2026-08-02)

### Modo Estudio
- **Panel colapsable**: Cabecera "Modo Estudio" con chevron; se expande automáticamente al activar el modo, colapsable manualmente.
- **Configuración completa desde el panel de piezas**: Selector de lado (Blancas/Negras), motor oponente, fuerza (ELO), tiempo y botón "Reset Tablero".
- **Motor juega el primer movimiento**: Al presionar "Jugar", el motor oponente siempre tiene el turno inicial.
- **Nueva partida resetea el tablero**: "Nueva Partida" e "Iniciar / Reiniciar" vuelven a la posición inicial. "Jugar" conserva la posición configurada.
- **Historial de edición con deshacer/rehacer**: Cada colocación o borrado de pieza registra el paso. Botones "Deshacer" y "Rehacer" con contador de pasos.

### Bugs corregidos
- **Fix crítico: partida nunca iniciaba** — `startSequenceAbortRef` se reseteaba después de `cleanupPreviousSession`, causando que el primer check de `startAfterSync` abortara siempre la secuencia. El juego ahora arranca en todos los modos.
- **Fuga de FEN** — `setCustomFen(fm.fen)` en el branch freeMode filtraba la posición de estudio a partidas normales. Eliminado.
- **Logo invisible en Home** — `homeLogoAnimating` solo se activaba en retorno al home, no en la carga inicial. Ahora el logo aparece correctamente.
- **ResumeGame sin abort** — El countdown de reanudación ahora cancela si se detiene la partida durante el conteo.
- **Validación FEN robusta** — Exige ambos reyes y que la posición no esté en game-over (antes solo verificaba un rey).

### Visual
- **Relámpago en video de fondo**: Efecto de transición en los últimos 2.5 segundos del video de home, simulando relámpagos antes del loop.

### Notas técnicas
- Errores de consola (getaddrinfo ENOTFOUND, Firebase analytics) son por falta de conexión a internet, no bugs del código.
