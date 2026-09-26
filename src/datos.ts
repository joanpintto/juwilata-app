import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { db, enPlantilla, misterDe, ordenarTemporadas, type ConfigVersion, type Equipo, type Jugador, type Mister, type Partido, type Programado, type ResultadoLiga, type Rival, type Temporada } from './db'
import { CONFIG_INICIAL, type Config } from './motor/config'
import { reproducirTemporada, type Inicio, type Temporada as TemporadaCalculada } from './motor/temporada'
import { partidosLiga, type PartidoLiga } from './motor/liga'
import { calcularLogros, type ResultadoLogros, type TemporadaLogros } from './motor/logros'
import { reproducirMister, type EstadoMister, type InicioMister } from './motor/mister'

export interface Datos {
  equipo: Equipo
  temporada: Temporada // la que se está viendo
  temporadas: Temporada[] // todas, de la más antigua a la más reciente
  jugadores: Jugador[] // plantilla de la temporada que se está viendo
  todosJugadores: Jugador[]
  partidos: Partido[]
  configs: ConfigVersion[]
  rivales: Rival[]
  programados: Programado[]
  resultadosLiga: ResultadoLiga[]
  config: Config
  configVersion: number
  calculo: TemporadaCalculada
  calculos: Map<string, TemporadaCalculada> // hasta la temporada que se está viendo
  liga: PartidoLiga[]
  logros: ResultadoLogros
  misterFicha: Mister // datos del entrenador (nombre, foto…)
  mister: EstadoMister // su carta calculada en la temporada que se está viendo
  calculosMister: Map<string, EstadoMister>
}

export function useDatos(): Datos | undefined {
  const base = useLiveQuery(async () => {
    const equipo = await db.equipo.get('equipo')
    if (!equipo) return undefined
    const [temporadas, jugadores, partidos, configs, rivales, programados, resultadosLiga] = await Promise.all([
      db.temporadas.toArray(),
      db.jugadores.toArray(),
      db.partidos.toArray(),
      db.configuraciones.orderBy('version').toArray(),
      db.rivales.toArray(),
      db.programados.toArray(),
      db.resultadosLiga.toArray(),
    ])
    const temporada = temporadas.find((t) => t.id === equipo.temporadaActivaId)
    if (!temporada || !configs.length) return undefined
    // Las configuraciones antiguas se completan con los valores nuevos que les falten.
    const completas = configs.map((c) => ({ ...c, datos: { ...CONFIG_INICIAL, ...c.datos, mister: { ...CONFIG_INICIAL.mister, ...c.datos.mister } } }))
    // Los rangos se aplican siempre a todo (también a partidos jugados con configuraciones anteriores).
    const actual = completas[completas.length - 1].datos
    for (const c of completas) c.datos = { ...c.datos, rangos: actual.rangos, mister: { ...c.datos.mister, rangos: actual.mister.rangos } }
    return { equipo, temporada, temporadas, jugadores, partidos, configs: completas, rivales, programados, resultadosLiga }
  })

  return useMemo(() => {
    if (!base) return undefined
    const ultima = base.configs[base.configs.length - 1]
    const cfg = ultima.datos
    const mapa = new Map(base.configs.map((c) => [c.version, c.datos]))
    const orden = ordenarTemporadas(base.temporadas)
    const hasta = orden.findIndex((t) => t.id === base.temporada.id)
    const deTemporada = <T extends { temporadaId?: string }>(xs: T[], id: string) => xs.filter((x) => x.temporadaId === id)
    const porNombre = (a: Rival, b: Rival) => a.nombre.localeCompare(b.nombre, 'es')
    const porJornada = (a: Programado, b: Programado) => (a.split ?? 1) - (b.split ?? 1) || a.jornada - b.jornada

    // Se reproducen las temporadas en orden: cada jugador empieza donde acabó la anterior.
    const calculos = new Map<string, TemporadaCalculada>()
    const ultimos: Record<string, Inicio> = {}
    const paraLogros: (TemporadaLogros & { mister: EstadoMister })[] = []
    const calculosMister = new Map<string, EstadoMister>()
    let inicioMister: InicioMister | undefined
    for (const t of orden.slice(0, hasta + 1)) {
      const plantilla = base.jugadores.filter((j) => enPlantilla(j, t.id, orden))
      const inicios = Object.fromEntries(plantilla.filter((j) => ultimos[j.id]).map((j) => [j.id, ultimos[j.id]]))
      const calc = reproducirTemporada(plantilla, deTemporada(base.partidos, t.id), mapa, cfg, base.equipo.duracionPartido, inicios)
      calculos.set(t.id, calc)
      for (const e of Object.values(calc.jugadores)) ultimos[e.jugador.id] = { atributos: e.atributos, rangos: e.rangosAlcanzados }
      const rivales = deTemporada(base.rivales, t.id).sort(porNombre)
      const programados = deTemporada(base.programados, t.id).sort(porJornada)
      const liga = partidosLiga(deTemporada(base.partidos, t.id), programados, deTemporada(base.resultadosLiga, t.id), rivales)
      // El míster también empieza cada temporada donde acabó la anterior.
      const mister = reproducirMister(
        deTemporada(base.partidos, t.id), calc, { liga, programados, rivales, nombreEquipo: base.equipo.nombre }, mapa, cfg, inicioMister,
      )
      paraLogros.push({ temporadaId: t.id, calculo: calc, programados, rivales, liga, mister })
      calculosMister.set(t.id, mister)
      inicioMister = { atributos: mister.atributos, rangos: mister.rangosAlcanzados }
    }

    const actual = paraLogros[paraLogros.length - 1]
    const jugadores = base.jugadores.filter((j) => enPlantilla(j, base.temporada.id, orden)).sort((a, b) => a.dorsal - b.dorsal)
    const logros = calcularLogros({ jugadores: base.jugadores, temporadas: paraLogros, config: cfg, equipo: base.equipo, misterFicha: misterDe(base.equipo) })
    return {
      ...base,
      temporadas: orden,
      jugadores,
      todosJugadores: base.jugadores,
      partidos: deTemporada(base.partidos, base.temporada.id),
      rivales: actual.rivales,
      programados: actual.programados,
      resultadosLiga: deTemporada(base.resultadosLiga, base.temporada.id),
      config: cfg,
      configVersion: ultima.version,
      calculo: actual.calculo,
      calculos,
      liga: actual.liga,
      logros,
      misterFicha: misterDe(base.equipo),
      mister: calculosMister.get(base.temporada.id)!,
      calculosMister,
    }
  }, [base])
}

// ─── Navegación con #/ruta (funciona en la app instalada y sobrevive a recargas) ───

function rutaActual(): string {
  return window.location.hash.replace(/^#/, '') || '/'
}

export function useRuta(): string {
  const [ruta, setRuta] = useState(rutaActual)
  useEffect(() => {
    const cambio = () => setRuta(rutaActual())
    window.addEventListener('hashchange', cambio)
    return () => window.removeEventListener('hashchange', cambio)
  }, [])
  return ruta
}

export function ir(ruta: string, reemplazar = false) {
  if (reemplazar) window.location.replace(`#${ruta}`)
  else window.location.hash = ruta
  window.scrollTo(0, 0)
}

export function volver(porDefecto = '/') {
  if (window.history.length > 1) window.history.back()
  else ir(porDefecto, true)
}

// ─── Formatos ─────────────────────────────────────────────────────────

export const fmt1 = (x: number) => x.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const fmt2 = (x: number) => x.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const conSigno = (x: number, f = fmt1) => (x > 0 ? '+' : x < 0 ? '−' : '±') + f(Math.abs(x))

export function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

export function hoy(): string {
  const f = new Date()
  return new Date(f.getTime() - f.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function colorNota(nota: number): string {
  if (nota >= 8) return 'var(--ok)'
  if (nota >= 7) return '#8fbf6a'
  if (nota >= 6) return 'var(--dorado)'
  if (nota >= 5) return '#d98a4e'
  return 'var(--alerta)'
}

export const nombreVisible = (j: Jugador) => j.apodo?.trim() || j.nombre
export const nombreMister = (m: Mister) => m.apodo?.trim() || m.nombre

export const SUBPESTANAS_PLANTILLA = [
  { id: 'formacion', texto: 'Formación', ruta: '/plantilla' },
  { id: 'jugadores', texto: 'Jugadores', ruta: '/plantilla/jugadores' },
]

/** Partido registrado a partir de un partido del calendario (si lo hay). */
export function partidoDe(prog: Programado, partidos: Partido[]): Partido | undefined {
  return partidos.find((p) => p.programadoId === prog.id)
}

/** Siguiente partido del calendario sin jugar ni aplazar. */
export function proximoPartido(programados: Programado[], partidos: Partido[]): Programado | undefined {
  return programados.find((g) => !g.aplazado && !partidoDe(g, partidos))
}

export function nombreRival(rivales: Rival[], id: string | null | undefined, porDefecto = 'Rival'): string {
  return rivales.find((r) => r.id === id)?.nombre ?? porDefecto
}

export const SUBPESTANAS_PARTIDOS = [
  { id: 'mis', texto: 'Mis partidos', ruta: '/partidos' },
  { id: 'liga', texto: 'Liga', ruta: '/partidos/liga' },
]

/**
 * Texto de una jornada del calendario. Con un solo split se ve «J3»; cuando hay
 * calendario del segundo split, «S2·J3» (corto) o «Split 2 · Jornada 3» (largo).
 */
export function textoJornada(g: Programado, programados: Programado[], largo = false): string {
  const variosSplits = programados.some((x) => (x.split ?? 1) !== 1)
  const split = g.split ?? 1
  if (largo) return variosSplits ? `Split ${split} · Jornada ${g.jornada}` : `Jornada ${g.jornada}`
  return variosSplits ? `S${split}·J${g.jornada}` : `J${g.jornada}`
}
