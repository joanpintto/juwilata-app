import { ir } from '../datos'
import { medidas } from './medidas'

// Herramientas de rendimiento: «modo ligero» (sin animaciones ni efectos) y una
// prueba de velocidad que recorre las pantallas y mide cuánto tarda cada una en
// este móvil. Los resultados se guardan solo en este dispositivo.

const CLAVE_LIGERO = 'juwilata-ligero'
const CLAVE_MEDIDAS = 'juwilata-medidas'


export function modoLigero(): boolean {
  try {
    return localStorage.getItem(CLAVE_LIGERO) === '1'
  } catch {
    return false
  }
}

export function ponerModoLigero(si: boolean) {
  document.documentElement.classList.toggle('ligero', si)
  try {
    localStorage.setItem(CLAVE_LIGERO, si ? '1' : '0')
  } catch {
    // sin almacenamiento: vale para esta sesión
  }
}

export interface FilaMedida {
  pantalla: string
  primera: number // ms la primera vez (se construye de cero)
  vuelta: number // ms al volver (ya estaba abierta)
  ligero: number // ms la primera vez en modo ligero
}
export interface ResultadoMedida {
  fecha: string
  filas: FilaMedida[]
  fps: { pantalla: string; normal: number; ligero: number; tirones: number }[]
  lecturaMs: number
  calculoMs: number
  fotosKB: number
  dispositivo: string
}

export function ultimaMedida(): ResultadoMedida | null {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_MEDIDAS) ?? 'null')
  } catch {
    return null
  }
}

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms))
const pintado = () => new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok())))

/** Va a una ruta y mide hasta que la pantalla nueva está pintada. */
async function tiempo(ruta: string): Promise<number> {
  const t0 = performance.now()
  ir(ruta)
  await esperar(0)
  await pintado()
  return Math.round(performance.now() - t0)
}

/** Fotogramas por segundo durante 2 s en la pantalla actual, y cuántos «tirones» (fotogramas de más de 50 ms). */
function fps(): Promise<{ fps: number; tirones: number }> {
  return new Promise((ok) => {
    let n = 0
    let tirones = 0
    const t0 = performance.now()
    let antes = t0
    const paso = (t: number) => {
      n++
      if (t - antes > 50) tirones++
      antes = t
      if (t - t0 < 2000) requestAnimationFrame(paso)
      else ok({ fps: Math.round((n * 1000) / (t - t0)), tirones })
    }
    requestAnimationFrame(paso)
  })
}

const reiniciarPestanas = () => window.dispatchEvent(new Event('juwilata:reiniciar-pestanas'))

export async function medirVelocidad(idJugador: string | null, alAvanzar: (texto: string) => void): Promise<ResultadoMedida> {
  const pantallas: [string, string][] = [
    ['Inicio', '/'], ['Plantilla', '/plantilla'], ['Liga', '/liga'], ['Estadísticas', '/estadisticas'], ['Más', '/mas'],
    ...(idJugador ? [['Ficha jugador', `/jugador/${idJugador}`] as [string, string]] : []),
  ]
  const ligeroAntes = modoLigero()
  const filas: FilaMedida[] = pantallas.map(([pantalla]) => ({ pantalla, primera: 0, vuelta: 0, ligero: 0 }))
  const fpsNormal: Record<string, { fps: number; tirones: number }> = {}
  const fpsLigero: Record<string, number> = {}

  ponerModoLigero(false)
  await tiempo('/ajustes')
  reiniciarPestanas()
  await esperar(300)
  for (const [i, [nombre, ruta]] of pantallas.entries()) {
    alAvanzar(`Midiendo ${nombre}…`)
    filas[i].primera = await tiempo(ruta)
    await esperar(400)
    if (nombre === 'Plantilla' || nombre === 'Ficha jugador' || nombre === 'Inicio') fpsNormal[nombre] = await fps()
  }
  for (const [i, [nombre, ruta]] of pantallas.entries()) {
    alAvanzar(`Volviendo a ${nombre}…`)
    await tiempo('/ajustes')
    await esperar(200)
    filas[i].vuelta = await tiempo(ruta)
    await esperar(300)
  }

  ponerModoLigero(true)
  await tiempo('/ajustes')
  reiniciarPestanas()
  await esperar(300)
  for (const [i, [nombre, ruta]] of pantallas.entries()) {
    alAvanzar(`Modo ligero: ${nombre}…`)
    filas[i].ligero = await tiempo(ruta)
    await esperar(400)
    if (fpsNormal[nombre]) fpsLigero[nombre] = (await fps()).fps
  }
  ponerModoLigero(ligeroAntes)

  const resultado: ResultadoMedida = {
    fecha: new Date().toISOString(),
    filas,
    fps: Object.entries(fpsNormal).map(([pantalla, f]) => ({ pantalla, normal: f.fps, ligero: fpsLigero[pantalla] ?? 0, tirones: f.tirones })),
    lecturaMs: medidas.lecturaMs,
    calculoMs: medidas.calculoMs,
    fotosKB: medidas.fotosKB,
    dispositivo: `${navigator.userAgent.match(/iPhone OS [\d_]+|Android [\d.]+|Mac OS X [\d_]+/)?.[0] ?? ''} · ${window.screen.width}×${window.screen.height} @${window.devicePixelRatio}x`,
  }
  try {
    localStorage.setItem(CLAVE_MEDIDAS, JSON.stringify(resultado))
  } catch {
    // se muestra igualmente
  }
  await tiempo('/ajustes')
  return resultado
}
