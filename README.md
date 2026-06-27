# GM-3000 v3 — Board de Auto-Entrenamiento

> ### 🔒 ESTA ES LA VERSIÓN ESTABLE
> **GM-3000 v3** es la versión estable y de producción del proyecto. Todas las funcionalidades han sido probadas, validadas y están listas para uso cotidiano. Esta es la rama principal y la versión recomendada para todos los usuarios.

<div align="center">
  <img src="https://github.com/ElalChico/GM-3000/blob/main/logo-home.png" alt="GM-3000 Logo" width="570">
</div>

**GM-3000** (sucesor evolutivo de la anterior versión gm-2000) es una plataforma de ajedrez avanzada desarrollada con tecnologías modernas. Su objetivo es ofrecer una experiencia de juego fluida, analítica y competitiva, diseñada tanto para el estudio profundo como para el juego casual.

La aplicación integra potentes motores de análisis, análisis con inteligencia artificial en lenguaje natural, lectura por voz y una infraestructura de red local robusta para enfrentamientos en tiempo real.

---

## 🌐 Versión Online (Demo Web)

> **🎉 Versión 3.1.7 ya disponible en [gm-3000.web.app](https://gm-3000.web.app)**  
> Prueba la aplicación directamente desde tu navegador con las últimas mejoras en interfaz, editor FEN, seguridad LAN y Modo Aventura.  
> ⚠️ **Nota:** La funcionalidad de conexión LAN para jugar en red local, el análisis con IA en lenguaje natural y la lectura por voz del análisis con voces realistas **solo están disponibles en la versión de escritorio**. Para disfrutar de todas las funciones, descarga el instalador.

---

## 📥 Descargas Oficiales

Si desea utilizar todas las funciones, incluyendo el modo LAN y los motores locales, descargue la versión de escritorio:

### ✨ Última Versión 3.1.7

| Tipo de Instalador | Enlace de Descarga (MEGA) | Enlace de Descarga (GitHub) | Descripción |
| :--- | :--- | :--- | :--- |
| **Portable (.ZIP)** | [Descargar ZIP](https://mega.nz/file/7fxgEJLa#kVwRmtB64G0qdirxvd0MHdYHvRybXjVQQGZ_DiFmYCI) | [GitHub Release](https://github.com/ElalChico/GM-3000/releases/download/v3.1.7/GM-3000-win32-x64-3.1.7.zip) | No requiere instalación. Descomprimir y ejecutar. Ideal para USB o pruebas rápidas. |
| **Instalador (.EXE 64-bit)** | [Descargar Setup](https://mega.nz/file/vLhRxKxC#BfBbqsQZpiewwx8ncE_ZdeadYPFJfmLaOuFd85zkP8E) | [GitHub Release](https://github.com/ElalChico/GM-3000/releases/download/v3.1.7/GM-3000+Setup.exe) | Instalador tradicional para Windows. Integra accesos directos y configuraciones de sistema. |

### 📦 Versión Anterior 2.1.9

| Tipo de Instalador | Enlace de Descarga | Descripción |
| :--- | :--- | :--- |
| **Portable (.ZIP)** | [Descargar ZIP](https://mega.nz/file/XKQW2JRZ#Pt5n7T9i-KM2Rd0lFsX89aa03cUvZ31y6sw339NXYkw) | No requiere instalación. Descomprimir y ejecutar. Ideal para USB o pruebas rápidas. |
| **Instalador (.EXE)** | [Descargar Setup](https://mega.nz/file/iGIWVbwY#D1Ok5OoriBrv6ZEs_09nfnRpEDrGEOqVL21FpUIFoIA) | Instalador tradicional para Windows. Integra accesos directos y configuraciones de sistema. |

IMPORTANTE: Si desea probar la version minimalista anterior en la web (version 2.1.9) esta disponible en [gm-2000.web.app](https://gm-2000.web.app/)

---

<div align="center">
  <img src="https://github.com/ElalChico/GM-3000/blob/main/Port.png" alt="GM-3000 Logo" width="570">
</div>

## 🚀 Características Principales

### ♟️ Motores de Análisis Integrados
Integración completa de **Stockfish** para análisis de posiciones, evaluación de jugadas y entrenamiento contra diferentes niveles de dificultad. También incluye otros motores desarrollados por el creador de GM-3000:

*   **Stockfish (Oficial):** Motor de ajedrez de clase mundial para análisis profundo y juego competitivo, ejecutado vía Web Worker para máximo rendimiento.
*   **Ailed (Nativo):** ⭐ *Motor más potente del proyecto*. Especializado en análisis profundo, evaluación posicional avanzada y entrenamiento de alto nivel.
*   **Nexus (Nativo):** Motor avanzado con estrategia posicional refinada y análisis de finales mejorado.
*   **Atlas.1 (Nativo):** Motor exclusivo y original del proyecto GM-3000. Construido desde cero con búsqueda Negamax, Poda Alfa-Beta y Tablas de Transposición. Potente y con un estilo de juego único.
*   **Obsidian (Comunidad):** Motor con red neuronal y algoritmos de poda avanzados, configurable desde la interfaz (reducción de movimiento nulo, reducción LMR, futility pruning, tablas de transposición y ponder).
*   **Maia (Comunidad):** Soporte para modelos de la serie Maia (1100-1900), con estilo de juego humano y adaptable.

**Ajuste Dinámico de Motores:** Los motores se asignan automáticamente según el nivel de ELO del jugador en modo aventura, garantizando una dificultad adecuada y progresiva.

### 🎮 Modos de Juego Versátiles
*   **Humano vs. Máquina:** Desafía al motor con niveles de dificultad personalizables.
*   **Humano vs. Humano (Local):** Juega con un amigo en la misma computadora o practica contigo mismo utilizando el control de autogiro del tablero.
*   **LAN Multiplayer (Confirmado):** Conexión directa en red local con sistema de sincronización en tiempo real. Los invitados requieren confirmación del anfitrión para conectarse (requiere versión de escritorio).
*   **Máquina vs. Máquina:** Observa enfrentamientos entre motores para estudio táctico y teórico.
*   **Las 3000 Noches (Modo Aventura):** Experiencia narrativa épica con 4 bosques progresivos, 10 niveles de dificultad, 6 misiones temáticas y 9 rangos nobiliarios.
*   **Modo Asistencia:** Asistente inteligente que analiza cada posición y sugiere las mejores jugadas con explicaciones detalladas. Ideal para aprender estrategias, corregir errores y mejorar tu nivel de juego con retroalimentación en tiempo real.
*   **Modo Progresivo:** Sistema adaptativo que ajusta dinámicamente la dificultad del motor según tu rendimiento en cada partida. A mayor acierto, mayor desafío; perfecto para un crecimiento constante sin frustraciones ni estancamiento.

### 🏰 Modo Aventura — "Las 3000 Noches"
Una experiencia inmersiva donde el jugador se enfrenta a guardianes legendarios del ajedrez en un asedio épico. Cada victoria acerca al jugador a una victoria final contra el Rey Demonio.

**Estructura del Modo Aventura:**
*   **4 Jefes Progresivos:**
    - **Sir Alaric** (Guardián del Primer Milenio): Estilo agresivo, ELO 1200
    - **Nexus** (Guardián del Segundo Milenio): Estrategia posicional, ELO 1700
    - **Lord Valerius** (Guardián del Tercer Milenio): Defensa robusta, ELO 2200
    - **Lord Elrod** (Guardián del Umbral): Maestría total, ELO 3000+
*   **10 Niveles de Dificultad:** Progresión desde Soldados Oscuros (ELO 300) hasta Rey Demonio (ELO 1700)
*   **6 Misiones Narrativas Únicas:**
    - **El Peón Elegido:** Un peón debe coronar en la misma partida o se reinicia el capítulo
    - **El Caballero Resucitado:** Un caballo debe capturar pieza de valor 5+
    - **La Reina Perdida:** Un peón debe capturar un alma enemiga y coronar
    - **El Rey Exiliado:** El rey debe viajar al centro y regresar intacto
    - **La Torre Ancestral:** Torre debe capturar en ambas mitades del tablero
    - **El Alfil Iluminado:** Alfil debe visitar 20+ casillas de su color
*   **Sistema de Rangos Nobiliarios:** 9 rangos (Siervo → Gran Maestre) basados en "Almas Cosechadas" (victorias totales)
*   **Eventos Narrativos Aleatorios:** 30-40% de probabilidad por partida con eventos como "La Sombra del Traidor", "El Viajero Perdido", etc.
*   **Personalizaciones:** Nombre del jugador, ajuste de opacidad de fondo, modo de alta calidad, visualización de ELO enemigo

### 🎯 Modo Asistencia
El **Modo Asistencia** es tu entrenador personal de ajedrez integrado. Analiza cada posición en tiempo real y te sugiere las jugadas más óptimas junto con explicaciones estratégicas para que entiendas el *porqué* detrás de cada movimiento.

**Características clave:**
*   **Sugerencias en Vivo:** Muestra las mejores jugadas evaluadas por el motor directamente en el tablero.
*   **Explicaciones Estratégicas:** Cada sugerencia incluye una breve descripción del objetivo táctico o posicional.
*   **Evaluación Continua:** Gráfico de evaluación que muestra cómo cambia la ventaja con cada movimiento.
*   **Detección de Errores:** Identifica jugadas débiles y sugiere alternativas correctivas.
*   **Modo Aprendizaje:** Ideal para principiantes que quieren entender conceptos como desarrollo, control del centro, seguridad del rey y estructura de peones.
*   **Disponible en:** Partidas contra la máquina y en modo libre.

> **Recomendación:** Actívalo desde la configuración antes de iniciar una partida. Úsalo para estudiar aperturas, analizar tácticas o simplemente para ver si tu jugada planeada es la mejor según el motor.

### 📈 Modo Progresivo
El **Modo Progresivo** transforma cada partida en un desafío a tu medida. El sistema monitorea tu rendimiento en tiempo real y ajusta la dificultad del motor automáticamente, subiendo el nivel cuando aciertas y bajándolo si cometes errores consecutivos.

**Características clave:**
*   **Dificultad Adaptativa:** El motor se fortalece o debilita dinámicamente según tu desempeño.
*   **Sin Frustración:** Si estás en una racha de derrotas, el motor reduce su nivel para que puedas recuperar confianza.
*   **Sin Estancamiento:** Si dominas al motor con facilidad, aumenta el desafío para que sigas mejorando.
*   **ELO Dinámico:** El nivel de juego del motor se recalcula tras cada movimiento basado en la calidad de tus jugadas.
*   **Seguimiento de Progreso:** Visualiza tu evolución a través de estadísticas de rendimiento.
*   **Compatible con:** Todos los modos de juego contra la máquina.

> **Recomendación:** Perfecto para jugadores que quieren una curva de aprendizaje natural sin tener que ajustar manualmente la dificultad en cada partida.

### 🛡️ Modo Mental

El **Modo Mental** es una poderosa herramienta de entrenamiento de ajedrez para `a ciegas`. Elimina completamente el tablero visible, forzándote a pensar y jugar exclusivamente con notaciones verbales, algebraicas o de coordenadas. Ideal para jugadores que desean evaluar su memoria táctica, comprensión de posiciones y capacidad de cálculo sin la dependencia visual de las casillas del tablero.

#### 🎯 Características Clave

*   **Entrada Multi-Formato** – Acepta de forma flexible:
    *   **UCI/Coordenadas:** `e2e4`, `Nf3`, `g1f3`
    *   **SAN (Standard Algebraic Notation):** `e4`, `Nf3`, `O-O`
    *   **Algebraica Larga:** `peón e2 a e4`, `torre h1 a h2`
    *   **Verbal:** `peón g1 a h2`, `caballo a8 a c7`
*   **Motor IA Integrado** – Enfrenta motores de ajedrez avanzados (Stockfish, Ailed, Nexus, Atlas.1, Obsidian, Maia 1/2) con niveles de profundidad personalizables (3‑25) y adaptación automática según el color elegido.
*   **Motor Según Color** – Cuando eliges **Negras**, el motor IA juega directamente como **Blancas**, configurándose automáticamente los motores y niveles de blanca en vez de negros.
*   **Modo Revelar con 3 Niveles** – revela progresivamente el tablero y las notaciones:
    *   **Nivel 1 – Solo Tablero:** Discreto tablero mini sin piezas, sin coordenadas
    *   **Nivel 2 – Tablero + Coordenadas:** Tablero con etiquetas de columnas y filas
    *   **Nivel 3 – Todo Revelado:** Tablero completo con piezas y coordenadas (se oculta automáticamente tras 5 segundos)
*   **Visualización de Fin de Partida** – Detecta y muestra banners claros para jaque mate, tablas (ahogado, material insuficiente, tresfold, 50‑movimientos) y tiempo agotado, con notificación inmediata del ganador.
*   **Historial PGN Integrado** – La aplicación reconstruye automáticamente posiciones desde el historial completo de movimientos, permitiendo la navegación por todo el recorrido de la partida dentro del panel lateral.
*   **Relojes de Juego** – Temporizadores independientes para Blancas y Negras con cuenta regresiva, señales visuales, y soporte para tiempo por movimiento.
*   **Editor y Historial** – Simple entrada de movimiento, historial de jugadas con pestaña de revisión, y un panel de PGN lateral para estudio y navegación.

#### 📋 Configuración del Modo Mental

Al abrir el Modo Mental, se presenta una interfaz limpia para elegir los parámetros exactos del entrenamiento:

1.  **Tu Color:** Selecciona entre **Blancas** o **Negras**. Cuando eliges Negras, los motores IA toman el bando opuesto de manera automática.
2.  **Motor Oponente:** Elige cualquier motor IA disponible (Stockfish, Ailed, Nexus, Atlas.1, Obsidian, Maia 1/2).
3.  **Profundidad / Nivel:** Escoge la profundidad de cálculo del motor (3‑25). Motor con motor inteligente: ajusta dinámicamente ELO basado en tu nivel de juego.
4.  **Botón "Iniciar Partida":** Comienza el entrenamiento, ocultando el panel de configuración y mostrando el área de entrada de movimientos.

#### 🎮 Flujo de Juego

1.  **Entrada de Movimientos:** Escribe movimientos usando cualquier formato admitido. El sistema valida, verifica legalidad y aplica directamente al reloj.
2.  **Feedback Visual:** La ultima jugada aparece inmediatamente en el área de reveal, mostrando la notación convertida (SAN, Coordenadas, Longa o Verbal) según el formato seleccionado.
3.  **Revelación Interactiva:** Usa el botón **Revelar** (☁) para mostrar el tablero progresivamente, revelando primero solo el tablero, luego las coordenadas, y finalmente las piezas.
4.  **Fin del Juego:** Cuando termina la partida (jaque mate, tablas, tiempo agotado), aparece un banner llamativo con el resultado y un botón para **Reiniciar** sin necesidad de volver al menú principal.
5.  **Revisión:** Usa los botones de navegación para navegar por todo el historial de la partida, estudiar patrones tácticos y replay de jugadas clave.

#### 🧠 Aplicaciones de Entrenamiento

*   **Mejorar la Memoria:** Practica jugar `a ciegas` reforzando la posición de piezas y movimientos futuros.
*   **Velocidad de Cálculo:** La presión del tiempo obliga a un cálculo rápido.
*   **Cómputo Táctico:** Mejora el cálculo posicional sin distracciones visuales.
*   **Estudio de Aperturas:** Memoriza líneas de apertura complejas y estudios.
*   **Preparación para Torneos:** Entrenate para enfrentar oponentes sin depender del tablero de un oponente.

> **Recomendación:** Para mayor concentración, activa el modo sin distracciones en configuración. Usa el Modo Mental regularmente para construir una base sólida de cálculo y memoria táctica. Ideal para estudiantes de ajedrez, jugadores rápidos y aquellos que buscan mejorar su juego `a ciegas`.

### 🖥️ Interfaz de Usuario Premium
Diseñada con **React** y **Tailwind CSS**, ofreciendo un entorno oscuro, minimalista y optimizado para la concentración.

**Características de Interfaz Mejoradas:**
*   **Modo sin Distracciones:** Oculta encabezados, fondos y paneles laterales para máxima concentración
*   **Diseño Responsivo Avanzado:** Espaciado automático en pantallas pequeñas, tablero redimensionable (Pequeño, Normal, Grande, Ajustar Pantalla)
*   **Tamaño de Tablero por Defecto:** Modo "Ajustar Pantalla" preseleccionado para experiencia óptima en todas las resoluciones
*   **Extracción de Nombres de Jugadores:** Al cargar PGN, extrae automáticamente nombres de blancas/negras del encabezado
*   **Modal de Fin de Partida:** Diseño robusto con mayor opacidad para claridad y botón X para cerrar
*   **Confirmación al Salir de Aventura:** Diálogo preventivo para evitar pérdidas accidentales de progreso
*   **Indicadores Visuales Claros:** Botones con etiquetas precisas ("Presiona para Ingresar"), información de enemigo en tiempo real



### 🏆 Gestor de Torneos Profesionales
Herramienta integrada para gestionar torneos de ajedrez de manera unificada. Funciona tanto en la versión web, como en la de escritorio con conexión LAN, o para coordinar torneos presenciales externos a la app. El sistema gestiona llaves, emparejamientos y progreso de participantes profesionalmente.

### ♟️ Editor de Posiciones FEN
Editor completo para crear y modificar posiciones de ajedrez manualmente. Accesible desde el botón "Editor FEN" en la barra de herramientas del tablero.

**Funciones principales:**
*   **Piezas Drag & Drop:** Arrastra piezas desde la paleta y suéltalas en el tablero. Haz clic en una pieza en la paleta para seleccionarla y clic en una casilla para colocarla.
*   **Selector de Turno:** Alterna entre Blancas y Negras para definir a quién le toca jugar.
*   **Opciones de Enroque:** Casillas de verificación para enroque corto/largo de ambos bandos.
*   **Control de Peón al Paso:** Campo para especificar la casilla de captura al paso.
*   **Presetos de Posiciones:** Carga posiciones iniciales comunes (Posición Inicial, Siciliana, Ruy López, etc.) con un solo clic.
*   **Vaciar Tablero:** Limpia todas las piezas del tablero para empezar de cero.
*   **Carga FEN:** Carga posiciones desde una cadena FEN pegada o escribida manualmente.

**Gestión de Variantes (Capturas de Posición):**
*   **Guardar Variante:** Captura el estado actual del tablero como una variante con nombre personalizado.
*   **Navegación de Variantes:** Usa las flechas ← → para recorrer tus variantes guardadas (índice X de N).
*   **Comparar Modo:** Activa el modo comparación para resaltar visualmente las diferencias entre dos variantes (casillas diferentes se marcan en azul en el tablero).
*   **Reconstrucción (Replay):** Carga una variante y reproduce los movimientos paso a paso desde la posición inicial, útil para estudiar cómo se llegó a esa posición.
*   **Borrar Variantes:** Elimina variantes individuales con el botón 🗑️.

**Capturas de Pantalla del Tablero:**
*   **Formato:** Selecciona PNG o JPG antes de capturar.
*   **Descarga:** Haz clic en "📷 Capturar" para descargar una imagen del tablero actual.
*   **Tecla Rápida:** Presiona Shift+S para capturar directamente.

> **Nota:** Las variantes se guardan manualmente. No se crean automáticamente al cargar presetos.

### 📊 Analíticas y Gestión de Datos
*   **Analíticas en Tiempo Real:** Gráficos de evaluación y estadísticas de partida impulsados por *Recharts*.
*   **Gestión de PGN Avanzada:** Historial de jugadas completo. Capacidad para:
    - Guardar partidas en formato PGN con encabezados personalizados
    - Cargar partidas de terceros para estudio
    - Reproducción automática con control de velocidad
    - Extracción automática de nombres de jugadores
    - Adición de comentarios didácticos

### 🧩 Herramientas de Entrenamiento Especializadas
*   **Modo Libre:** Movimiento libre de piezas ideal para observar progresos, corregir equivocaciones o configurar posiciones específicas.
*   **Piezas Invencibles:** Modo de entrenamiento para ejercitar la memoria visual. Opción de revelar posición parcial o total del tablero.
*   **Chess960 (Fischer Random):** Disponible para modos Máquina vs. Máquina y Humano vs. Máquina (debe activarse previamente en la configuración).
*   **Entrenamiento de Jaque Mate:** Ejercicios específicos combinando distintas piezas para mejorar la precisión en finales.

> **Recomendación para entusiastas de motores:**  
> Active la opción de **"Juego Infinito"** para observar partidas continuas entre motores, ideal para análisis pasivo y estudio de aperturas.

> **Recomendación para aprendices de ajedrez:**
> Comience con el **Modo Aventura "Las 3000 Noches"** para una experiencia narrativa que gradualmente aumenta la dificultad mientras aprende estrategias avanzadas.

---

## 🧠 Análisis Maestro con IA

El **Análisis Maestro** es el sistema de análisis post-partida más completo de GM-3000. Revisa cada jugada con motores de ajedrez y luego genera una explicación en lenguaje natural usando modelos de IA avanzados, con soporte para lectura por voz.

### Modos de Análisis

| Modo | Descripción | Requiere Motor Local |
| :--- | :--- | :---: |
| **Análisis Rápido** | Evaluación por jugada con Stockfish a profundidad moderada. Clasifica cada jugada (Brillante, Muy Buena, Mejor Jugada, Buena, Imprecisión, Error, Error Grave) y genera comentarios. | ✅ |
| **Análisis Profundo** | Mayor profundidad de cálculo para una evaluación más precisa y detallada. Ideal para partidas importantes. | ✅ |
| **Análisis en Nube** | Usa las API de chess-api.com y Lichess Cloud Eval para obtener evaluaciones sin requerir el motor local. | ❌ |
| **Explorador de Aperturas** | Explora la teoría de aperturas con datos de la base de datos Lichess. Muestra frecuencias, tasas de victoria y líneas principales. | ❌ |

### Progreso de Análisis en Tiempo Real

Durante el análisis, el porcentaje de progreso se muestra tanto en el botón de "Análisis Maestro" como dentro del cartel de resultado del juego (Jaque Mate, Tablas, etc.), con una barra de progreso visual y el texto animado "Analizando X%".

---

### Proveedores de IA y Modelos Soportados

El análisis en lenguaje natural es impulsado por múltiples proveedores de IA. Todos utilizan la API compatible con OpenAI Chat Completions. Configure su API Key desde el panel de administración de APIs dentro del overlay de Análisis Maestro.

#### Google AI Studio (Gemini) — API Key gratuita
| Modelo | Descripción |
| :--- | :--- |
| `gemini-2.5-flash` | Gratis, 1M tokens de contexto. Recomendado para uso general. |
| `gemini-2.5-flash-lite` | Gratis, límites de uso más altos. |
| `gemini-2.0-flash` | Gratis, versión legacy. |

Obtener API Key: [aistudio.google.com](https://aistudio.google.com/apikey)

#### OpenRouter — API Key gratuita
| Modelo | Descripción |
| :--- | :--- |
| `openrouter/free` | Auto-Router gratuito: selecciona automáticamente el mejor modelo disponible. |
| `qwen/qwen3-235b-a22b:free` | Qwen3 235B MoE, 128K contexto. |
| `meta-llama/llama-4-maverick:free` | Llama 4 Maverick, 1M contexto. |
| `deepseek/deepseek-r1:free` | DeepSeek R1, razonamiento avanzado. |
| `deepseek/deepseek-chat-v3-0324:free` | DeepSeek V3 Chat, modelo conversacional. |

Obtener API Key: [openrouter.ai/keys](https://openrouter.ai/keys)

#### NVIDIA NIM
| Modelo | Descripción |
| :--- | :--- |
| `nvidia/nemotron-3-ultra-550b-a55b` | Nemotron 3 Ultra 550B — el más potente. |
| `deepseek-ai/deepseek-v4-pro` | DeepSeek V4 Pro, razonamiento avanzado. |
| `deepseek-ai/deepseek-v4-flash` | DeepSeek V4 Flash, rápido. |
| `minimax-m3` / `minimax-m2.7` | MiniMax, modelos generales. |
| `mistral-medium-3.5-128b` | Mistral Medium 3.5, 128B parámetros. |
| `step-3.7-flash` | Step 3.7 Flash, rápido. |
| `kimi-k2.6` | Kimi K2.6, razonamiento. |
| `glm-5.1` | GLM 5.1, general. |
| `gemma-4-31b-it` | Gemma 4 31B, rápido. |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` | Nemotron 3 Nano, multimodal. |
| `diffusiongemma-26b-a4b-it` | Diffusion Gemma 26B, especializado. |
| `nvidia/chatterbox-multilingual-tts` | Chatterbox TTS Multilingual, generación de voz. |

#### Cerebras — Inferencia Ultra-Rápida
| Modelo | Descripción |
| :--- | :--- |
| `gpt-oss-120b` | GPT-OSS 120B, ultra-rápido con 128K contexto. |
| `qwen-3-235b` | Qwen3 235B, razonamiento potente. |
| `llama-3.3-70b` | Llama 3.3 70B, rápido y general. |

#### Together AI
| Modelo | Descripción |
| :--- | :--- |
| `meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo` | Llama 3.1 405B — el modelo más grande. |
| `meta-llama/Llama-3.3-70B-Instruct-Turbo` | Llama 3.3 70B, rápido y económico. |
| `MiniMax/MiniMax-M2.7` | MiniMax M2.7, 230B parámetros. |
| `Qwen/Qwen3.6-Plus` | Qwen 3.6 Plus, balanceado. |

#### API Personalizada (OpenAI-compatible)
Soporte para cualquier endpoint compatible con la API de OpenAI Chat Completions. Ingrese la URL base y el modelo. Ideal para servidores locales (Ollama, vLLM, LM Studio) o proveedores adicionales.

---

### Sistema de Text-to-Speech (TTS) — Lectura por Voz

GM-3000 incluye un sistema TTS avanzado para escuchar el análisis en voz alta. Soporta **dos motores** con prioridad automática:

#### Motor Principal: edge-tts (Neural) — Exclusivo de escritorio
Voces neuronales de alta calidad de Microsoft Edge, con entonación natural y expresiva.

| Voz | Idioma | ID |
| :--- | :--- | :--- |
| **Dalia** | Español (México) | `es-MX-DaliaNeural` |
| **Elvira** | Español (España) | `es-ES-ElviraNeural` |
| **Jenny** | Inglés (EEUU) | `en-US-JennyNeural` |
| +50 voces más | Español, Inglés, otros | Cargadas dinámicamente |

- Acceso al listado completo de voces neuronales disponibles (filtradas por idioma)
- Control de velocidad (0.5x — 2.0x), volumen y pausa/reanudación
- Descarga del audio como archivo MP3
- Barra de reproducción con posición y duración

#### Motor de Respaldo: Web Speech API — Disponible en web y escritorio
Síntesis de voz del navegador, con detección automática de voces en español. Usado como fallback cuando edge-tts no está disponible.

> **Nota:** El motor TTS edge-tts con voces neuronales es **exclusivo de la versión de escritorio**. La versión web utiliza Web Speech API.

---

### ⚠️ Funciones Exclusivas de la Versión de Escritorio

Las siguientes funcionalidades **solo están disponibles** en la versión de escritorio (Electron):

- 🧠 **Análisis con IA en lenguaje natural** — Análisis general y técnico de partidas completas usando modelos de IA avanzados. Incluye clasificación por jugada, explicaciones estratégicas y resumen narrativo.
- 🔊 **Lectura por voz del análisis (TTS Neural)** — Escucha el análisis completo con voces neuronales realistas de edge-tts (Dalia, Elvira, Jenny y más). Control de velocidad, volumen, pausa y descarga MP3.
- 🌐 **Conexión LAN** — Juega en red local sin Internet con sincronización en tiempo real y confirmación manual del anfitrión.
- ⚙️ **Motores locales avanzados** — Ejecución nativa de Stockfish, Ailed, Nexus, Atlas.1 y otros motores con máximo rendimiento vía Web Workers dedicados.
- 📂 **Carga de PGN desde archivo** — Sube archivos .pgn directamente para analizar con IA.
- 💾 **Descarga de audio TTS como MP3** — Exporta el análisis leído como archivo de audio para escuchar offline.

> **Recomendación:** Para disfrutar de la experiencia completa, descargue la versión de escritorio. La versión web funciona como demo limitada.

---

## 🌐 Conexión LAN (Multiplayer Local)

GM-3000 incluye un **Servidor de Relevo Integrado** que permite jugar partidas multijugador sin necesidad de servidores externos o conexión a Internet, siempre que los dispositivos estén en la misma red local.

### Protocolo de Funcionamiento:

1.  **Host (Anfitrión):** Al iniciar el modo LAN, la aplicación levanta automáticamente un servidor en el puerto `3001`. El anfitrión puede consultar su dirección IP local dentro de la configuración de red de la aplicación.
2.  **Invitado (Cliente):** Otros jugadores pueden unirse a la sala ingresando la dirección IP del anfitrión.
3.  **Sistema de Confirmación (Seguridad):** Cuando un invitado intenta conectar:
    - El servidor notifica al anfitrión de la solicitud de conexión
    - El anfitrión debe **confirmar explícitamente** al invitado (no hay aceptación automática)
    - Solo después de la confirmación se sincroniza la partida
    - El invitado no puede interactuar hasta que se complete la confirmación
4.  **Sincronización Total:** El sistema sincroniza en tiempo real:
    *   Estado del tablero (FEN).
    *   Historial de movimientos.
    *   Relojes de juego.
    *   Configuración de la partida.
    *   Cambios de estado durante la partida.
5.  **Detección Automática:** Incluye una función de "Ping" para verificar la disponibilidad de salas abiertas en la red local.

### Características de Seguridad LAN:
*   ✅ Confirmación manual del anfitrión para cada conexión
*   ✅ Validación de entrada en todos los endpoints
*   ✅ Sincronización de estado para evitar manipulaciones
*   ✅ Relojes independientes con verificación cruzada
*   ✅ Historial completo de movimientos verificado
*   ✅ **Mejoras de Seguridad v3.1.7:** Sanitización de datos de red y protección contra inyecciones en el servidor de relevo.

### 🔄 Compatibilidad entre Versiones:
Debido a las mejoras en la lógica de sincronización y protocolos de seguridad en la versión 3.1.7, la comunicación con versiones anteriores (v3.1.6 o inferiores) puede presentar discrepancias. 

> **Recomendación Crucial:** Si desea jugar contra un usuario que utiliza una versión anterior de GM-3000, **se recomienda que la sala sea creada (Host) desde la versión más antigua**. Esto asegura que el protocolo de comunicación sea el esperado por el cliente antiguo y mantiene la estabilidad de la partida.

---

## ✨ Mejoras en la Versión 3.1.7

### Editor de Posiciones FEN
*   ✅ Editor completo con drag & drop de piezas desde paleta
*   ✅ Presets de posiciones comunes (Siciliana, Ruy López, Caro-Kann, etc.)
*   ✅ Guardado manual de variantes con navegación ← → y comparación visual
*   ✅ Modo reconstrucción para reproducir movimientos paso a paso
*   ✅ Resaltado visual de diferencias entre variantes (casillas en azul)
*   ✅ Captura de pantalla del tablero en PNG o JPG

### Interfaz de Usuario
*   ✅ Espaciado responsivo mejorado en pantallas pequeñas (móviles y tablets)
*   ✅ Tamaño de tablero por defecto: "Ajustar Pantalla" para experiencia óptima
*   ✅ Modal de fin de partida con mayor transparencia (95%) para mejor legibilidad
*   ✅ Botón de Aventura con texto claro: "Presiona para Ingresar"
*   ✅ Sistema de confirmación al salir de Aventura (previene pérdidas accidentales)

### PGN y Análisis
*   ✅ Extracción automática de nombres de jugadores desde encabezados PGN
*   ✅ Visualización mejorada de nombres en el tablero (Jugador Blancas vs. Motores Negras)

### Modo Aventura
*   ✅ 4 Jefes con personalidades únicas y ELO progresivo
*   ✅ 9 rangos nobiliarios basados en "Almas Cosechadas"
*   ✅ Contador global de batallas con hitos cada 100 victorias
*   ✅ 6 tipos de misiones narrativas con mecánicas complejas
*   ✅ Ajuste dinámico de motor según ELO del jugador
*   ✅ Sistema de guardado/carga de progreso

### Seguridad y Estabilidad
*   ✅ Sistema de confirmación manual en modo LAN
*   ✅ Validación mejorada de entrada en todos los puntos de contacto
*   ✅ Sincronización robusta de estado en partidas LAN
*   ✅ **Protocolo de Compatibilidad:** Optimizaciones para interactuar con versiones previas del motor.

---

## 🛠️ Stack Tecnológico

*   **Core Frontend:** React 19 + Vite + TypeScript.
*   **Desktop Wrapper:** Electron + Electron Forge (Empaquetado multiplataforma para Windows, Linux y macOS).
*   **Lógica de Ajedrez:** Chess.js (validación de movimientos y reglas estándar FIDE).
*   **Motores de IA:** 
    - Stockfish.js (ejecutado vía Web Worker para no bloquear la UI)
    - Motores nativos propios (Ailed, Nexus, Atlas.1) + motores de la comunidad (Obsidian, Maia) con lógica optimizada en TypeScript
*   **UI/UX:** Tailwind CSS, Framer Motion (animaciones fluidas), Lucide React (iconografía).
*   **Redes:** Node.js Express Server (servidor de relevo LAN integrado en el proceso principal de Electron).
*   **Visualización:** Recharts (gráficas de análisis), Canvas API (render del tablero).

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

3.  **Crear archivo de entorno:**
    Copie `.env.example` como `.env.development` y `.env.production` y configure sus variables (claves API, URLs de servicios, etc.). Estos archivos **no** se incluyen en el repositorio por seguridad.
    ```bash
    cp .env.example .env.development
    cp .env.example .env.production
    ```

4.  **Ejecutar en modo desarrollo (Web):**
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

<div align="center">
  <img src="https://github.com/ElalChico/GM-3000/blob/main/GM-3000.png" alt="GM-3000 Logo" width="570">
</div>



## 🌐 Limitaciones de la Versión Web

La versión web (demo en navegador) tiene las siguientes limitaciones respecto a la versión de escritorio:

- **Análisis con IA en lenguaje natural** — No disponible en la versión web. Para obtener análisis profundos de partidas con inteligencia artificial (evaluación por jugada, análisis general y técnico), instale la versión de escritorio.
- **Lectura por voz del análisis (TTS Neural)** — No disponible en la versión web. Para escuchar el análisis con voces neuronales realistas (edge-tts), instale la versión de escritorio. La versión web solo ofrece la síntesis de voz básica del navegador (Web Speech API).
- **Conexión LAN** — No disponible en la versión web. Para jugar en red local, instale la versión de escritorio.
- **Motores locales avanzados** — Algunos motores de ajedrez avanzados requieren la versión de escritorio para funcionar correctamente.
- **Carga de PGN desde archivo** — No disponible en la versión web.
- **Descarga de audio TTS** — No disponible en la versión web.

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. 

Para leer los términos completos, consulte el archivo [`LICENSE`](https://github.com/ElalChico/GM-3000/blob/main/LICENSE) en este repositorio.

---
*GM-3000 — Board de Auto-Entrenamiento.*
