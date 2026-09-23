# Design system — propagar a linguagem visual da landing para o app

Plano técnico para unificar a identidade visual. Hoje o app tem **dois sistemas
de design paralelos**: `frontend/src/styles/global.css` (sistema A, ~200 telas
internas) e `frontend/src/new-landing/landing.css` (sistema B, a landing nova).
Eles não compartilham nenhum token semântico nem nenhum primitivo de componente.

> Documento irmão: `docs/LANDING_PENDENCIAS.md` (pendências funcionais da landing).

---

## 1. Objetivo e não-objetivo

**Objetivo:** o app inteiro passa a falar a mesma língua visual, usando a
landing como referência de tipografia, cor, botões, navegação e espaçamento —
sem perder densidade de informação nas telas de trabalho nem quebrar as
invariantes funcionais.

**Não-objetivo:** redesenhar telas. O escopo é **token + primitivo**: cores,
tipografia, espaçamento, raio, botões. Aplicar isso já muda a cara do app; não é
necessário reimaginar layout de página.

---

## 2. Diagnóstico

### 2.1 Os dois sistemas não se tocam

Verificado por `grep`: componentes da landing **nunca** usam `.btn`, `.card`,
`.input` ou `.chip`. Os únicos matches de "card" são classes próprias
(`demo-tool-card`, `demo-share-card`). São dois conjuntos independentes de CSS.

| | Sistema A — app | Sistema B — landing |
|---|---|---|
| Arquivo | `styles/global.css` (902 linhas) | `new-landing/landing.css` (458) + 4 arquivos |
| Escopo | global (`:root`) | sob `.new-landing` |
| Temas | 2 (`data-theme`) × 8 accents (`data-accent`) | 1 tema escuro fixo |
| Cor de destaque | `--accent`, 8 opções, escolha do usuário | `--acid: #ffb000` fixo, hardcoded 23× |
| Botões | `.btn` + 4 variantes, **235 usos em 43 arquivos** | 6 estilos ad-hoc, 0 usos de `.btn` |
| Superfície | vidro (`--glass` + `backdrop-filter`) | cor sólida opaca |
| Escala tipográfica | máx. 24px (`--page-title`) | até 116px (h1), 9 clamps distintos p/ h2 |
| Disciplina de token | 100% `var()` para cromia | **79 `var()` vs 212 hex literais** |

### 2.2 O problema real: quase-duplicatas

Censo dos hex literais da landing. Não é "faltam tokens" — é que **existem 3
brancos e ~10 pretos quase idênticos**, o que torna qualquer ajuste global
inviável:

Brancos (diferença imperceptível entre si):
`#f2f0e9` (14×) · `#f3f0e8` (12×) · `#f4f1e9` (1×, o `--paper`) — mais
`#ebe8df`, `#e8e5dc`, `#e6e3d9`, `#faf9f4`, `#f1f0ec`

Pretos/superfícies:
`#090a0c` (9×) · `#090909` (9×) · `#080808` (9×) · `#101114` (7×) · `#111`
(6×) · `#0b0b0b` (6×) · `#111216` (4×) · `#141519` (4×) · `#0a0a0a` · `#0d0e11`
· `#0e0f12`

Bordas: `#34353b` (14×) domina, contra `#2c2d33`, `#2d2e34`, `#303239`,
`#3a3b41`, `#363943`…

**Descoberta útil:** `#f2f0e9` — o branco mais usado na landing — é exatamente o
`--text` do tema escuro do app (`global.css:41`) e o `--bg` do tema claro
(`:48`). E `#ffb000` (o `--acid`, 23×) é exatamente o valor de
`data-accent="amarelo"` (`global.css:112`). Ou seja: **a landing não inventou uma
paleta nova, ela reimplementou à mão cores que o app já tinha como token.**

### 2.3 Escala tipográfica inexistente

Nove `clamp()` diferentes só para títulos de seção:
`clamp(44px,6.5vw,94px)` · `clamp(44px,5.6vw,80px)` · `clamp(46px,5.5vw,82px)` ·
`clamp(46px,5.8vw,90px)` · `clamp(46px,5.8vw,88px)` · `clamp(48px,6vw,92px)` ·
`clamp(48px,6.4vw,96px)` · `clamp(42px,4.8vw,74px)` · `clamp(52px,9vw,136px)`

E oito tamanhos de corpo: 9, 11, 12, 13, 14, 15, 16, 17, 18px. Não há escala
modular — cada seção escolheu seu número. O app, por sua vez, tem só três
degraus (24 / 15 / 14.5).

### 2.4 CSS morto

~46 regras sem uso (lista completa em `LANDING_PENDENCIAS.md` §4.3.11),
incluindo `plan-card` com 17 regras — resquício de um design importado e nunca
implementado. Precisa sair **antes** da migração, senão a gente estiliza contra
fantasmas.

---

## 3. Invariantes — o que NÃO pode mudar

Estas são restrições reais do produto, não preferência estética. Quebrar
qualquer uma delas é bug:

1. **Cifra é monoespaçada.** `global.css:3-4` documenta: o alinhamento de
   acordes sobre a letra *depende* de fonte monoespaçada. Vale para
   `.chord-sheet`, `.k-line`, `.scroll-sheet`, `textarea.input`. Nunca aplicar a
   fonte de display aqui.
2. **Palco de karaokê é escuro fixo.** `global.css:401-405` reaplica variáveis
   escuras localmente, de propósito — tela de performance, independe do tema do
   usuário. Não herdar tema claro ali.
3. **A matriz 8 accents × 2 temas continua funcionando.** Qualquer cor
   hardcoded nova é uma regressão: hoje a landing quebra isso (ver §5.2).
4. **Cores de karaokê são separadas do accent.** `--amber`, `--sweep-sung`,
   `--sweep-upcoming`, `--sample` controlam letra/acorde na cifra e são
   editáveis em Configurações — não são `--accent` e não devem virar.
5. **Estilos de impressão.** `@media print` (`global.css:845`) depende de
   `.card`/`.chord-sheet` — preservar.
6. **Variáveis `--k-*` são estado persistido do usuário** (`--k-zoom`,
   `--k-sidebar-w`, `--k-chord-font-scale`). Não são tokens de design; não
   entrar na limpeza.
7. **Teste de contraste é obrigatório antes de trocar qualquer par
   texto/fundo.** A troca do acento ácido por `--accent` muda contraste em 8
   combinações — ver §7.

---

## 4. Camada de tokens proposta

Aditiva em `global.css`, **sem alterar nenhum consumidor existente**. Fase 1 do
§6. Nomes novos para não colidir com os atuais.

### 4.1 Cor

Reaproveitar o que já existe; criar só o que falta.

| Token proposto | Valor | Vem de |
|---|---|---|
| `--surface-0` | `var(--bg)` | já existe |
| `--surface-1` | `var(--bg-raise)` | já existe |
| `--surface-2` | `var(--glass-strong)` | já existe |
| `--border` | `var(--stroke)` | já existe |
| `--text-strong` | `var(--text)` | já existe |
| `--text-muted` | `var(--muted)` | já existe |
| `--accent` | (já existe, 8 opções) | já existe |
| `--accent-ink` | (já existe) | já existe |
| `--ink` | `#090a0c` | landing |
| `--paper` | `#f2f0e9` | landing `#f2f0e9`, **não** `#f4f1e9` |

Decisões de consolidação:

- **`--paper` = `#f2f0e9`**, colapsando `#f2f0e9` + `#f3f0e8` + `#f4f1e9`. Diferença
  máxima de 2 unidades por canal — visualmente idênticas. Escolher o valor que
  já é `--text` do app reduz a matriz.
- **Uma escala de superfície em 4 degraus** (`bg` → `bg-raise` → 2 vidros
  intermediários) substitui os ~10 pretos. A landing passa a usar
  `--surface-*` em vez de `#101114`/`#141519`/`#111216`.
- **`#34353b` → `--stroke`.** Hoje é cinza opaco; o app usa alfa. Alfa é
  melhor porque acompanha o tema.
- **Remover `--blue: #284cff`** (`landing.css:5`) — declarado e nunca usado.

### 4.2 Tipografia

Hoje `--font-display`/`--font-body`/`--font-mono` já existem e a landing os
consome via `--font-geist-sans` (`landing.css:8-9`). **Isto já está correto** —
as famílias registradas pelos pacotes são `'Geist Variable'` e
`'Geist Mono Variable'`, que é exatamente o que `global.css:27-29` declara.

Falta só a **escala**. Proposta (1rem = 16px, base fluida com `clamp`):

| Token | Valor | Uso |
|---|---|---|
| `--text-display-1` | `clamp(3.5rem, 7.4vw, 7.25rem)` | hero da landing (56→116px) |
| `--text-display-2` | `clamp(2.75rem, 5.8vw, 5.75rem)` | h2 de seção (44→92px) |
| `--text-title-1` | `clamp(1.5rem, 2.6vw, 2.125rem)` | h3 (24→34px) |
| `--text-title-2` | `1.5rem` | `--page-title` do app (24px) |
| `--text-title-3` | `0.9375rem` | `--section-heading` (15px) |
| `--text-body` | `1rem` | corpo em superfícies de leitura |
| `--text-body-sm` | `0.90625rem` | corpo denso do app (14.5px) |
| `--text-label` | `0.6875rem` | micro-rótulo (11px) |
| `--tracking-tight` | `-0.065em` | display |
| `--tracking-label` | `0.15em` | micro-rótulo uppercase |

**Tensão a resolver (decisão de produto):** o app usa 14.5px de corpo; a landing,
17-18px. Aumentar o corpo do app melhora leitura, mas as telas são densas
(tabelas de música, setlists, sidebar). **Recomendação:** adotar 16px só em
superfícies de leitura (cifra, editor, modais) e manter 14.5px nas listas
tabulares. Não unificar por unificar.

### 4.3 Micro-rótulo uppercase — primitivo único

Hoje há **três** tratamentos para o mesmo conceito, com letter-spacing diferente:

| Onde | Fonte | Tamanho | Tracking |
|---|---|---|---|
| `.section-kicker` (landing) | mono | 11px | `.15em` |
| `.nav-section-label` (app) | sans | 11px | `.06em` |
| `.stat .label` (app) | sans | 12.5px | `.08em` |
| `.k-chord-sidebar-title` (app) | sans | 12px | `.06em` |

Criar **um** `.eyebrow` (ou `--text-label` + `--tracking-label`) e migrar os
quatro. Ganho: consistência e uma linha de CSS no lugar de quatro regras.

### 4.4 Espaçamento, raio e movimento

**Espaçamento.** Escala de 4px: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 64 · 96 · 140`.
Landing usa 130-155px vertical / 5-7vw horizontal; app usa `76px 34px 28px`.
Manter **dois ritmos** é legítimo (marketing é arejado, app é denso) desde que os
degraus venham da mesma escala — hoje não vêm (a landing tem 24 valores soltos).

**Raio.** Unificar em 4 degraus: `--radius-sm: 4px` (chip/rótulo),
`--radius-md: 8px` (controle/input/botão), `--radius-lg: 12px` (card),
`--radius-pill: 999px`. Hoje: app usa 3/4/6/8/10/14/50%/999; landing usa
2/4/7/8/10/12/14/999.
→ O `border-radius: 2px` do CTA principal da landing (`.yellow-link`) é uma
**assinatura editorial deliberada** (canto quase reto). Decidir: manter como
`--radius-square: 2px` documentado, ou alinhar em `--radius-md: 8px`. Não deixar
como acidente.

**Movimento.** Unificar as durações (app: `100ms/120ms/200ms/220ms/260ms/280ms`;
landing: `200ms`) e **consolidar o `prefers-reduced-motion`**: o app tem o global
correto (`global.css:900`), a landing tem uma versão fraca que cobre 2 elementos
(`landing.css:436`). A landing deve simplesmente herdar o global.

---

## 5. As cinco áreas

### 5.1 Tipografia

1. Adicionar a escala do §4.2.
2. Migrar os 9 `clamp()` de h2 da landing para `--text-display-2`.
3. Reduzir os 8 tamanhos de corpo da landing a 4 (`body`, `body-sm`, `label`, `title-3`).
4. Unificar o micro-rótulo (§4.3).
5. **Preservar mono na cifra** (invariante 1).

### 5.2 Cores

Este é o item com **impacto de comportamento**, não só visual.

Hoje a landing fixa `--acid: #ffb000` em 23 lugares e ignora `--accent`. Um
usuário com accent "azul" vê a landing âmbar. Duas saídas:

- **Opção A — landing respeita o accent.** Trocar `--acid` por `var(--accent)`
  e `#090909` sobre ele por `var(--accent-ink)`. Comportamento consistente; a
  landing deixa de ter identidade fixa.
- **Opção B — amarelo vira o accent padrão.** `DEFAULT_ACCENT` hoje é `'azul'`
  (`hooks/useTheme.js:9`). Mudar para `'amarelo'` + manter a landing fixa
  alinharia marca e app sem tocar em 23 lugares, mas **troca a identidade de
  todos os usuários existentes** — só considerar se for intencional.

**Recomendação: Opção A**, com a landing declarando `--acid: var(--accent)` —
mantém a marca âmbar para quem nunca trocou (se o default virar amarelo) e
respeita quem escolheu. Requer decidir o default junto.

Outros pontos:
- Trocar os ~10 pretos por `--surface-*` (§4.1).
- Colapsar os 3 brancos em `--paper`.
- `#34353b` → `--stroke`.
- **`cifra-demo.css:6` hardcoda `outline: 2px solid #ffb000`** no
  `:focus-visible`, e `:7` usa `accent-color: #ffb000`. Isso quebra o tema do
  app — deve ser `var(--accent)`. É acessibilidade, não estética.

### 5.3 Botões

Hoje: `.btn` (235 usos / 43 arquivos) vs 6 estilos paralelos na landing
(`.yellow-link`, `.text-link`, `.share-setlist`, `.flow-login`, `.catalog-genres
button`, `.updated-plan a`).

**Movimento arquitetural: estender `.btn`, não criar segundo sistema.** Adicionar
variantes que expressam o vocabulário da landing:

| Variante nova | Equivale a | Aparência |
|---|---|---|
| `.btn.accent` | `.yellow-link` | fundo `--accent`, texto `--accent-ink` |
| `.btn.link` | `.text-link` | transparente, sublinhado `--accent` |
| `.btn.outline` | `.updated-plan a` | transparente, borda `--stroke` |
| (`.btn.ghost` já existe) | `.catalog-empty button` | — |

Depois migrar os 6 estilos da landing para essas variantes, e o app passa a
poder adotar o visual da landing **incrementalmente, por tela**, sem um segundo
sistema. Os 235 usos existentes de `.btn` continuam funcionando (variantes são
aditivas).

Ajuste de forma: `.btn` é `padding: 9px 16px; radius 10px; font 13.5/600`. O CTA
da landing é mais alto (`15px 22px`) e mais pesado (`800`). Propor
`--btn-pad-y`/`--btn-pad-x` e uma variante de peso, em vez de números soltos.

### 5.4 Navegação

Os dois padrões são **legitimamente diferentes** e não devem fundir:

| | App (produto) | Landing (marketing) |
|---|---|---|
| Estrutura | `.sidebar` 232px, retrátil a 64px | `.flow-nav` topo, 76px, sticky |
| Item ativo | `inset 2px 0 0 var(--accent)` | pill com fundo `--paper` |
| Mobile | sidebar → 64px | menu hambúrguer (`@media 700px`) |

O que **deve** ser compartilhado:
1. **Altura 76px.** O `.main` do app já usa `padding-top: 76px` e o `.flow-nav`
   tem `height: 76px` — é a mesma métrica, hoje por coincidência. Formalizar
   como `--header-h: 76px`.
2. **Micro-rótulo** nos itens (§4.3).
3. **Raio pill** para chips/nav-item em contexto horizontal.
4. **Estado ativo via accent**, nos dois — hoje a landing usa fundo claro, o app
   usa barra de accent.

Adicionar `ThemeToggle` à landing é **decisão em aberto**: o docstring de
`components/ThemeToggle.jsx:8` afirma que a landing é sempre clara *de
propósito*, mas o CSS entregue é escuro. Ou o comentário está desatualizado, ou
a intenção mudou — precisa ser resolvido por quem escreveu, não por inferência.

### 5.5 Espaçamento

1. Formalizar a escala de 4px (§4.4).
2. Dois ritmos documentados: marketing (seções 130-155px) e app (`76px 34px 28px`).
3. Unificar `gap` — landing usa 3vw/4vw/6vw/9vw; app usa 12/14px. Propor
   `--gap-*` da escala em px, evitando `vw` (que quebra previsibilidade).
4. Cards: app `.card` = `18px 20px`; landing `.updated-plan` = `30px`. Unificar
   padding de card em `--card-pad: 20px`.

---

## 6. Estratégia de migração

Ordem por risco crescente. **F0-F2 não mudam nenhum pixel do app.**

| Fase | O quê | Risco | Verificação |
|---|---|---|---|
| **F0** | Deletar CSS morto; remover `--blue`; colapsar duplicatas de cor na landing | Nenhum (código sem uso) | `vite build` + diff visual da landing = zero |
| **F1** | Adicionar tokens do §4 ao `global.css` | Nenhum (aditivo, sem consumidor) | build passa; nada referencia ainda |
| **F2** | Landing consome os tokens novos (superfícies, tipografia, raio) | Baixo | diff visual da landing — deve ficar idêntico |
| **F3** | Unificar accent da landing (`--acid: var(--accent)`) | **Médio** — muda cor p/ quem tem accent ≠ amarelo | contraste nos 8 accents |
| **F4** | Adicionar variantes `.btn.*` + migrar os 6 botões da landing | Baixo (aditivo) | nenhuma tela do app muda |
| **F5** | Migrar telas do app em lotes, do mais visível ao menos | Alto | revisão por tela |

Ordem sugerida para **F5** (não migrar tudo de uma vez):
1. `Layout.jsx` + sidebar (chrome global — aparece em todas as telas)
2. `Dashboard` (a primeira tela que o usuário vê)
3. `Login` / `SignUp` (primeira impressão, hoje divergente da landing)
4. `Songs` / `Setlists` (telas de trabalho — densas, mais delicadas)
5. resto

**Não migrar:** palco de karaokê, folha de cifra, estilos de impressão
(invariantes do §3).

---

## 7. Validação

1. **Contraste — obrigatório em F3.** Medir todo par texto/fundo nos 8 accents ×
   2 temas. `#ffb000` sobre `#090a0c` é seguro; os pares do plano destacado
   (`#4b3500` sobre `#ffb000`, `#a96f00` sobre `#ebe8df`) **não foram medidos** e
   precisam ser. Alvo: WCAG AA (4.5:1 texto normal, 3:1 grande).
2. **Diff visual.** F0 e F2 devem produzir **zero** mudança visível. Screenshot
   antes/depois por seção da landing.
3. **Verificação funcional das invariantes.** Após F5, conferir: alinhamento de
   acordes na cifra (mono), palco escuro com tema claro ativo, matriz de accents,
   impressão.
4. **`prefers-reduced-motion`.** Confirmar que a landing herda o global.
5. **Build.** `cd frontend && npx vite build` (o repo tem `node_modules`
   versionado e incompleto — ver `LANDING_PENDENCIAS.md` §2).

---

## 8. Riscos e decisões abertas

| # | Questão | Por que importa |
|---|---|---|
| 1 | Landing respeita `--accent` (A) ou amarelo vira default (B)? | B muda a cor de todos os usuários atuais |
| 2 | Corpo do app sobe de 14.5px para 16px nas telas densas? | Risco de quebrar tabelas de música e setlists |
| 3 | Canto 2px do CTA da landing é assinatura ou acidente? | Define se `--radius-square` existe |
| 4 | Landing ganha `ThemeToggle`? | `ThemeToggle.jsx:8` diz que a ausência é intencional; o CSS entregue é escuro. Comentário desatualizado ou intenção mudou? |
| 5 | `node_modules`/`dist` continuam versionados? | Um clone limpo não builda hoje |
| 6 | Landing vira multilíngue (9 locales) antes ou depois do design system? | Os dois tocam o mesmo texto — fazer em sequência evita retrabalho |

**Risco principal do projeto:** a landing e o app são sistemas *paralelos*, não
um divergente do outro. A tentação é reescrever o `global.css`. **Não fazer
isso.** O caminho seguro é aditivo: tokens primeiro, variantes de `.btn` depois,
migração por tela no fim — cada fase reversível e verificável isoladamente.

---

## 9. Resultado esperado

| Métrica | Hoje | Alvo |
|---|---|---|
| Hex literais na landing | 212 | ~0 (só tokens) |
| Brancos quase idênticos | 3 | 1 |
| Pretos/superfícies quase idênticos | ~10 | 4 |
| `clamp()` distintos p/ h2 | 9 | 1 |
| Tamanhos de corpo | 8 | 4 |
| Tratamentos de micro-rótulo | 4 | 1 |
| Sistemas de botão | 2 | 1 (com variantes) |
| Cores hardcoded ignorando `--accent` | 23 | 0 |
