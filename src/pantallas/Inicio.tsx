import { useState } from 'react'
import { conSigno, fmt1, ir, nombreMister, nombreRival, nombreVisible, proximoPartido, textoJornada, type Datos } from '../datos'
import type { EstadoJugador } from '../motor/temporada'
import { MiniCarta } from '../componentes/Carta'
import { disenoDe } from '../componentes/disenos'
import { Icono } from '../componentes/ui'
import { SOLO_LECTURA } from '../db'
import { Campana } from './Notificaciones'
import { EscudoLogro, Vitrina } from '../componentes/Logros'
import { NOMBRE_NIVEL } from '../motor/logros'
import { NOSOTROS, clasificacion } from '../motor/liga'
import { resultado } from '../motor/equipo'
import { nombreMes, sugerenciasIF, sugerenciasMOTM, sugerenciasPOTM, yaTiene, yaTieneMister } from '../motor/premios'
import { EscudoRival, PastillasForma } from '../componentes/Piezas'

// Inicio (§10): estadio, próximo partido, liga, forma, último partido, destacados y vitrina.

const BASE = import.meta.env.BASE_URL
const TEXTO_RES = { V: 'Victoria', E: 'Empate', D: 'Derrota' }

interface Destacado {
  titulo: string
  e: EstadoJugador | null
  valor: string
}

function mejor(lista: EstadoJugador[], puntuar: (e: EstadoJugador) => number, filtro: (e: EstadoJugador) => boolean = () => true): EstadoJugador | null {
  const candidatos = lista.filter(filtro)
  if (!candidatos.length) return null
  return candidatos.reduce((a, b) => (puntuar(b) > puntuar(a) ? b : a))
}

function diasHasta(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number)
  const hoy = new Date()
  const cero = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return Math.round((new Date(a, m - 1, d).getTime() - cero.getTime()) / 86400000)
}

function fechaHora(fecha: string | null, hora: string | null): string {
  if (!fecha) return 'Sin fecha'
  const [a, m, d] = fecha.split('-').map(Number)
  const t = new Date(a, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')
  return `${t.charAt(0).toUpperCase()}${t.slice(1)}${hora ? ` · ${hora}` : ''}`
}

export function Inicio({ datos }: { datos: Datos }) {
  const { equipo, temporada, calculo, config, jugadores, programados, partidos, rivales, logros, liga, mister, misterFicha } = datos
  const [vitrina, setVitrina] = useState(false)
  const proximo = proximoPartido(programados, partidos)
  const lista = Object.values(calculo.jugadores)
  const res = calculo.partidos.map((r) => r.partido)
  const pj = res.length
  const v = res.filter((p) => p.golesFavor > p.golesContra).length
  const e = res.filter((p) => p.golesFavor === p.golesContra).length
  const gf = res.reduce((s, p) => s + p.golesFavor, 0)
  const gc = res.reduce((s, p) => s + p.golesContra, 0)

  const split = equipo.splitActual ?? 1
  const tabla = clasificacion(liga, rivales, equipo.nombre, split)
  const pos = tabla.findIndex((f) => f.id === NOSOTROS)
  const hayLiga = tabla.length > 1 && (tabla[pos]?.pj ?? 0) > 0
  const posRival = proximo ? tabla.findIndex((f) => f.id === proximo.rivalId) : -1

  const mediaEquipo = lista.length ? lista.reduce((s, x) => s + x.media, 0) / lista.length : null
  const ultimo = calculo.partidos[calculo.partidos.length - 1]
  const cambioEquipo = ultimo && lista.length ? lista.reduce((s, x) => s + (ultimo.cambios[x.jugador.id] ?? 0), 0) / lista.length : 0
  const jornadaDe = (id: string | null | undefined) => {
    const g = id ? programados.find((x) => x.id === id) : null
    return g ? textoJornada(g, programados) : null
  }
  const jornadaActual = proximo ? textoJornada(proximo, programados) : null

  // Sugerencias pendientes: IF del último partido y POTM / MOTM de los meses sin entregar.
  const ultimaIF = sugerenciasIF(calculo, config).pop()
  const ifPendiente = ultimaIF?.jugador && !yaTiene(ultimaIF.jugador, 'IF', ultimaIF.clave) ? ultimaIF : null
  const mesActual = new Date().toISOString().slice(0, 7)
  const potmPendiente = sugerenciasPOTM(calculo, config, equipo.duracionPartido).find(
    (m) => m.mes < mesActual && m.candidatos[0] && !yaTiene(m.candidatos[0].e.jugador, 'POTM', m.clave),
  )
  const motmPendiente = sugerenciasMOTM(mister, config).find((m) => m.mes < mesActual && m.cumple && !yaTieneMister(misterFicha, 'MOTM', m.clave))

  const conPartidos = (x: EstadoJugador) => x.estadisticas.partidos > 0
  const goleador = mejor(lista, (x) => x.estadisticas.goles, (x) => x.estadisticas.goles > 0)
  const asistente = mejor(lista, (x) => x.estadisticas.asistencias, (x) => x.estadisticas.asistencias > 0)
  const mvps = mejor(lista, (x) => x.estadisticas.mvps, (x) => x.estadisticas.mvps > 0)
  const defensa = mejor(lista, (x) => x.estadisticas.notaMedia ?? 0, (x) => (x.jugador.posicion === 'DFC' || x.jugador.posicion === 'LAT') && conPartidos(x))
  const portero = mejor(lista, (x) => x.estadisticas.porteriasCero * 10 + (x.estadisticas.notaMedia ?? 0), (x) => x.jugador.posicion === 'POR' && conPartidos(x))
  const evolucion = mejor(lista, (x) => x.media - x.mediaInicial, (x) => conPartidos(x) && x.media - x.mediaInicial > 0)
  const destacados: Destacado[] = [
    { titulo: 'Goleador', e: goleador, valor: goleador ? `${goleador.estadisticas.goles} ${goleador.estadisticas.goles === 1 ? 'gol' : 'goles'}` : '' },
    { titulo: 'Asistente', e: asistente, valor: asistente ? `${asistente.estadisticas.asistencias} asist.` : '' },
    { titulo: 'Más MVPs', e: mvps, valor: mvps ? `${mvps.estadisticas.mvps} ${mvps.estadisticas.mvps === 1 ? 'MVP' : 'MVPs'}` : '' },
    { titulo: 'Mejor defensa', e: defensa, valor: defensa ? `${fmt1(defensa.estadisticas.notaMedia ?? 0)} nota` : '' },
    { titulo: 'Mejor portero', e: portero, valor: portero ? `${portero.estadisticas.porteriasCero} a cero` : '' },
    { titulo: 'Mayor evolución', e: evolucion, valor: evolucion ? `${conSigno(evolucion.media - evolucion.mediaInicial)} media` : '' },
  ]

  const conseguidos = logros.equipo.filter((l) => l.nivel > 0).sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))
  const mvpUltimo = ultimo?.partido.mvpId ? calculo.jugadores[ultimo.partido.mvpId] : null

  return (
    <>
      <div className="estadio" aria-hidden="true">
        <img src={`${BASE}estadio.jpg`} alt="" />
        <div className="estadio__tinte" />
        <div className="estadio__focos" />
      </div>

      <header className="inicio-cab">
        <img src={`${BASE}escudo.png`} alt={`Escudo del ${equipo.nombre}`} />
        <div>
          <h1>{equipo.nombre}</h1>
          <p>Temporada {temporada.nombre}{jornadaActual ? ` · ${jornadaActual.replace(/^J/, 'Jornada ')}` : ''}</p>
        </div>
        <Campana datos={datos} />
      </header>

      {!jugadores.length ? (
        <section className="tarjeta bienvenida editable">
          <h2>¡Empieza la temporada!</h2>
          <ol className="pasos">
            <li>Revisa el nombre del equipo y la temporada en <strong>Más → Ajustes</strong>.</li>
            <li>Añade a los jugadores en <strong>Plantilla</strong>, portero incluido.</li>
            <li>Después de cada partido, regístralo desde <strong>Liga</strong>.</li>
          </ol>
          <button className="boton editable" onClick={() => ir('/jugador/nuevo')}>Añadir el primer jugador</button>
        </section>
      ) : proximo ? (
        <section className="proximo-cristal">
          <div className="proximo-cristal__pulso" aria-hidden="true" />
          <div className="proximo-cristal__deriva" aria-hidden="true" />
          <div className="proximo-cristal__cab">
            <span>Próximo partido · {textoJornada(proximo, programados)}</span>
            <span>{fechaHora(proximo.fecha, proximo.hora)}</span>
          </div>
          <div className="proximo-cristal__equipos">
            <div><img src={`${BASE}escudo.png`} alt="" /><strong>{equipo.nombre.split(' ')[0]}</strong></div>
            <span className="proximo-cristal__vs">VS</span>
            <div><EscudoRival nombre={nombreRival(rivales, proximo.rivalId)} tam={44} /><strong>{nombreRival(rivales, proximo.rivalId)}</strong></div>
          </div>
          <p className="proximo-cristal__info">
            {proximo.local ? 'Casa' : 'Fuera'}
            {posRival >= 0 && hayLiga ? ` · ${posRival + 1}º en la liga` : ''}
            {proximo.fecha ? (() => {
              const d = diasHasta(proximo.fecha)
              return d > 1 ? ` · faltan ${d} días` : d === 1 ? ' · es mañana' : d === 0 ? ' · es hoy' : ''
            })() : ''}
          </p>
          <button className="boton boton--grande editable" onClick={() => ir(`/partido/nuevo/${proximo.id}`)}>Registrar partido</button>
        </section>
      ) : (
        <button className="boton boton--grande editable" onClick={() => ir('/partido/nuevo')}>
          <Icono nombre="mas" tam={20} /> Registrar partido
        </button>
      )}

      <div className="pastillas pastillas--4">
        <div className="cristal pastilla"><strong className="dorado">{hayLiga ? `${pos + 1}º` : '—'}</strong><span>Liga</span></div>
        <div className="cristal pastilla"><strong className="dorado">{hayLiga ? tabla[pos].pts : '—'}</strong><span>Puntos</span></div>
        <div className="cristal pastilla"><strong><span className="sube">{v}</span><span className="apagado">·</span>{e}<span className="apagado">·</span><span className="baja">{pj - v - e}</span></strong><span>V · E · D</span></div>
        <div className="cristal pastilla"><strong className="dorado">{gf}<small>:{gc}</small></strong><span>Goles</span></div>
      </div>

      {mediaEquipo !== null && (
        <section className="tarjeta forma-equipo">
          <div>
            <span className="etiqueta-seccion">Forma del equipo</span>
            <div className="forma-equipo__media">
              <strong>{fmt1(mediaEquipo)}</strong>
              {Math.abs(cambioEquipo) >= 0.05 && <span className={cambioEquipo > 0 ? 'sube' : 'baja'}>{cambioEquipo > 0 ? '▲' : '▼'} {fmt1(Math.abs(cambioEquipo))}</span>}
            </div>
            <span className="nota">media del equipo{ultimo ? ` · desde ${jornadaDe(ultimo.partido.programadoId) ?? 'el último partido'}` : ''}</span>
          </div>
          <div className="forma-equipo__ultimos">
            <PastillasForma partidos={res.slice(-5)} />
            {pj > 0 && <span className="nota">Últimos {Math.min(5, pj)} · el más reciente a la derecha</span>}
          </div>
        </section>
      )}

      {(ifPendiente || potmPendiente || motmPendiente) && !SOLO_LECTURA && (
        <section className="tarjeta">
          <div className="tarjeta__cab">
            <span className="etiqueta-seccion">Sugerencias</span>
            <button className="enlace" onClick={() => ir('/premios')}>Ver premios</button>
          </div>
          {ifPendiente?.jugador && <p className="nota">⭐ IF para <strong>{nombreVisible(ifPendiente.jugador)}</strong> por el partido contra {ifPendiente.partido.rival}.</p>}
          {potmPendiente && <p className="nota">🏅 POTM de {nombreMes(potmPendiente.mes).toLowerCase()} para <strong>{nombreVisible(potmPendiente.candidatos[0].e.jugador)}</strong>.</p>}
          {motmPendiente && <p className="nota">📋 MOTM de {nombreMes(motmPendiente.mes).toLowerCase()} para <strong>{nombreMister(misterFicha)}</strong>.</p>}
        </section>
      )}

      {ultimo && (
        <>
          <div className="cab-seccion">
            <span className="etiqueta-seccion">Último partido{jornadaDe(ultimo.partido.programadoId) ? ` · ${jornadaDe(ultimo.partido.programadoId)}` : ''}</span>
            <button className="enlace enlace--suave" onClick={() => ir(`/partido/${ultimo.partido.id}`)}>Ver resumen</button>
          </div>
          <button className="tarjeta ultimo-partido" onClick={() => ir(`/partido/${ultimo.partido.id}`)}>
            <div>
              <div className="ultimo-partido__cab">
                <span className={`chip-res chip-res--${resultado(ultimo.partido)}`}>{TEXTO_RES[resultado(ultimo.partido)]}</span>
                <span>{ultimo.partido.local ? 'vs.' : 'en'} {ultimo.partido.rival}</span>
              </div>
              <strong className="ultimo-partido__marcador">{ultimo.partido.golesFavor} – {ultimo.partido.golesContra}</strong>
              {mvpUltimo && <span className="nota">MVP: <b>{nombreVisible(mvpUltimo.jugador).toUpperCase()}</b> · {fmt1(ultimo.notas[mvpUltimo.jugador.id] ?? 0)}</span>}
            </div>
            {mvpUltimo && <MiniCarta jugador={mvpUltimo.jugador} media={mvpUltimo.media} diseno={disenoDe(mvpUltimo.jugador, mvpUltimo.media, config, mvpUltimo.rangosAlcanzados)} config={config} ancho={62} />}
          </button>
        </>
      )}

      {pj > 0 && (
        <>
          <span className="etiqueta-seccion">Destacados de la temporada</span>
          <div className="destacados-cristal">
            {destacados.map((d) => (
              <button key={d.titulo} className="cristal" disabled={!d.e} onClick={() => d.e && ir(`/jugador/${d.e.jugador.id}`)}>
                <span className="destacados-cristal__titulo">{d.titulo}</span>
                {d.e ? (
                  <MiniCarta jugador={d.e.jugador} media={d.e.media} diseno={disenoDe(d.e.jugador, d.e.media, config, d.e.rangosAlcanzados)} config={config} ancho={56} />
                ) : (
                  <span className="destacado__hueco" />
                )}
                <strong>{d.e ? d.valor : '—'}</strong>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="cab-seccion">
        <span className="etiqueta-seccion">Vitrina del equipo</span>
        <button className="enlace enlace--suave" onClick={() => setVitrina(!vitrina)}>{conseguidos.length} de {logros.equipo.length}</button>
      </div>
      <section className="tarjeta">
        {vitrina ? (
          <Vitrina estados={logros.equipo} vacio="El equipo aún no tiene logros." />
        ) : conseguidos.length ? (
          <div className="vitrina-fila">
            {conseguidos.slice(0, 4).map((l) => (
              <button key={l.def.id} onClick={() => setVitrina(true)}>
                <EscudoLogro estado={l} tam={46} />
                <strong>{l.def.nombre}</strong>
                <span>{l.def.niveles ? NOMBRE_NIVEL[l.nivel] : l.def.repetible && l.veces > 1 ? `×${l.veces}` : 'Única'}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="nota">El equipo aún no tiene logros. Toca el número para ver todos los que hay.</p>
        )}
      </section>
    </>
  )
}
