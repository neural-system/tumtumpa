import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../services/api'

const ACTIONS_BY_KIND = {
  post: ['hide', 'restore', 'ban_user', 'dismiss'],
  comment: ['hide', 'restore', 'ban_user', 'dismiss'],
  gig: ['hide', 'restore', 'ban_user', 'dismiss'],
  profile: ['ban_user', 'unban_user', 'dismiss'],
  band: ['ban_user', 'dismiss'],
  event: ['ban_user', 'dismiss'],
}

/** Fila de denúncias da comunidade (só admin): ocultar, restaurar, suspender ou arquivar. */
export default function AdminModeration() {
  const { t } = useTranslation('community')
  const qc = useQueryClient()
  const [status, setStatus] = useState('open')
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'social-reports', status],
    queryFn: () => api.get('/admin/social/reports', { params: { status } }).then((r) => r.data),
  })
  const resolve = useMutation({
    mutationFn: (body) => api.post('/admin/social/reports/resolve', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'social-reports'] }),
  })
  const items = data?.items || []
  const linkFor = (it) => (it.kind === 'profile' ? `/m/${it.target_id}` : it.kind === 'band' ? `/b/${it.target_id}` : null)

  return (
    <>
      <h1 className="page-title">{t('admin.title')}</h1>
      <div className="page-sub">{t('admin.subtitle')}</div>
      <div className="cm-seg" style={{ marginBottom: 14 }} role="tablist">
        {['open', 'resolved', 'dismissed'].map((s) => (
          <button key={s} role="tab" aria-selected={status === s} className={`cm-seg-btn${status === s ? ' active' : ''}`} onClick={() => setStatus(s)}>{t(`admin.status.${s}`)}</button>
        ))}
      </div>
      {isLoading && <div className="empty">{t('common.loading')}</div>}
      {isError && <div className="empty"><p>{t('common.error')}</p><button className="btn" onClick={() => refetch()}>{t('common.retry')}</button></div>}
      {!isLoading && !isError && items.length === 0 && <div className="empty">{t('admin.empty')}</div>}
      <div className="cm-column wide">
        {items.map((it) => (
          <div key={`${it.kind}:${it.target_id}`} className="card">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="chip">{t(`admin.kinds.${it.kind}`)}</span>{' '}
                <span className="meta">{t('admin.reportsCount', { count: it.reports })} · {it.reasons.map((r) => t(`report.reasons.${r}`)).join(', ')}</span>
              </div>
              {linkFor(it) && <Link className="btn sm" to={linkFor(it)}>{t('admin.open')}</Link>}
            </div>
            <p className="cm-body" style={{ margin: '10px 0' }}>
              {it.preview.deleted ? <em>{t('admin.deleted')}</em> : it.preview.text || <em>—</em>}
              {it.preview.hidden && <span className="chip" style={{ marginLeft: 8 }}>{t('admin.hidden')}</span>}
            </p>
            {status === 'open' && (
              <div className="row">
                {(ACTIONS_BY_KIND[it.kind] || ['dismiss']).map((a) => (
                  <button key={a} className={`btn sm${a === 'ban_user' ? ' danger' : a === 'hide' ? ' primary' : ''}`} disabled={resolve.isPending}
                    onClick={() => (a !== 'ban_user' || window.confirm(t('admin.banConfirm'))) && resolve.mutate({ kind: it.kind, target_id: it.target_id, action: a })}>
                    {t(`admin.actions.${a}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
