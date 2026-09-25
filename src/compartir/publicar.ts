import { db, exportarDatos, type Compartir, type Equipo } from '../db'
import { aleatorio, rpc } from './nube'

// Publica una copia del equipo para los compañeros. Los datos van en un solo
// bloque; las fotos, aparte y solo las que han cambiado.

/** Huella corta de un texto (para saber si una foto ha cambiado). */
export function huella(texto: string): string {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36) + texto.length.toString(36)
}

/** Las fotos sin transparencia se mandan en JPG (pesan mucho menos que en PNG). */
async function comprimir(foto: string): Promise<string> {
  try {
    const img = new Image()
    img.src = foto
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const pixeles = ctx.getImageData(0, 0, c.width, c.height).data
    for (let i = 3; i < pixeles.length; i += 4 * 7) if (pixeles[i] < 250) return foto // tiene transparencia
    return c.toDataURL('image/jpeg', 0.85)
  } catch {
    return foto
  }
}

async function guardarEstado(cambios: Partial<Compartir>) {
  const eq = await db.equipo.get('equipo')
  if (eq?.compartir) await db.equipo.update('equipo', { compartir: { ...eq.compartir, ...cambios } })
}

/** Publica ahora mismo. Devuelve la fecha de publicación. */
export async function publicar(): Promise<string> {
  const eq = await db.equipo.get('equipo')
  const c = eq?.compartir
  if (!eq || !c?.activo) throw new Error('Compartir no está activado.')
  try {
    const todo = await exportarDatos()
    const temporadas = [...todo.temporadas].sort((a, b) => a.inicio.localeCompare(b.inicio))
    // Lo que ven los compañeros: sin la clave, sin fotos (van aparte) y en la temporada en curso.
    const equipo: Equipo = { ...todo.equipo, compartir: undefined, partidosDesdeExportacion: 0, temporadaActivaId: temporadas[temporadas.length - 1]?.id ?? todo.equipo.temporadaActivaId }
    const jugadores = todo.jugadores.map((j) => ({ ...j, foto: null, fotoHuella: j.foto ? huella(j.foto) : null }))
    const datos = { ...todo, equipo, jugadores }

    // 1) Fotos que han cambiado (y quitar las que ya no están).
    const publicadas = { ...c.fotos }
    for (const j of todo.jugadores) {
      const h = j.foto ? huella(j.foto) : null
      if (!h || publicadas[j.id] === h) continue
      await rpc('publicar_foto', { p_codigo: c.codigo, p_clave: c.clave, p_jugador: j.id, p_hash: h, p_dato: await comprimir(j.foto!) })
      publicadas[j.id] = h
    }
    const conFoto = todo.jugadores.filter((j) => j.foto).map((j) => j.id)
    if (Object.keys(publicadas).some((id) => !conFoto.includes(id))) {
      await rpc('quitar_fotos', { p_codigo: c.codigo, p_clave: c.clave, p_mantener: conFoto })
      for (const id of Object.keys(publicadas)) if (!conFoto.includes(id)) delete publicadas[id]
    }

    // 2) Los datos.
    const cuando = await rpc<string>('publicar_equipo', { p_codigo: c.codigo, p_clave: c.clave, p_datos: datos })
    await guardarEstado({ ultimaPublicacion: cuando ?? new Date().toISOString(), fotos: publicadas, error: null })
    return cuando
  } catch (e) {
    await guardarEstado({ error: (e as Error).message })
    throw e
  }
}

/** Crea el enlace (código para leer y clave para escribir) y publica la primera copia. */
export async function activarCompartir(): Promise<void> {
  const eq = await db.equipo.get('equipo')
  const previo = eq?.compartir
  const compartir: Compartir = previo
    ? { ...previo, activo: true, error: null }
    : { codigo: aleatorio(22), clave: aleatorio(32), activo: true, ultimaPublicacion: null, fotos: {}, error: null }
  await db.equipo.update('equipo', { compartir })
  await publicar()
}

/** Borra la copia de la nube. El enlace deja de funcionar; si se vuelve a activar, se crea uno nuevo. */
export async function dejarDeCompartir(): Promise<void> {
  const eq = await db.equipo.get('equipo')
  const c = eq?.compartir
  if (!c) return
  await rpc('dejar_de_compartir', { p_codigo: c.codigo, p_clave: c.clave })
  await db.equipo.update('equipo', { compartir: undefined })
}

// ─── Publicación automática ────────────────────────────────────────────
// Cada cambio en los datos programa una publicación a los pocos segundos
// (agrupando cambios seguidos). Si falla por falta de conexión, se reintenta
// al volver la conexión.

let temporizador: ReturnType<typeof setTimeout> | null = null
let vigilando = false

function programar(ms = 6000) {
  if (temporizador) clearTimeout(temporizador)
  temporizador = setTimeout(async () => {
    temporizador = null
    const eq = await db.equipo.get('equipo')
    if (eq?.compartir?.activo) publicar().catch(() => {})
  }, ms)
}

export function vigilarCambios() {
  if (vigilando) return
  vigilando = true
  const tablas = [db.jugadores, db.partidos, db.configuraciones, db.rivales, db.programados, db.resultadosLiga, db.temporadas]
  for (const t of tablas) {
    t.hook('creating', () => programar())
    t.hook('updating', () => programar())
    t.hook('deleting', () => programar())
  }
  // En el equipo, los cambios de la propia publicación no cuentan.
  const propias = ['compartir', 'partidosDesdeExportacion', 'ultimaExportacion', 'splitActual', 'temporadaActivaId']
  db.equipo.hook('updating', (cambios) => {
    if (Object.keys(cambios).some((k) => !propias.some((p) => k === p || k.startsWith(`${p}.`)))) programar()
  })
  window.addEventListener('online', async () => {
    const eq = await db.equipo.get('equipo')
    if (eq?.compartir?.activo && eq.compartir.error) programar(1000)
  })
}
