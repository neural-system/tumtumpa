export const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Original sample text. It deliberately does not reproduce the selected song.
export const DEMO_LINES = [
  { section: "Introdução", chords: ["G", "D"], text: "A sala se enche de som" },
  { section: "Introdução", chords: ["Em", "C"], text: "É hora de a banda chegar" },
  { section: "Verso", chords: ["G", "D"], text: "No encontro de tantos caminhos" },
  { section: "Verso", chords: ["Em", "C"], text: "Há sempre um lugar pra tocar" },
  { section: "Verso", chords: ["Am", "C"], text: "A gente prepara o compasso" },
  { section: "Verso", chords: ["G", "D"], text: "E deixa a canção respirar" },
  { section: "Refrão", chords: ["C", "G"], text: "Vem fazer parte desse som" },
  { section: "Refrão", chords: ["D", "Em"], text: "Cada pessoa tem seu lugar" },
  { section: "Refrão", chords: ["C", "G"], text: "O nosso ensaio já começou" },
  { section: "Refrão", chords: ["D", "G"], text: "E o próximo acorde vai chegar" },
  { section: "Final", chords: ["Em", "C"], text: "A última nota fica no ar" },
  { section: "Final", chords: ["D", "G"], text: "Até a gente se encontrar" },
];

export const SECTIONS = ["Introdução", "Verso", "Refrão", "Final"];
export const SYNTH_INSTRUMENTS = ["Bateria", "Guitarra", "Baixo", "Teclado"];
export const CLIPS = ["Contagem de entrada", "Solo de guitarra", "Vinheta de encerramento"];
export const PEDAL_ACTIONS = ["Tocar / pausar", "Próxima linha", "Linha anterior", "Próximo clipe", "Próxima música"];

export function transpose(chord: string, shift: number) {
  const root = chord.match(/^[A-G]#?/)?.[0];
  if (!root) return chord;
  return NOTES[(NOTES.indexOf(root) + shift + 120) % 12] + chord.slice(root.length);
}

export function timeLabel(seconds: number) {
  return Math.floor(seconds / 60).toString().padStart(2, "0") + ":" + (seconds % 60).toString().padStart(2, "0");
}

