import { db } from '../db'
import { colorNota, conSigno, fechaLarga, fmt1, fmt2, ir, nombreVisible, type Datos } from '../datos'
import { ACCIONES } from '../motor/config'
import { MiniCarta } from '../componentes/Carta'
import { disenoDe } from '../componentes/disenos'
import { Cabecera, Icono } from '../componentes/ui'
import { MarcadorHero, PodioMvp } from '../componentes/Marcador'
import { resumenPartido } from './resumenPartido'
import { avisar, confirmar } from '../componentes/dialogos'
import { BannerDeshacer } from './Partidos'

export function DetallePartido({ datos, id }: { datos: Datos; id: string }) {
  const { calculo, equipo, config } = datos
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

  const jugaron = p.actuaciones
    .filter((a) => r.notas[a.jugadorId] !== undefined && calculo.jugadores[a.jugadorId])
    .sort((a, b) => r.notas[b.jugadorId] - r.notas[a.jugadorId])
  const sinJugar = p.actuaciones.filter((a) => r.notas[a.jugadorId] === undefined && calculo.jugadores[a.jugadorId] && a.estado !== 'no_convocado')

  return (
    <>
      <Cabecera
        titulo={resumen.jornada ? `Jornada ${resumen.jornada}` : p.competicion}
        sub={`${fechaLarga(p.fecha)}${resumen.jornada ? ` · ${p.competicion}` : ''}`}
        atras="/partidos"
        acciones={
          <button className="boton-icono" onClick={() => ir(`/partido/${p.id}/editar`)} aria-label="Editar partido">
            <Icono nombre="editar" />
          </button>
        }
      />
      <BannerDeshacer />

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
        </ul>
        {sinJugar.length > 0 && (
          <p className="nota">
            Sin minutos: {sinJugar.map((a) => `${nombreVisible(calculo.jugadores[a.jugadorId].jugador)}${a.estado === 'baja' ? ' (baja)' : ''}`).join(', ')}
          </p>
        )}
      </section>

      <div className="acciones-ficha">
        <button className="boton boton--sec" onClick={() => ir(`/partido/${p.id}/editar`)}>
          <Icono nombre="editar" tam={16} /> Editar
        </button>
        <button className="boton boton--sec boton--texto-peligro" onClick={eliminar}>Eliminar</button>
      </div>
      {p.editado && <p className="nota centro">Editado el {new Date(p.editado).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
    </>
  )
}
