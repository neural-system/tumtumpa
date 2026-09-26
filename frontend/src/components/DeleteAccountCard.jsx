import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'

/** Exclusão da própria conta (LGPD). Pede a senha; o servidor recusa se ainda há
 * assinatura ativa ou se for o último administrador (mensagem já traduzida). */
export default function DeleteAccountCard() {
  const { t } = useTranslation('community')
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const remove = async () => {
    if (!window.confirm(t('account.deleteConfirm'))) return
    setBusy(true)
    setError('')
    try {
      await api.post('/me/delete', { password })
      logout()
      navigate('/')
    } catch (e) {
      setError(e.response?.data?.error || t('common.error'))
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420, marginTop: 18 }}>
      <h3 className="section-heading">{t('account.deleteTitle')}</h3>
      <p className="acc-hint" style={{ marginTop: 0 }}>{t('account.deleteWarning')}</p>
      {!open ? (
        <button className="btn danger" onClick={() => setOpen(true)}>{t('account.deleteTitle')}</button>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (password) remove() }}>
          <div className="field">
            <label htmlFor="del-pw">{t('account.password')}</label>
            <input id="del-pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="error-text" role="alert">{error}</div>}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn danger" type="submit" disabled={busy || !password}>{t('account.delete')}</button>
            <button className="btn ghost" type="button" onClick={() => { setOpen(false); setPassword(''); setError('') }}>{t('common.cancel')}</button>
          </div>
        </form>
      )}
    </div>
  )
}
