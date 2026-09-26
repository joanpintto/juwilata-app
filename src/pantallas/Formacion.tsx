import { useEffect, useRef, useState, type MouseEvent as EventoRaton, type PointerEvent as EventoPuntero } from 'react'
import { SOLO_LECTURA, db, ESQUEMAS } from '../db'
import { SUBPESTANAS_PLANTILLA, fmt1, ir, type Datos } from '../datos'
import { nombrePosicion } from '../motor/config'
import { MiniCarta, MiniCartaMister } from '../componentes/Carta'
import { disenoDe, disenoMister } from '../componentes/disenos'
import { Cabecera, Icono, Subpestanas, Vacio } from '../componentes/ui'

type Seleccion = { tipo: 'slot'; id: string } | { tipo: 'banco'; jugadorId: string } | null
type Origen = { tipo: 'slot'; id: string; jugadorId: string } | { tipo: 'banco'; jugadorId: string }

/** Zona sobre la que está el dedo: «slot:<id>» o «banco». */
function zonaEn(x: number, y: number): string | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const z = (el as HTMLElement).closest?.('[data-zona]')
    if (z) return z.getAttribute('data-zona')
  }
  return null
}

export function Formacion({ datos }: { datos: Datos }) {
  const { equipo, jugadores, calculo, config, mister, misterFicha } = datos
  const [sel, setSel] = useState<Seleccion>(null)
  const esquema = ESQUEMAS[equipo.formacion.esquema] ? equipo.formacion.esquema : '1-3-2-1'
  const posiciones = ESQUEMAS[esquema]
  const existe = (id: string | null | undefined) => !!id && jugadores.some((j) => j.id === id)
  const slots: Record<string, string | null> = Object.fromEntries(
    posiciones.map((p) => [p.id, existe(equipo.formacion.slots[p.id]) ? equipo.formacion.slots[p.id] : null]),
  )
  const enCampo = new Set(Object.values(slots).filter(Boolean) as string[])
  const banquillo = jugadores.filter((j) => !enCampo.has(j.id))
  const titulares = [...enCampo].map((id) => calculo.jugadores[id]?.media ?? 0)
  const mediaTitulares = titulares.length ? titulares.reduce((a, b) => a + b, 0) / titulares.length : null

  const guardar = (nuevos: Record<string, string | null>, nuevoEsquema = esquema) =>
    db.equipo.update('equipo', { formacion: { esquema: nuevoEsquema, slots: nuevos } })

  const tocarSlot = async (id: string) => {
    if (!sel) return setSel({ tipo: 'slot', id })
    if (sel.tipo === 'slot') {
      if (sel.id !== id) await guardar({ ...slots, [id]: slots[sel.id], [sel.id]: slots[id] })
      return setSel(null)
    }
    await guardar({ ...slots, [id]: sel.jugadorId })
    setSel(null)
  }

  const tocarBanco = async (jugadorId: string) => {
    if (sel?.tipo === 'slot') {
      await guardar({ ...slots, [sel.id]: jugadorId })
      return setSel(null)
    }
    setSel(sel?.tipo === 'banco' && sel.jugadorId === jugadorId ? null : { tipo: 'banco', jugadorId })
  }

  const quitar = async () => {
    if (sel?.tipo !== 'slot') return
    await guardar({ ...slots, [sel.id]: null })
    setSel(null)
  }

  // ─── Arrastrar (si el dedo se mueve) o tocar (si no) ───
  const gesto = useRef<{ x: number; y: number; origen: Origen; arrastrando: boolean } | null>(null)
  const [fantasma, setFantasma] = useState<{ x: number; y: number; jugadorId: string } | null>(null)
  const [zona, setZona] = useState<string | null>(null)

  // Mientras se arrastra, acercar el dedo al borde de la pantalla la desplaza
  // (el banquillo queda por debajo del campo).
  const dedo = useRef<{ x: number; y: number } | null>(null)
  const arrastrando = fantasma !== null
  useEffect(() => {
    if (!arrastrando) return
    let marco = 0
    const paso = () => {
      const d = dedo.current
      if (d) {
        const margen = 80
        const v = d.y > window.innerHeight - margen ? 14 : d.y < margen ? -14 : 0
        if (v) {
          window.scrollBy(0, v)
          setZona(zonaEn(d.x, d.y))
        }
      }
      marco = requestAnimationFrame(paso)
    }
    marco = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(marco)
  }, [arrastrando])

  const soltarEn = async (origen: Origen, z: string) => {
    if (z === 'banco') {
      if (origen.tipo === 'slot') await guardar({ ...slots, [origen.id]: null })
    } else {
      const destino = z.slice('slot:'.length)
      if (origen.tipo === 'slot') {
        if (origen.id !== destino) await guardar({ ...slots, [destino]: slots[origen.id], [origen.id]: slots[destino] })
      } else {
        await guardar({ ...slots, [destino]: origen.jugadorId })
      }
    }
    setSel(null)
  }

  const eventos = (origenReal: Origen | null, alTocarReal: () => void) => {
    // Espectador: la formación se ve pero no se toca.
    const origen = SOLO_LECTURA ? null : origenReal
    const alTocar = SOLO_LECTURA ? () => {} : alTocarReal
    return {
    onPointerDown: (e: EventoPuntero<HTMLElement>) => {
      if (!origen) return
      gesto.current = { x: e.clientX, y: e.clientY, origen, arrastrando: false }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: EventoPuntero<HTMLElement>) => {
      const g = gesto.current
      if (!g) return
      if (!g.arrastrando && Math.hypot(e.clientX - g.x, e.clientY - g.y) < 8) return
      g.arrastrando = true
      dedo.current = { x: e.clientX, y: e.clientY }
      setFantasma({ x: e.clientX, y: e.clientY, jugadorId: g.origen.jugadorId })
      setZona(zonaEn(e.clientX, e.clientY))
    },
    onPointerUp: async (e: EventoPuntero<HTMLElement>) => {
      const g = gesto.current
      gesto.current = null
      if (!g || !g.arrastrando) return alTocar()
      setFantasma(null)
      setZona(null)
      const z = zonaEn(e.clientX, e.clientY)
      if (z) await soltarEn(g.origen, z)
    },
    onPointerCancel: () => {
      gesto.current = null
      setFantasma(null)
      setZona(null)
    },
    // Teclado (sin puntero): se comporta como un toque.
    onClick: (e: EventoRaton) => {
      if (e.detail === 0) alTocar()
    },
  }
  }

  const mini = (id: string, ancho: number) => {
    const e = calculo.jugadores[id]
    return <MiniCarta jugador={e.jugador} media={e.media} diseno={disenoDe(e.jugador, e.media, config, e.rangosAlcanzados)} config={config} ancho={ancho} />
  }

  return (
    <>
      <Cabecera
        titulo="Plantilla"
        sub={`${jugadores.length} jugadores · formación ${esquema}`}
        acciones={
          <button className="boton boton--peq editable" onClick={() => ir('/jugador/nuevo')}>
            <Icono nombre="mas" tam={18} /> Añadir
          </button>
        }
      />
      <Subpestanas opciones={SUBPESTANAS_PLANTILLA} activa="formacion" />

      <div className="segmentos segmentos--esquemas editable">
        {Object.keys(ESQUEMAS).map((k) => (
          <button key={k} className={k === esquema ? 'activa' : ''} onClick={() => guardar(slots, k)}>
            {k}
          </button>
        ))}
      </div>

      {jugadores.length === 0 ? (
        <Vacio
          titulo="Sin jugadores"
          texto="Añade a tu plantilla, portero incluido, para montar la formación. Todos empiezan con carta de Bronce."
          accion={<button className="boton editable" onClick={() => ir('/jugador/nuevo')}>Añadir el primero</button>}
        />
      ) : (
        <>
          <div className="campo-f7">
            <div className="campo-f7__lineas" aria-hidden="true">
              <div className="linea-medio" />
              <div className="circulo" />
              <div className="area area--arriba" />
              <div className="area area--abajo" />
            </div>
            {posiciones.map((p) => {
              const jid = slots[p.id]
              const activo = sel?.tipo === 'slot' && sel.id === p.id
              return (
                <button
                  key={p.id}
                  data-zona={`slot:${p.id}`}
                  className={`hueco ${activo ? 'hueco--sel' : ''} ${jid ? '' : 'hueco--vacio'} ${zona === `slot:${p.id}` ? 'hueco--destino' : ''} ${fantasma && jid === fantasma.jugadorId ? 'hueco--origen' : ''}`}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  {...eventos(jid ? { tipo: 'slot', id: p.id, jugadorId: jid } : null, () => tocarSlot(p.id))}
                  aria-label={jid ? undefined : `Hueco de ${nombrePosicion(p.pos)}`}
                >
                  {jid ? mini(jid, 70) : <span>{p.pos}</span>}
                </button>
              )
            })}
            <button className="mister-campo" onClick={() => ir('/mister')} aria-label="Ficha del míster">
              <MiniCartaMister mister={misterFicha} media={mister.media} diseno={disenoMister(misterFicha, mister.media, config, mister.rangosAlcanzados)} ancho={54} />
            </button>
          </div>

          <p className="nota centro editable">
            {sel ? (sel.tipo === 'slot' ? 'Toca otro hueco para intercambiar o un suplente para ponerlo.' : 'Toca un hueco del campo para colocarlo.') : 'Arrastra un jugador a otro hueco o al banquillo, o tócalo y después toca dónde va.'}
            {sel?.tipo === 'slot' && slots[sel.id] && (
              <>
                {' '}
                <button className="enlace" onClick={quitar}>Mandar al banquillo</button>
              </>
            )}
          </p>

          <div className="media-titulares">
            <span>Media de los titulares</span>
            <strong>{mediaTitulares !== null ? fmt1(mediaTitulares) : '—'}</strong>
          </div>

          <div className={`banquillo ${zona === 'banco' ? 'banquillo--destino' : ''}`} data-zona="banco">
            {banquillo.length === 0 && <p className="nota">Banquillo vacío.</p>}
            {banquillo.map((j) => (
              <button
                key={j.id}
                className={`${sel?.tipo === 'banco' && sel.jugadorId === j.id ? 'hueco--sel' : ''} ${fantasma?.jugadorId === j.id ? 'hueco--origen' : ''}`}
                {...eventos({ tipo: 'banco', jugadorId: j.id }, () => tocarBanco(j.id))}
              >
                {mini(j.id, 54)}
              </button>
            ))}
          </div>
        </>
      )}
      {fantasma && (
        <div className="fantasma" style={{ left: fantasma.x, top: fantasma.y }} aria-hidden="true">
          {mini(fantasma.jugadorId, 70)}
        </div>
      )}
    </>
  )
}
