# Changelog - GM-3000

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
