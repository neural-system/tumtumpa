import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '../Modal'
import api from '../../services/api'
import { errMsg } from '../../utils/social'

const REASONS = ['spam', 'golpe', 'assedio', 'conteudo_improprio', 'impersonacao', 'outro']

/** Denúncia de conteúdo (post, comentário, perfil, banda, show ou pedido). */
export default function ReportModal({ kind, targetId, onClose }) {
  const { t } = useTranslation('community')
  const [reason, setReason] = useState('spam')
  const [note, setNote] = useState('')
  const [state, setState] = useState({ busy: false, done: false, error: '' })

  const send = async () => {
    setState({ busy: true, done: false, error: '' })
    try {
      await api.post('/social/report', { kind, target_id: targetId, reason, note })
      setState({ busy: false, done: true, error: '' })
    } catch (e) {
      setState({ busy: false, done: false, error: errMsg(e, t('common.error')) })
    }
  }

  return (
    <Modal title={t('report.title')} onClose={onClose} maxWidth={440}>
      {state.done ? (
        <>
          <p style={{ marginBottom: 16 }}>{t('report.sent')}</p>
          <button className="btn primary" onClick={onClose}>{t('common.close')}</button>
        </>
      ) : (
        <>
          <div className="field">
            <label htmlFor="report-reason">{t('report.reason')}</label>
            <select id="report-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => <option key={r} value={r}>{t(`report.reasons.${r}`)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="report-note">{t('report.note')}</label>
            <textarea id="report-note" className="input" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {state.error && <div className="error-text" role="alert">{state.error}</div>}
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn primary" disabled={state.busy} onClick={send}>{t('report.send')}</button>
            <button className="btn ghost" onClick={onClose}>{t('common.cancel')}</button>
          </div>
        </>
      )}
    </Modal>
  )
}
