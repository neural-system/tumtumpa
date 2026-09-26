import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

/** Seguir/deixar de seguir um músico (`kind="user"`) ou banda (`kind="band"`). */
export default function FollowButton({ kind, handle, initialFollowing, onChange }) {
  const { t } = useTranslation('community')
  const token = useAuthStore((s) => s.token)
  const [following, setFollowing] = useState(!!initialFollowing)
  const [busy, setBusy] = useState(false)
  if (!token) return null

  const toggle = async () => {
    setBusy(true)
    try {
      const { data } = await api.post('/social/follow', { kind, handle, follow: !following })
      setFollowing(data.following)
      onChange?.(data)
    } finally {
      setBusy(false)
    }
  }
  return (
    <button className={`btn ${following ? '' : 'primary'}`} disabled={busy} onClick={toggle} aria-pressed={following}>
      {following ? t('profile.unfollow') : t('profile.follow')}
    </button>
  )
}
