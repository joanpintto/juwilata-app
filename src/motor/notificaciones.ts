// Notificaciones dentro de la app (§10). Se calculan a partir de los datos
// (logros, subidas de rango, sugerencias pendientes, copia manual); en la base
// de datos solo se guarda cuáles se han visto.
import type { Datos } from '../datos'
import { nombreVisible } from '../datos'
import { rango } from './calculo'
import { SOLO_LECTURA } from '../db'
import { NOMBRE_NIVEL } from './logros'
import { nombreMes, sugerenciasIF, sugerenciasPOTM, yaTiene } from './premios'

export type TipoNotificacion = 'logro' | 'rango' | 'premio' | 'copia'

export interface Notificacion {
  id: string
  tipo: TipoNotificacion
  fecha: string // AAAA-MM-DD
  titulo: string
  texto: string
  ruta: string
}

export function generarNotificaciones(d: Datos): Notificacion[] {
  const lista: Notificacion[] = []
  const nombre = (id: string | null) => {
    const j = id ? d.jugadores.find((x) => x.id === id) : null
    return j ? nombreVisible(j) : d.equipo.nombre
  }

  for (const x of d.logros.desbloqueos) {
    const def = d.logros.defs.find((l) => l.id === x.logroId)
    if (!def) continue
    lista.push({
      id: `logro:${x.jugadorId ?? 'equipo'}:${x.logroId}:${x.nivel}:${x.partidoId ?? x.fecha}`,
      tipo: 'logro',
      fecha: x.fecha,
      titulo: `${def.nombre}${def.niveles ? ` · ${NOMBRE_NIVEL[x.nivel]}` : ''}`,
      texto: `${nombre(x.jugadorId)}: ${def.descripcion}`,
      ruta: x.jugadorId ? `/jugador/${x.jugadorId}` : '/',
    })
  }

  for (const e of Object.values(d.calculo.jugadores)) {
    for (const h of e.historial) {
      const antes = rango(d.config, h.mediaAntes)
      const despues = rango(d.config, h.mediaDespues)
      if (despues.desde > antes.desde) {
        lista.push({
          id: `rango:${e.jugador.id}:${h.partidoId}:${despues.id}`,
          tipo: 'rango',
          fecha: h.fecha,
          titulo: `¡Carta ${despues.nombre}!`,
          texto: `${nombreVisible(e.jugador)} sube de ${antes.nombre} a ${despues.nombre}.`,
          ruta: `/jugador/${e.jugador.id}`,
        })
      }
    }
  }

  // Las sugerencias de premios y la copia manual solo tienen sentido para el administrador.
  if (SOLO_LECTURA) return lista.sort((a, b) => b.fecha.localeCompare(a.fecha))

  for (const s of sugerenciasIF(d.calculo, d.config)) {
    if (s.jugador && !yaTiene(s.jugador, 'IF', s.clave)) {
      lista.push({
        id: `if:${s.partido.id}:${s.jugador.id}`,
        tipo: 'premio',
        fecha: s.partido.fecha,
        titulo: 'IF sugerida',
        texto: `${nombreVisible(s.jugador)} por el partido contra ${s.partido.rival}.`,
        ruta: `/partido/${s.partido.id}`,
      })
    }
  }

  const mesActual = new Date().toISOString().slice(0, 7)
  for (const m of sugerenciasPOTM(d.calculo, d.config, d.equipo.duracionPartido)) {
    const c = m.candidatos[0]
    if (m.mes < mesActual && c && !yaTiene(c.e.jugador, 'POTM', m.clave)) {
      lista.push({
        id: `potm:${m.mes}:${c.e.jugador.id}`,
        tipo: 'premio',
        fecha: `${m.mes}-28`,
        titulo: 'POTM sugerido',
        texto: `${nombreVisible(c.e.jugador)}, jugador de ${nombreMes(m.mes).toLowerCase()}.`,
        ruta: '/premios',
      })
    }
  }

  if (d.equipo.partidosDesdeExportacion >= 4) {
    const ultimo = d.calculo.partidos[d.calculo.partidos.length - 1]?.partido
    lista.push({
      id: `copia:${d.equipo.ultimaExportacion ?? 'nunca'}:${Math.floor(d.equipo.partidosDesdeExportacion / 4)}`,
      tipo: 'copia',
      fecha: ultimo?.fecha ?? new Date().toISOString().slice(0, 10),
      titulo: 'Toca copia manual',
      texto: `Llevas ${d.equipo.partidosDesdeExportacion} partidos sin exportar una copia de seguridad.`,
      ruta: '/ajustes/copias',
    })
  }

  return lista.sort((a, b) => b.fecha.localeCompare(a.fecha))
}
