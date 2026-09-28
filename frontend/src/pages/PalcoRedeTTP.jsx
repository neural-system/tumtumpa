import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import PalcoNav from '../components/landingPalco/PalcoNav'
import PalcoFooter from '../components/landingPalco/PalcoFooter'
import RedeTTPPreview from '../components/landingPalco/RedeTTPPreview'
import '../styles/landingPalco.css'
import '../styles/landingPalcoComunidade.css'

const FEATURES = [1, 2, 3, 4]
const STEPS = [1, 2, 3]

/** Página de "venda" da rede social de verdade (perfis, bandas, feed, agenda
 * de shows, contratações — ver Community.jsx e cia., tudo atrás de login em
 * /comunidade/*). Distinta de /palco/comunidade, que é a prévia do MURAL de
 * anúncios ("monte sua banda"); aqui o CTA aponta pras rotas reais da rede
 * (protegidas por @require_auth — o próprio Layout redireciona pro /login
 * quem ainda não tem conta, mesmo padrão já usado em ctaCreate de
 * PalcoComunidade). Mesma receita visual das outras 3 páginas públicas
 * (classes .palco-mural-* / landingPalcoComunidade.css), sem seção de
 * alerta (essa é específica do mural de vagas)." */
export default function PalcoRedeTTP() {
  const { t } = useTranslation('landingPalco')
  useDocumentMeta(t('meta.redettpTitle'), t('meta.redettpDescription'))

  return (
    <main className="palco-shell comunidade-shell">
      <PalcoNav active="redettp" />
      <section className="palco-mural-hero">
        <div className="palco-mural-hero-copy">
          <span className="palco-section-kicker">{t('redettp.kicker')}</span>
          <h1>{t('redettp.titleLine1')}<br /><em>{t('redettp.titleLine2')}</em></h1>
          <p>{t('redettp.subtitle')}</p>
          <div className="palco-mural-actions">
            <Link className="palco-yellow-link" to="/comunidade/descobrir">{t('redettp.ctaExplore')} →</Link>
            <Link className="palco-mural-secondary-link" to="/comunidade/perfil">{t('redettp.ctaCreate')} →</Link>
          </div>
          <p className="palco-mural-access-note">{t('redettp.accessNote')}</p>
        </div>
        <RedeTTPPreview />
      </section>

      <section className="palco-mural-criteria">
        <div className="palco-mural-section-title">
          <span className="palco-section-kicker">{t('redettp.featuresKicker')}</span>
          <h2>{t('redettp.featuresTitleLine1')}<br /><em>{t('redettp.featuresTitleLine2')}</em></h2>
        </div>
        <dl className="palco-mural-criteria-list">
          {FEATURES.map((n) => (
            <div key={n}>
              <dt><span aria-hidden="true">{String(n).padStart(2, '0')}</span>{t(`redettp.feature${n}Title`)}</dt>
              <dd>{t(`redettp.feature${n}Copy`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="palco-mural-how">
        <div className="palco-mural-section-title">
          <span className="palco-section-kicker">{t('redettp.howKicker')}</span>
          <h2>{t('redettp.howTitleLine1')}<br /><em>{t('redettp.howTitleLine2')}</em></h2>
        </div>
        <div className="palco-mural-steps">
          {STEPS.map((n) => (
            <article key={n}>
              <span className="palco-mural-step-number" aria-hidden="true">{String(n).padStart(2, '0')}</span>
              <h3>{t(`redettp.step${n}Title`)}</h3>
              <p>{t(`redettp.step${n}Copy`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="palco-mural-final">
        <div><span className="palco-section-kicker">{t('redettp.finalKicker')}</span><h2>{t('redettp.finalTitleLine1')}<br /><em>{t('redettp.finalTitleLine2')}</em></h2></div>
        <div>
          <p>{t('redettp.finalCopy')}</p>
          <Link className="palco-yellow-link" to="/comunidade/perfil">{t('redettp.finalCta')} →</Link>
        </div>
      </section>
      <PalcoFooter />
    </main>
  )
}
