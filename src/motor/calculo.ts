// Fórmulas del documento de diseño (secciones 5 y 6). Funciones puras:
// reciben la configuración y devuelven números, sin tocar la base de datos.
import type { AccionId, Atributos, Config, Posicion, RangoId, Tabla } from './config'

export type Acciones = Partial<Record<AccionId, number>>

export const n = (a: Acciones, id: AccionId): number => a[id] ?? 0

export function interpolar(tabla: Tabla, x: number): number {
  if (tabla.length === 0) return 0
  const t = [...tabla].sort((a, b) => a.x - b.x)
  if (x <= t[0].x) return t[0].y
  for (let i = 1; i < t.length; i++) {
    if (x <= t[i].x) {
      const a = t[i - 1]
      const b = t[i]
      return a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y)
    }
  }
  return t[t.length - 1].y
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

// ─── Atributos y media ────────────────────────────────────────────────

export function pesosFraccion(pesos: Atributos): Atributos {
  const total = pesos.reduce((s, p) => s + p, 0) || 100
  return pesos.map((p) => p / total) as Atributos
}

export function media(attrs: Atributos, pesos: Atributos): number {
  const w = pesosFraccion(pesos)
  return attrs.reduce((s, a, i) => s + a * w[i], 0)
}

/**
 * Atributos de un jugador nuevo: el perfil de su rol (`(peso − 16,67%) × 30`),
 * desplazado para que la media ponderada sea exactamente la base (60,0).
 */
export function atributosIniciales(pesos: Atributos, cfg: Config): Atributos {
  const w = pesosFraccion(pesos)
  const perfil = w.map((wi) => (wi - 1 / 6) * cfg.atributosEscala)
  const desfase = perfil.reduce((s, p, i) => s + p * w[i], 0)
  return perfil.map((p) => cfg.atributosBase + p - desfase) as Atributos
}

/**
 * Desplaza los atributos para que su media ponderada pase a ser `objetivo`.
 * El cambio se reparte por igual entre los 6 atributos (respetando los límites).
 */
export function llevarMediaA(attrs: Atributos, pesos: Atributos, objetivo: number, cfg: Config): Atributos {
  const w = pesosFraccion(pesos)
  let a = [...attrs] as Atributos
  for (let vuelta = 0; vuelta < 6; vuelta++) {
    const resto = objetivo - media(a, pesos)
    if (Math.abs(resto) < 1e-9) break
    const libres = a.map((v, i) => (resto > 0 ? v < cfg.atributoMax : v > cfg.atributoMin) && w[i] > 0)
    const pesoLibre = w.reduce((s, wi, i) => s + (libres[i] ? wi : 0), 0)
    if (pesoLibre <= 0) break
    a = a.map((v, i) => (libres[i] ? clamp(v + resto / pesoLibre, cfg.atributoMin, cfg.atributoMax) : v)) as Atributos
  }
  return a
}

export function rango(cfg: Config, m: number): { id: RangoId; nombre: string; desde: number } {
  const lista = [...cfg.rangos].sort((a, b) => a.desde - b.desde)
  let r = lista[0]
  for (const x of lista) if (m + 1e-9 >= x.desde) r = x
  return r
}

export function siguienteRango(cfg: Config, m: number) {
  const lista = [...cfg.rangos].sort((a, b) => a.desde - b.desde)
  return lista.find((x) => x.desde > m + 1e-9) ?? null
}

/** Media que se muestra en la carta: parte entera, para que cuadre con los rangos. */
export const mediaVisible = (m: number) => Math.floor(m + 1e-9)

// ─── Nota del partido (6.1) ───────────────────────────────────────────

export interface ContextoPartido {
  golesFavor: number
  golesContra: number
  duracion: number // minutos de un partido completo
}

export function ajusteResultado(ctx: ContextoPartido, cfg: Config): number {
  const dif = ctx.golesFavor - ctx.golesContra
  const r = cfg.ajusteResultado
  if (dif >= cfg.margenAmplio) return r.ganarAmplio
  if (dif > 0) return r.ganar
  if (dif === 0) return r.empate
  if (dif > -cfg.margenAmplio) return r.perder
  return r.perderAmplio
}

export function porteriaCero(ctx: ContextoPartido, minutos: number): boolean {
  return ctx.golesContra === 0 && minutos > ctx.duracion / 2
}

export function calcularNota(pos: Posicion, acciones: Acciones, minutos: number, ctx: ContextoPartido, cfg: Config): number {
  let nota = cfg.notaBase + ajusteResultado(ctx, cfg)
  const cero = porteriaCero(ctx, minutos)

  if (pos === 'POR') {
    const p = cfg.portero
    nota += n(acciones, 'parada') * p.parada
    nota += n(acciones, 'paradaDificil') * p.paradaDificil
    nota += n(acciones, 'penaltiParado') * p.penaltiParado
    nota += n(acciones, 'golEncajado') * p.golEncajado
    nota += n(acciones, 'salida') * p.salida
    nota += n(acciones, 'gol') * p.gol
    nota += n(acciones, 'asistencia') * p.asistencia
    if (cero) nota += p.porteriaCero
    // Resto de acciones ofensivas (pase clave, etc.) con sus valores normales.
    for (const [id, v] of Object.entries(cfg.ofensivas) as [AccionId, number][]) {
      if (id !== 'gol' && id !== 'asistencia') nota += n(acciones, id) * v * cfg.multiplicadores.POR.of
    }
  } else {
    const m = cfg.multiplicadores[pos]
    for (const [id, v] of Object.entries(cfg.ofensivas) as [AccionId, number][]) nota += n(acciones, id) * v * m.of
    for (const [id, v] of Object.entries(cfg.defensivas) as [AccionId, number][]) nota += n(acciones, id) * v * m.def
    if (cero) nota += cfg.porteriaCeroCampo[pos]
  }

  for (const id of ['ocasionFallada', 'error', 'perdida'] as const) {
    nota += n(acciones, id) * cfg.negativasPosicion[id][pos]
  }
  for (const [id, v] of Object.entries(cfg.negativasGenerales) as [AccionId, number][]) nota += n(acciones, id) * v

  return clamp(Math.round(nota * 100) / 100, 0, 10)
}

// ─── Evolución de la media (6.2) ──────────────────────────────────────

/** notas: todas las notas de la temporada del jugador, la última al final. */
export function notaPonderada(notas: number[], cfg: Config): number {
  if (notas.length === 0) return cfg.notaBase
  const p = cfg.pesosNotaPonderada
  const ultimo = notas[notas.length - 1]
  const previas = notas.slice(-3, -1)
  const temporada = notas.reduce((s, x) => s + x, 0) / notas.length
  let suma = p.ultimo * ultimo + p.temporada * temporada
  let pesos = p.ultimo + p.temporada
  if (previas.length) {
    suma += p.dosAnteriores * (previas.reduce((s, x) => s + x, 0) / previas.length)
    pesos += p.dosAnteriores
  }
  return suma / pesos
}

export function factorMinutos(minutos: number, cfg: Config): number {
  return Math.min(1, cfg.minutosBase + cfg.minutosPorMinuto * minutos)
}

/**
 * Cambio de media por la evolución (sin premio de MVP).
 * - Partido malo (nota por debajo del umbral): bajada pequeña, que casi no se nota
 *   con medias bajas y se nota más con medias altas. Bajar cuesta más que subir.
 * - Si no: subida según la nota ponderada, que se frena sola al subir la media.
 * No hay techo: nadie deja de poder subir.
 */
export function cambioMedia(np: number, nota: number, mediaActual: number, minutos: number, cfg: Config): number {
  const fm = factorMinutos(minutos, cfg)
  if (nota < cfg.umbralBajada) {
    const bajada = cfg.bajadaPorPunto * (cfg.umbralBajada - nota) * interpolar(cfg.nivelBajada, mediaActual) * fm
    return -Math.min(cfg.topeBajada, bajada)
  }
  const subida = interpolar(cfg.ritmo, np) * interpolar(cfg.multiplicadorMedia, mediaActual) * fm
  return Math.min(cfg.topeSubida, Math.max(0, subida))
}

export function factorPremio(mediaActual: number, cfg: Config): number {
  if (mediaActual <= cfg.premioDesde) return 1
  return Math.max(0, 1 - ((mediaActual - cfg.premioDesde) / cfg.premioRango) * cfg.premioReduccion)
}

// ─── Atributos por acciones (6.3 y 5.2) ───────────────────────────────

// Índices de los huecos: 0 RIT/REF · 1 TIR/EST · 2 PAS/BLO · 3 REG/COL · 4 DEF/SAQ · 5 FIS
type Reparto = { i: number; f: 1 | 's' }[] // f: 1 = principal, 's' = «un poco»

const REPARTO_CAMPO: Partial<Record<AccionId | 'porteriaCero', Reparto>> = {
  gol: [{ i: 1, f: 1 }, { i: 0, f: 's' }],
  asistencia: [{ i: 2, f: 1 }, { i: 3, f: 's' }],
  paseClave: [{ i: 2, f: 1 }],
  ocasionCreada: [{ i: 2, f: 1 }],
  regate: [{ i: 3, f: 1 }, { i: 0, f: 's' }],
  disparoPuerta: [{ i: 1, f: 's' }],
  recuperacion: [{ i: 4, f: 1 }],
  intercepcion: [{ i: 4, f: 1 }],
  entrada: [{ i: 4, f: 1 }],
  despeje: [{ i: 4, f: 1 }, { i: 5, f: 's' }],
  duelo: [{ i: 4, f: 1 }, { i: 5, f: 's' }],
  porteriaCero: [{ i: 4, f: 1 }, { i: 5, f: 's' }],
  ocasionFallada: [{ i: 1, f: 1 }],
  penaltiFallado: [{ i: 1, f: 1 }],
  error: [{ i: 4, f: 1 }],
  perdida: [{ i: 2, f: 1 }, { i: 3, f: 's' }],
  propia: [{ i: 4, f: 1 }],
  penaltiCometido: [{ i: 4, f: 1 }],
  roja: [{ i: 5, f: 's' }, { i: 4, f: 's' }],
}

const REPARTO_PORTERO: Partial<Record<AccionId | 'porteriaCero', Reparto>> = {
  parada: [{ i: 0, f: 1 }, { i: 2, f: 's' }],
  paradaDificil: [{ i: 1, f: 1 }, { i: 0, f: 's' }],
  penaltiParado: [{ i: 1, f: 1 }, { i: 3, f: 1 }],
  porteriaCero: [{ i: 3, f: 1 }, { i: 2, f: 1 }],
  despeje: [{ i: 5, f: 1 }, { i: 3, f: 's' }],
  recuperacion: [{ i: 5, f: 1 }, { i: 3, f: 's' }],
  paseClave: [{ i: 4, f: 1 }],
  asistencia: [{ i: 4, f: 1 }],
  golEncajado: [{ i: 3, f: 's' }],
  error: [{ i: 2, f: 1 }],
  salida: [{ i: 5, f: 1 }, { i: 3, f: 1 }],
  roja: [{ i: 5, f: 's' }],
  perdida: [{ i: 4, f: 1 }],
}

function valorAccion(id: AccionId | 'porteriaCero', pos: Posicion, cfg: Config): number {
  if (pos === 'POR') {
    const p = cfg.portero
    const propios: Partial<Record<AccionId | 'porteriaCero', number>> = {
      parada: p.parada, paradaDificil: p.paradaDificil, penaltiParado: p.penaltiParado,
      porteriaCero: p.porteriaCero, golEncajado: p.golEncajado, salida: p.salida, asistencia: p.asistencia,
    }
    if (propios[id] !== undefined) return propios[id]!
  }
  if (id === 'porteriaCero') return pos === 'POR' ? cfg.portero.porteriaCero : cfg.porteriaCeroCampo[pos]
  if (id in cfg.ofensivas) return cfg.ofensivas[id]! * cfg.multiplicadores[pos].of
  if (id in cfg.defensivas) return cfg.defensivas[id]! * cfg.multiplicadores[pos].def
  if (id === 'ocasionFallada' || id === 'error' || id === 'perdida') return cfg.negativasPosicion[id][pos]
  return cfg.negativasGenerales[id] ?? 0
}

/** Cambio de cada atributo por las acciones del partido (antes de ajustar la media). */
export function cambiosAtributos(
  pos: Posicion, acciones: Acciones, minutos: number, ctx: ContextoPartido, attrs: Atributos, cfg: Config,
): Atributos {
  const bruto: Atributos = [0, 0, 0, 0, 0, 0]
  const reparto = pos === 'POR' ? REPARTO_PORTERO : REPARTO_CAMPO
  const aplicar = (id: AccionId | 'porteriaCero', veces: number) => {
    const r = reparto[id]
    if (!r || !veces) return
    const v = valorAccion(id, pos, cfg) * veces
    for (const { i, f } of r) {
      const factor = f === 1 ? 1 : cfg.atribFactorSecundario
      bruto[i] += v * factor * (1 - (attrs[i] / 99) * 0.5)
    }
  }
  for (const [id, veces] of Object.entries(acciones) as [AccionId, number][]) aplicar(id, veces)
  if (porteriaCero(ctx, minutos)) aplicar('porteriaCero', 1)
  if (minutos >= cfg.atribMinutos.desde) bruto[5] += cfg.atribMinutos.valor
  return bruto.map((b) => clamp(b, -cfg.atribTope, cfg.atribTope)) as Atributos
}

/**
 * Corrector suave: si un atributo se aleja demasiado del perfil esperado para su
 * rol y su media, se acerca un poco. Después se recoloca la media para que no cambie.
 */
export function corrector(attrs: Atributos, pesos: Atributos, cfg: Config): Atributos {
  const w = pesosFraccion(pesos)
  const m = media(attrs, pesos)
  const sumaW2 = w.reduce((s, x) => s + x * x, 0)
  const corregidos = attrs.map((a, i) => {
    const ideal = m + cfg.atributosEscala * (w[i] - sumaW2)
    const dif = a - ideal
    if (Math.abs(dif) <= cfg.correctorUmbral) return a
    return a - Math.sign(dif) * Math.min(cfg.correctorAjuste, Math.abs(dif))
  }) as Atributos
  return llevarMediaA(corregidos, pesos, m, cfg)
}

// ─── Evolución de la media del míster (§20.3) ────────────────────────────────────

/** Sin techo ni factor de minutos. Baja solo con una nota por debajo de 6,0, sin multiplicador. */
export function cambioMediaMister(np: number, nota: number, mediaActual: number, cfg: Config): number {
  const m = cfg.mister
  if (nota < m.umbralBajada) return -Math.min(m.topeBajada, m.bajadaPorPunto * (m.umbralBajada - nota))
  return Math.min(m.topeSubida, Math.max(0, interpolar(cfg.ritmo, np) * interpolar(m.multiplicadorMedia, mediaActual)))
}

/** Media tras cada partido dirigido con la misma nota (para la simulación de Ajustes → Avanzado). */
export function simularMister(nota: number, partidos: number, cfg: Config, inicio = cfg.mediaMin): number[] {
  let mm = inicio
  const notas: number[] = []
  const res: number[] = []
  for (let i = 0; i < partidos; i++) {
    notas.push(nota)
    mm = clamp(mm + cambioMediaMister(notaPonderada(notas, cfg), nota, mm, cfg), cfg.mediaMin, cfg.mediaMax)
    res.push(mm)
  }
  return res
}

// ─── Simulación (Ajustes → Avanzado) ──────────────────────────────────

/** Media tras cada partido jugando siempre con la misma nota, 50 minutos. */
export function simular(nota: number, partidos: number, cfg: Config, opciones?: { inicio?: number; mvp?: boolean }): number[] {
  let m = opciones?.inicio ?? cfg.mediaMin
  const notas: number[] = []
  const res: number[] = []
  for (let i = 0; i < partidos; i++) {
    notas.push(nota)
    const np = notaPonderada(notas, cfg)
    m += cambioMedia(np, nota, m, 50, cfg)
    if (opciones?.mvp) m += cfg.premioMvp * factorPremio(m, cfg)
    m = clamp(m, cfg.mediaMin, cfg.mediaMax)
    res.push(m)
  }
  return res
}
