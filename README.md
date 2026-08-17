# Médico Fiscal — CREMERS · Flashcards

Aplicativo web de estudo por repetição espaçada para o concurso de Médico Fiscal do CREMERS. Roda inteiramente no navegador, sem backend, sem conexão com IA e sem serviços pagos — todos os dados ficam salvos no seu próprio computador (localStorage).

**Publicado em:** https://mbpericias.github.io/medico-fiscal-cremers/

## Como executar

**Opção A — abrir diretamente (mais simples)**

Dê duplo clique em [`index.html`](index.html). O app abre no navegador padrão e já funciona, incluindo salvar dados entre sessões.

**Opção B — servidor local (recomendado, mais consistente entre navegadores)**

Alguns navegadores restringem certas funcionalidades ao abrir arquivos com `file://`. Se notar qualquer comportamento estranho, rode um servidor local:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1
```

Depois acesse **http://localhost:8080** no navegador. (O script `serve.ps1` é um servidor HTTP estático simples, escrito em PowerShell puro — nenhuma instalação adicional é necessária.)

Para parar o servidor, feche a janela do PowerShell ou pressione `Ctrl+C`.

**Opção C — instalar como aplicativo no celular (PWA)**

Veja a seção [Instalar no celular (PWA)](#instalar-no-celular-pwa) abaixo — requer publicar os arquivos num endereço HTTPS (grátis, sem servidor/backend).

## Arquitetura

O projeto separa **motor de estudo** (código) de **banco de flashcards** (dados), conforme pedido:

- `index.html`, `css/`, `js/` — o aplicativo. Não muda quando você estuda uma nova norma.
- `data/lei-3268-1957.json` — o banco inicial (veja abaixo).
- `manifest.json`, `sw.js`, `icons/` — configuração do PWA (ver seção própria abaixo). Também não muda com o conteúdo.
- Qualquer banco novo entra pela tela **Importar flashcards**, nunca editando código.

Não há build step, bundler ou dependências externas: são arquivos `.html`/`.css`/`.js` simples, carregados diretamente pelo navegador. Isso mantém o projeto fácil de rodar, versionar e fazer backup — você pode, inclusive, colocar esta pasta inteira sob controle de versão (git) se quiser histórico das mudanças no código, além dos backups de dados descritos abaixo.

### Módulos principais (`js/`)

| Arquivo | Responsabilidade |
|---|---|
| `storage.js` | Única camada que toca `localStorage`. |
| `srs.js` | Algoritmo de repetição espaçada (documentado em comentários no próprio arquivo). |
| `cardsModel.js` | Validação de cards e análise de lotes de importação. |
| `state.js` | Estado central da aplicação; todas as views passam por aqui. |
| `stats.js` | Cálculos de desempenho (por norma, tema, período). |
| `session.js` | Monta e conduz sessões de estudo (seleção de cards, fila, reinserção de erros). |
| `simulado.js` | Lógica do modo Simulado (seleção de cards objetivos, correção, relatório). |
| `ui.js`, `router.js` | Utilitários de interface e roteamento por hash (`#/rota`). |
| `pwaInstall.js` | Captura o prompt de instalação (Android/desktop) e detecta iOS/standalone. |
| `catalogSync.js` | Sincroniza o banco local com `data/catalog.json` — só adiciona cards novos, nunca apaga/sobrescreve. |
| `views/*.js` | Uma tela por arquivo. |
| `app.js` | Bootstrap: monta o layout e registra as rotas. |

`generate-icons.ps1` (raiz do projeto) gera os PNGs de `icons/` a partir de código (sem depender de nenhum editor de imagem); só precisa rodar de novo se quiser trocar o design do ícone.

## Catálogo de bancos oficiais

[`data/catalog.json`](data/catalog.json) lista os bancos **oficiais** — os que todo usuário deve ter automaticamente, sem precisar importar nada:

| Arquivo | Norma | Cards |
|---|---|---|
| [`data/lei-3268-1957.json`](data/lei-3268-1957.json) | Lei 3.268/1957 | 40 |
| [`data/resolucao-cfm-2056-2013.json`](data/resolucao-cfm-2056-2013.json) | Resolução CFM 2.056/2013 | 52 |
| [`data/resolucao-cfm-2336-2023.json`](data/resolucao-cfm-2336-2023.json) | Resolução CFM 2.336/2023 | 58 |

**Total oficial atual: 150 cards.**

Em toda abertura do app (servido por `http://`/`https://` — sob duplo clique direto em `index.html`, sem servidor, isso não funciona por restrição do navegador), [`js/catalogSync.js`](js/catalogSync.js) lê esse catálogo e:

1. busca cada arquivo listado;
2. para cada card cujo `id` **ainda não existe** no seu banco local, adiciona com progresso zerado;
3. cards cujo `id` **já existe** localmente nunca são tocados — nem o conteúdo, nem (principalmente) o progresso de estudo, histórico ou domínio.

Isso significa que a sincronização é **só de adição, nunca de substituição**: um usuário que já tem os 40 cards da Lei 3.268/1957 com meses de progresso, ao abrir a versão atual do app, mantém esse progresso intocado e só recebe automaticamente os 110 cards das duas Resoluções que ainda não tinha. Um usuário novo recebe os 150 de uma vez, todos zerados.

### Adicionando uma nova norma ao catálogo oficial

Não é preciso alterar `app.js`, `state.js` ou qualquer lógica do app. Só:

1. coloque o novo arquivo `.json` (no formato descrito em [`docs/formato-json.md`](docs/formato-json.md)) em `data/`;
2. acrescente uma entrada em `data/catalog.json`:
   ```json
   { "arquivo": "data/nome-do-arquivo.json", "norma": "Nome da norma" }
   ```
3. (recomendado) acrescente o mesmo arquivo à lista `CORE_ASSETS` de [`sw.js`](sw.js) e suba a versão de `CACHE_NAME`, para que fique disponível offline desde a primeira sincronização — sem isso, ainda funciona, só entra no cache depois do primeiro carregamento online;
4. publique.

Todo usuário existente recebe automaticamente só os cards novos na próxima vez que abrir o app; ninguém perde progresso.

### Importação manual — continua disponível

A tela **Importar flashcards** não foi removida e continua útil para bancos particulares, testes, cards experimentais ou qualquer banco que você ainda não queira incorporar ao catálogo oficial. Veja [`docs/formato-json.md`](docs/formato-json.md) para o formato completo de cada campo, incluindo os tipos `certo_errado` e `multipla_escolha` usados pelo modo Simulado.

## Funcionalidades

- **Dashboard**: sequência de estudo, totais, domínio geral, meta diária, atalhos rápidos, desempenho por norma.
- **Estudar**: sessões configuráveis (quantidade e modo — inteligente, novos, erros, difíceis, pegadinhas, alta prioridade, norma específica, tema específico), com atalhos de teclado (`Espaço` mostra resposta, `1`–`4` avaliam).
- **Banco de flashcards**: busca global, filtros, edição preservando histórico, exclusão com confirmação.
- **Importar flashcards**: colar JSON ou selecionar arquivo, com relatório prévio (novos / já existentes / inválidos / duplicados) antes de confirmar.
- **Estatísticas**: estudados hoje/7/30 dias, taxa de acerto, domínio, distribuição de respostas, desempenho por norma e tema.
- **Simulado**: perguntas objetivas (`certo_errado` / `multipla_escolha` com gabarito), sem feedback imediato, resultado e erros só ao final.
- **Backup**: exportar tudo (`Configurações → Exportar backup completo`) e restaurar (com confirmação, pois substitui os dados atuais).
- **Tema claro/escuro** e **layout responsivo** (desktop prioritário, utilizável no celular).
- **Instalável (PWA)**: ícone próprio, abre em tela cheia, funciona offline em desktop e celular (Android e iPhone) — veja [Instalar no celular](#instalar-no-celular-pwa).

## Instalar no celular (PWA)

O app é um **PWA (Progressive Web App)**: tem manifest, ícone próprio, abre em tela cheia (sem barra de endereço) e funciona offline depois do primeiro carregamento, em Android e iPhone.

### Por que precisa de HTTPS

Service worker (o mecanismo que guarda o app em cache para funcionar offline) só roda em **contexto seguro**: HTTPS, ou `localhost` no próprio computador. Rodar `serve.ps1` funciona perfeitamente para testar no PC, mas o celular não consegue enxergar o `localhost` do computador como um site instalável. Para instalar no celular de verdade, os arquivos precisam estar publicados num endereço HTTPS.

Isso **não é um backend**: continua sendo só um conjunto de arquivos estáticos, sem servidor, sem banco de dados remoto e sem serviço pago — só um "lugar na internet" que serve esses mesmos arquivos por HTTPS. A opção mais simples e gratuita é o **GitHub Pages**:

1. Crie um repositório novo (pode ser privado) no GitHub e suba todos os arquivos desta pasta.
2. No repositório, vá em **Settings → Pages**, e em "Source" escolha a branch principal (`main`) e a pasta `/ (root)`.
3. Aguarde 1-2 minutos; o GitHub mostrará o endereço público, algo como `https://seu-usuario.github.io/nome-do-repo/`.
4. Abra esse endereço no celular (Chrome no Android, Safari no iPhone) para instalar.

Alternativas igualmente gratuitas e sem conta de cartão de crédito: **Netlify** ou **Cloudflare Pages** (ambas permitem arrastar a pasta do projeto direto no navegador, sem precisar de git). Qualquer uma serve; o importante é só que o endereço comece com `https://`.

> Nada disso é obrigatório para usar o app no computador — `serve.ps1` ou abrir o `index.html` direto continuam funcionando normalmente, sem depender de internet.

### Instalar no Android

1. Abra o endereço HTTPS do app no **Chrome**.
2. Toque no menu **⋮** (canto superior direito) → **"Instalar aplicativo"** (ou "Adicionar à tela inicial"). Em alguns aparelhos o Chrome já sugere isso automaticamente com um botão na parte de baixo da tela.
3. Confirme. O ícone "MF" aparece na tela inicial e abre em tela cheia, como um app nativo.

Também dá para instalar direto pela tela **Configurações → Instalar aplicativo** dentro do próprio app.

### Instalar no iPhone/iPad

O iOS **exige o Safari** para instalar (não funciona pelo Chrome no iPhone, mesmo que o Chrome esteja instalado):

1. Abra o endereço HTTPS do app no **Safari**.
2. Toque no ícone de **Compartilhar** (o quadrado com uma seta para cima), na barra inferior.
3. Toque em **"Adicionar à Tela de Início"**.
4. Toque em **"Adicionar"** no canto superior direito.

O ícone "MF" aparece na tela inicial e abre em tela cheia, sem a barra do Safari.

### Depois de instalado

- **Offline**: depois do primeiro carregamento com internet, o app (telas, estilos, lógica) fica em cache e abre normalmente sem conexão. Seus dados (cards, progresso, histórico) sempre vivem no armazenamento local do próprio celular — nunca dependem de internet.
- **Celular e computador não compartilham dados automaticamente**: cada dispositivo/navegador tem seu próprio armazenamento local, já que não existe backend nem conta de usuário nesta versão. Para levar seu progresso de um aparelho para o outro, use **Configurações → Exportar backup completo** num, e **Restaurar backup** no outro.
- **Atualizando o app depois de publicado**: se você mudar algo no código e publicar de novo, troque o número em `CACHE_NAME` no início de [`sw.js`](sw.js) (ex.: `'mf-cremers-v1'` → `'mf-cremers-v2'`). Isso avisa o celular para baixar a versão nova; sem isso, o celular pode continuar mostrando a versão antiga em cache por um tempo.

## Repetição espaçada (resumo)

Cada resposta (🔴 Errei / 🟠 Difícil / 🟢 Acertei / 🔵 Fácil) ajusta o intervalo até a próxima revisão do card, com pequeno peso extra para prioridade 4/5. Cards errados voltam a aparecer alguns cards depois, ainda na mesma sessão — nunca imediatamente. Domínio ("dominado") só é atingido após uma sequência sustentada de acertos, não numa única resposta certa. O algoritmo completo está comentado em [`js/srs.js`](js/srs.js).

## Backup — quando fazer

Faça backup manual sempre que quiser (`Configurações → Exportar backup completo`), especialmente antes de trocar de computador ou navegador. Nenhuma operação do app apaga dados automaticamente; importações nunca sobrescrevem cards existentes; apenas **Restaurar backup** substitui todo o banco — e sempre pede confirmação antes.
