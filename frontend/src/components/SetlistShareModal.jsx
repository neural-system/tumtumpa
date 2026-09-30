import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import Modal from './Modal'

/** QR code + link do compartilhamento público do setlist (SetlistDetail.jsx,
 * botão "Compartilhar publicamente") — aponta pra `/setlist/:token`
 * (PublicSetlistView.jsx, sem login). Mesmo padrão visual de
 * FeedbackQRModal.jsx, mas sem poll: aqui não há "música tocando agora" pra
 * acompanhar, só o link em si. */
export default function SetlistShareModal({ token, onDeactivate, deactivating, onClose }) {
  const { t } = useTranslation('setlistDetail')
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/setlist/${token}`

  const copyLink = () => {
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal title={t('publicShareModalTitle')} onClose={onClose} maxWidth={380}>
      <p className="page-sub" style={{ marginTop: 0, textAlign: 'center' }}>{t('publicShareModalHint')}</p>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 16, background: '#fff', borderRadius: 12 }}>
        <QRCodeSVG value={url} size={240} />
      </div>
      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <input className="input" readOnly value={url} style={{ flex: 1, fontSize: 12.5 }}
          onFocus={(e) => e.target.select()} />
        <button className="btn" onClick={copyLink}>{copied ? t('feedbackLinkCopied') : t('feedbackCopyLink')}</button>
      </div>
      <div className="row" style={{ marginTop: 16, justifyContent: 'space-between' }}>
        <button className="btn danger" disabled={deactivating} onClick={onDeactivate}>{t('deactivatePublicShare')}</button>
        <button className="btn" onClick={onClose}>{t('close')}</button>
      </div>
    </Modal>
  )
}
