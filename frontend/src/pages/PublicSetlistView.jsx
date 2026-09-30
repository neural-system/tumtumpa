import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import PublicHeader from '../components/PublicHeader'
import { useAuthGate } from '../components/AuthGate'
import { usePlaylistStore } from '../store/playlistStore'

/**
 * Setlist compartilhado publicamente (`/setlist/:token`) — sem login, mesmo
 * padrão de PublicSongView.jsx/PublicFeedback.jsx (token imprevisível na URL
 * faz as vezes de autenticação, ver SetlistService.get_by_share_token). Só
 * leitura/reprodução (karaokê completo, com todos os controles de sempre —
 * ScrollPlayer.jsx/KaraokeStage.jsx já funcionam pra visitante anônimo via
 * usePublicApiBase.js, nada precisou mudar lá); qualquer tentativa de
 * "editar" abre o gate de cadastro em vez de navegar pra algo que exigiria
 * login. `playlist.start(..., returnPath)` garante que "sair" do karaokê
 * volta pra ESTA página, não pra `/setlists/:id` (autenticada) — ver
 * playlistStore.js.
 */
export default function PublicSetlistView() {
  const { t } = useTranslation('publicSetlist')
  const { t: tDetail } = useTranslation('setlistDetail')
  const { token } = useParams()
  const navigate = useNavigate()
  const playlist = usePlaylistStore()
  const { requireAuth, modal } = useAuthGate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-setlist', token],
    queryFn: () => api.get(`/public/setlists/${token}`).then((r) => r.data),
    enabled: Boolean(token),
    retry: false,
  })

  const returnPath = `/setlist/${token}`
  const playableItems = (data?.items || []).filter((i) => i.song)
  const playFrom = (playableIndex) => {
    playlist.start(token, data.nome, playableItems, playableIndex, returnPath)
    navigate(`/karaoke/${playableItems[playableIndex].song.slug}`)
  }

  if (isLoading) return <div className="empty">{tDetail('loading')}</div>
  if (isError || !data) {
    return (
      <div className="landing-page">
        <PublicHeader />
        <main className="landing-container" style={{ paddingTop: 108, paddingLeft: '6vw', paddingRight: '6vw' }}>
          <div className="empty">{t('notFound')}</div>
          <div className="page-sub">{t('notFoundHint')}</div>
          <Link to="/" className="btn" style={{ marginTop: 12, display: 'inline-block' }}>{t('backToHome')}</Link>
        </main>
      </div>
    )
  }

  let playableIndex = -1

  return (
    <div className="landing-page">
      <PublicHeader />
      <main className="landing-container" style={{ paddingTop: 108, paddingBottom: 60, paddingLeft: '6vw', paddingRight: '6vw' }}>
        <div className="row between">
          <div>
            <h1 className="page-title">{data.nome}</h1>
            <div className="page-sub">{tDetail('itemCount', { count: data.items.length })}</div>
          </div>
          <div className="row">
            <button className="btn primary" disabled={!playableItems.length} onClick={() => playFrom(0)}>
              {tDetail('playPlaylist', { count: playableItems.length })}
            </button>
            <button className="btn" onClick={() => requireAuth('editSetlist', () => {})}>{t('edit')}</button>
          </div>
        </div>

        <div className="card flush" style={{ marginTop: 16 }}>
          {data.items.length === 0 && <div className="empty">{t('empty')}</div>}
          {data.items.map((item, i) => {
            if (item.song) playableIndex += 1
            const myPlayableIndex = playableIndex
            return (
              <div key={item.ref + i} className="song-row" style={{ gridTemplateColumns: '40px 1fr auto' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--muted)' }}>{i + 1}</span>
                <div>
                  <div className="title">{item.song?.titulo || item.ref}</div>
                  <div className="meta">
                    {item.song?.interprete || ''}
                    {item.song?.ritmo && <> · {item.song.ritmo}</>}
                    {item.song?.tom && <span className="chip" style={{ marginLeft: 6 }}>{item.song.tom}</span>}
                    {!item.song && <span className="chip danger">{tDetail('notFound')}</span>}
                  </div>
                </div>
                {item.song && (
                  <button className="btn" onClick={() => playFrom(myPlayableIndex)} title={tDetail('playFromHere')}>▶</button>
                )}
              </div>
            )
          })}
        </div>
      </main>
      {modal}
    </div>
  )
}
