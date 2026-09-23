import { useEffect } from 'react'

/** Título + meta description por rota — não existe nenhum mecanismo disso
 * hoje (o <title> do index.html é fixo, nunca trocado por página; ver
 * investigação antes do plano de /palco). Sem dependência nova
 * (react-helmet-async seria overkill pra só isso): grava o valor anterior
 * e restaura no unmount, pra não vazar título/descrição de uma rota pra
 * outra ao navegar entre elas via React Router (SPA, sem reload de página). */
export function useDocumentMeta(title, description) {
  useEffect(() => {
    const prevTitle = document.title
    if (title) document.title = title

    let meta = document.querySelector('meta[name="description"]')
    const prevDescription = meta?.getAttribute('content') ?? null
    const createdMeta = !meta
    if (description) {
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', 'description')
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', description)
    }

    return () => {
      document.title = prevTitle
      if (createdMeta) {
        meta?.remove()
      } else if (prevDescription !== null) {
        meta?.setAttribute('content', prevDescription)
      }
    }
  }, [title, description])
}
