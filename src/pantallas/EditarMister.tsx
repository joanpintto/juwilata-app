import { useState } from 'react'
import { ESQUEMAS, guardarMister, type Mister } from '../db'
import { volver, type Datos } from '../datos'
import { CartaMister } from '../componentes/Carta'
import { disenoMister } from '../componentes/disenos'
import { FotoEditor } from '../componentes/FotoEditor'
import { Cabecera, Icono } from '../componentes/ui'
import { avisar } from '../componentes/dialogos'

/** Editar al míster: foto, nombre, apodo y formación favorita (§20.6). */
export function EditarMister({ datos }: { datos: Datos }) {
  const { config, mister: e, misterFicha: m } = datos
  const [nombre, setNombre] = useState(m.nombre)
  const [apodo, setApodo] = useState(m.apodo)
  const [formacion, setFormacion] = useState(m.formacion)
  const [foto, setFoto] = useState<string | null>(m.foto)
  const [fotoOriginal, setFotoOriginal] = useState<string | null>(m.fotoOriginal ?? null)
  const [archivo, setArchivo] = useState<File | string | null>(null)

  const previa: Mister = { ...m, nombre: nombre || 'Míster', apodo, formacion: formacion || '1-3-2-1', foto }

  const guardar = async () => {
    if (!nombre.trim()) return avisar('Falta el nombre.')
    await guardarMister({ nombre: nombre.trim(), apodo: apodo.trim(), formacion: formacion.trim() || '1-3-2-1', foto, fotoOriginal })
    avisar('Cambios guardados')
    volver('/mister')
  }

  return (
    <>
      <Cabecera titulo="Editar míster" atras={true} />

      <div className="editor-carta">
        <div className="editor-carta__previa">
          <CartaMister mister={previa} media={e.media} atributos={e.atributos} tendencia={0} diseno={disenoMister(m, e.media, config, e.rangosAlcanzados)} />
        </div>
        <label className="boton boton--sec boton--foto">
          <Icono nombre="camara" tam={18} /> {foto ? 'Cambiar foto' : 'Añadir foto'}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(ev) => {
              const f = ev.target.files?.[0]
              if (f) setArchivo(f)
              ev.target.value = ''
            }}
          />
        </label>
        {foto && (
          <div className="editor-carta__acciones-foto">
            <button className="enlace" onClick={() => setArchivo(fotoOriginal ?? foto)}>✂️ Encuadrar o quitar fondo</button>
            <button className="enlace" onClick={() => { setFoto(null); setFotoOriginal(null) }}>Quitar foto</button>
          </div>
        )}
      </div>

      <section className="tarjeta formulario">
        <label className="campo">
          <span>Nombre</span>
          <input value={nombre} onChange={(ev) => setNombre(ev.target.value)} placeholder="Nombre y apellido" autoComplete="off" />
        </label>
        <label className="campo">
          <span>Apodo (opcional)</span>
          <input value={apodo} onChange={(ev) => setApodo(ev.target.value)} placeholder="Se muestra en la carta" autoComplete="off" />
        </label>
        <div className="campo">
          <span>Formación favorita</span>
          <div className="segmentos segmentos--esquemas">
            {Object.keys(ESQUEMAS).map((x) => (
              <button key={x} type="button" className={formacion === x ? 'activa' : ''} onClick={() => setFormacion(x)}>{x}</button>
            ))}
          </div>
          <input value={formacion} onChange={(ev) => setFormacion(ev.target.value.slice(0, 9))} placeholder="Otra, p. ej. 1-4-1-1" aria-label="Formación favorita" autoComplete="off" />
        </div>
        <p className="nota">La media y los atributos del míster no se editan: salen de los partidos que dirige.</p>
      </section>

      <button className="boton boton--grande" onClick={guardar}>Guardar cambios</button>

      {archivo && (
        <FotoEditor
          origen={archivo}
          onCancelar={() => setArchivo(null)}
          onListo={(png, original) => {
            setFoto(png)
            setFotoOriginal(original)
            setArchivo(null)
          }}
        />
      )}
    </>
  )
}
