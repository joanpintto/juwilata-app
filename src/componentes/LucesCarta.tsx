import type { ReactNode } from 'react'

/**
 * Carta de la ficha con su luz detrás: un halo suave del color del diseño y
 * varios resplandores que entran por arriba, abajo y los lados y se mueven despacio.
 */
export function LucesCarta({ luz, children }: { luz: string; children: ReactNode }) {
  return (
    <div className="ficha-carta ficha-carta--luz" style={{ ['--luz' as string]: luz }}>
      <div className="luces-carta" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>
      {children}
    </div>
  )
}
