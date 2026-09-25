import { useCurrentTheme } from '../hooks/useTheme'
import logoClaro from '../assets/logo-tumtumpa-wide.png'
import logoEscuro from '../assets/logo-tumtumpa-wide-dark.png'

/** Logo em arte (login/cadastro). O PNG original tem letras brancas e some
 * no tema claro; nele usamos a variante escura (mesma arte, letras em tinta
 * e amarelo mais fechado pra contrastar com o papel). */
export default function AppLogo({ className = 'login-logo', alt = 'TumTumPa' }) {
  const theme = useCurrentTheme()
  return <img src={theme === 'light' ? logoEscuro : logoClaro} alt={alt} className={className} />
}
