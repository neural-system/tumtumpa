import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useDebounce } from '../hooks/useDebounce'
import VirtualList from '../components/VirtualList'
import FavoriteArtistsGenres from '../components/FavoriteArtistsGenres'
import { UploadCard, CreateCard } from './Songs'

const ROW_H = 58
const EMPTY_FILTERS = { genero: '', interprete: '', ritmo: '', tom: '', setlist: '', origin: '' }

/** Colunas ordenáveis (chave = `sort` aceito por GET /songs, ver search_service.py). */
const COLUMNS = [
  { key: 'favorita', label: 'col.fav', cls: 'ms-col-fav', desc: true },
  { key: 'titulo', label: 'col.title', cls: '' },
  { key: 'genero', label: 'col.genre', cls: 'hide-sm' },
  { key: 'ritmo', label: 'col.rhythm', cls: 'hide-sm' },
  { key: 'tom', label: 'col.key', cls: 'ms-col-narrow' },
  { key: 'bpm', label: 'col.bpm', cls: 'ms-col-narrow hide-sm' },
  { key: 'setlists', label: 'col.setlists', cls: 'hide-sm', desc: true },
]

/**
 * "Minhas Músicas" — a antiga Biblioteca pessoal + Favoritas numa tela só:
 * tabela com colunas ordenáveis (clique no cabeçalho: crescente → decrescente
 * → padrão) e filtros por gênero, intérprete, ritmo, tom, setlist, origem e
 * favoritas. O conjunto base (criadas, importadas/clonadas, favoritadas e
 * dentro dos seus setlists) é montado no backend (GET /songs?mine=1).
 */
export default function MySongs() {
  const { t } = useTranslation('songs')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [params] = useSearchParams()

  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [onlyFav, setOnlyFav] = useState(params.get('fav') === '1')
  const [includeFavGroups, setIncludeFavGroups] = useState(false)
  const [sort, setSort] = useState('')
  const [page, setPage] = useState(1)
  const [showUpload, setShowUpload] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showFavPanel, setShowFavPanel] = useState(false)
  const debouncedQ = useDebounce(q)

  const queryParams = {
    q: debouncedQ, page, page_size: 200, mine: 1, sort,
    genero: filters.genero, interprete: filters.interprete, ritmo: filters.ritmo, tom: filters.tom,
    setlist: filters.setlist, origin: filters.origin,
    fav_only: onlyFav ? 1 : 0, include_fav: includeFavGroups ? 1 : 0,
  }
  const { data } = useQuery({
    queryKey: ['songs', 'mine', queryParams],
    queryFn: () => api.get('/songs', { params: queryParams }).then((r) => r.data),
    keepPreviousData: true,
  })
  const { data: facets } = useQuery({ queryKey: ['facets'], queryFn: () => api.get('/songs/facets').then((r) => r.data) })
  const { data: setlists } = useQuery({ queryKey: ['setlists'], queryFn: () => api.get('/setlists').then((r) => r.data) })
  const mySetlists = useMemo(() => (setlists || []).filter((s) => s.is_owner), [setlists])

  const toggleFav = useMutation({
    mutationFn: ({ slug, value }) => api.post(`/songs/${slug}/favorite`, { value }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['songs'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })

  const items = data?.items || []
  const activeFilters = Object.values(filters).some(Boolean) || onlyFav || includeFavGroups || q
  const clearFilters = () => { setFilters(EMPTY_FILTERS); setOnlyFav(false); setIncludeFavGroups(false); setQ(''); setSort(''); setPage(1) }
  const setFilter = (patch) => { setFilters({ ...filters, ...patch }); setPage(1) }

  // ciclo do clique no cabeçalho: padrão (favoritas/setlists começam decrescente,
  // pra mostrar "mais" primeiro) → oposto → sem ordenação explícita
  const cycleSort = (col) => {
    const first = col.desc ? `-${col.key}` : col.key
    const second = col.desc ? col.key : `-${col.key}`
    setSort(sort === first ? second : sort === second ? '' : first)
    setPage(1)
  }
  const sortMark = (col) => (sort === col.key ? '▲' : sort === `-${col.key}` ? '▼' : '')

  return (
    <>
      <div className="row no-print" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">{t('titleMine')}</h1>
          <div className="page-sub">
            {data ? t('songCount', { count: data.total }) : t('loadingCount')}
            {t('mineHint')}
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={() => setShowFavPanel(!showFavPanel)}>
            ★ {t('mySongs.favPanel')}
          </button>
          <button className="btn" onClick={() => { setShowCreate(false); setShowUpload(!showUpload) }}>{t('importSong')}</button>
          <button className="btn primary" onClick={() => { setShowUpload(false); setShowCreate(!showCreate) }}>{t('createSong')}</button>
        </div>
      </div>

      {showUpload && <UploadCard onDone={() => setShowUpload(false)} />}
      {showCreate && <CreateCard onDone={() => setShowCreate(false)} />}
      {showFavPanel && <FavoriteArtistsGenres />}

      <div className="card ms-filters no-print">
        <div className="row" style={{ gap: 10 }}>
          <input className="input" style={{ maxWidth: 300 }} placeholder={t('searchPlaceholder')}
            value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
          <select className="input" style={{ maxWidth: 160 }} value={filters.genero} onChange={(e) => setFilter({ genero: e.target.value })}>
            <option value="">{t('allGenres')}</option>
            {facets?.generos.map((g) => <option key={g}>{g}</option>)}
          </select>
          <select className="input" style={{ maxWidth: 180 }} value={filters.interprete} onChange={(e) => setFilter({ interprete: e.target.value })}>
            <option value="">{t('allArtists')}</option>
            {facets?.interpretes.map((g) => <option key={g}>{g}</option>)}
          </select>
          <select className="input" style={{ maxWidth: 150 }} value={filters.ritmo} onChange={(e) => setFilter({ ritmo: e.target.value })}>
            <option value="">{t('mySongs.allRhythms')}</option>
            {facets?.ritmos.map((g) => <option key={g}>{g}</option>)}
          </select>
          <select className="input" style={{ maxWidth: 100 }} value={filters.tom} onChange={(e) => setFilter({ tom: e.target.value })}>
            <option value="">{t('key')}</option>
            {facets?.tons.map((g) => <option key={g}>{g}</option>)}
          </select>
          <select className="input" style={{ maxWidth: 200 }} value={filters.setlist} onChange={(e) => setFilter({ setlist: e.target.value })}>
            <option value="">{t('mySongs.allSetlists')}</option>
            <option value="none">{t('mySongs.noSetlist')}</option>
            {mySetlists.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
          <select className="input" style={{ maxWidth: 190 }} value={filters.origin} onChange={(e) => setFilter({ origin: e.target.value })}>
            <option value="">{t('mySongs.allOrigins')}</option>
            <option value="mine">{t('mySongs.originMine')}</option>
            <option value="others">{t('mySongs.originOthers')}</option>
          </select>
        </div>
        <div className="row" style={{ gap: 18, marginTop: 10 }}>
          <label className="ms-check">
            <input type="checkbox" checked={onlyFav} onChange={(e) => { setOnlyFav(e.target.checked); setPage(1) }} />
            ★ {t('mySongs.onlyFav')}
          </label>
          <label className="ms-check" title={t('mySongs.includeFavGroupsHint')}>
            <input type="checkbox" checked={includeFavGroups} onChange={(e) => { setIncludeFavGroups(e.target.checked); setPage(1) }} />
            {t('mySongs.includeFavGroups')}
          </label>
          {activeFilters && <button className="btn ghost sm" onClick={clearFilters}>{t('mySongs.clear')}</button>}
        </div>
      </div>

      <div className="card ms-table" style={{ padding: 0 }}>
        <div className="ms-row ms-head" role="row">
          {COLUMNS.map((col) => (
            <button key={col.key} type="button" role="columnheader" className={`ms-th ${col.cls}${sort.replace('-', '') === col.key ? ' sorted' : ''}`}
              aria-sort={sort === col.key ? 'ascending' : sort === `-${col.key}` ? 'descending' : 'none'}
              title={t('mySongs.sortBy', { col: t(col.key === 'favorita' ? 'mySongs.col.favTitle' : `mySongs.${col.label}`) })}
              onClick={() => cycleSort(col)}>
              {col.key === 'favorita' ? '★' : t(`mySongs.${col.label}`)} <span className="ms-sort">{sortMark(col)}</span>
            </button>
          ))}
          <span className="ms-th ms-col-play" />
        </div>
        {items.length === 0 && <div className="empty">{activeFilters ? t('mySongs.emptyFiltered') : t('emptyMine')}</div>}
        {items.length > 0 && (
          <VirtualList items={items} rowHeight={ROW_H} height={Math.min(640, items.length * ROW_H)}
            renderRow={(s) => (
              <div key={s.slug} className="ms-row ms-body" style={{ height: ROW_H }} role="link" tabIndex={0}
                onClick={() => navigate(`/musicas/${s.slug}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) navigate(`/musicas/${s.slug}`) }}>
                <div className="ms-col-fav">
                  <button type="button" className={`ms-star${s.favorita ? ' on' : s.fav_via ? ' via' : ''}`}
                    aria-pressed={!!s.favorita}
                    title={s.favorita ? t('mySongs.unfav') : s.fav_via ? t(`mySongs.favVia.${s.fav_via}`) : t('mySongs.fav')}
                    onClick={(e) => { e.stopPropagation(); toggleFav.mutate({ slug: s.slug, value: !s.favorita }) }}>
                    {s.favorita ? '★' : '☆'}
                  </button>
                </div>
                <div className="ms-title-cell">
                  <div className="title">{s.titulo}</div>
                  <div className="meta">
                    {s.interprete}
                    {s.user_id && s.user_id !== user?.id && <span className="ms-origin" title={t('otherUserTitle')}> · {t('otherUserChip')}</span>}
                    {s.user_id === user?.id && !s.shared && <span className="ms-origin" title={t('privateTitle')}> · {t('privateChip')}</span>}
                  </div>
                </div>
                <div className="meta hide-sm">{s.genero}</div>
                <div className="meta hide-sm">{s.ritmo}</div>
                <div className="ms-col-narrow">{s.tom && <span className="chip">{s.tom}</span>}</div>
                <div className="meta ms-col-narrow hide-sm">{s.bpm ?? ''}</div>
                <div className="ms-setlists hide-sm" title={(s.setlists || []).map((l) => l.nome).join(' · ')}>
                  {(s.setlists || []).length === 0 && <span className="meta">—</span>}
                  {(s.setlists || []).slice(0, 2).map((l) => <span key={l.id} className="chip ms-sl-chip">{l.nome}</span>)}
                  {(s.setlists || []).length > 2 && <span className="meta">{t('mySongs.moreSetlists', { count: s.setlists.length - 2 })}</span>}
                </div>
                <button className="btn sm ms-col-play" aria-label={`▶ ${s.titulo}`} onClick={(e) => { e.stopPropagation(); navigate(`/karaoke/${s.slug}`) }}>▶</button>
              </div>
            )} />
        )}
      </div>

      {data && data.total_pages > 1 && (
        <div className="row no-print" style={{ marginTop: 14, justifyContent: 'center' }}>
          <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('prevPage')}</button>
          <span className="meta" style={{ color: 'var(--muted)' }}>{t('pageOf', { page: data.page, total: data.total_pages })}</span>
          <button className="btn" disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}>{t('nextPage')}</button>
        </div>
      )}
    </>
  )
}
