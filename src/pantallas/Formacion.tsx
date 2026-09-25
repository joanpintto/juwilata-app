import { useState } from 'react'
import { db, ESQUEMAS } from '../db'
import { SUBPESTANAS_PLANTILLA, fmt1, type Datos } from '../datos'
import { nombrePosicion } from '../motor/config'
import { MiniCarta } from '../componentes/Carta'
import { disenoDe } from '../componentes/disenos'
import { Cabecera, Subpestanas, Vacio } from '../componentes/ui'

type Seleccion = { tipo: 'slot'; id: string } | { tipo: 'banco'; jugadorId: string } | null

export function Formacion({ datos }: { datos: Datos }) {
  const { equipo, jugadores, calculo, config } = datos
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

  const mini = (id: string, ancho: number) => {
    const e = calculo.jugadores[id]
    return <MiniCarta jugador={e.jugador} media={e.media} diseno={disenoDe(e.jugador, e.media, config, e.rangosAlcanzados)} config={config} ancho={ancho} />
  }

  return (
    <>
      <Cabecera titulo="Plantilla" sub="Formación" />
      <Subpestanas opciones={SUBPESTANAS_PLANTILLA} activa="formacion" />

      <div className="segmentos segmentos--esquemas">
        {Object.keys(ESQUEMAS).map((k) => (
          <button key={k} className={k === esquema ? 'activa' : ''} onClick={() => guardar(slots, k)}>
            {k}
          </button>
        ))}
      </div>

      {jugadores.length === 0 ? (
        <Vacio titulo="Sin jugadores" texto="Añade jugadores en la pestaña Jugadores para montar la formación." />
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
                  className={`hueco ${activo ? 'hueco--sel' : ''} ${jid ? '' : 'hueco--vacio'}`}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  onClick={() => tocarSlot(p.id)}
                  aria-label={jid ? undefined : `Hueco de ${nombrePosicion(p.pos)}`}
                >
                  {jid ? mini(jid, 70) : <span>{p.pos}</span>}
                </button>
              )
            })}
          </div>

          <p className="nota centro">
            {sel ? (sel.tipo === 'slot' ? 'Toca otro hueco para intercambiar o un suplente para ponerlo.' : 'Toca un hueco del campo para colocarlo.') : 'Toca un jugador y después otro hueco o jugador para cambiarlos.'}
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

          <div className="banquillo">
            {banquillo.length === 0 && <p className="nota">Banquillo vacío.</p>}
            {banquillo.map((j) => (
              <button key={j.id} className={sel?.tipo === 'banco' && sel.jugadorId === j.id ? 'hueco--sel' : ''} onClick={() => tocarBanco(j.id)}>
                {mini(j.id, 54)}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
