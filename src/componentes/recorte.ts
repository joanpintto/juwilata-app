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

/**
 * Devuelve la imagen con el fondo transparente. La máscara del modelo se suaviza
 * un poco para que el borde no quede dentado.
 */
export async function quitarFondo(imagen: HTMLImageElement): Promise<HTMLCanvasElement> {
  const seg = await segmentador()
  // Tamaño de trabajo: suficiente para la carta y rápido en el móvil.
  const escala = Math.min(1, 1024 / Math.max(imagen.naturalWidth, imagen.naturalHeight))
  const w = Math.round(imagen.naturalWidth * escala)
  const h = Math.round(imagen.naturalHeight * escala)
  const base = document.createElement('canvas')
  base.width = w
  base.height = h
  base.getContext('2d')!.drawImage(imagen, 0, 0, w, h)

  const r = seg.segment(base)
  const fondo = r.confidenceMasks![0] // en el modelo multiclase, la categoría 0 es el fondo
  const mw = fondo.width
  const mh = fondo.height
  const valores = fondo.getAsFloat32Array()
  const alfa = new Uint8ClampedArray(mw * mh * 4)
  for (let i = 0; i < mw * mh; i++) {
    const persona = 1 - valores[i]
    // Curva suave: por debajo de 0,4 transparente, por encima de 0,65 opaco.
    const a = Math.min(1, Math.max(0, (persona - 0.4) / 0.25))
    alfa[i * 4 + 3] = Math.round(a * 255)
  }
  r.close()

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
  ctx.filter = 'blur(0.8px)'
  ctx.drawImage(mascara, 0, 0, w, h)
  return salida
}
