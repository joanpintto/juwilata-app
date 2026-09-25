import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { SUBPESTANAS_PARTIDOS, fechaCorta, ir, nombreVisible, type Datos } from '../datos'
import { Cabecera, Icono, Subpestanas, Vacio } from '../componentes/ui'
import { avisar, confirmar } from '../componentes/dialogos'


function resultado(gf: number, gc: number): 'V' | 'E' | 'D' {
  return gf > gc ? 'V' : gf === gc ? 'E' : 'D'
}

async function deshacerUltimo(): Promise<void> {
  const d = await db.deshacer.get('ultimo')
  if (!d) return
  const ok = await confirmar({ titulo: 'Deshacer', texto: `¿Deshacer «${d.descripcion}»? La temporada se recalcula con el estado anterior.`, aceptar: 'Deshacer' })
  if (!ok) return
  await db.transaction('rw', db.partidos, db.deshacer, async () => {
    if (d.anterior) await db.partidos.put(d.anterior)
    else await db.partidos.delete(d.partidoId)
    await db.deshacer.delete('ultimo')
  })
  avisar('Hecho: se ha recuperado el estado anterior')
}

export function BannerDeshacer() {
  const d = useLiveQuery(() => db.deshacer.get('ultimo'))
  if (!d) return null
  return (
    <div className="banner">
      <span>Última acción: {d.descripcion}</span>
      <button className="enlace" onClick={deshacerUltimo}>
        <Icono nombre="deshacer" tam={16} /> Deshacer
      </button>
    </div>
  )
}

export function Partidos({ datos }: { datos: Datos }) {
  const { calculo, jugadores, equipo, programados } = datos
  const lista = [...calculo.partidos].reverse()
  const v = calculo.partidos.filter((r) => r.partido.golesFavor > r.partido.golesContra).length
  const e = calculo.partidos.filter((r) => r.partido.golesFavor === r.partido.golesContra).length
  const d = calculo.partidos.length - v - e
  const jornadaDe = (id: string | null | undefined) => {
    const g = id ? programados.find((x) => x.id === id) : null
    return g ? `J${g.jornada} · ` : ''
  }

  return (
    <>
      <Cabecera
        titulo="Partidos"
        sub={`${calculo.partidos.length} de ${equipo.partidosTemporada} · ${v}V ${e}E ${d}D`}
        acciones={
          <button className="boton boton--peq" onClick={() => ir('/partido/nuevo')} disabled={!jugadores.length}>
            <Icono nombre="mas" tam={18} /> Nuevo
          </button>
        }
      />
      <Subpestanas opciones={SUBPESTANAS_PARTIDOS} activa="mis" />
      <BannerDeshacer />

      {!jugadores.length && <Vacio titulo="Primero, la plantilla" texto="Añade jugadores antes de registrar el primer partido." accion={<button className="boton" onClick={() => ir('/jugador/nuevo')}>Añadir jugador</button>} />}
      {jugadores.length > 0 && !lista.length && (
        <Vacio titulo="Sin partidos todavía" texto="Registra el primer partido de la temporada: resultado, convocatoria, minutos y acciones." accion={<button className="boton" onClick={() => ir('/partido/nuevo')}>Registrar partido</button>} />
      )}

      <ul className="lista-partidos">
        {lista.map(({ partido: p }) => {
          const r = resultado(p.golesFavor, p.golesContra)
          const mvp = p.mvpId ? jugadores.find((j) => j.id === p.mvpId) : null
          return (
            <li key={p.id}>
              <button onClick={() => ir(`/partido/${p.id}`)}>
                <span className={`res res--${r}`}>{r}</span>
                <div className="lista-partidos__texto">
                  <strong>
                    {jornadaDe(p.programadoId)}{p.local ? 'vs' : 'en'} {p.rival}
                  </strong>
                  <span>{fechaCorta(p.fecha)} · {p.competicion}{mvp ? ` · ⭐ ${nombreVisible(mvp)}` : ''}</span>
                </div>
                <span className="lista-partidos__marcador">{p.golesFavor}-{p.golesContra}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
