import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const TABS = [
  { to: '/comunidade', key: 'tabs.feed', end: true },
  { to: '/comunidade/agenda', key: 'tabs.agenda' },
  { to: '/comunidade/descobrir', key: 'tabs.discover' },
  { to: '/comunidade/contratacoes', key: 'tabs.gigs' },
  { to: '/comunidade/perfil', key: 'tabs.me' },
]

/** Abas da seção Comunidade (mesma linguagem visual das abas do editor). */
export default function CommunityNav() {
  const { t } = useTranslation('community')
  return (
    <nav className="cm-tabs" aria-label={t('nav.title')}>
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `cm-tab${isActive ? ' active' : ''}`}>
          {t(tab.key)}
        </NavLink>
      ))}
    </nav>
  )
}
