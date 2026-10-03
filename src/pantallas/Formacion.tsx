import { useEffect, useId, useRef, useState, type MouseEvent as EventoRaton, type PointerEvent as EventoPuntero } from 'react'
import { SOLO_LECTURA, db, ESQUEMAS, type Jugador } from '../db'
import { fechaLarga, fmt1, ir, nombreMister, nombreRival, nombreVisible, proximoPartido, type Datos } from '../datos'
import { rango } from '../motor/calculo'
import { siglaJugador, type Posicion } from '../motor/config'
import {
  CAMPO, DISPOSICION, siglaHueco, claveJuntos, colorEnlace, encaje, partidosJuntos, porcentajeQuimica, type ColorEnlace,
} from '../motor/quimica'
import type { EstadoJugador } from '../motor/temporada'
import { MiniCarta, MiniCartaMister } from '../componentes/Carta'
import { disenoDe, disenoMister } from '../componentes/disenos'
import { Cabecera, Hoja, Icono, Subpestanas, Vacio } from '../componentes/ui'
import { avisar } from '../componentes/dialogos'

// Plantilla (§10): Titulares (campo con peanas, química y avisos), Suplentes y
// Estadísticas del once. Geometría del campo: design/pantallas/fuente/generador-formacion.py.

const SUBPESTANAS = [
  { id: 'titulares', texto: 'Titulares', ruta: '/plantilla' },
  { id: 'suplentes', texto: 'Suplentes', ruta: '/plantilla/suplentes' },
  { id: 'estadisticas', texto: 'Estadísticas', ruta: '/plantilla/estadisticas' },
]

const COLOR_ENLACE: Record<ColorEnlace, string> = { verde: '#5fd08f', naranja: '#f0a340', rojo: '#e0495f' }
const COLOR_ENCAJE = { ok: ['#7be8a4', '80,220,140'], sec: ['#ffb44d', '240,150,40'], fuera: ['#ff6b76', '255,70,90'] } as const
const AVISO = { sec: ['#f08a24', '240,138,36', 'su posición secundaria'], fuera: ['#e0303f', '224,48,63', 'fuera de sus posiciones'] } as const

/** Color de la luz bajo cada carta según su rango. */
function luzRango(id: string): string {
  if (id.startsWith('bronce')) return '230,160,110'
  if (id.startsWith('plata')) return '225,232,240'
  if (id.startsWith('oro')) return '255,220,130'
  if (id === 'elite') return '120,200,255'
  return '255,240,210'
}

type Origen = { tipo: 'slot'; id: string; jugadorId: string } | { tipo: 'banco'; jugadorId: string }

/** Zona sobre la que está el dedo: «slot:<id>» o «banco». */
function zonaEn(x: number, y: number): string | null {
  for (const el of document.elementsFromPoint(x, y)) {
    const z = (el as HTMLElement).closest?.('[data-zona]')
    if (z) return z.getAttribute('data-zona')
  }
  return null
}

/** Todo lo que necesita la Formación, calculado una vez. */
function useOnce(datos: Datos) {
  const { equipo, jugadores, calculo, calculos, config } = datos
  const esquema = ESQUEMAS[equipo.formacion.esquema] ? equipo.formacion.esquema : '1-3-2-1'
  const huecos = ESQUEMAS[esquema]
  const disp = DISPOSICION[esquema] ?? DISPOSICION['1-3-2-1']
  const existe = (id: string | null | undefined) => !!id && jugadores.some((j) => j.id === id)
  const slots: Record<string, string | null> = Object.fromEntries(
    huecos.map((h) => [h.id, existe(equipo.formacion.slots[h.id]) ? equipo.formacion.slots[h.id] : null]),
  )
  const juntos = partidosJuntos([...calculos.values()])
  const enlaces = disp.enlaces
    .filter(([a, b]) => slots[a] && slots[b])
    .map(([a, b]) => {
      const n = juntos.get(claveJuntos(slots[a]!, slots[b]!)) ?? 0
      return { a, b, n, color: colorEnlace(n) }
    })
  const titulares = huecos
    .filter((h) => slots[h.id])
    .map((h) => {
      const e = calculo.jugadores[slots[h.id]!]
      return { h, e, encaje: encaje(h, e.jugador) }
    })
  const media = (xs: { e: EstadoJugador }[]) => (xs.length ? xs.reduce((s, x) => s + x.e.media, 0) / xs.length : null)
  const linea = (ps: Posicion[]) => media(titulares.filter((t) => ps.includes(t.h.pos)))
  return {
    esquema, huecos, disp, slots, enlaces, titulares,
    quimica: porcentajeQuimica(enlaces.map((x) => x.color)),
    medias: { once: media(titulares), porteria: linea(['POR']), defensa: linea(['DFC', 'LAT']), medio: linea(['MED']), ataque: linea(['DEL']) },
    banquillo: jugadores.filter((j) => !Object.values(slots).includes(j.id)),
    guardar: (nuevos: Record<string, string | null>, nuevoEsquema = esquema) =>
      db.equipo.update('equipo', { formacion: { esquema: nuevoEsquema, slots: nuevos } }),
    config,
  }
}

function CabeceraPlantilla({ datos, activa }: { datos: Datos; activa: string }) {
  const { equipo, programados, partidos, rivales } = datos
  const [esquemas, setEsquemas] = useState(false)
  const esquema = ESQUEMAS[equipo.formacion.esquema] ? equipo.formacion.esquema : '1-3-2-1'
  const proximo = proximoPartido(programados, partidos)
  const cambiar = async (k: string) => {
    await db.equipo.update('equipo', { formacion: { ...equipo.formacion, esquema: k } })
    setEsquemas(false)
  }
  return (
    <>
      <Cabecera
        titulo="Plantilla"
        acciones={
          <button className="cristal pastilla-esquema" onClick={() => !SOLO_LECTURA && setEsquemas(true)}>
            {esquema}
            {!SOLO_LECTURA && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>}
          </button>
        }
      />
      {proximo && (
        <div className="cristal fila-proximo-mini">
          <span className="punto-vivo" />
          <span>
            Próximo: <b>{proximo.local ? 'vs.' : 'en'} {nombreRival(rivales, proximo.rivalId)}</b>
            {proximo.fecha ? ` · ${fechaLarga(proximo.fecha).split(',')[0]}` : ''}{proximo.hora ? ` ${proximo.hora}` : ''}
          </span>
          <button className="enlace editable" onClick={() => ir(`/partido/nuevo/${proximo.id}`)}>Convocar</button>
        </div>
      )}
      <Subpestanas opciones={SUBPESTANAS} activa={activa} />
      <Hoja abierta={esquemas} onCerrar={() => setEsquemas(false)} titulo="Formación">
        <div className="segmentos segmentos--esquemas">
          {Object.keys(ESQUEMAS).map((k) => (
            <button key={k} className={k === esquema ? 'activa' : ''} onClick={() => cambiar(k)}>{k}</button>
          ))}
        </div>
        <p className="nota">Los jugadores se quedan en los huecos con el mismo nombre; si alguno sobra, pasa al banquillo.</p>
      </Hoja>
    </>
  )
}

/** Textura de grano del césped, generada una vez (verde oscuro con transparencia al azar). */
let grano: string | null = null
function granoCesped(): string {
  if (grano) return grano
  const lienzo = document.createElement('canvas')
  lienzo.width = 358
  lienzo.height = 500
  const ctx = lienzo.getContext('2d')
  if (!ctx) return ''
  const img = ctx.createImageData(lienzo.width, lienzo.height)
  let semilla = 7
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = 26
    img.data[i + 1] = 64
    img.data[i + 2] = 26
    img.data[i + 3] = Math.round(azar() * azar() * 255)
  }
  ctx.putImageData(img, 0, 0)
  grano = lienzo.toDataURL('image/png')
  return grano
}

/** Peana de posición (~44×18), por debajo de la carta. */
function Peana({ texto, estado }: { texto: string; estado: 'ok' | 'sec' | 'fuera' }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [c, g] = COLOR_ENCAJE[estado]
  return (
    <span className="peana" aria-label={`Posición en el campo: ${texto}`}>
      <svg viewBox="0 0 44 18" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}o`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a2a3f" /><stop offset="1" stopColor="#5e1628" /></linearGradient>
          <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6e1d30" /><stop offset="1" stopColor="#4c1020" /></linearGradient>
        </defs>
        <path d="M8 1 H36 L43 9 L36 17 H8 L1 9 Z" fill={`url(#${uid}o)`} fillOpacity="0.95" />
        <path d="M8 1 H36 L32 6 H12 Z" fill="rgba(255,235,225,0.10)" />
        <path d="M1 9 L8 1 L12 6 L14 17 H8 Z" fill="rgba(255,255,255,0.03)" />
        <path d="M36 1 L43 9 L36 17 H30 L32 6 Z" fill="rgba(0,0,0,0.07)" />
        <path d="M12 6 H32 L30 17 H14 Z" fill={`url(#${uid}f)`} />
        <path d="M12.2 6.3 H31.8" stroke="rgba(255,225,215,0.22)" strokeWidth="0.6" />
      </svg>
      <span style={{ color: c, textShadow: `0 0 3px rgba(${g},0.65)` }}>{texto}</span>
    </span>
  )
}

export function Formacion({ datos }: { datos: Datos }) {
  const { jugadores, calculo, config, mister, misterFicha } = datos
  const o = useOnce(datos)
  const { huecos, disp, slots, enlaces, titulares, banquillo, guardar } = o
  const pct = (v: number, total: number) => `${(v / total) * 100}%`

  const soltarEn = async (origen: Origen, z: string) => {
    if (z === 'banco') {
      if (origen.tipo === 'slot') await guardar({ ...slots, [origen.id]: null })
    } else {
      const destino = z.slice('slot:'.length)
      if (origen.tipo === 'slot') {
        if (origen.id !== destino) await guardar({ ...slots, [destino]: slots[origen.id], [origen.id]: slots[destino] })
      } else {
        await guardar({ ...slots, [destino]: origen.jugadorId })
      }
    }
  }

  // ─── Arrastrar (si el dedo se mueve) o tocar (si no) ───
  const gesto = useRef<{ x: number; y: number; origen: Origen; arrastrando: boolean } | null>(null)
  const [fantasma, setFantasma] = useState<{ x: number; y: number; jugadorId: string } | null>(null)
  const [zona, setZona] = useState<string | null>(null)
  const dedo = useRef<{ x: number; y: number } | null>(null)
  const arrastrando = fantasma !== null
  useEffect(() => {
    if (!arrastrando) return
    let marco = 0
    const paso = () => {
      const d = dedo.current
      if (d) {
        const margen = 80
        const v = d.y > window.innerHeight - margen ? 14 : d.y < margen ? -14 : 0
        if (v) {
          window.scrollBy(0, v)
          setZona(zonaEn(d.x, d.y))
        }
      }
      marco = requestAnimationFrame(paso)
    }
    marco = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(marco)
  }, [arrastrando])

  // Arrastrar mueve al jugador (solo el administrador); tocarlo abre su ficha.
  const eventos = (origenReal: Origen | null, alTocar: () => void) => {
    const origen = SOLO_LECTURA ? null : origenReal
    return {
      onPointerDown: (e: EventoPuntero<HTMLElement>) => {
        if (!origen) return
        gesto.current = { x: e.clientX, y: e.clientY, origen, arrastrando: false }
        e.currentTarget.setPointerCapture(e.pointerId)
      },
      onPointerMove: (e: EventoPuntero<HTMLElement>) => {
        const g = gesto.current
        if (!g) return
        if (!g.arrastrando && Math.hypot(e.clientX - g.x, e.clientY - g.y) < 8) return
        g.arrastrando = true
        dedo.current = { x: e.clientX, y: e.clientY }
        setFantasma({ x: e.clientX, y: e.clientY, jugadorId: g.origen.jugadorId })
        setZona(zonaEn(e.clientX, e.clientY))
      },
      onPointerUp: async (e: EventoPuntero<HTMLElement>) => {
        const g = gesto.current
        gesto.current = null
        if (!g || !g.arrastrando) return alTocar()
        setFantasma(null)
        setZona(null)
        const z = zonaEn(e.clientX, e.clientY)
        if (z) await soltarEn(g.origen, z)
      },
      onPointerCancel: () => {
        gesto.current = null
        setFantasma(null)
        setZona(null)
      },
      // Teclado (sin puntero): se comporta como un toque.
      onClick: (e: EventoRaton) => {
        if (e.detail === 0) alTocar()
      },
    }
  }

  const mini = (id: string, ancho: number | string) => {
    const e = calculo.jugadores[id]
    return <MiniCarta jugador={e.jugador} media={e.media} diseno={disenoDe(e.jugador, e.media, config, e.rangosAlcanzados)} config={config} ancho={ancho} />
  }
  const centroPeana = (id: string) => {
    const [x, y] = disp.pos[id] ?? [179, 250]
    return [x, y + CAMPO.carta.alto / 2 + 4] as const
  }
  const avisos = titulares.filter((t) => t.encaje !== 'ok')
  const quimicaColor = o.quimica >= 70 ? COLOR_ENLACE.verde : o.quimica >= 40 ? COLOR_ENLACE.naranja : COLOR_ENLACE.rojo

  return (
    <>
      <CabeceraPlantilla datos={datos} activa="titulares" />

      {jugadores.length === 0 ? (
        <Vacio
          titulo="Sin jugadores"
          texto="Añade a tu plantilla, portero incluido, para montar la formación. Todos empiezan con carta de Bronce."
          accion={<button className="boton editable" onClick={() => ir('/jugador/nuevo')}>Añadir el primero</button>}
        />
      ) : (
        <>
          <div className="campo-once">
            <div className="campo-once__franjas" />
            <div className="campo-once__luces" />
            <img className="campo-once__escudo" src={`${import.meta.env.BASE_URL}escudo.png`} alt="" aria-hidden="true" />
            <div className="campo-once__barrido" aria-hidden="true" />
            <svg className="campo-once__lineas" viewBox={`0 0 ${CAMPO.ancho} ${CAMPO.alto}`} aria-hidden="true">
              {/* Grano del césped: textura hecha una sola vez (el filtro de ruido era muy lento en iPhone). */}
              <image href={granoCesped()} width={CAMPO.ancho} height={CAMPO.alto} opacity="0.35" preserveAspectRatio="none" />
              {/* Brillo de las líneas: un trazo ancho y suave debajo (en vez de un filtro de desenfoque). */}
              <use href="#campo-lineas" stroke="#fff" strokeOpacity="0.22" strokeWidth="4" fill="none" />
              <g fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="1.6"><g id="campo-lineas">
                <rect x="12" y="12" width="334" height="476" rx="4" />
                <line x1="12" y1="250" x2="346" y2="250" />
                <circle cx="179" cy="250" r="44" />
                <circle cx="179" cy="250" r="2.5" fill="#fff" />
                <rect x="99" y="12" width="160" height="64" />
                <rect x="141" y="12" width="76" height="24" />
                <path d="M149,76 A34,34 0 0 0 209,76" />
                <rect x="99" y="424" width="160" height="64" />
                <rect x="141" y="464" width="76" height="24" />
                <path d="M149,424 A34,34 0 0 1 209,424" />
                <path d="M12,22 A10,10 0 0 0 22,12 M336,12 A10,10 0 0 0 346,22 M12,478 A10,10 0 0 1 22,488 M336,488 A10,10 0 0 1 346,478" />
              </g></g>
              {enlaces.map((l) => {
                const [x1, y1] = centroPeana(l.a)
                const [x2, y2] = centroPeana(l.b)
                return (
                  <g key={l.a + l.b} stroke={COLOR_ENLACE[l.color]} strokeLinecap="round">
                    <line x1={x1} y1={y1} x2={x2} y2={y2} strokeOpacity="0.18" strokeWidth="4.5" />
                    <line x1={x1} y1={y1} x2={x2} y2={y2} strokeOpacity="0.6" strokeWidth="1.6" />
                  </g>
                )
              })}
            </svg>

            {huecos.map((h) => {
              const [x, y] = disp.pos[h.id] ?? [179, 250]
              const jid = slots[h.id]
              const t = jid ? titulares.find((z) => z.h.id === h.id) : null
              const e = t?.e
              const sigla = e && t!.encaje === 'ok' ? siglaJugador(config, e.jugador) : siglaHueco(h)
              return (
                <div key={h.id} className="campo-once__jugador" style={{ left: pct(x, CAMPO.ancho), top: pct(y, CAMPO.alto) }}>
                  {e && <span className="campo-once__halo" style={{ background: `radial-gradient(closest-side, rgba(${luzRango(rango(config, e.media).id)},0.45), rgba(${luzRango(rango(config, e.media).id)},0))` }} />}
                  {e && <Peana texto={sigla} estado={t!.encaje} />}
                  <button
                    data-zona={`slot:${h.id}`}
                    className={`hueco ${jid ? '' : 'hueco--vacio'} ${zona === `slot:${h.id}` ? 'hueco--destino' : ''} ${fantasma && jid === fantasma.jugadorId ? 'hueco--origen' : ''}`}
                    {...eventos(jid ? { tipo: 'slot', id: h.id, jugadorId: jid } : null, () => (jid ? ir(`/jugador/${jid}`) : !SOLO_LECTURA && avisar('Arrastra aquí un jugador del banquillo.')))}
                    aria-label={e ? `${nombreVisible(e.jugador)}, ${sigla}` : `Hueco de ${siglaHueco(h)}`}
                  >
                    {jid ? mini(jid, '100%') : <span>{siglaHueco(h)}</span>}
                    {t && t.encaje !== 'ok' && (
                      <span className="aviso-pos" style={{ background: AVISO[t.encaje][0], boxShadow: `0 0 10px rgba(${AVISO[t.encaje][1]},0.9)` }} aria-label={AVISO[t.encaje][2]}>!</span>
                    )}
                  </button>
                </div>
              )
            })}

            <button className="campo-once__mister" onClick={() => ir('/mister')} aria-label={`Ficha del míster, ${nombreMister(misterFicha)}`}>
              <MiniCartaMister mister={misterFicha} media={mister.media} diseno={disenoMister(misterFicha, mister.media, config, mister.rangosAlcanzados)} ancho="100%" />
              <span>MÍSTER</span>
            </button>

            {enlaces.length > 0 && (
              <div className="campo-once__quimica">
                <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
                  <circle cx="17" cy="17" r="14" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="4" />
                  <circle cx="17" cy="17" r="14" fill="none" stroke={quimicaColor} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(o.quimica / 100) * 87.96} 87.96`} transform="rotate(-90 17 17)" style={{ filter: `drop-shadow(0 0 3px ${quimicaColor})` }} />
                </svg>
                <div>
                  <span>QUÍMICA</span>
                  <strong style={{ color: quimicaColor }}>{o.quimica}%</strong>
                </div>
              </div>
            )}
          </div>

          <div className="cristal leyenda-conexion">
            <strong>Conexión</strong>
            <span><i style={{ background: COLOR_ENLACE.verde }} />10+ partidos</span>
            <span><i style={{ background: COLOR_ENLACE.naranja }} />5-9</span>
            <span><i style={{ background: COLOR_ENLACE.rojo }} />0-4</span>
          </div>

          {avisos.length > 0 && (
            <div className="cristal avisos-pos">
              {avisos.map((t) => (
                <div key={t.h.id}>
                  <span className="aviso-pos aviso-pos--quieto" style={{ background: AVISO[t.encaje as 'sec' | 'fuera'][0] }}>!</span>
                  <span>
                    <b>{nombreVisible(t.e.jugador).toUpperCase()}</b> es {siglaJugador(config, t.e.jugador)} y juega de <b>{siglaHueco(t.h)}</b>, {AVISO[t.encaje as 'sec' | 'fuera'][2]}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pastillas pastillas--4">
            {([['Once', o.medias.once, true], ['Defensa', o.medias.defensa], ['Medio', o.medias.medio], ['Ataque', o.medias.ataque]] as [string, number | null, boolean?][]).map(([k, v, oro]) => (
              <div key={k} className="cristal pastilla">
                <strong className={oro ? 'dorado' : ''}>{v === null ? '—' : fmt1(v)}</strong>
                <span>{k}</span>
              </div>
            ))}
          </div>

          <div className={`tarjeta banquillo-cristal ${zona === 'banco' ? 'banquillo--destino' : ''}`} data-zona="banco">
            <div className="tarjeta__cab">
              <span className="etiqueta-seccion">Banquillo</span>
              {!SOLO_LECTURA && <span className="nota">Arrastra para cambiar</span>}
            </div>
            {banquillo.length === 0 && <p className="nota">Banquillo vacío.</p>}
            <div className="banquillo-cristal__lista">
              {banquillo.map((j) => (
                <button
                  key={j.id}
                  className={fantasma?.jugadorId === j.id ? 'hueco--origen' : ''}
                  {...eventos({ tipo: 'banco', jugadorId: j.id }, () => ir(`/jugador/${j.id}`))}
                >
                  {mini(j.id, 56)}
                  <span>{siglaJugador(config, j)}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      {fantasma && (
        <div className="fantasma" style={{ left: fantasma.x, top: fantasma.y }} aria-hidden="true">
          {mini(fantasma.jugadorId, 62)}
        </div>
      )}
    </>
  )
}

/** Suplentes: los que no están en el once, con «Al campo» para meterlos en un hueco. */
export function Suplentes({ datos }: { datos: Datos }) {
  const { calculo, config } = datos
  const o = useOnce(datos)
  const [elegido, setElegido] = useState<Jugador | null>(null)
  const alCampo = async (hueco: string) => {
    if (!elegido) return
    await o.guardar({ ...o.slots, [hueco]: elegido.id })
    avisar(`${nombreVisible(elegido)} al campo`)
    setElegido(null)
  }
  return (
    <>
      <CabeceraPlantilla datos={datos} activa="suplentes" />
      <button className="boton boton--sec editable" onClick={() => ir('/jugador/nuevo')}>
        <Icono nombre="mas" tam={18} /> Añadir jugador
      </button>
      {o.banquillo.length === 0 ? (
        <Vacio titulo="Sin suplentes" texto={datos.jugadores.length ? 'Todos los jugadores están en el once.' : 'Añade jugadores a la plantilla.'} />
      ) : (
        o.banquillo.map((j) => {
          const e = calculo.jugadores[j.id]
          return (
            <div key={j.id} className="tarjeta fila-suplente">
              <button onClick={() => ir(`/jugador/${j.id}`)} aria-label={`Ficha de ${nombreVisible(j)}`}>
                <MiniCarta jugador={j} media={e.media} diseno={disenoDe(j, e.media, config, e.rangosAlcanzados)} config={config} ancho={62} />
              </button>
              <div className="fila-suplente__texto">
                <strong>{nombreVisible(j)}</strong>
                <span>{siglaJugador(config, j)} · media {Math.floor(e.media)} · {e.estadisticas.minutos}′ jugados</span>
              </div>
              <button className="boton-dorado-suave editable" onClick={() => setElegido(j)}>Al campo</button>
            </div>
          )
        })
      )}
      <Hoja abierta={!!elegido} onCerrar={() => setElegido(null)} titulo={elegido ? `${nombreVisible(elegido)} al campo` : ''}>
        <p className="nota">Elige el hueco. Si está ocupado, ese jugador pasa al banquillo.</p>
        {o.huecos.map((h) => {
          const ocupa = o.slots[h.id] ? calculo.jugadores[o.slots[h.id]!]?.jugador : null
          return (
            <button key={h.id} className="hoja__opcion" onClick={() => alCampo(h.id)}>
              <strong>{siglaHueco(h)}</strong>
              <span>{ocupa ? `Ahora: ${nombreVisible(ocupa)}` : 'Libre'}</span>
            </button>
          )
        })}
      </Hoja>
    </>
  )
}

/** Estadísticas del once titular. */
export function EstadisticasOnce({ datos }: { datos: Datos }) {
  const { config, calculo } = datos
  const o = useOnce(datos)
  const t = o.titulares
  if (!t.length) {
    return (
      <>
        <CabeceraPlantilla datos={datos} activa="estadisticas" />
        <Vacio titulo="El once está vacío" texto="Coloca a los titulares en la formación para ver sus estadísticas." />
      </>
    )
  }
  const mediaOnce = o.medias.once ?? 0
  const porRango = new Map<string, number>()
  for (const x of t) {
    const r = rango(config, x.e.media).nombre
    porRango.set(r, (porRango.get(r) ?? 0) + 1)
  }
  const cuenta = { verde: 0, naranja: 0, rojo: 0 }
  for (const l of o.enlaces) cuenta[l.color]++
  const nombre = (slot: string) => nombreVisible(calculo.jugadores[o.slots[slot]!].jugador).toUpperCase()
  const fuerte = [...o.enlaces].sort((a, b) => b.n - a.n)[0]
  const debil = [...o.enlaces].sort((a, b) => a.n - b.n)[0]
  const forma = t.map((x) => {
    const ult = x.e.historial.slice(-5)
    return { x, nota: ult.length ? ult.reduce((s, h) => s + h.nota, 0) / ult.length : null }
  })
  const goles = t.reduce((s, x) => s + x.e.estadisticas.goles, 0)
  const asist = t.reduce((s, x) => s + x.e.estadisticas.asistencias, 0)
  const mvps = t.reduce((s, x) => s + x.e.estadisticas.mvps, 0)
  const piernas = { derecha: 0, izquierda: 0, ambas: 0 }
  for (const x of t) piernas[x.e.jugador.pierna]++
  const barra = (v: number | null) => (v === null ? 0 : Math.max(2, Math.min(100, ((v - 55) / 44) * 100)))

  return (
    <>
      <CabeceraPlantilla datos={datos} activa="estadisticas" />
      <section className="tarjeta once-resumen">
        <div className="anillo">
          <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
            <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
            <circle cx="48" cy="48" r="40" fill="none" stroke="#CCA37C" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${Math.max(0, (mediaOnce - 60) / 39) * 251.3} 251.3`} transform="rotate(-90 48 48)" />
          </svg>
          <div><strong>{fmt1(mediaOnce)}</strong><span>media</span></div>
        </div>
        <div>
          <h3 className="titulo-graf">Once titular</h3>
          <p className="nota">{[...porRango.entries()].map(([r, n]) => `${n} ${r}`).join(' · ')}</p>
        </div>
      </section>

      {o.enlaces.length > 0 && (
        <section className="tarjeta">
          <div>
            <h3 className="titulo-graf">Química del once · {o.quimica}%</h3>
            <p className="nota">{o.enlaces.length} conexiones · verde cuenta entera, naranja la mitad y roja nada</p>
          </div>
          <div className="barra-reparto">
            {cuenta.verde > 0 && <span style={{ flex: cuenta.verde, background: COLOR_ENLACE.verde }} />}
            {cuenta.naranja > 0 && <span style={{ flex: cuenta.naranja, background: COLOR_ENLACE.naranja }} />}
            {cuenta.rojo > 0 && <span style={{ flex: cuenta.rojo, background: COLOR_ENLACE.rojo }} />}
          </div>
          <div className="reparto-leyenda"><span>{cuenta.verde} verdes</span><span>{cuenta.naranja} naranjas</span><span>{cuenta.rojo} rojas</span></div>
          <ul className="lista-simple">
            <li><span>Más fuerte: <b>{nombre(fuerte.a)} – {nombre(fuerte.b)}</b></span><strong className="sube">{fuerte.n}</strong></li>
            {debil.n < fuerte.n && <li><span>Más débil: <b>{nombre(debil.a)} – {nombre(debil.b)}</b></span><strong className="baja">{debil.n}</strong></li>}
          </ul>
        </section>
      )}

      <section className="tarjeta">
        <div>
          <h3 className="titulo-graf">Media por línea</h3>
          <p className="nota">Titulares de la formación {o.esquema}</p>
        </div>
        {([['Portería', o.medias.porteria], ['Defensa', o.medias.defensa], ['Medio', o.medias.medio], ['Ataque', o.medias.ataque]] as [string, number | null][]).map(([k, v]) => (
          <div key={k} className="barra-linea">
            <span>{k}</span>
            <span className="barra-linea__pista"><span style={{ width: `${barra(v)}%` }} /></span>
            <strong>{v === null ? '—' : fmt1(v)}</strong>
          </div>
        ))}
      </section>

      <section className="tarjeta">
        <div>
          <h3 className="titulo-graf">Forma del once</h3>
          <p className="nota">Nota media de los últimos 5 partidos</p>
        </div>
        <div className="forma-once">
          {forma.map(({ x, nota }) => (
            <div key={x.h.id}>
              <span>{nota === null ? '—' : fmt1(nota)}</span>
              <span className="forma-once__pista"><span className={nota !== null && nota >= config.notaAlta ? 'alta' : ''} style={{ height: `${nota === null ? 0 : Math.max(4, Math.min(100, ((nota - 4) / 5) * 100))}%` }} /></span>
              <small>{nombreVisible(x.e.jugador).slice(0, 4).toUpperCase()}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="pastillas pastillas--3">
        <div className="cristal pastilla"><strong className="dorado">{goles}</strong><span>Goles</span></div>
        <div className="cristal pastilla"><strong>{asist}</strong><span>Asistencias</span></div>
        <div className="cristal pastilla"><strong>{mvps}</strong><span>MVPs</span></div>
      </div>

      <section className="tarjeta">
        <div>
          <h3 className="titulo-graf">Pierna buena</h3>
          <p className="nota">Reparto en el once</p>
        </div>
        <div className="barra-reparto">
          {piernas.derecha > 0 && <span style={{ flex: piernas.derecha, background: '#CCA37C' }} />}
          {piernas.izquierda > 0 && <span style={{ flex: piernas.izquierda, background: '#b0283c' }} />}
          {piernas.ambas > 0 && <span style={{ flex: piernas.ambas, background: '#8f867e' }} />}
        </div>
        <div className="reparto-leyenda">
          <span>{piernas.derecha} diestros</span>
          <span>{piernas.izquierda} zurdos</span>
          {piernas.ambas > 0 && <span>{piernas.ambas} ambidiestros</span>}
        </div>
      </section>
      <p className="nota centro">Química: partidos jugados juntos en todas las temporadas (los dos con minutos).</p>
      <p className="nota centro">Calculado con la temporada {datos.temporada.nombre}.</p>
    </>
  )
}
