import { Suspense, lazy, memo, useEffect, useState, type ReactNode } from 'react'
import { SOLO_LECTURA, db, inicializar, pedirAlmacenamientoPersistente, registrarApertura, salirDeEspectador } from './db'
import { cargarEspectador, prepararAppEspectador } from './compartir/espectador'
import { vigilarCambios } from './compartir/publicar'
import { ir, useDatos, useRuta, type Datos } from './datos'
import { EscudosRivales } from './componentes/escudos'
import { DialogosRaiz, Icono } from './componentes/ui'
import { infoPlantilla, plantillaLista, precalentarCapas, precargarCartas } from './componentes/plantillas'
import { DISENOS, DISENOS_MISTER, disenoDe, disenoMister } from './componentes/disenos'
import { prepararFotos } from './componentes/fotosCarta'
import { Inicio } from './pantallas/Inicio'
import { EstadisticasOnce, Formacion, Suplentes } from './pantallas/Formacion'
import { FichaJugador } from './pantallas/FichaJugador'
import { FichaMister } from './pantallas/FichaMister'
import { Estadisticas } from './pantallas/Estadisticas'
import { Mas } from './pantallas/Mas'
import { Liga } from './pantallas/Liga'

// Pantallas de uso ocasional: se cargan al abrirlas (arranque más rápido).
const EditarJugador = lazy(() => import('./pantallas/EditarJugador').then((m) => ({ default: m.EditarJugador })))
const EditarMister = lazy(() => import('./pantallas/EditarMister').then((m) => ({ default: m.EditarMister })))
const DetallePartido = lazy(() => import('./pantallas/DetallePartido').then((m) => ({ default: m.DetallePartido })))
const RegistroPartido = lazy(() => import('./pantallas/RegistroPartido').then((m) => ({ default: m.RegistroPartido })))
const SecuenciaPartido = lazy(() => import('./pantallas/SecuenciaPartido').then((m) => ({ default: m.SecuenciaPartido })))
const Ajustes = lazy(() => import('./pantallas/Ajustes').then((m) => ({ default: m.Ajustes })))
const Avanzado = lazy(() => import('./pantallas/Avanzado').then((m) => ({ default: m.Avanzado })))
const Copias = lazy(() => import('./pantallas/Copias').then((m) => ({ default: m.Copias })))
const Premios = lazy(() => import('./pantallas/Premios').then((m) => ({ default: m.Premios })))
const AjustesEspectador = lazy(() => import('./pantallas/Compartir').then((m) => ({ default: m.AjustesEspectador })))
const Notificaciones = lazy(() => import('./pantallas/Notificaciones').then((m) => ({ default: m.Notificaciones })))

// Barra de navegación (§4): Inicio, Plantilla, Liga, Estadísticas y Más.
const PESTANAS = [
  { id: 'inicio', texto: 'Inicio', ruta: '/', icono: 'inicio' },
  { id: 'plantilla', texto: 'Plantilla', ruta: '/plantilla', icono: 'persona' },
  { id: 'liga', texto: 'Liga', ruta: '/liga', icono: 'trofeo' },
  { id: 'estadisticas', texto: 'Estadísticas', ruta: '/estadisticas', icono: 'barras' },
  { id: 'mas', texto: 'Más', ruta: '/mas', icono: 'puntos' },
]

function pestanaDe(seg: string[]): string {
  switch (seg[0]) {
    case 'plantilla':
    case 'jugador':
    case 'mister':
      return 'plantilla'
    case 'liga':
    case 'partidos':
    case 'partido':
      return 'liga'
    case 'estadisticas':
    case 'evoluciones':
    case 'premios':
      return 'estadisticas'
    case 'mas':
    case 'ajustes':
      return 'mas'
    default:
      return 'inicio'
  }
}

/** Rutas de edición que no existen en modo espectador. */
function esEdicion(seg: string[]): boolean {
  const [a, b, c] = seg
  return (a === 'jugador' && (b === 'nuevo' || c === 'editar')) || (a === 'mister' && b === 'editar') || (a === 'partido' && (b === 'nuevo' || c === 'editar')) || a === 'ajustes'
}

function Redirigir({ a }: { a: string }) {
  useEffect(() => ir(a, true), [a])
  return null
}

function Pantalla({ seg, datos }: { seg: string[]; datos: Datos }): ReactNode {
  const [a, b, c] = seg
  if (SOLO_LECTURA && esEdicion(seg)) return a === 'ajustes' ? <AjustesEspectador datos={datos} /> : <Inicio datos={datos} />
  switch (a) {
    case undefined:
      return <Inicio datos={datos} />
    case 'plantilla':
      if (b === 'suplentes' || b === 'jugadores') return <Suplentes datos={datos} />
      if (b === 'estadisticas') return <EstadisticasOnce datos={datos} />
      return <Formacion datos={datos} />
    case 'jugador':
      if (b === 'nuevo') return <EditarJugador datos={datos} />
      if (c === 'editar') return <EditarJugador datos={datos} id={b} />
      return <FichaJugador datos={datos} id={b} />
    case 'mister':
      return b === 'editar' ? <EditarMister datos={datos} /> : <FichaMister datos={datos} />
    case 'liga':
      return <Liga datos={datos} vista={b} />
    case 'partidos': // rutas antiguas
      return <Liga datos={datos} vista={b === 'liga' ? 'clasificacion' : undefined} />
    case 'estadisticas':
      return <Estadisticas datos={datos} vista={b} id={c} />
    case 'mas':
      return <Mas datos={datos} vista={b} />
    case 'partido':
      if (b === 'nuevo') return <RegistroPartido key={c ?? 'nuevo'} datos={datos} programadoId={c} />
      if (c === 'editar') return <RegistroPartido datos={datos} id={b} />
      if (c === 'resumen') return <SecuenciaPartido datos={datos} id={b} recordarCopia={seg[3] === 'copia'} />
      return <DetallePartido datos={datos} id={b} />
    case 'premios':
      return <Premios datos={datos} />
    case 'notificaciones':
      return <Notificaciones datos={datos} />
    case 'evoluciones': // rutas antiguas: ahora todo está en Estadísticas
      return <Redirigir a={`/estadisticas/${b === 'comparador' || b === 'galeria' || b === 'graficos' ? b : 'ranking'}${c ? `/${c}` : ''}`} />
    case 'ajustes':
      if (b === 'avanzado') return <Avanzado datos={datos} />
      if (b === 'copias') return <Copias datos={datos} />
      return <Ajustes datos={datos} />
    default:
      return <Inicio datos={datos} />
  }
}

// Las 5 pestañas de la barra se quedan montadas (ocultas) después de abrirlas:
// volver a una es instantáneo en vez de construirla otra vez con todas sus cartas.
const PESTANAS_VIVAS = new Set(['', 'plantilla', 'liga', 'estadisticas', 'mas'])
const PantallaViva = memo(
  function PantallaViva({ seg, datos }: { seg: string[]; datos: Datos }) {
    return <Pantalla seg={seg} datos={datos} />
  },
  (a, b) => a.datos === b.datos && a.seg.join('/') === b.seg.join('/'),
)

export default function App() {
  const [listo, setListo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ruta = useRuta()
  const datos = useDatos()
  const seg = ruta.split('/').filter(Boolean)
  const activa = pestanaDe(seg)
  const enAsistente = seg[0] === 'partido' && (seg[1] === 'nuevo' || seg[2] === 'editar' || seg[2] === 'resumen')
  const clave = seg[0] ?? ''
  const esPestana = PESTANAS_VIVAS.has(clave) && !(SOLO_LECTURA && esEdicion(seg))
  const [vivas, setVivas] = useState<Record<string, string>>({}) // pestaña → última ruta abierta en ella
  if (esPestana && vivas[clave] !== ruta) setVivas({ ...vivas, [clave]: ruta })
  useEffect(() => {
    // La prueba de velocidad las vacía para medir la primera vez que se abren.
    const vaciar = () => setVivas({})
    window.addEventListener('juwilata:reiniciar-pestanas', vaciar)
    return () => window.removeEventListener('juwilata:reiniciar-pestanas', vaciar)
  }, [])

  // Cada pantalla empieza arriba. Si no, en el iPhone al pasar de una pantalla larga
  // (bajada) a una corta se queda el desplazamiento y la barra de abajo se "sube".
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [ruta])

  useEffect(() => {
    if (SOLO_LECTURA) {
      // Espectador: se descarga la copia publicada por el administrador.
      document.body.classList.add('solo-lectura')
      prepararAppEspectador()
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

  // Con la app ya abierta, deja preparadas las fotos de las cartas (recorte y degradado).
  const fotos = datos?.todosJugadores.map((j) => j.foto).concat(datos.misterFicha.foto)
  useEffect(() => {
    if (!listo || !fotos) return
    const t = setTimeout(() => {
      // Primero las capas de los diseños que se ven (jugadores y míster); luego las fotos.
      const d = datos!
      const archivos = Object.values(d.calculo.jugadores).map((e) => (DISENOS[disenoDe(e.jugador, e.media, d.config, e.rangosAlcanzados)] ?? DISENOS.bronce).archivo)
      archivos.push((DISENOS_MISTER[disenoMister(d.misterFicha, d.mister.media, d.config, d.mister.rangosAlcanzados)] ?? DISENOS_MISTER.debutante).archivo)
      precalentarCapas(archivos).then(() => prepararFotos(fotos, infoPlantilla(plantillaLista('bronce') ?? document)?.silueta ?? ''))
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, fotos?.reduce((n, f) => n + (f?.length ?? 0), 0)])

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
        <EscudosRivales.Provider value={datos.escudos}>
          <Suspense fallback={null}>
            {Object.entries(vivas).map(([k, r]) => (
              <div key={k} className="pestana-viva" hidden={!esPestana || k !== clave}>
                <PantallaViva seg={r.split('/').filter(Boolean)} datos={datos} />
              </div>
            ))}
            {!esPestana && <Pantalla seg={seg} datos={datos} />}
          </Suspense>
        </EscudosRivales.Provider>
      </main>
      {!enAsistente && (
        <nav className="barra">
          <div className="barra__marca" aria-hidden="true">
            <img src={`${import.meta.env.BASE_URL}escudo.png`} alt="" />
            <span>{datos.equipo.nombre}</span>
          </div>
          {PESTANAS.map((p) => (
            <button key={p.id} className={p.id === activa ? 'activa' : ''} onClick={() => ir(p.ruta)}>
              <span className="barra__icono"><Icono nombre={p.icono} /></span>
              <span>{p.texto}</span>
            </button>
          ))}
        </nav>
      )}
      <DialogosRaiz />
    </>
  )
}
