import { db } from '../db'
import { SUBPESTANAS_PLANTILLA, ir, nombreVisible, type Datos } from '../datos'
import { avisar } from '../componentes/dialogos'
import { mediaVisible } from '../motor/calculo'
import { POSICIONES, rolPorId } from '../motor/config'
import { MiniCarta } from '../componentes/Carta'
import { disenoDe } from '../componentes/disenos'
import { Cabecera, Icono, Subpestanas, Vacio } from '../componentes/ui'

export function Tendencia({ valor }: { valor: number }) {
  if (valor > 0.005) return <span className="tend tend--sube">▲</span>
  if (valor < -0.005) return <span className="tend tend--baja">▼</span>
  return null
}

export function Jugadores({ datos }: { datos: Datos }) {
  const { jugadores, calculo, config, todosJugadores, temporada, temporadas } = datos
  const posActual = temporadas.findIndex((t) => t.id === temporada.id)
  // Jugadores que estuvieron antes pero no están en la plantilla de esta temporada.
  const exjugadores = todosJugadores.filter(
    (j) => !jugadores.some((x) => x.id === j.id) && temporadas.findIndex((t) => t.id === j.temporadaId) <= posActual,
  )

  return (
    <>
      <Cabecera
        titulo="Plantilla"
        sub={`${jugadores.length} jugadores`}
        acciones={
          <button className="boton boton--peq" onClick={() => ir('/jugador/nuevo')}>
            <Icono nombre="mas" tam={18} /> Añadir
          </button>
        }
      />
      <Subpestanas opciones={SUBPESTANAS_PLANTILLA} activa="jugadores" />

      {jugadores.length === 0 && (
        <Vacio
          titulo="Aún no hay jugadores"
          texto="Añade a tu plantilla, portero incluido. Todos empiezan con carta de Bronce."
          accion={<button className="boton" onClick={() => ir('/jugador/nuevo')}>Añadir el primero</button>}
        />
      )}

      {POSICIONES.map((pos) => {
        const lista = jugadores
          .filter((j) => j.posicion === pos.id)
          .sort((a, b) => calculo.jugadores[b.id].media - calculo.jugadores[a.id].media)
        if (!lista.length) return null
        return (
          <section key={pos.id} className="grupo">
            <h2 className="grupo__titulo">{pos.plural}</h2>
            <ul className="lista-jugadores">
              {lista.map((j) => {
                const e = calculo.jugadores[j.id]
                return (
                  <li key={j.id}>
                    <button onClick={() => ir(`/jugador/${j.id}`)}>
                      <MiniCarta jugador={j} media={e.media} diseno={disenoDe(j, e.media, config, e.rangosAlcanzados)} config={config} ancho={54} />
                      <div className="lista-jugadores__texto">
                        <strong>{nombreVisible(j)}</strong>
                        <span>#{j.dorsal} · {rolPorId(config, j.rol).nombre}</span>
                      </div>
                      <div className="lista-jugadores__media">
                        {mediaVisible(e.media)}
                        <Tendencia valor={e.tendencia} />
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
      {exjugadores.length > 0 && (
        <section className="grupo">
          <h2 className="grupo__titulo">Ya no están en el equipo</h2>
          <ul className="lista-simple tarjeta">
            {exjugadores.map((j) => (
              <li key={j.id}>
                <button className="enlace-fila" onClick={() => ir(`/jugador/${j.id}`)}>
                  #{j.dorsal} {nombreVisible(j)}
                </button>
                <button
                  className="enlace"
                  onClick={async () => {
                    await db.jugadores.update(j.id, { fueraEn: (j.fueraEn ?? []).filter((x) => x !== temporada.id) })
                    avisar(`${nombreVisible(j)} vuelve a la plantilla`)
                  }}
                >
                  Reincorporar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
