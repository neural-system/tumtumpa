import { AppFrame } from '../Layout'
import PublicHeader from '../PublicHeader'
import { useAuthStore } from '../../store/authStore'

/** Páginas de perfil/banda servem visitante e usuário: logado, aparecem dentro
 * do app (sidebar); visitante, com o cabeçalho público leve (tema/entrar/cadastrar). */
export default function AutoShell({ children }) {
  const token = useAuthStore((s) => s.token)
  if (token) return <AppFrame>{children}</AppFrame>
  return (
    <div className="landing-page">
      <PublicHeader />
      <div className="landing-container" style={{ paddingTop: 96, paddingBottom: 48 }}>{children}</div>
    </div>
  )
}
