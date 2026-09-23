import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/** Quadro de setlist ilustrativo, mesmo espírito do SetlistShowcase.jsx de
 * About.jsx (nomes de música genéricos, não reais) — demonstra o recurso
 * de verdade (setlists compartilháveis) sem inventar estatística. */
const ROWS = [1, 2, 3, 4]

export default function PalcoSetlistShowcase() {
  const { t } = useTranslation('landingPalco')

  return (
    <section className="palco-setlist-section" id="setlist">
      <div className="palco-setlist-intro">
        <div className="palco-section-kicker">{t('setlist.kicker')}</div>
        <h2>{t('setlist.titleLine1')}<br /><em>{t('setlist.titleLine2')}</em></h2>
        <p>{t('setlist.subtitle')}</p>
      </div>
      <div className="palco-setlist-board">
        <div className="palco-board-head">
          <span>{t('setlist.boardWhen')}</span>
          <b>{t('setlist.boardTitle')}</b>
          <span>{t('setlist.boardDuration')}</span>
        </div>
        {ROWS.map((n) => (
          <div key={n} className={`palco-setlist-song ${n === 2 ? 'playing' : ''}`}>
            <span>{String(n).padStart(2, '0')}</span>
            <b>{t(`setlist.song${n}`)}</b>
            <i>{t(`setlist.song${n}Key`)}</i>
            <em>{t(`setlist.song${n}Duration`)}</em>
          </div>
        ))}
        <Link to="/cadastro" className="palco-share-setlist">{t('setlist.cta')} ↗</Link>
      </div>
    </section>
  )
}
