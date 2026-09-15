import { useEffect } from "react";
import { Arrow, FlowNav, TrendingSongs, FeatureSummary, RehearsalTools, BandCommunity, ComparisonSection, UpdatedPlans, FlowFooter } from "./landing-components";
import songs from "./catalog.json";
import "./landing.css";

const flowSetlist = [
  ["01", "Anunciação", "G", "06:48"],
  ["02", "No mesmo tempo", "Am", "04:12"],
  ["03", "Toda forma de amor", "D", "03:54"],
  ["04", "Antes do bis", "C", "05:02"],
];

export default function LandingPage() {
  useEffect(() => { document.title = "TumTumPá — cifras, repertório e banda"; }, []);
  return <main className="flow-shell revised-flow new-landing">
    <FlowNav/>
    <section className="flow-intro">
      <div><span className="flow-label">CIFRAS, REPERTÓRIO E BANDA NO MESMO TEMPO</span><h1>Seu repertório<br/><em>se apresenta sozinho.</em></h1></div>
      <div className="flow-intro-aside"><p>Encontre uma cifra. Prepare o setlist. Do primeiro ensaio ao último bis, o tempo está com você.</p><a className="text-link" href="#cifras">Encontre sua música <Arrow direction="right"/></a></div>
    </section>
    <TrendingSongs songs={songs}/>
      <section className="transformation flow-transformation" id="como-funciona">
        <div className="section-kicker">DO ARQUIVO AO PALCO</div>
        <div className="transformation-heading"><h2>O caos entra.<br/>O show sai.</h2><p>Uma cifra simples ganha estrutura, tempo e movimento. Tudo o que a banda precisa, sem trocar de ferramenta.</p></div>
        <div className="before-after">
          <article className="raw-file">
            <div className="window-bar"><span /> <span /> <span /><b>repertorio_final_agora-vai.txt</b></div>
            <pre>{`Tom: G\n\nIntro G Am C\n\nG\nTodo mundo pronto?\n     Am\nEntão deixa acontecer\nC\nPróxima linha...`}</pre>
            <span className="tape-label">ANTES / ESPALHADO</span>
          </article>
          <div className="conversion-mark">→<span>SINCRONIZAR</span></div>
          <article className="sync-file">
            <div className="sync-top"><b>NO MESMO TEMPO</b><span>94 BPM</span></div>
            <div className="waveform" aria-label="Forma de onda do áudio">{Array.from({ length: 42 }, (_, index) => <i key={index} style={{height:`${18 + ((index * 17) % 58)}%`}} />)}</div>
            <div className="sync-line"><strong>00:14.2</strong><b>G</b><span>Todo mundo pronto?</span></div>
            <div className="sync-line active"><strong>00:18.7</strong><b>Am</b><span>Então deixa acontecer</span></div>
            <div className="sync-line"><strong>00:23.1</strong><b>C</b><span>Próxima linha...</span></div>
            <span className="tape-label">DEPOIS / AO VIVO</span>
          </article>
        </div>
      </section>

      <section className="setlist-section flow-setlist">
        <div className="setlist-intro"><div className="section-kicker">SEU REPERTÓRIO, ORGANIZADO</div><h2>A ordem do show.<br/><em>Na mão de todo mundo.</em></h2><p>Arraste as músicas, siga setlists de outros músicos ou clone para fazer do seu jeito. Organize por ritmo, tom, BPM ou nota do público, preservando os blocos de medley.</p></div>
        <div className="setlist-board">
          <div className="board-head"><span>EXEMPLO DE SETLIST</span><b>SHOW DE SEXTA</b><span>4 MÚSICAS</span></div>
          {flowSetlist.map((item, index) => <div className={`setlist-song ${index === 1 ? "playing" : ""}`} key={item[0]}><span>{item[0]}</span><b>{item[1]}</b><i>{item[2]}</i><em>{item[3]}</em></div>)}
          <a className="share-setlist" href="/setlists">MONTAR MEU SETLIST <Arrow/></a>
        </div>
      </section>


    <FeatureSummary/>
    <RehearsalTools/>
    <BandCommunity/>
    <ComparisonSection/>
    <UpdatedPlans/>
    <FlowFooter/>
  </main>;
}
