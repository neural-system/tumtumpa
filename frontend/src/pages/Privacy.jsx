import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PublicHeader from '../components/PublicHeader'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

/** Política de Privacidade e Termos de Uso (`/privacidade`) — pública. Texto em
 * community.json de cada idioma (chave `legal`); é um RASCUNHO para revisão jurídica. */
export default function Privacy() {
  const { t } = useTranslation('community')
  useDocumentMeta(`${t('legal.title')} — TumTumPa`)
  const sections = t('legal.sections', { returnObjects: true })
  return (
    <div className="landing-page">
      <PublicHeader />
      <div className="landing-container" style={{ paddingTop: 96, paddingBottom: 56, maxWidth: 760 }}>
        <h1 className="page-title">{t('legal.title')}</h1>
        <div className="page-sub">{t('legal.updated')}</div>
        <p className="chip" style={{ marginBottom: 20 }}>{t('legal.draft')}</p>
        {Array.isArray(sections) && sections.map((s) => (
          <section key={s.h} style={{ marginBottom: 22 }}>
            <h2 className="section-heading" style={{ color: 'var(--text)' }}>{s.h}</h2>
            <p style={{ lineHeight: 1.65, color: 'var(--muted)' }}>{s.p}</p>
          </section>
        ))}
        <Link className="btn" to="/">{t('common.close')}</Link>
      </div>
    </div>
  )
}
