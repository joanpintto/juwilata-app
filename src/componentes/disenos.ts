import type { Jugador } from '../db'
import { rango } from '../motor/calculo'
import type { Config } from '../motor/config'

// ─── Diseños: 8 rangos + 3 especiales (IF, POTM, TOTY) ────────────────

export interface Diseno {
  id: string
  nombre: string
  fondo: [string, string]
  marco: string[] // 1 color o degradado
  texto: string
  suave: string // texto secundario
  brillo: boolean // destello abajo a la derecha
  mate: boolean
  patron?: 'rayas' | 'rombos' | 'ondas'
}

export const DISENOS: Record<string, Diseno> = {
  bronce: { id: 'bronce', nombre: 'Bronce', fondo: ['#7a4a2e', '#3a2216'], marco: ['#a8714a'], texto: '#f6e2cf', suave: '#d9b394', brillo: false, mate: true },
  'bronce-brillante': { id: 'bronce-brillante', nombre: 'Bronce Brillante', fondo: ['#9a5f38', '#442615'], marco: ['#f0b88a', '#b8774a', '#f5c9a2'], texto: '#fff0e2', suave: '#f0c7a3', brillo: true, mate: false },
  plata: { id: 'plata', nombre: 'Plata', fondo: ['#80868d', '#3a3e43'], marco: ['#bfc4c9'], texto: '#f7f9fa', suave: '#d8dde1', brillo: false, mate: true },
  'plata-brillante': { id: 'plata-brillante', nombre: 'Plata Brillante', fondo: ['#a2a9b0', '#474c52'], marco: ['#ffffff', '#b8bec4', '#f2f5f7'], texto: '#ffffff', suave: '#e9eef2', brillo: true, mate: false },
  oro: { id: 'oro', nombre: 'Oro', fondo: ['#a07d48', '#4b381c'], marco: ['#cca37c'], texto: '#fff4e2', suave: '#ecd3ae', brillo: false, mate: true },
  'oro-brillante': { id: 'oro-brillante', nombre: 'Oro Brillante', fondo: ['#c29c5e', '#58401d'], marco: ['#ffe2a8', '#cca37c', '#fff0c9'], texto: '#fffaf0', suave: '#fbe6c0', brillo: true, mate: false },
  elite: { id: 'elite', nombre: 'Élite', fondo: ['#6e1026', '#1c0409'], marco: ['#e8c89c', '#cca37c', '#f3dcb8'], texto: '#f2f0ec', suave: '#e3c7a2', brillo: true, mate: false, patron: 'rombos' },
  leyenda: { id: 'leyenda', nombre: 'Leyenda', fondo: ['#2d2442', '#09090c'], marco: ['#c9b6f2', '#86d8cc', '#f0d392', '#c9b6f2'], texto: '#ffffff', suave: '#d9d0f0', brillo: true, mate: false, patron: 'ondas' },
  IF: { id: 'IF', nombre: 'IF', fondo: ['#2a2a2c', '#0b0b0c'], marco: ['#cca37c', '#8a6a4a', '#e6c6a0'], texto: '#f2f0ec', suave: '#cca37c', brillo: true, mate: false, patron: 'rayas' },
  POTM: { id: 'POTM', nombre: 'POTM', fondo: ['#550b1c', '#161617'], marco: ['#f1d3a8', '#cca37c'], texto: '#fff6ea', suave: '#f1d3a8', brillo: true, mate: false, patron: 'rayas' },
  TOTY: { id: 'TOTY', nombre: 'TOTY', fondo: ['#1a3a72', '#060f24'], marco: ['#f3d68e', '#c49a4a', '#fff0c2'], texto: '#ffffff', suave: '#f3d68e', brillo: true, mate: false, patron: 'rombos' },
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
