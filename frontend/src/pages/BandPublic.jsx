import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import AutoShell from '../components/community/AutoShell'
import FeedList from '../components/community/FeedList'
import FollowButton from '../components/community/FollowButton'
import ReportModal from '../components/community/ReportModal'
import { EventRow } from './CommunityAgenda'
import { errMsg, localInputToIso, safeHref } from '../utils/social'

function ManagePanel({ band, onChanged }) {
  const { t } = useTranslation('community')
  const navigate = useNavigate()
  const [f, setF] = useState({ name: band.name, bio: band.bio, city: band.city, genre: band.genre, contact: band.contact, linksText: (band.links || []).join('\n') })
  const [invite, setInvite] = useState({ target: '', role: 'member', instrument: '' })
  const [msg, setMsg] = useState({ ok: '', error: '' })
  const fail = (e) => setMsg({ ok: '', error: errMsg(e, t('common.error')) })

  const save = useMutation({
    mutationFn: (extra = {}) => api.put(`/social/bands/${band.handle}`, {
      name: f.name, bio: f.bio, city: f.city, genre: f.genre, contact: f.contact,
      links: f.linksText.split('\n').map((l) => l.trim()).filter(Boolean), ...extra,
    }),
    onSuccess: () => { setMsg({ ok: t('profile.saved'), error: '' }); onChanged() },
    onError: fail,
  })
  const inviteMut = useMutation({
    mutationFn: () => api.post(`/social/bands/${band.handle}/invite`, invite),
    onSuccess: () => { setInvite({ target: '', role: 'member', instrument: '' }); setMsg({ ok: t('band.inviteSent'), error: '' }); onChanged() },
    onError: fail,
  })
  const setMember = useMutation({
    mutationFn: (body) => api.put(`/social/bands/${band.handle}/members`, body),
    onSuccess: () => { setMsg({ ok: '', error: '' }); onChanged() },
    onError: fail,
  })
  const removeMember = useMutation({
    mutationFn: (target) => api.post(`/social/bands/${band.handle}/members/remove`, { target }),
    onSuccess: () => { setMsg({ ok: '', error: '' }); onChanged() },
    onError: fail,
  })
  const del = useMutation({ mutationFn: () => api.delete(`/social/bands/${band.handle}`), onSuccess: () => navigate('/comunidade/perfil') })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const canPublish = band.members_count >= 2

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h3 className="section-heading">{t('band.manage')}</h3>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}><label htmlFor="bm-name">{t('band.name')}</label><input id="bm-name" className="input" value={f.name} maxLength={80} onChange={set('name')} required /></div>
          <div className="field" style={{ marginBottom: 0 }}><label htmlFor="bm-city">{t('common.city')}</label><input id="bm-city" className="input" value={f.city} onChange={set('city')} /></div>
          <div className="field" style={{ marginBottom: 0 }}><label htmlFor="bm-genre">{t('band.genre')}</label><input id="bm-genre" className="input" value={f.genre} onChange={set('genre')} /></div>
        </div>
        <div className="field" style={{ marginTop: 12 }}><label htmlFor="bm-bio">{t('band.bio')}</label><textarea id="bm-bio" className="input" rows={3} maxLength={1000} value={f.bio} onChange={set('bio')} /></div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}><label htmlFor="bm-contact">{t('profile.contact')}</label><input id="bm-contact" className="input" value={f.contact} maxLength={160} onChange={set('contact')} /></div>
        </div>
        <div className="field" style={{ marginTop: 12 }}><label htmlFor="bm-links">{t('profile.links')}</label><textarea id="bm-links" className="input" rows={2} value={f.linksText} onChange={set('linksText')} /></div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn primary" type="submit" disabled={save.isPending}>{t('common.save')}</button>
          {band.visibility === 'public'
            ? <button type="button" className="btn" onClick={() => save.mutate({ visibility: 'private' })}>{t('band.unpublish')}</button>
            : <button type="button" className="btn" disabled={!canPublish} title={canPublish ? undefined : t('band.publishNeeds2')} onClick={() => save.mutate({ visibility: 'public' })}>{t('band.publish')}</button>}
        </div>
        {band.visibility !== 'public' && !canPublish && <p className="acc-hint">{t('band.publishNeeds2')}</p>}
      </form>

      <h3 className="section-heading" style={{ marginTop: 22 }}>{t('band.members')}</h3>
      <div className="cm-thread">
        {(band.members || []).map((m, i) => (
          <div key={`${m.profile_handle || 'm'}-${i}`} className="cm-comment">
            <div className="cm-comment-head">
              <span className="cm-author">{m.display_name}</span>
              <span className="meta">{m.instrument} · {t(`band.roles.${m.role}`)}{m.status === 'invited' ? ` · ${t('band.pending')}` : ''}</span>
              <span className="cm-spacer" />
              {(m.profile_handle || m.login) && !m.is_me && (
                <>
                  {m.status === 'active' && (
                    <button className="cm-link" onClick={() => setMember.mutate({ target: m.profile_handle || m.login, role: m.role === 'admin' ? 'member' : 'admin' })}>{m.role === 'admin' ? t('band.demote') : t('band.promote')}</button>
                  )}
                  <button className="cm-link" onClick={() => window.confirm(t('band.removeConfirm')) && removeMember.mutate(m.profile_handle || m.login)}>{m.status === 'invited' ? t('band.cancelInvite') : t('band.remove')}</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <form className="cm-form" style={{ marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); if (invite.target.trim()) inviteMut.mutate() }}>
        <input className="input" value={invite.target} placeholder={t('band.invitePlaceholder')} aria-label={t('band.invitePlaceholder')} onChange={(e) => setInvite({ ...invite, target: e.target.value })} />
        <input className="input" style={{ maxWidth: 160 }} value={invite.instrument} placeholder={t('band.instrument')} aria-label={t('band.instrument')} onChange={(e) => setInvite({ ...invite, instrument: e.target.value })} />
        <button className="btn primary sm" type="submit" disabled={inviteMut.isPending || !invite.target.trim()}>{t('band.invite')}</button>
      </form>
      {msg.ok && <div className="meta" role="status" style={{ marginTop: 8 }}>{msg.ok}</div>}
      {msg.error && <div className="error-text" role="alert">{msg.error}</div>}
      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn danger sm" onClick={() => window.confirm(t('band.deleteConfirm')) && del.mutate()}>{t('band.delete')}</button>
      </div>
    </div>
  )
}

function NewEvent({ band, onDone }) {
  const { t } = useTranslation('community')
  const [f, setF] = useState({ title: '', starts_at: '', venue: '', city: band.city || '', ticket_url: '', description: '' })
  const [error, setError] = useState('')
  const create = useMutation({
    mutationFn: () => api.post(`/social/bands/${band.handle}/events`, { ...f, starts_at: localInputToIso(f.starts_at) }),
    onSuccess: onDone,
    onError: (e) => setError(errMsg(e, t('common.error'))),
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <form className="card" style={{ marginBottom: 12 }} onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}><label htmlFor="ev-title">{t('event.title')}</label><input id="ev-title" className="input" value={f.title} maxLength={120} onChange={set('title')} required /></div>
        <div className="field" style={{ marginBottom: 0 }}><label htmlFor="ev-when">{t('event.startsAt')}</label><input id="ev-when" className="input" type="datetime-local" value={f.starts_at} onChange={set('starts_at')} required /></div>
      </div>
      <div className="row" style={{ alignItems: 'flex-end', marginTop: 10 }}>
        <div className="field" style={{ marginBottom: 0 }}><label htmlFor="ev-venue">{t('event.venue')}</label><input id="ev-venue" className="input" value={f.venue} onChange={set('venue')} /></div>
        <div className="field" style={{ marginBottom: 0 }}><label htmlFor="ev-city">{t('common.city')}</label><input id="ev-city" className="input" value={f.city} onChange={set('city')} /></div>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}><label htmlFor="ev-ticket">{t('event.ticketUrl')}</label><input id="ev-ticket" className="input" value={f.ticket_url} placeholder="https://" onChange={set('ticket_url')} /></div>
      </div>
      {error && <div className="error-text" role="alert">{error}</div>}
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" type="submit" disabled={create.isPending}>{t('common.save')}</button>
        <button className="btn ghost" type="button" onClick={onDone}>{t('common.cancel')}</button>
      </div>
    </form>
  )
}

/** Página pública de uma banda (`/b/:handle`): integrantes, agenda, posts; admins gerenciam aqui. */
export default function BandPublic() {
  const { t } = useTranslation('community')
  const { handle } = useParams()
  const token = useAuthStore((s) => s.token)
  const qc = useQueryClient()
  const [reporting, setReporting] = useState(false)
  const [addingEvent, setAddingEvent] = useState(false)
  const { data: b, isLoading, isError } = useQuery({
    queryKey: ['social', 'band', handle, !!token],
    queryFn: () => api.get(`/social/bands/${handle}`).then((r) => r.data),
    retry: false,
  })
  const { data: events } = useQuery({
    queryKey: ['social', 'band-events', handle, !!token],
    queryFn: () => api.get(`/social/bands/${handle}/events`).then((r) => r.data),
    enabled: !!b,
  })
  useDocumentMeta(b ? `${b.name} — TumTumPa` : undefined, b?.bio ? b.bio.slice(0, 150) : undefined)
  const refresh = () => qc.invalidateQueries({ queryKey: ['social'] })
  const leave = async () => {
    if (!window.confirm(t('band.leaveConfirm'))) return
    try { await api.post(`/social/bands/${handle}/leave`); refresh() } catch (e) { window.alert(errMsg(e, t('common.error'))) }
  }
  const delEvent = useMutation({ mutationFn: (id) => api.delete(`/social/events/${id}`), onSuccess: refresh })

  return (
    <AutoShell>
      {isLoading && <div className="empty">{t('common.loading')}</div>}
      {isError && <div className="empty"><p>{t('band.notFound')}</p><Link className="btn" to="/comunidade/descobrir">{t('discover.title')}</Link></div>}
      {b && (
        <>
          <div className="card cm-profile-head">
            <span className="cm-avatar band xl" aria-hidden="true">{b.name.slice(0, 1).toUpperCase()}</span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h1 className="page-title" style={{ fontSize: 26 }}>{b.name}</h1>
              <div className="meta">@{b.handle}{b.city ? ` · ${b.city}` : ''}{b.genre ? ` · ${b.genre}` : ''} · {t('profile.followers', { count: b.followers ?? 0 })}</div>
              {b.visibility !== 'public' && <span className="chip" style={{ marginTop: 8 }}>{t('band.onlyMembersSee')}</span>}
              {b.bio && <p className="cm-body" style={{ marginTop: 10 }}>{b.bio}</p>}
              <div className="cm-links">
                {(b.links || []).map((l) => safeHref(l) && <a key={l} className="cm-link-card" href={l} target="_blank" rel="noopener noreferrer nofollow ugc">{l.replace(/^https?:\/\//, '').slice(0, 50)} ↗</a>)}
              </div>
              {token ? (b.contact && <div className="meta" style={{ marginTop: 8 }}>{t('profile.contact')}: {b.contact}</div>)
                : <div className="meta" style={{ marginTop: 8 }}><Link to="/login">{t('profile.contactLoginOnly')}</Link></div>}
            </div>
            <div className="cm-profile-actions">
              {b.visibility === 'public' && !b.my_role && <FollowButton kind="band" handle={b.handle} initialFollowing={b.is_following} onChange={refresh} />}
              {b.my_role && <button className="cm-link" onClick={leave}>{t('band.leave')}</button>}
              {token && !b.my_role && <button className="cm-link" onClick={() => setReporting(true)}>{t('post.report')}</button>}
            </div>
          </div>

          <h3 className="section-heading" style={{ marginTop: 22 }}>{t('band.members')}</h3>
          <div className="cm-grid">
            {(b.members || []).filter((m) => m.status === 'active').map((m, i) => (
              <div key={i} className="card cm-tile">
                <span className="cm-avatar" aria-hidden="true">{m.display_name.slice(0, 1).toUpperCase()}</span>
                <div className="cm-tile-main">
                  {m.profile_handle ? <Link className="cm-author" to={`/m/${m.profile_handle}`}>{m.display_name}</Link> : <span className="cm-author">{m.display_name}</span>}
                  <div className="meta">{[m.instrument, t(`band.roles.${m.role}`)].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 22 }}>
            <h3 className="section-heading" style={{ margin: 0 }}>{t('band.events')}</h3>
            {b.can_manage && <button className="btn sm" onClick={() => setAddingEvent(!addingEvent)}>{t('event.new')}</button>}
          </div>
          {addingEvent && <NewEvent band={b} onDone={() => { setAddingEvent(false); refresh() }} />}
          <div className="cm-column wide" style={{ marginTop: 10 }}>
            {(events || []).length === 0 && <div className="meta">{t('band.noEvents')}</div>}
            {(events || []).map((ev) => (
              <EventRow key={ev.id} ev={{ ...ev, band: null }} actions={b.can_manage && (
                <button className="btn sm danger" onClick={() => window.confirm(t('event.deleteConfirm')) && delEvent.mutate(ev.id)}>{t('post.delete')}</button>
              )} />
            ))}
          </div>

          {b.can_manage && <ManagePanel band={b} onChanged={refresh} />}

          <h3 className="section-heading" style={{ marginTop: 22 }}>{t('profile.posts')}</h3>
          <div className="cm-column"><FeedList scope="band" handle={b.handle} emptyKey="profile.noPosts" /></div>
          {reporting && <ReportModal kind="band" targetId={b.handle} onClose={() => setReporting(false)} />}
        </>
      )}
    </AutoShell>
  )
}
