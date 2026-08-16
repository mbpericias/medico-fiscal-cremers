/**
 * views/simuladoSetup.js — Tela inicial do modo Simulado.
 */
(function (global) {
  'use strict';

  var UI = global.MF.UI, el = UI.el;
  var Simulado = global.MF.Simulado;
  var Router = global.MF.Router;

  var COUNT_OPTIONS = [10, 20, 30, 50];

  function render(container) {
    var eligible = Simulado.eligibleCards().length;
    var selected = COUNT_OPTIONS[0];

    container.appendChild(el('h1', {}, ['🎯 Simulado']));
    container.appendChild(el('p', { class: 'text-muted mt-8' }, [
      'No simulado, a resposta correta só é revelada ao final. Somente cards do tipo "certo_errado" ou ' +
      '"multipla_escolha" com gabarito cadastrado entram no simulado — o app nunca inventa alternativas.'
    ]));

    if (eligible === 0) {
      container.appendChild(el('div', { class: 'card empty-state mt-24' }, [
        el('div', { class: 'emoji' }, ['🎯']),
        el('h3', {}, ['Nenhum card elegível para simulado ainda']),
        el('p', { class: 'text-muted mt-8' }, [
          'Importe cards do tipo "certo_errado" (com campo "gabarito": true/false) ou "multipla_escolha" ' +
          '(com "opcoes" e uma alternativa marcada "correta": true) para habilitar o simulado.'
        ])
      ]));
      return;
    }

    container.appendChild(el('p', { class: 'mt-16' }, [el('strong', {}, [String(eligible)]), ' cards elegíveis no banco.']));

    container.appendChild(el('div', { class: 'section-title' }, ['Número de questões']));
    var countGrid = el('div', { class: 'count-grid' });
    container.appendChild(countGrid);

    var summary = el('p', { class: 'text-muted mt-16' });
    container.appendChild(summary);

    function update() {
      countGrid.querySelectorAll('.count-option').forEach(function (n) {
        n.classList.toggle('selected', n.getAttribute('data-count') === String(selected));
      });
      var willRun = Math.min(selected, eligible);
      summary.textContent = 'O simulado terá ' + willRun + ' questões.';
    }

    COUNT_OPTIONS.concat(['all']).forEach(function (c) {
      var tile = el('div', {
        class: 'count-option', 'data-count': String(c),
        onclick: function () { selected = c; update(); }
      }, [c === 'all' ? 'Todos disponíveis (' + eligible + ')' : String(c)]);
      countGrid.appendChild(tile);
    });
    update();

    container.appendChild(el('button', {
      class: 'btn btn-primary btn-lg mt-24',
      onclick: function () { Router.navigate('/simulado-sessao/' + selected); }
    }, ['Iniciar simulado']));
  }

  global.MF = global.MF || {};
  global.MF.Views = global.MF.Views || {};
  global.MF.Views.SimuladoSetup = { render: render };
})(window);
