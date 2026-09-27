import { useState, type ChangeEvent } from 'react'
import { SOLO_LECTURA, SPLITS, db, nuevoId, splitDe, splitsDe, type Programado, type ResultadoLiga, type Rival } from '../db'
import { claveRival, fechaCorta, fechaLarga, ir, nombreRival, partidoDe, proximoPartido, textoJornada, type Datos } from '../datos'
import { SelectorRival } from '../componentes/SelectorRival'
import { rivalPorNombre } from '../componentes/rivales'
import { Cabecera, Contador, Hoja, Icono, Subpestanas, Vacio } from '../componentes/ui'
import { NOSOTROS, clasificacion, esLiga, partidosLiga, rivalesDelSplit, splitDePartido, type ModoClasificacion } from '../motor/liga'
import { resultado } from '../motor/equipo'
import { EscudoRival, PastillaRes } from '../componentes/Piezas'
import { prepararEscudo } from '../componentes/escudos'
import { BannerDeshacer } from './Partidos'
import { avisar, confirmar } from '../componentes/dialogos'

// Liga (§10): Calendario (próximo, jugados y próximos) y Clasificación (general,
// local y visitante), con los resultados entre otros equipos y la lista de equipos.

const SUBPESTANAS_LIGA = [
  { id: 'calendario', texto: 'Calendario', ruta: '/liga' },
  { id: 'clasificacion', texto: 'Clasificación', ruta: '/liga/clasificacion' },
]

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

export function Liga({ datos, vista }: { datos: Datos; vista?: string }) {
  const { partidos, temporada, equipo } = datos
  const pestana = vista === 'clasificacion' ? 'clasificacion' : 'calendario'
  const [modo, setModo] = useState<ModoClasificacion>('general')
  const [mas, setMas] = useState(false)
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
  const tabla = clasificacion(lista, datos.rivales, equipo.nombre, split, undefined, modo)
  const general = clasificacion(lista, datos.rivales, equipo.nombre, split)
  const jornadasOtros = [...new Set(resultadosLiga.map((r) => r.jornada))].sort((a, b) => b - a)
  const ultimaJornada = Math.max(0, ...lista.filter((p) => p.split === split).map((p) => p.jornada ?? 0))
  // Split 1 acabado: tiene calendario y todas sus jornadas se han jugado.
  const calendario1 = datos.programados.filter((g) => splitDe(g) === 1)
  const split1Terminado = calendario1.length > 0 && calendario1.every((g) => partidos.some((p) => p.programadoId === g.id))
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
  const [escudoEdit, setEscudoEdit] = useState<string | undefined>(undefined)
  const abrirRival = (r: Rival) => { setRivalEdit(r); setNombreEdit(r.nombre); setEscudoEdit(r.escudo ?? datos.escudos.get(claveRival(r.nombre))) }
  const elegirEscudo = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    try {
      setEscudoEdit(await prepararEscudo(archivo))
    } catch {
      avisar('No se ha podido leer esa imagen.')
    }
  }
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
      await db.rivales.update(rivalEdit.id, { nombre: nombreEdit.trim(), escudo: escudoEdit })
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

  const nuestra = general.findIndex((f) => f.id === NOSOTROS)
  const filaNuestra = general[nuestra]
  const jugados = [...partidos]
    .filter((p) => !esLiga(p.competicion) || splitDePartido(p, datos.programados) === split)
    .sort((x, y) => y.fecha.localeCompare(x.fecha) || y.creado.localeCompare(x.creado))
  const pendientes = programados.filter((g) => !partidoDe(g, partidos) && g.id !== proximo?.id)
  const proximoSplit = proximo && splitDe(proximo) === split ? proximo : null
  const jornadaDe = (id: string | null | undefined) => {
    const g = id ? datos.programados.find((x) => x.id === id) : null
    return g ? textoJornada(g, datos.programados) : null
  }
  const campo = (local: boolean) => (local ? 'Casa' : 'Fuera')

  return (
    <>
      <Cabecera
        titulo="Liga"
        sub={`Temporada ${temporada.nombre}${filaNuestra && filaNuestra.pj ? ` · ${nuestra + 1}º con ${filaNuestra.pts} puntos` : ''}`}
        acciones={
          <button className="boton-icono editable" onClick={() => setMas(true)} aria-label="Añadir">
            <Icono nombre="mas" />
          </button>
        }
      />
      <Subpestanas opciones={SUBPESTANAS_LIGA} activa={pestana} />
      <div className="segmentos segmentos--split">
        {SPLITS.map((n) => (
          <button key={n} className={split === n ? 'activa' : ''} onClick={() => setSplit(n)}>
            Split {n}
          </button>
        ))}
      </div>
      {!SOLO_LECTURA && pestana === 'calendario' && <BannerDeshacer />}

      {pestana === 'calendario' && (
        <>
          {!SOLO_LECTURA && split === 1 && split1Terminado && !datos.programados.some((g) => splitDe(g) === 2) && (
            <section className="tarjeta aviso-split">
              <strong>Split 1 terminado</strong>
              <p className="nota">Cuando empiece la segunda parte de la liga, pasa al split 2: tendrá su propia clasificación y su calendario.</p>
              <button className="boton boton--peq" onClick={() => setSplit(2)}>Ir al split 2</button>
            </section>
          )}
          {!SOLO_LECTURA && split === 2 && rivales.length === 0 && !programados.length && (
            <section className="tarjeta aviso-split">
              <strong>Empieza el split 2</strong>
              <p className="nota">Es una liga nueva: clasificación a cero y calendario de la J1 a la J16. Las medias y estadísticas de los jugadores siguen sumando toda la temporada.</p>
              <ol className="nota aviso-split__pasos">
                <li>Pon los equipos: copia los del split 1 (los escudos van con ellos) o añádelos en Clasificación → Equipos del split 2.</li>
                <li>Programa las jornadas con el botón +.</li>
              </ol>
              {rivalesOtro.length > 0 && <button className="boton boton--peq" onClick={copiarEquipos}>Copiar los {rivalesOtro.length} equipos del split 1</button>}
            </section>
          )}
          {proximoSplit && (
            <button className="cristal fila-proximo" onClick={() => !SOLO_LECTURA && setMenu(proximoSplit)}>
              <span className="fila-liga__j"><strong>J{proximoSplit.jornada}</strong><small>{proximoSplit.fecha ? fechaCorta(proximoSplit.fecha) : 'Sin fecha'}</small></span>
              <EscudoRival nombre={nombreRival(datos.rivales, proximoSplit.rivalId)} tam={40} />
              <span className="fila-liga__texto">
                <strong>{nombreRival(datos.rivales, proximoSplit.rivalId)}</strong>
                <small>{campo(proximoSplit.local)}{proximoSplit.fecha ? ` · ${fechaLarga(proximoSplit.fecha).split(',')[0]}` : ''}{proximoSplit.hora ? ` ${proximoSplit.hora}` : ''} · Próximo</small>
              </span>
              <Icono nombre="flecha" tam={18} />
            </button>
          )}

          {!jugados.length && !programados.length ? (
            <Vacio
              titulo="Sin partidos todavía"
              texto="Programa las jornadas del calendario o registra directamente un partido."
              accion={<button className="boton editable" onClick={() => setForm(borradorNuevo(programados))}>Programar la jornada 1</button>}
            />
          ) : null}

          {jugados.length > 0 && (
            <>
              <h3 className="titulo-seccion">Jugados</h3>
              <section className="tarjeta lista-liga">
                {jugados.map((p) => {
                  const j = jornadaDe(p.programadoId)
                  return (
                    <button key={p.id} onClick={() => ir(`/partido/${p.id}`)}>
                      <span className="fila-liga__j"><strong>{j ?? (esLiga(p.competicion) ? '·' : p.competicion.slice(0, 5))}</strong><small>{fechaCorta(p.fecha)}</small></span>
                      <EscudoRival nombre={p.rival} tam={40} />
                      <span className="fila-liga__texto"><strong>{p.rival}</strong><small>{campo(p.local)}</small></span>
                      <span className="fila-liga__marcador">{p.golesFavor} – {p.golesContra}</span>
                      <PastillaRes r={resultado(p)} suave />
                    </button>
                  )
                })}
              </section>
            </>
          )}

          {pendientes.length > 0 && (
            <>
              <h3 className="titulo-seccion">Próximos</h3>
              <section className="tarjeta lista-liga">
                {pendientes.map((g) => (
                  <button key={g.id} onClick={() => !SOLO_LECTURA && setMenu(g)}>
                    <span className="fila-liga__j"><strong>J{g.jornada}</strong><small>{g.fecha ? fechaCorta(g.fecha) : 'Sin fecha'}</small></span>
                    <EscudoRival nombre={nombreRival(datos.rivales, g.rivalId)} tam={40} />
                    <span className="fila-liga__texto"><strong>{nombreRival(datos.rivales, g.rivalId)}</strong><small>{campo(g.local)}{g.hora ? ` · ${g.hora}` : ''}{g.competicion !== 'Liga' ? ` · ${g.competicion}` : ''}</small></span>
                    <span className="fila-liga__estado">{g.aplazado ? 'Aplazado' : 'Pendiente'}</span>
                  </button>
                ))}
              </section>
            </>
          )}
        </>
      )}

      {pestana === 'clasificacion' && (
      <>
      <div className="chips chips--cristal">
        {(['general', 'local', 'visitante'] as ModoClasificacion[]).map((m) => (
          <button key={m} className={modo === m ? 'activa' : ''} onClick={() => setModo(m)}>{{ general: 'General', local: 'Local', visitante: 'Visitante' }[m]}</button>
        ))}
      </div>
      <section className="tarjeta">
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
                    <td className="izq nombre">
                      <span className="equipo-liga">
                        {f.id === NOSOTROS ? <img className="escudo-rival--foto" src={`${import.meta.env.BASE_URL}escudo.png`} alt="" style={{ width: 18, height: 21 }} /> : <EscudoRival nombre={f.nombre} tam={18} />}
                        <span>{f.nombre}</span>
                      </span>
                    </td>
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
        <p className="nota">Cuentan los partidos con competición «Liga» del split {split}. 3 puntos por victoria y 1 por empate.</p>
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
                <span className="equipo-liga"><EscudoRival nombre={r.nombre} tam={26} />{r.nombre}</span>
                <button className="enlace editable" onClick={() => abrirRival(r)}>Editar</button>
              </li>
            ))}
          </ul>
        )}
      </section>


      </>
      )}

      <Hoja abierta={mas} onCerrar={() => setMas(false)} titulo="Añadir">
        <button className="hoja__opcion" disabled={!datos.jugadores.length} onClick={() => ir('/partido/nuevo')}>
          <strong>Registrar partido</strong>
          <span>Resultado, convocatoria, minutos, acciones y MVP.</span>
        </button>
        <button className="hoja__opcion" onClick={() => { setMas(false); setForm(borradorNuevo(programados)) }}>
          <strong>Programar jornada</strong>
          <span>Añadir un partido al calendario del split {split}.</span>
        </button>
        <button className="hoja__opcion" disabled={rivales.length < 2} onClick={() => { setMas(false); ir('/liga/clasificacion', true); setFormRes({ id: null, jornada: String(Math.max(1, ultimaJornada)), localId: '', visitanteId: '', golesLocal: 0, golesVisitante: 0 }) }}>
          <strong>Resultado de otros equipos</strong>
          <span>Para que la clasificación esté completa.</span>
        </button>
      </Hoja>

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
        <div className="escudo-editar">
          {escudoEdit
            ? <img className="escudo-rival--foto" src={escudoEdit} alt="Escudo" style={{ width: 64, height: 74 }} />
            : <EscudoRival nombre={nombreEdit || '?'} tam={64} />}
          <div className="escudo-editar__botones">
            <label className="boton boton--sec boton--peq">
              {escudoEdit ? 'Cambiar escudo' : 'Poner escudo'}
              <input type="file" accept="image/*" hidden onChange={elegirEscudo} />
            </label>
            {escudoEdit && <button className="enlace enlace--peligro" onClick={() => setEscudoEdit(undefined)}>Quitar escudo</button>}
          </div>
        </div>
        <p className="nota">Mejor una imagen del escudo con fondo transparente (PNG) o recortada al escudo.</p>
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
