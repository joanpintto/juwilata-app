import { conSigno, fechaLarga, fmt1, fmt2, ir, nombreRival, nombreVisible, proximoPartido, type Datos } from '../datos'
import type { EstadoJugador } from '../motor/temporada'
import { MiniCarta } from '../componentes/Carta'
import { disenoDe } from '../componentes/disenos'
import { Icono } from '../componentes/ui'
import { Tendencia } from './Jugadores'

interface Destacado {
  titulo: string
  e: EstadoJugador | null
  valor: string
}

function mejor(lista: EstadoJugador[], puntuar: (e: EstadoJugador) => number, filtro: (e: EstadoJugador) => boolean = () => true): EstadoJugador | null {
  const candidatos = lista.filter(filtro)
  if (!candidatos.length) return null
  return candidatos.reduce((a, b) => (puntuar(b) > puntuar(a) ? b : a))
}

export function Inicio({ datos }: { datos: Datos }) {
  const { equipo, temporada, calculo, config, jugadores, programados, partidos, rivales } = datos
  const proximo = proximoPartido(programados, partidos)
  const lista = Object.values(calculo.jugadores)
  const res = calculo.partidos.map((r) => r.partido)
  const pj = res.length
  const v = res.filter((p) => p.golesFavor > p.golesContra).length
  const e = res.filter((p) => p.golesFavor === p.golesContra).length
  const gf = res.reduce((s, p) => s + p.golesFavor, 0)
  const gc = res.reduce((s, p) => s + p.golesContra, 0)

  const mediaEquipo = lista.length ? lista.reduce((s, x) => s + x.media, 0) / lista.length : null
  const ultimo = calculo.partidos[calculo.partidos.length - 1]
  const cambioEquipo = ultimo && lista.length ? lista.reduce((s, x) => s + (ultimo.cambios[x.jugador.id] ?? 0), 0) / lista.length : 0

  const conPartidos = (x: EstadoJugador) => x.estadisticas.partidos > 0
  const puntPortero = (x: EstadoJugador) => {
    const s = x.estadisticas
    return 0.1 * s.paradas + 1.0 * s.porteriasCero - 0.5 * (s.partidos ? s.golesEncajados / s.partidos : 0)
  }
  const goleador = mejor(lista, (x) => x.estadisticas.goles, (x) => x.estadisticas.goles > 0)
  const asistente = mejor(lista, (x) => x.estadisticas.asistencias, (x) => x.estadisticas.asistencias > 0)
  const portero = mejor(lista, puntPortero, (x) => x.jugador.posicion === 'POR' && conPartidos(x))
  const defensa = mejor(lista, (x) => x.estadisticas.notaMedia ?? 0, (x) => (x.jugador.posicion === 'DFC' || x.jugador.posicion === 'LAT') && conPartidos(x))
  const mvps = mejor(lista, (x) => x.estadisticas.mvps, (x) => x.estadisticas.mvps > 0)
  const evolucion = mejor(lista, (x) => x.media - x.mediaInicial, (x) => conPartidos(x) && x.media - x.mediaInicial > 0)

  const destacados: Destacado[] = [
    { titulo: 'Goleador', e: goleador, valor: goleador ? `${goleador.estadisticas.goles} goles` : '' },
    { titulo: 'Asistente', e: asistente, valor: asistente ? `${asistente.estadisticas.asistencias} asist.` : '' },
    { titulo: 'Mejor portero', e: portero, valor: portero ? `${fmt2(puntPortero(portero))} pts` : '' },
    { titulo: 'Mejor defensa', e: defensa, valor: defensa ? `nota ${fmt2(defensa.estadisticas.notaMedia ?? 0)}` : '' },
    { titulo: 'Más MVPs', e: mvps, valor: mvps ? `${mvps.estadisticas.mvps} MVP` : '' },
    { titulo: 'Mayor evolución', e: evolucion, valor: evolucion ? conSigno(evolucion.media - evolucion.mediaInicial) : '' },
  ]

  return (
    <>
      <header className="portada">
        <img src={`${import.meta.env.BASE_URL}escudo.png`} alt="Escudo del Juwilata United" />
        <div>
          <h1>{equipo.nombre}</h1>
          <p>Temporada {temporada.nombre} · desde {equipo.fundado}</p>
        </div>
      </header>

      {!jugadores.length ? (
        <section className="tarjeta bienvenida">
          <h2>¡Empieza la temporada!</h2>
          <ol className="pasos">
            <li>Revisa el nombre del equipo y la temporada en <strong>Ajustes</strong>.</li>
            <li>Añade a los jugadores en <strong>Plantilla</strong>, portero incluido.</li>
            <li>Después de cada partido, regístralo en <strong>Partidos</strong>.</li>
          </ol>
          <button className="boton" onClick={() => ir('/jugador/nuevo')}>Añadir el primer jugador</button>
        </section>
      ) : proximo ? (
        <section className="tarjeta proximo">
          <span className="proximo__j">J{proximo.jornada}</span>
          <div className="proximo__texto">
            <strong>{proximo.local ? 'vs' : 'en'} {nombreRival(rivales, proximo.rivalId)}</strong>
            <span>{proximo.fecha ? fechaLarga(proximo.fecha) : 'Sin fecha'}{proximo.hora ? ` · ${proximo.hora}` : ''}</span>
          </div>
          <button className="boton boton--peq" onClick={() => ir(`/partido/nuevo/${proximo.id}`)}>Registrar</button>
        </section>
      ) : (
        <button className="boton boton--grande" onClick={() => ir('/partido/nuevo')}>
          <Icono nombre="mas" tam={20} /> Registrar partido
        </button>
      )}

      <section className="tarjeta">
        <h2>Temporada</h2>
        <div className="resultados">
          {([['PJ', pj], ['V', v], ['E', e], ['D', pj - v - e], ['GF', gf], ['GC', gc]] as [string, number][]).map(([k, n]) => (
            <div key={k} className={`resultados__${k}`}>
              <strong>{n}</strong>
              <span>{k}</span>
            </div>
          ))}
        </div>
        <p className="nota">{pj} de {equipo.partidosTemporada} partidos jugados</p>
      </section>

      {mediaEquipo !== null && (
        <section className="tarjeta media-equipo">
          <div>
            <h2>Media del equipo</h2>
            <p className="nota">{lista.length} jugadores · cambio en el último partido: {conSigno(cambioEquipo, fmt2)}</p>
          </div>
          <strong>
            {fmt1(mediaEquipo)} <Tendencia valor={cambioEquipo} />
          </strong>
        </section>
      )}

      {pj > 0 && (
        <section className="tarjeta">
          <h2>Destacados</h2>
          <div className="destacados">
            {destacados.map((d) => (
              <button key={d.titulo} className="destacado" disabled={!d.e} onClick={() => d.e && ir(`/jugador/${d.e.jugador.id}`)}>
                {d.e ? (
                  <MiniCarta jugador={d.e.jugador} media={d.e.media} diseno={disenoDe(d.e.jugador, d.e.media, config, d.e.rangosAlcanzados)} config={config} ancho={48} />
                ) : (
                  <span className="destacado__hueco" />
                )}
                <span className="destacado__titulo">{d.titulo}</span>
                <strong>{d.e ? nombreVisible(d.e.jugador) : '—'}</strong>
                <span className="destacado__valor">{d.valor}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="tarjeta">
        <h2>Vitrina del equipo</h2>
        <p className="nota">Los logros del equipo llegan en la Fase 2.</p>
      </section>
    </>
  )
}
