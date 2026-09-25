import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './i18n'
import { useColorSettings } from './hooks/useColorSettings'
import { useLocale } from './hooks/useLocale'
import { useTheme } from './hooks/useTheme'
import { useActivityPing } from './hooks/useActivityPing'
import Layout from './components/Layout'
import PublicSongView from './pages/PublicSongView'
import PublicFeedback from './pages/PublicFeedback'
import Palco from './pages/Palco'
import PalcoFluxo from './pages/PalcoFluxo'
import PalcoComunidade from './pages/PalcoComunidade'
import PalcoClassificados from './pages/PalcoClassificados'
import BandBoard from './pages/BandBoard'
import BandBoardManage from './pages/BandBoardManage'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import Songs from './pages/Songs'
import SongEditor from './pages/SongEditor'
import Setlists from './pages/Setlists'
import SetlistDetail from './pages/SetlistDetail'
import KaraokeHome from './pages/KaraokeHome'
import KaraokePlayer from './pages/KaraokePlayer'
import ChordDictionary from './pages/ChordDictionary'
import HistoryPage from './pages/HistoryPage'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import Pricing from './pages/Pricing'
import Metronome from './pages/Metronome'
import Tuner from './pages/Tuner'
import PedalSetup from './pages/PedalSetup'
import AdminTools from './pages/AdminTools'
import AdminSales from './pages/AdminSales'

export default function App() {
  useColorSettings()
  useLocale()
  useTheme()
  useActivityPing()
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Palco />} />
        <Route path="/palco" element={<Navigate to="/" replace />} />
        <Route path="/sobre" element={<Navigate to="/" replace />} />
        <Route path="/palco/fluxo" element={<PalcoFluxo />} />
        <Route path="/palco/comunidade" element={<PalcoComunidade />} />
        <Route path="/palco/classificados" element={<PalcoClassificados />} />
        <Route path="/cifra/:slug" element={<PublicSongView />} />
        <Route path="/feedback/:token" element={<PublicFeedback />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<SignUp />} />
        <Route path="/karaoke/:slug" element={<KaraokePlayer />} />
        <Route path="/mural" element={<BandBoard />} />
        <Route element={<Layout />}>
          <Route path="/painel" element={<Dashboard />} />
          <Route path="/mural/meus-anuncios" element={<BandBoardManage />} />
          <Route path="/musicas" element={<Songs />} />
          <Route path="/musicas/:slug" element={<SongEditor />} />
          <Route path="/favoritas" element={<Songs favoritesOnly />} />
          <Route path="/setlists" element={<Setlists />} />
          <Route path="/setlists/:id" element={<SetlistDetail />} />
          <Route path="/karaoke" element={<KaraokeHome />} />
          <Route path="/dicionario-acordes" element={<ChordDictionary />} />
          <Route path="/historico" element={<HistoryPage />} />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/planos" element={<Pricing />} />
          <Route path="/metronomo" element={<Metronome />} />
          <Route path="/afinador" element={<Tuner />} />
          <Route path="/pedal" element={<PedalSetup />} />
          <Route path="/admin/ferramenta" element={<AdminTools />} />
          <Route path="/admin/vendas" element={<AdminSales />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
