// Comprueba que el motor cumple las metas de docs/DISENO.md (§6.2).
// Uso: npm run verificar
import { CONFIG_INICIAL as cfg } from '../src/motor/config.ts'
import { simular, cambioMedia } from '../src/motor/calculo.ts'

const metas: [number, number][] = [[6.5, 75], [7, 79], [7.5, 82], [8, 85], [8.5, 88], [9, 90]]
const idx = [1, 4, 8, 16, 24, 32]
let ok = true
console.log('Nota | partido 1, 4, 8, 16, 24, 32 (empezando en 60, sin MVPs)')
for (const [nota, meta] of metas) {
  const r = simular(nota, 32, cfg)
  const final = r[31]
  if (Math.abs(final - meta) > 0.3) ok = false
  console.log(String(nota).padEnd(4), idx.map((i) => r[i - 1].toFixed(1)).join(' '), `| meta ${meta}`)
}
console.log('Con MVP en los 32 partidos, un 9 acaba en', simular(9, 32, cfg, { mvp: true })[31].toFixed(1))
console.log('\nUn partido completo según la media:')
console.log('Media | nota 4    5    5,5   6    7,5   9')
for (const m of [62, 70, 78, 86, 92]) {
  console.log(String(m).padEnd(5), [4, 5, 5.5, 6, 7.5, 9].map((n) => cambioMedia(n, n, m, 50, cfg).toFixed(2).padStart(5)).join(' '))
}
const serie = (ini: number, notas: number[]) => notas.reduce((m, n) => m + cambioMedia(n, n, m, 50, cfg), ini).toFixed(1)
console.log('\nTres partidos seguidos de 4,5:')
for (const m of [62, 70, 78, 86, 92]) console.log(`  media ${m} → ${serie(m, [4.5, 4.5, 4.5])}`)
const caida86 = 86 - Number(serie(86, [4.5, 4.5, 4.5]))
if (caida86 < 1 || caida86 > 1.5) ok = false
console.log('Media 60 con 32 partidos de 6:', simular(6, 32, cfg)[31].toFixed(1))
if (!ok) { console.error('\n✗ Alguna meta no se cumple'); process.exit(1) }
console.log('\n✓ Metas cumplidas')
