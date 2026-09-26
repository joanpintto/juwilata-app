// Carta del entrenador (docs/DISENO.md §20). Funciones puras, como el resto del motor:
// todo sale de lo que ya se registra (resultado, notas de los jugadores y clasificación).
import type { Partido, Programado, Rival } from '../db'
import { atributosIniciales, cambioMediaMister, corrector, media, notaPonderada, pesosFraccion, rango } from './calculo'
import type { Atributos, Config, RangoMisterId } from './config'
import { clasificacion, esLiga, splitDePartido, type PartidoLiga } from './liga'
import { ordenarPartidos, type Temporada as TemporadaCalculada } from './temporada'

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export type NivelRival = 'alto' | 'bajo' | null
export type Resultado = 'V' | 'E' | 'D'

export const resultadoDe = (p: { golesFavor: number; golesContra: number }): Resultado =>
  p.golesFavor > p.golesContra ? 'V' : p.golesFavor < p.golesContra ? 'D' : 'E'

/** El partido cuenta para el míster salvo que se marque que no lo dirigió. */
export const dirigio = (p: Partido) => p.misterDirigio !== false

export function rangoMister(cfg: Config, m: number) {
  const lista = [...cfg.mister.rangos].sort((a, b) => a.desde - b.desde)
  let r = lista[0]
  for (const x of lista) if (m + 1e-9 >= x.desde) r = x
  return r
}

export function siguienteRangoMister(cfg: Config, m: number) {
  return [...cfg.mister.rangos].sort((a, b) => a.desde - b.desde).find((x) => x.desde > m + 1e-9) ?? null
}

// ─── Rival: mitad alta o baja de la clasificación ─────────────────────

export interface ContextoLiga {
  liga: PartidoLiga[]
  programados: Programado[]
  rivales: Rival[]
  nombreEquipo: string
}

const normalizar = (s: string) => s.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Posición del rival antes del partido: mitad alta, mitad baja o sin dato
 * (partido que no es de liga, rival desconocido o nadie ha jugado todavía).
 * Con un número impar de equipos, el del medio no cuenta ni como alto ni como bajo.
 */
export function nivelRival(p: Partido, previos: Partido[], c: ContextoLiga): NivelRival {
  if (!esLiga(p.competicion)) return null
  const rivalId = p.rivalId ?? c.rivales.find((r) => normalizar(r.nombre) === normalizar(p.rival))?.id
  if (!rivalId) return null
  const split = splitDePartido(p, c.programados)
  // Jornada del partido: la del calendario o, si no hay, cuántos partidos de liga llevamos en el split.
  const jornada =
    c.programados.find((g) => g.id === p.programadoId)?.jornada ??
    previos.filter((x) => esLiga(x.competicion) && splitDePartido(x, c.programados) === split).length + 1
  const antes = c.liga.filter((x) => x.split === split && x.jornada !== null && x.jornada < jornada)
  const tabla = clasificacion(antes, c.rivales, c.nombreEquipo, split)
  if (tabla.every((f) => f.pj === 0)) return null
  const i = tabla.findIndex((f) => f.id === rivalId)
  if (i < 0) return null
  if (i < Math.floor(tabla.length / 2)) return 'alto'
  if (i >= Math.ceil(tabla.length / 2)) return 'bajo'
  return null
}

// ─── Nota del partido (§20.2) ─────────────────────────────────────────

export interface NotaMister {
  nota: number
  resultado: number
  goles: number
  grupo: number
  porteriaCero: number
  rival: number
}

/** notasGrupo: notas de los jugadores que jugaron el partido. */
export function notaMister(p: { golesFavor: number; golesContra: number }, notasGrupo: number[], nivel: NivelRival, cfg: Config): NotaMister {
  const m = cfg.mister
  const r = resultadoDe(p)
  const resultado = r === 'V' ? m.resultado.victoria : r === 'E' ? m.resultado.empate : m.resultado.derrota
  const goles = clamp((p.golesFavor - p.golesContra) * m.porGol, -m.topeGoles, m.topeGoles)
  const grupo = notasGrupo.length ? (notasGrupo.reduce((s, x) => s + x, 0) / notasGrupo.length - m.grupoReferencia) * m.grupoFactor : 0
  const porteriaCero = p.golesContra === 0 ? m.porteriaCero : 0
  const rival = r === 'V' && nivel === 'alto' ? m.rivalAltoVictoria : r === 'D' && nivel === 'bajo' ? m.rivalBajoDerrota : 0
  const nota = clamp(Math.round((m.notaBase + resultado + goles + grupo + porteriaCero + rival) * 100) / 100, 0, 10)
  return { nota, resultado, goles, grupo, porteriaCero, rival }
}

// ─── Atributos (§20.4) ────────────────────────────────────────────────

export const EXP = 5 // la experiencia nunca baja

export interface DatosPartidoMister {
  golesFavor: number
  golesContra: number
  resultado: Resultado
  anterior: Resultado | null // resultado del partido anterior del equipo
  nivel: NivelRival
  subenRango: number
  suben: number
  bajan: number
}

export function cambiosAtributosMister(d: DatosPartidoMister, attrs: Atributos, cfg: Config): Atributos {
  const m = cfg.mister
  const porGoles = (tabla: number[], goles: number) => tabla[Math.min(tabla.length - 1, goles)] ?? 0
  const tactica = d.nivel === 'alto' ? m.tacticaAlto : d.nivel === 'bajo' ? m.tacticaBajo : null
  const r = d.resultado
  let mot = 0
  if (r === 'V' && d.anterior === 'D') mot = m.motivacion.victoriaTrasDerrota
  else if (r === 'V' && d.anterior === 'V') mot = m.motivacion.racha
  else if (r === 'D' && d.anterior === 'D') mot = m.motivacion.derrotaTrasDerrota
  const bruto: Atributos = [
    porGoles(m.ataque, d.golesFavor),
    porGoles(m.defensa, d.golesContra),
    tactica ? (r === 'V' ? tactica.victoria : r === 'E' ? tactica.empate : tactica.derrota) : 0,
    d.subenRango * m.gestion.subeRango + d.suben * m.gestion.sube + d.bajan * m.gestion.baja,
    mot,
    m.experiencia,
  ]
  // Mismo factor de dificultad y mismo tope por partido que los jugadores.
  return bruto.map((b, i) => clamp(b * (1 - (attrs[i] / 99) * 0.5), -cfg.atribTope, cfg.atribTope)) as Atributos
}

/** Como llevarMediaA, pero sin bajar nunca la experiencia. */
function llevarMediaSinBajarExp(attrs: Atributos, pesos: Atributos, objetivo: number, expMin: number, cfg: Config): Atributos {
  const w = pesosFraccion(pesos)
  let a = [...attrs] as Atributos
  a[EXP] = Math.max(a[EXP], expMin)
  for (let vuelta = 0; vuelta < 8; vuelta++) {
    const resto = objetivo - media(a, pesos)
    if (Math.abs(resto) < 1e-9) break
    const libres = a.map((v, i) => (resto > 0 ? v < cfg.atributoMax : v > cfg.atributoMin && !(i === EXP && v <= expMin + 1e-9)) && w[i] > 0)
    const pesoLibre = w.reduce((s, wi, i) => s + (libres[i] ? wi : 0), 0)
    if (pesoLibre <= 0) break
    a = a.map((v, i) => {
      if (!libres[i]) return v
      const nuevo = clamp(v + resto / pesoLibre, cfg.atributoMin, cfg.atributoMax)
      return i === EXP ? Math.max(expMin, nuevo) : nuevo
    }) as Atributos
  }
  return a
}

// ─── Temporada del míster ─────────────────────────────────────────────

export interface PasoMister {
  partidoId: string
  fecha: string
  rival: string
  golesFavor: number
  golesContra: number
  nota: number
  detalle: NotaMister
  nivel: NivelRival
  notaPonderada: number
  mediaAntes: number
  mediaDespues: number
  cambio: number
  atributos: Atributos
}

export interface EstadisticasMister {
  dirigidos: number
  victorias: number
  empates: number
  derrotas: number
  golesFavor: number
  golesContra: number
  porteriasCero: number
  notaMedia: number | null
}

export interface EstadoMister {
  atributos: Atributos
  media: number
  mediaInicial: number
  atributosIniciales: Atributos
  historial: PasoMister[]
  notas: number[]
  tendencia: number
  estadisticas: EstadisticasMister
  rangosAlcanzados: RangoMisterId[]
  porPartido: Record<string, PasoMister>
}

export interface InicioMister {
  atributos: Atributos
  rangos: RangoMisterId[]
}

export function reproducirMister(
  partidos: Partido[],
  calculo: TemporadaCalculada,
  liga: ContextoLiga,
  configs: Map<number, Config>,
  cfgActual: Config,
  inicio?: InicioMister,
): EstadoMister {
  const attrs0 = inicio?.atributos ?? atributosIniciales(cfgActual.mister.pesos, cfgActual)
  const m0 = media(attrs0, cfgActual.mister.pesos)
  const e: EstadoMister = {
    atributos: [...attrs0] as Atributos,
    media: m0,
    mediaInicial: m0,
    atributosIniciales: [...attrs0] as Atributos,
    historial: [],
    notas: [],
    tendencia: 0,
    estadisticas: { dirigidos: 0, victorias: 0, empates: 0, derrotas: 0, golesFavor: 0, golesContra: 0, porteriasCero: 0, notaMedia: null },
    rangosAlcanzados: [...new Set([...(inicio?.rangos ?? []), rangoMister(cfgActual, m0).id])],
    porPartido: {},
  }

  // Cambios de los jugadores en cada partido (para GES).
  const pasos = new Map<string, { antes: number; despues: number }[]>()
  for (const j of Object.values(calculo.jugadores)) {
    for (const h of j.historial) {
      const lista = pasos.get(h.partidoId) ?? []
      lista.push({ antes: h.mediaAntes, despues: h.mediaDespues })
      pasos.set(h.partidoId, lista)
    }
  }
  const notasDe = new Map(calculo.partidos.map((r) => [r.partido.id, Object.values(r.notas)]))

  const ordenados = ordenarPartidos(partidos)
  let correctorCuenta = 0
  ordenados.forEach((p, idx) => {
    if (!dirigio(p)) return
    const cfg = configs.get(p.configVersion) ?? cfgActual
    const pesos = cfg.mister.pesos
    const previos = ordenados.slice(0, idx)
    const nivel = nivelRival(p, previos, liga)
    const detalle = notaMister(p, notasDe.get(p.id) ?? [], nivel, cfg)
    const nota = detalle.nota
    e.notas.push(nota)
    const np = notaPonderada(e.notas, cfg)
    const mediaAntes = media(e.atributos, pesos)
    const cambio = cambioMediaMister(np, nota, mediaAntes, cfg)

    let subenRango = 0
    let suben = 0
    let bajan = 0
    for (const x of pasos.get(p.id) ?? []) {
      if (x.despues > x.antes + 1e-9) suben++
      if (x.despues < x.antes - 1e-9) bajan++
      if (rango(cfg, x.despues).desde > rango(cfg, x.antes).desde) subenRango++
    }
    const resultado = resultadoDe(p)
    const delta = cambiosAtributosMister(
      {
        golesFavor: p.golesFavor, golesContra: p.golesContra, resultado,
        anterior: previos.length ? resultadoDe(previos[previos.length - 1]) : null,
        nivel, subenRango, suben, bajan,
      },
      e.atributos, cfg,
    )
    const expAntes = e.atributos[EXP]
    let attrs = e.atributos.map((v, i) => v + delta[i]) as Atributos
    const objetivo = clamp(mediaAntes + cambio, cfg.mediaMin, cfg.mediaMax)
    attrs = llevarMediaSinBajarExp(attrs, pesos, objetivo, expAntes + delta[EXP], cfg)
    correctorCuenta++
    if (cfg.correctorCada > 0 && correctorCuenta % cfg.correctorCada === 0) {
      const exp = attrs[EXP]
      attrs = llevarMediaSinBajarExp(corrector(attrs, pesos, cfg), pesos, objetivo, exp, cfg)
    }

    const mediaDespues = media(attrs, pesos)
    e.atributos = attrs
    e.tendencia = mediaDespues - mediaAntes
    const r = rangoMister(cfg, mediaDespues).id
    if (!e.rangosAlcanzados.includes(r)) e.rangosAlcanzados.push(r)

    const s = e.estadisticas
    s.dirigidos++
    if (resultado === 'V') s.victorias++
    else if (resultado === 'E') s.empates++
    else s.derrotas++
    s.golesFavor += p.golesFavor
    s.golesContra += p.golesContra
    if (p.golesContra === 0) s.porteriasCero++

    const paso: PasoMister = {
      partidoId: p.id, fecha: p.fecha, rival: p.rival, golesFavor: p.golesFavor, golesContra: p.golesContra,
      nota, detalle, nivel, notaPonderada: np, mediaAntes, mediaDespues, cambio: mediaDespues - mediaAntes, atributos: attrs,
    }
    e.historial.push(paso)
    e.porPartido[p.id] = paso
  })

  e.media = media(e.atributos, cfgActual.mister.pesos)
  e.estadisticas.notaMedia = e.notas.length ? e.notas.reduce((a, b) => a + b, 0) / e.notas.length : null
  return e
}
