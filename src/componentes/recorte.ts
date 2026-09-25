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

/**
 * Devuelve la imagen con el fondo transparente. La máscara del modelo se suaviza
 * un poco para que el borde no quede dentado.
 */
export async function quitarFondo(imagen: HTMLImageElement): Promise<HTMLCanvasElement> {
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
  for (let i = 0; i < mw * mh; i++) {
    // Curva suave: por debajo de 0,35 transparente, por encima de 0,7 opaco.
    persona[i] = Math.min(1, Math.max(0, (1 - valores[i] - 0.35) / 0.35))
  }
  r.close()
  const suave = suavizar(persona, mw, mh, Math.max(1, Math.round(Math.max(mw, mh) / 700)))
  const alfa = new Uint8ClampedArray(mw * mh * 4)
  for (let i = 0; i < mw * mh; i++) alfa[i * 4 + 3] = Math.round(suave[i] * 255)

  const mascara = document.createElement('canvas')
  mascara.width = mw
  mascara.height = mh
  mascara.getContext('2d')!.putImageData(new ImageData(alfa, mw, mh), 0, 0)

  const salida = document.createElement('canvas')
  salida.width = w
  salida.height = h
  const ctx = salida.getContext('2d')!
  ctx.drawImage(base, 0, 0)
  ctx.globalCompositeOperation = 'destination-in'
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(mascara, 0, 0, w, h)
  return salida
}
