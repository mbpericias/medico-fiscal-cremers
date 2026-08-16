/**
 * session.js — Monta e conduz uma sessão de estudo.
 *
 * Uma sessão é uma fila de cardIds. Regras:
 *  - "Revisão inteligente": mistura cards devidos hoje + novos, priorizando
 *    devidos, com leve peso extra para prioridade alta (4/5) e para cards
 *    com pior domínio.
 *  - Ao responder "Errei" (dentro da sessão, fora de Simulado), o card é
 *    removido da posição atual e reinserido de 3 a 5 posições à frente
 *    (nunca imediatamente seguinte), para reaparecer ainda na mesma sessão.
 */
(function (global) {
  'use strict';

  var State = global.MF.State;
  var SRS = global.MF.SRS;

  var MODES = {
    SMART: 'smart',
    NEW: 'new',
    ERRORS: 'errors',
    HARD: 'hard',
    TRICKY: 'tricky',
    PRIORITY: 'priority',
    NORMA: 'norma',
    TEMA: 'tema',
    FAVORITES: 'favorites'
  };

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function weightedSortSmart(cards) {
    var today = SRS.todayStr();
    return cards
      .map(function (c) {
        var p = State.getProgress(c.id);
        var overdue = p.nextReview ? Math.max(0, SRS.daysBetween(p.nextReview, today)) : 0;
        var isNew = SRS.isNewCard(p);
        var weight = (isNew ? 5 : 0) + overdue * 2 + (5 - p.dominance * 1.2) + (c.prioridade >= 4 ? c.prioridade : 0);
        return { card: c, weight: weight + Math.random() * 0.5 };
      })
      .sort(function (a, b) { return b.weight - a.weight; })
      .map(function (x) { return x.card; });
  }

  /**
   * Seleciona os cards-candidatos para um modo, sem ainda limitar quantidade.
   * `params` pode conter { norma, tema }.
   */
  function selectCandidates(mode, params) {
    params = params || {};
    var all = State.getAllCards();
    var today = SRS.todayStr();

    switch (mode) {
      case MODES.SMART:
        return weightedSortSmart(all.filter(function (c) {
          var p = State.getProgress(c.id);
          return SRS.isNewCard(p) || SRS.isDue(p, today);
        }));

      case MODES.NEW:
        return shuffle(all.filter(function (c) { return SRS.isNewCard(State.getProgress(c.id)); }));

      case MODES.ERRORS:
        return all
          .map(function (c) { return { c: c, p: State.getProgress(c.id) }; })
          .filter(function (x) { return x.p.wrong > 0; })
          .sort(function (a, b) {
            if (b.p.wrong !== a.p.wrong) return b.p.wrong - a.p.wrong;
            if (a.p.dominance !== b.p.dominance) return a.p.dominance - b.p.dominance;
            return b.c.prioridade - a.c.prioridade;
          })
          .map(function (x) { return x.c; });

      case MODES.HARD:
        return all
          .map(function (c) { return { c: c, p: State.getProgress(c.id) }; })
          .filter(function (x) { return x.p.reviews > 0 && x.p.dominance <= 1; })
          .sort(function (a, b) { return a.p.dominance - b.p.dominance; })
          .map(function (x) { return x.c; });

      case MODES.TRICKY:
        return shuffle(all.filter(function (c) { return c.pegadinha === true; }));

      case MODES.PRIORITY:
        return shuffle(all.filter(function (c) { return c.prioridade >= 4; }))
          .sort(function (a, b) { return b.prioridade - a.prioridade; });

      case MODES.NORMA:
        return weightedSortSmart(all.filter(function (c) { return c.norma === params.norma; }));

      case MODES.TEMA:
        return weightedSortSmart(all.filter(function (c) { return c.tema === params.tema; }));

      case MODES.FAVORITES:
        return shuffle(all.filter(function (c) { return State.isFavorite(c.id); }));

      default:
        return [];
    }
  }

  /** Cria uma sessão: { queue: [cardId,...], mode, total, position, results: [] } */
  function createSession(mode, params, limit) {
    var candidates = selectCandidates(mode, params);
    var chosen = (limit === 'all' || !limit) ? candidates : candidates.slice(0, limit);
    return {
      mode: mode,
      params: params || {},
      queue: chosen.map(function (c) { return c.id; }),
      total: chosen.length,
      position: 0,
      answered: 0,
      results: [], // { cardId, rating }
      startedAt: new Date().toISOString()
    };
  }

  function currentCardId(session) {
    if (session.position >= session.queue.length) return null;
    return session.queue[session.position];
  }

  /**
   * Aplica a resposta ao card atual, avança a sessão e, se "errei", reinsere
   * o card alguns slots à frente na própria fila.
   */
  function answerCurrent(session, rating) {
    var cardId = currentCardId(session);
    if (!cardId) return session;

    State.recordAnswer(cardId, rating);
    session.results.push({ cardId: cardId, rating: rating });
    session.answered += 1;

    if (rating === SRS.RATING.ERREI) {
      var remaining = session.queue.length - (session.position + 1);
      var offset = 3 + Math.floor(Math.random() * 3); // 3..5
      var insertAt = session.position + 1 + Math.min(offset, remaining);
      session.queue.splice(insertAt, 0, cardId);
      session.total = session.queue.length;
    }

    session.position += 1;
    return session;
  }

  function isFinished(session) { return session.position >= session.queue.length; }

  global.MF = global.MF || {};
  global.MF.Session = {
    MODES: MODES,
    selectCandidates: selectCandidates,
    createSession: createSession,
    currentCardId: currentCardId,
    answerCurrent: answerCurrent,
    isFinished: isFinished
  };
})(window);
