/**
 * srs.js — Algoritmo de repetição espaçada.
 *
 * COMO FUNCIONA (resumo para quem for ler/ajustar o código depois):
 *
 * Cada card tem um "registro de progresso" com:
 *   - intervalDays: intervalo atual, em dias, até a próxima revisão
 *   - reviews / corrects / wrong: contadores totais
 *   - correctStreak: sequência atual de respostas corretas (Acertei/Fácil)
 *     consecutivas. Qualquer "Errei" zera a sequência. "Difícil" NÃO zera
 *     (contou como acerto parcial), mas também não conta como acerto "forte".
 *   - lastReview / nextReview: datas ISO (yyyy-mm-dd)
 *   - dominance: nível calculado (0 Fraco, 1 Em aprendizado, 2 Razoável, 3 Dominado)
 *
 * Ao responder um card, aplicamos um multiplicador sobre o intervalo atual,
 * dependendo do botão escolhido:
 *
 *   ERREI   -> intervalo cai para o mínimo (1 dia) e correctStreak zera.
 *              Dentro da MESMA sessão de estudo, o card não é dado como
 *              "concluído": a fila de sessão o reinsere alguns cards à
 *              frente (ver session.js) para reaparecer sem ser imediato.
 *   DIFÍCIL -> intervalo cresce pouco (fator ~1.3). correctStreak não some,
 *              mas fica "congelada" (não soma).
 *   ACERTEI -> intervalo cresce de forma normal (fator ~2.2). correctStreak += 1.
 *   FÁCIL   -> intervalo cresce bastante (fator ~3.3). correctStreak += 1.
 *
 * Cards novos (intervalDays === 0) recebem intervalos-base fixos por botão,
 * já que ainda não há intervalo anterior para multiplicar.
 *
 * PESO DE PRIORIDADE: cards de prioridade 4 ou 5 (alta / decorar) recebem um
 * pequeno redutor no intervalo final (5% e 10%, respectivamente), para serem
 * revisados um pouco mais cedo que o algoritmo "puro" sugeriria — sem virar
 * um sistema paralelo, é só um ajuste fino.
 *
 * A data usada é sempre a data real do dispositivo (new Date()), nunca uma
 * data fixa. Datas são armazenadas como string "yyyy-mm-dd" em horário local,
 * para evitar bugs de fuso horário ao comparar "hoje" com "próxima revisão".
 */
(function (global) {
  'use strict';

  var RATING = { ERREI: 'errei', DIFICIL: 'dificil', ACERTEI: 'acertei', FACIL: 'facil' };

  var BASE_INTERVAL_NEW = {
    errei: 1,
    dificil: 1,
    acertei: 2,
    facil: 4
  };

  var GROWTH_FACTOR = {
    errei: 0,      // tratado à parte (reset)
    dificil: 1.3,
    acertei: 2.2,
    facil: 3.3
  };

  var PRIORITY_REDUCTION = { 4: 0.95, 5: 0.90 };

  function todayStr() {
    return formatDateLocal(new Date());
  }

  function formatDateLocal(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function addDays(dateStr, days) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + Math.round(days));
    return formatDateLocal(d);
  }

  function daysBetween(fromStr, toStr) {
    var a = new Date(fromStr + 'T00:00:00');
    var b = new Date(toStr + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }

  /** Cria o registro de progresso inicial ("novo") para um card. */
  function createInitialProgress(cardId) {
    return {
      cardId: cardId,
      reviews: 0,
      corrects: 0,
      wrong: 0,
      correctStreak: 0,
      intervalDays: 0,
      lastReview: null,
      nextReview: null,
      dominance: 0
    };
  }

  /**
   * Aplica uma resposta (rating) ao registro de progresso de um card e
   * devolve o NOVO registro (não muta o original). `priority` é 1-5.
   */
  function applyRating(progress, rating, priority) {
    if (Object.values(RATING).indexOf(rating) === -1) {
      throw new Error('Rating inválido: ' + rating);
    }
    var p = Object.assign({}, progress);
    var today = todayStr();
    var isNew = !p.lastReview && p.intervalDays === 0;

    p.reviews += 1;

    if (rating === RATING.ERREI) {
      p.wrong += 1;
      p.correctStreak = 0;
      p.intervalDays = 1;
    } else {
      if (rating !== RATING.DIFICIL) {
        p.corrects += 1;
        p.correctStreak += 1;
      } else {
        // Difícil: conta como revisão feita, mas não como acerto "forte"
        // nem quebra a sequência — fica neutro.
        p.corrects += 1;
      }
      var newInterval;
      if (isNew) {
        newInterval = BASE_INTERVAL_NEW[rating];
      } else {
        var base = Math.max(1, p.intervalDays);
        newInterval = base * GROWTH_FACTOR[rating];
      }
      var reduction = PRIORITY_REDUCTION[priority] || 1;
      p.intervalDays = Math.max(1, Math.round(newInterval * reduction));
    }

    p.lastReview = today;
    p.nextReview = addDays(today, p.intervalDays);
    p.dominance = computeDominance(p);
    return p;
  }

  /**
   * Nível de domínio. Exige desempenho bom e SUSTENTADO, não uma única
   * resposta certa:
   *   0 Fraco          — poucas revisões, ou sequência de acertos curta
   *   1 Em aprendizado — sequência de 2-3 acertos seguidos
   *   2 Razoável       — sequência de 4-5 acertos E intervalo >= 7 dias
   *   3 Dominado       — sequência >= 6 acertos E intervalo >= 21 dias
   */
  function computeDominance(p) {
    if (p.reviews === 0) return 0;
    if (p.correctStreak >= 6 && p.intervalDays >= 21) return 3;
    if (p.correctStreak >= 4 && p.intervalDays >= 7) return 2;
    if (p.correctStreak >= 2) return 1;
    return 0;
  }

  var DOMINANCE_LABEL = ['Fraco', 'Em aprendizado', 'Razoável', 'Dominado'];
  var DOMINANCE_EMOJI = ['🔴', '🟠', '🟡', '🟢'];

  function isDue(progress, onDate) {
    onDate = onDate || todayStr();
    if (!progress.nextReview) return true; // nunca estudado = está "devido" (é novo)
    return progress.nextReview <= onDate;
  }

  function isNewCard(progress) {
    return !progress || progress.reviews === 0;
  }

  global.MF = global.MF || {};
  global.MF.SRS = {
    RATING: RATING,
    createInitialProgress: createInitialProgress,
    applyRating: applyRating,
    computeDominance: computeDominance,
    DOMINANCE_LABEL: DOMINANCE_LABEL,
    DOMINANCE_EMOJI: DOMINANCE_EMOJI,
    isDue: isDue,
    isNewCard: isNewCard,
    todayStr: todayStr,
    addDays: addDays,
    daysBetween: daysBetween,
    formatDateLocal: formatDateLocal
  };
})(window);
