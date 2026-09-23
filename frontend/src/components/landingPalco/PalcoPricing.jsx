import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { centavosParaMoeda } from '../../utils/currency'

/** Planos reais (GET /public/plans, rota pública) — mesma query de
 * PricingSection.jsx (landing/), só com a casca visual do template. O
 * template original tinha 3 cartões com preço fictício "pra validação do
 * conceito visual"; aqui não faz sentido inventar preço quando o dado real
 * já existe e é público. O card do meio (2º plano, se houver) ganha o
 * destaque "featured" do template — mesmo padrão editorial, sem assumir
 * qual plano é o "mais escolhido" de verdade. */
export default function PalcoPricing() {
  const { t, i18n } = useTranslation('landingPalco')

  const { data: plans, isLoading } = useQuery({
    queryKey: ['public-plans'],
    queryFn: () => api.get('/public/plans').then((r) => r.data),
  })

  return (
    <section className="palco-plans-section" id="planos">
      <div className="palco-section-kicker">{t('pricing.kicker')}</div>
      <div className="palco-plans-heading">
        <h2>{t('pricing.title')}</h2>
        <p>{t('pricing.subtitle')}</p>
      </div>

      {isLoading && <p className="page-sub" style={{ textAlign: 'center' }}>{t('pricing.loading')}</p>}
      {!isLoading && plans?.length === 0 && (
        <p className="page-sub" style={{ textAlign: 'center' }}>{t('pricing.empty')}</p>
      )}

      {!isLoading && plans?.length > 0 && (
        <div className="palco-plans-grid">
          {plans.map((p, index) => (
            <article key={p.id} className={`palco-plan-card ${index === 1 ? 'featured' : ''}`}>
              <span>{String(index + 1).padStart(2, '0')} / {p.name}</span>
              <h3>{centavosParaMoeda(p.price_cents, i18n.language)}<small>{t('pricing.perMonth')}</small></h3>
              <p>{t('pricing.setlistsLimit', { count: p.max_setlists })}</p>
              <ul>
                <li>{t('pricing.storageLimit', { mb: p.storage_limit_mb })}</li>
                <li>{t('pricing.trial')}</li>
              </ul>
              <Link to="/cadastro" className="palco-plan-cta">{t('pricing.cta')}</Link>
            </article>
          ))}
        </div>
      )}
      <p className="palco-price-note">{t('pricing.note')}</p>
    </section>
  )
}
