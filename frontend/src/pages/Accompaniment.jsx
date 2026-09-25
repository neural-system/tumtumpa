import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccompanimentEngine, TRACKS } from '../utils/accompanimentEngine'
import {
  ACCOMPANIMENT_STYLES, STYLE_BY_ID, PROGRESSIONS, KEY_OPTIONS, buildProgression,
} from '../utils/accompanimentStyles'
import { parseChordSymbol } from '../utils/chordParser'
import { IconPlay, IconPause } from '../components/icons'

const STORAGE_KEY = 'ck-accompaniment'
const DEFAULTS = {
  styleId: 'poprock', bpm: 110, keyPc: 0, progId: 'pop', chordText: 'C G Am F', barsPerChord: 1, fills: true,
  master: 0.9,
  mix: { drums: { on: true, vol: 0.85 }, bass: { on: true, vol: 0.85 }, guitar: { on: true, vol: 0.8 }, keys: { on: true, vol: 0.7 } },
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (saved && STYLE_BY_ID[saved.styleId]) return { ...DEFAULTS, ...saved, mix: { ...DEFAULTS.mix, ...(saved.mix || {}) } }
  } catch { /* storage indisponível: usa o padrão */ }
  return DEFAULTS
}

/** "C  G,Am|F" -> [{ text, chord|null }] — separa por espaço, vírgula ou barra vertical. */
function parseChordText(text) {
  return text.split(/[\s,|]+/).filter(Boolean).map((tok) => ({ text: tok, chord: parseChordSymbol(tok) }))
}

export default function Accompaniment() {
  const { t } = useTranslation('common')
  const [cfg, setCfg] = useState(loadSettings)
  const [playing, setPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(null)
  const engineRef = useRef(null)
  if (!engineRef.current) engineRef.current = new AccompanimentEngine()
  const engine = engineRef.current

  const style = STYLE_BY_ID[cfg.styleId]
  const parsed = useMemo(() => parseChordText(cfg.chordText), [cfg.chordText])
  const validChords = useMemo(() => parsed.filter((p) => p.chord).map((p) => ({ ...p.chord, label: p.text })), [parsed])
  const hasInvalid = parsed.some((p) => !p.chord)

  const update = (patch) => setCfg((c) => ({ ...c, ...patch }))

  // empurra a configuração pro motor (entra no próximo passo, sem parar o som)
  useEffect(() => {
    engine.configure({
      styleId: cfg.styleId, bpm: cfg.bpm, chords: validChords, barsPerChord: cfg.barsPerChord,
      fills: cfg.fills, mix: cfg.mix, master: cfg.master,
    })
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)) } catch { /* sem armazenamento */ }
  }, [cfg, validChords, engine])

  // destaque do acorde/tempo atual, sincronizado com o que está de fato tocando
  useEffect(() => {
    if (!playing) { setPlayhead(null); return undefined }
    let raf = requestAnimationFrame(function tick() {
      const p = engine.pollPlayhead()
      if (p) setPlayhead((prev) => (prev && prev.chordIdx === p.chordIdx && prev.step === p.step && prev.bar === p.bar ? prev : p))
      raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [playing, engine])

  useEffect(() => () => engine.destroy(), [engine])

  const toggle = async () => {
    if (playing) { engine.stop(); setPlaying(false); return }
    if (!validChords.length) return
    await engine.start()
    setPlaying(true)
  }

  const pickStyle = (id) => {
    const st = STYLE_BY_ID[id]
    update({ styleId: id, bpm: st.bpm })
  }
  const applyProgression = (progId, keyPc) => {
    update({ progId, keyPc, chordText: buildProgression(progId, keyPc).join(' ') })
  }
  const setBpm = (v) => update({ bpm: Math.min(style.maxBpm + 40, Math.max(style.minBpm - 20, Math.round(v))) })
  const setMix = (track, patch) => update({ mix: { ...cfg.mix, [track]: { ...cfg.mix[track], ...patch } } })

  const beatsPerBar = style.steps / 4
  const activeBeat = playhead ? Math.floor(playhead.step / 4) : -1

  return (
    <>
      <h1 className="page-title">{t('accompaniment.title')}</h1>
      <div className="page-sub">{t('accompaniment.subtitle')}</div>

      <div className="acc-layout">
        <div className="acc-main">
          <div className="card acc-stage">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="kicker">{t(`accompaniment.styles.${style.id}`)} · {cfg.bpm} BPM</div>
                <div className="acc-chord-strip" aria-live="off">
                  {validChords.length === 0 && <span className="acc-empty">{t('accompaniment.noChords')}</span>}
                  {validChords.map((c, i) => (
                    <span key={i} className={`acc-chord${playhead && playhead.chordIdx === i ? ' active' : ''}`}>{c.label}</span>
                  ))}
                </div>
              </div>
              <button className="btn primary acc-play" onClick={toggle} disabled={!validChords.length}>
                {playing ? <IconPause /> : <IconPlay />} {playing ? t('accompaniment.stop') : t('accompaniment.play')}
              </button>
            </div>
            <div className="acc-beats" aria-hidden="true">
              {Array.from({ length: beatsPerBar }, (_, i) => (
                <span key={i} className={`acc-beat${i === activeBeat ? ' on' : ''}${i === 0 ? ' down' : ''}`} />
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="section-heading">{t('accompaniment.styleTitle')}</h3>
            <div className="acc-style-grid">
              {ACCOMPANIMENT_STYLES.map((st) => (
                <button key={st.id} type="button" className={`acc-style${st.id === cfg.styleId ? ' active' : ''}`}
                  onClick={() => pickStyle(st.id)}>
                  <span className="acc-style-name">{t(`accompaniment.styles.${st.id}`)}</span>
                  <span className="acc-style-meta">{st.steps === 12 ? '3/4' : '4/4'} · {st.bpm}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="section-heading">{t('accompaniment.harmonyTitle')}</h3>
            <div className="row" style={{ alignItems: 'flex-end', gap: 12 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>{t('accompaniment.key')}</label>
                <select className="input" style={{ width: 90 }} value={cfg.keyPc}
                  onChange={(e) => applyProgression(cfg.progId, Number(e.target.value))}>
                  {KEY_OPTIONS.map((k) => <option key={k.pc} value={k.pc}>{k.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
                <label>{t('accompaniment.progression')}</label>
                <select className="input" value={cfg.progId}
                  onChange={(e) => applyProgression(e.target.value, cfg.keyPc)}>
                  {PROGRESSIONS.map((p) => <option key={p.id} value={p.id}>{t(`accompaniment.progressions.${p.id}`)}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>{t('accompaniment.barsPerChord')}</label>
                <select className="input" style={{ width: 90 }} value={cfg.barsPerChord}
                  onChange={(e) => update({ barsPerChord: Number(e.target.value) })}>
                  {[1, 2, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
              <label>{t('accompaniment.chords')}</label>
              <input className="input" value={cfg.chordText} spellCheck={false}
                onChange={(e) => update({ chordText: e.target.value })} placeholder="C G Am F" />
              <div className="acc-hint" style={hasInvalid ? { color: 'var(--danger)' } : undefined}>
                {hasInvalid
                  ? t('accompaniment.invalidChords', { list: parsed.filter((p) => !p.chord).map((p) => p.text).join(', ') })
                  : t('accompaniment.chordsHint')}
              </div>
            </div>
          </div>
        </div>

        <div className="acc-side">
          <div className="card">
            <h3 className="section-heading">{t('accompaniment.tempoTitle')}</h3>
            <div className="acc-bpm">
              <button className="btn" onClick={() => setBpm(cfg.bpm - 1)} title={t('accompaniment.slower')}>−</button>
              <div className="acc-bpm-value">{cfg.bpm}<span>BPM</span></div>
              <button className="btn" onClick={() => setBpm(cfg.bpm + 1)} title={t('accompaniment.faster')}>+</button>
            </div>
            <input type="range" className="acc-range" min={style.minBpm - 20} max={style.maxBpm + 40} value={cfg.bpm}
              onChange={(e) => setBpm(Number(e.target.value))} aria-label="BPM" />
            <label className="acc-check">
              <input type="checkbox" checked={cfg.fills} onChange={(e) => update({ fills: e.target.checked })} />
              {t('accompaniment.fills')}
            </label>
          </div>

          <div className="card">
            <h3 className="section-heading">{t('accompaniment.mixerTitle')}</h3>
            {TRACKS.map((tr) => (
              <div key={tr} className="acc-track">
                <button type="button" className={`btn acc-track-btn${cfg.mix[tr].on ? ' primary' : ''}`}
                  aria-pressed={cfg.mix[tr].on} onClick={() => setMix(tr, { on: !cfg.mix[tr].on })}>
                  {t(`accompaniment.tracks.${tr}`)}
                </button>
                <input type="range" className="acc-range" min={0} max={1} step={0.01} value={cfg.mix[tr].vol}
                  disabled={!cfg.mix[tr].on} onChange={(e) => setMix(tr, { vol: Number(e.target.value) })}
                  aria-label={t(`accompaniment.tracks.${tr}`)} />
              </div>
            ))}
            <div className="acc-track" style={{ marginTop: 10 }}>
              <span className="kicker" style={{ width: 84 }}>{t('accompaniment.master')}</span>
              <input type="range" className="acc-range" min={0} max={1} step={0.01} value={cfg.master}
                onChange={(e) => update({ master: Number(e.target.value) })} aria-label={t('accompaniment.master')} />
            </div>
          </div>
          <p className="acc-hint" style={{ marginTop: 4 }}>{t('accompaniment.hint')}</p>
        </div>
      </div>
    </>
  )
}
