import { db, misterDe } from '../db'

// Fotos más ligeras. La original (para volver a encuadrar) basta con 1.200 px; si
// no tiene transparencia se guarda en JPEG. La de la carta (720×900) solo necesita
// PNG si se le ha quitado el fondo; si no, JPEG. Las cartas se ven igual.

const MAX_ORIGINAL = 1200
const CALIDAD = 0.85

function cargar(src: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.src = src
  return img.decode().then(() => img)
}

function tieneTransparencia(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const d = ctx.getImageData(0, 0, w, h).data
  for (let i = 3; i < d.length; i += 4 * 7) if (d[i] < 250) return true
  return false
}

/** Redibuja la imagen (como mucho `max` px de lado) y la guarda en JPEG si no tiene transparencia. */
export async function aligerar(src: string, max = Infinity): Promise<string> {
  const img = await cargar(src)
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement('canvas')
  c.width = Math.round(img.naturalWidth * k)
  c.height = Math.round(img.naturalHeight * k)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, c.width, c.height)
  const alfa = tieneTransparencia(ctx, c.width, c.height)
  if (alfa) return c.toDataURL('image/png')
  // JPEG sin transparencia: se pinta sobre negro por si algún borde tiene alfa casi total.
  const j = document.createElement('canvas')
  j.width = c.width
  j.height = c.height
  const jx = j.getContext('2d')!
  jx.fillStyle = '#000'
  jx.fillRect(0, 0, j.width, j.height)
  jx.drawImage(c, 0, 0)
  return j.toDataURL('image/jpeg', CALIDAD)
}

export const aligerarOriginal = (src: string) => aligerar(src, MAX_ORIGINAL)

/** Una sola vez: aligera las fotos ya guardadas (solo si así ocupan menos). */
export async function aligerarFotosGuardadas() {
  const CLAVE = 'juwilata-fotos-aligeradas-v1'
  try {
    if (localStorage.getItem(CLAVE)) return
  } catch {
    return
  }
  const menor = async (src: string | null | undefined, max?: number) => {
    if (!src || src.length < 60_000) return src
    try {
      const nueva = await aligerar(src, max)
      return nueva.length < src.length * 0.9 ? nueva : src
    } catch {
      return src
    }
  }
  const pausa = () => new Promise((ok) => setTimeout(ok, 50))
  for (const j of await db.jugadores.toArray()) {
    const foto = await menor(j.foto)
    await pausa()
    const fotoOriginal = await menor(j.fotoOriginal, MAX_ORIGINAL)
    await pausa()
    if (foto !== j.foto || fotoOriginal !== j.fotoOriginal) await db.jugadores.update(j.id, { foto: foto ?? null, fotoOriginal: fotoOriginal ?? null })
  }
  const eq = await db.equipo.get('equipo')
  if (eq) {
    const m = misterDe(eq)
    const foto = await menor(m.foto)
    const fotoOriginal = await menor(m.fotoOriginal, MAX_ORIGINAL)
    if (foto !== m.foto || fotoOriginal !== m.fotoOriginal) await db.equipo.update('equipo', { mister: { ...m, foto: foto ?? null, fotoOriginal: fotoOriginal ?? null } })
  }
  try {
    localStorage.setItem(CLAVE, '1')
  } catch {
    // se repetirá la próxima vez (sin efecto: ya están aligeradas)
  }
}
