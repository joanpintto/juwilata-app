import type { CSSProperties } from 'react'
import { colorRival, iniciales, resultado, type Res } from '../motor/equipo'

// Piezas pequeñas del estilo «cristal» que se repiten en varias pantallas.

const COLOR_RES: Record<Res, [string, string]> = { V: ['#2f9e63', '#d6f5e3'], E: ['#e08a1e', '#fff0da'], D: ['#c8323f', '#ffe0e3'] }
const SUAVE_RES: Record<Res, [string, string]> = { V: ['rgba(47,158,99,0.22)', '#b5ecd0'], E: ['rgba(224,138,30,0.22)', '#f7d9a8'], D: ['rgba(200,50,63,0.24)', '#f3b6bc'] }

/** Pastilla V / E / D. `suave`: versión translúcida (listas); normal: con brillo (Inicio). */
export function PastillaRes({ r, suave = false, tam = 30 }: { r: Res; suave?: boolean; tam?: number }) {
  const [fondo, texto] = (suave ? SUAVE_RES : COLOR_RES)[r]
  const estilo: CSSProperties = { width: tam, height: tam, background: fondo, color: texto, boxShadow: suave ? undefined : `0 0 10px ${fondo}66, inset 0 1px 0 rgba(255,255,255,0.3)` }
  return <span className="pastilla-res" style={estilo}>{r}</span>
}

export function PastillasForma({ partidos, suave = false }: { partidos: { golesFavor: number; golesContra: number }[]; suave?: boolean }) {
  if (!partidos.length) return <p className="nota">Todavía no hay partidos.</p>
  return (
    <div className={`pastillas-forma ${suave ? 'pastillas-forma--llenas' : ''}`} style={suave ? { gridTemplateColumns: `repeat(${partidos.length}, minmax(0, 34px))` } : undefined}>
      {partidos.map((p, i) => <PastillaRes key={i} r={resultado(p)} suave={suave} tam={suave ? 34 : 30} />)}
    </div>
  )
}

/** Escudo genérico de un rival: iniciales sobre un color propio. */
export function EscudoRival({ nombre, tam = 40 }: { nombre: string; tam?: number }) {
  const [a, b] = colorRival(nombre)
  return (
    <span className="escudo-rival" style={{ width: tam, height: tam * 1.15, background: `linear-gradient(160deg, ${a}, ${b})`, fontSize: tam * 0.38 }} aria-hidden="true">
      {iniciales(nombre)}
    </span>
  )
}
