import { useState } from 'react'
import { db, nuevoId } from '../db'
import { conSigno, fmt1, fmt2, type Datos } from '../datos'
import { atributosIniciales, calcularNota, cambioMedia, media, simular, simularMister } from '../motor/calculo'
import {
  ACCIONES, CONFIG_INICIAL, ETIQUETAS_CAMPO, ETIQUETAS_MISTER, ETIQUETAS_PORTERO, MEDIDAS_CASA, POSICIONES,
  type Config, type ConfigMister, type LogroCasa, type Posicion,
} from '../motor/config'
import { ICONOS_LOGRO, defsCasa } from '../motor/logros'
import { Constante, EditorTabla, Numero } from '../componentes/Editores'
import { EscudoLogro } from '../componentes/Logros'
import { Cabecera, Hoja, Icono } from '../componentes/ui'
import { avisar, confirmar } from '../componentes/dialogos'

// Ajustes → Avanzado: todas las constantes de la app, por apartados.
// Los cambios se guardan como una nueva versión de la configuración.

type Apartado = 'evolucion' | 'nota' | 'roles' | 'rangos' | 'atributos' | 'premios' | 'casa' | 'mister'
const APARTADOS: { id: Apartado; texto: string }[] = [
  { id: 'evolucion', texto: 'Evolución' },
  { id: 'nota', texto: 'Nota' },
  { id: 'roles', texto: 'Roles' },
  { id: 'rangos', texto: 'Rangos' },
  { id: 'atributos', texto: 'Atributos' },
  { id: 'premios', texto: 'Premios' },
  { id: 'casa', texto: 'Logros de la casa' },
  { id: 'mister', texto: 'Míster' },
]

/** Qué claves de la configuración pertenecen a cada apartado (para «Valores del documento»). */
const CLAVES: Record<Apartado, (keyof Config)[]> = {
  evolucion: [
    'ritmo', 'multiplicadorMedia', 'nivelBajada', 'pesosNotaPonderada', 'umbralBajada', 'bajadaPorPunto', 'topeSubida',
    'topeBajada', 'minutosBase', 'minutosPorMinuto', 'premioMvp', 'premioNominado', 'premioDesde', 'premioReduccion',
  ],
  nota: ['notaBase', 'ajusteResultado', 'margenAmplio', 'ofensivas', 'defensivas', 'porteriaCeroCampo', 'multiplicadores', 'negativasPosicion', 'negativasGenerales', 'portero'],
  roles: ['roles'],
  rangos: ['rangos'],
  atributos: ['atributosBase', 'atributosEscala', 'atributoMin', 'atributoMax', 'mediaMin', 'mediaMax', 'atribTope', 'atribFactorSecundario', 'atribMinutos', 'correctorCada', 'correctorUmbral', 'correctorAjuste'],
  premios: ['ifNotaMinima', 'potmPesos', 'potmMinutos', 'totyPesos', 'totyPartidos'],
  casa: ['logrosCasa'],
  mister: ['mister'],
}

const NOTAS_SIM = [6, 6.5, 7, 7.5, 8, 8.5, 9]
const PARTIDOS_SIM = [1, 4, 8, 16, 24, 32]
const NOTAS_PARTIDO = [4, 5, 6, 7.5, 9]
const MEDIAS_PARTIDO = [62, 70, 78, 86, 92]

function errores(c: Config): string[] {
  const e: string[] = []
  for (const r of c.roles) {
    const suma = r.pesos.reduce((s, p) => s + p, 0)
    if (Math.abs(suma - 100) > 0.01) e.push(`Los pesos de ${r.nombre} suman ${fmt1(suma)} (deben sumar 100).`)
  }
  const d = c.rangos.map((r) => r.desde)
  if (d.some((v, i) => i > 0 && v <= d[i - 1])) e.push('Los rangos deben ir de menor a mayor.')
  const sumaMister = c.mister.pesos.reduce((s, p) => s + p, 0)
  if (Math.abs(sumaMister - 100) > 0.01) e.push(`Los pesos de los atributos del míster suman ${fmt1(sumaMister)} (deben sumar 100).`)
  const dm = c.mister.rangos.map((r) => r.desde)
  if (dm.some((v, i) => i > 0 && v <= dm[i - 1])) e.push('Los rangos del míster deben ir de menor a mayor.')
  for (const l of c.logrosCasa) {
    if (!l.nombre.trim()) e.push('Hay un logro de la casa sin nombre.')
    if (l.metas.some((m) => !(m > 0))) e.push(`«${l.nombre || 'Sin nombre'}»: las metas deben ser mayores que 0.`)
    if (l.metas.length === 3 && !(l.metas[0] < l.metas[1] && l.metas[1] < l.metas[2])) e.push(`«${l.nombre}»: bronce < plata < oro.`)
  }
  return e
}

// ─── Apartados ────────────────────────────────────────────────────────

type Editar = { b: Config; config: Config; set: <K extends keyof Config>(k: K, v: Config[K]) => void; cambiado: boolean }

function Evolucion({ b, config, set, cambiado }: Editar) {
  return (
    <>
      <section className="tarjeta">
        <h2>Simulación</h2>
        <p className="nota">
          Media de un jugador que empieza en {b.mediaMin} y saca siempre la misma nota, sin MVPs.
          {cambiado && ' En pequeño, la diferencia con la configuración actual.'}
        </p>
        <div className="simulacion">
          <table>
            <thead>
              <tr>
                <th>Nota</th>
                {PARTIDOS_SIM.map((p) => <th key={p}>{p === 32 ? 'Final' : `P${p}`}</th>)}
              </tr>
            </thead>
            <tbody>
              {NOTAS_SIM.map((nota) => {
                const nuevo = simular(nota, 32, b)
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
        <p className="nota">Con MVP en los 32 partidos, un jugador de 9 acaba en {fmt1(simular(9, 32, b, { mvp: true })[31])}.</p>
      </section>

      <section className="tarjeta">
        <h2>Un partido, según la media</h2>
        <p className="nota">Cuánto cambia la media en un partido completo según el nivel del jugador, si viene jugando con esa misma nota.</p>
        <div className="simulacion">
          <table>
            <thead>
              <tr>
                <th>Media</th>
                {NOTAS_PARTIDO.map((n) => <th key={n}>Nota {fmt1(n)}</th>)}
              </tr>
            </thead>
            <tbody>
              {MEDIAS_PARTIDO.map((m) => (
                <tr key={m}>
                  <th>{m}</th>
                  {NOTAS_PARTIDO.map((n) => {
                    const c = cambioMedia(n, n, m, 50, b)
                    return <td key={n} className={c > 0.005 ? 'sube' : c < -0.005 ? 'baja' : ''}>{conSigno(c, fmt2)}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <EditorTabla titulo="Ritmo" ayuda="Puntos de media por partido según la nota ponderada (si el partido no fue malo). Entre valores se interpola." tabla={b.ritmo} onChange={(t) => set('ritmo', t)} etiquetaX="Nota" etiquetaY="Ritmo" />
      <EditorTabla titulo="Multiplicador" ayuda="Según la media actual: cuanto más alta, más cuesta subir." tabla={b.multiplicadorMedia} onChange={(t) => set('multiplicadorMedia', t)} etiquetaX="Media" etiquetaY="×" />
      <EditorTabla titulo="Cuánto se nota la bajada" ayuda="Según la media actual: con medias bajas casi no se baja; con medias altas, algo más." tabla={b.nivelBajada} onChange={(t) => set('nivelBajada', t)} etiquetaX="Media" etiquetaY="×" />

      <section className="tarjeta">
        <h2>Nota ponderada</h2>
        <Constante texto="Peso del último partido" valor={b.pesosNotaPonderada.ultimo} onChange={(v) => set('pesosNotaPonderada', { ...b.pesosNotaPonderada, ultimo: v })} />
        <Constante texto="Peso de los 2 anteriores" valor={b.pesosNotaPonderada.dosAnteriores} onChange={(v) => set('pesosNotaPonderada', { ...b.pesosNotaPonderada, dosAnteriores: v })} />
        <Constante texto="Peso de la temporada" valor={b.pesosNotaPonderada.temporada} onChange={(v) => set('pesosNotaPonderada', { ...b.pesosNotaPonderada, temporada: v })} />
      </section>

      <section className="tarjeta">
        <h2>Subidas, bajadas y minutos</h2>
        <Constante texto="Se baja con una nota por debajo de" valor={b.umbralBajada} onChange={(v) => set('umbralBajada', v)} />
        <Constante texto="Bajada por cada punto por debajo" valor={b.bajadaPorPunto} onChange={(v) => set('bajadaPorPunto', v)} />
        <Constante texto="Tope de bajada por partido" valor={b.topeBajada} onChange={(v) => set('topeBajada', v)} />
        <Constante texto="Tope de subida por partido" valor={b.topeSubida} onChange={(v) => set('topeSubida', v)} />
        <Constante texto="Factor de minutos: base" valor={b.minutosBase} onChange={(v) => set('minutosBase', v)} />
        <Constante texto="Factor de minutos: por minuto" valor={b.minutosPorMinuto} onChange={(v) => set('minutosPorMinuto', v)} />
      </section>

      <section className="tarjeta">
        <h2>Premio de MVP</h2>
        <Constante texto="MVP" valor={b.premioMvp} onChange={(v) => set('premioMvp', v)} />
        <Constante texto="Otros nominados" valor={b.premioNominado} onChange={(v) => set('premioNominado', v)} />
        <Constante texto="Se reduce a partir de media" valor={b.premioDesde} onChange={(v) => set('premioDesde', v)} />
        <Constante texto="Reducción máxima (fracción)" valor={b.premioReduccion} onChange={(v) => set('premioReduccion', v)} />
      </section>
    </>
  )
}

/** Tabla de valores por posición (multiplicadores, negativas…). */
function TablaPosiciones({ filas, posiciones }: { filas: { nombre: string; valores: Partial<Record<Posicion, number>>; cambiar: (p: Posicion, v: number) => void }[]; posiciones: Posicion[] }) {
  return (
    <div className="tabla-pos">
      <div className="tabla-pos__fila tabla-pos__cab" style={{ gridTemplateColumns: `1fr repeat(${posiciones.length}, 52px)` }}>
        <span />
        {posiciones.map((p) => <span key={p}>{POSICIONES.find((x) => x.id === p)!.corto}</span>)}
      </div>
      {filas.map((f) => (
        <div key={f.nombre} className="tabla-pos__fila" style={{ gridTemplateColumns: `1fr repeat(${posiciones.length}, 52px)` }}>
          <span>{f.nombre}</span>
          {posiciones.map((p) => <Numero key={p} valor={f.valores[p] ?? 0} onChange={(v) => f.cambiar(p, v)} ancho={50} />)}
        </div>
      ))}
    </div>
  )
}

function Nota({ b, set, config }: Editar) {
  const nombreAccion = (id: string) => ACCIONES.find((a) => a.id === id)?.nombre ?? id
  const ctxV = { golesFavor: 3, golesContra: 1, duracion: 50 }
  const ejemplos: { texto: string; pos: Posicion; acciones: Record<string, number>; ctx: typeof ctxV }[] = [
    { texto: 'Delantero: gol y asistencia, gana 3-1', pos: 'DEL', acciones: { gol: 1, asistencia: 1 }, ctx: ctxV },
    { texto: 'Central: 3 recuperaciones, gana 1-0', pos: 'DFC', acciones: { recuperacion: 3 }, ctx: { golesFavor: 1, golesContra: 0, duracion: 50 } },
    { texto: 'Portero: 5 paradas, pierde 1-2', pos: 'POR', acciones: { parada: 5, golEncajado: 2 }, ctx: { golesFavor: 1, golesContra: 2, duracion: 50 } },
    { texto: 'Medio: amarilla y error, empata 2-2', pos: 'MED', acciones: { amarilla: 1, error: 1 }, ctx: { golesFavor: 2, golesContra: 2, duracion: 50 } },
  ]
  const r = b.ajusteResultado
  return (
    <>
      <section className="tarjeta">
        <h2>Ejemplos</h2>
        <p className="nota">Nota de cuatro partidos de ejemplo con los valores de abajo (en pequeño, la actual).</p>
        <ul className="lista-simple">
          {ejemplos.map((e) => {
            const n = calcularNota(e.pos, e.acciones, 50, e.ctx, b)
            const a = calcularNota(e.pos, e.acciones, 50, e.ctx, config)
            return (
              <li key={e.texto}>
                <span>{e.texto}</span>
                <strong>{fmt2(n)}{Math.abs(n - a) > 0.001 && <small className="nota"> ({fmt2(a)})</small>}</strong>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="tarjeta">
        <h2>Base y resultado</h2>
        <Constante texto="Nota base" valor={b.notaBase} onChange={(v) => set('notaBase', v)} />
        <Constante texto="Goleada: diferencia desde" valor={b.margenAmplio} onChange={(v) => set('margenAmplio', v)} />
        <Constante texto="Ganar por goleada" valor={r.ganarAmplio} onChange={(v) => set('ajusteResultado', { ...r, ganarAmplio: v })} />
        <Constante texto="Ganar" valor={r.ganar} onChange={(v) => set('ajusteResultado', { ...r, ganar: v })} />
        <Constante texto="Empatar" valor={r.empate} onChange={(v) => set('ajusteResultado', { ...r, empate: v })} />
        <Constante texto="Perder" valor={r.perder} onChange={(v) => set('ajusteResultado', { ...r, perder: v })} />
        <Constante texto="Perder por goleada" valor={r.perderAmplio} onChange={(v) => set('ajusteResultado', { ...r, perderAmplio: v })} />
      </section>

      <section className="tarjeta">
        <h2>Acciones ofensivas</h2>
        <p className="nota">Valores de un delantero; se multiplican según la posición.</p>
        {Object.entries(b.ofensivas).map(([id, v]) => (
          <Constante key={id} texto={nombreAccion(id)} valor={v!} onChange={(x) => set('ofensivas', { ...b.ofensivas, [id]: x })} />
        ))}
      </section>

      <section className="tarjeta">
        <h2>Acciones defensivas</h2>
        <p className="nota">Valores de un central; se multiplican según la posición.</p>
        {Object.entries(b.defensivas).map(([id, v]) => (
          <Constante key={id} texto={nombreAccion(id)} valor={v!} onChange={(x) => set('defensivas', { ...b.defensivas, [id]: x })} />
        ))}
      </section>

      <section className="tarjeta">
        <h2>Multiplicadores por posición</h2>
        <TablaPosiciones
          posiciones={['DEL', 'MED', 'LAT', 'DFC']}
          filas={[
            { nombre: 'Ofensivo', valores: Object.fromEntries(Object.entries(b.multiplicadores).map(([p, m]) => [p, m.of])), cambiar: (p, v) => set('multiplicadores', { ...b.multiplicadores, [p]: { ...b.multiplicadores[p], of: v } }) },
            { nombre: 'Defensivo', valores: Object.fromEntries(Object.entries(b.multiplicadores).map(([p, m]) => [p, m.def])), cambiar: (p, v) => set('multiplicadores', { ...b.multiplicadores, [p]: { ...b.multiplicadores[p], def: v } }) },
            { nombre: 'Portería a cero', valores: b.porteriaCeroCampo, cambiar: (p, v) => set('porteriaCeroCampo', { ...b.porteriaCeroCampo, [p]: v }) },
          ]}
        />
      </section>

      <section className="tarjeta">
        <h2>Acciones negativas por posición</h2>
        <TablaPosiciones
          posiciones={['DEL', 'MED', 'LAT', 'DFC', 'POR']}
          filas={(['ocasionFallada', 'error', 'perdida'] as const).map((id) => ({
            nombre: nombreAccion(id),
            valores: b.negativasPosicion[id],
            cambiar: (p, v) => set('negativasPosicion', { ...b.negativasPosicion, [id]: { ...b.negativasPosicion[id], [p]: v } }),
          }))}
        />
        <p className="nota">Iguales para todos:</p>
        {Object.entries(b.negativasGenerales).map(([id, v]) => (
          <Constante key={id} texto={nombreAccion(id)} valor={v!} onChange={(x) => set('negativasGenerales', { ...b.negativasGenerales, [id]: x })} />
        ))}
      </section>

      <section className="tarjeta">
        <h2>Portero</h2>
        {([
          ['parada', 'Parada'], ['paradaDificil', 'Parada difícil'], ['penaltiParado', 'Penalti parado'], ['porteriaCero', 'Portería a cero'],
          ['golEncajado', 'Gol encajado'], ['salida', 'Salida ganada'], ['gol', 'Si marca'], ['asistencia', 'Si asiste'],
        ] as const).map(([k, t]) => (
          <Constante key={k} texto={t} valor={b.portero[k]} onChange={(v) => set('portero', { ...b.portero, [k]: v })} />
        ))}
      </section>
    </>
  )
}

function Roles({ b, set, config }: Editar) {
  return (
    <>
      <p className="nota">
        Los pesos de cada rol deben sumar 100. La media que se ve en la carta es la media ponderada con estos pesos, así que al aplicar
        cambian al momento las medias de todos los jugadores de ese rol.
      </p>
      {b.roles.map((r, i) => {
        const etiquetas = r.posicion === 'POR' ? ETIQUETAS_PORTERO : ETIQUETAS_CAMPO
        const suma = r.pesos.reduce((s, p) => s + p, 0)
        const ini = atributosIniciales(r.pesos, b)
        const antes = config.roles.find((x) => x.id === r.id)
        return (
          <section key={r.id} className="tarjeta">
            <div className="tarjeta__cab">
              <h2>{r.sigla} · {r.nombre}</h2>
              <span className={Math.abs(suma - 100) > 0.01 ? 'baja' : 'nota'}>Suma {fmt1(suma)}</span>
            </div>
            <div className="pesos">
              {r.pesos.map((p, k) => (
                <label key={k}>
                  <span>{etiquetas[k]}</span>
                  <Numero valor={p} ancho={48} onChange={(v) => set('roles', b.roles.map((x, j) => (j === i ? { ...x, pesos: x.pesos.map((q, m) => (m === k ? v : q)) as typeof x.pesos } : x)))} />
                  <small>{Math.round(ini[k])}</small>
                </label>
              ))}
            </div>
            <p className="nota">
              Debajo, los atributos con los que empieza un jugador nuevo (media {fmt1(media(ini, r.pesos))}).
              {antes && JSON.stringify(antes.pesos) !== JSON.stringify(r.pesos) ? ' Modificado.' : ''}
            </p>
          </section>
        )
      })}
    </>
  )
}

function Rangos({ b, set }: Editar) {
  return (
    <section className="tarjeta">
      <h2>Rangos de las cartas</h2>
      <p className="nota">Media a partir de la que se entra en cada rango (y cambia el diseño de la carta).</p>
      {b.rangos.map((r, i) => (
        <Constante key={r.id} texto={r.nombre} valor={r.desde} onChange={(v) => set('rangos', b.rangos.map((x, j) => (j === i ? { ...x, desde: v } : x)))} />
      ))}
    </section>
  )
}

function Atributos({ b, set }: Editar) {
  return (
    <>
      <section className="tarjeta">
        <h2>Atributos iniciales y límites</h2>
        <Constante texto="Media inicial de un jugador nuevo" valor={b.atributosBase} onChange={(v) => set('atributosBase', v)} />
        <Constante texto="Escala del perfil del rol" valor={b.atributosEscala} onChange={(v) => set('atributosEscala', v)} />
        <Constante texto="Media mínima" valor={b.mediaMin} onChange={(v) => set('mediaMin', v)} />
        <Constante texto="Media máxima" valor={b.mediaMax} onChange={(v) => set('mediaMax', v)} />
        <Constante texto="Atributo mínimo" valor={b.atributoMin} onChange={(v) => set('atributoMin', v)} />
        <Constante texto="Atributo máximo" valor={b.atributoMax} onChange={(v) => set('atributoMax', v)} />
      </section>
      <section className="tarjeta">
        <h2>Atributos por acciones</h2>
        <Constante texto="Tope por atributo y partido (±)" valor={b.atribTope} onChange={(v) => set('atribTope', v)} />
        <Constante texto="«Y un poco» (fracción)" valor={b.atribFactorSecundario} onChange={(v) => set('atribFactorSecundario', v)} />
        <Constante texto="Minutos para sumar FIS" valor={b.atribMinutos.desde} onChange={(v) => set('atribMinutos', { ...b.atribMinutos, desde: v })} />
        <Constante texto="FIS por muchos minutos" valor={b.atribMinutos.valor} onChange={(v) => set('atribMinutos', { ...b.atribMinutos, valor: v })} />
      </section>
      <section className="tarjeta">
        <h2>Corrector suave</h2>
        <Constante texto="Cada cuántos partidos" valor={b.correctorCada} onChange={(v) => set('correctorCada', v)} />
        <Constante texto="Si se alejan más de" valor={b.correctorUmbral} onChange={(v) => set('correctorUmbral', v)} />
        <Constante texto="Se acercan" valor={b.correctorAjuste} onChange={(v) => set('correctorAjuste', v)} />
      </section>
    </>
  )
}

function Premios({ b, set }: Editar) {
  return (
    <>
      <section className="tarjeta">
        <h2>IF</h2>
        <Constante texto="Nota ponderada mínima" valor={b.ifNotaMinima} onChange={(v) => set('ifNotaMinima', v)} />
      </section>
      <section className="tarjeta">
        <h2>POTM (jugador del mes)</h2>
        <Constante texto="Peso de la nota media" valor={b.potmPesos.notas} onChange={(v) => set('potmPesos', { ...b.potmPesos, notas: v })} />
        <Constante texto="Peso de los MVPs" valor={b.potmPesos.mvps} onChange={(v) => set('potmPesos', { ...b.potmPesos, mvps: v })} />
        <Constante texto="Peso de goles + asistencias" valor={b.potmPesos.produccion} onChange={(v) => set('potmPesos', { ...b.potmPesos, produccion: v })} />
        <Constante texto="Minutos sin penalizar (fracción)" valor={b.potmMinutos} onChange={(v) => set('potmMinutos', v)} />
      </section>
      <section className="tarjeta">
        <h2>TOTY (equipo de la temporada)</h2>
        <Constante texto="Peso de la nota media" valor={b.totyPesos.notas} onChange={(v) => set('totyPesos', { ...b.totyPesos, notas: v })} />
        <Constante texto="Peso de la evolución" valor={b.totyPesos.evolucion} onChange={(v) => set('totyPesos', { ...b.totyPesos, evolucion: v })} />
        <Constante texto="Peso de goles + asistencias" valor={b.totyPesos.produccion} onChange={(v) => set('totyPesos', { ...b.totyPesos, produccion: v })} />
        <Constante texto="Peso de los MVPs" valor={b.totyPesos.mvps} onChange={(v) => set('totyPesos', { ...b.totyPesos, mvps: v })} />
        <Constante texto="Partidos sin penalizar (fracción)" valor={b.totyPartidos} onChange={(v) => set('totyPartidos', v)} />
      </section>
    </>
  )
}

function Casa({ b, set }: Editar) {
  const [editando, setEditando] = useState<LogroCasa | null>(null)
  const defs = defsCasa(b)
  const vista = (l: LogroCasa) => {
    const def = defsCasa({ ...b, logrosCasa: [l] })[0]
    return { def, nivel: (def.niveles ? 3 : 1) as 1 | 3, veces: 1, progreso: 1, objetivo: 1, fecha: null }
  }
  const guardar = () => {
    if (!editando) return
    const existe = b.logrosCasa.some((l) => l.id === editando.id)
    set('logrosCasa', existe ? b.logrosCasa.map((l) => (l.id === editando.id ? editando : l)) : [...b.logrosCasa, editando])
    setEditando(null)
  }
  const borrar = async () => {
    if (!editando) return
    const ok = await confirmar({ titulo: `¿Borrar «${editando.nombre}»?`, texto: 'Desaparece de las vitrinas de todos los jugadores.', aceptar: 'Borrar', peligro: true })
    if (!ok) return
    set('logrosCasa', b.logrosCasa.filter((l) => l.id !== editando.id))
    setEditando(null)
  }
  const medidas = [
    ...MEDIDAS_CASA.map((m) => ({ id: m.id as string, nombre: m.nombre, tipos: m.tipos })),
    ...ACCIONES.map((a) => ({ id: a.id as string, nombre: a.nombre, tipos: ['total', 'racha', 'partido'] as LogroCasa['tipo'][] })),
  ]
  const e = editando

  return (
    <>
      <p className="nota">Los logros propios del equipo. Se revisan solos con todos los partidos de la temporada.</p>
      <section className="tarjeta">
        <div className="vitrina">
          {b.logrosCasa.map((l, i) => (
            <button key={l.id} className="vitrina__item" onClick={() => setEditando({ ...l, metas: [...l.metas] })}>
              <EscudoLogro estado={{ def: defs[i], nivel: defs[i].niveles ? 3 : 1, veces: 1, progreso: 1, objetivo: 1, fecha: null }} />
              <span className="vitrina__nombre">{l.nombre}</span>
            </button>
          ))}
        </div>
        <button
          className="boton boton--sec"
          onClick={() => setEditando({ id: `casa-${nuevoId().slice(0, 8)}`, nombre: '', descripcion: '', icono: 'estrella', tipo: 'total', medida: 'gol', metas: [5] })}
        >
          <Icono nombre="mas" tam={16} /> Nuevo logro de la casa
        </button>
      </section>

      <Hoja abierta={!!e} onCerrar={() => setEditando(null)} titulo={e && b.logrosCasa.some((l) => l.id === e.id) ? 'Editar logro' : 'Nuevo logro'}>
        {e && (
          <div className="formulario editor-logro">
            <div className="editor-logro__vista"><EscudoLogro estado={vista(e)} tam={84} /></div>
            <label className="campo">
              <span>Nombre</span>
              <input value={e.nombre} onChange={(x) => setEditando({ ...e, nombre: x.target.value })} />
            </label>
            <label className="campo">
              <span>Descripción</span>
              <input value={e.descripcion} onChange={(x) => setEditando({ ...e, descripcion: x.target.value })} />
            </label>
            <div className="campo">
              <span>Tipo</span>
              <div className="segmentos">
                {([['total', 'Total'], ['racha', 'Racha'], ['partido', 'En un partido']] as const).map(([t, texto]) => (
                  <button
                    key={t}
                    type="button"
                    className={e.tipo === t ? 'activa' : ''}
                    onClick={() => {
                      const valida = medidas.find((m) => m.id === e.medida)?.tipos.includes(t)
                      setEditando({ ...e, tipo: t, medida: valida ? e.medida : 'gol', metas: t === 'total' ? e.metas : [e.metas[0] ?? 3] })
                    }}
                  >
                    {texto}
                  </button>
                ))}
              </div>
              <small className="nota">
                {e.tipo === 'total' ? 'Suma en la temporada.' : e.tipo === 'racha' ? 'Partidos seguidos cumpliéndolo; se puede repetir.' : 'Cantidad en un mismo partido; se puede repetir.'}
              </small>
            </div>
            <label className="campo">
              <span>Qué se cuenta</span>
              <select className="select" value={e.medida} onChange={(x) => setEditando({ ...e, medida: x.target.value as LogroCasa['medida'] })}>
                {medidas.filter((m) => m.tipos.includes(e.tipo)).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </label>
            <div className="campo">
              <span>{e.metas.length === 3 ? 'Metas (bronce, plata, oro)' : 'Meta'}</span>
              <div className="metas">
                {e.metas.map((m, i) => (
                  <Numero key={i} valor={m} ancho={60} onChange={(v) => setEditando({ ...e, metas: e.metas.map((q, k) => (k === i ? Math.round(v) : q)) })} />
                ))}
                {e.tipo === 'total' && (
                  <button
                    type="button"
                    className="enlace"
                    onClick={() => setEditando({ ...e, metas: e.metas.length === 3 ? [e.metas[0]] : [e.metas[0], e.metas[0] * 2, e.metas[0] * 3] })}
                  >
                    {e.metas.length === 3 ? 'Una sola meta' : 'Con niveles'}
                  </button>
                )}
              </div>
            </div>
            {e.tipo === 'total' && (
              <label className="interruptor">
                <div>
                  <strong>Se reinicia cada temporada</strong>
                  <span>Si no, cuenta toda la carrera del jugador.</span>
                </div>
                <input type="checkbox" checked={e.porTemporada !== false} onChange={(x) => setEditando({ ...e, porTemporada: x.target.checked })} />
              </label>
            )}
            <div className="campo">
              <span>Icono</span>
              <div className="iconos-logro">
                {ICONOS_LOGRO.map((ic) => (
                  <button key={ic} type="button" className={e.icono === ic ? 'activa' : ''} onClick={() => setEditando({ ...e, icono: ic })} aria-label={ic}>
                    <EscudoLogro estado={vista({ ...e, icono: ic, metas: [e.metas[0]] })} tam={34} />
                  </button>
                ))}
              </div>
            </div>
            <div className="dialogo__botones">
              {b.logrosCasa.some((l) => l.id === e.id) && <button className="boton boton--sec boton--texto-peligro" onClick={borrar}>Borrar</button>}
              <button className="boton" onClick={guardar} disabled={!e.nombre.trim()}>Hecho</button>
            </div>
          </div>
        )}
      </Hoja>
    </>
  )
}

const NOTAS_SIM_MISTER = [6.5, 7, 7.5, 8, 8.5, 9]
const GOLES = ['0', '1', '2', '3', '4 o más']

/** Finales de 3 temporadas seguidas dirigiendo 32 partidos con la misma nota. */
function finalesMister(nota: number, cfg: Config): number[] {
  const r: number[] = []
  let m = cfg.mediaMin
  for (let t = 0; t < 3; t++) r.push((m = simularMister(nota, 32, cfg, m)[31]))
  return r
}

function Mister({ b, config, set, cambiado }: Editar) {
  const m = b.mister
  const setM = <K extends keyof ConfigMister>(k: K, v: ConfigMister[K]) => set('mister', { ...m, [k]: v })
  const trio = (titulo: string, k: 'resultado' | 'tacticaAlto' | 'tacticaBajo') => (
    <>
      <Constante texto={`${titulo}: victoria`} valor={m[k].victoria} onChange={(v) => setM(k, { ...m[k], victoria: v })} />
      <Constante texto={`${titulo}: empate`} valor={m[k].empate} onChange={(v) => setM(k, { ...m[k], empate: v })} />
      <Constante texto={`${titulo}: derrota`} valor={m[k].derrota} onChange={(v) => setM(k, { ...m[k], derrota: v })} />
    </>
  )
  return (
    <>
      <section className="tarjeta">
        <h2>Simulación del míster</h2>
        <p className="nota">
          Media al final de cada temporada si dirige los 32 partidos con la misma nota, empezando en {b.mediaMin}. Usa la nota ponderada y el ritmo del apartado Evolución.
          {cambiado && ' En pequeño, la diferencia con la configuración actual.'}
        </p>
        <div className="simulacion">
          <table>
            <thead>
              <tr><th>Nota</th><th>1ª temp.</th><th>2ª temp.</th><th>3ª temp.</th></tr>
            </thead>
            <tbody>
              {NOTAS_SIM_MISTER.map((nota) => {
                const nuevo = finalesMister(nota, b)
                const viejo = finalesMister(nota, config)
                return (
                  <tr key={nota}>
                    <th>{fmt1(nota)}</th>
                    {nuevo.map((x, i) => {
                      const d = x - viejo[i]
                      return <td key={i}>{fmt1(x)}{cambiado && Math.abs(d) >= 0.05 && <small className={d > 0 ? 'sube' : 'baja'}>{conSigno(d)}</small>}</td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tarjeta">
        <h2>Nota por partido</h2>
        <Constante texto="Nota base" valor={m.notaBase} onChange={(v) => setM('notaBase', v)} />
        {trio('Resultado', 'resultado')}
        <Constante texto="Por gol de diferencia" valor={m.porGol} onChange={(v) => setM('porGol', v)} />
        <Constante texto="Tope de la diferencia de goles (±)" valor={m.topeGoles} onChange={(v) => setM('topeGoles', v)} />
        <Constante texto="Nota media del grupo que ni suma ni resta" valor={m.grupoReferencia} onChange={(v) => setM('grupoReferencia', v)} />
        <Constante texto="Factor del rendimiento del grupo" valor={m.grupoFactor} onChange={(v) => setM('grupoFactor', v)} />
        <Constante texto="Portería a cero" valor={m.porteriaCero} onChange={(v) => setM('porteriaCero', v)} />
        <Constante texto="Ganar a uno de la mitad alta" valor={m.rivalAltoVictoria} onChange={(v) => setM('rivalAltoVictoria', v)} />
        <Constante texto="Perder con uno de la mitad baja" valor={m.rivalBajoDerrota} onChange={(v) => setM('rivalBajoDerrota', v)} />
      </section>

      <EditorTabla titulo="Multiplicador del míster" ayuda="Según su media: igual que el de los jugadores hasta 85 y más duro después. No hay techo." tabla={m.multiplicadorMedia} onChange={(t) => setM('multiplicadorMedia', t)} etiquetaX="Media" etiquetaY="×" />

      <section className="tarjeta">
        <h2>Subidas y bajadas</h2>
        <Constante texto="Baja con una nota por debajo de" valor={m.umbralBajada} onChange={(v) => setM('umbralBajada', v)} />
        <Constante texto="Bajada por cada punto por debajo" valor={m.bajadaPorPunto} onChange={(v) => setM('bajadaPorPunto', v)} />
        <Constante texto="Tope de bajada por partido" valor={m.topeBajada} onChange={(v) => setM('topeBajada', v)} />
        <Constante texto="Tope de subida por partido" valor={m.topeSubida} onChange={(v) => setM('topeSubida', v)} />
      </section>

      <section className="tarjeta">
        <h2>Pesos de los atributos (%)</h2>
        {ETIQUETAS_MISTER.map((et, i) => (
          <Constante key={et} texto={et} valor={m.pesos[i]} onChange={(v) => setM('pesos', m.pesos.map((x, j) => (j === i ? v : x)) as ConfigMister['pesos'])} />
        ))}
      </section>

      <section className="tarjeta">
        <h2>Atributos por partido dirigido</h2>
        <p className="nota">Antes del factor de dificultad y del tope por atributo del apartado Atributos.</p>
        {GOLES.map((g, i) => (
          <Constante key={`a${i}`} texto={`ATA: ${g} goles a favor`} valor={m.ataque[i]} onChange={(v) => setM('ataque', m.ataque.map((x, j) => (j === i ? v : x)))} />
        ))}
        {GOLES.map((g, i) => (
          <Constante key={`d${i}`} texto={`DEF: ${g} goles en contra`} valor={m.defensa[i]} onChange={(v) => setM('defensa', m.defensa.map((x, j) => (j === i ? v : x)))} />
        ))}
        {trio('TÁC rival de arriba', 'tacticaAlto')}
        {trio('TÁC rival de abajo', 'tacticaBajo')}
        <Constante texto="GES: por jugador que sube de rango" valor={m.gestion.subeRango} onChange={(v) => setM('gestion', { ...m.gestion, subeRango: v })} />
        <Constante texto="GES: por jugador cuya media sube" valor={m.gestion.sube} onChange={(v) => setM('gestion', { ...m.gestion, sube: v })} />
        <Constante texto="GES: por jugador cuya media baja" valor={m.gestion.baja} onChange={(v) => setM('gestion', { ...m.gestion, baja: v })} />
        <Constante texto="MOT: victoria tras una derrota" valor={m.motivacion.victoriaTrasDerrota} onChange={(v) => setM('motivacion', { ...m.motivacion, victoriaTrasDerrota: v })} />
        <Constante texto="MOT: victoria en racha (2 o más)" valor={m.motivacion.racha} onChange={(v) => setM('motivacion', { ...m.motivacion, racha: v })} />
        <Constante texto="MOT: derrota tras otra derrota" valor={m.motivacion.derrotaTrasDerrota} onChange={(v) => setM('motivacion', { ...m.motivacion, derrotaTrasDerrota: v })} />
        <Constante texto="EXP: por partido dirigido" valor={m.experiencia} onChange={(v) => setM('experiencia', v)} />
      </section>

      <section className="tarjeta">
        <h2>Sugerencias de MOTM y TOTY</h2>
        <Constante texto="MOTM: nota media del mes" valor={m.motmNota} onChange={(v) => setM('motmNota', v)} />
        <Constante texto="MOTM: o puntos del mes (fracción)" valor={m.motmPuntos} onChange={(v) => setM('motmPuntos', v)} />
        <Constante texto="TOTY: nota media de la temporada (o campeón)" valor={m.totyNota} onChange={(v) => setM('totyNota', v)} />
      </section>

      <section className="tarjeta">
        <h2>Rangos del míster</h2>
        <p className="nota">Media a partir de la que cambia la pizarra de su carta.</p>
        {m.rangos.map((r, i) => (
          <Constante key={r.id} texto={r.nombre} valor={r.desde} onChange={(v) => setM('rangos', m.rangos.map((x, j) => (j === i ? { ...x, desde: v } : x)))} />
        ))}
      </section>
    </>
  )
}

// ─── Pantalla ─────────────────────────────────────────────────────────

export function Avanzado({ datos }: { datos: Datos }) {
  const { config, configVersion, partidos } = datos
  const [apartado, setApartado] = useState<Apartado>('evolucion')
  const [borrador, setBorrador] = useState<Config>(config)
  const [aplicar, setAplicar] = useState(false)
  const cambiado = JSON.stringify(borrador) !== JSON.stringify(config)
  const set = <K extends keyof Config>(k: K, v: Config[K]) => setBorrador((b) => ({ ...b, [k]: v }))
  const problemas = errores(borrador)

  const guardar = async (modo: 'todo' | 'desde-ahora') => {
    const version = configVersion + 1
    await db.transaction('rw', db.configuraciones, db.partidos, async () => {
      await db.configuraciones.put({
        version, datos: borrador, creada: new Date().toISOString(),
        descripcion: modo === 'todo' ? 'Recalculada toda la temporada' : 'Aplicada solo desde ahora',
      })
      if (modo === 'todo') await db.partidos.toCollection().modify({ configVersion: version })
    })
    setAplicar(false)
    avisar(modo === 'todo' ? 'Aplicado: temporada recalculada' : 'Aplicado a partir del próximo partido')
  }

  const restaurar = () => {
    const valores = Object.fromEntries(CLAVES[apartado].map((k) => [k, CONFIG_INICIAL[k]]))
    setBorrador({ ...borrador, ...valores })
  }

  const editar: Editar = { b: borrador, config, set, cambiado }

  return (
    <>
      <Cabecera titulo="Avanzado" sub={`Configuración v${configVersion}${cambiado ? ' · cambios sin aplicar' : ''}`} atras="/ajustes" />
      <div className="chips chips--apartados">
        {APARTADOS.map((a) => (
          <button key={a.id} className={apartado === a.id ? 'activa' : ''} onClick={() => setApartado(a.id)}>{a.texto}</button>
        ))}
      </div>

      {apartado === 'evolucion' && <Evolucion {...editar} />}
      {apartado === 'nota' && <Nota {...editar} />}
      {apartado === 'roles' && <Roles {...editar} />}
      {apartado === 'rangos' && <Rangos {...editar} />}
      {apartado === 'atributos' && <Atributos {...editar} />}
      {apartado === 'premios' && <Premios {...editar} />}
      {apartado === 'casa' && <Casa {...editar} />}
      {apartado === 'mister' && <Mister {...editar} />}

      {problemas.length > 0 && (
        <section className="tarjeta tarjeta--aviso">
          {problemas.map((p) => <p key={p} className="nota baja">{p}</p>)}
        </section>
      )}

      <div className="acciones-ficha">
        <button className="boton boton--sec" onClick={restaurar}>Valores del documento</button>
        <button className="boton boton--sec" disabled={!cambiado} onClick={() => setBorrador(config)}>Descartar</button>
      </div>
      <button className="boton boton--grande" disabled={!cambiado || problemas.length > 0} onClick={() => setAplicar(true)}>Aplicar cambios…</button>

      <Hoja abierta={aplicar} onCerrar={() => setAplicar(false)} titulo="¿Cómo aplicar los cambios?">
        <button className="hoja__opcion" onClick={() => guardar('todo')}>
          <strong>Recalcular toda la temporada</strong>
          <span>Los {partidos.length} partidos ya jugados se vuelven a calcular con los nuevos valores.</span>
        </button>
        <button className="hoja__opcion" onClick={() => guardar('desde-ahora')}>
          <strong>Aplicar solo desde ahora</strong>
          <span>Lo ya jugado se queda como está; los nuevos valores cuentan desde el próximo partido. (Los pesos de los roles, los rangos y los logros de la casa se aplican siempre a todo.)</span>
        </button>
      </Hoja>
    </>
  )
}
