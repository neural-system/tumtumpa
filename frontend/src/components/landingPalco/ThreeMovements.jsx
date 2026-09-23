import { useTranslation } from 'react-i18next'

const STEPS = [1, 2, 3]

export default function ThreeMovements() {
  const { t } = useTranslation('landingPalco')

  return (
    <section className="palco-three-movements">
      <div className="palco-section-kicker">{t('movements.kicker')}</div>
      <div className="palco-movement-row">
        {STEPS.map((n) => (
          <article key={n}>
            <span>{String(n).padStart(2, '0')}</span>
            <div className="palco-movement-icon">{t(`movements.step${n}Icon`)}</div>
            <h3>{t(`movements.step${n}Title`)}</h3>
            <p>{t(`movements.step${n}Copy`)}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
