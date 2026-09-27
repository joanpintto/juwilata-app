import { createContext, useContext } from 'react'
import { claveRival } from '../datos'

/** Escudos de los rivales (por nombre), para que cualquier pantalla los pinte sin pasarlos a mano. */
export const EscudosRivales = createContext<Map<string, string>>(new Map())

export const useEscudoRival = (nombre: string) => useContext(EscudosRivales).get(claveRival(nombre))

/** Reduce la foto del escudo a una imagen pequeña (PNG, conserva la transparencia). */
export async function prepararEscudo(archivo: File, lado = 160): Promise<string> {
  const img = await createImageBitmap(archivo)
  const k = Math.min(1, lado / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * k))
  const h = Math.max(1, Math.round(img.height * k))
  const lienzo = document.createElement('canvas')
  lienzo.width = w
  lienzo.height = h
  const ctx = lienzo.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)
  img.close()
  return lienzo.toDataURL('image/png')
}
