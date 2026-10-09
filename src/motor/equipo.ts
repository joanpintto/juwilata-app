// Utilidades pequeñas sobre la temporada ya calculada (sin tocar la base de datos).
import type { EstadoJugador } from './temporada'

/** Media de un jugador tras cada uno de los partidos dados (la anterior si no jugó; un invitado sigue al equipo). */
export function mediaTras(e: EstadoJugador, ids: string[]): number[] {
  const porPartido = new Map(e.historial.map((h) => [h.partidoId, h.mediaDespues]))
  let m = e.mediaInicial
  return ids.map((id) => (m = porPartido.get(id) ?? e.seguido[id] ?? m))
}

export type Res = 'V' | 'E' | 'D'
export const resultado = (p: { golesFavor: number; golesContra: number }): Res =>
  p.golesFavor > p.golesContra ? 'V' : p.golesFavor === p.golesContra ? 'E' : 'D'

/** Iniciales de un equipo para su escudo («CF Poble Sec» → PS). */
export function iniciales(nombre: string): string {
  const palabras = nombre.replace(/\b(CF|CE|UD|FC|CD|SD|AD|UE|CP|Club|de|del|la|el)\b/gi, ' ').split(/\s+/).filter(Boolean)
  const base = palabras.length ? palabras : nombre.split(/\s+/)
  if (base.length === 1) return base[0].slice(0, 2).toUpperCase()
  return (base[0][0] + base[1][0]).toUpperCase()
}

// Colores de los escudos de los rivales (se elige siempre el mismo para cada nombre).
const COLORES_RIVAL = [
  ['#c8433f', '#7a1d1a'], ['#d6a21d', '#8a5d07'], ['#2e8a55', '#134a2c'], ['#8d4ab8', '#4a1f66'],
  ['#e07a22', '#8a3f06'], ['#2d6fb0', '#173a5f'], ['#b8325e', '#651530'], ['#3a9a9a', '#174f4f'],
]
export function colorRival(nombre: string): [string, string] {
  let h = 0
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORES_RIVAL[h % COLORES_RIVAL.length] as [string, string]
}
