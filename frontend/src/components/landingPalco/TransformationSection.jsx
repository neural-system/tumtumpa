import { useTranslation } from 'react-i18next'
import ChordSheet from '../ChordSheet'

/** "Do arquivo ao palco" — antes/depois no estilo "recorte de papel" do
 * template. O lado "antes" é texto cru ilustrativo (igual ao
 * BeforeAfter.jsx da /); o "depois" passa pelo MESMO ChordSheet.jsx real
 * do app, então é demonstração de verdade da formatação, não uma imagem
 * inventada. */
export default function TransformationSection() {
  const { t } = useTranslation('landingPalco')
  const demoBody = t('transformation.demoBody')

  return (
    <section className="palco-transformation" id="transformacao">
      <div className="palco-section-kicker">{t('transformation.kicker')}</div>
      <div className="palco-transformation-heading">
        <h2>{t('transformation.titleLine1')}<br />{t('transformation.titleLine2')}</h2>
        <p>{t('transformation.subtitle')}</p>
      </div>
      <div className="palco-before-after">
        <article className="palco-raw-file">
          <div className="palco-window-bar"><span /><span /><span /><b>{t('transformation.fileName')}</b></div>
          <pre>{demoBody}</pre>
          <span className="palco-tape-label">{t('transformation.beforeLabel')}</span>
        </article>
        <div className="palco-conversion-mark">→<span>{t('transformation.arrowLabel')}</span></div>
        <article className="palco-sync-file">
          <div className="palco-sync-top"><b>{t('transformation.afterTitle')}</b></div>
          <div className="card"><ChordSheet body={demoBody} /></div>
          <span className="palco-tape-label">{t('transformation.afterLabel')}</span>
        </article>
      </div>
    </section>
  )
}
