import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/** Rodapé compartilhado pelas 4 páginas públicas. `light`
 * (opcional): algumas páginas do template fecham numa faixa clara em vez
 * da escura padrão (ver .footer-light em landingPalco.css). */
export default function PalcoFooter({ light = false }) {
  const { t } = useTranslation('landingPalco')
  const { t: tLegal } = useTranslation('community')

  return (
    <footer className={`palco-footer ${light ? 'footer-light' : ''}`}>
      <div className="palco-brand">TUM TUM <b>PÁ</b></div>
      <p>{t('footer.tagline')}</p>
      <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
      <Link to="/privacidade" style={{ fontSize: 12, opacity: 0.8, textDecoration: 'underline' }}>{tLegal('legal.title')}</Link>
    </footer>
  )
}
