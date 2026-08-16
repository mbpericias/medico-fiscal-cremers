/**
 * ui.js — Utilitários compartilhados de interface: criação de elementos,
 * escape de HTML, toasts e modal de confirmação genérico.
 */
(function (global) {
  'use strict';

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];
      if (key === 'class') node.className = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key.indexOf('on') === 0 && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value !== undefined && value !== null && value !== false) {
        node.setAttribute(key, value === true ? '' : value);
      }
    });
    (children || []).forEach(function (child) {
      if (child === null || child === undefined) return;
      if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    });
    return node;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  var toastTimer = null;
  function toast(message, opts) {
    opts = opts || {};
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var node = el('div', { class: 'toast' + (opts.error ? ' error' : '') }, [message]);
    document.body.appendChild(node);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.remove(); }, opts.duration || 3200);
  }

  /** Modal de confirmação genérico. Retorna via callback(confirmed). */
  function confirmModal(opts, callback) {
    var overlay = el('div', { class: 'modal-overlay' }, [
      el('div', { class: 'modal' }, [
        el('h3', {}, [opts.title || 'Confirmar ação']),
        el('p', { class: 'text-muted' }, [opts.message || '']),
        el('div', { class: 'modal-actions' }, [
          el('button', {
            class: 'btn', onclick: function () { close(false); }
          }, [opts.cancelLabel || 'Cancelar']),
          el('button', {
            class: 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary'),
            onclick: function () { close(true); }
          }, [opts.confirmLabel || 'Confirmar'])
        ])
      ])
    ]);

    function close(result) {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      callback(result);
    }
    function onKey(e) {
      if (e.key === 'Escape') close(false);
    }
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(false); });
    document.body.appendChild(overlay);
  }

  function formatDateBR(isoDate) {
    if (!isoDate) return '—';
    var parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  global.MF = global.MF || {};
  global.MF.UI = {
    el: el,
    escapeHtml: escapeHtml,
    toast: toast,
    confirmModal: confirmModal,
    formatDateBR: formatDateBR,
    clear: clear
  };
})(window);
