import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { fechaCorta, fmt1, fmt2, ir, nombreVisible, type Datos } from '../datos'
import type { Temporada as TemporadaCalculada } from '../motor/temporada'
import { Cabecera, Icono, Vacio } from '../componentes/ui'

// «Más» (§10): cabecera del club y accesos a lo que no está en la barra.

const BASE = import.meta.env.BASE_URL

interface Entrada {
  icono: string
  titulo: string
  texto: string
  ruta: string
}

function useTitulos(datos: Datos) {
  return datos.logros.desbloqueos.filter((x) => x.logroId === 'eq-campeones').length
}

function resumenTemporada(c: TemporadaCalculada) {
  const ps = c.partidos.map((r) => r.partido)
  const v = ps.filter((p) => p.golesFavor > p.golesContra).length
  const e = ps.filter((p) => p.golesFavor === p.golesContra).length
  return {
    pj: ps.length, v, e, d: ps.length - v - e,
    gf: ps.reduce((s, p) => s + p.golesFavor, 0), gc: ps.reduce((s, p) => s + p.golesContra, 0),
  }
}

function Menu({ datos }: { datos: Datos }) {
  const { equipo, temporadas, temporada, calculos } = datos
  const ultimaCopia = useLiveQuery(() => db.copias.orderBy('id').last())
  const partidos = [...calculos.values()].reduce((s, c) => s + c.partidos.length, 0)
  const titulos = useTitulos(datos)
  const copia = ultimaCopia
    ? `Última copia automática: ${new Date(ultimaCopia.fecha).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
    : 'Exportar, importar y copias automáticas'
  const entradas: Entrada[] = [
    { icono: 'barras', titulo: 'Estadísticas del club', texto: 'Goles, rachas y medias de todas las temporadas', ruta: '/mas/club' },
    { icono: 'trofeo', titulo: 'Récords', texto: 'Mayor goleada, máximo goleador, mejor nota…', ruta: '/mas/records' },
    { icono: 'calendario', titulo: 'Historia de temporadas', texto: 'Resumen de cada temporada', ruta: '/mas/historia' },
    { icono: 'persona', titulo: 'Míster', texto: 'Carta, logros y balance del entrenador', ruta: '/mister' },
    { icono: 'descarga', titulo: 'Copias de seguridad', texto: copia, ruta: '/ajustes/copias' },
    { icono: 'ajustes', titulo: 'Ajustes', texto: 'Equipo, temporadas, compartir y Avanzado', ruta: '/ajustes' },
  ]
  return (
    <>
      <header className="mas-cab">
        <img className="mas-cab__marca" src={`${BASE}escudo.png`} alt="" aria-hidden="true" />
        <img className="mas-cab__escudo" src={`${BASE}escudo.png`} alt={`Escudo del ${equipo.nombre}`} />
        <div>
          <h1>{equipo.nombre}</h1>
          <p>Temporada {temporada.nombre} · desde {equipo.fundado}</p>
        </div>
      </header>
      <div className="pastillas pastillas--3">
        <div className="cristal pastilla"><strong>{temporadas.length}</strong><span>{temporadas.length === 1 ? 'Temporada' : 'Temporadas'}</span></div>
        <div className="cristal pastilla"><strong>{partidos}</strong><span>Partidos</span></div>
        <div className="cristal pastilla"><strong>{titulos}</strong><span>{titulos === 1 ? 'Título' : 'Títulos'}</span></div>
      </div>
      <section className="tarjeta lista-mas">
        {entradas.map((x) => (
          <button key={x.ruta} onClick={() => ir(x.ruta)}>
            <span className="lista-mas__icono"><Icono nombre={x.icono} /></span>
            <div>
              <strong>{x.titulo}</strong>
              <span>{x.texto}</span>
            </div>
            <Icono nombre="flecha" tam={18} />
          </button>
        ))}
      </section>
    </>
  )
}

/** Estadísticas del club: todas las temporadas juntas y cada una por separado. */
function Club({ datos }: { datos: Datos }) {
  const { temporadas, calculos } = datos
  const filas = temporadas.filter((t) => calculos.has(t.id)).map((t) => ({ t, r: resumenTemporada(calculos.get(t.id)!) }))
  const total = filas.reduce((a, { r }) => ({ pj: a.pj + r.pj, v: a.v + r.v, e: a.e + r.e, d: a.d + r.d, gf: a.gf + r.gf, gc: a.gc + r.gc }), { pj: 0, v: 0, e: 0, d: 0, gf: 0, gc: 0 })
  const todos = filas.flatMap(({ t }) => calculos.get(t.id)!.partidos.map((r) => r.partido))
  let racha = 0, mejorRacha = 0, invicto = 0, mejorInvicto = 0
  for (const p of todos) {
    racha = p.golesFavor > p.golesContra ? racha + 1 : 0
    invicto = p.golesFavor >= p.golesContra ? invicto + 1 : 0
    mejorRacha = Math.max(mejorRacha, racha)
    mejorInvicto = Math.max(mejorInvicto, invicto)
  }
  return (
    <>
      <Cabecera titulo="Estadísticas del club" sub="Todas las temporadas" atras="/mas" />
      {!total.pj ? (
        <Vacio titulo="Sin partidos todavía" texto="Aquí se irán sumando todas las temporadas." />
      ) : (
        <>
          <div className="cifras-grandes">
            <div className="cristal"><strong>{total.pj}</strong><span>Partidos</span></div>
            <div className="cristal"><strong className="sube">{Math.round((total.v / total.pj) * 100)}%</strong><span>Victorias</span></div>
            <div className="cristal"><strong>{total.gf - total.gc > 0 ? '+' : ''}{total.gf - total.gc}</strong><span>Diferencia de goles</span></div>
            <div className="cristal"><strong>{fmt1(total.gf / total.pj)}</strong><span>Goles a favor / partido</span></div>
            <div className="cristal"><strong>{mejorRacha}</strong><span>Mejor racha de victorias</span></div>
            <div className="cristal"><strong>{mejorInvicto}</strong><span>Partidos seguidos sin perder</span></div>
          </div>
          <section className="tarjeta">
            <h2>Por temporada</h2>
            <div className="clasificacion">
              <table>
                <thead>
                  <tr><th className="izq">Temporada</th><th>PJ</th><th>V</th><th>E</th><th>D</th><th>GF</th><th>GC</th></tr>
                </thead>
                <tbody>
                  {filas.map(({ t, r }) => (
                    <tr key={t.id}>
                      <td className="izq nombre">{t.nombre}</td><td>{r.pj}</td><td>{r.v}</td><td>{r.e}</td><td>{r.d}</td><td>{r.gf}</td><td>{r.gc}</td>
                    </tr>
                  ))}
                  {filas.length > 1 && (
                    <tr className="nosotros">
                      <td className="izq nombre">Total</td><td>{total.pj}</td><td>{total.v}</td><td>{total.e}</td><td>{total.d}</td><td>{total.gf}</td><td>{total.gc}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  )
}

/** Récords de toda la historia del club. */
function Records({ datos }: { datos: Datos }) {
  const { temporadas, calculos, todosJugadores } = datos
  const cs = temporadas.filter((t) => calculos.has(t.id)).map((t) => ({ t, c: calculos.get(t.id)! }))
  const partidos = cs.flatMap(({ t, c }) => c.partidos.map((r) => ({ t, r })))
  const nombre = (id: string) => {
    const j = todosJugadores.find((x) => x.id === id)
    return j ? nombreVisible(j) : '—'
  }
  const goleada = partidos.reduce<(typeof partidos)[number] | null>((m, x) => {
    const d = x.r.partido.golesFavor - x.r.partido.golesContra
    return d > 0 && (!m || d > m.r.partido.golesFavor - m.r.partido.golesContra) ? x : m
  }, null)
  const mejorNota = partidos.flatMap((x) => Object.entries(x.r.notas).map(([id, n]) => ({ id, n, x }))).reduce<{ id: string; n: number; x: (typeof partidos)[number] } | null>((m, y) => (!m || y.n > m.n ? y : m), null)
  const carrera = new Map<string, { goles: number; asist: number; mvps: number; partidos: number; mediaMax: number }>()
  for (const { c } of cs) {
    for (const e of Object.values(c.jugadores)) {
      const a = carrera.get(e.jugador.id) ?? { goles: 0, asist: 0, mvps: 0, partidos: 0, mediaMax: 0 }
      a.goles += e.estadisticas.goles
      a.asist += e.estadisticas.asistencias
      a.mvps += e.estadisticas.mvps
      a.partidos += e.estadisticas.partidos
      a.mediaMax = Math.max(a.mediaMax, e.mediaInicial, ...e.historial.map((h) => h.mediaDespues))
      carrera.set(e.jugador.id, a)
    }
  }
  const max = (k: 'goles' | 'asist' | 'mvps' | 'partidos' | 'mediaMax') =>
    [...carrera.entries()].reduce<[string, number] | null>((m, [id, a]) => (a[k] > 0 && (!m || a[k] > m[1]) ? [id, a[k]] : m), null)
  let racha = 0, mejor = 0
  for (const { r } of partidos) {
    racha = r.partido.golesFavor > r.partido.golesContra ? racha + 1 : 0
    mejor = Math.max(mejor, racha)
  }
  const filas: [string, string, string][] = []
  if (goleada) filas.push(['Mayor goleada', `${goleada.r.partido.golesFavor}-${goleada.r.partido.golesContra}`, `${goleada.r.partido.local ? 'vs' : 'en'} ${goleada.r.partido.rival} · ${fechaCorta(goleada.r.partido.fecha)}`])
  const g = max('goles')
  if (g) filas.push(['Máximo goleador', `${g[1]}`, nombre(g[0])])
  const a = max('asist')
  if (a) filas.push(['Máximo asistente', `${a[1]}`, nombre(a[0])])
  const m = max('mvps')
  if (m) filas.push(['Más MVPs', `${m[1]}`, nombre(m[0])])
  if (mejorNota) filas.push(['Mejor nota en un partido', fmt1(mejorNota.n), `${nombre(mejorNota.id)} · ${mejorNota.x.r.partido.rival} · ${fechaCorta(mejorNota.x.r.partido.fecha)}`])
  const med = max('mediaMax')
  if (med) filas.push(['Media más alta', fmt1(med[1]), nombre(med[0])])
  const pj = max('partidos')
  if (pj) filas.push(['Más partidos', `${pj[1]}`, nombre(pj[0])])
  if (mejor) filas.push(['Victorias seguidas', `${mejor}`, 'Mejor racha del club'])
  return (
    <>
      <Cabecera titulo="Récords" sub="De toda la historia del club" atras="/mas" />
      {!filas.length ? (
        <Vacio titulo="Sin récords todavía" texto="Aparecen al registrar partidos." />
      ) : (
        <section className="tarjeta">
          <ul className="records">
            {filas.map(([k, v, d]) => (
              <li key={k}>
                <strong>{v}</strong>
                <div>
                  <span>{k}</span>
                  <small>{d}</small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

/** Historia: una tarjeta por temporada, de la más reciente a la más antigua. */
function Historia({ datos }: { datos: Datos }) {
  const { temporadas, calculos, equipo, todosJugadores } = datos
  const nombre = (id: string) => {
    const j = todosJugadores.find((x) => x.id === id)
    return j ? nombreVisible(j) : '—'
  }
  const lista = [...temporadas].reverse().filter((t) => calculos.has(t.id))
  return (
    <>
      <Cabecera titulo="Historia de temporadas" atras="/mas" />
      {lista.map((t) => {
        const c = calculos.get(t.id)!
        const r = resumenTemporada(c)
        const js = Object.values(c.jugadores)
        const goleador = js.reduce<(typeof js)[number] | null>((m, e) => (e.estadisticas.goles > 0 && (!m || e.estadisticas.goles > m.estadisticas.goles) ? e : m), null)
        const mejor = js.reduce<(typeof js)[number] | null>((m, e) => (e.estadisticas.partidos > 0 && (!m || e.media > m.media) ? e : m), null)
        const campeon = datos.logros.desbloqueos.filter((x) => x.logroId === 'eq-campeones' && c.partidos.some((p) => p.partido.id === x.partidoId)).length
        return (
          <section key={t.id} className="tarjeta">
            <div className="tarjeta__cab">
              <h2>{t.nombre}</h2>
              {campeon > 0 && <span className="etiqueta etiqueta--proximo">🏆 Campeones{campeon > 1 ? ` ×${campeon}` : ''}</span>}
            </div>
            {r.pj === 0 ? (
              <p className="nota">Sin partidos.</p>
            ) : (
              <>
                <p className="nota">
                  {r.pj} partidos · {r.v}V {r.e}E {r.d}D · {r.gf} goles a favor y {r.gc} en contra
                </p>
                <ul className="lista-simple">
                  {goleador && <li><span>Máximo goleador</span><strong>{nombre(goleador.jugador.id)} · {goleador.estadisticas.goles}</strong></li>}
                  {mejor && <li><span>Mejor media</span><strong>{nombre(mejor.jugador.id)} · {fmt2(mejor.media)}</strong></li>}
                </ul>
              </>
            )}
          </section>
        )
      })}
      <p className="nota centro">Las temporadas nuevas se crean en Ajustes → Temporadas ({equipo.nombre}).</p>
    </>
  )
}

export function Mas({ datos, vista }: { datos: Datos; vista?: string }) {
  if (vista === 'club') return <Club datos={datos} />
  if (vista === 'records') return <Records datos={datos} />
  if (vista === 'historia') return <Historia datos={datos} />
  return <Menu datos={datos} />
}
