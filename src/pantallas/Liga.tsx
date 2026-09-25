import { useState } from 'react'
import { SOLO_LECTURA, SPLITS, db, nuevoId, splitDe, splitsDe, type Programado, type ResultadoLiga, type Rival } from '../db'
import { SUBPESTANAS_PARTIDOS, fechaCorta, ir, nombreRival, partidoDe, proximoPartido, type Datos } from '../datos'
import { SelectorRival } from '../componentes/SelectorRival'
import { rivalPorNombre } from '../componentes/rivales'
import { Cabecera, Contador, Hoja, Icono, Subpestanas, Vacio } from '../componentes/ui'
import { NOSOTROS, clasificacion, partidosLiga, rivalesDelSplit } from '../motor/liga'
import { avisar, confirmar } from '../componentes/dialogos'

// Liga: clasificación, calendario de nuestros partidos, resultados entre otros
// equipos y lista de equipos de la liga.

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

function FormProgramado({ inicial, rivales, programados, temporadaId, split, onCerrar }: {
  inicial: Borrador
  rivales: Rival[]
  programados: Programado[] // solo los del split
  temporadaId: string
  split: number
  onCerrar: () => void
}) {
  const [b, setB] = useState(inicial)
  const [clave, setClave] = useState(0) // reinicia el selector de rival al encadenar

  const guardar = async (otro: boolean) => {
    const jornada = Number(b.jornada)
    if (!Number.isInteger(jornada) || jornada < 1 || jornada > 99) return avisar('La jornada debe ser un número del 1 al 99.')
    if (!b.rivalId && !b.rivalNombre.trim()) return avisar('Elige o escribe el rival.')
    if (programados.some((p) => p.jornada === jornada && p.id !== b.id)) return avisar(`Ya hay un partido en la jornada ${jornada} de este split.`)
    const rivalId = b.rivalId ?? (await rivalPorNombre(b.rivalNombre, temporadaId, split)).id
    const prog: Programado = {
      id: b.id ?? nuevoId(), temporadaId, jornada, rivalId, fecha: b.fecha || null, hora: b.hora || null,
      local: b.local, competicion: b.competicion.trim() || 'Liga', split,
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

interface BorradorResultado {
  id: string | null
  jornada: string
  localId: string
  visitanteId: string
  golesLocal: number
  golesVisitante: number
}

function FormResultado({ inicial, rivales, temporadaId, split, onCerrar }: { inicial: BorradorResultado; rivales: Rival[]; temporadaId: string; split: number; onCerrar: () => void }) {
  const [b, setB] = useState(inicial)
  const guardar = async (otro: boolean) => {
    const jornada = Number(b.jornada)
    if (!Number.isInteger(jornada) || jornada < 1 || jornada > 99) return avisar('La jornada debe ser un número del 1 al 99.')
    if (!b.localId || !b.visitanteId) return avisar('Elige los dos equipos.')
    if (b.localId === b.visitanteId) return avisar('Un equipo no puede jugar contra sí mismo.')
    const r: ResultadoLiga = { id: b.id ?? nuevoId(), temporadaId, jornada, localId: b.localId, visitanteId: b.visitanteId, golesLocal: b.golesLocal, golesVisitante: b.golesVisitante, split }
    await db.resultadosLiga.put(r)
    avisar('Resultado guardado')
    if (otro) setB({ ...b, id: null, localId: '', visitanteId: '', golesLocal: 0, golesVisitante: 0 })
    else onCerrar()
  }
  const selector = (valor: string, cambiar: (v: string) => void, otro: string) => (
    <select className="select" value={valor} onChange={(e) => cambiar(e.target.value)}>
      <option value="" disabled>Elige equipo…</option>
      {rivales.filter((r) => r.id !== otro).map((r) => (
        <option key={r.id} value={r.id}>{r.nombre}</option>
      ))}
    </select>
  )
  return (
    <div className="formulario">
      <label className="campo campo--corto">
        <span>Jornada</span>
        <input value={b.jornada} onChange={(e) => setB({ ...b, jornada: e.target.value.replace(/\D/g, '').slice(0, 2) })} inputMode="numeric" />
      </label>
      <div className="resultado-form">
        <div className="campo">
          <span>Local</span>
          {selector(b.localId, (v) => setB({ ...b, localId: v }), b.visitanteId)}
        </div>
        <Contador valor={b.golesLocal} onChange={(v) => setB({ ...b, golesLocal: v })} max={50} />
      </div>
      <div className="resultado-form">
        <div className="campo">
          <span>Visitante</span>
          {selector(b.visitanteId, (v) => setB({ ...b, visitanteId: v }), b.localId)}
        </div>
        <Contador valor={b.golesVisitante} onChange={(v) => setB({ ...b, golesVisitante: v })} max={50} />
      </div>
      <div className="dialogo__botones">
        {!b.id && <button className="boton boton--sec" onClick={() => guardar(true)}>Guardar y otro</button>}
        <button className="boton" onClick={() => guardar(false)}>Guardar</button>
      </div>
    </div>
  )
}

export function Liga({ datos }: { datos: Datos }) {
  const { partidos, temporada, equipo } = datos
  // Cada split es una liga distinta: todo lo de esta pantalla se filtra por el elegido.
  const [split, setSplitLocal] = useState(equipo.splitActual ?? 1)
  const setSplit = (n: number) => {
    setSplitLocal(n)
    db.equipo.update('equipo', { splitActual: n })
  }
  const programados = datos.programados.filter((g) => splitDe(g) === split)
  const resultadosLiga = datos.resultadosLiga.filter((r) => splitDe(r) === split)
  const rivales = rivalesDelSplit(datos.rivales, split)
  const [formRes, setFormRes] = useState<BorradorResultado | null>(null)
  const lista = partidosLiga(partidos, datos.programados, datos.resultadosLiga, datos.rivales)
  const tabla = clasificacion(lista, datos.rivales, equipo.nombre, split)
  const jornadasOtros = [...new Set(resultadosLiga.map((r) => r.jornada))].sort((a, b) => b - a)
  const ultimaJornada = Math.max(0, ...lista.filter((p) => p.split === split).map((p) => p.jornada ?? 0))
  const otroSplit = split === 1 ? 2 : 1
  const rivalesOtro = rivalesDelSplit(datos.rivales, otroSplit)
  const nombreEq = (id: string) => nombreRival(datos.rivales, id, '?')

  const borrarResultado = async () => {
    if (!formRes?.id) return
    await db.resultadosLiga.delete(formRes.id)
    setFormRes(null)
  }
  const [form, setForm] = useState<Borrador | null>(null)
  const [menu, setMenu] = useState<Programado | null>(null)
  const [rivalEdit, setRivalEdit] = useState<Rival | null>(null)
  const [nombreEdit, setNombreEdit] = useState('')
  const [nuevoRival, setNuevoRival] = useState('')
  const proximo = proximoPartido(datos.programados, partidos)

  const editar = (g: Programado) => {
    setMenu(null)
    setForm({
      id: g.id, jornada: String(g.jornada), rivalId: g.rivalId, rivalNombre: nombreRival(datos.rivales, g.rivalId, ''),
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

  const copiarEquipos = async () => {
    await Promise.all(rivalesOtro.map((r) => db.rivales.update(r.id, { splits: [...new Set([...splitsDe(r), split])].sort() })))
    avisar(`${rivalesOtro.length} equipos copiados al split ${split}`)
  }

  const anadirRival = async () => {
    if (!nuevoRival.trim()) return
    const r = await rivalPorNombre(nuevoRival, temporada.id, split)
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
    if (programados.some((g) => g.rivalId === rivalEdit.id) || resultadosLiga.some((r) => r.localId === rivalEdit.id || r.visitanteId === rivalEdit.id)) {
      avisar('Tiene partidos en el calendario o resultados de este split: quítalos antes.')
      return
    }
    const otros = splitsDe(rivalEdit).filter((x) => x !== split)
    // Si juega otro split, solo se quita de este; si no, se borra.
    if (otros.length) await db.rivales.update(rivalEdit.id, { splits: otros })
    else await db.rivales.delete(rivalEdit.id)
    setRivalEdit(null)
  }

  return (
    <>
      <Cabecera
        titulo="Partidos"
        sub="Liga"
        acciones={
          <button className="boton boton--peq editable" onClick={() => setForm(borradorNuevo(programados))}>
            <Icono nombre="mas" tam={18} /> Programar
          </button>
        }
      />
      <Subpestanas opciones={SUBPESTANAS_PARTIDOS} activa="liga" />
      <div className="segmentos segmentos--split">
        {SPLITS.map((n) => (
          <button key={n} className={split === n ? 'activa' : ''} onClick={() => setSplit(n)}>
            Split {n}
          </button>
        ))}
      </div>

      <section className="tarjeta">
        <h2>Clasificación · split {split}</h2>
        {rivales.length === 0 ? (
          <p className="nota">Añade los equipos de este split (abajo) para ver la clasificación.</p>
        ) : (
          <div className="clasificacion">
            <table>
              <thead>
                <tr>
                  <th />
                  <th className="izq">Equipo</th>
                  <th>PJ</th>
                  <th>V</th>
                  <th>E</th>
                  <th>D</th>
                  <th>DG</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {tabla.map((f, i) => (
                  <tr key={f.id} className={f.id === NOSOTROS ? 'nosotros' : ''}>
                    <td className="pos">{i + 1}</td>
                    <td className="izq nombre">{f.nombre}</td>
                    <td>{f.pj}</td>
                    <td>{f.v}</td>
                    <td>{f.e}</td>
                    <td>{f.d}</td>
                    <td>{f.gf - f.gc > 0 ? '+' : ''}{f.gf - f.gc}</td>
                    <td className="pts">{f.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="nota">Cuentan los partidos con competición «Liga». 3 puntos por victoria y 1 por empate.</p>
      </section>

      <section className="tarjeta">
        <h2>Calendario</h2>
        {programados.length === 0 ? (
          <Vacio
            titulo="Sin partidos programados"
            texto="Programa todas las jornadas de la temporada. Al registrar un partido podrás elegirlo del calendario."
            accion={<button className="boton editable" onClick={() => setForm(borradorNuevo(programados))}>Programar la jornada 1</button>}
          />
        ) : (
          <ul className="calendario">
            {programados.map((g) => {
              const jugado = partidoDe(g, partidos)
              const r = jugado ? (jugado.golesFavor > jugado.golesContra ? 'V' : jugado.golesFavor === jugado.golesContra ? 'E' : 'D') : null
              return (
                <li key={g.id} className={g.id === proximo?.id ? 'calendario--proximo' : ''}>
                  <button onClick={() => (jugado ? ir(`/partido/${jugado.id}`) : !SOLO_LECTURA && setMenu(g))}>
                    <span className="calendario__j">J{g.jornada}</span>
                    <div className="calendario__texto">
                      <strong>{g.local ? 'vs' : 'en'} {nombreRival(datos.rivales, g.rivalId)}</strong>
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
        <div className="tarjeta__cab">
          <h2>Otros resultados</h2>
          <button
            className="boton boton--peq boton--sec editable"
            disabled={rivales.length < 2}
            onClick={() => setFormRes({ id: null, jornada: String(Math.max(1, ultimaJornada)), localId: '', visitanteId: '', golesLocal: 0, golesVisitante: 0 })}
          >
            <Icono nombre="mas" tam={16} /> Añadir
          </button>
        </div>
        {jornadasOtros.length === 0 ? (
          <p className="nota">Apunta los resultados de los demás partidos de cada jornada para que la clasificación sea completa.</p>
        ) : (
          jornadasOtros.map((j) => (
            <div key={j} className="jornada">
              <span className="jornada__titulo">Jornada {j}</span>
              {resultadosLiga.filter((r) => r.jornada === j).map((r) => (
                <button
                  key={r.id}
                  className="resultado"
                  onClick={() => !SOLO_LECTURA && setFormRes({ id: r.id, jornada: String(r.jornada), localId: r.localId, visitanteId: r.visitanteId, golesLocal: r.golesLocal, golesVisitante: r.golesVisitante })}
                >
                  <span className="resultado__eq">{nombreEq(r.localId)}</span>
                  <strong>{r.golesLocal} - {r.golesVisitante}</strong>
                  <span className="resultado__eq resultado__eq--der">{nombreEq(r.visitanteId)}</span>
                </button>
              ))}
            </div>
          ))
        )}
      </section>

      <section className="tarjeta">
        <h2>Equipos del split {split}</h2>
        <div className="fila-campos fila-campos--boton editable">
          <input className="input" value={nuevoRival} onChange={(e) => setNuevoRival(e.target.value)} placeholder="Añadir equipo…" onKeyDown={(e) => e.key === 'Enter' && anadirRival()} />
          <button className="boton boton--peq" onClick={anadirRival} disabled={!nuevoRival.trim()}>Añadir</button>
        </div>
        {rivales.length === 0 && rivalesOtro.length > 0 && (
          <button className="boton boton--sec editable" onClick={copiarEquipos}>Copiar los {rivalesOtro.length} equipos del split {otroSplit}</button>
        )}
        {rivales.length === 0 ? (
          <p className="nota">Añade aquí a todos los rivales de este split para elegirlos después sin escribir.</p>
        ) : (
          <ul className="lista-simple">
            {rivales.map((r) => (
              <li key={r.id}>
                <span>{r.nombre}</span>
                <button className="enlace editable" onClick={() => { setRivalEdit(r); setNombreEdit(r.nombre) }}>Editar</button>
              </li>
            ))}
          </ul>
        )}
      </section>


      <Hoja abierta={!!form} onCerrar={() => setForm(null)} titulo={form?.id ? 'Editar partido' : 'Programar partido'}>
        {form && <FormProgramado inicial={form} rivales={rivales} programados={programados} temporadaId={temporada.id} split={split} onCerrar={() => setForm(null)} />}
      </Hoja>

      <Hoja abierta={!!menu} onCerrar={() => setMenu(null)} titulo={menu ? `Jornada ${menu.jornada} · ${nombreRival(datos.rivales, menu.rivalId)}` : ''}>
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

      <Hoja abierta={!!formRes} onCerrar={() => setFormRes(null)} titulo={formRes?.id ? 'Editar resultado' : 'Añadir resultado'}>
        {formRes && (
          <>
            <FormResultado inicial={formRes} rivales={rivales} temporadaId={temporada.id} split={split} onCerrar={() => setFormRes(null)} />
            {formRes.id && <button className="enlace enlace--peligro" onClick={borrarResultado}>Borrar este resultado</button>}
          </>
        )}
      </Hoja>

      <Hoja abierta={!!rivalEdit} onCerrar={() => setRivalEdit(null)} titulo="Editar equipo">
        <input className="input" value={nombreEdit} onChange={(e) => setNombreEdit(e.target.value)} />
        <div className="dialogo__botones">
          <button className="boton boton--sec boton--texto-peligro" onClick={borrarRival}>
            {rivalEdit && splitsDe(rivalEdit).length > 1 ? `Quitar del split ${split}` : 'Borrar'}
          </button>
          <button className="boton" onClick={guardarRival}>Guardar</button>
        </div>
      </Hoja>
    </>
  )
}
