import { useRef, type ReactNode } from 'react'

// Carta que se inclina en 3D al arrastrarla con el dedo (o el ratón) y vuelve
// sola a su sitio al soltarla. El giro está limitado para que siempre se vea
// la parte delantera. Un brillo recorre la carta según hacia dónde se incline.

const MAX = 28 // grados de inclinación como mucho
const SENSIBILIDAD = 0.4 // grados por píxel arrastrado

const limitar = (v: number) => Math.max(-MAX, Math.min(MAX, v))

export function Carta3D({ children }: { children: ReactNode }) {
  const interior = useRef<HTMLDivElement>(null)
  const sombra = useRef<HTMLDivElement>(null)
  const gesto = useRef<{ x: number; y: number; id: number } | null>(null)

  const girar = (rx: number, ry: number, soltar = false) => {
    const el = interior.current
    if (!el) return
    el.style.transition = soltar ? 'transform 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.25)' : 'transform 0.08s linear'
    // Quieta, sin transform: así Safari la dibuja nítida.
    el.style.transform = soltar ? '' : `rotateX(${rx}deg) rotateY(${ry}deg) scale(1.03)`
    const fuerza = soltar ? 0 : Math.min(1, Math.hypot(rx, ry) / MAX)
    const capa = el.querySelector<SVGElement>('[id$="brillo3d_capa"]')
    const grad = el.querySelector<SVGElement>('[id$="brillo3d"]')
    if (capa) {
      capa.style.transition = soltar ? 'opacity 0.5s' : 'none'
      capa.setAttribute('opacity', String(0.25 + 0.75 * fuerza))
      if (soltar) capa.setAttribute('opacity', '0')
    }
    // El brillo va hacia el lado que se acerca a quien mira.
    grad?.setAttribute('cx', `${50 - ry * 1.8}%`)
    grad?.setAttribute('cy', `${50 + rx * 1.8}%`)
    const s = sombra.current
    if (s) {
      s.style.transition = el.style.transition
      s.style.transform = soltar ? '' : `translate(${-ry * 0.6}px, ${rx * 0.4}px) scale(${1 - fuerza * 0.08})`
      s.style.opacity = soltar ? '' : String(0.55 - fuerza * 0.2)
    }
  }

  return (
    <div
      className="carta3d"
      onPointerDown={(e) => {
        gesto.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
        if (e.pointerType === 'mouse') e.currentTarget.setPointerCapture(e.pointerId)
        girar(0, 0)
      }}
      onPointerMove={(e) => {
        const g = gesto.current
        if (!g || g.id !== e.pointerId) return
        girar(limitar(-(e.clientY - g.y) * SENSIBILIDAD), limitar((e.clientX - g.x) * SENSIBILIDAD))
      }}
      onPointerUp={() => {
        gesto.current = null
        girar(0, 0, true)
      }}
      onPointerCancel={() => {
        gesto.current = null
        girar(0, 0, true)
      }}
    >
      <div className="carta3d__sombra" ref={sombra} aria-hidden="true" />
      <div className="carta3d__interior" ref={interior}>{children}</div>
    </div>
  )
}
