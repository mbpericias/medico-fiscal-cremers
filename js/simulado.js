/**
 * simulado.js — Modo simulado (questões objetivas).
 *
 * Só entram cards cujo tipo permite correção automática e objetiva, sem
 * inventar nada:
 *   - "certo_errado": exige campo `gabarito` boolean.
 *   - "multipla_escolha": exige `opcoes` (array) com pelo menos uma opção
 *     `{ texto, correta: true }`.
 * Cards "pergunta_direta" / "completar" sem gabarito objetivo NÃO entram no
 * simulado (não há como corrigir automaticamente sem inventar alternativas,
 * o que é proibido).
 *
 * Durante o simulado a resposta do usuário fica retida até o final: nada de
 * feedback imediato de certo/errado. Ao concluir, cada resposta é
 * classificada como acerto/erro e registrada normalmente no progresso/
 * histórico (via State.recordAnswer com rating 'acertei'/'errei'), assim o
 * simulado também alimenta as estatísticas gerais e a repetição espaçada.
 */
(function (global) {
  'use strict';

  var State = global.MF.State;
  var SRS = global.MF.SRS;

  function isEligible(card) {
    if (card.tipo === 'certo_errado') {
      return typeof card.gabarito === 'boolean';
    }
    if (card.tipo === 'multipla_escolha') {
      return Array.isArray(card.opcoes) && card.opcoes.length > 0 &&
        card.opcoes.some(function (o) { return o && o.correta === true; });
    }
    return false;
  }

  function eligibleCards(filterFn) {
    var all = State.getAllCards().filter(isEligible);
    return filterFn ? all.filter(filterFn) : all;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function createSimulado(count, filterFn) {
    var pool = shuffle(eligibleCards(filterFn));
    var chosen = (count === 'all' || !count) ? pool : pool.slice(0, count);
    return {
      cardIds: chosen.map(function (c) { return c.id; }),
      answers: {}, // cardId -> resposta do usuário (bool ou string do texto da opção)
      position: 0,
      startedAt: new Date().toISOString(),
      finished: false
    };
  }

  function answer(simulado, cardId, value) {
    simulado.answers[cardId] = value;
  }

  function isCorrect(card, userAnswer) {
    if (userAnswer === undefined || userAnswer === null) return false;
    if (card.tipo === 'certo_errado') return userAnswer === card.gabarito;
    if (card.tipo === 'multipla_escolha') {
      var correctOpt = card.opcoes.find(function (o) { return o.correta === true; });
      return correctOpt && userAnswer === correctOpt.texto;
    }
    return false;
  }

  /** Corrige tudo, grava no histórico/SRS e devolve o relatório de resultado. */
  function finish(simulado) {
    var results = simulado.cardIds.map(function (id) {
      var card = State.getCard(id);
      var userAnswer = simulado.answers[id];
      var correct = isCorrect(card, userAnswer);
      State.recordAnswer(id, correct ? SRS.RATING.ACERTEI : SRS.RATING.ERREI);
      return { cardId: id, card: card, userAnswer: userAnswer, correct: correct };
    });

    var total = results.length;
    var correctCount = results.filter(function (r) { return r.correct; }).length;

    function groupBy(keyFn) {
      var groups = {};
      results.forEach(function (r) {
        var k = keyFn(r);
        if (!groups[k]) groups[k] = { key: k, total: 0, correct: 0 };
        groups[k].total++;
        if (r.correct) groups[k].correct++;
      });
      return Object.keys(groups).map(function (k) {
        var g = groups[k];
        g.percent = Math.round((g.correct / g.total) * 100);
        return g;
      });
    }

    simulado.finished = true;
    return {
      total: total,
      correctCount: correctCount,
      percent: total ? Math.round((correctCount / total) * 100) : 0,
      byNorma: groupBy(function (r) { return r.card.norma; }),
      byTema: groupBy(function (r) { return r.card.tema; }),
      byPrioridade: groupBy(function (r) { return 'Prioridade ' + r.card.prioridade; }),
      wrongCards: results.filter(function (r) { return !r.correct; }),
      allResults: results
    };
  }

  global.MF = global.MF || {};
  global.MF.Simulado = {
    isEligible: isEligible,
    eligibleCards: eligibleCards,
    createSimulado: createSimulado,
    answer: answer,
    isCorrect: isCorrect,
    finish: finish
  };
})(window);
