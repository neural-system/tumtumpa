import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/** Atalhos de recursos, ao lado do workspace — só linka pra âncoras que
 * existem de verdade (setlist/planos na home /); os demais itens
 * (pedal, transposição) são só descritivos, sem link — não fabrica uma
 * página de recurso isolada que o app não tem. */
const ITEMS = [
  { key: 'setlist', href: '/#setlist' },
  { key: 'transpose', href: null },
  { key: 'pedal', href: null },
  { key: 'sync', href: '/#transformacao' },
]

export default function FeatureDock() {
  const { t } = useTranslation('landingPalco')

  return (
    <aside className="palco-feature-dock">
      <div className="palco-dock-intro">
        <span>{t('fluxo.dockEyebrow')}</span>
        <b>{t('fluxo.dockTitle')}</b>
        <small>{t('fluxo.dockSubtitle')}</small>
      </div>
      {ITEMS.map((item) => {
        const content = (
          <>
            <i aria-hidden="true">{t(`fluxo.dock${item.key}Icon`)}</i>
            <div>
              <b>{t(`fluxo.dock${item.key}Title`)}</b>
              <small>{t(`fluxo.dock${item.key}Copy`)}</small>
            </div>
            <span aria-hidden="true">→</span>
          </>
        )
        return item.href
          ? <Link key={item.key} to={item.href}>{content}</Link>
          : <div key={item.key} className="palco-dock-static">{content}</div>
      })}
      <div className="palco-dock-cta">
        <span>{t('fluxo.dockCtaLabel')}</span>
        <Link to="/cadastro">{t('fluxo.dockCta')} →</Link>
      </div>
    </aside>
  )
}
