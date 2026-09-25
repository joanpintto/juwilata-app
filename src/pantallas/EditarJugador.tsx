import { useState } from 'react'
import { db, nuevoId, type Jugador, type Pierna } from '../db'
import { fmt1, ir, volver, type Datos } from '../datos'
import { atributosIniciales, media, mediaVisible } from '../motor/calculo'
import { POSICIONES, rolesDePosicion, rolPorId, type Posicion } from '../motor/config'
import { Carta } from '../componentes/Carta'
import { disenoDe } from '../componentes/disenos'
import { FotoEditor } from '../componentes/FotoEditor'
import { Cabecera, Icono } from '../componentes/ui'
import { avisar, confirmar } from '../componentes/dialogos'

const PIERNAS: { id: Pierna; texto: string }[] = [
  { id: 'derecha', texto: 'Diestro' },
  { id: 'izquierda', texto: 'Zurdo' },
  { id: 'ambas', texto: 'Ambidiestro' },
]

export function EditarJugador({ datos, id }: { datos: Datos; id?: string }) {
  const { config, jugadores, calculo, temporada } = datos
  const existente = id ? jugadores.find((j) => j.id === id) : undefined
  const estado = existente ? calculo.jugadores[existente.id] : undefined

  const [nombre, setNombre] = useState(existente?.nombre ?? '')
  const [apodo, setApodo] = useState(existente?.apodo ?? '')
  const [dorsal, setDorsal] = useState(existente ? String(existente.dorsal) : '')
  const [posicion, setPosicion] = useState<Posicion>(existente?.posicion ?? 'MED')
  const [rol, setRol] = useState(existente?.rol ?? rolesDePosicion(config, 'MED')[0].id)
  const [pierna, setPierna] = useState<Pierna>(existente?.pierna ?? 'derecha')
  const [secundarias, setSecundarias] = useState<Posicion[]>(existente?.secundarias ?? [])
  const [foto, setFoto] = useState<string | null>(existente?.foto ?? null)
  const [archivo, setArchivo] = useState<File | string | null>(null)
  const [guardando, setGuardando] = useState(false)

  if (id && !existente) return <Cabecera titulo="Jugador no encontrado" atras="/plantilla/jugadores" />

  const cambiarPosicion = (p: Posicion) => {
    setPosicion(p)
    if (rolPorId(config, rol).posicion !== p) setRol(rolesDePosicion(config, p)[0].id)
    setSecundarias((s) => s.filter((x) => x !== p))
  }

  const alternarSecundaria = (p: Posicion) => {
    setSecundarias((s) => (s.includes(p) ? s.filter((x) => x !== p) : s.length >= 2 ? s : [...s, p]))
  }

  // Vista previa de la carta con los datos del formulario.
  const pesos = rolPorId(config, rol).pesos
  const sinPartidos = !estado || estado.historial.length === 0
  const attrsPrevia = existente && !sinPartidos ? estado!.atributos : atributosIniciales(pesos, config)
  const mediaPrevia = media(attrsPrevia, pesos)
  const previa: Jugador = {
    ...(existente ?? ({} as Jugador)),
    id: existente?.id ?? 'previa', nombre: nombre || 'Nombre', apodo, dorsal: Number(dorsal) || 0,
    posicion, rol, secundarias, pierna, foto, especiales: existente?.especiales ?? [], disenoActivo: existente?.disenoActivo ?? null,
  }

  const guardar = async () => {
    const d = Number(dorsal)
    if (!nombre.trim()) return avisar('Falta el nombre.')
    if (!Number.isInteger(d) || d < 1 || d > 99) return avisar('El dorsal debe ser un número del 1 al 99.')
    if (jugadores.some((j) => j.dorsal === d && j.id !== existente?.id)) {
      const otro = jugadores.find((j) => j.dorsal === d)!
      return avisar(`El dorsal ${d} ya lo lleva ${otro.nombre}.`)
    }

    if (existente && rol !== existente.rol && estado) {
      const antes = mediaVisible(estado.media)
      const despues = mediaVisible(mediaPrevia)
      const ok = await confirmar({
        titulo: 'Cambio de rol',
        texto: (
          <p>
            {sinPartidos
              ? `Como aún no ha jugado, sus atributos iniciales se rehacen para el nuevo rol. `
              : `Sus atributos se mantienen y la media se recalcula con los pesos del nuevo rol. `}
            Su media pasa de <strong>{antes}</strong> a <strong>{despues}</strong> ({fmt1(estado.media)} → {fmt1(mediaPrevia)}). ¿Confirmar?
          </p>
        ),
        aceptar: 'Confirmar',
      })
      if (!ok) return
    }

    setGuardando(true)
    try {
      if (existente) {
        const cambios: Partial<Jugador> = { nombre: nombre.trim(), apodo: apodo.trim(), dorsal: d, posicion, rol, secundarias, pierna, foto }
        if (sinPartidos && rol !== existente.rol) {
          cambios.atributosIniciales = atributosIniciales(pesos, config)
          cambios.rolInicial = rol
        }
        await db.jugadores.update(existente.id, cambios)
        avisar('Cambios guardados')
        volver(`/jugador/${existente.id}`)
      } else {
        const nuevo: Jugador = {
          id: nuevoId(), nombre: nombre.trim(), apodo: apodo.trim(), dorsal: d, posicion, rol, secundarias, pierna, foto,
          atributosIniciales: atributosIniciales(pesos, config), rolInicial: rol, temporadaId: temporada.id,
          creado: new Date().toISOString(), disenoActivo: null, especiales: [],
        }
        await db.jugadores.add(nuevo)
        avisar(`${nuevo.nombre} se une a la plantilla`)
        ir(`/jugador/${nuevo.id}`, true)
      }
    } finally {
      setGuardando(false)
    }
  }

  const diseno = existente && estado ? disenoDe(previa, mediaPrevia, config, estado.rangosAlcanzados) : 'bronce'

  return (
    <>
      <Cabecera titulo={existente ? 'Editar jugador' : 'Nuevo jugador'} atras={true} />

      <div className="editor-carta">
        <div className="editor-carta__previa">
          <Carta jugador={previa} media={mediaPrevia} atributos={attrsPrevia} tendencia={0} diseno={diseno} config={config} />
        </div>
        <label className="boton boton--sec boton--foto">
          <Icono nombre="camara" tam={18} /> {foto ? 'Cambiar foto' : 'Añadir foto'}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) setArchivo(f)
              e.target.value = ''
            }}
          />
        </label>
        {foto && (
          <div className="editor-carta__acciones-foto">
            <button className="enlace" onClick={() => setArchivo(foto)}>✂️ Encuadrar o quitar fondo</button>
            <button className="enlace" onClick={() => setFoto(null)}>Quitar foto</button>
          </div>
        )}
      </div>

      <section className="tarjeta formulario">
        <label className="campo">
          <span>Nombre</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" autoComplete="off" />
        </label>
        <div className="fila-campos">
          <label className="campo">
            <span>Apodo (opcional)</span>
            <input value={apodo} onChange={(e) => setApodo(e.target.value)} placeholder="Se muestra en la carta" autoComplete="off" />
          </label>
          <label className="campo campo--corto">
            <span>Dorsal</span>
            <input value={dorsal} onChange={(e) => setDorsal(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" placeholder="10" />
          </label>
        </div>

        <div className="campo">
          <span>Posición</span>
          <div className="segmentos segmentos--5">
            {POSICIONES.map((p) => (
              <button key={p.id} type="button" className={posicion === p.id ? 'activa' : ''} onClick={() => cambiarPosicion(p.id)}>
                {p.nombre}
              </button>
            ))}
          </div>
        </div>

        <div className="campo">
          <span>Rol</span>
          <div className="opciones-rol">
            {rolesDePosicion(config, posicion).map((r) => (
              <button key={r.id} type="button" className={rol === r.id ? 'activa' : ''} onClick={() => setRol(r.id)}>
                <strong>{r.sigla}</strong> {r.nombre}
              </button>
            ))}
          </div>
        </div>

        <div className="campo">
          <span>Pierna buena</span>
          <div className="segmentos">
            {PIERNAS.map((p) => (
              <button key={p.id} type="button" className={pierna === p.id ? 'activa' : ''} onClick={() => setPierna(p.id)}>
                {p.texto}
              </button>
            ))}
          </div>
        </div>

        <div className="campo">
          <span>Posiciones secundarias (máx. 2, solo informativas)</span>
          <div className="chips">
            {POSICIONES.filter((p) => p.id !== posicion).map((p) => (
              <button
                key={p.id}
                type="button"
                className={secundarias.includes(p.id) ? 'activa' : ''}
                disabled={!secundarias.includes(p.id) && secundarias.length >= 2}
                onClick={() => alternarSecundaria(p.id)}
              >
                {p.nombre}
              </button>
            ))}
          </div>
        </div>
      </section>

      <button className="boton boton--grande" onClick={guardar} disabled={guardando}>
        {existente ? 'Guardar cambios' : 'Añadir a la plantilla'}
      </button>

      {archivo && (
        <FotoEditor
          origen={archivo}
          onCancelar={() => setArchivo(null)}
          onListo={(png) => {
            setFoto(png)
            setArchivo(null)
          }}
        />
      )}
    </>
  )
}
