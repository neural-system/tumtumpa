// Ritmos do Gerador de acompanhamento (pages/Accompaniment.jsx) — cada estilo é
// uma grade de passos (semicolcheias) por compasso, no espírito dos "estilos"
// de teclado arranjador: bateria/percussão, baixo, violão/guitarra e teclado.
//
// Notação dos padrões de percussão (uma string por instrumento, 1 char por
// passo): "X" = acento, "x" = normal, "g" = "ghost" (nota fantasma, bem
// suave), "." = silêncio. Baixo/violão/teclado são listas [passo, tipo, duração
// em passos, intensidade].
//
//  - baixo, tipo = grau do acorde: 'r' fundamental, '3' terça, '5' quinta,
//    '6' sexta, '8' oitava (acima).
//  - violão: 'D' batida pra baixo (5 cordas), 'U' pra cima (3 cordas agudas),
//    'C' acorde curto/seco, 'M' abafado (palhetada percussiva), 'a0'..'a4'
//    nota isolada do acorde (arpejo).
//  - teclado: 'P' acorde sustentado, 'S' acorde curto (stab), 'a0'..'a3' nota.

const VELOCITY = { X: 1, x: 0.7, g: 0.3 }

/** "X..x" -> [{ s: 0, v: 1 }, { s: 3, v: 0.7 }] */
export function parseDrumPattern(str) {
  const hits = []
  for (let i = 0; i < str.length; i++) {
    const v = VELOCITY[str[i]]
    if (v) hits.push({ s: i, v })
  }
  return hits
}

const b = (step, deg, len = 2, vel = 0.9) => ({ s: step, deg, len, v: vel })
const g = (step, kind, len = 2, vel = 0.85) => ({ s: step, kind, len, v: vel })

export const ACCOMPANIMENT_STYLES = [
  {
    id: 'poprock', bpm: 110, minBpm: 70, maxBpm: 170, steps: 16, swing: 0, fill: 'snare',
    drums: { k: 'X.....x.X.x.....', s: '....X.......X...', h: 'X.x.X.x.X.x.X.x.' },
    bassTimbre: 'pluck',
    bass: [b(0, 'r'), b(2, 'r'), b(4, 'r'), b(6, 'r'), b(8, 'r'), b(10, 'r'), b(12, 'r'), b(14, '5')],
    guitar: [g(0, 'D', 3), g(4, 'D', 2, 0.75), g(6, 'U', 2, 0.6), g(8, 'D', 3), g(12, 'D', 2, 0.75), g(14, 'U', 2, 0.6)],
    keysTimbre: 'pad', keys: [g(0, 'P', 16, 0.45)],
  },
  {
    id: 'balada', bpm: 70, minBpm: 50, maxBpm: 100, steps: 16, swing: 0, fill: 'snare',
    drums: { k: 'X.........x.....', r: '........X.......', h: 'x.x.x.x.x.x.x.x.' }, dv: { h: 0.45, r: 0.8 },
    bassTimbre: 'sub', bass: [b(0, 'r', 8), b(8, 'r', 4), b(12, '5', 4)],
    guitar: [g(0, 'a0', 4), g(2, 'a2', 4, 0.7), g(4, 'a3', 4, 0.7), g(6, 'a2', 4, 0.7), g(8, 'a1', 4, 0.75), g(10, 'a2', 4, 0.7), g(12, 'a3', 4, 0.7), g(14, 'a2', 4, 0.7)],
    keysTimbre: 'pad', keys: [g(0, 'P', 16, 0.5)],
  },
  {
    id: 'samba', bpm: 100, minBpm: 80, maxBpm: 140, steps: 16, swing: 0, fill: 'tom',
    drums: { t: 'g...X...g...X...', sh: 'XgxgXgxgXgxgXgxg', r: 'x..x.x.x..x.x.x.' }, dv: { sh: 0.5, r: 0.55 },
    bassTimbre: 'sub', bass: [b(0, 'r', 5), b(6, '5', 2), b(8, 'r', 5), b(14, '5', 2)],
    guitar: [g(0, 'D', 2), g(3, 'U', 2, 0.6), g(4, 'M', 1, 0.8), g(6, 'D', 2), g(8, 'D', 2), g(11, 'U', 2, 0.6), g(12, 'M', 1, 0.8), g(14, 'D', 2)],
    keysTimbre: 'epiano', keys: [g(6, 'S', 2, 0.45), g(14, 'S', 2, 0.45)],
  },
  {
    id: 'bossa', bpm: 120, minBpm: 80, maxBpm: 150, steps: 16, swing: 0, fill: 'none',
    drums: { k: 'X.....x.X.....x.', r: 'x..x..x...x..x..', h: 'x.x.x.x.x.x.x.x.' }, dv: { h: 0.35, k: 0.6, r: 0.8 },
    bassTimbre: 'sub', bass: [b(0, 'r', 6), b(6, '5', 2), b(8, 'r', 6), b(14, '5', 2)],
    guitar: [g(0, 'C', 3, 0.8), g(3, 'C', 3, 0.7), g(6, 'C', 3, 0.7), g(10, 'C', 3, 0.7), g(13, 'C', 3, 0.7)],
    keysTimbre: 'epiano', keys: [g(0, 'P', 16, 0.3)],
  },
  {
    id: 'baiao', bpm: 100, minBpm: 70, maxBpm: 130, steps: 16, swing: 0, fill: 'tom',
    drums: { t: 'X.....x.x.....x.', tri: 'x.xxx.xxx.xxx.xx', sh: 'x.x.x.x.x.x.x.x.' }, dv: { sh: 0.4, tri: 0.6 },
    bassTimbre: 'sub', bass: [b(0, 'r', 5), b(6, '5', 3), b(8, '5', 5), b(14, 'r', 2)],
    guitar: [g(0, 'D', 3), g(6, 'D', 2), g(8, 'D', 3), g(14, 'U', 2, 0.6)],
    keysTimbre: 'accordion', keys: [g(0, 'P', 6, 0.5), g(6, 'P', 2, 0.5), g(8, 'P', 6, 0.5), g(14, 'P', 2, 0.5)],
  },
  {
    id: 'forro', bpm: 120, minBpm: 90, maxBpm: 160, steps: 16, swing: 0, fill: 'tom',
    drums: { t: 'X...g...X...g...', tri: 'x.xxx.xxx.xxx.xx', pan: 'x.x.x.x.x.x.x.x.' }, dv: { pan: 0.45, tri: 0.6 },
    bassTimbre: 'sub', bass: [b(0, 'r', 4), b(4, '5', 4), b(8, 'r', 4), b(12, '5', 4)],
    guitar: [g(0, 'D', 2), g(2, 'U', 2, 0.6), g(4, 'M', 1, 0.8), g(6, 'U', 2, 0.6), g(8, 'D', 2), g(10, 'U', 2, 0.6), g(12, 'M', 1, 0.8), g(14, 'U', 2, 0.6)],
    keysTimbre: 'accordion', keys: [g(0, 'P', 3, 0.5), g(4, 'P', 3, 0.5), g(8, 'P', 3, 0.5), g(12, 'P', 3, 0.5)],
  },
  {
    id: 'sertanejo', bpm: 88, minBpm: 60, maxBpm: 130, steps: 16, swing: 0, fill: 'snare',
    drums: { k: 'X.....x.X.......', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.' }, dv: { h: 0.4 },
    bassTimbre: 'pluck', bass: [b(0, 'r', 6), b(8, '5', 6), b(12, 'r', 4)],
    guitar: [g(0, 'D', 4), g(4, 'M', 1, 0.8), g(6, 'D', 2, 0.75), g(8, 'D', 4), g(12, 'M', 1, 0.8), g(14, 'U', 2, 0.6)],
    keysTimbre: 'pad', keys: [g(0, 'P', 16, 0.4)],
  },
  {
    id: 'reggae', bpm: 76, minBpm: 60, maxBpm: 100, steps: 16, swing: 0, fill: 'none',
    drums: { k: '........X.......', r: '........X.......', h: 'x.x.x.x.x.x.x.x.' }, dv: { h: 0.4 },
    bassTimbre: 'sub', bass: [b(0, 'r', 5), b(6, 'r', 2), b(10, '5', 3), b(14, 'r', 2)],
    guitar: [g(2, 'C', 2), g(6, 'C', 2), g(10, 'C', 2), g(14, 'C', 2)],
    keysTimbre: 'organ', keys: [g(2, 'S', 2, 0.45), g(6, 'S', 2, 0.45), g(10, 'S', 2, 0.45), g(14, 'S', 2, 0.45)],
  },
  {
    id: 'funk', bpm: 100, minBpm: 80, maxBpm: 130, steps: 16, swing: 0, fill: 'snare',
    drums: { k: 'X..x..x...x..x..', s: '....X..g.g..X...', h: 'XgxgXgxgXgxgXgxg' }, dv: { h: 0.4 },
    bassTimbre: 'synth', bass: [b(0, 'r', 3), b(3, 'r', 1), b(6, '8', 2), b(10, '5', 2), b(13, 'r', 1), b(14, '3', 1)],
    guitar: [g(0, 'M', 1), g(2, 'M', 1, 0.7), g(3, 'C', 1), g(6, 'M', 1), g(8, 'M', 1, 0.7), g(10, 'C', 1), g(12, 'M', 1), g(14, 'C', 1)],
    keysTimbre: 'epiano', keys: [g(3, 'S', 2, 0.45), g(10, 'S', 2, 0.45)],
  },
  {
    id: 'valsa', bpm: 96, minBpm: 60, maxBpm: 140, steps: 12, swing: 0, fill: 'none',
    drums: { k: 'X...........', r: '....x...x...', h: 'x...x...x...' }, dv: { h: 0.4, r: 0.7 },
    bassTimbre: 'sub', bass: [b(0, 'r', 4)],
    guitar: [g(4, 'D', 3, 0.8), g(8, 'D', 3, 0.8)],
    keysTimbre: 'pad', keys: [g(0, 'P', 12, 0.4)],
  },
  {
    id: 'blues', bpm: 100, minBpm: 70, maxBpm: 140, steps: 16, swing: 0.33, fill: 'snare',
    drums: { k: 'X.....X.X.....X.', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.' }, dv: { h: 0.55 },
    bassTimbre: 'pluck', bass: [b(0, 'r', 4), b(4, '3', 4), b(8, '5', 4), b(12, '6', 4)],
    guitar: [g(0, 'C', 2), g(2, 'M', 1, 0.7), g(4, 'C', 2), g(6, 'M', 1, 0.7), g(8, 'C', 2), g(10, 'M', 1, 0.7), g(12, 'C', 2), g(14, 'M', 1, 0.7)],
    keysTimbre: 'organ', keys: [g(0, 'P', 16, 0.3)],
  },
  {
    id: 'disco', bpm: 118, minBpm: 100, maxBpm: 135, steps: 16, swing: 0, fill: 'snare',
    drums: { k: 'X...X...X...X...', clap: '....X.......X...', o: '..X...X...X...X.', h: 'x.x.x.x.x.x.x.x.' }, dv: { h: 0.35, o: 0.6 },
    bassTimbre: 'synth', bass: [b(0, 'r', 2), b(2, '8', 2), b(4, 'r', 2), b(6, '8', 2), b(8, 'r', 2), b(10, '8', 2), b(12, 'r', 2), b(14, '8', 2)],
    guitar: [g(2, 'C', 1), g(3, 'M', 1, 0.6), g(6, 'C', 1), g(7, 'M', 1, 0.6), g(10, 'C', 1), g(11, 'M', 1, 0.6), g(14, 'C', 1), g(15, 'M', 1, 0.6)],
    keysTimbre: 'pad', keys: [g(0, 'P', 16, 0.4)],
  },
]

export const STYLE_BY_ID = Object.fromEntries(ACCOMPANIMENT_STYLES.map((s) => [s.id, s]))

// ---------------- notas e acordes ----------------

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
// tons que soam mais naturais com bemóis (maior: F Bb Eb Ab Db; menor: d g c f bb)
const FLAT_KEYS_MAJOR = new Set([5, 10, 3, 8, 1])
const FLAT_KEYS_MINOR = new Set([2, 7, 0, 5, 10])

export const KEY_OPTIONS = SHARP_NAMES.map((name, pc) => ({ pc, name: FLAT_KEYS_MAJOR.has(pc) ? FLAT_NAMES[pc] : name }))

// Progressões prontas — graus como [semitons acima da tônica, sufixo]. Uma
// lista por modo; o texto do acorde sai do tom escolhido.
export const PROGRESSIONS = [
  { id: 'pop', mode: 'major', degrees: [[0, ''], [7, ''], [9, 'm'], [5, '']] },
  { id: 'classic', mode: 'major', degrees: [[0, ''], [5, ''], [7, ''], [0, '']] },
  { id: 'fifties', mode: 'major', degrees: [[0, ''], [9, 'm'], [5, ''], [7, '']] },
  { id: 'ballad', mode: 'major', degrees: [[9, 'm'], [5, ''], [0, ''], [7, '']] },
  { id: 'jazz', mode: 'major', degrees: [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']] },
  { id: 'blues12', mode: 'major', degrees: [[0, '7'], [0, '7'], [0, '7'], [0, '7'], [5, '7'], [5, '7'], [0, '7'], [0, '7'], [7, '7'], [5, '7'], [0, '7'], [7, '7']] },
  { id: 'minor', mode: 'minor', degrees: [[0, 'm'], [8, ''], [3, ''], [10, '']] },
  { id: 'minorClassic', mode: 'minor', degrees: [[0, 'm'], [5, 'm'], [7, ''], [0, 'm']] },
]

/** Símbolos de acorde de uma progressão pronta num tom (tônica em pc 0-11). */
export function buildProgression(progressionId, keyPc) {
  const prog = PROGRESSIONS.find((p) => p.id === progressionId) || PROGRESSIONS[0]
  const flats = prog.mode === 'minor' ? FLAT_KEYS_MINOR.has(keyPc) : FLAT_KEYS_MAJOR.has(keyPc)
  const names = flats ? FLAT_NAMES : SHARP_NAMES
  return prog.degrees.map(([semi, suffix]) => `${names[(keyPc + semi) % 12]}${suffix}`)
}

/** Intervalos (classes de altura relativas à fundamental) ordenados e únicos. */
export function chordIntervals(chord) {
  return [...new Set(chord.intervals.map((i) => ((i % 12) + 12) % 12))].sort((a, b) => a - b)
}

/** Intervalo do grau pedido dentro do acorde: terça (maior/menor conforme o
 * acorde), quinta (justa/diminuta/aumentada), sexta ou oitava. */
export function degreeInterval(chord, deg) {
  const ivs = chordIntervals(chord)
  switch (deg) {
    case 'r': return 0
    case '3': return ivs.find((i) => i === 3 || i === 4) ?? 4
    case '5': return ivs.find((i) => i === 6 || i === 7 || i === 8) ?? 7
    case '6': return 9
    case '8': return 12
    default: return 0
  }
}
