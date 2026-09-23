import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
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

/** Linha de GET /api/band-board (rota pública, mesma que BandBoard.jsx e
 * BandBoardTeaser.jsx consomem) — só os campos que esta prévia mostra. */
type BoardPost = {
  id: string; band_name: string; city: string; genero: string; style_freeform: string;
  skill_level: string; goal: string; rehearsal_days: string[]; instruments_needed: string[];
  vocal_languages: string; bio: string;
};

/** Prévia do mural com anúncios REAIS. Antes esta vitrine era composta por
 * dois anúncios inventados no próprio arquivo, com a cidade fixa em
 * "São Paulo, SP" para os dois — quem lesse a seção não tinha como saber que
 * nada daquilo vinha do mural. Agora busca os anúncios ativos de verdade e,
 * sem nenhum, diz que está vazio em vez de fabricar exemplo.
 *
 * `uniformPostHeight` (usado por /monte-sua-banda) só estica os cards pra
 * manter as duas alturas iguais lado a lado no hero daquela página. */
export function CommunityPreview({ uniformPostHeight = false }: { uniformPostHeight?: boolean }) {
  const { data: posts, isLoading, isError } = useQuery({
    queryKey: ["band-board"],
    queryFn: () => api.get("/band-board").then((r) => r.data),
  });

  const preview: BoardPost[] = (posts ?? []).slice(0, 2);

  return <figure className={`community-preview${uniformPostHeight ? " community-preview-interactive" : ""}`}>
    <div className="community-preview-bar"><span><CommunityIcon name="people" />Monte sua banda</span><span className="community-preview-label">MURAL</span></div>
    <div className="community-preview-location"><CommunityIcon name="pin" /><span>Conexões na mesma cidade</span></div>
    <div className="community-preview-posts" aria-live="polite">
      {isLoading && <p className="community-preview-post" role="status">Carregando anúncios do mural…</p>}
      {isError && <p className="community-preview-post" role="status">Não foi possível carregar o mural agora.</p>}
      {!isLoading && !isError && preview.length === 0 && <p className="community-preview-post" role="status">Ainda não há anúncios ativos. O mural abre assim que a primeira banda publicar.</p>}
      {preview.map(post => <article className="community-preview-post" key={post.id}>
        <div className="community-post-type">
          <span>{post.goal || "Anúncio no mural"}</span>
          <span>{post.instruments_needed?.length ? post.instruments_needed.join(" · ") : (post.genero || post.style_freeform || "Formação aberta")}</span>
        </div>
        <h3>{post.band_name || "Banda no mural"}</h3>
        <p><CommunityIcon name="pin" />{post.city || "Cidade não informada"} {post.genero && <><span aria-hidden="true">·</span> {post.genero}</>}</p>
        {(post.skill_level || post.rehearsal_days?.length || post.vocal_languages) && <div className="community-post-tags">
          {post.skill_level && <span>{post.skill_level}</span>}
          {post.rehearsal_days?.length > 0 && <span>{post.rehearsal_days.join(", ")}</span>}
          {post.vocal_languages && <span>{post.vocal_languages}</span>}
        </div>}
      </article>)}
    </div>
    <div className="community-preview-alert"><span className="community-bell"><CommunityIcon name="bell" /></span><div><strong>Uma vaga combina com você</strong><p>Sua cidade. Seu instrumento.</p></div><span className="community-alert-check"><CheckIcon /></span></div>
    <figcaption>Os anúncios acima são reais e vêm do mural. O aviso de vaga é uma ilustração do alerta no aplicativo.</figcaption>
  </figure>;
}
