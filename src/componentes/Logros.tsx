import { useId, useState, type ReactNode } from 'react'
import { fechaCorta } from '../datos'
import { NOMBRE_NIVEL, type EstadoLogro, type IconoLogro } from '../motor/logros'
import { Hoja } from './ui'

// Escudos de logros (§11): marco bronce/plata/oro para los de niveles,
// dorado champán con interior granate para los únicos, gris si están pendientes.

const ICONOS: Record<IconoLogro, ReactNode> = {
  balon: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m12 7.5 3.8 2.8-1.4 4.4H9.6L8.2 10.3Z M12 7.5V3.6 M15.8 10.3l3.9-1.3 M14.4 14.7l2.3 3.2 M9.6 14.7l-2.3 3.2 M8.2 10.3 4.3 9" />
    </>
  ),
  pase: <path d="M4 17c3-7 8-9.5 14-8.5M15 5l4 3.5-4 3.5M4 17h3" />,
  guante: <path d="M7.5 21v-6L5 10.5l1.8-1.3L9 12V5.5a1.4 1.4 0 0 1 2.8 0V11V4.3a1.4 1.4 0 0 1 2.8 0V11V5.8a1.4 1.4 0 0 1 2.8 0V15c0 3.3-2.4 6-5.5 6Z" />,
  estrella: <path d="m12 3.8 2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8Z" />,
  diez: <path d="M6 7l2.5-1.5V18M13 6h3.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />,
  fuego: <path d="M12 21c-3.9 0-6.5-2.7-6.5-6.2 0-4.3 4-6 4-10.3 2.8 1.8 4.3 4 4.5 6.5 1-.8 1.7-2 1.8-3.5 2 1.9 3.2 4.6 3.2 7.3 0 3.5-3 6.2-7 6.2Z" />,
  flecha: <path d="M12 20V5M6 11l6-6 6 6M6 20h12" />,
  corona: <path d="M4 18.5h16M5 18.5 4 8l5 4 3-6.5 3 6.5 5-4-1 10.5" />,
  calendario: <path d="M5 6h14v14H5ZM5 10h14M9 3.5v4M15 3.5v4M9 14h2M13 14h2M9 17h2" />,
  limpio: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8 12.3 2.8 2.8L16.5 9" />
    </>
  ),
  carta: <path d="M7 3.5h10l2 3v11.5l-7 3-7-3V6.5ZM9.5 9.5h5M12 13v4" />,
  rayo: <path d="M13.5 3 5.5 13.5h6l-1 7.5 8-10.5h-6Z" />,
  banco: <path d="M3.5 11.5h17M5 11.5V18M19 11.5V18M5 7.5h14M8 7.5v4M16 7.5v4" />,
  muro: <path d="M4 6h16v13H4ZM4 10.3h16M4 14.7h16M10 6v4.3M15 10.3v4.4M9 14.7V19M16 14.7V19" />,
  trofeo: <path d="M8 4h8v5a4 4 0 0 1-8 0ZM8 5.5H5a3 3 0 0 0 3 4.5M16 5.5h3a3 3 0 0 1-3 4.5M12 13v4M8.5 20.5h7M10 17h4v3.5h-4Z" />,
  soldado: <path d="M5 14a7 7 0 0 1 14 0ZM3 14h18M9 17.5h6M12 7V3.5M10 5h4" />,
  fantasma: (
    <>
      <path d="M6 20.5V10a6 6 0 0 1 12 0v10.5l-2-1.8-2 1.8-2-1.8-2 1.8-2-1.8Z" />
      <path d="M9.5 10.5h.01M14.5 10.5h.01" strokeWidth="2.6" />
    </>
  ),
  palo: <path d="M10 3.5h4M12 3.5V15M12 15l-2.5 5.5M12 15l2.5 5.5M8.5 9h7" />,
  debut: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8" />,
  escudo: <path d="M12 3 19 6v6c0 5-3 8.2-7 9-4-.8-7-4-7-9V6Z" />,
}

const MARCOS = {
  1: ['#f0b88a', '#b07a52', '#6a3f22'],
  2: ['#ffffff', '#b8bec4', '#5f666c'],
  3: ['#fff0c2', '#d9a640', '#7a5a18'],
  unico: ['#f7e3c3', '#cca37c', '#8a6a4a'],
  pendiente: ['#48484e', '#35353a', '#2a2a2e'],
} as const

const FORMA = 'M50 4 L92 17 V56 C92 86 73 104 50 115 C27 104 8 86 8 56 V17 Z'

function textoCinta(e: EstadoLogro): string {
  if (e.nivel === 0) return ''
  if (e.def.niveles && e.def.unidad) return e.def.unidad(e.def.niveles[e.nivel - 1])
  if (e.def.repetible && e.veces > 1) return `×${e.veces}`
  return e.fecha ? fechaCorta(e.fecha) : ''
}

export function EscudoLogro({ estado, tam = 72 }: { estado: EstadoLogro; tam?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const conseguido = estado.nivel > 0
  const tipo = !conseguido ? 'pendiente' : estado.def.niveles ? estado.nivel : 'unico'
  const marco = MARCOS[tipo as keyof typeof MARCOS]
  const interior = !conseguido ? ['#1c1c1f', '#141416'] : tipo === 'unico' ? ['#7a1329', '#3a0612'] : ['#2a2a2e', '#151517']
  const icono = !conseguido ? '#5a5a61' : tipo === 'unico' ? '#f3dcb8' : marco[0]
  const cinta = textoCinta(estado)

  return (
    <svg viewBox="0 0 100 124" width={tam} className={`escudo-logro ${conseguido ? '' : 'escudo-logro--pendiente'}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}m`} x1="0" y1="0" x2="1" y2="1">
          {marco.map((c, i) => <stop key={i} offset={i / (marco.length - 1)} stopColor={c} />)}
        </linearGradient>
        <linearGradient id={`${uid}i`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={interior[0]} />
          <stop offset="1" stopColor={interior[1]} />
        </linearGradient>
      </defs>
      <path d={FORMA} fill={`url(#${uid}i)`} stroke={`url(#${uid}m)`} strokeWidth="5" strokeLinejoin="round" />
      <path d={FORMA} fill="none" stroke={marco[0]} strokeOpacity="0.35" strokeWidth="1" transform="translate(50 60) scale(0.86) translate(-50 -60)" />
      <g transform="translate(26 30) scale(2)" fill="none" stroke={icono} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {ICONOS[estado.def.icono]}
      </g>
      {cinta && (
        <g>
          <path d="M6 84 H94 L88 93 L94 102 H6 L12 93 Z" fill={`url(#${uid}m)`} />
          <text x="50" y="97" textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif" fontWeight="800" fontSize={cinta.length > 12 ? 10 : 12} letterSpacing="0.5" fill="#1c1208">
            {cinta.toUpperCase()}
          </text>
        </g>
      )}
      {estado.def.niveles && conseguido && (
        <g fill={marco[0]}>
          {[0, 1, 2].map((k) => (
            <circle key={k} cx={42 + k * 8} cy="18" r="2.4" opacity={k < estado.nivel ? 1 : 0.25} />
          ))}
        </g>
      )}
    </svg>
  )
}

function ordenar(estados: EstadoLogro[]): EstadoLogro[] {
  const ratio = (e: EstadoLogro) => (e.objetivo ? e.progreso / e.objetivo : 0)
  return [...estados].sort((a, b) => {
    if ((a.nivel > 0) !== (b.nivel > 0)) return a.nivel > 0 ? -1 : 1
    if (a.nivel > 0) return (b.fecha ?? '').localeCompare(a.fecha ?? '') || b.nivel - a.nivel
    return ratio(b) - ratio(a)
  })
}

export function Vitrina({ estados, vacio }: { estados: EstadoLogro[]; vacio?: string }) {
  const [abierto, setAbierto] = useState<EstadoLogro | null>(null)
  const lista = ordenar(estados)
  const conseguidos = estados.filter((e) => e.nivel > 0).length
  return (
    <>
      <p className="nota">{conseguidos ? `${conseguidos} de ${estados.length} conseguidos` : (vacio ?? 'Todavía ninguno. ¡A por el primero!')}</p>
      <div className="vitrina">
        {lista.map((e) => {
          const pendiente = e.nivel === 0 || (e.def.niveles && e.nivel < 3)
          return (
            <button key={e.def.id} className="vitrina__item" onClick={() => setAbierto(e)}>
              <EscudoLogro estado={e} />
              <span className="vitrina__nombre">{e.def.nombre}</span>
              {pendiente && e.def.niveles && (
                <span className="vitrina__progreso">
                  <span style={{ width: `${Math.min(100, (e.progreso / e.objetivo) * 100)}%` }} />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <Hoja abierta={!!abierto} onCerrar={() => setAbierto(null)}>
        {abierto && (
          <div className="logro-detalle">
            <EscudoLogro estado={abierto} tam={110} />
            <h2>{abierto.def.nombre}</h2>
            <span className="logro-detalle__cat">{abierto.def.categoria}{abierto.def.deLaCasa && abierto.def.categoria !== 'De la casa' ? ' · de la casa' : ''}</span>
            <p>{abierto.def.descripcion}</p>
            {abierto.def.niveles ? (
              <>
                <p className="nota">
                  {abierto.nivel > 0 ? `Nivel ${NOMBRE_NIVEL[abierto.nivel]}. ` : 'Pendiente. '}
                  {abierto.nivel < 3 ? `Progreso: ${abierto.progreso} de ${abierto.objetivo}.` : '¡Nivel máximo!'}
                </p>
                <div className="niveles">
                  {abierto.def.niveles.map((u, i) => (
                    <span key={u} className={abierto.nivel > i ? `nivel nivel--${i + 1}` : 'nivel'}>{NOMBRE_NIVEL[i + 1]} · {u}</span>
                  ))}
                </div>
              </>
            ) : (
              <p className="nota">
                {abierto.nivel > 0
                  ? `Conseguido${abierto.fecha ? ` el ${fechaCorta(abierto.fecha)}` : ''}${abierto.def.repetible && abierto.veces > 1 ? ` · ${abierto.veces} veces` : ''}.`
                  : 'Pendiente.'}
              </p>
            )}
          </div>
        )}
      </Hoja>
    </>
  )
}
