import type { Jugador } from '../db'
import { rango } from '../motor/calculo'
import type { Config } from '../motor/config'

// ─── Diseños: 8 rangos + 3 especiales (IF, POTM, TOTY) ────────────────

export interface Diseno {
  id: string
  nombre: string
  archivo: string // public/cartas/<archivo>.svg
}

export const DISENOS: Record<string, Diseno> = {
  bronce: { id: 'bronce', nombre: 'Bronce', archivo: 'bronce' },
  'bronce-brillante': { id: 'bronce-brillante', nombre: 'Bronce Brillante', archivo: 'bronce-brillante' },
  plata: { id: 'plata', nombre: 'Plata', archivo: 'plata' },
  'plata-brillante': { id: 'plata-brillante', nombre: 'Plata Brillante', archivo: 'plata-brillante' },
  oro: { id: 'oro', nombre: 'Oro', archivo: 'oro' },
  'oro-brillante': { id: 'oro-brillante', nombre: 'Oro Brillante', archivo: 'oro-brillante' },
  elite: { id: 'elite', nombre: 'Élite', archivo: 'elite' },
  leyenda: { id: 'leyenda', nombre: 'Leyenda', archivo: 'leyenda' },
  IF: { id: 'IF', nombre: 'IF', archivo: 'if' },
  POTM: { id: 'POTM', nombre: 'POTM', archivo: 'potm' },
  TOTY: { id: 'TOTY', nombre: 'TOTY', archivo: 'toty' },
}

export const ORDEN_DISENOS = ['bronce', 'bronce-brillante', 'plata', 'plata-brillante', 'oro', 'oro-brillante', 'elite', 'leyenda', 'IF', 'POTM', 'TOTY']

/** Diseños que el jugador puede usar: rangos alcanzados + especiales asignados. */
export function disenosDesbloqueados(j: Jugador, rangosAlcanzados: string[]): string[] {
  const esp = new Set(j.especiales.map((e) => e.tipo as string))
  return ORDEN_DISENOS.filter((d) => rangosAlcanzados.includes(d) || esp.has(d))
}

export function disenoDe(j: Jugador, mediaActual: number, cfg: Config, rangosAlcanzados: string[]): string {
  if (j.disenoActivo && disenosDesbloqueados(j, rangosAlcanzados).includes(j.disenoActivo)) return j.disenoActivo
  return rango(cfg, mediaActual).id
}
