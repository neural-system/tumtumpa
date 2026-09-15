"use client";

import { useState } from "react";
import { CommunityIcon } from "./community-preview";

const examples = [
  { category: "Instrumentos", title: "Violão eletroacústico", description: "Cordas de aço, captação ativa e capa acolchoada.", price: 850, condition: "Bom estado", included: "Capa acolchoada", city: "São Paulo, SP", note: "Usado em ensaios. Pequenas marcas no corpo e parte elétrica funcionando." },
  { category: "Áudio", title: "Amplificador de 30 W", description: "Dois canais e entrada auxiliar para acompanhar o ensaio.", price: 620, condition: "Bom estado", included: "Cabo de alimentação", city: "Belo Horizonte, MG", note: "Uso doméstico. Controles e entradas funcionando, com marcas externas de uso." },
  { category: "Acessórios", title: "Pedaleira com bolsa", description: "Base para organizar pedais e transportar entre ensaios.", price: 180, condition: "Marcas de uso", included: "Bolsa de transporte", city: "Curitiba, PR", note: "Base com fixadores. A bolsa tem marcas de uso; os pedais não estão incluídos." },
];

function TagIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m20 13-7 7a2 2 0 0 1-3 0l-8-8V2h10l8 8a2 2 0 0 1 0 3Z" /><circle cx="7" cy="7" r="1" /></svg>;
}

export function ClassifiedsPreview() {
  const [selected, setSelected] = useState(0);
  const item = examples[selected];
  return <figure className="classifieds-preview" id="previa-classificados" aria-label="Prévia ilustrativa dos classificados">
    <div className="classifieds-preview-bar"><span><TagIcon />Classificados</span><span>PRÉVIA</span></div>
    <div className="classifieds-tabs" aria-label="Categoria dos anúncios de exemplo">
      {examples.map((example, index) => <button type="button" key={example.category} aria-pressed={selected === index} onClick={() => setSelected(index)}>{example.category}</button>)}
    </div>
    <div aria-live="polite" aria-atomic="true">
      <article className="classifieds-example" key={item.category}>
        <div className="classifieds-example-top"><span>Anúncio de exemplo</span><span>Usado</span></div>
        <h3>{item.title}</h3>
        <p className="classifieds-example-description">{item.description}</p>
        <div className="classifieds-price"><span>Valor anunciado</span><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(item.price)}</strong></div>
        <p className="classifieds-location"><CommunityIcon name="pin" />{item.city}</p>
        <dl className="classifieds-specs"><div><dt>Condição</dt><dd>{item.condition}</dd></div><div><dt>Acompanha</dt><dd>{item.included}</dd></div></dl>
        <details className="classifieds-example-details"><summary>Mais sobre o equipamento<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary><p>{item.note}</p></details>
      </article>
    </div>
    <figcaption>Exemplos fictícios. Os preços são ilustrativos e não representam ofertas disponíveis.</figcaption>
  </figure>;
}
