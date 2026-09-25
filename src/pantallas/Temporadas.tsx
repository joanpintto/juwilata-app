import { useState } from 'react'
import { db, nuevoId, type Jugador, type Temporada } from '../db'
import { fechaLarga, hoy, nombreVisible, type Datos } from '../datos'
import { Hoja, Icono } from '../componentes/ui'
import { avisar, confirmar } from '../componentes/dialogos'

// Temporadas (Fase 3): empezar una nueva, cambiar la que se ve y renombrarlas.
// Al empezar una nueva, cada jugador que sigue arranca con los atributos con los
// que acabó la anterior (se calcula en cadena, así que editar el pasado se propaga).

function siguienteNombre(nombre: string): string {
  const m = nombre.match(/(\d{4})\D+(\d{2,4})/)
  if (m) {
    const a = Number(m[1]) + 1
    const b = Number(m[2]) + 1
    return `${a}-${m[2].length === 2 ? String(b).slice(-2).padStart(2, '0') : b}`
  }
  const y = new Date().getFullYear()
  return `${y}-${y + 1}`
}

function NuevaTemporada({ datos, onCerrar }: { datos: Datos; onCerrar: () => void }) {
  const { temporadas, calculos, equipo } = datos
  const ultima = temporadas[temporadas.length - 1]
  const plantilla = Object.values(calculos.get(ultima.id)?.jugadores ?? {}).map((e) => e.jugador).sort((a, b) => a.dorsal - b.dorsal)
  const [nombre, setNombre] = useState(siguienteNombre(ultima.nombre))
  const [inicio, setInicio] = useState(hoy())
  const [siguen, setSiguen] = useState<Set<string>>(new Set(plantilla.map((j) => j.id)))
  const [copiarEquipos, setCopiarEquipos] = useState(true)

  const crear = async () => {
    if (!nombre.trim()) return avisar('Ponle nombre a la temporada.')
    if (inicio <= ultima.inicio) return avisar(`Debe empezar después del ${fechaLarga(ultima.inicio)}.`)
    const ok = await confirmar({
      titulo: `Empezar la temporada ${nombre.trim()}`,
      texto: `Siguen ${siguen.size} de ${plantilla.length} jugadores, con la media con la que acaban la ${ultima.nombre}. La temporada anterior se podrá seguir consultando.`,
      aceptar: 'Empezar',
    })
    if (!ok) return
    const t: Temporada = { id: nuevoId(), nombre: nombre.trim(), inicio }
    const rivalesViejos = await db.rivales.where('temporadaId').equals(ultima.id).toArray()
    await db.transaction('rw', [db.temporadas, db.jugadores, db.rivales, db.equipo], async () => {
      await db.temporadas.add(t)
      for (const j of plantilla) {
        if (!siguen.has(j.id)) await db.jugadores.update(j.id, { fueraEn: [...(j.fueraEn ?? []), t.id] })
      }
      if (copiarEquipos) {
        await db.rivales.bulkAdd(rivalesViejos.map((r) => ({ id: nuevoId(), nombre: r.nombre, creado: new Date().toISOString(), temporadaId: t.id, splits: [1] })))
      }
      const slots = Object.fromEntries(Object.entries(equipo.formacion.slots).filter(([, v]) => !v || siguen.has(v)))
      await db.equipo.update('equipo', { temporadaActivaId: t.id, splitActual: 1, formacion: { ...equipo.formacion, slots } })
    })
    avisar(`¡Empieza la temporada ${t.nombre}!`)
    onCerrar()
  }

  return (
    <div className="formulario">
      <div className="fila-campos">
        <label className="campo">
          <span>Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="campo">
          <span>Empieza el</span>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </label>
      </div>
      <div className="campo">
        <span>¿Quién sigue en el equipo? ({siguen.size})</span>
        <div className="lista-check">
          {plantilla.map((j: Jugador) => (
            <label key={j.id}>
              <input
                type="checkbox"
                checked={siguen.has(j.id)}
                onChange={(e) => setSiguen((s) => {
                  const n = new Set(s)
                  if (e.target.checked) n.add(j.id)
                  else n.delete(j.id)
                  return n
                })}
              />
              <span>#{j.dorsal} {nombreVisible(j)}</span>
            </label>
          ))}
        </div>
        <small className="nota">Los que no sigan dejan de salir en la plantilla, pero su historial se conserva. Los fichajes nuevos se añaden después, y empiezan con media 60.</small>
      </div>
      <label className="interruptor">
        <div>
          <strong>Copiar los equipos de la liga</strong>
          <span>Los {equiposAnteriores(datos).length} equipos de la {ultima.nombre}, en el split 1.</span>
        </div>
        <input type="checkbox" checked={copiarEquipos} onChange={(e) => setCopiarEquipos(e.target.checked)} />
      </label>
      <button className="boton boton--grande" onClick={crear}>Empezar temporada</button>
    </div>
  )
}

const equiposAnteriores = (datos: Datos) => {
  const ultima = datos.temporadas[datos.temporadas.length - 1]
  return ultima.id === datos.temporada.id ? datos.rivales : []
}

export function SeccionTemporadas({ datos }: { datos: Datos }) {
  const { temporadas, temporada, calculos } = datos
  const [nueva, setNueva] = useState(false)
  const [renombrar, setRenombrar] = useState<Temporada | null>(null)
  const [nombre, setNombre] = useState('')
  const ultima = temporadas[temporadas.length - 1]
  const verUltima = temporada.id === ultima.id

  const ver = async (t: Temporada) => {
    await db.equipo.update('equipo', { temporadaActivaId: t.id })
    avisar(`Viendo la temporada ${t.nombre}`)
  }

  const borrar = async (t: Temporada) => {
    if ((await db.partidos.where('temporadaId').equals(t.id).count()) > 0) return avisar('Solo se puede borrar una temporada sin partidos.')
    const ok = await confirmar({ titulo: `¿Borrar la temporada ${t.nombre}?`, texto: 'No tiene partidos. Se quitan también su calendario y sus equipos.', aceptar: 'Borrar', peligro: true })
    if (!ok) return
    const anterior = temporadas[temporadas.findIndex((x) => x.id === t.id) - 1]
    await db.transaction('rw', [db.temporadas, db.programados, db.resultadosLiga, db.rivales, db.jugadores, db.equipo], async () => {
      await db.programados.where('temporadaId').equals(t.id).delete()
      await db.resultadosLiga.where('temporadaId').equals(t.id).delete()
      await db.rivales.where('temporadaId').equals(t.id).delete()
      await db.jugadores.toCollection().modify((j) => {
        if (j.fueraEn?.includes(t.id)) j.fueraEn = j.fueraEn.filter((x) => x !== t.id)
      })
      await db.jugadores.where('temporadaId').equals(t.id).modify((j) => {
        if (anterior) j.temporadaId = anterior.id
      })
      await db.temporadas.delete(t.id)
      if (anterior && (temporada.id === t.id)) await db.equipo.update('equipo', { temporadaActivaId: anterior.id })
    })
    setRenombrar(null)
  }

  return (
    <section className="tarjeta">
      <div className="tarjeta__cab">
        <h2>Temporadas</h2>
        {verUltima && (
          <button className="boton boton--peq boton--sec" onClick={() => setNueva(true)}>
            <Icono nombre="mas" tam={16} /> Nueva
          </button>
        )}
      </div>
      <ul className="lista-simple">
        {[...temporadas].reverse().map((t) => {
          const n = calculos.get(t.id)?.partidos.length
          return (
            <li key={t.id}>
              <div>
                <strong>{t.nombre}{t.id === ultima.id ? ' · en curso' : ''}</strong>
                <span className="nota">Desde el {fechaLarga(t.inicio)}{n !== undefined ? ` · ${n} partidos` : ''}</span>
              </div>
              <div className="lista-simple__acciones">
                {t.id === temporada.id ? (
                  <span className="dado">Viendo</span>
                ) : (
                  <button className="enlace" onClick={() => ver(t)}>Ver</button>
                )}
                <button className="enlace" onClick={() => { setRenombrar(t); setNombre(t.nombre) }} aria-label={`Editar ${t.nombre}`}>
                  <Icono nombre="editar" tam={16} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {!verUltima && <p className="nota">Para empezar una temporada nueva, vuelve primero a la que está en curso.</p>}

      <Hoja abierta={nueva} onCerrar={() => setNueva(false)} titulo="Nueva temporada">
        {nueva && <NuevaTemporada datos={datos} onCerrar={() => setNueva(false)} />}
      </Hoja>
      <Hoja abierta={!!renombrar} onCerrar={() => setRenombrar(null)} titulo="Editar temporada">
        {renombrar && (
          <>
            <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <div className="dialogo__botones">
              {temporadas.length > 1 && <button className="boton boton--sec boton--texto-peligro" onClick={() => borrar(renombrar)}>Borrar</button>}
              <button
                className="boton"
                onClick={async () => {
                  if (nombre.trim()) await db.temporadas.update(renombrar.id, { nombre: nombre.trim() })
                  setRenombrar(null)
                }}
              >
                Guardar
              </button>
            </div>
          </>
        )}
      </Hoja>
    </section>
  )
}
