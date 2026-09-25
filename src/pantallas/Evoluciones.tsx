import { useState } from 'react'
import { conSigno, fechaCorta, fmt1, fmt2, ir, nombreVisible, type Datos } from '../datos'
import { mediaVisible, rango } from '../motor/calculo'
import { POSICIONES, etiquetas, rolPorId, type Posicion } from '../motor/config'
import type { EstadoJugador } from '../motor/temporada'
import { Carta, MiniCarta } from '../componentes/Carta'
import { DISENOS, disenoDe } from '../componentes/disenos'
import { GraficoBarrasH, GraficoGoles, GraficoLineas, type Serie } from '../componentes/GraficosEquipo'
import { COLORES_SERIE } from '../componentes/colores'
import { Cabecera, Icono, Subpestanas, Vacio } from '../componentes/ui'
import { Tendencia } from './Jugadores'

const SUBPESTANAS = [
  { id: 'clasificacion', texto: 'Ranking', ruta: '/evoluciones' },
  { id: 'comparador', texto: 'Comparar', ruta: '/evoluciones/comparador' },
  { id: 'galeria', texto: 'Galería', ruta: '/evoluciones/galeria' },
  { id: 'graficos', texto: 'Gráficos', ruta: '/evoluciones/graficos' },
]

// ─── Ranking ──────────────────────────────────────────────────────────

function Ranking({ datos }: { datos: Datos }) {
  const { calculo, config } = datos
  const lista = Object.values(calculo.jugadores).sort((a, b) => b.media - a.media)
  if (!lista.length) return <Vacio titulo="Sin jugadores" />
  return (
    <ol className="ranking">
      {lista.map((e, i) => (
        <li key={e.jugador.id}>
          <button onClick={() => ir(`/jugador/${e.jugador.id}`)}>
            <span className="ranking__pos">{i + 1}</span>
            <MiniCarta jugador={e.jugador} media={e.media} diseno={disenoDe(e.jugador, e.media, config, e.rangosAlcanzados)} config={config} ancho={40} />
            <div className="ranking__texto">
              <strong>{nombreVisible(e.jugador)}</strong>
              <span>{rolPorId(config, e.jugador.rol).sigla} · {conSigno(e.media - e.mediaInicial)} esta temporada</span>
            </div>
            <span className="ranking__media">
              {mediaVisible(e.media)} <Tendencia valor={e.tendencia} />
              <small>{fmt1(e.media)}</small>
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}

// ─── Comparador ───────────────────────────────────────────────────────

function Comparador({ datos, inicial }: { datos: Datos; inicial?: string }) {
  const { calculo, config, jugadores } = datos
  const orden = [...jugadores].sort((a, b) => calculo.jugadores[b.id].media - calculo.jugadores[a.id].media)
  const [a, setA] = useState(inicial && calculo.jugadores[inicial] ? inicial : orden[0]?.id)
  const [b, setB] = useState(orden.find((j) => j.id !== a)?.id)
  if (jugadores.length < 2) return <Vacio titulo="Hacen falta dos jugadores" texto="Añade al menos dos jugadores para compararlos." />
  const ea = calculo.jugadores[a!]
  const eb = calculo.jugadores[b!]
  if (!ea || !eb) return null
  const [ca, cb] = COLORES_SERIE

  const la = etiquetas(ea.jugador.posicion)
  const lb = etiquetas(eb.jugador.posicion)
  const sa = ea.estadisticas
  const sb = eb.estadisticas
  const filas: { nombre: string; va: number; vb: number; dec?: number; menorMejor?: boolean }[] = [
    { nombre: 'Media', va: ea.media, vb: eb.media, dec: 1 },
    ...ea.atributos.map((v, i) => ({ nombre: la[i] === lb[i] ? la[i] : `${la[i]} / ${lb[i]}`, va: v, vb: eb.atributos[i], dec: 0 })),
    { nombre: 'Partidos', va: sa.partidos, vb: sb.partidos },
    { nombre: 'Minutos', va: sa.minutos, vb: sb.minutos },
    { nombre: 'Goles', va: sa.goles, vb: sb.goles },
    { nombre: 'Asistencias', va: sa.asistencias, vb: sb.asistencias },
    { nombre: 'Nota media', va: sa.notaMedia ?? 0, vb: sb.notaMedia ?? 0, dec: 2 },
    { nombre: 'MVPs', va: sa.mvps, vb: sb.mvps },
    { nombre: 'Evolución', va: ea.media - ea.mediaInicial, vb: eb.media - eb.mediaInicial, dec: 1 },
    { nombre: 'Tarjetas', va: sa.amarillas + sa.rojas * 2, vb: sb.amarillas + sb.rojas * 2, menorMejor: true },
  ]
  const f = (v: number, dec = 0) => (dec ? v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : String(Math.round(v)))
  const selector = (valor: string, cambiar: (v: string) => void, otro: string, color: string) => (
    <select className="select select--comparar" style={{ borderColor: color }} value={valor} onChange={(e) => cambiar(e.target.value)}>
      {orden.filter((j) => j.id !== otro).map((j) => <option key={j.id} value={j.id}>{nombreVisible(j)}</option>)}
    </select>
  )
  const carta = (e: EstadoJugador) => (
    <Carta jugador={e.jugador} media={e.media} atributos={e.atributos} tendencia={e.tendencia} diseno={disenoDe(e.jugador, e.media, config, e.rangosAlcanzados)} config={config} />
  )
  const ganadasA = filas.filter((x) => (x.menorMejor ? x.va < x.vb : x.va > x.vb)).length
  const ganadasB = filas.filter((x) => (x.menorMejor ? x.vb < x.va : x.vb > x.va)).length

  return (
    <>
      <div className="comparador__elegir">
        {selector(a!, setA, b!, ca)}
        {selector(b!, setB, a!, cb)}
      </div>
      <div className="comparador__cartas">
        {carta(ea)}
        {carta(eb)}
      </div>
      <div className="comparador__marcador">
        <strong style={{ color: 'var(--texto)' }}>{ganadasA}</strong>
        <span>categorías ganadas</span>
        <strong style={{ color: 'var(--texto)' }}>{ganadasB}</strong>
      </div>
      <section className="tarjeta comparador">
        {filas.map((x) => {
          const gana = x.menorMejor ? (x.va < x.vb ? 'a' : x.vb < x.va ? 'b' : null) : x.va > x.vb ? 'a' : x.vb > x.va ? 'b' : null
          const ta = Math.max(0, x.menorMejor ? x.vb : x.va)
          const tb = Math.max(0, x.menorMejor ? x.va : x.vb)
          const total = ta + tb || 1
          return (
            <div key={x.nombre} className="comparador__fila">
              <div className="comparador__valores">
                <span className={gana === 'a' ? 'gana' : ''}>{f(x.va, x.dec)}</span>
                <em>{x.nombre}</em>
                <span className={gana === 'b' ? 'gana' : ''}>{f(x.vb, x.dec)}</span>
              </div>
              <div className="comparador__barra" aria-hidden="true" style={ta + tb === 0 ? { visibility: 'hidden' } : undefined}>
                <span style={{ width: `${(ta / total) * 100}%`, background: ca, opacity: gana === 'b' ? 0.45 : 1 }} />
                <span style={{ width: `${(tb / total) * 100}%`, background: cb, opacity: gana === 'a' ? 0.45 : 1 }} />
              </div>
            </div>
          )
        })}
      </section>
    </>
  )
}

// ─── Galería ──────────────────────────────────────────────────────────

function Galeria({ datos }: { datos: Datos }) {
  const { calculo, config } = datos
  const [texto, setTexto] = useState('')
  const [pos, setPos] = useState<Posicion | 'todas'>('todas')
  const [rangoSel, setRangoSel] = useState('todos')
  const norm = (s: string) => s.toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '')
  const lista = Object.values(calculo.jugadores)
    .filter((e) => pos === 'todas' || e.jugador.posicion === pos)
    .filter((e) => {
      const d = disenoDe(e.jugador, e.media, config, e.rangosAlcanzados)
      if (rangoSel === 'todos') return true
      if (rangoSel === 'especiales') return ['IF', 'POTM', 'TOTY'].includes(d)
      return rango(config, e.media).id === rangoSel
    })
    .filter((e) => !texto.trim() || norm(`${e.jugador.nombre} ${e.jugador.apodo} ${e.jugador.dorsal}`).includes(norm(texto.trim())))
    .sort((a, b) => b.media - a.media)

  return (
    <>
      <div className="filtros">
        <input className="input" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nombre o dorsal…" />
        <div className="chips">
          <button className={pos === 'todas' ? 'activa' : ''} onClick={() => setPos('todas')}>Todas</button>
          {POSICIONES.map((p) => (
            <button key={p.id} className={pos === p.id ? 'activa' : ''} onClick={() => setPos(p.id)}>{p.corto}</button>
          ))}
        </div>
        <select className="select" value={rangoSel} onChange={(e) => setRangoSel(e.target.value)}>
          <option value="todos">Todos los rangos</option>
          {config.rangos.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          <option value="especiales">Diseños especiales (IF, POTM, TOTY)</option>
        </select>
      </div>
      {!lista.length ? (
        <Vacio titulo="Ninguna carta" texto="Prueba con otros filtros." />
      ) : (
        <div className="galeria">
          {lista.map((e) => {
            const d = disenoDe(e.jugador, e.media, config, e.rangosAlcanzados)
            return (
              <button key={e.jugador.id} onClick={() => ir(`/jugador/${e.jugador.id}`)} aria-label={`${nombreVisible(e.jugador)}, ${DISENOS[d]?.nombre}`}>
                <Carta jugador={e.jugador} media={e.media} atributos={e.atributos} tendencia={e.tendencia} diseno={d} config={config} />
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

// ─── Gráficos ─────────────────────────────────────────────────────────

/** Media de un jugador tras cada partido de la temporada (la inicial hasta que juega). */
function mediaTras(e: EstadoJugador, ids: string[]): number[] {
  const porPartido = new Map(e.historial.map((h) => [h.partidoId, h.mediaDespues]))
  let m = e.mediaInicial
  return ids.map((id) => (m = porPartido.get(id) ?? m))
}

function Graficos({ datos }: { datos: Datos }) {
  const { calculo, programados } = datos
  const partidos = calculo.partidos.map((r) => r.partido)
  const jugadores = Object.values(calculo.jugadores).sort((a, b) => b.media - a.media)
  // Cada jugador elegido conserva su color aunque se quiten otros.
  const [elegidos, setElegidos] = useState<{ id: string; color: string }[]>(() =>
    jugadores.slice(0, 3).map((e, i) => ({ id: e.jugador.id, color: COLORES_SERIE[i] })),
  )
  if (!partidos.length) return <Vacio titulo="Sin partidos todavía" texto="Los gráficos aparecen cuando registres el primer partido." />

  const ids = partidos.map((p) => p.id)
  const etiquetas = partidos.map((p) => {
    const j = programados.find((g) => g.id === p.programadoId)?.jornada
    return j ? `J${j}` : fechaCorta(p.fecha)
  })
  const porJugador = new Map(jugadores.map((e) => [e.jugador.id, mediaTras(e, ids)]))
  const mediaEquipo = ids.map((_, k) => {
    const vals = jugadores.map((e) => porJugador.get(e.jugador.id)![k]).filter((v): v is number => v !== null)
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
  })
  const series: Serie[] = elegidos
    .filter((x) => calculo.jugadores[x.id])
    .map(({ id, color }) => ({ id, nombre: nombreVisible(calculo.jugadores[id].jugador), color, valores: porJugador.get(id) ?? [] }))
  const alternar = (id: string) =>
    setElegidos((s) => {
      if (s.some((x) => x.id === id)) return s.filter((x) => x.id !== id)
      const libre = COLORES_SERIE.find((c) => !s.some((x) => x.color === c))
      return libre ? [...s, { id, color: libre }] : s
    })
  const notas = jugadores
    .filter((e) => e.estadisticas.notaMedia !== null)
    .map((e) => ({ id: e.jugador.id, nombre: nombreVisible(e.jugador), valor: e.estadisticas.notaMedia!, detalle: `${e.estadisticas.partidos} PJ` }))
    .sort((a, b) => b.valor - a.valor)

  return (
    <>
      <section className="tarjeta">
        <h2>Media del equipo</h2>
        <p className="nota">Media de toda la plantilla después de cada partido. Toca la gráfica para ver los valores.</p>
        <GraficoLineas etiquetas={etiquetas} series={[{ id: 'eq', nombre: 'Media del equipo', color: 'var(--dorado)', valores: mediaEquipo }]} />
      </section>

      <section className="tarjeta">
        <h2>Evolución por jugador</h2>
        <p className="nota">Elige hasta 4 jugadores.</p>
        <div className="chips">
          {jugadores.map((e) => {
            const sel = elegidos.find((x) => x.id === e.jugador.id)
            return (
              <button
                key={e.jugador.id}
                className={sel ? 'activa chip-serie' : ''}
                style={sel ? { borderColor: sel.color } : undefined}
                disabled={!sel && elegidos.length >= 4}
                onClick={() => alternar(e.jugador.id)}
              >
                {sel && <i style={{ background: sel.color }} />}
                {nombreVisible(e.jugador)}
              </button>
            )
          })}
        </div>
        {series.length ? <GraficoLineas etiquetas={etiquetas} series={series} /> : <p className="nota">Elige algún jugador.</p>}
      </section>

      <section className="tarjeta">
        <h2>Goles por partido</h2>
        <GraficoGoles etiquetas={etiquetas} favor={partidos.map((p) => p.golesFavor)} contra={partidos.map((p) => p.golesContra)} />
      </section>

      <section className="tarjeta">
        <h2>Nota media por jugador</h2>
        <GraficoBarrasH filas={notas} minimo={Math.max(0, Math.floor(Math.min(...notas.map((n) => n.valor)) - 1))} />
      </section>

      <p className="nota centro">{fmt2(mediaEquipo[mediaEquipo.length - 1] ?? 0)} de media del equipo tras el último partido.</p>
    </>
  )
}

export function Evoluciones({ datos, vista, id }: { datos: Datos; vista?: string; id?: string }) {
  const activa = SUBPESTANAS.some((s) => s.id === vista) ? vista! : 'clasificacion'
  const subtitulo = { clasificacion: 'Clasificación interna por media', comparador: 'Cara a cara', galeria: 'Cartas activas', graficos: 'La temporada en gráficos' }[activa]
  return (
    <>
      <Cabecera
        titulo="Evoluciones"
        sub={subtitulo}
        acciones={
          <button className="boton boton--peq boton--sec" onClick={() => ir('/premios')}>
            <Icono nombre="estrella" tam={16} /> Premios
          </button>
        }
      />
      <Subpestanas opciones={SUBPESTANAS} activa={activa} />
      {activa === 'clasificacion' && <Ranking datos={datos} />}
      {activa === 'comparador' && <Comparador key={id} datos={datos} inicial={id} />}
      {activa === 'galeria' && <Galeria datos={datos} />}
      {activa === 'graficos' && <Graficos datos={datos} />}
    </>
  )
}
