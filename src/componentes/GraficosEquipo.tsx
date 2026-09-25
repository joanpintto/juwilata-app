import { useRef, useState, type PointerEvent as EventoPuntero } from 'react'

import { COLORES_SERIE } from './colores'

// Gráficos de Evoluciones (colores de serie en ./colores).

const ANCHO = 340
const fmt = (v: number, dec = 1) => v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec })

export interface Serie {
  id: string
  nombre: string
  color: string
  valores: (number | null)[]
}

function Leyenda({ series }: { series: Serie[] }) {
  if (series.length < 2) return null
  return (
    <div className="leyenda-graf">
      {series.map((s) => (
        <span key={s.id}>
          <i style={{ background: s.color }} /> {s.nombre}
        </span>
      ))}
    </div>
  )
}

function TablaDatos({ etiquetas, series, dec }: { etiquetas: string[]; series: Serie[]; dec: number }) {
  return (
    <div className="tabla-datos">
      <table>
        <thead>
          <tr>
            <th />
            {series.map((s) => <th key={s.id}>{s.nombre}</th>)}
          </tr>
        </thead>
        <tbody>
          {etiquetas.map((e, i) => (
            <tr key={i}>
              <th>{e}</th>
              {series.map((s) => <td key={s.id}>{s.valores[i] === null ? '—' : fmt(s.valores[i]!, dec)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Posición de las etiquetas al final de cada línea, separadas para que no se pisen. */
function etiquetasFinales(series: Serie[], y: (v: number) => number) {
  const lista = series
    .map((s) => {
      const v = [...s.valores].reverse().find((x) => x !== null)
      return v === undefined || v === null ? null : { id: s.id, nombre: s.nombre, y: y(v) }
    })
    .filter((l): l is { id: string; nombre: string; y: number } => l !== null)
    .sort((a, b) => a.y - b.y)
  for (let i = 1; i < lista.length; i++) lista[i].y = Math.max(lista[i].y, lista[i - 1].y + 11)
  return lista
}

/** Líneas con cruceta: al tocar o pasar el dedo se ven los valores de todas las series. */
export function GraficoLineas({ etiquetas, series, dec = 1, alto = 180 }: { etiquetas: string[]; series: Serie[]; dec?: number; alto?: number }) {
  const [indice, setIndice] = useState<number | null>(null)
  const [tabla, setTabla] = useState(false)
  const caja = useRef<SVGSVGElement>(null)
  const izq = 30
  const der = series.length > 1 && series.length <= 4 ? 52 : 12
  const arr = 10
  const abj = 22
  const n = etiquetas.length
  const todos = series.flatMap((s) => s.valores.filter((v): v is number => v !== null))
  if (!n || !todos.length) return <p className="nota">Sin datos todavía.</p>
  const min = Math.floor(Math.min(...todos) - 0.5)
  const max = Math.ceil(Math.max(...todos) + 0.5)
  const x = (i: number) => izq + (n <= 1 ? (ANCHO - izq - der) / 2 : (i * (ANCHO - izq - der)) / (n - 1))
  const y = (v: number) => arr + ((max - v) / (max - min || 1)) * (alto - arr - abj)
  const marcas = [min, Math.round((min + max) / 2), max]
  const cadaX = Math.max(1, Math.ceil(n / 7))

  const mover = (e: EventoPuntero<SVGRectElement>) => {
    const r = caja.current!.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * ANCHO
    const i = Math.round(((px - izq) / (ANCHO - izq - der)) * (n - 1))
    setIndice(Math.max(0, Math.min(n - 1, n <= 1 ? 0 : i)))
  }

  return (
    <div className="grafico">
      <Leyenda series={series} />
      <div className="grafico__lienzo">
        <svg ref={caja} viewBox={`0 0 ${ANCHO} ${alto}`} width="100%" role="img" aria-label={series.map((s) => s.nombre).join(', ')}>
          {marcas.map((m) => (
            <g key={m}>
              <line x1={izq} x2={ANCHO - der} y1={y(m)} y2={y(m)} stroke="var(--borde)" />
              <text x={izq - 5} y={y(m) + 3.5} fontSize="10" textAnchor="end" fill="var(--texto-2)">{m}</text>
            </g>
          ))}
          {etiquetas.map((e, i) => ((i % cadaX === 0 && n - 1 - i >= Math.max(2, cadaX * 0.8)) || i === n - 1) && (
            <text key={i} x={x(i)} y={alto - 6} fontSize="9.5" textAnchor="middle" fill="var(--texto-2)">{e}</text>
          ))}
          {series.map((s) => {
            let d = ''
            s.valores.forEach((v, i) => {
              if (v === null) return
              d += `${d ? 'L' : 'M'}${x(i)},${y(v)}`
            })
            return <path key={s.id} d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          })}
          {series.length > 1 && series.length <= 4 &&
            etiquetasFinales(series, y).map((l) => (
              <text key={l.id} x={x(n - 1) + 5} y={l.y + 3.5} fontSize="10" fill="var(--texto-2)">
                {l.nombre.length > 8 ? l.nombre.slice(0, 7) + '…' : l.nombre}
              </text>
            ))}
          {indice !== null && (
            <g>
              <line x1={x(indice)} x2={x(indice)} y1={arr} y2={alto - abj} stroke="var(--texto-2)" strokeWidth="1" />
              {series.map((s) => s.valores[indice] !== null && (
                <circle key={s.id} cx={x(indice)} cy={y(s.valores[indice]!)} r="4.5" fill={s.color} stroke="var(--fondo-2)" strokeWidth="2" />
              ))}
            </g>
          )}
          <rect
            x={0} y={0} width={ANCHO} height={alto} fill="transparent" style={{ touchAction: 'pan-y' }}
            onPointerMove={mover} onPointerDown={mover} onPointerLeave={() => setIndice(null)}
          />
        </svg>
        {indice !== null && (
          <div className="tooltip-graf" style={{ left: `${(x(indice) / ANCHO) * 100}%` }}>
            <span className="tooltip-graf__x">{etiquetas[indice]}</span>
            {series.map((s) => (
              <span key={s.id} className="tooltip-graf__fila">
                <i style={{ background: s.color }} />
                <strong>{s.valores[indice] === null ? '—' : fmt(s.valores[indice]!, dec)}</strong>
                {series.length > 1 && <em>{s.nombre}</em>}
              </span>
            ))}
          </div>
        )}
      </div>
      <button className="enlace enlace--peq" onClick={() => setTabla(!tabla)}>{tabla ? 'Ocultar datos' : 'Ver datos'}</button>
      {tabla && <TablaDatos etiquetas={etiquetas} series={series} dec={dec} />}
    </div>
  )
}

/** Barra con el extremo de datos redondeado (4 px) y la base recta. */
function barra(x: number, base: number, ancho: number, alto: number, arriba: boolean): string {
  const r = Math.min(4, ancho / 2, Math.abs(alto))
  if (alto <= 0) return ''
  if (arriba) {
    const t = base - alto
    return `M${x},${base} V${t + r} Q${x},${t} ${x + r},${t} H${x + ancho - r} Q${x + ancho},${t} ${x + ancho},${t + r} V${base} Z`
  }
  const b = base + alto
  return `M${x},${base} V${b - r} Q${x},${b} ${x + r},${b} H${x + ancho - r} Q${x + ancho},${b} ${x + ancho},${b - r} V${base} Z`
}

/** Goles a favor (arriba) y en contra (abajo) por partido. */
export function GraficoGoles({ etiquetas, favor, contra }: { etiquetas: string[]; favor: number[]; contra: number[] }) {
  const [indice, setIndice] = useState<number | null>(null)
  const [tabla, setTabla] = useState(false)
  const alto = 190
  const izq = 22
  const der = 8
  const n = etiquetas.length
  if (!n) return <p className="nota">Sin partidos todavía.</p>
  const max = Math.max(1, ...favor, ...contra)
  const medio = 12 + (alto - 34) / 2
  const escala = (alto - 34) / 2 / max
  const paso = (ANCHO - izq - der) / n
  const ancho = Math.max(4, Math.min(18, paso - 4))
  const cadaX = Math.max(1, Math.ceil(n / 8))
  const [cf, cc] = COLORES_SERIE
  const series: Serie[] = [
    { id: 'gf', nombre: 'A favor', color: cf, valores: favor },
    { id: 'gc', nombre: 'En contra', color: cc, valores: contra },
  ]

  return (
    <div className="grafico">
      <Leyenda series={series} />
      <div className="grafico__lienzo">
        <svg viewBox={`0 0 ${ANCHO} ${alto}`} width="100%" role="img" aria-label="Goles a favor y en contra por partido">
          <line x1={izq} x2={ANCHO - der} y1={medio} y2={medio} stroke="var(--texto-3)" />
          <text x={izq - 5} y={medio - (max * escala) + 4} fontSize="10" textAnchor="end" fill="var(--texto-2)">{max}</text>
          <text x={izq - 5} y={medio + 3.5} fontSize="10" textAnchor="end" fill="var(--texto-2)">0</text>
          <text x={izq - 5} y={medio + max * escala + 3} fontSize="10" textAnchor="end" fill="var(--texto-2)">{max}</text>
          {etiquetas.map((e, i) => {
            const cx = izq + paso * i + paso / 2
            const activo = indice === i
            return (
              <g key={i} opacity={indice === null || activo ? 1 : 0.55}>
                <path d={barra(cx - ancho / 2, medio - 1, ancho, favor[i] * escala, true)} fill={cf} />
                <path d={barra(cx - ancho / 2, medio + 1, ancho, contra[i] * escala, false)} fill={cc} />
                {((i % cadaX === 0 && n - 1 - i >= Math.max(2, cadaX * 0.8)) || i === n - 1) && (
                  <text x={cx} y={alto - 4} fontSize="9.5" textAnchor="middle" fill="var(--texto-2)">{e}</text>
                )}
                <rect
                  x={cx - paso / 2} y={0} width={paso} height={alto - 16} fill="transparent" style={{ touchAction: 'pan-y' }}
                  onPointerEnter={() => setIndice(i)} onPointerDown={() => setIndice(i)} onPointerLeave={() => setIndice(null)}
                />
              </g>
            )
          })}
        </svg>
        {indice !== null && (
          <div className="tooltip-graf" style={{ left: `${((izq + paso * indice + paso / 2) / ANCHO) * 100}%` }}>
            <span className="tooltip-graf__x">{etiquetas[indice]}</span>
            {series.map((s) => (
              <span key={s.id} className="tooltip-graf__fila">
                <i style={{ background: s.color }} />
                <strong>{s.valores[indice]}</strong>
                <em>{s.nombre}</em>
              </span>
            ))}
          </div>
        )}
      </div>
      <button className="enlace enlace--peq" onClick={() => setTabla(!tabla)}>{tabla ? 'Ocultar datos' : 'Ver datos'}</button>
      {tabla && <TablaDatos etiquetas={etiquetas} series={series} dec={0} />}
    </div>
  )
}

/** Barras horizontales ordenadas (una sola serie, en dorado). */
export function GraficoBarrasH({ filas, dec = 2, minimo = 0 }: { filas: { id: string; nombre: string; valor: number; detalle?: string }[]; dec?: number; minimo?: number }) {
  if (!filas.length) return <p className="nota">Sin datos todavía.</p>
  const max = Math.max(...filas.map((f) => f.valor))
  return (
    <ul className="barras-h">
      {filas.map((f) => (
        <li key={f.id}>
          <span className="barras-h__nombre">{f.nombre}</span>
          <span className="barras-h__pista">
            <span style={{ width: `${Math.max(2, ((f.valor - minimo) / (max - minimo || 1)) * 100)}%` }} />
          </span>
          <span className="barras-h__valor">
            {fmt(f.valor, dec)}
            {f.detalle && <small>{f.detalle}</small>}
          </span>
        </li>
      ))}
    </ul>
  )
}
