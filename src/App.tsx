import { useEffect, useState, type ReactNode } from 'react'
import { SOLO_LECTURA, db, inicializar, pedirAlmacenamientoPersistente, registrarApertura, salirDeEspectador } from './db'
import { cargarEspectador } from './compartir/espectador'
import { vigilarCambios } from './compartir/publicar'
import { ir, useDatos, useRuta, type Datos } from './datos'
import { DialogosRaiz, Icono } from './componentes/ui'
import { precargarCartas } from './componentes/plantillas'
import { Inicio } from './pantallas/Inicio'
import { Jugadores } from './pantallas/Jugadores'
import { Formacion } from './pantallas/Formacion'
import { FichaJugador } from './pantallas/FichaJugador'
import { EditarJugador } from './pantallas/EditarJugador'
import { FichaMister } from './pantallas/FichaMister'
import { EditarMister } from './pantallas/EditarMister'
import { Partidos } from './pantallas/Partidos'
import { Liga } from './pantallas/Liga'
import { DetallePartido } from './pantallas/DetallePartido'
import { RegistroPartido } from './pantallas/RegistroPartido'
import { SecuenciaPartido } from './pantallas/SecuenciaPartido'
import { Evoluciones } from './pantallas/Evoluciones'
import { Ajustes } from './pantallas/Ajustes'
import { Avanzado } from './pantallas/Avanzado'
import { Copias } from './pantallas/Copias'
import { Premios } from './pantallas/Premios'
import { AjustesEspectador } from './pantallas/Compartir'
import { Notificaciones } from './pantallas/Notificaciones'

const PESTANAS = [
  { id: 'inicio', texto: 'Inicio', ruta: '/', icono: 'inicio' },
  { id: 'plantilla', texto: 'Plantilla', ruta: '/plantilla', icono: 'plantilla' },
  { id: 'partidos', texto: 'Partidos', ruta: '/partidos', icono: 'partidos' },
  { id: 'evoluciones', texto: 'Evoluciones', ruta: '/evoluciones', icono: 'evoluciones' },
  { id: 'ajustes', texto: 'Ajustes', ruta: '/ajustes', icono: 'ajustes' },
]

function pestanaDe(seg: string[]): string {
  switch (seg[0]) {
    case 'plantilla':
    case 'jugador':
    case 'mister':
      return 'plantilla'
    case 'partidos':
    case 'partido':
      return 'partidos'
    case 'evoluciones':
    case 'premios':
      return 'evoluciones'
    case 'ajustes':
      return 'ajustes'
    default:
      return 'inicio'
  }
}

/** Rutas de edición que no existen en modo espectador. */
function esEdicion(seg: string[]): boolean {
  const [a, b, c] = seg
  return (a === 'jugador' && (b === 'nuevo' || c === 'editar')) || (a === 'mister' && b === 'editar') || (a === 'partido' && (b === 'nuevo' || c === 'editar')) || a === 'ajustes'
}

function Pantalla({ seg, datos }: { seg: string[]; datos: Datos }): ReactNode {
  const [a, b, c] = seg
  if (SOLO_LECTURA && esEdicion(seg)) return a === 'ajustes' ? <AjustesEspectador datos={datos} /> : <Inicio datos={datos} />
  switch (a) {
    case undefined:
      return <Inicio datos={datos} />
    case 'plantilla':
      return b === 'jugadores' ? <Jugadores datos={datos} /> : <Formacion datos={datos} />
    case 'jugador':
      if (b === 'nuevo') return <EditarJugador datos={datos} />
      if (c === 'editar') return <EditarJugador datos={datos} id={b} />
      return <FichaJugador datos={datos} id={b} />
    case 'mister':
      return b === 'editar' ? <EditarMister datos={datos} /> : <FichaMister datos={datos} />
    case 'partidos':
      return b === 'liga' ? <Liga datos={datos} /> : <Partidos datos={datos} />
    case 'partido':
      if (b === 'nuevo') return <RegistroPartido key={c ?? 'nuevo'} datos={datos} programadoId={c} />
      if (c === 'editar') return <RegistroPartido datos={datos} id={b} />
      if (c === 'resumen') return <SecuenciaPartido datos={datos} id={b} recordarCopia={seg[3] === 'copia'} />
      return <DetallePartido datos={datos} id={b} />
    case 'premios':
      return <Premios datos={datos} />
    case 'notificaciones':
      return <Notificaciones datos={datos} />
    case 'evoluciones':
      return <Evoluciones datos={datos} vista={b} id={c} />
    case 'ajustes':
      if (b === 'avanzado') return <Avanzado datos={datos} />
      if (b === 'copias') return <Copias datos={datos} />
      return <Ajustes datos={datos} />
    default:
      return <Inicio datos={datos} />
  }
}

export default function App() {
  const [listo, setListo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ruta = useRuta()
  const datos = useDatos()
  const seg = ruta.split('/').filter(Boolean)
  const activa = pestanaDe(seg)
  const enAsistente = seg[0] === 'partido' && (seg[1] === 'nuevo' || seg[2] === 'editar' || seg[2] === 'resumen')

  // Cada pantalla empieza arriba. Si no, en el iPhone al pasar de una pantalla larga
  // (bajada) a una corta se queda el desplazamiento y la barra de abajo se "sube".
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [ruta])

  useEffect(() => {
    if (SOLO_LECTURA) {
      // Espectador: se descarga la copia publicada por el administrador.
      document.body.classList.add('solo-lectura')
      if (window.location.hash.startsWith('#/ver/')) window.location.replace('#/')
      Promise.all([cargarEspectador(), precargarCartas()])
        .then(() => setListo(true))
        .catch((e) => setError((e as Error).message))
      return
    }
    vigilarCambios()
    inicializar()
      .then(() => precargarCartas())
      .then(() => setListo(true))
      .catch((e) => setError(String(e)))
    registrarApertura().catch(() => {})
    pedirAlmacenamientoPersistente().catch(() => {})
  }, [])

  if (error) {
    return (
      <main className="app app--cargando">
        <img src={`${import.meta.env.BASE_URL}escudo.png`} alt="" className="cargando" />
        <p className="error-grave centro">{SOLO_LECTURA ? error : `No se pudo abrir la base de datos: ${error}`}</p>
        {SOLO_LECTURA && (
          <div className="acciones-ficha">
            <button className="boton" onClick={() => window.location.reload()}>Reintentar</button>
            <button className="boton boton--sec" onClick={salirDeEspectador}>Salir</button>
          </div>
        )}
      </main>
    )
  }
  if (!listo || !datos) return <main className="app app--cargando"><img src={`${import.meta.env.BASE_URL}escudo.png`} alt="" className="cargando" /></main>

  return (
    <>
      <main className={`app ${enAsistente ? 'app--sin-barra' : ''}`}>
        {datos.temporada.id !== datos.temporadas[datos.temporadas.length - 1].id && !enAsistente && (
          <div className="banner banner--temporada">
            <span>Estás viendo la temporada {datos.temporada.nombre}.</span>
            <button
              className="enlace"
              onClick={() => db.equipo.update('equipo', { temporadaActivaId: datos.temporadas[datos.temporadas.length - 1].id })}
            >
              Volver a la actual
            </button>
          </div>
        )}
        <Pantalla seg={seg} datos={datos} />
      </main>
      {!enAsistente && (
        <nav className="barra">
          <div className="barra__marca" aria-hidden="true">
            <img src={`${import.meta.env.BASE_URL}escudo.png`} alt="" />
            <span>{datos.equipo.nombre}</span>
          </div>
          {PESTANAS.map((p) => (
            <button key={p.id} className={p.id === activa ? 'activa' : ''} onClick={() => ir(p.ruta)}>
              <Icono nombre={p.icono} />
              <span>{p.texto}</span>
            </button>
          ))}
        </nav>
      )}
      <DialogosRaiz />
    </>
  )
}
