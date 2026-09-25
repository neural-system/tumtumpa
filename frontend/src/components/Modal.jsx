import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

/** Modal genérico — não existia nenhum componente de modal/diálogo no
 * projeto até agora (checado antes de construir este). Fecha com Esc ou
 * clique no overlay; título + botão de fechar seguem o mesmo `.card`/`.btn`
 * do resto do design system (var(--bg-raise)/--stroke, igual ao
 * .chord-hover-card, o "painel flutuante" mais próximo que já existia). */
export default function Modal({ title, onClose, children, maxWidth = 520 }) {
  const { t } = useTranslation('common')
  const titleId = useId()
  const panelRef = useRef(null)
  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  // foco entra no diálogo ao abrir e volta pra quem abriu ao fechar (leitor de
  // tela e teclado não ficam "perdidos" atrás do overlay)
  useEffect(() => {
    const previous = document.activeElement
    panelRef.current?.focus()
    return () => { if (previous && previous.focus) previous.focus() }
  }, [])

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-panel" style={{ maxWidth }} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panelRef} tabIndex={-1}>
        <div className="modal-header">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('a11y.close')}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
