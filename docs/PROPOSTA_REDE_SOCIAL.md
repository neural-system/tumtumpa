# Proposta — Rede social de músicos e bandas (TumTumPa)

Rascunho para discussão, ainda **sem código**. Nasceu do pedido: perfis de músicos e bandas
(cada banda com 2 ou mais músicos), com postagens, curtidas, comentários, divulgação do
trabalho, agenda de shows e contratações.

## 1. Ideia central

Hoje o TumTumPa é uma ferramenta de **ensaio e palco** (cifras, setlists, player, afinador…),
com um **mural "Monte uma banda"** (`band_posts`) que só anuncia vagas. A rede social
transforma o mural num **espaço de identidade e divulgação**:

- **Perfil de músico**: nome artístico, cidade, instrumentos (já existem em `users`), foto,
  bio, links, repertório em destaque (setlists públicos), disponibilidade para convites.
- **Perfil de banda**: nome, logo (aproveita `branding_service`), gênero, cidade, integrantes
  (2+ músicos, com papel/instrumento), bio, links, fotos/vídeos, agenda.
- **Feed**: postagens de músicos e bandas (texto, foto, vídeo, link do YouTube, "novo
  setlist", "show marcado"), com curtidas e comentários.
- **Agenda de shows**: eventos de uma banda (data, local, cidade, ingresso/link, status).
- **Contratações**: contratante (casa, evento, outra banda) publica uma **vaga/pedido de
  show**; bandas/músicos respondem com proposta. Substitui e amplia o mural atual.

## 2. Reaproveita o que já existe

| Novo | Aproveita |
|---|---|
| Perfil de músico | `users` (cidade, instrumentos), `user_instruments`, upload de mídia |
| Banda / logo | `branding_service` (logos por variante), whitelabel do palco |
| Postagens com mídia | `band_post_media` + Vercel Blob privado servido por proxy |
| Vagas/contratações | `band_posts` (mural) — migrar para `job_posts` com tipo |
| Alertas por cidade+instrumento | `alerts_service` (sino) |
| Repertório em destaque | setlists compartilhados (`setlists.shared`) |

## 3. Modelo de dados (esboço)

```
profiles(user_id PK, handle UNIQUE, display_name, bio, city, links[], avatar_blob, visibility)
bands(id, handle UNIQUE, name, bio, city, genre, logo_blob, visibility, created_by)
band_members(band_id, user_id, role, instrument, status[pending|active|left], joined_at)
posts(id, author_kind[user|band], author_id, body, kind, created_at, deleted_at)
post_media(id, post_id, kind, blob_url, external_url, ...)     -- igual band_post_media
post_likes(post_id, user_id, created_at)  PK(post_id, user_id)
post_comments(id, post_id, user_id, body, created_at, deleted_at)
follows(follower_id, target_kind, target_id, created_at)
events(id, band_id, title, starts_at, venue, city, ticket_url, status)
job_posts(id, author_kind, author_id, kind[gig|vaga|aula|outro], title, body, city, budget, ...)
job_replies(id, job_id, from_kind, from_id, message, status)
reports(id, reporter_id, target_kind, target_id, reason, status)     -- moderação
blocks(user_id, blocked_id)
```

Regras de posse: só integrante `active` com papel `admin` edita a banda; convite de integrante
exige aceite; post/comentário só apagável pelo autor, admin da banda ou moderador.

## 4. Fases sugeridas

1. **Perfis e bandas (MVP)** — perfil público opcional, criar banda, convidar/aceitar
   integrantes, página pública `/m/<handle>` e `/b/<handle>`. Sem feed ainda.
2. **Agenda de shows** — eventos por banda, página "Próximos shows" (por cidade), botão
   "adicionar ao calendário" (.ics). Integra com setlist: "setlist deste show".
3. **Feed, curtidas e comentários** — posts, seguir músicos/bandas, feed cronológico
   (sem algoritmo), comentários simples, denúncia.
4. **Contratações** — `job_posts` + respostas privadas (mensagem), status da proposta.
5. **Depois**: mensagens diretas, notificações push, verificação de perfil, avaliações
   pós-show, links de venda de ingresso.

## 5. Segurança, privacidade e moderação (pré-requisitos, não extras)

A auditoria de segurança desta semana mostra que o app **ainda não está pronto** para
conteúdo gerado por usuários em escala. Antes da Fase 3 é preciso:

- Corrigir os pontos **críticos/altos** do relatório (URL do Blob, tipos de upload, isolamento
  de origem, checagem de visibilidade, rate limit, `SECRET_KEY`).
- **Rate limit** por usuário/IP em posts, comentários, curtidas e convites (store compartilhado).
- **Moderação**: denunciar, bloquear, ocultar, fila para admin, termos de uso, remoção
  de conteúdo ilegal. Sem isso, o mural vira canal de spam/golpe.
- **LGPD**: perfis **privados por padrão**; contato (telefone/e-mail) só visível para
  usuários logados ou após aceite; política de privacidade e aceite no cadastro; exclusão de
  conta que apague perfil, posts e mídia; exportação de dados; menores de idade.
- **Conteúdo**: allowlist de tipos de mídia (sem SVG/HTML), varredura de links, limite de
  tamanho/quantidade, texto sempre escapado (React já faz), sem HTML rico.
- **Anti-abuso de contratação**: aviso "nunca pague adiantado", denúncia de golpe, contato
  liberado só após resposta.

## 6. Interface

- Menu novo **"Comunidade"** (agrupa Mural, Feed, Bandas, Agenda), mantendo o visual Palco.
- Perfil: capa + avatar, abas *Posts · Repertório · Agenda · Integrantes*.
- Cartão de post no estilo `.card` com ações (curtir, comentar, compartilhar, denunciar).
- Integração com o palco: botão "Tocar" nos setlists públicos do perfil.
- Mobile primeiro (o músico usa o celular no ensaio): composição de post em 2 toques.

## 7. Custos e infraestrutura

- Mais leituras no Postgres (Neon) → paginação por cursor, índices em `(created_at)` e
  `(author_kind, author_id)`, sem `count(*)` em listas grandes.
- Mídia no Vercel Blob (já usado) → limites por usuário/banda, limpeza de órfãos.
- Notificações: começar dentro do app (sino existente); e-mail só depois.

## 8. Decisões em aberto (preciso do dono do produto)

1. Perfil **público por padrão ou privado** até o usuário publicar?
2. Quem pode criar banda: qualquer usuário ou só planos pagos? Limite de bandas por usuário?
3. Feed **cronológico** (simples) ou com algum destaque por cidade/gênero?
4. Contratações: só divulgação ou o app **intermedia** proposta/pagamento? (impacto jurídico
   e no Stripe)
5. Moderação: quem modera (só o admin hoje)? Precisa de equipe/termos antes de abrir?
6. Idade mínima e tratamento de menores.
7. O mural atual (`band_posts`) é **migrado** para `job_posts` ou convive por um tempo?

## 9. Próximo passo sugerido

Fechar as decisões acima, terminar a correção dos itens críticos de segurança e então
implementar a **Fase 1** (perfis + bandas + integrantes), que já entrega valor e valida o
modelo antes de abrir posts e comentários.
