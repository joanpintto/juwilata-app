// Química de la formación (§10): enlaces entre titulares cercanos, coloreados
// según los partidos que han jugado juntos (los dos con minutos).
import { SIGLA_LADO, ladoDe, type Lado, type Posicion } from './config'
import type { Temporada } from './temporada'

export type ColorEnlace = 'verde' | 'naranja' | 'rojo'

/** Posiciones del campo en un lienzo de 358×500 (maqueta aprobada) y enlaces de química por esquema. */
export const CAMPO = { ancho: 358, alto: 500, carta: { ancho: 62, alto: 88 } }

export const DISPOSICION: Record<string, { pos: Record<string, [number, number]>; enlaces: [string, string][] }> = {
  '1-3-2-1': {
    pos: { a1: [179, 64], m1: [100, 172], m2: [258, 172], d1: [46, 290], d2: [179, 302], d3: [312, 290], por: [179, 420] },
    enlaces: [['a1', 'm1'], ['a1', 'm2'], ['m1', 'm2'], ['m1', 'd1'], ['m2', 'd3'], ['m1', 'd2'], ['m2', 'd2'], ['d1', 'd2'], ['d2', 'd3'], ['d1', 'por'], ['d2', 'por'], ['d3', 'por']],
  },
  '1-2-3-1': {
    pos: { a1: [179, 64], m1: [46, 190], m2: [179, 182], m3: [312, 190], d1: [100, 300], d2: [258, 300], por: [179, 420] },
    enlaces: [['a1', 'm1'], ['a1', 'm2'], ['a1', 'm3'], ['m1', 'm2'], ['m2', 'm3'], ['m1', 'd1'], ['m3', 'd2'], ['m2', 'd1'], ['m2', 'd2'], ['d1', 'd2'], ['d1', 'por'], ['d2', 'por']],
  },
  '1-3-1-2': {
    pos: { a1: [100, 70], a2: [258, 70], m1: [179, 180], d1: [46, 290], d2: [179, 302], d3: [312, 290], por: [179, 420] },
    enlaces: [['a1', 'a2'], ['a1', 'm1'], ['a2', 'm1'], ['a1', 'd1'], ['a2', 'd3'], ['m1', 'd1'], ['m1', 'd2'], ['m1', 'd3'], ['d1', 'd2'], ['d2', 'd3'], ['d1', 'por'], ['d3', 'por']],
  },
  '1-2-2-2': {
    pos: { a1: [100, 70], a2: [258, 70], m1: [100, 186], m2: [258, 186], d1: [100, 300], d2: [258, 300], por: [179, 420] },
    enlaces: [['a1', 'a2'], ['a1', 'm1'], ['a2', 'm2'], ['a1', 'm2'], ['m1', 'm2'], ['m1', 'd1'], ['m2', 'd2'], ['m1', 'd2'], ['m2', 'd1'], ['d1', 'd2'], ['d1', 'por'], ['d2', 'por']],
  },
}

/** Partidos jugados juntos por cada pareja (todas las temporadas calculadas). */
export function partidosJuntos(temporadas: Temporada[]): Map<string, number> {
  const juntos = new Map<string, number>()
  for (const t of temporadas) {
    for (const r of t.partidos) {
      const ids = Object.keys(r.notas).sort()
      for (let i = 0; i < ids.length; i++) {
        for (let k = i + 1; k < ids.length; k++) {
          const clave = `${ids[i]}|${ids[k]}`
          juntos.set(clave, (juntos.get(clave) ?? 0) + 1)
        }
      }
    }
  }
  return juntos
}

export const claveJuntos = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

export function colorEnlace(n: number): ColorEnlace {
  return n >= 10 ? 'verde' : n >= 5 ? 'naranja' : 'rojo'
}

/** % de química: verde cuenta entero, naranja la mitad y rojo nada. */
export function porcentajeQuimica(colores: ColorEnlace[]): number {
  if (!colores.length) return 0
  return Math.round((colores.reduce((s, c) => s + (c === 'verde' ? 1 : c === 'naranja' ? 0.5 : 0), 0) / colores.length) * 100)
}

/** Cómo encaja un jugador en el hueco: su posición, una secundaria o fuera de sus posiciones. */
/** Banda de un hueco de lateral según dónde está en el campo. */
export const ladoHueco = (h: { x: number }): Lado => (h.x < 50 ? 'izquierdo' : 'derecho')

/**
 * ¿Encaja el jugador en el hueco? Un lateral en la banda contraria cuenta
 * como posición secundaria (aviso amarillo).
 */
export function encaje(hueco: { pos: Posicion; x: number }, j: { posicion: Posicion; secundarias: Posicion[]; lado?: Lado | null; pierna: string }): 'ok' | 'sec' | 'fuera' {
  if (hueco.pos === j.posicion) return hueco.pos === 'LAT' && ladoHueco(hueco) !== ladoDe(j) ? 'sec' : 'ok'
  return j.secundarias.includes(hueco.pos) ? 'sec' : 'fuera'
}

/** Siglas del hueco (en la peana cuando no es su posición principal): los laterales, LI o LD. */
const SIGLA_POS: Record<Posicion, string> = { POR: 'POR', DFC: 'DFC', LAT: 'LAT', MED: 'MC', DEL: 'DC' }
export const siglaHueco = (h: { pos: Posicion; x: number }) => (h.pos === 'LAT' ? SIGLA_LADO[ladoHueco(h)] : SIGLA_POS[h.pos])
