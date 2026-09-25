import { useState, type ReactNode } from 'react'
import { copiaAutomatica, db, nuevoId, type Actuacion, type EstadoConvocatoria, type Partido } from '../db'
import { colorNota, conSigno, fmt1, fmt2, hoy, ir, nombreVisible, type Datos } from '../datos'
import { calcularNota, mediaVisible, rango } from '../motor/calculo'
import { ACCIONES, ACCIONES_RAPIDAS, rolPorId, type AccionId } from '../motor/config'
import { reproducirTemporada } from '../motor/temporada'
import { MiniCarta } from '../componentes/Carta'
import { disenoDe } from '../componentes/disenos'
import { Contador, Icono } from '../componentes/ui'
import { avisar, confirmar } from '../componentes/dialogos'

const PASOS = ['Datos', 'Resultado', 'Convocatoria', 'Minutos', 'Acciones', 'Resumen', 'Confirmar']

const ESTADOS: { id: EstadoConvocatoria; texto: string }[] = [
  { id: 'titular', texto: 'Titular' },
  { id: 'suplente', texto: 'Suplente' },
  { id: 'no_convocado', texto: 'No conv.' },
  { id: 'baja', texto: 'Baja' },
]

const juega = (a: Actuacion) => (a.estado === 'titular' || a.estado === 'suplente') && a.minutos > 0

export function RegistroPartido({ datos, id }: { datos: Datos; id?: string }) {
  const { jugadores, partidos, equipo, config, configVersion, configs, temporada, calculo } = datos
  const original = id ? partidos.find((p) => p.id === id) : undefined
  const duracion = equipo.duracionPartido

  const [paso, setPaso] = useState(0)
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)
  const [p, setP] = useState<Partido>(() => {
    if (original) {
      // Añade al borrador los jugadores que no estaban en el partido (p. ej. fichajes nuevos).
      const actuaciones = [...original.actuaciones]
      for (const j of jugadores) {
        if (!actuaciones.some((a) => a.jugadorId === j.id)) {
          actuaciones.push({ jugadorId: j.id, estado: 'no_convocado', minutos: 0, acciones: {}, posicion: j.posicion, rol: j.rol })
        }
      }
      return { ...original, actuaciones: actuaciones.filter((a) => jugadores.some((j) => j.id === a.jugadorId)) }
    }
    return {
      id: nuevoId(), temporadaId: temporada.id, rival: '', fecha: hoy(), competicion: 'Liga', local: true,
      golesFavor: 0, golesContra: 0, mvpId: null, nominados: [], configVersion, creado: new Date().toISOString(), editado: null,
      actuaciones: jugadores.map((j) => ({ jugadorId: j.id, estado: 'no_convocado', minutos: 0, acciones: {}, posicion: j.posicion, rol: j.rol })),
    }
  })

  const cfgPartido = configs.find((c) => c.version === p.configVersion)?.datos ?? config
  const ctx = { golesFavor: p.golesFavor, golesContra: p.golesContra, duracion }
  const jugador = (jid: string) => jugadores.find((j) => j.id === jid)!
  const act = (jid: string) => p.actuaciones.find((a) => a.jugadorId === jid)!
  const setAct = (jid: string, cambio: Partial<Actuacion>) =>
    setP((x) => ({ ...x, actuaciones: x.actuaciones.map((a) => (a.jugadorId === jid ? { ...a, ...cambio } : a)) }))

  const convocados = p.actuaciones.filter((a) => a.estado === 'titular' || a.estado === 'suplente')
  const jugaron = p.actuaciones.filter(juega)
  const nTitulares = p.actuaciones.filter((a) => a.estado === 'titular').length
  const golesJugadores = jugaron.reduce((s, a) => s + (a.acciones.gol ?? 0), 0)

  // Notas del borrador y candidatos a MVP (los 3 mejores).
  const notas: Record<string, number> = Object.fromEntries(
    jugaron.map((a) => [a.jugadorId, calcularNota(a.posicion, a.acciones, a.minutos, ctx, cfgPartido)]),
  )
  const candidatos = [...jugaron]
    .sort((a, b) => notas[b.jugadorId] - notas[a.jugadorId] || b.minutos - a.minutos || (b.acciones.gol ?? 0) - (a.acciones.gol ?? 0))
    .slice(0, 3)
    .map((a) => a.jugadorId)
  const mvpValido = p.mvpId && candidatos.includes(p.mvpId) ? p.mvpId : null

  // Simulación exacta: se reproduce la temporada con este partido incluido.
  const simulacion = (() => {
    if (paso < 5) return null
    const final: Partido = { ...p, nominados: candidatos, mvpId: mvpValido }
    const otros = partidos.filter((x) => x.id !== p.id)
    const mapa = new Map(configs.map((c) => [c.version, c.datos]))
    const t = reproducirTemporada(jugadores, [...otros, final], mapa, config, duracion)
    return t.partidos.find((r) => r.partido.id === p.id) ?? null
  })()

  const validar = (): string | null => {
    if (paso === 0 && !p.rival.trim()) return 'Escribe el nombre del rival.'
    if (paso === 0 && !p.fecha) return 'Elige la fecha.'
    if (paso === 2 && nTitulares > 7) return `Hay ${nTitulares} titulares: como mucho 7.`
    if (paso === 2 && convocados.length === 0) return 'Convoca al menos a un jugador.'
    if (paso === 3 && convocados.some((a) => a.minutos < 0 || a.minutos > duracion)) return `Los minutos van de 0 a ${duracion}.`
    if (paso === 3 && jugaron.length === 0) return 'Nadie ha jugado minutos.'
    return null
  }

  const siguiente = async () => {
    const error = validar()
    if (error) return avisar(error)
    if (paso === 2) {
      // Paso a minutos: titulares con el partido completo por defecto.
      setP((x) => ({
        ...x,
        actuaciones: x.actuaciones.map((a) => {
          if (a.estado === 'titular' && a.minutos === 0) return { ...a, minutos: duracion }
          if (a.estado !== 'titular' && a.estado !== 'suplente') return { ...a, minutos: 0, acciones: {} }
          return a
        }),
      }))
    }
    if (paso === 3) {
      // Un único portero en el campo: se le rellenan los goles encajados.
      const porteros = jugaron.filter((a) => a.posicion === 'POR')
      if (porteros.length === 1 && porteros[0].acciones.golEncajado === undefined && p.golesContra > 0) {
        setAct(porteros[0].jugadorId, { acciones: { ...porteros[0].acciones, golEncajado: p.golesContra } })
      }
    }
    if (paso === 4 && golesJugadores !== p.golesFavor) {
      const ok = await confirmar({
        titulo: 'Los goles no cuadran',
        texto: `Tus jugadores suman ${golesJugadores} gol${golesJugadores === 1 ? '' : 'es'} y el marcador dice ${p.golesFavor}. Puede ser correcto (por ejemplo, un gol en propia del rival). ¿Seguir?`,
        aceptar: 'Seguir',
        cancelar: 'Revisar',
      })
      if (!ok) return
    }
    setPaso((x) => Math.min(PASOS.length - 1, x + 1))
    window.scrollTo(0, 0)
  }

  const salir = async () => {
    const ok = await confirmar({ titulo: '¿Salir sin guardar?', texto: 'El registro se hace de una sentada: si sales, se pierde lo que has rellenado.', aceptar: 'Salir', peligro: true })
    if (ok) ir(original ? `/partido/${original.id}` : '/partidos', true)
  }

  const guardar = async () => {
    setGuardando(true)
    try {
      const final: Partido = {
        ...p,
        rival: p.rival.trim(),
        nominados: candidatos,
        mvpId: mvpValido,
        actuaciones: p.actuaciones.map((a) => (juega(a) ? a : { ...a, acciones: {}, minutos: a.estado === 'titular' || a.estado === 'suplente' ? a.minutos : 0 })),
        editado: original ? new Date().toISOString() : null,
      }
      await db.transaction('rw', db.partidos, db.deshacer, db.equipo, async () => {
        await db.deshacer.put({
          id: 'ultimo', fecha: new Date().toISOString(), partidoId: final.id, anterior: original ?? null,
          descripcion: original ? `Edición del partido contra ${final.rival}` : `Registro del partido contra ${final.rival}`,
        })
        await db.partidos.put(final)
        if (!original) await db.equipo.update('equipo', { partidosDesdeExportacion: equipo.partidosDesdeExportacion + 1 })
      })
      await copiaAutomatica(`${original ? 'Edición' : 'Partido'} vs ${final.rival} (${final.golesFavor}-${final.golesContra})`)
      avisar(original ? 'Partido actualizado y temporada recalculada' : 'Partido confirmado')
      ir(`/partido/${final.id}`, true)
      if (!original && equipo.partidosDesdeExportacion + 1 >= 4) {
        const exportar = await confirmar({
          titulo: 'Toca copia manual',
          texto: `Llevas ${equipo.partidosDesdeExportacion + 1} partidos sin exportar una copia. Guárdala en Archivos o iCloud por si pierdes el móvil.`,
          aceptar: 'Exportar ahora',
          cancelar: 'Luego',
        })
        if (exportar) ir('/ajustes/copias')
      }
    } finally {
      setGuardando(false)
    }
  }

  const alternar = (jid: string) =>
    setAbiertos((s) => {
      const n = new Set(s)
      if (n.has(jid)) n.delete(jid)
      else n.add(jid)
      return n
    })

  const cambiarAccion = (jid: string, accion: AccionId, valor: number) => {
    const a = act(jid)
    const acciones = { ...a.acciones, [accion]: valor }
    if (!valor) delete acciones[accion]
    setAct(jid, { acciones })
  }

  const cabeceraJugador = (jid: string, extra?: ReactNode) => {
    const j = jugador(jid)
    const e = calculo.jugadores[jid]
    return (
      <div className="reg-jugador__cab">
        <MiniCarta jugador={j} media={e.media} diseno={disenoDe(j, e.media, config, e.rangosAlcanzados)} config={config} ancho={40} />
        <div className="reg-jugador__nombre">
          <strong>{nombreVisible(j)}</strong>
          <span>#{j.dorsal} · {rolPorId(config, act(jid).rol).sigla}</span>
        </div>
        {extra}
      </div>
    )
  }

  return (
    <>
      <header className="asistente__cab">
        <button className="cab__atras" onClick={salir} aria-label="Salir">
          <Icono nombre="cerrar" />
        </button>
        <div>
          <h1>{original ? 'Editar partido' : 'Nuevo partido'}</h1>
          <p>Paso {paso + 1} de {PASOS.length} · {PASOS[paso]}</p>
        </div>
      </header>
      <div className="pasos-barra">
        {PASOS.map((x, i) => (
          <span key={x} className={i <= paso ? 'hecho' : ''} />
        ))}
      </div>

      {paso === 0 && (
        <section className="tarjeta formulario">
          <label className="campo">
            <span>Rival</span>
            <input value={p.rival} onChange={(e) => setP({ ...p, rival: e.target.value })} placeholder="Nombre del equipo rival" autoComplete="off" />
          </label>
          <div className="fila-campos">
            <label className="campo">
              <span>Fecha</span>
              <input type="date" value={p.fecha} onChange={(e) => setP({ ...p, fecha: e.target.value })} />
            </label>
            <label className="campo">
              <span>Competición</span>
              <input value={p.competicion} onChange={(e) => setP({ ...p, competicion: e.target.value })} list="competiciones" />
              <datalist id="competiciones">
                <option value="Liga" />
                <option value="Copa" />
                <option value="Amistoso" />
              </datalist>
            </label>
          </div>
          <div className="campo">
            <span>Campo</span>
            <div className="segmentos">
              <button type="button" className={p.local ? 'activa' : ''} onClick={() => setP({ ...p, local: true })}>Local</button>
              <button type="button" className={!p.local ? 'activa' : ''} onClick={() => setP({ ...p, local: false })}>Visitante</button>
            </div>
          </div>
        </section>
      )}

      {paso === 1 && (
        <section className="tarjeta marcador-editor">
          <div>
            <span>{equipo.nombre}</span>
            <Contador valor={p.golesFavor} onChange={(v) => setP({ ...p, golesFavor: v })} max={50} />
          </div>
          <div className="marcador-editor__guion">–</div>
          <div>
            <span>{p.rival || 'Rival'}</span>
            <Contador valor={p.golesContra} onChange={(v) => setP({ ...p, golesContra: v })} max={50} />
          </div>
        </section>
      )}

      {paso === 2 && (
        <>
          <div className="barra-info">
            <span className={nTitulares > 7 ? 'mal' : ''}>Titulares: {nTitulares}/7</span>
            <span>Convocados: {convocados.length}</span>
            {Object.values(equipo.formacion.slots).some(Boolean) && (
              <button
                className="enlace"
                onClick={() => {
                  const ids = new Set(Object.values(equipo.formacion.slots).filter(Boolean) as string[])
                  setP((x) => ({ ...x, actuaciones: x.actuaciones.map((a) => (ids.has(a.jugadorId) ? { ...a, estado: 'titular' } : a)) }))
                }}
              >
                Usar la formación
              </button>
            )}
          </div>
          <ul className="reg-lista">
            {p.actuaciones.map((a) => (
              <li key={a.jugadorId} className="reg-jugador">
                {cabeceraJugador(a.jugadorId)}
                <div className="segmentos segmentos--mini">
                  {ESTADOS.map((s) => (
                    <button key={s.id} className={a.estado === s.id ? `activa estado--${s.id}` : ''} onClick={() => setAct(a.jugadorId, { estado: s.id })}>
                      {s.texto}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {paso === 3 && (
        <ul className="reg-lista">
          {convocados.map((a) => (
            <li key={a.jugadorId} className="reg-jugador">
              {cabeceraJugador(
                a.jugadorId,
                <span className="etiqueta">{a.estado === 'titular' ? 'Titular' : 'Suplente'}</span>,
              )}
              <div className="minutos">
                <input
                  type="range" min={0} max={duracion} value={a.minutos}
                  onChange={(e) => setAct(a.jugadorId, { minutos: Number(e.target.value) })}
                  aria-label={`Minutos de ${nombreVisible(jugador(a.jugadorId))}`}
                />
                <Contador valor={a.minutos} onChange={(v) => setAct(a.jugadorId, { minutos: v })} max={duracion} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {paso === 4 && (
        <>
          <div className="barra-info">
            <span className={golesJugadores !== p.golesFavor ? 'mal' : ''}>Goles: {golesJugadores} de {p.golesFavor}</span>
            <span>Nota en directo</span>
          </div>
          <ul className="reg-lista">
            {jugaron.map((a) => {
              const esPor = a.posicion === 'POR'
              const nota = notas[a.jugadorId]
              const lista = ACCIONES.filter((x) => !ACCIONES_RAPIDAS.includes(x.id) && (esPor || !x.soloPortero))
              const grupos = esPor ? ['portero', 'ofensiva', 'defensiva', 'negativa'] : ['ofensiva', 'defensiva', 'negativa']
              return (
                <li key={a.jugadorId} className="reg-jugador">
                  {cabeceraJugador(a.jugadorId, <span className="pildora" style={{ background: colorNota(nota) }}>{fmt1(nota)}</span>)}
                  <div className="rapidas">
                    {ACCIONES_RAPIDAS.map((id) => {
                      const def = ACCIONES.find((x) => x.id === id)!
                      const v = a.acciones[id] ?? 0
                      return (
                        <div key={id} className={`rapida ${v ? 'rapida--on' : ''}`}>
                          <button onClick={() => cambiarAccion(a.jugadorId, id, v + 1)} aria-label={`Añadir ${def.nombre}`}>
                            <span className="rapida__icono">{def.icono}</span>
                            {v > 0 && <span className="rapida__n">{v}</span>}
                          </button>
                          {v > 0 && (
                            <button className="rapida__menos" onClick={() => cambiarAccion(a.jugadorId, id, v - 1)} aria-label={`Quitar ${def.nombre}`}>
                              −
                            </button>
                          )}
                        </div>
                      )
                    })}
                    <button className="enlace" onClick={() => alternar(a.jugadorId)}>
                      {abiertos.has(a.jugadorId) ? 'Menos' : '+ más acciones'}
                    </button>
                  </div>
                  {abiertos.has(a.jugadorId) && (
                    <div className="mas-acciones">
                      {grupos.map((g) => (
                        <div key={g}>
                          <h3>{{ portero: 'Portería', ofensiva: 'Ataque', defensiva: 'Defensa', negativa: 'Errores y tarjetas' }[g]}</h3>
                          {lista.filter((x) => x.grupo === g).map((x) => (
                            <div key={x.id} className="accion-fila">
                              <span>{x.icono} {x.nombre}</span>
                              <Contador valor={a.acciones[x.id] ?? 0} onChange={(v) => cambiarAccion(a.jugadorId, x.id, v)} max={30} />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {paso === 5 && simulacion && (
        <>
          <section className="tarjeta">
            <h2>MVP del partido</h2>
            <div className="mvp-candidatos">
              {candidatos.map((jid, i) => {
                const j = jugador(jid)
                const e = calculo.jugadores[jid]
                return (
                  <button key={jid} className={p.mvpId === jid ? 'activa' : ''} onClick={() => setP({ ...p, mvpId: jid })}>
                    <MiniCarta jugador={j} media={e.media} diseno={disenoDe(j, e.media, config, e.rangosAlcanzados)} config={config} ancho={62} />
                    <strong>{nombreVisible(j)}</strong>
                    <span>{fmt1(notas[jid])} · {i + 1}º</span>
                  </button>
                )
              })}
            </div>
            <button className={`boton boton--sec boton--ancho ${p.mvpId === null ? 'boton--marcado' : ''}`} onClick={() => setP({ ...p, mvpId: null })}>
              Ningún MVP esta jornada
            </button>
            <p className="nota">El MVP suma +{fmt2(cfgPartido.premioMvp)} a su media y los otros dos nominados +{fmt2(cfgPartido.premioNominado)} (menos a partir de {cfgPartido.premioDesde}). Sin MVP no hay premio.</p>
          </section>

          <section className="tarjeta">
            <h2>Notas y cambios de media</h2>
            <ul className="resumen">
              {[...jugaron]
                .sort((a, b) => notas[b.jugadorId] - notas[a.jugadorId])
                .map((a) => {
                  const j = jugador(a.jugadorId)
                  const cambio = simulacion.cambios[a.jugadorId] ?? 0
                  const antes = calculo.jugadores[a.jugadorId]
                  return (
                    <li key={a.jugadorId}>
                      <span className="pildora" style={{ background: colorNota(notas[a.jugadorId]) }}>{fmt1(notas[a.jugadorId])}</span>
                      <strong>{nombreVisible(j)}{p.mvpId === a.jugadorId ? ' ⭐' : ''}</strong>
                      <span className={cambio >= 0 ? 'sube' : 'baja'}>{conSigno(cambio, fmt2)}</span>
                      <span className="resumen__media">{original ? mediaVisible(antes.media) : `${mediaVisible(antes.media)}→${mediaVisible(antes.media + cambio)}`}</span>
                    </li>
                  )
                })}
            </ul>
            {original && <p className="nota">Al editar, se recalculan en cascada todos los partidos posteriores.</p>}
          </section>
        </>
      )}

      {paso === 6 && (
        <section className="tarjeta confirmar">
          <div className="marcador">
            <span>{p.local ? equipo.nombre : p.rival}</span>
            <strong>{p.local ? `${p.golesFavor} - ${p.golesContra}` : `${p.golesContra} - ${p.golesFavor}`}</strong>
            <span>{p.local ? p.rival : equipo.nombre}</span>
          </div>
          <p className="nota centro">{p.competicion} · {p.fecha.split('-').reverse().join('/')} · {jugaron.length} jugadores con minutos</p>
          <p>
            MVP: <strong>{p.mvpId ? nombreVisible(jugador(p.mvpId)) : 'ninguno'}</strong>
          </p>
          <p className="nota">
            Al confirmar se guardan las notas, se actualizan las medias y se hace una copia automática. {original ? 'Podrás deshacer esta edición desde el propio partido.' : ''}
          </p>
          {(() => {
            const suben = jugaron.filter((a) => {
              const e = calculo.jugadores[a.jugadorId]
              const c = simulacion?.cambios[a.jugadorId] ?? 0
              return rango(config, e.media + c).id !== rango(config, e.media).id && c > 0
            })
            return suben.length > 0 && !original ? (
              <p className="nota">🎉 Suben de rango: {suben.map((a) => nombreVisible(jugador(a.jugadorId))).join(', ')}</p>
            ) : null
          })()}
        </section>
      )}

      <div className="asistente__pie">
        {paso > 0 && (
          <button className="boton boton--sec" onClick={() => setPaso(paso - 1)}>
            Atrás
          </button>
        )}
        {paso < PASOS.length - 1 ? (
          <button className="boton" onClick={siguiente}>Siguiente</button>
        ) : (
          <button className="boton" onClick={guardar} disabled={guardando}>
            <Icono nombre="check" tam={18} /> {original ? 'Guardar y recalcular' : 'Confirmar partido'}
          </button>
        )}
      </div>
    </>
  )
}
