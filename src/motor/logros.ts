// Logros (§11). Solo estéticos. Se calculan a partir de la temporada reproducida,
// así que al editar un partido antiguo se revisan en cascada.
import { ID_MISTER, SPLITS, splitDe, type Actuacion, type Equipo, type Jugador, type Mister, type Programado, type Rival } from '../db'
import { MEDIDAS_CASA, type Config, type LogroCasa, type Posicion } from './config'
import type { Paso, Temporada } from './temporada'
import type { EstadoMister } from './mister'
import { NOSOTROS, clasificacion, esLiga, jornadasLider, rivalesDelSplit, splitDePartido, type PartidoLiga } from './liga'

export type IconoLogro =
  | 'balon' | 'pase' | 'guante' | 'estrella' | 'diez' | 'fuego' | 'flecha' | 'corona' | 'calendario'
  | 'limpio' | 'carta' | 'rayo' | 'banco' | 'muro' | 'trofeo' | 'soldado' | 'fantasma' | 'palo' | 'debut' | 'escudo'

export const ICONOS_LOGRO: IconoLogro[] = [
  'balon', 'pase', 'guante', 'estrella', 'diez', 'fuego', 'flecha', 'corona', 'calendario', 'limpio',
  'carta', 'rayo', 'banco', 'muro', 'trofeo', 'soldado', 'fantasma', 'palo', 'debut', 'escudo',
]

export interface LogroDef {
  id: string
  nombre: string
  descripcion: string
  icono: IconoLogro
  categoria: string
  ambito: 'jugador' | 'equipo' | 'mister'
  niveles?: [number, number, number] // bronce, plata, oro
  unidad?: (n: number) => string // texto de la cinta
  repetible?: boolean // se puede conseguir varias veces
  deLaCasa?: boolean
}

const plural = (s: string, p = s + 's') => (n: number) => `${n} ${n === 1 ? s : p}`

export const LOGROS: LogroDef[] = [
  // Individuales — Gol
  { id: 'primer-gol', nombre: 'Primer gol', descripcion: 'Marca tu primer gol.', icono: 'balon', categoria: 'Gol', ambito: 'jugador' },
  { id: 'doblete', nombre: 'Doblete', descripcion: 'Marca 2 goles en un partido.', icono: 'balon', categoria: 'Gol', ambito: 'jugador', repetible: true },
  { id: 'hat-trick', nombre: 'Hat-trick', descripcion: 'Marca 3 goles o más en un partido.', icono: 'balon', categoria: 'Gol', ambito: 'jugador', repetible: true },
  { id: 'goleador', nombre: 'Goleador', descripcion: 'Suma goles: 10, 25 y 50.', icono: 'balon', categoria: 'Gol', ambito: 'jugador', niveles: [10, 25, 50], unidad: plural('gol', 'goles') },
  // Pase
  { id: 'primera-asistencia', nombre: 'Primera asistencia', descripcion: 'Da tu primera asistencia.', icono: 'pase', categoria: 'Pase', ambito: 'jugador' },
  { id: 'doble-asistencia', nombre: 'Doble asistencia', descripcion: 'Da 2 asistencias en un partido.', icono: 'pase', categoria: 'Pase', ambito: 'jugador', repetible: true },
  { id: 'asistente', nombre: 'Asistente', descripcion: 'Suma asistencias: 10, 25 y 50.', icono: 'pase', categoria: 'Pase', ambito: 'jugador', niveles: [10, 25, 50], unidad: plural('asist.', 'asist.') },
  // Defensa y portería
  { id: 'muro', nombre: 'Muro', descripcion: 'Porterías a cero jugando de portero o defensa: 5, 15 y 30.', icono: 'muro', categoria: 'Defensa y portería', ambito: 'jugador', niveles: [5, 15, 30], unidad: plural('a cero', 'a cero') },
  { id: 'penalti-parado', nombre: 'Penalti parado', descripcion: 'Para un penalti.', icono: 'guante', categoria: 'Defensa y portería', ambito: 'jugador', repetible: true },
  { id: 'noche-paradas', nombre: 'Noche de paradas', descripcion: 'Haz 6 paradas o más en un partido.', icono: 'guante', categoria: 'Defensa y portería', ambito: 'jugador', repetible: true },
  // Rendimiento
  { id: 'primer-mvp', nombre: 'Primer MVP', descripcion: 'Sé MVP por primera vez.', icono: 'estrella', categoria: 'Rendimiento', ambito: 'jugador' },
  { id: 'coleccionista', nombre: 'Coleccionista', descripcion: 'Suma MVPs: 5, 10 y 20.', icono: 'estrella', categoria: 'Rendimiento', ambito: 'jugador', niveles: [5, 10, 20], unidad: plural('MVP', 'MVPs') },
  { id: 'partido-10', nombre: 'Partido de 10', descripcion: 'Saca un 10 en un partido.', icono: 'diez', categoria: 'Rendimiento', ambito: 'jugador', repetible: true },
  { id: 'en-racha', nombre: 'En racha', descripcion: '3 partidos seguidos con 7,5 o más.', icono: 'fuego', categoria: 'Rendimiento', ambito: 'jugador', repetible: true },
  // Evolución
  { id: 'primera-plata', nombre: 'Primera Plata', descripcion: 'Llega a carta de Plata.', icono: 'flecha', categoria: 'Evolución', ambito: 'jugador' },
  { id: 'primer-oro', nombre: 'Primer Oro', descripcion: 'Llega a carta de Oro.', icono: 'flecha', categoria: 'Evolución', ambito: 'jugador' },
  { id: 'elite', nombre: 'Élite', descripcion: 'Llega a carta Élite.', icono: 'corona', categoria: 'Evolución', ambito: 'jugador' },
  { id: 'leyenda', nombre: 'Leyenda', descripcion: 'Llega a carta Leyenda.', icono: 'corona', categoria: 'Evolución', ambito: 'jugador' },
  { id: 'salto', nombre: 'Salto de temporada', descripcion: 'Sube 10 puntos de media en una temporada.', icono: 'flecha', categoria: 'Evolución', ambito: 'jugador' },
  // Constancia (por temporada)
  { id: 'veterano', nombre: 'Veterano', descripcion: 'Partidos jugados en la temporada: 10, 25 y 32.', icono: 'calendario', categoria: 'Constancia', ambito: 'jugador', niveles: [10, 25, 32], unidad: plural('partido') },
  { id: 'juego-limpio', nombre: 'Juego limpio', descripcion: 'Partidos seguidos sin tarjeta en la temporada: 10, 25 y 32.', icono: 'limpio', categoria: 'Constancia', ambito: 'jugador', niveles: [10, 25, 32], unidad: plural('seguido', 'seguidos') },
  // Cartas especiales
  { id: 'primera-if', nombre: 'Primera IF', descripcion: 'Consigue una carta IF.', icono: 'carta', categoria: 'Cartas especiales', ambito: 'jugador' },
  { id: 'primer-potm', nombre: 'Primer POTM', descripcion: 'Consigue una carta POTM.', icono: 'carta', categoria: 'Cartas especiales', ambito: 'jugador' },
  { id: 'toty', nombre: 'TOTY', descripcion: 'Entra en el equipo de la temporada.', icono: 'trofeo', categoria: 'Cartas especiales', ambito: 'jugador' },
  // Rarezas
  { id: 'portero-goleador', nombre: 'Portero goleador', descripcion: 'Marca un gol jugando de portero.', icono: 'rayo', categoria: 'Rarezas', ambito: 'jugador', repetible: true },
  { id: 'gol-defensa', nombre: 'Gol de defensa', descripcion: 'Marca un gol jugando de lateral o central.', icono: 'rayo', categoria: 'Rarezas', ambito: 'jugador', repetible: true },
  { id: 'banquillo-mvp', nombre: 'Del banquillo al MVP', descripcion: 'Sal de suplente y acaba siendo MVP.', icono: 'rayo', categoria: 'Rarezas', ambito: 'jugador', repetible: true },
  // De equipo
  { id: 'eq-racha', nombre: 'En racha', descripcion: 'Victorias seguidas: 3, 5 y 8.', icono: 'fuego', categoria: 'Equipo', ambito: 'equipo', niveles: [3, 5, 8], unidad: plural('victoria') },
  { id: 'eq-invictos', nombre: 'Invictos', descripcion: 'Partidos seguidos sin perder: 5, 10 y 16.', icono: 'escudo', categoria: 'Equipo', ambito: 'equipo', niveles: [5, 10, 16], unidad: plural('partido') },
  { id: 'eq-goleada', nombre: 'Goleada', descripcion: 'Gana por 5 goles o más.', icono: 'balon', categoria: 'Equipo', ambito: 'equipo', repetible: true },
  { id: 'eq-muralla', nombre: 'Muralla', descripcion: '3 porterías a cero seguidas.', icono: 'muro', categoria: 'Equipo', ambito: 'equipo', repetible: true },
  { id: 'eq-rodillo', nombre: 'Rodillo', descripcion: 'Goles en una temporada: 50, 100 y 150.', icono: 'balon', categoria: 'Equipo', ambito: 'equipo', niveles: [50, 100, 150], unidad: plural('gol', 'goles') },
  { id: 'eq-todos-suman', nombre: 'Todos suman', descripcion: '5 goleadores distintos en un mismo partido.', icono: 'estrella', categoria: 'Equipo', ambito: 'equipo', repetible: true },
  { id: 'eq-lider', nombre: 'Líder', descripcion: 'Ir 1º en la clasificación en cualquier jornada (una vez por split).', icono: 'corona', categoria: 'Equipo', ambito: 'equipo', repetible: true },
  { id: 'eq-campeones', nombre: 'Campeones', descripcion: 'Terminar un split de liga en 1ª posición.', icono: 'trofeo', categoria: 'Equipo', ambito: 'equipo', repetible: true },
  { id: 'eq-invicta', nombre: 'Temporada invicta', descripcion: 'Toda la temporada sin perder.', icono: 'escudo', categoria: 'Equipo', ambito: 'equipo' },
]

// Logros del míster (§20.7). Solo cuentan los partidos que dirigió.
export const LOGROS_MISTER: LogroDef[] = [
  { id: 'm-primera-victoria', nombre: 'Primera victoria', descripcion: 'Gana tu primer partido como míster.', icono: 'estrella', categoria: 'Míster', ambito: 'mister' },
  { id: 'm-ganador', nombre: 'Ganador', descripcion: 'Victorias dirigidas: 10, 25 y 50.', icono: 'trofeo', categoria: 'Míster', ambito: 'mister', niveles: [10, 25, 50], unidad: plural('victoria') },
  { id: 'm-matagigantes', nombre: 'Matagigantes', descripcion: 'Gana al líder de la liga.', icono: 'rayo', categoria: 'Míster', ambito: 'mister', repetible: true },
  { id: 'm-abismo', nombre: 'Del abismo', descripcion: 'Gana después de 3 derrotas seguidas.', icono: 'flecha', categoria: 'Míster', ambito: 'mister', repetible: true },
  { id: 'm-cantera', nombre: 'Cantera', descripcion: '3 jugadores suben de rango en una misma temporada.', icono: 'debut', categoria: 'Míster', ambito: 'mister', repetible: true },
  { id: 'm-pizarra', nombre: 'Pizarra maestra', descripcion: '5 victorias por 3 goles o más en una temporada.', icono: 'balon', categoria: 'Míster', ambito: 'mister', repetible: true },
  { id: 'm-muro', nombre: 'Muro táctico', descripcion: '5 porterías a cero en una temporada.', icono: 'muro', categoria: 'Míster', ambito: 'mister', repetible: true },
  { id: 'm-veterano', nombre: 'Míster veterano', descripcion: 'Partidos dirigidos en la temporada: 10, 25 y 32.', icono: 'calendario', categoria: 'Míster', ambito: 'mister', niveles: [10, 25, 32], unidad: plural('partido') },
  { id: 'm-campeon', nombre: 'Campeón', descripcion: 'Gana un split de liga.', icono: 'trofeo', categoria: 'Míster', ambito: 'mister', repetible: true },
  { id: 'm-invicta', nombre: 'Temporada invicta', descripcion: 'Toda la temporada sin perder.', icono: 'escudo', categoria: 'Míster', ambito: 'mister' },
  { id: 'm-motm', nombre: 'Primera MOTM', descripcion: 'Consigue la carta de entrenador del mes.', icono: 'carta', categoria: 'Míster', ambito: 'mister' },
  { id: 'm-toty', nombre: 'Primer TOTY', descripcion: 'Consigue la carta de entrenador del año.', icono: 'trofeo', categoria: 'Míster', ambito: 'mister' },
  { id: 'm-consolidado', nombre: 'Consolidado', descripcion: 'Sube a la pizarra magnética.', icono: 'flecha', categoria: 'Míster', ambito: 'mister' },
  { id: 'm-elite', nombre: 'Élite', descripcion: 'Sube a la pizarra digital.', icono: 'corona', categoria: 'Míster', ambito: 'mister' },
  { id: 'm-leyenda', nombre: 'Leyenda del banquillo', descripcion: 'Sube a la pizarra de marfil y oro.', icono: 'corona', categoria: 'Míster', ambito: 'mister' },
]

/** Convierte los logros de la casa de la configuración en definiciones de logro. */
export function defsCasa(cfg: Config): LogroDef[] {
  return (cfg.logrosCasa ?? []).map((c) => {
    const m = MEDIDAS_CASA.find((x) => x.id === c.medida)
    const unidad = (n: number) =>
      c.tipo === 'racha' ? `${n} seguidos` : c.tipo === 'partido' ? `${n} en un partido` : `${n} ${n === 1 ? (m?.singular ?? '') : (m?.plural ?? '')}`.trim()
    return {
      id: c.id, nombre: c.nombre, descripcion: c.descripcion, icono: (c.icono as IconoLogro) || 'estrella',
      categoria: 'De la casa', ambito: 'jugador', deLaCasa: true, repetible: c.tipo !== 'total',
      niveles: c.tipo === 'total' && c.metas.length === 3 ? (c.metas as [number, number, number]) : undefined,
      unidad: c.tipo === 'total' && c.metas.length === 3 ? unidad : undefined,
    } satisfies LogroDef
  })
}

export type Nivel = 0 | 1 | 2 | 3 // 0 = pendiente; con niveles: 1 bronce, 2 plata, 3 oro; sin niveles: 1 = conseguido

export interface Desbloqueo {
  logroId: string
  jugadorId: string | null
  nivel: Nivel
  fecha: string
  partidoId: string | null
}

export interface EstadoLogro {
  def: LogroDef
  nivel: Nivel
  veces: number
  progreso: number // valor actual (para la barra)
  objetivo: number // siguiente meta
  fecha: string | null // del último desbloqueo
}

export interface ResultadoLogros {
  defs: LogroDef[]
  jugadores: Record<string, EstadoLogro[]>
  equipo: EstadoLogro[]
  mister: EstadoLogro[]
  desbloqueos: Desbloqueo[] // en orden cronológico
}

class Registro {
  desbloqueos: Desbloqueo[] = []
  private defs: LogroDef[]
  valores = new Map<string, number>() // progreso por logro
  veces = new Map<string, number>()
  niveles = new Map<string, Nivel>()
  fechas = new Map<string, string>()
  private jugadorId: string | null

  constructor(jugadorId: string | null, defs: LogroDef[]) {
    this.jugadorId = jugadorId
    this.defs = defs
  }

  /** Empieza de cero un logro de temporada (lo ya conseguido sigue en el historial). */
  reiniciar(id: string) {
    this.valores.set(id, 0)
    this.niveles.delete(id)
  }

  /** Marca un logro único o repetible. */
  conseguir(id: string, fecha: string, partidoId: string | null) {
    const v = (this.veces.get(id) ?? 0) + 1
    this.veces.set(id, v)
    const def = this.defs.find((l) => l.id === id)!
    if (v === 1 || def.repetible) {
      this.niveles.set(id, 1)
      this.fechas.set(id, fecha)
      this.desbloqueos.push({ logroId: id, jugadorId: this.jugadorId, nivel: 1, fecha, partidoId })
    }
  }

  /** Actualiza un logro con niveles; registra cada nivel nuevo que se alcance. */
  valor(id: string, valor: number, fecha: string, partidoId: string | null) {
    const def = this.defs.find((l) => l.id === id)!
    this.valores.set(id, Math.max(this.valores.get(id) ?? 0, valor))
    const antes = this.niveles.get(id) ?? 0
    let nivel: Nivel = 0
    def.niveles!.forEach((u, i) => {
      if (valor >= u) nivel = (i + 1) as Nivel
    })
    if (nivel > antes) {
      for (let n = antes + 1; n <= nivel; n++) {
        this.desbloqueos.push({ logroId: id, jugadorId: this.jugadorId, nivel: n as Nivel, fecha, partidoId })
      }
      this.niveles.set(id, nivel)
      this.fechas.set(id, fecha)
    }
  }

  estados(ambito: LogroDef['ambito']): EstadoLogro[] {
    return this.defs.filter((l) => l.ambito === ambito).map((def) => {
      const nivel = this.niveles.get(def.id) ?? 0
      const veces = this.veces.get(def.id) ?? 0
      const progreso = def.niveles ? (this.valores.get(def.id) ?? 0) : veces
      const objetivo = def.niveles ? (def.niveles[Math.min(nivel, 2)] ?? def.niveles[2]) : 1
      return { def, nivel, veces, progreso, objetivo, fecha: this.fechas.get(def.id) ?? null }
    })
  }
}

/**
 * Valor de una medida de la casa en un partido; null = neutro (no suma ni corta
 * rachas: p. ej. una baja, o no haber jugado para medidas que piden jugar).
 */
function valorCasa(c: LogroCasa, a: Actuacion, paso: Paso | undefined): number | null {
  switch (c.medida) {
    case 'titular':
    case 'suplente':
    case 'no_convocado':
      if (a.estado === 'baja') return null
      return a.estado === c.medida ? 1 : 0
    case 'jugado':
      return a.estado === 'baja' ? null : paso ? 1 : 0
    case 'mvp':
      return paso ? (paso.mvp ? 1 : 0) : null
    case 'sin_tarjeta':
      return paso ? ((a.acciones.amarilla ?? 0) + (a.acciones.roja ?? 0) === 0 ? 1 : 0) : null
    case 'nota_alta':
      return paso ? (paso.nota >= 7.5 ? 1 : 0) : null
    default:
      return paso ? (a.acciones[c.medida] ?? 0) : null
  }
}

function evaluarCasa(c: LogroCasa, a: Actuacion, paso: Paso | undefined, st: { total: number; racha: number }, reg: Registro, fecha: string, partidoId: string) {
  const v = valorCasa(c, a, paso)
  if (v === null) return
  const meta = c.metas[0] ?? 1
  if (c.tipo === 'total') {
    const antes = st.total
    st.total += v
    if (c.metas.length === 3) reg.valor(c.id, st.total, fecha, partidoId)
    else if (antes < meta && st.total >= meta) reg.conseguir(c.id, fecha, partidoId)
  } else if (c.tipo === 'racha') {
    st.racha = v > 0 ? st.racha + 1 : 0
    if (st.racha >= meta) {
      reg.conseguir(c.id, fecha, partidoId)
      st.racha = 0
    }
  } else if (v >= meta) {
    reg.conseguir(c.id, fecha, partidoId)
  }
}

/** Lo que hace falta de cada temporada, de la más antigua a la que se está viendo. */
export interface TemporadaLogros {
  temporadaId: string
  calculo: Temporada
  programados: Programado[]
  rivales: Rival[]
  liga: PartidoLiga[]
}

export interface EntradaLogros {
  jugadores: Jugador[] // todos (también los que ya no están)
  temporadas: (TemporadaLogros & { mister: EstadoMister })[]
  misterFicha: Mister
  config: Config
  equipo: Equipo
}

// Logros que se reinician cada temporada (los demás son de carrera).
const DE_TEMPORADA = ['veterano', 'juego-limpio']

export function calcularLogros(d: EntradaLogros): ResultadoLogros {
  const dur = d.equipo.duracionPartido
  const umbral = (id: string) => d.config.rangos.find((r) => r.id === id)?.desde ?? 999
  const jugadores: Record<string, EstadoLogro[]> = {}
  const todos: Desbloqueo[] = []
  const casa = d.config.logrosCasa ?? []
  const defs = [...LOGROS, ...LOGROS_MISTER, ...defsCasa(d.config)]
  const reiniciables = [...DE_TEMPORADA, ...casa.filter((c) => c.tipo === 'total' && c.porTemporada !== false).map((c) => c.id)]

  for (const j of d.jugadores) {
    const reg = new Registro(j.id, defs)
    const estadoCasa = new Map<string, { total: number; racha: number }>(casa.map((c) => [c.id, { total: 0, racha: 0 }]))
    // De carrera: se acumulan entre temporadas.
    let goles = 0, asist = 0, ceros = 0, mvps = 0
    let rachaNota = 0

    for (const t of d.temporadas) {
      // Lo de temporada empieza de cero.
      let jugados = 0, sinTarjeta = 0
      for (const id of reiniciables) reg.reiniciar(id)
      for (const c of casa) {
        const st = estadoCasa.get(c.id)!
        st.racha = 0
        if (c.tipo === 'total' && c.porTemporada !== false) st.total = 0
      }
      const partidos = t.calculo.partidos.map((r) => r.partido)
      const e = t.calculo.jugadores[j.id]
      const pasos = new Map(e?.historial.map((h) => [h.partidoId, h]) ?? [])

      for (const p of partidos) {
        const a = p.actuaciones.find((x) => x.jugadorId === j.id)
        if (!a) continue // aún no estaba en el equipo
        const f = p.fecha
        // Logros de la casa (reglas de la configuración).
        for (const c of casa) evaluarCasa(c, a, pasos.get(p.id), estadoCasa.get(c.id)!, reg, f, p.id)

        const paso = pasos.get(p.id)
        if (!paso) continue // no jugó minutos
        const n = (id: keyof typeof a.acciones) => a.acciones[id] ?? 0
        const pos: Posicion = a.posicion
        jugados++
        reg.valor('veterano', jugados, f, p.id)

        const g = n('gol')
        if (g > 0) {
          goles += g
          if (goles === g) reg.conseguir('primer-gol', f, p.id)
          if (g === 2) reg.conseguir('doblete', f, p.id)
          if (g >= 3) reg.conseguir('hat-trick', f, p.id)
          if (pos === 'POR') reg.conseguir('portero-goleador', f, p.id)
          if (pos === 'LAT' || pos === 'DFC') reg.conseguir('gol-defensa', f, p.id)
          reg.valor('goleador', goles, f, p.id)
        }
        const as = n('asistencia')
        if (as > 0) {
          asist += as
          if (asist === as) reg.conseguir('primera-asistencia', f, p.id)
          if (as >= 2) reg.conseguir('doble-asistencia', f, p.id)
          reg.valor('asistente', asist, f, p.id)
        }
        if ((pos === 'POR' || pos === 'DFC' || pos === 'LAT') && p.golesContra === 0 && a.minutos > dur / 2) {
          ceros++
          reg.valor('muro', ceros, f, p.id)
        }
        for (let k = 0; k < n('penaltiParado'); k++) reg.conseguir('penalti-parado', f, p.id)
        if (n('parada') + n('paradaDificil') >= 6) reg.conseguir('noche-paradas', f, p.id)

        if (paso.mvp) {
          mvps++
          if (mvps === 1) reg.conseguir('primer-mvp', f, p.id)
          if (a.estado === 'suplente') reg.conseguir('banquillo-mvp', f, p.id)
          reg.valor('coleccionista', mvps, f, p.id)
        }
        if (paso.nota >= 10) reg.conseguir('partido-10', f, p.id)
        rachaNota = paso.nota >= 7.5 ? rachaNota + 1 : 0
        if (rachaNota === 3) {
          reg.conseguir('en-racha', f, p.id)
          rachaNota = 0
        }
        sinTarjeta = n('amarilla') || n('roja') ? 0 : sinTarjeta + 1
        reg.valor('juego-limpio', sinTarjeta, f, p.id)

        const m = paso.mediaDespues
        if (m >= umbral('plata') && !reg.niveles.get('primera-plata')) reg.conseguir('primera-plata', f, p.id)
        if (m >= umbral('oro') && !reg.niveles.get('primer-oro')) reg.conseguir('primer-oro', f, p.id)
        if (m >= umbral('elite') && !reg.niveles.get('elite')) reg.conseguir('elite', f, p.id)
        if (m >= umbral('leyenda') && !reg.niveles.get('leyenda')) reg.conseguir('leyenda', f, p.id)
        if (e && m - e.mediaInicial >= 10 && !reg.niveles.get('salto')) reg.conseguir('salto', f, p.id)
      }
    }

    // Cartas especiales (las da el administrador a mano).
    const especiales = [...j.especiales].sort((x, y) => x.fecha.localeCompare(y.fecha))
    for (const [tipo, id] of [['IF', 'primera-if'], ['POTM', 'primer-potm'], ['TOTY', 'toty']] as const) {
      const primera = especiales.find((x) => x.tipo === tipo)
      if (primera) reg.conseguir(id, primera.fecha, null)
    }

    jugadores[j.id] = reg.estados('jugador')
    todos.push(...reg.desbloqueos)
  }

  // ─── Equipo (cada temporada empieza de cero, salvo lo ya conseguido) ───
  const reg = new Registro(null, defs)
  for (const t of d.temporadas) {
    const partidos = t.calculo.partidos.map((r) => r.partido)
    for (const id of ['eq-racha', 'eq-invictos', 'eq-rodillo']) reg.reiniciar(id)
    let victorias = 0, invicto = 0, ceros = 0, goles = 0
    for (const p of partidos) {
      const f = p.fecha
      const dif = p.golesFavor - p.golesContra
      victorias = dif > 0 ? victorias + 1 : 0
      invicto = dif >= 0 ? invicto + 1 : 0
      reg.valor('eq-racha', victorias, f, p.id)
      reg.valor('eq-invictos', invicto, f, p.id)
      if (dif >= 5) reg.conseguir('eq-goleada', f, p.id)
      ceros = p.golesContra === 0 ? ceros + 1 : 0
      if (ceros === 3) {
        reg.conseguir('eq-muralla', f, p.id)
        ceros = 0
      }
      goles += p.golesFavor
      reg.valor('eq-rodillo', goles, f, p.id)
      const goleadores = p.actuaciones.filter((a) => (a.acciones.gol ?? 0) > 0).length
      if (goleadores >= 5) reg.conseguir('eq-todos-suman', f, p.id)
    }
    const ultimo = partidos[partidos.length - 1]
    // Líder y Campeones se pueden ganar en cada split (cada split es una liga distinta).
    for (const split of SPLITS) {
      const delSplit = (g: Programado) => splitDe(g) === split
      const partidosSplit = partidos.filter((p) => esLiga(p.competicion) && splitDePartido(p, t.programados) === split)
      const ultimoSplit = partidosSplit[partidosSplit.length - 1]
      const lider = jornadasLider(t.liga, t.rivales, d.equipo.nombre, split)
      const tabla = clasificacion(t.liga, t.rivales, d.equipo.nombre, split)
      const nuestra = tabla.find((f) => f.id === NOSOTROS)
      const hayRivales = rivalesDelSplit(t.rivales, split).length > 0
      if (lider.length || (tabla[0]?.id === NOSOTROS && (nuestra?.pj ?? 0) > 0 && hayRivales)) {
        const p = partidosSplit.find((x) => t.programados.find((g) => g.id === x.programadoId)?.jornada === lider[0]) ?? ultimoSplit
        reg.conseguir('eq-lider', p?.fecha ?? '', p?.id ?? null)
      }
      const deLiga = t.programados.filter((g) => esLiga(g.competicion) && delSplit(g))
      const terminada = deLiga.length > 0 && deLiga.every((g) => partidos.some((p) => p.programadoId === g.id))
      if (terminada && tabla[0]?.id === NOSOTROS && ultimoSplit) reg.conseguir('eq-campeones', ultimoSplit.fecha, ultimoSplit.id)
    }
    if (partidos.length >= d.equipo.partidosTemporada && partidos.every((p) => p.golesFavor >= p.golesContra) && ultimo) {
      reg.conseguir('eq-invicta', ultimo.fecha, ultimo.id)
    }
  }
  todos.push(...reg.desbloqueos)

  // ─── Míster ───
  const rm = new Registro(ID_MISTER, defs)
  const umbralMister = (id: string) => d.config.mister.rangos.find((r) => r.id === id)?.desde ?? 999
  let victorias = 0, derrotasSeguidas = 0
  for (const t of d.temporadas) {
    rm.reiniciar('m-veterano')
    const ascendidos = new Set<string>()
    let dirigidos = 0, goleadas = 0, ceros = 0
    for (const h of t.mister.historial) {
      const f = h.fecha
      const dif = h.golesFavor - h.golesContra
      dirigidos++
      rm.valor('m-veterano', dirigidos, f, h.partidoId)
      if (dif > 0) {
        victorias++
        if (victorias === 1) rm.conseguir('m-primera-victoria', f, h.partidoId)
        rm.valor('m-ganador', victorias, f, h.partidoId)
        if (h.rivalLider) rm.conseguir('m-matagigantes', f, h.partidoId)
        if (derrotasSeguidas >= 3) rm.conseguir('m-abismo', f, h.partidoId)
        if (dif >= 3 && ++goleadas === 5) rm.conseguir('m-pizarra', f, h.partidoId)
      }
      derrotasSeguidas = dif < 0 ? derrotasSeguidas + 1 : 0
      if (h.golesContra === 0 && ++ceros === 5) rm.conseguir('m-muro', f, h.partidoId)
      const antes = ascendidos.size
      for (const id of h.ascensos) ascendidos.add(id)
      if (antes < 3 && ascendidos.size >= 3) rm.conseguir('m-cantera', f, h.partidoId)
      for (const r of ['consolidado', 'elite', 'leyenda']) {
        if (h.mediaDespues >= umbralMister(r) && !rm.niveles.get(`m-${r}`)) rm.conseguir(`m-${r}`, f, h.partidoId)
      }
    }
  }
  // Los títulos del equipo también van a su vitrina.
  for (const x of reg.desbloqueos) {
    if (x.logroId === 'eq-campeones') rm.conseguir('m-campeon', x.fecha, x.partidoId)
    if (x.logroId === 'eq-invicta') rm.conseguir('m-invicta', x.fecha, x.partidoId)
  }
  const espMister = [...d.misterFicha.especiales].sort((x, y) => x.fecha.localeCompare(y.fecha))
  for (const [tipo, id] of [['MOTM', 'm-motm'], ['TOTY', 'm-toty']] as const) {
    const primera = espMister.find((x) => x.tipo === tipo)
    if (primera) rm.conseguir(id, primera.fecha, null)
  }
  todos.push(...rm.desbloqueos)

  todos.sort((a, b) => a.fecha.localeCompare(b.fecha))
  return { defs, jugadores, equipo: reg.estados('equipo'), mister: rm.estados('mister'), desbloqueos: todos }
}

export const NOMBRE_NIVEL = ['', 'Bronce', 'Plata', 'Oro'] as const
