import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { Icono } from '../componentes/ui'
import { avisar, confirmar } from '../componentes/dialogos'


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
