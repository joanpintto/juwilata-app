/** Tiempos internos de la app (los rellena datos.ts; los muestra la prueba de velocidad). */
export const medidas = { lecturaMs: 0, calculoMs: 0, fotosKB: 0 }

/** Ejecuta `fn` y guarda cuánto ha tardado. */
export function cronometrar<T>(clave: 'lecturaMs' | 'calculoMs', fn: () => T): T {
  const t0 = performance.now()
  try {
    return fn()
  } finally {
    medidas[clave] = Math.round(performance.now() - t0)
  }
}
