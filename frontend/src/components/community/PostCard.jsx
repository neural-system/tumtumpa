import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { safeHref, timeAgo } from '../../utils/social'
import CommentThread from './CommentThread'
import ReportModal from './ReportModal'

/** Um post do feed: autor (músico ou banda), texto puro, link, vídeo do YouTube,
 * curtir, comentar, apagar (se puder) e denunciar (se não for seu). */
export default function PostCard({ post, onDeleted }) {
  const { t, i18n } = useTranslation('community')
  const token = useAuthStore((s) => s.token)
  const [liked, setLiked] = useState(post.liked)
  const [likes, setLikes] = useState(post.likes)
  const [comments, setComments] = useState(post.comments)
  const [open, setOpen] = useState(false)
  const [reporting, setReporting] = useState(false)

  const like = useMutation({
    mutationFn: (next) => api.post(`/social/posts/${post.id}/like`, { liked: next }).then((r) => r.data),
    onSuccess: (d) => { setLiked(d.liked); setLikes(d.likes) },
  })
  const del = useMutation({
    mutationFn: () => api.delete(`/social/posts/${post.id}`),
    onSuccess: () => onDeleted?.(post.id),
  })

  const isBand = post.author.type === 'band'
  const href = isBand ? `/b/${post.author.handle}` : `/m/${post.author.handle}`
  const link = safeHref(post.link_url)

  return (
    <article className="card cm-post">
      <header className="cm-post-head">
        <span className={`cm-avatar${isBand ? ' band' : ''}`} aria-hidden="true">{(post.author.name || '?').slice(0, 1).toUpperCase()}</span>
        <div className="cm-post-who">
          <Link to={href} className="cm-author">{post.author.name}</Link>
          <span className="meta">
            {isBand && <span className="chip" style={{ marginRight: 6 }}>{t('post.band')}</span>}
            {post.kind !== 'text' && <span className="chip" style={{ marginRight: 6 }}>{t(`kinds.${post.kind}`)}</span>}
            {timeAgo(post.created_at, i18n.language)}
          </span>
        </div>
        <span className="cm-spacer" />
        {token && !post.can_delete && <button className="cm-link" onClick={() => setReporting(true)}>{t('post.report')}</button>}
        {post.can_delete && (
          <button className="cm-link" disabled={del.isPending}
            onClick={() => window.confirm(t('post.deleteConfirm')) && del.mutate()}>{t('post.delete')}</button>
        )}
      </header>

      {post.body && <p className="cm-body">{post.body}</p>}
      {link && <a className="cm-link-card" href={link} target="_blank" rel="noopener noreferrer nofollow ugc">{link.replace(/^https?:\/\//, '').slice(0, 70)} ↗</a>}
      {post.youtube_id && (
        <div className="cm-video">
          <iframe title="YouTube" src={`https://www.youtube-nocookie.com/embed/${post.youtube_id}`} loading="lazy"
            allow="encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        </div>
      )}

      <footer className="cm-actions">
        <button className={`cm-act${liked ? ' on' : ''}`} aria-pressed={liked} disabled={!token || like.isPending}
          title={token ? undefined : t('feed.loginToInteract')} onClick={() => like.mutate(!liked)}>
          {liked ? '♥' : '♡'} {likes}
        </button>
        <button className="cm-act" aria-expanded={open} onClick={() => setOpen(!open)}>💬 {t('post.comments', { count: comments })}</button>
      </footer>
      {open && <CommentThread postId={post.id} onCountChange={(d) => setComments((c) => Math.max(0, c + d))} />}
      {reporting && <ReportModal kind="post" targetId={post.id} onClose={() => setReporting(false)} />}
    </article>
  )
}
