// Configuración editable: todas las constantes de las fórmulas viven aquí
// y se guardan en la base de datos con número de versión (Ajustes → Avanzado).
// Nada de la lógica del motor debe tener números «a fuego».

export type Posicion = 'POR' | 'DFC' | 'LAT' | 'MED' | 'DEL'
export type Atributos = [number, number, number, number, number, number]

export const POSICIONES: { id: Posicion; nombre: string; plural: string; corto: string }[] = [
  { id: 'POR', nombre: 'Portero', plural: 'Porteros', corto: 'POR' },
  { id: 'DFC', nombre: 'Central', plural: 'Centrales', corto: 'DFC' },
  { id: 'LAT', nombre: 'Lateral', plural: 'Laterales', corto: 'LAT' },
  { id: 'MED', nombre: 'Centrocampista', plural: 'Centrocampistas', corto: 'MED' },
  { id: 'DEL', nombre: 'Delantero', plural: 'Delanteros', corto: 'DEL' },
]

export const ETIQUETAS_CAMPO = ['RIT', 'TIR', 'PAS', 'REG', 'DEF', 'FIS'] as const
export const ETIQUETAS_PORTERO = ['REF', 'EST', 'BLO', 'COL', 'SAQ', 'FIS'] as const

export interface RolDef {
  id: string
  nombre: string
  sigla: string
  posicion: Posicion
  pesos: Atributos // en %, suman 100
}

export type Tabla = { x: number; y: number }[]

export type AccionId =
  | 'gol' | 'asistencia' | 'paseClave' | 'ocasionCreada' | 'disparoPuerta' | 'regate'
  | 'recuperacion' | 'intercepcion' | 'entrada' | 'despeje' | 'duelo'
  | 'ocasionFallada' | 'error' | 'perdida'
  | 'propia' | 'amarilla' | 'roja' | 'penaltiCometido' | 'penaltiFallado'
  | 'parada' | 'paradaDificil' | 'penaltiParado' | 'golEncajado' | 'salida'

export interface Config {
  // Jugadores y atributos
  roles: RolDef[]
  atributosBase: number // 60
  atributosEscala: number // 30
  atributoMin: number
  atributoMax: number

  // Nota del partido
  notaBase: number
  ajusteResultado: { ganarAmplio: number; ganar: number; empate: number; perder: number; perderAmplio: number }
  margenAmplio: number // 3 goles o más
  ofensivas: Partial<Record<AccionId, number>>
  defensivas: Partial<Record<AccionId, number>>
  porteriaCeroCampo: Record<Exclude<Posicion, 'POR'>, number>
  multiplicadores: Record<Posicion, { of: number; def: number }>
  negativasPosicion: Record<'ocasionFallada' | 'error' | 'perdida', Record<Posicion, number>>
  negativasGenerales: Partial<Record<AccionId, number>>
  portero: {
    parada: number; paradaDificil: number; penaltiParado: number; porteriaCero: number
    golEncajado: number; salida: number; gol: number; asistencia: number
  }

  // Evolución de la media
  pesosNotaPonderada: { ultimo: number; dosAnteriores: number; temporada: number }
  ritmo: Tabla // nota ponderada → puntos por partido (subidas)
  multiplicadorMedia: Tabla // media actual → multiplicador de las subidas
  umbralBajada: number // un partido con nota por debajo de esto hace bajar la media
  bajadaPorPunto: number // por cada punto de nota por debajo del umbral
  nivelBajada: Tabla // media actual → cuánto se nota la bajada (poco al principio, más arriba)
  minutosBase: number // 0,65
  minutosPorMinuto: number // 0,02
  topeSubida: number
  topeBajada: number
  mediaMin: number
  mediaMax: number

  // MVP
  premioMvp: number
  premioNominado: number
  premioDesde: number // 75
  premioRango: number // 24
  premioReduccion: number // 0,6

  // Atributos por acciones
  atribTope: number // ±0,4 por atributo y partido
  atribFactorSecundario: number // «y un poco»
  atribMinutos: { desde: number; valor: number } // muchos minutos → FIS
  correctorCada: number
  correctorUmbral: number
  correctorAjuste: number

  // Sugerencias de cartas especiales (§9)
  ifNotaMinima: number // nota ponderada mínima para sugerir IF
  potmPesos: { notas: number; mvps: number; produccion: number }
  potmMinutos: number // fracción de los minutos posibles del mes para no penalizar
  totyPesos: { notas: number; evolucion: number; produccion: number; mvps: number }
  totyPartidos: number // fracción de los partidos del equipo para no penalizar

  // Rangos (umbral inferior)
  rangos: { id: RangoId; nombre: string; desde: number }[]

  // Logros de la casa (editables desde Ajustes → Avanzado)
  logrosCasa: LogroCasa[]

  // Entrenador (§20)
  mister: ConfigMister
}

/** Constantes del míster (§20). Usa además la nota ponderada, el ritmo, los topes de atributos y el corrector de los jugadores. */
export interface ConfigMister {
  // Nota por partido (§20.2)
  notaBase: number // 6,0
  resultado: { victoria: number; empate: number; derrota: number }
  porGol: number // por gol de diferencia
  topeGoles: number // ± tope de la diferencia de goles
  grupoReferencia: number // 6,5: nota media del grupo que no suma ni resta
  grupoFactor: number // 0,8
  porteriaCero: number
  rivalAltoVictoria: number // ganar a uno de la mitad alta
  rivalBajoDerrota: number // perder con uno de la mitad baja (negativo)

  // Evolución (§20.3): sin techo ni factor de minutos
  multiplicadorMedia: Tabla
  umbralBajada: number // 6,0
  bajadaPorPunto: number // 0,5
  topeBajada: number // 1,0
  topeSubida: number // 1,5

  // Atributos (§20.4): ATA · DEF · TÁC · GES · MOT · EXP
  pesos: Atributos
  ataque: number[] // por goles a favor: 0, 1, 2, 3, 4 o más
  defensa: number[] // por goles en contra: 0, 1, 2, 3, 4 o más
  tacticaAlto: { victoria: number; empate: number; derrota: number }
  tacticaBajo: { victoria: number; empate: number; derrota: number }
  gestion: { subeRango: number; sube: number; baja: number }
  motivacion: { victoriaTrasDerrota: number; racha: number; derrotaTrasDerrota: number }
  experiencia: number

  rangos: { id: RangoMisterId; nombre: string; desde: number }[]

  // Sugerencias de sus cartas especiales (§20.5)
  motmNota: number // nota media del mes para sugerir MOTM
  motmPuntos: number // o fracción de los puntos posibles del mes
  totyNota: number // nota media de la temporada para sugerir TOTY (o ser campeón)
}

export type RangoMisterId = 'debutante' | 'consolidado' | 'elite' | 'leyenda'

export const ETIQUETAS_MISTER = ['ATA', 'DEF', 'TÁC', 'GES', 'MOT', 'EXP'] as const

/** Qué se cuenta en un logro de la casa. */
export type MedidaCasa = AccionId | 'titular' | 'suplente' | 'no_convocado' | 'jugado' | 'mvp' | 'sin_tarjeta' | 'nota_alta'

/**
 * Regla de un logro de la casa:
 * - total: suma en la temporada (1 meta, o 3 metas bronce/plata/oro);
 * - racha: N partidos seguidos cumpliendo la medida (repetible);
 * - partido: N o más en un mismo partido (repetible).
 */
export interface LogroCasa {
  id: string
  nombre: string
  descripcion: string
  icono: string
  tipo: 'total' | 'racha' | 'partido'
  medida: MedidaCasa
  metas: number[] // 1 o 3 valores
  porTemporada?: boolean // solo «total»: se reinicia cada temporada (por defecto, sí)
}

export const MEDIDAS_CASA: { id: MedidaCasa; nombre: string; singular: string; plural: string; tipos: LogroCasa['tipo'][] }[] = [
  { id: 'titular', nombre: 'Titularidades', singular: 'titular', plural: 'titulares', tipos: ['total', 'racha'] },
  { id: 'suplente', nombre: 'Suplencias', singular: 'suplencia', plural: 'suplencias', tipos: ['total', 'racha'] },
  { id: 'no_convocado', nombre: 'Sin convocar (las bajas no cuentan)', singular: 'sin convocar', plural: 'sin convocar', tipos: ['total', 'racha'] },
  { id: 'jugado', nombre: 'Partidos jugados', singular: 'partido', plural: 'partidos', tipos: ['total', 'racha'] },
  { id: 'mvp', nombre: 'MVPs', singular: 'MVP', plural: 'MVPs', tipos: ['total', 'racha'] },
  { id: 'sin_tarjeta', nombre: 'Partidos sin tarjeta', singular: 'sin tarjeta', plural: 'sin tarjeta', tipos: ['total', 'racha'] },
  { id: 'nota_alta', nombre: 'Partidos con 7,5 o más', singular: 'notable', plural: 'notables', tipos: ['total', 'racha'] },
]

export const LOGROS_CASA_INICIALES: LogroCasa[] = [
  { id: 'falsas-promesas', nombre: 'Falsas promesas', descripcion: '3 partidos seguidos sin ser convocado (las bajas no cuentan).', icono: 'fantasma', tipo: 'racha', medida: 'no_convocado', metas: [3] },
  { id: 'pata-de-palo', nombre: 'Pata de palo', descripcion: 'Falla 5 ocasiones claras en una temporada.', icono: 'palo', tipo: 'total', medida: 'ocasionFallada', metas: [5] },
  { id: 'soldado-edy', nombre: 'Soldado de Edy', descripcion: 'Titularidades: 5, 10 y 15.', icono: 'soldado', tipo: 'total', medida: 'titular', metas: [5, 10, 15] },
  { id: 'debut-gala', nombre: 'Debut de gala', descripcion: 'Tu primera titularidad.', icono: 'debut', tipo: 'total', medida: 'titular', metas: [1], porTemporada: false },
  { id: 'endrick', nombre: 'Endrick', descripcion: 'Suplencias: 5, 10 y 15.', icono: 'banco', tipo: 'total', medida: 'suplente', metas: [5, 10, 15] },
]

export type RangoId =
  | 'bronce' | 'bronce-brillante' | 'plata' | 'plata-brillante'
  | 'oro' | 'oro-brillante' | 'elite' | 'leyenda'

/** Umbrales de los rangos hasta septiembre de 2026 (se actualizan solos si no se habían tocado). */
export const RANGOS_ANTIGUOS = [60, 65, 70, 75, 80, 85, 90, 95]

export const CONFIG_INICIAL: Config = {
  roles: [
    { id: 'DC', nombre: 'Delantero Posicional', sigla: 'DC', posicion: 'DEL', pesos: [15, 35, 10, 15, 5, 20] },
    { id: 'DM', nombre: 'Delantero Móvil', sigla: 'DM', posicion: 'DEL', pesos: [22, 25, 13, 22, 5, 13] },
    { id: 'MCO', nombre: 'MC Ofensivo', sigla: 'MCO', posicion: 'MED', pesos: [12, 20, 28, 24, 8, 8] },
    { id: 'MC', nombre: 'MC Box to Box', sigla: 'MC', posicion: 'MED', pesos: [18, 13, 20, 15, 16, 18] },
    { id: 'MCD', nombre: 'MC Defensivo', sigla: 'MCD', posicion: 'MED', pesos: [10, 8, 27, 15, 22, 18] },
    { id: 'CAR', nombre: 'Lateral Carrilero', sigla: 'CAR', posicion: 'LAT', pesos: [26, 14, 19, 20, 12, 9] },
    { id: 'LAT', nombre: 'Lateral Defensivo', sigla: 'LAT', posicion: 'LAT', pesos: [21, 10, 18, 11, 23, 17] },
    { id: 'DFS', nombre: 'Central de Salida', sigla: 'DFS', posicion: 'DFC', pesos: [9, 5, 27, 10, 34, 15] },
    { id: 'DFC', nombre: 'Central de Contención', sigla: 'DFC', posicion: 'DFC', pesos: [8, 3, 12, 4, 48, 25] },
    { id: 'POC', nombre: 'Portero Clásico', sigla: 'POR', posicion: 'POR', pesos: [25, 22, 20, 18, 5, 10] },
    { id: 'POL', nombre: 'Portero Líbero', sigla: 'POR', posicion: 'POR', pesos: [20, 15, 13, 20, 20, 12] },
  ],
  atributosBase: 60,
  atributosEscala: 30,
  atributoMin: 1,
  atributoMax: 99,

  notaBase: 6.0,
  ajusteResultado: { ganarAmplio: 0.35, ganar: 0.2, empate: 0, perder: -0.2, perderAmplio: -0.35 },
  margenAmplio: 3,
  ofensivas: { gol: 1.2, asistencia: 0.8, paseClave: 0.25, ocasionCreada: 0.2, disparoPuerta: 0.15, regate: 0.15 },
  defensivas: { recuperacion: 0.15, intercepcion: 0.15, entrada: 0.15, despeje: 0.1, duelo: 0.1 },
  porteriaCeroCampo: { DFC: 0.5, LAT: 0.4, MED: 0.3, DEL: 0.2 },
  multiplicadores: {
    DEL: { of: 1.0, def: 1.35 },
    MED: { of: 1.15, def: 1.1 },
    LAT: { of: 1.2, def: 1.2 },
    DFC: { of: 1.35, def: 1.0 },
    POR: { of: 1.0, def: 1.0 },
  },
  negativasPosicion: {
    ocasionFallada: { DEL: -1.0, MED: -0.87, LAT: -0.83, DFC: -0.7, POR: -0.7 },
    error: { DEL: -0.8, MED: -0.9, LAT: -1.0, DFC: -1.1, POR: -1.1 },
    perdida: { DEL: -0.3, MED: -0.35, LAT: -0.4, DFC: -0.45, POR: -0.45 },
  },
  negativasGenerales: { propia: -1.5, amarilla: -0.5, roja: -2.0, penaltiCometido: -0.6, penaltiFallado: -0.6 },
  portero: {
    parada: 0.25, paradaDificil: 0.5, penaltiParado: 1.5, porteriaCero: 1.0,
    golEncajado: -0.3, salida: 0.15, gol: 2.5, asistencia: 1.5,
  },

  pesosNotaPonderada: { ultimo: 0.5, dosAnteriores: 0.3, temporada: 0.2 },
  // Calibrado para que, empezando en 60 y jugando 32 partidos con la misma nota,
  // un 6,5 acabe en ~75 y un 9 en ~90 (sin MVPs). Con un 6 la media se mantiene.
  ritmo: [
    { x: 6.0, y: 0 }, { x: 6.5, y: 0.4 }, { x: 7.0, y: 0.53 }, { x: 7.5, y: 0.65 },
    { x: 8.0, y: 0.8 }, { x: 8.5, y: 0.98 }, { x: 9.0, y: 1.14 },
  ],
  multiplicadorMedia: [
    { x: 60, y: 1.4 }, { x: 65, y: 1.25 }, { x: 70, y: 1.1 }, { x: 75, y: 1.0 }, { x: 80, y: 0.8 },
    { x: 85, y: 0.55 }, { x: 90, y: 0.35 }, { x: 95, y: 0.2 }, { x: 99, y: 0.1 },
  ],
  umbralBajada: 5.5,
  bajadaPorPunto: 0.45,
  nivelBajada: [
    { x: 60, y: 0.1 }, { x: 70, y: 0.3 }, { x: 80, y: 0.6 }, { x: 85, y: 0.85 }, { x: 90, y: 1.0 },
  ],
  minutosBase: 0.65,
  minutosPorMinuto: 0.02,
  topeSubida: 1.5,
  topeBajada: 0.8,
  mediaMin: 60,
  mediaMax: 99,

  premioMvp: 0.2,
  premioNominado: 0.1,
  premioDesde: 75,
  premioRango: 24,
  premioReduccion: 0.6,

  atribTope: 0.4,
  atribFactorSecundario: 0.35,
  atribMinutos: { desde: 40, valor: 0.05 },
  correctorCada: 5,
  correctorUmbral: 4.5,
  correctorAjuste: 0.4,

  ifNotaMinima: 8.0,
  potmPesos: { notas: 0.6, mvps: 0.5, produccion: 0.1 },
  potmMinutos: 0.75,
  totyPesos: { notas: 0.5, evolucion: 0.2, produccion: 0.2, mvps: 0.1 },
  totyPartidos: 0.5,

  // Cada vez más separados: Plata Brillante es donde empieza a apretar la curva,
  // Élite es excepcional y Leyenda, cosa de varias temporadas.
  rangos: [
    { id: 'bronce', nombre: 'Bronce', desde: 60 },
    { id: 'bronce-brillante', nombre: 'Bronce Brillante', desde: 63 },
    { id: 'plata', nombre: 'Plata', desde: 66 },
    { id: 'plata-brillante', nombre: 'Plata Brillante', desde: 70 },
    { id: 'oro', nombre: 'Oro', desde: 75 },
    { id: 'oro-brillante', nombre: 'Oro Brillante', desde: 81 },
    { id: 'elite', nombre: 'Élite', desde: 90 },
    { id: 'leyenda', nombre: 'Leyenda', desde: 95 },
  ],

  logrosCasa: LOGROS_CASA_INICIALES,

  mister: {
    notaBase: 6.0,
    resultado: { victoria: 1.2, empate: 0.2, derrota: -0.8 },
    porGol: 0.15,
    topeGoles: 0.6,
    grupoReferencia: 6.5,
    grupoFactor: 0.8,
    porteriaCero: 0.3,
    rivalAltoVictoria: 0.3,
    rivalBajoDerrota: -0.3,

    // Igual que el de los jugadores hasta 85 y más duro después: máximo natural ~94-95.
    multiplicadorMedia: [
      { x: 60, y: 1.4 }, { x: 65, y: 1.25 }, { x: 70, y: 1.1 }, { x: 75, y: 1.0 }, { x: 80, y: 0.8 },
      { x: 85, y: 0.55 }, { x: 90, y: 0.3 }, { x: 92, y: 0.15 }, { x: 94, y: 0.05 }, { x: 96, y: 0 },
    ],
    umbralBajada: 6.0,
    bajadaPorPunto: 0.5,
    topeBajada: 1.0,
    topeSubida: 1.5,

    pesos: [18, 18, 20, 16, 16, 12],
    ataque: [-0.2, 0, 0.15, 0.25, 0.35],
    defensa: [0.35, 0.2, 0, -0.15, -0.25],
    tacticaAlto: { victoria: 0.35, empate: 0.1, derrota: -0.1 },
    tacticaBajo: { victoria: 0.15, empate: -0.05, derrota: -0.3 },
    gestion: { subeRango: 0.2, sube: 0.05, baja: -0.05 },
    motivacion: { victoriaTrasDerrota: 0.35, racha: 0.15, derrotaTrasDerrota: -0.15 },
    experiencia: 0.2,

    rangos: [
      { id: 'debutante', nombre: 'Debutante', desde: 60 },
      { id: 'consolidado', nombre: 'Consolidado', desde: 70 },
      { id: 'elite', nombre: 'Élite', desde: 80 },
      { id: 'leyenda', nombre: 'Leyenda del banquillo', desde: 90 },
    ],

    motmNota: 7.5,
    motmPuntos: 0.75,
    totyNota: 7.5,
  },
}

export interface AccionDef {
  id: AccionId
  nombre: string
  icono: string
  grupo: 'ofensiva' | 'defensiva' | 'negativa' | 'portero'
  soloPortero?: boolean
}

// Catálogo de acciones que se pueden registrar en un partido (solo nombres e iconos).
export const ACCIONES: AccionDef[] = [
  { id: 'gol', nombre: 'Gol', icono: '⚽', grupo: 'ofensiva' },
  { id: 'asistencia', nombre: 'Asistencia', icono: '🅰', grupo: 'ofensiva' },
  { id: 'paseClave', nombre: 'Pase clave', icono: '🔑', grupo: 'ofensiva' },
  { id: 'ocasionCreada', nombre: 'Ocasión creada', icono: '✨', grupo: 'ofensiva' },
  { id: 'disparoPuerta', nombre: 'Disparo a puerta', icono: '🎯', grupo: 'ofensiva' },
  { id: 'regate', nombre: 'Regate', icono: '🌀', grupo: 'ofensiva' },
  { id: 'recuperacion', nombre: 'Recuperación', icono: '🧲', grupo: 'defensiva' },
  { id: 'intercepcion', nombre: 'Intercepción', icono: '✋', grupo: 'defensiva' },
  { id: 'entrada', nombre: 'Entrada ganada', icono: '🦵', grupo: 'defensiva' },
  { id: 'despeje', nombre: 'Despeje', icono: '🧹', grupo: 'defensiva' },
  { id: 'duelo', nombre: 'Duelo ganado', icono: '💪', grupo: 'defensiva' },
  { id: 'parada', nombre: 'Parada', icono: '🧤', grupo: 'portero', soloPortero: true },
  { id: 'paradaDificil', nombre: 'Parada difícil', icono: '🦘', grupo: 'portero', soloPortero: true },
  { id: 'penaltiParado', nombre: 'Penalti parado', icono: '🛑', grupo: 'portero', soloPortero: true },
  { id: 'salida', nombre: 'Salida ganada', icono: '🚀', grupo: 'portero', soloPortero: true },
  { id: 'golEncajado', nombre: 'Gol encajado', icono: '🥅', grupo: 'portero', soloPortero: true },
  { id: 'ocasionFallada', nombre: 'Ocasión clara fallada', icono: '😬', grupo: 'negativa' },
  { id: 'error', nombre: 'Error', icono: '⚠️', grupo: 'negativa' },
  { id: 'perdida', nombre: 'Pérdida peligrosa', icono: '💨', grupo: 'negativa' },
  { id: 'propia', nombre: 'Gol en propia', icono: '🙈', grupo: 'negativa' },
  { id: 'amarilla', nombre: 'Amarilla', icono: '🟨', grupo: 'negativa' },
  { id: 'roja', nombre: 'Roja', icono: '🟥', grupo: 'negativa' },
  { id: 'penaltiCometido', nombre: 'Penalti cometido', icono: '🚫', grupo: 'negativa' },
  { id: 'penaltiFallado', nombre: 'Penalti fallado', icono: '❌', grupo: 'negativa' },
]

export const ACCIONES_RAPIDAS: AccionId[] = ['gol', 'asistencia', 'amarilla']

export function rolPorId(cfg: Config, id: string): RolDef {
  return cfg.roles.find((r) => r.id === id) ?? cfg.roles[0]
}

export function rolesDePosicion(cfg: Config, pos: Posicion): RolDef[] {
  return cfg.roles.filter((r) => r.posicion === pos)
}

export function nombrePosicion(pos: Posicion): string {
  return POSICIONES.find((p) => p.id === pos)?.nombre ?? pos
}

export function etiquetas(pos: Posicion): readonly string[] {
  return pos === 'POR' ? ETIQUETAS_PORTERO : ETIQUETAS_CAMPO
}
