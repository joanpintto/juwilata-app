import { db, nuevoId, type Jugador, type TipoEspecial } from '../db'
import { yaTiene } from '../motor/premios'

/** Da un diseño especial a un jugador (y lo deja como carta activa). */
export async function darEspecial(j: Jugador, tipo: TipoEspecial, clave: string, fecha: string) {
  if (yaTiene(j, tipo, clave)) return
  const especiales = [...j.especiales, { id: nuevoId(), tipo, fecha, detalle: clave }]
  await db.jugadores.update(j.id, { especiales, disenoActivo: tipo })
}
