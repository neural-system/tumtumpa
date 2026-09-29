import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import Modal from './Modal'

/** Botão "+" que abre um modal com os setlists do usuário — pedido de
 * usabilidade: adicionar uma música a um setlist direto da listagem, sem
 * precisar abrir a música e usar o SongPicker de dentro de um setlist
 * específico (fluxo inverso do de sempre). Reaproveita os mesmos endpoints
 * de sempre (GET/PUT /setlists/:id, mesmo padrão de Setlists.jsx::AddSongPanel):
 * não existe uma rota dedicada de "adicionar 1 música", então busca os itens
 * atuais e reenvia a lista com o novo ref no fim. */
export default function AddToSetlistButton({ song, className = 'btn sm' }) {
  const { t } = useTranslation('songs')
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [addedTo, setAddedTo] = useState(null) // id do setlist que acabou de receber a música (feedback rápido no botão)

  const { data: setlists } = useQuery({
    queryKey: ['setlists'],
    queryFn: () => api.get('/setlists').then((r) => r.data),
    enabled: open,
  })
  const mySetlists = (setlists || []).filter((s) => s.is_owner)
  const ref = `${song.interprete}/${song.titulo}`

  const add = useMutation({
    mutationFn: async (setlistId) => {
      const { data: full } = await api.get(`/setlists/${setlistId}`)
      if (full.items.some((i) => i.ref === ref)) return { setlistId, already: true }
      const refs = [...full.items.map((i) => i.ref), ref]
      await api.put(`/setlists/${setlistId}`, { nome: full.nome, items: refs })
      return { setlistId, already: false }
    },
    onSuccess: ({ setlistId }) => {
      setAddedTo(setlistId)
      qc.invalidateQueries({ queryKey: ['setlist', setlistId] })
      qc.invalidateQueries({ queryKey: ['songs'] })
    },
  })

  return (
    <>
      <button type="button" className={className} title={t('addToSetlist.button')}
        onClick={(e) => { e.stopPropagation(); setAddedTo(null); setOpen(true) }}>
        +
      </button>
      {open && (
        <Modal title={t('addToSetlist.title', { song: song.titulo })} maxWidth={420}
          onClose={(e) => { e?.stopPropagation?.(); setOpen(false) }}>
          <div onClick={(e) => e.stopPropagation()}>
            {mySetlists.length === 0 && (
              <div className="empty">
                {t('addToSetlist.empty')}<br />
                <Link className="btn primary" style={{ marginTop: 12 }} to="/setlists" onClick={() => setOpen(false)}>
                  {t('addToSetlist.createLink')}
                </Link>
              </div>
            )}
            {mySetlists.length > 0 && (
              <div className="modal-scroll-list" style={{ maxHeight: '50vh' }}>
                {mySetlists.map((s) => (
                  <button key={s.id} type="button" className="row between reorder-row setlist-pick-row"
                    disabled={add.isPending} onClick={() => add.mutate(s.id)}>
                    <span className="truncate" style={{ flex: 1 }}>{s.nome}</span>
                    {addedTo === s.id && <span className="chip active">{t('addToSetlist.added')}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
