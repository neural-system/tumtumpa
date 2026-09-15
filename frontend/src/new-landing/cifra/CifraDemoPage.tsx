import { useEffect } from "react";
import { useParams } from "react-router-dom";
import songs from "../catalog.json";
import { FlowFooter, FlowNav } from "../landing-components";
import { CifraPlayer } from "./CifraPlayer";
import "../landing.css";

export default function CifraDemoPage() {
  const { slug } = useParams();
  const song = songs.find(item => item.slug === slug) ?? songs[0];
  const suggested = songs.filter(item => item.slug !== song.slug).slice(0, 4);

  useEffect(() => {
    document.title = `${song.title} — demonstração de cifra · TumTumPá`;
  }, [song.title]);

  return (
    <main className="cifra-shell new-landing">
      <FlowNav active="cifras" />
      <CifraPlayer key={song.slug} song={song} suggested={suggested} />
      <FlowFooter />
    </main>
  );
}
