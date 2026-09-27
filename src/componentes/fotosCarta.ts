// Foto del jugador lista para la carta: con el recorte de la forma de la carta y el
// degradado de abajo ya aplicados, como imagen de píxeles (PNG). Antes era una
// máscara SVG que Safari volvía a calcular cada vez que pintaba una carta.
// Se prepara una vez por foto (en segundo plano) y se guarda en memoria.

// Hueco de la foto en la carta (el mismo en todas las plantillas) y degradado del 78 % al 100 %.
export const HUECO_FOTO = { x: -2, y: 26, w: 388, h: 485 }
const FADE_DESDE = 0.78

const listas = new Map<string, string>()
const enCurso = new Set<string>()
const oyentes = new Set<() => void>()

export const claveFoto = (foto: string) => `${foto.length}:${foto.slice(-80)}`

/** Dirección de la foto ya preparada (vacío si aún no está); para saber cuándo redibujar una carta. */
export const fotoLista = (foto: string | null) => (foto ? (listas.get(claveFoto(foto)) ?? '') : '')
export function suscribirFotos(fn: () => void) {
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}

/** Colocación de la foto (xMidYMin slice) en coordenadas de la carta. */
export function colocacion(ancho: number, alto: number) {
  const s = Math.max(HUECO_FOTO.w / ancho, HUECO_FOTO.h / alto)
  return { s, x: HUECO_FOTO.x + (HUECO_FOTO.w - ancho * s) / 2, y: HUECO_FOTO.y, w: ancho * s, h: alto * s }
}

/** La foto preparada si ya está; si no, empieza a prepararla y devuelve null. */
export function fotoCarta(foto: string, silueta: string): { url: string; ancho: number; alto: number } | null {
  const clave = claveFoto(foto)
  const lista = listas.get(clave)
  if (lista) {
    const [url, ancho, alto] = lista.split('|')
    return { url, ancho: Number(ancho), alto: Number(alto) }
  }
  if (!enCurso.has(clave)) {
    enCurso.add(clave)
    preparar(foto, silueta)
      .then((r) => {
        listas.set(clave, r)
        oyentes.forEach((fn) => fn())
      })
      .catch(() => enCurso.delete(clave))
  }
  return null
}

async function preparar(foto: string, silueta: string): Promise<string> {
  const img = new Image()
  img.src = foto
  await img.decode()
  const W = img.naturalWidth
  const H = img.naturalHeight
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('sin lienzo')
  const p = colocacion(W, H)
  // Recorte con la forma de la carta (la silueta está en coordenadas de la carta).
  if (silueta) {
    ctx.setTransform(1 / p.s, 0, 0, 1 / p.s, -p.x / p.s, -p.y / p.s)
    ctx.clip(new Path2D(silueta))
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }
  ctx.drawImage(img, 0, 0)
  // Degradado de abajo: la foto se desvanece del 78 % al 100 % del hueco.
  const y0 = (HUECO_FOTO.y + HUECO_FOTO.h * FADE_DESDE - p.y) / p.s
  const y1 = (HUECO_FOTO.y + HUECO_FOTO.h - p.y) / p.s
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/png'))
  if (!blob) throw new Error('sin imagen')
  return `${URL.createObjectURL(blob)}|${W}|${H}`
}

/** Prepara en segundo plano las fotos de todas las cartas (una tras otra, sin bloquear). */
export async function prepararFotos(fotos: (string | null | undefined)[], silueta: string) {
  for (const f of fotos) {
    if (!f || listas.has(claveFoto(f))) continue
    await new Promise((ok) => setTimeout(ok, 30))
    fotoCarta(f, silueta)
  }
}
