import type { ReactNode } from 'react'

// Diálogos de confirmación y avisos (sin los cuadros nativos del navegador).
export interface PeticionDialogo {
  titulo: string
  texto?: ReactNode
  aceptar?: string
  cancelar?: string | null
  peligro?: boolean
  resolver: (ok: boolean) => void
}

let abrirDialogo: ((p: PeticionDialogo) => void) | null = null
let mostrarAviso: ((t: string) => void) | null = null

export function confirmar(opciones: Omit<PeticionDialogo, 'resolver'>): Promise<boolean> {
  return new Promise((resolver) => {
    if (!abrirDialogo) return resolver(window.confirm(opciones.titulo))
    abrirDialogo({ ...opciones, resolver })
  })
}

export function avisar(texto: string) {
  mostrarAviso?.(texto)
}

export function registrarDialogos(abrir: (p: PeticionDialogo) => void, aviso: (t: string) => void) {
  abrirDialogo = abrir
  mostrarAviso = aviso
  return () => {
    abrirDialogo = null
    mostrarAviso = null
  }
}
