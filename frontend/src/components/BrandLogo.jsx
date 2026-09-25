/** Marca em texto do design system "Palco" (mesma da sidebar e da home) —
 * "PÁ" na cor de destaque do tema. Usada no mural (BandBoard.jsx) e na
 * cifra pública (PublicHeader.jsx). */
export default function BrandLogo({ className = '', alt = 'TumTumPa' }) {
  return <span className={`brand-word ${className}`.trim()} role="img" aria-label={alt}>TUM TUM <b>PÁ</b></span>
}
