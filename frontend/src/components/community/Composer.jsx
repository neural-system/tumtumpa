import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { errMsg } from '../../utils/social'

const MAX_POST_MEDIA = 4

function makeLocalId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Caixa de nova postagem. Posta como o próprio músico ou por uma banda pública
 * da qual a pessoa é administradora. Exige perfil público (o servidor também exige).
 * Foto/vídeo ficam em memória até o post existir (mesmo padrão de staging de
 * bandBoardShared.jsx/MediaGalleryEditor), e só sobem em sequência depois de
 * publicar — link/YouTube continuam sendo campos nativos do post (não passam
 * por upload). */
export default function Composer({ onPosted }) {
  const { t } = useTranslation('community')
  const { data: me } = useQuery({ queryKey: ['social', 'me'], queryFn: () => api.get('/social/me').then((r) => r.data) })
  const { data: mine } = useQuery({ queryKey: ['social', 'my-bands'], queryFn: () => api.get('/social/bands/mine').then((r) => r.data) })
  const [body, setBody] = useState('')
  const [kind, setKind] = useState('text')
  const [as, setAs] = useState('')
  const [link, setLink] = useState('')
  const [yt, setYt] = useState('')
  const [extras, setExtras] = useState(false)
  const [media, setMedia] = useState([])
  const [error, setError] = useState('')

  const publishBands = (mine?.bands || []).filter((b) => b.role === 'admin' && b.visibility === 'public')

  const addMediaFile = (file) => {
    if (!file || media.length >= MAX_POST_MEDIA) return
    const isVideo = file.type.startsWith('video/')
    setMedia((prev) => [...prev, { localId: makeLocalId(), kind: isVideo ? 'video' : 'photo', file, previewUrl: URL.createObjectURL(file) }])
  }
  const removeMedia = (localId) => setMedia((prev) => prev.filter((m) => m.localId !== localId))

  const publish = useMutation({
    mutationFn: async () => {
      const post = await api.post('/social/posts', { body, kind, band: as || undefined, link_url: link, youtube: yt }).then((r) => r.data)
      for (const m of media) {
        const fd = new FormData()
        fd.append('kind', m.kind)
        fd.append('file', m.file)
        await api.post(`/social/posts/${post.id}/media`, fd)
      }
      return post
    },
    onSuccess: (post) => {
      setBody(''); setLink(''); setYt(''); setKind('text'); setError(''); setExtras(false); setMedia([]); onPosted?.(post)
    },
    onError: (e) => setError(errMsg(e, t('common.error'))),
  })

  if (me && me.visibility !== 'public') {
    return (
      <div className="card cm-composer">
        <p style={{ marginBottom: 12 }}>{t('feed.publishFirst')}</p>
        <Link className="btn primary" to="/comunidade/perfil">{t('feed.goToProfile')}</Link>
      </div>
    )
  }
  const can = (body.trim() || link.trim() || yt.trim() || media.length > 0) && !publish.isPending

  return (
    <form className="card cm-composer" onSubmit={(e) => { e.preventDefault(); if (can) publish.mutate() }}>
      <textarea className="input" rows={3} maxLength={2000} value={body} placeholder={t('feed.composerPlaceholder')}
        aria-label={t('feed.composerPlaceholder')} onChange={(e) => setBody(e.target.value)} />
      {media.length > 0 && (
        <div className="bb-media-grid" style={{ marginTop: 10 }}>
          {media.map((m) => (
            <div key={m.localId} className="bb-media-item">
              {m.kind === 'photo'
                ? <img src={m.previewUrl} alt="" className="bb-media-thumb" />
                : <video src={m.previewUrl} controls className="bb-media-thumb" />}
              <button type="button" className="btn danger xs" style={{ marginTop: 6, width: '100%' }}
                onClick={() => removeMedia(m.localId)}>{t('feed.mediaRemove')}</button>
            </div>
          ))}
        </div>
      )}
      {extras && (
        <div className="cm-extras">
          <input className="input" value={link} placeholder={t('feed.linkPlaceholder')} aria-label={t('feed.linkPlaceholder')} onChange={(e) => setLink(e.target.value)} />
          <input className="input" value={yt} placeholder={t('feed.youtubePlaceholder')} aria-label={t('feed.youtubePlaceholder')} onChange={(e) => setYt(e.target.value)} />
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)} aria-label={t('feed.kind')}>
            {['text', 'show', 'release'].map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}
          </select>
        </div>
      )}
      <div className="row" style={{ marginTop: 10 }}>
        {publishBands.length > 0 && (
          <select className="input" style={{ width: 'auto', maxWidth: 220 }} value={as} onChange={(e) => setAs(e.target.value)} aria-label={t('feed.postAs')}>
            <option value="">{t('feed.asMe')}</option>
            {publishBands.map((b) => <option key={b.handle} value={b.handle}>{b.name}</option>)}
          </select>
        )}
        <button type="button" className="btn ghost sm" onClick={() => setExtras(!extras)}>{t('feed.addExtras')}</button>
        <label className="btn ghost sm" style={media.length >= MAX_POST_MEDIA ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          title={media.length >= MAX_POST_MEDIA ? t('feed.mediaLimit', { max: MAX_POST_MEDIA }) : undefined}>
          {t('feed.addMedia')}
          <input type="file" accept="image/*,video/*" style={{ display: 'none' }}
            onChange={(e) => { addMediaFile(e.target.files[0]); e.target.value = '' }} />
        </label>
        <span className="cm-spacer" />
        <button className="btn primary" type="submit" disabled={!can}>{t('feed.publish')}</button>
      </div>
      {error && <div className="error-text" role="alert">{error}</div>}
    </form>
  )
}
