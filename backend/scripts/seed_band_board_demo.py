"""Anúncios SIMULADOS pro mural "monte uma banda" (demonstração/testes visuais).

Uso (a partir de backend/):
    python scripts/seed_band_board_demo.py [--user victor]   # cria (idempotente)
    python scripts/seed_band_board_demo.py --remove           # apaga só os simulados

Os anúncios ficam no nome do usuário informado (band_posts.user_id é NOT NULL)
e são identificados pelo nome da banda (lista DEMO_POSTS) — `--remove` só apaga
linhas desse usuário com esses nomes, nunca anúncios reais. Contatos e links
são fictícios (domínios reservados .example)."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import config  # noqa: E402,F401  (carrega o .env)
import db  # noqa: E402
from services.band_board_service import BandBoardService  # noqa: E402

DEMO_POSTS = [
    dict(band_name="Trio Fim de Tarde", city="São Paulo", genero="MPB", style_freeform="MPB acústico e bossa nova, voz e violão",
         skill_level="intermediario", goal="ensaios_regulares", rehearsal_days=["qua", "sab"],
         instruments_needed=["bass", "percussion"], vocal_languages="Português",
         social_links=["https://instagram.example/triofimdetarde"],
         bio="Tocamos em bares e cafés da Vila Madalena. Procuramos baixista e percussionista pra fechar o trio.",
         contact_info="WhatsApp (11) 90000-0001"),
    dict(band_name="Ruído Branco", city="Belo Horizonte", genero="Rock", style_freeform="Rock alternativo com influência de anos 90",
         skill_level="avancado", goal="shows_pagos", rehearsal_days=["ter", "qui"],
         instruments_needed=["drums", "vocals"], vocal_languages="Português e Inglês",
         social_links=["https://youtube.example/ruidobranco", "https://instagram.example/ruidobranco"],
         bio="Autorais e covers. Já temos EP gravado e shows marcados; falta baterista e vocalista principal.",
         contact_info="ruidobranco@example.com"),
    dict(band_name="Forró de Sexta", city="Recife", genero="Forró", style_freeform="Forró pé de serra e xote",
         skill_level="profissional", goal="shows_pagos", rehearsal_days=["seg", "sex"],
         instruments_needed=["keys", "percussion", "vocals"], vocal_languages="Português",
         social_links=[], bio="Banda de baile com agenda cheia de eventos. Precisamos de sanfoneiro/tecladista e cantor(a).",
         contact_info="Instagram @forrodesexta.example"),
    dict(band_name="Cover Nostalgia 80s", city="Curitiba", genero="Pop", style_freeform="Pop e rock dos anos 80",
         skill_level="intermediario", goal="hobby", rehearsal_days=["sab"],
         instruments_needed=["guitar", "keys"], vocal_languages="Português e Inglês",
         social_links=["https://facebook.example/covernostalgia80s"],
         bio="Grupo de amigos que se reúne aos sábados pra tocar por diversão e, às vezes, em festas.",
         contact_info="WhatsApp (41) 90000-0003"),
    dict(band_name="Coral Vozes da Serra", city="Gramado", genero="Gospel", style_freeform="Louvor contemporâneo e coral",
         skill_level="iniciante", goal="ensaios_regulares", rehearsal_days=["dom"],
         instruments_needed=["vocals", "piano", "violin"], vocal_languages="Português",
         social_links=[], bio="Ministério de louvor abrindo vagas pra novos integrantes, iniciantes são bem-vindos.",
         contact_info="vozesdaserra@example.com"),
    dict(band_name="Samba da Esquina", city="Rio de Janeiro", genero="Samba", style_freeform="Samba de raiz e pagode",
         skill_level="avancado", goal="shows_pagos", rehearsal_days=["qui", "dom"],
         instruments_needed=["percussion", "ukulele", "saxophone"], vocal_languages="Português",
         social_links=["https://instagram.example/sambadaesquina"],
         bio="Roda de samba semanal em Botafogo. Buscamos cavaquinista e mais um percussionista.",
         contact_info="WhatsApp (21) 90000-0005"),
    dict(band_name="Power Trio Estrada", city="Porto Alegre", genero="Blues", style_freeform="Blues rock e improviso",
         skill_level="avancado", goal="gravacao", rehearsal_days=["ter", "sex"],
         instruments_needed=["bass"], vocal_languages="Inglês",
         social_links=["https://youtube.example/powertrioestrada"],
         bio="Estamos montando o primeiro disco e precisamos de um baixista com groove e disponibilidade de estúdio.",
         contact_info="powertrio@example.com"),
    dict(band_name="Sertanejo Universitário Vila", city="Goiânia", genero="Sertanejo", style_freeform="Sertanejo universitário e modão",
         skill_level="intermediario", goal="shows_pagos", rehearsal_days=["qua", "sex"],
         instruments_needed=["guitar", "drums", "vocals"], vocal_languages="Português",
         social_links=[], bio="Dupla + banda de apoio. Tocamos em bares e formaturas, precisamos completar a formação.",
         contact_info="WhatsApp (62) 90000-0007"),
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--user", default="victor", help="username dono dos anúncios simulados")
    ap.add_argument("--remove", action="store_true", help="apaga os anúncios simulados desse usuário")
    args = ap.parse_args()
    with db.get_pool().connection() as conn:
        row = conn.execute("select id from users where username = %s", (args.user.lower(),)).fetchone()
    if not row:
        sys.exit(f"Usuário '{args.user}' não encontrado.")
    user_id = row["id"]
    names = [p["band_name"] for p in DEMO_POSTS]
    if args.remove:
        with db.get_pool().connection() as conn:
            n = conn.execute("delete from band_posts where user_id = %s and band_name = ANY(%s)", (user_id, names)).rowcount
        print(f"{n} anúncio(s) simulado(s) removido(s).")
        return
    svc = BandBoardService()
    created = 0
    for p in DEMO_POSTS:
        with db.get_pool().connection() as conn:
            exists = conn.execute("select 1 from band_posts where user_id = %s and band_name = %s", (user_id, p["band_name"])).fetchone()
        if exists:
            continue
        svc.create(user_id, p)
        created += 1
    print(f"{created} anúncio(s) simulado(s) criado(s) ({len(DEMO_POSTS) - created} já existiam).")


if __name__ == "__main__":
    main()
