import type { Partido } from '../db'
import type { Datos } from '../datos'
import { rango } from '../motor/calculo'
import type { EstadoJugador, Paso } from '../motor/temporada'

export interface FilaResumen {
  e: EstadoJugador
  paso: Paso
  subeRango: { de: string; a: string; id: string } | null
}

export interface Resumen {
  partido: Partido
  jornada: number | null
  resultado: 'V' | 'E' | 'D'
  filas: FilaResumen[] // ordenadas por nota
  mvp: FilaResumen | null
  nominados: FilaResumen[] // sin el MVP
  goleadores: { e: EstadoJugador; n: number }[]
  asistentes: { e: EstadoJugador; n: number }[]
  porteriaCero: FilaResumen[]
  tarjetas: { e: EstadoJugador; amarillas: number; rojas: number }[]
}

/** Todo lo que cuenta un partido ya confirmado, sacado de la temporada calculada. */
export function resumenPartido(datos: Datos, id: string): Resumen | null {
  const { calculo, config, programados } = datos
  const r = calculo.partidos.find((x) => x.partido.id === id)
  if (!r) return null
  const p = r.partido

  const filas: FilaResumen[] = []
  for (const a of p.actuaciones) {
    const e = calculo.jugadores[a.jugadorId]
    const paso = e?.historial.find((h) => h.partidoId === p.id)
    if (!e || !paso) continue
    const antes = rango(config, paso.mediaAntes)
    const despues = rango(config, paso.mediaDespues)
    const subeRango = despues.desde > antes.desde ? { de: antes.nombre, a: despues.nombre, id: despues.id } : null
    filas.push({ e, paso, subeRango })
  }
  filas.sort((a, b) => b.paso.nota - a.paso.nota)

  const contar = (id: 'gol' | 'asistencia') =>
    filas.filter((f) => (f.paso.acciones[id] ?? 0) > 0).map((f) => ({ e: f.e, n: f.paso.acciones[id] ?? 0 })).sort((a, b) => b.n - a.n)

  return {
    partido: p,
    jornada: programados.find((g) => g.id === p.programadoId)?.jornada ?? null,
    resultado: p.golesFavor > p.golesContra ? 'V' : p.golesFavor === p.golesContra ? 'E' : 'D',
    filas,
    mvp: filas.find((f) => f.paso.mvp) ?? null,
    nominados: p.nominados.map((jid) => filas.find((f) => f.e.jugador.id === jid)).filter((f): f is FilaResumen => !!f && !f.paso.mvp),
    goleadores: contar('gol'),
    asistentes: contar('asistencia'),
    porteriaCero: p.golesContra === 0 ? filas.filter((f) => f.e.jugador.posicion === 'POR' && f.paso.minutos > datos.equipo.duracionPartido / 2) : [],
    tarjetas: filas
      .map((f) => ({ e: f.e, amarillas: f.paso.acciones.amarilla ?? 0, rojas: f.paso.acciones.roja ?? 0 }))
      .filter((t) => t.amarillas || t.rojas),
  }
}

export const TEXTO_RESULTADO = { V: 'Victoria', E: 'Empate', D: 'Derrota' } as const

export function iniciales(nombre: string): string {
  const palabras = nombre.replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter((w) => w.length > 2 || /\d/.test(w))
  const base = palabras.length ? palabras : nombre.split(/\s+/)
  return base.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
}
