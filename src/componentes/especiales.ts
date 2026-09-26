import { db, guardarMister, misterDe, nuevoId, type Jugador, type TipoEspecial } from '../db'
import { yaTiene, yaTieneMister } from '../motor/premios'

/** Da un diseño especial a un jugador (y lo deja como carta activa). */
export async function darEspecial(j: Jugador, tipo: TipoEspecial, clave: string, fecha: string) {
  if (yaTiene(j, tipo, clave)) return
  const especiales = [...j.especiales, { id: nuevoId(), tipo, fecha, detalle: clave }]
  await db.jugadores.update(j.id, { especiales, disenoActivo: tipo })
}

/** Da un diseño especial al míster (MOTM o TOTY) y lo deja como carta activa. */
export async function darEspecialMister(tipo: 'MOTM' | 'TOTY', clave: string, fecha: string) {
  const eq = await db.equipo.get('equipo')
  if (!eq) return
  const m = misterDe(eq)
  if (yaTieneMister(m, tipo, clave)) return
  await guardarMister({ especiales: [...m.especiales, { id: nuevoId(), tipo, fecha, detalle: clave }], disenoActivo: tipo })
}
