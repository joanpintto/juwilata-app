import { useId } from 'react'
import type { Jugador } from '../db'
import { mediaVisible } from '../motor/calculo'
import { etiquetas, rolPorId, type Atributos, type Config } from '../motor/config'
import { DISENOS, type Diseno } from './disenos'
import { nombreVisible } from '../datos'

// Forma plana con corona arriba y punta abajo (viewBox 300×420).
const FORMA = 'M16 58 Q16 44 30 44 L112 44 L128 20 L150 34 L172 20 L188 44 L270 44 Q284 44 284 58 L284 328 L150 408 L16 328 Z'

const ESCUDO = `${import.meta.env.BASE_URL}escudo.png`

function Silueta({ color }: { color: string }) {
  return (
    <g fill={color} opacity="0.35">
      <circle cx="165" cy="118" r="38" />
      <path d="M95 250 Q98 172 165 166 Q232 172 235 250 Z" />
    </g>
  )
}

function Defs({ uid, d }: { uid: string; d: Diseno }) {
  return (
    <defs>
      <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stopColor={d.fondo[0]} />
        <stop offset="1" stopColor={d.fondo[1]} />
      </linearGradient>
      <linearGradient id={`${uid}m`} x1="0" y1="0" x2="1" y2="1">
        {d.marco.map((c, i) => (
          <stop key={i} offset={d.marco.length === 1 ? 0 : i / (d.marco.length - 1)} stopColor={c} />
        ))}
      </linearGradient>
      <linearGradient id={`${uid}v`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.55" stopColor="#fff" stopOpacity="1" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <mask id={`${uid}k`}>
        <rect x="0" y="0" width="300" height="270" fill={`url(#${uid}v)`} />
      </mask>
      <clipPath id={`${uid}c`}>
        <path d={FORMA} />
      </clipPath>
      <radialGradient id={`${uid}b`}>
        <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${uid}r`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.5" stopColor="#fff" stopOpacity={d.mate ? 0.04 : 0.14} />
        <stop offset="0.7" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
    </defs>
  )
}

function Fondo({ uid, d }: { uid: string; d: Diseno }) {
  return (
    <>
      <path d={FORMA} fill={`url(#${uid}f)`} />
      <g clipPath={`url(#${uid}c)`}>
        {d.patron === 'rayas' &&
          Array.from({ length: 14 }, (_, i) => (
            <rect key={i} x={-100 + i * 36} y="-20" width="12" height="520" fill={d.suave} opacity="0.06" transform="rotate(25 150 210)" />
          ))}
        {d.patron === 'rombos' &&
          Array.from({ length: 48 }, (_, i) => {
            const x = (i % 8) * 42 + ((Math.floor(i / 8) % 2) * 21)
            const y = Math.floor(i / 8) * 70 + 20
            return <path key={i} d={`M${x} ${y} l14 22 l-14 22 l-14 -22 Z`} fill="none" stroke={d.suave} strokeOpacity="0.09" strokeWidth="1.2" />
          })}
        {d.patron === 'ondas' &&
          Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M-10 ${60 + i * 42} Q75 ${30 + i * 42} 150 ${60 + i * 42} T310 ${60 + i * 42}`} fill="none" stroke={d.marco[i % d.marco.length]} strokeOpacity="0.14" strokeWidth="2" />
          ))}
        <rect x="0" y="0" width="300" height="420" fill={`url(#${uid}r)`} />
      </g>
    </>
  )
}

function Marco({ uid, d, grosor }: { uid: string; d: Diseno; grosor: number }) {
  return (
    <>
      <path d={FORMA} fill="none" stroke={`url(#${uid}m)`} strokeWidth={d.mate ? grosor : grosor * 1.5} strokeLinejoin="round" />
      <path d={FORMA} fill="none" stroke={d.marco[0]} strokeOpacity="0.35" strokeWidth="1" transform="translate(150 226) scale(0.94) translate(-150 -226)" />
      {d.brillo && (
        <g transform="translate(200 360) scale(0.8)">
          <circle r="22" fill={`url(#${uid}b)`} opacity="0.55" />
          <path d="M0 -16 L3 -3 L16 0 L3 3 L0 16 L-3 3 L-16 0 L-3 -3 Z" fill="#fff" opacity="0.9" />
        </g>
      )}
    </>
  )
}

function Foto({ uid, foto, d }: { uid: string; foto: string | null; d: Diseno }) {
  return (
    <g mask={`url(#${uid}k)`} clipPath={`url(#${uid}c)`}>
      {foto ? (
        <image href={foto} x="78" y="52" width="176" height="212" preserveAspectRatio="xMidYMid slice" />
      ) : (
        <Silueta color={d.suave} />
      )}
    </g>
  )
}

export interface CartaProps {
  jugador: Jugador
  media: number
  atributos: Atributos
  tendencia: number
  diseno: string
  config: Config
  ancho?: number | string
}

export function Carta({ jugador, media, atributos, tendencia, diseno, config, ancho = '100%' }: CartaProps) {
  const uid = useId().replace(/:/g, '')
  const d = DISENOS[diseno] ?? DISENOS.bronce
  const rol = rolPorId(config, jugador.rol)
  const labels = etiquetas(jugador.posicion)
  const nombre = nombreVisible(jugador).toUpperCase()
  const tamNombre = nombre.length > 14 ? 21 : nombre.length > 11 ? 24 : 27

  return (
    <svg viewBox="0 0 300 420" width={ancho} role="img" aria-label={`Carta de ${nombreVisible(jugador)}, media ${mediaVisible(media)}`} className="carta">
      <Defs uid={uid} d={d} />
      <Fondo uid={uid} d={d} />
      {/* marca de agua */}
      <image href={ESCUDO} x="95" y="120" width="110" height="170" opacity="0.06" clipPath={`url(#${uid}c)`} />
      <Foto uid={uid} foto={jugador.foto} d={d} />
      <Marco uid={uid} d={d} grosor={5} />

      <g fontFamily="'Barlow Condensed', sans-serif" fill={d.texto} textAnchor="middle">
        <text x="58" y="112" fontSize="62" fontWeight="700">{mediaVisible(media)}</text>
        <text x="58" y="140" fontSize="23" fontWeight="600" fill={d.suave}>{rol.sigla}</text>
        <line x1="38" x2="78" y1="152" y2="152" stroke={d.suave} strokeOpacity="0.5" />
        <text x="58" y="176" fontSize="20" fontWeight="600">{jugador.dorsal}</text>
        {tendencia > 0.005 && <text x="58" y="202" fontSize="18" fill="#5fae86">▲</text>}
        {tendencia < -0.005 && <text x="58" y="202" fontSize="18" fill="#c85a63">▼</text>}

        <image href={ESCUDO} x="236" y="56" width="32" height="49" />

        <text x="150" y="286" fontSize={tamNombre} fontWeight="700" letterSpacing="0.5">{nombre}</text>
        <line x1="44" x2="256" y1="296" y2="296" stroke={d.suave} strokeOpacity="0.45" />
        {atributos.map((v, i) => {
          const x = 52 + i * 39.2
          return (
            <g key={i}>
              <text x={x} y="322" fontSize="21" fontWeight="700">{Math.round(v)}</text>
              <text x={x} y="338" fontSize="12" fontWeight="600" fill={d.suave}>{labels[i]}</text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

export interface MiniCartaProps {
  jugador: Jugador
  media: number
  diseno: string
  config: Config
  ancho?: number
}

/** Miniatura real de la carta activa (§7.3): sin estadísticas, escudo, dorsal ni tendencia. */
export function MiniCarta({ jugador, media, diseno, config, ancho = 70 }: MiniCartaProps) {
  const uid = useId().replace(/:/g, '')
  const d = DISENOS[diseno] ?? DISENOS.bronce
  const rol = rolPorId(config, jugador.rol)
  const nombre = nombreVisible(jugador).toUpperCase()
  const tamNombre = nombre.length > 10 ? 36 : nombre.length > 7 ? 42 : 48

  return (
    <svg viewBox="0 0 300 420" width={ancho} role="img" aria-label={`${nombreVisible(jugador)}, ${mediaVisible(media)}`} className="minicarta">
      <Defs uid={uid} d={d} />
      <Fondo uid={uid} d={d} />
      <Foto uid={uid} foto={jugador.foto} d={d} />
      <Marco uid={uid} d={d} grosor={9} />
      <g fontFamily="'Barlow Condensed', sans-serif" fill={d.texto} textAnchor="middle" fontWeight="700">
        <text x="70" y="128" fontSize="88">{mediaVisible(media)}</text>
        <text x="70" y="178" fontSize="46" fill={d.suave}>{rol.sigla}</text>
        <text x="150" y="330" fontSize={tamNombre}>{nombre}</text>
      </g>
    </svg>
  )
}
