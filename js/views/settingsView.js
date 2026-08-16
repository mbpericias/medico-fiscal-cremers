/**
 * views/settingsView.js — Configurações gerais + backup/restauração.
 */
(function (global) {
  'use strict';

  var UI = global.MF.UI, el = UI.el;
  var State = global.MF.State;
  var Storage = global.MF.Storage;
  var PWAInstall = global.MF.PWAInstall;

  var GOAL_OPTIONS = [10, 20, 30, 50, 100];
  var installChangeHandler = null;

  function render(container) {
    var settings = State.getSettings();

    container.appendChild(el('h1', {}, ['Configurações']));

    container.appendChild(el('div', { class: 'section-title' }, ['Instalar aplicativo']));
    var installCard = el('div', { class: 'card card-pad' });
    container.appendChild(installCard);
    renderInstallSection(installCard);
    installChangeHandler = PWAInstall.onChange(function () { UI.clear(installCard); renderInstallSection(installCard); });

    container.appendChild(el('div', { class: 'section-title' }, ['Meta diária']));
    var goalCard = el('div', { class: 'card card-pad' });
    var goalGrid = el('div', { class: 'count-grid' });
    GOAL_OPTIONS.forEach(function (g) {
      goalGrid.appendChild(el('div', {
        class: 'count-option' + (settings.dailyGoal === g ? ' selected' : ''),
        onclick: function () {
          State.updateSettings({ dailyGoal: g });
          UI.toast('Meta diária definida em ' + g + ' cards.');
          rerender();
        }
      }, [String(g)]));
    });
    goalCard.appendChild(goalGrid);
    goalCard.appendChild(el('p', { class: 'text-muted mt-16' }, [
      'Regra da sequência (🔥): a sequência de dias avança quando a meta diária de cards revisados é atingida no dia. ' +
      'Isso evita contar como "dia estudado" uma única revisão isolada.'
    ]));
    var ruleSelect = el('select', {
      onchange: function (e) { State.updateSettings({ streakRule: e.target.value }); UI.toast('Regra da sequência atualizada.'); }
    }, [
      el('option', { value: 'goal', selected: settings.streakRule === 'goal' }, ['Precisa bater a meta diária']),
      el('option', { value: 'any', selected: settings.streakRule === 'any' }, ['Qualquer revisão no dia já conta'])
    ]);
    goalCard.appendChild(el('div', { class: 'mt-8' }, [el('label', {}, ['Regra da sequência']), ruleSelect]));
    container.appendChild(goalCard);

    container.appendChild(el('div', { class: 'section-title' }, ['Sessões']));
    var sessionCard = el('div', { class: 'card card-pad' });
    var defSelect = el('select', {
      onchange: function (e) { State.updateSettings({ newCardsPerSessionDefault: Number(e.target.value) }); }
    }, [10, 20, 30, 50].map(function (n) {
      return el('option', { value: String(n), selected: settings.newCardsPerSessionDefault === n }, [String(n) + ' cards']);
    }));
    sessionCard.appendChild(el('div', {}, [el('label', {}, ['Quantidade padrão de cards novos por sessão']), defSelect]));
    container.appendChild(sessionCard);

    container.appendChild(el('div', { class: 'section-title' }, ['Aparência']));
    var themeCard = el('div', { class: 'card card-pad' });
    var themeSelect = el('select', {
      onchange: function (e) {
        State.updateSettings({ theme: e.target.value });
        if (e.target.value === 'auto') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', e.target.value);
      }
    }, [
      el('option', { value: 'auto', selected: settings.theme === 'auto' }, ['Automático (segue o sistema)']),
      el('option', { value: 'light', selected: settings.theme === 'light' }, ['Claro']),
      el('option', { value: 'dark', selected: settings.theme === 'dark' }, ['Escuro'])
    ]);
    themeCard.appendChild(el('div', {}, [el('label', {}, ['Tema']), themeSelect]));
    container.appendChild(themeCard);

    container.appendChild(el('div', { class: 'section-title' }, ['Backup']));
    var backupCard = el('div', { class: 'card card-pad' });
    backupCard.appendChild(el('p', { class: 'text-muted' }, [
      'O backup contém todos os cards, progresso, histórico de estudo, sequência e configurações. Guarde-o em local seguro.'
    ]));
    backupCard.appendChild(el('div', { class: 'flex gap-12 mt-16' }, [
      el('button', { class: 'btn btn-primary', onclick: exportBackup }, ['EXPORTAR BACKUP COMPLETO']),
      el('button', {
        class: 'btn',
        onclick: function () { document.getElementById('restore-input').click(); }
      }, ['RESTAURAR BACKUP'])
    ]));
    var restoreInput = el('input', {
      type: 'file', id: 'restore-input', accept: '.json,application/json', style: 'display:none',
      onchange: function (e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          var parsed;
          try { parsed = JSON.parse(reader.result); } catch (err) {
            UI.toast('Arquivo de backup inválido (JSON malformado).', { error: true });
            return;
          }
          UI.confirmModal({
            title: 'Restaurar backup',
            message: 'O banco de dados ATUAL (cards, progresso, histórico e configurações) será totalmente substituído pelo conteúdo deste arquivo. Esta ação não pode ser desfeita. Deseja continuar?',
            confirmLabel: 'Restaurar', danger: true
          }, function (ok) {
            if (!ok) return;
            try {
              State.restoreBackup(parsed);
              UI.toast('Backup restaurado com sucesso.');
              global.location.hash = '/dashboard';
              global.location.reload();
            } catch (err) {
              UI.toast('Falha ao restaurar: ' + err.message, { error: true });
            }
          });
        };
        reader.readAsText(file);
        e.target.value = '';
      }
    });
    backupCard.appendChild(restoreInput);
    container.appendChild(backupCard);

    function rerender() {
      UI.clear(container);
      render(container);
    }
  }

  function renderInstallSection(wrap) {
    if (PWAInstall.isStandalone()) {
      wrap.appendChild(el('p', {}, ['✅ Este aplicativo já está instalado e rodando em modo standalone (sem barra de endereço do navegador).']));
      return;
    }

    var deferred = PWAInstall.getPrompt();

    if (deferred) {
      wrap.appendChild(el('p', { class: 'text-muted' }, ['Instale o app na tela inicial para abrir como um aplicativo, em tela cheia e funcionando offline.']));
      wrap.appendChild(el('button', {
        class: 'btn btn-primary mt-16',
        onclick: function () {
          PWAInstall.promptInstall().then(function (choice) {
            if (choice && choice.outcome === 'accepted') UI.toast('Aplicativo instalado.');
          });
        }
      }, ['📲 INSTALAR APLICATIVO']));
      return;
    }

    if (PWAInstall.isIOS()) {
      wrap.appendChild(el('p', { class: 'text-muted' }, [
        'No iPhone/iPad, a instalação é feita manualmente pelo Safari (não funciona pelo Chrome no iOS):'
      ]));
      wrap.appendChild(el('ol', { style: 'margin:10px 0 0 18px;padding:0;font-size:13.5px;line-height:1.8' }, [
        el('li', {}, ['Abra este endereço no ', el('strong', {}, ['Safari']), '.']),
        el('li', {}, ['Toque no ícone ', el('strong', {}, ['Compartilhar']), ' (o quadrado com uma seta para cima).']),
        el('li', {}, ['Toque em ', el('strong', {}, ['"Adicionar à Tela de Início"']), '.']),
        el('li', {}, ['Toque em ', el('strong', {}, ['"Adicionar"']), ' no canto superior direito.'])
      ]));
      return;
    }

    if (PWAInstall.isAndroid()) {
      wrap.appendChild(el('p', { class: 'text-muted' }, [
        'Este navegador ainda não ofereceu a instalação automática. No Chrome/Android, você também pode instalar manualmente:'
      ]));
      wrap.appendChild(el('ol', { style: 'margin:10px 0 0 18px;padding:0;font-size:13.5px;line-height:1.8' }, [
        el('li', {}, ['Toque no menu ', el('strong', {}, ['⋮']), ' (canto superior direito do Chrome).']),
        el('li', {}, ['Toque em ', el('strong', {}, ['"Instalar aplicativo"']), ' ou ', el('strong', {}, ['"Adicionar à tela inicial"']), '.'])
      ]));
      wrap.appendChild(el('p', { class: 'text-faint mt-8' }, ['Se a opção não aparecer, confirme que o endereço começa com "https://" — a instalação exige conexão segura.']));
      return;
    }

    wrap.appendChild(el('p', { class: 'text-muted' }, [
      'No Chrome/Edge desktop, procure o ícone de instalação (⊕ ou monitor) na barra de endereço, ou o menu → "Instalar Médico Fiscal — CREMERS".'
    ]));
  }

  function cleanup() {
    if (installChangeHandler) { installChangeHandler(); installChangeHandler = null; }
  }

  function exportBackup() {
    var data = State.exportBackup();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var today = new Date();
    var dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    a.href = url;
    a.download = 'backup-medico-fiscal-' + dateStr + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    UI.toast('Backup exportado.');
  }

  global.MF = global.MF || {};
  global.MF.Views = global.MF.Views || {};
  global.MF.Views.SettingsView = { render: render, cleanup: cleanup };
})(window);
