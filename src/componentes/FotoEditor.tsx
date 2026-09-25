import { useEffect, useRef, useState } from 'react'
import { modeloDescargado, quitarFondo } from './recorte'

// Encuadre de la foto del jugador, con recorte automático del fondo opcional.
// Todo ocurre en el propio móvil: la imagen nunca sale del dispositivo. Se guarda
// como PNG (con transparencia si se quita el fondo).

const ANCHO = 360
const ALTO = 450 // misma proporción que el hueco de la foto en la carta (388×485)

type Fuente = HTMLImageElement | HTMLCanvasElement

export function FotoEditor({ origen, onListo, onCancelar }: { origen: File | string; onListo: (png: string) => void; onCancelar: () => void }) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [recortada, setRecortada] = useState<HTMLCanvasElement | null>(null)
  const [sinFondo, setSinFondo] = useState(false)
  const [estado, setEstado] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 }) // desplazamiento en px del lienzo
  const arrastre = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const fuente: Fuente | null = sinFondo && recortada ? recortada : img

  useEffect(() => {
    const url = typeof origen === 'string' ? origen : URL.createObjectURL(origen)
    const i = new Image()
    i.onload = () => setImg(i)
    i.src = url
    return () => {
      if (typeof origen !== 'string') URL.revokeObjectURL(url)
    }
  }, [origen])

  useEffect(() => {
    const c = lienzo.current
    if (!c || !fuente) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, ANCHO, ALTO)
    const base = Math.max(ANCHO / fuente.width, ALTO / fuente.height)
    const esc = base * zoom
    const w = fuente.width * esc
    const h = fuente.height * esc
    // Por defecto se centra en horizontal y se prioriza la parte de arriba (la cara).
    const x = (ANCHO - w) / 2 + pos.x
    const y = Math.min(0, (ALTO - h) * 0.25) + pos.y
    ctx.drawImage(fuente, x, y, w, h)
  }, [fuente, zoom, pos])

  const alternarFondo = async () => {
    if (sinFondo) return setSinFondo(false)
    if (recortada) return setSinFondo(true)
    if (!img) return
    try {
      setEstado((await modeloDescargado()) ? 'Quitando el fondo…' : 'Preparando el recorte… La primera vez descarga unos 28 MB; después funciona sin conexión.')
      const c = await quitarFondo(img)
      setRecortada(c)
      setSinFondo(true)
      setEstado(null)
    } catch {
      setEstado('No se pudo quitar el fondo. Comprueba la conexión (solo hace falta la primera vez) e inténtalo otra vez.')
    }
  }

  const escalaPantalla = () => {
    const c = lienzo.current
    return c ? ANCHO / c.getBoundingClientRect().width : 1
  }

  const trabajando = estado !== null && !estado.startsWith('No se pudo')

  return (
    <div className="velo">
      <div className="dialogo foto-editor">
        <h2>Encuadra la foto</h2>
        <p className="nota">Arrastra para mover y usa la barra para acercar. La cara, en la parte de arriba.</p>
        <div className={`foto-editor__marco ${sinFondo ? 'foto-editor__marco--sin-fondo' : ''}`}>
          <canvas
            ref={lienzo}
            width={ANCHO}
            height={ALTO}
            className="foto-editor__lienzo"
            onPointerDown={(e) => {
              ;(e.target as Element).setPointerCapture(e.pointerId)
              arrastre.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
            }}
            onPointerMove={(e) => {
              const a = arrastre.current
              if (!a) return
              const k = escalaPantalla()
              setPos({ x: a.px + (e.clientX - a.x) * k, y: a.py + (e.clientY - a.y) * k })
            }}
            onPointerUp={() => (arrastre.current = null)}
            onPointerCancel={() => (arrastre.current = null)}
          />
          {trabajando && <div className="foto-editor__trabajando"><span className="cargando-punto" />{estado}</div>}
        </div>
        <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Acercar" />
        <button className={`boton boton--sec ${sinFondo ? 'boton--marcado' : ''}`} disabled={!img || trabajando} onClick={alternarFondo}>
          {sinFondo ? 'Volver a poner el fondo' : '✂️ Quitar fondo'}
        </button>
        {estado && !trabajando && <p className="nota baja">{estado}</p>}
        <div className="dialogo__botones">
          <button className="boton boton--sec" onClick={onCancelar}>Cancelar</button>
          <button className="boton" disabled={!fuente || trabajando} onClick={() => lienzo.current && onListo(lienzo.current.toDataURL('image/png'))}>
            Usar foto
          </button>
        </div>
      </div>
    </div>
  )
}
