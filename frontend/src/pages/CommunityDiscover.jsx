import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useDebounce } from '../hooks/useDebounce'
import CommunityNav from '../components/community/CommunityNav'

/** Descobrir: busca de bandas e de músicos com perfil público. */
export default function CommunityDiscover() {
  const { t } = useTranslation('community')
  const [tab, setTab] = useState('bands')
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [hire, setHire] = useState(false)
  const dq = useDebounce(q)
  const dcity = useDebounce(city)

  const path = tab === 'bands' ? '/social/bands' : '/social/profiles'
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['social', 'discover', tab, dq, dcity, hire],
    queryFn: () => api.get(path, { params: { q: dq, city: dcity, hire: tab === 'people' && hire ? 1 : undefined, page_size: 40 } }).then((r) => r.data),
  })
  const items = data?.items || []

  return (
    <>
      <h1 className="page-title">{t('discover.title')}</h1>
      <div className="page-sub">{t('discover.subtitle')}</div>
      <CommunityNav />
      <div className="cm-seg" role="tablist" style={{ marginBottom: 14 }}>
        {['bands', 'people'].map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`cm-seg-btn${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{t(`discover.${k}`)}</button>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        <input className="input" style={{ maxWidth: 260 }} value={q} placeholder={t('discover.search')} aria-label={t('discover.search')} onChange={(e) => setQ(e.target.value)} />
        <input className="input" style={{ maxWidth: 200 }} value={city} placeholder={t('common.city')} aria-label={t('common.city')} onChange={(e) => setCity(e.target.value)} />
        {tab === 'people' && (
          <label className="ms-check"><input type="checkbox" checked={hire} onChange={(e) => setHire(e.target.checked)} /> {t('discover.availableForHire')}</label>
        )}
      </div>
      {isLoading && <div className="empty">{t('common.loading')}</div>}
      {isError && <div className="empty"><p>{t('common.error')}</p><button className="btn" onClick={() => refetch()}>{t('common.retry')}</button></div>}
      {!isLoading && !isError && items.length === 0 && <div className="empty">{t('discover.empty')}</div>}
      <div className="cm-grid">
        {items.map((it) => (
          <Link key={it.handle} to={tab === 'bands' ? `/b/${it.handle}` : `/m/${it.handle}`} className="card cm-tile">
            <span className={`cm-avatar lg${tab === 'bands' ? ' band' : ''}`} aria-hidden="true">{(it.name || it.display_name || '?').slice(0, 1).toUpperCase()}</span>
            <div className="cm-tile-main">
              <div className="cm-author">{it.name || it.display_name}</div>
              <div className="meta">@{it.handle}{it.city ? ` · ${it.city}` : ''}{it.genre ? ` · ${it.genre}` : ''}</div>
              {it.bio && <div className="cm-tile-bio">{it.bio}</div>}
              {it.available_for_hire && <span className="chip" style={{ marginTop: 6 }}>{t('discover.availableForHire')}</span>}
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
