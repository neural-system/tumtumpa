import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

/** Prévia de anúncios reais do mural (GET /band-board, pública) — mesma
 * query de BandBoardTeaser.jsx (landing/), casca visual nova. O template
 * original usava um mock estático ("community-preview.tsx"); como o mural
 * já é 100% real e público, não faz sentido inventar anúncio aqui. */
export default function ComunidadePreview() {
  const { t } = useTranslation('landingPalco')
  const { data: posts } = useQuery({
    queryKey: ['band-board'],
    queryFn: () => api.get('/band-board').then((r) => r.data),
  })
  const preview = (posts || []).slice(0, 4)

  return (
    <div className="palco-community-preview">
      <div className="palco-community-preview-head">
        <span>{t('comunidade.previewLabel')}</span>
      </div>
      {preview.length === 0 ? (
        <p className="palco-community-preview-empty">{t('comunidade.previewEmpty')}</p>
      ) : (
        preview.map((post) => (
          <div key={post.id} className="palco-community-preview-row">
            <b>{post.band_name}</b>
            <span>{[post.city, post.genero].filter(Boolean).join(' · ')}</span>
          </div>
        ))
      )}
    </div>
  )
}
