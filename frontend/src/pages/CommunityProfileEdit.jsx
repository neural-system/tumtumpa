import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import CommunityNav from '../components/community/CommunityNav'
import { errMsg } from '../utils/social'

function ProfileForm() {
  const { t } = useTranslation('community')
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['social', 'me'], queryFn: () => api.get('/social/me').then((r) => r.data) })
  const [f, setF] = useState(null)
  const [msg, setMsg] = useState({ ok: false, error: '' })

  useEffect(() => {
    if (data) setF({ ...data, linksText: (data.links || []).join('\n') })
  }, [data])

  const save = useMutation({
    mutationFn: () => api.put('/social/me', {
      handle: f.handle, display_name: f.display_name, bio: f.bio, city: f.city, contact: f.contact,
      visibility: f.visibility, available_for_hire: f.available_for_hire,
      links: f.linksText.split('\n').map((l) => l.trim()).filter(Boolean),
    }).then((r) => r.data),
    onSuccess: (d) => { setMsg({ ok: true, error: '' }); qc.setQueryData(['social', 'me'], d); qc.invalidateQueries({ queryKey: ['social', 'my-bands'] }) },
    onError: (e) => setMsg({ ok: false, error: errMsg(e, t('common.error')) }),
  })
  if (!f) return <div className="empty">{t('common.loading')}</div>
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  return (
    <form className="card" onSubmit={(e) => { e.preventDefault(); setMsg({ ok: false, error: '' }); save.mutate() }}>
      <h3 className="section-heading">{t('profile.editTitle')}</h3>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
          <label htmlFor="pf-name">{t('profile.displayName')}</label>
          <input id="pf-name" className="input" value={f.display_name} maxLength={80} onChange={set('display_name')} required />
        </div>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
          <label htmlFor="pf-handle">{t('profile.handle')}</label>
          <input id="pf-handle" className="input" value={f.handle} maxLength={30} autoCapitalize="none" spellCheck={false} onChange={set('handle')} required />
        </div>
      </div>
      <p className="acc-hint">{t('profile.handleHint', { handle: f.handle })}</p>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="pf-bio">{t('profile.bio')}</label>
        <textarea id="pf-bio" className="input" rows={3} maxLength={1000} value={f.bio} onChange={set('bio')} />
      </div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}><label htmlFor="pf-city">{t('common.city')}</label><input id="pf-city" className="input" value={f.city} maxLength={80} onChange={set('city')} /></div>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}><label htmlFor="pf-contact">{t('profile.contact')}</label><input id="pf-contact" className="input" value={f.contact} maxLength={160} onChange={set('contact')} /></div>
      </div>
      <p className="acc-hint">{t('profile.contactHint')}</p>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="pf-links">{t('profile.links')}</label>
        <textarea id="pf-links" className="input" rows={3} value={f.linksText} placeholder="https://instagram.com/..." onChange={set('linksText')} />
      </div>
      <label className="ms-check" style={{ marginBottom: 12 }}><input type="checkbox" checked={f.available_for_hire} onChange={set('available_for_hire')} /> {t('profile.availableForHire')}</label>
      <div className="field">
        <label htmlFor="pf-vis">{t('profile.visibility')}</label>
        <select id="pf-vis" className="input" style={{ maxWidth: 320 }} value={f.visibility} onChange={set('visibility')}>
          <option value="private">{t('profile.visibilityPrivate')}</option>
          <option value="public">{t('profile.visibilityPublic')}</option>
        </select>
      </div>
      <p className="acc-hint">{t(f.visibility === 'public' ? 'profile.publicHint' : 'profile.privateHint')}</p>
      {msg.error && <div className="error-text" role="alert">{msg.error}</div>}
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn primary" type="submit" disabled={save.isPending}>{t('common.save')}</button>
        {msg.ok && <span className="meta">{t('profile.saved')}</span>}
        {f.exists && f.visibility === 'public' && <Link className="btn" to={`/m/${f.handle}`}>{t('profile.viewPublic')}</Link>}
      </div>
    </form>
  )
}

function MyBands() {
  const { t } = useTranslation('community')
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['social', 'my-bands'], queryFn: () => api.get('/social/bands/mine').then((r) => r.data) })
  const [creating, setCreating] = useState(false)
  const [f, setF] = useState({ handle: '', name: '', city: '', genre: '', my_instrument: '' })
  const [error, setError] = useState('')
  const refresh = () => qc.invalidateQueries({ queryKey: ['social', 'my-bands'] })
  const create = useMutation({
    mutationFn: () => api.post('/social/bands', f).then((r) => r.data),
    onSuccess: () => { setCreating(false); setF({ handle: '', name: '', city: '', genre: '', my_instrument: '' }); setError(''); refresh() },
    onError: (e) => setError(errMsg(e, t('common.error'))),
  })
  const respond = useMutation({
    mutationFn: ({ handle, accept }) => api.post(`/social/bands/${handle}/invite/respond`, { accept }),
    onSuccess: refresh,
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const bands = data?.bands || []
  const invites = data?.invites || []

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 className="section-heading" style={{ margin: 0 }}>{t('band.myBands')}</h3>
        <button className="btn sm" onClick={() => setCreating(!creating)}>{t('band.create')}</button>
      </div>
      {invites.length > 0 && (
        <div className="cm-thread" style={{ marginTop: 12 }}>
          <div className="kicker">{t('band.invites')}</div>
          {invites.map((b) => (
            <div key={b.handle} className="cm-comment">
              <div className="cm-comment-head"><span className="cm-author">{b.name}</span><span className="meta">@{b.handle}</span></div>
              <div className="row" style={{ marginTop: 6 }}>
                <button className="btn sm primary" onClick={() => respond.mutate({ handle: b.handle, accept: true })}>{t('band.accept')}</button>
                <button className="btn sm" onClick={() => respond.mutate({ handle: b.handle, accept: false })}>{t('band.decline')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {creating && (
        <form style={{ marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}><label htmlFor="nb-name">{t('band.name')}</label><input id="nb-name" className="input" value={f.name} maxLength={80} onChange={set('name')} required /></div>
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}><label htmlFor="nb-handle">{t('band.handle')}</label><input id="nb-handle" className="input" value={f.handle} maxLength={30} autoCapitalize="none" spellCheck={false} onChange={set('handle')} required /></div>
          </div>
          <div className="row" style={{ alignItems: 'flex-end', marginTop: 10 }}>
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}><label htmlFor="nb-city">{t('common.city')}</label><input id="nb-city" className="input" value={f.city} onChange={set('city')} /></div>
            <div className="field" style={{ marginBottom: 0 }}><label htmlFor="nb-genre">{t('band.genre')}</label><input id="nb-genre" className="input" value={f.genre} onChange={set('genre')} /></div>
            <div className="field" style={{ marginBottom: 0 }}><label htmlFor="nb-instr">{t('band.myInstrument')}</label><input id="nb-instr" className="input" value={f.my_instrument} onChange={set('my_instrument')} /></div>
          </div>
          <p className="acc-hint">{t('band.createHint')}</p>
          {error && <div className="error-text" role="alert">{error}</div>}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn primary" type="submit" disabled={create.isPending}>{t('band.create')}</button>
            <button className="btn ghost" type="button" onClick={() => setCreating(false)}>{t('common.cancel')}</button>
          </div>
        </form>
      )}
      {bands.length === 0 && !creating && <div className="meta" style={{ marginTop: 10 }}>{t('band.none')}</div>}
      <div className="cm-column wide" style={{ marginTop: 12 }}>
        {bands.map((b) => (
          <Link key={b.handle} to={`/b/${b.handle}`} className="cm-tile card">
            <span className="cm-avatar band" aria-hidden="true">{b.name.slice(0, 1).toUpperCase()}</span>
            <div className="cm-tile-main">
              <div className="cm-author">{b.name}</div>
              <div className="meta">@{b.handle}{b.city ? ` · ${b.city}` : ''} · {t(`band.roles.${b.role}`)} · {t(`profile.visibility${b.visibility === 'public' ? 'Public' : 'Private'}`)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

/** Meu perfil na comunidade + minhas bandas e convites. */
export default function CommunityProfileEdit() {
  const { t } = useTranslation('community')
  return (
    <>
      <h1 className="page-title">{t('profile.pageTitle')}</h1>
      <div className="page-sub">{t('profile.pageSub')}</div>
      <CommunityNav />
      <div className="cm-column wide">
        <ProfileForm />
        <MyBands />
      </div>
    </>
  )
}
