"use client";

import { useState } from "react";
import "./community.css";

export function CheckIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m20 6-11 11-5-5" /></svg>;
}

export function CommunityIcon({ name }: { name: "people" | "pin" | "bell" }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "people" && <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /><circle cx="9" cy="7" r="4" /></>}
    {name === "pin" && <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>}
    {name === "bell" && <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>}
  </svg>;
}

const examples = [
  { label: "Banda busca músico", title: "Uma voz para completar a banda", instrument: "Vocal", style: "MPB e pop", level: "Intermediário", goal: "Ensaios regulares" },
  { label: "Músico busca banda", title: "Tecladista em busca de uma banda", instrument: "Teclado", style: "MPB e soul", level: "Intermediário", goal: "Ensaios regulares" },
];

export function CommunityPreview({ interactive = false }: { interactive?: boolean }) {
  const [selected, setSelected] = useState(0);
  const posts = interactive ? [examples[selected]] : examples;
  return <figure className={`community-preview${interactive ? " community-preview-interactive" : ""}`}>
    <div className="community-preview-bar"><span><CommunityIcon name="people" />Monte sua banda</span><span className="community-preview-label">PRÉVIA</span></div>
    {interactive ? <div className="community-preview-tabs" aria-label="Tipo de anúncio na prévia"><button type="button" aria-pressed={selected === 0} onClick={() => setSelected(0)}>Busco músicos</button><button type="button" aria-pressed={selected === 1} onClick={() => setSelected(1)}>Busco uma banda</button></div> : <div className="community-preview-location"><CommunityIcon name="pin" /><span>Conexões na mesma cidade</span></div>}
    <div className="community-preview-posts" aria-live={interactive ? "polite" : undefined}>
      {posts.map(post => <article className="community-preview-post" key={post.label}>
        <div className="community-post-type"><span>{post.label}</span><span>{post.instrument}</span></div>
        <h3>{post.title}</h3>
        <p><CommunityIcon name="pin" />São Paulo, SP <span aria-hidden="true">·</span> {post.style}</p>
        <div className="community-post-tags"><span>{post.level}</span><span>{post.goal}</span></div>
      </article>)}
    </div>
    <div className="community-preview-alert"><span className="community-bell"><CommunityIcon name="bell" /></span><div><strong>Uma vaga combina com você</strong><p>Sua cidade. Seu instrumento.</p></div><span className="community-alert-check"><CheckIcon /></span></div>
    <figcaption>Exemplo ilustrativo de anúncios e aviso no aplicativo.</figcaption>
  </figure>;
}

