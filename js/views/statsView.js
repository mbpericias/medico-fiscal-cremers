/**
 * views/statsView.js — Estatísticas gerais de estudo.
 */
(function (global) {
  'use strict';

  var UI = global.MF.UI, el = UI.el;
  var Stats = global.MF.Stats;
  var State = global.MF.State;
  var Router = global.MF.Router;

  function render(container) {
    container.appendChild(el('h1', {}, ['Estatísticas']));

    var studiedToday = Stats.studiedToday();
    var studied7 = Stats.studiedCountInRange(7);
    var studied30 = Stats.studiedCountInRange(30);
    var accuracyAll = Stats.accuracyPercent(null);
    var domCounts = Stats.dominanceCounts();

    container.appendChild(el('div', { class: 'grid grid-3 mt-16' }, [
      tile(String(studiedToday), 'cards estudados hoje'),
      tile(String(studied7), 'cards estudados (7 dias)'),
      tile(String(studied30), 'cards estudados (30 dias)')
    ]));

    container.appendChild(el('div', { class: 'grid grid-4 mt-16' }, [
      tile(accuracyAll === null ? '—' : accuracyAll + '%', 'taxa de acerto geral'),
      tile(String(domCounts[3]), '🟢 dominados'),
      tile(String(domCounts[1] + domCounts[2]), '🟠🟡 em aprendizado'),
      tile(String(domCounts[0]), '🔴 fracos')
    ]));

    container.appendChild(el('div', { class: 'section-title' }, ['Distribuição de respostas (últimos 30 dias)']));
    var dist = Stats.ratingDistribution(30);
    var distTotal = dist.errei + dist.dificil + dist.acertei + dist.facil;
    var distCard = el('div', { class: 'card card-pad' });
    if (distTotal === 0) {
      distCard.appendChild(el('div', { class: 'empty-state' }, ['Sem respostas registradas nos últimos 30 dias.']));
    } else {
      [
        ['🔴 Errei', dist.errei, 'red'],
        ['🟠 Difícil', dist.dificil, 'orange'],
        ['🟢 Acertei', dist.acertei, 'green'],
        ['🔵 Fácil', dist.facil, 'blue']
      ].forEach(function (row) {
        var pct = Math.round((row[1] / distTotal) * 100);
        distCard.appendChild(el('div', { class: 'mt-8' }, [
          el('div', { class: 'flex justify-between' }, [el('span', {}, [row[0]]), el('span', { class: 'text-muted' }, [row[1] + ' (' + pct + '%)'])]),
          el('div', { class: 'progress-bar mt-8' }, [el('div', { style: 'width:' + pct + '%;background:var(--' + row[2] + ')' })])
        ]));
      });
    }
    container.appendChild(distCard);

    container.appendChild(el('div', { class: 'section-title' }, ['Desempenho por norma']));
    var normaStats = Stats.perNormaStats();
    var normaCard = el('div', { class: 'card' });
    if (normaStats.length === 0) {
      normaCard.appendChild(el('div', { class: 'empty-state' }, ['Nenhuma norma cadastrada ainda.']));
    } else {
      normaStats.forEach(function (n) {
        normaCard.appendChild(el('div', {
          class: 'norma-row', onclick: function () { Router.navigate('/norma/' + encodeURIComponent(n.norma)); }
        }, [
          el('div', { class: 'norma-name' }, [n.norma]),
          el('div', { class: 'progress-bar' }, [el('div', { style: 'width:' + n.dominancePercent + '%' })]),
          el('div', { class: 'norma-pct' }, [n.dominancePercent + '%'])
        ]));
      });
    }
    container.appendChild(normaCard);

    container.appendChild(el('div', { class: 'section-title' }, ['Desempenho por tema']));
    var temaCard = el('div', { class: 'card' });
    var temas = State.getAllTemas(null);
    if (temas.length === 0) {
      temaCard.appendChild(el('div', { class: 'empty-state' }, ['Nenhum tema cadastrado ainda.']));
    } else {
      temas.map(function (tema) {
        var cardsInTema = State.getAllCards().filter(function (c) { return c.tema === tema; });
        var sumDom = cardsInTema.reduce(function (s, c) { return s + State.getProgress(c.id).dominance; }, 0);
        return { tema: tema, total: cardsInTema.length, pct: Math.round((sumDom / (cardsInTema.length * 3)) * 100) };
      }).sort(function (a, b) { return a.pct - b.pct; }).forEach(function (t) {
        temaCard.appendChild(el('div', { class: 'norma-row', style: 'cursor:default' }, [
          el('div', { class: 'norma-name' }, [t.tema + ' (' + t.total + ')']),
          el('div', { class: 'progress-bar' }, [el('div', { style: 'width:' + t.pct + '%' })]),
          el('div', { class: 'norma-pct' }, [t.pct + '%'])
        ]));
      });
    }
    container.appendChild(temaCard);
  }

  function tile(value, label) {
    return el('div', { class: 'card stat-tile' }, [
      el('div', { class: 'stat-value' }, [value]),
      el('div', { class: 'stat-label' }, [label])
    ]);
  }

  global.MF = global.MF || {};
  global.MF.Views = global.MF.Views || {};
  global.MF.Views.StatsView = { render: render };
})(window);
