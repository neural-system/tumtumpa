import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import PalcoNav from '../components/landingPalco/PalcoNav'
import PalcoFooter from '../components/landingPalco/PalcoFooter'
import ClassificadosPreview from '../components/landingPalco/ClassificadosPreview'
import '../styles/landingPalco.css'
import '../styles/landingPalcoComunidade.css'

const CRITERIA = [1, 2, 3, 4]
const DETAILS = [1, 2, 3]

/** Conceito/prévia — o TumTumPa NÃO tem (ainda) um marketplace de
 * equipamento entre músicos; o template original descrevia esse recurso
 * como se já existisse. Por decisão explícita (ver plano), esta página
 * fica no ar como CONCEITO: o rótulo "em breve" aparece no kicker, no
 * hero e na CTA final, e não existe nenhum link funcional de "criar
 * anúncio" (diferente de /palco/comunidade, que linka pro /mural real). */
export default function PalcoClassificados() {
  const { t } = useTranslation('landingPalco')
  useDocumentMeta(t('meta.classificadosTitle'), t('meta.classificadosDescription'))

  return (
    <main className="palco-shell comunidade-shell">
      <PalcoNav active="classificados" />
      <section className="palco-mural-hero classifieds-hero">
        <div className="palco-mural-hero-copy">
          <span className="palco-section-kicker">{t('classificados.kicker')}</span>
          <h1>{t('classificados.titleLine1')}<br /><em>{t('classificados.titleLine2')}</em></h1>
          <p>{t('classificados.subtitle')}</p>
          <div className="palco-mural-actions">
            <a className="palco-yellow-link" href="#previa-classificados">{t('classificados.ctaExplore')} →</a>
            <Link className="palco-mural-secondary-link" to="/mural">{t('classificados.ctaMural')} →</Link>
          </div>
          <p className="palco-mural-access-note">{t('classificados.accessNote')}</p>
        </div>
        <div id="previa-classificados"><ClassificadosPreview /></div>
      </section>

      <section className="palco-mural-criteria">
        <div className="palco-mural-section-title">
          <span className="palco-section-kicker">{t('classificados.criteriaKicker')}</span>
          <h2>{t('classificados.criteriaTitleLine1')}<br /><em>{t('classificados.criteriaTitleLine2')}</em></h2>
        </div>
        <dl className="palco-mural-criteria-list">
          {CRITERIA.map((n) => (
            <div key={n}>
              <dt><span aria-hidden="true">{String(n).padStart(2, '0')}</span>{t(`classificados.criteria${n}Title`)}</dt>
              <dd>{t(`classificados.criteria${n}Copy`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="classifieds-details">
        <div className="palco-mural-section-title">
          <span className="palco-section-kicker">{t('classificados.detailsKicker')}</span>
          <h2>{t('classificados.detailsTitleLine1')}<br /><em>{t('classificados.detailsTitleLine2')}</em></h2>
          <p>{t('classificados.detailsSubtitle')}</p>
        </div>
        <div className="classifieds-detail-list">
          {DETAILS.map((n) => (
            <article key={n}>
              <span className="classifieds-detail-number" aria-hidden="true">{String(n).padStart(2, '0')}</span>
              <div><h3>{t(`classificados.detail${n}Title`)}</h3><p>{t(`classificados.detail${n}Copy`)}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="palco-mural-final">
        <div><span className="palco-section-kicker">{t('classificados.finalKicker')}</span><h2>{t('classificados.finalTitleLine1')}<br /><em>{t('classificados.finalTitleLine2')}</em></h2></div>
        <div>
          <p>{t('classificados.finalCopy')}</p>
          <Link className="palco-mural-secondary-link" to="/mural">{t('classificados.finalCta')} →</Link>
        </div>
      </section>
      <PalcoFooter />
    </main>
  )
}
