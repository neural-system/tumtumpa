import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

/** Prévia de publicações reais do feed público (GET /social/feed?scope=explore,
 * sem login) — mesmo padrão de ComunidadePreview.jsx: nada de mock, a rede já
 * é real. Mostra autor (pessoa ou banda) + curtidas/comentários. */
export default function RedeTTPPreview() {
  const { t } = useTranslation('landingPalco')
  const { data } = useQuery({
    queryKey: ['social-feed-preview'],
    queryFn: () => api.get('/social/feed', { params: { scope: 'explore', limit: 4 } }).then((r) => r.data),
  })
  const preview = (data?.items || []).slice(0, 4)

  return (
    <div className="palco-community-preview">
      <div className="palco-community-preview-head">
        <span>{t('redettp.previewLabel')}</span>
      </div>
      {preview.length === 0 ? (
        <p className="palco-community-preview-empty">{t('redettp.previewEmpty')}</p>
      ) : (
        preview.map((post) => (
          <div key={post.id} className="palco-community-preview-row">
            <b>{post.author?.name}</b>
            <span>♥ {post.likes} · 💬 {post.comments}</span>
          </div>
        ))
      )}
    </div>
  )
}
