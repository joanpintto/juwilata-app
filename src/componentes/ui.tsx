import { useEffect, useState, type ReactNode } from 'react'
import { ir, volver } from '../datos'
import { registrarDialogos, type PeticionDialogo } from './dialogos'

// ─── Iconos (un solo estilo: trazo de 1,8 px, esquinas redondeadas) ───

const TRAZOS: Record<string, ReactNode> = {
  inicio: <path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5M10 20v-5.5h4V20" />,
  plantilla: (
    <>
      <path d="M8 4 4 6.5 5.5 11 7.5 10v10h9V10l2 1L20 6.5 16 4c-.6 1.5-2.2 2.5-4 2.5S8.6 5.5 8 4Z" />
    </>
  ),
  partidos: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m12 7.5 3.8 2.8-1.4 4.4H9.6L8.2 10.3Z M12 7.5V3.6 M15.8 10.3l3.9-1.3 M14.4 14.7l2.3 3.2 M9.6 14.7l-2.3 3.2 M8.2 10.3 4.3 9" />
    </>
  ),
  evoluciones: <path d="M4 19h16M5 15l4.5-4.5 3.5 3L19 7.5M15 7.5h4v4" />,
  ajustes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" />
    </>
  ),
  atras: <path d="M15 5 8 12l7 7" />,
  mas: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  puntos: (
    <>
      <circle cx="5" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="19" cy="12" r="1.3" fill="currentColor" />
    </>
  ),
  editar: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />,
  camara: (
    <>
      <path d="M4 8h3l1.5-2.5h7L17 8h3v11H4Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  cerrar: <path d="M6 6l12 12M18 6 6 18" />,
  flecha: <path d="m9 5 7 7-7 7" />,
  descargar: <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" />,
  subir: <path d="M12 16V5m0 0L7.5 9.5M12 5l4.5 4.5M5 19.5h14" />,
  deshacer: <path d="M9 7 4.5 11.5 9 16M5 11.5h9.5a5 5 0 0 1 0 10H11" />,
  estrella: <path d="m12 3.8 2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8Z" />,
}

export function Icono({ nombre, tam = 22 }: { nombre: keyof typeof TRAZOS | string; tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[nombre]}
    </svg>
  )
}

// ─── Cabecera de pantalla ──────────────────────────────────────────────

export function Cabecera({ titulo, sub, atras, acciones }: { titulo: string; sub?: string; atras?: string | true; acciones?: ReactNode }) {
  return (
    <header className="cab">
      {atras && (
        <button className="cab__atras" onClick={() => (atras === true ? volver() : ir(atras))} aria-label="Volver">
          <Icono nombre="atras" />
        </button>
      )}
      <div className="cab__texto">
        <h1>{titulo}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {acciones && <div className="cab__acciones">{acciones}</div>}
    </header>
  )
}

export function Subpestanas({ opciones, activa }: { opciones: { id: string; texto: string; ruta: string }[]; activa: string }) {
  return (
    <nav className="subpestanas">
      {opciones.map((o) => (
        <button key={o.id} className={o.id === activa ? 'activa' : ''} onClick={() => ir(o.ruta, true)}>
          {o.texto}
        </button>
      ))}
    </nav>
  )
}

export function Vacio({ titulo, texto, accion }: { titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <div className="vacio">
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
      {accion}
    </div>
  )
}

export function Contador({ valor, onChange, min = 0, max = 99 }: { valor: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="contador">
      <button type="button" onClick={() => onChange(Math.max(min, valor - 1))} disabled={valor <= min} aria-label="Restar">
        <Icono nombre="menos" tam={18} />
      </button>
      <span>{valor}</span>
      <button type="button" onClick={() => onChange(Math.min(max, valor + 1))} disabled={valor >= max} aria-label="Sumar">
        <Icono nombre="mas" tam={18} />
      </button>
    </div>
  )
}

// ─── Diálogos de confirmación y avisos (sin los feos cuadros del navegador) ───

export function DialogosRaiz() {
  const [peticion, setPeticion] = useState<PeticionDialogo | null>(null)
  const [aviso, setAviso] = useState<{ texto: string; id: number } | null>(null)

  useEffect(() => {
    return registrarDialogos(setPeticion, (texto) => setAviso({ texto, id: Date.now() }))
  }, [])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 2600)
    return () => clearTimeout(t)
  }, [aviso])

  const cerrar = (ok: boolean) => {
    peticion?.resolver(ok)
    setPeticion(null)
  }

  return (
    <>
      {peticion && (
        <div className="velo" onClick={() => cerrar(false)}>
          <div className="dialogo" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>{peticion.titulo}</h2>
            {peticion.texto && <div className="dialogo__texto">{peticion.texto}</div>}
            <div className="dialogo__botones">
              {peticion.cancelar !== null && (
                <button className="boton boton--sec" onClick={() => cerrar(false)}>{peticion.cancelar ?? 'Cancelar'}</button>
              )}
              <button className={`boton ${peticion.peligro ? 'boton--peligro' : ''}`} onClick={() => cerrar(true)}>
                {peticion.aceptar ?? 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {aviso && (
        <div className="aviso" key={aviso.id} role="status">
          {aviso.texto}
        </div>
      )}
    </>
  )
}

/** Hoja inferior genérica (menús y selectores). */
export function Hoja({ abierta, onCerrar, titulo, children }: { abierta: boolean; onCerrar: () => void; titulo?: string; children: ReactNode }) {
  if (!abierta) return null
  return (
    <div className="velo velo--abajo" onClick={onCerrar}>
      <div className="hoja" onClick={(e) => e.stopPropagation()}>
        {titulo && <h2 className="hoja__titulo">{titulo}</h2>}
        {children}
      </div>
    </div>
  )
}
