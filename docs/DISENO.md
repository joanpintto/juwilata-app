# Juwilata United: documento de diseño

Fuente de verdad de la app. Todo lo que aparece aquí está **cerrado**, salvo lo que se marca como pendiente. Última actualización: 25-09-2026.

---

## 1. Qué es

- App personal para gestionar el equipo de Fútbol 7 **Juwilata United** (fundado en 2022).
- Convierte el rendimiento real de cada partido en **cartas de jugador que evolucionan**, al estilo Ultimate Team. Se inspira en FUTTEAM, pero con identidad y lógica propias.
- Incluye además **Liga** (calendario y clasificación) y **Formación** (campo táctico).
- La usa una sola persona (el administrador del equipo), en español y pensada para móvil.

## 2. Tipo de app

- **PWA** que se instala desde el navegador en la pantalla de inicio, sin App Store.
- **100% local y sin conexión**: sin cuenta ni servidor. Los datos se guardan en el móvil (IndexedDB).
- Los datos no se sincronizan entre dispositivos. La sincronización con los compañeros queda para la Fase 4.
- El dispositivo principal es un **iPhone**: hay que instalarla en la pantalla de inicio y pedir almacenamiento persistente para que Safari no borre los datos.

## 3. Identidad visual

- **Modo oscuro** como base.
- **Colores:**

| Uso | Color |
|---|---|
| Fondo | #161617 |
| Fondo elevado | #1F1F21 |
| Dorado champán (botones, iconos activos, números destacados) | #CCA37C |
| Granate (marca, cabeceras, navegación activa) | #550B1C |
| Texto | #F2F0EC |
| Subidas | #5FAE86 |
| Bajadas y alertas | #C85A63 |

- **Tipografía:** Barlow Condensed para números, marcadores y dorsales; Work Sans para el texto.
- **Escudo real:** óvalo bicolor con la cabra y la cruz.
- Bordes sutiles (dorados o granates, nunca los dos brillando a la vez), iconos de un solo estilo, degradados suaves y microanimaciones al tocar.

## 4. Navegación

- **Móvil:** 5 pestañas abajo.
  1. Inicio.
  2. Plantilla, con las subpestañas Jugadores y Formación.
  3. Partidos, con las subpestañas Mis partidos y Liga.
  4. Evoluciones: clasificación interna, comparador, galería de cartas y gráficos.
  5. Ajustes.
- **Tablet:** barra lateral estrecha.
- **Ordenador:** menú lateral completo.

---

## 5. Jugadores y roles

### 5.1 Roles y pesos de atributos

Hay 9 roles de campo más el portero. Atributos: RIT, TIR, PAS, REG, DEF y FIS. Cada fila suma 100%.

| Rol | Sigla | RIT | TIR | PAS | REG | DEF | FIS |
|---|---|---|---|---|---|---|---|
| Delantero Posicional | DC | 15 | 35 | 10 | 15 | 5 | 20 |
| Delantero Móvil | DM | 22 | 25 | 13 | 22 | 5 | 13 |
| MC Ofensivo | MCO | 12 | 20 | 28 | 24 | 8 | 8 |
| MC Box to Box | MC | 18 | 13 | 20 | 15 | 16 | 18 |
| MC Defensivo | MCD | 10 | 8 | 27 | 15 | 22 | 18 |
| Lateral Carrilero | CAR | 26 | 14 | 19 | 20 | 12 | 9 |
| Lateral Defensivo | LAT | 21 | 10 | 18 | 11 | 23 | 17 |
| Central de Salida | DFS | 9 | 5 | 27 | 10 | 34 | 15 |
| Central de Contención | DFC | 8 | 3 | 12 | 4 | 48 | 25 |

### 5.2 Portero

- La carta usa los mismos 6 huecos con otras etiquetas:
  - **REF**: reflejos.
  - **EST**: estirada.
  - **BLO**: blocaje.
  - **COL**: colocación.
  - **SAQ**: saque y juego con el pie.
  - **FIS**: físico, salidas y juego aéreo.
- Sigla en la carta: **POR** para los dos roles.

| Rol | REF | EST | BLO | COL | SAQ | FIS |
|---|---|---|---|---|---|---|
| Portero Clásico | 25 | 22 | 20 | 18 | 5 | 10 |
| Portero Líbero | 20 | 15 | 13 | 20 | 20 | 12 |

- **Qué acción sube cada atributo:**
  - parada → REF (y un poco BLO);
  - parada difícil → EST (y un poco REF);
  - penalti parado → EST y COL;
  - portería a cero → COL y BLO;
  - despeje o recuperación → FIS (y un poco COL);
  - pase clave o asistencia → SAQ;
  - gol encajado → COL baja un poco;
  - error → BLO baja.
- **Acción nueva del portero: "Salida ganada" (+0,15).** Sube FIS y COL.

### 5.3 Reglas generales

- **La media que se ve en la carta es siempre la media ponderada real de los 6 atributos según el rol.**
- **Atributos iniciales** de un jugador nuevo: `60 + (peso del rol − 16,67%) × 30`. Suman unos 360 puntos. Todo jugador nuevo empieza con carta de Bronce.
- **Fichajes a mitad de temporada:** mismo proceso. Su historial empieza desde el partido en que llegan.
- **Posiciones secundarias:** hasta 2, solo informativas. Un partido fuera de su posición se puntúa con la principal.
- **Pierna buena:** derecha, izquierda o ambas. En la ficha aparece como Diestro, Zurdo o Ambidiestro. Solo informativa.
- **Cambiar de posición o de rol:**
  - el selector de rol solo muestra los roles de la posición elegida;
  - al guardar, **la media se recalcula al momento** con los nuevos pesos;
  - antes, la app avisa: "su media pasa de 80 a 77. ¿Confirmar?".
- **Fotos:** el fondo se recorta en el propio dispositivo y se guarda como PNG.

---

## 6. Algoritmo

### 6.1 Nota del partido (0-10)

- **Base:** 6,0 para todas las posiciones, portero incluido.
- **Ajuste por resultado**, igual para todo el equipo:

| Resultado | Ajuste |
|---|---|
| Victoria por 3 goles o más | +0,35 |
| Victoria por 1-2 goles | +0,20 |
| Empate | 0 |
| Derrota por 1-2 goles | −0,20 |
| Derrota por 3 goles o más | −0,35 |

- **Acciones ofensivas** (valores de un delantero): gol +1,20 · asistencia +0,80 · pase clave +0,25 · ocasión creada +0,20 · disparo a puerta +0,15 · regate +0,15.
- **Acciones defensivas** (valores de un central): recuperación, intercepción y entrada ganada +0,15 · despeje y duelo ganado +0,10.
- **Portería a cero**, solo si jugó la mayor parte del partido: central +0,50 · lateral +0,40 · medio +0,30 · delantero +0,20.
- **Multiplicadores por posición:**

| Posición | Ofensivo | Defensivo |
|---|---|---|
| Delantero | 1,00 | 1,35 |
| Centrocampista | 1,15 | 1,10 |
| Lateral | 1,20 | 1,20 |
| Central | 1,35 | 1,00 |

- **Acciones negativas por posición:**

| Acción | Delantero | Medio | Lateral | Central |
|---|---|---|---|---|
| Ocasión clara fallada | −1,00 | −0,87 | −0,83 | −0,70 |
| Error | −0,80 | −0,90 | −1,00 | −1,10 |
| Pérdida peligrosa | −0,30 | −0,35 | −0,40 | −0,45 |

  Iguales para todos: gol en propia −1,50 · amarilla −0,50 · roja −2,00 · penalti cometido o fallado −0,60.
- **Portero:**
  - parada +0,25 · parada difícil +0,5 · penalti parado +1,5 · portería a cero +1,0 · gol encajado −0,3 · salida ganada +0,15;
  - si marca o asiste: +2,5 / +1,5.
- **Nota final:** la suma de todo, siempre entre 0 y 10. Los minutos no cambian la nota.

### 6.2 Evolución de la media (60-99)

**Cambio de media por partido = ritmo (según la nota ponderada) × multiplicador (según la media actual) × factor de minutos**

1. **Nota ponderada** = 0,5 × último partido + 0,3 × media de los 2 anteriores + 0,2 × media de la temporada.

2. **Ritmo** según la nota ponderada, en puntos por partido. Entre valores se interpola.

| Nota | 6,0 | 6,5 | 7,0 | 7,5 | 8,0 | 8,5 | 9,0 |
|---|---|---|---|---|---|---|---|
| Ritmo | 0 | 0,40 | 0,53 | 0,65 | 0,80 | 0,98 | 1,14 |

3. **Multiplicador** según la media actual, para las subidas. Entre valores se interpola.

| Media | 60 | 65 | 70 | 75 | 80 | 85 | 90 | 95 | 99 |
|---|---|---|---|---|---|---|---|---|---|
| Multiplicador | ×1,40 | ×1,25 | ×1,10 | ×1,00 | ×0,80 | ×0,55 | ×0,35 | ×0,20 | ×0,10 |

4. **Techo por nota** = media final esperada + 4. Por nota: 6,5 → 79 · 7 → 83 · 7,5 → 86 · 8 → 89 · 8,5 → 92 · 9 → 94. En los 3 últimos puntos antes del techo la subida se va frenando hasta pararse.

5. **Factor de minutos** = `min(1, 0,65 + 0,02 × minutos)`: 5 min → 0,75 · 10 → 0,85 · 15 → 0,95 · 18 o más → 1.

6. **Tope de subida:** +1,5 por partido.

7. **Bajadas (bajar cuesta más que subir):**
   - **Nota por debajo de 6,0:** −0,5 por cada punto por debajo de 6,0, sin multiplicador. Por ejemplo, un 5,5 resta 0,25 y un 5 resta 0,5.
   - **Media por encima del techo de su nota:** baja un 3% de la diferencia en cada partido.
   - **Tope de bajada:** −1,0 por partido. Se aplica también el factor de minutos.

8. **Premio de MVP y de nominado:** a partir de 75 se multiplica por `1 − ((media − 75) / 24) × 0,6`. Puede superar el techo, así que solo los jugadores de 9 que suman MVPs durante varias temporadas llegan a Leyenda.

**Resultado con la misma nota en los 32 partidos, empezando en 60 y sin MVPs:**

| Nota | Partido 1 | Partido 4 | Partido 8 | Mitad (16) | Partido 24 | Final (32) |
|---|---|---|---|---|---|---|
| 6,5 | 60,6 | 62,2 | 64,3 | 68,2 | 71,7 | 75,0 |
| 7,0 | 60,7 | 62,9 | 65,6 | 70,6 | 75,1 | 79,0 |
| 7,5 | 60,9 | 63,5 | 66,8 | 72,7 | 77,8 | 82,0 |
| 8,0 | 61,1 | 64,3 | 68,2 | 75,1 | 80,8 | 85,0 |
| 8,5 | 61,4 | 65,3 | 69,9 | 78,0 | 83,9 | 88,0 |
| 9,0 | 61,5 | 65,9 | 71,2 | 80,1 | 86,0 | 90,0 |

Con los 32 MVPs, el jugador de 9 acaba en ~92,4: es el máximo alcanzable en una temporada.

**Ejemplos de bajada:**

| Situación | Resultado |
|---|---|
| Media 90 que saca 6,5 durante 16 partidos | 85,8 |
| Media 80 con 5 partidos a 5,5 | 78,8 |
| Media 75 con 5 partidos a 5 | 72,5 |

**Editable desde la app:** todas estas tablas y valores se pueden cambiar en Ajustes → Avanzado. Antes de aplicar un cambio se ve una simulación con los finales resultantes, y se elige entre recalcular toda la temporada o aplicarlo solo desde ahora.

### 6.3 Atributos

- **Cada acción sube atributos concretos:**
  - gol → TIR (y un poco RIT);
  - asistencia → PAS (y un poco REG);
  - pase clave u ocasión creada → PAS;
  - regate → REG (y un poco RIT);
  - disparo a puerta → un poco TIR;
  - recuperación, intercepción o entrada → DEF;
  - despeje, duelo o portería a cero → DEF (y un poco FIS);
  - muchos minutos seguidos → FIS, muy poco y acumulado;
  - error o pérdida → baja el atributo relacionado;
  - roja → baja un poco FIS o DEF.
- **Subida de un atributo** = valor de la acción × multiplicador de posición × (1 − atributo actual / 99 × 0,5). **Tope de ±0,4 por atributo y partido.**
- **Corrector suave:** cada 5 partidos, si los atributos se alejan más de 4-5 puntos de la media, se reajustan entre 0,3 y 0,5.

---

## 7. Cartas

### 7.1 Rangos y diseños

- **8 rangos automáticos según la media:**

| Rango | Media |
|---|---|
| Bronce | 60-64 |
| Bronce Brillante | 65-69 |
| Plata | 70-74 |
| Plata Brillante | 75-79 |
| Oro | 80-84 |
| Oro Brillante | 85-89 |
| Élite | 90-94 |
| Leyenda | 95-99 |

- **3 diseños especiales** que aplica el administrador a mano: **IF**, **POTM** y **TOTY**. Son 100% estéticos: no cambian la media ni las estadísticas.
- **Acabados:** Bronce, Plata y Oro son mate; sus versiones Brillante llevan más brillo en el marco y un destello abajo a la derecha. Leyenda rompe el patrón con su propia paleta.

### 7.2 Diseño de la carta

- Forma plana, con corona arriba y punta abajo.
- **Arriba:** la media, la sigla del rol, el dorsal y la tendencia ▲ en verde.
- **Centro:** la foto real.
- **Abajo:** el nombre o apodo, y las 6 estadísticas en una fila.
- **Esquina superior derecha:** el escudo.
- Las cartas se generan en SVG con los datos reales, a partir de las 11 plantillas aprobadas.

### 7.3 Mini-carta (Formación, listas y banquillo)

- Es una miniatura real de la carta activa: misma forma, mismo fondo y marco del rango y la foto real.
- Lleva la media y la sigla más grandes, y el nombre abajo.
- Quita las 6 estadísticas, el escudo, el dorsal, la tendencia y la marca de agua.
- Tamaños: 70 px en el campo y 54 px en el banquillo.

---

## 8. Registro de partido

1. **Datos:** rival, fecha, competición, local o visitante.
2. **Resultado.**
3. **Convocatoria:** titular, suplente, no convocado o **baja**. Por defecto, nadie convocado.
4. **Minutos:** los titulares vienen con 50 (partidos de 25×2).
5. **Acciones:** lista rápida (⚽ 🅰 🟨) y un botón "+ más acciones" para cada jugador.
6. **Resumen:** notas, cambios de media y 3 candidatos a MVP.
7. **Confirmar.** Se hace de una sentada, sin borradores.

- **Editar un partido confirmado:** recálculo en cascada de todo lo posterior. Se guarda una copia del estado anterior para poder deshacer.
- **Validaciones:**
  - como mucho 7 titulares;
  - minutos entre 0 y 50;
  - aviso si la suma de goles de tus jugadores no cuadra con el marcador;
  - dorsal único.

## 9. MVP y reconocimientos

- **MVP del partido:** la app propone los 3 mejores. Eliges uno o pulsas "Ningún MVP esta jornada".
- **Premio en la media:** el MVP suma +0,20 y los otros dos nominados +0,10. Se aplica después de la evolución y se reparte entre los 6 atributos.
- **IF (sugerida):** el jugador con mejor nota ponderada de la jornada, si llega a 8,0 o más.
- **POTM (sugerido), por mes natural:** 0,6 × media de notas + 0,5 × MVPs + 0,1 × (goles + asistencias), ajustado por minutos.
- **TOTY:** el 7 ideal en formación 1-3-2-1. Puntuación = 0,5 × media de notas + 0,2 × evolución + 0,2 × producción + 0,1 × MVPs, ajustada por partidos jugados.
- Todo esto son sugerencias: siempre decide el administrador.

## 10. Pantallas

### Inicio
- Resultados de la temporada (partidos, victorias, empates, derrotas y goles).
- **Destacados:**
  - goleador;
  - asistente;
  - **mejor portero** = 0,1 × paradas + 1,0 × porterías a cero − 0,5 × goles encajados por partido;
  - **mejor defensa** = la mejor puntuación de temporada entre centrales y laterales;
  - más MVPs;
  - mayor evolución (en puntos).
- Media del equipo con su tendencia.
- Vitrina de logros del equipo.

### Plantilla → Formación
- Campo de F7 con las mini-cartas colocadas por posición, y el banquillo debajo.
- Se arrastra o se toca para cambiar jugadores.
- Encima del banquillo, la media de los titulares.

### Ficha de jugador
- **Arriba:** selector de temporada y menú "⋯", que incluye Eliminar con confirmación.
- **Carta activa grande** y, debajo, las miniaturas de los diseños desbloqueados. Botón "Usar como activa".
- Nombre, rol completo, dorsal, pierna buena y posiciones secundarias.
- **Progreso al siguiente rango**, por ejemplo "faltan 4,6 para Oro brillante".
- **8 cifras de la temporada:** partidos, minutos, goles, asistencias, nota media, MVPs, amarillas y rojas. Para porteros: paradas, porterías a cero y goles encajados por partido.
- **Forma:** las 5 últimas notas en píldoras de color.
- **Acciones:** Comparar, Diseño especial y Editar.
  - **Editar:** foto, nombre, apodo, dorsal, posición, rol (según la posición), pierna buena y posiciones secundarias (máximo 2).
- **Pestañas:**
  - **Atributos:** radar con el cambio desde el inicio de la temporada.
  - **Evolución:** línea de la media y barras de goles y asistencias.
  - **Historial:** filtrable por temporada.
  - **Logros:** vitrina.

### Evoluciones
- **Comparador:** 2 jugadores cara a cara, con una barra que marca quién gana en cada categoría.
- **Galería:** la carta activa de cada jugador, con filtros y buscador.
- **Gráficos.**

### Liga
- **Partidos propios:** registro completo.
- **Partidos entre otros equipos:** solo el resultado.
- **Clasificación** automática (3 puntos por victoria, 1 por empate, 0 por derrota).
- **Calendario** manual. Un partido aplazado mantiene su número de jornada.

### Experiencia post-partido y notificaciones
- **Secuencia animada al confirmar:** resultado → destacados → cambios de media → carta → MVP. Se salta tocando la pantalla y se puede desactivar.
- **Notificaciones** solo dentro de la app.

## 11. Logros (solo estéticos)

### Cómo funcionan
- Se desbloquean solos al confirmar cada partido y se revisan en el recálculo en cascada.
- **Se ven como escudos:**
  - marco bronce, plata u oro para los logros con niveles;
  - dorado champán con el interior granate para los únicos;
  - icono propio y una cinta con el hito conseguido;
  - los pendientes, en gris con una barra de progreso.
- Todos van en la misma vitrina, incluidos los de la casa.

### Individuales

| Categoría | Logros |
|---|---|
| Gol | Primer gol · Doblete · Hat-trick · Goleador (10 / 25 / 50) |
| Pase | Primera asistencia · Doble asistencia · Asistente (10 / 25 / 50) |
| Defensa y portería | Muro (5 / 15 / 30 porterías a cero) · Penalti parado · Noche de paradas (6 o más) |
| Rendimiento | Primer MVP · Coleccionista (5 / 10 / 20 MVPs) · **Partido de 10** · En racha (3 partidos seguidos con 7,5 o más) |
| Evolución | Primera Plata · Primer Oro · Élite · Leyenda · Salto de temporada (+10 de media) |
| Constancia (por temporada, repetibles) | Veterano (10 / 25 / 32 partidos) · Juego limpio (10 / 25 / 32 partidos seguidos sin tarjeta) |
| Cartas especiales | Primera IF · Primer POTM · TOTY |
| Rarezas | Portero goleador · Gol de lateral o central · Del banquillo al MVP |
| De la casa | Falsas promesas (3 partidos seguidos como no convocado, repetible) · Pata de palo (5 ocasiones claras falladas en una temporada) · Soldado de Edy (5 / 10 / 15 titularidades) · Debut de gala (primera titularidad) · Endrick (5 / 10 / 15 suplencias) |

### De equipo

| Logro | Condición |
|---|---|
| En racha | 3 / 5 / 8 victorias seguidas |
| Invictos | 5 / 10 / 16 partidos seguidos sin perder |
| Goleada | Ganar por 5 goles o más |
| Muralla | 3 porterías a cero seguidas |
| Rodillo | 50 / 100 / 150 goles en una temporada |
| Todos suman | 5 goleadores distintos en un mismo partido |
| Líder | Estar 1º en la clasificación en cualquier jornada |
| Campeones | Terminar la liga en 1ª posición |
| Temporada invicta | Los 32 partidos sin perder |

- **La baja** de la convocatoria no cuenta para Falsas promesas.
- Pendiente: seguir añadiendo logros de la casa.

## 12. Datos y copias

- **Administrador:** no hay "modo admin". Solo se pide confirmación en acciones destructivas.
- **Copia manual:** exportar e importar un JSON (`backup_equipo_AAAA-MM-DD.json`). Al importar se sustituye todo, después de validar el archivo y pedir confirmación.
- **Copias automáticas:** una por cada partido confirmado. Se guardan las 5 últimas y se pueden restaurar desde Ajustes.
- **Aviso cada 4 partidos** para exportar la copia manual.
- **Criterio del modelo de datos:** se guarda lo que registras y se calcula todo lo demás volviendo a reproducir la temporada, con copias del estado después de cada partido.
- **Qué se guarda:**
  - Equipo y Temporada;
  - Jugador;
  - Partido propio y Actuación de cada jugador;
  - Equipos de la liga y sus partidos;
  - Alineación;
  - Logros conseguidos;
  - Notificaciones;
  - Configuración (constantes con número de versión);
  - Copias automáticas.

## 13. Técnica

- **Herramientas:**
  - React + TypeScript + Vite;
  - vite-plugin-pwa;
  - Dexie (IndexedDB);
  - segmentación de fotos en el navegador;
  - cartas y gráficos en SVG.
- **Publicación:** GitHub Pages o Netlify, gratis. La web solo sirve los archivos: los datos no salen del móvil.
- **Construcción:** la hace Claude entera, por fases. El administrador la prueba en su iPhone y pide los cambios en lenguaje normal.
- **Ajustes → Avanzado:** desde la propia app se pueden editar los pesos de los roles, las constantes de las fórmulas, los umbrales de los rangos y los logros de la casa.

## 14. Roadmap

La temporada aún no ha empezado, así que no hace falta cargar partidos anteriores.

- **Fase 0 (puesta en marcha):**
  - cuenta de GitHub y proyecto publicado solo;
  - este documento dentro del proyecto;
  - primera versión instalada en el iPhone.
- **Fase 1 (la app de cada jornada):**
  - Ajustes → Avanzado básico: edición de las tablas de evolución, con simulación y recálculo;
  - configuración del equipo;
  - jugadores (portero incluido);
  - cartas generadas y mini-cartas;
  - registro de partido completo con nota, evolución y MVP;
  - Plantilla y Formación;
  - ficha de jugador;
  - recálculo en cascada;
  - copias de seguridad;
  - Inicio básico.
- **Fase 2 (estadísticas, logros y emoción):**
  - Liga;
  - Evoluciones completas (dashboard, gráficos, comparador y galería);
  - logros;
  - sugerencias de IF, POTM y TOTY;
  - secuencia post-partido y notificaciones.
- **Fase 3 (personalización y temporadas):**
  - Ajustes → Avanzado;
  - varias temporadas con historial;
  - pantalla adaptada a tablet y ordenador.
- **Fase 4 (compartir con el equipo, futuro):** sincronización y servidor, por decidir.
