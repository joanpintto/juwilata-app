// Comprueba que el motor reproduce las tablas de ejemplo de docs/DISENO.md (6.2).
// Uso: node --experimental-strip-types scripts/verificar-motor.ts
import { CONFIG_INICIAL as cfg } from '../src/motor/config.ts'
import { simular, notaPonderada, cambioMedia } from '../src/motor/calculo.ts'

const esperado: Record<string, number[]> = {
  '6.5': [60.6, 62.2, 64.3, 68.2, 71.7, 75.0],
  '7': [60.7, 62.9, 65.6, 70.6, 75.1, 79.0],
  '7.5': [60.9, 63.5, 66.8, 72.7, 77.8, 82.0],
  '8': [61.1, 64.3, 68.2, 75.1, 80.8, 85.0],
  '8.5': [61.4, 65.3, 69.9, 78.0, 83.9, 88.0],
  '9': [61.5, 65.9, 71.2, 80.1, 86.0, 90.0],
}
const idx = [1, 4, 8, 16, 24, 32]
let maxErr = 0
for (const [nota, exp] of Object.entries(esperado)) {
  const r = simular(Number(nota), 32, cfg)
  const got = idx.map((i) => r[i - 1])
  got.forEach((g, k) => (maxErr = Math.max(maxErr, Math.abs(g - exp[k]))))
  console.log(nota.padEnd(4), got.map((g) => g.toFixed(1)).join(' '), ' | doc', exp.join(' '))
}
console.log('MVP x32 con 9:', simular(9, 32, cfg, { mvp: true })[31].toFixed(1), '(doc ~92,4)')
const bajar = (inicio: number, nota: number, p: number) => {
  let m = inicio; const notas: number[] = []
  for (let i = 0; i < p; i++) { notas.push(nota); m += cambioMedia(notaPonderada(notas, cfg), m, 50, cfg) }
  return m.toFixed(1)
}
console.log('90 con 6,5 x16:', bajar(90, 6.5, 16), '(doc 85,8)')
console.log('80 con 5,5 x5:', bajar(80, 5.5, 5), '(doc 78,8)')
console.log('75 con 5 x5:', bajar(75, 5, 5), '(doc 72,5)')
console.log('error máximo tabla:', maxErr.toFixed(2))
