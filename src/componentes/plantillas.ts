import { DISENOS, DISENOS_MISTER } from './disenos'
import { CAPAS_GENERADAS } from './capasGeneradas'

// Carga (una vez) las plantillas SVG de las cartas desde public/cartas/.
// El service worker las guarda para que funcionen sin conexión.

const BASE = import.meta.env.BASE_URL
const SVG_NS = 'http://www.w3.org/2000/svg'
const listas = new Map<string, Document>()
const imagenesCapas: string[] = []

/** Huella corta de un texto (para saber si una capa ya generada sigue valiendo). */
export function huellaTexto(t: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 0x01000193)
  return (h >>> 0).toString(36) + t.length.toString(36)
}

// Capas de cada plantilla como SVG (para `scripts/generar-capas.cjs`, que las
// convierte en imágenes WebP: public/cartas/capas/). En Safari, una imagen SVG se
// vuelve a dibujar entera cada vez que se pinta; una imagen de píxeles no.
const capasSvg: Record<string, { texto: string; huella: string }> = {}
;(window as unknown as { __capasJuwilata: typeof capasSvg }).__capasJuwilata = capasSvg

// Cada plantilla tiene ~2.000 elementos de decoración (panal, estrellas, brillos,
// sombra con desenfoque) que nunca cambian. Dibujarlos en cada carta hacía la app
// muy lenta en iPhone. Se separan una vez en dos imágenes (lo de detrás de la foto y
// el marco) que el navegador pinta y reutiliza; en la carta solo quedan la foto,
// los textos y los números.
const DELANTE_DE_LA_DECORACION = new Set(['marca_agua', 'jugador', 'panel'])

/** Lo necesario para dibujar aparte (como imagen) trozos de una plantilla. */
export interface InfoPlantilla {
  vb: string
  vx: number
  vy: number
  vw: number
  vh: number
  tx: number
  ty: number
  transform: string
  defs: string
  silueta: string // forma de la carta (para recortar la foto)
}
const infos = new WeakMap<Document, InfoPlantilla>()
export const infoPlantilla = (doc: Document) => infos.get(doc) ?? null


function aplanar(doc: Document, archivo: string) {
  const raiz = doc.documentElement
  const fondo = raiz.querySelector('[id="fondo"]')
  const carta = fondo?.parentElement
  const grupo = carta?.parentElement
  if (!fondo || !carta || !grupo || grupo === raiz) return
  const vb = raiz.getAttribute('viewBox') ?? '0 0 464 632'
  const [vx, vy, vw, vh] = vb.split(/[\s,]+/).map(Number)
  const transform = grupo.getAttribute('transform') ?? ''
  const t = transform.match(/translate\(\s*([-\d.]+)[\s,]+([-\d.]+)\s*\)/)
  const [tx, ty] = t ? [Number(t[1]), Number(t[2])] : [0, 0]
  const ser = new XMLSerializer()
  const defs = raiz.querySelector('defs')
  infos.set(doc, { vb, vx, vy, vw, vh, tx, ty, transform, defs: defs ? ser.serializeToString(defs) : '', silueta: raiz.querySelector('clipPath[id="card"] path')?.getAttribute('d') ?? '' })
  const capa = (tipo: 'fondo' | 'marco', contenido: string) => {
    const texto = `<svg xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${vb}" width="${vw}" height="${vh}">${defs ? ser.serializeToString(defs) : ''}<g transform="${transform}">${contenido}</g></svg>`
    const clave = `${archivo}-${tipo}`
    const huella = huellaTexto(texto)
    capasSvg[clave] = { texto, huella }
    // Si ya está generada como imagen de píxeles (y es de esta misma versión), se usa esa.
    const url = CAPAS_GENERADAS[clave] === huella
      ? `${BASE}cartas/capas/${clave}.webp?v=${huella}`
      : URL.createObjectURL(new Blob([texto], { type: 'image/svg+xml' }))
    imagenesCapas.push(url)
    return url
  }
  const imagen = (href: string, x: number, y: number) => {
    const i = doc.createElementNS(SVG_NS, 'image')
    for (const [k, v] of Object.entries({ href, x, y, width: vw, height: vh, preserveAspectRatio: 'none' })) i.setAttribute(k, String(v))
    return i
  }

  // Capa de detrás: lo que hay antes del fondo (sombra) y la decoración del fondo.
  const antes: Element[] = []
  for (const c of [...carta.children]) {
    if (c === fondo) break
    antes.push(c)
  }
  const deco: Element[] = []
  const degradados: Element[] = [] // se copian en la imagen y se quedan también en la carta
  for (const c of [...fondo.children]) {
    if (DELANTE_DE_LA_DECORACION.has(c.id)) break
    if (c.tagName === 'linearGradient' || c.tagName === 'radialGradient') degradados.push(c)
    else deco.push(c)
  }
  if (antes.length || deco.length) {
    const attrs = [...fondo.attributes].filter((a) => a.name !== 'id').map((a) => `${a.name}="${a.value}"`).join(' ')
    const url = capa('fondo', `${antes.map((e) => ser.serializeToString(e)).join('')}<g ${attrs}>${[...degradados, ...deco].map((e) => ser.serializeToString(e)).join('')}</g>`)
    raiz.insertBefore(imagen(url, vx, vy), grupo)
    ;[...antes, ...deco].forEach((e) => e.remove())
  }

  // Media y posición (y la columna de debajo: separador y dorsal) van detrás de la
  // foto del jugador, como en las cartas oficiales. La tendencia y el escudo siguen delante.
  const jugador = fondo.querySelector(':scope > [id="jugador"]')
  if (jugador) {
    const detras = doc.createElementNS(SVG_NS, 'g')
    detras.setAttribute('id', 'cabecera_detras')
    for (const id of ['media', 'sigla', 'separador', 'dorsal']) {
      const el = carta.querySelector(`[id="${id}"]`)
      if (el) detras.appendChild(el)
    }
    fondo.insertBefore(detras, jugador)
  }
  // Lo que queda en el fondo son textos y la capa de foto (que ya lleva su recorte).
  fondo.removeAttribute('clip-path')

  // Capa del marco (encima de la foto), con el panel oscuro de abajo ya recortado con la
  // forma de la carta (el panel va justo debajo del marco y encima de la foto).
  const marco = carta.querySelector(':scope > [id="marco"]')
  const panel = fondo.querySelector(':scope > [id="panel"]')
  if (marco) {
    const conPanel = panel ? `<g clip-path="url(#card)">${ser.serializeToString(panel)}</g>` : ''
    const url = capa('marco', `${conPanel}<g>${ser.serializeToString(marco)}</g>`)
    carta.replaceChild(imagen(url, vx - tx, vy - ty), marco)
    panel?.remove()
  }
}

const cargando = new Map<string, Promise<Document>>()

export function plantillaLista(archivo: string): Document | null {
  return listas.get(archivo) ?? null
}

export function cargarPlantilla(archivo: string): Promise<Document> {
  let p = cargando.get(archivo)
  if (!p) {
    p = fetch(`${BASE}cartas/${archivo}.svg`)
      .then((r) => {
        if (!r.ok) throw new Error(`No se pudo cargar la carta ${archivo}`)
        return r.text()
      })
      .then((texto) => {
        const doc = new DOMParser().parseFromString(texto.replace('__ESCUDO__', `${BASE}escudo.png`), 'image/svg+xml')
        try {
          aplanar(doc, archivo)
        } catch {
          // si algo falla, la carta se dibuja entera (más lenta, pero igual)
        }
        listas.set(archivo, doc)
        return doc
      })
    p.catch(() => cargando.delete(archivo))
    cargando.set(archivo, p)
  }
  return p
}

/** Descarga todas las plantillas al abrir la app, para que las listas salgan al instante. */
export async function precargarCartas(): Promise<unknown> {
  await Promise.all([...Object.values(DISENOS), ...Object.values(DISENOS_MISTER)].map((d) => cargarPlantilla(d.archivo).catch(() => null)))
  // Deja preparadas las imágenes de decoración para que las cartas no salgan a medias.
  return Promise.all(imagenesCapas.map((url) => {
    const i = new Image()
    i.src = url
    return i.decode().catch(() => null)
  }))
}
