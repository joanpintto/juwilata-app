import { SUBPESTANAS_PLANTILLA, ir, nombreVisible, type Datos } from '../datos'
import { POSICIONES, rolPorId } from '../motor/config'
import { Carta } from '../componentes/Carta'
import { disenoDe } from '../componentes/disenos'
import { Cabecera, Icono, Subpestanas, Vacio } from '../componentes/ui'

export function Tendencia({ valor }: { valor: number }) {
  if (valor > 0.005) return <span className="tend tend--sube">▲</span>
  if (valor < -0.005) return <span className="tend tend--baja">▼</span>
  return null
}

export function Jugadores({ datos }: { datos: Datos }) {
  const { jugadores, calculo, config } = datos

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
            <h2 className="grupo__titulo">{pos.plural} · {lista.length}</h2>
            <div className="cartas-plantilla">
              {lista.map((j) => {
                const e = calculo.jugadores[j.id]
                return (
                  <button key={j.id} onClick={() => ir(`/jugador/${j.id}`)} aria-label={`${nombreVisible(j)}, ${rolPorId(config, j.rol).nombre}`}>
                    <Carta jugador={j} media={e.media} atributos={e.atributos} tendencia={e.tendencia} diseno={disenoDe(j, e.media, config, e.rangosAlcanzados)} config={config} />
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </>
  )
}
