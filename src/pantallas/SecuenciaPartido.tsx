import { useEffect, useState, type ReactNode } from 'react'
import { colorNota, conSigno, fechaLarga, fmt1, fmt2, ir, nombreVisible, type Datos } from '../datos'
import { mediaVisible } from '../motor/calculo'
import { Carta, MiniCarta } from '../componentes/Carta'
import { disenoDe } from '../componentes/disenos'
import { MarcadorHero, PodioMvp } from '../componentes/Marcador'
import { confirmar } from '../componentes/dialogos'
import { resumenPartido, type Resumen } from './resumenPartido'

// Secuencia al confirmar un partido (§10): resultado → protagonistas →
// cambios de media → cartas nuevas → MVP. Se avanza tocando la pantalla.

type Etapa = 'resultado' | 'protagonistas' | 'medias' | 'rangos' | 'mvp'

function Confeti() {
  const piezas = Array.from({ length: 36 }, (_, i) => i)
  return (
    <div className="confeti" aria-hidden="true">
      {piezas.map((i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            animationDelay: `${(i % 12) * 0.09}s`,
            animationDuration: `${2.2 + (i % 5) * 0.35}s`,
            background: ['#cca37c', '#f3dcb8', '#7a1329', '#f2f0ec'][i % 4],
            transform: `rotate(${i * 29}deg)`,
          }}
        />
      ))}
    </div>
  )
}

function Protagonistas({ r, datos }: { r: Resumen; datos: Datos }) {
  const mejor = r.filas[0]
  const { config } = datos
  const lista = (titulo: string, icono: string, items: { e: Resumen['filas'][number]['e']; n: number }[]) =>
    items.length > 0 && (
      <div className="prota__grupo">
        <span className="prota__titulo">{icono} {titulo}</span>
        <div className="prota__nombres">
          {items.map(({ e, n }) => (
            <span key={e.jugador.id}>{nombreVisible(e.jugador)}{n > 1 ? ` ×${n}` : ''}</span>
          ))}
        </div>
      </div>
    )
  return (
    <div className="prota">
      {mejor && (
        <div className="prota__mejor">
          <MiniCarta jugador={mejor.e.jugador} media={mejor.paso.mediaDespues} diseno={disenoDe(mejor.e.jugador, mejor.paso.mediaDespues, config, mejor.e.rangosAlcanzados)} config={config} ancho={96} />
          <div>
            <span className="prota__titulo">Mejor nota</span>
            <strong>{nombreVisible(mejor.e.jugador)}</strong>
            <span className="pildora pildora--grande" style={{ background: colorNota(mejor.paso.nota) }}>{fmt1(mejor.paso.nota)}</span>
          </div>
        </div>
      )}
      {lista('Goles', '⚽', r.goleadores)}
      {lista('Asistencias', '🅰', r.asistentes)}
      {r.porteriaCero.length > 0 && lista('Portería a cero', '🧤', r.porteriaCero.map((f) => ({ e: f.e, n: 1 })))}
      {r.tarjetas.length > 0 && (
        <div className="prota__grupo">
          <span className="prota__titulo">Tarjetas</span>
          <div className="prota__nombres">
            {r.tarjetas.map((t) => (
              <span key={t.e.jugador.id}>{'🟨'.repeat(t.amarillas)}{'🟥'.repeat(t.rojas)} {nombreVisible(t.e.jugador)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Medias({ r }: { r: Resumen }) {
  const max = Math.max(0.5, ...r.filas.map((f) => Math.abs(f.paso.cambio)))
  const filas = [...r.filas].sort((a, b) => b.paso.cambio - a.paso.cambio)
  return (
    <ul className="medias">
      {filas.map((f, i) => {
        const c = f.paso.cambio
        return (
          <li key={f.e.jugador.id} style={{ animationDelay: `${i * 70}ms` }}>
            <span className="pildora" style={{ background: colorNota(f.paso.nota) }}>{fmt1(f.paso.nota)}</span>
            <div className="medias__centro">
              <div className="medias__nombre">
                <strong>{nombreVisible(f.e.jugador)}{f.paso.mvp ? ' ⭐' : ''}</strong>
                <span>{mediaVisible(f.paso.mediaAntes)} → {mediaVisible(f.paso.mediaDespues)}</span>
              </div>
              <div className="medias__barra">
                <div className={c >= 0 ? 'sube' : 'baja'} style={{ width: `${(Math.abs(c) / max) * 100}%`, animationDelay: `${300 + i * 70}ms` }} />
              </div>
            </div>
            <span className={`medias__cambio ${c >= 0 ? 'sube' : 'baja'}`}>{conSigno(c, fmt2)}</span>
          </li>
        )
      })}
    </ul>
  )
}

function Rangos({ r, datos }: { r: Resumen; datos: Datos }) {
  const suben = r.filas.filter((f) => f.subeRango)
  return (
    <div className={`rangos rangos--${Math.min(suben.length, 3)}`}>
      {suben.map((f) => (
        <div key={f.e.jugador.id} className="rangos__carta">
          <div className="rayos" aria-hidden="true" />
          <Carta jugador={f.e.jugador} media={f.paso.mediaDespues} atributos={f.paso.atributos} tendencia={f.paso.cambio} diseno={f.subeRango!.id} config={datos.config} />
          <strong>{nombreVisible(f.e.jugador)}</strong>
          <span>{f.subeRango!.de} → <b>{f.subeRango!.a}</b></span>
        </div>
      ))}
    </div>
  )
}

export function SecuenciaPartido({ datos, id, recordarCopia }: { datos: Datos; id: string; recordarCopia: boolean }) {
  const r = resumenPartido(datos, id)
  const [i, setI] = useState(0)

  const etapas: Etapa[] = ['resultado', 'protagonistas', 'medias']
  if (r?.filas.some((f) => f.subeRango)) etapas.push('rangos')
  if (r?.nominados.length || r?.mvp) etapas.push('mvp')
  const etapa = etapas[Math.min(i, etapas.length - 1)]
  const ultima = i >= etapas.length - 1

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!r) return null

  const terminar = async () => {
    ir(`/partido/${id}`, true)
    if (recordarCopia) {
      const exportar = await confirmar({
        titulo: 'Toca copia manual',
        texto: `Llevas ${datos.equipo.partidosDesdeExportacion} partidos sin exportar una copia. Guárdala en Archivos o iCloud por si pierdes el móvil.`,
        aceptar: 'Exportar ahora',
        cancelar: 'Luego',
      })
      if (exportar) ir('/ajustes/copias')
    }
  }
  const avanzar = () => (ultima ? terminar() : setI(i + 1))

  const p = r.partido
  const titulos: Record<Etapa, ReactNode> = {
    resultado: null,
    protagonistas: 'Protagonistas',
    medias: 'Cambios de media',
    rangos: r.filas.filter((f) => f.subeRango).length > 1 ? '¡Cartas nuevas!' : '¡Carta nueva!',
    mvp: r.mvp ? 'MVP de la jornada' : 'Sin MVP esta jornada',
  }

  return (
    <div className={`secuencia secuencia--${etapa} secuencia--${r.resultado}`} onClick={avanzar} role="dialog" aria-label="Resumen del partido">
      <div className="secuencia__cab" onClick={(e) => e.stopPropagation()}>
        <div className="secuencia__puntos">
          {etapas.map((x, k) => (
            <span key={x} className={k <= i ? 'hecho' : ''} />
          ))}
        </div>
        <button className="secuencia__saltar" onClick={terminar}>Saltar</button>
      </div>

      <div className="secuencia__cuerpo" key={etapa}>
        {etapa === 'resultado' && (
          <>
            {r.resultado === 'V' && <Confeti />}
            <p className="secuencia__antetitulo">
              {r.jornada ? `${r.jornada} · ` : ''}{p.competicion}
            </p>
            <p className="secuencia__fecha">{fechaLarga(p.fecha)}</p>
            <MarcadorHero resumen={r} equipo={datos.equipo.nombre} animar />
          </>
        )}
        {etapa !== 'resultado' && <h2 className="secuencia__titulo">{titulos[etapa]}</h2>}
        {etapa === 'protagonistas' && <Protagonistas r={r} datos={datos} />}
        {etapa === 'medias' && <Medias r={r} />}
        {etapa === 'rangos' && <Rangos r={r} datos={datos} />}
        {etapa === 'mvp' && <PodioMvp resumen={r} config={datos.config} />}
      </div>

      <div className="secuencia__pie">
        {ultima ? (
          <button className="boton boton--grande" onClick={(e) => { e.stopPropagation(); terminar() }}>Ver el partido</button>
        ) : (
          <span>Toca para continuar</span>
        )}
      </div>
    </div>
  )
}
