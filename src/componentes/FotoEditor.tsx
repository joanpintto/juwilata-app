import { useEffect, useRef, useState } from 'react'

// Encuadre de la foto del jugador. Todo ocurre en el propio móvil:
// la imagen nunca sale del dispositivo. Se guarda como PNG.
// (El recorte automático del fondo queda pendiente: ver docs/DISENO.md §5.3.)

const ANCHO = 360
const ALTO = 450 // misma proporción que el hueco de la foto en la carta (388×485)

export function FotoEditor({ archivo, onListo, onCancelar }: { archivo: File; onListo: (png: string) => void; onCancelar: () => void }) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 }) // desplazamiento en px del lienzo
  const arrastre = useRef<{ x: number; y: number; px: number; py: number } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(archivo)
    const i = new Image()
    i.onload = () => setImg(i)
    i.src = url
    return () => URL.revokeObjectURL(url)
  }, [archivo])

  useEffect(() => {
    const c = lienzo.current
    if (!c || !img) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, ANCHO, ALTO)
    const base = Math.max(ANCHO / img.width, ALTO / img.height)
    const esc = base * zoom
    const w = img.width * esc
    const h = img.height * esc
    // Por defecto se centra en horizontal y se prioriza la parte de arriba (la cara).
    const x = (ANCHO - w) / 2 + pos.x
    const y = Math.min(0, (ALTO - h) * 0.25) + pos.y
    ctx.drawImage(img, x, y, w, h)
  }, [img, zoom, pos])

  const escalaPantalla = () => {
    const c = lienzo.current
    return c ? ANCHO / c.getBoundingClientRect().width : 1
  }

  return (
    <div className="velo">
      <div className="dialogo foto-editor">
        <h2>Encuadra la foto</h2>
        <p className="nota">Arrastra para mover y usa la barra para acercar. La cara, en la parte de arriba.</p>
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
        <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Acercar" />
        <div className="dialogo__botones">
          <button className="boton boton--sec" onClick={onCancelar}>Cancelar</button>
          <button className="boton" disabled={!img} onClick={() => lienzo.current && onListo(lienzo.current.toDataURL('image/png'))}>
            Usar foto
          </button>
        </div>
      </div>
    </div>
  )
}
