import { useState } from 'react'
import { guardarMister, nuevoId } from '../db'
import { colorNota, conSigno, fechaCorta, fmt1, fmt2, hoy, ir, nombreMister, type Datos } from '../datos'
import { media as mediaDe } from '../motor/calculo'
import { ETIQUETAS_MISTER } from '../motor/config'
import { rangoMister, siguienteRangoMister } from '../motor/mister'
import { CartaMister, MiniCartaMister } from '../componentes/Carta'
import { DISENOS_MISTER, disenoMister, disenosMisterDesbloqueados } from '../componentes/disenos'
import { GraficoEvolucion, Radar } from '../componentes/Graficos'
import { Vitrina } from '../componentes/Logros'
import { Carta3D } from '../componentes/Carta3D'
import { Cabecera, Hoja, Icono } from '../componentes/ui'
import { avisar } from '../componentes/dialogos'

type Pestana = 'atributos' | 'evolucion' | 'historial' | 'logros'
const ESPECIALES_MISTER = ['MOTM', 'TOTY'] as const

const TEXTO_NIVEL = { alto: 'rival de arriba', bajo: 'rival de abajo' }

/** Ficha del entrenador (§20.6): la misma estructura que la de un jugador. */
export function FichaMister({ datos }: { datos: Datos }) {
  const { config, calculosMister, temporada, temporadas, misterFicha: m } = datos
  const [tempElegida, setTempElegida] = useState<string | null>(null)
  const tempVista = tempElegida && calculosMister.has(tempElegida) ? tempElegida : temporada.id
  const e = calculosMister.get(tempVista)!
  const carrera = temporadas.filter((t) => calculosMister.has(t.id)).map((t) => calculosMister.get(t.id)!.estadisticas)
  const [pestana, setPestana] = useState<Pestana>('atributos')
  const [hojaEspecial, setHojaEspecial] = useState(false)
  const [elegido, setElegido] = useState<string | null>(null)

  const s = e.estadisticas
  const activo = disenoMister(m, e.media, config, e.rangosAlcanzados)
  const desbloqueados = disenosMisterDesbloqueados(m, e.rangosAlcanzados)
  const vista = elegido && desbloqueados.includes(elegido) ? elegido : activo
  const sig = siguienteRangoMister(config, e.media)
  const actual = rangoMister(config, e.media)
  const forma = e.historial.slice(-5)

  const usarComoActiva = async (d: string) => {
    await guardarMister({ disenoActivo: d === rangoMister(config, e.media).id ? null : d })
    setElegido(null)
    avisar(`Carta ${DISENOS_MISTER[d].nombre} activa`)
  }

  const anadirEspecial = async (tipo: (typeof ESPECIALES_MISTER)[number]) => {
    await guardarMister({ especiales: [...m.especiales, { id: nuevoId(), tipo, fecha: hoy() }], disenoActivo: tipo })
    setHojaEspecial(false)
    avisar(`Diseño ${tipo} aplicado`)
  }

  const quitarEspecial = async (espId: string) => {
    const especiales = m.especiales.filter((x) => x.id !== espId)
    const sigue = m.disenoActivo && especiales.some((x) => x.tipo === m.disenoActivo)
    const esEspecial = (ESPECIALES_MISTER as readonly string[]).includes(m.disenoActivo ?? '')
    await guardarMister({ especiales, ...(esEspecial && !sigue ? { disenoActivo: null } : {}) })
  }

  const cifras: [string, string][] = [
    ['Dirigidos', String(s.dirigidos)],
    ['V · E · D', `${s.victorias} · ${s.empates} · ${s.derrotas}`],
    ['% victorias', s.dirigidos ? `${Math.round((s.victorias / s.dirigidos) * 100)}%` : '—'],
    ['Nota media', s.notaMedia !== null ? fmt2(s.notaMedia) : '—'],
    ['Goles a favor', String(s.golesFavor)],
    ['Goles en contra', String(s.golesContra)],
    ['Porterías a 0', String(s.porteriasCero)],
    ['Rango', actual.nombre],
  ]

  return (
    <>
      <Cabecera
        titulo={nombreMister(m)}
        atras={true}
        acciones={
          <select className="selector-temporada" value={tempVista} aria-label="Temporada" onChange={(x) => setTempElegida(x.target.value)} disabled={calculosMister.size < 2}>
            {temporadas.filter((t) => calculosMister.has(t.id)).map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        }
      />

      <div className="ficha-carta">
        <Carta3D>
          <CartaMister mister={m} media={e.media} atributos={e.atributos} tendencia={e.tendencia} diseno={vista} />
        </Carta3D>
      </div>

      {desbloqueados.length > 1 && (
        <div className="disenos">
          <div className="disenos__lista">
            {desbloqueados.map((d) => (
              <button key={d} className={d === vista ? 'activa' : ''} onClick={() => setElegido(d)} aria-label={DISENOS_MISTER[d].nombre}>
                <MiniCartaMister mister={m} media={e.media} diseno={d} ancho={46} />
                <span>{DISENOS_MISTER[d].nombre}</span>
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
          <strong>Entrenador</strong>
          <span>Formación favorita {m.formacion}{m.apodo ? ` · ${m.nombre}` : ''}</span>
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
          En su carrera ({carrera.length} temporadas): {carrera.reduce((a, x) => a + x.dirigidos, 0)} partidos dirigidos ·{' '}
          {carrera.reduce((a, x) => a + x.victorias, 0)} victorias
        </p>
      )}
      {tempVista !== temporada.id && (
        <p className="nota centro">Viendo su temporada {temporadas.find((t) => t.id === tempVista)?.nombre}.</p>
      )}

      <section className="tarjeta">
        <h2>Forma</h2>
        {forma.length === 0 ? (
          <p className="nota">Aún no ha dirigido ningún partido esta temporada.</p>
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
        <button className="boton boton--sec editable" onClick={() => setHojaEspecial(true)}>Diseño especial</button>
        <button className="boton boton--sec editable" onClick={() => ir('/mister/editar')}>
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
          <Radar actual={e.atributos} inicio={e.atributosIniciales} etiquetas={ETIQUETAS_MISTER} />
          <p className="nota">
            En dorado, los atributos actuales; en gris, los del inicio de temporada. Media ponderada: {fmt2(mediaDe(e.atributos, config.mister.pesos))}.
          </p>
          <ul className="lista-simple lista-simple--nota">
            <li><strong>ATA</strong> ataque: goles a favor</li>
            <li><strong>DEF</strong> defensa: goles en contra</li>
            <li><strong>TÁC</strong> táctica: resultado según el rival</li>
            <li><strong>GES</strong> gestión: jugadores que suben o bajan</li>
            <li><strong>MOT</strong> motivación: reacción y rachas</li>
            <li><strong>EXP</strong> experiencia: partidos dirigidos (nunca baja)</li>
          </ul>
        </section>
      )}

      {pestana === 'evolucion' && (
        <section className="tarjeta">
          {e.historial.length === 0 ? (
            <p className="nota">La gráfica aparece cuando dirija su primer partido.</p>
          ) : (
            <>
              <GraficoEvolucion
                medias={[e.mediaInicial, ...e.historial.map((h) => h.mediaDespues)]}
                goles={e.historial.map((h) => h.golesFavor)}
                asistencias={e.historial.map((h) => h.golesContra)}
              />
              <p className="nota leyenda">
                <span style={{ color: 'var(--dorado)' }}>━ media</span> <span style={{ color: 'var(--ok)' }}>■ goles a favor</span>{' '}
                <span style={{ color: '#6f9fd8' }}>■ goles en contra</span> · de {fmt1(e.mediaInicial)} a {fmt1(e.media)} ({conSigno(e.media - e.mediaInicial)})
              </p>
            </>
          )}
        </section>
      )}

      {pestana === 'historial' && (
        <section className="tarjeta">
          {e.historial.length === 0 ? (
            <p className="nota">Sin partidos dirigidos esta temporada.</p>
          ) : (
            <ul className="historial">
              {[...e.historial].reverse().map((h) => (
                <li key={h.partidoId}>
                  <button onClick={() => ir(`/partido/${h.partidoId}`)}>
                    <span className="pildora" style={{ background: colorNota(h.nota) }}>{fmt1(h.nota)}</span>
                    <div>
                      <strong>{h.rival} {h.golesFavor}-{h.golesContra}</strong>
                      <span>{fechaCorta(h.fecha)}{h.nivel ? ` · ${TEXTO_NIVEL[h.nivel]}` : ''}</span>
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
          <Vitrina estados={datos.logros.mister} vacio="Todavía ninguno. ¡A por la primera victoria!" />
        </section>
      )}

      <Hoja abierta={hojaEspecial} onCerrar={() => setHojaEspecial(false)} titulo="Diseño especial">
        <p className="nota">Son 100% estéticos: no cambian la media ni las estadísticas.</p>
        <div className="especiales">
          {ESPECIALES_MISTER.map((t) => (
            <button key={t} onClick={() => anadirEspecial(t)}>
              <MiniCartaMister mister={m} media={e.media} diseno={t} ancho={62} />
              <span>Dar {t}</span>
            </button>
          ))}
        </div>
        {m.especiales.length > 0 && (
          <ul className="lista-simple">
            {m.especiales.map((x) => (
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
