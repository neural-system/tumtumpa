import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'

/** Cabeçalho compartilhado pelas 4 páginas públicas (/, /palco/fluxo, /palco/comunidade, /palco/classificados) — marca em
 * texto estilizado via CSS (rotação leve + "PÁ" em âmbar), não a logo em
 * imagem do resto do app: é um traço de identidade do próprio template
 * (ver .brand em landingPalco.css) que vale a pena manter. Sem
 * ThemeToggle aqui de propósito — a identidade "editorial" (preto + papel
 * + âmbar, seções claras/escuras alternadas por design) é fixa, no mesmo
 * espírito do palco de karaokê (sempre escuro) e não responde ao tema
 * claro/escuro do visitante. */
export default function PalcoNav({ active }) {
  const { t } = useTranslation('landingPalco')
  // "Entrar" / "Voltar ao painel" vêm do namespace do mural (já traduzido nos 9 idiomas)
  const { t: tApp } = useTranslation('bandBoard')
  const token = useAuthStore((s) => s.token)

  return (
    <nav className="palco-nav" aria-label={t('nav.ariaLabel')}>
      <Link className="palco-brand" to="/" aria-label={t('nav.brandAria')}>
        TUM TUM <b>PÁ</b>
      </Link>
      <div className="palco-tabs" aria-label={t('nav.switchAria')}>
        <Link className={`palco-tab ${active === 'palco' ? 'active' : ''}`} to="/">
          {t('nav.tabPalco')}
        </Link>
        <Link className={`palco-tab ${active === 'fluxo' ? 'active' : ''}`} to="/palco/fluxo">
          {t('nav.tabFluxo')}
        </Link>
        <Link className={`palco-tab ${active === 'comunidade' ? 'active' : ''}`} to="/palco/comunidade">
          {t('nav.tabComunidade')}
        </Link>
        <Link className={`palco-tab ${active === 'classificados' ? 'active' : ''}`} to="/palco/classificados">
          {t('nav.tabClassificados')}
        </Link>
      </div>
      <div className="palco-nav-actions">
        {token ? (
          <Link className="palco-nav-cta" to="/painel">{tApp('backToApp')}</Link>
        ) : (
          <>
            <Link className="palco-nav-cta" to="/login">{tApp('login')}</Link>
            <Link className="palco-nav-cta" to="/cadastro">{t('nav.cta')}</Link>
          </>
        )}
      </div>
    </nav>
  )
}
