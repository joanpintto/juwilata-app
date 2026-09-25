import { DISENOS } from './disenos'

// Carga (una vez) las plantillas SVG de las cartas desde public/cartas/.
// El service worker las guarda para que funcionen sin conexión.

const BASE = import.meta.env.BASE_URL
const listas = new Map<string, Document>()
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
        listas.set(archivo, doc)
        return doc
      })
    p.catch(() => cargando.delete(archivo))
    cargando.set(archivo, p)
  }
  return p
}

/** Descarga todas las plantillas al abrir la app, para que las listas salgan al instante. */
export function precargarCartas(): Promise<unknown> {
  return Promise.all(Object.values(DISENOS).map((d) => cargarPlantilla(d.archivo).catch(() => null)))
}
