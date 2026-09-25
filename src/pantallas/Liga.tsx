import { useState } from 'react'
import { db, nuevoId, type Programado, type Rival } from '../db'
import { SUBPESTANAS_PARTIDOS, fechaCorta, ir, nombreRival, partidoDe, proximoPartido, type Datos } from '../datos'
import { SelectorRival } from '../componentes/SelectorRival'
import { rivalPorNombre } from '../componentes/rivales'
import { Cabecera, Hoja, Icono, Subpestanas, Vacio } from '../componentes/ui'
import { avisar, confirmar } from '../componentes/dialogos'

// Liga (Fase 1): calendario de nuestros partidos y equipos de la liga.
// La clasificación y los resultados entre otros equipos llegan en la Fase 2.

interface Borrador {
  id: string | null
  jornada: string
  rivalId: string | null
  rivalNombre: string
  fecha: string
  hora: string
  local: boolean
  competicion: string
}

function borradorNuevo(programados: Programado[]): Borrador {
  const ultima = programados[programados.length - 1]
  return {
    id: null,
    jornada: String((ultima?.jornada ?? 0) + 1),
    rivalId: null,
    rivalNombre: '',
    fecha: '',
    hora: ultima?.hora ?? '',
    local: ultima ? !ultima.local : true,
    competicion: ultima?.competicion ?? 'Liga',
  }
}

function FormProgramado({ inicial, rivales, programados, temporadaId, onCerrar }: {
  inicial: Borrador
  rivales: Rival[]
  programados: Programado[]
  temporadaId: string
  onCerrar: () => void
}) {
  const [b, setB] = useState(inicial)
  const [clave, setClave] = useState(0) // reinicia el selector de rival al encadenar

  const guardar = async (otro: boolean) => {
    const jornada = Number(b.jornada)
    if (!Number.isInteger(jornada) || jornada < 1 || jornada > 99) return avisar('La jornada debe ser un número del 1 al 99.')
    if (!b.rivalId && !b.rivalNombre.trim()) return avisar('Elige o escribe el rival.')
    if (programados.some((p) => p.jornada === jornada && p.id !== b.id)) return avisar(`Ya hay un partido en la jornada ${jornada}.`)
    const rivalId = b.rivalId ?? (await rivalPorNombre(b.rivalNombre)).id
    const prog: Programado = {
      id: b.id ?? nuevoId(), temporadaId, jornada, rivalId, fecha: b.fecha || null, hora: b.hora || null,
      local: b.local, competicion: b.competicion.trim() || 'Liga',
      aplazado: b.id ? (programados.find((p) => p.id === b.id)?.aplazado ?? false) : false,
    }
    await db.programados.put(prog)
    if (otro) {
      avisar(`Jornada ${jornada} guardada`)
      setB({ ...borradorNuevo([...programados.filter((p) => p.id !== prog.id), prog].sort((x, y) => x.jornada - y.jornada)), hora: b.hora, competicion: prog.competicion })
      setClave((k) => k + 1)
    } else {
      avisar(b.id ? 'Partido actualizado' : `Jornada ${jornada} programada`)
      onCerrar()
    }
  }

  return (
    <div className="formulario">
      <div className="fila-campos">
        <label className="campo campo--corto">
          <span>Jornada</span>
          <input value={b.jornada} onChange={(e) => setB({ ...b, jornada: e.target.value.replace(/\D/g, '').slice(0, 2) })} inputMode="numeric" />
        </label>
        <div className="campo">
          <span>Campo</span>
          <div className="segmentos">
            <button type="button" className={b.local ? 'activa' : ''} onClick={() => setB({ ...b, local: true })}>Local</button>
            <button type="button" className={!b.local ? 'activa' : ''} onClick={() => setB({ ...b, local: false })}>Visitante</button>
          </div>
        </div>
      </div>
      <div className="campo">
        <span>Rival</span>
        <SelectorRival key={clave} rivales={rivales} rivalId={b.rivalId} nombre={b.rivalNombre} onChange={(v) => setB({ ...b, rivalId: v.rivalId, rivalNombre: v.nombre })} />
      </div>
      <div className="fila-campos">
        <label className="campo">
          <span>Fecha (opcional)</span>
          <input type="date" value={b.fecha} onChange={(e) => setB({ ...b, fecha: e.target.value })} />
        </label>
        <label className="campo campo--hora">
          <span>Hora</span>
          <input type="time" value={b.hora} onChange={(e) => setB({ ...b, hora: e.target.value })} />
        </label>
      </div>
      <div className="dialogo__botones">
        {!b.id && <button className="boton boton--sec" onClick={() => guardar(true)}>Guardar y otro</button>}
        <button className="boton" onClick={() => guardar(false)}>Guardar</button>
      </div>
    </div>
  )
}

export function Liga({ datos }: { datos: Datos }) {
  const { programados, rivales, partidos, temporada } = datos
  const [form, setForm] = useState<Borrador | null>(null)
  const [menu, setMenu] = useState<Programado | null>(null)
  const [rivalEdit, setRivalEdit] = useState<Rival | null>(null)
  const [nombreEdit, setNombreEdit] = useState('')
  const [nuevoRival, setNuevoRival] = useState('')
  const proximo = proximoPartido(programados, partidos)

  const editar = (g: Programado) => {
    setMenu(null)
    setForm({
      id: g.id, jornada: String(g.jornada), rivalId: g.rivalId, rivalNombre: nombreRival(rivales, g.rivalId, ''),
      fecha: g.fecha ?? '', hora: g.hora ?? '', local: g.local, competicion: g.competicion,
    })
  }

  const alternarAplazado = async (g: Programado) => {
    setMenu(null)
    await db.programados.update(g.id, { aplazado: !g.aplazado })
    avisar(g.aplazado ? `Jornada ${g.jornada} ya no está aplazada` : `Jornada ${g.jornada} aplazada: mantiene su número`)
  }

  const eliminar = async (g: Programado) => {
    setMenu(null)
    const ok = await confirmar({ titulo: `¿Quitar la jornada ${g.jornada} del calendario?`, aceptar: 'Quitar', peligro: true })
    if (ok) await db.programados.delete(g.id)
  }

  const anadirRival = async () => {
    if (!nuevoRival.trim()) return
    const r = await rivalPorNombre(nuevoRival)
    setNuevoRival('')
    avisar(`${r.nombre} en la liga`)
  }

  const guardarRival = async () => {
    if (!rivalEdit || !nombreEdit.trim()) return
    await db.transaction('rw', db.rivales, db.partidos, async () => {
      await db.rivales.update(rivalEdit.id, { nombre: nombreEdit.trim() })
      await db.partidos.where('temporadaId').equals(temporada.id).modify((p) => {
        if (p.rivalId === rivalEdit.id) p.rival = nombreEdit.trim()
      })
    })
    setRivalEdit(null)
  }

  const borrarRival = async () => {
    if (!rivalEdit) return
    if (programados.some((g) => g.rivalId === rivalEdit.id)) {
      avisar('Tiene partidos en el calendario: quítalos antes.')
      return
    }
    await db.rivales.delete(rivalEdit.id)
    setRivalEdit(null)
  }

  return (
    <>
      <Cabecera
        titulo="Partidos"
        sub="Liga"
        acciones={
          <button className="boton boton--peq" onClick={() => setForm(borradorNuevo(programados))}>
            <Icono nombre="mas" tam={18} /> Programar
          </button>
        }
      />
      <Subpestanas opciones={SUBPESTANAS_PARTIDOS} activa="liga" />

      <section className="tarjeta">
        <h2>Calendario</h2>
        {programados.length === 0 ? (
          <Vacio
            titulo="Sin partidos programados"
            texto="Programa todas las jornadas de la temporada. Al registrar un partido podrás elegirlo del calendario."
            accion={<button className="boton" onClick={() => setForm(borradorNuevo(programados))}>Programar la jornada 1</button>}
          />
        ) : (
          <ul className="calendario">
            {programados.map((g) => {
              const jugado = partidoDe(g, partidos)
              const r = jugado ? (jugado.golesFavor > jugado.golesContra ? 'V' : jugado.golesFavor === jugado.golesContra ? 'E' : 'D') : null
              return (
                <li key={g.id} className={g.id === proximo?.id ? 'calendario--proximo' : ''}>
                  <button onClick={() => (jugado ? ir(`/partido/${jugado.id}`) : setMenu(g))}>
                    <span className="calendario__j">J{g.jornada}</span>
                    <div className="calendario__texto">
                      <strong>{g.local ? 'vs' : 'en'} {nombreRival(rivales, g.rivalId)}</strong>
                      <span>
                        {g.fecha ? fechaCorta(g.fecha) : 'Sin fecha'}{g.hora ? ` · ${g.hora}` : ''}{g.competicion !== 'Liga' ? ` · ${g.competicion}` : ''}
                      </span>
                    </div>
                    {jugado ? (
                      <span className={`res res--${r}`}>{jugado.golesFavor}-{jugado.golesContra}</span>
                    ) : g.aplazado ? (
                      <span className="etiqueta etiqueta--aplazado">Aplazado</span>
                    ) : g.id === proximo?.id ? (
                      <span className="etiqueta etiqueta--proximo">Próximo</span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="tarjeta">
        <h2>Equipos de la liga</h2>
        <div className="fila-campos fila-campos--boton">
          <input className="input" value={nuevoRival} onChange={(e) => setNuevoRival(e.target.value)} placeholder="Añadir equipo…" onKeyDown={(e) => e.key === 'Enter' && anadirRival()} />
          <button className="boton boton--peq" onClick={anadirRival} disabled={!nuevoRival.trim()}>Añadir</button>
        </div>
        {rivales.length === 0 ? (
          <p className="nota">Añade aquí a todos los rivales para elegirlos después sin escribir.</p>
        ) : (
          <ul className="lista-simple">
            {rivales.map((r) => (
              <li key={r.id}>
                <span>{r.nombre}</span>
                <button className="enlace" onClick={() => { setRivalEdit(r); setNombreEdit(r.nombre) }}>Editar</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="nota centro">La clasificación y los resultados entre otros equipos llegan en la Fase 2.</p>

      <Hoja abierta={!!form} onCerrar={() => setForm(null)} titulo={form?.id ? 'Editar partido' : 'Programar partido'}>
        {form && <FormProgramado inicial={form} rivales={rivales} programados={programados} temporadaId={temporada.id} onCerrar={() => setForm(null)} />}
      </Hoja>

      <Hoja abierta={!!menu} onCerrar={() => setMenu(null)} titulo={menu ? `Jornada ${menu.jornada} · ${nombreRival(rivales, menu.rivalId)}` : ''}>
        {menu && (
          <>
            <button className="hoja__opcion" onClick={() => ir(`/partido/nuevo/${menu.id}`)}>
              <strong>Registrar resultado</strong>
              <span>Abre el registro del partido con estos datos.</span>
            </button>
            <button className="hoja__opcion" onClick={() => editar(menu)}>
              <strong>Editar</strong>
              <span>Cambiar fecha, hora, rival o campo.</span>
            </button>
            <button className="hoja__opcion" onClick={() => alternarAplazado(menu)}>
              <strong>{menu.aplazado ? 'Quitar aplazamiento' : 'Marcar como aplazado'}</strong>
              <span>{menu.aplazado ? 'Vuelve a contar como pendiente.' : 'Mantiene su número de jornada. Cuando tenga nueva fecha, edítalo.'}</span>
            </button>
            <button className="hoja__opcion hoja__opcion--peligro" onClick={() => eliminar(menu)}>Quitar del calendario</button>
          </>
        )}
      </Hoja>

      <Hoja abierta={!!rivalEdit} onCerrar={() => setRivalEdit(null)} titulo="Editar equipo">
        <input className="input" value={nombreEdit} onChange={(e) => setNombreEdit(e.target.value)} />
        <div className="dialogo__botones">
          <button className="boton boton--sec boton--texto-peligro" onClick={borrarRival}>Borrar</button>
          <button className="boton" onClick={guardarRival}>Guardar</button>
        </div>
      </Hoja>
    </>
  )
}
