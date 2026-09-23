import { useTranslation } from 'react-i18next'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import PalcoNav from '../components/landingPalco/PalcoNav'
import PalcoFooter from '../components/landingPalco/PalcoFooter'
import MusicWorkspace from '../components/landingPalco/MusicWorkspace'
import '../styles/landingPalco.css'

/** Segundo conceito visual da variante /palco — "Central musical": em vez
 * da abertura em tela cheia de Palco.jsx, mostra direto um workspace de
 * biblioteca + player + atalhos. Mesmo produto, apresentação diferente —
 * o template original trazia os dois como propostas alternativas
 * navegáveis pela mesma barra de abas (ver PalcoNav). */
export default function PalcoFluxo() {
  const { t } = useTranslation('landingPalco')
  useDocumentMeta(t('meta.fluxoTitle'), t('meta.fluxoDescription'))

  return (
    <main className="palco-shell flow-shell">
      <PalcoNav active="fluxo" />
      <section className="palco-flow-intro">
        <div>
          <span className="palco-flow-label">{t('fluxo.introLabel')}</span>
          <h1>{t('fluxo.introTitleLine1')} <em>{t('fluxo.introTitleHighlight')}</em><br />{t('fluxo.introTitleLine2')}</h1>
        </div>
        <p>{t('fluxo.introSubtitle')}</p>
      </section>
      <MusicWorkspace />
      <PalcoFooter light />
    </main>
  )
}
