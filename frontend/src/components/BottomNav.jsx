import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IconHome, IconMusic, IconList, IconMic, IconMore } from './icons'

/** Navegação inferior fixa, só em telas de celular (≤768px — ver
 * .bottom-nav no CSS; acima disso a sidebar de sempre continua). Pedido de
 * usabilidade: quem toca segurando o celular usa o polegar, não alcança
 * bem uma barra lateral fina. Só cabem ~5 atalhos; os 4 escolhidos aqui são
 * os de uso mais frequente durante um ensaio/show (dashboard, biblioteca
 * pessoal, setlists, atalho de tocar) — o resto do menu (histórico,
 * dicionário de acordes, comunidade, ferramentas, admin, configurações...)
 * mora em "Mais" (ver pages/More.jsx). Reajustar essa escolha é só trocar
 * os 4 <NavLink> abaixo, não precisa mexer em mais nada. */
export default function BottomNav() {
  const { t } = useTranslation()
  const cls = ({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`
  return (
    <nav className="bottom-nav no-print" aria-label={t('nav.more')}>
      <NavLink to="/painel" end className={cls}>
        <IconHome /><span>{t('nav.dashboard')}</span>
      </NavLink>
      <NavLink to="/minhas-musicas" className={cls}>
        <IconMusic /><span>{t('nav.mySongs')}</span>
      </NavLink>
      <NavLink to="/setlists" className={cls}>
        <IconList /><span>{t('nav.setlists')}</span>
      </NavLink>
      <NavLink to="/karaoke" className={cls}>
        <IconMic /><span>{t('nav.karaoke')}</span>
      </NavLink>
      <NavLink to="/mais" className={cls}>
        <IconMore /><span>{t('nav.more')}</span>
      </NavLink>
    </nav>
  )
}
