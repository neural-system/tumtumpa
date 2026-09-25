// Motor do Gerador de acompanhamento: toca em loop, em tempo real, um ritmo
// (ver accompanimentStyles.js) sobre uma progressão de acordes, sintetizando
// bateria/percussão, baixo, violão e teclado com Web Audio (zero arquivos de
// áudio, mesma abordagem de utils/bandSynth.js).
//
// Diferente do bandSynth (música inteira conhecida → agenda tudo de uma vez),
// aqui o loop é infinito e ajustável ao vivo (andamento, estilo, acordes,
// mixer): um agendador com antecedência curta (`LOOKAHEAD_S`, tick de 25 ms)
// lê o estado atual a cada passo — por isso mudanças entram no próximo passo
// sem parar o som.

import { STYLE_BY_ID, parseDrumPattern, chordIntervals, degreeInterval } from './accompanimentStyles'

const LOOKAHEAD_S = 0.14
const TICK_MS = 25
export const TRACKS = ['drums', 'bass', 'guitar', 'keys']

const midiToFreq = (midi) => 440 * 2 ** ((midi - 69) / 12)

// ---------------- buffers de corda (Karplus-Strong) ----------------

const pluckCache = new Map()

/** Corda dedilhada por Karplus-Strong: `decay` perto de 1 = ressoa; `seconds`
 * limita o tamanho. Cacheado por (nota, timbre, taxa) — gerar é barato, mas
 * repetir a cada batida seria desperdício. */
function pluckBuffer(ctx, midi, kind) {
  const key = `${ctx.sampleRate}:${midi}:${kind}`
  const cached = pluckCache.get(key)
  if (cached) return cached
  const cfg = {
    open: { decay: 0.9965, seconds: 1.6 }, // acorde solto, ressoa
    short: { decay: 0.985, seconds: 0.4 }, // acorde curto/seco
    mute: { decay: 0.93, seconds: 0.14 }, // abafado, quase só palhetada
    bass: { decay: 0.998, seconds: 1.4 },
  }[kind]
  const sr = ctx.sampleRate
  const period = Math.max(2, Math.round(sr / midiToFreq(midi)))
  const total = Math.floor(sr * cfg.seconds)
  const buffer = ctx.createBuffer(1, total, sr)
  const out = buffer.getChannelData(0)
  const line = new Float32Array(period)
  let prev = 0
  for (let i = 0; i < period; i++) { // ruído levemente filtrado = ataque menos áspero
    const n = Math.random() * 2 - 1
    prev = prev * 0.5 + n * 0.5
    line[i] = prev
  }
  let idx = 0
  for (let i = 0; i < total; i++) {
    const next = (idx + 1) % period
    const v = (line[idx] + line[next]) * 0.5 * cfg.decay
    out[i] = line[idx]
    line[idx] = v
    idx = next
  }
  pluckCache.set(key, buffer)
  return buffer
}

// ---------------- percussão ----------------

function noise(ctx, dest, when, { dur, type, freq, q = 1, peak }) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur))
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2.5
  const src = ctx.createBufferSource()
  src.buffer = buf
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(peak, when)
  src.connect(f).connect(g).connect(dest)
  src.start(when)
}

function tone(ctx, dest, when, { type = 'sine', f0, f1 = f0, sweep = 0.1, dur, peak }) {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f0, when)
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, when + sweep)
  const g = ctx.createGain()
  g.gain.setValueAtTime(peak, when)
  g.gain.exponentialRampToValueAtTime(0.001, when + dur)
  o.connect(g).connect(dest)
  o.start(when)
  o.stop(when + dur + 0.02)
}

const DRUM_VOICES = {
  k: (c, d, w, v) => tone(c, d, w, { f0: 150, f1: 42, sweep: 0.12, dur: 0.28, peak: 1.0 * v }),
  s: (c, d, w, v) => {
    noise(c, d, w, { dur: 0.16, type: 'bandpass', freq: 1900, q: 0.8, peak: 0.75 * v })
    tone(c, d, w, { type: 'triangle', f0: 210, f1: 170, sweep: 0.05, dur: 0.1, peak: 0.45 * v })
  },
  r: (c, d, w, v) => { // rimshot / cross-stick
    tone(c, d, w, { type: 'square', f0: 820, dur: 0.03, peak: 0.25 * v })
    noise(c, d, w, { dur: 0.05, type: 'bandpass', freq: 2600, q: 2, peak: 0.5 * v })
  },
  h: (c, d, w, v) => noise(c, d, w, { dur: 0.04, type: 'highpass', freq: 7500, peak: 0.32 * v }),
  o: (c, d, w, v) => noise(c, d, w, { dur: 0.22, type: 'highpass', freq: 7000, peak: 0.3 * v }),
  sh: (c, d, w, v) => noise(c, d, w, { dur: 0.06, type: 'bandpass', freq: 6200, q: 1.2, peak: 0.4 * v }), // ganzá / shaker
  t: (c, d, w, v) => tone(c, d, w, { f0: 130, f1: 78, sweep: 0.08, dur: 0.22, peak: 0.95 * v }), // zabumba / surdo
  tri: (c, d, w, v) => { // triângulo
    tone(c, d, w, { f0: 6200, dur: 0.35, peak: 0.13 * v })
    tone(c, d, w, { f0: 9100, dur: 0.28, peak: 0.09 * v })
  },
  pan: (c, d, w, v) => {
    noise(c, d, w, { dur: 0.07, type: 'bandpass', freq: 3200, q: 1.5, peak: 0.45 * v })
    noise(c, d, w, { dur: 0.05, type: 'highpass', freq: 9000, peak: 0.18 * v })
  },
  clap: (c, d, w, v) => {
    for (let i = 0; i < 3; i++) noise(c, d, w + i * 0.011, { dur: 0.09, type: 'bandpass', freq: 1500, q: 1, peak: 0.5 * v })
  },
}

// ---------------- vozes melódicas ----------------

function bassVoice(ctx, dest, when, midi, dur, vel, timbre) {
  if (timbre === 'pluck') {
    const src = ctx.createBufferSource()
    src.buffer = pluckBuffer(ctx, midi, 'bass')
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    const g = ctx.createGain()
    g.gain.setValueAtTime(1.6 * vel, when)
    g.gain.setTargetAtTime(0.0001, when + Math.max(0.05, dur * 0.85), 0.04)
    src.connect(lp).connect(g).connect(dest)
    src.start(when)
    src.stop(when + Math.max(0.2, dur + 0.3))
    return
  }
  const f = midiToFreq(midi)
  const o1 = ctx.createOscillator()
  o1.type = timbre === 'synth' ? 'sawtooth' : 'sine'
  o1.frequency.value = f
  const o2 = ctx.createOscillator()
  o2.type = 'triangle'
  o2.frequency.value = f
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(timbre === 'synth' ? 1400 : 700, when)
  if (timbre === 'synth') lp.frequency.exponentialRampToValueAtTime(350, when + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(0.9 * vel, when + 0.012)
  g.gain.setValueAtTime(0.9 * vel, when + Math.max(0.02, dur * 0.7))
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.04)
  o1.connect(lp)
  o2.connect(lp)
  lp.connect(g).connect(dest)
  ;[o1, o2].forEach((o) => { o.start(when); o.stop(when + dur + 0.08) })
}

/** Uma nota de violão: KS (`kind` do buffer) + leve passa-baixa. */
function guitarNote(ctx, dest, when, midi, vel, kind) {
  const src = ctx.createBufferSource()
  src.buffer = pluckBuffer(ctx, midi, kind)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = kind === 'mute' ? 2400 : 5200
  const g = ctx.createGain()
  g.gain.value = vel * 0.55
  src.connect(lp).connect(g).connect(dest)
  src.start(when)
}

function keysNote(ctx, dest, when, midi, dur, vel, timbre) {
  const f = midiToFreq(midi)
  const g = ctx.createGain()
  const oscs = []
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.connect(g).connect(dest)
  const add = (type, freq, gain, detune = 0) => {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = freq
    o.detune.value = detune
    const og = ctx.createGain()
    og.gain.value = gain
    o.connect(og).connect(lp)
    oscs.push(o)
  }
  let attack = 0.01
  let release = 0.08
  if (timbre === 'epiano') { // piano elétrico: fundamental + parcial fraco, decai sozinho
    lp.frequency.value = 3200
    add('sine', f, 0.8)
    add('sine', f * 2, 0.22)
    add('sine', f * 4, 0.06, 4)
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(0.5 * vel, when + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(dur, 0.6) + 0.5)
  } else if (timbre === 'organ') { // órgão: parciais fixos, liga/desliga
    lp.frequency.value = 3800
    add('sine', f, 0.6)
    add('sine', f * 2, 0.35)
    add('sine', f * 3, 0.18)
    g.gain.setValueAtTime(0.0001, when)
    g.gain.linearRampToValueAtTime(0.42 * vel, when + 0.012)
    g.gain.setValueAtTime(0.42 * vel, when + dur)
    g.gain.linearRampToValueAtTime(0.0001, when + dur + 0.05)
  } else if (timbre === 'accordion') { // sanfona: dois "palhetas" desafinadas + tremolo
    lp.frequency.value = 2600
    add('sawtooth', f, 0.35, -7)
    add('sawtooth', f, 0.35, 7)
    attack = 0.03
    g.gain.setValueAtTime(0.0001, when)
    g.gain.linearRampToValueAtTime(0.26 * vel, when + attack)
    g.gain.setValueAtTime(0.26 * vel, when + Math.max(attack, dur - 0.04))
    g.gain.linearRampToValueAtTime(0.0001, when + dur + 0.06)
  } else { // pad: ataque lento, sustenta o acorde
    lp.frequency.value = 2000
    add('triangle', f, 0.6)
    add('sine', f * 2, 0.25, 5)
    attack = 0.12
    release = 0.25
    g.gain.setValueAtTime(0.0001, when)
    g.gain.linearRampToValueAtTime(0.3 * vel, when + attack)
    g.gain.setValueAtTime(0.3 * vel, when + Math.max(attack, dur - release))
    g.gain.linearRampToValueAtTime(0.0001, when + dur)
  }
  const end = when + Math.max(dur, 0.6) + 0.7
  oscs.forEach((o) => { o.start(when); o.stop(end) })
}

// ---------------- notas do acorde ----------------

/** Notas MIDI ascendentes do acorde a partir de `baseMidi` (fundamental) —
 * cicla pelos intervalos, subindo uma oitava a cada volta (`count` notas). */
function voicing(chord, baseMidi, count) {
  const ivs = chordIntervals(chord)
  const out = []
  for (let i = 0; i < count; i++) out.push(baseMidi + ivs[i % ivs.length] + 12 * Math.floor(i / ivs.length))
  return out
}

const guitarBase = (chord) => 40 + ((chord.root - 4 + 12) % 12) // E2..D#3
const keysBase = (chord) => 54 + ((chord.root - 6 + 12) % 12) // F#3..F4
const bassMidi = (pc) => 28 + ((pc - 4 + 12) % 12) // E1..D#2

// ---------------- motor ----------------

export class AccompanimentEngine {
  constructor() {
    this.ctx = null
    this.playing = false
    this.timer = null
    this.g = 0 // contador global de passos (semicolcheias)
    this.nextTime = 0
    this.played = [] // fila {when, bar, step, chordIdx} lida pela UI
    this.state = {
      styleId: 'poprock',
      bpm: 110,
      chords: [],
      barsPerChord: 1,
      fills: true,
      mix: { drums: { on: true, vol: 0.85 }, bass: { on: true, vol: 0.85 }, guitar: { on: true, vol: 0.8 }, keys: { on: true, vol: 0.7 } },
      master: 0.9,
    }
    this._prepared = null
  }

  configure(patch) {
    const prev = this.state.styleId
    this.state = { ...this.state, ...patch, mix: patch.mix ? { ...this.state.mix, ...patch.mix } : this.state.mix }
    if (patch.styleId && patch.styleId !== prev) {
      // alinha no início do próximo compasso do NOVO estilo (nº de passos pode mudar)
      const oldSteps = STYLE_BY_ID[prev].steps
      const bar = Math.ceil(this.g / oldSteps)
      this.g = bar * STYLE_BY_ID[patch.styleId].steps
      this._prepared = null
    }
    this._applyLevels()
  }

  _prepare() {
    const style = STYLE_BY_ID[this.state.styleId]
    if (this._prepared?.id === style.id) return this._prepared
    const drums = Object.entries(style.drums).map(([voice, str]) => ({ voice, hits: parseDrumPattern(str), vol: style.dv?.[voice] ?? 1 }))
    const at = (list) => {
      const m = new Map()
      list.forEach((e) => { if (!m.has(e.s)) m.set(e.s, []); m.get(e.s).push(e) })
      return m
    }
    this._prepared = { id: style.id, style, drums, bass: at(style.bass), guitar: at(style.guitar), keys: at(style.keys) }
    return this._prepared
  }

  _ensureContext() {
    if (this.ctx) return
    const Ctor = window.AudioContext || window.webkitAudioContext
    this.ctx = new Ctor()
    const comp = this.ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 6
    this.master = this.ctx.createGain()
    this.master.connect(comp).connect(this.ctx.destination)
    this.buses = {}
    TRACKS.forEach((t) => {
      this.buses[t] = this.ctx.createGain()
      this.buses[t].connect(this.master)
    })
    this._applyLevels()
  }

  _applyLevels() {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    this.master.gain.setTargetAtTime(this.state.master, now, 0.02)
    TRACKS.forEach((t) => {
      const m = this.state.mix[t]
      this.buses[t].gain.setTargetAtTime(m.on ? m.vol : 0, now, 0.02)
    })
  }

  async start() {
    this._ensureContext()
    await this.ctx.resume()
    if (this.playing) return
    this._applyLevels() // desfaz o fade de um stop() recente
    this.playing = true
    this.g = 0
    this.played = []
    this.nextTime = this.ctx.currentTime + 0.08
    this.timer = setInterval(() => this._tick(), TICK_MS)
    this._tick()
  }

  stop() {
    if (!this.playing) return
    this.playing = false
    clearInterval(this.timer)
    this.timer = null
    if (this.ctx) { // corta o que já foi agendado com um fade curto
      const now = this.ctx.currentTime
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setTargetAtTime(0, now, 0.015)
      setTimeout(() => { if (!this.playing) this._applyLevels() }, 200)
    }
  }

  destroy() {
    this.stop()
    if (this.ctx) this.ctx.close().catch(() => {})
    this.ctx = null
  }

  /** Último passo já audível (pra UI destacar acorde/tempo); descarta o antigo. */
  pollPlayhead() {
    if (!this.ctx) return null
    const now = this.ctx.currentTime
    let last = null
    while (this.played.length && this.played[0].when <= now) last = this.played.shift()
    return last
  }

  _tick() {
    if (!this.playing) return
    const horizon = this.ctx.currentTime + LOOKAHEAD_S
    while (this.nextTime < horizon) {
      this._scheduleStep(this.g, this.nextTime)
      const stepDur = 60 / this.state.bpm / 4
      this.nextTime += stepDur
      this.g += 1
    }
  }

  _scheduleStep(g, when) {
    const { style, drums, bass, guitar, keys } = this._prepare()
    const { chords, barsPerChord, fills } = this.state
    if (!chords.length) return
    const stepsPerBar = style.steps
    const bar = Math.floor(g / stepsPerBar)
    const s = g % stepsPerBar
    const cycleBars = chords.length * barsPerChord
    const chordIdx = Math.floor(bar / barsPerChord) % chords.length
    const chord = chords[chordIdx]
    const stepDur = 60 / this.state.bpm / 4
    // swing: empurra a 2ª metade de cada tempo (passos 2 e 3) pra frente
    const w = style.swing && s % 4 >= 2 ? when + style.swing * 2 * stepDur : when
    this.played.push({ when, bar, step: s, chordIdx, cycleBar: bar % cycleBars })
    if (this.played.length > 400) this.played.splice(0, this.played.length - 400) // aba em segundo plano: ninguém consome

    const inFill = fills && style.fill !== 'none' && bar % cycleBars === cycleBars - 1 && s >= stepsPerBar - 4
    const d = this.buses.drums
    for (const { voice, hits, vol } of drums) {
      if (inFill && (voice === 's' || voice === 'k' || voice === 'r' || voice === 'clap')) continue
      const hit = hits.find((h) => h.s === s)
      if (hit) DRUM_VOICES[voice](this.ctx, d, w, hit.v * vol)
    }
    if (inFill) {
      const k = s - (stepsPerBar - 4)
      const v = 0.55 + k * 0.15
      if (style.fill === 'tom') {
        DRUM_VOICES.t(this.ctx, d, w, v)
        if (k % 2 === 1) DRUM_VOICES.tri(this.ctx, d, w, 1)
      } else {
        DRUM_VOICES.s(this.ctx, d, w, v)
        if (k === 0) DRUM_VOICES.k(this.ctx, d, w, 0.9)
      }
    }

    const beatSec = stepDur
    const bassRoot = chord.bass ?? chord.root
    ;(bass.get(s) || []).forEach((e) => {
      const iv = e.deg === 'r' ? 0 : degreeInterval(chord, e.deg)
      const base = bassMidi(bassRoot)
      // oitava e graus altos sobem mas mantêm a faixa grave
      const midi = base + (iv >= 12 ? 12 : iv)
      bassVoice(this.ctx, this.buses.bass, w, midi, Math.max(0.08, e.len * beatSec * 0.92), e.v, style.bassTimbre)
    })

    ;(guitar.get(s) || []).forEach((e) => this._guitar(chord, e, w, stepDur))
    ;(keys.get(s) || []).forEach((e) => this._keys(chord, e, w, stepDur, style.keysTimbre))
  }

  _guitar(chord, e, w, stepDur) {
    const dest = this.buses.guitar
    const notes = voicing(chord, guitarBase(chord), 5)
    const kind = e.kind
    if (kind[0] === 'a') {
      const idx = Math.min(notes.length - 1, Number(kind[1]))
      guitarNote(this.ctx, dest, w, notes[idx] + (idx < 2 ? 12 : 0), e.v, 'open')
      return
    }
    const buf = kind === 'D' || kind === 'U' ? 'open' : kind === 'C' ? 'short' : 'mute'
    const list = kind === 'U' ? notes.slice(2).reverse() : kind === 'D' ? notes : notes.slice(0, 4)
    const gap = kind === 'D' ? 0.014 : kind === 'U' ? 0.01 : 0.006
    const vel = kind === 'U' ? e.v * 0.7 : e.v
    list.forEach((m, i) => guitarNote(this.ctx, dest, w + i * gap, m, vel * (buf === 'open' ? 0.9 : 1), buf))
  }

  _keys(chord, e, w, stepDur, timbre) {
    const dest = this.buses.keys
    const notes = voicing(chord, keysBase(chord), 4)
    const dur = Math.max(0.08, e.len * stepDur)
    if (e.kind[0] === 'a') {
      const idx = Math.min(notes.length - 1, Number(e.kind[1]))
      keysNote(this.ctx, dest, w, notes[idx], dur, e.v, timbre)
      return
    }
    const len = e.kind === 'S' ? Math.min(dur, stepDur * 2.2) : dur
    notes.forEach((m) => keysNote(this.ctx, dest, w, m, len, e.v * 0.8, timbre))
  }
}
