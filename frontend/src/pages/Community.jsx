import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import CommunityNav from '../components/community/CommunityNav'
import Composer from '../components/community/Composer'
import FeedList from '../components/community/FeedList'

/** Comunidade — feed cronológico de músicos e bandas (Explorar / Seguindo). */
export default function Community() {
  const { t } = useTranslation('community')
  const qc = useQueryClient()
  const [scope, setScope] = useState('explore')

  return (
    <>
      <h1 className="page-title">{t('nav.title')}</h1>
      <div className="page-sub">{t('nav.subtitle')}</div>
      <CommunityNav />
      <div className="cm-column">
        <Composer onPosted={() => qc.invalidateQueries({ queryKey: ['social', 'feed'] })} />
        <div className="cm-seg" role="tablist" aria-label={t('feed.scope')}>
          {['explore', 'following'].map((s) => (
            <button key={s} role="tab" aria-selected={scope === s} className={`cm-seg-btn${scope === s ? ' active' : ''}`} onClick={() => setScope(s)}>
              {t(`feed.${s}`)}
            </button>
          ))}
        </div>
        <FeedList key={scope} scope={scope} emptyKey={scope === 'following' ? 'feed.emptyFollowing' : 'feed.emptyExplore'} />
      </div>
    </>
  )
}
