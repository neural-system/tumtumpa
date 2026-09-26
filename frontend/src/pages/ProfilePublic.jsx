import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import AutoShell from '../components/community/AutoShell'
import FeedList from '../components/community/FeedList'
import FollowButton from '../components/community/FollowButton'
import ReportModal from '../components/community/ReportModal'
import { safeHref } from '../utils/social'

/** Perfil público de um músico (`/m/:handle`) — visitante ou logado. */
export default function ProfilePublic() {
  const { t } = useTranslation('community')
  const { handle } = useParams()
  const token = useAuthStore((s) => s.token)
  const qc = useQueryClient()
  const [reporting, setReporting] = useState(false)
  const { data: p, isLoading, isError } = useQuery({
    queryKey: ['social', 'profile', handle, !!token],
    queryFn: () => api.get(`/social/profiles/${handle}`).then((r) => r.data),
    retry: false,
  })
  useDocumentMeta(p ? `${p.display_name} — TumTumPa` : undefined, p?.bio ? p.bio.slice(0, 150) : undefined)

  const block = async () => {
    if (!window.confirm(t('profile.blockConfirm'))) return
    await api.post('/social/block', { handle, block: true })
    qc.invalidateQueries({ queryKey: ['social'] })
  }

  return (
    <AutoShell>
      {isLoading && <div className="empty">{t('common.loading')}</div>}
      {isError && <div className="empty"><p>{t('profile.notFound')}</p><Link className="btn" to="/comunidade/descobrir">{t('discover.title')}</Link></div>}
      {p && (
        <>
          <div className="card cm-profile-head">
            <span className="cm-avatar xl" aria-hidden="true">{p.display_name.slice(0, 1).toUpperCase()}</span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h1 className="page-title" style={{ fontSize: 26 }}>{p.display_name}</h1>
              <div className="meta">@{p.handle}{p.city ? ` · ${p.city}` : ''} · {t('profile.followers', { count: p.followers ?? 0 })}</div>
              {p.visibility !== 'public' && <span className="chip" style={{ marginTop: 8 }}>{t('profile.onlyYouSee')}</span>}
              {p.available_for_hire && <span className="chip" style={{ marginTop: 8, marginLeft: 6 }}>{t('discover.availableForHire')}</span>}
              {p.instruments?.length > 0 && <div className="meta" style={{ marginTop: 8 }}>{p.instruments.join(' · ')}</div>}
              {p.bio && <p className="cm-body" style={{ marginTop: 10 }}>{p.bio}</p>}
              <div className="cm-links">
                {(p.links || []).map((l) => safeHref(l) && <a key={l} className="cm-link-card" href={l} target="_blank" rel="noopener noreferrer nofollow ugc">{l.replace(/^https?:\/\//, '').slice(0, 50)} ↗</a>)}
              </div>
              {token ? (p.contact && <div className="meta" style={{ marginTop: 8 }}>{t('profile.contact')}: {p.contact}</div>)
                : <div className="meta" style={{ marginTop: 8 }}><Link to="/login">{t('profile.contactLoginOnly')}</Link></div>}
            </div>
            <div className="cm-profile-actions">
              {p.is_owner ? <Link className="btn" to="/comunidade/perfil">{t('profile.edit')}</Link>
                : <FollowButton kind="user" handle={p.handle} initialFollowing={p.is_following} onChange={() => qc.invalidateQueries({ queryKey: ['social', 'profile', handle] })} />}
              {token && !p.is_owner && (
                <>
                  <button className="cm-link" onClick={() => setReporting(true)}>{t('post.report')}</button>
                  <button className="cm-link" onClick={block}>{t('profile.block')}</button>
                </>
              )}
            </div>
          </div>
          {p.bands?.length > 0 && (
            <div className="card" style={{ marginTop: 14 }}>
              <h3 className="section-heading">{t('profile.bandsOf')}</h3>
              <div className="cm-grid">
                {p.bands.map((b) => (
                  <Link key={b.handle} className="cm-tile" to={`/b/${b.handle}`}>
                    <span className="cm-avatar band" aria-hidden="true">{b.name.slice(0, 1).toUpperCase()}</span>
                    <div className="cm-tile-main"><div className="cm-author">{b.name}</div><div className="meta">{b.instrument || t(`band.roles.${b.role}`)}{b.genre ? ` · ${b.genre}` : ''}</div></div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <h3 className="section-heading" style={{ marginTop: 22 }}>{t('profile.posts')}</h3>
          <div className="cm-column"><FeedList scope="user" handle={p.handle} emptyKey="profile.noPosts" /></div>
          {reporting && <ReportModal kind="profile" targetId={p.handle} onClose={() => setReporting(false)} />}
        </>
      )}
    </AutoShell>
  )
}
