import { useState } from 'react'
import type { Tabla } from '../motor/config'

// Campos para editar números de la configuración (acepta coma decimal).

function leer(texto: string): number | null {
  const v = Number(texto.replace(',', '.').trim())
  return texto.trim() === '' || Number.isNaN(v) ? null : v
}

export function Numero({ valor, onChange, ancho = 64 }: { valor: number; onChange: (v: number) => void; ancho?: number }) {
  const [texto, setTexto] = useState<string | null>(null)
  return (
    <input
      className="num"
      style={{ width: ancho }}
      inputMode="decimal"
      value={texto ?? String(valor).replace('.', ',')}
      onFocus={(e) => {
        setTexto(String(valor).replace('.', ','))
        e.target.select()
      }}
      onChange={(e) => {
        setTexto(e.target.value)
        const v = leer(e.target.value)
        if (v !== null) onChange(v)
      }}
      onBlur={() => setTexto(null)}
    />
  )
}

export function EditorTabla({ titulo, ayuda, tabla, onChange, etiquetaX, etiquetaY }: { titulo: string; ayuda: string; tabla: Tabla; onChange: (t: Tabla) => void; etiquetaX: string; etiquetaY: string }) {
  return (
    <section className="tarjeta">
      <h2>{titulo}</h2>
      <p className="nota">{ayuda}</p>
      <div className="tabla-editable">
        <div className="tabla-editable__fila tabla-editable__cab">
          <span>{etiquetaX}</span>
          <span>{etiquetaY}</span>
        </div>
        {tabla.map((p, i) => (
          <div key={i} className="tabla-editable__fila">
            <span>{String(p.x).replace('.', ',')}</span>
            <Numero valor={p.y} onChange={(v) => onChange(tabla.map((q, k) => (k === i ? { ...q, y: v } : q)))} />
          </div>
        ))}
      </div>
    </section>
  )
}

export function Constante({ texto, valor, onChange }: { texto: string; valor: number; onChange: (v: number) => void }) {
  return (
    <div className="constante">
      <span>{texto}</span>
      <Numero valor={valor} onChange={onChange} />
    </div>
  )
}
