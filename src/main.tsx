import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { modoLigero } from './componentes/rendimiento'

if (modoLigero()) document.documentElement.classList.add('ligero')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
