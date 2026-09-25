import type { Jugador, TipoEspecial } from '../db'
import { darEspecial } from '../componentes/especiales'
import { fechaCorta, fmt1, fmt2, ir, nombreVisible, type Datos } from '../datos'
import { claveTemporada, nombreMes, sugerenciaTOTY, sugerenciasIF, sugerenciasPOTM, yaTiene, type CandidatoTOTY } from '../motor/premios'
import { MiniCarta } from '../componentes/Carta'
import { disenoDe } from '../componentes/disenos'
import { Cabecera, Icono, Vacio } from '../componentes/ui'
import { avisar, confirmar } from '../componentes/dialogos'

function BotonDar({ j, tipo, clave, fecha }: { j: Jugador; tipo: TipoEspecial; clave: string; fecha: string }) {
  if (yaTiene(j, tipo, clave)) return <span className="dado"><Icono nombre="check" tam={16} /> {tipo} dada</span>
  return (
    <button
      className="boton boton--peq"
      onClick={async () => {
        await darEspecial(j, tipo, clave, fecha)
        avisar(`${tipo} para ${nombreVisible(j)}`)
      }}
    >
      Dar {tipo}
    </button>
  )
}

export function Premios({ datos }: { datos: Datos }) {
  const { calculo, config, equipo, temporada, programados } = datos
  const ifs = sugerenciasIF(calculo, config).reverse()
  const ifsCon = ifs.filter((x) => x.jugador)
  const potms = sugerenciasPOTM(calculo, config, equipo.duracionPartido)
  const toty = sugerenciaTOTY(calculo, config, temporada.id)
  const siete = [...toty.porteros, ...toty.defensas, ...toty.medios, ...toty.delanteros]
  const hoyISO = new Date().toISOString().slice(0, 10)
  const mini = (e: CandidatoTOTY['e'], ancho = 46) => (
    <MiniCarta jugador={e.jugador} media={e.media} diseno={disenoDe(e.jugador, e.media, config, e.rangosAlcanzados)} config={config} ancho={ancho} />
  )

  const darTOTY = async () => {
    const pendientes = siete.filter((c) => !yaTiene(c.e.jugador, 'TOTY', toty.clave))
    if (!pendientes.length) return
    const ok = await confirmar({
      titulo: 'Equipo de la temporada',
      texto: `Se dará la carta TOTY a ${pendientes.map((c) => nombreVisible(c.e.jugador)).join(', ')}. ¿Seguir?`,
      aceptar: 'Dar TOTY',
    })
    if (!ok) return
    for (const c of pendientes) await darEspecial(c.e.jugador, 'TOTY', claveTemporada(temporada.id), hoyISO)
    avisar('¡TOTY entregado!')
  }

  if (!calculo.partidos.length) {
    return (
      <>
        <Cabecera titulo="Premios" sub="IF, POTM y TOTY" atras={true} />
        <Vacio titulo="Sin partidos todavía" texto="Las sugerencias aparecen al registrar partidos." />
      </>
    )
  }

  const jornada = (id: string | null | undefined) => programados.find((g) => g.id === id)?.jornada

  return (
    <>
      <Cabecera titulo="Premios" sub="Sugerencias: siempre decides tú" atras={true} />

      <section className="tarjeta">
        <h2>TOTY · equipo de la temporada</h2>
        <p className="nota">
          El 7 ideal en 1-3-2-1: 0,5 × nota media + 0,2 × evolución + 0,2 × goles y asistencias + 0,1 × MVPs, ajustado por partidos jugados.
          Es provisional hasta que acabe la temporada.
        </p>
        <div className="toty">
          {[toty.delanteros, toty.medios, toty.defensas, toty.porteros].map((linea, k) => (
            <div key={k} className="toty__linea">
              {linea.map((c) => (
                <button key={c.e.jugador.id} onClick={() => ir(`/jugador/${c.e.jugador.id}`)}>
                  {mini(c.e, 58)}
                  <span>{fmt1(c.puntos)}</span>
                </button>
              ))}
              {!linea.length && <span className="nota">—</span>}
            </div>
          ))}
        </div>
        {siete.length > 0 &&
          (siete.every((c) => yaTiene(c.e.jugador, 'TOTY', toty.clave)) ? (
            <span className="dado centro"><Icono nombre="check" tam={16} /> TOTY entregado</span>
          ) : (
            <button className="boton" onClick={darTOTY}>Dar TOTY a estos {siete.length}</button>
          ))}
      </section>

      <section className="tarjeta">
        <h2>POTM · jugador del mes</h2>
        <p className="nota">0,6 × nota media + 0,5 × MVPs + 0,1 × goles y asistencias, ajustado por minutos.</p>
        {potms.map((m) => (
          <div key={m.mes} className="premio-grupo">
            <span className="premio-grupo__titulo">{nombreMes(m.mes)} · {m.partidos} partido{m.partidos === 1 ? '' : 's'}</span>
            {m.candidatos.map((c, i) => (
              <div key={c.e.jugador.id} className={`premio-fila ${i === 0 ? 'premio-fila--primero' : ''}`}>
                {mini(c.e, i === 0 ? 46 : 36)}
                <div className="premio-fila__texto">
                  <strong>{nombreVisible(c.e.jugador)}</strong>
                  <span>{fmt2(c.puntos)} pts · nota {fmt2(c.notaMedia)} · {c.mvps} MVP · {c.produccion} G+A</span>
                </div>
                {i === 0 && <BotonDar j={c.e.jugador} tipo="POTM" clave={m.clave} fecha={`${m.mes}-01`} />}
              </div>
            ))}
          </div>
        ))}
      </section>

      <section className="tarjeta">
        <h2>IF · en forma</h2>
        <p className="nota">La mejor nota ponderada de cada partido, si llega a {fmt1(config.ifNotaMinima)}.</p>
        {ifsCon.length === 0 && <p className="nota">De momento nadie ha llegado en ningún partido.</p>}
        {ifsCon.map((s) => {
          const j = jornada(s.partido.programadoId)
          return (
            <div key={s.partido.id} className="premio-fila">
              {mini(calculo.jugadores[s.jugador!.id], 36)}
              <div className="premio-fila__texto">
                <strong>{nombreVisible(s.jugador!)}</strong>
                <span>
                  {j ? `J${j} · ` : ''}{s.partido.local ? 'vs' : 'en'} {s.partido.rival} {s.partido.golesFavor}-{s.partido.golesContra} · {fechaCorta(s.partido.fecha)} · {fmt2(s.notaPonderada)}
                </span>
              </div>
              <BotonDar j={s.jugador!} tipo="IF" clave={s.clave} fecha={s.partido.fecha} />
            </div>
          )
        })}
        {ifs.length > ifsCon.length && ifsCon.length > 0 && (
          <p className="nota">En los otros {ifs.length - ifsCon.length} partidos nadie llegó a {fmt1(config.ifNotaMinima)}.</p>
        )}
      </section>
    </>
  )
}
