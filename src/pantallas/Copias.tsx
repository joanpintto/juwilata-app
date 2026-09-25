import { useLiveQuery } from 'dexie-react-hooks'
import { db, exportarDatos, importarDatos, nombreArchivoCopia, validarExportacion, type Exportacion } from '../db'
import { type Datos } from '../datos'
import { Cabecera, Icono } from '../componentes/ui'
import { avisar, confirmar } from '../componentes/dialogos'

async function compartirOBajar(json: string, nombre: string) {
  const archivo = new File([json], nombre, { type: 'application/json' })
  // En iPhone, el menú Compartir permite «Guardar en Archivos» o mandarlo a iCloud.
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: nombre })
      return true
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false
    }
  }
  const url = URL.createObjectURL(archivo)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return true
}

function resumen(d: Exportacion): string {
  return `${d.jugadores.length} jugadores y ${d.partidos.length} partidos`
}

export function Copias({ datos }: { datos: Datos }) {
  const { equipo } = datos
  const automaticas = useLiveQuery(() => db.copias.orderBy('id').reverse().toArray())

  const exportar = async () => {
    const json = JSON.stringify(await exportarDatos(), null, 1)
    const ok = await compartirOBajar(json, nombreArchivoCopia())
    if (ok) {
      await db.equipo.update('equipo', { partidosDesdeExportacion: 0, ultimaExportacion: new Date().toISOString() })
      avisar('Copia exportada')
    }
  }

  const restaurar = async (d: Exportacion, origen: string) => {
    const ok = await confirmar({
      titulo: 'Sustituir todos los datos',
      texto: (
        <p>
          Se van a <strong>sustituir todos los datos</strong> actuales por los de {origen} ({resumen(d)}, del {new Date(d.exportado).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}). ¿Seguir?
        </p>
      ),
      aceptar: 'Sustituir',
      peligro: true,
    })
    if (!ok) return
    await importarDatos(d)
    avisar('Datos restaurados')
  }

  const importar = async (archivo: File) => {
    try {
      const d = validarExportacion(JSON.parse(await archivo.text()))
      await restaurar(d, `«${archivo.name}»`)
    } catch (e) {
      avisar(e instanceof SyntaxError ? 'El archivo no es un JSON válido.' : (e as Error).message)
    }
  }

  return (
    <>
      <Cabecera titulo="Copias de seguridad" atras="/ajustes" />

      <section className="tarjeta">
        <h2>Copia manual</h2>
        <p className="nota">
          Descarga un archivo <code>{nombreArchivoCopia()}</code> con todo. Guárdalo en Archivos o iCloud: si cambias de móvil o se borran los datos, lo importas y listo.
        </p>
        <p className="nota">
          {equipo.ultimaExportacion
            ? `Última exportación: ${new Date(equipo.ultimaExportacion).toLocaleDateString('es-ES', { dateStyle: 'medium' })} · ${equipo.partidosDesdeExportacion} partidos desde entonces.`
            : 'Aún no has exportado ninguna copia.'}
        </p>
        <button className="boton" onClick={exportar}>
          <Icono nombre="descargar" tam={18} /> Exportar copia
        </button>
        <label className="boton boton--sec">
          <Icono nombre="subir" tam={18} /> Importar copia…
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importar(f)
              e.target.value = ''
            }}
          />
        </label>
      </section>

      <section className="tarjeta">
        <h2>Copias automáticas</h2>
        <p className="nota">Se hace una al confirmar cada partido. Se guardan las 5 últimas en este dispositivo.</p>
        {!automaticas?.length ? (
          <p className="nota">Todavía no hay ninguna.</p>
        ) : (
          <ul className="lista-simple">
            {automaticas.map((c) => (
              <li key={c.id}>
                <div>
                  <strong>{c.motivo}</strong>
                  <span className="nota">{new Date(c.fecha).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <button className="enlace" onClick={() => restaurar(validarExportacion(JSON.parse(c.datos)), 'esta copia automática')}>
                  Restaurar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
