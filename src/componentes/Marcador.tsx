import { useEffect, useState } from 'react'
import type { Config } from '../motor/config'
import { fmt1, nombreVisible } from '../datos'
import { Carta } from './Carta'
import { disenoDe } from './disenos'
import { TEXTO_RESULTADO, iniciales, type FilaResumen, type Resumen } from '../pantallas/resumenPartido'

const ESCUDO = `${import.meta.env.BASE_URL}escudo.png`

/** Número que cuenta desde 0 hasta su valor. */
export function Cuenta({ valor, ms = 900, retraso = 0 }: { valor: number; ms?: number; retraso?: number }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let marco = 0
    const inicio = performance.now() + retraso
    const paso = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - inicio) / ms))
      setV(Math.round(valor * (1 - Math.pow(1 - k, 3))))
      if (k < 1) marco = requestAnimationFrame(paso)
    }
    marco = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(marco)
  }, [valor, ms, retraso])
  return <>{v}</>
}

function Equipo({ nombre, nuestro }: { nombre: string; nuestro: boolean }) {
  return (
    <div className="hero__equipo">
      {nuestro ? (
        <img src={ESCUDO} alt="" className="hero__escudo" />
      ) : (
        <span className="hero__rival" aria-hidden="true">{iniciales(nombre)}</span>
      )}
      <span className="hero__nombre">{nombre}</span>
    </div>
  )
}

/** Marcador grande: escudos, goles y el resultado (victoria, empate o derrota). */
export function MarcadorHero({ resumen, equipo, animar = false }: { resumen: Resumen; equipo: string; animar?: boolean }) {
  const p = resumen.partido
  const izq = p.local ? { nombre: equipo, goles: p.golesFavor, nuestro: true } : { nombre: p.rival, goles: p.golesContra, nuestro: false }
  const der = p.local ? { nombre: p.rival, goles: p.golesContra, nuestro: false } : { nombre: equipo, goles: p.golesFavor, nuestro: true }
  return (
    <div className={`hero hero--${resumen.resultado}`}>
      <div className="hero__fila">
        <Equipo nombre={izq.nombre} nuestro={izq.nuestro} />
        <div className="hero__goles">
          <span>{animar ? <Cuenta valor={izq.goles} retraso={250} /> : izq.goles}</span>
          <span className="hero__guion">–</span>
          <span>{animar ? <Cuenta valor={der.goles} retraso={250} /> : der.goles}</span>
        </div>
        <Equipo nombre={der.nombre} nuestro={der.nuestro} />
      </div>
      <span className={`hero__resultado hero__resultado--${resumen.resultado}`}>{TEXTO_RESULTADO[resumen.resultado]}</span>
    </div>
  )
}

/** Podio del MVP: su carta en el centro y los otros dos nominados a los lados. */
export function PodioMvp({ resumen, config, compacto = false }: { resumen: Resumen; config: Config; compacto?: boolean }) {
  const carta = (f: FilaResumen, clase: string) => (
    <div className={`podio__hueco ${clase}`} key={f.e.jugador.id}>
      <Carta
        jugador={f.e.jugador}
        media={f.paso.mediaDespues}
        atributos={f.paso.atributos}
        tendencia={f.paso.cambio}
        diseno={disenoDe(f.e.jugador, f.paso.mediaDespues, config, f.e.rangosAlcanzados)}
        config={config}
      />
      <div className="podio__texto">
        <strong>{nombreVisible(f.e.jugador)}</strong>
        <span>Nota {fmt1(f.paso.nota)}</span>
      </div>
    </div>
  )
  if (!resumen.mvp) {
    return <div className="podio podio--sin-mvp">{resumen.nominados.map((f) => carta(f, 'podio__igual'))}</div>
  }
  const [a, b] = resumen.nominados
  return (
    <div className={`podio ${compacto ? 'podio--compacto' : ''}`}>
      {a && carta(a, 'podio__lado podio__lado--izq')}
      <div className="podio__centro">
        <div className="rayos" aria-hidden="true" />
        {carta(resumen.mvp, 'podio__mvp')}
        <span className="podio__sello">MVP</span>
      </div>
      {b && carta(b, 'podio__lado podio__lado--der')}
    </div>
  )
}
