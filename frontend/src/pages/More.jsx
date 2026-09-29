import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { IconExit } from '../components/icons'
import { ITEMS } from '../config/sidebarItems'

/** Menu completo pro celular — só existe pra ser aberto a partir do atalho
 * "Mais" da navegação inferior (ver BottomNav.jsx); no desktop a sidebar já
 * mostra tudo isso direto, então esta página nunca aparece no menu principal
 * (não tem link nenhum pra ela na sidebar). Lista TODOS os itens de
 * ITEMS de novo (inclusive os 4 já fixados embaixo) — mais previsível
 * como "menu completo" do que só o que sobrou, mesmo padrão de apps como
 * Instagram/Threads. */
export default function More() {
  const { t } = useTranslation()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const visibleItems = ITEMS.filter((item) => !item.adminOnly || user?.is_admin)

  return (
    <>
      <h1 className="page-title">{t('nav.more')}</h1>
      <div className="card flush more-menu">
        {visibleItems.map((item) => item.section ? (
          <div key={item.section} className="nav-section-label more-menu-section">{t(item.section)}</div>
        ) : (
          <NavLink key={item.to} to={item.to} end={item.end} className="more-menu-item">
            <item.icon /><span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
        <button type="button" className="more-menu-item" onClick={() => { logout(); navigate('/login') }}>
          <IconExit /><span>{t('nav.logout')}</span>
        </button>
      </div>
    </>
  )
}
