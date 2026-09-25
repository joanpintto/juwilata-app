import type { Atributos } from '../motor/config'
import { fmt1 } from '../datos'

/** Radar de los 6 atributos: actual (dorado) sobre el inicio de temporada (gris). */
export function Radar({ actual, inicio, etiquetas }: { actual: Atributos; inicio: Atributos; etiquetas: readonly string[] }) {
  const cx = 150
  const cy = 132
  const r = 92
  const min = 40
  const max = 99
  const punto = (v: number, i: number, escala = 1) => {
    const ang = -Math.PI / 2 + (i * Math.PI) / 3
    const k = (Math.max(min, Math.min(max, v)) - min) / (max - min)
    return [cx + Math.cos(ang) * r * k * escala, cy + Math.sin(ang) * r * k * escala]
  }
  const poligono = (vals: number[]) => vals.map((v, i) => punto(v, i).join(',')).join(' ')
  const anillo = (k: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const ang = -Math.PI / 2 + (i * Math.PI) / 3
      return `${cx + Math.cos(ang) * r * k},${cy + Math.sin(ang) * r * k}`
    }).join(' ')

  return (
    <svg viewBox="0 0 300 270" width="100%" className="radar" role="img" aria-label="Radar de atributos">
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={anillo(k)} fill="none" stroke="var(--borde)" strokeWidth="1" />
      ))}
      <polygon points={poligono(inicio)} fill="rgba(168,162,154,0.12)" stroke="var(--texto-2)" strokeWidth="1.2" strokeDasharray="4 3" />
      <polygon points={poligono(actual)} fill="rgba(204,163,124,0.28)" stroke="var(--dorado)" strokeWidth="2" />
      {actual.map((v, i) => {
        const ang = -Math.PI / 2 + (i * Math.PI) / 3
        const x = cx + Math.cos(ang) * (r + 26)
        const y = cy + Math.sin(ang) * (r + 20)
        const dif = v - inicio[i]
        return (
          <g key={i} textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif">
            <text x={x} y={y - 2} fontSize="15" fontWeight="700" fill="var(--texto)">
              {etiquetas[i]} {Math.round(v)}
            </text>
            <text x={x} y={y + 13} fontSize="12" fontWeight="600" fill={dif > 0.05 ? 'var(--ok)' : dif < -0.05 ? 'var(--alerta)' : 'var(--texto-2)'}>
              {dif > 0.05 ? '+' : dif < -0.05 ? '−' : '±'}
              {fmt1(Math.abs(dif))}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** Línea de la media y barras de goles y asistencias por partido. */
export function GraficoEvolucion({ medias, goles, asistencias }: { medias: number[]; goles: number[]; asistencias: number[] }) {
  const w = 320
  const h = 170
  const izq = 28
  const der = 8
  const arr = 12
  const abj = 44
  const minM = Math.floor(Math.min(...medias) - 1)
  const maxM = Math.ceil(Math.max(...medias) + 1)
  const n = medias.length
  const x = (i: number) => izq + (n <= 1 ? (w - izq - der) / 2 : (i * (w - izq - der)) / (n - 1))
  const y = (m: number) => arr + ((maxM - m) / (maxM - minM || 1)) * (h - arr - abj)
  const maxBar = Math.max(1, ...goles.map((g, i) => g + asistencias[i]))
  const barH = 30
  const anchoBar = Math.max(3, Math.min(12, ((w - izq - der) / Math.max(1, n)) * 0.6))
  const linea = medias.map((m, i) => `${i ? 'L' : 'M'}${x(i)},${y(m)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Evolución de la media">
      {[minM, (minM + maxM) / 2, maxM].map((m) => (
        <g key={m}>
          <line x1={izq} x2={w - der} y1={y(m)} y2={y(m)} stroke="var(--borde)" />
          <text x={izq - 4} y={y(m) + 4} fontSize="10" textAnchor="end" fill="var(--texto-2)">{Math.round(m)}</text>
        </g>
      ))}
      <path d={linea} fill="none" stroke="var(--dorado)" strokeWidth="2.2" strokeLinejoin="round" />
      {medias.map((m, i) => (
        <circle key={i} cx={x(i)} cy={y(m)} r={n > 20 ? 1.8 : 2.8} fill="var(--dorado)" />
      ))}
      {goles.map((g, i) => {
        const a = asistencias[i]
        const hg = (g / maxBar) * barH
        const ha = (a / maxBar) * barH
        const bx = x(i + 1) - anchoBar / 2
        const base = h - 6
        return (
          <g key={i}>
            {g > 0 && <rect x={bx} y={base - hg} width={anchoBar} height={hg} fill="var(--ok)" rx="1.5" />}
            {a > 0 && <rect x={bx} y={base - hg - ha} width={anchoBar} height={ha} fill="#6f9fd8" rx="1.5" />}
          </g>
        )
      })}
      <line x1={izq} x2={w - der} y1={h - 6} y2={h - 6} stroke="var(--borde)" />
    </svg>
  )
}
