/**
 * cardsModel.js — Validação de flashcards e lógica de importação/gestão.
 *
 * Um card é um objeto de dados puro. Este módulo NUNCA gera, completa ou
 * corrige conteúdo jurídico: ele só valida a FORMA (campos obrigatórios,
 * tipos, duplicidade de id). O conteúdo é sempre responsabilidade de quem
 * importa o JSON.
 */
(function (global) {
  'use strict';

  var REQUIRED_FIELDS = ['id', 'norma', 'tema', 'tipo', 'pergunta', 'resposta'];
  var OPTIONAL_FIELDS_DEFAULTS = {
    artigo: '',
    prioridade: 3,
    pegadinha: false,
    explicacao: '',
    fonte: '',
    opcoes: null,          // usado por multipla_escolha: [{texto, correta}]
    gabarito: null         // usado por certo_errado / completar, se aplicável
  };
  var VALID_TIPOS = ['pergunta_direta', 'certo_errado', 'multipla_escolha', 'completar'];

  function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
  }

  /**
   * Valida um único card "cru" (vindo de JSON externo).
   * Retorna { valid: bool, errors: [string], normalized: card|null }
   */
  function validateCard(raw) {
    var errors = [];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { valid: false, errors: ['Item não é um objeto JSON válido.'], normalized: null };
    }

    REQUIRED_FIELDS.forEach(function (f) {
      if (!(f in raw) || !isNonEmptyString(String(raw[f] !== undefined && raw[f] !== null ? raw[f] : ''))) {
        errors.push('Campo obrigatório ausente ou vazio: "' + f + '".');
      }
    });

    if (raw.id !== undefined && !/^[A-Za-z0-9_.\-]+$/.test(String(raw.id))) {
      errors.push('Campo "id" contém caracteres inválidos (use letras, números, "-", "_", ".").');
    }

    if (raw.tipo !== undefined && VALID_TIPOS.indexOf(raw.tipo) === -1) {
      errors.push('Campo "tipo" desconhecido: "' + raw.tipo + '". Tipos aceitos: ' + VALID_TIPOS.join(', ') + ' (outros tipos futuros exigem atualizar VALID_TIPOS).');
    }

    if (raw.prioridade !== undefined) {
      var pr = Number(raw.prioridade);
      if (!Number.isInteger(pr) || pr < 1 || pr > 5) {
        errors.push('Campo "prioridade" deve ser um inteiro de 1 a 5.');
      }
    }

    if (raw.pegadinha !== undefined && typeof raw.pegadinha !== 'boolean') {
      errors.push('Campo "pegadinha" deve ser verdadeiro/falso (boolean).');
    }

    if (raw.tipo === 'multipla_escolha' && raw.opcoes !== undefined && raw.opcoes !== null) {
      if (!Array.isArray(raw.opcoes) || raw.opcoes.length === 0) {
        errors.push('Campo "opcoes" deve ser uma lista não vazia para tipo "multipla_escolha".');
      }
    }

    if (raw.tipo === 'certo_errado' && raw.gabarito !== undefined && raw.gabarito !== null) {
      if (typeof raw.gabarito !== 'boolean') {
        errors.push('Campo "gabarito" deve ser verdadeiro/falso (boolean) para tipo "certo_errado".');
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors: errors, normalized: null };
    }

    var normalized = {
      id: String(raw.id).trim(),
      norma: String(raw.norma).trim(),
      artigo: raw.artigo !== undefined && raw.artigo !== null ? String(raw.artigo).trim() : OPTIONAL_FIELDS_DEFAULTS.artigo,
      tema: String(raw.tema).trim(),
      prioridade: raw.prioridade !== undefined ? Number(raw.prioridade) : OPTIONAL_FIELDS_DEFAULTS.prioridade,
      tipo: raw.tipo,
      pegadinha: raw.pegadinha === true,
      pergunta: String(raw.pergunta).trim(),
      resposta: String(raw.resposta).trim(),
      explicacao: raw.explicacao !== undefined && raw.explicacao !== null ? String(raw.explicacao).trim() : OPTIONAL_FIELDS_DEFAULTS.explicacao,
      fonte: raw.fonte !== undefined && raw.fonte !== null ? String(raw.fonte).trim() : OPTIONAL_FIELDS_DEFAULTS.fonte,
      opcoes: raw.opcoes !== undefined ? raw.opcoes : OPTIONAL_FIELDS_DEFAULTS.opcoes,
      gabarito: raw.gabarito !== undefined ? raw.gabarito : OPTIONAL_FIELDS_DEFAULTS.gabarito
    };

    return { valid: true, errors: [], normalized: normalized };
  }

  /**
   * Aceita tanto o formato "array simples" (`[ {card}, {card}, ... ]`) quanto
   * o formato "envelope" usado pelos bancos fornecidos externamente:
   *   { "schema_version": "1.0", "banco": { "nome": ..., "norma": ..., ... }, "cards": [ ... ] }
   * Retorna { cardsArray, meta } — `meta` é o objeto "banco" quando presente,
   * ou null no formato array simples. Não valida os cards individualmente
   * aqui, só identifica a forma do documento.
   */
  function extractCardsArray(parsed) {
    if (Array.isArray(parsed)) {
      return { cardsArray: parsed, meta: null };
    }
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.cards)) {
      return { cardsArray: parsed.cards, meta: parsed.banco || null };
    }
    return { cardsArray: null, meta: null };
  }

  /**
   * Analisa um lote de cards (array de objetos crus, ou o documento
   * "envelope" com { banco, cards }) contra o banco já existente (map
   * id->card). Não grava nada — só produz o relatório de pré-importação
   * exigido pela especificação (novos / já existentes / inválidos), além de
   * detectar duplicidade DENTRO do próprio lote.
   */
  function analyzeImportBatch(rawInput, existingCardsById) {
    var extracted = extractCardsArray(rawInput);
    var rawArray = extracted.cardsArray;

    var report = {
      total: Array.isArray(rawArray) ? rawArray.length : 0,
      novos: [],            // cards normalizados, prontos para adicionar
      existentes: [],       // cards normalizados já presentes no banco (não são tocados por padrão)
      existentesAlterados: [], // { card, diffs } — subconjunto de "existentes" cujo conteúdo mudou de fato
      invalidos: [],         // {index, errors, raw}
      duplicadosNoLote: [],  // ids repetidos dentro do próprio arquivo importado
      meta: extracted.meta   // metadados do "banco" (nome/norma/descrição), se o envelope os trouxer
    };

    if (!Array.isArray(rawArray)) {
      report.invalidos.push({ index: 0, errors: ['O JSON importado deve ser uma lista de cards, ou um objeto com um campo "cards" contendo essa lista.'], raw: rawInput });
      return report;
    }

    var seenInBatch = {};

    rawArray.forEach(function (raw, index) {
      var result = validateCard(raw);
      if (!result.valid) {
        report.invalidos.push({ index: index, errors: result.errors, raw: raw });
        return;
      }
      var card = result.normalized;
      if (seenInBatch[card.id]) {
        report.duplicadosNoLote.push(card.id);
        return;
      }
      seenInBatch[card.id] = true;

      if (existingCardsById[card.id]) {
        report.existentes.push(card);
        var diffs = diffCard(existingCardsById[card.id], card);
        if (diffs.length > 0) report.existentesAlterados.push({ card: card, diffs: diffs });
      } else {
        report.novos.push(card);
      }
    });

    return report;
  }

  /**
   * Retorna { errors: [...] } com diffs de campos entre o card existente e o
   * novo, para uso na tela de "atualizar card existente" (edição explícita).
   */
  function diffCard(existing, updated) {
    var fields = REQUIRED_FIELDS.concat(Object.keys(OPTIONAL_FIELDS_DEFAULTS));
    var diffs = [];
    fields.forEach(function (f) {
      var a = existing[f];
      var b = updated[f];
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        diffs.push({ field: f, from: a, to: b });
      }
    });
    return diffs;
  }

  global.MF = global.MF || {};
  global.MF.CardsModel = {
    REQUIRED_FIELDS: REQUIRED_FIELDS,
    OPTIONAL_FIELDS_DEFAULTS: OPTIONAL_FIELDS_DEFAULTS,
    VALID_TIPOS: VALID_TIPOS,
    validateCard: validateCard,
    extractCardsArray: extractCardsArray,
    analyzeImportBatch: analyzeImportBatch,
    diffCard: diffCard
  };
})(window);
