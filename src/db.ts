import Dexie, { type Table } from 'dexie'
import { CONFIG_INICIAL, rolPorId, type Atributos, type Config, type Posicion } from './motor/config'
import { atributosIniciales } from './motor/calculo'
import type { Acciones } from './motor/calculo'

// ─── Modelo de datos (docs/DISENO.md §12) ─────────────────────────────
// Se guarda lo que registras; todo lo demás (notas, medias, atributos)
// se calcula reproduciendo la temporada partido a partido.

export interface Diagnostico {
  id: string
  aperturas: number
  primeraApertura: string
  ultimaApertura: string
}

export interface Equipo {
  id: 'equipo'
  nombre: string
  fundado: number
  temporadaActivaId: string
  duracionPartido: number
  partidosTemporada: number
  formacion: { esquema: string; slots: Record<string, string | null> }
  partidosDesdeExportacion: number
  ultimaExportacion: string | null
}

export interface Temporada {
  id: string
  nombre: string
  inicio: string
}

export type Pierna = 'derecha' | 'izquierda' | 'ambas'
export type TipoEspecial = 'IF' | 'POTM' | 'TOTY'

export interface Especial {
  id: string
  tipo: TipoEspecial
  fecha: string
  detalle?: string
}

export interface Jugador {
  id: string
  nombre: string
  apodo: string
  dorsal: number
  posicion: Posicion
  rol: string
  secundarias: Posicion[]
  pierna: Pierna
  foto: string | null // PNG en data URL
  atributosIniciales: Atributos
  rolInicial: string
  temporadaId: string
  creado: string
  disenoActivo: string | null // null = el del rango actual
  especiales: Especial[]
}

export type EstadoConvocatoria = 'titular' | 'suplente' | 'no_convocado' | 'baja'

export interface Actuacion {
  jugadorId: string
  estado: EstadoConvocatoria
  minutos: number
  acciones: Acciones
  posicion: Posicion // posición principal del jugador en ese partido
  rol: string
}

export interface Rival {
  id: string
  nombre: string
  creado: string
}

/** Partido propio del calendario (programado antes de jugarse). */
export interface Programado {
  id: string
  temporadaId: string
  jornada: number
  rivalId: string
  fecha: string | null // AAAA-MM-DD; puede no saberse aún
  hora: string | null // HH:MM
  local: boolean
  aplazado: boolean
  competicion: string
}

export interface Partido {
  id: string
  temporadaId: string
  rival: string
  rivalId?: string | null
  programadoId?: string | null // si viene del calendario (jugado = tiene partido)
  fecha: string // AAAA-MM-DD
  competicion: string
  local: boolean
  golesFavor: number
  golesContra: number
  actuaciones: Actuacion[]
  mvpId: string | null
  nominados: string[]
  configVersion: number
  creado: string
  editado: string | null
}

export interface ConfigVersion {
  version: number
  datos: Config
  creada: string
  descripcion: string
}

export interface Copia {
  id?: number
  fecha: string
  motivo: string
  datos: string
}

export interface Deshacer {
  id: 'ultimo'
  fecha: string
  descripcion: string
  partidoId: string
  anterior: Partido | null // null: el partido era nuevo → deshacer lo borra
}

class JuwilataDB extends Dexie {
  diagnostico!: Table<Diagnostico, string>
  equipo!: Table<Equipo, string>
  temporadas!: Table<Temporada, string>
  jugadores!: Table<Jugador, string>
  partidos!: Table<Partido, string>
  configuraciones!: Table<ConfigVersion, number>
  copias!: Table<Copia, number>
  deshacer!: Table<Deshacer, string>
  rivales!: Table<Rival, string>
  programados!: Table<Programado, string>

  constructor() {
    super('juwilata')
    this.version(1).stores({ diagnostico: 'id' })
    this.version(2).stores({
      diagnostico: 'id',
      equipo: 'id',
      temporadas: 'id',
      jugadores: 'id, temporadaId',
      partidos: 'id, temporadaId, fecha',
      configuraciones: 'version',
      copias: '++id, fecha',
      deshacer: 'id',
    })
    // v3: rivales y calendario; los atributos iniciales se rehacen para que
    // todo jugador nuevo empiece con media ponderada 60,0 exacta.
    this.version(3)
      .stores({ rivales: 'id', programados: 'id, temporadaId' })
      .upgrade(async (tx) => {
        const ultima = await tx.table<ConfigVersion, number>('configuraciones').orderBy('version').last()
        const cfg = { ...CONFIG_INICIAL, ...(ultima?.datos ?? {}) }
        await tx.table<Jugador, string>('jugadores').toCollection().modify((j) => {
          j.atributosIniciales = atributosIniciales(rolPorId(cfg, j.rolInicial).pesos, cfg)
        })
      })
  }
}

export const db = new JuwilataDB()

export const nuevoId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const ESQUEMAS: Record<string, { id: string; pos: Posicion; x: number; y: number }[]> = {
  '1-3-2-1': [
    { id: 'por', pos: 'POR', x: 50, y: 88 },
    { id: 'd1', pos: 'LAT', x: 17, y: 63 }, { id: 'd2', pos: 'DFC', x: 50, y: 66 }, { id: 'd3', pos: 'LAT', x: 83, y: 63 },
    { id: 'm1', pos: 'MED', x: 31, y: 39 }, { id: 'm2', pos: 'MED', x: 69, y: 39 },
    { id: 'a1', pos: 'DEL', x: 50, y: 14 },
  ],
  '1-2-3-1': [
    { id: 'por', pos: 'POR', x: 50, y: 88 },
    { id: 'd1', pos: 'DFC', x: 31, y: 65 }, { id: 'd2', pos: 'DFC', x: 69, y: 65 },
    { id: 'm1', pos: 'LAT', x: 15, y: 39 }, { id: 'm2', pos: 'MED', x: 50, y: 41 }, { id: 'm3', pos: 'LAT', x: 85, y: 39 },
    { id: 'a1', pos: 'DEL', x: 50, y: 14 },
  ],
  '1-3-1-2': [
    { id: 'por', pos: 'POR', x: 50, y: 88 },
    { id: 'd1', pos: 'LAT', x: 17, y: 63 }, { id: 'd2', pos: 'DFC', x: 50, y: 66 }, { id: 'd3', pos: 'LAT', x: 83, y: 63 },
    { id: 'm1', pos: 'MED', x: 50, y: 40 },
    { id: 'a1', pos: 'DEL', x: 29, y: 15 }, { id: 'a2', pos: 'DEL', x: 71, y: 15 },
  ],
  '1-2-2-2': [
    { id: 'por', pos: 'POR', x: 50, y: 88 },
    { id: 'd1', pos: 'DFC', x: 31, y: 65 }, { id: 'd2', pos: 'DFC', x: 69, y: 65 },
    { id: 'm1', pos: 'MED', x: 29, y: 40 }, { id: 'm2', pos: 'MED', x: 71, y: 40 },
    { id: 'a1', pos: 'DEL', x: 29, y: 15 }, { id: 'a2', pos: 'DEL', x: 71, y: 15 },
  ],
}

let inicializacion: Promise<void> | null = null

/** Crea el equipo, la temporada y la configuración la primera vez. */
export function inicializar(): Promise<void> {
  inicializacion ??= db.transaction('rw', [db.equipo, db.temporadas, db.configuraciones], async () => {
    if (!(await db.configuraciones.count())) {
      await db.configuraciones.put({ version: 1, datos: CONFIG_INICIAL, creada: new Date().toISOString(), descripcion: 'Valores iniciales del documento de diseño' })
    }
    if (!(await db.equipo.get('equipo'))) {
      const temporada: Temporada = { id: nuevoId(), nombre: '2026-2027', inicio: new Date().toISOString().slice(0, 10) }
      await db.temporadas.put(temporada)
      await db.equipo.put({
        id: 'equipo',
        nombre: 'Juwilata United',
        fundado: 2022,
        temporadaActivaId: temporada.id,
        duracionPartido: 50,
        partidosTemporada: 32,
        formacion: { esquema: '1-3-2-1', slots: {} },
        partidosDesdeExportacion: 0,
        ultimaExportacion: null,
      })
    }
  })
  return inicializacion
}

export async function configActual(): Promise<ConfigVersion> {
  const v = await db.configuraciones.orderBy('version').last()
  return v!
}

export async function registrarApertura(): Promise<Diagnostico> {
  const ahora = new Date().toISOString()
  return db.transaction('rw', db.diagnostico, async () => {
    const actual = await db.diagnostico.get('app')
    const nuevo: Diagnostico = actual
      ? { ...actual, aperturas: actual.aperturas + 1, ultimaApertura: ahora }
      : { id: 'app', aperturas: 1, primeraApertura: ahora, ultimaApertura: ahora }
    await db.diagnostico.put(nuevo)
    return nuevo
  })
}

export async function pedirAlmacenamientoPersistente(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}

// ─── Copias de seguridad (§12) ─────────────────────────────────────────

export interface Exportacion {
  app: 'juwilata-united'
  formato: 1
  exportado: string
  equipo: Equipo
  temporadas: Temporada[]
  jugadores: Jugador[]
  partidos: Partido[]
  configuraciones: ConfigVersion[]
  rivales?: Rival[]
  programados?: Programado[]
}

export async function exportarDatos(): Promise<Exportacion> {
  const [equipo, temporadas, jugadores, partidos, configuraciones, rivales, programados] = await Promise.all([
    db.equipo.get('equipo'), db.temporadas.toArray(), db.jugadores.toArray(), db.partidos.toArray(), db.configuraciones.toArray(),
    db.rivales.toArray(), db.programados.toArray(),
  ])
  return { app: 'juwilata-united', formato: 1, exportado: new Date().toISOString(), equipo: equipo!, temporadas, jugadores, partidos, configuraciones, rivales, programados }
}

export function validarExportacion(x: unknown): Exportacion {
  const d = x as Exportacion
  const ok =
    d && typeof d === 'object' && d.app === 'juwilata-united' && d.formato === 1 &&
    d.equipo && typeof d.equipo.nombre === 'string' &&
    Array.isArray(d.temporadas) && Array.isArray(d.jugadores) && Array.isArray(d.partidos) &&
    Array.isArray(d.configuraciones) && d.configuraciones.length > 0 &&
    d.jugadores.every((j) => typeof j.id === 'string' && typeof j.nombre === 'string' && Array.isArray(j.atributosIniciales)) &&
    d.partidos.every((p) => typeof p.id === 'string' && Array.isArray(p.actuaciones)) &&
    (d.rivales === undefined || Array.isArray(d.rivales)) &&
    (d.programados === undefined || Array.isArray(d.programados))
  if (!ok) throw new Error('El archivo no es una copia válida de Juwilata United.')
  return d
}

export async function importarDatos(d: Exportacion): Promise<void> {
  const tablas = [db.equipo, db.temporadas, db.jugadores, db.partidos, db.configuraciones, db.deshacer, db.rivales, db.programados]
  await db.transaction('rw', tablas, async () => {
    await Promise.all(tablas.map((t) => t.clear()))
    await db.rivales.bulkPut(d.rivales ?? [])
    await db.programados.bulkPut(d.programados ?? [])
    await db.equipo.put(d.equipo)
    await db.temporadas.bulkPut(d.temporadas)
    // Los atributos iniciales siempre salen de la fórmula (media 60,0), también en copias antiguas.
    const ultima = [...d.configuraciones].sort((a, b) => a.version - b.version).pop()
    const cfg = { ...CONFIG_INICIAL, ...(ultima?.datos ?? {}) }
    await db.jugadores.bulkPut(d.jugadores.map((j) => ({ ...j, atributosIniciales: atributosIniciales(rolPorId(cfg, j.rolInicial).pesos, cfg) })))
    await db.partidos.bulkPut(d.partidos)
    await db.configuraciones.bulkPut(d.configuraciones)
  })
}

const COPIAS_GUARDADAS = 5

export async function copiaAutomatica(motivo: string): Promise<void> {
  const datos = JSON.stringify(await exportarDatos())
  await db.copias.add({ fecha: new Date().toISOString(), motivo, datos })
  const todas = await db.copias.orderBy('id').primaryKeys()
  const sobran = todas.slice(0, Math.max(0, todas.length - COPIAS_GUARDADAS))
  if (sobran.length) await db.copias.bulkDelete(sobran)
}

export function nombreArchivoCopia(fecha = new Date()): string {
  const iso = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  return `backup_equipo_${iso}.json`
}
