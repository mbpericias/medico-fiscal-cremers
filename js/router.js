/**
 * router.js — Roteamento simples baseado em hash (#/rota/param).
 * Cada view expõe render(container, params). O router cuida de montar,
 * desmontar (chamando cleanup, se existir) e manter a navegação lateral
 * sincronizada.
 */
(function (global) {
  'use strict';

  var routes = {}; // name -> { render, cleanup }
  var container = null;
  var current = null;
  var onNavigateCallbacks = [];

  function register(name, view) {
    routes[name] = view;
  }

  function parseHash() {
    var hash = global.location.hash.replace(/^#\/?/, '');
    var parts = hash.split('/').filter(function (p) { return p.length > 0; });
    var name = parts[0] || 'dashboard';
    var rawParams = parts.slice(1).map(decodeURIComponent);
    return { name: name, rawParams: rawParams };
  }

  function navigate(path) {
    global.location.hash = path;
  }

  function renderCurrent() {
    var parsed = parseHash();
    var view = routes[parsed.name] || routes['dashboard'];

    if (current && current.view && typeof current.view.cleanup === 'function') {
      try { current.view.cleanup(); } catch (e) { console.error(e); }
    }

    container.innerHTML = '';
    current = { name: parsed.name, view: view };
    view.render(container, parsed.rawParams);

    onNavigateCallbacks.forEach(function (fn) { fn(parsed.name, parsed.rawParams); });
  }

  function onNavigate(fn) { onNavigateCallbacks.push(fn); }

  function init(containerEl) {
    container = containerEl;
    global.addEventListener('hashchange', renderCurrent);
    renderCurrent();
  }

  function currentRouteName() { return current ? current.name : null; }

  global.MF = global.MF || {};
  global.MF.Router = {
    register: register,
    navigate: navigate,
    init: init,
    onNavigate: onNavigate,
    currentRouteName: currentRouteName,
    refresh: function () { renderCurrent(); }
  };
})(window);
