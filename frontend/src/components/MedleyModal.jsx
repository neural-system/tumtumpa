import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from './Modal'

/** Modal de criação (E gestão) de medley (SetlistDetail.jsx) — lista só as
 * músicas já presentes NESTE setlist (não busca na biblioteca inteira, ao
 * contrário de SongPicker.jsx). Escolha por clique-na-ordem: cada clique numa
 * linha ainda não escolhida entra no fim de `order` (índices originais em
 * `items`, na ordem de execução desejada); clicar de novo remove — sem
 * precisar de drag-and-drop pra definir a ordem. `isEligible` decide quais
 * linhas ficam clicáveis (mesmo filtro do botão "Criar medley": modo
 * rolagem, ainda fora de outro medley — ver SetlistDetail.jsx::isEligibleForMedley).
 *
 * `medleyGroups`/`onUngroup`: além de criar, o mesmo modal lista os medleys
 * já existentes no setlist com um botão "Desfazer" cada — pedido explícito
 * do usuário pra não precisar sair do modal pra desfazer um agrupamento
 * (o botão ✂ por linha na lista principal continua existindo também, esse
 * aqui é só mais um lugar pra fazer a mesma ação). O modal fica aberto
 * depois de desfazer — `medleyGroups` vem de `items` (prop), que atualiza
 * sozinho quando o pai re-renderiza após o save. Quando há medleys
 * existentes, as duas listas (medleys atuais / criar novo) ficam lado a
 * lado (`flex-wrap: wrap` empilha em telas estreitas) — pedido explícito
 * do usuário, pra comparar/gerenciar sem rolar a página inteira. */
export default function MedleyModal({ items, isEligible, medleyGroups, onUngroup, onConfirm, onClose }) {
  const { t } = useTranslation('setlistDetail')
  const [order, setOrder] = useState([])

  const toggle = (idx) => setOrder((prev) => (
    prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
  ))

  const reasonFor = (item) => {
    if (!item.song) return t('medleyReasonNotFound')
    if (item.medley_id) return t('medleyReasonAlreadyGrouped')
    if ((item.song.modo_execucao || 'rolagem') !== 'rolagem') return t('medleyReasonKaraokeMode')
    return null
  }

  const hasGroups = medleyGroups.length > 0

  const createColumn = (
    <div style={{ minWidth: 0, flex: '1 1 320px' }}>
      {hasGroups && <h4 className="modal-column-title">{t('createMedleyNewSection')}</h4>}
      <p className="page-sub" style={{ marginTop: 0 }}>{t('medleyModalHint')}</p>
      <div className="modal-scroll-list">
        {items.map((item, idx) => {
          const eligible = isEligible(item)
          const reason = eligible ? null : reasonFor(item)
          const chosenAt = order.indexOf(idx)
          return (
            <div key={item.ref + idx}
              onClick={() => eligible && toggle(idx)}
              className="row medley-pick-row"
              style={{
                cursor: eligible ? 'pointer' : 'default',
                opacity: eligible ? 1 : 0.45,
                background: chosenAt >= 0 ? 'var(--accent-soft)' : 'transparent',
              }}>
              <span className="chip" style={{ minWidth: 20, textAlign: 'center', flexShrink: 0 }}>
                {chosenAt >= 0 ? chosenAt + 1 : idx + 1}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="title truncate">
                  {item.song?.titulo || item.ref}
                </div>
                <div className="meta truncate">
                  {item.song?.interprete || ''}
                  {reason && <span style={{ marginLeft: 6 }}>· {reason}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <Modal title={t('createMedley')} onClose={onClose} maxWidth={hasGroups ? 860 : 560}>
      {hasGroups ? (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: '1 1 280px' }}>
            <h4 className="modal-column-title">{t('currentMedleysTitle')}</h4>
            <div className="modal-scroll-list">
              {medleyGroups.map((group) => (
                <div key={group.medleyId} className="row medley-group-row">
                  <div className="truncate" style={{ minWidth: 0, flex: 1 }}>
                    🔗 {group.members.map((m) => m.song?.titulo || m.ref).join(', ')}
                  </div>
                  <button type="button" className="btn ghost" style={{ flexShrink: 0 }}
                    onClick={() => onUngroup(group.medleyId)}>
                    {t('ungroupMedley')}
                  </button>
                </div>
              ))}
            </div>
          </div>
          {createColumn}
        </div>
      ) : createColumn}
      <div className="row end" style={{ marginTop: 16 }}>
        <button className="btn ghost" onClick={onClose}>{t('cancel')}</button>
        <button className="btn primary" disabled={order.length < 2} onClick={() => onConfirm(order)}>
          {t('confirmMedley')}
        </button>
      </div>
    </Modal>
  )
}
