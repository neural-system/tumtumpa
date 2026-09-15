import { useEffect } from "react";
import { Arrow, FlowFooter, FlowNav } from "./landing-components";
import { CheckIcon, CommunityIcon, CommunityPreview } from "./community-preview";
import "./landing.css";
import "./community-page.css";

const APP = "";

const steps = [
  { n: "01", title: "Conte o que você procura", copy: "Uma banda precisa de músico? Você procura gente para tocar? Informe cidade, instrumento, nível e objetivo no anúncio." },
  { n: "02", title: "Encontre afinidades", copy: "Explore os anúncios públicos. Veja a proposta, os dias de ensaio e os instrumentos para entender se a combinação faz sentido." },
  { n: "03", title: "Marque o primeiro ensaio", copy: "Use o contato do anúncio para conversar. Alinhe expectativas, escolha o repertório e combinem quando tocar." },
];

const criteria = [
  { number: "01", title: "Cidade", copy: "Gente por perto para o ensaio acontecer." },
  { number: "02", title: "Instrumento", copy: "A voz ou o instrumento que falta na formação." },
  { number: "03", title: "Nível", copy: "Do iniciante ao profissional, com expectativas alinhadas." },
  { number: "04", title: "Objetivo", copy: "Tocar por diversão, ensaiar, fazer shows ou gravar." },
];

export default function CommunityPage() {
  useEffect(() => { document.title = "Monte sua banda — Comunidade TumTumPá"; }, []);
  return <main className="mural-page new-landing">
    <FlowNav active="mural" />
    <section className="mural-hero" aria-labelledby="mural-title">
      <div className="mural-hero-copy">
        <span className="section-kicker">COMUNIDADE · MONTE SUA BANDA</span>
        <h1 id="mural-title">Tem gente por perto<br /><em>no mesmo ritmo que você.</em></h1>
        <p>Bandas buscando músicos. Músicos buscando banda. Encontre sua próxima formação e leve a conversa para o ensaio.</p>
        <div className="mural-actions"><a className="yellow-link" href={APP + "/mural"}>Encontrar músicos e bandas <Arrow direction="right" /></a><a className="mural-secondary-link" href={APP + "/mural/meus-anuncios"}>Criar meu anúncio <Arrow /></a></div>
        <p className="mural-access-note">Explore os anúncios sem entrar. Para publicar, acesse sua conta.</p>
      </div>
      <CommunityPreview interactive />
    </section>
    <section className="mural-criteria" aria-labelledby="criteria-title">
      <div className="mural-section-title"><span className="section-kicker">O QUE APROXIMA VOCÊS</span><h2 id="criteria-title">Mais afinidade.<br /><em>Desde o primeiro contato.</em></h2></div>
      <dl className="mural-criteria-list">{criteria.map(item => <div key={item.title}><dt><span aria-hidden="true">{item.number}</span>{item.title}</dt><dd>{item.copy}</dd></div>)}</dl>
    </section>
    <section className="mural-how" aria-labelledby="how-title">
      <div className="mural-section-title"><span className="section-kicker">COMO FUNCIONA</span><h2 id="how-title">Do anúncio<br /><em>ao primeiro ensaio.</em></h2></div>
      <div className="mural-steps">{steps.map(step => <article key={step.n}><span className="mural-step-number" aria-hidden="true">{step.n}</span><h3>{step.title}</h3><p>{step.copy}</p></article>)}</div>
    </section>
    <section className="mural-alert-section" aria-labelledby="alerts-title">
      <div className="mural-alert-symbol"><CommunityIcon name="bell" /></div>
      <div className="mural-alert-copy"><span className="section-kicker">AVISOS NO APLICATIVO</span><h2 id="alerts-title">A próxima vaga<br /><em>pode encontrar você.</em></h2><p>Preencha sua cidade e seus instrumentos no perfil. Quando uma banda da mesma cidade procurar alguém que toque seu instrumento, o aviso aparece no TumTumPá.</p><ul><li><CheckIcon />Vagas da sua cidade</li><li><CheckIcon />Compatibilidade com seus instrumentos</li></ul><a className="mural-secondary-link" href={APP + "/login"}>Entrar e completar meu perfil <Arrow /></a></div>
    </section>
    <section className="mural-final" aria-labelledby="ready-title"><div><span className="section-kicker">MONTE SUA BANDA</span><h2 id="ready-title">Vamos encontrar<br /><em>com quem tocar?</em></h2></div><div><p>Seu anúncio pode ser o começo da próxima formação.</p><a className="yellow-link" href={APP + "/mural/meus-anuncios"}>Criar meu anúncio <Arrow /></a><a className="mural-secondary-link" href={APP + "/mural"}>Ver anúncios no mural <Arrow direction="right" /></a></div></section>
    <FlowFooter />
  </main>;
}

