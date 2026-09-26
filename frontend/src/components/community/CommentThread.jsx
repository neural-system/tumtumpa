import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { errMsg, timeAgo } from '../../utils/social'
import ReportModal from './ReportModal'

/** Comentários de um post: lista + campo de novo comentário (só logado). */
export default function CommentThread({ postId, onCountChange }) {
  const { t, i18n } = useTranslation('community')
  const qc = useQueryClient()
  const token = useAuthStore((s) => s.token)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [reporting, setReporting] = useState(null)

  const key = ['social', 'comments', postId]
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api.get(`/social/posts/${postId}/comments`).then((r) => r.data) })
  const items = data?.items || []

  const add = useMutation({
    mutationFn: () => api.post(`/social/posts/${postId}/comments`, { body: text }).then((r) => r.data),
    onSuccess: () => { setText(''); setError(''); qc.invalidateQueries({ queryKey: key }); onCountChange?.(1) },
    onError: (e) => setError(errMsg(e, t('common.error'))),
  })
  const del = useMutation({
    mutationFn: (id) => api.delete(`/social/comments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); onCountChange?.(-1) },
  })

  return (
    <div className="cm-thread">
      {isLoading && <div className="meta">{t('common.loading')}</div>}
      {!isLoading && items.length === 0 && <div className="meta">{t('comments.empty')}</div>}
      {items.map((c) => (
        <div key={c.id} className="cm-comment">
          <div className="cm-comment-head">
            {c.author.handle ? <Link to={`/m/${c.author.handle}`} className="cm-author">{c.author.name}</Link> : <span className="cm-author">{c.author.name}</span>}
            <span className="meta">{timeAgo(c.created_at, i18n.language)}</span>
            <span className="cm-spacer" />
            {token && !c.can_delete && <button className="cm-link" onClick={() => setReporting(c.id)}>{t('post.report')}</button>}
            {c.can_delete && <button className="cm-link" onClick={() => del.mutate(c.id)}>{t('post.delete')}</button>}
          </div>
          <div className="cm-body">{c.body}</div>
        </div>
      ))}
      {token ? (
        <form className="cm-form" onSubmit={(e) => { e.preventDefault(); if (text.trim()) add.mutate() }}>
          <input className="input" value={text} maxLength={600} placeholder={t('comments.placeholder')} aria-label={t('comments.placeholder')}
            onChange={(e) => setText(e.target.value)} />
          <button className="btn primary sm" type="submit" disabled={add.isPending || !text.trim()}>{t('comments.send')}</button>
        </form>
      ) : (
        <div className="meta"><Link to="/login">{t('comments.loginToComment')}</Link></div>
      )}
      {error && <div className="error-text" role="alert">{error}</div>}
      {reporting && <ReportModal kind="comment" targetId={reporting} onClose={() => setReporting(null)} />}
    </div>
  )
}
