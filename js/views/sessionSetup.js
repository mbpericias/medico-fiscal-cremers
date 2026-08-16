/**
 * views/sessionSetup.js — Configuração manual de uma sessão de estudo:
 * escolha de modo, quantidade e (quando aplicável) norma/tema específicos.
 */
(function (global) {
  'use strict';

  var UI = global.MF.UI, el = UI.el;
  var State = global.MF.State;
  var Session = global.MF.Session;
  var Router = global.MF.Router;

  var MODE_INFO = [
    { key: 'smart', label: 'Revisão inteligente', desc: 'Mistura cards devidos hoje e novos, priorizando os mais urgentes.' },
    { key: 'new', label: 'Cards novos', desc: 'Apenas cards ainda não estudados.' },
    { key: 'errors', label: 'Meus erros', desc: 'Cards com respostas erradas recentes, dos piores para os melhores.' },
    { key: 'hard', label: 'Difíceis', desc: 'Cards com domínio baixo (Fraco / Em aprendizado).' },
    { key: 'tricky', label: 'Pegadinhas', desc: 'Cards marcados como pegadinha.' },
    { key: 'priority', label: 'Alta prioridade', desc: 'Cards com prioridade 4 ou 5.' },
    { key: 'norma', label: 'Norma específica', desc: 'Escolha uma lei, decreto ou resolução.' },
    { key: 'tema', label: 'Tema específico', desc: 'Escolha um tema dentro de uma norma.' }
  ];

  var COUNT_OPTIONS = [10, 20, 30, 50, 'all'];

  var state;

  function render(container) {
    var settings = State.getSettings();
    state = { mode: 'smart', count: settings.newCardsPerSessionDefault || 20, norma: null, tema: null };

    container.appendChild(el('h1', {}, ['Estudar']));
    container.appendChild(el('p', { class: 'text-muted mt-8' }, ['Escolha o modo e a quantidade de cards para esta sessão.']));

    container.appendChild(el('div', { class: 'section-title' }, ['Modo']));
    var modeGrid = el('div', { class: 'mode-grid' });
    container.appendChild(modeGrid);

    container.appendChild(el('div', { class: 'section-title' }, ['Quantidade']));
    var countGrid = el('div', { class: 'count-grid' });
    container.appendChild(countGrid);

    var pickerWrap = el('div', { class: 'mt-16' });
    container.appendChild(pickerWrap);

    var summary = el('p', { class: 'text-muted mt-16' });
    container.appendChild(summary);

    var startBtn = el('button', {
      class: 'btn btn-primary btn-lg mt-16',
      onclick: function () {
        if (state.mode === 'norma' && !state.norma) { UI.toast('Escolha uma norma.', { error: true }); return; }
        if (state.mode === 'tema' && !state.tema) { UI.toast('Escolha um tema.', { error: true }); return; }
        var path = '/sessao/' + state.mode + '/' + state.count;
        if (state.mode === 'norma') path += '/' + encodeURIComponent(state.norma);
        if (state.mode === 'tema') path += '/' + encodeURIComponent(state.tema);
        Router.navigate(path);
      }
    }, ['Iniciar sessão']);
    container.appendChild(startBtn);

    function renderPicker() {
      UI.clear(pickerWrap);
      if (state.mode === 'norma') {
        var normas = State.getAllNormas();
        var select = el('select', {
          onchange: function (e) { state.norma = e.target.value; update(); }
        }, [el('option', { value: '' }, ['Selecione a norma…'])].concat(
          normas.map(function (n) { return el('option', { value: n }, [n]); })
        ));
        pickerWrap.appendChild(el('label', {}, ['Norma']));
        pickerWrap.appendChild(select);
      } else if (state.mode === 'tema') {
        var temas = State.getAllTemas(null);
        var select2 = el('select', {
          onchange: function (e) { state.tema = e.target.value; update(); }
        }, [el('option', { value: '' }, ['Selecione o tema…'])].concat(
          temas.map(function (t) { return el('option', { value: t }, [t]); })
        ));
        pickerWrap.appendChild(el('label', {}, ['Tema']));
        pickerWrap.appendChild(select2);
      }
    }

    function update() {
      modeGrid.querySelectorAll('.mode-option').forEach(function (n) {
        n.classList.toggle('selected', n.getAttribute('data-key') === state.mode);
      });
      countGrid.querySelectorAll('.count-option').forEach(function (n) {
        n.classList.toggle('selected', n.getAttribute('data-count') === String(state.count));
      });
      renderPicker();

      var params = {};
      if (state.mode === 'norma') params.norma = state.norma;
      if (state.mode === 'tema') params.tema = state.tema;
      var available = Session.selectCandidates(state.mode, params).length;
      var willStudy = state.count === 'all' ? available : Math.min(available, state.count);
      summary.textContent = available + ' cards disponíveis neste modo · sessão terá ' + willStudy + ' cards.';
      startBtn.disabled = available === 0;
    }

    MODE_INFO.forEach(function (m) {
      var tile = el('div', {
        class: 'mode-option', 'data-key': m.key,
        onclick: function () { state.mode = m.key; update(); }
      }, [
        el('div', { class: 'mode-label' }, [m.label]),
        el('div', { class: 'mode-desc' }, [m.desc])
      ]);
      modeGrid.appendChild(tile);
    });

    COUNT_OPTIONS.forEach(function (c) {
      var tile = el('div', {
        class: 'count-option', 'data-count': String(c),
        onclick: function () { state.count = c; update(); }
      }, [c === 'all' ? 'Todos disponíveis' : String(c)]);
      countGrid.appendChild(tile);
    });

    update();
  }

  global.MF = global.MF || {};
  global.MF.Views = global.MF.Views || {};
  global.MF.Views.SessionSetup = { render: render };
})(window);
