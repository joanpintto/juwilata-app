import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { fechaCorta, ir, type Datos } from '../datos'
import { generarNotificaciones, type Notificacion, type TipoNotificacion } from '../motor/notificaciones'
import { Cabecera, Icono, Vacio } from '../componentes/ui'

const ICONO: Record<TipoNotificacion, string> = { logro: 'escudo', rango: 'flecha-arriba', premio: 'estrella', copia: 'descargar' }

/** Número de notificaciones sin ver (para el globo de la campana). */
function useSinVer(datos: Datos): number {
  const vistas = useLiveQuery(() => db.vistas.toCollection().primaryKeys(), [])
  if (!vistas) return 0
  const set = new Set(vistas)
  return generarNotificaciones(datos).filter((n) => !set.has(n.id)).length
}

export function Campana({ datos }: { datos: Datos }) {
  const n = useSinVer(datos)
  return (
    <button className="campana" onClick={() => ir('/notificaciones')} aria-label={n ? `${n} notificaciones sin ver` : 'Notificaciones'}>
      <Icono nombre="campana" />
      {n > 0 && <span className="campana__globo">{n > 99 ? '99+' : n}</span>}
    </button>
  )
}

export function Notificaciones({ datos }: { datos: Datos }) {
  const vistas = useLiveQuery(() => db.vistas.toCollection().primaryKeys(), [])
  const lista = generarNotificaciones(datos)
  const set = new Set(vistas ?? [])
  const nuevas = lista.filter((n) => !set.has(n.id))
  const anteriores = lista.filter((n) => set.has(n.id)).slice(0, 60)

  const abrir = async (n: Notificacion) => {
    await db.vistas.put({ id: n.id })
    ir(n.ruta)
  }
  const leerTodo = () => db.vistas.bulkPut(nuevas.map((n) => ({ id: n.id })))

  const fila = (n: Notificacion, nueva: boolean) => (
    <li key={n.id}>
      <button className={`notif ${nueva ? 'notif--nueva' : ''}`} onClick={() => abrir(n)}>
        <span className={`notif__icono notif__icono--${n.tipo}`}>
          <Icono nombre={ICONO[n.tipo]} tam={18} />
        </span>
        <div>
          <strong>{n.titulo}</strong>
          <span>{n.texto}</span>
        </div>
        <em>{fechaCorta(n.fecha)}</em>
      </button>
    </li>
  )

  return (
    <>
      <Cabecera
        titulo="Notificaciones"
        atras="/"
        acciones={nuevas.length > 0 ? <button className="enlace" onClick={leerTodo}>Marcar todo leído</button> : undefined}
      />
      {!lista.length && <Vacio titulo="Nada por aquí" texto="Aquí aparecerán los logros, las cartas nuevas y las sugerencias de premios." />}
      {nuevas.length > 0 && (
        <section className="tarjeta">
          <h2>Nuevas</h2>
          <ul className="notifs">{nuevas.map((n) => fila(n, true))}</ul>
        </section>
      )}
      {anteriores.length > 0 && (
        <section className="tarjeta">
          <h2>Anteriores</h2>
          <ul className="notifs">{anteriores.map((n) => fila(n, false))}</ul>
        </section>
      )}
    </>
  )
}
