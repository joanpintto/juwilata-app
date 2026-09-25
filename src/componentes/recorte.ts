// Recorte automático del fondo de las fotos, en el propio móvil (la foto no sale de él).
// Usa el modelo de segmentación de personas de MediaPipe (public/recorte/), que se
// descarga la primera vez que se usa y queda guardado para usarlo sin conexión.
import type { ImageSegmenter } from '@mediapipe/tasks-vision'

const BASE = `${import.meta.env.BASE_URL}recorte`
let cargando: Promise<ImageSegmenter> | null = null

function segmentador(): Promise<ImageSegmenter> {
  cargando ??= (async () => {
    const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision')
    const archivos = await FilesetResolver.forVisionTasks(BASE)
    return ImageSegmenter.createFromOptions(archivos, {
      baseOptions: { modelAssetPath: `${BASE}/selfie_multiclass_256x256.tflite` },
      runningMode: 'IMAGE',
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    })
  })()
  cargando.catch(() => (cargando = null))
  return cargando
}

/** ¿Ya se descargó el modelo en este dispositivo? (para avisar del tamaño la primera vez) */
export async function modeloDescargado(): Promise<boolean> {
  try {
    return (await caches.match(`${BASE}/selfie_multiclass_256x256.tflite`)) !== undefined
  } catch {
    return false
  }
}

/** Desenfoque de caja separable sobre un canal (suaviza el borde sin depender de ctx.filter, que Safari no tiene). */
function suavizar(v: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return v
  const tmp = new Float32Array(v.length)
  const out = new Float32Array(v.length)
  const n = 2 * r + 1
  for (let y = 0; y < h; y++) {
    const f = y * w
    let s = 0
    for (let x = -r; x <= r; x++) s += v[f + Math.min(w - 1, Math.max(0, x))]
    for (let x = 0; x < w; x++) {
      tmp[f + x] = s / n
      s += v[f + Math.min(w - 1, x + r + 1)] - v[f + Math.max(0, x - r)]
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0
    for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / n
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]
    }
  }
  return out
}

/** Resultado del modelo para una foto: se calcula una vez y luego se puede ajustar el recorte al momento. */
export interface Segmentacion {
  base: HTMLCanvasElement
  persona: Float32Array // 0–1: seguridad de que cada punto es la persona
  mw: number
  mh: number
}

export async function segmentar(imagen: HTMLImageElement): Promise<Segmentacion> {
  const seg = await segmentador()
  // Tamaño de trabajo: de sobra para la carta y asumible en el móvil.
  const escala = Math.min(1, 1600 / Math.max(imagen.naturalWidth, imagen.naturalHeight))
  const w = Math.round(imagen.naturalWidth * escala)
  const h = Math.round(imagen.naturalHeight * escala)
  const base = document.createElement('canvas')
  base.width = w
  base.height = h
  const bctx = base.getContext('2d')!
  bctx.imageSmoothingQuality = 'high'
  bctx.drawImage(imagen, 0, 0, w, h)

  const r = seg.segment(base)
  const fondo = r.confidenceMasks![0] // en el modelo multiclase, la categoría 0 es el fondo
  const mw = fondo.width
  const mh = fondo.height
  const valores = fondo.getAsFloat32Array()
  const persona = new Float32Array(mw * mh)
  for (let i = 0; i < mw * mh; i++) persona[i] = 1 - valores[i]
  r.close()
  return { base, persona, mw, mh }
}

/**
 * Devuelve la foto con el fondo transparente. `holgura` va de 0 (recorte ajustado:
 * quita más fondo) a 1 (recorte suelto: conserva más, útil si el fondo se parece a
 * la ropa). El borde se suaviza para que no quede dentado.
 */
export function aplicarRecorte(s: Segmentacion, holgura: number): HTMLCanvasElement {
  const { base, persona, mw, mh } = s
  const umbral = 0.55 - holgura * 0.5 // de 0,55 (ajustado) a 0,05 (suelto)
  const mapa = new Float32Array(mw * mh)
  for (let i = 0; i < mw * mh; i++) mapa[i] = Math.min(1, Math.max(0, (persona[i] - umbral) / 0.3))
  const suave = suavizar(mapa, mw, mh, Math.max(1, Math.round(Math.max(mw, mh) / 700)))
  const alfa = new Uint8ClampedArray(mw * mh * 4)
  for (let i = 0; i < mw * mh; i++) alfa[i * 4 + 3] = Math.round(suave[i] * 255)

  const mascara = document.createElement('canvas')
  mascara.width = mw
  mascara.height = mh
  mascara.getContext('2d')!.putImageData(new ImageData(alfa, mw, mh), 0, 0)

  const salida = document.createElement('canvas')
  salida.width = base.width
  salida.height = base.height
  const ctx = salida.getContext('2d')!
  ctx.drawImage(base, 0, 0)
  ctx.globalCompositeOperation = 'destination-in'
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(mascara, 0, 0, base.width, base.height)
  return salida
}
