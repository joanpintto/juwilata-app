// Sugerencias de IF, POTM y TOTY (§9). Son solo sugerencias: decide el administrador.
import type { Jugador, Mister, Partido } from '../db'
import type { Config, Posicion } from './config'
import type { EstadoJugador, Temporada } from './temporada'
import type { EstadoMister } from './mister'

export interface SugerenciaIF {
  partido: Partido
  jugador: Jugador | null // null: nadie llegó a la nota mínima
  notaPonderada: number
  clave: string // para saber si ya se dio
}

export interface CandidatoPOTM {
  e: EstadoJugador
  puntos: number
  partidos: number
  notaMedia: number
  mvps: number
  produccion: number
}

export interface SugerenciaPOTM {
  mes: string // AAAA-MM
  partidos: number
  candidatos: CandidatoPOTM[] // los 3 mejores
  clave: string
}

export interface CandidatoTOTY {
  e: EstadoJugador
  puntos: number
}

export interface SugerenciaTOTY {
  porteros: CandidatoTOTY[]
  defensas: CandidatoTOTY[]
  medios: CandidatoTOTY[]
  delanteros: CandidatoTOTY[]
  clave: string
}

export const claveIF = (partidoId: string) => `partido:${partidoId}`
export const claveMes = (mes: string) => `mes:${mes}`
export const claveTemporada = (temporadaId: string) => `temporada:${temporadaId}`

export function yaTiene(j: Jugador, tipo: string, clave: string) {
  return j.especiales.some((x) => x.tipo === tipo && x.detalle === clave)
}

/** IF sugerida por partido: la mejor nota ponderada de la jornada, si llega al mínimo. */
export function sugerenciasIF(calculo: Temporada, cfg: Config): SugerenciaIF[] {
  return calculo.partidos.map(({ partido }) => {
    let mejor: { e: EstadoJugador; np: number } | null = null
    for (const e of Object.values(calculo.jugadores)) {
      const paso = e.historial.find((h) => h.partidoId === partido.id)
      if (paso && (!mejor || paso.notaPonderada > mejor.np)) mejor = { e, np: paso.notaPonderada }
    }
    const llega = mejor && mejor.np >= cfg.ifNotaMinima
    return { partido, jugador: llega ? mejor!.e.jugador : null, notaPonderada: mejor?.np ?? 0, clave: claveIF(partido.id) }
  })
}

/** POTM por mes natural: 0,6 × nota media + 0,5 × MVPs + 0,1 × (goles + asistencias), ajustado por minutos. */
export function sugerenciasPOTM(calculo: Temporada, cfg: Config, duracion: number): SugerenciaPOTM[] {
  const meses = new Map<string, Partido[]>()
  for (const { partido } of calculo.partidos) {
    const mes = partido.fecha.slice(0, 7)
    meses.set(mes, [...(meses.get(mes) ?? []), partido])
  }
  const pesos = cfg.potmPesos
  return [...meses.entries()].map(([mes, partidos]) => {
    const ids = new Set(partidos.map((p) => p.id))
    const posibles = partidos.length * duracion
    const candidatos: CandidatoPOTM[] = []
    for (const e of Object.values(calculo.jugadores)) {
      const pasos = e.historial.filter((h) => ids.has(h.partidoId))
      if (!pasos.length) continue
      const notaMedia = pasos.reduce((s, h) => s + h.nota, 0) / pasos.length
      const mvps = pasos.filter((h) => h.mvp).length
      const produccion = pasos.reduce((s, h) => s + (h.acciones.gol ?? 0) + (h.acciones.asistencia ?? 0), 0)
      const minutos = pasos.reduce((s, h) => s + h.minutos, 0)
      const ajuste = Math.min(1, minutos / (cfg.potmMinutos * posibles || 1))
      const puntos = (pesos.notas * notaMedia + pesos.mvps * mvps + pesos.produccion * produccion) * ajuste
      candidatos.push({ e, puntos, partidos: pasos.length, notaMedia, mvps, produccion })
    }
    candidatos.sort((a, b) => b.puntos - a.puntos)
    return { mes, partidos: partidos.length, candidatos: candidatos.slice(0, 3), clave: claveMes(mes) }
  }).reverse()
}

/** TOTY: el 7 ideal en 1-3-2-1 con 0,5 × nota media + 0,2 × evolución + 0,2 × producción + 0,1 × MVPs. */
export function sugerenciaTOTY(calculo: Temporada, cfg: Config, temporadaId: string): SugerenciaTOTY {
  const jugadosEquipo = calculo.partidos.length
  const pesos = cfg.totyPesos
  const puntuar = (e: EstadoJugador): CandidatoTOTY => {
    const s = e.estadisticas
    const ajuste = Math.min(1, s.partidos / (cfg.totyPartidos * jugadosEquipo || 1))
    const produccion = s.goles + s.asistencias
    const puntos = (pesos.notas * (s.notaMedia ?? 0) + pesos.evolucion * (e.media - e.mediaInicial) + pesos.produccion * produccion + pesos.mvps * s.mvps) * ajuste
    return { e, puntos }
  }
  const de = (pos: Posicion[], n: number) =>
    Object.values(calculo.jugadores)
      .filter((e) => pos.includes(e.jugador.posicion) && e.estadisticas.partidos > 0)
      .map(puntuar)
      .sort((a, b) => b.puntos - a.puntos)
      .slice(0, n)
  return {
    porteros: de(['POR'], 1),
    defensas: de(['DFC', 'LAT'], 3),
    medios: de(['MED'], 2),
    delanteros: de(['DEL'], 1),
    clave: claveTemporada(temporadaId),
  }
}

export function nombreMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  const t = new Date(a, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

// ─── Míster: MOTM y TOTY (§20.5) ──────────────────────────────────────

export function yaTieneMister(m: Mister, tipo: string, clave: string) {
  return m.especiales.some((x) => x.tipo === tipo && x.detalle === clave)
}

export interface SugerenciaMOTM {
  mes: string // AAAA-MM
  dirigidos: number
  notaMedia: number
  puntos: number // fracción de los puntos posibles (3 por victoria, 1 por empate)
  cumple: boolean
  clave: string
}

/** MOTM por mes natural: nota media del míster ≥ 7,5 o ≥ 75% de los puntos. */
export function sugerenciasMOTM(e: EstadoMister, cfg: Config): SugerenciaMOTM[] {
  const meses = new Map<string, EstadoMister['historial']>()
  for (const h of e.historial) meses.set(h.fecha.slice(0, 7), [...(meses.get(h.fecha.slice(0, 7)) ?? []), h])
  return [...meses.entries()].map(([mes, pasos]) => {
    const notaMedia = pasos.reduce((s, h) => s + h.nota, 0) / pasos.length
    const pts = pasos.reduce((s, h) => s + (h.golesFavor > h.golesContra ? 3 : h.golesFavor === h.golesContra ? 1 : 0), 0)
    const puntos = pts / (3 * pasos.length)
    const cumple = notaMedia >= cfg.mister.motmNota - 1e-9 || puntos >= cfg.mister.motmPuntos - 1e-9
    return { mes, dirigidos: pasos.length, notaMedia, puntos, cumple, clave: claveMes(mes) }
  }).reverse()
}

export interface SugerenciaTOTYMister {
  notaMedia: number | null
  campeon: boolean
  cumple: boolean
  clave: string
}

/** TOTY del míster: nota media de la temporada ≥ 7,5 o el equipo campeón. */
export function sugerenciaTOTYMister(e: EstadoMister, campeon: boolean, cfg: Config, temporadaId: string): SugerenciaTOTYMister {
  const nota = e.estadisticas.notaMedia
  const cumple = e.estadisticas.dirigidos > 0 && ((nota ?? 0) >= cfg.mister.totyNota - 1e-9 || campeon)
  return { notaMedia: nota, campeon, cumple, clave: claveTemporada(temporadaId) }
}
