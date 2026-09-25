import { useState } from 'react'
import { CODIGO_ESPECTADOR, db, salirDeEspectador } from '../db'
import { type Datos } from '../datos'
import { activarCompartir, dejarDeCompartir, publicar } from '../compartir/publicar'
import { cargarEspectador } from '../compartir/espectador'
import { enlaceEspectador, nubeConfigurada } from '../compartir/nube'
import { Cabecera, Icono } from '../componentes/ui'
import { avisar, confirmar } from '../componentes/dialogos'

const hace = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'nunca'

/** Ajustes → Compartir con el equipo (administrador). */
export function SeccionCompartir({ datos }: { datos: Datos }) {
  const c = datos.equipo.compartir
  const [ocupado, setOcupado] = useState(false)

  const conCarga = async (f: () => Promise<unknown>, ok: string) => {
    setOcupado(true)
    try {
      await f()
      avisar(ok)
    } catch (e) {
      avisar(`No se pudo: ${(e as Error).message}`)
    } finally {
      setOcupado(false)
    }
  }

  const enviarEnlace = async () => {
    if (!c) return
    const url = enlaceEspectador(c.codigo)
    const texto = `Así vamos en el ${datos.equipo.nombre}: cartas, clasificación y estadísticas. Ábrelo en Safari y añádelo a la pantalla de inicio.`
    if (navigator.share) {
      try {
        await navigator.share({ title: datos.equipo.nombre, text: texto, url })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    await navigator.clipboard?.writeText(url)
    avisar('Enlace copiado')
  }

  const parar = async () => {
    const ok = await confirmar({
      titulo: '¿Dejar de compartir?',
      texto: 'Se borra la copia de la nube y el enlace deja de funcionar para todos. Si vuelves a compartir, se creará un enlace nuevo.',
      aceptar: 'Dejar de compartir',
      peligro: true,
    })
    if (ok) await conCarga(dejarDeCompartir, 'Ya no se comparte')
  }

  return (
    <section className="tarjeta">
      <h2>Compartir con el equipo</h2>
      {!nubeConfigurada() ? (
        <p className="nota">Falta conectar la nube (Supabase). En cuanto esté, aquí podrás crear el enlace para tus compañeros.</p>
      ) : !c?.activo ? (
        <>
          <p className="nota">
            Crea un enlace secreto para que tus compañeros vean las cartas, la clasificación y las estadísticas, siempre actualizadas.
            Solo verán; editar sigue siendo cosa tuya. Se suben los datos y las fotos del equipo a la nube.
          </p>
          <button className="boton" disabled={ocupado} onClick={() => conCarga(activarCompartir, 'Enlace creado')}>
            {ocupado ? 'Creando…' : 'Crear enlace para el equipo'}
          </button>
        </>
      ) : (
        <>
          <p className="nota">
            Tus compañeros ven una copia que se actualiza sola cada vez que cambias algo. Última publicación: <strong>{hace(c.ultimaPublicacion)}</strong>.
          </p>
          {c.error && <p className="nota baja">No se pudo publicar la última vez ({c.error}). Se reintentará solo.</p>}
          <button className="boton" onClick={enviarEnlace}>
            <Icono nombre="subir" tam={18} /> Enviar el enlace
          </button>
          <div className="acciones-ficha">
            <button className="boton boton--sec" disabled={ocupado} onClick={() => conCarga(publicar, 'Publicado')}>Publicar ahora</button>
            <button className="boton boton--sec boton--texto-peligro" disabled={ocupado} onClick={parar}>Dejar de compartir</button>
          </div>
          <p className="nota">Cualquiera con el enlace puede verlo: mándalo solo al grupo del equipo.</p>
        </>
      )}
    </section>
  )
}

/** Ajustes en el móvil de un compañero (modo espectador). */
export function AjustesEspectador({ datos }: { datos: Datos }) {
  const [ocupado, setOcupado] = useState(false)
  const actualizar = async () => {
    setOcupado(true)
    try {
      const r = await cargarEspectador()
      avisar(r.sinConexion ? 'Sin conexión: se muestra la última copia' : 'Actualizado')
    } catch (e) {
      avisar((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }
  const salir = async () => {
    const ok = await confirmar({ titulo: '¿Salir del modo espectador?', texto: 'Dejarás de ver el equipo en este dispositivo hasta que vuelvas a abrir el enlace.', aceptar: 'Salir' })
    if (ok) {
      await db.delete().catch(() => {})
      salirDeEspectador()
    }
  }
  return (
    <>
      <Cabecera titulo="Ajustes" />
      <section className="tarjeta">
        <h2>Modo espectador</h2>
        <p className="nota">
          Estás viendo el <strong>{datos.equipo.nombre}</strong> con el enlace que compartió el administrador. Aquí no se puede editar nada.
        </p>
        <p className="nota">Copia del {hace(datos.equipo.publicadoEl)}. Se actualiza sola cada vez que abres la app.</p>
        <button className="boton" disabled={ocupado} onClick={actualizar}>{ocupado ? 'Actualizando…' : 'Actualizar ahora'}</button>
        <button className="boton boton--sec" onClick={salir}>Salir del modo espectador</button>
      </section>
      <footer className="pie">Juwilata United · espectador · {CODIGO_ESPECTADOR?.slice(0, 4)}…</footer>
    </>
  )
}
