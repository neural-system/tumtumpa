import { useTranslation } from 'react-i18next'

/** Palco central do workspace /palco/fluxo — título/intérprete vêm da
 * música selecionada de verdade na biblioteca (MusicWorkspace.jsx), mas a
 * letra/acorde exibidos continuam ilustrativos (mesmo mockup do Hero) —
 * ir buscar e tocar a cifra completa de qualquer música clicada é escopo
 * de player de verdade, não de demonstração de landing. */
export default function PlayerStage({ song }) {
  const { t } = useTranslation('landingPalco')
  const title = song?.titulo ?? t('fluxo.playerEmptyTitle')
  const artist = song?.interprete ?? t('fluxo.playerEmptySubtitle')

  return (
    <div className="palco-player-stage">
      <div className="palco-player-topbar">
        <div>
          <span>{t('fluxo.playerNowPlaying')}</span>
          <b>{title} — {artist}</b>
        </div>
        <div className="palco-player-badges">
          <span>{t('fluxo.playerBadgeSync')}</span>
          <span>{t('fluxo.playerBadgeMode')}</span>
        </div>
      </div>
      <div className="palco-moving-lyrics">
        <div className="palco-ghost-line"><b>{t('fluxo.mockChord1')}</b><span>{t('fluxo.mockLine1')}</span></div>
        <div className="palco-current-line"><b>{t('fluxo.mockChord2')}</b><span>{t('fluxo.mockLine2')}</span></div>
        <div className="palco-next-line"><b>{t('fluxo.mockChord3')}</b><span>{t('fluxo.mockLine3')}</span></div>
        <div className="palco-far-line"><b>{t('fluxo.mockChord4')}</b><span>{t('fluxo.mockLine4')}</span></div>
      </div>
      <div className="palco-player-bottom">
        <div className="palco-timeline"><span style={{ width: '46%' }} /></div>
        <div className="palco-transport">
          <button type="button" disabled>−1/2</button>
          <button type="button" disabled>{t('fluxo.playerPrev')}</button>
          <button type="button" className="transport-main" disabled>▶ {t('fluxo.playerPlay')}</button>
          <button type="button" disabled>{t('fluxo.playerNext')}</button>
          <button type="button" disabled>+1/2</button>
        </div>
      </div>
    </div>
  )
}
