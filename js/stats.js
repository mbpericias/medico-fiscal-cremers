/**
 * stats.js — Cálculos de desempenho derivados de cards + progresso +
 * histórico. Tudo calculado sob demanda (sem cache persistido) para nunca
 * ficar dessincronizado dos dados reais.
 */
(function (global) {
  'use strict';

  var State = global.MF.State;
  var Storage = global.MF.Storage;
  var SRS = global.MF.SRS;

  function overallDominancePercent() {
    var cards = State.getAllCards();
    if (cards.length === 0) return 0;
    var sum = 0;
    cards.forEach(function (c) {
      var p = State.getProgress(c.id);
      sum += p.dominance / 3; // 0..1
    });
    return Math.round((sum / cards.length) * 100);
  }

  function dueToday() {
    var today = SRS.todayStr();
    return State.getAllCards().filter(function (c) {
      var p = State.getProgress(c.id);
      return SRS.isNewCard(p) || SRS.isDue(p, today);
    });
  }

  function dominanceCounts() {
    var counts = [0, 0, 0, 0];
    State.getAllCards().forEach(function (c) {
      var p = State.getProgress(c.id);
      counts[p.dominance] += 1;
    });
    return counts; // [Fraco, Em aprendizado, Razoável, Dominado]
  }

  function accuracyPercent(cardIds) {
    var h = Storage.getHistory();
    var idSet = cardIds ? new Set(cardIds) : null;
    var total = 0, good = 0;
    h.forEach(function (e) {
      if (idSet && !idSet.has(e.cardId)) return;
      total++;
      if (e.rating === 'acertei' || e.rating === 'facil') good++;
    });
    if (total === 0) return null;
    return Math.round((good / total) * 100);
  }

  function studiedCountInRange(days) {
    var h = Storage.getHistory();
    var cutoff = SRS.addDays(SRS.todayStr(), -1 * (days - 1));
    var ids = {};
    h.forEach(function (e) { if (e.date >= cutoff) ids[e.cardId + '|' + e.date] = true; });
    return Object.keys(ids).length;
  }

  function studiedToday() { return studiedCountInRange(1); }

  function ratingDistribution(days) {
    var h = Storage.getHistory();
    var cutoff = days ? SRS.addDays(SRS.todayStr(), -1 * (days - 1)) : null;
    var dist = { errei: 0, dificil: 0, acertei: 0, facil: 0 };
    h.forEach(function (e) {
      if (cutoff && e.date < cutoff) return;
      if (dist[e.rating] !== undefined) dist[e.rating]++;
    });
    return dist;
  }

  function perNormaStats() {
    var normas = State.getAllNormas();
    return normas.map(function (norma) {
      var cards = State.getAllCards().filter(function (c) { return c.norma === norma; });
      var ids = cards.map(function (c) { return c.id; });
      var dom = [0, 0, 0, 0];
      var studied = 0;
      cards.forEach(function (c) {
        var p = State.getProgress(c.id);
        dom[p.dominance]++;
        if (p.reviews > 0) studied++;
      });
      var acc = accuracyPercent(ids);
      var masteryPercent = cards.length ? Math.round((dom[3] / cards.length) * 100) : 0;
      return {
        norma: norma,
        total: cards.length,
        studied: studied,
        novos: cards.length - studied,
        dominancePercent: cards.length ? Math.round((dom.reduce(function (s, v, i) { return s + v * (i / 3); }, 0) / cards.length) * 100) : 0,
        masteryPercent: masteryPercent,
        accuracy: acc,
        dominanceCounts: dom
      };
    }).sort(function (a, b) { return a.norma.localeCompare(b.norma); });
  }

  function normaDetail(norma) {
    var cards = State.getAllCards().filter(function (c) { return c.norma === norma; });
    var ids = cards.map(function (c) { return c.id; });
    var dom = [0, 0, 0, 0];
    var studied = 0;
    var difficult = [];
    var recentlyWrong = [];
    var temaStats = {};

    cards.forEach(function (c) {
      var p = State.getProgress(c.id);
      dom[p.dominance]++;
      if (p.reviews > 0) studied++;
      if (p.dominance <= 1 && p.reviews > 0) difficult.push(c);
      if (p.wrong > 0 && p.correctStreak === 0 && p.reviews > 0) recentlyWrong.push(c);

      if (!temaStats[c.tema]) temaStats[c.tema] = { tema: c.tema, total: 0, sumDom: 0 };
      temaStats[c.tema].total++;
      temaStats[c.tema].sumDom += p.dominance;
    });

    var temaList = Object.keys(temaStats).map(function (t) {
      var s = temaStats[t];
      return { tema: s.tema, total: s.total, dominancePercent: Math.round((s.sumDom / (s.total * 3)) * 100) };
    }).sort(function (a, b) { return a.dominancePercent - b.dominancePercent; });

    return {
      norma: norma,
      total: cards.length,
      studied: studied,
      novos: cards.length - studied,
      accuracy: accuracyPercent(ids),
      dominanceCounts: dom,
      difficult: difficult,
      recentlyWrong: recentlyWrong,
      worstTemas: temaList.slice(0, 5)
    };
  }

  global.MF = global.MF || {};
  global.MF.Stats = {
    overallDominancePercent: overallDominancePercent,
    dueToday: dueToday,
    dominanceCounts: dominanceCounts,
    accuracyPercent: accuracyPercent,
    studiedCountInRange: studiedCountInRange,
    studiedToday: studiedToday,
    ratingDistribution: ratingDistribution,
    perNormaStats: perNormaStats,
    normaDetail: normaDetail
  };
})(window);
