import { useState } from 'react'
import type { Rival } from '../db'

const NUEVO = '__nuevo__'

/**
 * Elige un rival de la lista de equipos de la liga o escribe uno nuevo
 * (se añade a la lista al guardar).
 */
export function SelectorRival({ rivales, rivalId, nombre, onChange }: {
  rivales: Rival[]
  rivalId: string | null
  nombre: string
  onChange: (v: { rivalId: string | null; nombre: string }) => void
}) {
  const [escribiendo, setEscribiendo] = useState(!rivalId && (rivales.length === 0 || nombre !== ''))

  if (escribiendo || rivales.length === 0) {
    return (
      <div className="selector-rival">
        <input
          value={nombre}
          onChange={(e) => onChange({ rivalId: null, nombre: e.target.value })}
          placeholder="Nombre del equipo rival"
          autoComplete="off"
          autoFocus={rivales.length > 0}
        />
        {rivales.length > 0 && (
          <button type="button" className="enlace" onClick={() => { setEscribiendo(false); onChange({ rivalId: null, nombre: '' }) }}>
            Elegir de la lista
          </button>
        )}
      </div>
    )
  }

  return (
    <select
      className="select"
      value={rivalId ?? ''}
      onChange={(e) => {
        if (e.target.value === NUEVO) {
          setEscribiendo(true)
          onChange({ rivalId: null, nombre: '' })
        } else {
          const r = rivales.find((x) => x.id === e.target.value)
          onChange({ rivalId: r?.id ?? null, nombre: r?.nombre ?? '' })
        }
      }}
    >
      <option value="" disabled>Elige el rival…</option>
      {rivales.map((r) => (
        <option key={r.id} value={r.id}>{r.nombre}</option>
      ))}
      <option value={NUEVO}>＋ Otro rival…</option>
    </select>
  )
}
