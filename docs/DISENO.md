# Juwilata United: documento de diseño

Fuente de verdad de la app. Todo lo que aparece aquí está **cerrado**, salvo lo que se marca como pendiente. Última actualización: 25-09-2026 (Fase 1).

---

## 1. Qué es

- App personal para gestionar el equipo de Fútbol 7 **Juwilata United** (fundado en 2022).
- Convierte el rendimiento real de cada partido en **cartas de jugador que evolucionan**, al estilo Ultimate Team. Se inspira en FUTTEAM, pero con identidad y lógica propias.
- Incluye además **Liga** (calendario y clasificación) y **Formación** (campo táctico).
- La usa una sola persona (el administrador del equipo), en español y pensada para móvil.

## 2. Tipo de app

- **PWA** que se instala desde el navegador en la pantalla de inicio, sin App Store.
- **100% local y sin conexión**: sin cuenta ni servidor. Los datos se guardan en el móvil (IndexedDB).
- Los datos no se sincronizan entre dispositivos. Desde la Fase 4, el administrador puede compartir una copia de solo lectura con los compañeros (§18).
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
- **Atributos iniciales** de un jugador nuevo: el perfil de su rol, `(peso del rol − 16,67%) × 30`, desplazado para que la media ponderada sea **exactamente 60,0**. Todo jugador nuevo empieza con carta de Bronce y media 60,0.
- **Fichajes a mitad de temporada:** mismo proceso. Su historial empieza desde el partido en que llegan.
- **Posiciones secundarias:** hasta 2, solo informativas. Un partido fuera de su posición se puntúa con la principal.
- **Pierna buena:** derecha, izquierda o ambas. En la ficha aparece como Diestro, Zurdo o Ambidiestro. Solo informativa.
- **Cambiar de posición o de rol:**
  - el selector de rol solo muestra los roles de la posición elegida;
  - al guardar, **la media se recalcula al momento** con los nuevos pesos;
  - antes, la app avisa: "su media pasa de 80 a 77. ¿Confirmar?".
- **Fotos:** se encuadran a mano y, si se quiere, el fondo se quita automáticamente en el propio dispositivo (ver §19). Se guardan como PNG.

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

Idea: **subir es lo normal y bajar cuesta mucho**. No hay techo: cualquier jugador puede seguir subiendo, solo que cada vez más despacio. Las metas de abajo son una referencia de cómo debe comportarse la fórmula, no algo que se fuerce.

**Metas (empezando en 60, 32 partidos con la misma nota, sin MVPs):** un 6,5 acaba en ~75 y un 9 en ~90 (ver tabla). Con un 6 la media se mantiene.

1. **Nota ponderada** = 0,5 × último partido + 0,3 × media de los 2 anteriores + 0,2 × media de la temporada.

2. **Subida** (si el partido no fue malo) = ritmo (según la nota ponderada) × multiplicador (según la media actual) × factor de minutos. **Tope: +1,5 por partido.**

   Ritmo, en puntos por partido (entre valores se interpola):

| Nota | 6,0 | 6,5 | 7,0 | 7,5 | 8,0 | 8,5 | 9,0 |
|---|---|---|---|---|---|---|---|
| Ritmo | 0 | 0,40 | 0,53 | 0,65 | 0,80 | 0,98 | 1,14 |

   Multiplicador según la media actual (cuanto más alta, más cuesta subir):

| Media | 60 | 65 | 70 | 75 | 80 | 85 | 90 | 95 | 99 |
|---|---|---|---|---|---|---|---|---|---|
| Multiplicador | ×1,40 | ×1,25 | ×1,10 | ×1,00 | ×0,80 | ×0,55 | ×0,35 | ×0,20 | ×0,10 |

3. **Bajada (partido malo):** si la nota **del partido** es menor que 5,5, la media baja 0,45 por cada punto por debajo de 5,5, multiplicado por cuánto se nota la bajada según la media. **Tope: −0,8 por partido.** Un 5,5 o más nunca hace bajar (entre 5,5 y 6 la media se queda igual).

| Media | 60 | 70 | 80 | 85 | 90 o más |
|---|---|---|---|---|---|
| Cuánto se nota | ×0,1 | ×0,3 | ×0,6 | ×0,85 | ×1,0 |

4. **Factor de minutos** = `min(1, 0,65 + 0,02 × minutos)`: 5 min → 0,75 · 10 → 0,85 · 15 → 0,95 · 18 o más → 1. Vale para subidas y bajadas.

5. **Premio de MVP y de nominado:** a partir de 75 se multiplica por `1 − ((media − 75) / 24) × 0,6`. Con MVP en los 32 partidos, un 9 acaba en ~92,6.

**Resultado con la misma nota en los 32 partidos, empezando en 60 y sin MVPs:**

| Nota | Partido 1 | Partido 4 | Partido 8 | Mitad (16) | Partido 24 | Final (32) |
|---|---|---|---|---|---|---|
| 6,5 | 60,6 | 62,2 | 64,3 | 68,2 | 71,7 | 75,1 |
| 7,0 | 60,7 | 62,9 | 65,6 | 70,6 | 75,0 | 78,9 |
| 7,5 | 60,9 | 63,5 | 66,8 | 72,6 | 77,8 | 82,0 |
| 8,0 | 61,1 | 64,3 | 68,2 | 75,1 | 80,8 | 85,1 |
| 8,5 | 61,4 | 65,3 | 69,9 | 77,9 | 83,9 | 88,0 |
| 9,0 | 61,5 | 65,9 | 71,2 | 80,1 | 86,0 | 90,0 |

**Un partido completo según la media** (si el jugador viene jugando con esa nota):

| Media | Nota 4 | Nota 5 | Nota 5,5 | Nota 6 | Nota 7,5 | Nota 9 |
|---|---|---|---|---|---|---|
| 62 | −0,09 | −0,03 | 0 | 0 | +0,87 | +1,50 |
| 70 | −0,20 | −0,07 | 0 | 0 | +0,72 | +1,25 |
| 78 | −0,36 | −0,12 | 0 | 0 | +0,57 | +1,00 |
| 86 | −0,59 | −0,20 | 0 | 0 | +0,33 | +0,58 |
| 92 | −0,68 | −0,23 | 0 | 0 | +0,19 | +0,33 |

**Tres partidos seguidos de 4,5:** media 62 → 61,8 · 70 → 69,6 · 78 → 77,3 · **86 → 84,8** · 92 → 90,6. Cuanto más alta la media, más se nota la bajada; con medias bajas cuesta mucho bajar.

**Editable desde la app:** todas estas tablas y valores se pueden cambiar en Ajustes → Avanzado. Antes de aplicar un cambio se ve una simulación con los finales resultantes, y se elige entre recalcular toda la temporada o aplicarlo solo desde ahora. `npm run verificar` comprueba que se cumplen las metas.

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
- Las cartas se generan en SVG con los datos reales, a partir de las 11 plantillas aprobadas (`npm run cartas` las prepara para la app en `public/cartas/`, sin la foto de ejemplo; los originales se guardan fuera del repositorio porque llevan la foto de un jugador real).
- **Tendencia:** píldora verde «▲ n» con lo que subió la media en su último partido (redondeado; solo «▲» si fue menos de medio punto). Si bajó, píldora granate «▼ n».

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
- **Dos splits:** la liga se juega en 2 splits de 16 jornadas (el primero hasta febrero, el segundo hasta junio o julio) que funcionan como dos ligas distintas. Cada split tiene su propia clasificación, su calendario (J1 a J16), sus resultados y su lista de equipos (pueden cambiar de un split a otro; se pueden copiar los del otro split). **Las medias, estadísticas y premios de los jugadores siguen toda la temporada (32 partidos).**
- **Clasificación** automática por split (3 puntos por victoria, 1 por empate, 0 por derrota).
- **Calendario** manual. Un partido aplazado mantiene su número de jornada.
- **Adelantado a la Fase 1:** equipos de la liga (rivales), calendario de nuestros partidos (jornada, rival, fecha y hora opcionales, local o visitante), botón de aplazar y «Registrar resultado» desde el calendario. En el registro de partido el rival se elige de la lista. Inicio muestra el próximo partido.

### Experiencia post-partido y notificaciones
- **Secuencia animada al confirmar** (adelantada a la Fase 1), a pantalla completa:
  1. **Resultado:** escudos, marcador en grande y «Victoria / Empate / Derrota» (confeti si se gana);
  2. **Protagonistas:** mejor nota con su carta, goleadores, asistentes, portería a cero y tarjetas;
  3. **Cambios de media:** cada jugador con su nota, barra animada y media antes → después;
  4. **Cartas nuevas:** solo si alguien sube de rango, con su carta nueva;
  5. **MVP:** la carta del MVP en grande con rayos dorados y los otros dos nominados a los lados.
  Se avanza tocando la pantalla, «Saltar» va directo al partido y se puede desactivar en Ajustes. La pantalla del partido repite el marcador grande y el podio del MVP, con un botón «Ver resumen animado».
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
| Líder | Estar 1º en la clasificación en cualquier jornada (uno por split) |
| Campeones | Terminar un split en 1ª posición (hasta dos por temporada) |
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
- **Fase 1 (la app de cada jornada):** ✅ construida (ver §15 para lo que queda pendiente de ella).
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
- **Fase 2 (estadísticas, logros y emoción):** ✅ construida (ver §16).
  - Liga: resultados entre otros equipos y clasificación (el calendario y los rivales ya están en la Fase 1);
  - Evoluciones completas (dashboard, gráficos, comparador y galería);
  - logros;
  - sugerencias de IF, POTM y TOTY;
  - secuencia post-partido y notificaciones.
- **Fase 3 (personalización y temporadas):** ✅ construida (ver §17).
  - Ajustes → Avanzado;
  - varias temporadas con historial;
  - pantalla adaptada a tablet y ordenador.
- **Fase 4 (compartir con el equipo):** ✅ construida (ver §18). Los compañeros solo ven; edita solo el administrador.
- **Recorte automático del fondo:** ✅ construido (ver §19).
- **Entrenador (míster):** ✅ construido (ver §20.9 y §20.10).

---

## 15. Concreciones de la Fase 1

Puntos que el diseño dejaba abiertos y que se han concretado al construir la Fase 1. Todos los valores numéricos están en la configuración (Ajustes → Avanzado), no en la lógica.

### Algoritmo
- **Media y atributos:** la media la fija la fórmula de evolución (§6.2). Las acciones (§6.3) solo cambian la *forma* de los atributos: después, el cambio que falta para llegar a la nueva media se reparte por igual entre los 6 atributos. Así la media de la carta es siempre la media ponderada real.
- **Nota ponderada con pocos partidos:** si aún no hay 2 partidos anteriores, se usa lo que haya y se reparten los pesos. En el primer partido, la nota ponderada es la nota del partido.
- **Sin techo (25-09-2026):** se quitó el techo por nota y la bajada por estar por encima de él. La subida se frena sola con el multiplicador y la bajada depende del nivel (§6.2).
- **Media visible:** la parte entera (80,9 se ve 80), para que cuadre con los rangos y con «faltan X para…».
- **Portero:** ocasión clara fallada, error y pérdida peligrosa usan los valores del central. Pase clave y demás acciones ofensivas suman su valor normal.
- **«Y un poco»** en los atributos = 35% del efecto principal. Jugar 40 minutos o más sube FIS +0,05.
- **Corrector suave:** compara cada atributo con el perfil esperado para su rol y su media (no con la media a secas); si se aleja más de 4,5, se acerca 0,4, sin cambiar la media.
- **Sin MVP:** si se pulsa «Ningún MVP esta jornada», nadie recibe premio (tampoco los nominados).
- **Minutos:** los suplentes empiezan con 0. Quien juega 0 minutos no tiene nota ni evolución. La portería a cero cuenta si juega más de la mitad del partido.
- **Cambio de rol:** cada actuación guarda la posición y el rol que tenía el jugador ese día, así que cambiar de rol no reescribe partidos pasados. Si el jugador aún no ha jugado, sus atributos iniciales se rehacen para el nuevo rol.
- **Ajustes → Avanzado:** «solo desde ahora» se consigue guardando la configuración con número de versión; cada partido recuerda con qué versión se calculó.

### Pantallas y datos
- **Formación:** 4 esquemas de F7 (1-3-2-1, 1-2-3-1, 1-3-1-2, 1-2-2-2). Los jugadores se arrastran entre huecos y banquillo, o se tocan dos seguidos para cambiarlos.
- **Registro:** botón «Usar la formación» para marcar titulares de un toque. Las acciones rápidas (⚽ 🅰 🟨) se suman tocando el icono y se restan con el botón «−» que aparece al lado. Si solo juega un portero, sus goles encajados se rellenan con el marcador.
- **Deshacer:** la última acción sobre partidos (registrar, editar o borrar) se puede deshacer.
- **Tipografía:** Barlow Condensed se sirve desde la propia app (extraída de las plantillas de carta), así funciona sin conexión.
- **Inicio → mejor defensa:** la mejor nota media de la temporada entre centrales y laterales.

### Pendiente de la Fase 1
- ~~Recorte automático del fondo de la foto~~: hecho, ver §19.

---

## 16. Concreciones de la Fase 2

### Liga
- En Partidos → Liga se elige el split (1 o 2); todo lo de la pantalla es de ese split y queda como split «en juego» para los partidos de liga nuevos. Las jornadas se ven como «J3» y, cuando hay calendario del segundo split, como «S2·J3».
- La clasificación cuenta nuestros partidos con competición «Liga» y los resultados entre otros equipos, que se apuntan por jornada en Partidos → Liga → Otros resultados.
- Desempate: puntos, diferencia de goles, goles a favor y nombre.

### Logros
- Se calculan siempre a partir de la temporada reproducida, así que se revisan solos al editar un partido. Solo se guarda lo registrado.
- Los contadores (goles, asistencias, MVPs, titularidades…) cuentan la temporada activa. Sumarán varias temporadas cuando llegue el historial (Fase 3).
- **Muro:** porterías a cero jugando de portero, central o lateral más de la mitad del partido.
- **Falsas promesas:** 3 partidos seguidos como no convocado; la baja ni suma ni corta la racha. Repetible.
- **En racha (individual):** cada 3 partidos seguidos con 7,5 o más cuenta una vez.
- **Líder:** ir 1º tras cualquier jornada de un split (o ahora mismo); se puede ganar en cada split. **Campeones:** 1º de un split cuando todos sus partidos de liga del calendario están jugados; hasta dos por temporada. **Temporada invicta:** jugados todos los partidos de la temporada sin perder.
- Escudos: marco bronce/plata/oro para los de niveles (con puntos de nivel), dorado champán con interior granate para los únicos, cinta con el hito (meta alcanzada, «×n» si se repite, o la fecha), gris con barra de progreso si están pendientes.
- Se ven en la ficha del jugador (pestaña Logros) y en Inicio (vitrina del equipo y últimos logros).

### Evoluciones
- Cuatro apartados: Ranking, Comparar (también desde la ficha), Galería (buscador y filtros por posición y rango) y Gráficos (media del equipo, evolución de hasta 4 jugadores, goles por partido y nota media por jugador).
- Colores de las series validados para el fondo oscuro; cada jugador mantiene su color aunque se quiten otros. Al tocar un gráfico se ven los valores y hay una vista de datos en tabla.

### Premios (IF, POTM, TOTY)
- Pantalla Premios (desde Evoluciones) con botones para darlos; lo que se da queda registrado para no sugerirlo otra vez.
- **IF:** la mejor nota ponderada de cada partido si llega a 8,0; también aparece en el detalle del partido.
- **POTM:** «ajustado por minutos» = × mín(1, minutos jugados / 75% de los minutos posibles del mes).
- **TOTY:** «ajustado por partidos» = × mín(1, partidos jugados / 50% de los del equipo). Producción = goles + asistencias. Defensas = centrales y laterales. Es provisional hasta acabar la temporada.
- Todas estas constantes están en la configuración.

### Notificaciones
- Campana en Inicio con el número de nuevas: logros, cartas nuevas por subir de rango, IF y POTM sugeridos y aviso de copia manual.
- Se calculan a partir de los datos; solo se guarda cuáles se han visto.

---

## 17. Concreciones de la Fase 3

### Ajustes → Avanzado completo
- Apartados: Evolución (con simulación), Nota (con ejemplos), Roles, Rangos, Atributos, Premios y Logros de la casa. Todo se guarda como una nueva versión de la configuración, recalculando toda la temporada o solo desde ahora.
- Validaciones: los pesos de cada rol suman 100 y los rangos van de menor a mayor; si no, no se deja aplicar.
- Los pesos de los roles, los rangos y los logros de la casa se aplican siempre a todo (la media visible siempre usa los pesos actuales).

### Logros de la casa configurables
- Cada uno es una regla: **total** (suma, con 1 meta o 3 niveles; por temporada o de carrera), **racha** (N partidos seguidos, repetible) o **en un partido** (N o más en un mismo partido, repetible).
- Se puede contar: titularidades, suplencias, sin convocar (las bajas ni suman ni cortan), partidos jugados, MVPs, partidos sin tarjeta, partidos con 7,5 o más, o cualquier acción del registro.
- Los 5 iniciales quedan como ejemplos editables (Debut de gala es de carrera; los demás, por temporada). Se pueden crear, editar y borrar, con icono propio.

### Varias temporadas
- Ajustes → Temporadas: empezar una nueva (nombre, fecha, quién sigue y si se copian los equipos de la liga), ver una anterior, renombrar y borrar (solo si no tiene partidos).
- **Cada jugador que sigue empieza la temporada con los atributos con los que acabó la anterior**; los fichajes nuevos, con media 60. Se calcula en cadena: editar un partido de una temporada pasada cambia el punto de partida de las siguientes.
- Los jugadores que no siguen pasan a «Ya no están en el equipo» (Plantilla → Jugadores), con su historial intacto y la opción de reincorporarlos.
- La ficha tiene selector de temporada (estadísticas, forma, radar e historial de esa temporada) y totales de carrera.
- **Logros de carrera** (goles, asistencias, MVPs, porterías a cero, rangos alcanzados…) suman todas las temporadas; Veterano, Juego limpio y los «total» de la casa por temporada se reinician; los de equipo cuentan por temporada.
- Cada temporada tiene su propia lista de equipos de la liga, su calendario y sus resultados.

### Tablet y ordenador
- Desde 700 px de ancho: barra lateral estrecha con las 5 secciones y contenido centrado más ancho.
- Desde 1100 px: menú lateral completo con el escudo y el nombre del equipo.
- Hojas y diálogos centrados; galería de 3 o 4 columnas; el móvil sigue igual.

---

## 18. Fase 4: compartir con el equipo

Decisiones del usuario: los compañeros **solo ven** (cartas, clasificación, logros, estadísticas); se comparte con un **enlace secreto** y una nube gratuita (**Supabase**); **con fotos**.

- **Administrador:** Ajustes → Compartir con el equipo → «Crear enlace». La app publica una copia cada vez que cambian los datos (unos segundos después; si no hay conexión, lo reintenta). También «Publicar ahora» y «Dejar de compartir» (borra la copia; el enlace deja de funcionar).
- **Compañeros:** abren el enlace (`…/#/ver/<código>`) en Safari y pueden añadirlo a la pantalla de inicio. Ven la app completa en **modo espectador**: sin botones de edición, con sus propios datos aparte (nunca tocan los del administrador) y se actualiza cada vez que la abren. En Ajustes pueden actualizar o salir.
- **Qué se publica:** equipo, temporadas, jugadores, partidos, configuración, calendario, resultados y equipos de la liga. Las fotos van aparte y solo cuando cambian (en JPG si no tienen transparencia). No se publican las copias de seguridad ni la clave.
- **Seguridad:** las tablas de Supabase están cerradas; solo se usan funciones que piden el **código** del enlace para leer (22 caracteres aleatorios) o la **clave** del administrador para escribir (32 caracteres, guardada solo en su móvil y cifrada en la nube). Cualquiera que tenga el enlace puede ver el equipo: se manda solo al grupo.
- **Plan gratuito de Supabase:** sobra (500 MB y 5 GB de descarga al mes). Si nadie abre la app en una semana, Supabase pausa el proyecto; se reactiva desde su web.
- Configuración: `.env` (dirección y clave pública) y `docs/supabase.sql` (se pega en Supabase → SQL Editor).

---

## 19. Recorte automático del fondo

- En el editor de la foto hay un botón **✂️ Quitar fondo** (y otro para volver a ponerlo). En una foto ya guardada, **"Encuadrar o quitar fondo"** la abre de nuevo en el editor.
- Se hace **en el propio móvil** con el modelo de segmentación de personas de MediaPipe (`selfie_multiclass_256x256`), empaquetado dentro de la app en `public/recorte/`. **La foto nunca sale del dispositivo.**
- El modelo pesa unos **28 MB** y no va en la instalación inicial: se descarga la primera vez que se pulsa el botón (la app avisa) y queda guardado; a partir de ahí funciona sin conexión.
- Se eligió el modelo multiclase frente al pequeño (250 KB) porque deja el borde limpio, sin halo de color alrededor del jugador.
- Mientras se ve sin fondo, detrás aparece un damero para que se note la transparencia; en la carta el jugador queda directamente sobre el fondo de la carta.
- La foto final se guarda a **720×900** (nítida en pantallas de iPhone). El borde se suaviza con código propio (no con filtros del navegador, que Safari no tiene).
- Se guarda también una copia de la **foto original** (máx. 1600 px, solo en este móvil y en las copias de seguridad; no se comparte). "Encuadrar o quitar fondo" parte siempre de ella, así que volver a editar no pierde calidad.
- Tras quitar el fondo aparece la barra **Ajustar recorte** (de "quita más fondo" a "conserva más"), para cuando el fondo se parece a la ropa (p. ej. fondo granate) y el recorte se come parte de la camiseta. Se ajusta al momento, sin volver a pasar el modelo.
- Cada pantalla se abre desde arriba y la página ocupa al menos toda la altura: en iPhone, al pasar de una pantalla larga ya bajada a una corta, la barra de abajo se quedaba "subida".

---

## 20. Entrenador (míster)

El entrenador tiene su propia carta, que evoluciona según cómo rinde el equipo. Es un tipo de carta distinto al de los jugadores, pero de la misma familia. Si el míster juega algún partido, tendrá además una carta de jugador aparte, creada como cualquier otro jugador.

### 20.1 Registro

- En el registro de cada partido se marca **"El míster dirigió este partido"** (sí por defecto). Los partidos que no dirigió no cuentan para su carta.
- El míster **no tiene minutos ni acciones propias**: todo sale de datos que ya se registran (resultado, notas de los jugadores y clasificación).

### 20.2 Nota del míster por partido (0-10)

| Factor | Efecto sobre la base de 6,0 |
|---|---|
| Resultado | Victoria +1,2 · empate +0,2 · derrota −0,8 |
| Diferencia de goles | ±0,15 por gol, con un tope de ±0,6 |
| Rendimiento del grupo | (nota media de los jugadores que jugaron − 6,5) × 0,8 |
| Portería a cero | +0,3 |
| Rival | Ganar a un equipo de la mitad alta de la clasificación: +0,3 · perder con uno de la mitad baja: −0,3. Sin clasificación todavía, no se aplica |

La nota final siempre queda entre 0 y 10.

### 20.3 Evolución de la media

- Usa la **misma nota ponderada y la misma tabla de ritmo** que los jugadores (sección 6.2). La nota neutra es **6,0**.
- **Sin techo por nota** y **sin factor de minutos**.
- **Multiplicador del míster:** igual que el de los jugadores hasta 85, pero más duro a partir de ahí. Así el máximo natural queda en ~94-95.

| Media | 60 | 65 | 70 | 75 | 80 | 85 | 90 | 92 | 94 | 96+ |
|---|---|---|---|---|---|---|---|---|---|---|
| Multiplicador | ×1,40 | ×1,25 | ×1,10 | ×1,00 | ×0,80 | ×0,55 | ×0,30 | ×0,15 | ×0,05 | 0 |

- **Bajadas:** cuando la nota es menor de 6,0, −0,5 por punto (tope −1,0), sin multiplicador. Decidido por el usuario: el míster mantiene esta regla aunque los jugadores usen ahora la de §6.2 (solo bajan con nota < 5,5, según la media). No existe la "vuelta al techo" porque no hay techo.
- **Tope de subida:** +1,5 por partido.
- **Referencia:**

| Nota constante | Final 1ª temporada | Final 2ª | Final 3ª |
|---|---|---|---|
| 7,0 | 78,9 | 88,8 | 92,6 |
| 8,0 | 85,1 | 92,7 | 94,4 |
| 9,0 | 89,8 | 94,3 | 95,3 |

- Todos estos valores se pueden editar en Ajustes → Avanzado, en un apartado propio del míster.

### 20.4 Atributos

- **La media de la carta = media ponderada de los atributos.**
- **Pesos:** ATA 18% · DEF 18% · TÁC 20% · GES 16% · MOT 16% · EXP 12%.
- **Valores iniciales:** 60 de media, repartida con la misma fórmula que los jugadores (factor 30).

| Atributo | Qué mide | Cambio por partido dirigido |
|---|---|---|
| **ATA** Ataque | Goles a favor | 0 goles −0,20 · 1 gol 0 · 2 goles +0,15 · 3 goles +0,25 · 4 o más +0,35 |
| **DEF** Defensa | Goles en contra | 0 goles +0,35 · 1 gol +0,20 · 2 goles 0 · 3 goles −0,15 · 4 o más −0,25 |
| **TÁC** Táctica | Resultado según el rival | Rival de la mitad alta: victoria +0,35 · empate +0,10 · derrota −0,10. Rival de la mitad baja: victoria +0,15 · empate −0,05 · derrota −0,30 |
| **GES** Gestión | Crecimiento de la plantilla | +0,20 por cada jugador que sube de rango en ese partido · +0,05 por cada jugador cuya media sube · −0,05 por cada uno cuya media baja |
| **MOT** Motivación | Reacción y rachas | Victoria después de una derrota +0,35 · victoria con 2 o más seguidas +0,15 · derrota después de otra derrota −0,15 · el resto 0 |
| **EXP** Experiencia | Recorrido | +0,20 por partido dirigido. Nunca baja |

- Se aplican el mismo factor de dificultad por atributo y el mismo tope de ±0,4 por partido que en los jugadores (EXP incluido).
- Cada 5 partidos, el mismo corrector suave alinea los atributos con la media.

### 20.5 Carta del míster

- **Misma silueta, disposición y tipografía** que las cartas de jugador. Las diferencias:
  - donde va la posición, la sigla **ENT**;
  - donde va el dorsal, su **formación favorita** (1-3-2-1, editable);
  - atributos **ATA · DEF · TÁC · GES · MOT · EXP**;
  - marca de agua **MÍSTER** (en las especiales, **MOTM** o **TOTY**).
- **El fondo es siempre una pizarra táctica** que evoluciona con el rango:

| Rango | Media | Pizarra |
|---|---|---|
| Debutante | 60-69 | **De tiza:** verde oscuro, dibujo a tiza algo borroso, marco de madera. Mate |
| Consolidado | 70-79 | **Magnética:** blanca metalizada con cuadrícula, imanes granates y negros, flechas de rotulador rojo, marco de aluminio |
| Élite | 80-89 | **Digital:** pantalla oscura, campo en neón dorado, mapa de calor, pases en cian con nodos, marco dorado brillante |
| Leyenda del banquillo | 90-99 | **Marfil y oro:** paleta de la carta Leyenda de jugador, campo grabado en oro, jugadas en líneas de oro brillante, medallones dorados |

- Cada pizarra tiene su propia jugada dibujada: no se repiten.
- **Diseños especiales**, puramente estéticos y aplicados a mano por el administrador, como en los jugadores:

| Especial | Diseño | Cuándo se sugiere |
|---|---|---|
| **MOTM** (Entrenador del mes) | Paleta POTM: granate con rayas y escudo de marca de agua, campo en champán y un pequeño calendario del mes | Mes con nota media del míster de 7,5 o más, o con el 75% de los puntos o más |
| **TOTY** (Entrenador del año) | Paleta TOTY: azul noche con estrellas, campo en dorado discontinuo y posiciones como constelaciones | Final de temporada con nota media de 7,5 o más, o si el equipo es campeón |

- **Plantillas en el repositorio:** `design/cartas-entrenador/` (debutante, consolidado, elite, leyenda, motm, toty), con el hueco de la foto vacío y el nombre "MÍSTER" provisional: la app pone la foto y el nombre reales del míster. Los originales aprobados llevan la foto de Kampi y, como el repositorio es público, se guardan fuera de git (`docs/cartas-entrenador/`), igual que los de jugador (`docs/cartas/` → `design/cartas/` sin foto → `npm run cartas` → `public/cartas/`).

### 20.6 Dónde aparece

- **Plantilla → Formación:** su mini-carta **arriba a la derecha del campo**, junto a los 7 titulares. Es la misma miniatura que la de los jugadores, con ENT y su media.
- **Ficha del míster:** la misma estructura que la de un jugador:
  - carta grande con los diseños desbloqueados;
  - progreso al siguiente rango;
  - **cifras:** partidos dirigidos, victorias / empates / derrotas, % de victorias, goles a favor, goles en contra, porterías a cero y nota media;
  - **forma:** sus 5 últimas notas;
  - **pestañas:** Atributos, Evolución, Historial y Logros;
  - **Editar:** foto, nombre, apodo y formación favorita.
- **Inicio:** puede aparecer en destacados, por ejemplo "El míster sube a 80".

### 20.7 Logros del míster (solo estéticos)

| Logro | Condición |
|---|---|
| Primera victoria | Única |
| Ganador | 10 / 25 / 50 victorias |
| Matagigantes | Ganar al líder de la liga |
| Del abismo | Ganar después de 3 derrotas seguidas |
| Cantera | 3 jugadores suben de rango en una misma temporada |
| Pizarra maestra | 5 victorias por 3 goles o más en una temporada |
| Muro táctico | 5 porterías a cero en una temporada |
| Míster veterano | 10 / 25 / 32 partidos dirigidos en una temporada |
| Campeón | La liga, también en su vitrina |
| Temporada invicta | También en su vitrina |

- Primera MOTM · Primer TOTY · Primer ascenso de rango (Consolidado, Élite, Leyenda del banquillo).

### 20.8 Roadmap del míster

Las Fases 1-4 de la app ya están hechas; el míster se construye encima en dos partes:

- **Parte 1:** "dirigió" en el registro, nota, evolución y atributos del míster, sus 4 rangos, su ficha y su mini-carta en Formación.
- **Parte 2:** sugerencias de MOTM y TOTY y los logros del míster (van con el resto de logros).

### 20.9 Concreciones de la parte 1 (construida)

- **Siempre hay un míster:** empieza llamándose "Míster" con formación 1-3-2-1. Se edita tocando su mini-carta en Formación → ficha → Editar (foto con recorte de fondo, nombre, apodo y formación favorita: una de las 4 del campo u otra escrita a mano).
- **"Dirigió" es sí por defecto**, también en los partidos ya registrados antes de existir el míster: cuentan todos salvo los que se marquen como no dirigidos (interruptor en el primer paso del registro).
- **Mitad alta / baja del rival:** clasificación del split con las jornadas anteriores al partido. Solo en partidos de liga; sin clasificación todavía (nadie ha jugado), no se aplica ni en la nota ni en TÁC (TÁC queda en 0 ese partido). Con un número impar de equipos, el del medio no cuenta ni como alto ni como bajo.
- **GES:** un jugador que sube de rango suma las dos cosas (+0,20 por el rango y +0,05 porque su media sube).
- **MOT:** se compara con el partido anterior del equipo en la temporada (lo dirigiera o no).
- **EXP nunca baja:** si la media del míster baja, la bajada se reparte entre los otros 5 atributos.
- **Temporadas:** como los jugadores, cada temporada empieza con los atributos con los que acabó la anterior.
- **Detalle del partido:** debajo de las actuaciones sale la fila del míster con su nota, de dónde sale (resultado, el grupo, portería a 0, rival) y cuánto cambia su media.
- **Diseños especiales MOTM y TOTY:** se pueden aplicar a mano desde su ficha (y, desde la parte 2, desde Premios).
- **Compartir:** los compañeros ven la ficha y la carta del míster (con su foto) en solo lectura.
- **Ajustes → Avanzado → Míster:** todas sus constantes, con una simulación de 3 temporadas. `npm run verificar` comprueba la tabla de referencia de §20.3.
- **Plantillas:** `npm run cartas` genera también `public/cartas/mister-*.svg` desde `design/cartas-entrenador/`.

### 20.10 Concreciones de la parte 2 (construida)

- **Premios → "Míster · MOTM y TOTY":**
  - MOTM por mes natural (con lo que dirigió ese mes): se sugiere si la nota media llega a 7,5 o si consigue el 75% de los puntos (3 por victoria, 1 por empate). Los meses que no llegan también se listan, con "no llega".
  - TOTY: provisional durante la temporada; se sugiere con nota media de 7,5 o más, o si el equipo es campeón de algún split en esa temporada.
  - "Dar MOTM/TOTY" le pone la carta especial y la deja como activa. Los umbrales se editan en Ajustes → Avanzado → Míster.
- **Avisos:** MOTM sugerido de los meses ya acabados, subida de pizarra del míster ("¡Pizarra Élite!") y sus logros. En Inicio, el MOTM pendiente sale en Sugerencias y sus logros en Últimos logros.
- **Logros del míster** (pestaña Logros de su ficha), solo con los partidos que dirigió:
  - Ganador y Primera victoria cuentan toda su carrera; Míster veterano, Cantera, Pizarra maestra y Muro táctico son por temporada (los tres últimos se pueden repetir en temporadas distintas).
  - Matagigantes: el rival iba 1º en la clasificación antes del partido. Del abismo: la victoria llega tras 3 o más derrotas seguidas.
  - Cantera: 3 jugadores distintos suben de rango en partidos que dirigió en la misma temporada.
  - Campeón y Temporada invicta son los mismos títulos del equipo, también en su vitrina.
  - Primera MOTM, Primer TOTY y los ascensos a Consolidado, Élite y Leyenda del banquillo.
