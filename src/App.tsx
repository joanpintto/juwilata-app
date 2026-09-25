import { useEffect, useState, type ReactNode } from 'react'
import { inicializar, pedirAlmacenamientoPersistente, registrarApertura } from './db'
import { ir, useDatos, useRuta, type Datos } from './datos'
import { DialogosRaiz, Icono } from './componentes/ui'
import { precargarCartas } from './componentes/plantillas'
import { Inicio } from './pantallas/Inicio'
import { Jugadores } from './pantallas/Jugadores'
import { Formacion } from './pantallas/Formacion'
import { FichaJugador } from './pantallas/FichaJugador'
import { EditarJugador } from './pantallas/EditarJugador'
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

function Pantalla({ seg, datos }: { seg: string[]; datos: Datos }): ReactNode {
  const [a, b, c] = seg
  switch (a) {
    case undefined:
      return <Inicio datos={datos} />
    case 'plantilla':
      return b === 'formacion' ? <Formacion datos={datos} /> : <Jugadores datos={datos} />
    case 'jugador':
      if (b === 'nuevo') return <EditarJugador datos={datos} />
      if (c === 'editar') return <EditarJugador datos={datos} id={b} />
      return <FichaJugador datos={datos} id={b} />
    case 'partidos':
      return b === 'liga' ? <Liga datos={datos} /> : <Partidos datos={datos} />
    case 'partido':
      if (b === 'nuevo') return <RegistroPartido key={c ?? 'nuevo'} datos={datos} programadoId={c} />
      if (c === 'editar') return <RegistroPartido datos={datos} id={b} />
      if (c === 'resumen') return <SecuenciaPartido datos={datos} id={b} recordarCopia={seg[3] === 'copia'} />
      return <DetallePartido datos={datos} id={b} />
    case 'premios':
      return <Premios datos={datos} />
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

  useEffect(() => {
    inicializar()
      .then(() => precargarCartas())
      .then(() => setListo(true))
      .catch((e) => setError(String(e)))
    registrarApertura().catch(() => {})
    pedirAlmacenamientoPersistente().catch(() => {})
  }, [])

  if (error) return <main className="app"><p className="error-grave">No se pudo abrir la base de datos: {error}</p></main>
  if (!listo || !datos) return <main className="app app--cargando"><img src={`${import.meta.env.BASE_URL}escudo.png`} alt="" className="cargando" /></main>

  return (
    <>
      <main className={`app ${enAsistente ? 'app--sin-barra' : ''}`}>
        <Pantalla seg={seg} datos={datos} />
      </main>
      {!enAsistente && (
        <nav className="barra">
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
