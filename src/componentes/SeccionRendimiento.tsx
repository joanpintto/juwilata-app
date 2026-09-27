import { useState } from 'react'
import { medirVelocidad, modoLigero, ponerModoLigero, ultimaMedida, type ResultadoMedida } from './rendimiento'

const clase = (ms: number) => (ms >= 400 ? 'lento' : ms <= 150 ? 'rapido' : '')

/** Ajustes → Rendimiento: modo ligero y prueba de velocidad en este móvil. */
export function SeccionRendimiento({ idJugador }: { idJugador: string | null }) {
  const [ligero, setLigero] = useState(modoLigero())
  const [midiendo, setMidiendo] = useState<string | null>(null)
  const [r, setR] = useState<ResultadoMedida | null>(ultimaMedida())

  const medir = async () => {
    setMidiendo('Empezando…')
    const res = await medirVelocidad(idJugador, setMidiendo)
    setMidiendo(null)
    setR(res)
    setLigero(modoLigero())
  }

  return (
    <section className="tarjeta formulario">
      <h2>Rendimiento</h2>
      <label className="interruptor">
        <div>
          <strong>Modo ligero</strong>
          <span>Quita las animaciones y luces decorativas (la app se ve igual, pero quieta). Solo en este móvil.</span>
        </div>
        <input type="checkbox" checked={ligero} onChange={(e) => { ponerModoLigero(e.target.checked); setLigero(e.target.checked) }} />
      </label>
      <button className="boton boton--sec" disabled={!!midiendo} onClick={medir}>
        {midiendo ?? 'Medir la velocidad en este móvil'}
      </button>
      <p className="nota">Recorre las pantallas principales (tarda unos 30 segundos) y mide cuánto tarda cada una. No toques nada mientras mide.</p>
      {r && !midiendo && (
        <>
          <table className="medida">
            <thead><tr><th>Pantalla (ms)</th><th>1ª vez</th><th>Al volver</th><th>Ligero</th></tr></thead>
            <tbody>
              {r.filas.map((f) => (
                <tr key={f.pantalla}>
                  <td>{f.pantalla}</td>
                  <td className={clase(f.primera)}>{f.primera}</td>
                  <td className={clase(f.vuelta)}>{f.vuelta}</td>
                  <td className={clase(f.ligero)}>{f.ligero}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="medida">
            <thead><tr><th>Fluidez</th><th>FPS</th><th>Tirones</th><th>FPS ligero</th></tr></thead>
            <tbody>
              {r.fps.map((f) => (
                <tr key={f.pantalla}><td>{f.pantalla}</td><td>{f.normal}</td><td>{f.tirones}</td><td>{f.ligero}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="nota">
            Leer datos: {r.lecturaMs} ms · calcular medias: {r.calculoMs} ms · fotos: {Math.round(r.fotosKB / 1024 * 10) / 10} MB · {r.dispositivo} · {new Date(r.fecha).toLocaleString('es-ES')}
          </p>
          <p className="nota">Haz una captura de esta tabla y envíasela a quien te ayuda con la app.</p>
        </>
      )}
    </section>
  )
}
