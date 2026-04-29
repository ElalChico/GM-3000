# GM-3000 — Board de Auto-Entrenamiento

![GM-3000 Logo](https://github.com/ElalChico/GM-3000/blob/main/LOGO.png)

**GM-3000** (sucesor evolutivo de la anterior versión gm-2000) es una plataforma de ajedrez avanzada desarrollada con tecnologías modernas. Su objetivo es ofrecer una experiencia de juego fluida, analítica y competitiva, diseñada tanto para el estudio profundo como para el juego casual.

La aplicación integra potentes motores de análisis y una infraestructura de red local robusta para enfrentamientos en tiempo real.

---

## 🌐 Versión Online (Demo Web)

Puede probar la aplicación directamente desde su navegador sin necesidad de descargar ni instalar nada.

> **Nota Importante:** La versión online está disponible en [gm-3000.web.app](https://gm-3000.web.app).  
> ⚠️ **Limitación:** En esta versión web **no está disponible** la funcionalidad de conexión LAN para jugar con compañeros en local. Para utilizar el modo multijugador LAN, debe descargar la versión de escritorio.

---

## 📥 Descargas Oficiales

Si desea utilizar todas las funciones, incluyendo el modo LAN y los motores locales, descargue la versión de escritorio:

| Tipo de Instalador | Enlace de Descarga | Descripción |
| :--- | :--- | :--- |
| **Portable (.ZIP)** | [Descargar ZIP](https://mega.nz/file/XKQW2JRZ#Pt5n7T9i-KM2Rd0lFsX89aa03cUvZ31y6sw339NXYkw) | No requiere instalación. Descomprimir y ejecutar. Ideal para USB o pruebas rápidas. |
| **Instalador (.EXE)** | [Descargar Setup](https://mega.nz/file/iGIWVbwY#D1Ok5OoriBrv6ZEs_09nfnRpEDrGEOqVL21FpUIFoIA) | Instalador tradicional para Windows. Integra accesos directos y configuraciones de sistema. |

---

## 🚀 Características Principales

### ♟️ Motores de Análisis Integrados
Integración completa de **Stockfish** para análisis de posiciones, evaluación de jugadas y entrenamiento contra diferentes niveles de dificultad. También incluye otros motores especializados:
*   GM Lite
*   Maia 1 & Maia 2
*   Ailed

### 🎮 Modos de Juego Versátiles
*   **Humano vs. Máquina:** Desafía al motor con niveles de dificultad personalizables.
*   **Humano vs. Humano (Local):** Juega con un amigo en la misma computadora o practica contigo mismo utilizando el control de autogiro del tablero.
*   **LAN Multiplayer:** Conexión directa en red local para partidas entre diferentes dispositivos (requiere versión de escritorio).
*   **Máquina vs. Máquina:** Observa enfrentamientos entre motores para estudio táctico y teórico.

### 🖥️ Interfaz de Usuario Premium
Diseñada con **React** y **Tailwind CSS**, ofreciendo un entorno oscuro, minimalista y optimizado para la concentración (Modo sin distracciones).

### 👁️ Neural Vision
Visualización avanzada de líneas de ataque y control del tablero mediante redes neuronales. El usuario puede elegir visualizar ambas redes, solo una o ninguna, según sus preferencias de estudio.

### 🏆 Gestor de Torneos Profesionales
Herramienta integrada para gestionar torneos de ajedrez de manera unificada. Funciona tanto en la versión web, como en la de escritorio con conexión LAN, o para coordinar torneos presenciales externos a la app. El sistema gestiona llaves, emparejamientos y progreso de participantes profesionalmente.

### 📊 Analíticas y Gestión de Datos
*   **Analíticas en Tiempo Real:** Gráficos de evaluación y estadísticas de partida impulsados por *Recharts*.
*   **Gestión de PGN:** Historial de jugadas completo. Capacidad para guardar partidas en formato PGN para revisión posterior, cargar partidas de terceros para estudio, reproducción automática y adición de comentarios didácticos.

### 🧩 Herramientas de Entrenamiento Especializadas
*   **Modo Libre:** Movimiento libre de piezas (técnicamente permitido) ideal para observar progresos, corregir equivocaciones o configurar posiciones específicas.
*   **Piezas Invencibles:** Modo de entrenamiento para ejercitar la memoria visual. Opción de revelar posición parcial o total del tablero.
*   **Chess960 (Fischer Random):** Disponible para modos Máquina vs. Máquina y Humano vs. Máquina (debe activarse previamente en la configuración).
*   **Entrenamiento de Jaque Mate:** Ejercicios específicos combinando distintas piezas para mejorar la precisión en finales.

> **Recomendación para entusiastas de motores:**  
> Active la opción de **"Juego Infinito"** para observar partidas continuas entre motores, ideal para análisis pasivo y estudio de aperturas.

---

## 🌐 Conexión LAN (Multiplayer Local)

GM-3000 incluye un **Servidor de Relevo Integrado** que permite jugar partidas multijugador sin necesidad de servidores externos o conexión a Internet, siempre que los dispositivos estén en la misma red local.

### Protocolo de Funcionamiento:

1.  **Host (Anfitrión):** Al iniciar el modo LAN, la aplicación levanta automáticamente un servidor en el puerto `3001`. El anfitrión puede consultar su dirección IP local dentro de la configuración de red de la aplicación.
2.  **Invitado (Cliente):** Otros jugadores pueden unirse a la sala ingresando la dirección IP del anfitrión.
3.  **Sincronización Total:** El sistema sincroniza en tiempo real:
    *   Estado del tablero (FEN).
    *   Historial de movimientos.
    *   Relojes de juego.
    *   Configuración de la partida.
4.  **Detección Automática:** Incluye una función de "Ping" para verificar la disponibilidad de salas abiertas en la red local.

---

## 🛠️ Stack Tecnológico

*   **Core Frontend:** React 19 + Vite + TypeScript.
*   **Desktop Wrapper:** Electron + Electron Forge (Empaquetado multiplataforma para Windows, Linux y macOS).
*   **Lógica de Ajedrez:** Chess.js (validación de movimientos y reglas estándar FIDE).
*   **Motor de IA:** Stockfish.js (ejecutado vía Web Worker para no bloquear la UI).
*   **UI/UX:** Tailwind CSS, Framer Motion (animaciones fluidas), Lucide React (iconografía).
*   **Redes:** Node.js HTTP Server (integrado en el proceso principal de Electron para gestión LAN).

---

## 📦 Instalación y Desarrollo

Para contribuir o ejecutar el proyecto en un entorno de desarrollo local:

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/ElalChico/GM-3000.git
    cd GM-3000
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

5.  **Generar instaladores distribuidos:**
    ```bash
    npm run make
    ```

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Consulte el archivo `package.json` o `LICENSE` para más detalles sobre los términos de uso y distribución.

---
*GM-3000 — Board de Auto-Entrenamiento.*
