import { useState } from 'react'
import { db, nuevoId, type Jugador, type TipoEspecial } from '../db'
import { colorNota, conSigno, fechaCorta, fmt1, fmt2, hoy, ir, nombreVisible, type Datos } from '../datos'
import { media as mediaDe, rango, siguienteRango } from '../motor/calculo'
import { etiquetas, nombrePosicion, rolPorId } from '../motor/config'
import { Carta, MiniCarta } from '../componentes/Carta'
import { DISENOS, disenoDe, disenosDesbloqueados } from '../componentes/disenos'
import { GraficoEvolucion, Radar } from '../componentes/Graficos'
import { Vitrina } from '../componentes/Logros'
import { Carta3D } from '../componentes/Carta3D'
import { Cabecera, Hoja, Icono } from '../componentes/ui'
import { avisar, confirmar } from '../componentes/dialogos'

const PIERNA = { derecha: 'Diestro', izquierda: 'Zurdo', ambas: 'Ambidiestro' }
type Pestana = 'atributos' | 'evolucion' | 'historial' | 'logros'

export function FichaJugador({ datos, id }: { datos: Datos; id: string }) {
  const { config, calculos, temporada, temporadas } = datos
  // Temporadas en las que estuvo en la plantilla (de las calculadas).
  const suyas = temporadas.filter((t) => calculos.get(t.id)?.jugadores[id])
  const [tempElegida, setTempElegida] = useState<string | null>(null)
  const tempVista = tempElegida && suyas.some((t) => t.id === tempElegida)
    ? tempElegida
    : suyas.some((t) => t.id === temporada.id) ? temporada.id : suyas[suyas.length - 1]?.id
  const e = tempVista ? calculos.get(tempVista)!.jugadores[id] : undefined
  const carrera = suyas.map((t) => calculos.get(t.id)!.jugadores[id].estadisticas)
  const [pestana, setPestana] = useState<Pestana>('atributos')
  const [menu, setMenu] = useState(false)
  const [hojaEspecial, setHojaEspecial] = useState(false)
  const [elegido, setElegido] = useState<string | null>(null)

  if (!e) return <Cabecera titulo="Jugador no encontrado" atras="/plantilla/jugadores" />
  const j = e.jugador
  const rol = rolPorId(config, j.rol)
  const s = e.estadisticas
  const esPortero = j.posicion === 'POR'
  const activo = disenoDe(j, e.media, config, e.rangosAlcanzados)
  const desbloqueados = disenosDesbloqueados(j, e.rangosAlcanzados)
  const vista = elegido && desbloqueados.includes(elegido) ? elegido : activo
  const sig = siguienteRango(config, e.media)
  const actual = rango(config, e.media)
  const forma = e.historial.slice(-5)

  const eliminar = async () => {
    setMenu(false)
    const ok = await confirmar({
      titulo: `¿Eliminar a ${j.nombre}?`,
      texto: 'Se borra el jugador de la plantilla. Sus actuaciones en partidos ya confirmados dejarán de contar. Esta acción no se puede deshacer (salvo restaurando una copia).',
      aceptar: 'Eliminar',
      peligro: true,
    })
    if (!ok) return
    await db.transaction('rw', db.jugadores, db.equipo, async () => {
      await db.jugadores.delete(j.id)
      const eq = await db.equipo.get('equipo')
      if (eq) {
        const slots = Object.fromEntries(Object.entries(eq.formacion.slots).filter(([, v]) => v !== j.id))
        await db.equipo.update('equipo', { formacion: { ...eq.formacion, slots } })
      }
    })
    avisar(`${j.nombre} eliminado`)
    ir('/plantilla/jugadores', true)
  }

  const usarComoActiva = async (d: string) => {
    const valor = d === rango(config, e.media).id ? null : d
    await db.jugadores.update(j.id, { disenoActivo: valor })
    setElegido(null)
    avisar(`Carta ${DISENOS[d].nombre} activa`)
  }

  const anadirEspecial = async (tipo: TipoEspecial) => {
    const especiales = [...j.especiales, { id: nuevoId(), tipo, fecha: hoy() }]
    await db.jugadores.update(j.id, { especiales, disenoActivo: tipo })
    setHojaEspecial(false)
    avisar(`Diseño ${tipo} aplicado`)
  }

  const quitarEspecial = async (espId: string) => {
    const especiales = j.especiales.filter((x) => x.id !== espId)
    const sigue = (t: string) => especiales.some((x) => x.tipo === t)
    const cambios: Partial<Jugador> = { especiales }
    if (j.disenoActivo && !sigue(j.disenoActivo) && ['IF', 'POTM', 'TOTY'].includes(j.disenoActivo)) cambios.disenoActivo = null
    await db.jugadores.update(j.id, cambios)
  }

  const cifras: [string, string][] = esPortero
    ? [
        ['Partidos', String(s.partidos)], ['Minutos', String(s.minutos)], ['Paradas', String(s.paradas)],
        ['Porterías a 0', String(s.porteriasCero)],
        ['Encajados / PJ', s.partidos ? fmt2(s.golesEncajados / s.partidos) : '—'],
        ['Nota media', s.notaMedia !== null ? fmt2(s.notaMedia) : '—'], ['MVPs', String(s.mvps)],
        ['Tarjetas', `${s.amarillas} · ${s.rojas}`],
      ]
    : [
        ['Partidos', String(s.partidos)], ['Minutos', String(s.minutos)], ['Goles', String(s.goles)],
        ['Asistencias', String(s.asistencias)], ['Nota media', s.notaMedia !== null ? fmt2(s.notaMedia) : '—'],
        ['MVPs', String(s.mvps)], ['Amarillas', String(s.amarillas)], ['Rojas', String(s.rojas)],
      ]

  return (
    <>
      <Cabecera
        titulo={nombreVisible(j)}
        atras={true}
        acciones={
          <>
            <select className="selector-temporada" value={tempVista} aria-label="Temporada" onChange={(x) => setTempElegida(x.target.value)} disabled={suyas.length < 2}>
              {suyas.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
            <button className="boton-icono editable" onClick={() => setMenu(true)} aria-label="Más opciones">
              <Icono nombre="puntos" />
            </button>
          </>
        }
      />

      <div className="ficha-carta">
        <Carta3D>
          <Carta jugador={j} media={e.media} atributos={e.atributos} tendencia={e.tendencia} diseno={vista} config={config} />
        </Carta3D>
      </div>

      {desbloqueados.length > 1 && (
        <div className="disenos">
          <div className="disenos__lista">
            {desbloqueados.map((d) => (
              <button key={d} className={d === vista ? 'activa' : ''} onClick={() => setElegido(d)} aria-label={DISENOS[d].nombre}>
                <MiniCarta jugador={j} media={e.media} diseno={d} config={config} ancho={46} />
                <span>{DISENOS[d].nombre}</span>
              </button>
            ))}
          </div>
          {vista !== activo && (
            <button className="boton boton--peq editable" onClick={() => usarComoActiva(vista)}>Usar como activa</button>
          )}
        </div>
      )}

      <section className="tarjeta ficha-datos">
        <div className="ficha-datos__rol">
          <strong>{rol.nombre}</strong>
          <span>#{j.dorsal} · {PIERNA[j.pierna]}{j.apodo ? ` · ${j.nombre}` : ''}</span>
          {j.secundarias.length > 0 && <span>También: {j.secundarias.map(nombrePosicion).join(', ')}</span>}
        </div>
        <div className="progreso">
          <div className="progreso__texto">
            <span>{actual.nombre} · {fmt1(e.media)}</span>
            <span>{sig ? `faltan ${fmt1(sig.desde - e.media)} para ${sig.nombre}` : 'Rango máximo'}</span>
          </div>
          <div className="progreso__barra">
            <div style={{ width: `${sig ? Math.max(3, ((e.media - actual.desde) / (sig.desde - actual.desde)) * 100) : 100}%` }} />
          </div>
        </div>
      </section>

      <section className="cifras">
        {cifras.map(([k, v]) => (
          <div key={k}>
            <strong>{v}</strong>
            <span>{k}</span>
          </div>
        ))}
      </section>

      {carrera.length > 1 && (
        <p className="nota centro">
          En su carrera ({carrera.length} temporadas): {carrera.reduce((a, x) => a + x.partidos, 0)} partidos ·{' '}
          {carrera.reduce((a, x) => a + x.goles, 0)} goles · {carrera.reduce((a, x) => a + x.asistencias, 0)} asistencias ·{' '}
          {carrera.reduce((a, x) => a + x.mvps, 0)} MVPs
        </p>
      )}
      {tempVista !== temporada.id && (
        <p className="nota centro">Viendo su temporada {suyas.find((t) => t.id === tempVista)?.nombre}.</p>
      )}

      <section className="tarjeta">
        <h2>Forma</h2>
        {forma.length === 0 ? (
          <p className="nota">Aún no ha jugado esta temporada.</p>
        ) : (
          <div className="forma">
            {forma.map((p) => (
              <button key={p.partidoId} className="pildora" style={{ background: colorNota(p.nota) }} onClick={() => ir(`/partido/${p.partidoId}`)}>
                {fmt1(p.nota)}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="acciones-ficha">
        <button className="boton boton--sec" onClick={() => ir(`/evoluciones/comparador/${j.id}`)}>Comparar</button>
        <button className="boton boton--sec editable" onClick={() => setHojaEspecial(true)}>Diseño especial</button>
        <button className="boton boton--sec editable" onClick={() => ir(`/jugador/${j.id}/editar`)}>
          <Icono nombre="editar" tam={16} /> Editar
        </button>
      </div>

      <nav className="subpestanas subpestanas--4">
        {(['atributos', 'evolucion', 'historial', 'logros'] as Pestana[]).map((p) => (
          <button key={p} className={pestana === p ? 'activa' : ''} onClick={() => setPestana(p)}>
            {{ atributos: 'Atributos', evolucion: 'Evolución', historial: 'Historial', logros: 'Logros' }[p]}
          </button>
        ))}
      </nav>

      {pestana === 'atributos' && (
        <section className="tarjeta">
          <Radar actual={e.atributos} inicio={e.atributosIniciales} etiquetas={etiquetas(j.posicion)} />
          <p className="nota">
            En dorado, los atributos actuales; en gris, los del inicio de temporada. Media ponderada según su rol: {fmt2(mediaDe(e.atributos, rol.pesos))}.
          </p>
        </section>
      )}

      {pestana === 'evolucion' && (
        <section className="tarjeta">
          {e.historial.length === 0 ? (
            <p className="nota">La gráfica aparece cuando juegue su primer partido.</p>
          ) : (
            <>
              <GraficoEvolucion
                medias={[e.mediaInicial, ...e.historial.map((h) => h.mediaDespues)]}
                goles={e.historial.map((h) => h.acciones.gol ?? 0)}
                asistencias={e.historial.map((h) => h.acciones.asistencia ?? 0)}
              />
              <p className="nota leyenda">
                <span style={{ color: 'var(--dorado)' }}>━ media</span> <span style={{ color: 'var(--ok)' }}>■ goles</span>{' '}
                <span style={{ color: '#6f9fd8' }}>■ asistencias</span> · de {fmt1(e.mediaInicial)} a {fmt1(e.media)} ({conSigno(e.media - e.mediaInicial)})
              </p>
            </>
          )}
        </section>
      )}

      {pestana === 'historial' && (
        <section className="tarjeta">
          {e.historial.length === 0 ? (
            <p className="nota">Sin partidos esta temporada.</p>
          ) : (
            <ul className="historial">
              {[...e.historial].reverse().map((h) => (
                <li key={h.partidoId}>
                  <button onClick={() => ir(`/partido/${h.partidoId}`)}>
                    <span className="pildora" style={{ background: colorNota(h.nota) }}>{fmt1(h.nota)}</span>
                    <div>
                      <strong>{h.rival} {h.golesFavor}-{h.golesContra}</strong>
                      <span>
                        {fechaCorta(h.fecha)} · {h.minutos}′{h.mvp ? ' · MVP' : h.nominado ? ' · nominado' : ''}
                        {h.acciones.gol ? ` · ⚽${h.acciones.gol}` : ''}{h.acciones.asistencia ? ` · 🅰${h.acciones.asistencia}` : ''}
                      </span>
                    </div>
                    <span className={h.cambio >= 0 ? 'sube' : 'baja'}>{conSigno(h.cambio, fmt2)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {pestana === 'logros' && (
        <section className="tarjeta">
          <Vitrina estados={datos.logros.jugadores[j.id] ?? []} />
        </section>
      )}

      <Hoja abierta={menu} onCerrar={() => setMenu(false)}>
        <button className="hoja__opcion" onClick={() => ir(`/jugador/${j.id}/editar`)}>Editar jugador</button>
        <button className="hoja__opcion hoja__opcion--peligro" onClick={eliminar}>Eliminar jugador</button>
      </Hoja>

      <Hoja abierta={hojaEspecial} onCerrar={() => setHojaEspecial(false)} titulo="Diseño especial">
        <p className="nota">Son 100% estéticos: no cambian la media ni las estadísticas.</p>
        <div className="especiales">
          {(['IF', 'POTM', 'TOTY'] as TipoEspecial[]).map((t) => (
            <button key={t} onClick={() => anadirEspecial(t)}>
              <MiniCarta jugador={j} media={e.media} diseno={t} config={config} ancho={62} />
              <span>Dar {t}</span>
            </button>
          ))}
        </div>
        {j.especiales.length > 0 && (
          <ul className="lista-simple">
            {j.especiales.map((x) => (
              <li key={x.id}>
                <span>{x.tipo} · {fechaCorta(x.fecha)}</span>
                <button className="enlace enlace--peligro" onClick={() => quitarEspecial(x.id)}>Quitar</button>
              </li>
            ))}
          </ul>
        )}
      </Hoja>
    </>
  )
}
