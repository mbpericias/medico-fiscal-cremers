/**
 * views/browse.js — Banco de flashcards: busca, filtros, visualização,
 * edição (preservando histórico/progresso) e exclusão (com confirmação).
 */
(function (global) {
  'use strict';

  var UI = global.MF.UI, el = UI.el;
  var State = global.MF.State;
  var CardsModel = global.MF.CardsModel;
  var SRS = global.MF.SRS;

  var filters = { q: '', norma: '', tema: '', prioridade: '', pegadinha: '', favorito: '' };

  function matches(card) {
    if (filters.norma && card.norma !== filters.norma) return false;
    if (filters.tema && card.tema !== filters.tema) return false;
    if (filters.prioridade && String(card.prioridade) !== filters.prioridade) return false;
    if (filters.pegadinha === 'sim' && !card.pegadinha) return false;
    if (filters.pegadinha === 'nao' && card.pegadinha) return false;
    if (filters.favorito === 'sim' && !State.isFavorite(card.id)) return false;
    if (filters.q) {
      var q = filters.q.toLowerCase();
      var haystack = [card.tema, card.pergunta, card.resposta, card.explicacao, card.artigo].join(' ').toLowerCase();
      if (haystack.indexOf(q) === -1) return false;
    }
    return true;
  }

  function render(container, rawParams) {
    if (rawParams && rawParams[0] === 'busca' && rawParams[1]) {
      filters.q = rawParams[1];
    }

    container.appendChild(el('h1', {}, ['Banco de flashcards']));
    container.appendChild(el('p', { class: 'text-muted mt-8' }, [State.getAllCards().length + ' cards cadastrados']));

    var filtersBar = el('div', { class: 'filters-bar mt-16' });
    container.appendChild(filtersBar);

    var resultsInfo = el('p', { class: 'text-muted' });
    container.appendChild(resultsInfo);

    var tableWrap = el('div', { class: 'card mt-8' });
    container.appendChild(tableWrap);

    function buildFilters() {
      UI.clear(filtersBar);

      var searchBox = el('div', {}, [
        el('label', {}, ['Buscar']),
        (function () {
          var input = el('input', {
            type: 'search', value: filters.q, placeholder: 'tema, pergunta, resposta, artigo…',
            oninput: function (e) { filters.q = e.target.value; refresh(); }
          });
          return input;
        })()
      ]);

      var normaSelect = el('select', {
        onchange: function (e) { filters.norma = e.target.value; filters.tema = ''; buildFilters(); refresh(); }
      }, [el('option', { value: '' }, ['Todas as normas'])].concat(
        State.getAllNormas().map(function (n) { return el('option', { value: n, selected: filters.norma === n }, [n]); })
      ));

      var temaSelect = el('select', {
        onchange: function (e) { filters.tema = e.target.value; refresh(); }
      }, [el('option', { value: '' }, ['Todos os temas'])].concat(
        State.getAllTemas(filters.norma || null).map(function (t) { return el('option', { value: t, selected: filters.tema === t }, [t]); })
      ));

      var prioSelect = el('select', {
        onchange: function (e) { filters.prioridade = e.target.value; refresh(); }
      }, [el('option', { value: '' }, ['Toda prioridade'])].concat(
        [1, 2, 3, 4, 5].map(function (p) { return el('option', { value: String(p), selected: filters.prioridade === String(p) }, ['Prioridade ' + p]); })
      ));

      var pegSelect = el('select', {
        onchange: function (e) { filters.pegadinha = e.target.value; refresh(); }
      }, [
        el('option', { value: '' }, ['Pegadinha: todas']),
        el('option', { value: 'sim', selected: filters.pegadinha === 'sim' }, ['Somente pegadinhas']),
        el('option', { value: 'nao', selected: filters.pegadinha === 'nao' }, ['Sem pegadinhas'])
      ]);

      var favSelect = el('select', {
        onchange: function (e) { filters.favorito = e.target.value; refresh(); }
      }, [
        el('option', { value: '' }, ['Favoritos: todos']),
        el('option', { value: 'sim', selected: filters.favorito === 'sim' }, ['Somente favoritos'])
      ]);

      filtersBar.appendChild(searchBox);
      filtersBar.appendChild(el('div', {}, [el('label', {}, ['Norma']), normaSelect]));
      filtersBar.appendChild(el('div', {}, [el('label', {}, ['Tema']), temaSelect]));
      filtersBar.appendChild(el('div', {}, [el('label', {}, ['Prioridade']), prioSelect]));
      filtersBar.appendChild(el('div', {}, [el('label', {}, ['Pegadinha']), pegSelect]));
      filtersBar.appendChild(el('div', {}, [el('label', {}, ['Favoritos']), favSelect]));
    }

    function refresh() {
      var list = State.getAllCards().filter(matches).sort(function (a, b) {
        return a.norma.localeCompare(b.norma) || a.tema.localeCompare(b.tema);
      });
      resultsInfo.textContent = list.length + ' card(s) encontrados';

      UI.clear(tableWrap);
      if (list.length === 0) {
        tableWrap.appendChild(el('div', { class: 'empty-state' }, ['Nenhum card corresponde aos filtros.']));
        return;
      }

      var table = el('table', { class: 'table' });
      var thead = el('thead', {}, [el('tr', {}, [
        el('th', {}, ['Norma']), el('th', {}, ['Artigo']), el('th', {}, ['Tema']),
        el('th', {}, ['Pergunta']), el('th', {}, ['Pri.']), el('th', {}, ['Domínio']), el('th', {}, [''])
      ])]);
      var tbody = el('tbody');

      list.forEach(function (card) {
        var progress = State.getProgress(card.id);
        var tr = el('tr', {}, [
          el('td', {}, [card.norma]),
          el('td', {}, [card.artigo || '—']),
          el('td', {}, [card.tema]),
          el('td', { style: 'max-width:320px' }, [
            (card.pergunta.length > 90 ? card.pergunta.slice(0, 90) + '…' : card.pergunta),
            card.pegadinha ? el('span', { class: 'badge badge-yellow', style: 'margin-left:6px' }, ['⚠️']) : null
          ].filter(Boolean)),
          el('td', {}, [String(card.prioridade)]),
          el('td', {}, [el('span', { class: 'badge ' + ['badge-red', 'badge-orange', 'badge-yellow', 'badge-green'][progress.dominance] }, [SRS.DOMINANCE_EMOJI[progress.dominance]])]),
          el('td', { class: 'table-actions' }, [
            el('button', { class: 'btn btn-sm', onclick: function () { openDetail(card); } }, ['Ver']),
            el('button', { class: 'btn btn-sm btn-danger', onclick: function () { confirmDelete(card); } }, ['Excluir'])
          ])
        ]);
        tbody.appendChild(tr);
      });

      table.appendChild(thead);
      table.appendChild(tbody);
      tableWrap.appendChild(table);
    }

    function confirmDelete(card) {
      UI.confirmModal({
        title: 'Excluir card',
        message: 'Tem certeza que deseja excluir o card "' + card.id + '"? O histórico de estudo deste card também será perdido. Esta ação não pode ser desfeita.',
        confirmLabel: 'Excluir', danger: true
      }, function (ok) {
        if (!ok) return;
        State.deleteCard(card.id);
        UI.toast('Card excluído.');
        refresh();
      });
    }

    function openDetail(card) {
      var editing = false;
      var overlay = el('div', { class: 'modal-overlay' });
      var modal = el('div', { class: 'modal' });
      overlay.appendChild(modal);

      function renderView() {
        UI.clear(modal);
        var progress = State.getProgress(card.id);
        modal.appendChild(el('h3', {}, [card.norma + (card.artigo ? ' · ' + card.artigo : '')]));
        modal.appendChild(el('div', { class: 'badge badge-neutral' }, [card.tema]));
        modal.appendChild(el('div', { class: 'study-answer-label mt-16' }, ['PERGUNTA']));
        modal.appendChild(el('div', {}, [card.pergunta]));
        modal.appendChild(el('div', { class: 'study-answer-label mt-16' }, ['RESPOSTA']));
        modal.appendChild(el('div', {}, [card.resposta]));
        if (card.explicacao) {
          modal.appendChild(el('div', { class: 'study-explain-label mt-16' }, ['Explicação']));
          modal.appendChild(el('div', { class: 'study-explain' }, [card.explicacao]));
        }
        if (card.fonte) modal.appendChild(el('div', { class: 'study-source mt-16' }, [card.fonte]));
        modal.appendChild(el('p', { class: 'text-muted mt-16' }, [
          'Revisões: ' + progress.reviews + ' · Acertos: ' + progress.corrects + ' · Erros: ' + progress.wrong +
          ' · Domínio: ' + SRS.DOMINANCE_LABEL[progress.dominance] +
          ' · Próxima revisão: ' + UI.formatDateBR(progress.nextReview)
        ]));
        modal.appendChild(el('div', { class: 'modal-actions' }, [
          el('button', { class: 'btn', onclick: function () { State.toggleFavorite(card.id); renderView(); } }, [State.isFavorite(card.id) ? '★ Favorito' : '☆ Marcar favorito']),
          el('button', { class: 'btn btn-primary', onclick: function () { renderEdit(); } }, ['Editar']),
          el('button', { class: 'btn', onclick: function () { overlay.remove(); } }, ['Fechar'])
        ]));
      }

      function renderEdit() {
        UI.clear(modal);
        modal.appendChild(el('h3', {}, ['Editar card — ' + card.id]));
        var fields = {};
        function field(labelText, key, isTextarea) {
          var input = el(isTextarea ? 'textarea' : 'input', { type: 'text', value: card[key] || '' });
          if (isTextarea) input.value = card[key] || '';
          fields[key] = input;
          modal.appendChild(el('div', { class: 'mt-8' }, [el('label', {}, [labelText]), input]));
        }
        field('Norma', 'norma');
        field('Artigo', 'artigo');
        field('Tema', 'tema');
        var prioInput = el('select', {}, [1, 2, 3, 4, 5].map(function (p) {
          return el('option', { value: String(p), selected: card.prioridade === p }, ['Prioridade ' + p]);
        }));
        fields.prioridade = prioInput;
        modal.appendChild(el('div', { class: 'mt-8' }, [el('label', {}, ['Prioridade']), prioInput]));

        var pegInput = el('input', { type: 'checkbox' });
        pegInput.checked = !!card.pegadinha;
        fields.pegadinha = pegInput;
        modal.appendChild(el('div', { class: 'mt-8 flex items-center gap-8' }, [pegInput, el('label', { style: 'margin:0' }, ['É pegadinha'])]));

        field('Pergunta', 'pergunta', true);
        field('Resposta', 'resposta', true);
        field('Explicação', 'explicacao', true);
        field('Fonte', 'fonte');

        modal.appendChild(el('div', { class: 'modal-actions' }, [
          el('button', { class: 'btn', onclick: function () { renderView(); } }, ['Cancelar']),
          el('button', {
            class: 'btn btn-primary', onclick: function () {
              var updatedRaw = Object.assign({}, card, {
                norma: fields.norma.value, artigo: fields.artigo.value, tema: fields.tema.value,
                prioridade: Number(fields.prioridade.value), pegadinha: fields.pegadinha.checked,
                pergunta: fields.pergunta.value, resposta: fields.resposta.value,
                explicacao: fields.explicacao.value, fonte: fields.fonte.value
              });
              var result = CardsModel.validateCard(updatedRaw);
              if (!result.valid) { UI.toast('Card inválido: ' + result.errors.join(' '), { error: true }); return; }
              State.updateCard(result.normalized);
              card = result.normalized;
              UI.toast('Card atualizado. Histórico preservado.');
              renderView();
              refresh();
            }
          }, ['Salvar alterações'])
        ]));
      }

      overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
      renderView();
    }

    buildFilters();
    refresh();
  }

  global.MF = global.MF || {};
  global.MF.Views = global.MF.Views || {};
  global.MF.Views.Browse = { render: render };
})(window);
