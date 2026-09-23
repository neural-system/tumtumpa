import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/** Abertura da home /palco — igual ao Hero.jsx de About.jsx, a "prévia ao
 * vivo" da cifra é um mockup ilustrativo (mesmo espírito do "floating fake
 * karaoke mockup" que Hero.jsx já usa), não uma música real: aqui o ponto
 * é mostrar a MECÂNICA (linha passada/atual/próxima, transpor, tela cheia),
 * não uma faixa específica do acervo. */
export default function StageHero() {
  const { t } = useTranslation('landingPalco')

  return (
    <section className="palco-hero">
      <div className="palco-count-in" aria-hidden="true"><span>1</span><span>2</span><span>3</span><span className="hot">4</span></div>
      <p className="palco-eyebrow"><i /> {t('hero.eyebrow')}</p>
      <h1 className="palco-hero-title">{t('hero.titleLine1')}<br /><em>{t('hero.titleLine2')}</em></h1>
      <p className="palco-hero-copy">{t('hero.subtitle')}</p>
      <div className="palco-hero-actions">
        <Link className="palco-primary-button" to="/cadastro">{t('hero.ctaPrimary')}</Link>
        <a className="palco-play-button" href="#transformacao"><span>▶</span> {t('hero.ctaSecondary')}</a>
      </div>

      <div className="palco-live-sheet" id="transformacao-preview">
        <div className="palco-sheet-meta">
          <span>{t('hero.sheetLabel')}</span>
          <span>{t('hero.sheetTime')}</span>
          <span className="palco-live-dot">● {t('hero.sheetLive')}</span>
        </div>
        <div className="palco-song-title">{t('hero.mockSongTitle')}</div>
        <div className="palco-lyric past"><b>{t('hero.mockChord1')}</b> {t('hero.mockLine1')}</div>
        <div className="palco-lyric current"><b>{t('hero.mockChord2')}</b> {t('hero.mockLine2')}</div>
        <div className="palco-lyric next"><b>{t('hero.mockChord3')}</b> {t('hero.mockLine3')}</div>
        <div className="palco-song-progress"><span /></div>
        <div className="palco-sheet-controls">
          <button type="button" disabled>−1/2</button>
          <button type="button" className="control-live" disabled>▶ {t('hero.sheetPlay')}</button>
          <button type="button" disabled>+1/2</button>
          <button type="button" disabled>A−</button>
          <button type="button" disabled>A+</button>
          <button type="button" disabled>⛶</button>
        </div>
      </div>
      <div className="palco-scroll-cue">{t('hero.scrollCue')} <span>↓</span></div>
    </section>
  )
}
