# GM-3000 — Professional Chess Engine & Platform

GM-3000 es una plataforma de ajedrez avanzada desarrollada con tecnologías modernas para ofrecer una experiencia de juego fluida, analítica y competitiva. Diseñada tanto para el estudio profundo como para el juego casual, la aplicación integra potentes motores de análisis y una infraestructura de red local para enfrentamientos en tiempo real.

## 🚀 Características Principales

*   **Motor de Análisis Stockfish:** Integración completa de Stockfish para análisis de posiciones, evaluación de jugadas y entrenamiento contra diferentes niveles de dificultad.
*   **Modos de Juego Versátiles:**
    *   **Humano vs. Máquina:** Desafía al motor con niveles personalizables.
    *   **Humano vs. Humano (Local):** Juega con un amigo en la misma computadora.
    *   **LAN Multiplayer:** Conexión directa en red local para partidas entre diferentes dispositivos.
    *   **Máquina vs. Máquina:** Observa enfrentamientos entre motores para estudio táctico.
*   **Interfaz de Usuario Premium:** Diseñada con React y Tailwind CSS, ofreciendo un entorno oscuro, minimalista y optimizado para la concentración.
*   **Neural Vision:** Visualización avanzada de líneas de ataque y control del tablero.
*   **Gestión de Torneos y Perfiles:** Sistema integrado para organizar competiciones y seguir el progreso del jugador.
*   **Analíticas en Tiempo Real:** Gráficos de evaluación y estadísticas de partida impulsados por Recharts.

## 🌐 Conexión LAN (Multiplayer Local)

GM-3000 incluye un **Servidor de Relevo Integrado** que permite jugar partidas multijugador sin necesidad de servidores externos o conexión a Internet, siempre que los dispositivos estén en la misma red local.

### Cómo funciona:
1.  **Host:** Al iniciar el modo LAN, la aplicación levanta automáticamente un servidor en el puerto `3001`. El anfitrión puede ver su dirección IP local dentro de la configuración de red.
2.  **Invitado:** Otros jugadores pueden unirse ingresando la dirección IP del anfitrión.
3.  **Sincronización Total:** El sistema sincroniza en tiempo real el estado del tablero (FEN), el historial de movimientos, los relojes de juego y la configuración de la partida.
4.  **Detección Automática:** Incluye una función de "Ping" para verificar la disponibilidad de salas abiertas en la red.

## 🛠️ Tecnologías Utilizadas

*   **Core:** React 19 + Vite + TypeScript.
*   **Desktop:** Electron + Electron Forge (Empaquetado para Windows, Linux y macOS).
*   **Lógica de Juego:** Chess.js para validación de movimientos y reglas estándar.
*   **Motor:** Stockfish.js (Web Worker).
*   **UI/UX:** Tailwind CSS, Framer Motion (animaciones), Lucide React (iconos).
*   **Red:** Node.js HTTP Server (integrado en el proceso principal de Electron).

## 📦 Instalación y Desarrollo

Para ejecutar el proyecto en un entorno de desarrollo:

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/gm3000.git
    cd gm3000
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Ejecutar en modo desarrollo (Web):**
    ```bash
    npm run dev
    ```

4.  **Ejecutar aplicación Desktop (Electron):**
    ```bash
    npm run electron:start
    ```

5.  **Generar instaladores:**
    ```bash
    npm run make
    ```

## 📄 Licencia

Este proyecto está bajo la licencia ISC. Consulte el archivo `package.json` para más detalles.

---
*GM-3000 — La evolución del ajedrez digital.*
