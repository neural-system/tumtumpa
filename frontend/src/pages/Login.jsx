import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import AppLogo from '../components/AppLogo'

export default function Login() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const setSession = useAuthStore((s) => s.setSession)
  const navigate = useNavigate()

  const submit = async () => {
    setBusy(true); setError('')
    try {
      const { data } = await api.post('/auth/login', form)
      setSession(data.token, data.user)
      navigate('/painel')
    } catch (e) {
      setError(e.response?.data?.error || t('login.genericError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <AppLogo />
        <div className="tag">{t('login.tagline')}</div>
        <form onSubmit={(e) => { e.preventDefault(); submit() }}>
          <div className="field">
            <label htmlFor="login-username">{t('login.username')}</label>
            <input id="login-username" className="input" value={form.username} autoFocus
              autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="login-password">{t('login.password')}</label>
            <input id="login-password" className="input" type="password" value={form.password}
              autoComplete="current-password"
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          {error && <div className="error-text" role="alert">{error}</div>}
          <div className="row" style={{ marginTop: 18 }}>
            <button type="submit" className="btn primary" disabled={busy}>
              {t('login.submit')}
            </button>
          </div>
        </form>
        <div className="page-sub" style={{ marginTop: 14 }}>
          {t('login.noAccount')} <Link to="/cadastro">{t('login.createAccount')}</Link>
        </div>
      </div>
    </div>
  )
}
