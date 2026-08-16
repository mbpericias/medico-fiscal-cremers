/**
 * views/study.js — Tela de estudo (execução de uma sessão).
 * Atalhos: Espaço = mostrar resposta; após revelar, 1/2/3/4 = Errei/Difícil/Acertei/Fácil.
 */
(function (global) {
  'use strict';

  var UI = global.MF.UI, el = UI.el;
  var State = global.MF.State;
  var Session = global.MF.Session;
  var SRS = global.MF.SRS;
  var Router = global.MF.Router;

  var session = null;
  var revealed = false;
  var keyHandler = null;

  var DOMINANCE_BADGE = ['badge-red', 'badge-orange', 'badge-yellow', 'badge-green'];

  function parseParams(rawParams) {
    var mode = rawParams[0] || 'smart';
    var countRaw = rawParams[1];
    var count = (countRaw === 'all' || countRaw === undefined) ? 'all' : parseInt(countRaw, 10);
    var params = {};
    if (mode === 'norma') params.norma = rawParams[2];
    if (mode === 'tema') params.tema = rawParams[2];
    return { mode: mode, count: count, params: params };
  }

  function render(container, rawParams) {
    var cfg = parseParams(rawParams);
    session = Session.createSession(cfg.mode, cfg.params, cfg.count);
    revealed = false;

    if (session.total === 0) {
      container.appendChild(el('div', { class: 'card empty-state' }, [
        el('div', { class: 'emoji' }, ['✅']),
        el('h3', {}, ['Nenhum card disponível para este modo agora']),
        el('p', { class: 'text-muted mt-8' }, ['Volte mais tarde ou escolha outro modo de estudo.']),
        el('button', { class: 'btn btn-primary mt-16', onclick: function () { Router.navigate('/estudar'); } }, ['Escolher outro modo'])
      ]));
      return;
    }

    var wrap = el('div', { class: 'study-wrap' });
    container.appendChild(wrap);
    renderCard(wrap);

    keyHandler = function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!revealed) doReveal();
        return;
      }
      if (revealed) {
        var map = { '1': SRS.RATING.ERREI, '2': SRS.RATING.DIFICIL, '3': SRS.RATING.ACERTEI, '4': SRS.RATING.FACIL };
        if (map[e.key]) { doAnswer(map[e.key]); }
      }
    };
    document.addEventListener('keydown', keyHandler);
  }

  var wrapRef = null;
  var revealBtn = null;

  function renderCard(wrap) {
    wrapRef = wrap;
    UI.clear(wrap);
    var cardId = Session.currentCardId(session);
    var card = State.getCard(cardId);
    var progress = State.getProgress(cardId);

    var pct = Math.round((session.position / session.total) * 100);
    wrap.appendChild(el('div', { class: 'study-progress-label' }, [
      el('span', {}, ['Card ' + (session.position + 1) + ' de ' + session.total]),
      el('span', { class: 'shortcuts-hint' }, [el('span', {}, [el('kbd', {}, ['Espaço']), ' mostrar resposta']), el('span', {}, [el('kbd', {}, ['1-4']), ' avaliar'])])
    ]));
    wrap.appendChild(el('div', { class: 'progress-bar' }, [el('div', { style: 'width:' + pct + '%' })]));

    wrap.appendChild(el('div', { class: 'study-meta mt-16' }, [
      el('span', { class: 'badge badge-blue' }, [card.norma]),
      card.artigo ? el('span', { class: 'badge badge-neutral' }, [card.artigo]) : null,
      el('span', { class: 'badge badge-neutral' }, [card.tema]),
      card.prioridade >= 4 ? el('span', { class: 'badge badge-orange' }, [card.prioridade === 5 ? '🔥 Decorar' : '⭐ Alta prioridade']) : null,
      card.pegadinha ? el('span', { class: 'badge badge-yellow' }, ['⚠️ Pegadinha']) : null,
      el('span', { class: 'badge ' + DOMINANCE_BADGE[progress.dominance] }, [SRS.DOMINANCE_EMOJI[progress.dominance] + ' ' + SRS.DOMINANCE_LABEL[progress.dominance]])
    ].filter(Boolean)));

    var studyCard = el('div', { class: 'card study-card mt-16' });
    studyCard.appendChild(el('div', { class: 'study-question' }, [card.pergunta]));

    if (!revealed) {
      revealBtn = el('button', { class: 'btn btn-primary btn-lg btn-block mt-24', onclick: function () { doReveal(); } }, ['MOSTRAR RESPOSTA']);
      studyCard.appendChild(revealBtn);
    } else {
      studyCard.appendChild(el('div', { class: 'study-divider' }));
      studyCard.appendChild(el('div', { class: 'study-answer-label' }, ['RESPOSTA']));
      studyCard.appendChild(el('div', { class: 'study-answer' }, [card.resposta]));
      if (card.explicacao) {
        studyCard.appendChild(el('div', { class: 'study-explain-label' }, ['Explicação']));
        studyCard.appendChild(el('div', { class: 'study-explain' }, [card.explicacao]));
      }
      if (card.fonte) {
        studyCard.appendChild(el('div', { class: 'study-source' }, [card.fonte]));
      }

      var grid = el('div', { class: 'answer-grid' }, [
        el('button', { class: 'answer-btn errei', onclick: function () { doAnswer(SRS.RATING.ERREI); } }, ['🔴 ERREI', el('span', { class: 'kbd-hint' }, ['tecla 1'])]),
        el('button', { class: 'answer-btn dificil', onclick: function () { doAnswer(SRS.RATING.DIFICIL); } }, ['🟠 DIFÍCIL', el('span', { class: 'kbd-hint' }, ['tecla 2'])]),
        el('button', { class: 'answer-btn acertei', onclick: function () { doAnswer(SRS.RATING.ACERTEI); } }, ['🟢 ACERTEI', el('span', { class: 'kbd-hint' }, ['tecla 3'])]),
        el('button', { class: 'answer-btn facil', onclick: function () { doAnswer(SRS.RATING.FACIL); } }, ['🔵 FÁCIL', el('span', { class: 'kbd-hint' }, ['tecla 4'])])
      ]);
      studyCard.appendChild(grid);
    }

    wrap.appendChild(studyCard);
  }

  function doReveal() {
    revealed = true;
    renderCard(wrapRef);
  }

  function doAnswer(rating) {
    Session.answerCurrent(session, rating);
    revealed = false;
    if (Session.isFinished(session)) {
      renderSummary(wrapRef);
    } else {
      renderCard(wrapRef);
    }
  }

  function renderSummary(wrap) {
    UI.clear(wrap);
    var dist = { errei: 0, dificil: 0, acertei: 0, facil: 0 };
    session.results.forEach(function (r) { dist[r.rating]++; });
    var goodPct = session.results.length ? Math.round(((dist.acertei + dist.facil) / session.results.length) * 100) : 0;

    wrap.appendChild(el('div', { class: 'card card-pad' }, [
      el('h2', {}, ['Sessão concluída']),
      el('p', { class: 'text-muted mt-8' }, [session.results.length + ' respostas registradas · ' + goodPct + '% de acerto']),
      el('div', { class: 'grid grid-4 mt-16' }, [
        el('div', { class: 'card stat-tile' }, [el('div', { class: 'stat-value' }, [String(dist.errei)]), el('div', { class: 'stat-label' }, ['🔴 Errei'])]),
        el('div', { class: 'card stat-tile' }, [el('div', { class: 'stat-value' }, [String(dist.dificil)]), el('div', { class: 'stat-label' }, ['🟠 Difícil'])]),
        el('div', { class: 'card stat-tile' }, [el('div', { class: 'stat-value' }, [String(dist.acertei)]), el('div', { class: 'stat-label' }, ['🟢 Acertei'])]),
        el('div', { class: 'card stat-tile' }, [el('div', { class: 'stat-value' }, [String(dist.facil)]), el('div', { class: 'stat-label' }, ['🔵 Fácil'])])
      ]),
      el('div', { class: 'flex gap-12 mt-24' }, [
        el('button', { class: 'btn btn-primary', onclick: function () { Router.navigate('/estudar'); } }, ['Estudar mais']),
        el('button', { class: 'btn', onclick: function () { Router.navigate('/dashboard'); } }, ['Voltar ao início'])
      ])
    ]));
  }

  function cleanup() {
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
    session = null;
  }

  global.MF = global.MF || {};
  global.MF.Views = global.MF.Views || {};
  global.MF.Views.Study = { render: render, cleanup: cleanup };
})(window);
