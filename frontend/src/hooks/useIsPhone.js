import { useEffect, useState } from 'react'

// Celular em pé (≤768px de largura) ou deitado (altura curta + toque). Mesma
// condição das regras `.karaoke-stage` pra celular em global.css — o CSS cuida
// do layout, este hook só existe pro que precisa NÃO ser renderizado (ex.:
// o iframe do YouTube, que ocupa tela e gasta dados).
const QUERY = '(max-width: 768px), (max-height: 500px) and (pointer: coarse)'

export function useIsPhone() {
  const [isPhone, setIsPhone] = useState(() => window.matchMedia(QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setIsPhone(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isPhone
}
