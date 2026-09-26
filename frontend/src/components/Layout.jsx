import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import ThemeToggle from './ThemeToggle'
import UserMenu from './UserMenu'
import AlertsBell from './AlertsBell'
import PlanBadge from './PlanBadge'
import { useAuthStore } from '../store/authStore'

/** Casca do app logado (sidebar + cluster do topo + área principal). Separada
 * pra páginas que servem visitante E usuário (perfil/banda públicos) usarem a
 * mesma casca quando há login (ver AutoShell.jsx). */
export function AppFrame({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="top-right-fixed no-print">
        <AlertsBell />
        <PlanBadge />
        <UserMenu />
        <ThemeToggle />
      </div>
      <main className="main">{children}</main>
    </div>
  )
}

export default function Layout() {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <AppFrame><Outlet /></AppFrame>
}
