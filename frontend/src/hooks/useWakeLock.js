import { useEffect } from 'react'

/** Mantém a tela do dispositivo acesa enquanto `active` (ex.: música tocando
 * no palco) — no celular a tela apagava no meio da música e o músico tinha
 * que tocar na tela com a mão ocupada. Usa a Screen Wake Lock API (Chrome,
 * Safari 16.4+, Edge); onde não existe, não faz nada. O navegador solta o
 * bloqueio sozinho ao trocar de aba, então pede de novo ao voltar. */
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.wakeLock) return undefined
    let lock = null
    let cancelled = false
    const acquire = async () => {
      try {
        const l = await navigator.wakeLock.request('screen')
        if (cancelled) { l.release().catch(() => {}); return }
        lock = l
      } catch { /* negado (economia de bateria etc.): segue sem */ }
    }
    const onVisible = () => { if (document.visibilityState === 'visible' && (!lock || lock.released)) acquire() }
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      if (lock) lock.release().catch(() => {})
    }
  }, [active])
}
