// Logros (§11). Solo estéticos. Se calculan a partir de la temporada reproducida,
// así que al editar un partido antiguo se revisan en cascada.
import type { Equipo, Jugador, Partido, Programado, Rival } from '../db'
import type { Config, Posicion } from './config'
import type { Temporada } from './temporada'
import { NOSOTROS, clasificacion, esLiga, jornadasLider, type PartidoLiga } from './liga'

export type IconoLogro =
  | 'balon' | 'pase' | 'guante' | 'estrella' | 'diez' | 'fuego' | 'flecha' | 'corona' | 'calendario'
  | 'limpio' | 'carta' | 'rayo' | 'banco' | 'muro' | 'trofeo' | 'soldado' | 'fantasma' | 'palo' | 'debut' | 'escudo'

export interface LogroDef {
  id: string
  nombre: string
  descripcion: string
  icono: IconoLogro
  categoria: string
  ambito: 'jugador' | 'equipo'
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
  // De la casa
  { id: 'falsas-promesas', nombre: 'Falsas promesas', descripcion: '3 partidos seguidos sin ser convocado (las bajas no cuentan).', icono: 'fantasma', categoria: 'De la casa', ambito: 'jugador', repetible: true, deLaCasa: true },
  { id: 'pata-de-palo', nombre: 'Pata de palo', descripcion: 'Falla 5 ocasiones claras en una temporada.', icono: 'palo', categoria: 'De la casa', ambito: 'jugador', deLaCasa: true },
  { id: 'soldado-edy', nombre: 'Soldado de Edy', descripcion: 'Titularidades: 5, 10 y 15.', icono: 'soldado', categoria: 'De la casa', ambito: 'jugador', niveles: [5, 10, 15], unidad: plural('titular', 'titulares'), deLaCasa: true },
  { id: 'debut-gala', nombre: 'Debut de gala', descripcion: 'Tu primera titularidad.', icono: 'debut', categoria: 'De la casa', ambito: 'jugador', deLaCasa: true },
  { id: 'endrick', nombre: 'Endrick', descripcion: 'Suplencias: 5, 10 y 15.', icono: 'banco', categoria: 'De la casa', ambito: 'jugador', niveles: [5, 10, 15], unidad: plural('suplencia'), deLaCasa: true },

  // De equipo
  { id: 'eq-racha', nombre: 'En racha', descripcion: 'Victorias seguidas: 3, 5 y 8.', icono: 'fuego', categoria: 'Equipo', ambito: 'equipo', niveles: [3, 5, 8], unidad: plural('victoria') },
  { id: 'eq-invictos', nombre: 'Invictos', descripcion: 'Partidos seguidos sin perder: 5, 10 y 16.', icono: 'escudo', categoria: 'Equipo', ambito: 'equipo', niveles: [5, 10, 16], unidad: plural('partido') },
  { id: 'eq-goleada', nombre: 'Goleada', descripcion: 'Gana por 5 goles o más.', icono: 'balon', categoria: 'Equipo', ambito: 'equipo', repetible: true },
  { id: 'eq-muralla', nombre: 'Muralla', descripcion: '3 porterías a cero seguidas.', icono: 'muro', categoria: 'Equipo', ambito: 'equipo', repetible: true },
  { id: 'eq-rodillo', nombre: 'Rodillo', descripcion: 'Goles en una temporada: 50, 100 y 150.', icono: 'balon', categoria: 'Equipo', ambito: 'equipo', niveles: [50, 100, 150], unidad: plural('gol', 'goles') },
  { id: 'eq-todos-suman', nombre: 'Todos suman', descripcion: '5 goleadores distintos en un mismo partido.', icono: 'estrella', categoria: 'Equipo', ambito: 'equipo', repetible: true },
  { id: 'eq-lider', nombre: 'Líder', descripcion: 'Ir 1º en la clasificación en cualquier jornada.', icono: 'corona', categoria: 'Equipo', ambito: 'equipo' },
  { id: 'eq-campeones', nombre: 'Campeones', descripcion: 'Terminar la liga en 1ª posición.', icono: 'trofeo', categoria: 'Equipo', ambito: 'equipo' },
  { id: 'eq-invicta', nombre: 'Temporada invicta', descripcion: 'Toda la temporada sin perder.', icono: 'escudo', categoria: 'Equipo', ambito: 'equipo' },
]

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
  jugadores: Record<string, EstadoLogro[]>
  equipo: EstadoLogro[]
  desbloqueos: Desbloqueo[] // en orden cronológico
}

class Registro {
  desbloqueos: Desbloqueo[] = []
  valores = new Map<string, number>() // progreso por logro
  veces = new Map<string, number>()
  niveles = new Map<string, Nivel>()
  fechas = new Map<string, string>()
  private jugadorId: string | null

  constructor(jugadorId: string | null) {
    this.jugadorId = jugadorId
  }

  /** Marca un logro único o repetible. */
  conseguir(id: string, fecha: string, partidoId: string | null) {
    const v = (this.veces.get(id) ?? 0) + 1
    this.veces.set(id, v)
    const def = LOGROS.find((l) => l.id === id)!
    if (v === 1 || def.repetible) {
      this.niveles.set(id, 1)
      this.fechas.set(id, fecha)
      this.desbloqueos.push({ logroId: id, jugadorId: this.jugadorId, nivel: 1, fecha, partidoId })
    }
  }

  /** Actualiza un logro con niveles; registra cada nivel nuevo que se alcance. */
  valor(id: string, valor: number, fecha: string, partidoId: string | null) {
    const def = LOGROS.find((l) => l.id === id)!
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

  estados(ambito: 'jugador' | 'equipo'): EstadoLogro[] {
    return LOGROS.filter((l) => l.ambito === ambito).map((def) => {
      const nivel = this.niveles.get(def.id) ?? 0
      const veces = this.veces.get(def.id) ?? 0
      const progreso = def.niveles ? (this.valores.get(def.id) ?? 0) : veces
      const objetivo = def.niveles ? (def.niveles[Math.min(nivel, 2)] ?? def.niveles[2]) : 1
      return { def, nivel, veces, progreso, objetivo, fecha: this.fechas.get(def.id) ?? null }
    })
  }
}

export interface EntradaLogros {
  jugadores: Jugador[]
  partidos: Partido[] // de la temporada, cualquier orden
  calculo: Temporada
  config: Config
  equipo: Equipo
  programados: Programado[]
  rivales: Rival[]
  liga: PartidoLiga[]
}

export function calcularLogros(d: EntradaLogros): ResultadoLogros {
  const partidos = d.calculo.partidos.map((r) => r.partido) // ya en orden cronológico
  const dur = d.equipo.duracionPartido
  const umbral = (id: string) => d.config.rangos.find((r) => r.id === id)?.desde ?? 999
  const jugadores: Record<string, EstadoLogro[]> = {}
  const todos: Desbloqueo[] = []

  for (const j of d.jugadores) {
    const reg = new Registro(j.id)
    const e = d.calculo.jugadores[j.id]
    const pasos = new Map(e?.historial.map((h) => [h.partidoId, h]) ?? [])
    let goles = 0, asist = 0, ceros = 0, mvps = 0, jugados = 0, titular = 0, suplente = 0, ocasiones = 0
    let rachaNota = 0, sinTarjeta = 0, noConvocado = 0

    for (const p of partidos) {
      const a = p.actuaciones.find((x) => x.jugadorId === j.id)
      if (!a) continue // aún no estaba en el equipo
      const f = p.fecha
      // Convocatoria (las bajas ni suman ni rompen la racha de Falsas promesas).
      if (a.estado === 'no_convocado') {
        noConvocado++
        if (noConvocado === 3) {
          reg.conseguir('falsas-promesas', f, p.id)
          noConvocado = 0
        }
      } else if (a.estado !== 'baja') noConvocado = 0
      if (a.estado === 'titular') {
        titular++
        if (titular === 1) reg.conseguir('debut-gala', f, p.id)
        reg.valor('soldado-edy', titular, f, p.id)
      }
      if (a.estado === 'suplente') {
        suplente++
        reg.valor('endrick', suplente, f, p.id)
      }

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
      const antes = ocasiones
      ocasiones += n('ocasionFallada')
      if (antes < 5 && ocasiones >= 5) reg.conseguir('pata-de-palo', f, p.id)

      const m = paso.mediaDespues
      if (m >= umbral('plata') && !reg.niveles.get('primera-plata')) reg.conseguir('primera-plata', f, p.id)
      if (m >= umbral('oro') && !reg.niveles.get('primer-oro')) reg.conseguir('primer-oro', f, p.id)
      if (m >= umbral('elite') && !reg.niveles.get('elite')) reg.conseguir('elite', f, p.id)
      if (m >= umbral('leyenda') && !reg.niveles.get('leyenda')) reg.conseguir('leyenda', f, p.id)
      if (e && m - e.mediaInicial >= 10 && !reg.niveles.get('salto')) reg.conseguir('salto', f, p.id)
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

  // ─── Equipo ───
  const reg = new Registro(null)
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
  const lider = jornadasLider(d.liga, d.rivales, d.equipo.nombre)
  const tablaActual = clasificacion(d.liga, d.rivales, d.equipo.nombre)
  const nuestra = tablaActual.find((f) => f.id === NOSOTROS)
  if (lider.length || (tablaActual[0]?.id === NOSOTROS && (nuestra?.pj ?? 0) > 0 && d.rivales.length > 0)) {
    const jornada = lider[0]
    const p = partidos.find((x) => d.programados.find((g) => g.id === x.programadoId)?.jornada === jornada) ?? ultimo
    reg.conseguir('eq-lider', p?.fecha ?? '', p?.id ?? null)
  }
  const deLiga = d.programados.filter((g) => esLiga(g.competicion))
  const ligaTerminada = deLiga.length > 0 && deLiga.every((g) => partidos.some((p) => p.programadoId === g.id))
  if (ligaTerminada && tablaActual[0]?.id === NOSOTROS && ultimo) reg.conseguir('eq-campeones', ultimo.fecha, ultimo.id)
  if (partidos.length >= d.equipo.partidosTemporada && partidos.every((p) => p.golesFavor >= p.golesContra) && ultimo) {
    reg.conseguir('eq-invicta', ultimo.fecha, ultimo.id)
  }
  todos.push(...reg.desbloqueos)

  todos.sort((a, b) => a.fecha.localeCompare(b.fecha))
  return { jugadores, equipo: reg.estados('equipo'), desbloqueos: todos }
}

export const NOMBRE_NIVEL = ['', 'Bronce', 'Plata', 'Oro'] as const
