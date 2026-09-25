import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { ir, type Datos } from '../datos'
import { Cabecera, Icono } from '../componentes/ui'
import { avisar } from '../componentes/dialogos'

function esInstalada(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches
}

export function Ajustes({ datos }: { datos: Datos }) {
  const { equipo, temporada } = datos
  const [nombre, setNombre] = useState(equipo.nombre)
  const [fundado, setFundado] = useState(String(equipo.fundado))
  const [nombreTemporada, setNombreTemporada] = useState(temporada.nombre)
  const [partidos, setPartidos] = useState(String(equipo.partidosTemporada))
  const [duracion, setDuracion] = useState(String(equipo.duracionPartido))
  const [persistente, setPersistente] = useState<boolean | null>(null)
  const diag = useLiveQuery(() => db.diagnostico.get('app'))
  const copias = useLiveQuery(() => db.copias.count())

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersistente).catch(() => setPersistente(null))
  }, [])

  const cambiado =
    nombre !== equipo.nombre || fundado !== String(equipo.fundado) || nombreTemporada !== temporada.nombre ||
    partidos !== String(equipo.partidosTemporada) || duracion !== String(equipo.duracionPartido)

  const guardar = async () => {
    const f = Number(fundado)
    const pt = Number(partidos)
    const du = Number(duracion)
    if (!nombre.trim()) return avisar('Falta el nombre del equipo.')
    if (!nombreTemporada.trim()) return avisar('Falta el nombre de la temporada.')
    if (!Number.isInteger(pt) || pt < 1 || pt > 80) return avisar('Partidos por temporada: entre 1 y 80.')
    if (!Number.isInteger(du) || du < 10 || du > 120) return avisar('Duración del partido: entre 10 y 120 minutos.')
    await db.transaction('rw', db.equipo, db.temporadas, async () => {
      await db.equipo.update('equipo', { nombre: nombre.trim(), fundado: Number.isInteger(f) ? f : equipo.fundado, partidosTemporada: pt, duracionPartido: du })
      await db.temporadas.update(temporada.id, { nombre: nombreTemporada.trim() })
    })
    avisar('Configuración guardada')
  }

  return (
    <>
      <Cabecera titulo="Ajustes" />

      <section className="tarjeta formulario">
        <h2>Equipo</h2>
        <div className="fila-campos">
          <label className="campo">
            <span>Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label className="campo campo--corto">
            <span>Fundado</span>
            <input value={fundado} onChange={(e) => setFundado(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" />
          </label>
        </div>
        <label className="campo">
          <span>Temporada</span>
          <input value={nombreTemporada} onChange={(e) => setNombreTemporada(e.target.value)} />
        </label>
        <div className="fila-campos">
          <label className="campo">
            <span>Partidos por temporada</span>
            <input value={partidos} onChange={(e) => setPartidos(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" />
          </label>
          <label className="campo">
            <span>Minutos por partido</span>
            <input value={duracion} onChange={(e) => setDuracion(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" />
          </label>
        </div>
        {cambiado && <button className="boton" onClick={guardar}>Guardar</button>}
      </section>

      <section className="tarjeta">
        <label className="interruptor">
          <div>
            <strong>Secuencia al confirmar un partido</strong>
            <span>Resultado, protagonistas, medias, cartas nuevas y MVP, a pantalla completa.</span>
          </div>
          <input
            type="checkbox"
            checked={equipo.secuenciaPostPartido !== false}
            onChange={(e) => db.equipo.update('equipo', { secuenciaPostPartido: e.target.checked })}
          />
        </label>
      </section>

      <section className="tarjeta menu">
        <button onClick={() => ir('/ajustes/copias')}>
          <div>
            <strong>Copias de seguridad</strong>
            <span>Exportar, importar y copias automáticas ({copias ?? 0}/5)</span>
          </div>
          <Icono nombre="flecha" tam={18} />
        </button>
        <button onClick={() => ir('/ajustes/avanzado')}>
          <div>
            <strong>Avanzado</strong>
            <span>Tablas de evolución de la media, con simulación</span>
          </div>
          <Icono nombre="flecha" tam={18} />
        </button>
      </section>

      <section className="tarjeta">
        <h2>Estado del dispositivo</h2>
        <ul className="lista-simple">
          <li><span>Instalada en inicio</span><strong>{esInstalada() ? 'Sí' : 'No'}</strong></li>
          <li><span>Almacenamiento persistente</span><strong>{persistente ? 'Concedido' : persistente === false ? 'No concedido' : '—'}</strong></li>
          <li><span>Veces abierta</span><strong>{diag?.aperturas ?? '—'}</strong></li>
        </ul>
        <p className="nota">Los datos solo viven en este dispositivo. Exporta la copia manual de vez en cuando.</p>
      </section>

      <footer className="pie">Juwilata United · versión 1.0 (Fase 1)</footer>
    </>
  )
}
