// Convierte las capas fijas de cada carta (decoración de fondo y marco) en
// imágenes WebP de píxeles (public/cartas/capas/). En Safari, una imagen SVG se
// redibuja entera cada vez que se pinta; una imagen de píxeles no, y así las
// pantallas con muchas cartas van rápidas.
// Uso (con la app construida y `npx vite preview --port 4173` en marcha):
//   node scripts/generar-capas.cjs
// Hace falta Playwright instalado (npm i -g playwright). Solo al cambiar las plantillas.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')
const { mkdirSync, writeFileSync, readdirSync, unlinkSync } = require('node:fs')

const URL = process.env.URL_APP ?? 'http://localhost:4173/juwilata-app/'
const DESTINO = 'public/cartas/capas'
const ESCALA = 2 // 928×1264: nítido hasta en la carta grande de la ficha

;(async () => {
  mkdirSync(DESTINO, { recursive: true })
  for (const f of readdirSync(DESTINO)) if (f.endsWith('.webp')) unlinkSync(`${DESTINO}/${f}`)
  const b = await chromium.launch()
  const p = await b.newPage()
  await p.goto(URL)
  await p.waitForFunction(() => Object.keys(window.__capasJuwilata ?? {}).length >= 18, null, { timeout: 30000 })
  await p.waitForTimeout(1000)
  const capas = await p.evaluate(async (escala) => {
    const out = {}
    for (const [clave, { texto, huella }] of Object.entries(window.__capasJuwilata)) {
      const img = new Image()
      img.src = URL.createObjectURL(new Blob([texto], { type: 'image/svg+xml' }))
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth * escala
      c.height = img.naturalHeight * escala
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      out[clave] = { huella, dato: c.toDataURL('image/webp', 0.9) }
    }
    return out
  }, ESCALA)
  const huellas = {}
  let total = 0
  for (const [clave, { huella, dato }] of Object.entries(capas)) {
    const buf = Buffer.from(dato.split(',')[1], 'base64')
    writeFileSync(`${DESTINO}/${clave}.webp`, buf)
    huellas[clave] = huella
    total += buf.length
  }
  writeFileSync('src/componentes/capasGeneradas.ts',
    `// Generado por scripts/generar-capas.cjs: huella de cada capa convertida en WebP.\nexport const CAPAS_GENERADAS: Record<string, string> = ${JSON.stringify(huellas, null, 2)}\n`)
  console.log(Object.keys(capas).length, 'capas ·', Math.round(total / 1024), 'KB')
  await b.close()
})()
