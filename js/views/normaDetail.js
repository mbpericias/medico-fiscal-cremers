/**
 * views/normaDetail.js — Estatísticas detalhadas de uma norma específica.
 */
(function (global) {
  'use strict';

  var UI = global.MF.UI, el = UI.el;
  var Stats = global.MF.Stats;
  var State = global.MF.State;
  var Router = global.MF.Router;
  var SRS = global.MF.SRS;

  function render(container, rawParams) {
    var norma = rawParams[0];
    if (!norma) { Router.navigate('/banco'); return; }

    var detail = Stats.normaDetail(norma);
    if (detail.total === 0) {
      container.appendChild(el('div', { class: 'empty-state' }, ['Norma não encontrada: ' + norma]));
      return;
    }

    container.appendChild(el('h1', {}, [norma]));
    container.appendChild(el('button', {
      class: 'btn btn-primary mt-16',
      onclick: function () { Router.navigate('/sessao/norma/all/' + encodeURIComponent(norma)); }
    }, ['ESTUDAR SOMENTE ESTA NORMA']));

    container.appendChild(el('div', { class: 'grid grid-4 mt-24' }, [
      el('div', { class: 'card stat-tile' }, [el('div', { class: 'stat-value' }, [String(detail.total)]), el('div', { class: 'stat-label' }, ['total de cards'])]),
      el('div', { class: 'card stat-tile' }, [el('div', { class: 'stat-value' }, [String(detail.studied)]), el('div', { class: 'stat-label' }, ['cards estudados'])]),
      el('div', { class: 'card stat-tile' }, [el('div', { class: 'stat-value' }, [String(detail.novos)]), el('div', { class: 'stat-label' }, ['cards novos'])]),
      el('div', { class: 'card stat-tile' }, [el('div', { class: 'stat-value' }, [detail.accuracy === null ? '—' : detail.accuracy + '%']), el('div', { class: 'stat-label' }, ['taxa de acerto'])])
    ]));

    container.appendChild(el('div', { class: 'section-title' }, ['Domínio dos cards']));
    var domCard = el('div', { class: 'card card-pad flex gap-12' });
    ['Fraco', 'Em aprendizado', 'Razoável', 'Dominado'].forEach(function (label, i) {
      domCard.appendChild(el('div', { class: 'stat-tile', style: 'flex:1;text-align:center' }, [
        el('div', {}, [SRS.DOMINANCE_EMOJI[i]]),
        el('div', { class: 'stat-value' }, [String(detail.dominanceCounts[i])]),
        el('div', { class: 'stat-label' }, [label])
      ]));
    });
    container.appendChild(domCard);

    container.appendChild(el('div', { class: 'section-title' }, ['Temas com pior desempenho']));
    var temaCard = el('div', { class: 'card' });
    if (detail.worstTemas.length === 0) {
      temaCard.appendChild(el('div', { class: 'empty-state' }, ['Sem dados suficientes ainda.']));
    } else {
      detail.worstTemas.forEach(function (t) {
        temaCard.appendChild(el('div', {
          class: 'norma-row', onclick: function () { Router.navigate('/sessao/tema/all/' + encodeURIComponent(t.tema)); }
        }, [
          el('div', { class: 'norma-name' }, [t.tema + ' (' + t.total + ')']),
          el('div', { class: 'progress-bar' }, [el('div', { style: 'width:' + t.dominancePercent + '%' })]),
          el('div', { class: 'norma-pct' }, [t.dominancePercent + '%'])
        ]));
      });
    }
    container.appendChild(temaCard);

    container.appendChild(el('div', { class: 'section-title' }, ['🔴 Cards fracos']));
    container.appendChild(cardListMini(detail.weak));

    container.appendChild(el('div', { class: 'section-title' }, ['🟠 Cards difíceis (em aprendizado)']));
    container.appendChild(cardListMini(detail.difficult));

    container.appendChild(el('div', { class: 'section-title' }, ['Errados recentemente (sem acertos desde então)']));
    container.appendChild(cardListMini(detail.recentlyWrong));
  }

  function cardListMini(cards) {
    var wrap = el('div', { class: 'card' });
    if (cards.length === 0) {
      wrap.appendChild(el('div', { class: 'empty-state' }, ['Nenhum card nesta condição. 🎉']));
      return wrap;
    }
    cards.slice(0, 15).forEach(function (c) {
      wrap.appendChild(el('div', { class: 'norma-row', style: 'cursor:default' }, [
        el('div', { style: 'flex:1;font-size:13.5px' }, [c.pergunta.length > 100 ? c.pergunta.slice(0, 100) + '…' : c.pergunta]),
        el('div', { class: 'badge badge-neutral' }, [c.tema])
      ]));
    });
    return wrap;
  }

  global.MF = global.MF || {};
  global.MF.Views = global.MF.Views || {};
  global.MF.Views.NormaDetail = { render: render };
})(window);
