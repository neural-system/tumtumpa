import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useDebounce } from "../hooks/useDebounce";
import { CheckIcon, CommunityPreview } from "./community-preview";

export function Arrow({ direction = "diagonal" }: { direction?: "diagonal" | "right" }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{direction === "right" ? <path d="M4 12h16m-6-6 6 6-6 6"/> : <path d="M5 19 19 5M5 5h14v14"/>}</svg>;
}

/** CTA que depende de sessão: com token vai pro destino do app (`to`), sem
 * token vai pro cadastro (ou `guestTo`). Antes os links de ação da landing
 * apontavam sempre pra rotas dentro do <Layout> — que exige token (ver
 * Layout.jsx) — então um visitante clicava e caía numa tela de login, e o
 * backend nem era alcançado. */
export function AuthAwareLink({ to, guestTo = "/cadastro", className, children }: { to: string; guestTo?: string; className?: string; children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return <Link className={className} to={token ? to : guestTo}>{children}</Link>;
}

export function FlowNav({ active = "cifras" }: { active?: "cifras" | "mural" | "classificados" }) {
  const [open, setOpen] = useState(false);
  const token = useAuthStore((s) => s.token);
  // Âncoras seguem <a href="/#...">: a partir de "/" o navegador trata como
  // navegação de fragmento no mesmo documento (rola sem recarregar), e a
  // partir de outra rota recarrega já posicionado na seção. Um <Link> do
  // react-router perderia o scroll, que ele não faz sozinho no v6.
  return <header className="flow-nav">
    <Link className="brand" to="/" aria-label="TumTumPá, início">TUM TUM <b>PÁ</b></Link>
    <button className="nav-toggle" aria-expanded={open} aria-controls="flow-links" onClick={() => setOpen(!open)}>{open ? "Fechar" : "Menu"}<svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path d={open ? "m5 5 14 14M5 19 19 5" : "M4 7h16M4 12h16M4 17h16"}/></svg></button>
    <nav id="flow-links" className={open ? "flow-links is-open" : "flow-links"} aria-label="Navegação principal" onClick={() => setOpen(false)}>
      <a href="/#cifras" className={active === "cifras" ? "current" : ""}>Cifras</a>
      <Link to="/monte-sua-banda" className={active === "mural" ? "current" : ""}>Monte sua banda <Arrow/></Link>
      <Link to="/classificados" className={active === "classificados" ? "current" : ""}>Classificados <Arrow/></Link>
      <a href="/#ferramentas">Ferramentas</a>
      <a href="/#recursos">Recursos</a>
      <a href="/#planos">Planos</a>
    </nav>
    <Link className="flow-login" to={token ? "/painel" : "/login"}>{token ? "Painel" : "Entrar"} <Arrow/></Link>
  </header>;
}

/** Formato que CifraDemoPage/CifraPlayer esperam (vem de catalog.json). */
export type CatalogSong = { title: string; artist: string; genre: string; slug: string };

/** Linha de GET /api/public/songs — só as colunas que esta seção usa. */
type LibrarySong = {
  slug: string; titulo: string; interprete: string;
  genero: string; tom: string; velocidade: number | string | null;
};

/** Catálogo público real (GET /public/songs + /public/songs/facets), o mesmo
 * endpoint sem login que a biblioteca de /sobre2 consome. A busca e o filtro
 * de gênero são resolvidos no servidor; antes esta seção filtrava um
 * catalog.json fixo no bundle, com gêneros que não existem no acervo (ex.:
 * "Cifras" como se fosse gênero) e links pra /demonstracao/cifra — a prévia
 * fictícia — em vez da cifra pública de verdade. */
export function TrendingSongs() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  // 400ms: /api/public/* tem teto de 60 req/min por IP (ver
  // middlewares/rate_limit.py) — sem debounce uma busca digitada rápido
  // sozinha chegaria perto do limite.
  const debouncedQuery = useDebounce(query, 400);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["landing-songs", debouncedQuery, genre],
    queryFn: () => api.get("/public/songs", {
      params: { q: debouncedQuery, genero: genre, page_size: 60, sort: "titulo" },
    }).then((r) => r.data),
    // v5: `keepPreviousData: true` é opção da v4 e é ignorada em silêncio
    // (react-query 5.101 instalada) — sem isto a grade some e volta a cada
    // busca, porque `data` fica undefined durante o fetch.
    placeholderData: keepPreviousData,
  });
  const { data: facets } = useQuery({
    queryKey: ["landing-song-facets"],
    queryFn: () => api.get("/public/songs/facets").then((r) => r.data),
  });

  const songs: LibrarySong[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const genres: string[] = facets?.generos ?? [];
  const searching = Boolean(debouncedQuery || genre);

  return <section className="trending-section" id="cifras" aria-label="Catalogo de musicas">
    <div className="catalog-controls"><div className="catalog-genres" aria-label="Filtrar músicas por gênero"><button aria-pressed={genre === ""} onClick={() => setGenre("")}>Todas</button>{genres.map(item => <button key={item} aria-pressed={genre === item} onClick={() => setGenre(item)}>{item}</button>)}</div><label className="catalog-search"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Música ou artista" aria-label="Buscar música ou artista" type="search"/></label></div>
    <div className="trending-grid">{songs.map((song, index) => <Link className="trending-song" key={song.slug} to={`/cifra/${encodeURIComponent(song.slug)}`}><span className="song-number">{String(index + 1).padStart(2, "0")}</span><span className="trending-song-info"><b>{song.titulo}</b><small>{[song.interprete, song.tom].filter(Boolean).join(" · ")}</small></span><span className="song-open"><Arrow direction="right"/></span></Link>)}</div>
    {isLoading && <div className="catalog-empty" role="status"><p>Carregando cifras da biblioteca…</p></div>}
    {isError && <div className="catalog-empty" role="status"><p>Não foi possível carregar a biblioteca agora.</p><button onClick={() => {setQuery("");setGenre("");}}>Tentar de novo</button></div>}
    {!isLoading && !isError && songs.length === 0 && <div className="catalog-empty" role="status"><p>Nenhuma cifra encontrada. Tente outro nome ou gênero.</p><button onClick={() => {setQuery("");setGenre("");}}>Limpar filtros</button></div>}
    <div className="catalog-foot"><span>{(searching ? `${total} resultado${total === 1 ? "" : "s"}` : `${total} cifra${total === 1 ? "" : "s"} na biblioteca pública`)}</span><span>Cifras gratuitas. O show é seu.</span></div>
  </section>;
}

const groups = [
  { name: "No palco", headline: "Mãos no instrumento.\nO resto acompanha.", intro: "Escolha como ler, dê o tempo e deixe o repertório seguir com você.", items: [
    ["Modo Rolagem", "A cifra inteira rola como no papel. Mouse e toque continuam funcionando; ao rolar manualmente, a reprodução retoma do ponto certo."],
    ["Modo Karaokê", "A linha atual acompanha o áudio enviado. Sem gravação, o BPM guia o acompanhamento; sem ambos, você ajusta a velocidade do timer."],
    ["Pedal de mãos livres", "Troque músicas, pause, role e avance clipes por USB ou Bluetooth. Reconhece teclado, gamepad e MIDI, com combinações de botões e teste antes do show."],
    ["Medley automático", "Junte duas ou mais músicas em uma rolagem contínua. As próximas acompanham o tom da primeira, preservando os tons originais."],
    ["Acompanhamento sintetizado", "Bateria, guitarra, baixo e teclado a partir da cifra e do BPM. Uma gravação enviada sempre tem prioridade."],
    ["Fila de clipes curtos", "Solte efeitos, vinhetas ou trechos um a um pelo pedal, exatamente quando precisar."],
  ]},
  { name: "Preparando o show", headline: "Do primeiro rascunho\nao último ajuste.", intro: "Organize o acervo e prepare cada detalhe antes de subir ao palco.", items: [
    ["Biblioteca de cifras", "Busque por título, autor, intérprete ou tag. Filtre por gênero, tom e ritmo e favorite músicas, artistas ou gêneros inteiros."],
    ["Editor completo", "Tom, ritmo, BPM, tags, seções e observações para mostrar ou ocultar no palco. Transponha e restaure versões anteriores."],
    ["Normalização com um clique", "Padronize cabeçalhos, acordes e seções, preservando o alinhamento entre cifra e letra."],
    ["Sugestões com IA", "Preencha os campos vazios de intérprete, tom, ritmo e tags a partir da letra. Você revisa antes de salvar."],
    ["YouTube conectado", "Encontre o vídeo real da música e sua duração. Busque sob demanda ou deixe a atualização diária completar o acervo."],
    ["Setlists inteligentes", "Arraste, use as setas ou vá direto à posição desejada. Siga e clone setlists de outros músicos."],
    ["Sugestão de ordem", "Organize por ritmo, tom, BPM, velocidade ou nota do público. Personalize a sequência de ritmos sem separar os blocos de medley."],
  ]},
  { name: "Depois do show", headline: "Ouça quem\nveio te ouvir.", intro: "O repertório do próximo show pode começar com a resposta da plateia.", items: [
    ["Feedback por QR Code", "A plateia avalia de 1 a 10, sem instalar nada ou fazer login. O app identifica a música que está tocando."],
    ["Relatório por música", "Veja médias, quantidade de votos e comentários. Use as avaliações para pensar na próxima ordem do show."],
    ["Histórico e favoritos", "Volte ao que tocou recentemente e mantenha músicas, artistas e gêneros preferidos por perto."],
  ]},
];

export function FeatureSummary() {
  const [selected, setSelected] = useState(0);
  const group = groups[selected];
  return <section className="feature-summary" id="recursos">
    <div className="feature-section-heading"><span className="section-kicker">OS RECURSOS. NO SEU RITMO.</span><h2>Você toca.<br/><em>O TumTumPá acompanha.</em></h2></div>
    <div className="feature-switch" aria-label="Explorar funcionalidades por momento">{groups.map((item, index) => <button key={item.name} aria-pressed={selected === index} onClick={() => setSelected(index)}><span>0{index + 1}</span>{item.name}</button>)}</div>
    <div className="feature-content"><div className="feature-editorial"><h3>{group.headline.split("\n").map((line, index) => <span key={index}>{line}</span>)}</h3><p>{group.intro}</p><Link className="text-link" to="/cadastro">Criar minha conta <Arrow/></Link><span className="feature-giant-number" aria-hidden="true">0{selected + 1}</span></div><div className="feature-details">{group.items.map(([title, copy]) => <details key={title}><summary>{title}<span aria-hidden="true">+</span></summary><p>{copy}</p></details>)}</div></div>
  </section>;
}

export function RehearsalTools() {
  const tools = [
    { n: "01", title: "Dicionário de acordes", detail: "Mais de mil posições para violão, ukulelê e teclado. Ouça o acorde, veja os dedos e ajuste para canhotos.", url: "/dicionario-acordes", signal: "C / G / Am" },
    { n: "02", title: "Metrônomo", detail: "Encontre o tempo com tap tempo, escolha o compasso e retome o BPM salvo no próximo ensaio.", url: "/metronomo", signal: "1 · 2 · 3 · 4" },
    { n: "03", title: "Afinador", detail: "Afine pelo microfone. Violão, baixo, ukulelê, violino ou modo cromático: cada instrumento no seu tom.", url: "/afinador", signal: "E A D G B E" },
  ];
  return <section className="rehearsal-section" id="ferramentas"><div className="rehearsal-heading"><span className="section-kicker">ANTES DO PRIMEIRO ACORDE</span><h2>Afine. Conte.<br/><em>Comece.</em></h2><p>As ferramentas de ensaio ficam sempre à mão.</p></div><div className="rehearsal-tools">{tools.map(tool => <AuthAwareLink key={tool.n} to={tool.url}><div className="tool-heading"><span>{tool.n}</span><Arrow/></div><div className="tool-signal" aria-hidden="true">{tool.signal}</div><h3>{tool.title}</h3><p>{tool.detail}</p></AuthAwareLink>)}</div><div className="language-strip"><b>No seu idioma. No seu ritmo.</b><span>9 idiomas, incluindo português do Brasil e de Portugal.</span></div></section>;
}

export function BandCommunity() {
  return <section className="band-community" id="monte-sua-banda"><div className="band-visual"><CommunityPreview /></div><div className="band-copy"><span className="section-kicker">MONTE SUA BANDA</span><h2>Seu próximo show<br/>pode começar<br/><em>com um encontro.</em></h2><p>Encontre músicos e bandas da sua cidade que combinam com seu som.</p><p className="band-secondary">Receba avisos no app quando surgir uma vaga para seu instrumento.</p><Link className="yellow-link" to="/monte-sua-banda">Encontrar músicos e bandas <Arrow/></Link></div></section>;
}

const comparisons = [
  ["Leitura da cifra", "Rolagem ou karaokê", "Leitura estática", "Leitura e rolagem¹"],
  ["Transposição de tom", "Por meio-tom ou tom desejado", "Edição manual", "Disponível em alguns apps¹"],
  ["Sincronia com seu áudio", "Linha por linha", "Sem sincronia nativa", "Depende do app¹"],
  ["Pedal de mãos livres", "Teclado, gamepad e MIDI", "Depende do leitor de PDF", "Depende do app¹"],
  ["Medley contínuo", "Com transposição automática", "Montagem manual", "Depende do app¹"],
  ["Banda sintetizada", "Bateria, guitarra, baixo e teclado", "Sem acompanhamento nativo", "Depende do app¹"],
  ["Setlists", "Siga, clone e organize", "Arquivos e pastas", "Listas em alguns apps¹"],
  ["Feedback da plateia", "QR Code + relatório por música", "Ferramenta externa", "Depende do app¹"],
  ["Encontre sua banda", "Mural com alertas por perfil", "Ferramenta externa", "Depende do app¹"],
];

export function ComparisonSection() {
  return <section className="comparison-section" id="comparativo"><div className="comparison-heading"><span className="section-kicker">DO PAPEL À APRESENTAÇÃO</span><h2>A cifra é só<br/><em>o começo.</em></h2><p>Veja o que muda quando o repertório, a execução e a banda estão no mesmo lugar.</p></div><div className="comparison-scroll" role="region" aria-label="Comparativo de funcionalidades; deslize para ver todas as colunas" tabIndex={0}><table><caption>Recursos para preparar e tocar seu repertório</caption><thead><tr><th scope="col">O que você precisa</th><th scope="col" className="tum-column">TUM TUM PÁ</th><th scope="col">Cifras em PDF</th><th scope="col">Apps de cifras<br/><small>em geral</small></th></tr></thead><tbody>{comparisons.map(([feature, tum, pdf, app]) => <tr key={feature}><th scope="row">{feature}</th><td className="tum-column"><span className="comparison-feature"><span className="comparison-check"><CheckIcon /></span><span>{tum}</span></span></td><td>{pdf}</td><td>{app}</td></tr>)}</tbody></table></div><p className="comparison-note">¹ Os recursos variam entre apps, versões e planos. O PDF é comparado como arquivo estático; funções adicionais dependem do leitor utilizado.</p></section>;
}

export function UpdatedPlans() {
  // Planos reais (GET /public/plans, sem login). Mesma queryKey de
  // PricingSection.jsx e AuthGate.jsx — o react-query reaproveita a resposta
  // em vez de repetir a chamada quando as duas telas aparecem. Antes os
  // nomes, preços e limites eram digitados à mão aqui e passavam a divergir
  // silenciosamente de qualquer edição feita em /admin/plans.
  const { data: allPlans } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => api.get("/public/plans").then((r) => r.data),
  });

  // Os cards são só os planos pagos; o Convidado (kind='guest') não é
  // assinável pela Stripe (ver PlansService.list_public) e é o que a faixa
  // final da seção descreve como o plano de entrada.
  const plans = useMemo(() => (allPlans ?? []).filter((p) => p.kind === "paid"), [allPlans]);
  const guest = useMemo(() => (allPlans ?? []).find((p) => p.kind === "guest"), [allPlans]);
  // Copy de posicionamento não existe no banco — é editorial, então segue
  // posicional, com um texto neutro de reserva caso o admin mude a ordem.
  const intros = ["Seu repertório começa aqui.", "Mais espaço entre o ensaio e o palco.", "Para uma agenda cheia de música."];

  return <section className="updated-plans" id="planos"><div className="updated-plans-heading"><span className="section-kicker">MAIS REPERTÓRIO. MAIS POSSIBILIDADES.</span><h2>Seu ritmo.<br/><em>Seu plano.</em></h2><p>As cifras são gratuitas.<br/>Escolha o espaço para os seus setlists e áudios.</p></div>
    {plans.length === 0 ? <p className="comparison-note">Carregando planos…</p> : <div className="updated-plans-grid">{plans.map((plan, index) => <article className={`updated-plan ${plans.length > 2 && index === 1 ? "highlight-plan" : ""}`} key={plan.id}><div className="plan-name"><span>0{index + 1}</span><h3>{plan.name}</h3></div><p>{intros[index] ?? "Mais espaço para o seu repertório."}</p><div className="plan-price"><span>R$</span><strong>{(plan.price_cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><small>/mês</small></div><ul><li><b>{plan.max_setlists}</b> setlists</li><li><b>{plan.storage_limit_mb} MB</b> de armazenamento de áudio</li></ul><AuthAwareLink to="/planos">Escolher {plan.name} <Arrow/></AuthAwareLink></article>)}</div>}
    <div className="free-plan-strip"><div><b>O primeiro acorde é por nossa conta.</b><p>{guest ? `Plano ${guest.name}: ${guest.max_setlists} setlists e ${guest.storage_limit_mb} MB de áudio, sem pagar nada. Os planos pagos têm 14 dias de teste.` : "Explore as cifras gratuitamente e experimente os planos pagos por 14 dias."}</p></div><AuthAwareLink className="text-link" to="/planos">Começar grátis <Arrow/></AuthAwareLink></div>
  </section>;
}

export function FlowFooter() {
  return <footer className="flow-footer"><Link className="brand" to="/">TUM TUM <b>PÁ</b></Link><span>Do primeiro ensaio ao último bis.</span><AuthAwareLink to="/painel">Vamos tocar? <Arrow/></AuthAwareLink><small>© {new Date().getFullYear()} TumTumPá</small></footer>;
}

