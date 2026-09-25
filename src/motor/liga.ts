// Clasificación de la liga (§10): 3 puntos por victoria, 1 por empate, 0 por derrota.
// Se calcula con nuestros partidos de liga y los resultados entre otros equipos.
import type { Partido, Programado, ResultadoLiga, Rival } from '../db'

export const NOSOTROS = 'nosotros'

export interface PartidoLiga {
  jornada: number | null
  localId: string
  visitanteId: string
  golesLocal: number
  golesVisitante: number
  nuestro: boolean
}

export interface FilaClasificacion {
  id: string
  nombre: string
  pj: number
  v: number
  e: number
  d: number
  gf: number
  gc: number
  pts: number
  forma: ('V' | 'E' | 'D')[] // últimos 5, el más reciente al final
}

export const esLiga = (competicion: string) => competicion.trim().toLocaleLowerCase('es') === 'liga'

const normalizar = (s: string) => s.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Todos los partidos de liga de la temporada: los nuestros y los de los demás. */
export function partidosLiga(partidos: Partido[], programados: Programado[], resultados: ResultadoLiga[], rivales: Rival[]): PartidoLiga[] {
  const lista: PartidoLiga[] = []
  const ordenados = [...partidos].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.creado.localeCompare(b.creado))
  for (const p of ordenados) {
    if (!esLiga(p.competicion)) continue
    const rivalId = p.rivalId ?? rivales.find((r) => normalizar(r.nombre) === normalizar(p.rival))?.id ?? `nombre:${p.rival}`
    lista.push({
      jornada: programados.find((g) => g.id === p.programadoId)?.jornada ?? null,
      localId: p.local ? NOSOTROS : rivalId,
      visitanteId: p.local ? rivalId : NOSOTROS,
      golesLocal: p.local ? p.golesFavor : p.golesContra,
      golesVisitante: p.local ? p.golesContra : p.golesFavor,
      nuestro: true,
    })
  }
  for (const r of resultados) {
    lista.push({ jornada: r.jornada, localId: r.localId, visitanteId: r.visitanteId, golesLocal: r.golesLocal, golesVisitante: r.golesVisitante, nuestro: false })
  }
  return lista
}

export function clasificacion(lista: PartidoLiga[], rivales: Rival[], nombreEquipo: string, hastaJornada?: number): FilaClasificacion[] {
  const filas = new Map<string, FilaClasificacion>()
  const fila = (id: string) => {
    let f = filas.get(id)
    if (!f) {
      const nombre = id === NOSOTROS ? nombreEquipo : (rivales.find((r) => r.id === id)?.nombre ?? id.replace(/^nombre:/, ''))
      f = { id, nombre, pj: 0, v: 0, e: 0, d: 0, gf: 0, gc: 0, pts: 0, forma: [] }
      filas.set(id, f)
    }
    return f
  }
  fila(NOSOTROS)
  for (const r of rivales) fila(r.id)

  const incluidos = lista
    .filter((p) => hastaJornada === undefined || p.jornada === null || p.jornada <= hastaJornada)
    .sort((a, b) => (a.jornada ?? 0) - (b.jornada ?? 0))
  for (const p of incluidos) {
    const l = fila(p.localId)
    const v = fila(p.visitanteId)
    l.pj++; v.pj++
    l.gf += p.golesLocal; l.gc += p.golesVisitante
    v.gf += p.golesVisitante; v.gc += p.golesLocal
    if (p.golesLocal > p.golesVisitante) {
      l.v++; l.pts += 3; v.d++
      l.forma.push('V'); v.forma.push('D')
    } else if (p.golesLocal < p.golesVisitante) {
      v.v++; v.pts += 3; l.d++
      v.forma.push('V'); l.forma.push('D')
    } else {
      l.e++; v.e++; l.pts++; v.pts++
      l.forma.push('E'); v.forma.push('E')
    }
  }
  return [...filas.values()]
    .map((f) => ({ ...f, forma: f.forma.slice(-5) }))
    .sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf || a.nombre.localeCompare(b.nombre, 'es'))
}

/** Jornadas (con número) en las que hemos ido primeros tras jugar. */
export function jornadasLider(lista: PartidoLiga[], rivales: Rival[], nombreEquipo: string): number[] {
  const jornadas = [...new Set(lista.filter((p) => p.nuestro && p.jornada !== null).map((p) => p.jornada as number))].sort((a, b) => a - b)
  return jornadas.filter((j) => clasificacion(lista, rivales, nombreEquipo, j)[0]?.id === NOSOTROS)
}
