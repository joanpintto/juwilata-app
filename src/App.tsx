import { useEffect, useState } from 'react'
import { registrarApertura, pedirAlmacenamientoPersistente, type Diagnostico } from './db'

function esInstalada(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches
}

function formatear(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
}

type Estado = 'ok' | 'aviso' | 'error'

function Fila({ estado, titulo, detalle }: { estado: Estado; titulo: string; detalle: string }) {
  return (
    <li className={`fila fila--${estado}`}>
      <span className="fila__punto" aria-hidden="true" />
      <div>
        <div className="fila__titulo">{titulo}</div>
        <div className="fila__detalle">{detalle}</div>
      </div>
    </li>
  )
}

export default function App() {
  const [diag, setDiag] = useState<Diagnostico | null>(null)
  const [persistente, setPersistente] = useState<boolean | null | undefined>(undefined)
  const [errorDB, setErrorDB] = useState<string | null>(null)
  const instalada = esInstalada()

  useEffect(() => {
    registrarApertura().then(setDiag).catch((e) => setErrorDB(String(e)))
    pedirAlmacenamientoPersistente().then(setPersistente).catch(() => setPersistente(null))
  }, [])

  return (
    <main className="app">
      <header className="cabecera">
        <img src={`${import.meta.env.BASE_URL}escudo.png`} alt="Escudo del Juwilata United" className="cabecera__escudo" />
        <div>
          <h1>Juwilata United</h1>
          <p className="cabecera__sub">Fase 0 · comprobación de instalación</p>
        </div>
      </header>

      <section className="tarjeta">
        <h2>Estado</h2>
        <ul className="lista">
          <Fila
            estado={instalada ? 'ok' : 'aviso'}
            titulo={instalada ? 'Instalada en la pantalla de inicio' : 'Abierta desde el navegador'}
            detalle={instalada ? 'Perfecto: así Safari no borra los datos.' : 'Instálala siguiendo los pasos de abajo y ábrela desde el icono.'}
          />
          <Fila
            estado={errorDB ? 'error' : diag ? 'ok' : 'aviso'}
            titulo={errorDB ? 'Error al guardar datos' : diag ? 'Los datos se guardan' : 'Comprobando almacenamiento…'}
            detalle={
              errorDB
                ? errorDB
                : diag
                  ? `Veces abierta: ${diag.aperturas} · primera: ${formatear(diag.primeraApertura)}`
                  : ' '
            }
          />
          <Fila
            estado={persistente === true ? 'ok' : persistente === undefined ? 'aviso' : 'aviso'}
            titulo={
              persistente === true
                ? 'Almacenamiento persistente concedido'
                : persistente === undefined
                  ? 'Comprobando almacenamiento persistente…'
                  : 'Almacenamiento persistente no concedido'
            }
            detalle={
              persistente === true
                ? 'El navegador no borrará los datos por falta de espacio.'
                : 'En iPhone se concede al usarla instalada. Las copias de seguridad serán la red de seguridad.'
            }
          />
        </ul>
        <p className="nota">Cierra la app del todo y vuelve a abrirla: si «Veces abierta» sube, los datos sobreviven.</p>
      </section>

      {!instalada && (
        <section className="tarjeta">
          <h2>Instalar en iPhone</h2>
          <ol className="pasos">
            <li>Abre esta página en <strong>Safari</strong>.</li>
            <li>Pulsa el botón <strong>Compartir</strong> (el cuadrado con la flecha hacia arriba).</li>
            <li>Elige <strong>Añadir a pantalla de inicio</strong> y confirma.</li>
            <li>Abre la app desde el nuevo icono del escudo.</li>
          </ol>
        </section>
      )}

      <footer className="pie">Versión 0.0.1 · los datos solo viven en este dispositivo</footer>
    </main>
  )
}
