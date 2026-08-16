/**
 * views/importView.js — Importação de novos flashcards via JSON colado ou
 * arquivo .json. Por padrão, cards com id já existente no banco NÃO são
 * tocados (aparecem como "já existentes"). Quando o arquivo traz conteúdo
 * diferente para algum id já existente, um botão separado e explícito
 * ("Atualizar cards existentes") permite aplicar essas mudanças de conteúdo
 * — sempre preservando o progresso/histórico de estudo, que fica indexado
 * pelo id e nunca é tocado por esta tela.
 */
(function (global) {
  'use strict';

  var UI = global.MF.UI, el = UI.el;
  var State = global.MF.State;
  var CardsModel = global.MF.CardsModel;

  var pendingReport = null;

  function render(container) {
    container.appendChild(el('h1', {}, ['Importar flashcards']));
    container.appendChild(el('p', { class: 'text-muted mt-8' }, [
      'Cole um JSON (lista de cards) ou selecione um arquivo .json. Nenhum dado existente é apagado ou sobrescrito.'
    ]));

    var tabs = el('div', { class: 'pill-tabs mt-16' });
    var pasteTab = el('button', { class: 'pill-tab active' }, ['Colar JSON']);
    var fileTab = el('button', { class: 'pill-tab' }, ['Selecionar arquivo']);
    tabs.appendChild(pasteTab);
    tabs.appendChild(fileTab);
    container.appendChild(tabs);

    var pasteArea = el('div', { class: 'card card-pad mt-16' }, [
      el('label', {}, ['Cole aqui o JSON com a lista de cards']),
      (function () {
        var ta = el('textarea', { rows: 12, placeholder: '[\n  { "id": "L3268-001", "norma": "...", ... }\n]' });
        return ta;
      })()
    ]);
    var textarea = pasteArea.querySelector('textarea');

    var fileArea = el('div', { class: 'card card-pad mt-16', style: 'display:none' }, [
      el('label', {}, ['Selecione um arquivo .json']),
      el('input', {
        type: 'file', accept: '.json,application/json',
        onchange: function (e) {
          var file = e.target.files[0];
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function () { textarea.value = reader.result; analyze(); };
          reader.onerror = function () { UI.toast('Não foi possível ler o arquivo.', { error: true }); };
          reader.readAsText(file);
        }
      })
    ]);

    pasteTab.onclick = function () {
      pasteTab.classList.add('active'); fileTab.classList.remove('active');
      pasteArea.style.display = ''; fileArea.style.display = 'none';
    };
    fileTab.onclick = function () {
      fileTab.classList.add('active'); pasteTab.classList.remove('active');
      fileArea.style.display = ''; pasteArea.style.display = 'none';
    };

    container.appendChild(pasteArea);
    container.appendChild(fileArea);

    var analyzeBtn = el('button', { class: 'btn btn-primary mt-16', onclick: analyze }, ['Analisar']);
    container.appendChild(analyzeBtn);

    var reportWrap = el('div', { class: 'mt-24' });
    container.appendChild(reportWrap);

    function analyze() {
      var raw = textarea.value.trim();
      if (!raw) { UI.toast('Cole ou selecione um JSON primeiro.', { error: true }); return; }
      var parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        UI.clear(reportWrap);
        reportWrap.appendChild(el('div', { class: 'card card-pad' }, [
          el('div', { class: 'badge badge-red' }, ['JSON inválido']),
          el('p', { class: 'mt-8' }, ['Não foi possível interpretar o texto como JSON: ' + err.message])
        ]));
        return;
      }

      var existing = State.getAllCards().reduce(function (acc, c) { acc[c.id] = c; return acc; }, {});
      var report = CardsModel.analyzeImportBatch(parsed, existing);
      pendingReport = report;
      renderReport(reportWrap, report);
    }
  }

  function renderReport(reportWrap, report) {
    UI.clear(reportWrap);

    var card = el('div', { class: 'card card-pad import-report' });
    card.appendChild(el('h3', {}, ['Arquivo analisado']));
    if (report.meta) {
      card.appendChild(el('p', { class: 'text-muted', style: 'margin-bottom:12px' }, [
        el('strong', {}, [report.meta.nome || 'Banco']),
        report.meta.norma ? ' — ' + report.meta.norma : '',
        report.meta.descricao ? el('div', { class: 'text-faint mt-8' }, [report.meta.descricao]) : null
      ].filter(Boolean)));
    }
    card.appendChild(el('div', { class: 'row' }, [el('span', {}, ['Total de itens no arquivo']), el('strong', {}, [String(report.total)])]));
    card.appendChild(el('div', { class: 'row' }, [el('span', {}, ['✅ Novos cards a importar']), el('strong', {}, [String(report.novos.length)])]));
    card.appendChild(el('div', { class: 'row' }, [el('span', {}, ['↔️ Já existentes (não serão alterados)']), el('strong', {}, [String(report.existentes.length)])]));
    if (report.existentesAlterados.length > 0) {
      card.appendChild(el('div', { class: 'row' }, [el('span', {}, ['✏️ Existentes com conteúdo diferente no arquivo']), el('strong', {}, [String(report.existentesAlterados.length)])]));
    }
    card.appendChild(el('div', { class: 'row' }, [el('span', {}, ['⚠️ Duplicados dentro do próprio arquivo']), el('strong', {}, [String(report.duplicadosNoLote.length)])]));
    card.appendChild(el('div', { class: 'row' }, [el('span', {}, ['❌ Cards inválidos']), el('strong', {}, [String(report.invalidos.length)])]));

    if (report.invalidos.length > 0) {
      var invalidBox = el('div', { class: 'mt-16' });
      invalidBox.appendChild(el('div', { class: 'section-title' }, ['Detalhes dos cards inválidos']));
      report.invalidos.slice(0, 20).forEach(function (inv) {
        invalidBox.appendChild(el('div', { class: 'card card-pad mt-8', style: 'border-color:var(--red)' }, [
          el('div', { style: 'font-weight:600' }, ['Item #' + (inv.index + 1) + (inv.raw && inv.raw.id ? ' (id: ' + UI.escapeHtml(inv.raw.id) + ')' : '')]),
          el('ul', { style: 'margin:6px 0 0 18px;padding:0' }, inv.errors.map(function (e) { return el('li', { class: 'text-muted' }, [e]); }))
        ]));
      });
      card.appendChild(invalidBox);
    }

    var actions = el('div', { class: 'flex gap-12 mt-24' });
    var importBtn = el('button', {
      class: 'btn btn-primary',
      onclick: function () {
        if (report.novos.length === 0) { UI.toast('Não há cards novos para importar.', { error: true }); return; }
        State.importCards(report.novos);
        UI.toast(report.novos.length + ' cards importados com sucesso.');
        UI.clear(reportWrap);
      }
    }, ['IMPORTAR ' + report.novos.length + ' NOVOS CARDS']);
    importBtn.disabled = report.novos.length === 0;
    actions.appendChild(importBtn);
    actions.appendChild(el('button', { class: 'btn', onclick: function () { UI.clear(reportWrap); } }, ['CANCELAR']));
    card.appendChild(actions);

    if (report.existentesAlterados.length > 0) {
      card.appendChild(el('div', { class: 'study-divider mt-24' }));
      card.appendChild(el('div', { class: 'section-title' }, ['Atualizar cards existentes']));
      card.appendChild(el('p', { class: 'text-muted' }, [
        report.existentesAlterados.length + ' card(s) já existentes têm conteúdo diferente neste arquivo. ' +
        'Progresso e histórico de estudo (revisões, domínio, sequência) são sempre preservados — só o texto/campos do card mudam.'
      ]));

      var diffPreview = el('div', { class: 'mt-8' });
      report.existentesAlterados.slice(0, 10).forEach(function (item) {
        diffPreview.appendChild(el('div', { class: 'card card-pad mt-8' }, [
          el('div', { style: 'font-weight:600' }, [item.card.id]),
          el('ul', { style: 'margin:6px 0 0 18px;padding:0;font-size:12.5px' }, item.diffs.map(function (d) {
            return el('li', { class: 'text-muted' }, [
              d.field + ': ', el('span', { class: 'text-faint' }, [String(d.from)]), ' → ', el('strong', {}, [String(d.to)])
            ]);
          }))
        ]));
      });
      if (report.existentesAlterados.length > 10) {
        diffPreview.appendChild(el('p', { class: 'text-faint mt-8' }, ['+ ' + (report.existentesAlterados.length - 10) + ' outro(s) card(s).']));
      }
      card.appendChild(diffPreview);

      card.appendChild(el('button', {
        class: 'btn mt-16',
        onclick: function () {
          UI.confirmModal({
            title: 'Atualizar ' + report.existentesAlterados.length + ' card(s) existentes',
            message: 'O conteúdo (pergunta, resposta, explicação, gabarito etc.) desses cards será substituído pelo texto deste arquivo. Os ids não mudam e o progresso/histórico de estudo é preservado. Deseja continuar?',
            confirmLabel: 'Atualizar'
          }, function (ok) {
            if (!ok) return;
            State.updateCards(report.existentesAlterados.map(function (item) { return item.card; }));
            UI.toast(report.existentesAlterados.length + ' card(s) atualizados. Progresso preservado.');
            UI.clear(reportWrap);
          });
        }
      }, ['ATUALIZAR ' + report.existentesAlterados.length + ' CARDS EXISTENTES']));
    }

    reportWrap.appendChild(card);
  }

  global.MF = global.MF || {};
  global.MF.Views = global.MF.Views || {};
  global.MF.Views.ImportView = { render: render };
})(window);
