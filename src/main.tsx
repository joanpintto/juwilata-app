import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { modoLigero } from './componentes/rendimiento'

if (modoLigero()) document.documentElement.classList.add('ligero')

// Si al abrir la app hay una versión nueva, se recarga enseguida con ella (antes se
// seguía viendo la antigua hasta la siguiente vez). Solo en los primeros segundos,
// para no recargar mientras alguien está rellenando algo.
if ('serviceWorker' in navigator) {
  let recargada = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargada || performance.now() > 20000) return
    recargada = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
