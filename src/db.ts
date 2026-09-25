import Dexie, { type Table } from 'dexie'

// Fase 0: solo una tabla de diagnóstico para comprobar que los datos
// se guardan y sobreviven al cerrar la app. El modelo completo llega en la Fase 1.
export interface Diagnostico {
  id: string
  aperturas: number
  primeraApertura: string
  ultimaApertura: string
}

class JuwilataDB extends Dexie {
  diagnostico!: Table<Diagnostico, string>

  constructor() {
    super('juwilata')
    this.version(1).stores({ diagnostico: 'id' })
  }
}

export const db = new JuwilataDB()

export async function registrarApertura(): Promise<Diagnostico> {
  const ahora = new Date().toISOString()
  return db.transaction('rw', db.diagnostico, async () => {
    const actual = await db.diagnostico.get('app')
    const nuevo: Diagnostico = actual
      ? { ...actual, aperturas: actual.aperturas + 1, ultimaApertura: ahora }
      : { id: 'app', aperturas: 1, primeraApertura: ahora, ultimaApertura: ahora }
    await db.diagnostico.put(nuevo)
    return nuevo
  })
}

export async function pedirAlmacenamientoPersistente(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
