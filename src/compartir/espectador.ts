import { CODIGO_ESPECTADOR, ID_FOTO_MISTER, db, importarDatos, validarExportacion, type Exportacion, type Mister } from '../db'
import { rpc } from './nube'

// Modo espectador: descarga la copia que publica el administrador y la guarda
// en la base de datos aparte de este dispositivo (así funciona también sin conexión).

type JugadorPublicado = Exportacion['jugadores'][number] & { fotoHuella?: string | null }
type MisterPublicado = Mister & { fotoHuella?: string | null }

export interface ResultadoCarga {
  actualizado: string | null
  sinConexion: boolean
}

export async function cargarEspectador(): Promise<ResultadoCarga> {
  const codigo = CODIGO_ESPECTADOR!
  const local = await db.equipo.get('equipo')
  let filas: { datos: Exportacion; actualizado: string }[]
  try {
    filas = await rpc('leer_equipo', { p_codigo: codigo })
  } catch (e) {
    if (local) return { actualizado: local.publicadoEl ?? null, sinConexion: true }
    throw e
  }
  if (!filas?.length) throw new Error('Este enlace ya no existe. Pide uno nuevo al administrador.')
  const { datos, actualizado } = filas[0]
  if (local && local.publicadoEl === actualizado) return { actualizado, sinConexion: false }

  // Fotos: solo se descargan las que no tenemos ya.
  const anteriores = await db.jugadores.toArray()
  const tengo: Record<string, string> = {}
  for (const j of anteriores as JugadorPublicado[]) if (j.foto && j.fotoHuella) tengo[j.id] = j.fotoHuella
  const misterAnterior = local?.mister as MisterPublicado | undefined
  if (misterAnterior?.foto && misterAnterior.fotoHuella) tengo[ID_FOTO_MISTER] = misterAnterior.fotoHuella
  const fotos = await rpc<{ jugador_id: string; hash: string; dato: string | null }[]>('leer_fotos', { p_codigo: codigo, p_tengo: tengo })
  const porId = new Map(fotos.map((f) => [f.jugador_id, f]))

  const copia = validarExportacion(datos)
  copia.jugadores = (copia.jugadores as JugadorPublicado[]).map((j) => {
    const f = porId.get(j.id)
    const anterior = anteriores.find((x) => x.id === j.id)
    return { ...j, foto: f ? (f.dato ?? anterior?.foto ?? null) : null, fotoHuella: f?.hash ?? null }
  })
  const fm = porId.get(ID_FOTO_MISTER)
  const mister = copia.equipo.mister as MisterPublicado | undefined
  copia.equipo = {
    ...copia.equipo, publicadoEl: actualizado, compartir: undefined,
    mister: mister && { ...mister, foto: fm ? (fm.dato ?? misterAnterior?.foto ?? null) : null, fotoHuella: fm?.hash ?? null } as Mister,
  }
  await importarDatos(copia)
  return { actualizado, sinConexion: false }
}

/**
 * Deja la dirección como …/?ver=<código>#/ruta y cambia el manifiesto de la app por
 * uno que arranca en esa dirección: así, «Añadir a pantalla de inicio» crea la app
 * de solo lectura (y no la del administrador).
 */
export function prepararAppEspectador() {
  const codigo = CODIGO_ESPECTADOR!
  const base = new URL(import.meta.env.BASE_URL, window.location.origin).href
  const inicio = `${base}?ver=${codigo}`
  const ruta = window.location.hash.startsWith('#/ver/') || !window.location.hash ? '#/' : window.location.hash
  history.replaceState(null, '', `${inicio}${ruta}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
  const manifiesto = {
    id: inicio, name: 'Juwilata United', short_name: 'Juwilata', lang: 'es', start_url: inicio, scope: base,
    display: 'standalone', orientation: 'portrait', theme_color: '#000000', background_color: '#000000',
    icons: [
      { src: `${base}pwa-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${base}pwa-512.png`, sizes: '512x512', type: 'image/png' },
    ],
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(manifiesto)], { type: 'application/manifest+json' }))
  let enlace = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (!enlace) {
    enlace = document.createElement('link')
    enlace.rel = 'manifest'
    document.head.appendChild(enlace)
  }
  enlace.href = url
}
