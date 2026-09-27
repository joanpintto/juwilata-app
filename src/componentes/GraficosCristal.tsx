import { useId, useRef, useState, type PointerEvent as EventoPuntero } from 'react'

// Gráficas del estilo «cristal» (§3): línea granate brillante con área en degradado
// y un punto en cada jornada (el último, más grande); barras de goles por jornada.

const ANCHO = 326
const fmt = (v: number, dec = 1) => v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec })
const EJE = '#8a847d'
const REJILLA = 'rgba(255,255,255,0.08)'

function marcasEje(min: number, max: number): number[] {
  const rango = max - min
  const paso = rango <= 4 ? 1 : rango <= 8 ? 2 : rango <= 20 ? 5 : 10
  const r: number[] = []
  for (let v = Math.ceil(min / paso) * paso; v <= max + 1e-9; v += paso) r.push(v)
  return r
}

/** Qué etiquetas del eje X se ven (sin amontonarse). */
const visible = (i: number, n: number) => {
  const cada = Math.max(1, Math.ceil(n / 7))
  return i === n - 1 || (i % cada === 0 && n - 1 - i >= cada * 0.6)
}

export interface SerieCristal {
  id: string
  nombre: string
  color: string
  valores: (number | null)[]
}

/** Una o varias líneas con un punto por jornada; al tocar se ven los valores. */
export function LineaCristal({ etiquetas, series, dec = 1, alto = 150, area = true }: { etiquetas: string[]; series: SerieCristal[]; dec?: number; alto?: number; area?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [indice, setIndice] = useState<number | null>(null)
  const caja = useRef<SVGSVGElement>(null)
  const n = etiquetas.length
  const todos = series.flatMap((s) => s.valores.filter((v): v is number => v !== null))
  if (!n || !todos.length) return <p className="nota">Sin datos todavía.</p>
  const varias = series.length > 1
  const izq = 26
  const der = varias ? 50 : 10
  const arr = 14
  const abj = 26
  const min = Math.floor(Math.min(...todos) - 0.3)
  const max = Math.ceil(Math.max(...todos) + 0.3)
  const x = (i: number) => izq + (n <= 1 ? (ANCHO - izq - der) / 2 : (i * (ANCHO - izq - der)) / (n - 1))
  const y = (v: number) => arr + ((max - v) / (max - min || 1)) * (alto - arr - abj)
  const base = alto - abj
  const mover = (e: EventoPuntero<SVGRectElement>) => {
    const r = caja.current!.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * ANCHO
    setIndice(Math.max(0, Math.min(n - 1, n <= 1 ? 0 : Math.round(((px - izq) / (ANCHO - izq - der)) * (n - 1)))))
  }
  // Etiquetas al final de cada línea (varias series), separadas para que no se pisen.
  const finales = series
    .map((s) => {
      const k = s.valores.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0).pop()
      return k === undefined ? null : { s, y: y(s.valores[k]!) }
    })
    .filter((f): f is { s: SerieCristal; y: number } => f !== null)
    .sort((a, b) => a.y - b.y)
  for (let i = 1; i < finales.length; i++) finales[i].y = Math.max(finales[i].y, finales[i - 1].y + 12)

  return (
    <div className="grafico">
      <div className="grafico__lienzo">
        <svg ref={caja} viewBox={`0 0 ${ANCHO} ${alto}`} width="100%" role="img" aria-label={series.map((s) => s.nombre).join(', ')}>
          <defs>
            <linearGradient id={`${uid}a`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b3183a" stopOpacity="0.65" />
              <stop offset="0.6" stopColor="#4a0816" stopOpacity="0.45" />
              <stop offset="1" stopColor="#0a0406" stopOpacity="0.1" />
            </linearGradient>
            <filter id={`${uid}g`} x="-10%" y="-30%" width="120%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {marcasEje(min, max).map((m) => (
            <g key={m}>
              <line x1={izq} x2={ANCHO - der} y1={y(m)} y2={y(m)} stroke={REJILLA} />
              <text x={izq - 6} y={y(m) + 4} textAnchor="end" fontSize="10" fill={EJE}>{m}</text>
            </g>
          ))}
          {etiquetas.map((e, i) => visible(i, n) && (
            <text key={i} x={x(i)} y={alto - 8} textAnchor="middle" fontSize="10" fill={EJE}>{e}</text>
          ))}
          {series.map((s) => {
            const pts = s.valores.map((v, i) => (v === null ? null : [x(i), y(v)] as const)).filter((p): p is readonly [number, number] => p !== null)
            if (!pts.length) return null
            const linea = pts.map((p) => p.join(',')).join(' ')
            const color = varias ? s.color : '#d11f45'
            const borde = varias ? s.color : '#e0395c'
            const ultimo = pts[pts.length - 1]
            return (
              <g key={s.id}>
                {area && !varias && (
                  <polygon points={`${pts[0][0]},${base} ${linea} ${ultimo[0]},${base}`} fill={`url(#${uid}a)`} />
                )}
                <polyline points={linea} fill="none" stroke={color} strokeWidth={varias ? 2.2 : 2.8} strokeLinejoin="round" strokeLinecap="round" filter={varias ? undefined : `url(#${uid}g)`} />
                {pts.map((p, k) => (
                  <circle key={k} cx={p[0]} cy={p[1]} r={k === pts.length - 1 ? 5 : 3} fill={k === pts.length - 1 && !varias ? '#f3d9e0' : '#1a0509'} stroke={borde} strokeWidth="1.6" />
                ))}
                {!varias && (
                  <text x={ultimo[0]} y={ultimo[1] - 10} textAnchor={ultimo[0] > ANCHO - 30 ? 'end' : 'middle'} fontSize="12" fontWeight="700" fill="#f2f0ec" fontFamily="'Barlow Condensed', sans-serif">
                    {fmt(s.valores.filter((v): v is number => v !== null).pop()!, dec)}
                  </text>
                )}
              </g>
            )
          })}
          {varias && finales.map(({ s, y: yy }) => (
            <text key={s.id} x={ANCHO - der + 6} y={yy + 4} fontSize="10.5" fontWeight="600" fill={s.color}>
              {s.nombre.length > 8 ? s.nombre.slice(0, 7) + '…' : s.nombre}
            </text>
          ))}
          {indice !== null && <line x1={x(indice)} x2={x(indice)} y1={arr} y2={base} stroke="rgba(255,255,255,0.3)" />}
          <rect x={0} y={0} width={ANCHO} height={alto} fill="transparent" style={{ touchAction: 'pan-y' }} onPointerMove={mover} onPointerDown={mover} onPointerLeave={() => setIndice(null)} />
        </svg>
        {indice !== null && (
          <div className="tooltip-graf" style={{ left: `${(x(indice) / ANCHO) * 100}%` }}>
            <span className="tooltip-graf__x">{etiquetas[indice]}</span>
            {series.map((s) => (
              <span key={s.id} className="tooltip-graf__fila">
                <i style={{ background: varias ? s.color : '#e0395c' }} />
                <strong>{s.valores[indice] === null ? '—' : fmt(s.valores[indice]!, dec)}</strong>
                {varias && <em>{s.nombre}</em>}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Goles a favor y en contra por jornada (barras una al lado de la otra). */
export function BarrasGoles({ etiquetas, favor, contra }: { etiquetas: string[]; favor: number[]; contra: number[] }) {
  const [indice, setIndice] = useState<number | null>(null)
  const n = etiquetas.length
  if (!n) return <p className="nota">Sin partidos todavía.</p>
  const alto = 150
  const izq = 22
  const base = 126
  const arriba = 18
  const max = Math.max(2, ...favor, ...contra)
  const tope = Math.ceil(max / 2) * 2
  const esc = (base - arriba) / tope
  const paso = (ANCHO - izq) / n
  const ancho = Math.max(3, Math.min(8, (paso - 6) / 2))
  const marcas = marcasEje(0, tope).filter((m) => m > 0)
  return (
    <div className="grafico">
      <div className="grafico__lienzo">
        <svg viewBox={`0 0 ${ANCHO} ${alto}`} width="100%" role="img" aria-label="Goles a favor y en contra por jornada">
          {marcas.map((m) => (
            <g key={m}>
              <line x1={izq} x2={ANCHO} y1={base - m * esc} y2={base - m * esc} stroke={REJILLA} />
              <text x={izq - 6} y={base - m * esc + 4} textAnchor="end" fontSize="10" fill={EJE}>{m}</text>
            </g>
          ))}
          <line x1={izq} x2={ANCHO} y1={base} y2={base} stroke="rgba(255,255,255,0.18)" />
          {etiquetas.map((e, i) => {
            const cx = izq + paso * i + paso / 2
            return (
              <g key={i} opacity={indice === null || indice === i ? 1 : 0.5}>
                {favor[i] > 0 && <rect x={cx - ancho - 1} y={base - favor[i] * esc} width={ancho} height={favor[i] * esc} rx="2" fill="#CCA37C" />}
                {contra[i] > 0 && <rect x={cx + 1} y={base - contra[i] * esc} width={ancho} height={contra[i] * esc} rx="2" fill="#b0283c" />}
                {visible(i, n) && <text x={cx} y={alto - 8} textAnchor="middle" fontSize="10" fill={EJE}>{e}</text>}
                <rect x={cx - paso / 2} y={0} width={paso} height={base} fill="transparent" style={{ touchAction: 'pan-y' }} onPointerEnter={() => setIndice(i)} onPointerDown={() => setIndice(i)} onPointerLeave={() => setIndice(null)} />
              </g>
            )
          })}
        </svg>
        {indice !== null && (
          <div className="tooltip-graf" style={{ left: `${((izq + paso * indice + paso / 2) / ANCHO) * 100}%` }}>
            <span className="tooltip-graf__x">{etiquetas[indice]}</span>
            <span className="tooltip-graf__fila"><i style={{ background: '#CCA37C' }} /><strong>{favor[indice]}</strong><em>a favor</em></span>
            <span className="tooltip-graf__fila"><i style={{ background: '#b0283c' }} /><strong>{contra[indice]}</strong><em>en contra</em></span>
          </div>
        )}
      </div>
    </div>
  )
}
