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
  secuenciaPostPartido?: boolean // animación al confirmar (por defecto, sí)
  compartir?: Compartir // enlace para los compañeros (Fase 4); nunca se publica
  publicadoEl?: string // (solo espectador) fecha de la copia que se está viendo
  splitActual?: number // split que se está jugando (por defecto, el 1)
}

/** Datos para publicar la copia que ven los compañeros. La clave solo está en este móvil. */
export interface Compartir {
  codigo: string // va en el enlace; permite leer
  clave: string // permite escribir; nunca sale del móvil salvo al publicar
  activo: boolean
  ultimaPublicacion: string | null
  fotos: Record<string, string> // jugadorId → huella de la foto ya publicada
  error: string | null
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
  fotoOriginal?: string | null // foto sin encuadrar ni recortar (solo en este móvil), para volver a editarla
  atributosIniciales: Atributos
  rolInicial: string
  temporadaId: string
  creado: string
  disenoActivo: string | null // null = el del rango actual
  especiales: Especial[]
  fueraEn?: string[] // temporadas (posteriores a su alta) en las que no está en la plantilla
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
  splits?: number[] // splits de liga en los que juega (sin dato = solo el 1)
  temporadaId?: string // cada temporada tiene su propia lista de equipos
}

/** La liga se juega en 2 splits de 16 jornadas que funcionan como dos ligas distintas. */
export const SPLITS = [1, 2] as const
export const splitDe = (x: { split?: number | null }) => x.split ?? 1
export const splitsDe = (r: Rival) => r.splits ?? [1]

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
  split?: number // split de liga (sin dato = 1)
}

/** Resultado de un partido de liga entre otros dos equipos (solo el marcador). */
export interface ResultadoLiga {
  id: string
  temporadaId: string
  jornada: number
  localId: string
  visitanteId: string
  golesLocal: number
  golesVisitante: number
  split?: number
}

export interface Partido {
  id: string
  temporadaId: string
  rival: string
  rivalId?: string | null
  programadoId?: string | null // si viene del calendario (jugado = tiene partido)
  split?: number | null // split de liga (solo en partidos de liga)
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
  resultadosLiga!: Table<ResultadoLiga, string>
  vistas!: Table<{ id: string }, string>

  constructor(nombre: string) {
    super(nombre)
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
    // v4: resultados de liga entre otros equipos.
    this.version(4).stores({ resultadosLiga: 'id, temporadaId' })
    // v5: notificaciones ya vistas (las notificaciones se calculan; aquí solo se marca lo leído).
    this.version(5).stores({ vistas: 'id' })
    // v6: cada temporada tiene su lista de equipos de la liga.
    this.version(6)
      .stores({ rivales: 'id, temporadaId' })
      .upgrade(async (tx) => {
        const eq = await tx.table<Equipo, string>('equipo').get('equipo')
        if (!eq) return
        await tx.table<Rival, string>('rivales').toCollection().modify((r) => {
          r.temporadaId ??= eq.temporadaActivaId
        })
      })
  }
}

// ─── Modo espectador (Fase 4) ─────────────────────────────────────────
// Un compañero que abre el enlace compartido (#/ver/<código>) ve la app en solo
// lectura, con los datos en una base aparte: nunca toca los del administrador.

const CLAVE_ESPECTADOR = 'juwilata-espectador'

function detectarEspectador(): string | null {
  if (typeof window === 'undefined') return null
  const m = window.location.hash.match(/^#\/ver\/([A-Za-z0-9_-]{16,})/)
  try {
    if (m) {
      localStorage.setItem(CLAVE_ESPECTADOR, m[1])
      return m[1]
    }
    return localStorage.getItem(CLAVE_ESPECTADOR)
  } catch {
    return m?.[1] ?? null
  }
}

/** Código del equipo que se está viendo como espectador (null = app del administrador). */
export const CODIGO_ESPECTADOR = detectarEspectador()
export const SOLO_LECTURA = CODIGO_ESPECTADOR !== null

export function salirDeEspectador() {
  try {
    localStorage.removeItem(CLAVE_ESPECTADOR)
  } catch {
    // sin almacenamiento: al recargar sin el enlace ya no se entra
  }
  window.location.replace(window.location.pathname)
}

export const db = new JuwilataDB(CODIGO_ESPECTADOR ? `juwilata-ver-${CODIGO_ESPECTADOR}` : 'juwilata')

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
  resultadosLiga?: ResultadoLiga[]
}

export async function exportarDatos(): Promise<Exportacion> {
  const [equipo, temporadas, jugadores, partidos, configuraciones, rivales, programados, resultadosLiga] = await Promise.all([
    db.equipo.get('equipo'), db.temporadas.toArray(), db.jugadores.toArray(), db.partidos.toArray(), db.configuraciones.toArray(),
    db.rivales.toArray(), db.programados.toArray(), db.resultadosLiga.toArray(),
  ])
  return {
    app: 'juwilata-united', formato: 1, exportado: new Date().toISOString(), equipo: equipo!,
    temporadas, jugadores, partidos, configuraciones, rivales, programados, resultadosLiga,
  }
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
    (d.programados === undefined || Array.isArray(d.programados)) &&
    (d.resultadosLiga === undefined || Array.isArray(d.resultadosLiga))
  if (!ok) throw new Error('El archivo no es una copia válida de Juwilata United.')
  return d
}

export async function importarDatos(d: Exportacion): Promise<void> {
  const tablas = [db.equipo, db.temporadas, db.jugadores, db.partidos, db.configuraciones, db.deshacer, db.rivales, db.programados, db.resultadosLiga]
  await db.transaction('rw', tablas, async () => {
    await Promise.all(tablas.map((t) => t.clear()))
    // Copias anteriores a las temporadas múltiples: los equipos son de la temporada activa.
    await db.rivales.bulkPut((d.rivales ?? []).map((r) => ({ ...r, temporadaId: r.temporadaId ?? d.equipo.temporadaActivaId })))
    await db.programados.bulkPut(d.programados ?? [])
    await db.resultadosLiga.bulkPut(d.resultadosLiga ?? [])
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

// ─── Temporadas ────────────────────────────────────────────────────────

/** Temporadas de la más antigua a la más reciente. */
export function ordenarTemporadas(ts: Temporada[]): Temporada[] {
  return [...ts].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.nombre.localeCompare(b.nombre))
}

/** ¿Está el jugador en la plantilla de esa temporada? */
export function enPlantilla(j: Jugador, temporadaId: string, orden: Temporada[]): boolean {
  const i = orden.findIndex((t) => t.id === temporadaId)
  const alta = orden.findIndex((t) => t.id === j.temporadaId)
  if (i < 0) return false
  return (alta < 0 || alta <= i) && !(j.fueraEn ?? []).includes(temporadaId)
}
