import {
  IconHome, IconMusic, IconSearch, IconDrum, IconChat, IconList, IconClock,
  IconMic, IconBook, IconUsers, IconMetronome, IconTuner, IconPedal, IconShield, IconChart,
  IconSettings, IconUser,
} from '../components/icons'

/** Itens do menu autenticado — extraído de Sidebar.jsx, que continua sendo
 * o único dono do array, agora importado daqui. */
export const ITEMS = [
  { to: '/painel', labelKey: 'nav.dashboard', icon: IconHome, end: true },
  { to: '/musicas', labelKey: 'nav.songs', icon: IconSearch },
  { to: '/minhas-musicas', labelKey: 'nav.mySongs', icon: IconMusic },
  { to: '/setlists', labelKey: 'nav.setlists', icon: IconList },
  { to: '/historico', labelKey: 'nav.history', icon: IconClock },
  { to: '/karaoke', labelKey: 'nav.karaoke', icon: IconMic },
  { to: '/dicionario-acordes', labelKey: 'nav.chordDictionary', icon: IconBook },
  { to: '/comunidade', labelKey: 'nav.community', icon: IconChat },
  { to: '/mural/meus-anuncios', labelKey: 'nav.bandBoard', icon: IconUsers },
  { section: 'nav.tools' },
  { to: '/acompanhamento', labelKey: 'nav.accompaniment', icon: IconDrum },
  { to: '/metronomo', labelKey: 'nav.metronome', icon: IconMetronome },
  { to: '/afinador', labelKey: 'nav.tuner', icon: IconTuner },
  { to: '/pedal', labelKey: 'nav.pedalSetup', icon: IconPedal },
  { to: '/admin/ferramenta', labelKey: 'nav.adminTools', icon: IconShield, adminOnly: true },
  { to: '/admin/vendas', labelKey: 'nav.adminSales', icon: IconChart, adminOnly: true },
  { to: '/admin/moderacao', labelKey: 'nav.adminModeration', icon: IconShield, adminOnly: true },
  { to: '/configuracoes', labelKey: 'nav.settings', icon: IconSettings },
  { to: '/perfil', labelKey: 'nav.profile', icon: IconUser },
]
