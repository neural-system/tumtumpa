import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import logoIcone from '../assets/logo-icone.png'
import { useAuthStore } from '../store/authStore'
import { IconExit } from './icons'
import { ITEMS } from '../config/sidebarItems'

export default function Sidebar() {
  const { t } = useTranslation()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const visibleItems = ITEMS.filter((item) => !item.adminOnly || user?.is_admin)
  return (
    <aside className="sidebar no-print">
      <div className="brand">
        <span className="brand-logo-full brand-word" aria-label="TumTumPa">TUM TUM <b>PÁ</b></span>
        {/* Mantém o ícone antigo aqui (e no favicon): a arte nova do TumTumPa
            é traço fino demais e vira mancha ilegível em 34px. */}
        <img src={logoIcone} alt="TumTumPa" className="brand-logo-icon" />
      </div>
      {visibleItems.map((item) => item.section ? (
        <div key={item.section} className="nav-section-label">{t(item.section)}</div>
      ) : (
        <NavLink key={item.to} to={item.to} end={item.end}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <item.icon /><span>{t(item.labelKey)}</span>
        </NavLink>
      ))}
      <div className="spacer" />
      <button className="nav-item"
        onClick={() => { logout(); navigate('/login') }}>
        <IconExit /><span>{t('nav.logout')}</span>
      </button>
    </aside>
  )
}
