import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { CatalogSong } from "../landing-components";
import { DemoIcon } from "./DemoIcon";
import { CLIPS, DEMO_LINES, NOTES, PEDAL_ACTIONS, SECTIONS, SYNTH_INSTRUMENTS, timeLabel, transpose } from "./demo-data";
import "./cifra-demo.css";

type Panel = "setlist" | "audio" | "pedal" | "tools";
type Modal = "edit" | "versions" | "print" | "export" | "share" | "clone" | "medley" | "dictionary" | "metronome" | "tuner" | "shortcuts" | "youtube" | null;
const panelTabs: { id: Panel; title: string; icon: string }[] = [
  { id: "setlist", title: "Setlist", icon: "list" }, { id: "audio", title: "Áudio", icon: "audio" },
  { id: "pedal", title: "Pedal", icon: "pedal" }, { id: "tools", title: "Ferramentas", icon: "tools" },
];
const modalTitles: Record<Exclude<Modal, null>, string> = {
  edit: "Editar cifra", versions: "Histórico de versões", print: "Imprimir / PDF", export: "Exportar TXT",
  share: "Compartilhar cifra", clone: "Clonar cifra", medley: "Criar medley", dictionary: "Dicionário de acordes",
  metronome: "Metrônomo", tuner: "Afinador", shortcuts: "Atalhos de teclado", youtube: "Vídeo do YouTube",
};
const chordShapes: Record<string, number[]> = { G: [3, 2, 0, 0, 0, 3], C: [-1, 3, 2, 0, 1, 0], D: [-1, -1, 0, 2, 3, 2], Am: [-1, 0, 2, 2, 1, 0] };
const shortcutItems = [["Espaço", "Iniciar ou pausar a prévia"], ["← / →", "Linha anterior / próxima"], ["R", "Voltar ao início"], ["F", "Entrar ou sair do modo palco"], ["Esc", "Fechar janela ou sair do modo palco"]];

function IconButton({ icon, label, onClick, disabled = false, pressed }: { icon: string; label: string; onClick: () => void; disabled?: boolean; pressed?: boolean }) {
  return <button type="button" className="demo-icon-button" aria-label={label} title={label} onClick={onClick} disabled={disabled} aria-pressed={pressed}><DemoIcon name={icon} /></button>;
}

export function CifraPlayer({ song, suggested }: { song: CatalogSong; suggested: CatalogSong[] }) {
  const [activeSong, setActiveSong] = useState(song);
  const [mode, setMode] = useState<"rolagem" | "karaoke">("rolagem");
  const [shift, setShift] = useState(0);
  const [fontSize, setFontSize] = useState(20);
  const [showNotes, setShowNotes] = useState(true);
  const [favorite, setFavorite] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [rate, setRate] = useState(1);
  const [stage, setStage] = useState(false);
  const [panel, setPanel] = useState<Panel>("setlist");
  const [modal, setModal] = useState<Modal>(null);
  const [message, setMessage] = useState("");
  const [setlist, setSetlist] = useState([song, ...suggested.slice(0, 2)]);
  const [medley, setMedley] = useState(false);
  const [medleySelection, setMedleySelection] = useState<string[]>([]);
  const [hasTrack, setHasTrack] = useState(false);
  const [instruments, setInstruments] = useState(["Bateria", "Baixo"]);
  const [volume, setVolume] = useState(70);
  const [bpm, setBpm] = useState(92);
  const [clip, setClip] = useState(-1);
  const [pedalType, setPedalType] = useState("Teclado");
  const [pedalAction, setPedalAction] = useState(PEDAL_ACTIONS[0]);
  const [pedalTest, setPedalTest] = useState("");
  const [lineTexts, setLineTexts] = useState(DEMO_LINES.map(line => line.text));
  const [note, setNote] = useState("Entrada suave. Crescer no refrão.");
  const [draftText, setDraftText] = useState("");
  const [draftNote, setDraftNote] = useState(note);
  const [draftTitle, setDraftTitle] = useState(song.title);
  const [version, setVersion] = useState("original");
  const [dictionaryChord, setDictionaryChord] = useState("G");
  const [tunerString, setTunerString] = useState("E");
  const [metronome, setMetronome] = useState(false);
  const [beat, setBeat] = useState(0);
  const [addSelection, setAddSelection] = useState("");
  const [orderBy, setOrderBy] = useState("title");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.min(DEMO_LINES.length - 1, Math.floor(playhead / 4));
  const total = DEMO_LINES.length * 4;
  const currentKey = transpose("G", shift);
  const available = suggested.filter(item => !setlist.some(existing => existing.slug === item.slug));
  const allSongs = [song, ...suggested];

  function notify(text: string) { setMessage(text); }
  function selectSong(item: CatalogSong) {
    setActiveSong(item); setPlayhead(0); setPlaying(false); setShift(0); setFavorite(false);
    setLineTexts(DEMO_LINES.map(line => line.text)); setNote("Entrada suave. Crescer no refrão.");
  }
  function goToLine(index: number) { setPlayhead(Math.max(0, Math.min(DEMO_LINES.length - 1, index)) * 4); }
  function togglePlaying() { if (playhead >= total) setPlayhead(0); setPlaying(value => !value); }
  function openModal(next: Exclude<Modal, null>) {
    setPlaying(false);
    if (next === "edit") { setDraftText(lineTexts[current]); setDraftNote(note); setDraftTitle(activeSong.title); }
    if (next === "medley") setMedleySelection(setlist.slice(0, 2).map(item => item.slug));
    setModal(next);
  }
  function moveSong(index: number, delta: number) {
    setSetlist(items => {
      const result = [...items];
      [result[index], result[index + delta]] = [result[index + delta], result[index]];
      return result;
    });
  }

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setPlayhead(value => {
      const next = Math.min(total, value + 1);
      if (next === total) setPlaying(false);
      return next;
    }), 1000 / rate);
    return () => window.clearInterval(timer);
  }, [playing, rate, total]);

  useEffect(() => {
    const sheet = sheetRef.current;
    const row = rowRefs.current[current];
    if (mode !== "rolagem" || !sheet || !row) return;
    const sheetBox = sheet.getBoundingClientRect();
    const rowBox = row.getBoundingClientRect();
    if (rowBox.bottom > sheetBox.bottom - 30 || rowBox.top < sheetBox.top + 20) {
      sheet.scrollTo({ top: sheet.scrollTop + rowBox.top - sheetBox.top - 75, behavior: "instant" });
    }
  }, [current, mode]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (modal && dialog && !dialog.open) dialog.showModal();
    if (!modal && dialog?.open) dialog.close();
    if (modal !== "metronome") setMetronome(false);
  }, [modal]);

  useEffect(() => {
    if (!metronome) return;
    const timer = window.setInterval(() => setBeat(value => (value + 1) % 4), 60000 / bpm);
    return () => window.clearInterval(timer);
  }, [metronome, bpm]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 4500);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (modal || event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLElement && event.target.closest("input,textarea,select,button,a,summary,[contenteditable]")) return;
      if (event.code === "Space") { event.preventDefault(); togglePlaying(); }
      if (event.key === "ArrowRight") { event.preventDefault(); goToLine(current + 1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); goToLine(current - 1); }
      if (event.key.toLowerCase() === "r") { setPlaying(false); setPlayhead(0); }
      if (event.key.toLowerCase() === "f") setStage(value => !value);
      if (event.key === "Escape") setStage(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!stage) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [stage]);

  function renderPanel() {
    if (panel === "setlist") return <>
      <div className="demo-panel-heading"><div><span className="demo-overline">REPERTÓRIO DE EXEMPLO</span><h2>Ensaio da banda</h2></div><span className="demo-count">{setlist.length} músicas</span></div>
      <div className="demo-setlist">{setlist.map((item, index) => <div className={"demo-setlist-row" + (activeSong.slug === item.slug ? " is-current" : "")} key={item.slug}>
        <button className="demo-song-select" onClick={() => selectSong(item)} aria-label={"Abrir prévia de " + item.title} aria-pressed={activeSong.slug === item.slug}><span className="demo-song-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{item.title}</strong><small>{item.artist}</small>{medley && medleySelection.includes(item.slug) && <em>Medley de exemplo</em>}</span></button>
        <div className="demo-reorder"><IconButton icon="up" label={"Mover " + item.title + " para cima"} disabled={index === 0} onClick={() => moveSong(index, -1)} /><IconButton icon="down" label={"Mover " + item.title + " para baixo"} disabled={index === setlist.length - 1} onClick={() => moveSong(index, 1)} /></div>
      </div>)}</div>
      <div className="demo-panel-block"><label htmlFor="demo-add-song">Adicionar ao setlist de exemplo</label><div className="demo-inline-field"><select id="demo-add-song" value={addSelection} onChange={event => setAddSelection(event.target.value)}><option value="">Escolha uma música</option>{available.map(item => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select><IconButton icon="plus" label="Adicionar música à prévia" disabled={!addSelection} onClick={() => { const item = allSongs.find(entry => entry.slug === addSelection); if (item) setSetlist(values => [...values, item]); setAddSelection(""); notify("Música adicionada apenas ao setlist de exemplo."); }} /></div></div>
      <div className="demo-panel-block"><label htmlFor="demo-order">Organizar por</label><div className="demo-inline-field"><select id="demo-order" value={orderBy} onChange={event => setOrderBy(event.target.value)}><option value="title">Título</option><option value="artist">Intérprete</option></select><button className="demo-button" onClick={() => { setSetlist(items => [...items].sort((a, b) => (orderBy === "title" ? a.title : a.artist).localeCompare(orderBy === "title" ? b.title : b.artist, "pt-BR"))); setMedley(false); notify("Ordem aplicada ao setlist de exemplo."); }}>Aplicar</button></div></div>
      <button className="demo-button demo-wide" onClick={() => openModal("medley")}><DemoIcon name="list" />{medley ? "Editar medley" : "Criar medley"}</button>
      <p className="demo-panel-note">O medley reúne músicas em uma sequência contínua. Aqui você pode visualizar o agrupamento.</p>
    </>;
    if (panel === "audio") return <>
      <div className="demo-panel-heading"><div><span className="demo-overline">PREPARAR A EXECUÇÃO</span><h2>Áudio e banda</h2></div></div>
      <div className="demo-panel-block"><h3>Faixa de referência</h3><div className="demo-track"><DemoIcon name="audio" /><div><strong>{hasTrack ? "Faixa de ensaio.mp3" : "Nenhuma faixa na prévia"}</strong><small>{hasTrack ? "Arquivo de exemplo · 00:48" : "Use uma gravação como referência"}</small></div></div><button className="demo-button demo-wide" onClick={() => { setHasTrack(value => !value); notify(hasTrack ? "Faixa de exemplo removida." : "Envio simulado. Nenhum arquivo foi acessado."); }}>{hasTrack ? "Remover exemplo" : "Simular envio de áudio"}</button></div>
      <div className="demo-panel-block"><h3>Acompanhamento sintetizado</h3><p>Bateria, guitarra, baixo e teclado acompanham os acordes.</p><div className="demo-instruments">{SYNTH_INSTRUMENTS.map(item => <button key={item} aria-pressed={instruments.includes(item)} onClick={() => setInstruments(values => values.includes(item) ? values.filter(value => value !== item) : [...values, item])}><DemoIcon name={instruments.includes(item) ? "check" : "plus"} />{item}</button>)}</div><label className="demo-volume">Volume da prévia <output>{volume}%</output><input aria-label="Volume simulado" type="range" min="0" max="100" value={volume} onChange={event => setVolume(Number(event.target.value))} /></label><p className="demo-panel-note">{hasTrack ? "No app, a faixa de referência tem prioridade sobre a banda sintetizada." : "Nesta demonstração, as escolhas são visuais. Não há reprodução de som."}</p></div>
      <div className="demo-panel-block"><h3>Fila de clipes</h3><div className="demo-clips">{CLIPS.map((item, index) => <button key={item} aria-pressed={clip === index} onClick={() => {setClip(index); notify("Clipe selecionado na prévia. Nenhum áudio foi reproduzido.");}}><span>{String(index + 1).padStart(2, "0")}</span>{item}<DemoIcon name={clip === index ? "check" : "play"} /></button>)}</div></div>
      <button className="demo-button demo-wide" onClick={() => openModal("youtube")}><DemoIcon name="play" />Prévia do YouTube</button>
    </>;
    if (panel === "pedal") return <>
      <div className="demo-panel-heading"><div><span className="demo-overline">MÃOS NO INSTRUMENTO</span><h2>Controle por pedal</h2></div></div>
      <p className="demo-panel-note">Simule o mapeamento dos botões. Nenhum dispositivo será conectado.</p>
      <div className="demo-pedal-status"><DemoIcon name="pedal" /><div><strong>Pedal de exemplo</strong><small>Conexão simulada</small></div></div>
      <div className="demo-panel-block"><label htmlFor="demo-pedal-type">Tipo de entrada</label><select id="demo-pedal-type" value={pedalType} onChange={event => setPedalType(event.target.value)}><option>Teclado</option><option>Gamepad</option><option>MIDI</option></select><p className="demo-panel-note">Pedais USB ou Bluetooth podem ser reconhecidos por esses tipos de entrada.</p></div>
      <div className="demo-panel-block"><label htmlFor="demo-pedal-action">Ação do botão 1</label><select id="demo-pedal-action" value={pedalAction} onChange={event => setPedalAction(event.target.value)}>{PEDAL_ACTIONS.map(action => <option key={action}>{action}</option>)}</select><button className="demo-button demo-wide" onClick={() => { setPedalTest(pedalAction); if (pedalAction === "Tocar / pausar") togglePlaying(); if (pedalAction === "Próxima linha") goToLine(current + 1); if (pedalAction === "Linha anterior") goToLine(current - 1); if (pedalAction === "Próximo clipe") setClip(value => Math.min(CLIPS.length - 1, value + 1)); if (pedalAction === "Próxima música") { const index = setlist.findIndex(item => item.slug === activeSong.slug); selectSong(setlist[(index + 1) % setlist.length]); } }}>Simular botão 1 <DemoIcon name="pedal" /></button></div>
      <div className="demo-test-result" role="status"><span>RESULTADO DO TESTE</span><strong>{pedalTest || "Aguardando a simulação"}</strong></div>
      <div className="demo-panel-block"><h3>Combinações de botões</h3><p>Na aplicação, você pode combinar dois ou mais botões para disparar outra ação.</p><div className="demo-key-combo"><kbd>1</kbd><span>+</span><kbd>2</kbd><span>Reiniciar música</span></div><button className="demo-button demo-wide" onClick={() => {setPlayhead(0);setPlaying(false);setPedalTest("Combinação 1 + 2: reiniciar música");}}>Simular combinação</button></div>
    </>;
    return <>
      <div className="demo-panel-heading"><div><span className="demo-overline">ANTES DO PRIMEIRO ACORDE</span><h2>Ferramentas de ensaio</h2></div></div>
      {[
        { id: "dictionary" as const, icon: "music", title: "Dicionário de acordes", text: "Veja posições para violão." },
        { id: "metronome" as const, icon: "tools", title: "Metrônomo", text: "Defina o BPM e visualize o compasso." },
        { id: "tuner" as const, icon: "audio", title: "Afinador", text: "Conheça a leitura de afinação." },
        { id: "shortcuts" as const, icon: "help", title: "Atalhos de teclado", text: "Controle a prévia sem tirar o foco." },
      ].map(tool => <button className="demo-tool-card" key={tool.id} onClick={() => openModal(tool.id)}><DemoIcon name={tool.icon} /><span><strong>{tool.title}</strong><small>{tool.text}</small></span><DemoIcon name="next" /></button>)}
      <p className="demo-panel-note">As ferramentas usam dados de exemplo. O afinador não acessa o microfone e o metrônomo não emite som.</p>
    </>;
  }

  function renderModal() {
    if (modal === "edit") return <>
      <div className="demo-form-grid"><label>Título<input value={draftTitle} onChange={event => setDraftTitle(event.target.value)} maxLength={100} /></label><label>Andamento (BPM)<input type="number" min="40" max="220" value={bpm} onChange={event => setBpm(Math.max(40, Math.min(220, Number(event.target.value) || 40)))} /></label></div>
      <label className="demo-form-field">Texto da linha {current + 1}<textarea value={draftText} onChange={event => setDraftText(event.target.value)} rows={3} maxLength={160} /></label>
      <label className="demo-form-field">Observação para o ensaio<textarea value={draftNote} onChange={event => setDraftNote(event.target.value)} rows={2} maxLength={180} /></label>
      <div className="demo-modal-actions"><button className="demo-button" onClick={() => {setDraftNote("Entrada suave. Crescer no refrão.");notify("Sugestão de exemplo preenchida, sem consulta à IA.");}}>Simular sugestão com IA</button><button className="demo-button demo-primary" disabled={!draftText.trim() || !draftTitle.trim()} onClick={() => {setLineTexts(values => values.map((line, index) => index === current ? draftText : line));setNote(draftNote);setActiveSong(value => ({...value,title:draftTitle}));setModal(null);notify("Alterações aplicadas à prévia. Nada foi salvo.");}}>Aplicar na prévia</button></div>
    </>;
    if (modal === "versions") return <>
      <p>Compare versões de exemplo e veja como seria a restauração.</p>
      <div className="demo-version-options">{[["original","Versão original","Entrada suave. Crescer no refrão."],["ensaio","Ajuste para o ensaio","Repetir o refrão e terminar em conjunto."]].map(([id,title,text]) => <label key={id}><input type="radio" name="demo-version" checked={version === id} onChange={() => setVersion(id)} /><span><strong>{title}</strong><small>{text}</small></span></label>)}</div>
      <div className="demo-modal-actions"><button className="demo-button demo-primary" onClick={() => {setNote(version === "original" ? "Entrada suave. Crescer no refrão." : "Repetir o refrão e terminar em conjunto.");setModal(null);notify("Observação da versão aplicada apenas à prévia.");}}>Aplicar versão na prévia</button></div>
    </>;
    if (modal === "medley") return <>
      <p>Selecione duas ou mais músicas para visualizar uma sequência contínua.</p>
      <div className="demo-version-options">{setlist.map(item => <label key={item.slug}><input type="checkbox" checked={medleySelection.includes(item.slug)} onChange={() => setMedleySelection(values => values.includes(item.slug) ? values.filter(id => id !== item.slug) : [...values,item.slug])} /><span><strong>{item.title}</strong><small>{item.artist}</small></span></label>)}</div>
      <div className="demo-modal-actions">{medley && <button className="demo-button" onClick={() => {setMedley(false);setModal(null);}}>Desfazer agrupamento</button>}<button className="demo-button demo-primary" disabled={medleySelection.length < 2} onClick={() => {setMedley(true);setModal(null);notify("Medley agrupado no setlist de exemplo.");}}>Agrupar na prévia</button></div>
    </>;
    if (modal === "dictionary") return <>
      <label className="demo-form-field">Acorde de exemplo<select value={dictionaryChord} onChange={event => setDictionaryChord(event.target.value)}>{Object.keys(chordShapes).map(chord => <option key={chord}>{chord}</option>)}</select></label>
      <div className="demo-chord-diagram"><strong>{dictionaryChord}</strong><svg viewBox="0 0 220 220" role="img" aria-label={"Posição do acorde " + dictionaryChord + " no violão"}>{[0,1,2,3,4].map(fret => <line key={"f"+fret} x1="35" x2="185" y1={50+fret*32} y2={50+fret*32} stroke="currentColor" strokeWidth={fret===0?4:1} />)}{chordShapes[dictionaryChord].map((fret,index) => <g key={index}><line x1={35+index*30} x2={35+index*30} y1="50" y2="178" stroke="currentColor" strokeWidth="1" /><text x={35+index*30} y="30" textAnchor="middle" fill="currentColor" fontSize="14">{fret===-1?"×":fret===0?"○":""}</text>{fret>0 && <circle cx={35+index*30} cy={50+(fret-.5)*32} r="8" fill="#ffb000" />}<text x={35+index*30} y="205" textAnchor="middle" fill="currentColor" fontSize="12">{["E","A","D","G","B","E"][index]}</text></g>)}</svg><p>Violão · posição de exemplo</p></div>
    </>;
    if (modal === "metronome") return <>
      <label className="demo-form-field">Andamento (batidas por minuto)<input type="range" min="40" max="220" value={bpm} onChange={event => setBpm(Number(event.target.value))} /></label><div className="demo-bpm-number">{bpm}<span>BPM</span></div><div className="demo-beats" aria-label="Compasso de quatro tempos">{[0,1,2,3].map(index => <span key={index} className={metronome && beat===index?"active":""}>{index+1}</span>)}</div><p className="demo-center">Compasso 4/4 · simulação visual sem som</p><div className="demo-modal-actions"><button className="demo-button demo-primary" onClick={() => {setMetronome(value=>!value);setBeat(0);}}>{metronome?"Parar simulação":"Simular batida"}</button></div>
    </>;
    if (modal === "tuner") return <>
      <p>Escolha uma corda para conhecer a leitura do afinador.</p><div className="demo-string-options">{["E","A","D","G","B","e"].map((string,index) => <button key={string} aria-label={"Corda "+(6-index)+": "+string.toUpperCase()} aria-pressed={tunerString===string} onClick={()=>setTunerString(string)}>{string}</button>)}</div><div className="demo-tuner"><span>LEITURA DE EXEMPLO</span><strong>{tunerString.toUpperCase()}</strong><div className="demo-tuner-scale"><span>−50</span><span>0</span><span>+50</span></div><div className="demo-tuner-needle" /><p>Corda afinada</p></div><p className="demo-center">Microfone desligado. Nenhum som está sendo analisado.</p>
    </>;
    if (modal === "shortcuts") return <dl className="demo-shortcuts">{shortcutItems.map(([key,action])=><div key={key}><dt><kbd>{key}</kbd></dt><dd>{action}</dd></div>)}</dl>;
    if (modal === "youtube") return <><div className="demo-video-placeholder"><DemoIcon name="play" /><strong>Vídeo de referência</strong><span>{activeSong.title} · {activeSong.artist}</span></div><p>No aplicativo, o vídeo pode acompanhar a execução. Esta prévia não carrega nem reproduz vídeos.</p><button className="demo-button demo-wide" onClick={()=>notify("Prévia do vínculo com o YouTube. Nenhuma busca foi feita.")}>Simular vínculo com YouTube</button></>;
    if (modal === "print" || modal === "export") return <>
      <p>{modal==="print"?"Prévia do formato para impressão. Nenhuma janela de impressão será aberta.":"Prévia de um arquivo de texto. Nenhum arquivo será baixado."}</p>
      <pre className={modal==="print"?"demo-print-preview":"demo-text-preview"}>{activeSong.title+"\n"+activeSong.artist+"\nTom: "+currentKey+" · "+bpm+" BPM\n\nCIFRA ILUSTRATIVA\n\n"+DEMO_LINES.slice(0,4).map((line,index)=>line.chords.map(chord=>transpose(chord,shift)).join("       ")+"\n"+lineTexts[index]).join("\n\n")}</pre>
      <button className="demo-button demo-wide" onClick={()=>notify("Etapa simulada. Nenhum arquivo foi gerado.")}>{modal==="print"?"Simular impressão":"Simular exportação"}</button>
    </>;
    if (modal === "share") return <><p>Na aplicação, você escolhe se a cifra será compartilhada ou privada.</p><div className="demo-share-card"><DemoIcon name="share" /><div><strong>{activeSong.title}</strong><small>Link público da cifra · exemplo</small></div></div><button className="demo-button demo-wide" onClick={()=>notify("O link seria copiado nesta etapa. A área de transferência não foi alterada.")}>Simular cópia do link</button></>;
    if (modal === "clone") return <><p>Crie uma cópia para fazer seus próprios ajustes. Nesta demonstração, a cópia aparece somente na lista de exemplo.</p><div className="demo-share-card"><DemoIcon name="copy" /><div><strong>{activeSong.title+" (cópia)"}</strong><small>Exemplo de cópia editável</small></div></div><button className="demo-button demo-primary demo-wide" onClick={()=>{const cloned={...activeSong,slug:activeSong.slug+"-demo-copy-"+setlist.length,title:activeSong.title+" (cópia)"};setSetlist(values=>[...values,cloned]);setModal(null);setPanel("setlist");notify("Cópia incluída apenas nesta demonstração.");}}>Criar cópia de exemplo</button></>;
    return null;
  }

  return <div className={"cifra-demo"+(stage?" is-stage":"")}>
    <div className="demo-notice"><span className="demo-badge">DEMONSTRAÇÃO</span><p>Explore os controles com dados de exemplo. Nada é salvo e nenhum áudio é reproduzido.</p><button onClick={()=>openModal("shortcuts")}><DemoIcon name="help" /><span>Atalhos</span></button></div>
    <header className="demo-song-header">
      <div className="demo-song-heading"><a className="demo-back" href="/#cifras"><DemoIcon name="back" />Todas as cifras</a><h1>{activeSong.title}</h1><p>{activeSong.artist}</p><div className="demo-song-meta"><span>Tom <strong>{currentKey}</strong></span><span><strong>{bpm}</strong> BPM</span><span>Compasso <strong>4/4</strong></span><span className="demo-metadata-note">Dados de exemplo</span></div></div>
      <div className="demo-song-actions"><button className="demo-button" aria-pressed={favorite} onClick={()=>{setFavorite(value=>!value);notify(favorite?"Favorito removido da prévia.":"Favorito marcado apenas na prévia.");}}><DemoIcon name="star" filled={favorite}/><span>{favorite?"Favorita":"Favoritar"}</span></button><button className="demo-button" onClick={()=>openModal("edit")}><DemoIcon name="edit" />Editar</button><button className="demo-button" onClick={()=>openModal("versions")}><DemoIcon name="history" /><span>Versões</span></button><details className="demo-more"><summary aria-label="Mais ações" title="Mais ações"><DemoIcon name="more" /></summary><div>{[{id:"print" as const,icon:"print",title:"Imprimir / PDF"},{id:"export" as const,icon:"download",title:"Exportar TXT"},{id:"clone" as const,icon:"copy",title:"Clonar cifra"},{id:"share" as const,icon:"share",title:"Compartilhar"}].map(action=><button key={action.id} onClick={event=>{event.currentTarget.closest("details")?.removeAttribute("open");openModal(action.id);}}><DemoIcon name={action.icon}/>{action.title}</button>)}</div></details></div>
    </header>
    <div className="demo-workspace">
      <section className="demo-reader" aria-label="Leitura da cifra">
        <div className="demo-reader-toolbar">
          <div className="demo-mode-switch" aria-label="Modo de leitura"><button aria-pressed={mode==="rolagem"} onClick={()=>setMode("rolagem")}><DemoIcon name="list"/>Rolagem</button><button aria-pressed={mode==="karaoke"} onClick={()=>setMode("karaoke")}><DemoIcon name="music"/>Karaokê</button></div>
          <div className="demo-reading-controls"><div className="demo-key-controls"><IconButton icon="minus" label="Baixar meio tom na prévia" onClick={()=>setShift(value=>(value+11)%12)} /><label><span className="demo-sr-only">Tom da cifra de exemplo</span><select value={currentKey} onChange={event=>setShift((NOTES.indexOf(event.target.value)-NOTES.indexOf("G")+12)%12)}>{NOTES.map(key=><option key={key}>{key}</option>)}</select></label><IconButton icon="plus" label="Subir meio tom na prévia" onClick={()=>setShift(value=>(value+1)%12)} /><button className="demo-original-key" disabled={shift===0} onClick={()=>setShift(0)}>Original</button></div><div className="demo-font-controls"><button aria-label="Diminuir tamanho da letra" disabled={fontSize<=16} onClick={()=>setFontSize(value=>value-2)}>A−</button><output aria-label="Tamanho da letra">{fontSize}</output><button aria-label="Aumentar tamanho da letra" disabled={fontSize>=30} onClick={()=>setFontSize(value=>value+2)}>A+</button></div><IconButton icon={stage?"close":"expand"} label={stage?"Sair do modo palco":"Ampliar em modo palco"} pressed={stage} onClick={()=>setStage(value=>!value)} /></div>
        </div>
        <div className="demo-sheet-top"><span>CIFRA ILUSTRATIVA</span><label><input type="checkbox" checked={showNotes} onChange={event=>setShowNotes(event.target.checked)}/>Observações</label></div>
        <nav className="demo-section-nav" aria-label="Seções da cifra">{SECTIONS.map(section=><button key={section} aria-pressed={DEMO_LINES[current].section===section} onClick={()=>goToLine(DEMO_LINES.findIndex(line=>line.section===section))}>{section}</button>)}</nav>
        {showNotes && note && <div className="demo-rehearsal-note"><span>ENSAIO</span><p>{note}</p></div>}
        <div ref={sheetRef} className={"demo-sheet "+(mode==="karaoke"?"is-karaoke":"")} style={{"--demo-font-size":fontSize+"px"} as CSSProperties} tabIndex={0} aria-label={mode==="karaoke"?"Cifra em modo karaokê":"Cifra com rolagem"}>
          {DEMO_LINES.map((line,index)=>{
            if(mode==="karaoke" && Math.abs(index-current)>1) return null;
            const sectionStart=index===0 || DEMO_LINES[index-1].section!==line.section;
            return <div key={index} className="demo-line-block">{mode==="rolagem" && sectionStart && <h2 className="demo-stanza-title">{line.section}</h2>}<button ref={element=>{rowRefs.current[index]=element;}} className={"demo-lyric-line"+(index===current?" is-active":"")+(index<current?" is-past":"")} onClick={()=>goToLine(index)} aria-label={"Ir para linha "+(index+1)+": "+lineTexts[index]} aria-current={index===current?"step":undefined}><span className="demo-line-number">{String(index+1).padStart(2,"0")}</span><span className="demo-lyric-content"><span className="demo-chords">{line.chords.map((chord,chordIndex)=><b key={chordIndex}>{transpose(chord,shift)}</b>)}</span><span>{lineTexts[index]}</span></span>{index===current && <span className="demo-line-indicator" aria-hidden="true"><DemoIcon name="play"/></span>}</button></div>;
          })}
        </div>
        <div className="demo-sheet-foot"><span>Letra criada para esta demonstração; não corresponde à música selecionada.</span><span>Linha {current+1} de {DEMO_LINES.length}</span></div>
        <div className="demo-transport">
          <div className="demo-progress"><span>{timeLabel(playhead)}</span><input type="range" min="0" max={total} value={playhead} onChange={event=>setPlayhead(Number(event.target.value))} aria-label="Posição na reprodução simulada"/><span>{timeLabel(total)}</span></div>
          <div className="demo-transport-controls"><div className="demo-play-group"><IconButton icon="reset" label="Reiniciar demonstração" onClick={()=>{setPlaying(false);setPlayhead(0);}}/><IconButton icon="previous" label="Linha anterior" disabled={current===0} onClick={()=>goToLine(current-1)}/><button className="demo-play-button" onClick={togglePlaying}><DemoIcon name={playing?"pause":"play"}/>{playing?"Pausar prévia":"Iniciar prévia"}</button><IconButton icon="next" label="Próxima linha" disabled={current===DEMO_LINES.length-1} onClick={()=>goToLine(current+1)}/></div><div className="demo-play-options"><label>Velocidade<select value={rate} onChange={event=>setRate(Number(event.target.value))}><option value=".75">0,75×</option><option value="1">1×</option><option value="1.25">1,25×</option><option value="1.5">1,5×</option></select></label><span>Simulação sem áudio</span></div></div>
        </div>
      </section>
      <aside className="demo-side" aria-label="Preparação e ferramentas"><div className="demo-panel-tabs" aria-label="Painéis de preparação">{panelTabs.map(tab=><button key={tab.id} aria-pressed={panel===tab.id} onClick={()=>setPanel(tab.id)}><DemoIcon name={tab.icon}/><span>{tab.title}</span></button>)}</div><div className="demo-panel-content">{renderPanel()}</div></aside>
    </div>
    <div className="demo-toast" role="status" aria-live="polite">{message && !modal && <span><DemoIcon name="check"/>{message}</span>}</div>
    <dialog ref={dialogRef} className="demo-dialog" onCancel={()=>setModal(null)} onClose={()=>setModal(null)} aria-labelledby="demo-dialog-title" aria-describedby="demo-dialog-description"><div className="demo-dialog-heading"><div><span className="demo-overline">PRÉVIA INTERATIVA</span><h2 id="demo-dialog-title">{modal?modalTitles[modal]:""}</h2></div><IconButton icon="close" label="Fechar janela" onClick={()=>setModal(null)}/></div><p className="demo-dialog-description" id="demo-dialog-description">Os ajustes valem apenas nesta demonstração.</p><div className="demo-dialog-body">{renderModal()}{message && <p className="demo-modal-status" role="status">{message}</p>}</div></dialog>
  </div>;
}

