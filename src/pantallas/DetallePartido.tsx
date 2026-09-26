import { SOLO_LECTURA, db } from '../db'
import { colorNota, conSigno, fechaLarga, fmt1, fmt2, ir, nombreMister, nombreVisible, type Datos } from '../datos'
import { ACCIONES } from '../motor/config'
import { MiniCarta, MiniCartaMister } from '../componentes/Carta'
import { disenoDe, disenoMister } from '../componentes/disenos'
import { Cabecera, Icono } from '../componentes/ui'
import { MarcadorHero, PodioMvp } from '../componentes/Marcador'
import { resumenPartido } from './resumenPartido'
import { claveIF, yaTiene } from '../motor/premios'
import { darEspecial } from '../componentes/especiales'
import { avisar, confirmar } from '../componentes/dialogos'
import { BannerDeshacer } from './Partidos'

export function DetallePartido({ datos, id }: { datos: Datos; id: string }) {
  const { calculo, equipo, config, mister, misterFicha } = datos
  const r = calculo.partidos.find((x) => x.partido.id === id)
  const resumen = resumenPartido(datos, id)
  if (!r || !resumen) return <Cabecera titulo="Partido no encontrado" atras="/partidos" />
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
    ir('/partidos', true)
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

  return (
    <>
      <Cabecera
        titulo={resumen.jornada ?? p.competicion}
        sub={`${fechaLarga(p.fecha)}${resumen.jornada ? ` · ${p.competicion}` : ''}`}
        atras="/partidos"
        acciones={
          <button className="boton-icono editable" onClick={() => ir(`/partido/${p.id}/editar`)} aria-label="Editar partido">
            <Icono nombre="editar" />
          </button>
        }
      />
      {!SOLO_LECTURA && <BannerDeshacer />}

      <section className="tarjeta tarjeta--hero">
        <MarcadorHero resumen={resumen} equipo={equipo.nombre} />
        {(resumen.goleadores.length > 0 || resumen.asistentes.length > 0) && (
          <div className="hero__detalle">
            {resumen.goleadores.length > 0 && (
              <span>⚽ {resumen.goleadores.map((g) => `${nombreVisible(g.e.jugador)}${g.n > 1 ? ` ×${g.n}` : ''}`).join(', ')}</span>
            )}
            {resumen.asistentes.length > 0 && (
              <span>🅰 {resumen.asistentes.map((g) => `${nombreVisible(g.e.jugador)}${g.n > 1 ? ` ×${g.n}` : ''}`).join(', ')}</span>
            )}
          </div>
        )}
      </section>

      {(resumen.mvp || resumen.nominados.length > 0) && (
        <section className="tarjeta tarjeta--podio">
          <h2>{resumen.mvp ? 'MVP de la jornada' : 'Nominados (sin MVP)'}</h2>
          <PodioMvp resumen={resumen} config={config} compacto />
        </section>
      )}

      {sugerenciaIF && !SOLO_LECTURA && (
        <section className="tarjeta sugerencia">
          <MiniCarta jugador={sugerenciaIF.e.jugador} media={sugerenciaIF.e.media} diseno="IF" config={config} ancho={46} />
          <div className="sugerencia__texto">
            <strong>IF sugerida: {nombreVisible(sugerenciaIF.e.jugador)}</strong>
            <span>Mejor nota ponderada del partido ({fmt2(sugerenciaIF.np)})</span>
          </div>
          {SOLO_LECTURA ? null : yaTiene(sugerenciaIF.e.jugador, 'IF', claveIF(p.id)) ? (
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

      <button className="boton boton--sec boton--ancho" onClick={() => ir(`/partido/${p.id}/resumen`)}>
        <Icono nombre="estrella" tam={18} /> Ver resumen animado
      </button>

      <section className="tarjeta">
        <h2>Actuaciones</h2>
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
