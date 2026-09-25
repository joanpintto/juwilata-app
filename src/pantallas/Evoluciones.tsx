import { conSigno, fmt1, ir, nombreVisible, type Datos } from '../datos'
import { mediaVisible } from '../motor/calculo'
import { rolPorId } from '../motor/config'
import { MiniCarta } from '../componentes/Carta'
import { disenoDe } from '../componentes/disenos'
import { Cabecera, Vacio } from '../componentes/ui'
import { Tendencia } from './Jugadores'

// Fase 1: solo la clasificación interna por media. El comparador, la galería
// y los gráficos completos llegan en la Fase 2.
export function Evoluciones({ datos }: { datos: Datos }) {
  const { calculo, config } = datos
  const lista = Object.values(calculo.jugadores).sort((a, b) => b.media - a.media)

  return (
    <>
      <Cabecera titulo="Evoluciones" sub="Clasificación interna por media" />
      {!lista.length && <Vacio titulo="Sin jugadores" />}
      <ol className="ranking">
        {lista.map((e, i) => (
          <li key={e.jugador.id}>
            <button onClick={() => ir(`/jugador/${e.jugador.id}`)}>
              <span className="ranking__pos">{i + 1}</span>
              <MiniCarta jugador={e.jugador} media={e.media} diseno={disenoDe(e.jugador, e.media, config, e.rangosAlcanzados)} config={config} ancho={40} />
              <div className="ranking__texto">
                <strong>{nombreVisible(e.jugador)}</strong>
                <span>{rolPorId(config, e.jugador.rol).sigla} · {conSigno(e.media - e.mediaInicial)} esta temporada</span>
              </div>
              <span className="ranking__media">
                {mediaVisible(e.media)} <Tendencia valor={e.tendencia} />
                <small>{fmt1(e.media)}</small>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="nota centro">Comparador, galería de cartas y gráficos llegan en la Fase 2.</p>
    </>
  )
}
