import { useEffect, useId, useMemo, useState } from 'react'
import type { Jugador } from '../db'
import { mediaVisible } from '../motor/calculo'
import { etiquetas, rolPorId, type Atributos, type Config } from '../motor/config'
import { nombreVisible } from '../datos'
import { DISENOS } from './disenos'
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

interface Relleno {
  jugador: Jugador
  media: number
  atributos: Atributos
  tendencia: number
  config: Config
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

  const j = r.jugador
  const nombre = nombreVisible(j).toUpperCase()
  texto('media', String(mediaVisible(r.media)))
  texto('sigla', rolPorId(r.config, j.rol).sigla)
  texto('dorsal', `#${j.dorsal}`)

  // Foto real (o silueta si aún no tiene).
  const hueco = $('foto')
  if (hueco) {
    const [x, y, w, h] = ['data-x', 'data-y', 'data-w', 'data-h'].map((a) => Number(hueco.getAttribute(a)))
    if (j.foto) {
      hueco.appendChild(crear('image', { href: j.foto, x, y, width: w, height: h, preserveAspectRatio: 'xMidYMin slice' }))
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
    const puntos = Math.round(Math.abs(r.tendencia))
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

    const labels = etiquetas(j.posicion)
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

function CartaBase({ diseno, ancho, clase, etiqueta, ...r }: Relleno & { diseno: string; ancho: number | string; clase: string; etiqueta: string }) {
  const uid = 'c' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const archivo = (DISENOS[diseno] ?? DISENOS.bronce).archivo
  const doc = usePlantilla(archivo)
  const { jugador, media, atributos, tendencia, config, mini } = r
  const html = useMemo(
    () => (doc ? construir(doc, { jugador, media, atributos, tendencia, config, mini }, uid) : null),
    [doc, jugador, media, atributos, tendencia, config, mini, uid],
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

export function Carta(p: CartaProps) {
  return (
    <CartaBase
      {...p}
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
      {...p}
      atributos={SIN_ATRIBUTOS}
      tendencia={0}
      mini
      ancho={ancho}
      clase="minicarta"
      etiqueta={`${nombreVisible(p.jugador)}, ${mediaVisible(p.media)}`}
    />
  )
}
