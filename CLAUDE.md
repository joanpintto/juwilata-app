# Juwilata United — instrucciones para el agente

- La fuente de verdad del producto es `docs/DISENO.md`. Léelo antes de cualquier cambio y no contradigas una decisión cerrada sin que el usuario lo pida explícitamente.
- Si el usuario cambia una decisión, actualiza `docs/DISENO.md` en el mismo cambio.
- El usuario no programa: explica los cambios en lenguaje sencillo y en español.
- App PWA local (IndexedDB con Dexie). Única excepción, decidida por el usuario en la Fase 4: **compartir con el equipo** publica una copia en Supabase (`docs/supabase.sql`, `src/compartir/`), solo si el administrador lo activa. No añadas otros servicios externos ni envíes datos fuera del dispositivo por otras vías. Nunca pongas en el repositorio la secret key de Supabase.
- Stack: React + TypeScript + Vite + vite-plugin-pwa. Se publica en GitHub Pages con `base: '/juwilata-app/'`.
- Dispositivo principal: iPhone (Safari). Prueba el diseño a 390 px de ancho, modo oscuro siempre.
- Identidad: fondo #161617, dorado #CCA37C, granate #550B1C; Barlow Condensed para números y Work Sans para texto.
- Constantes de fórmulas: nunca «a fuego» en la lógica; van en la configuración editable (Ajustes → Avanzado).
