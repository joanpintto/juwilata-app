import { useState } from 'react'
import { db } from '../db'
import { conSigno, fmt1, fmt2, type Datos } from '../datos'
import { cambioMedia, simular } from '../motor/calculo'
import { CONFIG_INICIAL, type Config, type Tabla } from '../motor/config'
import { Cabecera, Hoja } from '../componentes/ui'
import { avisar } from '../componentes/dialogos'

// Ajustes → Avanzado (básico, Fase 1): tablas y constantes de la evolución
// de la media, con simulación antes de aplicar.

function leer(texto: string): number | null {
  const v = Number(texto.replace(',', '.').trim())
  return texto.trim() === '' || Number.isNaN(v) ? null : v
}

function Numero({ valor, onChange, ancho = 64 }: { valor: number; onChange: (v: number) => void; ancho?: number }) {
  const [texto, setTexto] = useState<string | null>(null)
  return (
    <input
      className="num"
      style={{ width: ancho }}
      inputMode="decimal"
      value={texto ?? String(valor).replace('.', ',')}
      onFocus={(e) => {
        setTexto(String(valor).replace('.', ','))
        e.target.select()
      }}
      onChange={(e) => {
        setTexto(e.target.value)
        const v = leer(e.target.value)
        if (v !== null) onChange(v)
      }}
      onBlur={() => setTexto(null)}
    />
  )
}

function EditorTabla({ titulo, ayuda, tabla, onChange, etiquetaX, etiquetaY }: { titulo: string; ayuda: string; tabla: Tabla; onChange: (t: Tabla) => void; etiquetaX: string; etiquetaY: string }) {
  return (
    <section className="tarjeta">
      <h2>{titulo}</h2>
      <p className="nota">{ayuda}</p>
      <div className="tabla-editable">
        <div className="tabla-editable__fila tabla-editable__cab">
          <span>{etiquetaX}</span>
          <span>{etiquetaY}</span>
        </div>
        {tabla.map((p, i) => (
          <div key={i} className="tabla-editable__fila">
            <span>{String(p.x).replace('.', ',')}</span>
            <Numero valor={p.y} onChange={(v) => onChange(tabla.map((q, k) => (k === i ? { ...q, y: v } : q)))} />
          </div>
        ))}
      </div>
    </section>
  )
}

function Constante({ texto, valor, onChange }: { texto: string; valor: number; onChange: (v: number) => void }) {
  return (
    <div className="constante">
      <span>{texto}</span>
      <Numero valor={valor} onChange={onChange} />
    </div>
  )
}

const NOTAS_SIM = [6, 6.5, 7, 7.5, 8, 8.5, 9]
const PARTIDOS_SIM = [1, 4, 8, 16, 24, 32]
const NOTAS_PARTIDO = [4, 5, 6, 7.5, 9]
const MEDIAS_PARTIDO = [62, 70, 78, 86, 92]

export function Avanzado({ datos }: { datos: Datos }) {
  const { config, configVersion, partidos } = datos
  const [borrador, setBorrador] = useState<Config>(config)
  const [aplicar, setAplicar] = useState(false)
  const cambiado = JSON.stringify(borrador) !== JSON.stringify(config)
  const set = <K extends keyof Config>(k: K, v: Config[K]) => setBorrador((b) => ({ ...b, [k]: v }))

  const guardar = async (modo: 'todo' | 'desde-ahora') => {
    const version = configVersion + 1
    await db.transaction('rw', db.configuraciones, db.partidos, async () => {
      await db.configuraciones.put({
        version, datos: borrador, creada: new Date().toISOString(),
        descripcion: modo === 'todo' ? 'Recalculada toda la temporada' : 'Aplicada solo desde ahora',
      })
      if (modo === 'todo') {
        await db.partidos.toCollection().modify({ configVersion: version })
      }
    })
    setAplicar(false)
    avisar(modo === 'todo' ? 'Aplicado: temporada recalculada' : 'Aplicado a partir del próximo partido')
  }

  return (
    <>
      <Cabecera titulo="Avanzado" sub={`Evolución de la media · configuración v${configVersion}`} atras="/ajustes" />

      <section className="tarjeta">
        <h2>Simulación</h2>
        <p className="nota">
          Media de un jugador que empieza en {borrador.mediaMin} y saca siempre la misma nota, sin MVPs.
          {cambiado && ' Entre paréntesis, la diferencia con la configuración actual.'}
        </p>
        <div className="simulacion">
          <table>
            <thead>
              <tr>
                <th>Nota</th>
                {PARTIDOS_SIM.map((p) => (
                  <th key={p}>{p === 32 ? 'Final' : `P${p}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NOTAS_SIM.map((nota) => {
                const nuevo = simular(nota, 32, borrador)
                const viejo = simular(nota, 32, config)
                return (
                  <tr key={nota}>
                    <th>{fmt1(nota)}</th>
                    {PARTIDOS_SIM.map((p) => {
                      const d = nuevo[p - 1] - viejo[p - 1]
                      return (
                        <td key={p}>
                          {fmt1(nuevo[p - 1])}
                          {cambiado && Math.abs(d) >= 0.05 && <small className={d > 0 ? 'sube' : 'baja'}>{conSigno(d)}</small>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="nota">Con MVP en los 32 partidos, un jugador de 9 acaba en {fmt1(simular(9, 32, borrador, { mvp: true })[31])}.</p>
      </section>

      <section className="tarjeta">
        <h2>Un partido, según la media</h2>
        <p className="nota">Cuánto cambia la media en un partido completo según el nivel del jugador, si viene jugando con esa misma nota.</p>
        <div className="simulacion">
          <table>
            <thead>
              <tr>
                <th>Media</th>
                {NOTAS_PARTIDO.map((n) => (
                  <th key={n}>Nota {fmt1(n)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEDIAS_PARTIDO.map((m) => (
                <tr key={m}>
                  <th>{m}</th>
                  {NOTAS_PARTIDO.map((n) => {
                    const c = cambioMedia(n, n, m, 50, borrador)
                    return (
                      <td key={n} className={c > 0.005 ? 'sube' : c < -0.005 ? 'baja' : ''}>
                        {conSigno(c, fmt2)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <EditorTabla titulo="Ritmo" ayuda="Puntos de media por partido según la nota ponderada (si el partido no fue malo). Entre valores se interpola." tabla={borrador.ritmo} onChange={(t) => set('ritmo', t)} etiquetaX="Nota" etiquetaY="Ritmo" />
      <EditorTabla titulo="Multiplicador" ayuda="Según la media actual: cuanto más alta, más cuesta subir." tabla={borrador.multiplicadorMedia} onChange={(t) => set('multiplicadorMedia', t)} etiquetaX="Media" etiquetaY="×" />
      <EditorTabla titulo="Cuánto se nota la bajada" ayuda="Según la media actual: con medias bajas casi no se baja; con medias altas, algo más." tabla={borrador.nivelBajada} onChange={(t) => set('nivelBajada', t)} etiquetaX="Media" etiquetaY="×" />

      <section className="tarjeta">
        <h2>Nota ponderada</h2>
        <Constante texto="Peso del último partido" valor={borrador.pesosNotaPonderada.ultimo} onChange={(v) => set('pesosNotaPonderada', { ...borrador.pesosNotaPonderada, ultimo: v })} />
        <Constante texto="Peso de los 2 anteriores" valor={borrador.pesosNotaPonderada.dosAnteriores} onChange={(v) => set('pesosNotaPonderada', { ...borrador.pesosNotaPonderada, dosAnteriores: v })} />
        <Constante texto="Peso de la temporada" valor={borrador.pesosNotaPonderada.temporada} onChange={(v) => set('pesosNotaPonderada', { ...borrador.pesosNotaPonderada, temporada: v })} />
      </section>

      <section className="tarjeta">
        <h2>Subidas, bajadas y minutos</h2>
        <Constante texto="Se baja con una nota por debajo de" valor={borrador.umbralBajada} onChange={(v) => set('umbralBajada', v)} />
        <Constante texto="Bajada por cada punto por debajo" valor={borrador.bajadaPorPunto} onChange={(v) => set('bajadaPorPunto', v)} />
        <Constante texto="Tope de bajada por partido" valor={borrador.topeBajada} onChange={(v) => set('topeBajada', v)} />
        <Constante texto="Tope de subida por partido" valor={borrador.topeSubida} onChange={(v) => set('topeSubida', v)} />
        <Constante texto="Factor de minutos: base" valor={borrador.minutosBase} onChange={(v) => set('minutosBase', v)} />
        <Constante texto="Factor de minutos: por minuto" valor={borrador.minutosPorMinuto} onChange={(v) => set('minutosPorMinuto', v)} />
      </section>

      <section className="tarjeta">
        <h2>Premio de MVP</h2>
        <Constante texto="MVP" valor={borrador.premioMvp} onChange={(v) => set('premioMvp', v)} />
        <Constante texto="Otros nominados" valor={borrador.premioNominado} onChange={(v) => set('premioNominado', v)} />
        <Constante texto="Se reduce a partir de media" valor={borrador.premioDesde} onChange={(v) => set('premioDesde', v)} />
        <Constante texto="Reducción máxima (fracción)" valor={borrador.premioReduccion} onChange={(v) => set('premioReduccion', v)} />
      </section>

      <div className="acciones-ficha">
        <button className="boton boton--sec" onClick={() => setBorrador({ ...borrador, ...soloEvolucion(CONFIG_INICIAL) })}>Valores del documento</button>
        <button className="boton boton--sec" disabled={!cambiado} onClick={() => setBorrador(config)}>Descartar</button>
      </div>
      <button className="boton boton--grande" disabled={!cambiado} onClick={() => setAplicar(true)}>Aplicar cambios…</button>

      <Hoja abierta={aplicar} onCerrar={() => setAplicar(false)} titulo="¿Cómo aplicar los cambios?">
        <button className="hoja__opcion" onClick={() => guardar('todo')}>
          <strong>Recalcular toda la temporada</strong>
          <span>Los {partidos.length} partidos ya jugados se vuelven a calcular con los nuevos valores.</span>
        </button>
        <button className="hoja__opcion" onClick={() => guardar('desde-ahora')}>
          <strong>Aplicar solo desde ahora</strong>
          <span>Lo ya jugado se queda como está; los nuevos valores cuentan desde el próximo partido.</span>
        </button>
      </Hoja>
    </>
  )
}

function soloEvolucion(c: Config): Partial<Config> {
  return {
    ritmo: c.ritmo, multiplicadorMedia: c.multiplicadorMedia, nivelBajada: c.nivelBajada, pesosNotaPonderada: c.pesosNotaPonderada,
    umbralBajada: c.umbralBajada, bajadaPorPunto: c.bajadaPorPunto, topeSubida: c.topeSubida, topeBajada: c.topeBajada,
    minutosBase: c.minutosBase, minutosPorMinuto: c.minutosPorMinuto,
    premioMvp: c.premioMvp, premioNominado: c.premioNominado, premioDesde: c.premioDesde, premioReduccion: c.premioReduccion,
  }
}
