// Reproduce la temporada partido a partido a partir de lo registrado.
// Como todo se recalcula desde cero, editar un partido antiguo recalcula
// en cascada todo lo posterior sin pasos extra.
import type { Jugador, Partido } from '../db'
import {
  calcularNota, cambioMedia, cambiosAtributos, corrector, factorPremio, llevarMediaA, media,
  notaPonderada, rango, type Acciones,
} from './calculo'
import { rolPorId, type Atributos, type Config } from './config'

export interface Paso {
  partidoId: string
  fecha: string
  rival: string
  golesFavor: number
  golesContra: number
  titular: boolean
  minutos: number
  acciones: Acciones
  nota: number
  notaPonderada: number
  mediaAntes: number
  mediaDespues: number
  cambio: number // total del partido (evolución + premio)
  premio: number
  mvp: boolean
  nominado: boolean
  atributos: Atributos
}

export interface Estadisticas {
  partidos: number
  titularidades: number
  suplencias: number
  minutos: number
  goles: number
  asistencias: number
  notaMedia: number | null
  mvps: number
  amarillas: number
  rojas: number
  paradas: number
  porteriasCero: number
  golesEncajados: number
}

export interface EstadoJugador {
  jugador: Jugador
  atributos: Atributos
  media: number
  mediaInicial: number
  atributosIniciales: Atributos
  historial: Paso[]
  notas: number[]
  tendencia: number // cambio en su último partido
  estadisticas: Estadisticas
  rangosAlcanzados: string[]
}

export interface ResultadoPartido {
  partido: Partido
  notas: Record<string, number>
  cambios: Record<string, number>
}

export interface Temporada {
  jugadores: Record<string, EstadoJugador>
  partidos: ResultadoPartido[] // orden cronológico
}

export function ordenarPartidos(partidos: Partido[]): Partido[] {
  return [...partidos].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.creado.localeCompare(b.creado))
}

const statsVacias = (): Estadisticas => ({
  partidos: 0, titularidades: 0, suplencias: 0, minutos: 0, goles: 0, asistencias: 0, notaMedia: null,
  mvps: 0, amarillas: 0, rojas: 0, paradas: 0, porteriasCero: 0, golesEncajados: 0,
})

export function reproducirTemporada(
  jugadores: Jugador[],
  partidos: Partido[],
  configs: Map<number, Config>,
  cfgActual: Config,
  duracion: number,
): Temporada {
  const estados: Record<string, EstadoJugador> = {}
  for (const j of jugadores) {
    const pesos = rolPorId(cfgActual, j.rolInicial).pesos
    const m = media(j.atributosIniciales, pesos)
    estados[j.id] = {
      jugador: j,
      atributos: [...j.atributosIniciales] as Atributos,
      media: m,
      mediaInicial: m,
      atributosIniciales: [...j.atributosIniciales] as Atributos,
      historial: [],
      notas: [],
      tendencia: 0,
      estadisticas: statsVacias(),
      rangosAlcanzados: [rango(cfgActual, m).id],
    }
  }

  const resultados: ResultadoPartido[] = []
  for (const p of ordenarPartidos(partidos)) {
    const cfg = configs.get(p.configVersion) ?? cfgActual
    const ctx = { golesFavor: p.golesFavor, golesContra: p.golesContra, duracion }
    const res: ResultadoPartido = { partido: p, notas: {}, cambios: {} }

    for (const a of p.actuaciones) {
      const e = estados[a.jugadorId]
      if (!e) continue
      const s = e.estadisticas
      if (a.estado === 'titular') s.titularidades++
      if (a.estado === 'suplente') s.suplencias++
      if ((a.estado !== 'titular' && a.estado !== 'suplente') || a.minutos <= 0) continue

      const pesos = rolPorId(cfg, a.rol).pesos
      const mediaAntes = media(e.atributos, pesos)
      const nota = calcularNota(a.posicion, a.acciones, a.minutos, ctx, cfg)
      e.notas.push(nota)
      const np = notaPonderada(e.notas, cfg)
      const evolucion = cambioMedia(np, nota, mediaAntes, a.minutos, cfg)

      // 1) Las acciones dan forma a los atributos; 2) la media la fija la evolución.
      const delta = cambiosAtributos(a.posicion, a.acciones, a.minutos, ctx, e.atributos, cfg)
      let attrs = e.atributos.map((v, i) => v + delta[i]) as Atributos
      let objetivo = mediaAntes + evolucion

      const esMvp = p.mvpId === a.jugadorId
      const esNominado = !esMvp && p.mvpId !== null && p.nominados.includes(a.jugadorId)
      let premio = 0
      if (esMvp || esNominado) {
        premio = (esMvp ? cfg.premioMvp : cfg.premioNominado) * factorPremio(objetivo, cfg)
        objetivo += premio
      }
      objetivo = Math.min(cfg.mediaMax, Math.max(cfg.mediaMin, objetivo))
      attrs = llevarMediaA(attrs, pesos, objetivo, cfg)

      s.partidos++
      if (cfg.correctorCada > 0 && s.partidos % cfg.correctorCada === 0) attrs = corrector(attrs, pesos, cfg)

      const mediaDespues = media(attrs, pesos)
      e.atributos = attrs
      e.tendencia = mediaDespues - mediaAntes
      const r = rango(cfg, mediaDespues).id
      if (!e.rangosAlcanzados.includes(r)) e.rangosAlcanzados.push(r)

      const n = (id: keyof Acciones) => a.acciones[id] ?? 0
      s.minutos += a.minutos
      s.goles += n('gol')
      s.asistencias += n('asistencia')
      s.amarillas += n('amarilla')
      s.rojas += n('roja')
      s.paradas += n('parada') + n('paradaDificil')
      s.golesEncajados += n('golEncajado')
      if (a.posicion === 'POR' && p.golesContra === 0 && a.minutos > duracion / 2) s.porteriasCero++
      if (esMvp) s.mvps++

      e.historial.push({
        partidoId: p.id, fecha: p.fecha, rival: p.rival, golesFavor: p.golesFavor, golesContra: p.golesContra,
        titular: a.estado === 'titular', minutos: a.minutos, acciones: a.acciones, nota, notaPonderada: np,
        mediaAntes, mediaDespues, cambio: mediaDespues - mediaAntes, premio, mvp: esMvp, nominado: esNominado,
        atributos: attrs,
      })
      res.notas[a.jugadorId] = nota
      res.cambios[a.jugadorId] = mediaDespues - mediaAntes
    }
    resultados.push(res)
  }

  // La media visible usa siempre el rol actual del jugador.
  for (const e of Object.values(estados)) {
    e.media = media(e.atributos, rolPorId(cfgActual, e.jugador.rol).pesos)
    const s = e.estadisticas
    s.notaMedia = e.notas.length ? e.notas.reduce((a, b) => a + b, 0) / e.notas.length : null
  }
  return { jugadores: estados, partidos: resultados }
}
