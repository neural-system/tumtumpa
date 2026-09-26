import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import PostCard from './PostCard'

/** Lista paginada (cursor) de posts. `scope`: explore | following | user | band;
 * `handle` só para user/band. Novos posts (Composer) entram via invalidação. */
export default function FeedList({ scope = 'explore', handle = '', emptyKey = 'feed.emptyExplore' }) {
  const { t } = useTranslation('community')
  const qc = useQueryClient()
  const key = ['social', 'feed', scope, handle]
  const q = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => api.get('/social/feed', { params: { scope, handle, cursor: pageParam || undefined, limit: 15 } }).then((r) => r.data),
    getNextPageParam: (last) => last.next_cursor || undefined,
    initialPageParam: '',
  })
  const posts = (q.data?.pages || []).flatMap((p) => p.items)

  if (q.isLoading) return <div className="empty">{t('common.loading')}</div>
  if (q.isError) {
    return (
      <div className="empty">
        <p>{t('common.error')}</p>
        <button className="btn" onClick={() => q.refetch()}>{t('common.retry')}</button>
      </div>
    )
  }
  if (posts.length === 0) return <div className="empty">{t(emptyKey)}</div>
  return (
    <div className="cm-feed">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} onDeleted={() => qc.invalidateQueries({ queryKey: ['social', 'feed'] })} />
      ))}
      {q.hasNextPage && (
        <div style={{ textAlign: 'center' }}>
          <button className="btn" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>{t('feed.loadMore')}</button>
        </div>
      )}
    </div>
  )
}
