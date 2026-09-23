import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Arrow, AuthAwareLink, FlowNav, TrendingSongs, FeatureSummary, RehearsalTools, BandCommunity, ComparisonSection, UpdatedPlans, FlowFooter } from "./landing-components";
import { parseBody } from "../utils/lineClassifier";
import api from "../services/api";
import "./landing.css";

/** Segundos -> "MM:SS.d" (mesmo formato que o app usa nas linhas sincronizadas). */
function syncStamp(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
}

export default function LandingPage() {
  useEffect(() => {
    document.title = "TumTumPá — cifras, repertório e banda";
    // Contador de visitas da landing (rota pública, sem auth — ver
    // POST /api/telemetry/landing-view). Antes só About.jsx chamava isto;
    // quando esta página assumiu a rota "/", o contador parou de subir e o
    // painel de vendas passou a subestimar visitas.
    api.post("/telemetry/landing-view").catch(() => {});
  }, []);

  // Amostra real da biblioteca pública, usada no quadro de setlist e na
  // seção "Do arquivo ao palco". Antes eram quatro linhas fixas aqui dentro:
  // durações inventadas (06:48, 04:12…) e um título que não existe no acervo
  // ("Antes do bis").
  const { data: sample } = useQuery({
    queryKey: ["landing-sample-songs"],
    queryFn: () => api.get("/public/songs", { params: { page_size: 4, sort: "titulo" } }).then((r) => r.data),
  });
  const sampleSongs = sample?.items ?? [];
  const featured = sampleSongs[0];

  // Corpo da cifra em destaque — o "depois" da transformação mostra esta
  // música de verdade (acordes, letra e os tempos [t=SEG] marcados), não um
  // texto inventado. Depende da amostra acima, então só dispara depois dela.
  const { data: featuredSong } = useQuery({
    queryKey: ["landing-featured-song", featured?.slug],
    queryFn: () => api.get(`/public/songs/${encodeURIComponent(featured.slug)}`).then((r) => r.data),
    enabled: Boolean(featured?.slug),
  });

  // Acorde + letra das primeiras linhas cantadas, na ordem em que aparecem no
  // corpo. Sem marcação [t=SEG] a música ainda não está sincronizada, e aí a
  // coluna de tempo fica "--:--" em vez de inventar um número.
  const syncLines = useMemo(() => {
    const picked: { chord: string; text: string; t: number | null }[] = [];
    let chord = "";
    for (const line of parseBody(featuredSong?.body || "")) {
      if (!line.visivel) continue;
      if (line.tipo === "acorde") { chord = line.text.trim(); continue; }
      if (line.tipo === "letra" && line.text.trim()) {
        picked.push({ chord, text: line.text.trim(), t: line.t });
        chord = "";
      }
      if (picked.length === 3) break;
    }
    return picked;
  }, [featuredSong?.body]);

  // Mesmas linhas, só que cruas — é o "antes" da seção. Limitado a 10 linhas
  // de 40 colunas pra caber no cartão de altura fixa sem estourar a largura.
  const rawLines = useMemo(() => {
    const body = (featuredSong?.body || "").split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 10);
    return body.map((line) => (line.length > 40 ? `${line.slice(0, 40)}…` : line)).join("\n");
  }, [featuredSong?.body]);
  const featuredKey = featured?.tom || featuredSong?.header?.tom || "—";

  return <main className="flow-shell revised-flow new-landing">
    <FlowNav/>
    <section className="flow-intro">
      <div><span className="flow-label">CIFRAS, REPERTÓRIO E BANDA NO MESMO TEMPO</span><h1>Seu repertório<br/><em>se apresenta sozinho.</em></h1></div>
      <div className="flow-intro-aside"><p>Encontre uma cifra. Prepare o setlist. Do primeiro ensaio ao último bis, o tempo está com você.</p><a className="text-link" href="#cifras">Encontre sua música <Arrow direction="right"/></a></div>
    </section>
    <TrendingSongs/>
      <section className="transformation flow-transformation" id="como-funciona">
        <div className="section-kicker">DO ARQUIVO AO PALCO</div>
        <div className="transformation-heading"><h2>O caos entra.<br/>O show sai.</h2><p>Uma cifra simples ganha estrutura, tempo e movimento. Tudo o que a banda precisa, sem trocar de ferramenta.</p></div>
        <div className="before-after">
          <article className="raw-file">
            <div className="window-bar"><span /> <span /> <span /><b>{featured ? `${featured.slug}.txt` : "repertorio.txt"}</b></div>
            <pre>{`Tom: ${featuredKey}\n\n${rawLines || "Carregando cifra…"}`}</pre>
            <span className="tape-label">ANTES / ESPALHADO</span>
          </article>
          <div className="conversion-mark">→<span>SINCRONIZAR</span></div>
          <article className="sync-file">
            <div className="sync-top"><b>NO MESMO TEMPO</b><span>{featured?.velocidade ? `${featured.velocidade} BPM` : "LINHA A LINHA"}</span></div>
            <div className="waveform" aria-hidden="true">{Array.from({ length: 42 }, (_, index) => <i key={index} style={{height:`${18 + ((index * 17) % 58)}%`}} />)}</div>
            {syncLines.map((line, index) => <div className={`sync-line ${index === 1 ? "active" : ""}`} key={`${line.text}-${index}`}><strong>{line.t != null ? syncStamp(line.t) : "--:--"}</strong><b>{line.chord || "—"}</b><span>{line.text}</span></div>)}
            {syncLines.length === 0 && <div className="sync-line"><strong>--:--</strong><b>—</b><span>Carregando cifra…</span></div>}
            <span className="tape-label">DEPOIS / SINCRONIZADO</span>
          </article>
        </div>
      </section>

      <section className="setlist-section flow-setlist">
        <div className="setlist-intro"><div className="section-kicker">SEU REPERTÓRIO, ORGANIZADO</div><h2>A ordem do show.<br/><em>Na mão de todo mundo.</em></h2><p>Arraste as músicas, siga setlists de outros músicos ou clone para fazer do seu jeito. Organize por ritmo, tom, BPM ou nota do público, preservando os blocos de medley.</p></div>
        <div className="setlist-board">
          <div className="board-head"><span>CIFRAS DA BIBLIOTECA</span><b>PRÉVIA DE SETLIST</b><span>{sampleSongs.length} MÚSICAS</span></div>
          {sampleSongs.map((song, index) => <div className={`setlist-song ${index === 1 ? "playing" : ""}`} key={song.slug}><span>{String(index + 1).padStart(2, "0")}</span><b>{song.titulo}</b><i>{song.tom || "—"}</i><em>{song.velocidade ? `${song.velocidade} BPM` : ""}</em></div>)}
          {sampleSongs.length === 0 && <div className="setlist-song"><span>--</span><b>Carregando cifras…</b><i /><em /></div>}
          <AuthAwareLink className="share-setlist" to="/setlists">MONTAR MEU SETLIST <Arrow/></AuthAwareLink>
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
