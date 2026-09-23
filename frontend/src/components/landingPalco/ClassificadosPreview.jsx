import { useTranslation } from 'react-i18next'

/** Prévia estática (mock) — ao contrário de ComunidadePreview.jsx, aqui
 * NÃO existe dado real pra buscar: o TumTumPa não tem (ainda) um
 * marketplace de equipamento entre músicos. Os 3 itens abaixo são
 * ilustrativos de propósito, com rótulo "exemplo" — nunca prometer um
 * anúncio real que não existe (ver decisão no plano). */
const ITEMS = [1, 2, 3]

export default function ClassificadosPreview() {
  const { t } = useTranslation('landingPalco')

  return (
    <div className="palco-community-preview classifieds-preview">
      <div className="palco-community-preview-head">
        <span>{t('classificados.previewLabel')}</span>
      </div>
      {ITEMS.map((n) => (
        <div key={n} className="palco-community-preview-row">
          <b>{t(`classificados.item${n}Title`)}</b>
          <span>{t(`classificados.item${n}Meta`)}</span>
        </div>
      ))}
      <p className="palco-community-preview-empty">{t('classificados.previewNote')}</p>
    </div>
  )
}
