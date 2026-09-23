# Landing page — pendências e plano de integração

Documento de acompanhamento da nova landing page (`/`), introduzida no commit
`b0b7bf17` na branch `feature/new-landing-page`.

Cobre: o que já está integrado, o que ainda falta, inconsistências conhecidas,
riscos e a ordem sugerida de execução.

> **Estado do trabalho:** as alterações descritas na seção 3 estão **no working
> tree, não commitadas**. Nada foi commitado nesta rodada.

---

## 1. Onde as coisas estão

| Item | Valor |
|---|---|
| Rota da nova landing | `/` |
| Landing anterior (órfã) | `/landing-anterior` → `pages/About.jsx` |
| Página "sobre" mais antiga (órfã) | `/sobre` → `pages/Sobre2.jsx` |
| Componentes da nova landing | `frontend/src/new-landing/` |
| Design system do app | `frontend/src/styles/global.css` |
| CSS da landing | `frontend/src/new-landing/landing.css` (+ 4 arquivos) |
| Backend | Flask + Postgres, `backend/`, rotas em `backend/routes/api_routes.py` |

Roteamento: `react-router-dom` v6 em `frontend/src/App.jsx`. As rotas públicas
ficam **fora** do bloco `<Route element={<Layout />}>` (`App.jsx:58`); tudo
dentro desse bloco exige token — `Layout.jsx:11` redireciona para `/login` sem
sessão.

**Armadilha central:** qualquer link da landing que aponte para uma rota de
dentro do `<Layout>` é um beco sem saída para visitante anônimo. Foi a causa da
maior parte dos CTAs quebrados encontrados na auditoria.

---

## 2. Como rodar localmente

### Backend

```bash
cd backend
cp .env.example .env      # preencher (ver abaixo)
python seed.py            # opcional: usuário demo (demo/demo123) com músicas
python app.py             # http://localhost:5000 — cria o schema sozinho
```

Variáveis em `backend/.env` (fonte: `backend/.env.example` + `backend/config.py`):

| Variável | Obrigatória | Para que serve |
|---|---|---|
| `SECRET_KEY` | sim | assinatura dos JWT |
| `DATABASE_URL` | **sim** | Postgres (Neon/Vercel). Sem isto o backend não sobe |
| `JWT_HOURS` | não (12) | validade do token |
| `CORS_ORIGINS` | não | em dev, `http://localhost:5173` |
| `LOG_LEVEL` | não (INFO) | — |
| `BLOB_READ_WRITE_TOKEN` | não | upload/streaming de áudio (Vercel Blob). Sem isto, recursos de áudio falham |
| `OPENAI_API_KEY` | não | autocompletar cifra com IA |
| `YOUTUBE_API_KEY` | não | busca de link/duração no YouTube |
| `STRIPE_*` | não | planos/checkout — só produção |
| `CRON_SECRET` | não | cron do YouTube no Vercel |
| `TEST_DATABASE_URL` | só p/ testes | **precisa ser um banco SEPARADO** — a suíte roda `TRUNCATE ... CASCADE` |

> ⚠️ `TEST_DATABASE_URL` não é opcional se você for rodar `pytest`: sem ela o
> `backend/tests/conftest.py` chama `pytest.exit`. E apontá-la para o banco de
> desenvolvimento **apaga dados reais** — use uma branch separada no Neon.

### Frontend

```bash
cd frontend
npm install               # ver aviso abaixo
npm run dev               # http://localhost:5173
```

`frontend/.env` é opcional: `VITE_API_URL=http://localhost:5000`. Em branco, o
proxy `/api → :5000` do `vite.config.js` resolve. **Em produção não defina** —
front e back ficam no mesmo domínio e `api.js` cai em `baseURL: '/api'`.

> ⚠️ **`frontend/node_modules` é versionado neste repo** (o `.gitignore` só
> cobre `backend/.env`), mas está **incompleto** na árvore commitada: faltam
> `@fontsource-variable/geist`, `@fontsource-variable/geist-mono` e
> `qrcode.react`, todos declarados em `package.json` e realmente importados
> (`main.jsx:5-6`, `components/FeedbackQRModal.jsx:4`). **Um clone limpo não
> builda** até rodar `npm install`. Isso é anterior à landing nova e não tem
> relação com ela.

---

## 3. Já integrado (não commitado)

Substituição de conteúdo fabricado por endpoints públicos reais, só no
frontend:

| Seção | Antes | Agora |
|---|---|---|
| "Cifras gratuitas" | `catalog.json` estático, gêneros inventados, links para `/demonstracao/cifra` | `GET /public/songs` + `/public/songs/facets`, links para `/cifra/:slug` |
| Planos | Preços e cotas digitados à mão | `GET /public/plans` |
| Monte sua banda | 2 anúncios inventados, cidade fixa "São Paulo, SP" | `GET /band-board` (anúncios reais; vazio se não houver) |
| Quadro de setlist | 4 linhas fixas, durações inventadas, título inexistente ("Antes do bis") | 4 cifras reais com tom e BPM reais |
| "O caos entra" | BPM inventado, letra/acordes fictícios | 1 música real do acervo, corpo passado por `parseBody` (`utils/lineClassifier.js`) |
| Contador de visitas | quebrado (só `/landing-anterior` chamava) | `POST /telemetry/landing-view` restaurado em `/` |
| CTAs internos | caíam no `/login` | `AuthAwareLink` manda visitante para `/cadastro` |

Verificação independente dessas mudanças: **PASS**, com um defeito encontrado e
corrigido (`keepPreviousData: true` é opção da react-query **v4**, ignorada em
silêncio pela v5.101.2 instalada — corrigido para
`placeholderData: keepPreviousData` em `landing-components.tsx:77`).

---

## 4. Pendências

### 4.1 Decisões de produto — bloqueiam o trabalho abaixo

**1. `/classificados` vende um produto que não existe.**
A página anuncia um marketplace de equipamentos usados. Não há tabela, service
nem endpoint: um `grep` por `classificad` no repo inteiro (excluindo
`new-landing`) só encontra a própria declaração de rota. É a **única** pendência
que é *feature ausente*, não lacuna de integração.
→ Construir (tabela `classified_posts` espelhando `band_posts` + endpoints) **ou**
apagar a página e direcionar a intenção para o `/mural`, que já é real e público.
A página hoje se declara "prévia ilustrativa", então não é mentira — mas ocupa
espaço de destaque anunciando algo indisponível.

**2. Ferramentas grátis estão atrás do login.**
A seção promete metrônomo, afinador e dicionário de acordes "sempre à mão". Os
três vivem dentro do `<Layout>`. Hoje um visitante é mandado para `/cadastro`,
que é melhor que o beco sem saída anterior, mas continua abaixo do que o texto
promete.
→ O dicionário é dado de referência estático: `ChordDictionaryService` **não
recebe `user_id` em nenhum método**. Expor `/acordes*` como `/api/public/*` é
seguro e segue o precedente de `/public/songs`. As páginas em si também precisam
sair do `<Layout>`. Metrônomo e afinador são client-side e só tocam
`/settings` para persistir.
→ Alternativa sem backend: suavizar a promessa para um CTA de cadastro.

**3. `/monte-sua-banda` e `/mural` competem pela mesma intenção.**
Uma é página de marketing com prévia; a outra é o mural real e já público.
→ Fundir, ou manter a primeira explicitamente como funil.

### 4.2 Dependem de backend

**4. `GET /api/public/stats`** — contagem de cifras compartilhadas, anúncios
ativos, planos. Dados já existem; permite números vivos na landing sem expor
nada de usuário. Resolve a regra editorial de não ter número na página que
também exista no banco.

**5. `GET /api/band-board/facets`** — cidades, instrumentos, níveis distintos,
espelhando `search.facets`. Habilita filtros reais no lugar do "São Paulo, SP"
que existia antes.

**6. Dicionário de acordes público** — ver decisão 2 acima. Mudança de backend
que destrava também os itens 4.1.2.

### 4.3 Frontend, sem dependência de backend

**7. Opção de query obsoleta em dois arquivos (pré-existente).**
`pages/Songs.jsx:31` e `components/landing2/Library2.jsx:25` usam
`keepPreviousData: true` — mesmo defeito silencioso corrigido na landing. É um
miss da migração v4→v5. Correção de uma linha em cada, mas **muda comportamento
visível** (as listas param de piscar vazio), então vale testar.

**8. i18n da landing.**
Toda a copy está em português hardcoded, e `document.title` é literal
(`LandingPage.tsx:9`). O app tem 9 locales em `frontend/src/locales/` e a
landing é hoje a **única superfície não traduzida**. O app se anuncia como
multilíngue na própria landing ("9 idiomas"), o que torna isso mais visível.

**9. Rotas órfãs.**
`/landing-anterior` (`About.jsx`) e `/sobre` (`Sobre2.jsx`) não têm **nenhum
link de entrada** em lugar nenhum do código. `/demonstracao/cifra/:slug` também
ficou sem entrada depois que a grade de cifras passou a apontar para
`/cifra/:slug`. Decidir: aposentar, ou redirecionar.

**10. `FlowNav` sem alternância de tema.**
O app tem `ThemeToggle` e o app inteiro respeita tema claro/escuro. A landing
força paleta escura fixa. **Atenção:** o docstring de
`components/ThemeToggle.jsx:8` diz que a ausência de toggle na landing é
*deliberada* ("sempre clara, de propósito — useForceLightTheme"). Ou seja: pode
não ser bug. Se a landing for mantida como peça fixa, falta então um
`useForceLightTheme` para ela não herdar preferência do usuário de forma
inconsistente.

**11. CSS morto na landing.**
~46 regras sem nenhum uso em `.tsx` (confirmado por classe):

`manifesto` (6 regras), `plan-card` (17), `movement-row` (6), `sheet-controls`
(3), `site-footer` (3), `manifesto-notes` (2), `scroll-cue` (2),
`preview-wave` (2), `three-movements` (1), `movement-icon` (1),
`waveform-mini` (1), `price-note` (1), `plans-section` (1).

Vêm de um design importado e nunca implementado. Remover reduz ruído e o risco
de alguém estilizar contra uma classe morta.

**12. `"use client"` vestigial.**
`classifieds-preview.tsx:1` e `community-preview.tsx:1`. Isto é Vite, não
Next.js — a diretiva não faz nada. (Um dos dois já foi removido na rodada atual.)

---

## 5. Inconsistências conhecidas

| # | Inconsistência | Impacto |
|---|---|---|
| 1 | `TrendingSongs` filtra por gênero no servidor; os gêneros vêm de `/public/songs/facets` | Correto hoje. Antes o `catalog.json` trazia `"Cifras"` como se fosse gênero |
| 2 | Landing ignora o sistema de 8 accents do app (`--accent`), fixando `--acid: #ffb000` em 23 lugares | Se o usuário escolhe accent "azul", a landing segue âmbar |
| 3 | `--blue: #284cff` declarado em `landing.css:5` e **nunca usado** | Token morto |
| 4 | Landing nunca usa `.btn`/`.card`/`.input` do app | Dois sistemas de componentes paralelos — ver doc de design system |
| 5 | Navegação: âncoras `/#...` via `<a>` (recarrega fora de `/`), rotas via `<Link>` | Deliberado: o `<a>` preserva o scroll de hash, que o `<Link>` do v6 não faz sozinho |
| 6 | `document.title` hardcoded em 3 páginas da landing | Bloqueia i18n |
| 7 | Comentário errado em `backend/routes/api_routes.py:31-33` | Diz que o rate limiter poupa `/public/plans`, mas o guard é `startswith("/api/public/")` e a rota **é** contada |

---

## 6. Riscos e dívida técnica

**Rate limit em `/api/public/*`.** 60 req/min por IP, contador em memória por
instância (`backend/middlewares/rate_limit.py`). Uma carga fria da landing custa
**5 requisições** no bucket — margem confortável. O risco real é a busca com
debounce de 400ms sob digitação rápida e sustentada; mitigado, mas vale monitorar
se a landing ganhar mais chamadas. O contador **não é distribuído**: instâncias
"frias" diferentes não compartilham estado, então o teto efetivo em produção é
mais alto que 60.

**Claim de trial removida — decisão de copy, não de engenharia.** A versão
antiga prometia "14 dias, sem cartão". `TRIAL_DAYS = 14` é real, mas
`payment_method_collection` **não aparece em lugar nenhum do backend**, e o
default da Stripe é `always` — ou seja, **cartão é exigido no trial**. A frase
antiga era falsa e por isso saiu. Se a intenção de produto for trial sem cartão,
a correção é no backend (`payment_method_collection="if_required"` em
`billing_service.py`) e aí a frase volta a ser verdadeira.

**`node_modules` versionado e incompleto.** Ver seção 2. Vale decidir se
`node_modules` e `dist/` devem continuar fora do `.gitignore` — hoje `dist/`
não é ignorado e aparece como untracked depois de qualquer build.

**Bug de comentário no backend** (`api_routes.py:31-33`), sem impacto funcional.

---

## 7. Ordem sugerida

1. **Commitar o que está pronto** (seção 3) — está verificado e independente do resto.
2. **Decisões 4.1.1, 4.1.2, 4.1.3** — sem elas, o resto do item 4 não pode ser priorizado corretamente.
3. **Item 4.3.7** (`keepPreviousData` ×2) — barato, isolado, ganho visível.
4. **Itens 4.3.11 e 4.3.12** — limpeza de CSS morto e diretivas vestigiais. Risco zero.
5. **Item 4.2.4** (`/public/stats`) — pequeno, aditivo, destrava números vivos.
6. **Item 4.2.6 → 4.1.2** — dicionário público, se a decisão for expor.
7. **Item 4.3.8** (i18n) — maior esforço, sem urgência funcional.
8. **Item 4.3.9** (rotas órfãs) — depende da decisão 4.1.3.

---

## 8. Documento relacionado

`docs/DESIGN_SYSTEM.md` — plano para propagar a linguagem visual da landing
para o resto do app (tipografia, cores, botões, navegação, espaçamento).
