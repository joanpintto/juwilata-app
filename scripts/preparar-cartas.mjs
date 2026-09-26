// Convierte las plantillas aprobadas en plantillas ligeras para la app (public/cartas/*.svg):
// - las 11 de jugador (design/cartas/carta-X.svg → X.svg);
// - las 6 del míster (design/cartas-entrenador/carta-entrenador-X.svg → mister-X.svg).
// Las de design/ no llevan la foto de ejemplo: los originales con la foto de un
// jugador real están en docs/cartas*/, fuera de git.
// - quita el hueco de la foto de ejemplo, el escudo incrustado y los metadatos;
// - saca las tipografías Barlow Condensed a public/fuentes/ (se cargan una sola vez);
// - marca con id los huecos que la app rellena (media, rol, dorsal, tendencia…).
// Uso: npm run cartas   (solo hace falta al cambiar las plantillas)
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'

const ORIGENES = [
  { dir: 'design/cartas', prefijo: /^carta-/, nuevo: '' },
  { dir: 'design/cartas-entrenador', prefijo: /^carta-entrenador-/, nuevo: 'mister-' },
]
const DESTINO = 'public/cartas'
const FUENTES = 'public/fuentes'
mkdirSync(DESTINO, { recursive: true })
mkdirSync(FUENTES, { recursive: true })

let fuentesHechas = false
const fallo = (archivo, que) => {
  throw new Error(`${archivo}: no encuentro ${que}`)
}
const cambiar = (s, archivo, patron, por, que) => {
  if (!patron.test(s)) fallo(archivo, que)
  return s.replace(patron, por)
}

for (const { dir, prefijo, nuevo } of ORIGENES) for (const archivo of readdirSync(dir).filter((f) => f.endsWith('.svg'))) {
  let s = readFileSync(`${dir}/${archivo}`, 'utf8')

  if (!fuentesHechas) {
    for (const m of s.matchAll(/@font-face\{[^}]*font-weight:(\d+);font-style:(\w+);src:url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\)/g)) {
      const nombre = `barlow-condensed-${m[1]}${m[2] === 'italic' ? '-italic' : ''}.woff2`
      writeFileSync(`${FUENTES}/${nombre}`, Buffer.from(m[3], 'base64'))
      console.log('fuente', nombre)
    }
    fuentesHechas = true
  }

  s = s.replace(/<\?xml[^>]*\?>\s*/, '')
  s = s.replace(/<metadata>[\s\S]*?<\/metadata>/, '').replace(/\s*xmlns:c2pa="[^"]*"/, '')
  s = cambiar(s, archivo, /<style>[\s\S]*?<\/style>/, "<style>.bc{font-family:'Barlow Condensed','Arial Narrow',sans-serif}</style>", 'el estilo')
  s = cambiar(s, archivo, /<symbol id="foto"[\s\S]*?<\/symbol>/, '', 'la foto de ejemplo')
  s = cambiar(s, archivo, /(<symbol id="escudo"[^>]*><image[^>]*?)xlink:href="data:[^"]*"/, '$1href="__ESCUDO__"', 'el escudo')
  s = cambiar(
    s, archivo,
    /<use href="#foto" x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"\/>/,
    '<g id="foto" data-x="$1" data-y="$2" data-w="$3" data-h="$4"/>',
    'el hueco de la foto',
  )
  // Cabecera: media, rol, separador, dorsal y píldora de tendencia (en este orden).
  s = s.replace(/<g id="cabecera">([\s\S]*?)<\/g>\s*<text id="nombre"/, (bloque, dentro) => {
    let i = 0
    const ids = ['media', 'sigla', 'dorsal']
    dentro = dentro.replace(/<text /g, (t) => (i < 3 ? `<text id="${ids[i++]}" ` : t))
    dentro = dentro.replace(/<line /, '<line id="separador" ')
    dentro = dentro.replace(/<g transform="translate\(([\d.]+),([\d.]+)\)"><rect /, '<g id="tendencia" transform="translate($1,$2)"><rect ')
    dentro = dentro.replace(/<use href="#escudo"/, '<use id="escudo_uso" href="#escudo"')
    return `<g id="cabecera">${dentro}</g>\n  <text id="nombre"`
  })
  for (const id of ['media', 'sigla', 'dorsal', 'separador', 'tendencia', 'escudo_uso']) {
    if (!s.includes(`id="${id}"`)) fallo(archivo, id)
  }
  // Regla y rombo bajo el nombre.
  s = cambiar(s, archivo, /(<\/text>\s*)<line x1="30" y1="425"/, '$1<line id="regla" x1="30" y1="425"', 'la regla')
  s = cambiar(s, archivo, /<path d="M192,420\.5/, '<path id="rombo" d="M192,420.5', 'el rombo')
  if (/data:image|data:font/.test(s)) fallo(archivo, 'restos incrustados')

  const id = archivo.replace(prefijo, nuevo).replace(/\.svg$/, '')
  writeFileSync(`${DESTINO}/${id}.svg`, s)
  console.log(`${id}.svg`, Math.round(s.length / 1024), 'KB')
}
