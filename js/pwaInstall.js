/**
 * pwaInstall.js — Captura o evento de instalação do PWA (Android/Chrome e
 * desktop Chrome/Edge) para oferecer um botão "Instalar aplicativo" dentro
 * da própria UI, além de detectar iOS (que não tem esse evento — a
 * instalação lá é sempre manual via Safar → Compartilhar → Adicionar à Tela
 * de Início) e se o app já está rodando instalado (modo standalone).
 *
 * Carregado bem cedo (antes dos demais scripts) para não perder o evento
 * "beforeinstallprompt", que o navegador dispara uma única vez.
 */
(function (global) {
  'use strict';

  var deferredPrompt = null;
  var listeners = [];

  function notify() { listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } }); }

  global.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });

  global.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    notify();
  });

  function getPrompt() { return deferredPrompt; }

  /** Registra um ouvinte e devolve uma função para cancelar a inscrição. */
  function onChange(fn) {
    listeners.push(fn);
    return function unsubscribe() {
      var idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  function isStandalone() {
    var mq = global.matchMedia && global.matchMedia('(display-mode: standalone)').matches;
    var iosStandalone = global.navigator && global.navigator.standalone === true;
    return !!(mq || iosStandalone);
  }

  function isIOS() {
    var ua = global.navigator.userAgent || '';
    var iOSDevice = /iPad|iPhone|iPod/.test(ua);
    var iPadOS13 = ua.indexOf('Macintosh') !== -1 && global.navigator.maxTouchPoints > 1;
    return iOSDevice || iPadOS13;
  }

  function isAndroid() {
    return /Android/.test(global.navigator.userAgent || '');
  }

  function promptInstall() {
    if (!deferredPrompt) return Promise.resolve(null);
    var promptEvent = deferredPrompt;
    deferredPrompt = null;
    return promptEvent.prompt().then(function () {
      return promptEvent.userChoice;
    }).then(function (choice) {
      notify();
      return choice;
    });
  }

  global.MF = global.MF || {};
  global.MF.PWAInstall = {
    getPrompt: getPrompt,
    onChange: onChange,
    isStandalone: isStandalone,
    isIOS: isIOS,
    isAndroid: isAndroid,
    promptInstall: promptInstall
  };
})(window);
