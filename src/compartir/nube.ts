// Conexión con la nube (Supabase) para compartir el equipo con los compañeros (Fase 4).
// La «clave pública» (anon/publishable) está pensada para ir en la app: por sí sola
// no da acceso a nada; las tablas están cerradas y solo se usan las funciones de
// docs/supabase.sql, que piden el código del enlace (leer) o la clave del admin (escribir).

// Se leen del archivo .env (VITE_NUBE_URL y VITE_NUBE_CLAVE) al compilar la app.
export const NUBE_URL: string = (import.meta.env.VITE_NUBE_URL ?? '').replace(/\/$/, '')
export const NUBE_CLAVE_PUBLICA: string = import.meta.env.VITE_NUBE_CLAVE ?? ''

export const nubeConfigurada = () => NUBE_URL !== '' && NUBE_CLAVE_PUBLICA !== ''

export class ErrorNube extends Error {}

export async function rpc<T>(funcion: string, args: Record<string, unknown>): Promise<T> {
  if (!nubeConfigurada()) throw new ErrorNube('La nube aún no está configurada.')
  let r: Response
  try {
    r = await fetch(`${NUBE_URL}/rest/v1/rpc/${funcion}`, {
      method: 'POST',
      headers: {
        apikey: NUBE_CLAVE_PUBLICA,
        // La clave clásica (anon, un JWT «eyJ…») va también como Authorization; la nueva
        // (sb_publishable_…) solo en apikey.
        ...(NUBE_CLAVE_PUBLICA.startsWith('eyJ') ? { Authorization: `Bearer ${NUBE_CLAVE_PUBLICA}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    })
  } catch {
    throw new ErrorNube('Sin conexión.')
  }
  if (!r.ok) {
    let msg = `Error ${r.status}`
    try {
      const j = await r.json()
      msg = j.message ?? msg
    } catch {
      // cuerpo vacío
    }
    throw new ErrorNube(msg)
  }
  const texto = await r.text()
  return (texto ? JSON.parse(texto) : null) as T
}

/** Código o clave aleatorios (solo letras y números, seguros para un enlace). */
export function aleatorio(largo: number): string {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = new Uint8Array(largo)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => letras[b % letras.length]).join('')
}

export function enlaceEspectador(codigo: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}#/ver/${codigo}`
}
