# Maquetas aprobadas — interfaz «cristal» granate → negro

Capturas a 390 px de ancho (x2) de las pantallas aprobadas por el usuario. **Las PNG no se suben al repositorio** (salen fotos de jugadores reales y el repositorio es público): están en la copia local del administrador; `fuente/` sí está. Son la referencia visual obligatoria: la app debe verse así.

| Archivo | Pantalla |
|---|---|
| 01-inicio.png | Inicio (estadio + próximo partido + forma + destacados) |
| 02-plantilla-formacion.png | Plantilla → Titulares: campo, química, peanas de posición, avisos «!», míster, banquillo |
| 03-liga.png | Liga: Calendario (y pestaña Clasificación) |
| 04-estadisticas.png | Estadísticas: Equipo / Jugadores / Evolución |
| 05-detalle-partido.png | Detalle de partido (goles con minuto) |
| 06-ficha-jugador.png | Ficha de jugador con fondo dinámico por rango |
| 07-mas.png | Más |

`fuente/` contiene el HTML de cada maqueta. Úsalo para copiar valores exactos (colores, degradados, sombras, tamaños, SVG de la peana y del campo). No es código de la app: usa un motor de maquetas propio (`<x-dc>`, `{{ }}`, `sc-for`) y las imágenes apuntan a `/_blob/...`, que no existen fuera del lienzo. Hay que reimplementarlo en React.

`fuente/generador-formacion.py` es el script que generó la Formación: ahí están la geometría exacta del campo (358×500), las posiciones de las 7 cartas (62×88), la peana (SVG 44×18), los 12 links y el cálculo de química.

`../assets/estadio-gradas.png` es la foto de gradas de la cabecera de Inicio; `../assets/escudo.png`, el escudo.

Datos de las maquetas (resultados, nombres, medias) son de ejemplo.
