import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { useDebounce } from '../../hooks/useDebounce'
import PlayerStage from './PlayerStage'
import FeatureDock from './FeatureDock'

/** Workspace de 3 painéis do "conceito 02 / Central musical" — biblioteca
 * real (GET /public/songs + /public/songs/facets, mesmo padrão de
 * Library2.jsx), não os 8 itens estáticos de catalog.json do template.
 * Clicar numa música só atualiza o título mostrado em PlayerStage (ver
 * comentário lá) — não abre o player de verdade, é uma demonstração da
 * home / do conceito, não um atalho pro app. */
export default function MusicWorkspace() {
  const { t } = useTranslation('landingPalco')
  const [q, setQ] = useState('')
  const [genero, setGenero] = useState('')
  const [selected, setSelected] = useState(null)
  const debouncedQ = useDebounce(q)

  const { data } = useQuery({
    queryKey: ['palco-fluxo-library', debouncedQ, genero],
    queryFn: () => api.get('/public/songs', { params: { q: debouncedQ, genero, page_size: 14 } }).then((r) => r.data),
    keepPreviousData: true,
  })
  const { data: facets } = useQuery({
    queryKey: ['public-facets'],
    queryFn: () => api.get('/public/songs/facets').then((r) => r.data),
  })

  const items = data?.items || []
  const generos = (facets?.generos || []).slice(0, 6)
  const activeSong = selected || items[0] || null

  return (
    <div className="palco-music-workspace">
      <FeatureDock />
      <PlayerStage song={activeSong} />
      <div className="palco-library-panel">
        <div className="palco-panel-title"><b>{t('fluxo.libraryTitle')}</b><span>{t('fluxo.libraryCount', { count: data?.total ?? 0 })}</span></div>
        <div className="palco-genre-filters">
          <button type="button" className={genero === '' ? 'active' : ''} onClick={() => setGenero('')}>{t('fluxo.libraryAll')}</button>
          {generos.map((g) => (
            <button key={g} type="button" className={genero === g ? 'active' : ''} onClick={() => setGenero(g)}>{g}</button>
          ))}
        </div>
        <div className="palco-song-search">
          <span aria-hidden="true">⌕</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('fluxo.librarySearchPlaceholder')} />
        </div>
        <div className="palco-song-list">
          {items.map((s, i) => (
            <button key={s.slug} type="button" className={activeSong?.slug === s.slug ? 'selected' : ''} onClick={() => setSelected(s)}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <div><b>{s.titulo}</b><small>{s.interprete}</small></div>
              <i>{s.tom || ''}</i>
            </button>
          ))}
          {items.length === 0 && <p className="palco-community-preview-empty">{t('fluxo.libraryEmpty')}</p>}
        </div>
      </div>
    </div>
  )
}
