import type { Jugador, Mister } from '../db'
import { rango } from '../motor/calculo'
import type { Config } from '../motor/config'
import { rangoMister } from '../motor/mister'

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

// ─── Diseños del míster: 4 pizarras por rango + 2 especiales (§20.5) ───

export const DISENOS_MISTER: Record<string, Diseno> = {
  debutante: { id: 'debutante', nombre: 'Debutante', archivo: 'mister-debutante' },
  consolidado: { id: 'consolidado', nombre: 'Consolidado', archivo: 'mister-consolidado' },
  elite: { id: 'elite', nombre: 'Élite', archivo: 'mister-elite' },
  leyenda: { id: 'leyenda', nombre: 'Leyenda del banquillo', archivo: 'mister-leyenda' },
  MOTM: { id: 'MOTM', nombre: 'MOTM', archivo: 'mister-motm' },
  TOTY: { id: 'TOTY', nombre: 'TOTY', archivo: 'mister-toty' },
}

export const ORDEN_DISENOS_MISTER = ['debutante', 'consolidado', 'elite', 'leyenda', 'MOTM', 'TOTY']

export function disenosMisterDesbloqueados(m: Mister, rangosAlcanzados: string[]): string[] {
  const esp = new Set(m.especiales.map((e) => e.tipo as string))
  return ORDEN_DISENOS_MISTER.filter((d) => rangosAlcanzados.includes(d) || esp.has(d))
}

export function disenoMister(m: Mister, mediaActual: number, cfg: Config, rangosAlcanzados: string[]): string {
  if (m.disenoActivo && disenosMisterDesbloqueados(m, rangosAlcanzados).includes(m.disenoActivo)) return m.disenoActivo
  return rangoMister(cfg, mediaActual).id
}
