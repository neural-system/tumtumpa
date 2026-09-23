import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import PalcoNav from '../components/landingPalco/PalcoNav'
import PalcoFooter from '../components/landingPalco/PalcoFooter'
import ComunidadePreview from '../components/landingPalco/ComunidadePreview'
import '../styles/landingPalco.css'
import '../styles/landingPalcoComunidade.css'

const CRITERIA = [1, 2, 3, 4]
const STEPS = [1, 2, 3]

/** Página de "venda" do recurso de mural/monte-uma-banda — distinta da
 * /mural funcional que já existe (BandBoard.jsx): esta é a explicação
 * pública do recurso, com CTAs reais pra lá. Adaptada de mural/page.tsx do
 * template, que já linkava corretamente pras rotas reais do app. */
export default function PalcoComunidade() {
  const { t } = useTranslation('landingPalco')
  useDocumentMeta(t('meta.comunidadeTitle'), t('meta.comunidadeDescription'))

  return (
    <main className="palco-shell comunidade-shell">
      <PalcoNav active="comunidade" />
      <section className="palco-mural-hero">
        <div className="palco-mural-hero-copy">
          <span className="palco-section-kicker">{t('comunidade.kicker')}</span>
          <h1>{t('comunidade.titleLine1')}<br /><em>{t('comunidade.titleLine2')}</em></h1>
          <p>{t('comunidade.subtitle')}</p>
          <div className="palco-mural-actions">
            <Link className="palco-yellow-link" to="/mural">{t('comunidade.ctaExplore')} →</Link>
            <Link className="palco-mural-secondary-link" to="/mural/meus-anuncios">{t('comunidade.ctaCreate')} →</Link>
          </div>
          <p className="palco-mural-access-note">{t('comunidade.accessNote')}</p>
        </div>
        <ComunidadePreview />
      </section>

      <section className="palco-mural-criteria">
        <div className="palco-mural-section-title">
          <span className="palco-section-kicker">{t('comunidade.criteriaKicker')}</span>
          <h2>{t('comunidade.criteriaTitleLine1')}<br /><em>{t('comunidade.criteriaTitleLine2')}</em></h2>
        </div>
        <dl className="palco-mural-criteria-list">
          {CRITERIA.map((n) => (
            <div key={n}>
              <dt><span aria-hidden="true">{String(n).padStart(2, '0')}</span>{t(`comunidade.criteria${n}Title`)}</dt>
              <dd>{t(`comunidade.criteria${n}Copy`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="palco-mural-how">
        <div className="palco-mural-section-title">
          <span className="palco-section-kicker">{t('comunidade.howKicker')}</span>
          <h2>{t('comunidade.howTitleLine1')}<br /><em>{t('comunidade.howTitleLine2')}</em></h2>
        </div>
        <div className="palco-mural-steps">
          {STEPS.map((n) => (
            <article key={n}>
              <span className="palco-mural-step-number" aria-hidden="true">{String(n).padStart(2, '0')}</span>
              <h3>{t(`comunidade.step${n}Title`)}</h3>
              <p>{t(`comunidade.step${n}Copy`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="palco-mural-alert-section">
        <div className="palco-mural-alert-symbol" aria-hidden="true">🔔</div>
        <div className="palco-mural-alert-copy">
          <span className="palco-section-kicker">{t('comunidade.alertKicker')}</span>
          <h2>{t('comunidade.alertTitleLine1')}<br /><em>{t('comunidade.alertTitleLine2')}</em></h2>
          <p>{t('comunidade.alertCopy')}</p>
          <ul>
            <li>✓ {t('comunidade.alertItem1')}</li>
            <li>✓ {t('comunidade.alertItem2')}</li>
          </ul>
          <Link className="palco-mural-secondary-link" to="/login">{t('comunidade.alertCta')} →</Link>
        </div>
      </section>

      <section className="palco-mural-final">
        <div><span className="palco-section-kicker">{t('comunidade.finalKicker')}</span><h2>{t('comunidade.finalTitleLine1')}<br /><em>{t('comunidade.finalTitleLine2')}</em></h2></div>
        <div>
          <p>{t('comunidade.finalCopy')}</p>
          <Link className="palco-yellow-link" to="/mural/meus-anuncios">{t('comunidade.finalCta')} →</Link>
        </div>
      </section>
      <PalcoFooter />
    </main>
  )
}
