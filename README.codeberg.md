# GM-3000 — Board de Auto-Entrenamiento

**GM-3000** es una plataforma de ajedrez avanzada con motores de análisis integrados, multijugador LAN y modo aventura épico.

## Demo Web

[gm-3000.web.app](https://gm-3000.web.app)

## Motores de Análisis

- **Stockfish** — Motor oficial de clase mundial vía Web Worker
- **Ailed** — Motor nativo más potente del proyecto
- **Nexus** — Motor con estrategia posicional refinada
- **Atlas.1** — Motor exclusivo con búsqueda Negamax y poda Alfa-Beta
- **Obsidian** — Motor con red neuronal y poda avanzada
- **Maia** — Modelos de estilo humano (ELO 1100–1900)

## Modos de Juego

- Humano vs. Máquina
- Humano vs. Humano (Local / LAN)
- Máquina vs. Máquina
- **Las 3000 Noches** — Modo Aventura narrativo con 4 jefes, 6 misiones y 9 rangos nobiliarios
- Modo Asistencia — Analiza cada posición y sugiere mejores jugadas
- Modo Progresivo — Dificultad adaptativa según rendimiento
- Modo Mental — Entrenamiento a ciegas con entrada multi-formato

## Modo Aventura — Las 3000 Noches

- 4 Jefes: Sir Alaric (1200) → Nexus (1700) → Lord Valerius (2200) → Lord Elrod (3000+)
- 10 niveles de dificultad (ELO 300–1700)
- 6 misiones narrativas únicas
- 9 rangos nobiliarios
- Eventos aleatorios (30–40% por partida)

## Modo Mental

Entrenamiento a ciegas con entrada multi-formato (UCI, SAN, algebraica larga, verbal) y 3 niveles de revelación progresiva.

## Editor de Posiciones FEN

Editor completo con drag & drop, presetos, variantes y captura de pantalla.

## Conexión LAN

Servidor de relevo integrado con confirmación manual del anfitrión y sincronización en tiempo real.

## Stack Tecnológico

React 19 + Vite + TypeScript | Electron + Electron Forge | Chess.js | Tailwind CSS | Stockfish.js | Express

## Instalación

```bash
git clone https://codeberg.org/s4moth/GM-3000.git
cd GM-3000
npm install
npm run dev        # Modo web
npm run electron:start  # Modo escritorio
```

## Licencia

MIT — ver [LICENSE](https://codeberg.org/s4moth/GM-3000/src/branch/main/LICENSE)
