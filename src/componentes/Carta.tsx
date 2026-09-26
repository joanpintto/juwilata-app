import { useEffect, useId, useMemo, useState } from 'react'
import type { Jugador, Mister } from '../db'
import { mediaVisible } from '../motor/calculo'
import { ETIQUETAS_MISTER, etiquetas, rolPorId, type Atributos, type Config } from '../motor/config'
import { nombreMister, nombreVisible } from '../datos'
import { DISENOS, DISENOS_MISTER } from './disenos'
import { cargarPlantilla, plantillaLista } from './plantillas'

// Las cartas son las 11 plantillas aprobadas (public/cartas/*.svg, generadas
// con `npm run cartas`). Aquí solo se rellenan con los datos del jugador.

const SVG_NS = 'http://www.w3.org/2000/svg'

function usePlantilla(archivo: string): Document | null {
  const [, setVersion] = useState(0)
  useEffect(() => {
    if (!plantillaLista(archivo)) cargarPlantilla(archivo).then(() => setVersion((v) => v + 1)).catch(() => {})
  }, [archivo])
  return plantillaLista(archivo)
}

/** Lo que cambia de una carta a otra (jugador o míster). */
interface Relleno {
  nombre: string
  sigla: string // rol del jugador o ENT
  dorsal: string // #9 o la formación favorita del míster
  foto: string | null
  etiquetas: readonly string[]
  media: number
  atributos: Atributos
  tendencia: number
  mini: boolean
}

function crear(nombre: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS(SVG_NS, nombre)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v))
  return el
}

/** Tamaño de letra para que el nombre quepa en el ancho disponible. */
function tamNombre(texto: string, max: number, ancho: number, espaciado: number): number {
  const porLetra = ancho / Math.max(1, texto.length)
  return Math.max(12, Math.min(max, (porLetra - espaciado) / 0.5))
}

function construir(doc: Document, r: Relleno, uid: string): string {
  const svg = doc.documentElement.cloneNode(true) as unknown as SVGSVGElement
  const $ = (id: string) => svg.querySelector(`[id="${id}"]`)
  const quitar = (...ids: string[]) => ids.forEach((id) => $(id)?.remove())
  const texto = (id: string, t: string) => {
    const el = $(id)
    if (el) el.textContent = t
    return el
  }

  const nombre = r.nombre.toUpperCase()
  texto('media', String(mediaVisible(r.media)))
  texto('sigla', r.sigla)
  texto('dorsal', r.dorsal)

  // Foto real (o silueta si aún no tiene).
  const hueco = $('foto')
  if (hueco) {
    const [x, y, w, h] = ['data-x', 'data-y', 'data-w', 'data-h'].map((a) => Number(hueco.getAttribute(a)))
    if (r.foto) {
      hueco.appendChild(crear('image', { href: r.foto, x, y, width: w, height: h, preserveAspectRatio: 'xMidYMin slice' }))
    } else {
      const g = crear('g', { fill: '#000', 'fill-opacity': '0.2' })
      const cx = x + w / 2
      g.appendChild(crear('circle', { cx, cy: y + h * 0.3, r: w * 0.11 }))
      g.appendChild(crear('path', { d: `M${cx - w * 0.27} ${y + h * 0.8} Q${cx - w * 0.26} ${y + h * 0.47} ${cx} ${y + h * 0.46} Q${cx + w * 0.26} ${y + h * 0.47} ${cx + w * 0.27} ${y + h * 0.8} Z` }))
      hueco.appendChild(g)
    }
  }

  if (r.mini) {
    // §7.3: sin estadísticas, escudo, dorsal, tendencia ni marca de agua; media y rol más grandes.
    quitar('stats', 'regla', 'rombo', 'marca_agua', 'escudo_uso', 'dorsal', 'separador', 'tendencia')
    const media = $('media')
    media?.setAttribute('font-size', '150')
    media?.setAttribute('y', '198')
    const sigla = $('sigla')
    sigla?.setAttribute('font-size', '58')
    sigla?.setAttribute('y', '256')
    const n = texto('nombre', nombre)
    n?.setAttribute('font-size', String(tamNombre(nombre, 66, 330, 1.5)))
    n?.setAttribute('letter-spacing', '1.5')
    n?.setAttribute('y', '478')
    svg.setAttribute('viewBox', '34 30 396 564')
  } else {
    const n = texto('nombre', nombre)
    n?.setAttribute('font-size', String(tamNombre(nombre, 31, 320, 2.5)))

    const tend = $('tendencia')
    // Lo que ha cambiado el número que se ve en la carta (p. ej. de 60,0 a 61,5 → ▲ 1).
    const puntos = Math.abs(mediaVisible(r.media) - mediaVisible(r.media - r.tendencia))
    if (tend && Math.abs(r.tendencia) >= 0.005) {
      const sube = r.tendencia > 0
      tend.querySelector('rect')?.setAttribute('fill', sube ? '#1e6b46' : '#8a2530')
      const t = tend.querySelector('text')
      if (t) {
        t.textContent = `${sube ? '▲' : '▼'}${puntos ? ` ${puntos}` : ''}`
        t.setAttribute('fill', sube ? '#eafff0' : '#ffe9ec')
      }
    } else {
      tend?.remove()
    }

    const labels = r.etiquetas
    const stats = [...($('stats')?.querySelectorAll('text') ?? [])]
    stats.forEach((t, i) => {
      t.textContent = i % 2 === 0 ? labels[i / 2] : String(Math.round(r.atributos[(i - 1) / 2]))
    })
  }

  // Los id se prefijan para que varias cartas en la misma pantalla no se pisen.
  const ids = new Set<string>()
  svg.querySelectorAll('[id]').forEach((el) => {
    ids.add(el.id)
    el.id = uid + el.id
  })
  svg.querySelectorAll('*').forEach((el) => {
    for (const a of [...el.attributes]) {
      if ((a.name === 'href' || a.name === 'xlink:href') && a.value.startsWith('#') && ids.has(a.value.slice(1))) {
        el.setAttribute(a.name, `#${uid}${a.value.slice(1)}`)
      } else if (a.value.includes('url(#')) {
        el.setAttribute(a.name, a.value.replace(/url\(#([^)]+)\)/g, (m, id) => (ids.has(id) ? `url(#${uid}${id})` : m)))
      }
    }
  })

  svg.removeAttribute('height')
  svg.setAttribute('width', '100%')
  svg.setAttribute('aria-hidden', 'true')
  return new XMLSerializer().serializeToString(svg)
}

function CartaBase({ archivo, ancho, clase, etiqueta, ...r }: Relleno & { archivo: string; ancho: number | string; clase: string; etiqueta: string }) {
  const uid = 'c' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const doc = usePlantilla(archivo)
  const { nombre, sigla, dorsal, foto, etiquetas: labels, media, atributos, tendencia, mini } = r
  const html = useMemo(
    () => (doc ? construir(doc, { nombre, sigla, dorsal, foto, etiquetas: labels, media, atributos, tendencia, mini }, uid) : null),
    [doc, nombre, sigla, dorsal, foto, labels, media, atributos, tendencia, mini, uid],
  )
  return (
    <div className={clase} style={{ width: ancho }} role="img" aria-label={etiqueta}>
      {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <div className={`${clase}__hueco`} />}
    </div>
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

/** Datos de la carta de un jugador. */
function deJugador(j: Jugador, config: Config) {
  return { nombre: nombreVisible(j), sigla: rolPorId(config, j.rol).sigla, dorsal: `#${j.dorsal}`, foto: j.foto, etiquetas: etiquetas(j.posicion) }
}

export function Carta(p: CartaProps) {
  return (
    <CartaBase
      {...deJugador(p.jugador, p.config)}
      archivo={(DISENOS[p.diseno] ?? DISENOS.bronce).archivo}
      media={p.media}
      atributos={p.atributos}
      tendencia={p.tendencia}
      mini={false}
      ancho={p.ancho ?? '100%'}
      clase="carta"
      etiqueta={`Carta ${DISENOS[p.diseno]?.nombre ?? ''} de ${nombreVisible(p.jugador)}, media ${mediaVisible(p.media)}`}
    />
  )
}

const SIN_ATRIBUTOS: Atributos = [0, 0, 0, 0, 0, 0]

export interface MiniCartaProps {
  jugador: Jugador
  media: number
  diseno: string
  config: Config
  ancho?: number
}

/** Miniatura real de la carta activa (§7.3). */
export function MiniCarta({ ancho = 70, ...p }: MiniCartaProps) {
  return (
    <CartaBase
      {...deJugador(p.jugador, p.config)}
      archivo={(DISENOS[p.diseno] ?? DISENOS.bronce).archivo}
      media={p.media}
      atributos={SIN_ATRIBUTOS}
      tendencia={0}
      mini
      ancho={ancho}
      clase="minicarta"
      etiqueta={`${nombreVisible(p.jugador)}, ${mediaVisible(p.media)}`}
    />
  )
}

// ─── Carta del míster (§20.5) ─────────────────────────────────────────

function deMister(m: Mister) {
  return { nombre: nombreMister(m), sigla: 'ENT', dorsal: m.formacion, foto: m.foto, etiquetas: ETIQUETAS_MISTER }
}

export interface CartaMisterProps {
  mister: Mister
  media: number
  atributos: Atributos
  tendencia: number
  diseno: string
  ancho?: number | string
}

export function CartaMister(p: CartaMisterProps) {
  return (
    <CartaBase
      {...deMister(p.mister)}
      archivo={(DISENOS_MISTER[p.diseno] ?? DISENOS_MISTER.debutante).archivo}
      media={p.media}
      atributos={p.atributos}
      tendencia={p.tendencia}
      mini={false}
      ancho={p.ancho ?? '100%'}
      clase="carta"
      etiqueta={`Carta ${DISENOS_MISTER[p.diseno]?.nombre ?? ''} de ${nombreMister(p.mister)}, media ${mediaVisible(p.media)}`}
    />
  )
}

export function MiniCartaMister({ ancho = 70, ...p }: { mister: Mister; media: number; diseno: string; ancho?: number }) {
  return (
    <CartaBase
      {...deMister(p.mister)}
      archivo={(DISENOS_MISTER[p.diseno] ?? DISENOS_MISTER.debutante).archivo}
      media={p.media}
      atributos={SIN_ATRIBUTOS}
      tendencia={0}
      mini
      ancho={ancho}
      clase="minicarta"
      etiqueta={`${nombreMister(p.mister)}, ${mediaVisible(p.media)}`}
    />
  )
}
