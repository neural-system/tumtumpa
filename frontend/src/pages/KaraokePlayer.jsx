import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { usePublicApiBase } from '../utils/publicApiBase'
import KaraokeStage from './KaraokeStage'
import ScrollPlayer from './ScrollPlayer'

/**
 * Roteador entre os dois modos de execução de uma música (ver
 * SongEditor.jsx::EXECUTION_MODES e karaoke_service.py::payload):
 * "rolagem" (padrão) monta ScrollPlayer.jsx — rola a página inteira sem
 * trocar cor de nenhum caractere; "karaoke" monta o palco linha-a-linha já
 * existente (KaraokeStage.jsx). A escolha vem só do `@modoexecucao` da
 * própria música, editável na aba Editar.
 *
 * A mesma query (['karaoke', slug]) é reaproveitada por KaraokeStage sem
 * round-trip extra (staleTime: Infinity, cache já quente) — este
 * componente só precisa do payload pra decidir qual dos dois montar.
 */
export default function KaraokePlayer() {
  const { t } = useTranslation()
  const { slug } = useParams()
  const base = usePublicApiBase()
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['karaoke', slug, base],
    queryFn: () => api.get(`${base}/karaoke/${slug}`).then((r) => r.data),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  if (isError && !data) {
    // sem isto, falha de rede/404 deixava "Carregando cifra…" pra sempre, sem saída
    return (
      <div className="karaoke-stage controls-visible" style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
          <p style={{ marginBottom: 16 }}>{t('karaokeLoadError')}</p>
          <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
            <button className="btn primary" disabled={isFetching} onClick={() => refetch()}>{t('retryAction')}</button>
            <button className="btn" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/painel'))}>{t('backAction')}</button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading || !data) {
    return <div className="karaoke-stage controls-visible"
      style={{ display: 'grid', placeItems: 'center' }}>{t('loadingChord')}</div>
  }

  return data.modo_execucao === 'karaoke' ? <KaraokeStage /> : <ScrollPlayer data={data} />
}
