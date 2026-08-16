/**
 * views/simuladoRun.js — Execução e resultado do simulado.
 * Nenhum feedback de certo/errado é mostrado durante as questões; o
 * resultado só aparece ao final.
 */
(function (global) {
  'use strict';

  var UI = global.MF.UI, el = UI.el;
  var State = global.MF.State;
  var Simulado = global.MF.Simulado;
  var Router = global.MF.Router;

  var simulado = null;

  function render(container, rawParams) {
    var countRaw = rawParams[0];
    var count = countRaw === 'all' ? 'all' : parseInt(countRaw, 10);
    simulado = Simulado.createSimulado(count);

    if (simulado.cardIds.length === 0) {
      container.appendChild(el('div', { class: 'empty-state' }, ['Nenhum card elegível disponível.']));
      return;
    }

    var wrap = el('div', { class: 'study-wrap' });
    container.appendChild(wrap);
    renderQuestion(wrap);
  }

  function renderQuestion(wrap) {
    UI.clear(wrap);
    var idx = simulado.position;
    var cardId = simulado.cardIds[idx];
    var card = State.getCard(cardId);
    var total = simulado.cardIds.length;
    var pct = Math.round((idx / total) * 100);

    wrap.appendChild(el('div', { class: 'study-progress-label' }, [
      el('span', {}, ['Questão ' + (idx + 1) + ' de ' + total]),
      el('span', { class: 'text-faint' }, ['Simulado — resultado só ao final'])
    ]));
    wrap.appendChild(el('div', { class: 'progress-bar' }, [el('div', { style: 'width:' + pct + '%' })]));

    wrap.appendChild(el('div', { class: 'study-meta mt-16' }, [
      el('span', { class: 'badge badge-blue' }, [card.norma]),
      card.artigo ? el('span', { class: 'badge badge-neutral' }, [card.artigo]) : null
    ].filter(Boolean)));

    var studyCard = el('div', { class: 'card study-card mt-16' });
    studyCard.appendChild(el('div', { class: 'study-question' }, [card.pergunta]));

    var currentAnswer = simulado.answers[cardId];
    var optionsWrap = el('div', { class: 'mt-24' });

    if (card.tipo === 'certo_errado') {
      var trueBtn = optionButton('CERTO', currentAnswer === true, function () { select(true); });
      var falseBtn = optionButton('ERRADO', currentAnswer === false, function () { select(false); });
      optionsWrap.appendChild(el('div', { class: 'flex gap-12' }, [trueBtn, falseBtn]));
    } else if (card.tipo === 'multipla_escolha') {
      card.opcoes.forEach(function (opt) {
        optionsWrap.appendChild(optionButton(opt.texto, currentAnswer === opt.texto, function () { select(opt.texto); }, true));
      });
    }

    function select(value) {
      Simulado.answer(simulado, cardId, value);
      renderQuestion(wrap);
    }

    studyCard.appendChild(optionsWrap);

    var isLast = idx === total - 1;
    var nav = el('div', { class: 'flex justify-between mt-24' }, [
      el('button', {
        class: 'btn', disabled: idx === 0,
        onclick: function () { simulado.position -= 1; renderQuestion(wrap); }
      }, ['← Anterior']),
      isLast
        ? el('button', { class: 'btn btn-primary', onclick: function () { finish(wrap); } }, ['Finalizar simulado'])
        : el('button', { class: 'btn btn-primary', onclick: function () { simulado.position += 1; renderQuestion(wrap); } }, ['Próxima →'])
    ]);
    studyCard.appendChild(nav);

    wrap.appendChild(studyCard);
  }

  function optionButton(label, selected, onClick, block) {
    return el('button', {
      class: 'btn' + (selected ? ' btn-primary' : '') + (block ? ' btn-block mt-8' : ''),
      style: block ? 'justify-content:flex-start;text-align:left' : 'flex:1',
      onclick: onClick
    }, [label]);
  }

  function finish(wrap) {
    var result = Simulado.finish(simulado);
    UI.clear(wrap);

    wrap.appendChild(el('div', { class: 'card card-pad' }, [
      el('h2', {}, ['Resultado: ' + result.correctCount + '/' + result.total + ' — ' + result.percent + '%']),
      el('div', { class: 'section-title' }, ['Desempenho por norma']),
      breakdownList(result.byNorma),
      el('div', { class: 'section-title' }, ['Desempenho por tema']),
      breakdownList(result.byTema),
      el('div', { class: 'section-title' }, ['Desempenho por prioridade']),
      breakdownList(result.byPrioridade)
    ]));

    var wrongWrap = el('div', { class: 'card mt-16' });
    wrongWrap.appendChild(el('div', { class: 'card-pad', style: 'padding-bottom:0' }, [el('h3', {}, ['Questões erradas (' + result.wrongCards.length + ')'])]));
    if (result.wrongCards.length === 0) {
      wrongWrap.appendChild(el('div', { class: 'empty-state' }, ['Nenhum erro. 🎉']));
    } else {
      result.wrongCards.forEach(function (r) {
        wrongWrap.appendChild(el('div', { class: 'norma-row', style: 'cursor:default;flex-direction:column;align-items:flex-start;gap:6px' }, [
          el('div', { style: 'font-weight:600;font-size:13.5px' }, [r.card.pergunta]),
          el('div', { class: 'text-muted', style: 'font-size:13px' }, ['Sua resposta: ' + formatAnswer(r.card, r.userAnswer)]),
          el('div', { style: 'font-size:13px;color:var(--green)' }, ['Correta: ' + formatCorrect(r.card)])
        ]));
      });
    }
    wrap.appendChild(wrongWrap);

    wrap.appendChild(el('div', { class: 'flex gap-12 mt-24' }, [
      el('button', { class: 'btn btn-primary', onclick: function () { Router.navigate('/simulado'); } }, ['Novo simulado']),
      el('button', { class: 'btn', onclick: function () { Router.navigate('/dashboard'); } }, ['Voltar ao início'])
    ]));
  }

  function formatAnswer(card, ans) {
    if (ans === undefined || ans === null) return '(não respondida)';
    if (card.tipo === 'certo_errado') return ans ? 'Certo' : 'Errado';
    return ans;
  }
  function formatCorrect(card) {
    if (card.tipo === 'certo_errado') return card.gabarito ? 'Certo' : 'Errado';
    var opt = card.opcoes.find(function (o) { return o.correta === true; });
    return opt ? opt.texto : '—';
  }

  function breakdownList(items) {
    var wrap = el('div', { class: 'mt-8' });
    items.sort(function (a, b) { return a.percent - b.percent; }).forEach(function (g) {
      wrap.appendChild(el('div', { class: 'mt-8' }, [
        el('div', { class: 'flex justify-between' }, [el('span', {}, [g.key]), el('span', { class: 'text-muted' }, [g.correct + '/' + g.total + ' (' + g.percent + '%)'])]),
        el('div', { class: 'progress-bar mt-8' }, [el('div', { style: 'width:' + g.percent + '%' })])
      ]));
    });
    return wrap;
  }

  function cleanup() { simulado = null; }

  global.MF = global.MF || {};
  global.MF.Views = global.MF.Views || {};
  global.MF.Views.SimuladoRun = { render: render, cleanup: cleanup };
})(window);
