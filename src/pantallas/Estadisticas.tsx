import { useState } from 'react'
import { db } from '../db'
import { conSigno, fechaCorta, fmt1, ir, nombreVisible, textoJornada, type Datos } from '../datos'
import { rango } from '../motor/calculo'
import type { EstadoJugador } from '../motor/temporada'
import { MiniCarta } from '../componentes/Carta'
import { disenoDe } from '../componentes/disenos'
import { BarrasGoles, LineaCristal } from '../componentes/GraficosCristal'
import { COLORES_CRISTAL } from '../componentes/colores'
import { Cabecera, Icono, Subpestanas, Vacio } from '../componentes/ui'
import { Comparador, Galeria, Graficos, Ranking } from './Evoluciones'
import { PastillasForma } from '../componentes/Piezas'
import { mediaTras } from '../motor/equipo'

// Estadísticas (§10): Equipo · Jugadores · Ranking · Evolución · Gráficos · Comparar · Galería
// (las cuatro últimas, junto con Ranking, eran antes la pantalla «Evoluciones» de Más).

const SUBPESTANAS = [
  { id: 'equipo', texto: 'Equipo', ruta: '/estadisticas' },
  { id: 'jugadores', texto: 'Jugadores', ruta: '/estadisticas/jugadores' },
  { id: 'ranking', texto: 'Ranking', ruta: '/estadisticas/ranking' },
  { id: 'evolucion', texto: 'Evolución', ruta: '/estadisticas/evolucion' },
  { id: 'graficos', texto: 'Gráficos', ruta: '/estadisticas/graficos' },
  { id: 'comparador', texto: 'Comparar', ruta: '/estadisticas/comparador' },
  { id: 'galeria', texto: 'Galería', ruta: '/estadisticas/galeria' },
]

function etiquetasPartidos(datos: Datos): string[] {
  const { calculo, programados } = datos
  return calculo.partidos.map(({ partido: p }) => {
    const g = programados.find((x) => x.id === p.programadoId)
    return g ? textoJornada(g, programados) : fechaCorta(p.fecha)
  })
}

function Mini({ e, datos, ancho = 36 }: { e: EstadoJugador; datos: Datos; ancho?: number }) {
  return <MiniCarta jugador={e.jugador} media={e.media} diseno={disenoDe(e.jugador, e.media, datos.config, e.rangosAlcanzados)} config={datos.config} ancho={ancho} />
}

function Equipo({ datos }: { datos: Datos }) {
  const { calculo } = datos
  const ps = calculo.partidos.map((r) => r.partido)
  if (!ps.length) return <Vacio titulo="Sin partidos todavía" texto="Las estadísticas aparecen al registrar el primer partido." />
  const pj = ps.length
  const v = ps.filter((p) => p.golesFavor > p.golesContra).length
  const gf = ps.reduce((s, p) => s + p.golesFavor, 0)
  const gc = ps.reduce((s, p) => s + p.golesContra, 0)
  const ceros = ps.filter((p) => p.golesContra === 0).length
  const etiquetas = etiquetasPartidos(datos)
  const ids = ps.map((p) => p.id)
  const plantilla = Object.values(calculo.jugadores)
  const porJugador = plantilla.map((e) => mediaTras(e, ids))
  const mediaEquipo = ids.map((_, k) => (plantilla.length ? porJugador.reduce((s, m) => s + m[k], 0) / plantilla.length : null))
  const inicioEquipo = plantilla.length ? plantilla.reduce((s, e) => s + e.mediaInicial, 0) / plantilla.length : 0
  const ultimaMedia = mediaEquipo[mediaEquipo.length - 1] ?? inicioEquipo

  // Récords de la temporada.
  const goleada = calculo.partidos.reduce<{ i: number; d: number } | null>((m, { partido: p }, i) => {
    const d = p.golesFavor - p.golesContra
    return d > 0 && (!m || d > m.d) ? { i, d } : m
  }, null)
  let racha = 0, mejorRacha = 0
  for (const p of ps) {
    racha = p.golesFavor > p.golesContra ? racha + 1 : 0
    mejorRacha = Math.max(mejorRacha, racha)
  }
  const mejorNota = calculo.partidos.flatMap((r) => Object.entries(r.notas)).reduce<[string, number] | null>((m, x) => (!m || x[1] > m[1] ? x : m), null)
  const jugadorNota = mejorNota ? calculo.jugadores[mejorNota[0]]?.jugador : null

  return (
    <>
      <div className="cifras-grandes">
        <div className="cristal"><strong>{pj}</strong><span>Partidos</span></div>
        <div className="cristal"><strong className="cifra--verde">{Math.round((v / pj) * 100)}%</strong><span>Victorias</span></div>
        <div className="cristal"><strong>{gf - gc > 0 ? '+' : ''}{gf - gc}</strong><span>Diferencia de goles</span></div>
        <div className="cristal"><strong>{fmt1(gf / pj)}</strong><span>Goles a favor / partido</span></div>
        <div className="cristal"><strong className="cifra--roja">{fmt1(gc / pj)}</strong><span>Goles en contra / partido</span></div>
        <div className="cristal"><strong>{ceros}</strong><span>Porterías a cero</span></div>
      </div>

      <section className="tarjeta">
        <div className="tarjeta__cab tarjeta__cab--arriba">
          <div>
            <h3 className="titulo-graf">Goles por jornada</h3>
            <p className="nota">{gf} a favor · {gc} en contra</p>
          </div>
          <div className="leyenda-mini">
            <span><i style={{ background: '#CCA37C' }} />A favor</span>
            <span><i style={{ background: '#b0283c' }} />En contra</span>
          </div>
        </div>
        <BarrasGoles etiquetas={etiquetas} favor={ps.map((p) => p.golesFavor)} contra={ps.map((p) => p.golesContra)} />
      </section>

      <section className="tarjeta">
        <div>
          <h3 className="titulo-graf">Media del equipo</h3>
          <p className="nota">{conSigno(ultimaMedia - inicioEquipo)} desde el inicio de la temporada</p>
        </div>
        <LineaCristal etiquetas={etiquetas} series={[{ id: 'eq', nombre: 'Media del equipo', color: '#d11f45', valores: mediaEquipo }]} />
      </section>

      <section className="tarjeta">
        <div>
          <h3 className="titulo-graf">Forma</h3>
          <p className="nota">Últimos {Math.min(10, pj)} partidos</p>
        </div>
        <PastillasForma partidos={ps.slice(-10)} suave />
      </section>

      <section className="tarjeta">
        <h3 className="titulo-graf">Récords de la temporada</h3>
        <div className="records-3">
          <div>
            <strong>{goleada ? `${ps[goleada.i].golesFavor} – ${ps[goleada.i].golesContra}` : '—'}</strong>
            <span>Mayor goleada{goleada ? ` · ${etiquetas[goleada.i]}` : ''}</span>
          </div>
          <div>
            <strong>{mejorRacha}</strong>
            <span>Victorias seguidas</span>
          </div>
          <div>
            <strong>{mejorNota ? fmt1(mejorNota[1]) : '—'}</strong>
            <span>Mejor nota{jugadorNota ? ` · ${nombreVisible(jugadorNota)}` : ''}</span>
          </div>
        </div>
      </section>
    </>
  )
}

type Categoria = 'goles' | 'asist' | 'nota' | 'mvp' | 'min'
const CATEGORIAS: [Categoria, string][] = [['goles', 'Goles'], ['asist', 'Asistencias'], ['nota', 'Nota media'], ['mvp', 'MVPs'], ['min', 'Minutos']]

function Jugadores({ datos }: { datos: Datos }) {
  const [cat, setCat] = useState<Categoria>('goles')
  const lista = Object.values(datos.calculo.jugadores)
  const valor = (e: EstadoJugador): number => {
    const s = e.estadisticas
    return cat === 'goles' ? s.goles : cat === 'asist' ? s.asistencias : cat === 'nota' ? (s.notaMedia ?? 0) : cat === 'mvp' ? s.mvps : s.minutos
  }
  const tabla = lista.filter((e) => valor(e) > 0).sort((a, b) => valor(b) - valor(a)).slice(0, 5)
  const max = Math.max(1, ...tabla.map(valor))
  const texto = (v: number) => (cat === 'nota' ? fmt1(v) : cat === 'min' ? `${v}′` : String(v))
  return (
    <>
      <div className="chips chips--cristal">
        {CATEGORIAS.map(([k, t]) => (
          <button key={k} className={cat === k ? 'activa' : ''} onClick={() => setCat(k)}>{t}</button>
        ))}
      </div>
      {!tabla.length ? (
        <Vacio titulo="Sin datos todavía" texto="El ranking aparece al registrar partidos." />
      ) : (
        <section className="tarjeta ranking-cristal">
          {tabla.map((e, i) => (
            <button key={e.jugador.id} onClick={() => ir(`/jugador/${e.jugador.id}`)}>
              <span className={`ranking-cristal__pos ${i === 0 ? 'primero' : ''}`}>{i + 1}</span>
              <Mini e={e} datos={datos} />
              <span className="ranking-cristal__nombre">
                <span>{nombreVisible(e.jugador)}</span>
                <span className="barra-fina"><span className={i === 0 ? 'primero' : ''} style={{ width: `${Math.round((valor(e) / max) * 100)}%` }} /></span>
              </span>
              <strong>{texto(valor(e))}</strong>
            </button>
          ))}
        </section>
      )}
      <button className="boton boton--grande" onClick={() => ir('/estadisticas/comparador')}>Comparar dos jugadores</button>
      <div className="acciones-ficha">
        <button className="boton boton--sec" onClick={() => ir('/estadisticas/ranking')}>Clasificación interna</button>
        <button className="boton boton--sec" onClick={() => ir('/premios')}><Icono nombre="estrella" tam={16} /> Premios</button>
      </div>
    </>
  )
}

function Evolucion({ datos }: { datos: Datos }) {
  const { calculo, config } = datos
  const lista = Object.values(calculo.jugadores)
  const conPartidos = lista.filter((e) => e.historial.length)
  if (!conPartidos.length) return <Vacio titulo="Sin partidos todavía" texto="La evolución aparece al registrar partidos." />
  const suben = [...conPartidos].sort((a, b) => b.media - b.mediaInicial - (a.media - a.mediaInicial))
  const top = suben.slice(0, 5)
  const maxSube = Math.max(0.1, ...top.map((e) => e.media - e.mediaInicial))
  const etiquetas = etiquetasPartidos(datos)
  const ids = calculo.partidos.map((r) => r.partido.id)
  const series = suben.slice(0, 3).map((e, i) => ({ id: e.jugador.id, nombre: nombreVisible(e.jugador), color: COLORES_CRISTAL[i], valores: mediaTras(e, ids) }))
  const porRango = [...config.rangos].sort((a, b) => b.desde - a.desde).map((r) => ({ r, n: lista.filter((e) => rango(config, e.media).id === r.id).length })).filter((x) => x.n > 0)
  const ascensos = lista
    .flatMap((e) => e.historial.filter((h) => rango(config, h.mediaDespues).desde > rango(config, h.mediaAntes).desde).map((h) => ({ e, h })))
    .sort((a, b) => b.h.fecha.localeCompare(a.h.fecha))
  return (
    <>
      <section className="tarjeta">
        <div>
          <h3 className="titulo-graf">Quién más sube</h3>
          <p className="nota">Media ganada esta temporada</p>
        </div>
        <div className="ranking-cristal">
          {top.map((e) => {
            const d = e.media - e.mediaInicial
            return (
              <button key={e.jugador.id} onClick={() => ir(`/jugador/${e.jugador.id}`)}>
                <Mini e={e} datos={datos} />
                <span className="ranking-cristal__nombre">
                  <span>{nombreVisible(e.jugador)} <small>{fmt1(e.mediaInicial)} → {fmt1(e.media)}</small></span>
                  <span className="barra-fina"><span className="primero" style={{ width: `${Math.max(0, Math.round((d / maxSube) * 100))}%` }} /></span>
                </span>
                <strong className={d >= 0 ? 'sube' : 'baja'}>{conSigno(d)}</strong>
              </button>
            )
          })}
        </div>
      </section>

      <section className="tarjeta">
        <div>
          <h3 className="titulo-graf">Los 3 que más suben</h3>
          <p className="nota">Media tras cada jornada</p>
        </div>
        <LineaCristal etiquetas={etiquetas} series={series} area={false} />
      </section>

      <section className="tarjeta">
        <h3 className="titulo-graf">Plantilla por rango</h3>
        <ul className="lista-simple">
          {porRango.map(({ r, n }) => (
            <li key={r.id}><span>{r.nombre}</span><strong>{n} {n === 1 ? 'jugador' : 'jugadores'}</strong></li>
          ))}
        </ul>
      </section>

      <section className="tarjeta">
        <h3 className="titulo-graf">Ascensos de rango</h3>
        {!ascensos.length ? (
          <p className="nota">Nadie ha subido de rango todavía esta temporada.</p>
        ) : (
          <ul className="lista-simple">
            {ascensos.map(({ e, h }) => (
              <li key={e.jugador.id + h.partidoId}>
                <span>{nombreVisible(e.jugador)} <small className="nota">· {fechaCorta(h.fecha)}</small></span>
                <strong>{rango(config, h.mediaAntes).nombre} → {rango(config, h.mediaDespues).nombre}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

export function Estadisticas({ datos, vista, id }: { datos: Datos; vista?: string; id?: string }) {
  const activa = SUBPESTANAS.some((s) => s.id === vista) ? vista! : 'equipo'
  return (
    <>
      <Cabecera
        titulo="Estadísticas"
        acciones={
          <select className="selector-temporada" value={datos.temporada.id} aria-label="Temporada" onChange={(x) => db.equipo.update('equipo', { temporadaActivaId: x.target.value })} disabled={datos.temporadas.length < 2}>
            {[...datos.temporadas].reverse().map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        }
      />
      <Subpestanas opciones={SUBPESTANAS} activa={activa} clase="subpestanas--dos-filas" />
      {activa === 'equipo' && <Equipo datos={datos} />}
      {activa === 'jugadores' && <Jugadores datos={datos} />}
      {activa === 'ranking' && <Ranking datos={datos} />}
      {activa === 'evolucion' && <Evolucion datos={datos} />}
      {activa === 'graficos' && <Graficos datos={datos} />}
      {activa === 'comparador' && <Comparador key={id} datos={datos} inicial={id} />}
      {activa === 'galeria' && <Galeria datos={datos} />}
    </>
  )
}
