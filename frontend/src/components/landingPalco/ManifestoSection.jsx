import { useTranslation } from 'react-i18next'

export default function ManifestoSection() {
  const { t } = useTranslation('landingPalco')

  return (
    <section className="palco-manifesto">
      <p>{t('manifesto.kicker')}</p>
      <h2>{t('manifesto.titleLine1')}<br /><span>{t('manifesto.titleHighlight')}</span><br />{t('manifesto.titleLine2')}</h2>
      <div className="palco-manifesto-notes">
        <span>{t('manifesto.note1')}</span>
        <span>{t('manifesto.note2')}</span>
        <span>{t('manifesto.note3')}</span>
      </div>
    </section>
  )
}
