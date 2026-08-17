/**
 * app.js — Bootstrap da aplicação: monta o shell (barra lateral, topo,
 * navegação mobile), aplica o tema salvo e registra as rotas.
 */
(function (global) {
  'use strict';

  var UI = global.MF.UI;
  var State = global.MF.State;
  var Router = global.MF.Router;
  var CatalogSync = global.MF.CatalogSync;
  var el = UI.el;

  var NAV_ITEMS = [
    { route: 'dashboard', emoji: '🏠', label: 'Início' },
    { route: 'estudar', emoji: '📖', label: 'Estudar' },
    { route: 'banco', emoji: '📚', label: 'Banco de flashcards' },
    { route: 'importar', emoji: '⬆️', label: 'Importar flashcards' },
    { route: 'estatisticas', emoji: '📊', label: 'Estatísticas' },
    { route: 'simulado', emoji: '🎯', label: 'Simulado' },
    { route: 'configuracoes', emoji: '⚙️', label: 'Configurações' }
  ];

  var MOBILE_NAV_ITEMS = [
    { route: 'dashboard', emoji: '🏠', label: 'Início' },
    { route: 'estudar', emoji: '📖', label: 'Estudar' },
    { route: 'banco', emoji: '📚', label: 'Banco' },
    { route: 'estatisticas', emoji: '📊', label: 'Stats' },
    { route: 'configuracoes', emoji: '⚙️', label: 'Config' }
  ];

  function applyTheme() {
    var settings = State.getSettings();
    var theme = settings.theme || 'auto';
    if (theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    updateThemeColorMeta(theme);
  }

  /** Mantém a cor da barra de status/endereço (Android/PWA) alinhada ao tema atual. */
  function updateThemeColorMeta(theme) {
    var isDark = theme === 'dark' || (theme === 'auto' && global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#1c1f26' : '#1f5f8b');
  }

  function cycleTheme() {
    var settings = State.getSettings();
    var order = ['auto', 'light', 'dark'];
    var idx = order.indexOf(settings.theme || 'auto');
    var next = order[(idx + 1) % order.length];
    State.updateSettings({ theme: next });
    applyTheme();
    UI.toast('Tema: ' + (next === 'auto' ? 'automático (sistema)' : next === 'light' ? 'claro' : 'escuro'));
  }

  function buildShell() {
    var app = document.getElementById('app');
    UI.clear(app);

    var sidebar = el('nav', { class: 'sidebar' }, [
      el('div', { class: 'sidebar-brand' }, [
        el('div', { class: 'title' }, ['MÉDICO FISCAL — CREMERS']),
        el('div', { class: 'subtitle' }, ['Preparação para o concurso'])
      ])
    ]);

    NAV_ITEMS.forEach(function (item) {
      var link = el('button', {
        class: 'nav-link',
        'data-route': item.route,
        onclick: function () { Router.navigate('/' + item.route); }
      }, [item.emoji + '  ' + item.label]);
      sidebar.appendChild(link);
    });

    var topbar = el('div', { class: 'topbar' }, [
      el('div', { style: 'font-weight:700;font-size:13.5px;' }, ['🔥 ' + State.getStreak().current + ' dias']),
      el('div', { class: 'topbar-search' }, [
        (function () {
          var input = el('input', {
            type: 'search',
            placeholder: 'Buscar em pergunta, resposta, tema, artigo, explicação…',
            onkeydown: function (e) {
              if (e.key === 'Enter' && e.target.value.trim()) {
                Router.navigate('/banco/busca/' + encodeURIComponent(e.target.value.trim()));
              }
            }
          });
          return input;
        })()
      ]),
      el('button', {
        class: 'icon-btn', title: 'Alternar tema', onclick: cycleTheme
      }, ['🌓'])
    ]);

    var mainContent = el('div', { class: 'main-content' });
    var mainArea = el('div', { class: 'main-area' }, [topbar, mainContent]);

    var mobileNav = el('div', { class: 'mobile-nav' });
    MOBILE_NAV_ITEMS.forEach(function (item) {
      mobileNav.appendChild(el('button', {
        'data-route': item.route,
        onclick: function () { Router.navigate('/' + item.route); }
      }, [el('span', { class: 'emoji' }, [item.emoji]), el('span', {}, [item.label])]));
    });

    app.appendChild(sidebar);
    app.appendChild(mainArea);
    app.appendChild(mobileNav);

    return mainContent;
  }

  function highlightActiveNav(routeName) {
    document.querySelectorAll('.nav-link, .mobile-nav button').forEach(function (n) {
      n.classList.toggle('active', n.getAttribute('data-route') === routeName);
    });
  }

  function registerRoutes() {
    var V = global.MF.Views;
    Router.register('dashboard', V.Dashboard);
    Router.register('estudar', V.SessionSetup);
    Router.register('sessao', V.Study);
    Router.register('importar', V.ImportView);
    Router.register('banco', V.Browse);
    Router.register('norma', V.NormaDetail);
    Router.register('estatisticas', V.StatsView);
    Router.register('simulado', V.SimuladoSetup);
    Router.register('simulado-sessao', V.SimuladoRun);
    Router.register('configuracoes', V.SettingsView);
  }

  /**
   * Sincroniza o banco local com o catálogo de normas oficiais
   * (data/catalog.json) — só ADICIONA cards oficiais cujo id ainda não
   * existe localmente; nunca apaga, sobrescreve ou zera progresso. Roda em
   * toda inicialização (é barata e idempotente: se nada mudou no catálogo,
   * não faz nada). Só funciona quando servido por http(s) — sob file://, o
   * fetch é bloqueado pelo navegador e a sincronização falha silenciosamente
   * (a importação manual pela tela "Importar flashcards" continua disponível).
   * Ver js/catalogSync.js para os detalhes.
   */
  function syncOfficialCatalog() {
    CatalogSync.sync().then(function (summary) {
      if (summary.added > 0) {
        UI.toast(summary.added + ' flashcard(s) oficiais novos adicionados automaticamente.');
        Router.refresh();
      }
    });
  }

  function init() {
    State.load();
    applyTheme();
    syncOfficialCatalog();
    var mainContent = buildShell();
    registerRoutes();
    Router.onNavigate(function (name) {
      highlightActiveNav(name === 'sessao' ? 'estudar' : (name === 'norma' ? 'banco' : (name === 'simulado-sessao' ? 'simulado' : name)));
    });
    Router.init(mainContent);

    // Reconstrói o contador de sequência no topo sempre que o estado mudar.
    State.onChange(function () {
      var el2 = document.querySelector('.topbar > div');
      if (el2) el2.textContent = '🔥 ' + State.getStreak().current + ' dias';
    });

    // Tema "automático": acompanha mudanças do sistema também na cor da status bar.
    if (global.matchMedia) {
      global.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        if ((State.getSettings().theme || 'auto') === 'auto') updateThemeColorMeta('auto');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
