import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import PalcoNav from '../components/landingPalco/PalcoNav'
import PalcoFooter from '../components/landingPalco/PalcoFooter'
import StageHero from '../components/landingPalco/StageHero'
import TransformationSection from '../components/landingPalco/TransformationSection'
import ThreeMovements from '../components/landingPalco/ThreeMovements'
import PalcoSetlistShowcase from '../components/landingPalco/PalcoSetlistShowcase'
import ManifestoSection from '../components/landingPalco/ManifestoSection'
import PalcoPricing from '../components/landingPalco/PalcoPricing'
import '../styles/landingPalco.css'

/**
 * Home pública ("Palco vivo"), em "/" ("/palco" redireciona pra cá). Clonada
 * e adaptada de um template "Landing Editorial de Marca", com dados reais
 * (ChordSheet de verdade em TransformationSection, planos reais em
 * PalcoPricing). É a origem do design system "Palco" usado em todo o app
 * (ver styles/global.css).
 */
export default function Palco() {
  const { t } = useTranslation('landingPalco')
  useDocumentMeta(t('meta.homeTitle'), t('meta.homeDescription'))

  useEffect(() => {
    api.post('/telemetry/landing-view').catch(() => {})
  }, [])

  return (
    <main className="palco-shell">
      <PalcoNav active="palco" />
      <StageHero />
      <TransformationSection />
      <ThreeMovements />
      <PalcoSetlistShowcase />
      <ManifestoSection />
      <PalcoPricing />
      <PalcoFooter />
    </main>
  )
}
