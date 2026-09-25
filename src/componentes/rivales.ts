import { db, nuevoId, splitsDe, type Rival } from '../db'

const normalizar = (s: string) => s.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Devuelve el rival con ese nombre, creándolo si no existe (sin duplicar por
 * mayúsculas o tildes) y apuntándolo en el split indicado.
 */
export async function rivalPorNombre(nombre: string, temporadaId: string, split?: number): Promise<Rival> {
  const limpio = nombre.trim().replace(/\s+/g, ' ')
  const existente = (await db.rivales.where('temporadaId').equals(temporadaId).toArray()).find((r) => normalizar(r.nombre) === normalizar(limpio))
  if (existente) {
    if (split && !splitsDe(existente).includes(split)) {
      const splits = [...splitsDe(existente), split].sort()
      await db.rivales.update(existente.id, { splits })
      return { ...existente, splits }
    }
    return existente
  }
  const nuevo: Rival = { id: nuevoId(), nombre: limpio, creado: new Date().toISOString(), splits: [split ?? 1], temporadaId }
  await db.rivales.add(nuevo)
  return nuevo
}
