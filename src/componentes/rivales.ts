import { db, nuevoId, type Rival } from '../db'

const normalizar = (s: string) => s.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Devuelve el rival con ese nombre, creándolo si no existe (sin duplicar por mayúsculas o tildes). */
export async function rivalPorNombre(nombre: string): Promise<Rival> {
  const limpio = nombre.trim().replace(/\s+/g, ' ')
  const existente = (await db.rivales.toArray()).find((r) => normalizar(r.nombre) === normalizar(limpio))
  if (existente) return existente
  const nuevo: Rival = { id: nuevoId(), nombre: limpio, creado: new Date().toISOString() }
  await db.rivales.add(nuevo)
  return nuevo
}
