import { DISENOS, DISENOS_MISTER } from './disenos'

// Carga (una vez) las plantillas SVG de las cartas desde public/cartas/.
// El service worker las guarda para que funcionen sin conexión.

const BASE = import.meta.env.BASE_URL
const SVG_NS = 'http://www.w3.org/2000/svg'
const listas = new Map<string, Document>()
const imagenesCapas: string[] = []

// Cada plantilla tiene ~2.000 elementos de decoración (panal, estrellas, brillos,
// sombra con desenfoque) que nunca cambian. Dibujarlos en cada carta hacía la app
// muy lenta en iPhone. Se separan una vez en dos imágenes (lo de detrás de la foto y
// el marco) que el navegador pinta y reutiliza; en la carta solo quedan la foto,
// los textos y los números.
const DELANTE_DE_LA_DECORACION = new Set(['marca_agua', 'jugador', 'panel'])

function aplanar(doc: Document) {
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
  const capa = (contenido: string) => {
    const texto = `<svg xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${vb}" width="${vw}" height="${vh}">${defs ? ser.serializeToString(defs) : ''}<g transform="${transform}">${contenido}</g></svg>`
    const url = URL.createObjectURL(new Blob([texto], { type: 'image/svg+xml' }))
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
    const url = capa(`${antes.map((e) => ser.serializeToString(e)).join('')}<g ${attrs}>${[...degradados, ...deco].map((e) => ser.serializeToString(e)).join('')}</g>`)
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

  // Capa del marco (encima de la foto).
  const marco = carta.querySelector(':scope > [id="marco"]')
  if (marco) {
    const url = capa(`<g>${ser.serializeToString(marco)}</g>`)
    carta.replaceChild(imagen(url, vx - tx, vy - ty), marco)
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
          aplanar(doc)
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
