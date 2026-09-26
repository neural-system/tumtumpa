import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useDebounce } from '../hooks/useDebounce'
import CommunityNav from '../components/community/CommunityNav'
import ReportModal from '../components/community/ReportModal'
import { errMsg, timeAgo } from '../utils/social'

const KINDS = ['gig', 'vaga', 'aula', 'outro']

function NewGig({ onDone }) {
  const { t } = useTranslation('community')
  const [f, setF] = useState({ kind: 'gig', title: '', body: '', city: '', event_date: '', budget_note: '' })
  const [error, setError] = useState('')
  const create = useMutation({
    mutationFn: () => api.post('/social/gigs', { ...f, event_date: f.event_date || undefined }).then((r) => r.data),
    onSuccess: onDone,
    onError: (e) => setError(errMsg(e, t('common.error'))),
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <form className="card" style={{ marginBottom: 16 }} onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="gig-kind">{t('gigs.kind')}</label>
          <select id="gig-kind" className="input" value={f.kind} onChange={set('kind')}>{KINDS.map((k) => <option key={k} value={k}>{t(`gigs.kinds.${k}`)}</option>)}</select>
        </div>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
          <label htmlFor="gig-title">{t('gigs.titleField')}</label>
          <input id="gig-title" className="input" value={f.title} maxLength={120} onChange={set('title')} required />
        </div>
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="gig-body">{t('gigs.description')}</label>
        <textarea id="gig-body" className="input" rows={3} maxLength={1500} value={f.body} onChange={set('body')} />
      </div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ marginBottom: 0 }}><label htmlFor="gig-city">{t('common.city')}</label><input id="gig-city" className="input" value={f.city} onChange={set('city')} /></div>
        <div className="field" style={{ marginBottom: 0 }}><label htmlFor="gig-date">{t('gigs.date')}</label><input id="gig-date" className="input" type="date" value={f.event_date} onChange={set('event_date')} /></div>
        <div className="field" style={{ marginBottom: 0 }}><label htmlFor="gig-budget">{t('gigs.budget')}</label><input id="gig-budget" className="input" value={f.budget_note} maxLength={120} onChange={set('budget_note')} /></div>
      </div>
      <p className="acc-hint">{t('gigs.safety')}</p>
      {error && <div className="error-text" role="alert">{error}</div>}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn primary" type="submit" disabled={create.isPending || !f.title.trim()}>{t('gigs.publish')}</button>
        <button className="btn ghost" type="button" onClick={onDone}>{t('common.cancel')}</button>
      </div>
    </form>
  )
}

function Replies({ gig }) {
  const { t, i18n } = useTranslation('community')
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['social', 'replies', gig.id], queryFn: () => api.get(`/social/gigs/${gig.id}/replies`).then((r) => r.data) })
  const answer = useMutation({
    mutationFn: ({ id, accept }) => api.post(`/social/gigs/${gig.id}/replies/${id}`, { accept }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'replies', gig.id] }),
  })
  const items = data || []
  if (!items.length) return <div className="meta" style={{ marginTop: 8 }}>{t('gigs.noReplies')}</div>
  return (
    <div className="cm-thread">
      {items.map((r) => (
        <div key={r.id} className="cm-comment">
          <div className="cm-comment-head">
            {r.from.handle ? <Link className="cm-author" to={`/m/${r.from.handle}`}>{r.from.name}</Link> : <span className="cm-author">{t('gigs.someone')}</span>}
            {r.band && <Link to={`/b/${r.band.handle}`} className="meta">· {r.band.name}</Link>}
            <span className="meta">{timeAgo(r.created_at, i18n.language)}</span>
            <span className="cm-spacer" />
            <span className="chip">{t(`gigs.replyStatus.${r.status}`)}</span>
          </div>
          <div className="cm-body">{r.message}</div>
          {r.contact && <div className="meta">{t('gigs.contact')}: {r.contact}</div>}
          {r.status === 'sent' && (
            <div className="row" style={{ marginTop: 6 }}>
              <button className="btn sm primary" onClick={() => answer.mutate({ id: r.id, accept: true })}>{t('gigs.accept')}</button>
              <button className="btn sm" onClick={() => answer.mutate({ id: r.id, accept: false })}>{t('gigs.decline')}</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function GigCard({ gig, onChanged }) {
  const { t, i18n } = useTranslation('community')
  const [replying, setReplying] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState({ ok: false, error: '' })
  const [reporting, setReporting] = useState(false)
  const reply = useMutation({
    mutationFn: () => api.post(`/social/gigs/${gig.id}/reply`, { message }),
    onSuccess: () => { setFeedback({ ok: true, error: '' }); setReplying(false); setMessage('') },
    onError: (e) => setFeedback({ ok: false, error: errMsg(e, t('common.error')) }),
  })
  const setStatus = useMutation({ mutationFn: (status) => api.post(`/social/gigs/${gig.id}/status`, { status }), onSuccess: onChanged })
  const del = useMutation({ mutationFn: () => api.delete(`/social/gigs/${gig.id}`), onSuccess: onChanged })

  return (
    <article className="card cm-gig">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="cm-event-title"><span className="chip" style={{ marginRight: 8 }}>{t(`gigs.kinds.${gig.kind}`)}</span>{gig.title}{gig.status === 'closed' && <span className="chip" style={{ marginLeft: 8 }}>{t('gigs.closed')}</span>}</div>
          <div className="meta">
            {gig.band ? <Link to={`/b/${gig.band.handle}`}>{gig.band.name}</Link> : <Link to={`/m/${gig.author.handle}`}>{gig.author.name}</Link>}
            {gig.city && <> · {gig.city}</>}{gig.event_date && <> · {new Date(`${gig.event_date}T12:00:00`).toLocaleDateString(i18n.language)}</>}
            {gig.budget_note && <> · {gig.budget_note}</>} · {timeAgo(gig.created_at, i18n.language)}
          </div>
          {gig.body && <p className="cm-body" style={{ marginTop: 8 }}>{gig.body}</p>}
        </div>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        {gig.is_mine ? (
          <>
            <button className="btn sm" onClick={() => setShowReplies(!showReplies)}>{t('gigs.repliesCount', { count: gig.replies ?? 0 })}</button>
            <button className="btn sm" onClick={() => setStatus.mutate(gig.status === 'open' ? 'closed' : 'open')}>{gig.status === 'open' ? t('gigs.close') : t('gigs.reopen')}</button>
            <button className="btn sm danger" onClick={() => window.confirm(t('gigs.deleteConfirm')) && del.mutate()}>{t('post.delete')}</button>
          </>
        ) : (
          <>
            {gig.status === 'open' && !feedback.ok && <button className="btn sm primary" onClick={() => setReplying(!replying)}>{t('gigs.reply')}</button>}
            <button className="cm-link" onClick={() => setReporting(true)}>{t('post.report')}</button>
          </>
        )}
        {feedback.ok && <span className="meta">{t('gigs.replySent')}</span>}
      </div>
      {replying && (
        <form className="cm-form" style={{ marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); if (message.trim()) reply.mutate() }}>
          <textarea className="input" rows={2} maxLength={1000} value={message} placeholder={t('gigs.replyPlaceholder')} aria-label={t('gigs.replyPlaceholder')} onChange={(e) => setMessage(e.target.value)} />
          <button className="btn primary sm" type="submit" disabled={reply.isPending || !message.trim()}>{t('comments.send')}</button>
        </form>
      )}
      {feedback.error && <div className="error-text" role="alert">{feedback.error}</div>}
      {showReplies && gig.is_mine && <Replies gig={gig} />}
      {reporting && <ReportModal kind="gig" targetId={gig.id} onClose={() => setReporting(false)} />}
    </article>
  )
}

/** Contratações: pedidos de show, vagas em banda e aulas (divulgação + resposta privada). */
export default function CommunityGigs() {
  const { t } = useTranslation('community')
  const qc = useQueryClient()
  const [kind, setKind] = useState('')
  const [city, setCity] = useState('')
  const [mine, setMine] = useState(false)
  const [creating, setCreating] = useState(false)
  const dCity = useDebounce(city)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['social', 'gigs', kind, dCity, mine],
    queryFn: () => api.get('/social/gigs', { params: { kind, city: dCity, mine: mine ? 1 : undefined, page_size: 40 } }).then((r) => r.data),
  })
  const items = data?.items || []
  const refresh = () => { setCreating(false); qc.invalidateQueries({ queryKey: ['social', 'gigs'] }) }

  return (
    <>
      <div className="row no-print" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">{t('gigs.title')}</h1>
          <div className="page-sub">{t('gigs.subtitle')}</div>
        </div>
        <button className="btn primary" onClick={() => setCreating(!creating)}>{t('gigs.new')}</button>
      </div>
      <CommunityNav />
      {creating && <NewGig onDone={refresh} />}
      <div className="row" style={{ marginBottom: 16 }}>
        <select className="input" style={{ maxWidth: 200 }} value={kind} onChange={(e) => setKind(e.target.value)} aria-label={t('gigs.kind')}>
          <option value="">{t('gigs.allKinds')}</option>
          {KINDS.map((k) => <option key={k} value={k}>{t(`gigs.kinds.${k}`)}</option>)}
        </select>
        <input className="input" style={{ maxWidth: 200 }} value={city} placeholder={t('common.city')} aria-label={t('common.city')} onChange={(e) => setCity(e.target.value)} />
        <label className="ms-check"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> {t('gigs.mine')}</label>
      </div>
      <p className="acc-hint" style={{ marginBottom: 12 }}>{t('gigs.safety')}</p>
      {isLoading && <div className="empty">{t('common.loading')}</div>}
      {isError && <div className="empty"><p>{t('common.error')}</p><button className="btn" onClick={() => refetch()}>{t('common.retry')}</button></div>}
      {!isLoading && !isError && items.length === 0 && <div className="empty">{t('gigs.empty')}</div>}
      <div className="cm-column wide">{items.map((g) => <GigCard key={g.id} gig={g} onChanged={refresh} />)}</div>
    </>
  )
}
