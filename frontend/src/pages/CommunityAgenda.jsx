import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useDebounce } from '../hooks/useDebounce'
import CommunityNav from '../components/community/CommunityNav'
import { downloadEventIcs, formatWhen, safeHref } from '../utils/social'

/** Um show na lista (usado aqui e na página da banda). */
export function EventRow({ ev, actions }) {
  const { t, i18n } = useTranslation('community')
  const ticket = safeHref(ev.ticket_url)
  return (
    <div className={`card cm-event${ev.status === 'cancelled' ? ' cancelled' : ''}`}>
      <div className="cm-event-when">{formatWhen(ev.starts_at, i18n.language)}</div>
      <div className="cm-event-main">
        <div className="cm-event-title">{ev.title}{ev.status === 'cancelled' && <span className="chip" style={{ marginLeft: 8 }}>{t('event.cancelled')}</span>}</div>
        <div className="meta">
          {ev.band && <Link to={`/b/${ev.band.handle}`}>{ev.band.name}</Link>}
          {[ev.venue, ev.city].filter(Boolean).length > 0 && <> · {[ev.venue, ev.city].filter(Boolean).join(' — ')}</>}
        </div>
        {ev.description && <p className="cm-body" style={{ marginTop: 6 }}>{ev.description}</p>}
      </div>
      <div className="cm-event-actions">
        {ticket && <a className="btn sm" href={ticket} target="_blank" rel="noopener noreferrer nofollow ugc">{t('event.tickets')}</a>}
        <button className="btn sm" onClick={() => downloadEventIcs(ev, ev.band?.name)}>{t('event.addToCalendar')}</button>
        {actions}
      </div>
    </div>
  )
}

/** Próximos shows de bandas públicas, com filtro por cidade/busca. */
export default function CommunityAgenda() {
  const { t } = useTranslation('community')
  const [city, setCity] = useState('')
  const [q, setQ] = useState('')
  const dCity = useDebounce(city)
  const dQ = useDebounce(q)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['social', 'agenda', dCity, dQ],
    queryFn: () => api.get('/social/agenda', { params: { city: dCity, q: dQ, page_size: 50 } }).then((r) => r.data),
  })
  const items = data?.items || []

  return (
    <>
      <h1 className="page-title">{t('agenda.title')}</h1>
      <div className="page-sub">{t('agenda.subtitle')}</div>
      <CommunityNav />
      <div className="row" style={{ marginBottom: 16 }}>
        <input className="input" style={{ maxWidth: 220 }} value={city} placeholder={t('common.city')} aria-label={t('common.city')} onChange={(e) => setCity(e.target.value)} />
        <input className="input" style={{ maxWidth: 280 }} value={q} placeholder={t('agenda.search')} aria-label={t('agenda.search')} onChange={(e) => setQ(e.target.value)} />
      </div>
      {isLoading && <div className="empty">{t('common.loading')}</div>}
      {isError && <div className="empty"><p>{t('common.error')}</p><button className="btn" onClick={() => refetch()}>{t('common.retry')}</button></div>}
      {!isLoading && !isError && items.length === 0 && <div className="empty">{t('agenda.empty')}</div>}
      <div className="cm-column wide">{items.map((ev) => <EventRow key={ev.id} ev={ev} />)}</div>
    </>
  )
}
