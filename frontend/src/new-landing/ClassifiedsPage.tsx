import { useEffect } from "react";
import { Arrow, FlowFooter, FlowNav } from "./landing-components";
import { ClassifiedsPreview } from "./classifieds-preview";
import "./landing.css";
import "./community-page.css";
import "./classifieds-page.css";

const criteria = [
  { number: "01", title: "Categoria", copy: "Instrumentos, áudio e acessórios. Comece pelo que faz falta no seu som." },
  { number: "02", title: "Localização", copy: "Saiba onde o equipamento está para combinar os próximos passos." },
  { number: "03", title: "Condição", copy: "Estado de conservação, tempo de uso e detalhes que merecem atenção." },
  { number: "04", title: "Preço", copy: "Valor e itens incluídos à vista, antes de começar a conversa." },
];

const steps = [
  { n: "01", title: "Mostre o equipamento", copy: "Escolha a categoria, descreva o estado de conservação e informe o preço e a cidade. Fotos ajudam a mostrar os detalhes." },
  { n: "02", title: "Converse com quem se interessou", copy: "Tire dúvidas sobre uso, acessórios e funcionamento. Uma descrição clara ajuda os dois lados a decidir." },
  { n: "03", title: "Combine a entrega", copy: "Acertem os detalhes da negociação e, quando possível, um momento para experimentar o equipamento." },
];

export default function ClassifiedsPage() {
  useEffect(() => { document.title = "Classificados — Equipamentos entre músicos · TumTumPá"; }, []);
  return <main className="mural-page classificados-page new-landing">
    <FlowNav active="classificados" />
    <section className="mural-hero classifieds-hero" aria-labelledby="classificados-title">
      <div className="mural-hero-copy">
        <span className="section-kicker">COMUNIDADE · CLASSIFICADOS</span>
        <h1 id="classificados-title">Seu equipamento.<br /><em>O próximo som de alguém.</em></h1>
        <p>Encontre o que falta no seu som. Dê um novo palco ao que você já não usa. Instrumentos, áudio e acessórios entre músicos.</p>
        <div className="mural-actions"><a className="yellow-link" href="#previa-classificados">Explorar prévia <Arrow direction="right" /></a><a className="mural-secondary-link" href="#como-anunciar">Como anunciar <Arrow /></a></div>
        <p className="mural-access-note">Prévia da experiência de classificados, com anúncios ilustrativos.</p>
      </div>
      <ClassifiedsPreview />
    </section>
    <section className="mural-criteria" aria-labelledby="classificados-criteria-title">
      <div className="mural-section-title"><span className="section-kicker">ANTES DE COMBINAR</span><h2 id="classificados-criteria-title">O equipamento certo.<br /><em>Os detalhes à vista.</em></h2></div>
      <dl className="mural-criteria-list">{criteria.map(item => <div key={item.title}><dt><span aria-hidden="true">{item.number}</span>{item.title}</dt><dd>{item.copy}</dd></div>)}</dl>
    </section>
    <section className="mural-how" id="como-anunciar" aria-labelledby="classificados-how-title">
      <div className="mural-section-title"><span className="section-kicker">COMO ANUNCIAR</span><h2 id="classificados-how-title">Do canto da sala<br /><em>ao próximo ensaio.</em></h2></div>
      <div className="mural-steps">{steps.map(step => <article key={step.n}><span className="mural-step-number" aria-hidden="true">{step.n}</span><h3>{step.title}</h3><p>{step.copy}</p></article>)}</div>
    </section>
    <section className="classifieds-details" aria-labelledby="details-title">
      <div className="mural-section-title"><span className="section-kicker">UM BOM ANÚNCIO COMEÇA AQUI</span><h2 id="details-title">Conte a história.<br /><em>Mostre os detalhes.</em></h2><p>Quem está procurando quer entender o que vai levar para casa.</p></div>
      <div className="classifieds-detail-list">
        <article><span className="classifieds-detail-number" aria-hidden="true">01</span><div><h3>Fotos de perto</h3><p>Mostre o equipamento por inteiro, as conexões e as marcas de uso.</p></div></article>
        <article><span className="classifieds-detail-number" aria-hidden="true">02</span><div><h3>Descrição sem dúvidas</h3><p>Informe modelo, funcionamento, reparos e o que acompanha a venda.</p></div></article>
        <article><span className="classifieds-detail-number" aria-hidden="true">03</span><div><h3>Uma conversa direta</h3><p>Alinhe preço, disponibilidade e entrega com a outra pessoa.</p></div></article>
      </div>
    </section>
    <section className="mural-final" aria-labelledby="classificados-final-title">
      <div><span className="section-kicker">CLASSIFICADOS TUMTUMPÁ</span><h2 id="classificados-final-title">Mais música.<br /><em>Equipamento em movimento.</em></h2></div>
      <div><p>Conheça a proposta e explore os exemplos de cada categoria.</p><a className="yellow-link" href="#previa-classificados">Ver anúncios de exemplo <Arrow direction="right" /></a><a className="mural-secondary-link" href="/monte-sua-banda">Procurando com quem tocar? <Arrow /></a></div>
    </section>
    <FlowFooter />
  </main>;
}

