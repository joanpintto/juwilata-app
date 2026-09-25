import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { db, type ConfigVersion, type Equipo, type Jugador, type Partido, type Programado, type ResultadoLiga, type Rival, type Temporada } from './db'
import { CONFIG_INICIAL, type Config } from './motor/config'
import { reproducirTemporada, type Temporada as TemporadaCalculada } from './motor/temporada'
import { partidosLiga, type PartidoLiga } from './motor/liga'
import { calcularLogros, type ResultadoLogros } from './motor/logros'

export interface Datos {
  equipo: Equipo
  temporada: Temporada
  jugadores: Jugador[]
  partidos: Partido[]
  configs: ConfigVersion[]
  rivales: Rival[]
  programados: Programado[]
  resultadosLiga: ResultadoLiga[]
  config: Config
  configVersion: number
  calculo: TemporadaCalculada
  liga: PartidoLiga[]
  logros: ResultadoLogros
}

export function useDatos(): Datos | undefined {
  const base = useLiveQuery(async () => {
    const equipo = await db.equipo.get('equipo')
    if (!equipo) return undefined
    const [temporada, jugadores, partidos, configs, rivales, programados, resultadosLiga] = await Promise.all([
      db.temporadas.get(equipo.temporadaActivaId),
      db.jugadores.toArray(),
      db.partidos.where('temporadaId').equals(equipo.temporadaActivaId).toArray(),
      db.configuraciones.orderBy('version').toArray(),
      db.rivales.toArray(),
      db.programados.where('temporadaId').equals(equipo.temporadaActivaId).toArray(),
      db.resultadosLiga.where('temporadaId').equals(equipo.temporadaActivaId).toArray(),
    ])
    if (!temporada || !configs.length) return undefined
    // Las configuraciones antiguas se completan con los valores nuevos que les falten.
    const completas = configs.map((c) => ({ ...c, datos: { ...CONFIG_INICIAL, ...c.datos } }))
    return { equipo, temporada, jugadores, partidos, configs: completas, rivales, programados, resultadosLiga }
  })

  return useMemo(() => {
    if (!base) return undefined
    const ultima = base.configs[base.configs.length - 1]
    const mapa = new Map(base.configs.map((c) => [c.version, c.datos]))
    const calculo = reproducirTemporada(base.jugadores, base.partidos, mapa, ultima.datos, base.equipo.duracionPartido)
    const jugadores = [...base.jugadores].sort((a, b) => a.dorsal - b.dorsal)
    const rivales = [...base.rivales].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    const programados = [...base.programados].sort((a, b) => (a.split ?? 1) - (b.split ?? 1) || a.jornada - b.jornada)
    const liga = partidosLiga(base.partidos, programados, base.resultadosLiga, rivales)
    const logros = calcularLogros({
      jugadores, partidos: base.partidos, calculo, config: ultima.datos, equipo: base.equipo, programados, rivales, liga,
    })
    return { ...base, jugadores, rivales, programados, config: ultima.datos, configVersion: ultima.version, calculo, liga, logros }
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

export const SUBPESTANAS_PLANTILLA = [
  { id: 'jugadores', texto: 'Jugadores', ruta: '/plantilla' },
  { id: 'formacion', texto: 'Formación', ruta: '/plantilla/formacion' },
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
