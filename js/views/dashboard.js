/**
 * views/dashboard.js — Tela inicial.
 */
(function (global) {
  'use strict';

  var UI = global.MF.UI, el = UI.el;
  var State = global.MF.State;
  var Stats = global.MF.Stats;
  var Session = global.MF.Session;
  var Router = global.MF.Router;

  function statTile(icon, value, label) {
    return el('div', { class: 'card stat-tile' }, [
      el('div', { class: 'stat-icon' }, [icon]),
      el('div', { class: 'stat-value' }, [String(value)]),
      el('div', { class: 'stat-label' }, [label])
    ]);
  }

  function shortcutTile(emoji, label, count, onClick) {
    return el('div', { class: 'card shortcut-tile', onclick: onClick }, [
      el('div', { class: 'emoji' }, [emoji]),
      el('div', { class: 'label' }, [label]),
      el('div', { class: 'count' }, [count === null ? '' : count + ' cards'])
    ]);
  }

  function dominanceColorClass(pct) {
    if (pct >= 75) return 'green';
    if (pct >= 50) return 'yellow';
    if (pct >= 25) return 'orange';
    return 'red';
  }

  function render(container) {
    var cards = State.getAllCards();
    var streak = State.getStreak();
    var due = Stats.dueToday();
    var domCounts = Stats.dominanceCounts();
    var domPercent = Stats.overallDominancePercent();
    var settings = State.getSettings();
    var studiedToday = Stats.studiedToday();

    container.appendChild(el('div', { class: 'hero' }, [
      el('h1', {}, ['MÉDICO FISCAL — CREMERS']),
      el('div', { class: 'subtitle' }, ['Preparação para o concurso'])
    ]));

    if (cards.length === 0) {
      container.appendChild(el('div', { class: 'card empty-state' }, [
        el('div', { class: 'emoji' }, ['📭']),
        el('h3', {}, ['Nenhum flashcard cadastrado ainda']),
        el('p', { class: 'text-muted mt-8' }, ['Importe seu primeiro banco de flashcards para começar a estudar.']),
        el('button', {
          class: 'btn btn-primary mt-16', onclick: function () { Router.navigate('/importar'); }
        }, ['Importar flashcards'])
      ]));
      return;
    }

    container.appendChild(el('div', { class: 'grid grid-4' }, [
      statTile('🔥', streak.current, 'sequência de dias'),
      statTile('📚', cards.length, 'total de cards'),
      statTile('🧠', domCounts[3], 'cards dominados'),
      statTile('📅', due.length, 'revisões previstas hoje')
    ]));

    container.appendChild(el('div', { class: 'grid grid-2 mt-16' }, [
      el('div', { class: 'card stat-tile' }, [
        el('div', { class: 'flex justify-between items-center' }, [
          el('div', {}, [
            el('div', { class: 'stat-value' }, [domPercent + '%']),
            el('div', { class: 'stat-label' }, ['domínio geral'])
          ]),
          el('div', { class: 'stat-icon' }, ['🎯'])
        ]),
        el('div', { class: 'progress-bar mt-8' }, [el('div', { style: 'width:' + domPercent + '%' })])
      ]),
      el('div', { class: 'card stat-tile' }, [
        el('div', { class: 'flex justify-between items-center' }, [
          el('div', {}, [
            el('div', { class: 'stat-value' }, [studiedToday + '/' + settings.dailyGoal]),
            el('div', { class: 'stat-label' }, ['meta de hoje'])
          ]),
          el('div', { class: 'stat-icon' }, ['📈'])
        ]),
        el('div', { class: 'progress-bar mt-8' }, [
          el('div', { style: 'width:' + Math.min(100, Math.round((studiedToday / settings.dailyGoal) * 100)) + '%' })
        ])
      ])
    ]));

    container.appendChild(el('button', {
      class: 'btn btn-primary cta-study',
      onclick: function () {
        var count = settings.dailyGoal || 20;
        Router.navigate('/sessao/smart/' + count);
      }
    }, ['▶  ESTUDAR AGORA']));

    var errorCount = Session.selectCandidates('errors').length;
    var trickyCount = Session.selectCandidates('tricky').length;
    var priorityCount = Session.selectCandidates('priority').length;
    var hardCount = Session.selectCandidates('hard').length;
    var newCount = Session.selectCandidates('new').length;

    container.appendChild(el('div', { class: 'shortcut-grid' }, [
      shortcutTile('📚', 'Todas as normas', null, function () { Router.navigate('/banco'); }),
      shortcutTile('📅', 'Revisão de hoje', due.length, function () { Router.navigate('/sessao/smart/all'); }),
      shortcutTile('❌', 'Meus erros', errorCount, function () { Router.navigate('/sessao/errors/all'); }),
      shortcutTile('⚠️', 'Pegadinhas', trickyCount, function () { Router.navigate('/sessao/tricky/all'); }),
      shortcutTile('⭐', 'Alta prioridade', priorityCount, function () { Router.navigate('/sessao/priority/all'); }),
      shortcutTile('🧠', 'Difíceis', hardCount, function () { Router.navigate('/sessao/hard/all'); }),
      shortcutTile('🆕', 'Cards novos', newCount, function () { Router.navigate('/sessao/new/' + (settings.newCardsPerSessionDefault || 20)); }),
      shortcutTile('🎯', 'Simulado', null, function () { Router.navigate('/simulado'); })
    ]));

    container.appendChild(el('div', { class: 'section-title' }, ['Escolha o que estudar']));
    var normaStats = Stats.perNormaStats();
    if (normaStats.length === 0) {
      container.appendChild(el('div', { class: 'card empty-state' }, ['Nenhuma norma cadastrada ainda.']));
    } else {
      var normaGrid = el('div', { class: 'norma-tile-grid' });
      normaStats.forEach(function (n) {
        normaGrid.appendChild(el('div', {
          class: 'card norma-tile', onclick: function () { Router.navigate('/norma/' + encodeURIComponent(n.norma)); }
        }, [
          el('div', { class: 'flex justify-between items-center' }, [
            el('div', { class: 'norma-tile-name' }, [n.norma]),
            el('div', { class: 'norma-tile-pct' }, [n.dominancePercent + '%'])
          ]),
          el('div', { class: 'progress-bar mt-8' }, [el('div', { style: 'width:' + n.dominancePercent + '%' })]),
          el('div', { class: 'norma-tile-stats mt-8' }, [
            el('span', {}, ['📚 ' + n.total + ' total']),
            el('span', {}, ['🆕 ' + n.novos + ' novos']),
            el('span', {}, ['📅 ' + n.dueToday + ' hoje']),
            el('span', {}, ['🧠 ' + n.dominanceCounts[3] + ' dominados'])
          ])
        ]));
      });
      container.appendChild(normaGrid);
    }
  }

  global.MF = global.MF || {};
  global.MF.Views = global.MF.Views || {};
  global.MF.Views.Dashboard = { render: render };
})(window);
