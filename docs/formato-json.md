# Formato do JSON de importação

A tela **Importar flashcards** aceita dois formatos equivalentes: o **envelope** (recomendado, com metadados do banco) e a **lista simples** (apenas os cards). Os dois podem ser colados ou selecionados como arquivo `.json` — o app detecta automaticamente qual é qual.

## Formato envelope (recomendado)

É o formato usado pelos três bancos oficiais atuais (Lei 3.268/1957 e Resoluções CFM 2.056/2013 e 2.336/2023) e o recomendado para os próximos bancos que você importar ou incorporar ao catálogo:

```json
{
  "schema_version": "1.0",
  "banco": {
    "nome": "Médico Fiscal CREMERS",
    "norma": "Nome da norma",
    "descricao": "Descrição livre do banco",
    "total_cards": 1
  },
  "cards": [
    {
      "id": "L3268-001",
      "norma": "Lei 3.268/1957",
      "artigo": "Art. 1º",
      "tema": "Natureza jurídica",
      "prioridade": 3,
      "tipo": "pergunta_direta",
      "pegadinha": false,
      "pergunta": "Qual é a natureza jurídica dos Conselhos de Medicina?",
      "resposta": "Texto completo da resposta, conforme a norma.",
      "explicacao": "Comentário opcional sobre o artigo.",
      "fonte": "Art. 1º da Lei 3.268/1957"
    }
  ]
}
```

O objeto `banco` é só informativo (aparece no topo do relatório de pré-importação); nenhum dos seus campos é obrigatório, e `total_cards` não precisa bater exatamente com o tamanho real de `cards` — não é validado, é só documentação para humanos.

## Formato lista simples (também aceito)

Se preferir, pode importar só o array de cards, sem o envelope:

```json
[
  {
    "id": "L3268-001",
    "norma": "Lei 3.268/1957",
    "artigo": "Art. 1º",
    "tema": "Natureza jurídica",
    "prioridade": 3,
    "tipo": "pergunta_direta",
    "pegadinha": false,
    "pergunta": "Qual é a natureza jurídica dos Conselhos de Medicina?",
    "resposta": "Texto completo da resposta, conforme a norma.",
    "explicacao": "Comentário opcional sobre o artigo.",
    "fonte": "Art. 1º da Lei 3.268/1957"
  }
]
```

## Campos

| Campo        | Obrigatório | Tipo    | Observações |
|--------------|:-----------:|---------|-------------|
| `id`         | sim | string  | Único em todo o banco. Use apenas letras, números, `-`, `_`, `.` |
| `norma`      | sim | string  | Ex.: `"Lei 3.268/1957"`. Não precisa existir antes — normas surgem dinamicamente. |
| `artigo`     | não | string  | Ex.: `"Art. 1º"` |
| `tema`       | sim | string  | Ex.: `"Natureza jurídica"` |
| `prioridade` | não | inteiro 1-5 | Padrão 3. 5 = "🔥 Decorar". |
| `tipo`       | sim | string  | `pergunta_direta`, `certo_errado`, `multipla_escolha` ou `completar` |
| `pegadinha`  | não | boolean | Padrão `false` |
| `pergunta`   | sim | string  | |
| `resposta`   | sim | string  | |
| `explicacao` | não | string  | |
| `fonte`      | não | string  | |
| `opcoes`     | não | array   | Só para `multipla_escolha`: `[{ "texto": "...", "correta": true }, ...]` |
| `gabarito`   | não | boolean | Só para `certo_errado`: `true` (certo) ou `false` (errado) |

## Regras de importação

- Cards com `id` já existente no banco **não são sobrescritos automaticamente** — aparecem como "já existentes" no relatório de pré-importação.
- Se o arquivo trouxer conteúdo diferente para algum `id` já existente (ex.: você adicionou o campo `gabarito` a um card que já estava importado), a tela de Importar mostra separadamente quantos cards têm essa diferença e o que mudou campo a campo, com um botão explícito **"Atualizar N cards existentes"** (pede confirmação antes de aplicar). Isso troca o conteúdo do card, mas nunca mexe no progresso — revisões, domínio e sequência de acertos continuam exatamente como estavam, porque ficam guardados por `id`, e o `id` não muda.
- Também é possível editar um único card manualmente em **Banco de flashcards → Ver → Editar** (o histórico é preservado do mesmo jeito).
- Cards inválidos (campo obrigatório faltando, tipo desconhecido, prioridade fora de 1-5, `gabarito`/`pegadinha` fora de true/false etc.) são listados individualmente e não impedem a importação dos demais.
- Nenhum progresso, histórico ou configuração é apagado ao importar.

## Modo Simulado

Só entram no Simulado cards `certo_errado` (com `gabarito`) ou `multipla_escolha` (com `opcoes` e uma alternativa `correta: true`). Cards `pergunta_direta` ou `completar` sem gabarito objetivo não aparecem no Simulado, pois o aplicativo nunca inventa alternativas.

## Bancos oficiais vs. importação manual

Os arquivos listados em [`data/catalog.json`](../data/catalog.json) — atualmente Lei 3.268/1957, Resolução CFM 2.056/2013 e Resolução CFM 2.336/2023, 150 cards no total — são carregados **automaticamente** em toda abertura do app (servido por `http://`/`https://`), sem qualquer alteração de conteúdo, e só *adicionam* cards cujo `id` ainda não existe localmente; nunca sobrescrevem ou apagam progresso. Veja a seção "Catálogo de bancos oficiais" no [`README.md`](../README.md) para os detalhes desse mecanismo e como incluir uma nova norma nele.

Qualquer outro banco — particular, experimental, ou uma norma que você ainda não quer tornar oficial — continua entrando exclusivamente pela tela **Importar flashcards**, manualmente, como descrito acima.
