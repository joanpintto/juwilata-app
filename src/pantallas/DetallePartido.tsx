import { useState } from 'react'
import { SOLO_LECTURA, db } from '../db'
import { colorNota, conSigno, fmt1, fmt2, ir, nombreMister, nombreVisible, type Datos } from '../datos'
import { ACCIONES } from '../motor/config'
import { MiniCarta, MiniCartaMister } from '../componentes/Carta'
import { disenoDe, disenoMister } from '../componentes/disenos'
import { Cabecera, Icono, Vacio } from '../componentes/ui'
import { EscudoRival } from '../componentes/Piezas'
import { EscudoLogro } from '../componentes/Logros'
import { NOMBRE_NIVEL } from '../motor/logros'
import { resumenPartido } from './resumenPartido'
import { claveIF, yaTiene } from '../motor/premios'
import { darEspecial } from '../componentes/especiales'
import { avisar, confirmar } from '../componentes/dialogos'
import { BannerDeshacer } from './Partidos'

type Pestana = 'resumen' | 'alineacion' | 'notas'
const BASE = import.meta.env.BASE_URL

export function DetallePartido({ datos, id }: { datos: Datos; id: string }) {
  const { calculo, equipo, config, mister, misterFicha, programados, logros } = datos
  const [pestana, setPestana] = useState<Pestana>('resumen')
  const r = calculo.partidos.find((x) => x.partido.id === id)
  const resumen = resumenPartido(datos, id)
  if (!r || !resumen) return <Cabecera titulo="Partido no encontrado" atras="/liga" />
  const p = r.partido

  const eliminar = async () => {
    const ok = await confirmar({
      titulo: '¿Eliminar este partido?',
      texto: 'Se recalculará toda la temporada sin él. Podrás deshacerlo justo después.',
      aceptar: 'Eliminar',
      peligro: true,
    })
    if (!ok) return
    await db.transaction('rw', db.partidos, db.deshacer, async () => {
      await db.deshacer.put({ id: 'ultimo', fecha: new Date().toISOString(), partidoId: p.id, anterior: p, descripcion: `Borrado del partido contra ${p.rival}` })
      await db.partidos.delete(p.id)
    })
    avisar('Partido eliminado')
    ir('/liga', true)
  }

  // IF sugerida: mejor nota ponderada del partido, si llega al mínimo (§9).
  const mejorNP = resumen.filas.reduce<{ e: (typeof resumen.filas)[number]['e']; np: number } | null>(
    (m, f) => (!m || f.paso.notaPonderada > m.np ? { e: f.e, np: f.paso.notaPonderada } : m),
    null,
  )
  const sugerenciaIF = mejorNP && mejorNP.np >= config.ifNotaMinima ? mejorNP : null

  const jugaron = p.actuaciones
    .filter((a) => r.notas[a.jugadorId] !== undefined && calculo.jugadores[a.jugadorId])
    .sort((a, b) => r.notas[b.jugadorId] - r.notas[a.jugadorId])
  const sinJugar = p.actuaciones.filter((a) => r.notas[a.jugadorId] === undefined && calculo.jugadores[a.jugadorId] && a.estado !== 'no_convocado')

  const prog = programados.find((g) => g.id === p.programadoId)
  const [a, m, d] = p.fecha.split('-').map(Number)
  const dia = new Date(a, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')
  const cabecera = [dia.charAt(0).toUpperCase() + dia.slice(1), prog?.hora, p.local ? 'En casa' : 'Fuera'].filter(Boolean).join(' · ')
  const nombre = (jid: string | null) => {
    const e = jid ? calculo.jugadores[jid] : null
    return e ? nombreVisible(e.jugador) : ''
  }

  // Goles: con minuto si se apuntaron; si no (partidos antiguos), a partir de las acciones.
  const goles = p.goles?.length
    ? [...p.goles].sort((x, y) => (x.minuto ?? 999) - (y.minuto ?? 999))
    : [
        ...resumen.goleadores.flatMap((g) => Array.from({ length: g.n }, (_, k) => ({ id: g.e.jugador.id + k, lado: 'favor' as const, jugadorId: g.e.jugador.id, asistenciaId: null, minuto: null }))),
        ...Array.from({ length: p.golesContra }, (_, k) => ({ id: `r${k}`, lado: 'contra' as const, jugadorId: null, asistenciaId: null, minuto: null })),
      ]
  const figura = resumen.mvp ?? resumen.filas[0] ?? null
  const cambios = [...resumen.filas].sort((x, y) => y.paso.cambio - x.paso.cambio)
  const desbloqueos = logros.desbloqueos.filter((x) => x.partidoId === p.id)
  const titulares = p.actuaciones.filter((x) => x.estado === 'titular' && r.notas[x.jugadorId] !== undefined && calculo.jugadores[x.jugadorId])
  const lineas = (['DEL', 'MED', 'DEF', 'POR'] as const).map((l) =>
    titulares
      .filter((x) => (l === 'DEF' ? x.posicion === 'DFC' || x.posicion === 'LAT' : x.posicion === l))
      .sort((x, y) => (x.posicion === 'LAT' ? -1 : 0) - (y.posicion === 'LAT' ? -1 : 0)),
  )
  const suplentes = p.actuaciones.filter((x) => x.estado === 'suplente' && r.notas[x.jugadorId] !== undefined && calculo.jugadores[x.jugadorId])
  const lineaDef = lineas[2]
  // Laterales a los lados y centrales en medio.
  if (lineaDef.length > 2) {
    const lats = lineaDef.filter((x) => x.posicion === 'LAT')
    const cen = lineaDef.filter((x) => x.posicion !== 'LAT')
    lineas[2] = lats.length === 2 ? [lats[0], ...cen, lats[1]] : lineaDef
  }
  const mini = (jid: string, ancho: number) => {
    const e = calculo.jugadores[jid]
    return <MiniCarta jugador={e.jugador} media={e.media} diseno={disenoDe(e.jugador, e.media, config, e.rangosAlcanzados)} config={config} ancho={ancho} />
  }
  const infoFigura = figura
    ? [
        figura.paso.acciones.gol ? `${figura.paso.acciones.gol} gol${figura.paso.acciones.gol > 1 ? 'es' : ''}` : null,
        figura.paso.acciones.asistencia ? `${figura.paso.acciones.asistencia} asistencia${figura.paso.acciones.asistencia > 1 ? 's' : ''}` : null,
        figura.paso.mvp ? 'MVP' : null,
        `${figura.paso.minutos}′`,
      ].filter(Boolean).join(' · ')
    : ''

  return (
    <>
      <Cabecera
        titulo="Partido"
        atras={true}
        acciones={
          <button className="boton-icono editable" onClick={() => ir(`/partido/${p.id}/editar`)} aria-label="Editar partido">
            <Icono nombre="editar" />
          </button>
        }
      />
      {!SOLO_LECTURA && <BannerDeshacer />}

      <section className="tarjeta marcador-cristal">
        <p className="marcador-cristal__comp">{p.competicion}{resumen.jornada ? ` · ${resumen.jornada}` : ''}</p>
        <p className="marcador-cristal__fecha">{cabecera}</p>
        <div className="marcador-cristal__fila">
          {p.local ? <div><img src={`${BASE}escudo.png`} alt="" /><span>{equipo.nombre}</span></div> : <div><EscudoRival nombre={p.rival} tam={48} /><span>{p.rival}</span></div>}
          <div className="marcador-cristal__goles">
            <strong>{p.local ? p.golesFavor : p.golesContra}<span>–</span>{p.local ? p.golesContra : p.golesFavor}</strong>
            <small>Final</small>
          </div>
          {p.local ? <div><EscudoRival nombre={p.rival} tam={48} /><span>{p.rival}</span></div> : <div><img src={`${BASE}escudo.png`} alt="" /><span>{equipo.nombre}</span></div>}
        </div>
      </section>

      <nav className="subpestanas">
        {(['resumen', 'alineacion', 'notas'] as Pestana[]).map((x) => (
          <button key={x} className={pestana === x ? 'activa' : ''} onClick={() => setPestana(x)}>
            {{ resumen: 'Resumen', alineacion: 'Alineación', notas: 'Notas' }[x]}
          </button>
        ))}
      </nav>

      {pestana === 'resumen' && (
        <>
          {goles.length > 0 && (
            <section className="tarjeta goles-lista">
              <span className="etiqueta-seccion">Goles</span>
              {goles.map((g) =>
                g.lado === 'favor' ? (
                  <div key={g.id} className="gol">
                    <span className="gol__min">{g.minuto !== null ? `${g.minuto}′` : ''}</span>
                    <span className="gol__balon">◎</span>
                    <div className="gol__texto">
                      <strong>{g.jugadorId ? nombre(g.jugadorId).toUpperCase() : 'EN PROPIA DEL RIVAL'}</strong>
                      {g.asistenciaId && <span>Asistencia de {nombre(g.asistenciaId)}</span>}
                    </div>
                    <img src={`${BASE}escudo.png`} alt="" className="gol__escudo" />
                  </div>
                ) : (
                  <div key={g.id} className="gol gol--rival">
                    <EscudoRival nombre={p.rival} tam={24} />
                    <div className="gol__texto"><strong>Gol rival</strong></div>
                    <span className="gol__balon">◎</span>
                    <span className="gol__min">{g.minuto !== null ? `${g.minuto}′` : ''}</span>
                  </div>
                ),
              )}
              {!p.goles?.length && <p className="nota">Este partido se registró sin los minutos de los goles.</p>}
            </section>
          )}

          {figura && (
            <>
              <span className="etiqueta-seccion">Jugador del partido</span>
              <button className="tarjeta figura" onClick={() => ir(`/jugador/${figura.e.jugador.id}`)}>
                {mini(figura.e.jugador.id, 72)}
                <div>
                  <strong>{nombreVisible(figura.e.jugador).toUpperCase()}</strong>
                  <span>{infoFigura}</span>
                </div>
                <span className="figura__nota" style={{ color: colorNota(figura.paso.nota) }}>{fmt1(figura.paso.nota)}</span>
              </button>
            </>
          )}

          {sugerenciaIF && !SOLO_LECTURA && (
            <section className="tarjeta sugerencia">
              <MiniCarta jugador={sugerenciaIF.e.jugador} media={sugerenciaIF.e.media} diseno="IF" config={config} ancho={46} />
              <div className="sugerencia__texto">
                <strong>IF sugerida: {nombreVisible(sugerenciaIF.e.jugador)}</strong>
                <span>Mejor nota ponderada del partido ({fmt2(sugerenciaIF.np)})</span>
              </div>
              {yaTiene(sugerenciaIF.e.jugador, 'IF', claveIF(p.id)) ? (
                <span className="dado"><Icono nombre="check" tam={16} /> Dada</span>
              ) : (
                <button
                  className="boton boton--peq"
                  onClick={async () => {
                    await darEspecial(sugerenciaIF.e.jugador, 'IF', claveIF(p.id), p.fecha)
                    avisar(`IF para ${nombreVisible(sugerenciaIF.e.jugador)}`)
                  }}
                >
                  Dar IF
                </button>
              )}
            </section>
          )}

          {cambios.length > 0 && (
            <>
              <span className="etiqueta-seccion">Cambios de media</span>
              <section className="tarjeta cambios-media">
                {cambios.map((f) => (
                  <button key={f.e.jugador.id} onClick={() => ir(`/jugador/${f.e.jugador.id}`)}>
                    {mini(f.e.jugador.id, 36)}
                    <strong>{nombreVisible(f.e.jugador).toUpperCase()}</strong>
                    <span className="cambios-media__antes">{fmt1(f.paso.mediaAntes)} →</span>
                    <span className="cambios-media__despues">{fmt1(f.paso.mediaDespues)}</span>
                    <span className={f.paso.cambio >= 0 ? 'sube' : 'baja'}>{conSigno(f.paso.cambio)}</span>
                  </button>
                ))}
              </section>
            </>
          )}

          {desbloqueos.map((x) => {
            const def = logros.defs.find((l) => l.id === x.logroId)
            const lista = x.jugadorId === 'mister' ? logros.mister : x.jugadorId ? logros.jugadores[x.jugadorId] : logros.equipo
            const estado = lista?.find((l) => l.def.id === x.logroId)
            if (!def || !estado) return null
            const quien = x.jugadorId === 'mister' ? nombreMister(misterFicha) : x.jugadorId ? nombre(x.jugadorId) : equipo.nombre
            return (
              <section key={`${x.logroId}${x.jugadorId}${x.nivel}`} className="tarjeta logro-desbloqueado">
                <EscudoLogro estado={{ ...estado, nivel: x.nivel }} tam={40} />
                <div>
                  <strong>Logro desbloqueado: {def.nombre}</strong>
                  <span>{quien} · {def.descripcion}{def.niveles ? ` · nivel ${NOMBRE_NIVEL[x.nivel].toLowerCase()}` : ''}</span>
                </div>
              </section>
            )
          })}

          <button className="boton boton--sec boton--ancho" onClick={() => ir(`/partido/${p.id}/resumen`)}>
            <Icono nombre="estrella" tam={18} /> Ver resumen animado
          </button>
        </>
      )}

      {pestana === 'alineacion' && (
        <>
          {!titulares.length ? (
            <Vacio titulo="Sin alineación" texto="Este partido no tiene titulares apuntados." />
          ) : (
            <div className="alineacion">
              {lineas.map((l, i) => l.length > 0 && (
                <div key={i} className="alineacion__linea">
                  {l.map((x) => (
                    <button key={x.jugadorId} onClick={() => ir(`/jugador/${x.jugadorId}`)}>
                      {mini(x.jugadorId, 58)}
                      <span style={{ color: colorNota(r.notas[x.jugadorId]) }}>{fmt1(r.notas[x.jugadorId])}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
          {suplentes.length > 0 && (
            <section className="tarjeta">
              <span className="etiqueta-seccion">Suplentes que jugaron</span>
              <ul className="lista-simple">
                {suplentes.map((x) => (
                  <li key={x.jugadorId}>
                    <span>{nombre(x.jugadorId)}</span>
                    <strong>entra en el {Math.max(0, equipo.duracionPartido - x.minutos)}′ · {fmt1(r.notas[x.jugadorId])}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {pestana === 'notas' && (
      <section className="tarjeta">
        <ul className="actuaciones">
          {jugaron.map((a) => {
            const e = calculo.jugadores[a.jugadorId]
            const j = e.jugador
            const cambio = r.cambios[a.jugadorId]
            const acciones = ACCIONES.filter((x) => a.acciones[x.id])
            return (
              <li key={a.jugadorId}>
                <button onClick={() => ir(`/jugador/${j.id}`)}>
                  <MiniCarta jugador={j} media={e.media} diseno={disenoDe(j, e.media, config, e.rangosAlcanzados)} config={config} ancho={40} />
                  <div className="actuaciones__texto">
                    <strong>
                      {nombreVisible(j)} {p.mvpId === j.id ? '⭐ MVP' : p.mvpId && p.nominados.includes(j.id) ? '· nominado' : ''}
                    </strong>
                    <span>
                      {a.minutos}′ {a.estado === 'suplente' ? '(supl.)' : ''} {acciones.map((x) => `${x.icono}${(a.acciones[x.id] ?? 0) > 1 ? `×${a.acciones[x.id]}` : ''}`).join(' ')}
                    </span>
                  </div>
                  <div className="actuaciones__nums">
                    <span className="pildora" style={{ background: colorNota(r.notas[a.jugadorId]) }}>{fmt1(r.notas[a.jugadorId])}</span>
                    <span className={cambio >= 0 ? 'sube' : 'baja'}>{conSigno(cambio, fmt2)}</span>
                  </div>
                </button>
              </li>
            )
          })}
          {mister.porPartido[p.id] && (() => {
            const pm = mister.porPartido[p.id]
            const d = pm.detalle
            const partes = [
              ['resultado', d.resultado + d.goles], ['el grupo', d.grupo], ['portería a 0', d.porteriaCero], ['rival', d.rival],
            ].filter(([, v]) => Math.abs(v as number) >= 0.005).map(([k, v]) => `${k} ${conSigno(v as number, fmt2)}`)
            return (
              <li className="actuaciones__mister">
                <button onClick={() => ir('/mister')}>
                  <MiniCartaMister mister={misterFicha} media={mister.media} diseno={disenoMister(misterFicha, mister.media, config, mister.rangosAlcanzados)} ancho={40} />
                  <div className="actuaciones__texto">
                    <strong>{nombreMister(misterFicha)} · ENT</strong>
                    <span>{partes.join(' · ') || 'nota base'}</span>
                  </div>
                  <div className="actuaciones__nums">
                    <span className="pildora" style={{ background: colorNota(pm.nota) }}>{fmt1(pm.nota)}</span>
                    <span className={pm.cambio >= 0 ? 'sube' : 'baja'}>{conSigno(pm.cambio, fmt2)}</span>
                  </div>
                </button>
              </li>
            )
          })()}
        </ul>
        {p.misterDirigio === false && <p className="nota">El míster no dirigió este partido: no cuenta para su carta.</p>}
        {sinJugar.length > 0 && (
          <p className="nota">
            Sin minutos: {sinJugar.map((a) => `${nombreVisible(calculo.jugadores[a.jugadorId].jugador)}${a.estado === 'baja' ? ' (baja)' : ''}`).join(', ')}
          </p>
        )}
      </section>
      )}

      <div className="acciones-ficha editable">
        <button className="boton boton--sec" onClick={() => ir(`/partido/${p.id}/editar`)}>
          <Icono nombre="editar" tam={16} /> Editar
        </button>
        <button className="boton boton--sec boton--texto-peligro" onClick={eliminar}>Eliminar</button>
      </div>
      {p.editado && <p className="nota centro">Editado el {new Date(p.editado).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
    </>
  )
}
